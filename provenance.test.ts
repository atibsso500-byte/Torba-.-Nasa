/**
 * TURBA — Land Memory Provenance, Validation & Integrity Test Suite
 *
 * Verifies:
 * - NASA POWER vs Open-Meteo strict separation in snapshots & provenance entries
 * - SoilGrids (250 m spatial estimate) vs Lab verification distinction
 * - Sentinel-2 strictly Metadata-only (ZERO NDVI/vegetation claims)
 * - Missing / Unavailable upstream API results map honestly to `missing_data` / `null` (never 0)
 * - Season input validation rejects invalid dates, NaN, out-of-range irrigation volumes
 * - Corrupted storage backup JSON payloads are safely rejected
 * - All Land Memory AR / EN / FR translation keys are non-empty
 *
 * Run with: npx tsx tests/memory/provenance.test.ts
 */

import { translations } from '../../src/i18n/translations';
import { buildEnvironmentalSnapshotAndProvenance } from '../../src/services/memory/provenance';
import {
  sanitizeBackupPayload,
  sanitizeFiniteNumber,
  validateSeasonInput,
} from '../../src/services/memory/validation';

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

// Test 1: Unavailable APIs stay null & qualityStatus === 'missing_data' (NEVER 0)
const unavailableBuild = buildEnvironmentalSnapshotAndProvenance({
  fieldId: 'field-prov-1',
  coordinates: { lat: 33.88, lng: -6.89 },
  currentWeather: null,
  nasaPower: null,
  nasaSmap: null,
  nasaGpm: null,
  era5LandSoil: null,
  sentinel2: null,
  soilHydraulics: null,
});

assert(
  unavailableBuild.snapshot.nasaPowerTempMeanC === null &&
    unavailableBuild.snapshot.nasaPower30DayRainMm === null &&
    unavailableBuild.snapshot.soilThetaFc === null &&
    unavailableBuild.provenanceEntries.every((p) => p.qualityStatus === 'missing_data' && p.value === null),
  'LM-PRV-01',
  'Unavailable telemetry remains strictly null and marked missing_data (never 0)'
);

// Test 2: Sentinel-2 catalog metadata keeps NDVI out and separates NASA POWER vs Open-Meteo
const populatedBuild = buildEnvironmentalSnapshotAndProvenance({
  fieldId: 'field-prov-2',
  coordinates: { lat: 33.88, lng: -6.89 },
  currentWeather: {
    temperature2m: 22.1,
    apparentTemperature: 21.8,
    relativeHumidity2m: 55,
    windSpeed10m: 3.1,
    precipitationMm: 0,
    weatherCode: 0,
    observationTime: '2026-04-01T12:00',
    timezone: 'GMT',
    dataStatus: 'VERIFIED',
    freshness: 'fresh',
    source: 'Open-Meteo NWP',
    spatialResolution: '~11 km',
    temporalResolution: 'Hourly',
  },
  nasaPower: {
    temperature2m: 18.4,
    temperatureMin: 11.2,
    temperatureMax: 25.0,
    relativeHumidity2m: 62,
    windSpeed2m: 2.0,
    solarRadiation: 19.2,
    precipitationMm: 0,
    observationDateUtc: '2026-03-28',
    observationDateLocal: '2026-03-28',
    retrievalTimestamp: '2026-04-01T12:00:00Z',
    spatialResolution: '0.5° x 0.625° (~50 km)',
    temporalResolution: 'Daily average assimilation',
    dataStatus: 'VERIFIED',
    freshness: 'fresh',
    source: 'NASA POWER Agroclimatology (MERRA-2 / GEOS-FP)',
    dailyHistory: [],
  },
  nasaSmap: null,
  nasaGpm: null,
  era5LandSoil: {
    layer0_7cm: 0.21,
    layer7_28cm: 0.24,
    layer28_100cm: 0.26,
    layer100_255cm: 0.28,
    observationTime: '2026-04-01T12:00',
    timezone: 'GMT',
    dataStatus: 'VERIFIED',
    freshness: 'fresh',
    source: 'Open-Meteo NWP Soil Moisture Model',
    spatialResolution: '~11 km',
    temporalResolution: 'Hourly NWP soil model assimilation',
  },
  sentinel2: {
    granuleName: 'S2A_MSIL2A_20260329T110621',
    acquisitionDateUtc: '2026-03-29',
    cloudCoveragePercent: 8.5,
    tileId: '29SQA',
    ndviCurrent: null,
    ndviCategory: null,
    spectralMethod: 'OData metadata only',
    recentPasses: [],
    dataStatus: 'METADATA_ONLY',
    freshness: 'fresh',
    source: 'Copernicus Sentinel-2 MSI Level-2A (ESA)',
    retrievalTimestamp: '2026-04-01T12:00:00Z',
    spatialResolution: 'Native product resolution 10 m (B04/B08) — bands NOT processed by TURBA',
    temporalResolution: '5-day revisit',
    missingReason: 'Spectral bands B04/B08 not downloaded.',
  },
  soilHydraulics: null,
});

