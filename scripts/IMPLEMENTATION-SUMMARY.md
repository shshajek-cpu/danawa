# Danawa Scraper Implementation Summary

## What Was Created

### Main Script: `scrape-specs.js`

A Puppeteer-based web scraper that extracts car specification data from Danawa's estimate pages.

**Location**: `/Users/heejunkim/Desktop/danawa/scripts/scrape-specs.js`

## Current Capabilities

### ✅ Successfully Working

1. **Data Source Discovery**
   - Identified that Danawa stores spec data in `estmDataAuto` JavaScript variable
   - Data is base64-encoded, then zlib-compressed, then base64-encoded again
   - Successfully implemented multi-layer decoding pipeline

2. **Extracted Fields** (Currently 2/13 fields)
   - ✅ **배기량 (Displacement)**: e.g., "2,497cc"
   - ✅ **복합연비 (Fuel Efficiency)**: e.g., "10.1km/L"

3. **Infrastructure**
   - Batch processing (5 cars at a time)
   - Rate limiting (2.5 second delays)
   - Idempotent operation (skips already-scraped cars)
   - Incremental saving (saves after each car)
   - Debug output for troubleshooting
   - Error handling and logging

### ⚠️ Partially Working

The following fields have patterns identified but need better decoding:

- **연료 (Fuel Type)**: Pattern `%U%9C%98` = 가솔린 (detected but needs full mapping)
- **변속기 (Transmission)**: Pattern `@18way` = 8단 자동 (detected but not decoded)
- **구동방식 (Drive Type)**: Pattern `WF3`=FWD, `WF4`=AWD (detected but not decoded)

### ❌ Not Yet Implemented

These fields exist in the data but patterns need to be identified:

- 최대출력 (Max Power) - ps
- 최대토크 (Max Torque) - kg.m
- 전장 (Length) - mm
- 전폭 (Width) - mm
- 전고 (Height) - mm
- 축거 (Wheelbase) - mm
- 공차중량 (Curb Weight) - kg
- 승차정원 (Seating Capacity) - persons

## Technical Implementation

### Decoding Pipeline

```
estmDataAuto['T93491'] = 'eNrdXFu...'
         ↓
Base64 decode
         ↓
Zlib inflate (pako)
         ↓
Base64 decode again
         ↓
Proprietary format: "Displacee3A2%2C497%7Ceffm%uE10.1..."
```

### Example Decoded Patterns

```
Displacee3A2%2C497        → Displacement: 2,497cc
effm%uE10.!               → Fuel efficiency: 10.1 km/L (! = 1)
spec%5U...%7CWF3%7C       → Drive type: FWD
@18way                    → Transmission: 8-speed automatic
%U%9C%98                  → Fuel: 가솔린
```

## Files Created

1. **`/Users/heejunkim/Desktop/danawa/scripts/scrape-specs.js`**
   - Main scraper script (310 lines)
   - Full implementation with multi-layer decoding

2. **`/Users/heejunkim/Desktop/danawa/scripts/README-SCRAPER.md`**
   - User documentation
   - Usage instructions
   - Technical details

3. **`/Users/heejunkim/Desktop/danawa/debug/`** (created by script)
   - `car-4435.html` - Debug HTML sample
   - `decoded-4435.txt` - Decoded data sample
   - `failed-cars.json` - Failed car list

4. **`/Users/heejunkim/Desktop/danawa/src/constants/car-specs.json`** (created by script)
   - Output file with extracted specs
   - Currently has data for car ID 4435 (싼타페)

## Test Results

Tested with 3 cars:
- ✅ **4435 (싼타페)**: Successfully extracted displacement and fuel efficiency
- ❌ **4455 (아반떼)**: No specs found (different trim structure)
- ❌ **3825 (Cybertruck)**: No specs found (import car, different format)

## Next Steps to Complete

### 1. Enhance Field Extraction (Estimated: 2-3 hours)

Analyze the decoded data samples to identify patterns for remaining fields:

```javascript
// Look for these patterns in debug/decoded-4435.txt:
- Power: search for "ps" or "hp" with numbers
- Torque: search for "kg" with decimal numbers
- Dimensions: search for 4-digit numbers near position markers
- Weight: search for "kg" in different context than torque
- Seating: search for "인승" or small numbers (5, 7, 8)
```

### 2. Handle Edge Cases (Estimated: 1-2 hours)

- Electric vehicles (no displacement, different specs)
- Import cars (different page structure)
- Hybrid vehicles (dual fuel types)
- Cars with missing trims

### 3. Run Full Scrape (Estimated: 20-25 minutes)

Set `TEST_MODE = false` and process all ~200 cars:

```bash
node scripts/scrape-specs.js
```

## Usage Instructions

### Test Mode (3 cars):
```bash
# Edit scrape-specs.js: TEST_MODE = true
node scripts/scrape-specs.js
```

### Full Scrape (all cars):
```bash
# Edit scrape-specs.js: TEST_MODE = false
node scripts/scrape-specs.js
```

### Resume After Interruption:
```bash
# Just run again - it skips already-scraped cars
node scripts/scrape-specs.js
```

## Performance Metrics

- **Scraping Speed**: ~8-10 seconds per car (with delays)
- **Success Rate**: 33% (1/3 test cars) - needs improvement
- **Data Quality**: High for fields that work (displacement, fuel efficiency)
- **Estimated Total Time**: 20-25 minutes for all cars

## Key Insights

1. **Danawa uses complex encoding**:
   - Base64 → Zlib → Base64 → Custom format
   - This is intentional to prevent scraping

2. **Proprietary data format**:
   - Custom encoding with `%` sequences
   - Field separators: `%7C` (pipe), `%3B` (semicolon)
   - Special characters: `!` = 1, `"` = 2

3. **Different car types have different structures**:
   - Domestic vs import cars
   - Electric vs gasoline vs hybrid
   - May need type-specific parsers

## Recommendations

1. **Short-term**: Focus on domestic gasoline cars first (easier patterns)
2. **Medium-term**: Expand to handle electric and import cars
3. **Long-term**: Consider alternative data sources if Danawa blocks scraping
4. **Alternative**: Contact Danawa for API access or official data partnership

## Dependencies

```json
{
  "puppeteer": "^latest",
  "pako": "^2.x"
}
```

Both are already installed in the project.
