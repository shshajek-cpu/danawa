const puppeteer = require('puppeteer');
const data = require('../src/constants/generated-cars.json');

async function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// Map our brand IDs to Danawa brand codes
const brandCodeMap = {
  'hyundai': 303, 'kia': 307, 'genesis': 304, 'kgm': 326,
  '쉐보레': 312, '르노코리아': 321,
  'bmw': 362, 'benz': 349, 'audi': 371, 'volvo': 459,
  'toyota': 491, 'lexus': 486, 'honda': 500, 'porsche': 381,
  'landrover': 399, 'jeep': 587, 'cadillac': 546, 'lincoln': 573,
  'peugeot': 413, 'polestar': 458, '테슬라': 611, 'gmc': 602,
};

async function main() {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  const ourCarIds = new Set(data.cars.map(c => c.id));
  const allMissing = [];

  for (const brand of data.brands) {
    const code = brandCodeMap[brand.id];
    if (!code) {
      console.log(`  SKIP ${brand.name} - no Danawa code`);
      continue;
    }

    process.stdout.write(`Checking ${brand.name} (code=${code})... `);

    const url = `https://auto.danawa.com/newcar/?Work=record&Tab=Model&Brand=${code}`;
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });
      await delay(1500);

      const danawaModels = await page.evaluate(() => {
        const results = [];
        const seen = new Set();
        const links = document.querySelectorAll('a[href*="Model="]');
        links.forEach(a => {
          const match = a.href.match(/Model=(\d+)/);
          const text = a.textContent.trim();
          if (match && text.length > 1 && text.length < 50 && !seen.has(match[1])) {
            seen.add(match[1]);
            results.push({ modelId: match[1], name: text });
          }
        });
        return results;
      });

      const ourCarsForBrand = data.cars.filter(c => c.brandId === brand.id);
      const missing = danawaModels.filter(m => !ourCarIds.has(m.modelId));

      console.log(`Danawa: ${danawaModels.length}, Ours: ${ourCarsForBrand.length}, Missing: ${missing.length}`);

      if (missing.length > 0) {
        missing.forEach(m => {
          console.log(`    MISSING: ${m.modelId}: ${m.name}`);
          allMissing.push({ brandId: brand.id, brandName: brand.name, brandCode: code, ...m });
        });
      }
    } catch (e) {
      console.log(`ERROR: ${e.message.substring(0, 60)}`);
    }

    await delay(500);
  }

  await browser.close();

  console.log(`\n=== SUMMARY ===`);
  console.log(`Total missing cars across all brands: ${allMissing.length}`);

  // Group by brand
  const byBrand = {};
  allMissing.forEach(m => {
    if (!byBrand[m.brandName]) byBrand[m.brandName] = [];
    byBrand[m.brandName].push(m);
  });

  for (const [brand, cars] of Object.entries(byBrand)) {
    console.log(`\n${brand}: ${cars.length}대 누락`);
    cars.forEach(c => console.log(`  ${c.modelId}: ${c.name}`));
  }
}

main().catch(e => { console.error(e); process.exit(1); });
