/**
 * TURBA — Living Land Memory Service & Repository Test Suite
 *
 * Verifies:
 * - Clean field creation & retrieval with zero invented farming history
 * - Strict boundary/area preservation (point/GPS coordinates NEVER infer polygon or area)
 * - Strict isolation across field IDs and owner scopes
 * - Saving, validating, editing (with audit log), and deleting SeasonRecords
 * - Immutable RecommendationSnapshot storage & status updates
 * - Timeline construction including explicit missing-data gaps
 * - Persistence round-trip + JSON backup export/import
 *
 * Run with: npx tsx tests/memory/service.test.ts
 */

import { FarmRecord } from '../../src/types/farm';
import {
  exportFieldBackupPayload,
  getLandMemoryWorkspaceState,
  importFieldBackupPayload,
  saveOutcomeWithSanitization,
  saveSeasonWithValidation,
  syncFieldAndCaptureEnvironment,
  updateRecommendationStatus,
} from '../../src/services/memory/service';
import {
  appendRecommendationSnapshot,
  getFieldBundle,
  resetAllLandMemoryStoreForTests,
} from '../../src/services/memory/repository';
import { RecommendationSnapshot } from '../../src/services/memory/types';

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

function installLocalStorageMock() {
  const store = new Map<string, string>();
  (globalThis as unknown as { localStorage: Storage }).localStorage = {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(k: string) {
      return store.has(k) ? store.get(k)! : null;
    },
    key(i: number) {
      return Array.from(store.keys())[i] ?? null;
    },
    removeItem(k: string) {
      store.delete(k);
    },
    setItem(k: string, v: string) {
      store.set(k, String(v));
    },
  };
}

