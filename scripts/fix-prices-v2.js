const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function parsePrice(text) {
  text = text.replace(/,/g, '').replace(/\s+/g, '');
  let total = 0;
  const eokMatch = text.match(/(\d+)억/);
  const manMatch = text.match(/(\d+)만/);
  if (eokMatch) total += parseInt(eokMatch[1]) * 100000000;
  if (manMatch) total += parseInt(manMatch[1]) * 10000;
  return total;
}

async function scrapePrices(browser, carId) {
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  try {
    await page.goto(`https://auto.danawa.com/newcar/?Work=estimate&Model=${carId}`, {
      waitUntil: 'networkidle2', timeout: 30000,
    });
    await delay(2000);

    const trimData = await page.evaluate(() => {
      const results = [];
      const radios = document.querySelectorAll('input[type="radio"]');

      radios.forEach(r => {
        if (!r.name || !r.name.startsWith('eChkTrim')) return;
        const container = r.closest('div.choice') || r.closest('li') || r.parentElement;
        if (!container) return;
        const text = container.textContent.replace(/\s+/g, ' ').trim();

        // Extract trim name (before any price)
        let trimName = text.replace(/(\d+억\s*)?[\d,]+만\s*원.*$/, '').trim();
        trimName = trimName.replace(/TOP\d+선택률:\s*\d+%\s*/g, '').trim();
        // Remove duplicate name halves
        const half = Math.floor(trimName.length / 2);
        if (half > 5) {
          const a = trimName.substring(0, half).trim();
          const b = trimName.substring(half).trim();
          if (a === b) trimName = a;
        }
        // Clean leading dash from discount display
        trimName = trimName.replace(/^-\s*/, '').trim();

        // Extract ALL price matches and take the MAXIMUM (= MSRP/정가)
        const allMatches = text.match(/(\d+억\s*)?[\d,]+만\s*원/g) || [];

        results.push({ name: trimName, priceTexts: allMatches });
      });
      return results;
    });

    await page.close();

    return trimData.map((t, idx) => {
      // Parse all price matches and take the MAX (MSRP)
      const prices = t.priceTexts.map(p => parsePrice(p)).filter(p => p > 0);
      const price = prices.length > 0 ? Math.max(...prices) : 0;

      return {
        id: `grade_${idx}`,
        name: t.name || `Trim ${idx + 1}`,
        price,
        features: [],
      };
    }).filter(t => t.price > 0);
  } catch (e) {
    await page.close();
    return null;
  }
}

async function main() {
  const detailsPath = path.join(__dirname, '..', 'src', 'constants', 'generated-car-details.json');
  const carsPath = path.join(__dirname, '..', 'src', 'constants', 'generated-cars.json');
  const details = JSON.parse(fs.readFileSync(detailsPath, 'utf8'));
  const carsData = JSON.parse(fs.readFileSync(carsPath, 'utf8'));

  const newCarIds = [
    '3668','3772','3775','3803','3825',
    '3982','3992','4011','4043','4062','4072','4073',
    '4111','4119','4171',
    '4363','4373','4379','4380','4395','4404','4421','4427','4431','4436',
    '4446','4461','4471','4472','4476','4479',
    '4495','4496','4499',
    '4506','4507','4508','4511','4513','4516','4517',
    '4548','4551','4555','4560','4565','4566','4568','4569',
    '4582',
    '4613','4619','4626','4632','4635','4638','4639','4646','4649','4650','4651','4652','4655','4656','4657',
    '4670','4674','4683',
    '4700','4705',
    '4737','4740','4741','4747','4750',
    '4763','4777','4779',
  ];

  console.log(`Fixing prices (v2 - max strategy) for ${newCarIds.length} cars...\n`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  let fixed = 0, same = 0, failed = 0;

  for (let i = 0; i < newCarIds.length; i++) {
    const carId = newCarIds[i];
    const d = details[carId];
    if (!d) continue;

    process.stdout.write(`[${i+1}/${newCarIds.length}] ${d.brand} ${d.name} (${carId}): `);

    const trims = await scrapePrices(browser, carId);

    if (trims && trims.length > 0) {
      const oldMin = Math.min(...details[carId].trims.map(t => t.price));
      const newMin = Math.min(...trims.map(t => t.price));

      details[carId].trims = trims;
      const carEntry = carsData.cars.find(c => c.id === carId);
      if (carEntry) {
        carEntry.startPrice = newMin;
        carEntry.gradeCount = trims.length;
      }

      const marker = oldMin !== newMin ? `${(oldMin/10000).toLocaleString()}만 -> ${(newMin/10000).toLocaleString()}만` : `${(newMin/10000).toLocaleString()}만 (same)`;
      console.log(`${trims.length} trims, min: ${marker}`);
      if (oldMin !== newMin) fixed++; else same++;
    } else {
      console.log('FAILED');
      failed++;
    }

    await delay(300);
  }

  await browser.close();

  fs.writeFileSync(detailsPath, JSON.stringify(details, null, 2), 'utf8');
  fs.writeFileSync(carsPath, JSON.stringify(carsData, null, 2), 'utf8');

  console.log(`\nDone. Fixed: ${fixed}, Same: ${same}, Failed: ${failed}`);
}

main().catch(e => { console.error(e); process.exit(1); });
