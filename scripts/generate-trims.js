#!/usr/bin/env node
/**
 * generate-trims.js
 *
 * Populates subModel-level trims in sub-models.json using the
 * detail-level trims from generated-car-details.json.
 *
 * For each car that:
 *   - exists in both sub-models.json and generated-car-details.json
 *   - has detail-level trims (trims array with entries)
 *   - does NOT already have trims on any of its subModels
 *
 * The detail trims are copied onto the (single) subModel's trims array.
 */

const fs = require("fs");
const path = require("path");

const CONSTANTS_DIR = path.join(__dirname, "..", "src", "constants");
const SUB_MODELS_PATH = path.join(CONSTANTS_DIR, "sub-models.json");
const DETAILS_PATH = path.join(CONSTANTS_DIR, "generated-car-details.json");

// Read data
const subModelsData = JSON.parse(fs.readFileSync(SUB_MODELS_PATH, "utf-8"));
const detailsData = JSON.parse(fs.readFileSync(DETAILS_PATH, "utf-8"));

let updatedCount = 0;
let skippedNoDetail = 0;
let skippedNoDetailTrims = 0;

for (const [carId, entry] of Object.entries(subModelsData)) {
  // Check if detail data exists for this car
  const detail = detailsData[carId];
  if (!detail) {
    skippedNoDetail++;
    continue;
  }

  // Check if detail has trims
  if (!detail.trims || detail.trims.length === 0) {
    skippedNoDetailTrims++;
    continue;
  }

  // Process each subModel that is missing trims
  for (const sm of entry.subModels) {
    if (sm.trims && sm.trims.length > 0) continue; // already has trims

    // Assign detail-level trims as the subModel's trims.
    // For single-subModel cars this is an exact match.
    // For multi-subModel cars where fuel-type-specific grades are unavailable,
    // this provides a reasonable fallback so the UI shows trim options.
    sm.trims = detail.trims;

    updatedCount++;
  }
}

// Write updated sub-models.json
fs.writeFileSync(SUB_MODELS_PATH, JSON.stringify(subModelsData, null, 2) + "\n");

// Report
console.log("=== Trim Generation Complete ===");
console.log("SubModels populated with trims:", updatedCount);
console.log("Skipped (no detail data):", skippedNoDetail);
console.log("Skipped (no detail trims):", skippedNoDetailTrims);

// Verification
const updatedSubModels = JSON.parse(fs.readFileSync(SUB_MODELS_PATH, "utf-8"));
let totalSubs = 0;
let subsWithTrims = 0;
let subsWithoutTrims = 0;
for (const [id, entry] of Object.entries(updatedSubModels)) {
  for (const sm of entry.subModels) {
    totalSubs++;
    if (sm.trims && sm.trims.length > 0) subsWithTrims++;
    else subsWithoutTrims++;
  }
}
console.log("\n=== Verification ===");
console.log("Total subModels:", totalSubs);
console.log("SubModels WITH trims:", subsWithTrims);
console.log("SubModels WITHOUT trims:", subsWithoutTrims);
