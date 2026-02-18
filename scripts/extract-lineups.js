const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'page-4435.html'), 'utf8');
const lines = html.split('\n');
const bigLine = lines[926] || '';

// Extract lineup blocks: eChkTrimList with code attribute
// Pattern: <div class="eChkTrimList article-box article-box--open" code="303443553355">
// Then find the heading: article-box__heading
// Then find trims within each block

// Split by eChkTrimList blocks
const blocks = bigLine.split(/(?=<div[^>]*class="[^"]*eChkTrimList[^"]*")/);

console.log('=== 라인업 블록 수:', blocks.length - 1, '(첫번째는 앞부분) ===\n');

for (let i = 1; i < blocks.length; i++) {
  const block = blocks[i];

  // Extract code attribute
  const codeMatch = block.match(/code="(\d+)"/);
  const code = codeMatch ? codeMatch[1] : 'unknown';

  // Extract lineup ID from code (last 5 digits before trim digits)
  // Code format: 303 (brand) + 4435 (model) + 53355 (lineup)
  // Or: brandCode + modelId + lineupId + trimId

  // Extract heading/title
  const headingMatch = block.match(/article-box__heading[^>]*>([\s\S]*?)<\/div/);
  let heading = '';
  if (headingMatch) {
    heading = headingMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  // Alternative: look for the title within the first 500 chars
  const titleMatch = block.substring(0, 1000).match(/<span[^>]*class="[^"]*tit[^"]*"[^>]*>([^<]+)/);
  const title = titleMatch ? titleMatch[1].trim() : '';

  // Look for any descriptive text in the heading area
  const descMatch = block.substring(0, 1000).match(/class="txt[^"]*"[^>]*>([^<]+)/);
  const desc = descMatch ? descMatch[1].trim() : '';

  // Extract trims
  const trimPattern = /id="trim_(\d+)"[^>]*code="([^"]*)"[\s\S]*?choice__info[\s\S]*?<span[^>]*class="txt"[^>]*>([^<]+)[\s\S]*?<span[^>]*class="num"[^>]*>([^<]+)/g;
  const trims = [];
  let m;
  while ((m = trimPattern.exec(block)) !== null) {
    trims.push({
      trimId: m[1],
      trimCode: m[2],
      name: m[3].trim(),
      price: parseInt(m[4].replace(/,/g, '')) * 10000,
    });
  }

  // Extract fuel type info
  const fuelMatch = block.match(/가솔린|디젤|하이브리드|전기|수소|LPG/);

  // Extract lineup name from a broader pattern
  const labelMatch = block.substring(0, 2000).match(/article-box__heading[\s\S]*?<span[^>]*>([^<]+)/);

  console.log('--- 라인업 #' + i + ' ---');
  console.log('code:', code);
  console.log('heading:', heading.substring(0, 150));
  console.log('title:', title);
  console.log('label:', labelMatch ? labelMatch[1].trim() : 'N/A');
  console.log('desc:', desc);
  console.log('fuel:', fuelMatch ? fuelMatch[0] : 'N/A');
  console.log('트림 수:', trims.length);
  trims.forEach(t => console.log('  ' + t.name + ' → ' + (t.price / 10000).toLocaleString() + '만원 (trimId:' + t.trimId + ')'));
  console.log('');
}

// Also extract from the full HTML - look for lineup names in JavaScript
console.log('\n=== JavaScript에서 라인업 정보 추출 ===');

// Look for the estmDataAuto array
const estmDataMatch = html.match(/var\s+estmDataAuto\s*=\s*(\[[\s\S]*?\]);/);
if (estmDataMatch) {
  try {
    const data = JSON.parse(estmDataMatch[1]);
    console.log('estmDataAuto 항목 수:', data.length);
    if (data.length > 0) {
      console.log('첫 항목 키:', Object.keys(data[0]).join(', '));
      console.log('첫 항목:', JSON.stringify(data[0]).substring(0, 300));
    }
  } catch(e) {
    console.log('JSON parse failed, extracting manually...');
    console.log(estmDataMatch[1].substring(0, 500));
  }
}

// Look for lineup name mapping in JavaScript
const lineupNamePattern = /lineupNm\[(\d+)\]\s*=\s*['"]([^'"]+)['"]/g;
while ((m = lineupNamePattern.exec(html)) !== null) {
  console.log('lineupNm[' + m[1] + '] = ' + m[2]);
}

// Alternative: look for the lineup select dropdown or naming in the full page
const fullLineupPattern = /53355[^;]*?[가-힣][가-힣\s\d.]+/g;
const lineupContexts = [];
while ((m = fullLineupPattern.exec(html)) !== null) {
  lineupContexts.push(m[0].substring(0, 100));
}
if (lineupContexts.length > 0) {
  console.log('\n53355 주변 한글 텍스트:');
  lineupContexts.slice(0, 5).forEach(c => console.log('  ' + c));
}
