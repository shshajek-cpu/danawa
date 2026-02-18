const details = require('../src/constants/generated-car-details.json');
const cars = require('../src/constants/generated-cars.json');
const subModels = require('../src/constants/sub-models.json');

console.log('========================================');
console.log('  데이터 품질 검사 보고서');
console.log('========================================\n');

// 1. Check for placeholder color names (color_XX)
console.log('--- 1. 플레이스홀더 색상명 (color_XX) ---');
let placeholderCount = 0;
for (const [id, d] of Object.entries(details)) {
  if (d.colorImages) {
    d.colorImages.forEach(ci => {
      if (ci.id && ci.id.startsWith('color_') && (!ci.name || ci.name.startsWith('color_'))) {
        const car = cars.cars.find(c => c.id === id);
        console.log('  [' + (car ? car.brandName + ' ' + car.name : id) + '] 색상 "' + (ci.name || ci.id) + '" - 이름 없음');
        placeholderCount++;
      }
    });
  }
}
console.log('  총 ' + placeholderCount + '개 플레이스홀더 색상\n');

// 2. Check for duplicate colors
console.log('--- 2. 중복 색상 ---');
let dupCount = 0;
for (const [id, d] of Object.entries(details)) {
  if (d.colorImages && d.colorImages.length > 1) {
    const names = d.colorImages.map(ci => ci.name || ci.id);
    const dupes = names.filter((name, idx) => names.indexOf(name) !== idx);
    if (dupes.length > 0) {
      const car = cars.cars.find(c => c.id === id);
      const uniqueDupes = [...new Set(dupes)];
      console.log('  [' + (car ? car.brandName + ' ' + car.name : id) + '] 중복: ' + uniqueDupes.join(', '));
      dupCount += dupes.length;
    }
  }
}
console.log('  총 ' + dupCount + '건 중복\n');

// 3. Check for cars with 0 colors
console.log('--- 3. 색상 데이터 없는 차량 ---');
let noColorCount = 0;
for (const [id, d] of Object.entries(details)) {
  if (!d.colorImages || d.colorImages.length === 0) {
    const car = cars.cars.find(c => c.id === id);
    console.log('  [' + (car ? car.brandName + ' ' + car.name : id) + '] 색상 0개');
    noColorCount++;
  }
}
console.log('  총 ' + noColorCount + '대\n');

// 4. Check for cars with 0 options
console.log('--- 4. 옵션 데이터 없는 차량 ---');
let noOptCount = 0;
for (const [id, d] of Object.entries(details)) {
  if (!d.selectableOptions || d.selectableOptions.length === 0) {
    const car = cars.cars.find(c => c.id === id);
    console.log('  [' + (car ? car.brandName + ' ' + car.name : id) + '] 옵션 0개');
    noOptCount++;
  }
}
console.log('  총 ' + noOptCount + '대\n');

// 5. Check for cars in generated-cars but not in generated-car-details
console.log('--- 5. 디테일 데이터 누락 차량 ---');
let missingDetailCount = 0;
for (const car of cars.cars) {
  if (!details[car.id]) {
    console.log('  [' + car.brandName + ' ' + car.name + '] (ID:' + car.id + ') 디테일 없음');
    missingDetailCount++;
  }
}
console.log('  총 ' + missingDetailCount + '대\n');

// 6. Price mismatch between cars list and detail trims
console.log('--- 6. 시작가격 불일치 (목록 vs 디테일) ---');
let priceMismatch = 0;
for (const car of cars.cars) {
  const d = details[car.id];
  if (d && d.trims && d.trims.length > 0) {
    const minTrimPrice = Math.min(...d.trims.map(t => t.price));
    if (car.startPrice !== minTrimPrice) {
      console.log('  [' + car.brandName + ' ' + car.name + '] 목록: ' + (car.startPrice/10000) + '만원 vs 디테일 최저: ' + (minTrimPrice/10000) + '만원');
      priceMismatch++;
    }
  }
}
console.log('  총 ' + priceMismatch + '건 불일치\n');

// 7. Check grade count mismatch
console.log('--- 7. 등급 수 불일치 (목록 vs 디테일) ---');
let gradeMismatch = 0;
for (const car of cars.cars) {
  const d = details[car.id];
  if (d && d.trims) {
    if (car.gradeCount !== d.trims.length) {
      console.log('  [' + car.brandName + ' ' + car.name + '] 목록: ' + car.gradeCount + '개 vs 디테일: ' + d.trims.length + '개');
      gradeMismatch++;
    }
  }
}
console.log('  총 ' + gradeMismatch + '건 불일치\n');

// 8. Check sub-models data coverage
console.log('--- 8. 서브모델 데이터 누락 ---');
let noSubModel = 0;
for (const car of cars.cars) {
  if (!subModels[car.id]) {
    console.log('  [' + car.brandName + ' ' + car.name + '] (ID:' + car.id + ')');
    noSubModel++;
  }
}
console.log('  총 ' + noSubModel + '대 서브모델 데이터 없음\n');

// 9. Summary
console.log('========================================');
console.log('  요약');
console.log('========================================');
console.log('총 브랜드: ' + cars.brands.length);
console.log('총 차량: ' + cars.cars.length);
console.log('디테일 누락: ' + missingDetailCount);
console.log('플레이스홀더 색상: ' + placeholderCount);
console.log('중복 색상: ' + dupCount);
console.log('색상 없음: ' + noColorCount);
console.log('옵션 없음: ' + noOptCount);
console.log('시작가 불일치: ' + priceMismatch);
console.log('등급수 불일치: ' + gradeMismatch);
console.log('서브모델 누락: ' + noSubModel);
