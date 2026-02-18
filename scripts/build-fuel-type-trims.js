const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── Configuration ──────────────────────────────────────────────────────────

// Hyundai multi-fuel cars (data already scraped in hyundai-fuel-type-verification.json)
const HYUNDAI_CARS = ['4188', '4435', '4455', '4466', '4592', '4699'];

// Non-Hyundai multi-fuel cars (need Puppeteer scraping)
const NON_HYUNDAI_CARS = [
  { id: '4563', name: '더 뉴 쏘렌토' },
  { id: '4585', name: '더 뉴 K5' },
  { id: '4609', name: 'GV70 FL' },
  { id: '4622', name: '액티언' },
  { id: '4659', name: '그랑 콜레오스' },
  { id: '4665', name: '더 뉴 K8' },
  { id: '4684', name: '더 뉴 스포티지' },
  { id: '4465', name: 'GV80 FL' },
];

// Section title keywords to filter out (special variants)
const SKIP_KEYWORDS = ['운전교습용', '장애인용', '렌터카', '특장차', '택시', '영업용', '밴'];

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseFuelType(sectionTitle) {
  const title = sectionTitle.toLowerCase();
  if (title.includes('하이브리드')) return '하이브리드';
  if (title.includes('디젤')) return '디젤';
  if (title.includes('전기')) return '전기';
  if (title.includes('수소')) return '수소';
  if (title.includes('lpg')) return 'LPG';
  if (title.includes('가솔린')) return '가솔린';
  return 'unknown';
}

function shouldSkipSection(sectionTitle) {
  return SKIP_KEYWORDS.some(kw => sectionTitle.includes(kw));
}

function extractYear(sectionTitle) {
  const match = sectionTitle.match(/(\d{4})년형/);
  return match ? parseInt(match[1]) : 0;
}

/**
 * Extract displacement number from a section title.
 * e.g. "2026년형 가솔린 터보 2.5 (개별소비세 인하)" -> ["2.5"]
 * Excludes the year pattern (2026, etc.)
 */
function extractDisplacements(title) {
  // Remove the year pattern first so "2026" doesn't match as displacement
  const cleaned = title.replace(/\d{4}년형/, '');
  return cleaned.match(/\d+\.\d+/g) || [];
}

/**
 * Full pipeline to assign trims to subModels.
 * Takes the raw Danawa sections and sub-models.json entry.
 */
function assignTrimsToSubModels(subModelsEntry, rawSections) {
  const subModels = subModelsEntry.subModels;

  // Step 1: Filter out special variants and keep latest year
  const filtered = rawSections.filter(s => !shouldSkipSection(s.sectionTitle));
  if (filtered.length === 0) return subModelsEntry;

  const years = filtered.map(s => extractYear(s.sectionTitle)).filter(y => y > 0);
  const latestYear = years.length > 0 ? Math.max(...years) : 0;
  const latestSections = latestYear > 0
    ? filtered.filter(s => extractYear(s.sectionTitle) === latestYear)
    : filtered;

  // Step 2: Parse fuelType for each section
  const sectionsWithFuel = latestSections.map(s => ({
    ...s,
    fuelType: s.fuelType || parseFuelType(s.sectionTitle),
  }));

  // Step 3: Pre-compute disambiguation for same-fuelType groups
  // For each fuelType with multiple subModels, decide strategy ONCE for all subModels
  const fuelTypeAssignments = new Map(); // sm.id -> sections[]

  // Group subModels by fuelType
  const smByFuelType = {};
  for (const sm of subModels) {
    if (!smByFuelType[sm.fuelType]) smByFuelType[sm.fuelType] = [];
    smByFuelType[sm.fuelType].push(sm);
  }

  for (const [fuelType, smsGroup] of Object.entries(smByFuelType)) {
    const sectionsForFuel = sectionsWithFuel.filter(s => s.fuelType === fuelType);

    if (sectionsForFuel.length === 0) continue;

    if (smsGroup.length <= 1) {
      // Single subModel -> gets all sections
      fuelTypeAssignments.set(smsGroup[0].id, sectionsForFuel);
    } else {
      // Multiple subModels with same fuelType -> use ordered assignment
      // Always use ordered (positional) assignment for consistency
      const assignments = assignByOrder(smsGroup, sectionsForFuel);
      for (const [smId, sections] of Object.entries(assignments)) {
        fuelTypeAssignments.set(smId, sections);
      }
    }
  }

  // Step 4: Build trims for each subModel
  const updatedSubModels = subModels.map(sm => {
    const matchedSections = fuelTypeAssignments.get(sm.id);

    if (!matchedSections || matchedSections.length === 0) {
      return { ...sm };
    }

    // Flatten all trims from matched sections
    const allTrims = [];
    for (const section of matchedSections) {
      for (const trim of section.trims) {
        allTrims.push(trim);
      }
    }

    if (allTrims.length === 0) {
      return { ...sm };
    }

    const trims = allTrims.map((t, i) => ({
      id: `grade_${i}`,
      name: t.name,
      price: t.price,
      features: [],
    }));

    return { ...sm, trims };
  });

  return { subModels: updatedSubModels };
}

