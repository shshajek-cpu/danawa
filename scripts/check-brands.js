const data = require('../src/constants/generated-cars.json');

console.log('=== Brands ===');
data.brands.forEach(b => console.log(`  ${b.id}: ${b.name}`));
console.log(`\nTotal brands: ${data.brands.length}`);

console.log('\n=== Cars per brand ===');
const byBrand = {};
data.cars.forEach(c => {
  if (!byBrand[c.brandId]) byBrand[c.brandId] = [];
  byBrand[c.brandId].push(c.name);
});

for (const [brandId, cars] of Object.entries(byBrand)) {
  const brand = data.brands.find(b => b.id === brandId);
  console.log(`\n[${brand ? brand.name : brandId}] (${cars.length}대)`);
  cars.forEach(c => console.log(`  - ${c}`));
}

console.log(`\nTotal cars: ${data.cars.length}`);

// Check if any car in details is missing from cars list
const details = require('../src/constants/generated-car-details.json');
const carIds = new Set(data.cars.map(c => c.id));
const detailIds = Object.keys(details);
const missing = detailIds.filter(id => !carIds.has(id));
if (missing.length > 0) {
  console.log(`\n⚠️  ${missing.length} cars in details but NOT in cars list:`);
  missing.forEach(id => console.log(`  - ${id}: ${details[id].brand} ${details[id].name}`));
}
