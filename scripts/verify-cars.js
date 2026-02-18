const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function verifyCarOnDanawa(browser, carId, carName, localData) {
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  const url = `https://auto.danawa.com/newcar/?Work=estimate&Model=${carId}`;

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await delay(2000);

    // Extract all data from the page
    const danawaData = await page.evaluate(() => {
      const data = {
        name: '',
        trims: [],
        colors: [],
        options: [],
        pageTitle: document.title,
      };

      // Extract car name from page title (format: "Car Name 신차 견적내기 : 다나와 자동차")
      const titleMatch = document.title.match(/^(.+?)\s*신차\s*견적/);
      if (titleMatch) {
        data.name = titleMatch[1].trim();
      } else {
        // Fallback to generic pattern
        const fallbackMatch = document.title.match(/^(.+?)\s*[-:|]\s*다나와/);
        if (fallbackMatch) data.name = fallbackMatch[1].trim();
      }

      // Get all grade/trim radios
      const gradeRadios = document.querySelectorAll('input[type="radio"]');
      gradeRadios.forEach(radio => {
        const label = radio.parentElement ? radio.parentElement.textContent.trim() : '';
        if (label && label.length > 0 && label.length < 200) {
          // Extract trim name and price
          const priceMatch = label.match(/(\d[\d,]+)\s*만\s*원/);
          const price = priceMatch ? parseInt(priceMatch[1].replace(/,/g, '')) * 10000 : 0;
          const name = label.replace(/\d[\d,]+\s*만\s*원/, '').trim();
          if (name) {
            data.trims.push({ name, price });
          }
        }
      });

      return data;
    });

    // Click first trim to load colors and options
    await page.evaluate(() => {
      const radios = document.querySelectorAll('input[type="radio"]');
      if (radios.length > 0) radios[0].click();
    });
    await delay(3000);

    // Get colors and options after trim selection
    const additionalData = await page.evaluate(() => {
      const data = { colors: [], options: [] };

      // Get color options
      const colorRadios = document.querySelectorAll('input[type="radio"][name*="color"], input[type="radio"][id*="color"]');
      colorRadios.forEach(radio => {
        const label = radio.parentElement ? radio.parentElement.textContent.trim() : '';
        if (label) {
          const colorName = label.replace(/\d[\d,]+\s*만\s*원/, '').trim();
          if (colorName && colorName.length > 0 && colorName.length < 100) {
            data.colors.push(colorName);
          }
        }
      });

      // Get selectable options
      const optionCheckboxes = document.querySelectorAll('input[type="checkbox"]');
      optionCheckboxes.forEach(cb => {
        const id = cb.id || '';
        // Only popupItem are real car options
        if (!id.startsWith('popupItem_')) return;

        const parent = cb.closest('li') || cb.closest('div') || cb.parentElement;
        const fullText = parent ? parent.textContent.trim() : '';

        const lines = fullText.split(/[\t\n]+/).map(s => s.trim()).filter(s => s.length > 0);
        let name = lines[0] || '';

        const priceMatch = fullText.match(/(\d[\d,]*)만\s*원/);
        const price = priceMatch ? parseInt(priceMatch[1].replace(/,/g, '')) * 10000 : 0;

        if (name) {
          data.options.push({ name, price });
        }
      });

      return data;
    });

    danawaData.colors = additionalData.colors;
    danawaData.options = additionalData.options;

    await page.close();
    return danawaData;
  } catch (e) {
    await page.close();
    console.error(`  Error verifying ${carName} (${carId}): ${e.message}`);
    return null;
  }
}

function compareData(local, danawa, carId, carName) {
  const issues = [];
  const warnings = [];

  // Compare car name
  if (danawa.name && local.name !== danawa.name) {
    issues.push(`이름 불일치: 로컬="${local.name}", 다나와="${danawa.name}"`);
  }

  // Check image URL
  if (!local.imageUrl || local.imageUrl === 'NO_IMAGE') {
    issues.push(`이미지 URL 없음`);
  } else if (local.imageUrl.includes('lineup_360.png')) {
    warnings.push(`기본 이미지 사용 (lineup_360.png)`);
  }

  // Compare trims count (allow some tolerance)
  if (danawa.trims.length > 0) {
    const diff = Math.abs(local.trimsCount - danawa.trims.length);
    if (diff > 0) {
      if (diff > 5) {
        issues.push(`트림 개수 큰 차이: 로컬=${local.trimsCount}, 다나와=${danawa.trims.length}`);
      } else {
        warnings.push(`트림 개수 차이: 로컬=${local.trimsCount}, 다나와=${danawa.trims.length}`);
      }
    }
  }

  // Compare colors count
  if (danawa.colors.length > 0 && local.colorsCount !== danawa.colors.length) {
    const diff = Math.abs(local.colorsCount - danawa.colors.length);
    if (diff > 3) {
      issues.push(`색상 개수 차이: 로컬=${local.colorsCount}, 다나와=${danawa.colors.length}`);
    } else {
      warnings.push(`색상 개수 약간 차이: 로컬=${local.colorsCount}, 다나와=${danawa.colors.length}`);
    }
  }

  // Compare options count
  if (danawa.options.length > 0 && local.optionsCount !== danawa.options.length) {
    const diff = Math.abs(local.optionsCount - danawa.options.length);
    if (diff > 5) {
      issues.push(`옵션 개수 차이: 로컬=${local.optionsCount}, 다나와=${danawa.options.length}`);
    } else {
      warnings.push(`옵션 개수 약간 차이: 로컬=${local.optionsCount}, 다나와=${danawa.options.length}`);
    }
  }

  let status;
  if (issues.length === 0 && warnings.length === 0) {
    status = '✅ 정상';
  } else if (issues.length === 0) {
    status = '⚠️ 경고';
  } else {
    status = '❌ 불일치';
  }

  return {
    carId,
    carName,
    status,
    issues,
    warnings,
    danawaData: danawa,
  };
}

