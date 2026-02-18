const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// Priority vehicles to check
const CARS_TO_CHECK = [
  { id: '4435', name: '싼타페', expectedFuel: '가솔린', expectedTrims: 18 },
  { id: '4188', name: '디 올 뉴 그랜저', expectedFuel: '가솔린', expectedTrims: 6 },
  { id: '4592', name: '더 뉴 투싼 FL', expectedFuel: '가솔린', expectedTrims: 12 },
  { id: '4361', name: '코나', expectedFuel: '가솔린', expectedTrims: 21 },
  { id: '4466', name: '쏘나타 FL', expectedFuel: '가솔린', expectedTrims: 4 },
  { id: '4624', name: '아이오닉 5 FL', expectedFuel: '전기', expectedTrims: 10 },
];

async function checkCarFuelTypes(browser, car) {
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  const url = `https://auto.danawa.com/newcar/?Work=estimate&Model=${car.id}`;
  const result = {
    carId: car.id,
    name: car.name,
    danawaFuelTypes: [],
    ourDataFuelType: car.expectedFuel,
    ourDataTrimCount: car.expectedTrims,
    fuelTypeDetails: {},
    issues: [],
  };

  try {
    console.log(`\nChecking ${car.name} (${car.id})...`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await delay(3000);

    // Extract fuel type tabs and trim information
    const pageData = await page.evaluate(() => {
      const info = {
        fuelTabs: [],
        allTrims: [],
        pageTitle: document.title,
      };

      // Look for fuel type tabs - common patterns on Danawa
      const fuelTabSelectors = [
        '.fuel_tab, .fuel-tab',
        '[class*="fuel"] button, [class*="fuel"] a',
        '.tab_list [class*="fuel"]',
        'ul.tab li, .tab-list li',
        '[role="tab"]',
      ];

      let fuelElements = [];
      for (const selector of fuelTabSelectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          fuelElements = Array.from(elements);
          break;
        }
      }

      // Extract fuel type names from tabs
      const fuelTypes = new Set();
      fuelElements.forEach(el => {
        const text = el.textContent.trim();
        if (text.includes('가솔린')) fuelTypes.add('가솔린');
        if (text.includes('디젤')) fuelTypes.add('디젤');
        if (text.includes('하이브리드')) fuelTypes.add('하이브리드');
        if (text.includes('LPG')) fuelTypes.add('LPG');
        if (text.includes('전기')) fuelTypes.add('전기');
        if (text.includes('수소')) fuelTypes.add('수소');
      });

      info.fuelTabs = Array.from(fuelTypes);

      // If no fuel tabs found, check data attributes or hidden fields
      if (info.fuelTabs.length === 0) {
        const scripts = document.querySelectorAll('script:not([src])');
        scripts.forEach(script => {
          const content = script.textContent || '';
          if (content.includes('estmDataAuto') || content.includes('fuelType')) {
            // Try to find fuel type indicators in the data
            if (content.includes('가솔린') && !fuelTypes.has('가솔린')) fuelTypes.add('가솔린');
            if (content.includes('디젤') && !fuelTypes.has('디젤')) fuelTypes.add('디젤');
            if (content.includes('하이브리드') && !fuelTypes.has('하이브리드')) fuelTypes.add('하이브리드');
            if (content.includes('전기') && !fuelTypes.has('전기')) fuelTypes.add('전기');
          }
        });
        info.fuelTabs = Array.from(fuelTypes);
      }

      // Extract all trim radio buttons
      const trimRadios = document.querySelectorAll('input[type="radio"][id*="trim"], input[type="radio"][name*="grade"]');
      trimRadios.forEach(radio => {
        const parent = radio.closest('li') || radio.closest('div') || radio.parentElement;
        if (!parent) return;

        const nameEl = parent.querySelector('.name, .tit, label');
        const priceEl = parent.querySelector('.price, .prc');

        let trimName = nameEl ? nameEl.textContent.trim() : parent.textContent.trim().split('\n')[0];
        let price = 0;

        if (priceEl) {
          const priceText = priceEl.textContent.replace(/[^0-9]/g, '');
          price = priceText ? parseInt(priceText) : 0;
        } else {
          const priceMatch = parent.textContent.match(/(\d[\d,]+)\s*만\s*원/);
          if (priceMatch) price = parseInt(priceMatch[1].replace(/,/g, '')) * 10000;
        }

        if (trimName && trimName.length > 0 && trimName.length < 100) {
          info.allTrims.push({ name: trimName, price });
        }
      });

      return info;
    });

    result.danawaFuelTypes = pageData.fuelTabs;
    result.danawaPageTitle = pageData.pageTitle;

    // If we found fuel tabs, we need to check each one
    if (pageData.fuelTabs.length > 1) {
      console.log(`  Found ${pageData.fuelTabs.length} fuel types: ${pageData.fuelTabs.join(', ')}`);

      for (const fuelType of pageData.fuelTabs) {
        // Try to click the fuel tab and get trims for that fuel type
        const trimsForFuel = await page.evaluate((fuel) => {
          // Find and click the fuel tab
          const tabs = document.querySelectorAll('button, a, [role="tab"], .tab li');
          let clicked = false;

          for (const tab of tabs) {
            if (tab.textContent.includes(fuel)) {
              tab.click();
              clicked = true;
              break;
            }
          }

          if (!clicked) return { clicked: false, trims: [] };

          // Wait a bit for content to load (can't use delay in evaluate)
          return new Promise(resolve => {
            setTimeout(() => {
              const trims = [];
              const trimRadios = document.querySelectorAll('input[type="radio"][id*="trim"], input[type="radio"][name*="grade"]');

              trimRadios.forEach(radio => {
                const parent = radio.closest('li') || radio.closest('div') || radio.parentElement;
                if (!parent) return;

                const nameEl = parent.querySelector('.name, .tit, label');
                let trimName = nameEl ? nameEl.textContent.trim() : parent.textContent.trim().split('\n')[0];

                if (trimName && trimName.length > 0 && trimName.length < 100) {
                  trims.push(trimName);
                }
              });

              resolve({ clicked: true, trims });
            }, 2000);
          });
        }, fuelType);

        await delay(2000);

        result.fuelTypeDetails[fuelType] = {
          trimCount: trimsForFuel.trims ? trimsForFuel.trims.length : 0,
          trims: trimsForFuel.trims || [],
        };

        console.log(`  ${fuelType}: ${trimsForFuel.trims ? trimsForFuel.trims.length : 0} trims`);
      }
    } else if (pageData.fuelTabs.length === 1) {
      // Only one fuel type
      result.fuelTypeDetails[pageData.fuelTabs[0]] = {
        trimCount: pageData.allTrims.length,
        trims: pageData.allTrims.map(t => t.name),
      };
      console.log(`  Single fuel type (${pageData.fuelTabs[0]}): ${pageData.allTrims.length} trims`);
    } else {
      // No fuel tabs detected - might be single fuel type or we couldn't detect
      console.log(`  No fuel tabs detected - found ${pageData.allTrims.length} trims total`);
      result.fuelTypeDetails['unknown'] = {
        trimCount: pageData.allTrims.length,
        trims: pageData.allTrims.map(t => t.name),
      };
    }

    // Analyze issues
    if (result.danawaFuelTypes.length > 1) {
      result.issues.push(`Multiple fuel types on Danawa (${result.danawaFuelTypes.join(', ')}) but our data only has '${car.expectedFuel}'`);
    }

    if (result.danawaFuelTypes.length === 1 && result.danawaFuelTypes[0] !== car.expectedFuel) {
      result.issues.push(`Fuel type mismatch: Danawa has '${result.danawaFuelTypes[0]}' but our data has '${car.expectedFuel}'`);
    }

    // Check trim counts
    const totalDanawaTrims = Object.values(result.fuelTypeDetails).reduce((sum, ft) => sum + ft.trimCount, 0);
    if (totalDanawaTrims !== car.expectedTrims && result.danawaFuelTypes.length === 1) {
      result.issues.push(`Trim count mismatch: Danawa has ${totalDanawaTrims} trims but our data has ${car.expectedTrims}`);
    }

    if (result.danawaFuelTypes.length > 1) {
      // Check if our trim count matches any single fuel type or is a mix
      const matchesSingleFuelType = Object.values(result.fuelTypeDetails).some(ft => ft.trimCount === car.expectedTrims);
      if (!matchesSingleFuelType) {
        result.issues.push(`Our ${car.expectedTrims} trims might be a mix of multiple fuel types`);
      }
    }

  } catch (e) {
    result.issues.push(`Error scraping: ${e.message}`);
    console.log(`  ERROR: ${e.message.substring(0, 100)}`);
  }

  await page.close();
  return result;
}

