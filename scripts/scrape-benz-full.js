const puppeteer = require('puppeteer');

async function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  // Danawa new car page for Mercedes-Benz (brand=349)
  const url = 'https://auto.danawa.com/auto/?Work=brand&Brand=349';
  console.log('Loading Danawa Mercedes-Benz page...');
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  await delay(2000);

  // Get all current (new) car models
  const models = await page.evaluate(() => {
    const results = [];
    const seen = new Set();

    // Find all model links - new cars typically in a "신차" section
    const links = document.querySelectorAll('a[href*="Model="]');
    links.forEach(a => {
      const match = a.href.match(/Model=(\d+)/);
      const text = a.textContent.trim();
      if (match && text.length > 1 && text.length < 50 && !seen.has(match[1])) {
        // Check if this is in the new car (신차) section, not discontinued
        const parent = a.closest('.model_list, .car_info, .model_info, li, tr, .item');
        const section = a.closest('[class*="new"], [class*="sale"], section, .tab_cont');
        seen.add(match[1]);
        results.push({
          modelId: match[1],
          name: text,
          parentClass: parent ? parent.className : '',
          sectionText: section ? section.className : '',
        });
      }
    });

    return results;
  });

  // Get page text to understand structure
  const pageInfo = await page.evaluate(() => {
    // Find section headers
    const headers = [];
    document.querySelectorAll('h2, h3, h4, .tab_item, .tab_btn, .category_name').forEach(el => {
      headers.push(el.textContent.trim().substring(0, 50));
    });

    // Find "판매중" or "신차" sections
    const saleSection = document.querySelector('.sale, .new, [class*="sale"], [class*="new_car"]');

    return {
      headers: headers.slice(0, 20),
      hasSaleSection: !!saleSection,
      pageTitle: document.title,
    };
  });

  console.log('Page title:', pageInfo.pageTitle);
  console.log('Section headers:', pageInfo.headers.slice(0, 10));

  console.log('\n=== All Mercedes Models on Danawa ===');
  models.forEach(m => console.log(`  ${m.modelId}: ${m.name}`));
  console.log(`\nTotal: ${models.length} models found`);

  // Now check which ones are "new" (currently on sale) by visiting the newcar estimate page
  console.log('\n=== Checking which models are currently on sale ===');
  const url2 = 'https://auto.danawa.com/newcar/?Work=record&Tab=Model&Brand=349';
  await page.goto(url2, { waitUntil: 'networkidle2', timeout: 30000 });
  await delay(2000);

  const newModels = await page.evaluate(() => {
    const results = [];
    const seen = new Set();
    const links = document.querySelectorAll('a[href*="Model="]');
    links.forEach(a => {
      const match = a.href.match(/Model=(\d+)/);
      const text = a.textContent.trim();
      if (match && text.length > 1 && text.length < 50 && !seen.has(match[1])) {
        seen.add(match[1]);
        results.push({ modelId: match[1], name: text });
      }
    });
    return results;
  });

  console.log('\n=== New Car Models (신차) ===');
  newModels.forEach(m => console.log(`  ${m.modelId}: ${m.name}`));
  console.log(`\nTotal new: ${newModels.length} models`);

  // Check which are missing from our data
  const ourIds = new Set(['4037', '4430', '4381']);
  const missing = newModels.filter(m => !ourIds.has(m.modelId));
  console.log('\n=== Missing from our data ===');
  missing.forEach(m => console.log(`  ${m.modelId}: ${m.name}`));

  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
