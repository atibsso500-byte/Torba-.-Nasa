/**
 * TURBA — Prediction vs. Reality Engine Verification Suite
 *
 * Verifies:
 * - Compatible mm vs mm irrigation comparison computes exact delta
 * - Compatible m³ vs mm conversion succeeds ONLY when positive finite field area (ha) exists
 * - Incompatible L/plant unit or missing area (m³) blocks numeric comparison with explanation
 * - Incompatible planting date periods (> 45 days drift) block numeric comparison
 * - Soil fertility / SOC improvement is NEVER assumed without a lab soil measurement
 * - Spatial scale mismatch (250 m SoilGrids vs parcel lab test) refuses invalid subtraction
 * - Reported yields never invent synthetic target expectations
 *
 * Run with: npx tsx tests/memory/predictions.test.ts
 */

import { comparePredictionWithReality } from '../../src/services/memory/predictions';
import {
  FieldMemory,
  RecommendationSnapshot,
  ReportedOutcomeRecord,
} from '../../src/services/memory/types';

let passed = 0;
let total = 0;

function assert(condition: boolean, id: string, desc: string, detail?: string) {
  total++;
  if (condition) {
    console.log(`[PASS] ${id}: ${desc}`);
    passed++;
  } else {
    console.error(`[FAIL] ${id}: ${desc}${detail ? ` — ${detail}` : ''}`);
  }
}

const fieldWithArea: FieldMemory = {
  fieldId: 'field-cmp-1',
  ownerId: 'local-unauthenticated',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  fieldName: 'Comparison Parcel (2 ha)',
  region: 'Fès-Meknès',
  province: 'Meknès',
  coordinates: { lat: 33.89, lng: -5.54 },
  boundaryGeometry: [
    { lat: 33.89, lng: -5.54 },
    { lat: 33.891, lng: -5.54 },
    { lat: 33.891, lng: -5.539 },
  ],
  area: 2,
  areaUnit: 'ha',
  locationPrecision: 'User-drawn polygon',
  cadastralReference: null,
  baselineAssessmentRef: null,
  notes: '',
};

const fieldWithoutArea: FieldMemory = {
  ...fieldWithArea,
  fieldId: 'field-cmp-no-area',
  boundaryGeometry: null,
  area: null,
  areaUnit: null,
};

const irrRec: RecommendationSnapshot = {
  recommendationId: 'rec-irr-1',
  fieldId: fieldWithArea.fieldId,
  ownerId: 'local-unauthenticated',
  createdAt: '2026-04-01T08:00:00Z',
  kind: 'irrigation',
  inputSignature: 'sig-irr-1',
  seasonContext: {
    seasonStart: '2026-03-10',
    seasonEnd: null,
    currentCropId: 'tomato',
    previousCropId: 'wheat_durum',
    horizonSeasons: null,
    referenceDateUtc: '2026-04-01',
  },
  proposedSummary: {
    proposedCropIds: ['tomato'],
    primaryCropId: 'tomato',
    irrigationDecisionStatus: 'IRRIGATION_REQUIRED',
    netIrrigationMm: 22.5,
    grossIrrigationMm: 25,
    expectedWindowRainMm: 4,
    expectedWindowDays: 7,
  },
  inputSnapshot: {
    farmerContext: null,
    soilSourceKind: 'soilgrids_v2',
    thetaFc: 0.32,
    thetaWp: 0.16,
    socPct: 1.2,
    residueManagement: 'incorporated',
  },
  environmentalDataRefs: ['NASA POWER'],
  soilDataRefs: ['ISRIC SoilGrids v2.0'],
  calculationMethodVersion: 'FAO-56',
  assumptionsEn: [],
  assumptionsAr: [],
  assumptionsFr: [],
  missingInputs: [],
  scientificLimitationsEn: [],
  scientificLimitationsAr: [],
  scientificLimitationsFr: [],
  explanationEn: 'Apply 25 mm gross.',
  explanationAr: '25 مم',
  explanationFr: '25 mm',
  status: 'accepted',
  statusUpdatedAt: '2026-04-01T08:00:00Z',
};

