const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// All 22 Hyundai cars to verify
const HYUNDAI_CARS = [
  { id: '1901', name: '포터2', expectedFuel: '디젤', expectedTrims: 18 },
  { id: '3654', name: '베뉴', expectedFuel: '가솔린', expectedTrims: 3 },
  { id: '4088', name: '아이오닉 9', expectedFuel: '전기', expectedTrims: 9 },
  { id: '4188', name: '디 올 뉴 그랜저', expectedFuel: '가솔린', expectedTrims: 6 },
  { id: '4361', name: '코나', expectedFuel: '가솔린', expectedTrims: 21 },
  { id: '4399', name: '포터2 EV', expectedFuel: '전기', expectedTrims: 18 },
  { id: '4435', name: '싼타페', expectedFuel: '가솔린', expectedTrims: 18 },
  { id: '4455', name: '더 뉴 아반떼', expectedFuel: '가솔린', expectedTrims: 5 },
  { id: '4466', name: '쏘나타 FL', expectedFuel: '가솔린', expectedTrims: 4 },
  { id: '4510', name: '코나 일렉트릭', expectedFuel: '전기', expectedTrims: 4 },
  { id: '4558', name: '아이오닉 5 N', expectedFuel: '전기', expectedTrims: 2 },
  { id: '4564', name: '더 뉴 아반떼 N', expectedFuel: '가솔린', expectedTrims: 4 },
  { id: '4592', name: '더 뉴 투싼 FL', expectedFuel: '가솔린', expectedTrims: 12 },
  { id: '4624', name: '아이오닉 5 FL', expectedFuel: '전기', expectedTrims: 10 },
  { id: '4626', name: 'ST1', expectedFuel: '전기', expectedTrims: 7 },
  { id: '4653', name: '캐스퍼 EV', expectedFuel: '전기', expectedTrims: 3 },
  { id: '4671', name: '캐스퍼 FL', expectedFuel: '가솔린', expectedTrims: 3 },
  { id: '4677', name: '넥쏘', expectedFuel: '수소', expectedTrims: 3 },
  { id: '4699', name: '팰리세이드', expectedFuel: '가솔린', expectedTrims: 6 },
  { id: '4742', name: '아이오닉 6 N', expectedFuel: '전기', expectedTrims: 1 },
  { id: '4746', name: '아이오닉 6 FL', expectedFuel: '전기', expectedTrims: 10 },
  { id: '4765', name: '스타리아 FL', expectedFuel: '가솔린', expectedTrims: 4 },
];

function parseFuelType(sectionTitle) {
  // Extract fuel type from section title like "2026년형 가솔린 터보 1.6 하이브리드 2WD"
  const title = sectionTitle.toLowerCase();

  if (title.includes('하이브리드')) return '하이브리드';
  if (title.includes('디젤')) return '디젤';
  if (title.includes('전기')) return '전기';
  if (title.includes('수소')) return '수소';
  if (title.includes('lpg')) return 'LPG';
  if (title.includes('가솔린')) return '가솔린';

  return 'unknown';
}

