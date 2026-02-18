const puppeteer = require("puppeteer");

async function main() {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  await page.setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)");

  const carId = process.argv[2] || "4660";
  console.log("Checking carId:", carId);

  await page.goto("https://auto.danawa.com/newcar/?Work=estimate&Model=" + carId, {
    waitUntil: "networkidle2", timeout: 30000
  });
  await new Promise(r => setTimeout(r, 3000));

  // Click first grade if available to load colors
  const gradeClicked = await page.evaluate(() => {
    const radios = document.querySelectorAll("input[name='EstGradeCode']");
    if (radios.length > 0) { radios[0].click(); return true; }
    return false;
  });
  if (gradeClicked) await new Promise(r => setTimeout(r, 2000));

  // Extract color data from the page
  const colors = await page.evaluate(() => {
    const results = [];

    // Look for color elements - Danawa uses specific selectors
    const colorItems = document.querySelectorAll(".color_item, .color-item, [class*='color'] li, .estimate_color li, .colorChip li");

    if (colorItems.length > 0) {
      colorItems.forEach(item => {
        const name = item.getAttribute("title") || item.textContent?.trim() || "";
        const bgEl = item.querySelector("span, div, em");
        let hex = "";
        if (bgEl) {
          const style = bgEl.getAttribute("style") || "";
          const match = style.match(/background(?:-color)?:\s*(#[0-9a-fA-F]{3,6}|rgb[^)]+\))/);
          if (match) hex = match[1];
        }
        results.push({ name, hex, tag: item.tagName, className: item.className });
      });
    }

    // Try alternate: look for EstExtColorCode elements
    const estColors = document.querySelectorAll("[name='EstExtColorCode']");
    estColors.forEach(input => {
      const li = input.closest("li");
      if (!li) return;
      const label = li.querySelector("label");
      const colorSpan = li.querySelector("span[style*='background'], em[style*='background']");
      let hex = "";
      if (colorSpan) {
        const style = colorSpan.getAttribute("style") || "";
        const match = style.match(/background(?:-color)?:\s*(#[0-9a-fA-F]{3,6}|rgb[^)]+\))/);
        if (match) hex = match[1];
      }
      const name = label?.textContent?.trim() || li.textContent?.trim() || "";
      results.push({ name, hex, value: input.value });
    });

    // Try: just find ALL elements with inline background-color that look like color chips
    if (results.length === 0) {
      document.querySelectorAll("em[style*='background'], span[style*='background']").forEach(el => {
        const style = el.getAttribute("style") || "";
        const match = style.match(/background(?:-color)?:\s*(#[0-9a-fA-F]{3,6})/);
        if (match) {
          const parent = el.closest("li, label, div");
          const name = parent?.getAttribute("title") || parent?.textContent?.trim() || "";
          if (name.length < 50) results.push({ name: name.substring(0, 40), hex: match[1] });
        }
      });
    }

    return results;
  });

  console.log("\nDanawa colors (" + colors.length + "):");
  colors.forEach(c => console.log("  " + (c.name || "?").padEnd(30) + " hex: " + (c.hex || "none")));

  // Compare with our data
  const details = require("/Users/heejunkim/Desktop/danawa/src/constants/generated-car-details.json");
  const ourCar = details[carId];
  if (ourCar) {
    console.log("\nOur data colors (" + ourCar.colorImages.length + "):");
    ourCar.colorImages.forEach(c => console.log("  " + c.name.padEnd(30) + " hex: " + c.hex));
  }

  await browser.close();
}

main().catch(console.error);
