const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const targetIds = [
  4566, 4638, 4511, 4670, 4656, 4650, 4072, 4652, 4683, 4655, 4171, 4657,
  4649, 4582, 3803, 4639, 4073, 4431, 4436, 3775, 4119, 4472, 4363, 4551,
  4548, 4763, 3772, 4404, 4565, 4741, 4379, 4395, 3825
];

async function checkColorImages(page, modelId) {
  const url = `https://auto.danawa.com/newcar/?Work=estimate&Model=${modelId}`;

  try {
    console.log(`\nChecking Model ${modelId}...`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Wait a bit for dynamic content
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Extract all image URLs
    const images = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img'));
      return imgs.map(img => ({
        src: img.src,
        alt: img.alt || '',
        className: img.className || ''
      }));
    });

    // Filter for color-related images
    const colorImages = images.filter(img =>
      img.src.includes('color') ||
      img.src.includes(`photo/${modelId}`) ||
      img.alt.toLowerCase().includes('color') ||
      img.alt.includes('색상')
    );

    // Filter for lineup images
    const lineupImages = images.filter(img =>
      img.src.includes('lineup')
    );

    return {
      modelId,
      hasColorImages: colorImages.length > 0,
      colorImageCount: colorImages.length,
      hasLineupImages: lineupImages.length > 0,
      colorImages: colorImages.slice(0, 5), // First 5 for inspection
      lineupImages: lineupImages.slice(0, 2)
    };

  } catch (error) {
    console.error(`Error checking ${modelId}:`, error.message);
    return {
      modelId,
      error: error.message
    };
  }
}

async function main() {
  const results = [];

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  // Process in batches to avoid overwhelming
  const batchSize = 5;
  for (let i = 0; i < targetIds.length; i += batchSize) {
    const batch = targetIds.slice(i, i + batchSize);
    console.log(`\n=== Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(targetIds.length/batchSize)} ===`);

    for (const id of batch) {
      const result = await checkColorImages(page, id);
      results.push(result);

      if (result.error) {
        console.log(`  ❌ ${id}: Error - ${result.error}`);
      } else if (result.hasColorImages) {
        console.log(`  ✅ ${id}: Found ${result.colorImageCount} color images`);
      } else if (result.hasLineupImages) {
        console.log(`  ⚠️  ${id}: Only lineup images available`);
      } else {
        console.log(`  ⚪ ${id}: No specific images found`);
      }

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  await browser.close();

  // Summary
  console.log('\n\n=== SUMMARY ===\n');

  const withColorImages = results.filter(r => !r.error && r.hasColorImages);
  const lineupOnly = results.filter(r => !r.error && !r.hasColorImages && r.hasLineupImages);
  const noImages = results.filter(r => !r.error && !r.hasColorImages && !r.hasLineupImages);
  const errors = results.filter(r => r.error);

  console.log(`✅ Vehicles with color images: ${withColorImages.length}`);
  if (withColorImages.length > 0) {
    console.log(`   IDs: ${withColorImages.map(r => r.modelId).join(', ')}`);
  }

  console.log(`\n⚠️  Vehicles with lineup only: ${lineupOnly.length}`);
  if (lineupOnly.length > 0) {
    console.log(`   IDs: ${lineupOnly.map(r => r.modelId).join(', ')}`);
  }

  console.log(`\n⚪ Vehicles with no specific images: ${noImages.length}`);
  if (noImages.length > 0) {
    console.log(`   IDs: ${noImages.map(r => r.modelId).join(', ')}`);
  }

  if (errors.length > 0) {
    console.log(`\n❌ Errors: ${errors.length}`);
    console.log(`   IDs: ${errors.map(r => r.modelId).join(', ')}`);
  }

  // Save detailed results to JSON
  const outputPath = path.join(__dirname, 'lineup-images-check-results.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\nDetailed results saved to: ${outputPath}`);

  // Save summary
  const summary = {
    timestamp: new Date().toISOString(),
    totalChecked: targetIds.length,
    withColorImages: withColorImages.map(r => ({
      modelId: r.modelId,
      colorImageCount: r.colorImageCount,
      sampleUrls: r.colorImages.slice(0, 2).map(img => img.src)
    })),
    lineupOnly: lineupOnly.map(r => r.modelId),
    noImages: noImages.map(r => r.modelId),
    errors: errors.map(r => ({ modelId: r.modelId, error: r.error }))
  };

  const summaryPath = path.join(__dirname, 'lineup-images-summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  console.log(`Summary saved to: ${summaryPath}`);
}

main().catch(console.error);
