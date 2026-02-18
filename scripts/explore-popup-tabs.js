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
      trimId: parseInt(match[3]),
      modelId: parseInt(match[4])
    };
  });

  console.log('Opening popup with params:', params);

  // Open the popup directly
  const popupUrl = `https://auto.danawa.com/auto/modelPopup.php?Type=price&Lineup=${params.gradeId}&Trims=${params.trimId}`;
  await page.goto(popupUrl, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));

  // 1. Find tabs on the popup page
  const tabs = await page.evaluate(() => {
    const tabElements = document.querySelectorAll('a, button, div, li');
    const tabs = [];

    tabElements.forEach(el => {
      const text = el.innerText || '';
      const href = el.getAttribute('href') || '';
      const onclick = el.getAttribute('onclick') || '';

      if (text.includes('제원') || text.includes('사양') || text.includes('옵션') ||
          href.includes('spec') || onclick.includes('spec')) {
        tabs.push({
          tag: el.tagName,
          text: text.substring(0, 100),
          href: href,
          onclick: onclick.substring(0, 200),
          className: el.className
        });
      }
    });

    return tabs;
  });

  console.log('\n=== Tabs on Popup Page ===');
  console.log(JSON.stringify(tabs, null, 2));

  // 2. Try clicking the spec/option tab
  console.log('\n=== Clicking Spec Tab ===');

  const tabClicked = await page.evaluate(() => {
    // Look for the tab that contains "제원·사양/옵션"
    const elements = Array.from(document.querySelectorAll('*'));
    const specTab = elements.find(el => {
      const text = el.innerText || '';
      return text.includes('제원') && text.includes('사양');
    });

    if (specTab) {
      specTab.click();
      return true;
    }
    return false;
  });

  console.log('Tab clicked:', tabClicked);

  if (tabClicked) {
    await new Promise(r => setTimeout(r, 2000));

    // Get the spec data after clicking
    const specData = await page.evaluate(() => {
      const result = {
        allText: [],
        tables: [],
        sections: []
      };

      // Get all visible text that looks like specs
      const keywords = ['전장', '전폭', '전고', '축거', '윤거', '최저지상고',
                       '배기량', '최고출력', '최대토크', '연비',
                       '공차중량', '승차정원', '타이어', '변속기'];

      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );

      const textNodes = [];
      let node;
      while (node = walker.nextNode()) {
        const text = node.textContent.trim();
        keywords.forEach(keyword => {
          if (text.includes(keyword) && text.length < 300) {
            textNodes.push(text);
          }
        });
      }

      result.allText = [...new Set(textNodes)].slice(0, 100);

      // Get all tables
      const tables = document.querySelectorAll('table');
      tables.forEach((table, i) => {
        const rows = Array.from(table.querySelectorAll('tr'));
        const tableData = [];

        rows.forEach(row => {
          const cells = Array.from(row.querySelectorAll('th, td'));
          const rowData = cells.map(c => c.innerText.trim());
          if (rowData.some(cell => keywords.some(k => cell.includes(k)))) {
            tableData.push(rowData);
          }
        });

        if (tableData.length > 0) {
          result.tables.push({
            index: i,
            rows: tableData
          });
        }
      });

      return result;
    });

    console.log('\n=== Spec Data After Clicking Tab ===');
    console.log('Found', specData.allText.length, 'text nodes with spec keywords');
    console.log('Found', specData.tables.length, 'tables with spec data');

    specData.allText.slice(0, 30).forEach(text => {
      console.log('  ', text);
    });

    console.log('\n=== Spec Tables ===');
    specData.tables.forEach(table => {
      console.log(`\n--- Table ${table.index} ---`);
      table.rows.forEach(row => {
        console.log('  ', row.join(' | '));
      });
    });
  }

  // 3. Try accessing the spec page type directly
  console.log('\n=== Trying spec type parameter ===');
  const specTypeUrl = `https://auto.danawa.com/auto/modelPopup.php?Type=spec&Lineup=${params.gradeId}&Trims=${params.trimId}`;
  console.log('URL:', specTypeUrl);

  await page.goto(specTypeUrl, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));

  const specPageData = await page.evaluate(() => {
    const keywords = ['전장', '전폭', '전고', '축거', '윤거', '최저지상고',
                     '배기량', '최고출력', '최대토크', '연비',
                     '공차중량', '승차정원', '타이어', '변속기'];

    const result = {
      title: document.title,
      hasKeywords: false,
      tables: []
    };

    keywords.forEach(k => {
      if (document.body.innerText.includes(k)) {
        result.hasKeywords = true;
      }
    });

    // Extract all tables with spec data
    const tables = document.querySelectorAll('table');
    tables.forEach((table, i) => {
      const rows = Array.from(table.querySelectorAll('tr'));
      const tableData = [];

      rows.forEach(row => {
        const cells = Array.from(row.querySelectorAll('th, td'));
        const rowData = cells.map(c => c.innerText.trim());
        tableData.push(rowData);
      });

      // Only include tables that have spec data
      if (tableData.some(row => row.some(cell => keywords.some(k => cell.includes(k))))) {
        result.tables.push({
          index: i,
          rowCount: tableData.length,
          rows: tableData
        });
      }
    });

    return result;
  });

  console.log('\n=== Spec Type Page ===');
  console.log('Title:', specPageData.title);
  console.log('Has spec keywords:', specPageData.hasKeywords);
  console.log('Found', specPageData.tables.length, 'tables with spec data');

  specPageData.tables.forEach(table => {
    console.log(`\n--- Table ${table.index} (${table.rowCount} rows) ---`);
    table.rows.forEach(row => {
      console.log('  ', row.join(' | '));
    });
  });

  await browser.close();
}
explore().catch(console.error);