async function main() {
  const detailsPath = path.join(__dirname, '..', 'src', 'constants', 'generated-car-details.json');
  const carsPath = path.join(__dirname, '..', 'src', 'constants', 'generated-cars.json');
  const details = JSON.parse(fs.readFileSync(detailsPath, 'utf8'));
  const cars = JSON.parse(fs.readFileSync(carsPath, 'utf8'));

  const targetCars = [
    // Genesis
    { id: '4660', brand: '제네시스' },
    { id: '4603', brand: '제네시스' },
    { id: '4016', brand: '제네시스' },
    { id: '4701', brand: '제네시스' },
    { id: '4761', brand: '제네시스' },
    { id: '4609', brand: '제네시스' },
    { id: '4465', brand: '제네시스' },
    { id: '3995', brand: '제네시스' },
    { id: '4705', brand: '제네시스' },
    // KGM
    { id: '4545', brand: 'KGM' },
    { id: '4518', brand: 'KGM' },
    { id: '4666', brand: 'KGM' },
    { id: '4766', brand: 'KGM' },
    { id: '4622', brand: 'KGM' },
    { id: '4492', brand: 'KGM' },
    { id: '4646', brand: 'KGM' },
    // 르노코리아
    { id: '4659', brand: '르노코리아' },
    { id: '4772', brand: '르노코리아' },
    { id: '4560', brand: '르노코리아' },
    { id: '4632', brand: '르노코리아' },
    // 쉐보레
    { id: '4474', brand: '쉐보레' },
    { id: '4429', brand: '쉐보레' },
    { id: '4395', brand: '쉐보레' },
  ];

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const results = {};

  for (let i = 0; i < targetCars.length; i++) {
    const { id, brand } = targetCars[i];
    const car = cars.cars.find(c => c.id === id);
    const detail = details[id];

    if (!car || !detail) {
      console.log(`[${i + 1}/${targetCars.length}] ${brand} ${id}: ❌ 로컬 데이터 없음`);
      continue;
    }

    const localData = {
      name: car.name,
      imageUrl: car.imageUrl,
      trimsCount: detail.trims?.length || 0,
      colorsCount: detail.colorImages?.length || 0,
      optionsCount: detail.selectableOptions?.length || 0,
    };

    process.stdout.write(`[${i + 1}/${targetCars.length}] ${brand} ${car.name} (${id}): `);

    const danawaData = await verifyCarOnDanawa(browser, id, car.name, localData);

    if (!danawaData) {
      console.log('❌ 다나와 접속 실패');
      results[id] = { status: '❌ 다나와 접속 실패', brand, name: car.name };
      continue;
    }

    const comparison = compareData(localData, danawaData, id, car.name);
    results[id] = { ...comparison, brand };

    console.log(comparison.status);
    if (comparison.issues.length > 0) {
      comparison.issues.forEach(issue => console.log(`  ❌ ${issue}`));
    }
    if (comparison.warnings && comparison.warnings.length > 0) {
      comparison.warnings.forEach(warn => console.log(`  ⚠️ ${warn}`));
    }

    await delay(1000); // Be respectful to the server
  }

  await browser.close();

  // Generate report
  console.log('\n' + '='.repeat(80));
  console.log('검증 결과 요약');
  console.log('='.repeat(80));

  const byBrand = {};
  for (const [id, result] of Object.entries(results)) {
    if (!byBrand[result.brand]) byBrand[result.brand] = [];
    byBrand[result.brand].push(result);
  }

  for (const [brand, cars] of Object.entries(byBrand)) {
    console.log(`\n## ${brand} (${cars.length}대)`);
    cars.forEach(car => {
      console.log(`\n### ${car.carName} (ID: ${car.carId})`);
      console.log(`- 상태: ${car.status}`);
      if (car.issues && car.issues.length > 0) {
        console.log(`- 문제:`);
        car.issues.forEach(issue => console.log(`  ❌ ${issue}`));
      }
      if (car.warnings && car.warnings.length > 0) {
        console.log(`- 경고:`);
        car.warnings.forEach(warn => console.log(`  ⚠️ ${warn}`));
      }
    });
  }

  // Save detailed results to file
  const outputPath = path.join(__dirname, 'verification-results.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf8');
  console.log(`\n상세 결과가 ${outputPath}에 저장되었습니다.`);
}

main().catch(e => { console.error(e); process.exit(1); });
