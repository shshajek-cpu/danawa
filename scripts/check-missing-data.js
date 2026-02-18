const details = require('../src/constants/generated-car-details.json');
const cars = require('../src/constants/generated-cars.json');

console.log('=== 옵션 없는 차량 상세 현황 ===\n');

let noOpts = [];
for (const [id, d] of Object.entries(details)) {
  if (!d.selectableOptions || d.selectableOptions.length === 0) {
    const car = cars.cars.find(x => x.id === id);
    noOpts.push({
      id,
      brand: d.brand || (car ? car.brandName : ''),
      name: d.name || (car ? car.name : ''),
      trims: d.trims ? d.trims.length : 0,
      colors: d.colorImages ? d.colorImages.length : 0,
      options: 0,
    });
  }
}

// Group by brand
const byBrand = {};
noOpts.forEach(c => {
  if (!byBrand[c.brand]) byBrand[c.brand] = [];
  byBrand[c.brand].push(c);
});

for (const [brand, list] of Object.entries(byBrand)) {
  console.log(`[${brand}] (${list.length}대)`);
  list.forEach(c => {
    console.log(`  ${c.name} - 트림: ${c.trims}개, 색상: ${c.colors}개, 옵션: 0개`);
  });
  console.log('');
}

console.log(`총 ${noOpts.length}대 옵션 데이터 없음`);
console.log('\n=== 있는 데이터 vs 없는 데이터 ===');
const total = Object.keys(details).length;
const withOpts = total - noOpts.length;
console.log(`전체: ${total}대`);
console.log(`옵션 있음: ${withOpts}대 (${(withOpts/total*100).toFixed(0)}%)`);
console.log(`옵션 없음: ${noOpts.length}대 (${(noOpts.length/total*100).toFixed(0)}%)`);
console.log(`\n트림/색상은 전부 있고, "선택 옵션(selectableOptions)"만 빠진 상태입니다.`);
