const fs = require('fs');
const path = require('path');

const detailsPath = path.join(__dirname, '..', 'src', 'constants', 'generated-car-details.json');
const details = JSON.parse(fs.readFileSync(detailsPath, 'utf8'));

// Check current state of 4399
const porter = details['4399'];
console.log('Current Porter2 EV options:', JSON.stringify(porter.selectableOptions, null, 2));

// Fix: add id fields
if (porter.selectableOptions && porter.selectableOptions.length > 0) {
  porter.selectableOptions = porter.selectableOptions.map((opt, i) => ({
    id: `opt_${i}`,
    name: opt.name,
    price: opt.price,
    description: opt.description || '',
  }));

  console.log('\nFixed Porter2 EV options:', JSON.stringify(porter.selectableOptions, null, 2));
  fs.writeFileSync(detailsPath, JSON.stringify(details, null, 2), 'utf8');
  console.log('\nSaved!');
} else {
  console.log('No options to fix');
}
