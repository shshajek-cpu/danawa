const d = require('../src/constants/generated-car-details.json');
const c = require('../src/constants/generated-cars.json');

// Find all placeholder colors
let placeholders = [];
for (const [id, det] of Object.entries(d)) {
  if (det.colorImages) {
    det.colorImages.forEach((ci, idx) => {
      if (ci.id && ci.id.startsWith('color_') && (ci.name === '' || ci.name === undefined || ci.name === null || (ci.name && ci.name.startsWith('color_')))) {
        const car = c.cars.find(x => x.id === id);
        placeholders.push({ carId: id, brand: car ? car.brandName : '', carName: car ? car.name : '', colorId: ci.id, colorName: ci.name || '', hex: ci.hex || '', idx });
      }
    });
  }
}

// Find all duplicate colors
let dupes = [];
for (const [id, det] of Object.entries(d)) {
  if (det.colorImages && det.colorImages.length > 1) {
    const seen = {};
    det.colorImages.forEach((ci, i) => {
      const n = ci.name || ci.id;
      if (seen[n] !== undefined) {
        const car = c.cars.find(x => x.id === id);
        dupes.push({ carId: id, brand: car ? car.brandName : '', carName: car ? car.name : '', colorName: n, firstIdx: seen[n], dupIdx: i });
      } else {
        seen[n] = i;
      }
    });
  }
}

// Find cars with 0 colors
let noColors = [];
for (const [id, det] of Object.entries(d)) {
  if (det.colorImages === undefined || det.colorImages === null || det.colorImages.length === 0) {
    const car = c.cars.find(x => x.id === id);
    noColors.push({ carId: id, brand: car ? car.brandName : '', carName: car ? car.name : '' });
  }
}

// Find cars with 0 options
let noOpts = [];
for (const [id, det] of Object.entries(d)) {
  if (det.selectableOptions === undefined || det.selectableOptions === null || det.selectableOptions.length === 0) {
    const car = c.cars.find(x => x.id === id);
    noOpts.push({ carId: id, brand: car ? car.brandName : '', carName: car ? car.name : '' });
  }
}

console.log(JSON.stringify({ placeholders, dupes, noColors, noOpts }, null, 2));
