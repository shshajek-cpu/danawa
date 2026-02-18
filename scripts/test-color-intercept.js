const puppeteer = require('puppeteer');

async function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });

  const testCars = [
    { id: '4646', name: 'KGM 토레스' },
    { id: '4517', name: 'BMW 5시리즈' },
  ];

  for (const car of testCars) {
    console.log(`\n=== ${car.name} (${car.id}) ===`);

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Intercept color-related responses
    const colorResponses = [];
    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('trimsInfo') || url.includes('color') || url.includes('Color')) {
        try {
          const text = await response.text();
          colorResponses.push({
            url: url.substring(0, 200),
            status: response.status(),
            length: text.length,
            preview: text.substring(0, 500),
          });
        } catch(e) {}
      }
    });

    const url = `https://auto.danawa.com/newcar/?Work=estimate&Model=${car.id}`;
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await delay(2000);

    // Click first trim
    await page.evaluate(() => {
      const radio = document.querySelector('input[type="radio"]');
      if (radio) radio.click();
    });
    await delay(4000);

    console.log(`Intercepted ${colorResponses.length} color-related responses:`);
    colorResponses.forEach(r => {
      console.log(`  URL: ${r.url}`);
      console.log(`  Status: ${r.status}, Length: ${r.length}`);
      console.log(`  Preview: ${r.preview.substring(0, 300)}`);
      console.log('  ---');
    });

    // Also check what's in the page DOM after clicking
    const domColors = await page.evaluate(() => {
      // Find the color section in the page
      const colorSection = document.querySelector('#Optn_1, .estimate-option');
      if (!colorSection) return { found: false };

      // Get the full HTML
      return {
        found: true,
        html: colorSection.innerHTML.substring(0, 2000),
      };
    });

    if (domColors.found) {
      console.log('\nColor section HTML preview:');
      console.log(domColors.html.substring(0, 1000));
    }

    await page.close();
  }

  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
