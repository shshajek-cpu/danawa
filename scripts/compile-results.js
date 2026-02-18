const fs = require("fs");
const path = require("path");

const groups = ["domestic", "german", "other"];
const allResults = [];

groups.forEach(g => {
  const fp = path.join(__dirname, "verify-" + g + "-results.json");
  const data = JSON.parse(fs.readFileSync(fp, "utf8"));
  allResults.push(...data);
});

const ok = allResults.filter(r => r.status === "OK").length;
const warn = allResults.filter(r => r.status === "WARN").length;
const fail = allResults.filter(r => r.status === "FAIL").length;
const err = allResults.filter(r => r.status === "ERROR").length;
console.log("=== 전체 검증 결과 요약 ===");
console.log("총 차량: " + allResults.length + "대");
console.log("OK: " + ok + " | WARN: " + warn + " | FAIL: " + fail + " | ERROR: " + err);

const byBrand = {};
allResults.forEach(r => {
  const b = r.brandName || "Unknown";
  if (byBrand[b] === undefined) byBrand[b] = {ok:0, warn:0, fail:0, err:0, cars:[]};
  if (r.status === "OK") byBrand[b].ok++;
  else if (r.status === "WARN") byBrand[b].warn++;
  else if (r.status === "FAIL") byBrand[b].fail++;
  else byBrand[b].err++;
  byBrand[b].cars.push(r);
});

console.log("\n=== 브랜드별 요약 ===");
Object.entries(byBrand).sort((a,b) => b[1].fail - a[1].fail).forEach(([brand, data]) => {
  const total = data.ok + data.warn + data.fail + data.err;
  console.log(brand + " (" + total + "대): OK=" + data.ok + " WARN=" + data.warn + " FAIL=" + data.fail + " ERR=" + data.err);
});

const nameIssues = [];
const trimIssues = [];
const colorIssues = [];
const optionIssues = [];
const priceIssues = [];
const gradeIssues = [];

allResults.forEach(r => {
  if (r.issues) {
    r.issues.forEach(i => {
      const entry = {id:r.id, brand:r.brandName, name:r.name, issue:i};
      if (i.startsWith("이름:")) nameIssues.push(entry);
      else if (i.startsWith("트림:")) trimIssues.push(entry);
      else if (i.startsWith("색상:") || i.includes("색상 데이터")) colorIssues.push(entry);
      else if (i.startsWith("옵션:")) optionIssues.push(entry);
      else if (i.startsWith("시작가:")) priceIssues.push(entry);
    });
  }
  if (r.warnings) {
    r.warnings.forEach(w => {
      if (w.includes("grades 배열 누락")) gradeIssues.push({id:r.id, brand:r.brandName, name:r.name});
    });
  }
});

console.log("\n=== 이슈 유형별 상세 ===");

console.log("\n--- 1. 차량명 불일치 (" + nameIssues.length + "건) ---");
nameIssues.forEach(i => console.log("  " + i.brand + " " + i.name + " (" + i.id + "): " + i.issue));

console.log("\n--- 2. 트림 큰 차이 >5 (" + trimIssues.length + "건) ---");
trimIssues.forEach(i => console.log("  " + i.brand + " " + i.name + " (" + i.id + "): " + i.issue));

console.log("\n--- 3. 색상 이슈 (" + colorIssues.length + "건) ---");
colorIssues.forEach(i => console.log("  " + i.brand + " " + i.name + " (" + i.id + "): " + i.issue));

console.log("\n--- 4. 옵션 큰 차이 >5 (" + optionIssues.length + "건) ---");
optionIssues.forEach(i => console.log("  " + i.brand + " " + i.name + " (" + i.id + "): " + i.issue));

console.log("\n--- 5. 시작가 큰 차이 (" + priceIssues.length + "건) ---");
console.log("  (참고: 다나와 페이지 파싱 특성상 만원 단위 가격이 잘못 추출된 경우 많음)");
// Only show cases where the difference makes sense (both in similar range)
priceIssues.forEach(i => console.log("  " + i.brand + " " + i.name + " (" + i.id + "): " + i.issue));

console.log("\n--- 6. grades 배열 누락 (" + gradeIssues.length + "건) ---");
console.log("  (brandName이 없는 78대와 동일 - generated-cars.json에 grades 필드 없음)");

// Count warnings by type
let trimWarns = 0, colorWarns = 0, optWarns = 0, priceWarns = 0;
allResults.forEach(r => {
  if (r.warnings) {
    r.warnings.forEach(w => {
      if (w.startsWith("트림:")) trimWarns++;
      else if (w.startsWith("색상:")) colorWarns++;
      else if (w.startsWith("옵션:")) optWarns++;
      else if (w.startsWith("시작가:")) priceWarns++;
    });
  }
});

console.log("\n=== 경고(WARN) 요약 ===");
console.log("트림 약간 차이(1~5): " + trimWarns + "건");
console.log("색상 약간 차이(1~3): " + colorWarns + "건");
console.log("옵션 약간 차이(1~5): " + optWarns + "건");
console.log("시작가 약간 차이: " + priceWarns + "건");

// Save combined results
fs.writeFileSync(path.join(__dirname, "all-verification-results.json"), JSON.stringify(allResults, null, 2));
console.log("\n전체 결과 저장: scripts/all-verification-results.json");
