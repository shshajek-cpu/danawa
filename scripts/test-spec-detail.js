const puppeteer = require('puppeteer');
const delay = (ms) => new Promise(r => setTimeout(r, ms));

async function test() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

  // Test with 싼타페 (4435)
  const url = 'https://auto.danawa.com/newcar/?Work=estimate&Model=4435';
  console.log('Opening:', url);
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  await delay(2000);

  // Try to find getSpecPopup calls and Lineup/Trim IDs
  const ids = await page.evaluate(() => {
    const html = document.documentElement.innerHTML;
    const result = {};

    // Look for getSpecPopup
    const matches = html.match(/getSpecPopup\s*\([^)]+\)/g);
    if (matches) result.specPopup = matches.slice(0, 3);

    // Look for Lineup= pattern
    const matches3 = html.match(/Lineup=\d+/g);
    if (matches3) result.lineups = [...new Set(matches3)].slice(0, 5);

    // Look for Trims= pattern
    const matches4 = html.match(/Trims=\d+/g);
    if (matches4) result.trims = [...new Set(matches4)].slice(0, 5);

    // Check estmDataAuto keys
    if (typeof estmDataAuto !== 'undefined') {
      result.estmKeys = Object.keys(estmDataAuto).slice(0, 10);
    }

    return result;
  });

  console.log('IDs found:', JSON.stringify(ids, null, 2));

  // If we found lineup/trim IDs, try the popup
  if (ids.lineups && ids.trims) {
    const lineupId = ids.lineups[0].replace('Lineup=', '');
    const trimId = ids.trims[0].replace('Trims=', '');
    const popupUrl = `https://auto.danawa.com/auto/modelPopup.php?Type=spec&Lineup=${lineupId}&Trims=${trimId}`;
    console.log('\nTrying popup:', popupUrl);
    await page.goto(popupUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await delay(2000);

    const specData = await page.evaluate(() => {
      const result = {};
      const fieldMap = {
        '엔진형식': 'engineType', '배기량': 'displacement', '최고출력': 'maxPower',
        '최대토크': 'maxTorque', '구동방식': 'driveType', '변속기': 'transmission',
        '전장': 'length', '전폭': 'width', '전고': 'height', '축거': 'wheelbase',
        '공차중량': 'curbWeight', '승차정원': 'seatingCapacity', '연료탱크': 'fuelTank',
        '전륜 서스펜션': 'frontSuspension', '후륜 서스펜션': 'rearSuspension',
        '전륜 브레이크': 'frontBrake', '후륜 브레이크': 'rearBrake',
        '전륜 타이어': 'frontTire', '후륜 타이어': 'rearTire',
        'CO₂ 배출량': 'co2Emission', 'CO2 배출량': 'co2Emission',
        '복합연비': 'fuelEfficiency', '도심연비': 'cityEfficiency', '고속도로연비': 'highwayEfficiency'
      };

      const rows = Array.from(document.querySelectorAll('table tr, tr'));
      rows.forEach(row => {
        const cells = Array.from(row.querySelectorAll('th, td'));
        for (let i = 0; i < cells.length - 1; i++) {
          const label = cells[i].innerText.trim();
          const value = cells[i + 1].innerText.trim();
          const jsonKey = fieldMap[label];
          if (jsonKey && value && value !== '-' && value !== 'N/A') {
            result[jsonKey] = value;
          }
        }
      });

      // Also dump all visible text containing spec-like content
      const allText = document.body.innerText;
      const specLines = allText.split('\n').filter(l => {
        return l.match(/전장|전폭|전고|축거|중량|배기량|출력|토크|변속|구동|서스|브레이크|타이어|연료탱크|승차|CO/);
      });
      result._rawLines = specLines.slice(0, 30);

      return result;
    });

    console.log('\nSpec data from popup:');
    console.log(JSON.stringify(specData, null, 2));
  }

  // Also try the direct spec page
  console.log('\n--- Trying direct spec page ---');
  const specUrl = 'https://auto.danawa.com/newcar/?Work=spec&Model=4435';
  await page.goto(specUrl, { waitUntil: 'networkidle2', timeout: 30000 });
  await delay(2000);

  const directSpecData = await page.evaluate(() => {
    const result = {};
    const fieldMap = {
      '엔진형식': 'engineType', '배기량': 'displacement', '최고출력': 'maxPower',
      '최대토크': 'maxTorque', '구동방식': 'driveType', '변속기': 'transmission',
      '전장': 'length', '전폭': 'width', '전고': 'height', '축거': 'wheelbase',
      '공차중량': 'curbWeight', '승차정원': 'seatingCapacity', '연료탱크': 'fuelTank',
      '전륜 서스펜션': 'frontSuspension', '후륜 서스펜션': 'rearSuspension',
      '전륜 브레이크': 'frontBrake', '후륜 브레이크': 'rearBrake',
      '전륜 타이어': 'frontTire', '후륜 타이어': 'rearTire',
      'CO₂ 배출량': 'co2Emission', 'CO2 배출량': 'co2Emission',
      '복합연비': 'fuelEfficiency', '도심연비': 'cityEfficiency', '고속도로연비': 'highwayEfficiency'
    };

    const rows = Array.from(document.querySelectorAll('table tr, tr'));
    rows.forEach(row => {
      const cells = Array.from(row.querySelectorAll('th, td'));
      for (let i = 0; i < cells.length - 1; i++) {
        const label = cells[i].innerText.trim();
        const value = cells[i + 1].innerText.trim();
        const jsonKey = fieldMap[label];
        if (jsonKey && value && value !== '-' && value !== 'N/A') {
          result[jsonKey] = value;
        }
      }
    });

    // Dump spec-related text
    const allText = document.body.innerText;
    const specLines = allText.split('\n').filter(l => {
      return l.match(/전장|전폭|전고|축거|중량|배기량|출력|토크|변속|구동|서스|브레이크|타이어|연료탱크|승차|CO/);
    });
    result._rawLines = specLines.slice(0, 30);

    return result;
  });

  console.log('Direct spec page data:');
  console.log(JSON.stringify(directSpecData, null, 2));

  await browser.close();
}
test().catch(console.error);
