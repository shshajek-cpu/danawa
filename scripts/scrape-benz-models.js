const puppeteer = require('puppeteer');

async function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  // Danawa brand page for Mercedes-Benz (brandCode=303)
  const url = 'https://auto.danawa.com/newcar/?Work=record&Tab=Model&Brand=303&key=&Is498=0';
  console.log('Loading Danawa Mercedes page...');
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  await delay(2000);

  // Extract all car models
  const models = await page.evaluate(() => {
    const results = [];
    // Try different selectors for car list
    const items = document.querySelectorAll('.model_list li, .modelList li, .model-item, .car_info, .info_box');
    items.forEach(item => {
      const nameEl = item.querySelector('.name, .tit, h3, h4, a');
      const priceEl = item.querySelector('.price, .prc');
      const linkEl = item.querySelector('a[href*="Model="]');

      let modelId = '';
      if (linkEl) {
        const match = linkEl.href.match(/Model=(\d+)/);
        if (match) modelId = match[1];
      }

      results.push({
        name: nameEl ? nameEl.textContent.trim() : '',
        price: priceEl ? priceEl.textContent.trim() : '',
        modelId,
        html: item.innerHTML.substring(0, 200),
      });
    });

    // Also check for any links with Model= parameter
    const allLinks = document.querySelectorAll('a[href*="Model="]');
    const linkModels = [];
    allLinks.forEach(a => {
      const match = a.href.match(/Model=(\d+)/);
      const text = a.textContent.trim();
      if (match && text.length > 1 && text.length < 50) {
        linkModels.push({ name: text, modelId: match[1], href: a.href.substring(0, 150) });
      }
    });

    return { items: results.slice(0, 30), linkModels: linkModels.slice(0, 50) };
  });

  console.log('\n=== Model Items ===');
  models.items.forEach(m => console.log(`  ${m.modelId}: ${m.name} ${m.price}`));

  console.log('\n=== Link Models ===');
  // Deduplicate by modelId
  const seen = new Set();
  models.linkModels.forEach(m => {
    if (!seen.has(m.modelId)) {
      seen.add(m.modelId);
      console.log(`  ${m.modelId}: ${m.name}`);
    }
  });

  // Also try the estimate page approach
  console.log('\n=== Trying brand car list page ===');
  const url2 = 'https://auto.danawa.com/auto/?Work=brand&Brand=303';
  await page.goto(url2, { waitUntil: 'networkidle2', timeout: 30000 });
  await delay(2000);

  const brandCars = await page.evaluate(() => {
    const cars = [];
    const links = document.querySelectorAll('a[href*="Model="]');
    const seen = new Set();
    links.forEach(a => {
      const match = a.href.match(/Model=(\d+)/);
      const text = a.textContent.trim();
      if (match && text.length > 1 && text.length < 50 && !seen.has(match[1])) {
        seen.add(match[1]);
        cars.push({ modelId: match[1], name: text });
      }
    });
    return cars;
  });

  console.log('Brand page models:');
  brandCars.forEach(c => console.log(`  ${c.modelId}: ${c.name}`));

  await browser.close();
  console.log('\nDone.');
}

main().catch(e => { console.error(e); process.exit(1); });
