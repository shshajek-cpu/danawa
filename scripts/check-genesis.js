const details = require('../src/constants/generated-car-details.json');
const cars = require('../src/constants/generated-cars.json');

const genesisCars = cars.cars.filter(c => c.brandId === 'genesis');
genesisCars.forEach(c => {
  const d = details[c.id];
  if (!d) { console.log('[제네시스] ' + c.name + ' (ID:' + c.id + ') - 디테일 없음'); return; }
  console.log('\n=== [제네시스] ' + c.name + ' (ID:' + c.id + ') ===');
  console.log('트림 수:', d.trims ? d.trims.length : 0);
  if (d.trims) d.trims.forEach(t => console.log('  - ' + t.name + ' = ' + (t.price/10000).toFixed(0) + '만원'));
  console.log('색상 수:', d.colorImages ? d.colorImages.length : 0);
  if (d.colorImages) d.colorImages.forEach(ci => console.log('  - ' + (ci.name || ci.id) + (ci.price ? ' (+' + (ci.price/10000) + '만)' : '')));
  console.log('옵션 수:', d.selectableOptions ? d.selectableOptions.length : 0);
  if (d.selectableOptions) d.selectableOptions.slice(0,5).forEach(o => console.log('  - ' + o.name + ' = ' + (o.price/10000).toFixed(0) + '만원'));
  if (d.selectableOptions && d.selectableOptions.length > 5) console.log('  ... 외 ' + (d.selectableOptions.length - 5) + '개');
});
