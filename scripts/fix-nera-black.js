// Fix "Nera Black" → Korean name for domestic brand cars
// "Nera Black" is an Italian color name from imported cars (e.g., Maserati)
// Korean brands should use Korean color names

const fs = require('fs');
const path = require('path');

const detailsPath = path.join(__dirname, '../src/constants/generated-car-details.json');
const carsPath = path.join(__dirname, '../src/constants/generated-cars.json');

const details = JSON.parse(fs.readFileSync(detailsPath, 'utf8'));
const cars = JSON.parse(fs.readFileSync(carsPath, 'utf8'));

const koreanBrands = ['현대', '기아', '제네시스', 'KGM', '쉐보레', '르노코리아'];

let fixed = 0;
for (const [id, d] of Object.entries(details)) {
  const car = cars.cars.find(x => x.id === id);
  if (!car) continue;

  const isKorean = koreanBrands.includes(car.brandName);
  if (!isKorean) continue;

  if (d.colorImages) {
    d.colorImages.forEach(ci => {
      if (ci.name === 'Nera Black') {
        console.log('[' + car.brandName + ' ' + car.name + '] "Nera Black" -> "블랙"');
        ci.name = '블랙';
        fixed++;
      }
    });
  }
}

if (fixed > 0) {
  fs.writeFileSync(detailsPath, JSON.stringify(details, null, 2), 'utf8');
  console.log('\n총 ' + fixed + '개 수정, 저장 완료');
} else {
  console.log('수정 필요 없음');
}
