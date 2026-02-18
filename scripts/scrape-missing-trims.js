const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// Cars that need per-subModel trim extraction
const CARS_TO_SCRAPE = [
  // Same fuel, different displacement
  { id: '3995', name: '더 뉴 G70 FL' },
  { id: '4066', name: '더 뉴 K9' },
  { id: '4391', name: '더 뉴 셀토스' },
  { id: '4474', name: '더 뉴 트레일블레이저' },
  { id: '4603', name: 'G80 FL' },
  // EV variants (롱레인지/스탠다드/GT)
  { id: '4128', name: 'EV9' },
  { id: '4499', name: 'EV5' },
  { id: '4510', name: '코나 일렉트릭' },
  { id: '4624', name: '아이오닉 5 FL' },
  { id: '4641', name: '더 뉴 EV6' },
  { id: '4647', name: 'EV3' },
  { id: '4712', name: 'EV4' },
  { id: '4746', name: '아이오닉 6 FL' },
  // Diesel-missing cars (re-check if Danawa now has data)
  { id: '4435', name: '싼타페 (디젤 재확인)' },
  { id: '4592', name: '더 뉴 투싼 FL (디젤 재확인)' },
  { id: '4684', name: '더 뉴 스포티지 (디젤 재확인)' },
  { id: '4699', name: '팰리세이드 (디젤 재확인)' },
  { id: '4465', name: 'GV80 FL (디젤 재확인)' },
  { id: '4609', name: 'GV70 FL (디젤 재확인)' },
  { id: '4622', name: '액티언 (디젤 재확인)' },
];

const SKIP_KEYWORDS = ['운전교습용', '장애인용', '렌터카', '특장차', '택시', '영업용', '밴'];

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

function extractYear(title) {
  const m = title.match(/(\d{4})년형/);
  return m ? parseInt(m[1]) : 0;
}

function extractDisplacements(title) {
  const cleaned = title.replace(/\d{4}년형/, '');
  return cleaned.match(/\d+\.\d+/g) || [];
}

/**
 * Extract EV variant keyword from section title.
 * e.g. "2026년형 전기 롱레인지 2WD" -> "롱레인지"
 *      "2026년형 전기 스탠다드 4WD" -> "스탠다드"
 *      "2026년형 전기 GT 4WD"       -> "gt"
 */
function extractEvVariant(title) {
  const lower = title.toLowerCase();
  if (lower.includes('롱레인지') || lower.includes('long')) return '롱레인지';
  if (lower.includes('스탠다드') || lower.includes('standard')) return '스탠다드';
  if (lower.includes('gt')) return 'gt';
  // Check for range in kWh patterns like "84kWh", "58kWh"
  const kwhMatch = title.match(/(\d+)\s*kwh/i);
  if (kwhMatch) return kwhMatch[1] + 'kwh';
  return null;
}

/**
 * Match subModel name to EV variant keyword
 */
function subModelMatchesEvVariant(smName, variant) {
  const lower = smName.toLowerCase();
  if (variant === '롱레인지') return lower.includes('롱레인지') || lower.includes('long');
  if (variant === '스탠다드') return lower.includes('스탠다드') || lower.includes('standard');
  if (variant === 'gt') return lower.includes('gt');
  if (variant && variant.endsWith('kwh')) return lower.includes(variant);
  return false;
}

function shouldSkipSection(title) {
  return SKIP_KEYWORDS.some(kw => title.includes(kw));
}

/**
 * Assign scraped sections to subModels using smart matching.
 */
