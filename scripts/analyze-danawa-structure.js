const fs = require('fs');
const path = require('path');

// Read the saved HTML for Santa Fe
const html = fs.readFileSync(path.join(__dirname, 'page-4435.html'), 'utf8');

// Extract lineup data from JavaScript variables
const lineupRankPattern = /estmModelLineupRank\['M(\d+)L(\d+)'\]\s*=\s*'(\d+)`(\d+)'/g;
const lineups = [];
let m;
while ((m = lineupRankPattern.exec(html)) !== null) {
  lineups.push({ modelId: m[1], lineupId: m[2], rank: parseInt(m[3]), trimCount: parseInt(m[4]) });
}
console.log('=== 싼타페(4435) 라인업 ===');
console.log('라인업 수:', lineups.length);
lineups.forEach(l => console.log('  Lineup ' + l.lineupId + ' (rank:' + l.rank + ', trims:' + l.trimCount + ')'));

// Extract trim-lineup mapping
const trimRankPattern = /estmLineupTrimRank\['L(\d+)T(\d+)'\]\s*=\s*'(\d+)`(\d+)'/g;
const trimsByLineup = {};
while ((m = trimRankPattern.exec(html)) !== null) {
  const lineupId = m[1];
  const trimId = m[2];
  const rank = parseInt(m[3]);
  if (!trimsByLineup[lineupId]) trimsByLineup[lineupId] = [];
  trimsByLineup[lineupId].push({ trimId, rank });
}
console.log('\n=== 라인업별 트림 수 ===');
for (const [lid, trims] of Object.entries(trimsByLineup)) {
  console.log('  Lineup ' + lid + ': ' + trims.length + '개 트림');
}

// Extract lineup names - search in the entire HTML
// The big line 927 contains the trim list UI
const lines = html.split('\n');
const bigLine = lines[926] || '';

console.log('\n=== Line 927 길이:', bigLine.length, '===');

// Search for patterns that identify lineup names
// Pattern: data-no="53355" or similar attributes followed by lineup name
const dataNoPattern = /data-no="(\d{5})"[^>]*>([^<]+)/g;
while ((m = dataNoPattern.exec(bigLine)) !== null) {
  console.log('data-no: ' + m[1] + ' → ' + m[2].trim());
}

// Search for choice-lineup patterns
const choicePattern = /choice-lineup[^"]*"[^>]*>([\s\S]*?)<\/(?:div|li|span|a)/g;
while ((m = choicePattern.exec(bigLine)) !== null) {
  console.log('choice-lineup: ' + m[1].replace(/<[^>]+>/g, '').trim().substring(0, 100));
}

// Look for the lineup select element
const selectPattern = /<select[^>]*>([\s\S]*?)<\/select>/g;
while ((m = selectPattern.exec(bigLine)) !== null) {
  const optPattern = /<option[^>]*value="([^"]*)"[^>]*>([^<]*)/g;
  let opt;
  let hasLineup = false;
  const options = [];
  while ((opt = optPattern.exec(m[1])) !== null) {
    options.push({ value: opt[1], label: opt[2].trim() });
    if (/5335|5232|lineup|가솔린|디젤|하이브리드/.test(opt[1] + opt[2])) hasLineup = true;
  }
  if (hasLineup || options.length > 2) {
    console.log('\nSELECT 발견 (' + options.length + '개 옵션):');
    options.forEach(o => console.log('  value="' + o.value + '": ' + o.label));
  }
}

// Look for radio buttons with lineup info
const radioPattern = /input[^>]*type="radio"[^>]*name="([^"]*)"[^>]*value="([^"]*)"[^>]*id="([^"]*)"[^>]*>/g;
const radioGroups = {};
while ((m = radioPattern.exec(bigLine)) !== null) {
  const name = m[1];
  if (!radioGroups[name]) radioGroups[name] = [];
  radioGroups[name].push({ value: m[2], id: m[3] });
}
console.log('\n=== Radio Groups in trim section ===');
for (const [name, radios] of Object.entries(radioGroups)) {
  console.log(name + ': ' + radios.length + '개');
  radios.slice(0, 5).forEach(r => console.log('  id=' + r.id + ' value=' + r.value));
  if (radios.length > 5) console.log('  ...' + (radios.length - 5) + '개 더');
}

// Extract a portion of the HTML structure around trim/grade selection
// Let's look for the structure between "세부모델" and "색상"
const startIdx = bigLine.indexOf('세부모델');
const endIdx = bigLine.indexOf('색상', startIdx + 1);
if (startIdx > -1) {
  const snippet = bigLine.substring(startIdx, Math.min(startIdx + 2000, endIdx > -1 ? endIdx : startIdx + 2000));
  // Remove inline styles and clean up
  const cleaned = snippet.replace(/style="[^"]*"/g, '').replace(/\s+/g, ' ');
  console.log('\n=== 세부모델 영역 (처음 2000자) ===');
  console.log(cleaned);
}