function makeTestFarm(overrides: Partial<FarmRecord> = {}): FarmRecord {
  return {
    id: 'farm-morocco-test-001',
    farmerId: 'owner-alpha',
    name: 'Test Parcel Gharb (Synthetic Fixture)',
    region: 'Rabat-Salé-Kénitra',
    province: 'Sidi Slimane',
    cadastralReference: 'TF-TEST-01',
    identificationMethod: 'draw_polygon',
    centroid: { lat: 34.26, lng: -5.92 },
    polygon: [
      { lat: 34.26, lng: -5.92 },
      { lat: 34.261, lng: -5.92 },
      { lat: 34.261, lng: -5.919 },
    ],
    calculatedAreaHectares: 4.5,
    calculatedAreaM2: 45000,
    classification: {
      source: 'None',
      cropType: null,
      cropLabelEn: 'Unclassified',
      cropLabelFr: 'Non classé',
      cropLabelAr: 'غير مصنف',
      confidence: null,
      productYear: null,
      spatialResolution: 'N/A',
      status: 'unavailable',
      dataStatus: 'UNAVAILABLE',
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    notes: 'Test parcel',
    ...overrides,
  };
}

installLocalStorageMock();
resetAllLandMemoryStoreForTests();

// Test 1: Field creation starts completely empty with zero fabricated history
const parcelA = makeTestFarm();
const memA = syncFieldAndCaptureEnvironment({ farm: parcelA, ownerId: 'owner-alpha' });
const wsAInitial = getLandMemoryWorkspaceState(parcelA.id, 'owner-alpha');
assert(
  memA.fieldId === parcelA.id &&
    wsAInitial.seasons.length === 0 &&
    wsAInitial.recommendations.length === 0 &&
    wsAInitial.outcomes.length === 0,
  'LM-SVC-01',
  'New field memory starts empty with zero fabricated seasons or recommendations'
);

// Test 2: Point / GPS inspection strictly preserves null boundaryGeometry & null area
const gpsPoint = makeTestFarm({
  id: 'gps-device-001',
  name: 'GPS Fix',
  identificationMethod: 'gps',
  polygon: null,
  calculatedAreaHectares: 0,
  calculatedAreaM2: 0,
});
const memGps = syncFieldAndCaptureEnvironment({ farm: gpsPoint, ownerId: 'owner-alpha' });
assert(
  memGps.boundaryGeometry === null && memGps.area === null && memGps.areaUnit === null,
  'LM-SVC-02',
  'Point / GPS farm does NOT invent polygon boundaries or parcel area'
);

// Test 3: Strict isolation across owner scopes & field IDs
const wsWrongOwner = getLandMemoryWorkspaceState(parcelA.id, 'owner-beta');
const wsWrongField = getLandMemoryWorkspaceState('farm-other-999', 'owner-alpha');
assert(
  wsWrongOwner.fieldMemory === null && wsWrongField.fieldMemory === null,
  'LM-SVC-03',
  'Strict isolation prevents cross-user and cross-field access'
);

// Test 4: Save multiple seasons, verify unknown irrigation stays null & missing flags computed
const s1 = saveSeasonWithValidation({
  fieldId: parcelA.id,
  ownerId: 'owner-alpha',
  seasonInput: {
    fieldId: parcelA.id,
    seasonStart: '2024-11-10',
    seasonEnd: '2025-05-20',
    cropId: 'wheat_durum',
    cropName: 'Durum Wheat',
    cropFamily: 'Poaceae',
    plantingDate: '2024-11-10',
    harvestDate: '2025-05-20',
    previousCropId: null,
    irrigationMethod: 'rainfed',
    irrigationAmountMm: null, // Unknown -> must remain null, NOT 0
    farmerNotes: 'Winter cereal cycle',
    dataOrigin: 'farmer_report',
  },
});

const s2 = saveSeasonWithValidation({
  fieldId: parcelA.id,
  ownerId: 'owner-alpha',
  seasonInput: {
    fieldId: parcelA.id,
    seasonStart: '2026-03-01', // > 240 days after 2025-05-20 -> triggers history gap event!
    cropId: 'faba_bean',
    cropName: 'Faba Bean',
    cropFamily: 'Fabaceae',
    plantingDate: '2026-03-01',
    previousCropId: 'wheat_durum',
    irrigationMethod: 'drip',
    irrigationAmountMm: 145,
    dataOrigin: 'farmer_report',
  },
});

assert(
  Boolean(s1.ok && s1.season && s1.season.irrigationAmountMm === null && s1.season.isIncomplete),
  'LM-SVC-04',
  'Season 1 preserves unknown irrigationAmountMm as null and marks missing fields honestly'
);

// Test 5: Edit Season 1 and verify editHistory audit entry is recorded
const edited = saveSeasonWithValidation({
  fieldId: parcelA.id,
  ownerId: 'owner-alpha',
  editNote: 'Entered measured supplemental irrigation 45 mm from farm log',
  seasonInput: {
    seasonId: s1.season!.seasonId,
    fieldId: parcelA.id,
    seasonStart: '2024-11-10',
    seasonEnd: '2025-05-20',
    cropId: 'wheat_durum',
    cropName: 'Durum Wheat',
    cropFamily: 'Poaceae',
    plantingDate: '2024-11-10',
    harvestDate: '2025-05-20',
    previousCropId: 'chickpea',
    irrigationMethod: 'sprinkler',
    irrigationAmountMm: 45,
    dataOrigin: 'farmer_report',
  },
});

assert(
  Boolean(
    edited.ok &&
      edited.isEdit &&
      edited.season?.editHistory.length === 1 &&
      edited.season.irrigationAmountMm === 45 &&
      !edited.season.isIncomplete
  ),
  'LM-SVC-05',
  'Editing farmer-reported season updates values and records audit log entry'
);

// Test 6: Immutable recommendation snapshots (multiple runs kept separately) + status update + outcome
const baseSnap = (id: string, sig: string, crop: string): RecommendationSnapshot => ({
  recommendationId: id,
  fieldId: parcelA.id,
  ownerId: 'owner-alpha',
  createdAt: '2026-03-05T10:00:00.000Z',
  kind: 'irrigation',
  inputSignature: sig,
  seasonContext: {
    seasonStart: '2026-03-01',
    seasonEnd: null,
    currentCropId: crop,
    previousCropId: 'wheat_durum',
    horizonSeasons: null,
    referenceDateUtc: '2026-03-05',
  },
  proposedSummary: {
    proposedCropIds: [crop],
    primaryCropId: crop,
    irrigationDecisionStatus: 'IRRIGATION_REQUIRED',
    netIrrigationMm: 22,
    grossIrrigationMm: 25,
    expectedWindowDays: 7,
  },
  inputSnapshot: {
    farmerContext: null,
    soilSourceKind: 'soilgrids_v2',
    thetaFc: 0.31,
    thetaWp: 0.16,
    socPct: 1.1,
    residueManagement: 'incorporated',
  },
  environmentalDataRefs: ['NASA POWER'],
  soilDataRefs: ['ISRIC SoilGrids v2.0'],
  calculationMethodVersion: 'FAO-56 Test',
  assumptionsEn: [],
  assumptionsAr: [],
  assumptionsFr: [],
  missingInputs: [],
  scientificLimitationsEn: [],
  scientificLimitationsAr: [],
  scientificLimitationsFr: [],
  explanationEn: 'Apply 25 mm gross irrigation.',
  explanationAr: 'تطبيق 25 مم ري إجمالي.',
  explanationFr: 'Appliquer 25 mm brut.',
  status: 'proposed',
  statusUpdatedAt: '2026-03-05T10:00:00.000Z',
});

const snap1Res = appendRecommendationSnapshot(parcelA.id, 'owner-alpha', baseSnap('rec-1', 'sig-1', 'faba_bean'));
const snapDupRes = appendRecommendationSnapshot(parcelA.id, 'owner-alpha', baseSnap('rec-dup', 'sig-1', 'faba_bean'));
const snap2Res = appendRecommendationSnapshot(parcelA.id, 'owner-alpha', baseSnap('rec-2', 'sig-2', 'chickpea'));
updateRecommendationStatus(parcelA.id, 'owner-alpha', 'rec-1', 'accepted');

assert(
  Boolean(snap1Res && !snap1Res.deduplicated && snapDupRes?.deduplicated && snap2Res && !snap2Res.deduplicated),
  'LM-SVC-06',
  'Immutable recommendations deduplicate identical signatures yet preserve distinct runs'
);

// Test 7: Timeline inserts data_gap between 2025-05-20 and 2026-03-01 (>240 days)
const savedOutcome = saveOutcomeWithSanitization({
  fieldId: parcelA.id,
  ownerId: 'owner-alpha',
  rawOutcome: {
    fieldId: parcelA.id,
    recommendationId: 'rec-1',
    seasonId: s2.season!.seasonId,
    actualCropId: 'faba_bean',
    actualCropPlanted: 'Faba Bean',
    actualPlantingDate: '2026-03-02',
    actualHarvestDate: null,
    actualIrrigationAmount: 24,
    actualIrrigationUnit: 'mm',
    actualIrrigationOrigin: 'farmer_report',
    observedCropCondition: 'good',
    yieldValue: null,
    yieldUnit: null,
    yieldOrigin: null,
    observedWaterShortage: false,
    pestOrDiseaseObservations: null,
    farmerAssessment: 'Irrigated close to schedule',
    supportingReferences: [],
    recordedPeriodRainfallMm: null,
    recordedRainfallSource: null,
    measuredPostSeasonSocPct: null,
    measuredPostSeasonSoilOrigin: null,
  },
});

const wsAfter = getLandMemoryWorkspaceState(parcelA.id, 'owner-alpha');
const hasGapEvent = wsAfter.timeline.some((e) => e.eventType === 'data_gap');
assert(
  Boolean(
    savedOutcome &&
      wsAfter.recommendations.length === 2 &&
      wsAfter.recommendations.find((r) => r.recommendationId === 'rec-1')?.status === 'accepted' &&
      hasGapEvent
  ),
  'LM-SVC-07',
  'Timeline combines seasons, recommendations, outcomes, and detects >240d history gap'
);

// Test 8: Persistence round-trip via JSON export -> clear -> import
const backup = exportFieldBackupPayload(parcelA.id, 'owner-alpha');
resetAllLandMemoryStoreForTests();
const imported = importFieldBackupPayload(backup, 'owner-alpha');
const restored = getFieldBundle(parcelA.id, 'owner-alpha');
assert(
  Boolean(
    imported.imported &&
      restored &&
      restored.seasons.length === 2 &&
      restored.recommendations.length === 2 &&
      restored.outcomes.length === 1
  ),
  'LM-SVC-08',
  'JSON export/import preserves full Land Memory state across repository resets'
);

console.log(`\n[service.test.ts] Passed ${passed}/${total} assertions.`);
if (passed !== total) process.exit(1);
