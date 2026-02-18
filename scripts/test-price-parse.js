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

  // Test BMW 5시리즈 (has 억 prices) and 벤츠 GLC (has suspiciously low prices)
  for (const carId of ['4517', '4373']) {
    console.log(`\n=== Car ${carId} ===`);
    await page.goto(`https://auto.danawa.com/newcar/?Work=estimate&Model=${carId}`, {
      waitUntil: 'networkidle2', timeout: 30000,
    });
    await delay(2000);

    const data = await page.evaluate(() => {
      const results = [];
      const radios = document.querySelectorAll('input[type="radio"][id^="trim_"]');
      radios.forEach(r => {
        const name = r.getAttribute('name') || '';
        if (!name.startsWith('eChkTrim')) return;
        const li = r.closest('li');
        if (!li) return;

        // Try different price extraction strategies
        const priceEl = li.querySelector('.price');
        const numEl = li.querySelector('.num');
        const emEl = li.querySelector('em');

        // Get full HTML of the li to inspect structure
        const html = li.innerHTML.substring(0, 500);
        const fullText = li.textContent.replace(/\s+/g, ' ').trim();

        // Try to find price pattern in full text
        const priceMatch = fullText.match(/(\d+억\s*)?[\d,]+만\s*원/g);

        results.push({
          fullText: fullText.substring(0, 200),
          priceElText: priceEl ? priceEl.textContent.trim() : null,
          numElText: numEl ? numEl.textContent.trim() : null,
          emElText: emEl ? emEl.textContent.trim() : null,
          priceMatches: priceMatch,
          htmlSnippet: html.substring(0, 300),
        });
      });
      return results;
    });

    data.slice(0, 8).forEach((d, i) => {
      console.log(`\n[${i}] fullText: ${d.fullText}`);
      console.log(`    priceEl: ${d.priceElText}`);
      console.log(`    numEl: ${d.numElText}`);
      console.log(`    emEl: ${d.emElText}`);
      console.log(`    priceMatches: ${JSON.stringify(d.priceMatches)}`);
      if (d.priceMatches) {
        d.priceMatches.forEach(pm => {
          console.log(`    -> parsePrice("${pm}") = ${parsePrice(pm).toLocaleString()} (${(parsePrice(pm)/10000).toLocaleString()}만)`);
        });
      }
    });
  }

  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
