const puppeteer = require('puppeteer');
async function explore() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  const carId = '4435'; // 싼타페
  const url = `https://auto.danawa.com/newcar/?Work=estimate&Model=${carId}`;
  console.log('Opening:', url);
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));

  // 1. Try to decode the base64 data properly
  const decodedData = await page.evaluate(() => {
    if (typeof estmDataAuto === 'undefined' || typeof dnw_decode === 'undefined') {
      return 'NO DATA';
    }

    const keys = Object.keys(estmDataAuto);
    const trimKey = keys.find(k => k.startsWith('T')) || keys[0];

    try {
      // Get the decoded string
      const decoded = dnw_decode(estmDataAuto[trimKey]);

      // The decoded data should be a delimited string, let's see its structure
      return {
        length: decoded.length,
        first500: decoded.substring(0, 500),
        last500: decoded.substring(decoded.length - 500),
        hasDelimiters: {
          pipe: decoded.includes('|'),
          comma: decoded.includes(','),
          tab: decoded.includes('\t'),
          semicolon: decoded.includes(';'),
          tilde: decoded.includes('~'),
          caret: decoded.includes('^')
        }
      };
    } catch (e) {
      return 'ERROR: ' + e.message;
    }
  });

  console.log('\n=== Decoded Data Analysis ===');
  console.log(JSON.stringify(decodedData, null, 2));

  // 2. Try to understand the page structure by looking at trim selection
  const trimInfo = await page.evaluate(() => {
    // Find trim selector
    const trimSelectors = document.querySelectorAll('.selectbox_single, select[name*="trim"], select[name*="Trim"]');

    const result = {
      trimCount: 0,
      trims: []
    };

    trimSelectors.forEach(select => {
      const options = Array.from(select.querySelectorAll('option'));
      options.forEach(opt => {
        if (opt.value && opt.value !== '') {
          result.trims.push({
            value: opt.value,
            text: opt.innerText.trim()
          });
        }
      });
    });

    result.trimCount = result.trims.length;
    return result;
  });

  console.log('\n=== Available Trims ===');
  console.log(JSON.stringify(trimInfo, null, 2));

  // 3. Look for the actual spec display elements on the main page
  const mainPageSpecs = await page.evaluate(() => {
    const result = {
      visibleSpecs: [],
      allText: []
    };

    // Look for any visible spec information
    const specKeywords = [
      '전장', '전폭', '전고', '축거', '윤거',
      '배기량', '출력', '토크', '연비',
      '승차정원', '공차중량', '최저지상고',
      '타이어', '휠', '변속기', '구동'
    ];

    // Search all text nodes
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    const textNodes = [];
    let node;
    while (node = walker.nextNode()) {
      const text = node.textContent.trim();
      if (text.length > 0 && text.length < 200) {
        specKeywords.forEach(keyword => {
          if (text.includes(keyword)) {
            textNodes.push(text);
          }
        });
      }
    }

    result.allText = [...new Set(textNodes)].slice(0, 50); // First 50 unique matches

    return result;
  });

  console.log('\n=== Spec Text on Main Page ===');
  mainPageSpecs.allText.forEach(text => console.log('  ', text));

  // 4. Check what happens when we click the spec button
  const specButtonInfo = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('a, button'));
    const specButtons = buttons.filter(btn => {
      const text = btn.innerText || '';
      const href = btn.getAttribute('href') || '';
      return text.includes('제원') || text.includes('사양') ||
             href.includes('spec') || href.includes('Spec');
    });

    return specButtons.map(btn => ({
      tag: btn.tagName,
      text: btn.innerText.trim().substring(0, 100),
      href: btn.getAttribute('href'),
      onclick: btn.getAttribute('onclick'),
      class: btn.className
    }));
  });

  console.log('\n=== Spec-related Buttons ===');
  console.log(JSON.stringify(specButtonInfo, null, 2));

  // 5. Try the mobile spec API endpoint
  if (trimInfo.trims.length > 0) {
    const firstTrim = trimInfo.trims[0];
    const apiUrl = `https://auto.danawa.com/newcar/?Work=mobile_spec&Trim=${firstTrim.value}`;

    console.log('\n=== Trying Mobile Spec API ===');
    console.log('URL:', apiUrl);

    try {
      await page.goto(apiUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(r => setTimeout(r, 2000));

      const pageContent = await page.evaluate(() => {
        return {
          bodyText: document.body.innerText.substring(0, 5000),
          hasJson: document.body.innerText.includes('{') && document.body.innerText.includes('}'),
          contentType: document.contentType
        };
      });

      console.log('Mobile API Response:');
      console.log(pageContent.bodyText);
    } catch (e) {
      console.log('Mobile API Error:', e.message);
    }
  }

  await browser.close();
}
explore().catch(console.error);
