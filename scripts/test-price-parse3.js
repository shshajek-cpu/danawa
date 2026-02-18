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

  // BMW 5시리즈 (has 억 prices) and 벤츠 GLC (has low prices)
  for (const carId of ['4517', '4373']) {
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
        const container = r.closest('div.choice') || r.closest('li') || r.parentElement;
        const text = container ? container.textContent.replace(/\s+/g, ' ').trim() : '';
        results.push({ id: r.id, text: text.substring(0, 200) });
      });
      return results;
    });

    console.log(`Trims: ${trimInfo.length}`);
    trimInfo.forEach((t, i) => {
      const priceMatch = t.text.match(/(\d+억\s*)?[\d,]+만\s*원/g);
      const priceStr = priceMatch ? priceMatch[priceMatch.length - 1] : 'NO PRICE';
      const parsed = priceMatch ? parsePrice(priceStr) : 0;
      const marker = parsed < 30000000 ? ' *** LOW' : '';
      console.log(`  [${i}] ${(parsed/10000).toLocaleString()}만 <- "${priceStr}"${marker}`);
      if (t.text.includes('억')) {
        console.log(`       FULL: ${t.text.substring(0, 120)}`);
      }
    });
  }

  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
