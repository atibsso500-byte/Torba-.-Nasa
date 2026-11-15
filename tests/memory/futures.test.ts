/**
 * TURBA — Land Futures & Deterministic Evidence Learning Verification Suite
 *
 * Verifies:
 * - Remembered crop sequence & repeated family conflict detection from real SeasonRecords
 * - Deterministic detection of recurring water shortages from farmer outcomes
 * - Recommendation Delta accurately traces recommendation changes & triggering field records
 * - Multi-pathway Land Futures (Path A/B/C) refuse planning cleanly under INSUFFICIENT_DATA
 * - Separates hard agronomic constraints from weighted ranking preferences
 * - Explicitly avoids ML/AI claims
 *
 * Run with: npx tsx tests/memory/futures.test.ts
 */

import {
  deriveEvidenceLearningContext,
  generateLandFuturesAssessment,
} from '../../src/services/memory/futures';
import {
  FieldMemory,
  RecommendationSnapshot,
  ReportedOutcomeRecord,
  SeasonRecord,
} from '../../src/services/memory/types';
import { NasaGpmObservation, NasaPowerObservation } from '../../src/types/farm';
import { FarmerContextProfile, PersistedTransitionState, SoilHydraulicResult } from '../../src/types/irrigation';

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

const testField: FieldMemory = {
  fieldId: 'field-futures-1',
  ownerId: 'local-unauthenticated',
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  fieldName: 'Futures Test Field (Synthetic Fixture)',
  region: 'Souss-Massa',
  province: 'Taroudannt',
  coordinates: { lat: 30.47, lng: -8.87 },
  boundaryGeometry: null,
  area: null,
  areaUnit: null,
  locationPrecision: 'Point',
  cadastralReference: null,
  baselineAssessmentRef: null,
  notes: '',
};

const seasonsWithConflict: SeasonRecord[] = [
  {
    seasonId: 's-1',
    fieldId: testField.fieldId,
    seasonStart: '2024-11-01',
    seasonEnd: '2025-05-01',
    cropId: 'wheat_durum',
    cropName: 'Durum Wheat',
    cropFamily: 'Poaceae',
    plantingDate: '2024-11-01',
    harvestDate: '2025-05-01',
    previousCropId: null,
    irrigationMethod: 'rainfed',
    irrigationAmountMm: null,
    irrigationAmountOrigin: null,
    fertilizerAndAmendments: null,
    managementPractices: null,
    farmerNotes: '',
    evidenceReferences: [],
    createdAt: '2025-05-02T10:00:00Z',
    updatedAt: '2025-05-02T10:00:00Z',
    dataOrigin: 'farmer_report',
    isIncomplete: true,
    missingFields: ['previousCropId', 'irrigationAmountMm'],
    editHistory: [],
  },
  {
    seasonId: 's-2',
    fieldId: testField.fieldId,
    seasonStart: '2025-11-01',
    seasonEnd: '2026-05-01',
    cropId: 'barley',
    cropName: 'Barley',
    cropFamily: 'Poaceae',
    plantingDate: '2025-11-01',
    harvestDate: '2026-05-01',
    previousCropId: 'wheat_durum',
    irrigationMethod: 'rainfed',
    irrigationAmountMm: null,
    irrigationAmountOrigin: null,
    fertilizerAndAmendments: null,
    managementPractices: null,
    farmerNotes: '',
    evidenceReferences: [],
    createdAt: '2026-05-02T10:00:00Z',
    updatedAt: '2026-05-02T10:00:00Z',
    dataOrigin: 'farmer_report',
    isIncomplete: true,
    missingFields: ['irrigationAmountMm'],
    editHistory: [],
  },
];

const shortageOutcomes: ReportedOutcomeRecord[] = [
  {
    outcomeId: 'o-1',
    fieldId: testField.fieldId,
    recommendationId: 'rec-old',
    seasonId: 's-1',
    reportedAt: '2025-05-05T10:00:00Z',
    updatedAt: '2025-05-05T10:00:00Z',
    actualCropPlanted: 'Durum Wheat',
    actualCropId: 'wheat_durum',
    actualPlantingDate: '2024-11-01',
    actualHarvestDate: '2025-05-01',
    actualIrrigationAmount: null,
    actualIrrigationUnit: null,
    actualIrrigationOrigin: null,
    observedCropCondition: 'moderate_stress',
    yieldValue: null,
    yieldUnit: null,
    yieldOrigin: null,
    observedWaterShortage: true,
    pestOrDiseaseObservations: null,
    farmerAssessment: 'Spring rain failed',
    supportingReferences: [],
    recordedPeriodRainfallMm: null,
    recordedRainfallSource: null,
    measuredPostSeasonSocPct: null,
    measuredPostSeasonSoilOrigin: null,
  },
  {
    outcomeId: 'o-2',
    fieldId: testField.fieldId,
    recommendationId: 'rec-old-2',
    seasonId: 's-2',
    reportedAt: '2026-05-05T10:00:00Z',
    updatedAt: '2026-05-05T10:00:00Z',
    actualCropPlanted: 'Barley',
    actualCropId: 'barley',
    actualPlantingDate: '2025-11-01',
    actualHarvestDate: '2026-05-01',
    actualIrrigationAmount: null,
    actualIrrigationUnit: null,
    actualIrrigationOrigin: null,
    observedCropCondition: 'severe_stress',
    yieldValue: null,
    yieldUnit: null,
    yieldOrigin: null,
    observedWaterShortage: true,
    pestOrDiseaseObservations: null,
    farmerAssessment: 'Dry spring again',
    supportingReferences: [],
    recordedPeriodRainfallMm: null,
    recordedRainfallSource: null,
    measuredPostSeasonSocPct: null,
    measuredPostSeasonSoilOrigin: null,
  },
];

