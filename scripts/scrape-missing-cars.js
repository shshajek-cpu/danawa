const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// All 79 missing cars
const MISSING_CARS = [
  // 벤츠 (22)
  { modelId: '4516', brandId: 'benz', brandName: '벤츠', brandCode: 349 },
  { modelId: '4373', brandId: 'benz', brandName: '벤츠', brandCode: 349 },
  { modelId: '4471', brandId: 'benz', brandName: '벤츠', brandCode: 349 },
  { modelId: '3992', brandId: 'benz', brandName: '벤츠', brandCode: 349 },
  { modelId: '4555', brandId: 'benz', brandName: '벤츠', brandCode: 349 },
  { modelId: '4629', brandId: 'benz', brandName: '벤츠', brandCode: 349 },
  { modelId: '4507', brandId: 'benz', brandName: '벤츠', brandCode: 349 },
  { modelId: '4461', brandId: 'benz', brandName: '벤츠', brandCode: 349 },
  { modelId: '4496', brandId: 'benz', brandName: '벤츠', brandCode: 349 },
  { modelId: '4427', brandId: 'benz', brandName: '벤츠', brandCode: 349 },
  { modelId: '4569', brandId: 'benz', brandName: '벤츠', brandCode: 349 },
  { modelId: '4568', brandId: 'benz', brandName: '벤츠', brandCode: 349 },
  { modelId: '4011', brandId: 'benz', brandName: '벤츠', brandCode: 349 },
  { modelId: '4508', brandId: 'benz', brandName: '벤츠', brandCode: 349 },
  { modelId: '4495', brandId: 'benz', brandName: '벤츠', brandCode: 349 },
  { modelId: '4566', brandId: 'benz', brandName: '벤츠', brandCode: 349 },
  { modelId: '3982', brandId: 'benz', brandName: '벤츠', brandCode: 349 },
  { modelId: '4638', brandId: 'benz', brandName: '벤츠', brandCode: 349 },
  { modelId: '4111', brandId: 'benz', brandName: '벤츠', brandCode: 349 },
  { modelId: '4511', brandId: 'benz', brandName: '벤츠', brandCode: 349 },
  { modelId: '4670', brandId: 'benz', brandName: '벤츠', brandCode: 349 },
  { modelId: '4380', brandId: 'benz', brandName: '벤츠', brandCode: 349 },
  // BMW (16)
  { modelId: '4517', brandId: 'bmw', brandName: 'BMW', brandCode: 362 },
  { modelId: '4656', brandId: 'bmw', brandName: 'BMW', brandCode: 362 },
  { modelId: '4650', brandId: 'bmw', brandName: 'BMW', brandCode: 362 },
  { modelId: '4476', brandId: 'bmw', brandName: 'BMW', brandCode: 362 },
  { modelId: '4072', brandId: 'bmw', brandName: 'BMW', brandCode: 362 },
  { modelId: '4652', brandId: 'bmw', brandName: 'BMW', brandCode: 362 },
  { modelId: '4683', brandId: 'bmw', brandName: 'BMW', brandCode: 362 },
  { modelId: '4655', brandId: 'bmw', brandName: 'BMW', brandCode: 362 },
  { modelId: '4171', brandId: 'bmw', brandName: 'BMW', brandCode: 362 },
  { modelId: '4657', brandId: 'bmw', brandName: 'BMW', brandCode: 362 },
  { modelId: '4649', brandId: 'bmw', brandName: 'BMW', brandCode: 362 },
  { modelId: '4582', brandId: 'bmw', brandName: 'BMW', brandCode: 362 },
  { modelId: '3803', brandId: 'bmw', brandName: 'BMW', brandCode: 362 },
  { modelId: '4479', brandId: 'bmw', brandName: 'BMW', brandCode: 362 },
  { modelId: '4639', brandId: 'bmw', brandName: 'BMW', brandCode: 362 },
  { modelId: '4073', brandId: 'bmw', brandName: 'BMW', brandCode: 362 },
  // 아우디 (5)
  { modelId: '3668', brandId: 'audi', brandName: '아우디', brandCode: 371 },
  { modelId: '4062', brandId: 'audi', brandName: '아우디', brandCode: 371 },
  { modelId: '4431', brandId: 'audi', brandName: '아우디', brandCode: 371 },
  { modelId: '3715', brandId: 'audi', brandName: '아우디', brandCode: 371 },
  { modelId: '4436', brandId: 'audi', brandName: '아우디', brandCode: 371 },
  // 랜드로버 (6)
  { modelId: '3775', brandId: 'landrover', brandName: '랜드로버', brandCode: 399 },
  { modelId: '4119', brandId: 'landrover', brandName: '랜드로버', brandCode: 399 },
  { modelId: '4472', brandId: 'landrover', brandName: '랜드로버', brandCode: 399 },
  { modelId: '4363', brandId: 'landrover', brandName: '랜드로버', brandCode: 399 },
  { modelId: '4551', brandId: 'landrover', brandName: '랜드로버', brandCode: 399 },
  { modelId: '4548', brandId: 'landrover', brandName: '랜드로버', brandCode: 399 },
  // 볼보 (6)
  { modelId: '4747', brandId: 'volvo', brandName: '볼보', brandCode: 459 },
  { modelId: '4737', brandId: 'volvo', brandName: '볼보', brandCode: 459 },
  { modelId: '4740', brandId: 'volvo', brandName: '볼보', brandCode: 459 },
  { modelId: '4421', brandId: 'volvo', brandName: '볼보', brandCode: 459 },
  { modelId: '4446', brandId: 'volvo', brandName: '볼보', brandCode: 459 },
  { modelId: '4750', brandId: 'volvo', brandName: '볼보', brandCode: 459 },
  // 포르쉐 (4)
  { modelId: '4619', brandId: 'porsche', brandName: '포르쉐', brandCode: 381 },
  { modelId: '4506', brandId: 'porsche', brandName: '포르쉐', brandCode: 381 },
  { modelId: '4651', brandId: 'porsche', brandName: '포르쉐', brandCode: 381 },
  { modelId: '4613', brandId: 'porsche', brandName: '포르쉐', brandCode: 381 },
  // 기아 (4)
  { modelId: '4763', brandId: 'kia', brandName: '기아', brandCode: 307 },
  { modelId: '3772', brandId: 'kia', brandName: '기아', brandCode: 307 },
  { modelId: '4499', brandId: 'kia', brandName: '기아', brandCode: 307 },
  { modelId: '4404', brandId: 'kia', brandName: '기아', brandCode: 307 },
  // 기타
  { modelId: '4565', brandId: 'cadillac', brandName: '캐딜락', brandCode: 546 },
  { modelId: '4705', brandId: 'genesis', brandName: '제네시스', brandCode: 304 },
  { modelId: '4777', brandId: 'gmc', brandName: 'GMC', brandCode: 602 },
  { modelId: '4779', brandId: 'gmc', brandName: 'GMC', brandCode: 602 },
  { modelId: '4646', brandId: 'kgm', brandName: 'KGM', brandCode: 326 },
  { modelId: '4635', brandId: 'lexus', brandName: '렉서스', brandCode: 486 },
  { modelId: '4700', brandId: 'lexus', brandName: '렉서스', brandCode: 486 },
  { modelId: '4741', brandId: 'peugeot', brandName: '푸조', brandCode: 413 },
  { modelId: '4379', brandId: 'peugeot', brandName: '푸조', brandCode: 413 },
  { modelId: '4513', brandId: 'polestar', brandName: '폴스타', brandCode: 458 },
  { modelId: '4674', brandId: 'toyota', brandName: '토요타', brandCode: 491 },
  { modelId: '4560', brandId: '르노코리아', brandName: '르노코리아', brandCode: 321 },
  { modelId: '4632', brandId: '르노코리아', brandName: '르노코리아', brandCode: 321 },
  { modelId: '4395', brandId: '쉐보레', brandName: '쉐보레', brandCode: 312 },
  { modelId: '4043', brandId: '테슬라', brandName: '테슬라', brandCode: 611 },
  { modelId: '3825', brandId: '테슬라', brandName: '테슬라', brandCode: 611 },
];

