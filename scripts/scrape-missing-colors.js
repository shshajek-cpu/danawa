const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function scrapeColors(browser, carId) {
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  const url = `https://auto.danawa.com/newcar/?Work=estimate&Model=${carId}`;

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await delay(2000);

    // Click first trim to load colors
    await page.evaluate(() => {
      const radios = document.querySelectorAll('input[type="radio"]');
      if (radios.length > 0) radios[0].click();
    });
    await delay(3000);

    // Extract colors from the loaded HTML
    const colors = await page.evaluate((cid) => {
      const results = [];
      const seen = new Set();

      // Method 1: Color list items in the estimate page
      const colorItems = document.querySelectorAll('.color_list li, .colorchip_area li, [class*="colorList"] li, .article-box--color li');
      colorItems.forEach(item => {
        const label = item.querySelector('label');
        const input = item.querySelector('input');
        const chip = item.querySelector('[class*="chip"], span[style*="background"], i[style*="background"]');
        const img = item.querySelector('img');

        let name = '';
        if (label) name = label.getAttribute('title') || label.getAttribute('data-name') || '';
        if (!name && input) name = input.getAttribute('title') || input.getAttribute('data-name') || '';
        if (!name) name = item.getAttribute('title') || '';
        if (!name) {
          const txt = item.textContent.trim();
          if (txt.length > 0 && txt.length < 50) name = txt.split('\n')[0].trim();
        }

        if (!name || seen.has(name)) return;
        seen.add(name);

        let hex = '#cccccc';
        if (chip) {
          const bg = chip.style.backgroundColor || window.getComputedStyle(chip).backgroundColor;
          if (bg && bg !== 'rgba(0, 0, 0, 0)') {
            hex = bg;
          }
        }

        // Try to find color code from image URL or data attribute
        let colorCode = '';
        if (img && img.src) {
          const match = img.src.match(/color_(\w+)/);
          if (match) colorCode = match[1];
        }
        if (!colorCode && input) {
          colorCode = input.value || input.getAttribute('data-color') || '';
        }

        let imageUrl = '';
        if (colorCode) {
          imageUrl = `https://autoimg.danawa.com/photo/${cid}/color_${colorCode}_360.png`;
        } else if (img && img.src) {
          imageUrl = img.src;
        }

        results.push({ name, hex, imageUrl, colorCode });
      });

      // Method 2: Try from ajax-loaded color HTML
      if (results.length === 0) {
        const colorSection = document.querySelector('.article-box--color, [class*="color_select"], [class*="colorSelect"]');
        if (colorSection) {
          const labels = colorSection.querySelectorAll('label[title], label[data-name]');
          labels.forEach(label => {
            const name = label.getAttribute('title') || label.getAttribute('data-name') || '';
            if (!name || seen.has(name)) return;
            seen.add(name);

            const chip = label.querySelector('span, i');
            let hex = '#cccccc';
            if (chip) {
              const bg = chip.style.backgroundColor || '';
              if (bg) hex = bg;
            }

            const input = label.querySelector('input') || label.previousElementSibling;
            let colorCode = '';
            if (input && input.value) {
              const match = input.value.match(/color_?(\w+)/i);
              if (match) colorCode = match[1];
            }

            results.push({
              name,
              hex,
              imageUrl: colorCode ? `https://autoimg.danawa.com/photo/${cid}/color_${colorCode}_360.png` : '',
              colorCode,
            });
          });
        }
      }

      // Method 3: Parse from trimsInfo response if embedded
      if (results.length === 0) {
        // Look for color data in any inline script or variable
        const scripts = document.querySelectorAll('script:not([src])');
        scripts.forEach(s => {
          const text = s.textContent || '';
          const colorMatches = text.matchAll(/color_name['":\s]+['"]([^'"]+)['"]/gi);
          for (const m of colorMatches) {
            if (!seen.has(m[1])) {
              seen.add(m[1]);
              results.push({ name: m[1], hex: '#cccccc', imageUrl: '', colorCode: '' });
            }
          }
        });
      }

      return results;
    }, carId);

    // Also try getting color data from the trimsInfo AJAX endpoint
    if (colors.length === 0) {
      // Get first trim ID
      const trimId = await page.evaluate(() => {
        const radio = document.querySelector('input[type="radio"][id^="trim_"]');
        return radio ? radio.id.replace('trim_', '') : '';
      });

      if (trimId) {
        try {
          const colorResponse = await page.evaluate(async (tid) => {
            const resp = await fetch(`/service/ajax_trimsInfo.php?type=estimateTrimsColorHtml&trimsNo=${tid}`);
            return await resp.text();
          }, trimId);

          // Parse HTML for colors
          const parsedColors = await page.evaluate((html, cid) => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const results = [];
            const seen = new Set();

            doc.querySelectorAll('label').forEach(label => {
              const title = label.getAttribute('title') || '';
              if (!title || seen.has(title)) return;
              seen.add(title);

              const chip = label.querySelector('span[style], i[style]');
              let hex = '#cccccc';
              if (chip) {
                const bg = chip.getAttribute('style') || '';
                const match = bg.match(/background[^:]*:\s*([^;]+)/);
                if (match) hex = match[1].trim();
              }

              const input = label.querySelector('input');
              let colorCode = '';
              if (input) {
                const val = input.getAttribute('data-color') || input.value || '';
                colorCode = val;
              }

              results.push({ name: title, hex, imageUrl: `https://autoimg.danawa.com/photo/${cid}/color_${colorCode || '1'}_360.png`, colorCode });
            });
            return results;
          }, colorResponse, carId);

          if (parsedColors.length > 0) {
            await page.close();
            return parsedColors;
          }
        } catch (e) { /* ignore */ }
      }
    }

    await page.close();
    return colors;
  } catch (e) {
    await page.close();
    return [];
  }
}

