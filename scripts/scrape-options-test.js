const puppeteer = require('puppeteer');

async function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function testScrape() {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  // Test with BMW i7 (4181)
  const carId = '4181';
  const url = `https://auto.danawa.com/newcar/?Work=estimate&Model=${carId}`;
  console.log('Loading:', url);

  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  await delay(2000);

  console.log('Page title:', await page.title());

  // Step 1: Find and click first grade/trim
  const gradeClicked = await page.evaluate(() => {
    // Look for grade selection elements
    const gradeEls = document.querySelectorAll('.grade_item, .gradeList li, [data-grade], .grade-item, input[name*="grade"], .model_grade li');
    const results = [];
    gradeEls.forEach(el => {
      results.push({ tag: el.tagName, class: el.className, text: el.textContent.trim().substring(0, 50) });
    });

    // Try clicking first grade
    if (gradeEls.length > 0) {
      gradeEls[0].click();
      return { clicked: true, count: gradeEls.length, results };
    }

    // Also try radio buttons or links in grade area
    const radios = document.querySelectorAll('input[type="radio"]');
    if (radios.length > 0) {
      radios[0].click();
      return { clicked: true, method: 'radio', count: radios.length };
    }

    return { clicked: false, count: 0, results };
  });

  console.log('\nGrade click result:', JSON.stringify(gradeClicked, null, 2));
  await delay(2000);

  // Step 2: Dump the full page structure around options area
  const pageStructure = await page.evaluate(() => {
    const info = {};

    // Check estmDataAuto again after grade selection
    if (typeof estmDataAuto !== 'undefined') {
      info.estmDataAutoLength = estmDataAuto.length;
      if (estmDataAuto.length > 0) {
        info.estmDataSample = estmDataAuto.slice(0, 3);
      }
    }

    // Check for other global variables
    const globals = ['optionData', 'optionList', 'addOptList', 'estmOption', 'carOption'];
    globals.forEach(g => {
      if (typeof window[g] !== 'undefined') {
        info[g] = 'found';
      }
    });

    // Find the estimate option section
    const optSection = document.querySelector('.estimate-option, #estimateOption, .option_area, .opt_area');
    if (optSection) {
      info.optSectionHTML = optSection.innerHTML.substring(0, 500);
    }

    // Look for any visible option-like UI
    const allElements = document.querySelectorAll('*');
    const optionTexts = [];
    allElements.forEach(el => {
      const text = el.textContent.trim();
      if (el.children.length === 0 && text.length > 5 && text.length < 50) {
        if (text.includes('패키지') || text.includes('옵션') || text.includes('선루프') || text.includes('네비')) {
          optionTexts.push(text);
        }
      }
    });
    info.optionTexts = [...new Set(optionTexts)].slice(0, 20);

    // Check network-loaded data
    const scripts = document.querySelectorAll('script:not([src])');
    const relevantScripts = [];
    scripts.forEach(s => {
      const t = s.textContent || '';
      if (t.includes('addOpt') || t.includes('option') || t.includes('estmData')) {
        relevantScripts.push(t.substring(0, 200));
      }
    });
    info.relevantScripts = relevantScripts.slice(0, 3);

    return info;
  });

  console.log('\nPage structure after grade click:');
  console.log(JSON.stringify(pageStructure, null, 2));

  // Step 3: Try intercepting XHR/fetch requests
  console.log('\n--- Trying to intercept data by reloading with request interception ---');

  const page2 = await browser.newPage();
  await page2.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

  const interceptedUrls = [];
  page2.on('response', async (response) => {
    const url = response.url();
    if (url.includes('option') || url.includes('estm') || url.includes('estimate') || url.includes('ajax')) {
      const contentType = response.headers()['content-type'] || '';
      interceptedUrls.push({ url: url.substring(0, 150), status: response.status(), type: contentType });
      if (contentType.includes('json') || contentType.includes('javascript')) {
        try {
          const text = await response.text();
          if (text.length < 2000) {
            console.log('  Response data:', text.substring(0, 300));
          } else {
            console.log('  Response data (truncated):', text.substring(0, 500));
          }
        } catch(e) {}
      }
    }
  });

  await page2.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  await delay(3000);

  console.log('\nIntercepted URLs:');
  interceptedUrls.forEach(u => console.log('  -', u.url, '|', u.status, '|', u.type));

  await browser.close();
  console.log('\nDone.');
}

testScrape().catch(e => { console.error(e); process.exit(1); });
