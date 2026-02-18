const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BRAND_GROUP = process.argv[2] || 'all'; // domestic, german, other, all

async function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function getBrandIdToName() {
  return {
    'hyundai': '현대', 'kia': '기아', 'genesis': '제네시스',
    'kgm': 'KGM', '르노코리아': '르노코리아', '쉐보레': '쉐보레',
    'benz': '벤츠', 'bmw': 'BMW', 'audi': '아우디',
    'volvo': '볼보', 'porsche': '포르쉐', 'toyota': '토요타',
    'lexus': '렉서스', 'landrover': '랜드로버', 'honda': '혼다',
    'jeep': '지프', 'cadillac': '캐딜락', 'gmc': 'GMC',
    'lincoln': '링컨', 'peugeot': '푸조', 'polestar': '폴스타',
    '테슬라': '테슬라'
  };
}

function getBrandGroup(brandId) {
  const domestic = ['hyundai', 'kia', 'genesis', 'kgm', '르노코리아', '쉐보레'];
  const german = ['benz', 'bmw', 'audi'];
  if (domestic.includes(brandId)) return 'domestic';
  if (german.includes(brandId)) return 'german';
  return 'other';
}

async function scrapeDanawaData(browser, carId, carName) {
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  const url = `https://auto.danawa.com/newcar/?Work=estimate&Model=${carId}`;

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await delay(2000);

    // Extract grade/trim data
    const gradeData = await page.evaluate(() => {
      const grades = [];
      // Look for grade items in the estimate page
      const gradeItems = document.querySelectorAll('.grade_item, .option_grade li, .estimate_grade li');
      gradeItems.forEach(item => {
        const nameEl = item.querySelector('.name, .tit, .grade_name');
        const priceEl = item.querySelector('.price, .num');
        if (nameEl) {
          const name = nameEl.textContent.trim().replace(/\s+/g, ' ');
          let price = 0;
          if (priceEl) {
            const priceMatch = priceEl.textContent.match(/(\d[\d,]+)/);
            if (priceMatch) price = parseInt(priceMatch[1].replace(/,/g, ''));
          }
          grades.push({ name, price });
        }
      });

      // Fallback: try radio buttons
      if (grades.length === 0) {
        const radios = document.querySelectorAll('input[type="radio"]');
        const seen = new Set();
        radios.forEach(radio => {
          const parent = radio.closest('li') || radio.closest('label') || radio.parentElement;
          if (!parent) return;
          const text = parent.textContent.trim();
          if (text.length > 200 || text.length < 2) return;
          const priceMatch = text.match(/(\d[\d,]+)\s*만\s*원/);
          const price = priceMatch ? parseInt(priceMatch[1].replace(/,/g, '')) * 10000 : 0;
          const name = text.replace(/\d[\d,]+\s*만\s*원/g, '').replace(/TOP\d+선택률:\s*\d+%/g, '').replace(/\s+/g, ' ').trim();
          if (name && name.length > 1 && name.length < 100 && !seen.has(name + price)) {
            seen.add(name + price);
            grades.push({ name, price });
          }
        });
      }

      return grades;
    });

    // Click first grade to load colors/options
    await page.evaluate(() => {
      const radio = document.querySelector('input[type="radio"]');
      if (radio) radio.click();
    });
    await delay(3000);

    // Extract colors
    const colorData = await page.evaluate(() => {
      const colors = [];
      const seen = new Set();

      // Method 1: color radio buttons with blind text
      document.querySelectorAll('input[type="radio"]').forEach(radio => {
        const parent = radio.closest('li') || radio.parentElement;
        if (!parent) return;
        const blindSpan = parent.querySelector('.blind');
        if (blindSpan) {
          const name = blindSpan.textContent.trim();
          if (name && name.length > 1 && name.length < 50 && !seen.has(name)) {
            seen.add(name);
            const style = radio.getAttribute('style') || parent.querySelector('[style*="background"]')?.getAttribute('style') || '';
            const hexMatch = style.match(/#([0-9a-fA-F]{3,6})/);
            colors.push({ name, hex: hexMatch ? '#' + hexMatch[1] : '' });
          }
        }
      });

      // Method 2: color attribute elements
      if (colors.length === 0) {
        document.querySelectorAll('[color^="C"]').forEach(el => {
          const blindSpan = el.querySelector('.blind');
          if (blindSpan) {
            const name = blindSpan.textContent.trim();
            if (name && !seen.has(name)) {
              seen.add(name);
              colors.push({ name, hex: '' });
            }
          }
        });
      }

      return colors;
    });

    // Extract options
    const optionData = await page.evaluate(() => {
      const options = [];
      document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        const id = cb.id || '';
        if (!id.startsWith('popupItem_')) return;
        const parent = cb.closest('li') || cb.closest('div') || cb.parentElement;
        const fullText = parent ? parent.textContent.trim() : '';
        const lines = fullText.split(/[\t\n]+/).map(s => s.trim()).filter(s => s.length > 0);
        let name = lines[0] || '';
        const priceMatch = fullText.match(/(\d[\d,]*)만\s*원/);
        const price = priceMatch ? parseInt(priceMatch[1].replace(/,/g, '')) * 10000 : 0;
        if (name && name.length > 1) {
          options.push({ name: name.substring(0, 80), price });
        }
      });
      return options;
    });

    // Get page title for car name
    const pageTitle = await page.title();
    let danawaName = '';
    const titleMatch = pageTitle.match(/^(.+?)\s*신차\s*견적/);
    if (titleMatch) danawaName = titleMatch[1].trim();
    else {
      const fallback = pageTitle.match(/^(.+?)\s*[-:|]\s*다나와/);
      if (fallback) danawaName = fallback[1].trim();
    }

    // Check image
    const imageUrl = await page.evaluate(() => {
      const img = document.querySelector('.car_img img, .thumb img, .photo img');
      return img ? img.src : '';
    });

    await page.close();
    return {
      name: danawaName,
      grades: gradeData,
      colors: colorData,
      options: optionData,
      imageFound: !!imageUrl,
      pageTitle
    };
  } catch (e) {
    try { await page.close(); } catch(_) {}
    return { error: e.message };
  }
}