const rec1: RecommendationSnapshot = {
  recommendationId: 'rec-old',
  fieldId: testField.fieldId,
  ownerId: 'local-unauthenticated',
  createdAt: '2025-01-10T10:00:00Z',
  kind: 'rotation',
  inputSignature: 's1',
  seasonContext: { seasonStart: null, seasonEnd: null, currentCropId: 'wheat_durum', previousCropId: null, horizonSeasons: 1, referenceDateUtc: '2025-01-10' },
  proposedSummary: { proposedCropIds: ['barley'], primaryCropId: 'barley' },
  inputSnapshot: { farmerContext: null, soilSourceKind: 'soilgrids_v2', thetaFc: 0.28, thetaWp: 0.14, socPct: 0.9, residueManagement: 'unknown' },
  environmentalDataRefs: [],
  soilDataRefs: [],
  calculationMethodVersion: 'v1',
  assumptionsEn: [],
  assumptionsAr: [],
  assumptionsFr: [],
  missingInputs: [],
  scientificLimitationsEn: [],
  scientificLimitationsAr: [],
  scientificLimitationsFr: [],
  explanationEn: 'Barley option',
  explanationAr: 'خيار الشعير',
  explanationFr: 'Option orge',
  status: 'accepted',
  statusUpdatedAt: '2025-01-10T10:00:00Z',
};

const rec2: RecommendationSnapshot = {
  ...rec1,
  recommendationId: 'rec-new',
  createdAt: '2026-06-01T10:00:00Z',
  inputSignature: 's2',
  proposedSummary: { proposedCropIds: ['chickpea', 'lentil'], primaryCropId: 'chickpea' },
  inputSnapshot: { ...rec1.inputSnapshot, soilSourceKind: 'farmer_lab' },
  explanationEn: 'Shifted to chickpea drought-hardy legume break',
};

// Test 1: Deterministic Evidence Learning detects repeated family conflicts, 2 shortages, and Delta triggers
const lc = deriveEvidenceLearningContext({
  fieldId: testField.fieldId,
  seasons: seasonsWithConflict,
  recommendations: [rec1, rec2],
  outcomes: shortageOutcomes,
});

assert(
  lc.rememberedSequenceCropIds.join(',') === 'wheat_durum,barley' &&
    lc.detectedRepeatedFamilyConflicts.some((c) => c.family === 'Poaceae') &&
    lc.recurringWaterShortageCount === 2 &&
    lc.recommendationDelta.changedCropsOrPathway &&
    lc.recommendationDelta.triggeringNewInformationEn.length >= 2,
  'LM-FUT-01',
  'Learning context remembers sequence, detects Poaceae repeat, flags 2 shortages, and explains recommendation delta'
);

const farmerCtx: FarmerContextProfile = {
  financialCapacity: 'moderate',
  primaryGoal: 'water_conservation',
  waterAndTechCapacity: 'limited_irrigation',
  culturalPractice: 'open_to_diversification',
  localContext: {
    countryOrRegion: 'Souss',
    familiarCrops: ['wheat_durum', 'barley', 'chickpea', 'faba_bean', 'onion'],
    season: 'autumn_winter',
    livestockIntegration: false,
    locallyAvailableCrops: [],
  },
};

const transState: PersistedTransitionState = {
  currentSequence: [],
  horizonSeasons: 3,
  maxAcceptableCostTier: 'moderate',
  availableIrrigationMmPerSeason: null,
  unfamiliarCropsAllowed: true,
  observedSoilDegradationNote: '',
  cropDecisions: {},
  resilienceFocus: null,
};

// Test 2: Refuses futures cleanly when climate/soil missing
const insufficientFutures = generateLandFuturesAssessment({
  fieldMemory: testField,
  seasons: seasonsWithConflict,
  recommendations: [rec1, rec2],
  outcomes: shortageOutcomes,
  climate: { nasaPower: null, nasaGpm: null },
  soil: null,
  farmerContext: farmerCtx,
  transitionState: transState,
});

