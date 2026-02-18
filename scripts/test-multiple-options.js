const puppeteer = require('puppeteer');

async function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

const testCars = [
  { id: '4399', brand: '현대', name: '포터2 EV' },
  { id: '4371', brand: 'BMW', name: 'X1' },
  { id: '4735', brand: '아우디', name: 'A5' },
  { id: '4173', brand: '토요타', name: 'RAV4 FL' },
  { id: '4037', brand: '벤츠', name: 'C-클래스' },
  { id: '4164', brand: '렉서스', name: 'NX' },
  { id: '4547', brand: '혼다', name: '어코드' },
  { id: '4361', brand: '현대', name: '코나 (control - has options)' },
];

async function testCar(browser, car) {
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  const url = `https://auto.danawa.com/newcar/?Work=estimate&Model=${car.id}`;
  const result = { id: car.id, brand: car.brand, name: car.name, hasOptions: false, optionCount: 0, message: '' };

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await delay(2000);

    // Click first grade radio button
    const clicked = await page.evaluate(() => {
      const radios = document.querySelectorAll('input[type="radio"]');
      if (radios.length > 0) {
        radios[0].click();
        return true;
      }
      return false;
    });

    if (clicked) {
      await delay(3000);
    }

    // Check for options
    const optionInfo = await page.evaluate(() => {
      const info = { noOptionsMsg: false, optionElements: 0, optionTexts: [], addOptHTML: '' };

      // Check for "선택품목이 없습니다" message
      const allText = document.body.innerText;
      if (allText.includes('선택품목이 없습니다')) {
        info.noOptionsMsg = true;
      }

      // Check for option checkboxes or items
      const optCheckboxes = document.querySelectorAll('.option_check input[type="checkbox"], .addopt_check input[type="checkbox"], .opt_item input[type="checkbox"]');
      info.optionElements = optCheckboxes.length;

      // Check for addOpt area
      const addOptArea = document.querySelector('.addopt_area, .option_area, #addOptArea, .add_option');
      if (addOptArea) {
        info.addOptHTML = addOptArea.innerHTML.substring(0, 300);
      }

      // Look for option-like text
      const els = document.querySelectorAll('*');
      els.forEach(el => {
        const text = el.textContent.trim();
        if (el.children.length === 0 && text.length > 3 && text.length < 60) {
          if (text.includes('패키지') || text.includes('선루프') || text.includes('네비') || text.includes('시트') || text.includes('옵션')) {
            if (!info.optionTexts.includes(text)) {
              info.optionTexts.push(text);
            }
          }
        }
      });
      info.optionTexts = info.optionTexts.slice(0, 10);

      // Check estmDataAuto
      if (typeof estmDataAuto !== 'undefined' && estmDataAuto.length > 0) {
        info.estmDataAutoLen = estmDataAuto.length;
        // Check for addOpt in first item
        const first = estmDataAuto[0];
        if (first && first.addOpt) {
          info.addOptCount = first.addOpt.length;
          if (first.addOpt.length > 0) {
            info.addOptSample = first.addOpt.slice(0, 2).map(o => ({ name: o.name || o.optName, price: o.price || o.optPrice }));
          }
        }
      } else {
        info.estmDataAutoLen = 0;
      }

      return info;
    });

    result.hasOptions = optionInfo.optionElements > 0 || (optionInfo.estmDataAutoLen > 0 && optionInfo.addOptCount > 0);
    result.optionCount = optionInfo.optionElements || (optionInfo.addOptCount || 0);
    result.noOptionsMsg = optionInfo.noOptionsMsg;
    result.estmDataLen = optionInfo.estmDataAutoLen;
    result.optionTexts = optionInfo.optionTexts;
    if (optionInfo.addOptSample) result.addOptSample = optionInfo.addOptSample;
    if (optionInfo.addOptHTML) result.addOptHTML = optionInfo.addOptHTML.substring(0, 150);
    result.message = result.hasOptions ? 'OPTIONS FOUND' : (optionInfo.noOptionsMsg ? 'No selectable items' : 'No options detected');

  } catch (e) {
    result.message = 'Error: ' + e.message.substring(0, 100);
  }

  await page.close();
  return result;
}

async function main() {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });

  console.log('Testing', testCars.length, 'cars for option data on Danawa...\n');

  for (const car of testCars) {
    process.stdout.write(`Testing ${car.brand} ${car.name} (${car.id})... `);
    const result = await testCar(browser, car);
    console.log(result.message);
    if (result.optionCount > 0) {
      console.log(`  -> ${result.optionCount} options found`);
      if (result.addOptSample) console.log(`  -> Sample:`, JSON.stringify(result.addOptSample));
    }
    if (result.optionTexts && result.optionTexts.length > 0) {
      console.log(`  -> Option texts:`, result.optionTexts.slice(0, 5).join(', '));
    }
    if (result.estmDataLen > 0) {
      console.log(`  -> estmDataAuto length:`, result.estmDataLen);
    }
  }

  await browser.close();
  console.log('\nDone.');
}

main().catch(e => { console.error(e); process.exit(1); });