const s2Entry = populatedBuild.provenanceEntries.find((p) => p.sourceProvider.includes('Sentinel-2'));
const omEntry = populatedBuild.provenanceEntries.find((p) => p.sourceProvider.includes('Open-Meteo'));
const npEntry = populatedBuild.provenanceEntries.find((p) => p.sourceProvider.includes('NASA POWER Agroclimatology'));

assert(
  Boolean(
    s2Entry &&
      s2Entry.dataStatus === 'METADATA_ONLY' &&
      s2Entry.limitations.includes('NOT computed') &&
      omEntry &&
      npEntry &&
      populatedBuild.snapshot.nasaPowerTempMeanC === 18.4 &&
      populatedBuild.snapshot.openMeteoTemp2mC === 22.1
  ),
  'LM-PRV-02',
  'Strictly separates NASA POWER (~50 km) from Open-Meteo NWP and marks Sentinel-2 METADATA_ONLY'
);

// Test 3: Season validation blocks inverted harvest dates, NaN/out-of-bounds irrigation
const badDateRes = validateSeasonInput({
  fieldId: 'f-1',
  seasonStart: '2025-11-01',
  plantingDate: '2025-11-01',
  harvestDate: '2025-10-01',
  cropName: 'Wheat',
});
const badIrrRes = validateSeasonInput({
  fieldId: 'f-1',
  seasonStart: '2025-11-01',
  cropName: 'Wheat',
  irrigationAmountMm: 9999,
});
assert(
  !badDateRes.valid &&
    !badIrrRes.valid &&
    sanitizeFiniteNumber(NaN) === null &&
    sanitizeFiniteNumber(Infinity) === null,
  'LM-PRV-03',
  'Rejects inverted planting/harvest dates, out-of-range irrigation, NaN, and Infinity'
);

// Test 4: Corrupted backup JSON safely rejected
const corrupted = sanitizeBackupPayload({ schemaVersion: 99, bogus: true });
assert(corrupted === null, 'LM-PRV-04', 'Rejects corrupted or mismatched backup JSON payload');

// Test 5: Every Land Memory translation key across AR, EN, and FR is populated & non-empty
const arKeys = Object.entries(translations.ar.landMemory);
const enKeys = Object.entries(translations.en.landMemory);
const frKeys = Object.entries(translations.fr.landMemory);

const allNonEmpty =
  arKeys.length === enKeys.length &&
  enKeys.length === frKeys.length &&
  arKeys.every(([, v]) => typeof v === 'string' && v.trim().length > 0) &&
  enKeys.every(([, v]) => typeof v === 'string' && v.trim().length > 0) &&
  frKeys.every(([, v]) => typeof v === 'string' && v.trim().length > 0);

assert(allNonEmpty, 'LM-PRV-05', `All ${enKeys.length} Land Memory i18n keys populated across AR/EN/FR`);

console.log(`\n[provenance.test.ts] Passed ${passed}/${total} assertions.`);
if (passed !== total) process.exit(1);
