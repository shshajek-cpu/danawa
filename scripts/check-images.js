const http = require('https');
const fs = require('fs');
const path = require('path');

const carsData = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src', 'constants', 'generated-cars.json'), 'utf8'));
const detailsData = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src', 'constants', 'generated-car-details.json'), 'utf8'));

function checkUrl(url) {
  return new Promise((resolve) => {
    if (!url || url === 'NO_IMAGE') { resolve({ status: 0, ok: false }); return; }
    const req = http.request(url, { method: 'HEAD', timeout: 10000 }, (res) => {
      resolve({ status: res.statusCode, ok: res.statusCode === 200 });
    });
    req.on('error', () => resolve({ status: 0, ok: false }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, ok: false }); });
    req.end();
  });
}

async function main() {
  const results = { ok: [], broken: [], lineup: [], noImage: [] };
  const total = carsData.cars.length;

  // Check car main images (batch of 10 concurrent)
  for (let i = 0; i < total; i += 10) {
    const batch = carsData.cars.slice(i, i + 10);
    const checks = await Promise.all(batch.map(async (car) => {
      const url = car.imageUrl;
      if (!url || url === 'NO_IMAGE') return { car, type: 'noImage' };
      if (url.includes('lineup_360.png')) return { car, type: 'lineup', url };

      const check = await checkUrl(url);
      return { car, type: check.ok ? 'ok' : 'broken', url, status: check.status };
    }));

    checks.forEach(r => {
      results[r.type].push({ id: r.car.id, name: r.car.name, url: r.url, status: r.status });
    });
    process.stdout.write(`\r이미지 체크: ${Math.min(i + 10, total)}/${total}`);
  }

  // Check detail colorImages (sample first color per car)
  console.log('\n\n색상 이미지 샘플 체크...');
  const colorResults = { ok: 0, broken: [], noColor: 0 };

  const detailEntries = Object.entries(detailsData);
  for (let i = 0; i < detailEntries.length; i += 10) {
    const batch = detailEntries.slice(i, i + 10);
    const checks = await Promise.all(batch.map(async ([id, detail]) => {
      if (!detail.colorImages || detail.colorImages.length === 0) return { id, type: 'noColor' };
      const firstColor = detail.colorImages[0];
      if (!firstColor.imageUrl) return { id, type: 'noColor' };
      const check = await checkUrl(firstColor.imageUrl);
      return { id, name: detail.name, type: check.ok ? 'ok' : 'broken', url: firstColor.imageUrl, status: check.status };
    }));

    checks.forEach(r => {
      if (r.type === 'ok') colorResults.ok++;
      else if (r.type === 'noColor') colorResults.noColor++;
      else colorResults.broken.push({ id: r.id, name: r.name, url: r.url, status: r.status });
    });
    process.stdout.write(`\r색상 이미지 체크: ${Math.min(i + 10, detailEntries.length)}/${detailEntries.length}`);
  }

  // Print report
  console.log('\n\n' + '='.repeat(60));
  console.log('이미지 URL 유효성 검사 결과');
  console.log('='.repeat(60));

  console.log(`\n메인 이미지:`);
  console.log(`  ✅ 정상: ${results.ok.length}대`);
  console.log(`  ❌ 깨진 URL: ${results.broken.length}대`);
  console.log(`  ⚠️ lineup 기본이미지: ${results.lineup.length}대`);
  console.log(`  🚫 이미지 없음: ${results.noImage.length}대`);

  if (results.broken.length > 0) {
    console.log('\n깨진 이미지 URL:');
    results.broken.forEach(r => console.log(`  ${r.id}: ${r.name} (HTTP ${r.status}) ${r.url}`));
  }

  console.log(`\n색상 이미지 (첫번째 색상 샘플):`);
  console.log(`  ✅ 정상: ${colorResults.ok}대`);
  console.log(`  ❌ 깨진 URL: ${colorResults.broken.length}대`);
  console.log(`  🚫 색상 없음: ${colorResults.noColor}대`);

  if (colorResults.broken.length > 0) {
    console.log('\n깨진 색상 이미지:');
    colorResults.broken.forEach(r => console.log(`  ${r.id}: ${r.name} (HTTP ${r.status}) ${r.url}`));
  }

  // Save
  const outPath = path.join(__dirname, 'image-check-results.json');
  fs.writeFileSync(outPath, JSON.stringify({ main: results, colors: colorResults }, null, 2));
  console.log(`\n결과 저장: ${outPath}`);
}

main().catch(console.error);
