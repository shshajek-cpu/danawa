const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function rgbToHex(rgb) {
  if (!rgb || rgb.startsWith('#')) return rgb || '#cccccc';
  const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (match) {
    const r = parseInt(match[1]).toString(16).padStart(2, '0');
    const g = parseInt(match[2]).toString(16).padStart(2, '0');
    const b = parseInt(match[3]).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
  }
  return rgb;
}

function parseColorHtml(html) {
  const colors = [];
  // Parse button/label titles and background colors from HTML string
  // Pattern: title='색상이름' or title="색상이름"
  const titleRegex = /title=['"]([^'"]+)['"]/g;
  const titles = [];
  let m;
  while ((m = titleRegex.exec(html)) !== null) {
    const title = m[1].trim();
    if (title && title !== '외장색상 선택' && title.length < 50 && !titles.includes(title)) {
      titles.push(title);
    }
  }

  // Pattern: background-color: #xxx or background: #xxx or background-color:rgb(...)
  const bgRegex = /background(?:-color)?:\s*([^;'"]+)/g;
  const bgs = [];
  while ((m = bgRegex.exec(html)) !== null) {
    bgs.push(m[1].trim());
  }

  // Pattern: data-photo='xxx' or data-no='xxx'
  const photoRegex = /data-(?:photo|no)=['"]([^'"]+)['"]/g;
  const photos = [];
  while ((m = photoRegex.exec(html)) !== null) {
    photos.push(m[1]);
  }

  for (let i = 0; i < titles.length; i++) {
    colors.push({
      name: titles[i],
      hex: i < bgs.length ? rgbToHex(bgs[i]) : '#cccccc',
      photoCode: i < photos.length ? photos[i] : String(i + 1),
    });
  }

  return colors;
}

async function scrapeColors(browser, carId) {
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  let colorHtml = '';

  // Intercept the color AJAX response
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('trimsInfo') && url.includes('Color')) {
      try {
        const text = await response.text();
        if (text.length > colorHtml.length) {
          colorHtml = text;
        }
      } catch(e) {}
    }
  });

  const url = `https://auto.danawa.com/newcar/?Work=estimate&Model=${carId}`;

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await delay(1500);

    // Click first trim
    await page.evaluate(() => {
      const radio = document.querySelector('input[type="radio"]');
      if (radio) radio.click();
    });
    await delay(4000);

    await page.close();
    return parseColorHtml(colorHtml);
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

  // Find cars with 0-1 colors
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

  let updatedCount = 0;
  let noColorCount = 0;

  for (let i = 0; i < needColors.length; i++) {
    const car = needColors[i];
    process.stdout.write(`[${i + 1}/${needColors.length}] ${car.brand} ${car.name} (${car.id}): `);

    const colors = await scrapeColors(browser, car.id);

    if (colors.length > 0) {
      detailsData[car.id].colorImages = colors.map((c, idx) => ({
        id: `color_${idx + 1}`,
        name: c.name,
        imageUrl: `https://autoimg.danawa.com/photo/${car.id}/color_${c.photoCode}_360.png`,
        hex: c.hex,
        price: 0,
      }));

      detailsData[car.id].imageUrl = detailsData[car.id].colorImages[0].imageUrl;
      const carEntry = carsData.cars.find(c => c.id === car.id);
      if (carEntry) carEntry.imageUrl = detailsData[car.id].imageUrl;

      console.log(`${colors.length} colors`);
      updatedCount++;
    } else {
      // Keep default
      console.log('no colors');
      noColorCount++;
    }

    await delay(200);
  }

  await browser.close();

  fs.writeFileSync(detailsPath, JSON.stringify(detailsData, null, 2), 'utf8');
  fs.writeFileSync(carsPath, JSON.stringify(carsData, null, 2), 'utf8');

  console.log(`\nUpdated: ${updatedCount}, No colors: ${noColorCount}`);
  console.log('Files saved.');
}

main().catch(e => { console.error(e); process.exit(1); });
