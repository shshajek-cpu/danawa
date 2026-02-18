const puppeteer = require('puppeteer');

async function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  // Test with BMW 5 Series (4517) - a new car we added
  const testCars = [
    { id: '4517', name: 'BMW 5시리즈' },
    { id: '4516', name: '벤츠 E-클래스' },
    { id: '4646', name: 'KGM 토레스' },  // domestic - should have colors
  ];

  for (const car of testCars) {
    console.log(`\n=== Testing ${car.name} (${car.id}) ===`);
    const url = `https://auto.danawa.com/newcar/?Work=estimate&Model=${car.id}`;
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await delay(2000);

    // Get first trim ID
    const trimId = await page.evaluate(() => {
      const radio = document.querySelector('input[type="radio"][id^="trim_"]');
      return radio ? radio.id.replace('trim_', '') : '';
    });
    console.log('First trim ID:', trimId);

    if (!trimId) continue;

    // Click the first trim
    await page.evaluate(() => {
      const radio = document.querySelector('input[type="radio"]');
      if (radio) radio.click();
    });
    await delay(3000);

    // Fetch color HTML directly
    const colorHtml = await page.evaluate(async (tid) => {
      try {
        const resp = await fetch(`/service/ajax_trimsInfo.php?type=estimateTrimsColorHtml&trimsNo=${tid}`);
        return await resp.text();
      } catch(e) { return 'ERROR: ' + e.message; }
    }, trimId);

    console.log('Color HTML length:', colorHtml.length);
    console.log('Color HTML preview:', colorHtml.substring(0, 1000));

    // Now parse inside the page context where DOMParser is available
    const colors = await page.evaluate((html) => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const results = [];

      // Look for all label elements
      const labels = doc.querySelectorAll('label');
      labels.forEach(l => {
        results.push({
          title: l.getAttribute('title') || '',
          for: l.getAttribute('for') || '',
          class: l.className,
          innerHTML: l.innerHTML.substring(0, 200),
        });
      });

      // Also look for input elements
      const inputs = doc.querySelectorAll('input');
      const inputInfo = [];
      inputs.forEach(inp => {
        inputInfo.push({
          type: inp.type,
          name: inp.name,
          value: inp.value,
          id: inp.id,
          'data-no': inp.getAttribute('data-no'),
          'data-photo': inp.getAttribute('data-photo'),
        });
      });

      // Look for color chip elements
      const chips = doc.querySelectorAll('[style*="background"], span[class*="color"], i[class*="color"]');
      const chipInfo = [];
      chips.forEach(c => {
        chipInfo.push({
          tag: c.tagName,
          style: c.getAttribute('style') || '',
          class: c.className,
        });
      });

      return { labels: results, inputs: inputInfo.slice(0, 10), chips: chipInfo.slice(0, 10) };
    }, colorHtml);

    console.log('\nLabels:', JSON.stringify(colors.labels.slice(0, 3), null, 2));
    console.log('\nInputs:', JSON.stringify(colors.inputs.slice(0, 3), null, 2));
    console.log('\nChips:', JSON.stringify(colors.chips.slice(0, 3), null, 2));
    console.log(`Total labels: ${colors.labels.length}, inputs: ${colors.inputs.length}, chips: ${colors.chips.length}`);
  }

  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
