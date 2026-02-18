const puppeteer = require('puppeteer');

async function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  // Test with BMW 5시리즈
  await page.goto('https://auto.danawa.com/newcar/?Work=estimate&Model=4517', { waitUntil: 'networkidle2', timeout: 30000 });
  await delay(2000);

  // Click first trim
  await page.evaluate(() => {
    const radio = document.querySelector('input[type="radio"]');
    if (radio) radio.click();
  });
  await delay(5000);

  // Get full page HTML and search for color-related content
  const fullHtml = await page.content();

  // Find the color section
  const colorStartIdx = fullHtml.indexOf('estimateExteriorColorList');
  if (colorStartIdx >= 0) {
    console.log('=== Color section found at index', colorStartIdx, '===');
    console.log(fullHtml.substring(colorStartIdx - 50, colorStartIdx + 2000));
  } else {
    console.log('estimateExteriorColorList NOT FOUND in page HTML');

    // Try other patterns
    const patterns = ['외장색상', 'color_list', 'colorList', 'colorchip', 'choice-color'];
    for (const p of patterns) {
      const idx = fullHtml.indexOf(p);
      if (idx >= 0) {
        console.log(`\n=== Pattern "${p}" found at index ${idx} ===`);
        console.log(fullHtml.substring(idx - 100, idx + 500));
        break;
      }
    }
  }

  // Also dump a list of all title attributes in the page
  const titles = await page.evaluate(() => {
    const results = [];
    document.querySelectorAll('[title]').forEach(el => {
      const t = el.getAttribute('title');
      if (t && t.length > 1 && t.length < 50) {
        results.push({ title: t, tag: el.tagName, class: el.className.substring(0, 50) });
      }
    });
    return results;
  });

  console.log('\n=== All title attributes ===');
  titles.forEach(t => console.log(`  [${t.tag}] ${t.title} (${t.class})`));

  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
