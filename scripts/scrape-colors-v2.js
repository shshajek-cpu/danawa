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
  return '#cccccc';
}

async function scrapeColors(browser, carId) {
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  const url = `https://auto.danawa.com/newcar/?Work=estimate&Model=${carId}`;

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await delay(2000);

    // Click first trim
    await page.evaluate(() => {
      const radio = document.querySelector('input[type="radio"]');
      if (radio) radio.click();
    });
    await delay(4000);

    // Extract colors from the rendered DOM
    const colors = await page.evaluate((cid) => {
      const results = [];
      const seen = new Set();

      // Method 1: Button-based colors in #estimateExteriorColorList
      const colorButtons = document.querySelectorAll('#estimateExteriorColorList button, .choice-color__list button');
      colorButtons.forEach(btn => {
        const title = btn.getAttribute('title') || btn.getAttribute('data-name') || '';
        const chip = btn.querySelector('span[style], i[style], .colorchip');
        let hex = '#cccccc';
        if (chip) {
          const style = chip.getAttribute('style') || '';
          const bgMatch = style.match(/background[^:]*:\s*([^;]+)/);
          if (bgMatch) hex = bgMatch[1].trim();
        }
        const dataPhoto = btn.getAttribute('data-photo') || btn.getAttribute('data-no') || '';

        if (title && !seen.has(title)) {
          seen.add(title);
          results.push({ name: title, hex, photoCode: dataPhoto });
        }
      });

      // Method 2: Label-based colors
      if (results.length === 0) {
        const colorLabels = document.querySelectorAll('.article-box--color label, .choice-color label');
        colorLabels.forEach(label => {
          const title = label.getAttribute('title') || '';
          const chip = label.querySelector('span[style], i[style]');
          let hex = '#cccccc';
          if (chip) {
            const style = chip.getAttribute('style') || '';
            const bgMatch = style.match(/background[^:]*:\s*([^;]+)/);
            if (bgMatch) hex = bgMatch[1].trim();
          }
          const input = label.querySelector('input') || document.getElementById(label.getAttribute('for'));
          const photoCode = input ? (input.getAttribute('data-photo') || input.getAttribute('data-no') || input.value || '') : '';

          if (title && !seen.has(title)) {
            seen.add(title);
            results.push({ name: title, hex, photoCode });
          }
        });
      }

      // Method 3: Input-based colors inside color section
      if (results.length === 0) {
        const colorSection = document.querySelector('.article-box--color, #estimateColorList');
        if (colorSection) {
          const inputs = colorSection.querySelectorAll('input[type="radio"], input[type="hidden"]');
          inputs.forEach(inp => {
            const name = inp.getAttribute('title') || inp.getAttribute('data-name') || '';
            const photoCode = inp.getAttribute('data-photo') || inp.getAttribute('data-no') || '';
            if (name && !seen.has(name)) {
              seen.add(name);
              results.push({ name, hex: '#cccccc', photoCode });
            }
          });

          // Or via parent elements
          if (results.length === 0) {
            const allEls = colorSection.querySelectorAll('button, label, li, a');
            allEls.forEach(el => {
              const title = el.getAttribute('title') || '';
              if (title && !seen.has(title)) {
                seen.add(title);
                results.push({ name: title, hex: '#cccccc', photoCode: '' });
              }
            });
          }
        }
      }

      return results;
    }, carId);

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

  // Find cars with only 1 default color (the ones we set to default)
  const needColors = [];
  for (const [id, d] of Object.entries(detailsData)) {
    if (!d.colorImages || d.colorImages.length <= 1) {
      needColors.push({ id, brand: d.brand, name: d.name });
    }
  }

  console.log(`Found ${needColors.length} cars needing colors. Scraping...\n`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  let updatedCount = 0;

  for (let i = 0; i < needColors.length; i++) {
    const car = needColors[i];
    process.stdout.write(`[${i + 1}/${needColors.length}] ${car.brand} ${car.name} (${car.id}): `);

    const colors = await scrapeColors(browser, car.id);

    if (colors.length > 0) {
      detailsData[car.id].colorImages = colors.map((c, idx) => {
        const photoCode = c.photoCode || (idx + 1);
        return {
          id: `color_${idx + 1}`,
          name: c.name,
          imageUrl: `https://autoimg.danawa.com/photo/${car.id}/color_${photoCode}_360.png`,
          hex: rgbToHex(c.hex),
          price: 0,
        };
      });

      // Update car image
      detailsData[car.id].imageUrl = detailsData[car.id].colorImages[0].imageUrl;
      const carEntry = carsData.cars.find(c => c.id === car.id);
      if (carEntry) carEntry.imageUrl = detailsData[car.id].imageUrl;

      console.log(`${colors.length} colors`);
      updatedCount++;
    } else {
      console.log('no colors found');
    }

    await delay(300);
  }

  await browser.close();

  fs.writeFileSync(detailsPath, JSON.stringify(detailsData, null, 2), 'utf8');
  fs.writeFileSync(carsPath, JSON.stringify(carsData, null, 2), 'utf8');

  console.log(`\nUpdated: ${updatedCount}/${needColors.length} cars`);
  console.log('Files saved.');
}

main().catch(e => { console.error(e); process.exit(1); });
