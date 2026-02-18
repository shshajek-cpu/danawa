const fs = require('fs');
const path = require('path');

const carsData = require('../src/constants/generated-cars.json');
const detailsData = require('../src/constants/generated-car-details.json');
const subModelsData = require('../src/constants/sub-models.json');

console.log('=== Data Integrity Check ===\n');

// 1. Check all cars have details
const carIds = new Set(carsData.cars.map(c => c.id));
const detailIds = new Set(Object.keys(detailsData));

const noDetail = carsData.cars.filter(c => !detailIds.has(c.id));
console.log(`Cars without details: ${noDetail.length}`);
noDetail.forEach(c => console.log(`  ${c.id}: ${c.name}`));

// 2. Check for duplicate cars
const idCounts = {};
carsData.cars.forEach(c => { idCounts[c.id] = (idCounts[c.id] || 0) + 1; });
const dupes = Object.entries(idCounts).filter(([, count]) => count > 1);
console.log(`\nDuplicate car IDs: ${dupes.length}`);
dupes.forEach(([id, count]) => {
  const car = carsData.cars.find(c => c.id === id);
  console.log(`  ${id}: ${car.name} (x${count})`);
});

// 3. Check for cars with 0 price
const noPrice = carsData.cars.filter(c => !c.startPrice || c.startPrice === 0);
console.log(`\nCars with no price: ${noPrice.length}`);
if (noPrice.length <= 10) noPrice.forEach(c => console.log(`  ${c.id}: ${c.name}`));

// 4. Check for cars with empty name
const noName = carsData.cars.filter(c => !c.name || c.name.length === 0);
console.log(`Cars with no name: ${noName.length}`);

// 5. Check brand car counts
console.log('\n=== Brand Summary ===');
const byBrand = {};
carsData.cars.forEach(c => {
  if (!byBrand[c.brandId]) byBrand[c.brandId] = [];
  byBrand[c.brandId].push(c);
});
for (const brand of carsData.brands) {
  const cars = byBrand[brand.id] || [];
  console.log(`  ${brand.name}: ${cars.length}대 (declared: ${brand.carCount})`);
}

// 6. Check details quality
let noTrimCount = 0, noColorCount = 0;
for (const [id, d] of Object.entries(detailsData)) {
  if (!d.trims || d.trims.length === 0) noTrimCount++;
  if (!d.colorImages || d.colorImages.length === 0) noColorCount++;
}
console.log(`\nDetails with no trims: ${noTrimCount}`);
console.log(`Details with no colors: ${noColorCount}`);

// 7. Total
console.log(`\nTotal brands: ${carsData.brands.length}`);
console.log(`Total cars: ${carsData.cars.length}`);
console.log(`Total details: ${Object.keys(detailsData).length}`);
console.log(`Total sub-models: ${Object.keys(subModelsData).length}`);
