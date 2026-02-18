const puppeteer = require('puppeteer');
async function explore() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  // Test with 싼타페 (4435) - a popular car with lots of data
  const carId = '4435';
  const url = `https://auto.danawa.com/newcar/?Work=estimate&Model=${carId}`;
  console.log('Opening:', url);
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));

  // 1. Get the FULL decoded estmDataAuto for first trim
  const decoded = await page.evaluate(() => {
    if (typeof estmDataAuto === 'undefined' || typeof dnw_decode === 'undefined') return 'NO DATA';
    const keys = Object.keys(estmDataAuto);
    const trimKey = keys.find(k => k.startsWith('T')) || keys[0];
    return dnw_decode(estmDataAuto[trimKey]);
  });
  console.log('\n=== FULL DECODED estmDataAuto ===');
  console.log(decoded);

  // 2. Check for spec detail page or section
  const specLinks = await page.evaluate(() => {
    // Look for links to spec/detail pages
    const links = Array.from(document.querySelectorAll('a'));
    const specLinks = links.filter(a => {
      const href = a.href || '';
      const text = a.innerText || '';
      return href.includes('spec') || href.includes('Spec') || href.includes('detail') ||
             text.includes('제원') || text.includes('상세') || text.includes('사양');
    });
    return specLinks.map(a => ({ href: a.href, text: a.innerText.trim().substring(0, 100) }));
  });
  console.log('\n=== Spec links on page ===');
  console.log(JSON.stringify(specLinks, null, 2));

  // 3. Try the newcar spec page directly
  const specUrl = `https://auto.danawa.com/newcar/?Work=spec&Model=${carId}`;
  console.log('\nTrying spec page:', specUrl);
  await page.goto(specUrl, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));

  // Get all text content from spec page
  const specPageContent = await page.evaluate(() => {
    const body = document.body.innerText;
    const lines = body.split('\n').filter(l => l.trim().length > 0);
    // Get lines that look like spec data
    return lines.filter(l => {
      const lower = l.toLowerCase();
      return lower.includes('전장') || lower.includes('전폭') || lower.includes('전고') ||
             lower.includes('축거') || lower.includes('중량') || lower.includes('공차') ||
             lower.includes('배기량') || lower.includes('최고출력') || lower.includes('최대토크') ||
             lower.includes('연비') || lower.includes('변속') || lower.includes('구동') ||
             lower.includes('타이어') || lower.includes('승차') || lower.includes('cc') ||
             lower.includes('mm') || lower.includes('kg') || lower.includes('ps') ||
             lower.includes('마력') || lower.includes('rpm') || lower.includes('nm');
    });
  });
  console.log('\n=== Spec page content ===');
  specPageContent.forEach(l => console.log('  ', l.trim()));

  // 4. Try to find spec table on the spec page
  const specTables = await page.evaluate(() => {
    const tables = document.querySelectorAll('table');
    const result = [];
    tables.forEach((t, i) => {
      const text = t.innerText;
      if (text.includes('전장') || text.includes('배기량') || text.includes('출력') || text.includes('연비')) {
        result.push({ index: i, text: text.substring(0, 3000) });
      }
    });
    // Also check for spec sections that aren't tables
    const specSections = document.querySelectorAll('.spec_area, .specArea, [class*="spec"], .detail_spec, .tbl_spec');
    specSections.forEach(s => {
      result.push({ class: s.className, text: s.innerText.substring(0, 3000) });
    });
    return result;
  });
  console.log('\n=== Spec tables/sections ===');
  console.log(JSON.stringify(specTables, null, 2));

  // 5. Dump the full HTML structure of the spec page for class analysis
  const pageStructure = await page.evaluate(() => {
    const allClasses = new Set();
    document.querySelectorAll('*').forEach(el => {
      if (el.className && typeof el.className === 'string') {
        el.className.split(' ').forEach(c => { if (c) allClasses.add(c); });
      }
    });
    return Array.from(allClasses).filter(c =>
      c.includes('spec') || c.includes('Spec') || c.includes('detail') || c.includes('Detail') ||
      c.includes('info') || c.includes('Info') || c.includes('dim') || c.includes('Dim')
    );
  });
  console.log('\n=== Spec-related CSS classes ===');
  console.log(pageStructure);

  await browser.close();
}
explore().catch(console.error);
