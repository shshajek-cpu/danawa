const fs = require('fs');
const path = require('path');

const carsPath = path.join(__dirname, '..', 'src', 'constants', 'generated-cars.json');
const detailsPath = path.join(__dirname, '..', 'src', 'constants', 'generated-car-details.json');
const carsData = JSON.parse(fs.readFileSync(carsPath, 'utf8'));
const detailsData = JSON.parse(fs.readFileSync(detailsPath, 'utf8'));

// Known correct names from Danawa (modelId -> Korean name)
const NAME_MAP = {
  // 벤츠
  '4516': 'E-클래스', '4373': 'GLC-클래스', '4471': 'GLE-클래스',
  '3992': 'S-클래스', '4555': 'CLE', '4629': 'G-클래스',
  '4507': 'GLS-클래스', '4461': 'CLA-클래스', '4496': 'GLB-클래스',
  '4427': 'A-클래스', '4569': 'EQB', '4568': 'EQA',
  '4011': 'Maybach S-클래스', '4508': 'Maybach GLS',
  '4495': 'GLA-클래스', '4566': 'The New AMG GT', '3982': 'AMG GT',
  '4638': 'Electric G-클래스', '4111': 'EQE', '4511': 'Maybach EQS SUV',
  '4670': 'Maybach SL', '4380': 'SL-클래스',
  // BMW
  '4517': '5시리즈', '4656': 'X3', '4650': '3시리즈',
  '4476': 'X6', '4072': 'X4', '4652': '1시리즈',
  '4683': '2시리즈 그란쿠페', '4655': 'M2', '4171': '8시리즈',
  '4657': 'M5', '4649': 'M3', '4582': 'iX2',
  '3803': '2시리즈', '4479': 'X5 M', '4639': 'i4', '4073': 'X4 M',
  // 아우디
  '3668': 'Q3', '4062': 'Q4 e-tron', '4431': 'A8', '4436': 'Q8 e-tron',
  // 랜드로버
  '3775': '디펜더', '4119': '레인지로버', '4472': '레인지로버 벨라',
  '4363': '레인지로버 스포츠', '4551': '레인지로버 이보크',
  '4548': '디스커버리 스포츠',
  // 볼보
  '4747': 'XC60', '4737': 'XC90', '4740': 'S90',
  '4421': 'V60 크로스 컨트리', '4446': 'EX30', '4750': 'EX30 CC',
  // 포르쉐
  '4619': '타이칸', '4506': '카이엔', '4651': 'The New 911',
  '4613': '마칸 일렉트릭',
  // 기아
  '4763': '디 올 뉴 셀토스', '3772': '봉고 3', '4499': 'EV5', '4404': '봉고 3 EV',
  // 기타
  '4565': '에스컬레이드 IQ', '4705': 'Electrified GV70',
  '4777': '아카디아', '4779': '캐니언', '4646': '토레스',
  '4635': 'LM', '4700': 'LX',
  '4741': '3008', '4379': '308',
  '4513': '폴스타 4', '4674': '캠리',
  '4560': '아르카나', '4632': '세닉 E-테크 일렉트릭',
  '4395': '콜로라도', '4043': 'Model S', '3825': 'Cybertruck',
};

let fixCount = 0;

for (const [id, correctName] of Object.entries(NAME_MAP)) {
  // Fix in cars list
  const car = carsData.cars.find(c => c.id === id);
  if (car && car.name !== correctName) {
    console.log(`  ${car.name} -> ${correctName}`);
    car.name = correctName;
    fixCount++;
  }

  // Fix in details
  if (detailsData[id] && detailsData[id].name !== correctName) {
    detailsData[id].name = correctName;
  }
}

// Also clean up any remaining "신차" suffixes
for (const car of carsData.cars) {
  if (car.name.endsWith(' 신차')) {
    const cleaned = car.name.replace(/ 신차$/, '');
    console.log(`  Cleaning: ${car.name} -> ${cleaned}`);
    car.name = cleaned;
    if (detailsData[car.id]) detailsData[car.id].name = cleaned;
    fixCount++;
  }
}

fs.writeFileSync(carsPath, JSON.stringify(carsData, null, 2), 'utf8');
fs.writeFileSync(detailsPath, JSON.stringify(detailsData, null, 2), 'utf8');

console.log(`\nFixed ${fixCount} car names`);
console.log(`Total cars: ${carsData.cars.length}`);
