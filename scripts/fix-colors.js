const fs = require('fs');
const path = require('path');

const detailsPath = path.join(__dirname, '../src/constants/generated-car-details.json');
const carsPath = path.join(__dirname, '../src/constants/generated-cars.json');

const details = JSON.parse(fs.readFileSync(detailsPath, 'utf8'));
const cars = JSON.parse(fs.readFileSync(carsPath, 'utf8'));

console.log('========================================');
console.log('  색상 데이터 수정 스크립트');
console.log('========================================\n');

// ============================================
// STEP 1: Build hex -> name mapping from all existing named colors
// ============================================
console.log('--- STEP 1: hex -> name 매핑 구축 ---');
const hexToNames = {};
let totalNamedColors = 0;

for (const [id, d] of Object.entries(details)) {
  if (d.colorImages) {
    d.colorImages.forEach(ci => {
      if (ci.hex && ci.name && ci.name.trim() !== '' && !ci.name.startsWith('color_')) {
        const hex = ci.hex.toLowerCase();
        if (!hexToNames[hex]) {
          hexToNames[hex] = [];
        }
        if (!hexToNames[hex].includes(ci.name)) {
          hexToNames[hex].push(ci.name);
        }
        totalNamedColors++;
      }
    });
  }
}

console.log('  고유 hex 코드: ' + Object.keys(hexToNames).length + '개');
console.log('  이름 있는 색상 총: ' + totalNamedColors + '개\n');

// Helper: calculate color distance between two hex strings
function hexDistance(hex1, hex2) {
  const r1 = parseInt(hex1.slice(1, 3), 16);
  const g1 = parseInt(hex1.slice(3, 5), 16);
  const b1 = parseInt(hex1.slice(5, 7), 16);
  const r2 = parseInt(hex2.slice(1, 3), 16);
  const g2 = parseInt(hex2.slice(3, 5), 16);
  const b2 = parseInt(hex2.slice(5, 7), 16);
  return Math.sqrt((r1-r2)**2 + (g1-g2)**2 + (b1-b2)**2);
}

// Find the best color name for a given hex
function findColorName(hex) {
  const h = hex.toLowerCase();

  // Exact match
  if (hexToNames[h]) {
    return { name: hexToNames[h][0], method: 'exact', distance: 0 };
  }

  // Find closest match
  let bestDist = Infinity;
  let bestName = null;
  for (const [existingHex, names] of Object.entries(hexToNames)) {
    const dist = hexDistance(h, existingHex);
    if (dist < bestDist) {
      bestDist = dist;
      bestName = names[0];
    }
  }

  // Only use close match (distance < 30 is very close)
  if (bestDist < 50 && bestName) {
    return { name: bestName, method: 'close', distance: bestDist.toFixed(1) };
  }

  // Fallback: generate name from hex analysis
  const r = parseInt(h.slice(1, 3), 16);
  const g = parseInt(h.slice(3, 5), 16);
  const b = parseInt(h.slice(5, 7), 16);
  const brightness = (r + g + b) / 3;

  if (brightness < 30) return { name: '블랙', method: 'generated', distance: -1 };
  if (brightness > 230) return { name: '화이트', method: 'generated', distance: -1 };
  if (brightness > 180 && Math.abs(r-g) < 20 && Math.abs(g-b) < 20) return { name: '실버', method: 'generated', distance: -1 };
  if (brightness > 100 && Math.abs(r-g) < 20 && Math.abs(g-b) < 20) return { name: '그레이', method: 'generated', distance: -1 };
  if (brightness < 80 && Math.abs(r-g) < 20 && Math.abs(g-b) < 20) return { name: '다크 그레이', method: 'generated', distance: -1 };
  if (r > g + 40 && r > b + 40) {
    if (brightness < 80) return { name: '다크 레드', method: 'generated', distance: -1 };
    return { name: '레드', method: 'generated', distance: -1 };
  }
  if (b > r + 30 && b > g + 20) {
    if (brightness < 50) return { name: '다크 블루', method: 'generated', distance: -1 };
    return { name: '블루', method: 'generated', distance: -1 };
  }
  if (g > r + 20 && g > b + 20) return { name: '그린', method: 'generated', distance: -1 };
  if (r > 100 && g > 60 && b < 60) return { name: '브라운', method: 'generated', distance: -1 };
  if (r > b && g > b && Math.abs(r-g) < 30) return { name: '베이지', method: 'generated', distance: -1 };

  return { name: '메탈릭 ' + h.toUpperCase(), method: 'hex-fallback', distance: -1 };
}