/**
 * Assign sections to subModels when multiple subModels share the same fuelType.
 *
 * Strategy: Sort both subModels and section-displacement-groups by displacement
 * ascending, then assign positionally (1st smallest subModel gets 1st smallest
 * section group, etc.). This handles cases where Danawa uses different displacement
 * numbers than sub-models.json (e.g., GV70 sub-model says "2.0T" but Danawa says "터보 2.5").
 *
 * Returns: { [smId]: sections[] }
 */
function assignByOrder(sameTypeSMs, sectionsForFuel) {
  const result = {};

  // Sort subModels by displacement (ascending)
  const sortedSMs = [...sameTypeSMs]
    .map(sm => {
      const m = sm.name.match(/(\d+\.\d+)/);
      return { sm, disp: m ? parseFloat(m[1]) : 0 };
    })
    .sort((a, b) => a.disp - b.disp);

  // Group sections by their primary displacement (ascending)
  const sectionsByDisp = new Map();
  for (const section of sectionsForFuel) {
    const titleDisps = extractDisplacements(section.sectionTitle);
    const primaryDisp = titleDisps.length > 0 ? titleDisps[0] : '0';
    if (!sectionsByDisp.has(primaryDisp)) {
      sectionsByDisp.set(primaryDisp, []);
    }
    sectionsByDisp.get(primaryDisp).push(section);
  }

  // Sort displacement groups ascending
  const sortedDispGroups = [...sectionsByDisp.entries()]
    .sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]));

  // Assign positionally
  for (let i = 0; i < sortedSMs.length; i++) {
    const smId = sortedSMs[i].sm.id;
    if (i < sortedDispGroups.length) {
      result[smId] = sortedDispGroups[i][1];
    } else {
      result[smId] = [];
    }
  }

  return result;
}

// ─── Scraping (for non-Hyundai cars) ────────────────────────────────────────

