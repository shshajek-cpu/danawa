// Fix specific edge cases identified during review
const fs = require('fs');
const path = require('path');

const detailsPath = path.join(__dirname, '../src/constants/generated-car-details.json');
const details = JSON.parse(fs.readFileSync(detailsPath, 'utf8'));

let fixed = 0;

// Fix 1: 현대 아반떼 color with hex #6e2727 was wrongly mapped to "퍼포먼스 블루"
// #6e2727 is dark red/maroon, not blue
if (details['4455'] && details['4455'].colorImages) {
  details['4455'].colorImages.forEach(ci => {
    if (ci.hex === '#6e2727' && ci.name === '퍼포먼스 블루') {
      console.log('[현대 더 뉴 아반떼] "퍼포먼스 블루" (#6e2727) -> "어비스 블랙 펄 / 레드" (dark maroon)');
      ci.name = '다크 레드 메탈릭';
      fixed++;
    }
  });
}

// Fix 2: 제네시스 GV60 MAGMA - "스토르 그린" was incorrectly changed to "비크 블랙"
// #0d1613 has a green tint, GV60 MAGMA "Storm Green" is a valid special edition color
if (details['4761'] && details['4761'].colorImages) {
  details['4761'].colorImages.forEach(ci => {
    if (ci.hex === '#0d1613' && ci.name === '비크 블랙 (NXX)-블랙전용') {
      console.log('[제네시스 GV60 MAGMA] "비크 블랙 (NXX)-블랙전용" (#0d1613) -> "스토르 그린" (original)');
      ci.name = '스토르 그린';
      fixed++;
    }
  });
}

// Fix 3: 벤츠 C-클래스 color_23 (#c0999a) was mapped to "Sakhir Gold Metallic"
// #c0999a is dusty rose/pink, not gold
if (details['4037'] && details['4037'].colorImages) {
  details['4037'].colorImages.forEach(ci => {
    if (ci.hex === '#c0999a' && ci.name === 'Sakhir Gold Metallic') {
      console.log('[벤츠 C-클래스] "Sakhir Gold Metallic" (#c0999a) -> "로즈 메탈릭"');
      ci.name = '로즈 메탈릭';
      fixed++;
    }
  });
}

// Fix 4: 렉서스 UX color_24 (#9d584d) mapped to "얼씨 브래스 메탈릭 매트"
// #9d584d is a brownish-red, not brass
if (details['3688'] && details['3688'].colorImages) {
  details['3688'].colorImages.forEach(ci => {
    if (ci.hex === '#9d584d' && ci.name === '얼씨 브래스 메탈릭 매트') {
      console.log('[렉서스 UX] "얼씨 브래스 메탈릭 매트" (#9d584d) -> "테라코타 브라운"');
      ci.name = '테라코타 브라운';
      fixed++;
    }
  });
}

if (fixed > 0) {
  fs.writeFileSync(detailsPath, JSON.stringify(details, null, 2), 'utf8');
  console.log('\n총 ' + fixed + '개 수정, 저장 완료');
} else {
  console.log('수정 필요 없음');
}
