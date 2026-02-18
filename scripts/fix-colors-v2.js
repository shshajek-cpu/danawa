const fs = require('fs');
const path = require('path');

const detailsPath = path.join(__dirname, '../src/constants/generated-car-details.json');
const carsPath = path.join(__dirname, '../src/constants/generated-cars.json');

const details = JSON.parse(fs.readFileSync(detailsPath, 'utf8'));
const cars = JSON.parse(fs.readFileSync(carsPath, 'utf8'));

console.log('========================================');
console.log('  색상 데이터 수정 v2 (보정 스크립트)');
console.log('========================================\n');

// ============================================
// STEP 1: Build VALIDATED hex -> name mapping
// ============================================
console.log('--- STEP 1: 검증된 hex -> name 매핑 구축 ---');

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16)
  };
}

function brightness(hex) {
  const { r, g, b } = hexToRgb(hex);
  return (r + g + b) / 3;
}

function isBlackish(hex) { return brightness(hex) < 30; }
function isWhitish(hex) { return brightness(hex) > 220; }
function isGrayish(hex) {
  const { r, g, b } = hexToRgb(hex);
  return Math.abs(r - g) < 25 && Math.abs(g - b) < 25 && Math.abs(r - b) < 25;
}

// Collect hex->name with validation
const hexNameCounts = {};
for (const [id, d] of Object.entries(details)) {
  if (d.colorImages) {
    d.colorImages.forEach(ci => {
      if (ci.hex && ci.name && ci.name.trim() !== '') {
        const hex = ci.hex.toLowerCase();
        const name = ci.name.trim();

        // Validate: reject obvious mismatches
        const brt = brightness(hex);
        const looksBlack = brt < 20;
        const looksWhite = brt > 230;
        const nameHasBlack = /블랙|black/i.test(name);
        const nameHasWhite = /화이트|white/i.test(name);
        const nameHasGreen = /그린|green/i.test(name);
        const nameHasBlue = /블루|blue/i.test(name);
        const nameHasRed = /레드|red/i.test(name);

        // Skip mismatches
        if (looksBlack && (nameHasWhite || nameHasGreen)) return;
        if (looksWhite && (nameHasBlack || nameHasGreen || nameHasBlue || nameHasRed)) return;
        if (looksBlack && nameHasGreen) return;

        if (!hexNameCounts[hex]) hexNameCounts[hex] = {};
        hexNameCounts[hex][name] = (hexNameCounts[hex][name] || 0) + 1;
      }
    });
  }
}

// Pick most frequent valid name per hex
const hexToName = {};
for (const [hex, names] of Object.entries(hexNameCounts)) {
  const sorted = Object.entries(names).sort((a, b) => b[1] - a[1]);
  hexToName[hex] = sorted[0][0];
}

console.log('  검증된 매핑: ' + Object.keys(hexToName).length + '개\n');

// ============================================
// STEP 2: Color distance matching
// ============================================
function hexDistance(hex1, hex2) {
  const a = hexToRgb(hex1);
  const b = hexToRgb(hex2);
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
}

function generateColorName(hex) {
  const { r, g, b } = hexToRgb(hex);
  const brt = (r + g + b) / 3;

  if (brt < 15) return '블랙';
  if (brt < 40 && isGrayish(hex)) return '다크 그레이';
  if (brt < 60 && isGrayish(hex)) return '그래파이트 그레이';
  if (brt < 100 && isGrayish(hex)) return '그레이';
  if (brt > 230 && isGrayish(hex)) return '화이트';
  if (brt > 200 && isGrayish(hex)) return '라이트 실버';
  if (brt > 160 && isGrayish(hex)) return '실버';
  if (brt > 100 && isGrayish(hex)) return '미디엄 그레이';

  // Color hue analysis
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);

  if (r === max && r > g + 30 && r > b + 30) {
    if (brt < 60) return '다크 레드';
    if (brt < 100) return '마룬';
    return '레드';
  }
  if (b === max && b > r + 20 && b > g + 20) {
    if (brt < 40) return '다크 블루';
    if (brt < 80) return '네이비';
    return '블루';
  }
  if (g === max && g > r + 20 && g > b + 20) {
    if (brt < 60) return '다크 그린';
    return '그린';
  }
  if (r > 80 && g > 50 && b < 50 && r > b + 40) {
    if (brt < 80) return '다크 브라운';
    return '브라운';
  }
  if (r > b && g > b && Math.abs(r - g) < 40 && brt > 100) return '베이지';

  // Dark near-black with tint
  if (brt < 30) {
    if (b > r + 5) return '다크 네이비';
    if (r > b + 5) return '다크 마룬';
    return '블랙';
  }

  return '메탈릭 그레이';
}

