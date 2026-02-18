# Danawa Car Specs Scraper

## Overview

This Puppeteer-based scraper extracts car specification data from Danawa's estimate pages for all cars in the database.

## Usage

```bash
# Install dependencies (if not already installed)
npm install puppeteer pako

# Run the scraper
node scripts/scrape-specs.js
```

## Configuration

Edit `scrape-specs.js` to change settings:

- `TEST_MODE`: Set to `true` to test with only 3 cars, `false` to process all cars
- `TEST_CAR_IDS`: Car IDs used in test mode
- `BATCH_SIZE`: Number of cars to process in each batch (default: 5)

## How It Works

1. **Loads car data** from `src/constants/generated-cars.json`
2. **Navigates to Danawa estimate page** for each car: `https://auto.danawa.com/newcar/?Work=estimate&Model={carId}`
3. **Extracts encoded spec data** from the JavaScript variable `estmDataAuto` embedded in the page
4. **Decodes the data** through multiple layers:
   - Base64 decode
   - Zlib inflate (decompression using pako)
   - Base64 decode again
   - Parse the resulting encoded data structure
5. **Saves results** incrementally to `src/constants/car-specs.json`

## Current Status

### Successfully Extracted Fields

- ✅ **배기량 (Displacement)**: Engine displacement in cc (e.g., "2,497cc")
- ✅ **복합연비 (Fuel Efficiency)**: Combined fuel efficiency in km/L (e.g., "10.1km/L")

### Partially Extracted Fields

- ⚠️ **연료 (Fuel Type)**: Basic detection (가솔린/디젤/전기) - needs refinement
- ⚠️ **변속기 (Transmission)**: Pattern detected but decoding incomplete
- ⚠️ **구동방식 (Drive Type)**: WF3/WF4 codes detected (FWD/AWD) but needs mapping

### Fields to Add

The following fields are in the Danawa data but not yet extracted:

- 최대출력 (Max Power) - ps
- 최대토크 (Max Torque) - kg.m
- 전장 (Length) - mm
- 전폭 (Width) - mm
- 전고 (Height) - mm
- 축거 (Wheelbase) - mm
- 공차중량 (Curb Weight) - kg
- 승차정원 (Seating Capacity) - persons

## Data Format

The decoded data uses a proprietary encoding format with patterns like:

- `Displacee3A2%2C497` = displacement: 2,497cc
- `effm%uE10.!` = fuel efficiency: 10.1 km/L (! = 1, " = 2)
- `WF3` = FWD (전륜구동)
- `WF4` = 4WD/AWD
- `@18way` = 8-speed automatic (8단 자동)
- `%U%9C%98` = 가솔린 (gasoline)

## Debug Output

The scraper creates debug files in the `debug/` directory:

- `car-{carId}.html` - Full HTML of the first test car page
- `decoded-{carId}.txt` - Decoded spec data sample
- `failed-cars.json` - List of cars that failed to scrape

## Idempotent Operation

The scraper:
- Reads existing `car-specs.json` and skips already-scraped cars
- Saves results incrementally after each successful scrape
- Can be safely interrupted and resumed

## Performance

- Processes cars in batches of 5
- 2.5 second delay between requests to avoid rate limiting
- Runs in headless mode for efficiency
- Estimated time for ~200 cars: ~20-25 minutes

## Next Steps

To improve spec extraction:

1. **Analyze more decoded samples** to find patterns for missing fields
2. **Map encoded values** (e.g., transmission codes, dimension values)
3. **Handle edge cases** (electric cars, import cars with different formats)
4. **Add validation** to ensure extracted values are reasonable

## Dependencies

- `puppeteer`: Headless browser automation
- `pako`: Zlib decompression for the encoded data
- Node.js 14+ required

## Output Format

`src/constants/car-specs.json`:

```json
{
  "4435": {
    "displacement": "2,497cc",
    "fuelEfficiency": "10.1km/L",
    "fuelType": "가솔린",
    "transmission": "8단 자동",
    "driveType": "전륜구동(FWD)"
  }
}
```
