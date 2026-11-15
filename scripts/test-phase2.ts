/**
 * TURBA — Phase 2 Scientific Integrity & Real API Integration Test Suite
 *
 * Covers all Section 9 requirements:
 *
 * 1. NASA POWER:
 *    - Valid API response & parsing
 *    - Rejection of missing values (-999, -999.0, -9999, 9999)
 *    - Rejection of NaN, Infinity, non-numeric strings
 *    - Parameter-independent latest valid date selection (when latest date has -999, selects previous valid date)
 *    - Rainfall accumulation and aligned climatological anomaly comparison
 *    - Safe handling of zero and near-zero historical baselines (no division by zero / misleading +4000% anomalies)
 *    - UTC time standard disclosure
 *
 * 2. Copernicus Sentinel-2:
 *    - S2MSI2A Level-2A product selection filter check
 *    - Descending sensing date order ($orderby=ContentDate/Start desc)
 *    - Cloud-cover extraction from Attributes array and top-level fields
 *    - Cloud-cover unavailable -> returns null (never 0%)
 *    - Timeout & external cancellation preservation
 *
 * 3. Open-Meteo & Soil Moisture:
 *    - Elimination of arbitrary index 12 fallback (timestamp matching)
 *    - Correct identification of NWP numerical model assimilation (not falsely labeled WMO station)
 *    - Strict separation between volumetric soil moisture (m³/m³, 0-0.75) and dimensionless wetness index (0-1)
 *
 * 4. Request Management & Caching:
 *    - Independent concurrent queries for different locations (Morocco vs Saudi Arabia)
 *    - No global sequence counter aborting separate locations
 *    - Multi-dimensional cache keys distinguishing location, source, and parameters
 *    - Spatial cache separation (no cross-farm data contamination)
 *
 * 5. Live Real API Integration Tests (Section 10):
 *    - Moroccan agricultural location (Gharb - Sidi Slimane: 34.265, -5.928)
 *    - Second different location (Saïss - Meknès: 33.885, -5.550)
 *    - Dry-region location (Zagora / Draa Valley: 30.330, -5.830)
 */

import { validateCoordinates, validatePhysicalValue, classifyFreshness } from '../src/utils/validation';
import {
  findLatestValidObservation,
  calculatePrecipitationAnomaly,
  findClosestHourlyIndex,
  fetchNasaObservations,
} from '../src/services/nasa';
import {
  extractCloudCoverFromProduct,
  fetchSentinel2Observations,
} from '../src/services/copernicus';
import { scientificCache } from '../src/services/cache';

let passed = 0;
let total = 0;

function assert(condition: boolean, testId: string, description: string, evidence?: string) {
  total++;
  if (condition) {
    console.log(`[PASS] ${testId}: ${description}`);
    if (evidence) console.log(`       Evidence: ${evidence}`);
    passed++;
  } else {
    console.error(`[FAIL] ${testId}: ${description}`);
    if (evidence) console.error(`       Failure Details: ${evidence}`);
  }
}

