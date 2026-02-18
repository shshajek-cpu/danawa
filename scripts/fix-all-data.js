const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function parsePrice(text) {
  // Parse Korean price format: "7,650만 원", "1억 1,460만 원", "2억 3,000만 원"
  text = text.replace(/,/g, '').replace(/\s+/g, '');
  let total = 0;
  const eokMatch = text.match(/(\d+)억/);
  const manMatch = text.match(/(\d+)만/);
  if (eokMatch) total += parseInt(eokMatch[1]) * 100000000;
  if (manMatch) total += parseInt(manMatch[1]) * 10000;
  return total;
}

async function scrapeCar(browser, carId) {
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  try {
    await page.goto(`https://auto.danawa.com/newcar/?Work=estimate&Model=${carId}`, {
      waitUntil: 'networkidle2', timeout: 30000,
    });
    await delay(2000);

    // 1. Extract trims (only eChkTrim radio buttons, not term_temp)
    const trims = await page.evaluate(() => {
      const results = [];
      const radios = document.querySelectorAll('input[type="radio"][id^="trim_"]');
      radios.forEach(r => {
        const name = r.getAttribute('name') || '';
        // Only actual trims, not financial terms
        if (!name.startsWith('eChkTrim')) return;

        const parent = r.closest('li') || r.parentElement;
        const text = parent ? parent.textContent.trim() : '';

        // Extract trim name - everything before the price
        const trimName = text.replace(/TOP\d+선택률:\s*\d+%\s*/g, '').replace(/\s+/g, ' ').trim();

        results.push({
          id: r.getAttribute('id'),
          rawText: trimName,
        });
      });
      return results;
    });

    // Parse trim names and prices from rawText
    const parsedTrims = trims.map((t, idx) => {
      // Price is at the end: "E200 Avantgarde A/T 7,650만 원" or "550e xDrive ... 1억 1,530만 원"
      const priceMatch = t.rawText.match(/([\d억,]+만\s*원)\s*$/);
      let price = 0;
      let name = t.rawText;
      if (priceMatch) {
        price = parsePrice(priceMatch[1]);
        name = t.rawText.substring(0, t.rawText.lastIndexOf(priceMatch[1])).trim();
        // Remove duplicate name pattern (the page shows name twice)
        const half = Math.floor(name.length / 2);
        const firstHalf = name.substring(0, half).trim();
        const secondHalf = name.substring(half).trim();
        if (firstHalf === secondHalf) name = firstHalf;
      }
      return {
        id: `grade_${idx}`,
        trimId: t.id,
        name: name || `Trim ${idx + 1}`,
        price,
        features: [],
      };
    }).filter(t => t.price > 0);

    // 2. Extract lineup IDs from page JavaScript
    const html = await page.content();
    const lineInfoMatches = html.match(/lineInfo\[(\d+)\]/g);
    let lineupIds = [];
    if (lineInfoMatches) {
      lineupIds = [...new Set(lineInfoMatches.map(m => m.match(/\d+/)[0]))];
    }

    // Also try to find lineup from image URL patterns in the page
    const imgMatch = html.match(/autoimg\.danawa\.com\/photo\/\d+\/(\d+)\//);
    const primaryLineupId = imgMatch ? imgMatch[1] : (lineupIds.length > 0 ? lineupIds[0] : null);

    // 3. Click first trim and extract colors
    await page.evaluate(() => {
      const radio = document.querySelector('input[type="radio"][id^="trim_"][name^="eChkTrim"]');
      if (radio) radio.click();
    });
    await delay(4000);

    // After clicking, try to get the lineup ID for the selected trim
    const updatedHtml = await page.content();
    const updatedImgMatch = updatedHtml.match(/autoimg\.danawa\.com\/photo\/\d+\/(\d+)\//);
    const activeLineupId = updatedImgMatch ? updatedImgMatch[1] : primaryLineupId;

    // Extract colors from buttons
    const colorRegex = /color="(C\d+)"[^>]*style="background:([^"]+)"[^>]*>\s*<span[^>]*class="blind"[^>]*>([^<]+)<\/span>/g;
    const colors = [];
    const seen = new Set();
    let cm;
    while ((cm = colorRegex.exec(updatedHtml)) !== null) {
      const colorCode = cm[1];
      let hex = cm[2].trim().replace(/;$/, '');
      const colorName = cm[3].trim();
      if (seen.has(colorName)) continue;
      seen.add(colorName);
      if (!hex.startsWith('#')) hex = '#cccccc';

      // Color code: C11 -> 11 (remove C prefix)
      const numericCode = colorCode.replace(/^C/, '');

      colors.push({
        id: `color_${colors.length + 1}`,
        name: colorName,
        imageUrl: activeLineupId
          ? `https://autoimg.danawa.com/photo/${carId}/${activeLineupId}/color_${numericCode}_360.png`
          : `https://autoimg.danawa.com/photo/brand/${carId}_90.png`,
        hex,
        price: 0,
      });
    }

    await page.close();

    return {
      trims: parsedTrims,
      colors,
      lineupId: activeLineupId,
      imageUrl: colors.length > 0
        ? colors[0].imageUrl
        : (activeLineupId
          ? `https://autoimg.danawa.com/photo/${carId}/${activeLineupId}/lineup_360.png`
          : null),
    };
  } catch (e) {
    console.error(`  Error: ${e.message}`);
    await page.close();
    return null;
  }
}