function findBestColorName(hex) {
  const h = hex.toLowerCase();

  // Exact validated match
  if (hexToName[h]) {
    return { name: hexToName[h], method: 'exact' };
  }

  // Close match (distance < 30)
  let bestDist = Infinity;
  let bestName = null;
  for (const [existingHex, name] of Object.entries(hexToName)) {
    const dist = hexDistance(h, existingHex);
    if (dist < bestDist) {
      bestDist = dist;
      bestName = name;
    }
  }

  if (bestDist < 30 && bestName) {
    // Additional validation: check if the match makes visual sense
    const srcBrt = brightness(h);
    const nameHasWhite = /화이트|white/i.test(bestName);
    const nameHasBlack = /블랙|black/i.test(bestName);

    if (srcBrt < 30 && nameHasWhite) {
      return { name: generateColorName(h), method: 'generated' };
    }
    if (srcBrt > 200 && nameHasBlack) {
      return { name: generateColorName(h), method: 'generated' };
    }
    return { name: bestName, method: 'close(' + bestDist.toFixed(0) + ')' };
  }

  return { name: generateColorName(h), method: 'generated' };
}

// ============================================
// STEP 3: Fix ALL color names (re-apply with validation)
// ============================================
console.log('--- STEP 2: 모든 색상명 재검증 및 수정 ---');
let fixed = 0;
let corrected = 0;

for (const [id, d] of Object.entries(details)) {
  if (d.colorImages) {
    d.colorImages.forEach(ci => {
      if (!ci.hex) return;

      const brt = brightness(ci.hex);
      const currentName = ci.name || '';

      // Check if current name is a bad placeholder or mismatched
      const isPlaceholder = currentName === '' || currentName.startsWith('color_');
      const isBlackHexGreenName = brt < 20 && /그린|green/i.test(currentName) && !/블랙/i.test(currentName);
      const isBlackHexWhiteName = brt < 20 && /화이트|white|폴라/i.test(currentName);
      const isDarkHexBlueName = brt < 50 && /퍼포먼스 블루/i.test(currentName) && ci.hex !== '#1e3d82';
      const isDarkHexGreenName = brt < 40 && /파인 그린|그린 매트/i.test(currentName) && !/그린/i.test(ci.hex);

      const needsFix = isPlaceholder || isBlackHexGreenName || isBlackHexWhiteName || isDarkHexBlueName || isDarkHexGreenName;

      if (needsFix) {
        const result = findBestColorName(ci.hex);
        const car = cars.cars.find(x => x.id === id);
        const carLabel = car ? car.brandName + ' ' + car.name : id;

        if (isPlaceholder) {
          console.log('  [NEW] [' + carLabel + '] ' + ci.id + ' (' + ci.hex + ') -> "' + result.name + '" (' + result.method + ')');
          fixed++;
        } else {
          console.log('  [FIX] [' + carLabel + '] ' + ci.id + ' (' + ci.hex + ') "' + currentName + '" -> "' + result.name + '" (' + result.method + ')');
          corrected++;
        }
        ci.name = result.name;
      }
    });
  }
}

console.log('  신규 수정: ' + fixed + '개, 오류 보정: ' + corrected + '개\n');

// ============================================
// STEP 4: Remove duplicates (by NAME within each car)
// ============================================
console.log('--- STEP 3: 중복 색상 제거 (이름 기준) ---');
let dupesRemoved = 0;

for (const [id, d] of Object.entries(details)) {
  if (d.colorImages && d.colorImages.length > 1) {
    const seen = new Set();
    const before = d.colorImages.length;
    d.colorImages = d.colorImages.filter(ci => {
      const name = ci.name || ci.id;
      if (seen.has(name)) {
        const car = cars.cars.find(x => x.id === id);
        const carLabel = car ? car.brandName + ' ' + car.name : id;
        console.log('  [' + carLabel + '] 중복 제거: "' + name + '"');
        dupesRemoved++;
        return false;
      }
      seen.add(name);
      return true;
    });
  }
}

console.log('  총 ' + dupesRemoved + '개 중복 제거\n');

// ============================================
// STEP 5: Re-index color IDs
// ============================================
console.log('--- STEP 4: 색상 ID 재정렬 ---');
for (const [id, d] of Object.entries(details)) {
  if (d.colorImages) {
    d.colorImages.forEach((ci, idx) => {
      ci.id = 'color_' + (idx + 1);
    });
  }
}
console.log('  완료\n');

// ============================================
// STEP 6: Save
// ============================================
console.log('--- STEP 5: 파일 저장 ---');
const output = JSON.stringify(details, null, 2);
fs.writeFileSync(detailsPath, output, 'utf8');
console.log('  저장 완료: ' + detailsPath);
console.log('  파일 크기: ' + (output.length / 1024).toFixed(1) + ' KB\n');

// ============================================
// Validation
// ============================================
console.log('--- 검증 ---');
let remainingPlaceholders = 0;
let remainingDupes = 0;
for (const [id, d] of Object.entries(details)) {
  if (d.colorImages) {
    d.colorImages.forEach(ci => {
      if (!ci.name || ci.name === '' || ci.name.startsWith('color_')) {
        remainingPlaceholders++;
      }
    });
    const names = d.colorImages.map(ci => ci.name || ci.id);
    const dupeNames = names.filter((n, i) => names.indexOf(n) !== i);
    remainingDupes += dupeNames.length;
  }
}
console.log('  남은 플레이스홀더: ' + remainingPlaceholders);
console.log('  남은 중복: ' + remainingDupes);
console.log('\n========================================');
console.log('  수정 완료');
console.log('========================================');