async function main() {
  console.log('=== Fuel Type Verification for Hyundai Vehicles ===\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const results = [];

  for (const car of CARS_TO_CHECK) {
    const result = await checkCarFuelTypes(browser, car);
    results.push(result);
    await delay(1000);
  }

  await browser.close();

  // Generate report
  console.log('\n\n=== VERIFICATION REPORT ===\n');

  results.forEach(result => {
    console.log(`\n${result.name} (${result.carId})`);
    console.log(`  Danawa fuel types: ${result.danawaFuelTypes.join(', ') || 'None detected'}`);
    console.log(`  Our data fuel type: ${result.ourDataFuelType}`);
    console.log(`  Fuel type details:`);
    Object.entries(result.fuelTypeDetails).forEach(([fuel, details]) => {
      console.log(`    ${fuel}: ${details.trimCount} trims`);
    });
    console.log(`  Our data trim count: ${result.ourDataTrimCount}`);

    if (result.issues.length > 0) {
      console.log(`  ISSUES:`);
      result.issues.forEach(issue => console.log(`    - ${issue}`));
    } else {
      console.log(`  ✓ No issues detected`);
    }
  });

  // Save results
  const outputPath = path.join(__dirname, 'fuel-type-verification-results.json');
  fs.writeFileSync(outputPath, JSON.stringify({ results, timestamp: new Date().toISOString() }, null, 2));
  console.log(`\n\nResults saved to: ${outputPath}`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
