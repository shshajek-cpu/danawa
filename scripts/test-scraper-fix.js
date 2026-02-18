const puppeteer = require('puppeteer');
const delay = (ms) => new Promise(r => setTimeout(r, ms));

async function test() {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

  await page.goto('https://auto.danawa.com/newcar/?Work=estimate&Model=4435', { waitUntil: 'networkidle2', timeout: 30000 });
  await delay(2000);

  const ids = await page.evaluate(() => {
    const html = document.documentElement.innerHTML;
    const m = html.match(/getSpecPopup\(&(?:quot|#34);(?:price|spec)&(?:quot|#34);,\s*(\d+),\s*&(?:quot|#34);[^&]*&(?:quot|#34);,\s*(\d+),\s*(\d+)\)/);
    if (m) return { gradeId: m[1], trimId: m[2], modelId: m[3] };
    return null;
  });
  console.log('IDs:', ids);

  if (!ids) { await browser.close(); return; }

  const popupUrl = `https://auto.danawa.com/auto/modelPopup.php?Type=spec&Lineup=${ids.gradeId}&Trims=${ids.trimId}`;
  console.log('Popup:', popupUrl);

  const page2 = await browser.newPage();
  await page2.goto(popupUrl, { waitUntil: 'networkidle2', timeout: 30000 });
  await delay(1500);

  const specs = await page2.evaluate(() => {
    const fieldMap = {
      '엔진형식': 'engineType', '연료': 'fuelType', '배기량': 'displacement',
      '최고출력': 'maxPower', '최대토크': 'maxTorque', '굴림방식': 'driveType',
      '구동방식': 'driveType', '변속기': 'transmission', '전장': 'length',
      '전폭': 'width', '전고': 'height', '축거': 'wheelbase',
      '공차중량': 'curbWeight', '승차정원': 'seatingCapacity', '연료탱크': 'fuelTank',
      '서스펜션 (전)': 'frontSuspension', '서스펜션 (후)': 'rearSuspension',
      '브레이크 (전)': 'frontBrake', '브레이크 (후)': 'rearBrake',
      '타이어 (전)': 'frontTire', '타이어 (후)': 'rearTire',
      'CO₂ 배출': 'co2Emission', '복합연비': 'fuelEfficiency',
      '도심연비': 'cityEfficiency', '고속연비': 'highwayEfficiency'
    };
    const result = {};
    const rows = Array.from(document.querySelectorAll('tr'));
    rows.forEach(row => {
      const ths = Array.from(row.querySelectorAll('th'));
      const tds = Array.from(row.querySelectorAll('td'));
      ths.forEach((th, i) => {
        const label = th.innerText.trim();
        const value = tds[i] ? tds[i].innerText.trim() : '';
        const key = fieldMap[label];
        if (key && value && value !== '-') result[key] = value;
      });
    });
    return result;
  });

  console.log('Fields:', Object.keys(specs).length);
  console.log(JSON.stringify(specs, null, 2));

  await page2.close();
  await browser.close();
}
test().catch(console.error);
