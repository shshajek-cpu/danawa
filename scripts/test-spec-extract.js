const puppeteer = require('puppeteer');

async function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function testSpecExtract() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  // Test with 싼타페 (4435)
  const carId = '4435';
  const url = `https://auto.danawa.com/newcar/?Work=estimate&Model=${carId}`;
  console.log(`Opening: ${url}`);

  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  await delay(2000);

  // Method 1: Check what JS objects are available after page renders
  const jsData = await page.evaluate(() => {
    const result = {};

    // Check for common global variables
    if (typeof estimateData !== 'undefined') result.estimateData = 'exists';
    if (typeof estmDataAuto !== 'undefined') {
      result.estmDataAutoKeys = Object.keys(estmDataAuto);
    }
    if (typeof modelData !== 'undefined') result.modelData = JSON.stringify(modelData).substring(0, 500);
    if (typeof trimData !== 'undefined') result.trimData = 'exists';
    if (typeof gradeData !== 'undefined') result.gradeData = 'exists';

    // Check for decoded spec objects
    if (typeof specData !== 'undefined') result.specData = JSON.stringify(specData).substring(0, 500);
    if (typeof vehicleSpec !== 'undefined') result.vehicleSpec = 'exists';

    // Look for any variable containing "spec" in global scope
    const specVars = [];
    for (const key of Object.keys(window)) {
      if (key.toLowerCase().includes('spec') || key.toLowerCase().includes('estm') || key.toLowerCase().includes('grade') || key.toLowerCase().includes('trim')) {
        try {
          const val = window[key];
          if (val && typeof val === 'object') {
            specVars.push({ name: key, type: typeof val, keys: Object.keys(val).slice(0, 5) });
          } else if (val && typeof val === 'string') {
            specVars.push({ name: key, type: 'string', length: val.length });
          }
        } catch(e) {}
      }
    }
    result.specVars = specVars;

    return result;
  });

  console.log('\n=== JS Objects on page ===');
  console.log(JSON.stringify(jsData, null, 2));

  // Method 2: Try to use page's own decode function
  const decodedTrimData = await page.evaluate(() => {
    // The page likely has a decode function. Try to find it.
    const result = {};

    // Try to access decoded data through the page's own functions
    if (typeof estmDataAuto !== 'undefined') {
      const firstKey = Object.keys(estmDataAuto)[0];

      // Try calling the page's decode function if it exists
      if (typeof fnEstmDecode !== 'undefined') {
        try {
          result.decoded = JSON.stringify(fnEstmDecode(estmDataAuto[firstKey])).substring(0, 2000);
        } catch(e) { result.decodeError = e.message; }
      }

      if (typeof decodeEstmData !== 'undefined') {
        try {
          result.decoded2 = JSON.stringify(decodeEstmData(estmDataAuto[firstKey])).substring(0, 2000);
        } catch(e) { result.decodeError2 = e.message; }
      }
    }

    // Look for ALL functions on window that might decode data
    const decodeFns = [];
    for (const key of Object.keys(window)) {
      if (typeof window[key] === 'function' && (key.includes('decode') || key.includes('Decode') || key.includes('estm') || key.includes('Estm') || key.includes('parse') || key.includes('Parse'))) {
        decodeFns.push(key);
      }
    }
    result.decodeFunctions = decodeFns;

    return result;
  });

  console.log('\n=== Decode functions ===');
  console.log(JSON.stringify(decodedTrimData, null, 2));

  // Method 3: Click on a grade row and check what renders
  const clickResult = await page.evaluate(() => {
    // Find grade/trim rows - they're typically in a table
    const rows = document.querySelectorAll('.grade_list tr, .tbl_grade tr, .list_grade li, [class*="grade"] tr, [class*="trim"] tr, table tr');
    return { rowCount: rows.length, rowClasses: Array.from(rows).slice(0, 5).map(r => r.className) };
  });

  console.log('\n=== Grade rows ===');
  console.log(JSON.stringify(clickResult, null, 2));

  // Method 4: Click on first grade row and see what expands
  await page.evaluate(() => {
    const rows = document.querySelectorAll('table tr');
    for (const row of rows) {
      if (row.querySelector('td') && row.textContent.includes('만원')) {
        row.click();
        break;
      }
    }
  });

  await delay(2000);

  // Check for any new content that appeared
  const afterClick = await page.evaluate(() => {
    // Look for any detail/spec section that appeared
    const details = document.querySelectorAll('.detail_area, .spec_area, .opt_detail, .grade_detail, [class*="detail"], [class*="spec"]');
    const result = [];
    details.forEach(el => {
      if (el.innerText.trim().length > 0) {
        result.push({
          class: el.className,
          text: el.innerText.substring(0, 500)
        });
      }
    });

    // Also check for tables with spec-like content
    const tables = document.querySelectorAll('table');
    const specTables = [];
    tables.forEach(t => {
      const text = t.innerText;
      if (text.includes('배기량') || text.includes('연비') || text.includes('마력') || text.includes('출력') || text.includes('토크')) {
        specTables.push(text.substring(0, 500));
      }
    });

    return { details: result, specTables };
  });

  console.log('\n=== After click - details/specs ===');
  console.log(JSON.stringify(afterClick, null, 2));

  // Method 5: Just dump ALL text on the page that looks spec-related
  const specText = await page.evaluate(() => {
    const body = document.body.innerText;
    const lines = body.split('\n').filter(l => {
      const lower = l.trim().toLowerCase();
      return lower.includes('배기량') || lower.includes('연비') || lower.includes('마력') ||
             lower.includes('출력') || lower.includes('토크') || lower.includes('변속') ||
             lower.includes('구동') || lower.includes('전장') || lower.includes('전폭') ||
             lower.includes('전고') || lower.includes('축거') || lower.includes('중량') ||
             lower.includes('승차') || lower.includes('cc') || lower.includes('ps') ||
             lower.includes('km/l') || lower.includes('연료');
    });
    return lines;
  });

  console.log('\n=== Spec-related text on page ===');
  specText.forEach(l => console.log('  ', l.trim()));

  await browser.close();
}

testSpecExtract().catch(console.error);
