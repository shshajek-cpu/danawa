const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'page-4435.html'), 'utf8');
const lines = html.split('\n');
const bigLine = lines[926] || '';

// Save the big line prettified
const formatted = bigLine
  .replace(/<div/g, '\n<div')
  .replace(/<\/div>/g, '</div>\n')
  .replace(/<h4/g, '\n<h4')
  .replace(/<\/h4>/g, '</h4>\n')
  .replace(/<input/g, '\n<input')
  .replace(/<span/g, '\n<span')
  .replace(/<label/g, '\n<label');

// Extract article-box__header sections
const headerPattern = /article-box__header[\s\S]*?<h4[^>]*class="title"[^>]*>([\s\S]*?)<\/h4>/g;
let m;
let idx = 0;
console.log('=== 라인업 헤더 (article-box__header > h4.title) ===');
while ((m = headerPattern.exec(bigLine)) !== null) {
  idx++;
  const title = m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  console.log('#' + idx + ': ' + title);
}

// Also look at full JavaScript for lineup names
// Look for the Ajax response structure that includes lineup names
console.log('\n=== AJAX URL 패턴 검색 ===');
const ajaxPattern = /ajax_trimsInfo[^"']*/g;
while ((m = ajaxPattern.exec(html)) !== null) {
  console.log(m[0].substring(0, 200));
}

// Check the og:title to see what lineup is shown by default
const ogTitle = html.match(/og:title[^>]*content="([^"]+)"/);
if (ogTitle) console.log('\nog:title:', ogTitle[1]);

// Now let's get the lineup code structure
// code="303443553355" → brand=303, model=4435, lineup=53355
const codePattern = /eChkTrimList[^>]*code="(\d+)"/g;
const lineupCodes = [];
while ((m = codePattern.exec(bigLine)) !== null) {
  const code = m[1];
  // Parse the code: first 3 = brand, next 4 = model, last 5 = lineup
  const brand = code.substring(0, 3);
  const model = code.substring(3, 7);
  const lineup = code.substring(7, 12);
  lineupCodes.push({ code, brand, model, lineup });
}
console.log('\n=== 라인업 코드 구조 ===');
lineupCodes.forEach(c => console.log('  code=' + c.code + ' → brand:' + c.brand + ', model:' + c.model + ', lineup:' + c.lineup));

// Check what's in the article-box heading area - more broadly
const blockStarts = [];
let searchPos = 0;
while (true) {
  const pos = bigLine.indexOf('eChkTrimList', searchPos);
  if (pos === -1) break;
  blockStarts.push(pos);
  searchPos = pos + 1;
}

console.log('\n=== 각 라인업 블록 시작부분 (300자) ===');
blockStarts.forEach((pos, i) => {
  const snippet = bigLine.substring(pos, pos + 500).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  console.log('#' + (i+1) + ': ' + snippet.substring(0, 250));
  console.log('');
});

// Check for the AJAX endpoint that returns lineup data
console.log('\n=== 라인업 AJAX 엔드포인트 검색 ===');
const endpointPattern = /estimateTrimsListHtml|estimateLineupHtml|ajax_trimsInfo/g;
while ((m = endpointPattern.exec(html)) !== null) {
  const context = html.substring(Math.max(0, m.index - 50), m.index + 200);
  console.log(context.replace(/\s+/g, ' ').substring(0, 200));
  console.log('---');
}