function assignTrimsToSubModels(subModelsEntry, rawSections) {
  const subModels = subModelsEntry.subModels;

  // Filter special variants, keep latest year
  const filtered = rawSections.filter(s => !shouldSkipSection(s.sectionTitle));
  if (filtered.length === 0) return subModelsEntry;

  const years = filtered.map(s => extractYear(s.sectionTitle)).filter(y => y > 0);
  const latestYear = years.length > 0 ? Math.max(...years) : 0;
  const latest = latestYear > 0 ? filtered.filter(s => extractYear(s.sectionTitle) === latestYear) : filtered;

  // Add fuelType to sections
  const sections = latest.map(s => ({
    ...s,
    fuelType: parseFuelType(s.sectionTitle),
  }));

  // Group subModels by fuelType
  const smByFuel = {};
  for (const sm of subModels) {
    if (!smByFuel[sm.fuelType]) smByFuel[sm.fuelType] = [];
    smByFuel[sm.fuelType].push(sm);
  }

  // Assign sections to subModels
  const assignments = new Map(); // sm.id -> sections[]

  for (const [fuelType, smsGroup] of Object.entries(smByFuel)) {
    const sectionsForFuel = sections.filter(s => s.fuelType === fuelType);
    if (sectionsForFuel.length === 0) continue;

    if (smsGroup.length <= 1) {
      // Single subModel -> gets all sections
      assignments.set(smsGroup[0].id, sectionsForFuel);
    } else if (fuelType === '전기') {
      // EV matching: use variant keywords (롱레인지/스탠다드/GT)
      assignEvSections(smsGroup, sectionsForFuel, assignments);
    } else {
      // Same fuel, different displacement: positional matching
      assignByDisplacement(smsGroup, sectionsForFuel, assignments);
    }
  }

  // Build trims from assignments
  const updatedSubModels = subModels.map(sm => {
    const matched = assignments.get(sm.id);
    if (!matched || matched.length === 0) {
      // Keep existing trims if any
      return { ...sm };
    }

    const allTrims = matched.flatMap(s => s.trims);
    if (allTrims.length === 0) return { ...sm };

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

function assignEvSections(smsGroup, sectionsForFuel, assignments) {
  // Try keyword matching first
  const unmatched = [];

  for (const section of sectionsForFuel) {
    const variant = extractEvVariant(section.sectionTitle);
    if (variant) {
      const matchingSm = smsGroup.find(sm => subModelMatchesEvVariant(sm.name, variant));
      if (matchingSm) {
        if (!assignments.has(matchingSm.id)) assignments.set(matchingSm.id, []);
        assignments.get(matchingSm.id).push(section);
        continue;
      }
    }
    unmatched.push(section);
  }

  // If keyword matching didn't work, try positional assignment
  if (unmatched.length > 0) {
    const unassignedSMs = smsGroup.filter(sm => !assignments.has(sm.id));
    for (let i = 0; i < Math.min(unmatched.length, unassignedSMs.length); i++) {
      assignments.set(unassignedSMs[i].id, [unmatched[i]]);
    }
  }
}

function assignByDisplacement(smsGroup, sectionsForFuel, assignments) {
  // Sort subModels by displacement ascending
  const sortedSMs = [...smsGroup]
    .map(sm => {
      const m = sm.name.match(/(\d+\.\d+)/);
      return { sm, disp: m ? parseFloat(m[1]) : 0 };
    })
    .sort((a, b) => a.disp - b.disp);

  // Group sections by displacement
  const sectionsByDisp = new Map();
  for (const section of sectionsForFuel) {
    const disps = extractDisplacements(section.sectionTitle);
    const key = disps.length > 0 ? disps[0] : '0';
    if (!sectionsByDisp.has(key)) sectionsByDisp.set(key, []);
    sectionsByDisp.get(key).push(section);
  }

  const sortedGroups = [...sectionsByDisp.entries()]
    .sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]));

  // Positional assignment
  for (let i = 0; i < sortedSMs.length; i++) {
    if (i < sortedGroups.length) {
      assignments.set(sortedSMs[i].sm.id, sortedGroups[i][1]);
    }
  }
}

// ─── Scraping ──────────────────────────────────────────────────────────────

