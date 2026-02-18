const c = require('../src/constants/generated-cars.json');
const fuelTypes = new Set();
c.cars.forEach(car => fuelTypes.add(car.fuelType));
console.log('All fuel types:', [...fuelTypes]);
console.log('Total cars:', c.cars.length);

// Check sub-models for fuel type data
try {
  const sub = require('../src/constants/sub-models.json');
  let multiCount = 0;
  for (const [id, data] of Object.entries(sub)) {
    const fuels = [...new Set(data.subModels.map(s => s.fuelType))];
    if (fuels.length > 1) {
      const car = c.cars.find(x => x.id === id);
      console.log((car ? car.name : id) + ':', fuels.join(', '));
      multiCount++;
    }
  }
  console.log('Cars with multiple fuel types:', multiCount);
} catch(e) {
  console.log('No sub-models data');
}
