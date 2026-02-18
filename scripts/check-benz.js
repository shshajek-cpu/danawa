const data = require('../src/constants/generated-cars.json');
const details = require('../src/constants/generated-car-details.json');

console.log('=== 벤츠 브랜드 정보 ===');
const benzBrand = data.brands.find(b => b.name === '벤츠' || b.name.includes('벤츠'));
console.log('Brand:', benzBrand);

console.log('\n=== 벤츠 차량 목록 (generated-cars.json) ===');
const benzCars = data.cars.filter(c => c.brandId === benzBrand?.id);
benzCars.forEach(c => console.log(`  ${c.id}: ${c.name} (${c.startPrice/10000}만원, ${c.gradeCount}등급)`));
console.log(`Total: ${benzCars.length}대`);

console.log('\n=== 벤츠 상세 데이터 (generated-car-details.json) ===');
for (const [id, d] of Object.entries(details)) {
  if (d.brand === '벤츠' || d.brand === '메르세데스-벤츠') {
    console.log(`  ${id}: ${d.brand} ${d.name} (trims: ${d.trims?.length}, colors: ${d.colorImages?.length}, options: ${d.selectableOptions?.length})`);
  }
}
