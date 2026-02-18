const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'page-4435.html'), 'utf8');
const lines = html.split('\n');
const bigLine = lines[926] || '';

// Save line 927 to a separate file for analysis
fs.writeFileSync(path.join(__dirname, 'line927.html'), bigLine, 'utf8');

// Extract ALL class names from the line
const classPattern = /class="([^"]+)"/g;
const allClasses = new Set();
let m;
while ((m = classPattern.exec(bigLine)) !== null) {
  m[1].split(/\s+/).forEach(c => allClasses.add(c));
}

// Filter for interesting class names
const interesting = [...allClasses].filter(c =>
  /trim|grade|lineup|fuel|model|choice|select|option|type|name|price|car/i.test(c)
).sort();

console.log('=== 관련 CSS 클래스 ===');
interesting.forEach(c => console.log('  ' + c));

// Extract the HTML structure with indentation
// Look for the major sections
console.log('\n=== HTML 구조 (주요 div/section) ===');

// Find first 3000 chars of the big line but formatted
const formatted = bigLine.substring(0, 5000)
  .replace(/></g, '>\n<')
  .split('\n')
  .filter(l => l.includes('class=') || l.includes('id='))
  .slice(0, 50)
  .map(l => l.trim().substring(0, 120));
formatted.forEach(l => console.log(l));

// Also look for specific attributes
console.log('\n=== data-* attributes ===');
const dataAttrPattern = /data-([a-z]+)="([^"]+)"/g;
const dataAttrs = {};
while ((m = dataAttrPattern.exec(bigLine)) !== null) {
  const key = m[1];
  if (!dataAttrs[key]) dataAttrs[key] = new Set();
  dataAttrs[key].add(m[2].substring(0, 50));
}
for (const [key, values] of Object.entries(dataAttrs)) {
  if (values.size <= 20) {
    console.log('data-' + key + ' (' + values.size + '): ' + [...values].slice(0, 5).join(', '));
  } else {
    console.log('data-' + key + ' (' + values.size + '): [too many]');
  }
}

// Try to find the trim names by looking around "trim_" IDs
console.log('\n=== trim_ 관련 context ===');
const trimIdPattern = /trim_(\d+)/g;
const trimIds = [];
while ((m = trimIdPattern.exec(bigLine)) !== null) {
  trimIds.push({ id: m[1], pos: m.index });
}
console.log('trim_ ID count:', trimIds.length);

// For each trim ID, extract surrounding context
trimIds.slice(0, 5).forEach(t => {
  const start = Math.max(0, t.pos - 200);
  const end = Math.min(bigLine.length, t.pos + 200);
  const context = bigLine.substring(start, end).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  console.log('\ntrim_' + t.id + ':');
  console.log('  ' + context.substring(0, 200));
});
