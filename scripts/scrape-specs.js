const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const CONSTANTS_DIR = path.join(__dirname, '../src/constants');
const CARS_FILE = path.join(CONSTANTS_DIR, 'generated-cars.json');
const SPECS_FILE = path.join(CONSTANTS_DIR, 'car-specs.json');

// Delay helper
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Load existing specs to preserve data and skip fully detailed cars
function loadExistingSpecs() {
  if (fs.existsSync(SPECS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(SPECS_FILE, 'utf-8'));
    } catch (err) {
      console.log('Could not load existing specs, starting fresh');
    }
  }
  return {};
}

// Save specs incrementally
function saveSpecs(specs) {
  fs.writeFileSync(SPECS_FILE, JSON.stringify(specs, null, 2), 'utf-8');
}

// Check if car already has detailed specs
function hasDetailedSpecs(specs) {
  return specs && specs.length; // If length exists, we have detailed specs
}

// Extract gradeId and trimId from the estimate page
async function extractGradeAndTrimIds(page, carId) {
  console.log('  Extracting gradeId and trimId from page...');

  const ids = await page.evaluate(() => {
    // Strategy 1: Search the full HTML for getSpecPopup calls (they may be HTML-encoded)
    const html = document.documentElement.innerHTML;

    // Pattern: getSpecPopup(&quot;price&quot;, 53355, &quot;...&quot;, 93413, 4435)
    const encodedMatch = html.match(/getSpecPopup\(&(?:quot|#34);(?:price|spec)&(?:quot|#34);,\s*(\d+),\s*&(?:quot|#34);[^&]*&(?:quot|#34);,\s*(\d+),\s*(\d+)\)/);
    if (encodedMatch) {
      return {
        gradeId: encodedMatch[1],
        trimId: encodedMatch[2],
        modelId: encodedMatch[3]
      };
    }

    // Also try unencoded version in script tags
    const scripts = Array.from(document.querySelectorAll('script'));
    for (const script of scripts) {
      const content = script.innerHTML;
      const match = content.match(/getSpecPopup\s*\(\s*["'](?:price|spec)["']\s*,\s*(\d+)\s*,\s*[^,]+,\s*(\d+)\s*,\s*(\d+)\s*\)/);
      if (match) {
        return {
          gradeId: match[1],
          trimId: match[2],
          modelId: match[3]
        };
      }
    }

    // Strategy 2: Look for data attributes on elements
    const specLinks = Array.from(document.querySelectorAll('[data-lineup], [data-grade], [onclick*="Popup"], [onclick*="spec"]'));
    for (const link of specLinks) {
      const lineup = link.getAttribute('data-lineup') || link.getAttribute('data-grade');
      const trim = link.getAttribute('data-trim') || link.getAttribute('data-trims');
      if (lineup && trim) {
        return {
          gradeId: lineup,
          trimId: trim
        };
      }

      // Check onclick attribute
      const onclick = link.getAttribute('onclick');
      if (onclick) {
        const match = onclick.match(/(\d+)\s*,\s*(\d+)/);
        if (match) {
          return {
            gradeId: match[1],
            trimId: match[2]
          };
        }
      }
    }

    // Strategy 3: Look in estmDataAuto for first trim
    if (typeof estmDataAuto !== 'undefined') {
      const trimKey = Object.keys(estmDataAuto).find(k => k.startsWith('T'));
      if (trimKey) {
        const trimId = trimKey.substring(1); // Remove 'T' prefix
        // Try to find corresponding lineup/grade
        const lineupKey = Object.keys(estmDataAuto).find(k => k.startsWith('L'));
        if (lineupKey) {
          return {
            gradeId: lineupKey.substring(1),
            trimId: trimId
          };
        }
        return { trimId: trimId };
      }
    }

    // Strategy 4: Look for spec popup links in the HTML
    const links = Array.from(document.querySelectorAll('a[href*="modelPopup"], a[href*="spec"]'));
    for (const link of links) {
      const href = link.getAttribute('href');
      const match = href.match(/Lineup[=](\d+).*?Trims?[=](\d+)/i);
      if (match) {
        return {
          gradeId: match[1],
          trimId: match[2]
        };
      }
    }

    return null;
  });

  if (ids && (ids.gradeId || ids.trimId)) {
    console.log(`  Found IDs: gradeId=${ids.gradeId || 'unknown'}, trimId=${ids.trimId || 'unknown'}`);
    return ids;
  }

  console.log('  Could not extract gradeId/trimId');
  return null;
}

// Parse spec table from popup page
async function parseSpecTable(page) {
  console.log('  Parsing spec table...');

  const specs = await page.evaluate(() => {
    const result = {};

    // Korean label to JSON key mapping (labels match actual Danawa popup)
    const fieldMap = {
      '엔진형식': 'engineType',
      '연료': 'fuelType',
      '배기량': 'displacement',
      '최고출력': 'maxPower',
      '최대토크': 'maxTorque',
      '굴림방식': 'driveType',
      '구동방식': 'driveType',
      '변속기': 'transmission',
      '전장': 'length',
      '전폭': 'width',
      '전고': 'height',
      '축거': 'wheelbase',
      '윤거 (전)': 'frontTrack',
      '윤거 (후)': 'rearTrack',
      '공차중량': 'curbWeight',
      '승차정원': 'seatingCapacity',
      '연료탱크': 'fuelTank',
      '서스펜션 (전)': 'frontSuspension',
      '서스펜션 (후)': 'rearSuspension',
      '전륜 서스펜션': 'frontSuspension',
      '후륜 서스펜션': 'rearSuspension',
      '브레이크 (전)': 'frontBrake',
      '브레이크 (후)': 'rearBrake',
      '전륜 브레이크': 'frontBrake',
      '후륜 브레이크': 'rearBrake',
      '타이어 (전)': 'frontTire',
      '타이어 (후)': 'rearTire',
      '전륜 타이어': 'frontTire',
      '후륜 타이어': 'rearTire',
      'CO₂ 배출': 'co2Emission',
      'CO₂ 배출량': 'co2Emission',
      'CO2 배출량': 'co2Emission',
      '복합연비': 'fuelEfficiency',
      '도심연비': 'cityEfficiency',
      '고속연비': 'highwayEfficiency',
      '고속도로연비': 'highwayEfficiency',
      '에너지소비효율': 'energyEfficiency'
    };

    // Find all table rows
    const rows = Array.from(document.querySelectorAll('table tr, .spec-table tr, .tbl_slist tr'));

    rows.forEach(row => {
      const cells = Array.from(row.querySelectorAll('th, td'));

      for (let i = 0; i < cells.length - 1; i++) {
        const label = cells[i].innerText.trim();
        const value = cells[i + 1].innerText.trim();

        // Check if this label matches our field map
        const jsonKey = fieldMap[label];
        if (jsonKey && value && value !== '-' && value !== 'N/A') {
          result[jsonKey] = value;
        }
      }
    });

    // Alternative parsing: look for dt/dd pairs
    const dts = Array.from(document.querySelectorAll('dt'));
    dts.forEach(dt => {
      const dd = dt.nextElementSibling;
      if (dd && dd.tagName === 'DD') {
        const label = dt.innerText.trim();
        const value = dd.innerText.trim();
        const jsonKey = fieldMap[label];
        if (jsonKey && value && value !== '-' && value !== 'N/A') {
          result[jsonKey] = value;
        }
      }
    });

    return result;
  });

  const fieldCount = Object.keys(specs).length;
  console.log(`  Parsed ${fieldCount} spec fields`);

  return specs;
}

// Scrape detailed specs from popup page
async function scrapeDetailedSpecs(browser, carId, gradeId, trimId) {
  console.log(`  Opening spec popup (gradeId=${gradeId}, trimId=${trimId})...`);

  const popupUrl = `https://auto.danawa.com/auto/modelPopup.php?Type=spec&Lineup=${gradeId}&Trims=${trimId}`;
  console.log(`  Popup URL: ${popupUrl}`);

  const page = await browser.newPage();

  try {
    await page.setViewport({ width: 1200, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

    await page.goto(popupUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    await delay(1500);

    const specs = await parseSpecTable(page);

    await page.close();

    return specs;

  } catch (err) {
    console.error(`  Error scraping popup: ${err.message}`);
    await page.close();
    return null;
  }
}

// Extract basic specs from estimate page (fallback/supplement)
async function extractBasicSpecs(page) {
  console.log('  Extracting basic specs from estimate page...');

  const specs = await page.evaluate(() => {
    const result = {};

    // Look for .estimate-model__spec element
    const specEl = document.querySelector('.estimate-model__spec');
    if (specEl) {
      const specText = specEl.innerText;
      // Parse: "2025.08. 출시 · 중형SUV · 가솔린+전기 · 1,598cc · 복합 15.5 ㎞/ℓ"
      const parts = specText.split('·').map(p => p.trim());

      parts.forEach(part => {
        // Release date: "2025.08. 출시"
        if (part.includes('출시')) {
          result.releaseDate = part.replace('출시', '').trim();
        }
        // Category: "중형SUV"
        else if (part.includes('SUV') || part.includes('세단') || part.includes('해치백') || part.includes('쿠페')) {
          result.category = part;
        }
        // Fuel type: "가솔린+전기"
        else if (part.includes('가솔린') || part.includes('디젤') || part.includes('전기') || part.includes('수소') || part.includes('LPG')) {
          result.fuelType = part;
        }
        // Displacement: "1,598cc"
        else if (part.match(/[\d,]+cc/)) {
          result.displacement = part;
        }
        // Fuel efficiency: "복합 15.5 ㎞/ℓ" or "복합 15.5km/L"
        else if (part.includes('복합') || part.match(/\d+\.?\d*\s*(㎞\/ℓ|km\/L|km\/l)/i)) {
          const cleanFuel = part.replace(/㎞\/ℓ/g, 'km/L');
          result.fuelEfficiency = cleanFuel;
        }
      });
    }

    return result;
  });

  const fieldCount = Object.keys(specs).length;
  if (fieldCount > 0) {
    console.log(`  Found ${fieldCount} basic spec fields`);
  }

  return specs;
}

// Try alternative approach: direct spec page
async function tryDirectSpecPage(browser, carId) {
  console.log('  Trying direct spec page approach...');

  const specUrl = `https://auto.danawa.com/newcar/?Work=spec&Model=${carId}`;
  console.log(`  Spec URL: ${specUrl}`);

  const page = await browser.newPage();

  try {
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

    await page.goto(specUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    await delay(2000);

    const specs = await parseSpecTable(page);

    await page.close();

    if (Object.keys(specs).length > 0) {
      console.log(`  Direct spec page succeeded with ${Object.keys(specs).length} fields`);
      return specs;
    }

    console.log('  Direct spec page had no data');
    return null;

  } catch (err) {
    console.error(`  Direct spec page failed: ${err.message}`);
    await page.close();
    return null;
  }
}

// Main scraping function for a single car
async function scrapeCar(browser, carId, carName, existingSpecs) {
  const url = `https://auto.danawa.com/newcar/?Work=estimate&Model=${carId}`;
  console.log(`\nScraping ${carName} (ID: ${carId})`);
  console.log(`  URL: ${url}`);

  const page = await browser.newPage();
  let mergedSpecs = {};

  // Preserve existing basic data
  if (existingSpecs) {
    console.log('  Merging with existing data...');
    mergedSpecs = { ...existingSpecs };
  }

  try {
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    await delay(2000);

    // Step 1: Extract basic specs from estimate page
    const basicSpecs = await extractBasicSpecs(page);
    mergedSpecs = { ...mergedSpecs, ...basicSpecs };

    // Step 2: Try to find gradeId and trimId
    const ids = await extractGradeAndTrimIds(page, carId);

    await page.close();

    if (ids && ids.gradeId && ids.trimId) {
      // Step 3: Scrape detailed specs from popup
      const detailedSpecs = await scrapeDetailedSpecs(browser, carId, ids.gradeId, ids.trimId);

      if (detailedSpecs && Object.keys(detailedSpecs).length > 0) {
        mergedSpecs = { ...mergedSpecs, ...detailedSpecs };
        console.log(`  ✓ Successfully extracted detailed specs from popup`);
      } else {
        console.log(`  ⚠ Popup had no data, trying alternative...`);
        // Try direct spec page as fallback
        const directSpecs = await tryDirectSpecPage(browser, carId);
        if (directSpecs) {
          mergedSpecs = { ...mergedSpecs, ...directSpecs };
        }
      }
    } else {
      console.log(`  ⚠ Could not find gradeId/trimId, trying direct spec page...`);
      // Try direct spec page as fallback
      const directSpecs = await tryDirectSpecPage(browser, carId);
      if (directSpecs) {
        mergedSpecs = { ...mergedSpecs, ...directSpecs };
      }
    }

    const fieldCount = Object.keys(mergedSpecs).length;
    console.log(`  ✓ Total fields collected: ${fieldCount}`);

    return fieldCount > 0 ? mergedSpecs : null;

  } catch (err) {
    console.error(`  ✗ Error scraping ${carName}: ${err.message}`);
    await page.close();

    // Return existing specs if we have them, rather than null
    return Object.keys(mergedSpecs).length > 0 ? mergedSpecs : null;
  }
}

// Main execution
async function scrapeAllCars() {
  console.log('=== Danawa Detailed Car Specs Scraper ===\n');

  // Load car data
  const carsData = JSON.parse(fs.readFileSync(CARS_FILE, 'utf-8'));
  const allCars = carsData.cars || [];

  console.log(`Total cars in database: ${allCars.length}\n`);

  // Load existing specs
  const existingSpecs = loadExistingSpecs();
  const alreadyScraped = Object.keys(existingSpecs).length;
  console.log(`Cars with existing data: ${alreadyScraped}\n`);

  // Filter out cars that already have detailed specs (length field exists)
  const toScrape = allCars.filter(car => !hasDetailedSpecs(existingSpecs[car.id]));
  console.log(`Cars needing detailed specs: ${toScrape.length}\n`);

  if (toScrape.length === 0) {
    console.log('All cars already have detailed specs!');
    return;
  }

  // Launch browser
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  let successCount = 0;
  let failCount = 0;
  const failedCars = [];

  // Process cars sequentially
  for (let i = 0; i < toScrape.length; i++) {
    const car = toScrape[i];
    const progress = `[${i + 1}/${toScrape.length}]`;

    console.log(`\n${progress} Processing ${car.name}...`);

    try {
      const specs = await scrapeCar(browser, car.id, car.name, existingSpecs[car.id]);

      if (specs && Object.keys(specs).length > 0) {
        existingSpecs[car.id] = specs;
        successCount++;

        // Save incrementally after each car
        saveSpecs(existingSpecs);
        console.log(`  ✓ Saved specs for ${car.name}`);
      } else {
        console.log(`  ⚠ No specs found for ${car.name}`);
        failCount++;
        failedCars.push({ id: car.id, name: car.name, reason: 'No specs found' });
      }

      // Delay between requests (2 seconds)
      await delay(2000);

    } catch (err) {
      console.error(`  ✗ Failed to scrape ${car.name}: ${err.message}`);
      failCount++;
      failedCars.push({ id: car.id, name: car.name, reason: err.message });
    }
  }

  await browser.close();

  // Final summary
  console.log('\n=== Scraping Complete ===');
  console.log(`Total processed: ${toScrape.length}`);
  console.log(`Successful: ${successCount}`);
  console.log(`Failed: ${failCount}`);
  console.log(`Total in database: ${Object.keys(existingSpecs).length}`);

  if (failedCars.length > 0) {
    console.log('\nFailed cars:');
    failedCars.forEach(car => {
      console.log(`  - ${car.name} (${car.id}): ${car.reason}`);
    });
  }

  console.log(`\nSpecs saved to: ${SPECS_FILE}`);
}

// Run the scraper
scrapeAllCars().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
