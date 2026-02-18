const fs = require('fs');
const data = JSON.parse(fs.readFileSync('src/constants/generated-car-details.json', 'utf8'));

const carsWithDuplicates = [];
let totalCars = 0;

for (const [carId, carData] of Object.entries(data)) {
  totalCars++;
  const selectableOptions = carData.selectableOptions || [];

  if (selectableOptions.length === 0) continue;

  // Track duplicates
  const nameCount = {};
  const exactDuplicates = [];

  // Build name map
  selectableOptions.forEach((opt, idx) => {
    const name = opt.name;

    if (!nameCount[name]) {
      nameCount[name] = [];
    }
    nameCount[name].push({
      idx,
      id: opt.id,
      price: opt.price
    });
  });

  // Find exact duplicates (same name)
  for (const [name, occurrences] of Object.entries(nameCount)) {
    if (occurrences.length > 1) {
      // Check if they have the same price too
      const priceGroups = {};
      occurrences.forEach(occ => {
        if (!priceGroups[occ.price]) {
          priceGroups[occ.price] = [];
        }
        priceGroups[occ.price].push(occ);
      });

      const hasSamePriceDuplicates = Object.values(priceGroups).some(group => group.length > 1);

      exactDuplicates.push({
        name,
        occurrences,
        hasSamePriceDuplicates
      });
    }
  }

  if (exactDuplicates.length > 0) {
    carsWithDuplicates.push({
      carId,
      brand: carData.brand,
      name: carData.name,
      duplicates: exactDuplicates,
      totalOptions: selectableOptions.length
    });
  }
}

console.log('='.repeat(80));
console.log('DUPLICATE SELECTABLE OPTIONS REPORT');
console.log('='.repeat(80));
console.log('');
console.log(`Total cars analyzed: ${totalCars}`);
console.log(`Cars with duplicate options: ${carsWithDuplicates.length}`);
console.log('');

if (carsWithDuplicates.length === 0) {
  console.log('No duplicates found!');
} else {
  carsWithDuplicates.forEach((car, idx) => {
    console.log(`${idx + 1}. Car ID: ${car.carId}`);
    console.log(`   Brand: ${car.brand}`);
    console.log(`   Name: ${car.name}`);
    console.log(`   Total selectable options: ${car.totalOptions}`);
    console.log(`   Duplicate groups found: ${car.duplicates.length}`);
    console.log('');

    car.duplicates.forEach((dup, dupIdx) => {
      console.log(`   Duplicate ${dupIdx + 1}: "${dup.name}"`);
      console.log(`   Appears ${dup.occurrences.length} times`);
      if (dup.hasSamePriceDuplicates) {
        console.log(`   ⚠️  WARNING: Some occurrences have the SAME PRICE`);
      }
      console.log('   Occurrences:');
      dup.occurrences.forEach(occ => {
        console.log(`     - ID: ${occ.id}, Price: ${occ.price.toLocaleString()} KRW`);
      });
      console.log('');
    });

    console.log('-'.repeat(80));
    console.log('');
  });
}

console.log('='.repeat(80));
console.log('SUMMARY');
console.log('='.repeat(80));
console.log(`Total cars with issues: ${carsWithDuplicates.length} out of ${totalCars}`);

// Count total duplicate groups
const totalDuplicateGroups = carsWithDuplicates.reduce((sum, car) => sum + car.duplicates.length, 0);
console.log(`Total duplicate option groups: ${totalDuplicateGroups}`);

// Count cars with same-price duplicates
const carsWithSamePriceDups = carsWithDuplicates.filter(car =>
  car.duplicates.some(dup => dup.hasSamePriceDuplicates)
).length;
console.log(`Cars with same-price duplicates: ${carsWithSamePriceDups}`);
