const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function scrapeCar(browser, carId, carName) {
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  const url = `https://auto.danawa.com/newcar/?Work=estimate&Model=${carId}`;

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await delay(2000);

    // Click first trim radio to load options
    await page.evaluate(() => {
      const radios = document.querySelectorAll('input[type="radio"]');
      if (radios.length > 0) radios[0].click();
    });
    await delay(3000);

    // Extract options
    const options = await page.evaluate(() => {
      const optionCheckboxes = document.querySelectorAll('input[type="checkbox"][name="option"]');
      const carOptions = [];

      optionCheckboxes.forEach(cb => {
        const id = cb.id || '';
        // Only popupItem are real car options
        if (!id.startsWith('popupItem_')) return;

        const parent = cb.closest('li') || cb.closest('div') || cb.parentElement;
        const fullText = parent ? parent.textContent.trim() : '';

        // Extract name
        const lines = fullText.split(/[\t\n]+/).map(s => s.trim()).filter(s => s.length > 0);
        let name = lines[0] || '';

        // Extract price
        const priceMatch = fullText.match(/(\d[\d,]*)만\s*원/);
        const price = priceMatch ? parseInt(priceMatch[1].replace(/,/g, '')) * 10000 : 0;

        // Extract description (items included)
        let description = '';
        const descEl = parent ? parent.querySelector('.desc, .detail-txt, .option-desc') : null;
        if (descEl) description = descEl.textContent.trim();

        if (name) {
          carOptions.push({ name, price, description });
        }
      });

      return carOptions;
    });

    await page.close();
    return options;
  } catch (e) {
    await page.close();
    console.error(`  Error scraping ${carName} (${carId}): ${e.message.substring(0, 80)}`);
    return [];
  }
}

async function main() {
  const detailsPath = path.join(__dirname, '..', 'src', 'constants', 'generated-car-details.json');
  const carsPath = path.join(__dirname, '..', 'src', 'constants', 'generated-cars.json');
  const details = JSON.parse(fs.readFileSync(detailsPath, 'utf8'));
  const cars = JSON.parse(fs.readFileSync(carsPath, 'utf8'));

  // Find cars with no options
  const noOptCars = [];
  for (const [id, d] of Object.entries(details)) {
    if (!d.selectableOptions || d.selectableOptions.length === 0) {
      const car = cars.cars.find(x => x.id === id);
      noOptCars.push({
        id,
        brand: d.brand || (car ? car.brandName : ''),
        name: d.name || (car ? car.name : ''),
      });
    }
  }

  console.log(`Found ${noOptCars.length} cars with no options. Scraping all...\n`);

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  let updatedCount = 0;
  let noDataCount = 0;
  const results = [];

  for (let i = 0; i < noOptCars.length; i++) {
    const car = noOptCars[i];
    process.stdout.write(`[${i + 1}/${noOptCars.length}] ${car.brand} ${car.name} (${car.id}): `);

    const options = await scrapeCar(browser, car.id, car.name);

    if (options.length > 0) {
      // Update details
      details[car.id].selectableOptions = options;
      updatedCount++;
      console.log(`${options.length} options found!`);
      options.forEach(o => console.log(`  - ${o.name}: ${o.price.toLocaleString()}원`));
      results.push({ id: car.id, brand: car.brand, name: car.name, options: options.length });
    } else {
      noDataCount++;
      console.log('No options on Danawa');
    }

    // Small delay between requests to be respectful
    await delay(500);
  }

  await browser.close();

  // Save updated details
  if (updatedCount > 0) {
    fs.writeFileSync(detailsPath, JSON.stringify(details, null, 2), 'utf8');
    console.log(`\n=== Results ===`);
    console.log(`Updated: ${updatedCount} cars with new option data`);
    results.forEach(r => console.log(`  - ${r.brand} ${r.name}: ${r.options} options`));
  }

  console.log(`No options available: ${noDataCount} cars (Danawa has no selectable options for these)`);
  console.log(`\nTotal processed: ${noOptCars.length}`);
}

main().catch(e => { console.error(e); process.exit(1); });
