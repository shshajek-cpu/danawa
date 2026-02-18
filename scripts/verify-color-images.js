const puppeteer = require("puppeteer");

async function main() {
  const carId = process.argv[2] || "4660";
  console.log("Checking carId:", carId);

  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  await page.setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)");
  await page.setViewport({ width: 1920, height: 1080 });

  await page.goto("https://auto.danawa.com/newcar/?Work=estimate&Model=" + carId, {
    waitUntil: "networkidle2", timeout: 30000
  });
  await new Promise(r => setTimeout(r, 3000));

  // Click first grade
  const gradeClicked = await page.evaluate(() => {
    const radios = document.querySelectorAll("input[name='EstGradeCode']");
    if (radios.length > 0) { radios[0].click(); return true; }
    return false;
  });
  if (gradeClicked) await new Promise(r => setTimeout(r, 3000));

  // Extract all color buttons with their data
  const colors = await page.evaluate(() => {
    const results = [];
    const buttons = document.querySelectorAll("#estimateExteriorColorList .choice-color__item");
    buttons.forEach((btn, i) => {
      const style = btn.getAttribute("style") || "";
      const hexMatch = style.match(/background\s*:\s*(#[0-9a-fA-F]{3,6})/);
      const hex = hexMatch ? hexMatch[1] : "";
      const nameEl = btn.querySelector("span.blind");
      const name = nameEl ? nameEl.textContent.trim() : "";
      const input = btn.closest("li")?.querySelector("input[name='EstExtColorCode']");
      const colorCode = input ? input.value : "";
      results.push({ index: i, name, hex, colorCode });
    });
    return results;
  });

  console.log("\n다나와 색상 목록 (" + colors.length + "개):");
  colors.forEach(c => console.log("  [" + c.index + "] " + c.name.padEnd(35) + " hex:" + c.hex.padEnd(10) + " code:" + c.colorCode));

  // Now click each color and capture the car image URL
  console.log("\n각 색상 클릭 후 차량 이미지 URL 확인:");
  for (let i = 0; i < colors.length; i++) {
    const c = colors[i];
    
    // Click the color button
    await page.evaluate((idx) => {
      const buttons = document.querySelectorAll("#estimateExteriorColorList .choice-color__item");
      if (buttons[idx]) buttons[idx].click();
    }, i);
    
    await new Promise(r => setTimeout(r, 1500));
    
    // Get the current car image URL
    const imgUrl = await page.evaluate(() => {
      // Look for the main car image
      const img = document.querySelector(".car_img img, .estimate_car img, #estimateCarImage img, .car-image img, .carImg img");
      if (img) return img.src || img.getAttribute("data-src") || "";
      
      // Try background image
      const bgEl = document.querySelector(".car_img, .estimate_car, #estimateCarImage");
      if (bgEl) {
        const bg = window.getComputedStyle(bgEl).backgroundImage;
        if (bg && bg !== "none") return bg.replace(/url\(['"]?/, "").replace(/['"]?\)/, "");
      }
      return "";
    });
    
    console.log("  [" + i + "] " + c.name.padEnd(35) + " -> " + (imgUrl || "이미지 없음"));
  }

  // Compare with our data
  const details = require("/Users/heejunkim/Desktop/danawa/src/constants/generated-car-details.json");
  const ourCar = details[carId];
  if (ourCar) {
    console.log("\n우리 데이터 (" + ourCar.colorImages.length + "개):");
    ourCar.colorImages.forEach((c, i) => console.log("  [" + i + "] " + c.name.padEnd(35) + " hex:" + c.hex.padEnd(10) + " img:" + c.imageUrl));
  }

  await browser.close();
}

main().catch(console.error);
