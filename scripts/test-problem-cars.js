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

  // Problem cars: prices still wrong or got worse
  for (const carId of ['4649', '4495', '4461', '3982', '3992', '4471']) {
    console.log(`\n=== Car ${carId} ===`);
    await page.goto(`https://auto.danawa.com/newcar/?Work=estimate&Model=${carId}`, {
      waitUntil: 'networkidle2', timeout: 30000,
    });
    await delay(2000);

    const trimInfo = await page.evaluate(() => {
      const results = [];
      const radios = document.querySelectorAll('input[type="radio"]');
      radios.forEach(r => {
        if (!r.name || !r.name.startsWith('eChkTrim')) return;
        const container = r.closest('div.choice') || r.parentElement;
        const text = container ? container.textContent.replace(/\s+/g, ' ').trim() : '';
        results.push({ id: r.id, text: text.substring(0, 250) });
      });
      return results;
    });

    console.log(`Trims: ${trimInfo.length}`);
    trimInfo.slice(0, 6).forEach((t, i) => {
      const allMatches = t.text.match(/(\d+억\s*)?[\d,]+만\s*원/g) || [];
      console.log(`  [${i}] text: "${t.text}"`);
      console.log(`       matches: ${JSON.stringify(allMatches)}`);
      allMatches.forEach((m, j) => {
        console.log(`       [${j}] "${m}" = ${(parsePrice(m)/10000).toLocaleString()}만`);
      });
    });
  }

  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