// ============================================
// STEP 2: Fix placeholder color names
// ============================================
console.log('--- STEP 2: 플레이스홀더 색상명 수정 ---');
let placeholderFixed = 0;

for (const [id, d] of Object.entries(details)) {
  if (d.colorImages) {
    d.colorImages.forEach(ci => {
      if (ci.id && ci.id.startsWith('color_') && (!ci.name || ci.name === '' || ci.name.startsWith('color_'))) {
        if (ci.hex) {
          const result = findColorName(ci.hex);
          const car = cars.cars.find(x => x.id === id);
          const carLabel = car ? car.brandName + ' ' + car.name : id;
          console.log('  [' + carLabel + '] ' + ci.id + ' (' + ci.hex + ') -> "' + result.name + '" (' + result.method + ', dist:' + result.distance + ')');
          ci.name = result.name;
          placeholderFixed++;
        }
      }
    });
  }
}

console.log('  총 ' + placeholderFixed + '개 플레이스홀더 수정\n');

// ============================================
// STEP 3: Remove duplicate colors
// ============================================
console.log('--- STEP 3: 중복 색상 제거 ---');
let dupesRemoved = 0;

for (const [id, d] of Object.entries(details)) {
  if (d.colorImages && d.colorImages.length > 1) {
    const seen = new Set();
    const unique = [];
    d.colorImages.forEach(ci => {
      // Use name + hex as unique key (to differentiate same name but different color)
      const key = (ci.name || ci.id) + '|' + (ci.hex || '');
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(ci);
      } else {
        const car = cars.cars.find(x => x.id === id);
        const carLabel = car ? car.brandName + ' ' + car.name : id;
        console.log('  [' + carLabel + '] 중복 제거: "' + (ci.name || ci.id) + '" (' + ci.hex + ')');
        dupesRemoved++;
      }
    });
    d.colorImages = unique;
  }
}

console.log('  총 ' + dupesRemoved + '개 중복 제거\n');

// ============================================
// STEP 4: Re-index color IDs to be sequential
// ============================================
console.log('--- STEP 4: 색상 ID 재정렬 ---');
let reindexed = 0;

for (const [id, d] of Object.entries(details)) {
  if (d.colorImages) {
    d.colorImages.forEach((ci, idx) => {
      const newId = 'color_' + (idx + 1);
      if (ci.id !== newId) {
        reindexed++;
      }
      // Keep original imageUrl as it maps to Danawa CDN
      ci.id = newId;
    });
  }
}

console.log('  총 ' + reindexed + '개 ID 재정렬\n');

// ============================================
// STEP 5: Save the fixed file
// ============================================
console.log('--- STEP 5: 파일 저장 ---');
const output = JSON.stringify(details, null, 2);
fs.writeFileSync(detailsPath, output, 'utf8');
console.log('  저장 완료: ' + detailsPath);
console.log('  파일 크기: ' + (output.length / 1024).toFixed(1) + ' KB\n');

// ============================================
// Summary
// ============================================
console.log('========================================');
console.log('  수정 요약');
console.log('========================================');
console.log('플레이스홀더 수정: ' + placeholderFixed + '개');
console.log('중복 제거: ' + dupesRemoved + '개');
console.log('ID 재정렬: ' + reindexed + '개');
