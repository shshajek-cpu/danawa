const fs = require('fs');
const path = require('path');

const carsPath = path.join(__dirname, '..', 'src', 'constants', 'generated-cars.json');
const detailsPath = path.join(__dirname, '..', 'src', 'constants', 'generated-car-details.json');
const subModelsPath = path.join(__dirname, '..', 'src', 'constants', 'sub-models.json');

const carsData = JSON.parse(fs.readFileSync(carsPath, 'utf8'));
const detailsData = JSON.parse(fs.readFileSync(detailsPath, 'utf8'));
const subModelsData = JSON.parse(fs.readFileSync(subModelsPath, 'utf8'));

const brandMap = {
  'hyundai': '현대', 'kia': '기아', 'genesis': '제네시스',
  'kgm': 'KGM', '르노코리아': '르노코리아', '쉐보레': '쉐보레',
  'benz': '벤츠', 'bmw': 'BMW', 'audi': '아우디',
  'volvo': '볼보', 'porsche': '포르쉐', 'toyota': '토요타',
  'lexus': '렉서스', 'landrover': '랜드로버', 'honda': '혼다',
  'jeep': '지프', 'cadillac': '캐딜락', 'gmc': 'GMC',
  'lincoln': '링컨', 'peugeot': '푸조', 'polestar': '폴스타',
  '테슬라': '테슬라'
};

const issues = {
  missingBrandName: [],
  missingGrades: [],
  missingDetails: [],
  missingTrims: [],
  missingColors: [],
  missingOptions: [],
  missingSubModels: [],
  missingImage: [],
  defaultImage: [],
  gradeCountMismatch: [],
  detailBrandMismatch: [],
  duplicateNames: [],
  zeroPriceTrim: [],
};

// 1. Check each car in generated-cars.json
carsData.cars.forEach(car => {
  const detail = detailsData[car.id];
  const subModel = subModelsData[car.id];
  const expectedBrand = brandMap[car.brandId] || car.brandId;

  // Missing brandName
  if (!car.brandName) {
    issues.missingBrandName.push({
      id: car.id, name: car.name, brandId: car.brandId,
      expectedBrandName: expectedBrand
    });
  }

  // Missing grades array
  if (!car.grades || car.grades.length === 0) {
    issues.missingGrades.push({
      id: car.id, name: car.name, brandId: car.brandId,
      gradeCount: car.gradeCount || 0,
      detailTrimsCount: detail ? (detail.trims || []).length : 0
    });
  }

  // Missing detail entry
  if (!detail) {
    issues.missingDetails.push({ id: car.id, name: car.name });
  } else {
    // Missing trims in detail
    if (!detail.trims || detail.trims.length === 0) {
      issues.missingTrims.push({ id: car.id, name: car.name });
    }

    // Missing colors
    if (!detail.colorImages || detail.colorImages.length === 0) {
      issues.missingColors.push({
        id: car.id, name: car.name,
        brand: car.brandName || expectedBrand
      });
    }

    // Check options (only flag if expected to have options)
    if (!detail.selectableOptions || detail.selectableOptions.length === 0) {
      issues.missingOptions.push({
        id: car.id, name: car.name,
        brand: car.brandName || expectedBrand
      });
    }

    // Grade count mismatch
    if (car.grades && car.grades.length > 0 && detail.trims) {
      if (car.grades.length !== detail.trims.length && car.grades.length !== car.gradeCount) {
        issues.gradeCountMismatch.push({
          id: car.id, name: car.name,
          gradesLen: car.grades.length,
          gradeCount: car.gradeCount,
          trimsLen: detail.trims.length
        });
      }
    }

    // Detail brand mismatch
    if (detail.brand && car.brandName && detail.brand !== car.brandName) {
      issues.detailBrandMismatch.push({
        id: car.id, name: car.name,
        carBrand: car.brandName, detailBrand: detail.brand
      });
    }

    // Zero price trims
    if (detail.trims) {
      const zeroTrims = detail.trims.filter(t => !t.price || t.price === 0);
      if (zeroTrims.length > 0) {
        issues.zeroPriceTrim.push({
          id: car.id, name: car.name,
          total: detail.trims.length, zeroPriceCount: zeroTrims.length
        });
      }
    }
  }

  // Missing sub-models
  if (!subModel) {
    issues.missingSubModels.push({ id: car.id, name: car.name });
  }

  // Image issues
  if (!car.imageUrl || car.imageUrl === 'NO_IMAGE') {
    issues.missingImage.push({ id: car.id, name: car.name });
  } else if (car.imageUrl.includes('lineup_360.png')) {
    issues.defaultImage.push({ id: car.id, name: car.name, url: car.imageUrl });
  }
});

