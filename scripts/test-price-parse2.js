const puppeteer = require('puppeteer');

async function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function parsePrice(text) {
  text = text.replace(/,/g, '').replace(/\s+/g, '');
  let total = 0;
  const eokMatch = text.match(/(\d+)억/);
  const manMatch = text.match(/(\d+)만/);
  if (eokMatch) total += parseInt(eokMatch[1]) * 100000000;
  if (manMatch) total += parseInt(manMatch[1]) * 10000;
  return total;
}

async function main() {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

  const carId = '4517';
  console.log(`=== Car ${carId} ===`);
  await page.goto(`https://auto.danawa.com/newcar/?Work=estimate&Model=${carId}`, {
    waitUntil: 'networkidle2', timeout: 30000,
  });
  await delay(2000);

  // First, just count all radio buttons and their attributes
  const allRadios = await page.evaluate(() => {
    const radios = document.querySelectorAll('input[type="radio"]');
    return Array.from(radios).slice(0, 5).map(r => ({
      id: r.id,
      name: r.name,
      tag: r.tagName,
      closestLi: r.closest('li') ? 'yes' : 'no',
      parentTag: r.parentElement ? r.parentElement.tagName : 'none',
      parentClass: r.parentElement ? r.parentElement.className.substring(0, 50) : '',
    }));
  });
  console.log('All radios sample:', JSON.stringify(allRadios, null, 2));

  // Get all trim radio buttons and their surrounding HTML
  const trimInfo = await page.evaluate(() => {
    const radios = document.querySelectorAll('input[type="radio"]');
    const results = [];
    radios.forEach(r => {
      if (!r.name || !r.name.startsWith('eChkTrim')) return;
      const li = r.closest('li');
      // Get the raw text and HTML
      const container = li || r.closest('tr') || r.closest('div') || r.parentElement;
      results.push({
        id: r.id,
        containerTag: container ? container.tagName : 'none',
        containerClass: container ? container.className.substring(0, 80) : '',
        text: container ? container.textContent.replace(/\s+/g, ' ').trim().substring(0, 200) : '',
        html: container ? container.innerHTML.substring(0, 400) : '',
      });
    });
    return results;
  });

  console.log(`\nTrim radios found: ${trimInfo.length}`);
  trimInfo.slice(0, 5).forEach((t, i) => {
    console.log(`\n[${i}] id=${t.id} container=${t.containerTag}.${t.containerClass}`);
    console.log(`  text: ${t.text}`);
    // Find price pattern
    const priceMatch = t.text.match(/(\d+억\s*)?[\d,]+만\s*원/g);
    if (priceMatch) {
      priceMatch.forEach(pm => {
        console.log(`  price: "${pm}" -> ${(parsePrice(pm)/10000).toLocaleString()}만원`);
      });
    }
  });

  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