async function scrapeCar(browser, car) {
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  const url = `https://auto.danawa.com/newcar/?Work=estimate&Model=${car.modelId}`;
  const result = {
    id: car.modelId,
    brandId: car.brandId,
    brandName: car.brandName,
    name: '',
    imageUrl: '',
    trims: [],
    colorImages: [],
    selectableOptions: [],
    fuelType: '',
    startPrice: 0,
    gradeCount: 0,
  };

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await delay(2000);

    // Extract car name from page title or header
    const pageData = await page.evaluate(() => {
      const info = {};

      // Car name from header
      const nameEl = document.querySelector('.car_name, .model_name, h2.tit, .estimate-model .tit, .estimate-top .name');
      if (nameEl) info.name = nameEl.textContent.trim();

      // Try page title
      info.title = document.title;

      // Extract trims from radio buttons
      const trims = [];
      const radios = document.querySelectorAll('input[type="radio"]');
      const seen = new Set();
      radios.forEach(r => {
        const id = r.id || '';
        if (!id.startsWith('trim_')) return;
        const trimId = id.replace('trim_', '');
        if (seen.has(trimId)) return;
        seen.add(trimId);

        const parent = r.closest('li') || r.closest('div') || r.parentElement;
        let name = '';
        let price = 0;

        if (parent) {
          // Get trim name
          const nameEl = parent.querySelector('.name, .tit, .title, label');
          if (nameEl) {
            name = nameEl.textContent.trim().split('\n')[0].trim();
          }
          if (!name) {
            const text = parent.textContent.trim();
            name = text.split(/[\t\n]/)[0].trim();
          }

          // Get price
          const priceEl = parent.querySelector('.price, .prc');
          if (priceEl) {
            const priceText = priceEl.textContent.replace(/[^0-9]/g, '');
            if (priceText) price = parseInt(priceText);
          }
          if (!price) {
            const priceMatch = parent.textContent.match(/(\d[\d,]+)\s*만\s*원/);
            if (priceMatch) price = parseInt(priceMatch[1].replace(/,/g, '')) * 10000;
          }
          if (!price) {
            const priceMatch = parent.textContent.match(/([\d,]+)원/);
            if (priceMatch) price = parseInt(priceMatch[1].replace(/,/g, ''));
          }
        }

        if (name) trims.push({ trimId, name, price });
      });
      info.trims = trims;

      // Get fuel type from page
      const fuelEls = document.querySelectorAll('.fuel, .fuel_type, [class*="fuel"]');
      fuelEls.forEach(el => {
        const t = el.textContent.trim();
        if (t.includes('가솔린') || t.includes('디젤') || t.includes('하이브리드') || t.includes('전기') || t.includes('수소')) {
          info.fuelType = t;
        }
      });

      // Try to get fuel type from trim names or page text
      if (!info.fuelType) {
        const pageText = document.body.innerText;
        if (pageText.includes('전기') && !pageText.includes('가솔린')) info.fuelType = '전기';
        else if (pageText.includes('하이브리드')) info.fuelType = '하이브리드';
        else if (pageText.includes('디젤')) info.fuelType = '디젤';
        else info.fuelType = '가솔린';
      }

      // Get the car image
      const imgEl = document.querySelector('.car_photo img, .estimate-model img, .model_img img, .thumb_area img');
      if (imgEl) info.imageUrl = imgEl.src;

      return info;
    });

    // Parse car name
    result.name = pageData.name || pageData.title.split('-')[0].split('|')[0].trim().replace(/\s*견적.*/, '').replace(/\s*다나와.*/, '');
    // Clean name - remove brand prefix if present
    result.name = result.name.replace(new RegExp(`^${car.brandName}\\s*`), '').trim();
    if (!result.name) result.name = `Model ${car.modelId}`;

    result.imageUrl = pageData.imageUrl || '';

    // Parse fuel type
    const ft = (pageData.fuelType || '').trim();
    if (ft.includes('전기')) result.fuelType = '전기';
    else if (ft.includes('수소')) result.fuelType = '수소';
    else if (ft.includes('하이브리드')) result.fuelType = '하이브리드';
    else if (ft.includes('디젤')) result.fuelType = '디젤';
    else if (ft.includes('LPG')) result.fuelType = 'LPG';
    else result.fuelType = '가솔린';

    // Parse trims
    result.trims = pageData.trims.map((t, i) => ({
      id: `grade_${i}`,
      name: t.name,
      price: t.price,
      features: [],
    }));
    result.gradeCount = result.trims.length;
    result.startPrice = result.trims.length > 0 ? Math.min(...result.trims.map(t => t.price).filter(p => p > 0)) : 0;

    // Click first trim to load colors
    await page.evaluate(() => {
      const radios = document.querySelectorAll('input[type="radio"]');
      if (radios.length > 0) radios[0].click();
    });
    await delay(3000);

    // Extract colors
    const colors = await page.evaluate((carId) => {
      const colorResults = [];
      const colorEls = document.querySelectorAll('.color_item, .color-item, [class*="color"] label, .colorchip, input[name*="color"]');
      const seen = new Set();

      // Method 1: Color radio/labels
      colorEls.forEach(el => {
        const input = el.querySelector('input') || el;
        const name = el.getAttribute('title') || el.getAttribute('data-name') || el.textContent.trim();
        const imgEl = el.querySelector('img');
        const bgStyle = el.style?.backgroundColor;

        if (name && !seen.has(name) && name.length < 50) {
          seen.add(name);
          colorResults.push({
            name: name.split('\n')[0].trim(),
            imageUrl: imgEl ? imgEl.src : '',
            hex: bgStyle || '#cccccc',
          });
        }
      });

      // Method 2: Look in the color section HTML
      if (colorResults.length === 0) {
        const colorSection = document.querySelector('[class*="color"], .article-box--color');
        if (colorSection) {
          const items = colorSection.querySelectorAll('li, label, .item');
          items.forEach(item => {
            const title = item.getAttribute('title') || '';
            const imgEl = item.querySelector('img');
            const chipEl = item.querySelector('[class*="chip"], [style*="background"]');
            const name = title || item.textContent.trim().split('\n')[0].trim();
            if (name && !seen.has(name) && name.length > 1 && name.length < 50) {
              seen.add(name);
              let hex = '#cccccc';
              if (chipEl && chipEl.style.backgroundColor) {
                hex = chipEl.style.backgroundColor;
              }
              colorResults.push({
                name,
                imageUrl: imgEl ? imgEl.src : `https://autoimg.danawa.com/photo/${carId}/color_1_360.png`,
                hex,
              });
            }
          });
        }
      }

      // Method 3: Scan for color image pattern
      if (colorResults.length === 0) {
        const imgs = document.querySelectorAll(`img[src*="color_"]`);
        imgs.forEach(img => {
          const src = img.src;
          const parent = img.closest('li, label, div');
          const name = parent ? (parent.getAttribute('title') || parent.textContent.trim().split('\n')[0].trim()) : '';
          if (src && !seen.has(src)) {
            seen.add(src);
            colorResults.push({
              name: name || 'Color',
              imageUrl: src,
              hex: '#cccccc',
            });
          }
        });
      }

      return colorResults;
    }, car.modelId);

    result.colorImages = colors.map((c, i) => ({
      id: `color_${i + 1}`,
      name: c.name,
      imageUrl: c.imageUrl || `https://autoimg.danawa.com/photo/${car.modelId}/color_${i + 1}_360.png`,
      hex: c.hex || '#cccccc',
      price: 0,
    }));

    // Extract options (popupItem checkboxes)
    const options = await page.evaluate(() => {
      const optResults = [];
      const checkboxes = document.querySelectorAll('input[type="checkbox"][name="option"]');
      checkboxes.forEach(cb => {
        if (!cb.id.startsWith('popupItem_')) return;
        const parent = cb.closest('li') || cb.closest('div') || cb.parentElement;
        const fullText = parent ? parent.textContent.trim() : '';
        const lines = fullText.split(/[\t\n]+/).map(s => s.trim()).filter(s => s.length > 0);
        const name = lines[0] || '';
        const priceMatch = fullText.match(/(\d[\d,]*)만\s*원/);
        const price = priceMatch ? parseInt(priceMatch[1].replace(/,/g, '')) * 10000 : 0;
        if (name) optResults.push({ name, price });
      });
      return optResults;
    });

    result.selectableOptions = options.map((o, i) => ({
      id: `opt_${i}`,
      name: o.name,
      price: o.price,
      description: '',
    }));

    // If no image found, construct default
    if (!result.imageUrl) {
      if (result.colorImages.length > 0 && result.colorImages[0].imageUrl) {
        result.imageUrl = result.colorImages[0].imageUrl;
      } else {
        result.imageUrl = `https://autoimg.danawa.com/photo/${car.modelId}/color_1_360.png`;
      }
    }

  } catch (e) {
    console.error(`  Error: ${e.message.substring(0, 80)}`);
  }

  await page.close();
  return result;
}

