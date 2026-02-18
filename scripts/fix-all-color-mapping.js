const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const DETAILS_PATH = path.join(__dirname, '..', 'src', 'constants', 'generated-car-details.json');
const CARS_PATH = path.join(__dirname, '..', 'src', 'constants', 'generated-cars.json');
const BATCH_SIZE = 5;
const DELAY_BETWEEN_BATCHES = 1000;

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

/**
 * Extract subDir from existing image URL
 * e.g., "https://autoimg.danawa.com/photo/4660/52965/color_10_360.png" -> "52965"
 */
function getSubDir(colorImages) {
  for (const c of colorImages) {
    const m = c.imageUrl.match(/photo\/\d+\/(\d+)\//);
    if (m) return m[1];
  }
  return null;
}

/**
 * Fetch color mapping from Danawa for a single car
 * Returns array of { name, hex, colorCode, imageUrl }
 */
async function fetchColorMapping(browser, carId, subDir) {
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

  let colorHtml = '';

  // Intercept AJAX response for color data
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('ajax_trimsInfo') && url.includes('estimateTrimsColorHtml')) {
      try { colorHtml = await response.text(); } catch(e) {}
    }
  });

  try {
    await page.goto(`https://auto.danawa.com/newcar/?Work=estimate&Model=${carId}`, {
      waitUntil: 'networkidle2', timeout: 30000,
    });
    await delay(2000);

    // Click first grade to trigger color AJAX
    await page.evaluate(() => {
      const radio = document.querySelector('input[type="radio"]');
      if (radio) radio.click();
    });
    await delay(4000);

    // If AJAX didn't fire, try getting from DOM directly
    if (!colorHtml) {
      colorHtml = await page.evaluate(() => {
        const el = document.querySelector('#estimateExteriorColorList');
        return el ? el.parentElement.innerHTML : '';
      });
    }

    await page.close();

    if (!colorHtml) return null;

    // Only use exterior color section (외장색상) - split at 내장색상
    const interiorIdx = colorHtml.indexOf('내장색상');
    const exteriorHtml = interiorIdx > 0 ? colorHtml.substring(0, interiorIdx) : colorHtml;

    // Parse color data from HTML
    // Pattern: color='C11' ... style='background:#hex;' ... <span class='blind'>Name</span>
    const regex = /color='?(C\d+)'?[^>]*style='?background\s*:\s*(#[0-9a-fA-F]{3,6})\s*;?'?[^>]*>\s*<span[^>]*class='?blind'?[^>]*>([^<]+)<\/span>/g;
    const colors = [];
    const seen = new Set();
    let m;

    while ((m = regex.exec(exteriorHtml)) !== null) {
      const colorCode = m[1]; // e.g., "C09"
      const hex = m[2].trim();
      const name = m[3].trim();

      if (seen.has(name)) continue;
      seen.add(name);

      // Extract number from color code (C09 -> 09)
      const num = colorCode.replace('C', '');

      // Build correct image URL
      let imageUrl;
      if (subDir) {
        imageUrl = `https://autoimg.danawa.com/photo/${carId}/${subDir}/color_${num}_360.png`;
      } else {
        imageUrl = `https://autoimg.danawa.com/photo/${carId}/color_${num}_360.png`;
      }

      // Check for price indicators in the name
      let price = 0;
      if (name.includes('유료') || name.includes('추가금')) {
        // Keep existing price if available, otherwise mark as paid
        price = -1; // Will be resolved later
      }

      colors.push({
        id: `color_${colors.length + 1}`,
        name,
        imageUrl,
        hex,
        price,
        colorCode,
      });
    }

    return colors.length > 0 ? colors : null;

  } catch (e) {
    try { await page.close(); } catch(e2) {}
    return null;
  }
}

