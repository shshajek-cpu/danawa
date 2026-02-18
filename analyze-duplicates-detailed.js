const fs = require('fs');
const data = JSON.parse(fs.readFileSync('src/constants/generated-car-details.json', 'utf8'));

// Helper function to normalize strings for near-duplicate detection
function normalize(str) {
  return str
    .toLowerCase()
    .replace(/\s+/g, '') // Remove all whitespace
    .replace(/[^\w가-힣]/g, ''); // Keep only alphanumeric and Korean characters
}

// Levenshtein distance for fuzzy matching
function levenshteinDistance(str1, str2) {
  const matrix = [];
  for (let i = 0; i <= str1.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= str2.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= str1.length; i++) {
    for (let j = 1; j <= str2.length; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[str1.length][str2.length];
}

const carsWithDuplicates = [];
let totalCars = 0;
let totalOptions = 0;

for (const [carId, carData] of Object.entries(data)) {
  totalCars++;
  const selectableOptions = carData.selectableOptions || [];
  totalOptions += selectableOptions.length;

  if (selectableOptions.length === 0) continue;

  const issues = {
    exactDuplicates: [],
    nearDuplicates: [],
    samePriceDuplicates: []
  };

  // 1. Check for exact duplicates (same name)
  const nameMap = {};
  selectableOptions.forEach((opt, idx) => {
    const name = opt.name;
    if (!nameMap[name]) {
      nameMap[name] = [];
    }
    nameMap[name].push({ idx, id: opt.id, price: opt.price });
  });

  for (const [name, occurrences] of Object.entries(nameMap)) {
    if (occurrences.length > 1) {
      issues.exactDuplicates.push({ name, occurrences });
    }
  }

  // 2. Check for near duplicates (similar names after normalization)
  const normalizedMap = {};
  selectableOptions.forEach((opt, idx) => {
    const normalized = normalize(opt.name);
    if (!normalizedMap[normalized]) {
      normalizedMap[normalized] = [];
    }
    normalizedMap[normalized].push({
      idx,
      id: opt.id,
      name: opt.name,
      price: opt.price
    });
  });

  for (const [normalized, occurrences] of Object.entries(normalizedMap)) {
    if (occurrences.length > 1) {
      // Only report if the original names are different (not caught by exact duplicate check)
      const uniqueNames = new Set(occurrences.map(o => o.name));
      if (uniqueNames.size > 1) {
        issues.nearDuplicates.push({ normalized, occurrences });
      }
    }
  }

  // 3. Check for same name + same price (most severe)
  for (const [name, occurrences] of Object.entries(nameMap)) {
    if (occurrences.length > 1) {
      const priceGroups = {};
      occurrences.forEach(occ => {
        if (!priceGroups[occ.price]) {
          priceGroups[occ.price] = [];
        }
        priceGroups[occ.price].push(occ);
      });

      for (const [price, group] of Object.entries(priceGroups)) {
        if (group.length > 1) {
          issues.samePriceDuplicates.push({ name, price: parseInt(price), occurrences: group });
        }
      }
    }
  }

  // Add to results if any issues found
  if (
    issues.exactDuplicates.length > 0 ||
    issues.nearDuplicates.length > 0 ||
    issues.samePriceDuplicates.length > 0
  ) {
    carsWithDuplicates.push({
      carId,
      brand: carData.brand,
      name: carData.name,
      totalOptions: selectableOptions.length,
      issues
    });
  }
}

console.log('='.repeat(80));
console.log('COMPREHENSIVE DUPLICATE SELECTABLE OPTIONS REPORT');
console.log('='.repeat(80));
console.log('');
console.log(`Total cars analyzed: ${totalCars}`);
console.log(`Total selectable options checked: ${totalOptions}`);
console.log(`Cars with duplicate issues: ${carsWithDuplicates.length}`);
console.log('');

if (carsWithDuplicates.length === 0) {
  console.log('✓ No duplicates found!');
  console.log('');
  console.log('All selectable options have unique names across all cars.');
} else {
  carsWithDuplicates.forEach((car, idx) => {
    console.log(`${idx + 1}. Car ID: ${car.carId}`);
    console.log(`   Brand: ${car.brand}`);
    console.log(`   Name: ${car.name}`);
    console.log(`   Total selectable options: ${car.totalOptions}`);
    console.log('');

    // Exact duplicates
    if (car.issues.exactDuplicates.length > 0) {
      console.log(`   ⚠️  EXACT DUPLICATES (${car.issues.exactDuplicates.length}):`);
      car.issues.exactDuplicates.forEach((dup, dupIdx) => {
        console.log(`   ${dupIdx + 1}. "${dup.name}" appears ${dup.occurrences.length} times:`);
        dup.occurrences.forEach(occ => {
          console.log(`      - ID: ${occ.id}, Price: ${occ.price.toLocaleString()} KRW`);
        });
      });
      console.log('');
    }

    // Near duplicates
    if (car.issues.nearDuplicates.length > 0) {
      console.log(`   ⚠️  NEAR DUPLICATES (${car.issues.nearDuplicates.length}):`);
      car.issues.nearDuplicates.forEach((dup, dupIdx) => {
        console.log(`   ${dupIdx + 1}. Similar names (normalized: "${dup.normalized}"):`);
        dup.occurrences.forEach(occ => {
          console.log(`      - "${occ.name}" | ID: ${occ.id}, Price: ${occ.price.toLocaleString()} KRW`);
        });
      });
      console.log('');
    }

    // Same price duplicates
    if (car.issues.samePriceDuplicates.length > 0) {
      console.log(`   🚨 SAME NAME + SAME PRICE (${car.issues.samePriceDuplicates.length}):`);
      car.issues.samePriceDuplicates.forEach((dup, dupIdx) => {
        console.log(`   ${dupIdx + 1}. "${dup.name}" at ${dup.price.toLocaleString()} KRW appears ${dup.occurrences.length} times:`);
        dup.occurrences.forEach(occ => {
          console.log(`      - ID: ${occ.id}`);
        });
      });
      console.log('');
    }

    console.log('-'.repeat(80));
    console.log('');
  });
}

console.log('='.repeat(80));
console.log('SUMMARY');
console.log('='.repeat(80));
console.log(`Total cars with issues: ${carsWithDuplicates.length} out of ${totalCars}`);

const totalExact = carsWithDuplicates.reduce((sum, car) => sum + car.issues.exactDuplicates.length, 0);
const totalNear = carsWithDuplicates.reduce((sum, car) => sum + car.issues.nearDuplicates.length, 0);
const totalSamePrice = carsWithDuplicates.reduce((sum, car) => sum + car.issues.samePriceDuplicates.length, 0);

console.log(`Exact duplicate groups: ${totalExact}`);
console.log(`Near duplicate groups: ${totalNear}`);
console.log(`Same name + same price groups: ${totalSamePrice}`);
console.log('='.repeat(80));