async function main() {
  const carsPath = path.join(__dirname, '..', 'src', 'constants', 'generated-cars.json');
  const detailsPath = path.join(__dirname, '..', 'src', 'constants', 'generated-car-details.json');
  const subModelsPath = path.join(__dirname, '..', 'src', 'constants', 'sub-models.json');

  const carsData = JSON.parse(fs.readFileSync(carsPath, 'utf8'));
  const detailsData = JSON.parse(fs.readFileSync(detailsPath, 'utf8'));
  const subModelsData = JSON.parse(fs.readFileSync(subModelsPath, 'utf8'));

  console.log(`Scraping ${MISSING_CARS.length} missing cars...\n`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < MISSING_CARS.length; i++) {
    const car = MISSING_CARS[i];
    process.stdout.write(`[${i + 1}/${MISSING_CARS.length}] ${car.brandName} (${car.modelId}): `);

    const result = await scrapeCar(browser, car);

    if (result.trims.length === 0 && result.colorImages.length === 0) {
      console.log(`FAILED - no data (name: "${result.name}")`);
      failCount++;
      continue;
    }

    console.log(`OK - "${result.name}" (${result.trims.length} trims, ${result.colorImages.length} colors, ${result.selectableOptions.length} opts, ${result.fuelType})`);
    successCount++;

    // Add to cars list
    const carEntry = {
      id: result.id,
      brandId: result.brandId,
      name: result.name,
      imageUrl: result.imageUrl,
      startPrice: result.startPrice,
      gradeCount: result.gradeCount,
      fuelType: result.fuelType,
    };
    carsData.cars.push(carEntry);

    // Add to details
    detailsData[result.id] = {
      brand: result.brandName,
      name: result.name,
      imageUrl: result.imageUrl,
      trims: result.trims,
      selectableOptions: result.selectableOptions,
      colorImages: result.colorImages,
      fuelType: result.fuelType,
    };

    // Add to sub-models
    subModelsData[result.id] = {
      subModels: [{
        id: 'sub_0',
        name: result.fuelType,
        fuelType: result.fuelType,
        isDefault: true,
      }],
    };

    // Update brand car count
    const brand = carsData.brands.find(b => b.id === result.brandId);
    if (brand) brand.carCount = carsData.cars.filter(c => c.brandId === result.brandId).length;

    await delay(300);
  }

  await browser.close();

  // Save all files
  fs.writeFileSync(carsPath, JSON.stringify(carsData, null, 2), 'utf8');
  fs.writeFileSync(detailsPath, JSON.stringify(detailsData, null, 2), 'utf8');
  fs.writeFileSync(subModelsPath, JSON.stringify(subModelsData, null, 2), 'utf8');

  console.log(`\n=== COMPLETE ===`);
  console.log(`Success: ${successCount}`);
  console.log(`Failed: ${failCount}`);
  console.log(`Total cars now: ${carsData.cars.length}`);
  console.log(`Files saved.`);
}

main().catch(e => { console.error(e); process.exit(1); });
