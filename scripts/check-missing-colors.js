const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const vehicles = [
  { id: 4629, name: 'G-클래스', brand: '벤츠' },
  { id: 4566, name: 'The New AMG GT', brand: '벤츠' },
  { id: 4072, name: 'X4', brand: 'BMW' },
  { id: 4171, name: '8시리즈', brand: 'BMW' },
  { id: 3803, name: '2시리즈', brand: 'BMW' },
  { id: 4073, name: 'X4 M', brand: 'BMW' },
  { id: 4436, name: 'Q8 e-tron', brand: '아우디' },
  { id: 4119, name: '레인지로버', brand: '랜드로버' },
  { id: 4472, name: '레인지로버 벨라', brand: '랜드로버' },
  { id: 3825, name: 'Cybertruck', brand: '테슬라' }
];

async function checkColorUI(vehicle) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    const url = `https://auto.danawa.com/newcar/?Work=estimate&Model=${vehicle.id}`;
    console.log(`\n체킹 중: ${vehicle.brand} ${vehicle.name} (ID: ${vehicle.id})`);
    console.log(`URL: ${url}`);

    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait a bit for dynamic content
    await new Promise(resolve => setTimeout(resolve, 3000));

    const result = {
      id: vehicle.id,
      name: vehicle.name,
      brand: vehicle.brand,
      url: url,
      hasColorUI: false,
      colors: [],
      reason: null
    };

    // Check for actual color selection UI elements
    const colorUIInfo = await page.evaluate(() => {
      // Look for color-related sections
      const colorSelectors = [
        'div[class*="colorArea"]',
        'div[class*="color-area"]',
        'div[class*="ColorArea"]',
        'ul[class*="color"]',
        'div.option_area',
        '.spec_color',
        '.car_color',
        '#exteriorColor',
        '.exterior_color'
      ];

      let foundElements = [];
      let foundSelector = null;

      for (const selector of colorSelectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          // Filter out generic inputs
          const filtered = Array.from(elements).filter(el => {
            const className = el.className || '';
            return !className.includes('input_color_blue') &&
                   !className.includes('input_size');
          });

          if (filtered.length > 0) {
            foundElements = filtered;
            foundSelector = selector;
            break;
          }
        }
      }

      if (foundElements.length === 0) {
        return { found: false, selector: null, colors: [] };
      }

      // Extract color data
      const colors = [];
      foundElements.forEach((container, idx) => {
        // Look for color items within container
        const colorItems = container.querySelectorAll('li, div[data-color], button[data-color], a');

        if (colorItems.length > 0) {
          colorItems.forEach((item, i) => {
            const colorInfo = {
              containerIndex: idx,
              itemIndex: i,
              text: item.textContent?.trim() || '',
              dataColor: item.getAttribute('data-color') || '',
              title: item.getAttribute('title') || '',
              className: item.className || '',
              imageUrl: null,
              backgroundImage: null
            };

            // Try to find image
            const img = item.querySelector('img');
            if (img) {
              colorInfo.imageUrl = img.src || img.getAttribute('data-src');
            }

            // Check for background image
            const bgImage = window.getComputedStyle(item).backgroundImage;
            if (bgImage && bgImage !== 'none') {
              colorInfo.backgroundImage = bgImage;
            }

            colors.push(colorInfo);
          });
        } else {
          // Container itself might be the color element
          colors.push({
            containerIndex: idx,
            itemIndex: 0,
            text: container.textContent?.trim().substring(0, 100) || '',
            dataColor: container.getAttribute('data-color') || '',
            className: container.className || '',
            imageUrl: null
          });
        }
      });

      return {
        found: true,
        selector: foundSelector,
        elementCount: foundElements.length,
        colors: colors
      };
    });

    let colorElements = colorUIInfo.found ? colorUIInfo.elementCount : 0;
    let foundSelector = colorUIInfo.selector;

    if (!colorUIInfo.found || colorElements === 0) {
      // Try to find any element with "색상" text and extract surrounding HTML
      const colorTextInfo = await page.evaluate(() => {
        const walker = document.createTreeWalker(
          document.body,
          NodeFilter.SHOW_TEXT,
          null,
          false
        );

        const instances = [];
        while (walker.nextNode()) {
          const text = walker.currentNode.textContent.trim();
          if (text.includes('색상') || text.includes('컬러') || text.includes('Color')) {
            const parent = walker.currentNode.parentElement;
            if (parent) {
              instances.push({
                text: text.substring(0, 100),
                html: parent.outerHTML.substring(0, 500),
                tagName: parent.tagName,
                className: parent.className
              });
            }
          }
        }
        return instances;
      });

      if (colorTextInfo.length > 0) {
        console.log(`  ⚠ "색상" 텍스트는 발견되었으나 선택 UI 미확인 (${colorTextInfo.length}개 인스턴스)`);
        result.reason = '색상 텍스트는 있으나 선택 UI 미확인';
        result.colorTextInstances = colorTextInfo;
      } else {
        console.log(`  ✗ 색상 UI 없음`);
        result.reason = '다나와에서 미제공';
      }
    } else {
      result.hasColorUI = true;
      result.colors = colorUIInfo.colors;
      console.log(`  ✓ 색상 UI 발견: ${foundSelector} (${colorElements}개 컨테이너, ${colorUIInfo.colors.length}개 색상)`);
    }

    await browser.close();
    return result;

  } catch (error) {
    console.error(`  ✗ 오류 발생: ${error.message}`);
    await browser.close();

    return {
      id: vehicle.id,
      name: vehicle.name,
      brand: vehicle.brand,
      url: `https://auto.danawa.com/newcar/?Work=estimate&Model=${vehicle.id}`,
      hasColorUI: false,
      colors: [],
      reason: `오류: ${error.message}`
    };
  }
}

async function main() {
  console.log('='.repeat(80));
  console.log('다나와 색상 데이터 누락 차량 UI 확인');
  console.log('='.repeat(80));

  const results = [];

  for (const vehicle of vehicles) {
    const result = await checkColorUI(vehicle);
    results.push(result);

    // Add delay between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Save results to JSON
  const outputPath = path.join(__dirname, '..', 'color-ui-check-results.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`\n결과 저장됨: ${outputPath}`);

  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('요약');
  console.log('='.repeat(80));

  const withColorUI = results.filter(r => r.hasColorUI);
  const withoutColorUI = results.filter(r => !r.hasColorUI);

  console.log(`\n총 확인 차량: ${results.length}대`);
  console.log(`색상 UI 있음: ${withColorUI.length}대`);
  console.log(`색상 UI 없음: ${withoutColorUI.length}대`);

  if (withColorUI.length > 0) {
    console.log('\n[ 색상 UI 있는 차량 ]');
    withColorUI.forEach(r => {
      console.log(`  - ${r.brand} ${r.name} (ID: ${r.id}) - ${r.colors.length}개 색상`);
    });
  }

  if (withoutColorUI.length > 0) {
    console.log('\n[ 색상 UI 없는 차량 ]');
    withoutColorUI.forEach(r => {
      console.log(`  - ${r.brand} ${r.name} (ID: ${r.id}) - ${r.reason}`);
    });
  }

  console.log('\n' + '='.repeat(80));
}

main().catch(console.error);
