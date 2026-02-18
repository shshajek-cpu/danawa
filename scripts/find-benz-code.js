const puppeteer = require('puppeteer');

async function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  // Go to Danawa auto main page to find all brand codes
  const url = 'https://auto.danawa.com/auto/';
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  await delay(2000);

  const brands = await page.evaluate(() => {
    const results = [];
    // Find all brand links
    const links = document.querySelectorAll('a[href*="Brand="]');
    const seen = new Set();
    links.forEach(a => {
      const match = a.href.match(/Brand=(\d+)/);
      const text = a.textContent.trim();
      if (match && text.length > 0 && text.length < 30 && !seen.has(match[1])) {
        seen.add(match[1]);
        results.push({ code: match[1], name: text });
      }
    });
    return results;
  });

  console.log('=== All Danawa Brand Codes ===');
  brands.forEach(b => console.log(`  ${b.code}: ${b.name}`));

  // Find Mercedes specifically
  const benz = brands.filter(b => b.name.includes('벤츠') || b.name.includes('Benz') || b.name.includes('메르세데스'));
  console.log('\n=== Mercedes matches ===');
  benz.forEach(b => console.log(`  ${b.code}: ${b.name}`));

  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
