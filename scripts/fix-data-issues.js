const fs = require("fs");
const path = require("path");

const carsPath = path.join(__dirname, "../src/constants/generated-cars.json");
const detailsPath = path.join(__dirname, "../src/constants/generated-car-details.json");

const carsData = JSON.parse(fs.readFileSync(carsPath, "utf8"));
const detailsData = JSON.parse(fs.readFileSync(detailsPath, "utf8"));

// brandId -> brandName mapping from scrape-missing-cars.js
const BRAND_MAP = {
  benz: "벤츠",
  bmw: "BMW",
  audi: "아우디",
  landrover: "랜드로버",
  volvo: "볼보",
  porsche: "포르쉐",
  kia: "기아",
  cadillac: "캐딜락",
  genesis: "제네시스",
  gmc: "GMC",
  kgm: "KGM",
  lexus: "렉서스",
  peugeot: "푸조",
  polestar: "폴스타",
  toyota: "토요타",
  "르노코리아": "르노코리아",
  "쉐보레": "쉐보레",
  "테슬라": "테슬라",
  hyundai: "현대",
  honda: "혼다",
  jeep: "지프",
  lincoln: "링컨",
};

let fixedBrandName = 0;
let fixedGrades = 0;
let fixedImages = 0;

// FIX 1: Add brandName to cars missing it
// FIX 2: Add grades array to cars missing it
carsData.cars.forEach(car => {
  // Fix brandName
  if (!car.brandName && car.brandId) {
    const name = BRAND_MAP[car.brandId];
    if (name) {
      car.brandName = name;
      fixedBrandName++;
    } else {
      console.log("WARNING: No brand mapping for brandId=" + car.brandId + " car=" + car.name);
    }
  }

  // Fix grades - derive from car-details trims
  if (!car.grades || car.grades.length === 0) {
    const detail = detailsData[car.id];
    if (detail && detail.trims && detail.trims.length > 0) {
      // Extract unique grade names from trims
      const gradeNames = new Set();
      const grades = [];
      detail.trims.forEach(trim => {
        const gradeName = trim.grade || trim.name;
        if (gradeName && !gradeNames.has(gradeName)) {
          gradeNames.add(gradeName);
          grades.push({ name: gradeName, trimCount: 1 });
        } else if (gradeName) {
          const existing = grades.find(g => g.name === gradeName);
          if (existing) existing.trimCount++;
        }
      });
      if (grades.length > 0) {
        car.grades = grades;
        car.gradeCount = grades.length;
        fixedGrades++;
      }
    }
  }
});

// FIX 3: Fix broken image URLs (코나 4361, 포터2 EV 4399)
// These return 404 because they use color_11_360.png pattern
// Find correct images from the details data or use lineup pattern
const brokenImages = [
  { id: "4361", name: "코나" },
  { id: "4399", name: "포터2 EV" },
];

brokenImages.forEach(({ id, name }) => {
  const car = carsData.cars.find(c => String(c.id) === id);
  const detail = detailsData[id];

  if (car) {
    // Try to get first color image from details
    if (detail && detail.colorImages && detail.colorImages.length > 0) {
      const firstColor = detail.colorImages[0];
      if (firstColor.imageUrl) {
        console.log("Fix image for " + name + " (" + id + "): " + car.imageUrl + " -> " + firstColor.imageUrl);
        car.imageUrl = firstColor.imageUrl;
        fixedImages++;
      }
    } else {
      // Fallback: use lineup image pattern
      const lineupUrl = "https://autoimg.danawa.com/photo/" + id + "/lineup_11_360.png";
      console.log("Fix image for " + name + " (" + id + "): " + car.imageUrl + " -> " + lineupUrl + " (lineup fallback)");
      car.imageUrl = lineupUrl;
      fixedImages++;
    }
  }

  // Also fix in details
  if (detail) {
    if (detail.colorImages && detail.colorImages.length > 0) {
      // Detail already has color images, use first one as main image
      if (detail.imageUrl && detail.imageUrl.includes("color_11_360")) {
        detail.imageUrl = detail.colorImages[0].imageUrl || detail.imageUrl;
      }
    }
  }
});

// Save fixed data
fs.writeFileSync(carsPath, JSON.stringify(carsData, null, 2));
fs.writeFileSync(detailsPath, JSON.stringify(detailsData, null, 2));

console.log("\n=== 수정 완료 ===");
console.log("1. brandName 추가: " + fixedBrandName + "대");
console.log("2. grades 배열 생성: " + fixedGrades + "대");
console.log("3. 깨진 이미지 URL 수정: " + fixedImages + "대");
console.log("\n수정된 파일:");
console.log("  - src/constants/generated-cars.json");
console.log("  - src/constants/generated-car-details.json");