async function main() {
  const detailsPath = path.join(__dirname, '..', 'src', 'constants', 'generated-car-details.json');
  const carsPath = path.join(__dirname, '..', 'src', 'constants', 'generated-cars.json');
  const details = JSON.parse(fs.readFileSync(detailsPath, 'utf8'));
  const carsData = JSON.parse(fs.readFileSync(carsPath, 'utf8'));

  // IDs of newly added cars that need fixing
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

  console.log(`Fixing ${newCarIds.length} cars...\n`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  let fixed = 0, failed = 0;

  for (let i = 0; i < newCarIds.length; i++) {
    const carId = newCarIds[i];
    const d = details[carId];
    if (!d) { console.log(`[${i+1}/${newCarIds.length}] ${carId}: NOT FOUND`); continue; }

    process.stdout.write(`[${i+1}/${newCarIds.length}] ${d.brand} ${d.name} (${carId}): `);

    const result = await scrapeCar(browser, carId);

    if (result) {
      // Update trims if we got valid data
      if (result.trims.length > 0) {
        details[carId].trims = result.trims;
      }

      // Update colors
      if (result.colors.length > 0) {
        details[carId].colorImages = result.colors;
      } else if (details[carId].colorImages && details[carId].colorImages.length > 0 && result.lineupId) {
        // Fix existing color image URLs with lineup ID
        details[carId].colorImages = details[carId].colorImages.map(c => {
          const codeMatch = c.imageUrl.match(/color_C?(\d+)_360/);
          const code = codeMatch ? codeMatch[1] : '11';
          return {
            ...c,
            hex: c.hex.replace(/;$/, ''),
            imageUrl: `https://autoimg.danawa.com/photo/${carId}/${result.lineupId}/color_${code}_360.png`,
          };
        });
      }

      // Update imageUrl
      if (result.imageUrl) {
        details[carId].imageUrl = result.imageUrl;
        const carEntry = carsData.cars.find(c => c.id === carId);
        if (carEntry) carEntry.imageUrl = result.imageUrl;
      }

      // Update startPrice to minimum trim price
      if (result.trims.length > 0) {
        const minPrice = Math.min(...result.trims.map(t => t.price));
        const carEntry = carsData.cars.find(c => c.id === carId);
        if (carEntry) carEntry.startPrice = minPrice;
        // Also update gradeCount
        if (carEntry) carEntry.gradeCount = result.trims.length;
      }

      const trimCount = result.trims.length || details[carId].trims.length;
      const colorCount = result.colors.length || (details[carId].colorImages ? details[carId].colorImages.length : 0);
      const minPrice = result.trims.length > 0 ? Math.min(...result.trims.map(t => t.price)) : 0;
      console.log(`${trimCount} trims, ${colorCount} colors, lineup=${result.lineupId || 'none'}, min=${(minPrice/10000).toLocaleString()}만`);
      fixed++;
    } else {
      console.log('FAILED');
      failed++;
    }

    await delay(300);
  }

  await browser.close();

  fs.writeFileSync(detailsPath, JSON.stringify(details, null, 2), 'utf8');
  fs.writeFileSync(carsPath, JSON.stringify(carsData, null, 2), 'utf8');

  console.log(`\nDone. Fixed: ${fixed}, Failed: ${failed}`);
}

main().catch(e => { console.error(e); process.exit(1); });
