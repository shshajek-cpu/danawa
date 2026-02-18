const puppeteer = require('puppeteer');
async function explore() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  const carId = '4435'; // 싼타페
  const url = `https://auto.danawa.com/newcar/?Work=estimate&Model=${carId}`;
  console.log('Opening:', url);
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));

  // 1. Get ALL global variables related to spec data
  const globalVars = await page.evaluate(() => {
    const result = {};

    // Check all estm* variables
    if (typeof estmDataAuto !== 'undefined') {
      result.estmDataAutoKeys = Object.keys(estmDataAuto);
      result.estmDataAutoSample = {};
      const sampleKey = Object.keys(estmDataAuto)[0];
      if (sampleKey) {
        const raw = estmDataAuto[sampleKey];
        result.estmDataAutoSample[sampleKey] = {
          length: raw.length,
          first100: raw.substring(0, 100),
          isBase64: /^[A-Za-z0-9+/=]+$/.test(raw)
        };
      }
    }

    if (typeof estmDataGrade !== 'undefined') {
      result.estmDataGrade = Object.keys(estmDataGrade).length + ' grades';
    }

    if (typeof estmDataOption !== 'undefined') {
      result.estmDataOption = Object.keys(estmDataOption).length + ' options';
    }

    // Check for decode function
    result.hasDecodeFunction = typeof dnw_decode !== 'undefined';
    result.hasBinaryToString = typeof binaryToString !== 'undefined';

    // Try to find the spec popup function
    result.hasGetSpecPopup = typeof getSpecPopup !== 'undefined';

    return result;
  });
  console.log('\n=== Global Variables ===');
  console.log(JSON.stringify(globalVars, null, 2));

  // 2. Get the first trim's spec popup parameters
  const popupParams = await page.evaluate(() => {
    const links = document.querySelectorAll('a[href*="getSpecPopup"]');
    if (links.length === 0) return null;

    const href = links[0].getAttribute('href');
    // Parse: getSpecPopup("price", 53355, "%EA%B0%80%EA%B2%A9...", 93413, 4435)
    const match = href.match(/getSpecPopup\("([^"]+)",\s*(\d+),\s*"[^"]*",\s*(\d+),\s*(\d+)\)/);
    if (!match) return null;

    return {
      type: match[1],
      gradeId: match[2],
      trimId: match[3],
      modelId: match[4]
    };
  });

  console.log('\n=== Spec Popup Parameters ===');
  console.log(JSON.stringify(popupParams, null, 2));

  // 3. Try to open the spec popup URL directly
  if (popupParams) {
    const popupUrl = `https://auto.danawa.com/newcar/?Work=price&Grade=${popupParams.gradeId}&Trim=${popupParams.trimId}&Model=${popupParams.modelId}`;
    console.log('\n=== Opening Spec Popup ===');
    console.log('URL:', popupUrl);

    await page.goto(popupUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));

    // Get all tables from the popup
    const tables = await page.evaluate(() => {
      const allTables = Array.from(document.querySelectorAll('table'));
      return allTables.map((table, i) => {
        const text = table.innerText;
        const hasSpec = text.includes('전장') || text.includes('전폭') ||
                       text.includes('배기량') || text.includes('출력') ||
                       text.includes('연비') || text.includes('공차');

        if (!hasSpec && text.length > 500) return null; // Skip non-spec long tables

        const rows = Array.from(table.querySelectorAll('tr'));
        const data = rows.map(row => {
          const cells = Array.from(row.querySelectorAll('th, td'));
          return cells.map(cell => cell.innerText.trim());
        }).filter(row => row.length > 0);

        return {
          index: i,
          className: table.className,
          rowCount: data.length,
          data: data
        };
      }).filter(t => t !== null);
    });

    console.log('\n=== Spec Tables from Popup ===');
    tables.forEach((table, i) => {
      console.log(`\n--- Table ${table.index} (${table.rowCount} rows) ---`);
      console.log('Class:', table.className);
      table.data.forEach(row => {
        console.log('  ', row.join(' | '));
      });
    });

    // 4. Get ALL text content categorized
    const categorizedContent = await page.evaluate(() => {
      const sections = {};

      // Look for dimension-related content
      sections.dimensions = [];
      const dimKeywords = ['전장', '전폭', '전고', '축거', '윤거', '최저지상고', '공차중량', '적재중량'];
      document.querySelectorAll('*').forEach(el => {
        const text = el.innerText;
        if (!text) return;
        dimKeywords.forEach(keyword => {
          if (text.includes(keyword) && text.length < 200) {
            const line = text.split('\n').find(l => l.includes(keyword));
            if (line) sections.dimensions.push(line.trim());
          }
        });
      });

      // Look for engine specs
      sections.engine = [];
      const engineKeywords = ['배기량', '최고출력', '최대토크', '연료', '변속기', '구동방식'];
      document.querySelectorAll('*').forEach(el => {
        const text = el.innerText;
        if (!text) return;
        engineKeywords.forEach(keyword => {
          if (text.includes(keyword) && text.length < 200) {
            const line = text.split('\n').find(l => l.includes(keyword));
            if (line) sections.engine.push(line.trim());
          }
        });
      });

      // Look for tire/wheel specs
      sections.wheels = [];
      const wheelKeywords = ['타이어', '휠'];
      document.querySelectorAll('*').forEach(el => {
        const text = el.innerText;
        if (!text) return;
        wheelKeywords.forEach(keyword => {
          if (text.includes(keyword) && text.length < 200) {
            const line = text.split('\n').find(l => l.includes(keyword));
            if (line) sections.wheels.push(line.trim());
          }
        });
      });

      // Deduplicate
      Object.keys(sections).forEach(key => {
        sections[key] = [...new Set(sections[key])];
      });

      return sections;
    });

    console.log('\n=== Categorized Spec Content ===');
    console.log(JSON.stringify(categorizedContent, null, 2));

    // 5. Look for any JSON data in script tags
    const scriptData = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script'));
      const jsonData = [];

      scripts.forEach((script, i) => {
        const text = script.innerText;
        // Look for variable assignments with objects
        const varMatches = text.match(/var\s+(\w+)\s*=\s*(\{[^}]+\}|\[[^\]]+\])/g);
        if (varMatches) {
          varMatches.forEach(match => {
            if (match.length < 500) { // Only short definitions
              jsonData.push(match);
            }
          });
        }
      });

      return jsonData.slice(0, 20); // First 20 matches
    });

    console.log('\n=== JavaScript Variable Definitions ===');
    scriptData.forEach(d => console.log(d));
  }

  await browser.close();
}
explore().catch(console.error);
