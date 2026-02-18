const cars = require("../src/constants/generated-cars.json");
const subModels = require("../src/constants/sub-models.json");
const details = require("../src/constants/generated-car-details.json");

// Fuel type indicators in grade names
const GASOLINE_INDICATORS = ['TFSI', 'TSI', 'GDi', 'T-GDi', 'MPI', 'P300', 'P400', 'P530', 'P615', 'P250', 'P360', 'P635', 'GTS', 'Turbo S', 'xDrive40i', 'xDrive50i', 'M60i', 'M40i', '320i', '520i', '530i', '330i', '340i', '120', '220', '228', 'M135', 'M235', 'M240i', 'M340i', 'M440i', '420i', 'sDrive20i', 'xDrive20i', 'M850i', 'GLC300', 'GLE350', 'GLE450', 'GLS450', 'GLS580', 'GLB250', 'GLA250', 'CLA250', 'C200', 'E200', 'E300', 'E450', 'S450', 'S500', 'S580', 'AMG G63', 'AMG GLS63', 'AMG GLB35', 'AMG GT 55', 'AMG GT 43', 'G580'];
const DIESEL_INDICATORS = ['TDI', 'CRDi', 'D250', 'D300', 'D350', '320d', '520d', '530d', 'xDrive20d', 'xDrive30d', 'xDrive40d', 'GLC220d', 'GLE300d', 'GLB200d', 'S350d', 'G450d'];
const HYBRID_INDICATORS = ['e-Hybrid', 'E-Hybrid', 'HEV', 'Hybrid', 'PHEV', '4xe', 'P550e', 'P400e', '530e', '750e', 'xDrive50e', 'T8 AWD'];
const ELECTRIC_INDICATORS = ['eDrive', 'EV', 'e-tron', 'EQ', 'Electric', 'Electrified', 'EQS', 'EQE', 'EQA', 'EQB'];

function detectFuelFromGrade(gradeName) {
  const fuels = new Set();
  for (const ind of ELECTRIC_INDICATORS) {
    if (gradeName.includes(ind)) fuels.add('전기');
  }
  for (const ind of HYBRID_INDICATORS) {
    if (gradeName.includes(ind)) fuels.add('하이브리드');
  }
  for (const ind of DIESEL_INDICATORS) {
    if (gradeName.includes(ind)) fuels.add('디젤');
  }
  for (const ind of GASOLINE_INDICATORS) {
    if (gradeName.includes(ind)) fuels.add('가솔린');
  }
  return [...fuels];
}

const issues = [];

cars.cars.forEach(car => {
  const declaredFuel = car.fuelType;
  const subs = subModels[car.id] ? subModels[car.id].subModels : [];
  const subFuels = [...new Set(subs.map(s => s.fuelType))];
  
  // Check 1: fuelType vs sub-model fuel mismatch
  if (subFuels.length > 0 && subFuels.length === 1 && subFuels[0] !== declaredFuel) {
    issues.push({
      id: car.id,
      brand: car.brandName,
      name: car.name,
      type: 'FUEL_TYPE_MISMATCH',
      severity: 'CRITICAL',
      detail: `fuelType="${declaredFuel}" but subModel says "${subFuels[0]}"`,
      fix: `Change fuelType to "${subFuels[0]}"`
    });
  }
  
  // Check 2: Grade names suggest different fuel types
  const detectedFuels = new Set();
  (car.grades || []).forEach(g => {
    const fuels = detectFuelFromGrade(g.name);
    fuels.forEach(f => detectedFuels.add(f));
  });
  
  // Also check detail trims
  const detail = details[car.id];
  if (detail) {
    (detail.trims || []).forEach(t => {
      const fuels = detectFuelFromGrade(t.name);
      fuels.forEach(f => detectedFuels.add(f));
    });
  }
  
  const detected = [...detectedFuels];
  if (detected.length > 1) {
    issues.push({
      id: car.id,
      brand: car.brandName,
      name: car.name,
      type: 'MIXED_FUEL_GRADES',
      severity: 'HIGH',
      detail: `fuelType="${declaredFuel}", subModels=[${subFuels.join(',')}], but grades suggest: [${detected.join(', ')}]`,
      fix: `Need multi-fuel support or separate by fuel type`
    });
  } else if (detected.length === 1 && detected[0] !== declaredFuel && !subFuels.includes(detected[0])) {
    issues.push({
      id: car.id,
      brand: car.brandName,
      name: car.name,
      type: 'GRADE_FUEL_MISMATCH',
      severity: 'HIGH',
      detail: `fuelType="${declaredFuel}" but all grades suggest "${detected[0]}"`,
      fix: `Verify and potentially change fuelType to "${detected[0]}"`
    });
  }
  
  // Check 3: Multi-fuel sub-models but single fuelType
  if (subFuels.length > 1) {
    issues.push({
      id: car.id,
      brand: car.brandName,
      name: car.name,
      type: 'MULTI_FUEL_SUBMODEL',
      severity: 'INFO',
      detail: `Has multiple sub-model fuel types: [${subFuels.join(', ')}], fuelType="${declaredFuel}"`,
      fix: `Verify grades match each sub-model fuel type`
    });
  }
});

// Sort by severity
const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, INFO: 3 };
issues.sort((a, b) => (severityOrder[a.severity] || 99) - (severityOrder[b.severity] || 99));

console.log(`\n=== 유종 불일치 분석 결과 ===\n`);
console.log(`총 ${issues.length}건 발견\n`);

let currentSeverity = '';
issues.forEach(i => {
  if (i.severity !== currentSeverity) {
    currentSeverity = i.severity;
    console.log(`\n--- ${currentSeverity} ---`);
  }
  console.log(`[${i.id}] ${i.brand} ${i.name}`);
  console.log(`  유형: ${i.type}`);
  console.log(`  상세: ${i.detail}`);
  console.log(`  수정: ${i.fix}`);
  console.log('');
});
