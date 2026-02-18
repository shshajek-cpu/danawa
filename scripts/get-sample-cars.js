const details = require('../src/constants/generated-car-details.json');
const cars = require('../src/constants/generated-cars.json');

const noOpts = [];
for (const [id, d] of Object.entries(details)) {
  if (!d.selectableOptions || d.selectableOptions.length === 0) {
    const car = cars.cars.find(x => x.id === id);
    noOpts.push({ id, brand: d.brand || (car ? car.brandName : ''), name: d.name || (car ? car.name : '') });
  }
}

// Sample from different brands
const sample = [
  noOpts.find(c => c.name.includes('포터')),
  noOpts.find(c => c.brand === 'BMW' && c.name.includes('X1')),
  noOpts.find(c => c.brand === '아우디' && c.name.includes('A5')),
  noOpts.find(c => c.brand === '토요타' && c.name.includes('RAV4')),
  noOpts.find(c => c.brand === '벤츠' && c.name.includes('C-클래스')),
  noOpts.find(c => c.brand === '렉서스' && c.name.includes('NX')),
  noOpts.find(c => c.brand === '혼다' && c.name.includes('어코드')),
].filter(Boolean);

// Add 코나 as control (has options)
const kona = Object.entries(details).find(([id, d]) => d.name && d.name.includes('코나'));
if (kona) sample.push({ id: kona[0], brand: '현대', name: kona[1].name, control: true });

console.log(JSON.stringify(sample, null, 2));
console.log('\nTotal missing options:', noOpts.length);
