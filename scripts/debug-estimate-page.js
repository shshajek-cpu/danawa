const puppeteer = require('puppeteer');

async function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  // Test with BMW 5시리즈 (4517) and 벤츠 E-클래스 (4516)
  const testIds = ['4517', '4516'];

  for (const carId of testIds) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Analyzing car ID: ${carId}`);
    console.log(`${'='.repeat(60)}`);

    await page.goto(`https://auto.danawa.com/newcar/?Work=estimate&Model=${carId}`, {
      waitUntil: 'networkidle2', timeout: 30000,
    });
    await delay(2000);

    // 1. Extract all trim/grade radio buttons with prices
    const trimData = await page.evaluate(() => {
      const results = [];
      // Check for radio buttons (grades)
      const radios = document.querySelectorAll('input[type="radio"]');
      radios.forEach(r => {
        const parent = r.closest('li') || r.closest('tr') || r.parentElement;
        const label = parent ? parent.textContent.trim().replace(/\s+/g, ' ').substring(0, 200) : '';
        results.push({
          name: r.getAttribute('name'),
          value: r.getAttribute('value'),
          id: r.getAttribute('id'),
          dataAttrs: Object.fromEntries(
            Array.from(r.attributes)
              .filter(a => a.name.startsWith('data-'))
              .map(a => [a.name, a.value])
          ),
          parentText: label,
        });
      });
      return results;
    });

    console.log('\n--- Radio buttons (' + trimData.length + ') ---');
    trimData.forEach((t, i) => {
      console.log(`[${i}] name=${t.name} value=${t.value} id=${t.id}`);
      if (Object.keys(t.dataAttrs).length > 0) console.log('     data:', JSON.stringify(t.dataAttrs));
      console.log('     text:', t.parentText.substring(0, 150));
    });

    // 2. Look for lineup IDs in page source
    const html = await page.content();

    // Find lineInfo patterns
    const lineInfoMatch = html.match(/lineInfo\[(\d+)\]/g);
    if (lineInfoMatch) {
      const lineIds = [...new Set(lineInfoMatch.map(m => m.match(/\d+/)[0]))];
      console.log('\n--- Lineup IDs from lineInfo ---');
      console.log('Found:', lineIds.join(', '));
    }

    // Find image URL patterns
    const imgPatterns = html.match(/autoimg\.danawa\.com\/photo\/\d+\/\d+\/[^\s"']+/g);
    if (imgPatterns) {
      const unique = [...new Set(imgPatterns)].slice(0, 10);
      console.log('\n--- Image URL patterns ---');
      unique.forEach(u => console.log('  ' + u));
    }

    // 3. Find grade/trim structure
    const gradeInfo = await page.evaluate(() => {
      const results = [];
      // Look for grade list items
      const gradeItems = document.querySelectorAll('.grade_list li, .trim_list li, .car_grade li, [class*="grade"] li');
      gradeItems.forEach(item => {
        const radio = item.querySelector('input[type="radio"]');
        const nameEl = item.querySelector('.name, .tit, .grade_name, strong');
        const priceEl = item.querySelector('.price, .num, em');
        results.push({
          hasRadio: !!radio,
          radioValue: radio ? radio.value : null,
          name: nameEl ? nameEl.textContent.trim() : null,
          price: priceEl ? priceEl.textContent.trim() : null,
          fullText: item.textContent.trim().replace(/\s+/g, ' ').substring(0, 200),
          className: item.className,
        });
      });
      return results;
    });

    console.log('\n--- Grade list items (' + gradeInfo.length + ') ---');
    gradeInfo.forEach((g, i) => {
      console.log(`[${i}] radio=${g.radioValue} name=${g.name} price=${g.price}`);
      console.log('     class:', g.className);
      console.log('     text:', g.fullText.substring(0, 150));
    });

    // 4. Extract data from JavaScript variables
    const jsData = await page.evaluate(() => {
      const results = {};
      // Try to find global variables with car data
      if (typeof lineInfo !== 'undefined') results.lineInfo = 'exists';
      if (typeof gradeInfo !== 'undefined') results.gradeInfo = 'exists';
      if (typeof trimInfo !== 'undefined') results.trimInfo = 'exists';

      // Check for estimateGradeList or similar
      const scripts = document.querySelectorAll('script');
      let found = '';
      scripts.forEach(s => {
        const text = s.textContent;
        if (text.includes('estimateGradeList') || text.includes('lineInfo') || text.includes('lineup')) {
          // Extract a snippet
          const idx = text.indexOf('lineInfo');
          if (idx >= 0) {
            found += text.substring(idx, idx + 500) + '\n---\n';
          }
          const idx2 = text.indexOf('estimateGradeList');
          if (idx2 >= 0) {
            found += text.substring(idx2, idx2 + 500) + '\n---\n';
          }
        }
      });
      results.snippets = found.substring(0, 3000);
      return results;
    });

    console.log('\n--- JS Data ---');
    console.log(JSON.stringify(jsData, null, 2).substring(0, 2000));

    // 5. Click first trim and check what changes
    await page.evaluate(() => {
      const radio = document.querySelector('input[type="radio"]');
      if (radio) radio.click();
    });
    await delay(3000);

    // Check for lineup/color data after clicking
    const afterClick = await page.evaluate(() => {
      const results = {};
      // Look for color section
      const colorItems = document.querySelectorAll('.choice-color__item, [class*="color"] button');
      results.colorCount = colorItems.length;

      if (colorItems.length > 0) {
        const first = colorItems[0];
        results.firstColorAttrs = Object.fromEntries(
          Array.from(first.attributes).map(a => [a.name, a.value])
        );
      }

      // Check current URL or any data attributes with lineup
      const activeGrade = document.querySelector('input[type="radio"]:checked');
      if (activeGrade) {
        results.activeGrade = {
          value: activeGrade.value,
          attrs: Object.fromEntries(
            Array.from(activeGrade.attributes)
              .filter(a => a.name.startsWith('data-') || a.name === 'value' || a.name === 'id')
              .map(a => [a.name, a.value])
          ),
        };
      }

      return results;
    });

    console.log('\n--- After clicking first trim ---');
    console.log(JSON.stringify(afterClick, null, 2));
  }

  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