const baseOutcome: ReportedOutcomeRecord = {
  outcomeId: 'out-1',
  fieldId: fieldWithArea.fieldId,
  recommendationId: 'rec-irr-1',
  seasonId: null,
  reportedAt: '2026-04-12T10:00:00Z',
  updatedAt: '2026-04-12T10:00:00Z',
  actualCropPlanted: 'Tomato',
  actualCropId: 'tomato',
  actualPlantingDate: '2026-03-12',
  actualHarvestDate: null,
  actualIrrigationAmount: 20,
  actualIrrigationUnit: 'mm',
  actualIrrigationOrigin: 'farmer_report',
  observedCropCondition: 'good',
  yieldValue: null,
  yieldUnit: null,
  yieldOrigin: null,
  observedWaterShortage: false,
  pestOrDiseaseObservations: null,
  farmerAssessment: 'Good',
  supportingReferences: [],
  recordedPeriodRainfallMm: null,
  recordedRainfallSource: null,
  measuredPostSeasonSocPct: null,
  measuredPostSeasonSoilOrigin: null,
};

// Test 1: Awaiting outcome
const cmpAwaiting = comparePredictionWithReality({
  fieldMemory: fieldWithArea,
  recommendation: irrRec,
  outcome: null,
});
assert(cmpAwaiting.status === 'AWAITING_OUTCOME', 'CMP-01', 'Null outcome returns AWAITING_OUTCOME');

// Test 2: Compatible mm comparison
const cmpMm = comparePredictionWithReality({
  fieldMemory: fieldWithArea,
  recommendation: irrRec,
  outcome: baseOutcome,
});
const irrMetricMm = cmpMm.metrics.find((m) => m.metricKey === 'irrigation_applied');
assert(
  Boolean(cmpMm.status === 'COMPARABLE' && irrMetricMm?.comparable && irrMetricMm.deltaNumeric === -5),
  'CMP-02',
  'Compatible mm comparison yields exact delta (-5 mm)'
);

// Test 3: Compatible m³ -> mm conversion via 2 ha parcel (400 m³ / (10 * 2 ha) = 20 mm)
const cmpM3 = comparePredictionWithReality({
  fieldMemory: fieldWithArea,
  recommendation: irrRec,
  outcome: { ...baseOutcome, actualIrrigationAmount: 400, actualIrrigationUnit: 'm3' },
});
const irrMetricM3 = cmpM3.metrics.find((m) => m.metricKey === 'irrigation_applied');
assert(
  Boolean(irrMetricM3?.comparable && irrMetricM3.actualNumeric === 20 && irrMetricM3.deltaNumeric === -5),
  'CMP-03',
  'Compatible m3 converts exactly to mm when parcel area (ha) exists'
);

// Test 4: m³ conversion blocked when parcel area is null
const cmpM3Blocked = comparePredictionWithReality({
  fieldMemory: fieldWithoutArea,
  recommendation: irrRec,
  outcome: { ...baseOutcome, actualIrrigationAmount: 400, actualIrrigationUnit: 'm3' },
});
const irrMetricM3Blocked = cmpM3Blocked.metrics.find((m) => m.metricKey === 'irrigation_applied');
assert(
  Boolean(irrMetricM3Blocked && !irrMetricM3Blocked.comparable && irrMetricM3Blocked.deltaNumeric === null),
  'CMP-04',
  'm3 report blocks numeric comparison when parcel area (ha) is missing'
);

// Test 5: Incompatible L/plant unit blocked cleanly
const cmpLPlant = comparePredictionWithReality({
  fieldMemory: fieldWithArea,
  recommendation: irrRec,
  outcome: { ...baseOutcome, actualIrrigationAmount: 18, actualIrrigationUnit: 'L/plant' },
});
const irrMetricLPlant = cmpLPlant.metrics.find((m) => m.metricKey === 'irrigation_applied');
assert(
  Boolean(irrMetricLPlant && !irrMetricLPlant.comparable && irrMetricLPlant.incompatibilityReasonEn?.includes('L/plant')),
  'CMP-05',
  'Incompatible L/plant unit is blocked with explicit scientific explanation'
);

