const puppeteer = require('puppeteer');

async function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function analyzeLineupStructure(browser, carId) {
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

  try {
    await page.goto(`https://auto.danawa.com/newcar/?Work=estimate&Model=${carId}`, {
      waitUntil: 'networkidle2', timeout: 30000,
    });
    await delay(3000);

    const data = await page.evaluate(() => {
      const result = { lineups: [], trimsByLineup: {} };

      // Find lineup (fuel type) tabs/buttons
      // Danawa uses .lineup_list or similar for fuel type selection
      const lineupItems = document.querySelectorAll('.lineup_list li, .lineup-list li, [class*="lineup"] li');

      lineupItems.forEach((li, idx) => {
        const name = li.textContent.trim().replace(/\s+/g, ' ');
        const input = li.querySelector('input');
        const lineupId = input ? (input.value || input.id) : ('lineup_' + idx);
        result.lineups.push({ id: lineupId, name, index: idx });
      });

      // If no lineup items found, check for other structures
      if (result.lineups.length === 0) {
        // Check for tab-style lineup
        const tabs = document.querySelectorAll('.tab_lineup a, .tab-lineup a, [class*="lineup"] a');
        tabs.forEach((a, idx) => {
          result.lineups.push({ id: 'tab_' + idx, name: a.textContent.trim(), index: idx });
        });
      }

      // Capture current trim list structure
      const trimRadios = document.querySelectorAll('input[type="radio"]');
      const allTrims = [];
      const seen = new Set();
      trimRadios.forEach(r => {
        const id = r.id || '';
        if (!id.startsWith('trim_')) return;
        if (seen.has(id)) return;
        seen.add(id);

        const parent = r.closest('li') || r.closest('div') || r.parentElement;
        let name = '';
        let price = 0;

        if (parent) {
          const nameEl = parent.querySelector('.name, .tit, .title, label');
          if (nameEl) name = nameEl.textContent.trim().split('\n')[0].trim();
          if (!name) name = parent.textContent.trim().split(/[\t\n]/)[0].trim();

          const priceEl = parent.querySelector('.price, .prc');
          if (priceEl) {
            const priceText = priceEl.textContent.replace(/[^0-9]/g, '');
            if (priceText) price = parseInt(priceText);
          }
        }

        allTrims.push({ id, name, price });
      });
      result.currentTrims = allTrims;
      result.currentTrimCount = allTrims.length;

      // Check full HTML structure around lineups
      const estimateContent = document.querySelector('#estimateLineupList, .lineup_list, [class*="lineup_list"]');
      result.lineupHtml = estimateContent ? estimateContent.outerHTML.substring(0, 2000) : 'NOT_FOUND';

      // Check page structure
      const pageStructure = [];
      document.querySelectorAll('[id*="lineup"], [class*="lineup"]').forEach(el => {
        pageStructure.push({ tag: el.tagName, id: el.id, class: el.className, text: el.textContent.substring(0, 100) });
      });
      result.lineupElements = pageStructure;

      return result;
    });

    await page.close();
    return data;
  } catch(e) {
    try { await page.close(); } catch(e2) {}
    return { error: e.message };
  }
}

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });

  // Test with cars that have mixed fuel types
  const testCars = [
    { id: '4435', name: '현대 싼타페' },
    { id: '4650', name: 'BMW 3시리즈' },
    { id: '4373', name: '벤츠 GLC' },
  ];

  for (const car of testCars) {
    console.log('\n' + '='.repeat(80));
    console.log(car.name + ' (' + car.id + ')');
    console.log('='.repeat(80));

    const data = await analyzeLineupStructure(browser, car.id);

    if (data.error) {
      console.log('ERROR:', data.error);
      continue;
    }

    console.log('\n라인업 탭:', data.lineups.length + '개');
    data.lineups.forEach(l => console.log('  ' + l.index + ': ' + l.name + ' (id: ' + l.id + ')'));

    console.log('\n현재 보이는 트림:', data.currentTrimCount + '개');
    data.currentTrims.slice(0, 5).forEach(t => console.log('  ' + t.name + ' (' + t.price.toLocaleString() + ')'));
    if (data.currentTrimCount > 5) console.log('  ...' + (data.currentTrimCount - 5) + '개 더');

    console.log('\n라인업 관련 DOM 요소:', data.lineupElements.length + '개');
    data.lineupElements.forEach(e => console.log('  <' + e.tag + ' id="' + e.id + '" class="' + (e.class || '').substring(0, 60) + '"> ' + e.text.substring(0, 80)));

    console.log('\n라인업 HTML (일부):', data.lineupHtml.substring(0, 500));
  }

  await browser.close();
})();
