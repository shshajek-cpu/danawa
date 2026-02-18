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

  // 1. Get the dnw_decode function source code
  const decodeFunction = await page.evaluate(() => {
    if (typeof dnw_decode === 'undefined') return 'NOT FOUND';
    return dnw_decode.toString();
  });

  console.log('\n=== dnw_decode Function ===');
  console.log(decodeFunction);

  // 2. Try to properly decode by checking the encoding
  const properDecode = await page.evaluate(() => {
    if (typeof estmDataAuto === 'undefined' || typeof dnw_decode === 'undefined') {
      return 'NO DATA';
    }

    const keys = Object.keys(estmDataAuto);
    const trimKey = keys.find(k => k.startsWith('T')) || keys[0];

    try {
      const raw = estmDataAuto[trimKey];
      const decoded = dnw_decode(raw);

      // Try to understand the structure
      // Split by common delimiters and see what we get
      const lines = decoded.split('\n').filter(l => l.trim().length > 0);
      const pipeDelimited = decoded.split('|').filter(l => l.trim().length > 0).length;
      const commaDelimited = decoded.split(',').filter(l => l.trim().length > 0).length;
      const tabDelimited = decoded.split('\t').filter(l => l.trim().length > 0).length;

      return {
        totalLength: decoded.length,
        lineCount: lines.length,
        pipeCount: pipeDelimited,
        commaCount: commaDelimited,
        tabCount: tabDelimited,
        sample: {
          first200chars: decoded.substring(0, 200).replace(/[^\x20-\x7E\n\t]/g, '?'),
          first3Lines: lines.slice(0, 3).map(l => l.substring(0, 200).replace(/[^\x20-\x7E\n\t]/g, '?')),
          first10Pipes: decoded.split('|').slice(0, 10).map(p => p.substring(0, 100).replace(/[^\x20-\x7E\n\t]/g, '?'))
        }
      };
    } catch (e) {
      return 'ERROR: ' + e.message;
    }
  });

  console.log('\n=== Properly Decoded Structure ===');
  console.log(JSON.stringify(properDecode, null, 2));

  // 3. Check what getSpecPopup function does
  const getSpecPopupFunc = await page.evaluate(() => {
    if (typeof getSpecPopup === 'undefined') return 'NOT FOUND';
    return getSpecPopup.toString();
  });

  console.log('\n=== getSpecPopup Function ===');
  console.log(getSpecPopupFunc);

  // 4. Actually call getSpecPopup and see what happens
  console.log('\n=== Calling getSpecPopup ===');

  try {
    // Get popup parameters
    const params = await page.evaluate(() => {
      const links = document.querySelectorAll('a[href*="getSpecPopup"]');
      if (links.length === 0) return null;
      const href = links[0].getAttribute('href');
      const match = href.match(/getSpecPopup\("([^"]+)",\s*(\d+),\s*"[^"]*",\s*(\d+),\s*(\d+)\)/);
      if (!match) return null;
      return {
        type: match[1],
        gradeId: parseInt(match[2]),
        title: '가격·제원·사양',
        trimId: parseInt(match[3]),
        modelId: parseInt(match[4])
      };
    });

    console.log('Popup params:', params);

    // Click the button and wait for popup
    const popupPromise = new Promise((resolve) => {
      browser.on('targetcreated', async (target) => {
        if (target.type() === 'page') {
          const newPage = await target.page();
          resolve(newPage);
        }
      });
      // Also set a timeout
      setTimeout(() => resolve(null), 5000);
    });

    await page.evaluate((params) => {
      getSpecPopup(params.type, params.gradeId, params.title, params.trimId, params.modelId);
    }, params);

    const popupPage = await popupPromise;

    if (popupPage) {
      console.log('Popup opened! URL:', popupPage.url());
      await popupPage.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {});
      await new Promise(r => setTimeout(r, 3000));

      // Get popup page content
      const popupContent = await popupPage.evaluate(() => {
        return {
          title: document.title,
          url: window.location.href,
          bodyText: document.body.innerText.substring(0, 3000),
          tables: Array.from(document.querySelectorAll('table')).length,
          hasSpecKeywords: document.body.innerText.includes('전장') ||
                          document.body.innerText.includes('배기량') ||
                          document.body.innerText.includes('출력')
        };
      });

      console.log('\n=== Popup Page Content ===');
      console.log(JSON.stringify(popupContent, null, 2));

      if (popupContent.hasSpecKeywords) {
        // Extract actual spec data
        const specData = await popupPage.evaluate(() => {
          const result = [];
          const tables = document.querySelectorAll('table');

          tables.forEach(table => {
            const rows = Array.from(table.querySelectorAll('tr'));
            rows.forEach(row => {
              const cells = Array.from(row.querySelectorAll('th, td'));
              const rowData = cells.map(c => c.innerText.trim());
              if (rowData.some(cell => cell.includes('전장') || cell.includes('배기량') ||
                                       cell.includes('출력') || cell.includes('연비'))) {
                result.push(rowData);
              }
            });
          });

          return result;
        });

        console.log('\n=== Extracted Spec Rows ===');
        specData.forEach(row => {
          console.log(row.join(' | '));
        });
      }

      await popupPage.close();
    } else {
      console.log('No popup opened - might be opening in same window or iframe');

      // Check for iframe
      const iframeContent = await page.evaluate(() => {
        const iframes = document.querySelectorAll('iframe');
        if (iframes.length === 0) return 'No iframes';

        const results = [];
        iframes.forEach((iframe, i) => {
          results.push({
            index: i,
            src: iframe.src,
            name: iframe.name,
            id: iframe.id
          });
        });
        return results;
      });

      console.log('Iframes on page:', JSON.stringify(iframeContent, null, 2));
    }
  } catch (e) {
    console.log('Error calling popup:', e.message);
  }

  await browser.close();
}
explore().catch(console.error);
