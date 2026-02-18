const puppeteer = require('puppeteer');

async function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

const testCars = [
  { id: '4361', brand: '현대', name: '코나 (control)' },
  { id: '4371', brand: 'BMW', name: 'X1' },
  { id: '4735', brand: '아우디', name: 'A5' },
  { id: '4037', brand: '벤츠', name: 'C-클래스' },
  { id: '4173', brand: '토요타', name: 'RAV4 FL' },
  { id: '4399', brand: '현대', name: '포터2 EV' },
];

async function testCar(browser, car) {
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  const url = `https://auto.danawa.com/newcar/?Work=estimate&Model=${car.id}`;

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await delay(2000);

    // Click first trim radio
    await page.evaluate(() => {
      const radios = document.querySelectorAll('input[type="radio"]');
      if (radios.length > 0) radios[0].click();
    });
    await delay(3000);

    // Extract options with correct selectors
    const result = await page.evaluate(() => {
      // Get ALL checkboxes with name="option" (actual selectable options)
      const allCheckboxes = document.querySelectorAll('input[type="checkbox"]');
      const optionCheckboxes = document.querySelectorAll('input[type="checkbox"][name="option"]');

      // Separate popupItem (car options) from term (financial options)
      const carOptions = [];
      const termOptions = [];

      optionCheckboxes.forEach(cb => {
        const id = cb.id || '';
        const parent = cb.closest('li') || cb.closest('div') || cb.parentElement;
        const fullText = parent ? parent.textContent.trim() : '';

        // Extract name: first meaningful text before tabs/special chars
        const lines = fullText.split(/[\t\n]+/).map(s => s.trim()).filter(s => s.length > 0);
        const name = lines[0] || '';

        // Extract price: look for XX만 원 pattern
        const priceMatch = fullText.match(/(\d[\d,]*)만\s*원/);
        const price = priceMatch ? parseInt(priceMatch[1].replace(/,/g, '')) * 10000 : 0;

        const entry = { id, name, price };

        if (id.startsWith('popupItem_')) {
          carOptions.push(entry);
        } else if (id.startsWith('term_')) {
          termOptions.push(entry);
        } else {
          carOptions.push(entry); // default to car option
        }
      });

      // Check for "선택품목이 없습니다"
      const noOptionsMsg = document.body.innerText.includes('선택품목이 없습니다');

      return {
        allCheckboxCount: allCheckboxes.length,
        optionCheckboxCount: optionCheckboxes.length,
        carOptions,
        termOptionCount: termOptions.length,
        noOptionsMsg,
      };
    });

    await page.close();
    return { ...car, ...result };
  } catch (e) {
    await page.close();
    return { ...car, error: e.message.substring(0, 100) };
  }
}

async function main() {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });

  for (const car of testCars) {
    process.stdout.write(`${car.brand} ${car.name} (${car.id}): `);
    const r = await testCar(browser, car);

    if (r.error) {
      console.log('ERROR -', r.error);
    } else if (r.carOptions.length > 0) {
      console.log(`${r.carOptions.length} options found!`);
      r.carOptions.forEach(o => console.log(`  - ${o.name}: ${o.price.toLocaleString()}원`));
    } else {
      console.log(`No options. (checkboxes: ${r.allCheckboxCount}, noOptionsMsg: ${r.noOptionsMsg})`);
    }
    console.log('');
  }

  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