async function scrapeCarSections(browser, carId) {
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
  const url = `https://auto.danawa.com/newcar/?Work=estimate&Model=${carId}`;

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await delay(3000);

    const sections = await page.evaluate(() => {
      const results = [];
      const boxes = document.querySelectorAll('.eChkTrimList.article-box');

      boxes.forEach(box => {
        const header = box.querySelector('.article-box__header h4.title');
        if (!header) return;
        const title = header.textContent.trim();
        if (!title.match(/\d{4}년형/)) return;

        const trims = [];
        const inputs = box.querySelectorAll('input[type="radio"][name="eChkTrim_1"]');

        inputs.forEach(input => {
          const parent = input.closest('.choice');
          if (!parent) return;
          const nameEl = parent.querySelector('.choice__info .txt');
          const priceEl = parent.querySelector('.choice__price');

          if (nameEl && priceEl) {
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
            trims.push({ name: nameEl.textContent.trim(), price });
          }
        });

        if (trims.length > 0) {
          results.push({ sectionTitle: title, trimCount: trims.length, trims });
        }
      });

      return results;
    });

    await page.close();
    return sections;
  } catch (e) {
    console.error(`  ERROR: ${e.message.substring(0, 80)}`);
    await page.close();
    return [];
  }
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== 누락 트림 데이터 추출 ===\n');

  const subModelsPath = path.join(__dirname, '..', 'src', 'constants', 'sub-models.json');
  const carDetailsPath = path.join(__dirname, '..', 'src', 'constants', 'generated-car-details.json');
  const carsPath = path.join(__dirname, '..', 'src', 'constants', 'generated-cars.json');

  const subModels = JSON.parse(fs.readFileSync(subModelsPath, 'utf-8'));
  const carDetails = JSON.parse(fs.readFileSync(carDetailsPath, 'utf-8'));
  const carsData = JSON.parse(fs.readFileSync(carsPath, 'utf-8'));

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  let updated = 0;
  let newTrimsAdded = 0;

  for (const car of CARS_TO_SCRAPE) {
    const entry = subModels[car.id];
    if (!entry) {
      console.log(`[SKIP] ${car.id} ${car.name}: sub-models.json에 없음`);
      continue;
    }

    // Check which subModels are missing trims
    const missing = entry.subModels.filter(sm => !sm.trims || sm.trims.length === 0);
    if (missing.length === 0) {
      console.log(`[OK] ${car.id} ${car.name}: 모든 subModel에 트림 있음`);
      continue;
    }

    console.log(`[SCRAPE] ${car.id} ${car.name}: ${missing.length}개 subModel 트림 필요`);
    missing.forEach(sm => console.log(`  - ${sm.name} (${sm.fuelType})`));

    const sections = await scrapeCarSections(browser, car.id);
    console.log(`  다나와: ${sections.length}개 섹션, ${sections.reduce((s, x) => s + x.trims.length, 0)}개 트림`);
    sections.forEach(s => console.log(`    "${s.sectionTitle}" → ${s.trimCount}개 트림`));

    if (sections.length === 0) {
      console.log(`  → 다나와에 데이터 없음\n`);
      await delay(1500);
      continue;
    }

    // Assign trims
    const result = assignTrimsToSubModels(entry, sections);

    // Check what changed
    let newlyAssigned = 0;
    result.subModels.forEach((sm, i) => {
      const oldSm = entry.subModels[i];
      const hadTrims = oldSm.trims && oldSm.trims.length > 0;
      const hasTrims = sm.trims && sm.trims.length > 0;
      if (!hadTrims && hasTrims) {
        console.log(`  → ${sm.name}: ${sm.trims.length}개 트림 추가됨`);
        newlyAssigned += sm.trims.length;
      } else if (hadTrims && hasTrims && sm.trims.length !== oldSm.trims.length) {
        console.log(`  → ${sm.name}: ${oldSm.trims.length} → ${sm.trims.length}개 트림 (갱신)`);
      } else if (!hasTrims) {
        console.log(`  → ${sm.name}: 다나와에 해당 트림 없음`);
      }
    });

    if (newlyAssigned > 0) {
      subModels[car.id] = result;
      newTrimsAdded += newlyAssigned;
      updated++;

      // Update car-details default trims
      const defaultSM = result.subModels.find(sm => sm.isDefault);
      if (defaultSM && defaultSM.trims && defaultSM.trims.length > 0 && carDetails[car.id]) {
        carDetails[car.id].trims = defaultSM.trims;
      }
    }

    console.log('');
    await delay(1500);
  }

  await browser.close();

  // Update startPrice and gradeCount
  console.log('\n--- startPrice / gradeCount 업데이트 ---\n');
  let priceFixed = 0;

  carsData.cars.forEach(car => {
    const entry = subModels[car.id];
    const detail = carDetails[car.id];
    if (!entry || !detail) return;

    const allTrims = [];
    entry.subModels.forEach(sm => {
      if (sm.trims && sm.trims.length > 0) allTrims.push(...sm.trims);
    });
    // Add car-level for subModels without trims
    const hasDefaultTrims = entry.subModels.some(sm => sm.isDefault && sm.trims && sm.trims.length > 0);
    if (!hasDefaultTrims && detail.trims) allTrims.push(...detail.trims);

    if (allTrims.length === 0) return;

    const minPrice = Math.min(...allTrims.map(t => t.price));
    const totalGrades = allTrims.length;

    if (minPrice !== car.startPrice || totalGrades !== car.gradeCount) {
      if (minPrice !== car.startPrice) {
        console.log(`  ${car.name}: startPrice ${car.startPrice/10000}만 → ${minPrice/10000}만`);
      }
      if (totalGrades !== car.gradeCount) {
        console.log(`  ${car.name}: gradeCount ${car.gradeCount} → ${totalGrades}`);
      }
      car.startPrice = minPrice;
      car.gradeCount = totalGrades;
      priceFixed++;
    }
  });

  // Write files
  console.log('\n--- 파일 저장 ---\n');
  fs.writeFileSync(subModelsPath, JSON.stringify(subModels, null, 2) + '\n');
  fs.writeFileSync(carDetailsPath, JSON.stringify(carDetails, null, 2) + '\n');
  fs.writeFileSync(carsPath, JSON.stringify(carsData, null, 2) + '\n');

  console.log(`=== 완료 ===`);
  console.log(`새 트림 추가: ${updated}개 차량, ${newTrimsAdded}개 트림`);
  console.log(`가격/등급수 수정: ${priceFixed}개 차량`);
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
