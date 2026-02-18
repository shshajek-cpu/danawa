const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function parseColorsFromHtml(html, carId) {
  const colors = [];
  // Pattern: color="C11" ... style="background:#e8e8e8;" ... <span class="blind">알파인 화이트 (300)</span>
  const regex = /color="(C\d+)"[^>]*style="background:([^"]+)"[^>]*>\s*<span[^>]*class="blind"[^>]*>([^<]+)<\/span>/g;
  let m;
  const seen = new Set();

  while ((m = regex.exec(html)) !== null) {
    const colorCode = m[1];
    let hex = m[2].trim();
    const name = m[3].trim();

    if (seen.has(name)) continue;
    seen.add(name);

    // Ensure hex format
    if (!hex.startsWith('#')) hex = '#cccccc';

    colors.push({
      id: `color_${colors.length + 1}`,
      name,
      imageUrl: `https://autoimg.danawa.com/photo/${carId}/color_${colorCode}_360.png`,
      hex,
      price: 0,
    });
  }

  return colors;
}

async function scrapeColors(browser, carId) {
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  try {
    await page.goto(`https://auto.danawa.com/newcar/?Work=estimate&Model=${carId}`, {
      waitUntil: 'networkidle2', timeout: 30000,
    });
    await delay(1500);

    // Click first trim to load colors
    await page.evaluate(() => {
      const radio = document.querySelector('input[type="radio"]');
      if (radio) radio.click();
    });
    await delay(4000);

    // Get full page HTML
    const html = await page.content();
    const colors = parseColorsFromHtml(html, carId);

    await page.close();
    return colors;
  } catch (e) {
    await page.close();
    return [];
  }
}

async function main() {
  const detailsPath = path.join(__dirname, '..', 'src', 'constants', 'generated-car-details.json');
  const carsPath = path.join(__dirname, '..', 'src', 'constants', 'generated-cars.json');
  const detailsData = JSON.parse(fs.readFileSync(detailsPath, 'utf8'));
  const carsData = JSON.parse(fs.readFileSync(carsPath, 'utf8'));

  // Find cars with 0-1 colors (default placeholder)
  const needColors = [];
  for (const [id, d] of Object.entries(detailsData)) {
    if (!d.colorImages || d.colorImages.length <= 1) {
      needColors.push({ id, brand: d.brand, name: d.name });
    }
  }

  console.log(`Found ${needColors.length} cars needing colors.\n`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  let updated = 0, noColor = 0;

  for (let i = 0; i < needColors.length; i++) {
    const car = needColors[i];
    process.stdout.write(`[${i + 1}/${needColors.length}] ${car.brand} ${car.name} (${car.id}): `);

    const colors = await scrapeColors(browser, car.id);

    if (colors.length > 0) {
      // Only take exterior colors (first set before "내장색상")
      detailsData[car.id].colorImages = colors;
      detailsData[car.id].imageUrl = colors[0].imageUrl;

      const carEntry = carsData.cars.find(c => c.id === car.id);
      if (carEntry) carEntry.imageUrl = colors[0].imageUrl;

      console.log(`${colors.length} colors`);
      updated++;
    } else {
      console.log('no colors');
      noColor++;
    }

    await delay(200);
  }

  await browser.close();

  fs.writeFileSync(detailsPath, JSON.stringify(detailsData, null, 2), 'utf8');
  fs.writeFileSync(carsPath, JSON.stringify(carsData, null, 2), 'utf8');

  console.log(`\nDone. Updated: ${updated}, No colors: ${noColor}`);
}

main().catch(e => { console.error(e); process.exit(1); });
