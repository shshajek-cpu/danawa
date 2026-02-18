const fs = require('fs');
const path = require('path');

// Brand logo configurations with colors and abbreviations
const brandLogos = {
  'hyundai': { abbr: 'H', color: '#002c5f' },      // Hyundai blue
  'kia': { abbr: 'K', color: '#bb162b' },          // Kia red
  'genesis': { abbr: 'G', color: '#1e1e1e' },      // Genesis black
  'kgm': { abbr: 'KGM', color: '#c8102e' },        // Red
  '르노코리아': { abbr: 'R', color: '#ffcc00' },    // Renault yellow
  '쉐보레': { abbr: 'C', color: '#d9a300' },        // Chevrolet gold
  'bmw': { abbr: 'BMW', color: '#0066b1' },        // BMW blue
  'benz': { abbr: 'MB', color: '#000000' },        // Mercedes black
  'audi': { abbr: 'A', color: '#bb0a30' },         // Audi red
  'volvo': { abbr: 'V', color: '#003057' },        // Volvo blue
  'polestar': { abbr: 'P*', color: '#ffcc00' },    // Polestar gold
  'toyota': { abbr: 'T', color: '#eb0a1e' },       // Toyota red
  'lexus': { abbr: 'L', color: '#000000' },        // Lexus black
  'honda': { abbr: 'H', color: '#cc0000' },        // Honda red
  'porsche': { abbr: 'P', color: '#d5001c' },      // Porsche red
  'landrover': { abbr: 'LR', color: '#005a2b' },   // Land Rover green
  'jeep': { abbr: 'J', color: '#154734' },         // Jeep green
  '테슬라': { abbr: 'T', color: '#cc0000' },        // Tesla red
  'cadillac': { abbr: 'C', color: '#000000' },     // Cadillac black
  'gmc': { abbr: 'GMC', color: '#c8102e' },        // GMC red
  'lincoln': { abbr: 'L', color: '#000000' },      // Lincoln black
  'peugeot': { abbr: 'P', color: '#0057a3' },      // Peugeot blue
};

function createSvgLogo(abbr, color) {
  const fontSize = abbr.length === 1 ? '20' : (abbr.length === 2 ? '16' : '12');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="24" cy="24" r="22" fill="${color}"/><text x="24" y="29" text-anchor="middle" fill="white" font-size="${fontSize}" font-weight="bold" font-family="Arial, sans-serif">${abbr}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

// Read the JSON file
const filePath = path.join(__dirname, 'src', 'constants', 'generated-cars.json');
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

// Update each brand with logoUrl
data.brands = data.brands.map(brand => {
  const config = brandLogos[brand.id];
  if (config) {
    return {
      ...brand,
      logoUrl: createSvgLogo(config.abbr, config.color)
    };
  }
  // Fallback for any missing brands
  return {
    ...brand,
    logoUrl: createSvgLogo(brand.name[0], '#666666')
  };
});

// Write back to file
fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');

console.log('✓ Successfully added logo URLs to all brands');
console.log(`✓ Updated ${data.brands.length} brands`);
