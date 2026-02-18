const puppeteer = require('puppeteer');
const details = require('../src/constants/generated-car-details.json');
const subModels = require('../src/constants/sub-models.json');

async function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function checkCarFuelTypes(browser, carId, carName) {
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  const url = `https://auto.danawa.com/newcar/?Work=estimate&Model=${carId}`;

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await delay(2000);

    // Extract fuel type tabs
    const fuelTabs = await page.evaluate(() => {
      const tabs = [];

      // Check for fuel type tab buttons
      const tabButtons = document.querySelectorAll('.tab_btn, .fuel_type_tab, .engine_tab, [class*="fuel"], [class*="engine"]');
      tabButtons.forEach(btn => {
        const text = btn.textContent.trim();
        if (text && (text.includes('가솔린') || text.includes('디젤') || text.includes('하이브리드') || text.includes('전기') || text.includes('2.0') || text.includes('2.5') || text.includes('3.3') || text.includes('3.5'))) {
          tabs.push(text);
        }
      });

      // Also check for radio buttons or select options for engine/fuel type
      const radios = document.querySelectorAll('input[type="radio"]');
      radios.forEach(radio => {
        const label = radio.nextElementSibling || radio.parentElement;
        if (label) {
          const text = label.textContent.trim();
          if (text && (text.includes('가솔린') || text.includes('디젤') || text.includes('2.0') || text.includes('2.5') || text.includes('3.3') || text.includes('3.5'))) {
            tabs.push(text);
          }
        }
      });

      return [...new Set(tabs)]; // Remove duplicates
    });

    // Extract all trims for first fuel type
    const trims = await page.evaluate(() => {
      const trimElements = document.querySelectorAll('[class*="grade"], [class*="trim"], input[type="radio"][name*="grade"]');
      const trimList = [];

      trimElements.forEach(el => {
        let text = '';
        if (el.tagName === 'INPUT') {
          const label = el.nextElementSibling || el.parentElement;
          text = label ? label.textContent.trim() : '';
        } else {
          text = el.textContent.trim();
        }

        if (text && text.length > 0) {
          // Extract price if available
          const priceMatch = text.match(/(\d{1,3}(?:,\d{3})*)\s*만원/);
          const price = priceMatch ? priceMatch[1] : null;

          trimList.push({ text, price });
        }
      });

      return trimList;
    });

    await page.close();
    return { fuelTabs, trims };
  } catch (e) {
    await page.close();
    console.error(`  Error: ${e.message.substring(0, 100)}`);
    return { fuelTabs: [], trims: [] };
  }
}

async function main() {
  const genesisCars = [
    { id: '3995', name: '더 뉴 G70 FL' },
    { id: '4016', name: 'G90' },
    { id: '4465', name: 'GV80 FL' },
    { id: '4603', name: 'G80 FL' },
    { id: '4609', name: 'GV70 FL' },
    { id: '4660', name: 'G80 EV FL' },
    { id: '4701', name: 'GV60 FL' },
    { id: '4705', name: 'Electrified GV70' },
    { id: '4761', name: 'GV60 MAGMA' }
  ];

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });

  console.log('='.repeat(80));
  console.log('GENESIS 차량 유종별 트림/가격/옵션 검증');
  console.log('='.repeat(80));

  for (const car of genesisCars) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`${car.name} (carId: ${car.id}) [우리 데이터: ${details[car.id]?.fuelType}]`);
    console.log('='.repeat(80));

    // Show sub-models from our data
    if (subModels[car.id]) {
      console.log('\n[우리 sub-models.json 데이터]:');
      subModels[car.id].subModels.forEach(sm => {
        console.log(`  - ${sm.name} (${sm.fuelType})`);
      });
    }

    // Show our trims
    console.log('\n[우리 generated-car-details.json 트림]:');
    if (details[car.id]?.trims) {
      details[car.id].trims.forEach(t => {
        console.log(`  - ${t.name}: ${(t.price / 10000).toFixed(0)}만원`);
      });
      console.log(`  총 ${details[car.id].trims.length}개 트림`);
    }

    // Show our options count
    console.log('\n[우리 옵션 수]:');
    console.log(`  ${details[car.id]?.selectableOptions?.length || 0}개 옵션`);

    // Fetch Danawa data
    console.log('\n[다나와 웹사이트 확인 중...]');
    const result = await checkCarFuelTypes(browser, car.id, car.name);

    console.log('\n[다나와 유종/엔진 탭]:');
    if (result.fuelTabs.length > 0) {
      result.fuelTabs.forEach(tab => console.log(`  - ${tab}`));
    } else {
      console.log('  (탭 감지 안됨 - 단일 유종일 가능성)');
    }

    console.log('\n[다나와 트림 샘플 (최대 10개)]:');
    if (result.trims.length > 0) {
      result.trims.slice(0, 10).forEach(t => {
        console.log(`  - ${t.text}${t.price ? ' (' + t.price + '만원)' : ''}`);
      });
      if (result.trims.length > 10) {
        console.log(`  ... 외 ${result.trims.length - 10}개`);
      }
    } else {
      console.log('  (트림 감지 안됨)');
    }

    // Analysis
    console.log('\n[분석]:');
    const ourFuelType = details[car.id]?.fuelType;
    const subModelFuelTypes = subModels[car.id]?.subModels.map(sm => sm.fuelType) || [];
    const uniqueSubFuels = [...new Set(subModelFuelTypes)];

    if (uniqueSubFuels.length > 1) {
      console.log(`  ⚠️  복수 유종: sub-models.json에 ${uniqueSubFuels.join(', ')} 존재`);
      console.log(`  ⚠️  하지만 generated-car-details.json은 단일 유종(${ourFuelType})만 표시`);
      console.log(`  ⚠️  문제: 유종별로 트림/가격/옵션이 다를 수 있음`);
    } else {
      console.log(`  ✓ 단일 유종: ${ourFuelType}`);
    }

    await delay(1000);
  }

  await browser.close();

  console.log('\n' + '='.repeat(80));
  console.log('검증 완료');
  console.log('='.repeat(80));
}

main().catch(e => { console.error(e); process.exit(1); });