// 2. Check for orphan details (in details but not in cars)
const carIds = new Set(carsData.cars.map(c => c.id));
const orphanDetails = Object.keys(detailsData).filter(id => !carIds.has(id));

// 3. Check for duplicate car names within same brand
const brandCars = {};
carsData.cars.forEach(car => {
  const brand = car.brandName || brandMap[car.brandId] || car.brandId;
  if (!brandCars[brand]) brandCars[brand] = [];
  brandCars[brand].push(car);
});
for (const [brand, cars] of Object.entries(brandCars)) {
  const names = cars.map(c => c.name);
  const dupes = names.filter((n, i) => names.indexOf(n) !== i);
  if (dupes.length > 0) {
    issues.duplicateNames.push({ brand, duplicates: [...new Set(dupes)] });
  }
}

// Print report
console.log('='.repeat(80));
console.log('  데이터 무결성 검사 보고서');
console.log('='.repeat(80));

console.log(`\n총 차량: ${carsData.cars.length}대`);
console.log(`총 브랜드: ${carsData.brands.length}개`);
console.log(`디테일 엔트리: ${Object.keys(detailsData).length}개`);
console.log(`서브모델 엔트리: ${Object.keys(subModelsData).length}개`);

console.log('\n--- 심각한 문제 (배포 전 필수 수정) ---\n');

console.log(`1. brandName 누락: ${issues.missingBrandName.length}대`);
if (issues.missingBrandName.length > 0) {
  const byBrand = {};
  issues.missingBrandName.forEach(c => {
    if (!byBrand[c.expectedBrandName]) byBrand[c.expectedBrandName] = [];
    byBrand[c.expectedBrandName].push(c.id + ':' + c.name);
  });
  for (const [brand, cars] of Object.entries(byBrand)) {
    console.log(`  ${brand} (${cars.length}대): ${cars.join(', ')}`);
  }
}

console.log(`\n2. grades 배열 누락: ${issues.missingGrades.length}대`);
if (issues.missingGrades.length > 0) {
  issues.missingGrades.slice(0, 10).forEach(c => {
    console.log(`  ${c.id}: ${c.name} (gradeCount=${c.gradeCount}, detailTrims=${c.detailTrimsCount})`);
  });
  if (issues.missingGrades.length > 10) console.log(`  ... 외 ${issues.missingGrades.length - 10}대`);
}

console.log(`\n3. 색상 데이터 없음: ${issues.missingColors.length}대`);
issues.missingColors.forEach(c => console.log(`  ${c.brand} ${c.name} (${c.id})`));

console.log(`\n4. 이미지 없음: ${issues.missingImage.length}대`);
console.log(`   기본 이미지: ${issues.defaultImage.length}대`);
issues.defaultImage.forEach(c => console.log(`  ${c.id}: ${c.name}`));

console.log('\n--- 경고 수준 ---\n');

console.log(`5. 옵션 데이터 없음: ${issues.missingOptions.length}대`);
const optByBrand = {};
issues.missingOptions.forEach(c => {
  if (!optByBrand[c.brand]) optByBrand[c.brand] = [];
  optByBrand[c.brand].push(c.name);
});
for (const [brand, cars] of Object.entries(optByBrand)) {
  console.log(`  ${brand} (${cars.length}대): ${cars.join(', ')}`);
}

console.log(`\n6. 서브모델 누락: ${issues.missingSubModels.length}대`);
issues.missingSubModels.forEach(c => console.log(`  ${c.id}: ${c.name}`));

console.log(`\n7. 가격 0원 트림 존재: ${issues.zeroPriceTrim.length}대`);
issues.zeroPriceTrim.forEach(c => console.log(`  ${c.id}: ${c.name} (${c.zeroPriceCount}/${c.total} trims)`));

console.log(`\n8. 디테일 브랜드 불일치: ${issues.detailBrandMismatch.length}대`);
issues.detailBrandMismatch.forEach(c => console.log(`  ${c.id}: ${c.name} (car:${c.carBrand} != detail:${c.detailBrand})`));

console.log(`\n9. 고아 디테일 (cars에 없는 detail): ${orphanDetails.length}개`);
orphanDetails.forEach(id => {
  const d = detailsData[id];
  console.log(`  ${id}: ${d.name || 'unknown'} (${d.brand || 'unknown'})`);
});

console.log(`\n10. 중복 차량명: ${issues.duplicateNames.length}건`);
issues.duplicateNames.forEach(d => console.log(`  ${d.brand}: ${d.duplicates.join(', ')}`));

// Save full report as JSON
const reportPath = path.join(__dirname, 'data-integrity-report.json');
fs.writeFileSync(reportPath, JSON.stringify(issues, null, 2), 'utf8');
console.log(`\n전체 보고서: ${reportPath}`);
