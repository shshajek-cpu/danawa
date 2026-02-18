const puppeteer = require('puppeteer');

async function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function debugPage(carId, carName) {
  const browser = await puppeteer.launch({ headless: false, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  const url = `https://auto.danawa.com/newcar/?Work=estimate&Model=${carId}`;
  console.log(`Opening ${carName} (${carId}): ${url}`);

  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  await delay(3000);

  // Take screenshot
  await page.screenshot({ path: `/Users/heejunkim/Desktop/danawa/scripts/debug-${carId}.png`, fullPage: true });

  // Extract detailed page structure
  const analysis = await page.evaluate(() => {
    const info = {
      title: document.title,
      allElements: {},
      estmData: null,
      tabStructure: [],
    };

    // Check for step/tab containers
    const possibleTabContainers = [
      '.step1, .step_1, [class*="step1"]',
      '.fuel_select, .fuel-select, [class*="fuel"]',
      '.model_select, [class*="model"]',
      '.grade_select, [class*="grade"]',
      'ul.tabs, ul.tab-list, .tab-menu',
    ];

    possibleTabContainers.forEach(selector => {
      const els = document.querySelectorAll(selector);
      if (els.length > 0) {
        info.allElements[selector] = Array.from(els).slice(0, 3).map(el => ({
          tag: el.tagName,
          class: el.className,
          id: el.id,
          html: el.outerHTML.substring(0, 500),
        }));
      }
    });

    // Look for radio buttons that might be fuel type selectors
    const allRadios = document.querySelectorAll('input[type="radio"]');
    const radioGroups = {};
    allRadios.forEach(radio => {
      const name = radio.name;
      if (!radioGroups[name]) radioGroups[name] = [];

      const parent = radio.closest('li') || radio.closest('div') || radio.parentElement;
      radioGroups[name].push({
        id: radio.id,
        value: radio.value,
        checked: radio.checked,
        label: parent ? parent.textContent.trim().substring(0, 60) : '',
      });
    });

    info.radioGroups = radioGroups;

    // Try to access estmDataAuto
    if (typeof estmDataAuto !== 'undefined') {
      info.estmData = {
        length: estmDataAuto.length,
        firstItem: estmDataAuto.length > 0 ? {
          keys: Object.keys(estmDataAuto[0]),
          sample: JSON.stringify(estmDataAuto[0]).substring(0, 500),
        } : null,
      };
    }

    // Look for visible text containing fuel types
    const bodyText = document.body.innerText;
    info.fuelTypeOccurrences = {
      gasoline: (bodyText.match(/가솔린/g) || []).length,
      diesel: (bodyText.match(/디젤/g) || []).length,
      hybrid: (bodyText.match(/하이브리드/g) || []).length,
      electric: (bodyText.match(/전기/g) || []).length,
      lpg: (bodyText.match(/LPG/g) || []).length,
    };

    return info;
  });

  console.log('\n=== PAGE ANALYSIS ===');
  console.log(JSON.stringify(analysis, null, 2));

  console.log('\n\nBrowser will stay open for 30 seconds. Check the screenshot and page manually.');
  console.log('Screenshot saved to: scripts/debug-' + carId + '.png');

  await delay(30000);
  await browser.close();
}

// Test with Santa Fe (4435) - known to have multiple fuel types
debugPage('4435', '싼타페').catch(console.error);
