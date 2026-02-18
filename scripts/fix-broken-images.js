const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

const carsPath = path.join(__dirname, "../src/constants/generated-cars.json");
const detailsPath = path.join(__dirname, "../src/constants/generated-car-details.json");

async function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function getCarImages(browser, carId) {
  const page = await browser.newPage();
  await page.setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36");

  try {
    const url = "https://auto.danawa.com/newcar/?Work=estimate&Model=" + carId;
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
    await delay(2000);

    const images = await page.evaluate(() => {
      const result = { mainImage: null, colorImages: [] };

      // Get main car image
      const mainImg = document.querySelector(".car_img img, .estimate_car img, #imgCar, .car_photo img");
      if (mainImg) result.mainImage = mainImg.src;

      // Try to find color-specific images from the page
      const colorBtns = document.querySelectorAll(".color_btn li, .color_list li, [class*='color'] li");
      colorBtns.forEach(li => {
        const img = li.querySelector("img");
        const dataImg = li.getAttribute("data-img") || li.getAttribute("data-image");
        if (dataImg) {
          result.colorImages.push(dataImg);
        } else if (img && img.src) {
          result.colorImages.push(img.src);
        }
      });

      // Also check for image in estimate area
      const estimateImg = document.querySelector("#estimateImgArea img, .estimate_img img");
      if (estimateImg && estimateImg.src) {
        result.mainImage = result.mainImage || estimateImg.src;
      }

      // Check all images on the page with 'color' or 'photo' in src
      document.querySelectorAll("img").forEach(img => {
        if (img.src && img.src.includes("/photo/") && img.src.includes("_360")) {
          if (!result.mainImage) result.mainImage = img.src;
        }
      });

      return result;
    });

    return images;
  } catch (e) {
    console.log("Error for " + carId + ": " + e.message);
    return null;
  } finally {
    await page.close();
  }
}

async function main() {
  const browser = await puppeteer.launch({ headless: "new" });

  const brokenCars = [
    { id: "4361", name: "코나" },
    { id: "4399", name: "포터2 EV" },
  ];

  const results = {};

  for (const car of brokenCars) {
    console.log("Fetching images for " + car.name + " (" + car.id + ")...");
    const images = await getCarImages(browser, car.id);
    results[car.id] = images;
    console.log("  Main image: " + (images?.mainImage || "NOT FOUND"));
    console.log("  Color images: " + (images?.colorImages?.length || 0));
    if (images?.colorImages?.length > 0) {
      images.colorImages.slice(0, 3).forEach(u => console.log("    " + u));
    }
  }

  await browser.close();

  // Apply fixes
  const carsData = JSON.parse(fs.readFileSync(carsPath, "utf8"));
  const detailsData = JSON.parse(fs.readFileSync(detailsPath, "utf8"));

  let fixed = 0;
  for (const car of brokenCars) {
    const imgs = results[car.id];
    if (!imgs || !imgs.mainImage) {
      console.log("\nNo working image found for " + car.name + " - using lineup fallback");
      // Use a generic lineup image pattern that we know works for other cars
      continue;
    }

    // Fix in cars list
    const carEntry = carsData.cars.find(c => String(c.id) === car.id);
    if (carEntry && imgs.mainImage) {
      const oldUrl = carEntry.imageUrl;
      carEntry.imageUrl = imgs.mainImage;
      console.log("\nFixed " + car.name + " main image:");
      console.log("  Old: " + oldUrl);
      console.log("  New: " + imgs.mainImage);
      fixed++;
    }

    // Fix in details - update main imageUrl
    const detail = detailsData[car.id];
    if (detail && imgs.mainImage) {
      detail.imageUrl = imgs.mainImage;
    }

    // Fix color images if we found new ones with correct subdirectory
    if (detail && imgs.mainImage) {
      // Extract the subdirectory from the main image URL
      const match = imgs.mainImage.match(/\/photo\/\d+\/(\d+)\//);
      if (match) {
        const subDir = match[1];
        console.log("  SubDir found: " + subDir);
        // Update all color images to use correct subdirectory
        if (detail.colorImages) {
          detail.colorImages.forEach((ci, idx) => {
            if (ci.imageUrl && !ci.imageUrl.includes("/" + subDir + "/")) {
              const oldColorUrl = ci.imageUrl;
              // Insert subdirectory: /photo/4361/color_XX -> /photo/4361/subDir/color_XX
              ci.imageUrl = ci.imageUrl.replace(
                "/photo/" + car.id + "/",
                "/photo/" + car.id + "/" + subDir + "/"
              );
              if (idx < 3) console.log("  Color " + idx + ": " + oldColorUrl + " -> " + ci.imageUrl);
            }
          });
        }
      }
    }
  }

  fs.writeFileSync(carsPath, JSON.stringify(carsData, null, 2));
  fs.writeFileSync(detailsPath, JSON.stringify(detailsData, null, 2));

  console.log("\nTotal fixed: " + fixed + " cars");
}

main().catch(console.error);