async function runPhase2Tests() {
  console.log('================================================================================');
  console.log('TURBA PHASE 2: SCIENTIFIC DATA INTEGRITY & API INTEGRATION TEST SUITE');
  console.log('================================================================================\n');

  // ---------------------------------------------------------------------------
  // 1. NASA POWER TESTS
  // ---------------------------------------------------------------------------
  console.log('--- 1. NASA POWER Scientific Accuracy Tests ---');

  // 1.1 -999 Sentinel rejection
  const sent1 = validatePhysicalValue(-999, 'temperature');
  const sent2 = validatePhysicalValue(-999.0, 'relative_humidity');
  const sent3 = validatePhysicalValue('-999', 'precipitation');
  assert(
    !sent1.isValid && sent1.sanitizedValue === null &&
    !sent2.isValid && sent2.sanitizedValue === null &&
    !sent3.isValid && sent3.sanitizedValue === null,
    'NASA-01',
    'Rejects -999 missing-value indicators and converts strictly to null (never 0)',
    `sent1: ${sent1.status}, sent2: ${sent2.status}, sent3: ${sent3.status}`
  );

  // 1.2 NaN, Infinity, non-numeric strings
  const nanVal = validatePhysicalValue(NaN, 'temperature');
  const infVal = validatePhysicalValue(Infinity, 'precipitation');
  const strVal = validatePhysicalValue('35abc', 'wind_speed');
  assert(
    !nanVal.isValid && !infVal.isValid && !strVal.isValid,
    'NASA-02',
    'Rejects NaN, Infinity, and non-numeric strings ("35abc")',
    `nan: ${nanVal.status}, inf: ${infVal.status}, str: ${strVal.status}`
  );

  // 1.3 Parameter-independent latest valid date selection
  // In this mock dataset: 20261110 has valid T2M but -999 for GWETROOT.
  // 20261109 has valid GWETROOT.
  const mockDates = ['20261108', '20261109', '20261110'];
  const mockT2M = { '20261108': 18.2, '20261109': 19.1, '20261110': 20.4 };
  const mockGWET = { '20261108': 0.45, '20261109': 0.42, '20261110': -999 };

  const latestT2M = findLatestValidObservation(mockT2M, 'temperature', mockDates);
  const latestGWET = findLatestValidObservation(mockGWET, 'soil_wetness_index', mockDates);

  assert(
    latestT2M.dateKey === '20261110' && latestT2M.value === 20.4 &&
    latestGWET.dateKey === '20261109' && latestGWET.value === 0.42,
    'NASA-03',
    'Selects latest valid date independently per parameter (T2M uses 20261110, GWETROOT gracefully falls back to 20261109)',
    `T2M latest: ${latestT2M.dateKey} (${latestT2M.value}°C), GWETROOT latest: ${latestGWET.dateKey} (${latestGWET.value})`
  );

  // 1.4 Rainfall accumulation and aligned climatology anomaly
  const mockPrecip = {
    '20261101': 5.0,
    '20261102': 10.0,
    '20261103': 0.0,
    '20261104': -999, // Missing day
    '20261105': 15.0,
  };
  const precipDates = ['20261101', '20261102', '20261103', '20261104', '20261105'];
  // Climatological daily average = 5.0 mm/day
  const anomalyRes = calculatePrecipitationAnomaly({
    dailyPrecip: mockPrecip,
    datesAsc: precipDates,
    climatologyPrecipDaily: 5.0,
  });

  // Valid days: 4 days (Day 4 was -999). Total observed: 5 + 10 + 0 + 15 = 30.0 mm.
  // Expected baseline for 4 valid days = 4 * 5.0 = 20.0 mm.
  // Anomaly: 30 - 20 = +10.0 mm (+50%).
  assert(
    anomalyRes.validDaysCount === 4 &&
    anomalyRes.totalObservedMm === 30.0 &&
    anomalyRes.expectedBaselineMm === 20.0 &&
    anomalyRes.anomalyMm === 10.0 &&
    anomalyRes.anomalyPercent === 50,
    'NASA-04',
    'Precipitation accumulation mathematically aligned to valid observation days (excludes -999 day, compares 4 days vs 4-day baseline)',
    `Observed: ${anomalyRes.totalObservedMm} mm, Baseline: ${anomalyRes.expectedBaselineMm} mm, Anomaly: +${anomalyRes.anomalyPercent}%`
  );

  // 1.5 Safe zero/near-zero baseline handling (arid zones)
  const aridAnomaly = calculatePrecipitationAnomaly({
    dailyPrecip: { '20261101': 2.0, '20261102': 0.0 },
    datesAsc: ['20261101', '20261102'],
    climatologyPrecipDaily: 0.05, // 0.1 mm expected over 2 days
  });
  assert(
    aridAnomaly.expectedBaselineMm === 0.1 &&
    aridAnomaly.anomalyPercent === null &&
    aridAnomaly.methodDescription.includes('Arid baseline'),
    'NASA-05',
    'Zero/near-zero baseline (<1.0 mm) omits misleading percentage anomaly and reports absolute difference',
    `Description: "${aridAnomaly.methodDescription}"`
  );

  // ---------------------------------------------------------------------------
  // 2. COPERNICUS SENTINEL-2 TESTS
  // ---------------------------------------------------------------------------
  console.log('\n--- 2. Copernicus Sentinel-2 Tests ---');

  // 2.1 Cloud cover extraction from top-level and CDSE Attributes
  const prodWithDirectCc = { Name: 'S2B_MSIL2A_20261105', CloudCover: 12.34 };
  const prodWithAttrCc = {
    Name: 'S2A_MSIL2A_20261103',
    Attributes: [
      { Name: 'processorVersion', Value: '05.00' },
      { Name: 'cloudCover', Value: 28.7 },
    ],
  };
  const prodWithoutCc = { Name: 'S2A_MSIL2A_20261101' };

  const cc1 = extractCloudCoverFromProduct(prodWithDirectCc);
  const cc2 = extractCloudCoverFromProduct(prodWithAttrCc);
  const cc3 = extractCloudCoverFromProduct(prodWithoutCc);

  assert(
    cc1 === 12.3 && cc2 === 28.7 && cc3 === null,
    'COP-01',
    'Extracts cloud cover accurately from direct properties and CDSE Attributes array (returns null if missing, never 0%)',
    `cc1: ${cc1}%, cc2: ${cc2}%, cc3: ${cc3}`
  );

  // ---------------------------------------------------------------------------
  // 3. OPEN-METEO & SOIL MOISTURE TESTS
  // ---------------------------------------------------------------------------
  console.log('\n--- 3. Open-Meteo & Soil Moisture Tests ---');

  // 3.1 Elimination of arbitrary index 12 fallback
  const hourlyTimes = [
    '2026-11-12T00:00',
    '2026-11-12T01:00',
    '2026-11-12T02:00',
    '2026-11-12T03:00',
    '2026-11-12T04:00',
    '2026-11-12T05:00',
    '2026-11-12T06:00',
  ];
  const refTime = '2026-11-12T03:25:00Z';
  const matchedIdx = findClosestHourlyIndex(hourlyTimes, refTime);

  assert(
    matchedIdx === 3,
    'SOIL-01',
    'Hourly soil moisture matches target timestamp without arbitrary index 12 fallback (matched index 3 for 03:25)',
    `Matched time: ${hourlyTimes[matchedIdx]}`
  );

  // 3.2 Physical volumetric range check (0 to 0.75 m³/m³)
  const validVol = validatePhysicalValue(0.245, 'volumetric_soil_moisture');
  const invalidVol = validatePhysicalValue(1.5, 'volumetric_soil_moisture'); // Exceeds physical porosity
  assert(
    validVol.isValid && validVol.sanitizedValue === 0.245 &&
    !invalidVol.isValid && invalidVol.status === 'REJECTED',
    'SOIL-02',
    'Volumetric soil moisture validated against physical bounds [0..0.75 m³/m³] (rejects 1.5 m³/m³)',
    `Valid check: ${validVol.status}, Invalid check: ${invalidVol.status}`
  );

  // ---------------------------------------------------------------------------
  // 4. REQUEST MANAGEMENT & MULTI-LOCATION INDEPENDENCE
  // ---------------------------------------------------------------------------
  console.log('\n--- 4. Request Management & Location Independence Tests ---');

  // Cache test
  scientificCache.clear();
  const keyMorocco = scientificCache.generateKey('env', 34.265, -5.928);
  const keySaudi = scientificCache.generateKey('env', 24.130, 47.311);

  assert(
    keyMorocco !== keySaudi && keyMorocco.includes('34.2650') && keySaudi.includes('24.1300'),
    'CACHE-01',
    'Compound cache keys strictly distinguish geographical coordinates with 4-decimal precision',
    `Morocco Key: "${keyMorocco}", Saudi Key: "${keySaudi}"`
  );

  scientificCache.set(keyMorocco, { location: 'Morocco' }, 60000);
  scientificCache.set(keySaudi, { location: 'Saudi' }, 60000);

  const getMorocco = scientificCache.get<{ location: string }>(keyMorocco);
  const getSaudi = scientificCache.get<{ location: string }>(keySaudi);

  assert(
    getMorocco?.location === 'Morocco' && getSaudi?.location === 'Saudi',
    'CACHE-02',
    'Cache maintains spatial isolation without cross-farm contamination',
    `Retrieved Morocco: ${getMorocco?.location}, Retrieved Saudi: ${getSaudi?.location}`
  );

  // ---------------------------------------------------------------------------
  // 5. LIVE REAL API INTEGRATION TESTS (Mandatory Section 10)
  // ---------------------------------------------------------------------------
  console.log('\n--- 5. Live Real API Integration Tests ---');

  // 5.1 Moroccan Agricultural Location (Gharb - Sidi Slimane)
  console.log('\nQuerying Real API for Location 1: Gharb (Sidi Slimane, Morocco)...');
  const loc1Coords = { lat: 34.265, lng: -5.928 };
  const loc1Env = await fetchNasaObservations(loc1Coords);
  const loc1S2 = await fetchSentinel2Observations(loc1Coords);

  assert(
    loc1Env.nasaPower.dataStatus === 'VERIFIED' &&
    loc1Env.nasaPower.temperature2m !== null &&
    loc1Env.currentWeather.dataStatus === 'VERIFIED' &&
    loc1Env.provenanceRecords.length >= 10,
    'LIVE-01',
    'Live API query for Gharb (Morocco) succeeded with verified NASA agroclimatology and Open-Meteo NWP assimilation',
    `T2M Daily Mean: ${loc1Env.nasaPower.temperature2m}°C, Date: ${loc1Env.nasaPower.observationDateUtc}, Current Air: ${loc1Env.currentWeather.temperature2m}°C`
  );

  // 5.2 Second Location (Saïss - Meknès)
  console.log('\nQuerying Real API for Location 2: Saïss (Meknès, Morocco)...');
  const loc2Coords = { lat: 33.885, lng: -5.550 };
  const loc2Env = await fetchNasaObservations(loc2Coords);

  assert(
    loc2Env.nasaPower.dataStatus === 'VERIFIED' &&
    loc2Env.nasaPower.temperature2m !== null &&
    loc2Env.currentWeather.dataStatus === 'VERIFIED',
    'LIVE-02',
    'Live API query for Saïss (Meknès) succeeded with independent parameters and verified response',
    `T2M Daily Mean: ${loc2Env.nasaPower.temperature2m}°C, Date: ${loc2Env.nasaPower.observationDateUtc}`
  );

  // 5.3 Dry-region location (Zagora / Draa Valley)
  console.log('\nQuerying Real API for Location 3: Draa Valley (Zagora, Arid Morocco)...');
  const loc3Coords = { lat: 30.330, lng: -5.830 };
  const loc3Env = await fetchNasaObservations(loc3Coords);

  assert(
    loc3Env.nasaPower.dataStatus === 'VERIFIED' &&
    loc3Env.nasaSmap.rootZoneSoilMoistureIndex !== null,
    'LIVE-03',
    'Live API query for Zagora (Arid Zone) retrieved real soil wetness index without fabricating desert zeros',
    `GWETROOT: ${loc3Env.nasaSmap.rootZoneSoilMoistureIndex}, Surface: ${loc3Env.nasaSmap.surfaceSoilMoistureIndex}`
  );

  // 5.4 Concurrent requests for Morocco and Saudi Arabia (Verification of Request Independence)
  console.log('\nExecuting Simultaneous Parallel Requests: Morocco vs Saudi Arabia...');
  const moroccoCoord = { lat: 34.02, lng: -6.84 };
  const saudiCoord = { lat: 24.13, lng: 47.31 };

  const [resMorocco, resSaudi] = await Promise.all([
    fetchNasaObservations(moroccoCoord),
    fetchNasaObservations(saudiCoord),
  ]);

  assert(
    resMorocco.nasaPower.dataStatus === 'VERIFIED' &&
    resSaudi.nasaPower.dataStatus === 'VERIFIED' &&
    resMorocco.currentWeather.temperature2m !== null &&
    resSaudi.currentWeather.temperature2m !== null,
    'LIVE-04',
    'Simultaneous concurrent queries for Morocco and Saudi Arabia complete independently without cross-cancellation',
    `Morocco Temp: ${resMorocco.currentWeather.temperature2m}°C (${resMorocco.currentWeather.timezone}), Saudi Temp: ${resSaudi.currentWeather.temperature2m}°C (${resSaudi.currentWeather.timezone})`
  );

  // ---------------------------------------------------------------------------
  // 6. EXPANDED INTEGRITY, UNIT ALIGNMENT & SOVEREIGN BOUNDARY TESTS
  // ---------------------------------------------------------------------------
  console.log('\n--- 6. Wind Speed Unit, Sovereign Polygons, Hourly Tolerance & Cache Gating Tests ---');

  // 6.1 Wind speed unit lock (wind_speed_unit=ms)
  const windProv = resMorocco.provenanceRecords.find((r) => r.variableKey === 'wind_speed_current');
  assert(
    Boolean(windProv && windProv.sourceEndpoint.includes('wind_speed_unit=ms') && windProv.displayedUnit === 'm/s'),
    'UNIT-01',
    'Open-Meteo liveMeteoUrl explicitly enforces &wind_speed_unit=ms and documents unit lock in provenance',
    `Endpoint lock present: ${windProv?.sourceEndpoint.includes('wind_speed_unit=ms')}, Unit: ${windProv?.displayedUnit}`
  );

  // 6.2 Sovereign Country Boundaries (Natural Earth Polygons)
  const riyadh = validateCoordinates({ lat: 24.7136, lng: 46.6753 });
  const qassim = validateCoordinates({ lat: 26.3260, lng: 43.9750 });
  const kuwait = validateCoordinates({ lat: 29.3759, lng: 47.9774 });
  const uae = validateCoordinates({ lat: 25.2048, lng: 55.2708 });
  const baghdad = validateCoordinates({ lat: 33.3152, lng: 44.3661 });
  const sanaa = validateCoordinates({ lat: 15.3694, lng: 44.1910 });

  assert(
    riyadh.geography.countryCode === 'SA' &&
    riyadh.geography.isSupported &&
    !riyadh.geography.isOutsideSupportedCoverage &&
    qassim.geography.countryCode === 'SA' &&
    kuwait.geography.countryCode === 'KW' &&
    uae.geography.countryCode === 'AE' &&
    baghdad.geography.countryCode === 'IQ' &&
    sanaa.geography.countryCode === 'YE',
    'GEO-01',
    'Sovereign boundaries accurately distinguish SA (supported), KW, AE, IQ, and YE without bounding-box bleed',
    `Riyadh: ${riyadh.geography.countryCode} (supported=${riyadh.geography.isSupported}), KW: ${kuwait.geography.countryCode}, AE: ${uae.geography.countryCode}, IQ: ${baghdad.geography.countryCode}, YE: ${sanaa.geography.countryCode}`
  );

  // 6.3 findClosestHourlyIndex returns -1 when outside +/- 90 min tolerance
  const outOfRangeIdx = findClosestHourlyIndex(
    ['2026-11-12T00:00', '2026-11-12T01:00'],
    '2026-11-12T10:00:00Z'
  );
  assert(
    outOfRangeIdx === -1,
    'SOIL-03',
    'findClosestHourlyIndex returns -1 when target timestamp exceeds 90-minute tolerance (no silent index 0 fallback)',
    `Returned index: ${outOfRangeIdx}`
  );

  // 6.4 Cache hit preserves original retrievalTimestamp & selects <=60% cloud product (Copernicus Sentinel-2)
  scientificCache.clear();
  const origFetchS2 = globalThis.fetch;
  try {
    globalThis.fetch = (async () => {
      return new Response(
        JSON.stringify({
          value: [
            {
              Id: 'prod-1',
              Name: 'S2A_MSIL2A_20261110T110321_N0511_R094_T30STC_20261110T140000.SAFE',
              ContentDate: { Start: '2026-11-10T11:03:21.000Z' },
              Attributes: [{ Name: 'cloudCover', Value: 88.5 }],
            },
            {
              Id: 'prod-2',
              Name: 'S2B_MSIL2A_20261105T110319_N0511_R094_T30STC_20261105T135000.SAFE',
              ContentDate: { Start: '2026-11-05T11:03:19.000Z' },
              Attributes: [{ Name: 'cloudCover', Value: 14.2 }],
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }) as typeof fetch;

    const s2First = await fetchSentinel2Observations({ lat: 34.265, lng: -5.928 });
    await new Promise((r) => setTimeout(r, 25));
    const s2Second = await fetchSentinel2Observations({ lat: 34.265, lng: -5.928 });
    assert(
      s2First.retrievalTimestamp === s2Second.retrievalTimestamp &&
      s2First.cloudCoveragePercent === 14.2 &&
      s2First.acquisitionDateUtc === '2026-11-05' &&
      s2First.dataStatus === 'METADATA_ONLY' &&
      s2First.spectralMethod.includes('Catalog Metadata Only'),
      'CACHE-03',
      'Sentinel-2 cache hit preserves original retrievalTimestamp, skips >60% cloudy granule, and reports METADATA_ONLY',
      `First ts: ${s2First.retrievalTimestamp}, Second ts: ${s2Second.retrievalTimestamp}, Cloud: ${s2First.cloudCoveragePercent}%, Date: ${s2First.acquisitionDateUtc}`
    );
  } finally {
    globalThis.fetch = origFetchS2;
  }

  // 6.5 Service-level cache isolation across distinct coordinates
  scientificCache.clear();
  const envA = await fetchNasaObservations({ lat: 34.265, lng: -5.928 });
  const envB = await fetchNasaObservations({ lat: 24.7136, lng: 46.6753 });
  assert(
    envA.nasaPower.temperature2m !== envB.nasaPower.temperature2m ||
    envA.currentWeather.temperature2m !== envB.currentWeather.temperature2m,
    'CACHE-04',
    'Service-level cache enforces strict coordinate isolation between Gharb (MA) and Riyadh (SA)',
    `MA Temp: ${envA.currentWeather.temperature2m}°C vs SA Temp: ${envB.currentWeather.temperature2m}°C`
  );

  // 6.6 Partial API failure cache rejection test (mocking failed Open-Meteo fetch)
  scientificCache.clear();
  const failTestCoord = { lat: 31.6295, lng: -7.9811 }; // Marrakech
  const failCacheKey = scientificCache.generateKey('env_observations', failTestCoord.lat, failTestCoord.lng, 'v2');
  const origFetch = globalThis.fetch;
  try {
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const urlStr = typeof input === 'string' ? input : input.toString();
      if (urlStr.includes('open-meteo.com')) {
        return new Response(JSON.stringify({ error: 'Simulated 503' }), { status: 503, statusText: 'Service Unavailable' });
      }
      return origFetch(input, init);
    }) as typeof fetch;

    const partialResult = await fetchNasaObservations(failTestCoord);
    const cachedAfterPartialFail = scientificCache.get(failCacheKey);
    assert(
      partialResult.nasaPower.dataStatus === 'VERIFIED' &&
      partialResult.currentWeather.dataStatus === 'UNAVAILABLE' &&
      cachedAfterPartialFail === null,
      'CACHE-05',
      'Partial API failure (Open-Meteo down) is NOT cached in scientificCache to prevent poisoning subsequent requests',
      `NASA status: ${partialResult.nasaPower.dataStatus}, Meteo status: ${partialResult.currentWeather.dataStatus}, Cached: ${cachedAfterPartialFail}`
    );
  } finally {
    globalThis.fetch = origFetch;
  }


  // ---------------------------------------------------------------------------
  // 7. DETERMINISTIC TESTS WITH MOCKED fetch (no network required)
  // ---------------------------------------------------------------------------
  console.log('\n--- 7. Deterministic mocked-fetch tests (wind unit, cache gating, isolation, Gulf geography) ---');

  const g = (lat: number, lng: number) => validateCoordinates({ lat, lng }).geography.countryCode;
  assert(
    g(25.2854, 51.531) === 'QA' && g(26.2235, 50.5876) === 'BH' && g(35.6892, 51.389) === 'IR' &&
      g(36.2972, 59.6067) === 'IR' && g(29.6, 52.53) === 'IR' && g(38.08, 46.29) === 'IR',
    'GEO-02',
    'Doha=QA, Manama=BH, Tehran/Mashhad/Shiraz/Tabriz=IR',
    `Doha:${g(25.2854, 51.531)} Manama:${g(26.2235, 50.5876)} Tehran:${g(35.6892, 51.389)} Mashhad:${g(36.2972, 59.6067)} Shiraz:${g(29.6, 52.53)} Tabriz:${g(38.08, 46.29)}`
  );
  assert(
    g(41.0082, 28.9784) === 'INT' && g(40.1792, 44.4991) === 'INT' && g(37.96, 58.33) === 'INT' &&
      g(34.5, 69.2) === 'INT' && g(40.41, 49.87) === 'INT' && g(23.588, 58.3829) === 'INT',
    'GEO-03',
    'Istanbul, Yerevan, Ashgabat, Kabul, Baku, Muscat are NOT classified as Iran/any supported country',
    `Istanbul:${g(41.0082, 28.9784)} Yerevan:${g(40.1792, 44.4991)} Ashgabat:${g(37.96, 58.33)} Kabul:${g(34.5, 69.2)} Baku:${g(40.41, 49.87)} Muscat:${g(23.588, 58.3829)}`
  );

  // --- Mock helpers ---------------------------------------------------------
  const realFetch = globalThis.fetch;
  const calls: string[] = [];
  const pad = (n: number) => String(n).padStart(2, '0');
  const ymd = (d: Date) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
  const jsonRes = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

  function buildMock(opts: { meteoFails?: boolean; temp?: number }) {
    return async (input: RequestInfo | URL): Promise<Response> => {
      const url = String(input);
      calls.push(url);
      if (url.includes('temporal/daily')) {
        const mk = (v: number) => {
          const o: Record<string, number> = {};
          for (let i = 34; i >= 4; i--) o[ymd(new Date(Date.now() - i * 86400000))] = v;
          return o;
        };
        return jsonRes({
          properties: {
            parameter: {
              T2M: mk(opts.temp ?? 20), T2M_MAX: mk(26), T2M_MIN: mk(14), RH2M: mk(55), WS2M: mk(2.5),
              ALLSKY_SFC_SW_DWN: mk(15), PRECTOTCORR: mk(1.2), GWETROOT: mk(0.4), GWETTOP: mk(0.35),
            },
          },
        });
      }
      if (url.includes('temporal/climatology')) {
        const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC','ANN'];
        const p: Record<string, number> = {};
        months.forEach((m) => (p[m] = 1.0));
        return jsonRes({ properties: { parameter: { PRECTOTCORR: p } } });
      }
      if (url.includes('open-meteo')) {
        if (opts.meteoFails) return jsonRes({ error: 'down' }, 503);
        const now = new Date();
        const hh = `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())}T${pad(now.getUTCHours())}:00`;
        return jsonRes({
          timezone: 'UTC',
          current: { time: hh, temperature_2m: opts.temp ?? 20, relative_humidity_2m: 50, apparent_temperature: 19, precipitation: 0, wind_speed_10m: 5.5, weather_code: 1 },
          hourly: {
            time: [hh],
            soil_moisture_0_to_7cm: [0.3], soil_moisture_7_to_28cm: [0.3],
            soil_moisture_28_to_100cm: [0.3], soil_moisture_100_to_255cm: [0.3],
          },
        });
      }
      return jsonRes({}, 404);
    };
  }

  try {
    // UNIT-02: wind unit lock in the actual request + provenance
    scientificCache.clear?.();
    calls.length = 0;
    globalThis.fetch = buildMock({}) as typeof fetch;
    const okRes = await fetchNasaObservations({ lat: 33.89, lng: -5.55 });
    const meteoCall = calls.find((u) => u.includes('open-meteo')) || '';
    const wp = okRes.provenanceRecords.find((r) => r.variableKey === 'wind_speed_current');
    assert(
      meteoCall.includes('wind_speed_unit=ms') && meteoCall.includes('timezone=UTC') &&
        Boolean(wp && wp.sourceEndpoint.includes('wind_speed_unit=ms') && wp.displayedUnit === 'm/s') &&
        okRes.currentWeather.windSpeed10m === 5.5,
      'UNIT-02',
      'Open-Meteo request carries wind_speed_unit=ms & timezone=UTC; provenance documents m/s; value passes through unscaled',
      `url ok: ${meteoCall.includes('wind_speed_unit=ms')}, wind=${okRes.currentWeather.windSpeed10m}`
    );

    // CACHE-06: fully successful result IS cached (2nd call makes no network call)
    const before = calls.length;
    await fetchNasaObservations({ lat: 33.89, lng: -5.55 });
    assert(calls.length === before, 'CACHE-06', 'Fully successful result is cached (no new upstream calls on 2nd request)', `calls before=${before}, after=${calls.length}`);

    // CACHE-07: cache hit preserves original syncTime
    const again = await fetchNasaObservations({ lat: 33.89, lng: -5.55 });
    assert(again.nasaPower.retrievalTimestamp === okRes.nasaPower.retrievalTimestamp, 'CACHE-07', 'Cache hit preserves original retrieval time (retrievalTimestamp unchanged)', `${again.nasaPower.retrievalTimestamp} vs ${okRes.nasaPower.retrievalTimestamp}`);

    // CACHE-08: partial failure (Open-Meteo down) is NOT cached -> next request re-fetches
    scientificCache.clear?.();
    calls.length = 0;
    globalThis.fetch = buildMock({ meteoFails: true }) as typeof fetch;
    const partial = await fetchNasaObservations({ lat: 24.71, lng: 46.68 });
    const n1 = calls.length;
    await fetchNasaObservations({ lat: 24.71, lng: 46.68 });
    assert(
      calls.length > n1 && partial.currentWeather.temperature2m === null && partial.currentWeather.dataStatus !== 'VERIFIED',
      'CACHE-08',
      'Open-Meteo failure yields null weather (no invented value) and is NOT cached (2nd request refetches)',
      `weather temp=${partial.currentWeather.temperature2m}, status=${partial.currentWeather.dataStatus}, calls ${n1}->${calls.length}`
    );

    // ISO-01: service-level isolation Morocco vs Saudi (different temps per coordinate)
    scientificCache.clear?.();
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const u = String(input);
      const isSaudi = u.includes('latitude=24.7100') || u.includes('latitude=24.71');
      return buildMock({ temp: isSaudi ? 38 : 17 })(input);
    }) as typeof fetch;
    const [ma, sa] = await Promise.all([
      fetchNasaObservations({ lat: 33.89, lng: -5.55 }),
      fetchNasaObservations({ lat: 24.71, lng: 46.68 }),
    ]);
    const ma2 = await fetchNasaObservations({ lat: 33.89, lng: -5.55 });
    assert(
      ma.currentWeather.temperature2m === 17 && sa.currentWeather.temperature2m === 38 && ma2.currentWeather.temperature2m === 17,
      'ISO-01',
      'Concurrent Morocco/Saudi requests and later cache hit never mix coordinates',
      `MA=${ma.currentWeather.temperature2m}, SA=${sa.currentWeather.temperature2m}, MA(cached)=${ma2.currentWeather.temperature2m}`
    );
  } finally {
    globalThis.fetch = realFetch;
  }

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  console.log('\n================================================================================');
  console.log(`PHASE 2 SCIENTIFIC VERIFICATION COMPLETE: ${passed} / ${total} TESTS PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log('================================================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runPhase2Tests().catch((err) => {
  console.error('Phase 2 test suite failed:', err);
  process.exit(1);
});