async function main() {
  const carsPath = path.join(__dirname, '..', 'src', 'constants', 'generated-cars.json');
  const detailsPath = path.join(__dirname, '..', 'src', 'constants', 'generated-car-details.json');

  const carsData = JSON.parse(fs.readFileSync(carsPath, 'utf8'));
  const detailsData = JSON.parse(fs.readFileSync(detailsPath, 'utf8'));
  const brandMap = getBrandIdToName();

  // Build full car list with brand info
  const allCars = carsData.cars.map(car => {
    const brandId = car.brandId || '';
    const brandName = car.brandName || brandMap[brandId] || 'Unknown';
    const detail = detailsData[car.id] || {};
    return {
      id: car.id,
      brandId,
      brandName,
      name: car.name,
      imageUrl: car.imageUrl,
      startPrice: car.startPrice || 0,
      localGrades: car.grades || [],
      localGradeCount: car.gradeCount || (car.grades ? car.grades.length : 0),
      localTrims: detail.trims || [],
      localTrimsCount: detail.trims ? detail.trims.length : 0,
      localColors: detail.colorImages || [],
      localColorsCount: detail.colorImages ? detail.colorImages.length : 0,
      localOptions: detail.selectableOptions || [],
      localOptionsCount: detail.selectableOptions ? detail.selectableOptions.length : 0,
    };
  });

  // Filter by brand group
  let targetCars;
  if (BRAND_GROUP === 'all') {
    targetCars = allCars;
  } else {
    targetCars = allCars.filter(c => getBrandGroup(c.brandId) === BRAND_GROUP);
  }

  console.log(`\n=== 검증 대상: ${BRAND_GROUP} (${targetCars.length}대) ===\n`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const results = [];

  for (let i = 0; i < targetCars.length; i++) {
    const car = targetCars[i];
    process.stdout.write(`[${i+1}/${targetCars.length}] ${car.brandName} ${car.name} (${car.id}): `);

    const danawa = await scrapeDanawaData(browser, car.id, car.name);

    if (danawa.error) {
      console.log(`ERROR: ${danawa.error}`);
      results.push({ ...car, status: 'ERROR', error: danawa.error, danawa: null });
      continue;
    }

    // Compare
    const issues = [];
    const warnings = [];

    // Name check
    if (danawa.name && car.name !== danawa.name) {
      issues.push(`이름: "${car.name}" → 다나와: "${danawa.name}"`);
    }

    // Image check
    if (!car.imageUrl || car.imageUrl === 'NO_IMAGE') {
      issues.push('이미지 URL 없음');
    } else if (car.imageUrl.includes('lineup_360.png')) {
      warnings.push('기본 이미지(lineup_360.png) 사용');
    }

    // Grades/Trims comparison
    const danawaGradeCount = danawa.grades.length;
    const localTrimCount = car.localTrimsCount;
    if (danawaGradeCount > 0) {
      const diff = Math.abs(localTrimCount - danawaGradeCount);
      if (diff > 5) {
        issues.push(`트림: 로컬 ${localTrimCount}개, 다나와 ${danawaGradeCount}개 (차이: ${diff})`);
      } else if (diff > 0) {
        warnings.push(`트림: 로컬 ${localTrimCount}개, 다나와 ${danawaGradeCount}개 (차이: ${diff})`);
      }
    }

    // Colors comparison
    const danawaColorCount = danawa.colors.length;
    if (danawaColorCount > 0) {
      const diff = Math.abs(car.localColorsCount - danawaColorCount);
      if (diff > 3) {
        issues.push(`색상: 로컬 ${car.localColorsCount}개, 다나와 ${danawaColorCount}개 (차이: ${diff})`);
      } else if (diff > 0) {
        warnings.push(`색상: 로컬 ${car.localColorsCount}개, 다나와 ${danawaColorCount}개 (차이: ${diff})`);
      }
    } else if (car.localColorsCount === 0) {
      issues.push('색상 데이터 없음 (로컬 & 다나와 모두)');
    }

    // Options comparison
    const danawaOptCount = danawa.options.length;
    if (danawaOptCount > 0 || car.localOptionsCount > 0) {
      const diff = Math.abs(car.localOptionsCount - danawaOptCount);
      if (diff > 5) {
        issues.push(`옵션: 로컬 ${car.localOptionsCount}개, 다나와 ${danawaOptCount}개 (차이: ${diff})`);
      } else if (diff > 0) {
        warnings.push(`옵션: 로컬 ${car.localOptionsCount}개, 다나와 ${danawaOptCount}개 (차이: ${diff})`);
      }
    }

    // Price check (first grade)
    if (danawa.grades.length > 0 && car.startPrice > 0) {
      const danawaMinPrice = Math.min(...danawa.grades.filter(g => g.price > 0).map(g => g.price));
      if (danawaMinPrice > 0) {
        const priceDiff = Math.abs(car.startPrice - danawaMinPrice);
        if (priceDiff > 5000000) {
          issues.push(`시작가: 로컬 ${(car.startPrice/10000).toLocaleString()}만원, 다나와 ${(danawaMinPrice/10000).toLocaleString()}만원`);
        } else if (priceDiff > 1000000) {
          warnings.push(`시작가: 로컬 ${(car.startPrice/10000).toLocaleString()}만원, 다나와 ${(danawaMinPrice/10000).toLocaleString()}만원`);
        }
      }
    }

    // brandName missing check
    if (!targetCars[i].brandName || targetCars[i].brandName === 'Unknown') {
      issues.push('brandName 누락');
    }

    // grades array missing check
    if (car.localGrades.length === 0 && car.localTrimsCount > 0) {
      warnings.push('generated-cars.json에 grades 배열 누락 (details에는 trims 있음)');
    }

    let status;
    if (issues.length === 0 && warnings.length === 0) status = 'OK';
    else if (issues.length === 0) status = 'WARN';
    else status = 'FAIL';

    console.log(`${status} (issues:${issues.length}, warnings:${warnings.length})`);
    if (issues.length > 0) issues.forEach(i => console.log(`  ❌ ${i}`));
    if (warnings.length > 0) warnings.forEach(w => console.log(`  ⚠️ ${w}`));

    results.push({
      id: car.id,
      brandId: car.brandId,
      brandName: car.brandName,
      name: car.name,
      status,
      issues,
      warnings,
      local: {
        trims: car.localTrimsCount,
        colors: car.localColorsCount,
        options: car.localOptionsCount,
        startPrice: car.startPrice,
        hasGrades: car.localGrades.length > 0,
        hasBrandName: !!car.brandName && car.brandName !== 'Unknown'
      },
      danawa: {
        name: danawa.name,
        grades: danawaGradeCount,
        colors: danawaColorCount,
        options: danawaOptCount,
        gradeNames: danawa.grades.slice(0, 5).map(g => g.name.substring(0, 50)),
        colorNames: danawa.colors.slice(0, 5).map(c => c.name),
        optionNames: danawa.options.slice(0, 5).map(o => o.name.substring(0, 50))
      }
    });

    await delay(800);
  }

  await browser.close();

  // Save results
  const outPath = path.join(__dirname, `verify-${BRAND_GROUP}-results.json`);
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2), 'utf8');

  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log(`검증 결과 요약 (${BRAND_GROUP})`);
  console.log('='.repeat(80));

  const ok = results.filter(r => r.status === 'OK').length;
  const warn = results.filter(r => r.status === 'WARN').length;
  const fail = results.filter(r => r.status === 'FAIL').length;
  const err = results.filter(r => r.status === 'ERROR').length;

  console.log(`✅ 정상: ${ok}대`);
  console.log(`⚠️ 경고: ${warn}대`);
  console.log(`❌ 불일치: ${fail}대`);
  console.log(`💥 에러: ${err}대`);
  console.log(`총: ${results.length}대\n`);

  // Brand breakdown
  const byBrand = {};
  results.forEach(r => {
    if (!byBrand[r.brandName]) byBrand[r.brandName] = { ok: 0, warn: 0, fail: 0, err: 0, issues: [] };
    byBrand[r.brandName][r.status === 'OK' ? 'ok' : r.status === 'WARN' ? 'warn' : r.status === 'FAIL' ? 'fail' : 'err']++;
    if (r.issues && r.issues.length > 0) {
      byBrand[r.brandName].issues.push({ name: r.name, id: r.id, issues: r.issues });
    }
  });

  for (const [brand, data] of Object.entries(byBrand)) {
    console.log(`\n## ${brand}: ✅${data.ok} ⚠️${data.warn} ❌${data.fail} 💥${data.err}`);
    data.issues.forEach(car => {
      console.log(`  ${car.name} (${car.id}):`);
      car.issues.forEach(i => console.log(`    ❌ ${i}`));
    });
  }

  console.log(`\n결과 저장: ${outPath}`);
}

main().catch(e => { console.error(e); process.exit(1); });