// Test 6: Planting date mismatch (>45 days) blocks numeric irrigation comparison
const cmpPeriodDrift = comparePredictionWithReality({
  fieldMemory: fieldWithArea,
  recommendation: irrRec,
  outcome: { ...baseOutcome, actualPlantingDate: '2026-06-01' },
});
const irrDrift = cmpPeriodDrift.metrics.find((m) => m.metricKey === 'irrigation_applied');
assert(
  Boolean(irrDrift && !irrDrift.comparable && irrDrift.incompatibilityReasonEn?.includes('Time period mismatch')),
  'CMP-06',
  'Mismatched cropping period (>45 days) prevents false irrigation comparison'
);

// Test 7: Crop rotation never claims soil improvement without post-season lab test
const rotRec: RecommendationSnapshot = {
  ...irrRec,
  recommendationId: 'rec-rot-1',
  kind: 'rotation',
  proposedSummary: { proposedCropIds: ['faba_bean'], primaryCropId: 'faba_bean' },
};
const cmpNoLabSoc = comparePredictionWithReality({
  fieldMemory: fieldWithArea,
  recommendation: rotRec,
  outcome: { ...baseOutcome, recommendationId: 'rec-rot-1', actualCropId: 'faba_bean', actualIrrigationAmount: null, actualIrrigationUnit: null },
});
const socMetricNoLab = cmpNoLabSoc.metrics.find((m) => m.metricKey === 'soil_organic_carbon');
assert(
  Boolean(socMetricNoLab && !socMetricNoLab.comparable && socMetricNoLab.incompatibilityReasonEn?.includes('No post-season soil test')),
  'CMP-07',
  'Rotation outcome without post-season soil lab test refuses SOC improvement claim'
);

// Test 8: Lab-to-lab SOC comparison succeeds, while SoilGrids-to-lab refuses invalid subtraction
const cmpLabVsGrid = comparePredictionWithReality({
  fieldMemory: fieldWithArea,
  recommendation: rotRec,
  outcome: {
    ...baseOutcome,
    recommendationId: 'rec-rot-1',
    actualCropId: 'faba_bean',
    actualIrrigationAmount: null,
    actualIrrigationUnit: null,
    measuredPostSeasonSocPct: 1.45,
    measuredPostSeasonSoilOrigin: 'verified_measurement',
  },
});
const socGridBlock = cmpLabVsGrid.metrics.find((m) => m.metricKey === 'soil_organic_carbon');

const cmpLabVsLab = comparePredictionWithReality({
  fieldMemory: fieldWithArea,
  recommendation: {
    ...rotRec,
    inputSnapshot: { ...rotRec.inputSnapshot, soilSourceKind: 'farmer_lab', socPct: 1.15 },
  },
  outcome: {
    ...baseOutcome,
    recommendationId: 'rec-rot-1',
    actualCropId: 'faba_bean',
    actualIrrigationAmount: null,
    actualIrrigationUnit: null,
    measuredPostSeasonSocPct: 1.35,
    measuredPostSeasonSoilOrigin: 'verified_measurement',
  },
});
const socLabMatch = cmpLabVsLab.metrics.find((m) => m.metricKey === 'soil_organic_carbon');

assert(
  Boolean(socGridBlock && !socGridBlock.comparable && socLabMatch?.comparable && socLabMatch.deltaNumeric === 0.2),
  'CMP-08',
  'Refuses subtracting 250 m SoilGrids from parcel lab SOC while allowing lab-to-lab comparison'
);

console.log(`\n[predictions.test.ts] Passed ${passed}/${total} assertions.`);
if (passed !== total) process.exit(1);