async function main() {
  const details = JSON.parse(fs.readFileSync(DETAILS_PATH, 'utf8'));
  const carsData = JSON.parse(fs.readFileSync(CARS_PATH, 'utf8'));

  // Find all cars that have color images (need to verify mapping)
  const carsToFix = [];
  for (const [id, car] of Object.entries(details)) {
    if (car.colorImages && car.colorImages.length > 1) {
      const subDir = getSubDir(car.colorImages);
      carsToFix.push({ id, name: car.name, brand: car.brand, subDir, currentCount: car.colorImages.length });
    }
  }

  console.log(`총 ${carsToFix.length}대 차량의 색상-이미지 매핑 검증 시작\n`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const results = { fixed: [], unchanged: [], failed: [], missing: [] };

  // Process in batches
  for (let i = 0; i < carsToFix.length; i += BATCH_SIZE) {
    const batch = carsToFix.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(carsToFix.length / BATCH_SIZE);

    process.stdout.write(`[배치 ${batchNum}/${totalBatches}] `);
    process.stdout.write(batch.map(c => c.id).join(', ') + ' ... ');

    const promises = batch.map(car => fetchColorMapping(browser, car.id, car.subDir));
    const batchResults = await Promise.all(promises);

    for (let j = 0; j < batch.length; j++) {
      const car = batch[j];
      const newColors = batchResults[j];

      if (!newColors) {
        results.failed.push(car.id);
        continue;
      }

      const oldColors = details[car.id].colorImages;

      // Compare old and new mappings
      let hasChanges = false;

      if (oldColors.length !== newColors.length) {
        hasChanges = true;
      } else {
        for (let k = 0; k < oldColors.length; k++) {
          if (oldColors[k].imageUrl !== newColors[k].imageUrl ||
              oldColors[k].hex !== newColors[k].hex ||
              oldColors[k].name !== newColors[k].name) {
            hasChanges = true;
            break;
          }
        }
      }

      if (hasChanges) {
        // Preserve existing prices where names match
        const oldPriceMap = {};
        oldColors.forEach(c => { oldPriceMap[c.name] = c.price; });

        newColors.forEach(c => {
          if (c.price === -1) {
            // Try to find matching price from old data
            c.price = oldPriceMap[c.name] || 0;
          }
          delete c.colorCode; // Remove temp field
        });

        details[car.id].colorImages = newColors;
        details[car.id].imageUrl = newColors[0].imageUrl;

        // Update main car image too
        const carEntry = carsData.cars.find(c => c.id === car.id);
        if (carEntry) carEntry.imageUrl = newColors[0].imageUrl;

        results.fixed.push({
          id: car.id,
          name: car.name,
          brand: car.brand,
          oldCount: oldColors.length,
          newCount: newColors.length,
          changes: newColors.map((nc, k) => {
            const oc = oldColors[k];
            if (!oc) return `+NEW: ${nc.name} (${nc.hex})`;
            if (oc.imageUrl !== nc.imageUrl) return `IMG: ${oc.name} ${oc.imageUrl.split('/').pop()} -> ${nc.imageUrl.split('/').pop()}`;
            if (oc.hex !== nc.hex) return `HEX: ${oc.name} ${oc.hex} -> ${nc.hex}`;
            if (oc.name !== nc.name) return `NAME: ${oc.name} -> ${nc.name}`;
            return null;
          }).filter(Boolean),
        });
      } else {
        results.unchanged.push(car.id);
      }
    }

    process.stdout.write('완료\n');
    if (i + BATCH_SIZE < carsToFix.length) await delay(DELAY_BETWEEN_BATCHES);
  }

  await browser.close();

  // Save updated data
  fs.writeFileSync(DETAILS_PATH, JSON.stringify(details, null, 2), 'utf8');
  fs.writeFileSync(CARS_PATH, JSON.stringify(carsData, null, 2), 'utf8');

  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('결과 요약');
  console.log('='.repeat(80));
  console.log(`수정됨: ${results.fixed.length}대`);
  console.log(`변경없음: ${results.unchanged.length}대`);
  console.log(`실패: ${results.failed.length}대`);

  if (results.fixed.length > 0) {
    console.log('\n[ 수정된 차량 상세 ]');
    results.fixed.forEach(f => {
      console.log(`\n  ${f.brand} ${f.name} (${f.id}): ${f.oldCount}개 -> ${f.newCount}개 색상`);
      f.changes.forEach(c => console.log(`    - ${c}`));
    });
  }

  if (results.failed.length > 0) {
    console.log('\n[ 실패한 차량 ]');
    results.failed.forEach(id => console.log(`  - ${id}`));
  }

  // Save detailed results
  const resultPath = path.join(__dirname, 'color-mapping-fix-results.json');
  fs.writeFileSync(resultPath, JSON.stringify(results, null, 2), 'utf8');
  console.log(`\n상세 결과: ${resultPath}`);
}

main().catch(e => { console.error(e); process.exit(1); });