assert(
  insufficientFutures.status === 'INSUFFICIENT_DATA' &&
    insufficientFutures.transitionPlan === null &&
    insufficientFutures.insufficientReasonsEn.length >= 2,
  'LM-FUT-02',
  'Refuses pathway generation under missing climate & soil baselines without inventing values'
);

// Test 3: Generates Path A, Path B, Path C when synthetic test climate & soil fixture provided
const climateFixture: {
  nasaPower: NasaPowerObservation;
  nasaGpm: NasaGpmObservation;
  et0DailyValues: Array<{ date: string; et0MmDay: number | null }>;
} = {
  nasaPower: {
    temperature2m: 19.5,
    temperatureMin: 12,
    temperatureMax: 27,
    relativeHumidity2m: 58,
    windSpeed2m: 2.3,
    solarRadiation: 17.8,
    precipitationMm: 0,
    observationDateUtc: '2026-03-01',
    observationDateLocal: '2026-03-01',
    retrievalTimestamp: '2026-03-05T00:00:00Z',
    spatialResolution: '0.5° x 0.625° (~50 km)',
    temporalResolution: 'Daily average assimilation',
    dataStatus: 'VERIFIED',
    freshness: 'fresh',
    source: 'NASA POWER Agroclimatology (MERRA-2 / GEOS-FP)',
    dailyHistory: Array.from({ length: 30 }, (_, i) => ({
      date: `2026-02-${String((i % 28) + 1).padStart(2, '0')}`,
      temperature: 19,
      humidity: 58,
      precipitation: i % 10 === 0 ? 4 : 0,
      radiation: 17.8,
    })),
  },
  nasaGpm: {
    dailyRainfallMm: 0,
    monthlyAccumulationMm: 18,
    historicalAverageMonthlyMm: 35,
    anomalyPercent: -48.6,
    observationDateUtc: '2026-03-01',
    retrievalTimestamp: '2026-03-05T00:00:00Z',
    spatialResolution: '0.5° x 0.625° (~50 km)',
    temporalResolution: 'Daily accumulation',
    dataStatus: 'VERIFIED',
    freshness: 'fresh',
    source: 'NASA POWER Precipitation',
  },
  et0DailyValues: Array.from({ length: 10 }, (_, i) => ({
    date: `2026-02-${String(i + 1).padStart(2, '0')}`,
    et0MmDay: 3.6,
  })),
};

const soilFixture: SoilHydraulicResult = {
  sourceKind: 'soilgrids_v2',
  sourceLabel: 'ISRIC SoilGrids v2.0 Test Fixture',
  origin: 'spatial_estimate',
  isSpatialEstimate: true,
  thetaFc: {
    value: 0.27,
    unit: 'm³/m³',
    parameterName: 'theta_fc',
    origin: 'spatial_estimate',
    source: 'SoilGrids v2.0 Test Fixture',
    observationDate: 'Static reference',
    retrievalTimestamp: '2026-03-05T00:00:00Z',
    spatialResolution: '250 m',
  },
  thetaWp: {
    value: 0.12,
    unit: 'm³/m³',
    parameterName: 'theta_wp',
    origin: 'spatial_estimate',
    source: 'SoilGrids v2.0 Test Fixture',
    observationDate: 'Static reference',
    retrievalTimestamp: '2026-03-05T00:00:00Z',
    spatialResolution: '250 m',
  },
  awcMmPerM: 150,
  hydrologicGroup: 'B',
  curveNumber: 78,
  layers: [
    {
      depthLabel: '0-30cm',
      depthTopCm: 0,
      depthBottomCm: 30,
      clayPct: 20,
      sandPct: 40,
      siltPct: 40,
      organicCarbonPct: 1.2,
      organicMatterPct: 2.07,
      bulkDensityGCm3: 1.4,
    },
  ],
  notes: ['250 m spatial soil fixture for tests'],
  retrievalTimestamp: '2026-03-05T00:00:00Z',
  soilGridsStatus: 'VERIFIED',
};

const readyFutures = generateLandFuturesAssessment({
  fieldMemory: testField,
  seasons: seasonsWithConflict,
  recommendations: [rec1, rec2],
  outcomes: shortageOutcomes,
  climate: climateFixture,
  soil: soilFixture,
  farmerContext: farmerCtx,
  transitionState: transState,
  previousCropResidue: 'incorporated',
});

assert(
  readyFutures.status === 'PLANS_READY' &&
    Boolean(readyFutures.transitionPlan?.recommendedPathway) &&
    readyFutures.hardConstraintsAppliedEn.length >= 2 &&
    readyFutures.rankingPreferencesEn.length >= 2 &&
    readyFutures.localVerificationConditionsEn.length >= 2,
  'LM-FUT-03',
  'Generates Path A/B/C from remembered field seasons & distinguishes hard constraints vs preferences',
  `status=${readyFutures.status}, block=${readyFutures.insufficientReasonsEn.join(' | ')}`
);

console.log(`\n[futures.test.ts] Passed ${passed}/${total} assertions.`);
if (passed !== total) process.exit(1);
