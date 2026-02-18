const cars = require("../src/constants/generated-cars.json");
const subModels = require("../src/constants/sub-models.json");
const details = require("../src/constants/generated-car-details.json");

const result = cars.cars.map(c => ({
  id: c.id,
  brand: c.brandName,
  name: c.name,
  fuelType: c.fuelType,
  gradeCount: c.gradeCount,
  startPrice: c.startPrice,
  grades: (c.grades || []).map(g => g.name + " (" + g.price + ")"),
  subModels: (subModels[c.id] && subModels[c.id].subModels || []).map(s => s.name + "/" + s.fuelType),
  trimCount: details[c.id] ? details[c.id].trims.length : 0
}));

const byBrand = {};
result.forEach(c => {
  if (!(c.brand in byBrand)) byBrand[c.brand] = [];
  byBrand[c.brand].push(c);
});

let total = 0;
for (const [brand, carList] of Object.entries(byBrand)) {
  console.log(`\n=== ${brand} (${carList.length}대) ===`);
  carList.forEach(c => {
    total++;
    console.log(`  [${c.id}] ${c.name} | 유종: ${c.fuelType} | 등급: ${c.gradeCount}개 | 트림: ${c.trimCount}개 | 시작가: ${(c.startPrice/10000).toLocaleString()}만원`);
    console.log(`    서브모델: ${c.subModels.length > 0 ? c.subModels.join(', ') : '없음'}`);
    console.log(`    등급목록: ${c.grades.slice(0, 5).join(', ')}${c.grades.length > 5 ? ' ...(+' + (c.grades.length-5) + ')' : ''}`);
  });
}
console.log(`\n총 ${total}대 차량`);