async function extractCarData(browser, car) {
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

  const url = `https://auto.danawa.com/newcar/?Work=estimate&Model=${car.id}`;
  const result = {
    carId: car.id,
    name: car.name,
    ourDataFuelType: car.expectedFuel,
    ourDataTrimCount: car.expectedTrims,
    fuelTypeSections: [],
    issues: [],
  };

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await delay(3000);

    // Extract all fuel type sections with their trims
    const sections = await page.evaluate(() => {
      const fuelSections = [];

      // Find all trim section boxes
      const trimBoxes = document.querySelectorAll('.eChkTrimList.article-box');

      trimBoxes.forEach(box => {
        const header = box.querySelector('.article-box__header h4.title');
        if (!header) return;

        const sectionTitle = header.textContent.trim();

        // Skip if not a year/fuel section (like option sections)
        if (!sectionTitle.match(/\d{4}년형/)) return;

        const trims = [];
        const trimInputs = box.querySelectorAll('input[type="radio"][name="eChkTrim_1"]');

        trimInputs.forEach(input => {
          const parent = input.closest('.choice');
          if (!parent) return;

          const nameEl = parent.querySelector('.choice__info .txt');
          const priceEl = parent.querySelector('.choice__price .num');

          if (nameEl) {
            trims.push({
              name: nameEl.textContent.trim(),
              price: priceEl ? parseInt(priceEl.textContent.replace(/,/g, '')) * 10000 : 0,
            });
          }
        });

        if (trims.length > 0) {
          fuelSections.push({
            sectionTitle,
            trimCount: trims.length,
            trims,
          });
        }
      });

      return fuelSections;
    });

    result.fuelTypeSections = sections.map(section => ({
      ...section,
      fuelType: parseFuelType(section.sectionTitle),
    }));

    // Analyze issues
    const totalDanawaTrims = sections.reduce((sum, s) => sum + s.trimCount, 0);
    const uniqueFuelTypes = [...new Set(result.fuelTypeSections.map(s => s.fuelType))];

    if (uniqueFuelTypes.length > 1) {
      result.issues.push(
        `CRITICAL: Multiple fuel types found (${uniqueFuelTypes.join(', ')}) but our data only has '${car.expectedFuel}'`
      );
      result.issues.push(
        `Our ${car.expectedTrims} trims are likely mixed from: ${result.fuelTypeSections.map(s => `${s.fuelType} (${s.trimCount})`).join(', ')}`
      );
    } else if (uniqueFuelTypes.length === 1 && uniqueFuelTypes[0] !== car.expectedFuel) {
      result.issues.push(
        `Fuel type mismatch: Danawa='${uniqueFuelTypes[0]}' vs Our data='${car.expectedFuel}'`
      );
    }

    if (totalDanawaTrims !== car.expectedTrims) {
      result.issues.push(
        `Trim count mismatch: Danawa=${totalDanawaTrims} vs Our data=${car.expectedTrims}`
      );
    }

    console.log(`✓ ${car.name} (${car.id}): ${sections.length} sections, ${totalDanawaTrims} total trims`);
    if (result.issues.length > 0) {
      result.issues.forEach(issue => console.log(`  ⚠ ${issue}`));
    }

  } catch (e) {
    result.issues.push(`Error: ${e.message}`);
    console.log(`✗ ${car.name} (${car.id}): ERROR - ${e.message.substring(0, 80)}`);
  }

  await page.close();
  return result;
}

async function main() {
  console.log('=== Hyundai Vehicle Fuel Type Verification ===\n');
  console.log(`Checking ${HYUNDAI_CARS.length} vehicles...\n`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const results = [];
  let issueCount = 0;

  for (const car of HYUNDAI_CARS) {
    const result = await extractCarData(browser, car);
    results.push(result);
    if (result.issues.length > 0) issueCount++;
    await delay(1000);
  }

  await browser.close();

  // Generate summary report
  console.log('\n\n=== SUMMARY REPORT ===\n');
  console.log(`Total vehicles checked: ${HYUNDAI_CARS.length}`);
  console.log(`Vehicles with issues: ${issueCount}`);
  console.log(`Vehicles OK: ${HYUNDAI_CARS.length - issueCount}\n`);

  console.log('\n=== DETAILED FINDINGS ===\n');

  results.forEach(result => {
    if (result.issues.length === 0) return;

    console.log(`\n${result.name} (${result.carId})`);
    console.log(`  Our data: ${result.ourDataFuelType} - ${result.ourDataTrimCount} trims`);
    console.log(`  Danawa sections:`);
    result.fuelTypeSections.forEach(section => {
      console.log(`    - ${section.fuelType}: ${section.trimCount} trims`);
      console.log(`      "${section.sectionTitle}"`);
    });
    console.log(`  Issues:`);
    result.issues.forEach(issue => console.log(`    ⚠ ${issue}`));
  });

  // Save detailed results
  const outputPath = path.join(__dirname, 'hyundai-fuel-type-verification.json');
  fs.writeFileSync(
    outputPath,
    JSON.stringify({ timestamp: new Date().toISOString(), results }, null, 2)
  );

  console.log(`\n\nDetailed results saved to: ${outputPath}`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
