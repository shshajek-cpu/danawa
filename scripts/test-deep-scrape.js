const puppeteer = require('puppeteer');

async function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });

  // Test with 코나 (4361) - known to have options
  const carId = '4361';
  const url = `https://auto.danawa.com/newcar/?Work=estimate&Model=${carId}`;

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  // Intercept ALL responses
  const ajaxResponses = [];
  page.on('response', async (response) => {
    const resUrl = response.url();
    if (resUrl.includes('ajax') || resUrl.includes('php') || resUrl.includes('api')) {
      try {
        const text = await response.text();
        ajaxResponses.push({
          url: resUrl.substring(0, 200),
          status: response.status(),
          bodyLen: text.length,
          bodyPreview: text.substring(0, 300),
        });
      } catch(e) {}
    }
  });

  console.log('Loading 코나 estimate page...');
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  await delay(2000);

  // Step 1: Analyze the page structure
  console.log('\n=== Step 1: Page Structure ===');
  const step1 = await page.evaluate(() => {
    const info = {};

    // Find all form sections
    const sections = document.querySelectorAll('.section, .step, [class*="step"], [class*="grade"], [class*="trim"]');
    info.sections = Array.from(sections).map(s => ({ tag: s.tagName, class: s.className, id: s.id })).slice(0, 10);

    // Find all clickable grade/trim elements
    const gradeItems = document.querySelectorAll('.grade_item, .grade-item, .model_grade li, .gradeList li, [class*="grade"] li, [class*="Grade"] li');
    info.gradeItems = Array.from(gradeItems).map(el => ({
      tag: el.tagName,
      class: el.className,
      text: el.textContent.trim().substring(0, 80),
      onclick: el.getAttribute('onclick'),
    })).slice(0, 10);

    // Find all radio/checkbox inputs
    const inputs = document.querySelectorAll('input[type="radio"], input[type="checkbox"]');
    info.inputs = Array.from(inputs).map(inp => ({
      type: inp.type,
      name: inp.name,
      value: inp.value,
      id: inp.id,
      checked: inp.checked,
      parentText: inp.parentElement ? inp.parentElement.textContent.trim().substring(0, 60) : '',
    })).slice(0, 20);

    // Find estimate steps
    const steps = document.querySelectorAll('.estimate_step, .estm_step, [class*="estm"]');
    info.estmSteps = Array.from(steps).map(s => ({ class: s.className, id: s.id, text: s.textContent.trim().substring(0, 100) })).slice(0, 5);

    // Check for JS functions
    info.hasSelectGrade = typeof window.selectGrade === 'function';
    info.hasSelectTrim = typeof window.selectTrim === 'function';
    info.hasEstmSelect = typeof window.estmSelect === 'function';
    info.hasFnGradeSelect = typeof window.fn_gradeSelect === 'function';
    info.hasFnEstimate = typeof window.fn_estimate === 'function';

    // Check global data
    if (typeof estmDataAuto !== 'undefined') {
      info.estmDataAutoLen = estmDataAuto.length;
    }
    if (typeof gradeInfo !== 'undefined') {
      info.gradeInfoLen = typeof gradeInfo === 'object' ? Object.keys(gradeInfo).length : 'not object';
    }

    return info;
  });
  console.log(JSON.stringify(step1, null, 2));

  // Step 2: Click grade and observe
  console.log('\n=== Step 2: Click First Radio and Wait ===');
  const clickResult = await page.evaluate(() => {
    const radios = document.querySelectorAll('input[type="radio"]');
    const radioInfo = [];
    radios.forEach((r, i) => {
      radioInfo.push({ i, name: r.name, value: r.value, label: r.parentElement ? r.parentElement.textContent.trim().substring(0, 60) : '' });
    });

    // Click each radio that looks like a grade
    const gradeRadios = Array.from(radios).filter(r => r.name.includes('grade') || r.name.includes('Grade') || r.name.includes('model'));
    if (gradeRadios.length > 0) {
      gradeRadios[0].click();
      return { method: 'grade radio', radios: radioInfo.slice(0, 15), clickedName: gradeRadios[0].name, clickedValue: gradeRadios[0].value };
    }

    if (radios.length > 0) {
      radios[0].click();
      return { method: 'first radio', radios: radioInfo.slice(0, 15), clickedName: radios[0].name, clickedValue: radios[0].value };
    }

    return { method: 'none', radios: radioInfo };
  });
  console.log(JSON.stringify(clickResult, null, 2));

  await delay(3000);

  // Step 3: Check ajax responses after click
  console.log('\n=== Step 3: AJAX Responses ===');
  ajaxResponses.forEach(r => {
    console.log(`URL: ${r.url}`);
    console.log(`Status: ${r.status} | Body length: ${r.bodyLen}`);
    console.log(`Preview: ${r.bodyPreview.substring(0, 200)}`);
    console.log('---');
  });

  // Step 4: After grade click, check for sub-trim / next step
  console.log('\n=== Step 4: After Grade Click - Look for Options ===');
  const step4 = await page.evaluate(() => {
    const info = {};

    // Re-check estmDataAuto
    if (typeof estmDataAuto !== 'undefined') {
      info.estmDataAutoLen = estmDataAuto.length;
      if (estmDataAuto.length > 0) {
        const first = estmDataAuto[0];
        info.firstKeys = Object.keys(first);
        if (first.addOpt) info.addOptLen = first.addOpt.length;
        if (first.colorOpt) info.colorOptLen = first.colorOpt.length;
        if (first.trimName) info.firstTrimName = first.trimName;
      }
    }

    // Check for newly visible option areas
    const optAreas = document.querySelectorAll('[class*="opt"], [class*="Opt"], [id*="opt"], [id*="Opt"]');
    info.optAreas = Array.from(optAreas).map(el => ({
      tag: el.tagName, class: el.className, id: el.id,
      visible: el.offsetParent !== null,
      textPreview: el.textContent.trim().substring(0, 100),
    })).filter(el => el.visible).slice(0, 10);

    // Check for any checkboxes that appeared
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    info.checkboxCount = checkboxes.length;
    info.checkboxes = Array.from(checkboxes).map(cb => ({
      name: cb.name, value: cb.value, id: cb.id,
      label: cb.parentElement ? cb.parentElement.textContent.trim().substring(0, 60) : '',
    })).slice(0, 10);

    // Look for select elements that may contain trim/submodel
    const selects = document.querySelectorAll('select');
    info.selects = Array.from(selects).map(s => ({
      name: s.name, id: s.id,
      options: Array.from(s.options).map(o => ({ value: o.value, text: o.text.substring(0, 60) })).slice(0, 5),
    })).slice(0, 5);

    return info;
  });
  console.log(JSON.stringify(step4, null, 2));

  // Step 5: Try calling JS functions directly
  console.log('\n=== Step 5: Try JS Functions ===');
  const step5 = await page.evaluate(() => {
    const info = {};

    // List all functions that could load options
    const fns = Object.keys(window).filter(k => {
      try { return typeof window[k] === 'function' && (k.toLowerCase().includes('opt') || k.toLowerCase().includes('estm') || k.toLowerCase().includes('grade') || k.toLowerCase().includes('trim')); }
      catch(e) { return false; }
    });
    info.relevantFunctions = fns.slice(0, 20);

    // Check jQuery presence
    info.hasJQuery = typeof jQuery !== 'undefined';

    // Look for data in script tags
    const scripts = document.querySelectorAll('script:not([src])');
    const dataScripts = [];
    scripts.forEach(s => {
      const t = s.textContent || '';
      if (t.includes('estmDataAuto') || t.includes('addOpt') || t.includes('gradeInfo')) {
        dataScripts.push(t.substring(0, 400));
      }
    });
    info.dataScripts = dataScripts.slice(0, 3);

    return info;
  });
  console.log(JSON.stringify(step5, null, 2));

  await browser.close();
  console.log('\nDone.');
}

main().catch(e => { console.error(e); process.exit(1); });