async function scrapeCarSections(browser, carId, carName) {
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

  const url = `https://auto.danawa.com/newcar/?Work=estimate&Model=${carId}`;
  console.log(`  Scraping ${carName} (${carId})...`);

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await delay(3000);

    const sections = await page.evaluate(() => {
      const fuelSections = [];
      const trimBoxes = document.querySelectorAll('.eChkTrimList.article-box');

      trimBoxes.forEach(box => {
        const header = box.querySelector('.article-box__header h4.title');
        if (!header) return;

        const sectionTitle = header.textContent.trim();
        if (!sectionTitle.match(/\d{4}년형/)) return;

        const trims = [];
        const trimInputs = box.querySelectorAll('input[type="radio"][name="eChkTrim_1"]');

        trimInputs.forEach(input => {
          const parent = input.closest('.choice');
          if (!parent) return;

          const nameEl = parent.querySelector('.choice__info .txt');
          const priceEl = parent.querySelector('.choice__price');

          if (nameEl && priceEl) {
            // Parse price from full text to handle 1억+ prices
            // Format examples: "3,617만 원", "1억 47만 원", "1억 387만 원"
            const priceText = priceEl.textContent.trim();
            let price = 0;

            const eokMatch = priceText.match(/(\d+)억\s*([\d,]*)만/);
            const manMatch = priceText.match(/([\d,]+)만/);

            if (eokMatch) {
              const eok = parseInt(eokMatch[1]);
              const man = eokMatch[2] ? parseInt(eokMatch[2].replace(/,/g, '')) : 0;
              price = (eok * 10000 + man) * 10000;
            } else if (manMatch) {
              price = parseInt(manMatch[1].replace(/,/g, '')) * 10000;
            }

            trims.push({
              name: nameEl.textContent.trim(),
              price,
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

    const result = sections.map(section => ({
      ...section,
      fuelType: parseFuelType(section.sectionTitle),
    }));

    console.log(`    Found ${sections.length} sections, ${sections.reduce((s, x) => s + x.trims.length, 0)} total trims`);
    await page.close();
    return result;

  } catch (e) {
    console.error(`    ERROR scraping ${carId}: ${e.message}`);
    await page.close();
    return [];
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Build Fuel-Type Trims ===\n');

  // Load data files
  const subModelsPath = path.join(__dirname, '..', 'src', 'constants', 'sub-models.json');
  const carDetailsPath = path.join(__dirname, '..', 'src', 'constants', 'generated-car-details.json');
  const hyundaiDataPath = path.join(__dirname, 'hyundai-fuel-type-verification.json');

  const subModels = JSON.parse(fs.readFileSync(subModelsPath, 'utf-8'));
  const carDetails = JSON.parse(fs.readFileSync(carDetailsPath, 'utf-8'));
  const hyundaiData = JSON.parse(fs.readFileSync(hyundaiDataPath, 'utf-8'));

  // Collect all sections data: { carId -> sections[] }
  const allSectionsData = {};

  // ── Part 1: Process Hyundai cars from existing verification data ──
  console.log('--- Processing Hyundai multi-fuel cars (from existing data) ---\n');

  for (const carId of HYUNDAI_CARS) {
    const result = hyundaiData.results.find(r => r.carId === carId);
    if (!result) {
      console.log(`  WARNING: No Hyundai data for ${carId}`);
      continue;
    }
    console.log(`  ${result.name} (${carId}): ${result.fuelTypeSections.length} sections`);
    allSectionsData[carId] = result.fuelTypeSections;
  }

  // ── Part 2: Scrape non-Hyundai cars ──
  console.log('\n--- Scraping non-Hyundai multi-fuel cars ---\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  for (const car of NON_HYUNDAI_CARS) {
    const sections = await scrapeCarSections(browser, car.id, car.name);
    allSectionsData[car.id] = sections;
    await delay(1500);
  }

  await browser.close();

  // ── Part 3: Assign trims to sub-models ──
  console.log('\n--- Assigning trims to sub-models ---\n');

  const allCarIds = [...HYUNDAI_CARS, ...NON_HYUNDAI_CARS.map(c => c.id)];
  let updatedCount = 0;

  for (const carId of allCarIds) {
    const sections = allSectionsData[carId];
    if (!sections || sections.length === 0) {
      console.log(`  ${carId}: No sections data, skipping`);
      continue;
    }

    const entry = subModels[carId];
    if (!entry) {
      console.log(`  ${carId}: Not found in sub-models.json, skipping`);
      continue;
    }

    const updated = assignTrimsToSubModels(entry, sections);
    subModels[carId] = updated;

    // Report
    const subModelSummary = updated.subModels.map(sm => {
      const trimCount = sm.trims ? sm.trims.length : 0;
      return `${sm.name}(${trimCount})`;
    }).join(', ');
    console.log(`  ${carId}: ${subModelSummary}`);
    updatedCount++;
  }

  // ── Part 4: Update generated-car-details.json ──
  console.log('\n--- Updating generated-car-details.json (default subModel trims) ---\n');

  for (const carId of allCarIds) {
    const entry = subModels[carId];
    if (!entry) continue;

    const defaultSM = entry.subModels.find(sm => sm.isDefault);
    if (!defaultSM || !defaultSM.trims || defaultSM.trims.length === 0) {
      console.log(`  ${carId}: No default subModel trims, keeping existing`);
      continue;
    }

    if (!carDetails[carId]) {
      console.log(`  ${carId}: Not found in generated-car-details.json, skipping`);
      continue;
    }

    carDetails[carId].trims = defaultSM.trims;
    console.log(`  ${carId}: Set ${defaultSM.trims.length} trims from default subModel "${defaultSM.name}"`);
  }

  // ── Part 5: Write output ──
  console.log('\n--- Writing output files ---\n');

  fs.writeFileSync(subModelsPath, JSON.stringify(subModels, null, 2) + '\n');
  console.log(`  Updated: ${subModelsPath}`);

  fs.writeFileSync(carDetailsPath, JSON.stringify(carDetails, null, 2) + '\n');
  console.log(`  Updated: ${carDetailsPath}`);

  console.log(`\nDone! Updated ${updatedCount} cars with per-fuel-type trims.`);

  // ── Verification summary ──
  console.log('\n=== Verification Summary ===\n');
  for (const carId of allCarIds) {
    const entry = subModels[carId];
    if (!entry) continue;
    const name = carDetails[carId] ? carDetails[carId].name : carId;
    console.log(`${carId} (${name}):`);
    for (const sm of entry.subModels) {
      const trimCount = sm.trims ? sm.trims.length : 0;
      const firstTrim = sm.trims && sm.trims.length > 0 ? sm.trims[0].name + ' @ ' + sm.trims[0].price : 'N/A';
      console.log(`  ${sm.id} "${sm.name}" (${sm.fuelType}): ${trimCount} trims, first: ${firstTrim}`);
    }
  }
}

main().catch(e => {
  console.error('FATAL:', e);
  process.exit(1);
});