// Convert rgb() to hex
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

async function main() {
  const detailsPath = path.join(__dirname, '..', 'src', 'constants', 'generated-car-details.json');
  const detailsData = JSON.parse(fs.readFileSync(detailsPath, 'utf8'));

  // Find all cars with 0 colors
  const noColorCars = [];
  for (const [id, d] of Object.entries(detailsData)) {
    if (!d.colorImages || d.colorImages.length === 0) {
      noColorCars.push({ id, brand: d.brand, name: d.name });
    }
  }

  console.log(`Found ${noColorCars.length} cars with no colors. Scraping...\n`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  let updatedCount = 0;

  for (let i = 0; i < noColorCars.length; i++) {
    const car = noColorCars[i];
    process.stdout.write(`[${i + 1}/${noColorCars.length}] ${car.brand} ${car.name} (${car.id}): `);

    const colors = await scrapeColors(browser, car.id);

    if (colors.length > 0) {
      detailsData[car.id].colorImages = colors.map((c, idx) => ({
        id: `color_${idx + 1}`,
        name: c.name,
        imageUrl: c.imageUrl || `https://autoimg.danawa.com/photo/${car.id}/color_${idx + 1}_360.png`,
        hex: rgbToHex(c.hex),
        price: 0,
      }));

      // Update car image to first color
      if (!detailsData[car.id].imageUrl || detailsData[car.id].imageUrl.includes('undefined')) {
        detailsData[car.id].imageUrl = detailsData[car.id].colorImages[0].imageUrl;
      }

      console.log(`${colors.length} colors`);
      updatedCount++;
    } else {
      // Set default image
      detailsData[car.id].imageUrl = `https://autoimg.danawa.com/photo/${car.id}/color_1_360.png`;
      detailsData[car.id].colorImages = [{
        id: 'color_1',
        name: '기본색상',
        imageUrl: `https://autoimg.danawa.com/photo/${car.id}/color_1_360.png`,
        hex: '#cccccc',
        price: 0,
      }];
      console.log(`0 colors (default set)`);
    }

    await delay(300);
  }

  await browser.close();

  // Also update imageUrl in generated-cars.json
  const carsPath = path.join(__dirname, '..', 'src', 'constants', 'generated-cars.json');
  const carsData = JSON.parse(fs.readFileSync(carsPath, 'utf8'));
  for (const car of carsData.cars) {
    if (detailsData[car.id] && detailsData[car.id].colorImages && detailsData[car.id].colorImages.length > 0) {
      car.imageUrl = detailsData[car.id].colorImages[0].imageUrl;
    }
  }

  fs.writeFileSync(detailsPath, JSON.stringify(detailsData, null, 2), 'utf8');
  fs.writeFileSync(carsPath, JSON.stringify(carsData, null, 2), 'utf8');

  console.log(`\nUpdated: ${updatedCount} cars with color data`);
  console.log('Files saved.');
}

main().catch(e => { console.error(e); process.exit(1); });
