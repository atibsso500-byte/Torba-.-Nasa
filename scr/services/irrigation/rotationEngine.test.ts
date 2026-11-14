/**
 * TURBA — Rotation Transition Bridge Verification Suite (12 Scenarios)
 *
 * Uses clearly labeled synthetic climate/soil test fixtures to verify deterministic
 * graph search (Dijkstra), hemisphere calendars, hard constraint pruning, anti-fabrication
 * guarantees, and persistence isolation. Never claims real-world field yield validation.
 *
 * Run with: npx tsx src/services/irrigation/rotationEngine.test.ts
 */

import {
  DEFAULT_TRANSITION_WEIGHTS,
  buildHemisphereSeasonSchedule,
  determineHemisphere,
  generateRotationTransitionPlan,
} from './rotationEngine';
import {
  loadTransitionStateForFarm,
  saveTransitionStateForFarm,
  validateTransitionState,
} from './storage';
import { NasaGpmObservation, NasaPowerObservation } from '../../types/farm';
import {
  DailyMeteoRecord,
  FarmerContextProfile,
  SoilHydraulicResult,
} from '../../types/irrigation';

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

function installLocalStorageMock() {
  const store = new Map<string, string>();
  const mockStorage: Storage = {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
  };
  (globalThis as unknown as { localStorage: Storage }).localStorage = mockStorage;
  return mockStorage;
}

function buildClimateFixture(opts: {
  dailyRainMm: number;
  monthlyRainMm: number;
  anomalyPct: number | null;
  tempMeanC: number;
  tempMinC: number;
  tempMaxC: number;
  solarMj?: number;
  days?: number;
}): { nasaPower: NasaPowerObservation; nasaGpm: NasaGpmObservation; meteo: DailyMeteoRecord[] } {
  const days = opts.days ?? 30;
  const dailyHistory = [];
  const meteo: DailyMeteoRecord[] = [];
  const baseDate = new Date('2026-03-01T00:00:00Z');
  const solar = opts.solarMj ?? 18.0;

  for (let i = 0; i < days; i++) {
    const dt = new Date(baseDate.getTime() + i * 86400000).toISOString().slice(0, 10);
    dailyHistory.push({
      date: dt,
      temperature: opts.tempMeanC,
      humidity: 58,
      precipitation: opts.dailyRainMm,
      radiation: solar,
    });
    meteo.push({
      date: dt,
      tMeanC: opts.tempMeanC,
      tMinC: opts.tempMinC,
      tMaxC: opts.tempMaxC,
      rhMeanPct: 58,
      rhMinPct: 38,
      rhMaxPct: 78,
      windSpeed2mMs: 2.1,
      solarRadiationMjM2Day: solar,
      precipitationMm: opts.dailyRainMm,
      surfacePressureKpa: 100.8,
      isForecast: false,
      source: 'NASA POWER (Synthetic Test Fixture)',
      origin: 'reanalysis_assimilated',
      retrievalTimestamp: '2026-03-31T00:00:00Z',
      spatialResolution: '0.5° × 0.625° (~50 km)',
    });
  }

  const lastDate = dailyHistory[dailyHistory.length - 1]?.date || '2026-03-30';

  const nasaPower: NasaPowerObservation = {
    source: 'NASA POWER Agroclimatology (MERRA-2 / GEOS-FP)',
    temperature2m: opts.tempMeanC,
    temperatureMax: opts.tempMaxC,
    temperatureMin: opts.tempMinC,
    relativeHumidity2m: 58,
    windSpeed2m: 2.1,
    solarRadiation: solar,
    precipitationMm: opts.dailyRainMm,
    observationDateUtc: lastDate,
    observationDateLocal: lastDate,
    spatialResolution: '0.5° x 0.625° (~50 km)',
    temporalResolution: 'Daily average assimilation',
    retrievalTimestamp: '2026-03-31T00:00:00Z',
    dataStatus: 'VERIFIED',
    freshness: 'fresh',
    dailyHistory,
  };

  const nasaGpm: NasaGpmObservation = {
    source: 'NASA POWER Precipitation (Synthetic Test Fixture)',
    dailyRainfallMm: opts.dailyRainMm,
    monthlyAccumulationMm: opts.monthlyRainMm,
    historicalAverageMonthlyMm:
      opts.anomalyPct !== null ? Math.max(1, opts.monthlyRainMm / (1 + opts.anomalyPct / 100)) : null,
    anomalyPercent: opts.anomalyPct,
    observationDateUtc: lastDate,
    spatialResolution: '0.5° × 0.625° (~50 km)',
    temporalResolution: 'Daily accumulation',
    retrievalTimestamp: '2026-03-31T00:00:00Z',
    dataStatus: 'VERIFIED',
    freshness: 'fresh',
  };

  return { nasaPower, nasaGpm, meteo };
}

function buildSoilFixture(opts: {
  thetaFc: number | null;
  thetaWp: number | null;
  socPct: number | null;
  clayPct?: number;
  sandPct?: number;
}): SoilHydraulicResult {
  const hasHyd = opts.thetaFc !== null && opts.thetaWp !== null;
  const awc = hasHyd ? Math.round((opts.thetaFc! - opts.thetaWp!) * 1000) : null;
  return {
    sourceKind: hasHyd ? 'soilgrids_v2' : 'unavailable',
    origin: 'spatial_estimate',
    sourceLabel: 'ISRIC SoilGrids v2.0 (Synthetic Test Fixture)',
    isSpatialEstimate: true,
    soilGridsStatus: hasHyd ? 'VERIFIED' : 'UNAVAILABLE',
    retrievalTimestamp: '2026-03-31T00:00:00Z',
    layers: [
      {
        depthLabel: '0–30 cm',
        depthTopCm: 0,
        depthBottomCm: 30,
        clayPct: opts.clayPct ?? 26,
        sandPct: opts.sandPct ?? 38,
        siltPct: 36,
        organicCarbonPct: opts.socPct,
        organicMatterPct: opts.socPct !== null ? Number((opts.socPct * 1.724).toFixed(2)) : null,
        bulkDensityGCm3: 1.38,
      },
    ],
    thetaFc: {
      value: opts.thetaFc,
      unit: 'm³/m³',
      parameterName: 'Field Capacity θFC',
      source: 'Saxton & Rawls (Test Fixture)',
      origin: 'spatial_estimate',
      observationDate: '2026-03-31',
      retrievalTimestamp: '2026-03-31T00:00:00Z',
      spatialResolution: '250 m',
    },
    thetaWp: {
      value: opts.thetaWp,
      unit: 'm³/m³',
      parameterName: 'Wilting Point θWP',
      source: 'Saxton & Rawls (Test Fixture)',
      origin: 'spatial_estimate',
      observationDate: '2026-03-31',
      retrievalTimestamp: '2026-03-31T00:00:00Z',
      spatialResolution: '250 m',
    },
    awcMmPerM: awc,
    hydrologicGroup: 'B',
    curveNumber: 78,
    notes: [],
  };
}

function baseProfile(overrides: Partial<FarmerContextProfile> = {}): FarmerContextProfile {
  return {
    financialCapacity: 'moderate',
    primaryGoal: 'soil_regeneration',
    waterAndTechCapacity: 'limited_irrigation',
    culturalPractice: 'open_to_diversification',
    localContext: {
      countryOrRegion: 'Test Basin',
      familiarCrops: ['wheat', 'barley', 'chickpea'],
      season: 'unspecified',
      livestockIntegration: null,
      locallyAvailableCrops: [],
    },
    ...overrides,
  };
}

console.log('=== TURBA Rotation Transition Bridge Verification Suite (12 Scenarios) ===\n');

// Test 1: Repeated crops from same botanical family (wheat -> wheat)
{
  const clim = buildClimateFixture({
    dailyRainMm: 1.5,
    monthlyRainMm: 45,
    anomalyPct: -5,
    tempMeanC: 17,
    tempMinC: 10,
    tempMaxC: 24,
  });
  const res = generateRotationTransitionPlan({
    coordinates: { lat: 33.88, lng: -6.9 },
    climate: { nasaPower: clim.nasaPower, nasaGpm: clim.nasaGpm, historicalMeteoDays: clim.meteo },
    soil: buildSoilFixture({ thetaFc: 0.31, thetaWp: 0.15, socPct: 1.25 }),
    farmerContext: baseProfile(),
    constraints: { currentSequence: ['wheat', 'wheat'], horizonSeasons: 3 },
    referenceMonthUtc: 10,
  });

  const repeatedPoaceae = res.baseline.repeatedFamilies.some((r) => r.family === 'Poaceae');
  const recSeq = res.recommendedPathway?.cropSequence ?? [];
  const introducesBreak = recSeq.some((id) => id !== 'wheat' && id !== 'barley' && id !== 'maize');

  assert(
    res.status === 'PLANS_READY' &&
      repeatedPoaceae &&
      introducesBreak &&
      res.recommendedPathway !== null &&
      res.recommendedPathway.steps.length === 3,
    'T01',
    'Repeated Poaceae sequence (wheat -> wheat) detected and broken in transition plan',
    `repeatedFamilies=${JSON.stringify(res.baseline.repeatedFamilies)}, recSeq=[${recSeq.join(' -> ')}]`
  );
}

// Test 2: Valid legume introduction + explicit non-guaranteed N caveat + SOC guardrail (not degraded when soc >= 0.8)
{
  const clim = buildClimateFixture({
    dailyRainMm: 1.8,
    monthlyRainMm: 54,
    anomalyPct: 0,
    tempMeanC: 18,
    tempMinC: 11,
    tempMaxC: 25,
  });
  const res = generateRotationTransitionPlan({
    coordinates: { lat: 34.0, lng: -5.5 },
    climate: { nasaPower: clim.nasaPower, nasaGpm: clim.nasaGpm, historicalMeteoDays: clim.meteo },
    soil: buildSoilFixture({ thetaFc: 0.32, thetaWp: 0.16, socPct: 1.3 }),
    farmerContext: baseProfile({ primaryGoal: 'soil_regeneration' }),
    constraints: { currentSequence: ['wheat'], horizonSeasons: 3 },
    referenceMonthUtc: 10,
  });

  const hasLegume = res.recommendedPathway?.steps.some(
    (s) =>
      s.family === 'Fabaceae' &&
      s.nitrogenExpectationEn !== null &&
      /does not guarantee|nodulation/i.test(s.nitrogenExpectationEn)
  );
  const falseDegradation =
    !res.baseline.soilConditionNoteEn.includes('NOT classified as degraded');

  assert(
    Boolean(hasLegume) && !falseDegradation,
    'T02',
    'Introduces Fabaceae legume with non-guaranteed N-fixation caveat and no fabricated soil degradation label',
    `seq=[${res.recommendedPathway?.cropSequence.join(' -> ')}], soilNote="${res.baseline.soilConditionNoteEn}"`
  );
}

// Test 3: Water-limited / Rainfed-only farming strictly excludes high-water demand crops
{
  const clim = buildClimateFixture({
    dailyRainMm: 0.9,
    monthlyRainMm: 27,
    anomalyPct: -20,
    tempMeanC: 19,
    tempMinC: 12,
    tempMaxC: 26,
  });
  const res = generateRotationTransitionPlan({
    coordinates: { lat: 32.5, lng: -7.5 },
    climate: { nasaPower: clim.nasaPower, nasaGpm: clim.nasaGpm, historicalMeteoDays: clim.meteo },
    soil: buildSoilFixture({ thetaFc: 0.28, thetaWp: 0.13, socPct: 0.95 }),
    farmerContext: baseProfile({ waterAndTechCapacity: 'rainfed_only' }),
    constraints: { currentSequence: ['barley'], horizonSeasons: 3 },
    referenceMonthUtc: 10,
  });

  const seq = res.recommendedPathway?.cropSequence ?? [];
  const hasHighWater = seq.some((id) => ['tomato', 'maize', 'alfalfa', 'citrus', 'potato'].includes(id));

  assert(
    res.status === 'PLANS_READY' && !hasHighWater && seq.length === 3,
    'T03',
    'Rainfed-only constraint excludes high-water crops (tomato/maize/alfalfa/citrus/potato)',
    `rainfedSeq=[${seq.join(' -> ')}]`
  );
}

// Test 4: Financially constrained (low_input) excludes high-input crops (tomato, potato, citrus)
{
  const clim = buildClimateFixture({
    dailyRainMm: 2.0,
    monthlyRainMm: 60,
    anomalyPct: 5,
    tempMeanC: 20,
    tempMinC: 13,
    tempMaxC: 27,
  });
  const res = generateRotationTransitionPlan({
    coordinates: { lat: 33.9, lng: -6.2 },
    climate: { nasaPower: clim.nasaPower, nasaGpm: clim.nasaGpm, historicalMeteoDays: clim.meteo },
    soil: buildSoilFixture({ thetaFc: 0.32, thetaWp: 0.16, socPct: 1.1 }),
    farmerContext: baseProfile({ financialCapacity: 'low_input', waterAndTechCapacity: 'modern_irrigation' }),
    constraints: { currentSequence: ['wheat'], horizonSeasons: 3, maxAcceptableCostTier: 'low' },
    referenceMonthUtc: 3,
  });

  const allCropsInPlans = [
    ...(res.recommendedPathway?.cropSequence ?? []),
    ...(res.conservativePathway?.cropSequence ?? []),
    ...(res.alternativePathway?.cropSequence ?? []),
  ];
  const hasHighCost = allCropsInPlans.some((id) => ['tomato', 'potato', 'citrus'].includes(id));

  assert(
    res.status === 'PLANS_READY' && !hasHighCost,
    'T04',
    'Low-input budget strictly blocks high-cost crops across all transition pathways',
    `allPlannedCrops=[${Array.from(new Set(allCropsInPlans)).join(', ')}]`
  );
}

// Test 5: Missing soil information (thetaFc/thetaWp missing -> INSUFFICIENT_DATA; SOC missing -> never green soilHealth)
{
  const clim = buildClimateFixture({
    dailyRainMm: 1.5,
    monthlyRainMm: 45,
    anomalyPct: 0,
    tempMeanC: 18,
    tempMinC: 11,
    tempMaxC: 25,
  });

  const noHydRes = generateRotationTransitionPlan({
    coordinates: { lat: 33.88, lng: -6.9 },
    climate: { nasaPower: clim.nasaPower, nasaGpm: clim.nasaGpm, historicalMeteoDays: clim.meteo },
    soil: buildSoilFixture({ thetaFc: null, thetaWp: null, socPct: 1.0 }),
    farmerContext: baseProfile(),
    constraints: { currentSequence: ['wheat'], horizonSeasons: 3 },
  });

  const noSocRes = generateRotationTransitionPlan({
    coordinates: { lat: 33.88, lng: -6.9 },
    climate: { nasaPower: clim.nasaPower, nasaGpm: clim.nasaGpm, historicalMeteoDays: clim.meteo },
    soil: buildSoilFixture({ thetaFc: 0.31, thetaWp: 0.15, socPct: null }),
    farmerContext: baseProfile(),
    constraints: { currentSequence: ['wheat'], horizonSeasons: 3 },
  });

  const soilBadgeMissingSoc = noSocRes.recommendedPathway?.dimensionEvaluations.soilHealth;

  assert(
    noHydRes.status === 'INSUFFICIENT_DATA' &&
      noHydRes.recommendedPathway === null &&
      soilBadgeMissingSoc === 'insufficient_data',
    'T05',
    'Missing θFC/θWP triggers INSUFFICIENT_DATA; missing SOC forces soilHealth="insufficient_data" (never green)',
    `noHydStatus=${noHydRes.status}, missingSocSoilBadge=${soilBadgeMissingSoc}`
  );
}

// Test 6: Missing climate information (null NASA POWER and empty meteo days -> INSUFFICIENT_DATA)
{
  const res = generateRotationTransitionPlan({
    coordinates: { lat: 33.88, lng: -6.9 },
    climate: { nasaPower: null, nasaGpm: null, historicalMeteoDays: [] },
    soil: buildSoilFixture({ thetaFc: 0.31, thetaWp: 0.15, socPct: 1.2 }),
    farmerContext: baseProfile(),
    constraints: { currentSequence: ['wheat'], horizonSeasons: 3 },
  });

  assert(
    res.status === 'INSUFFICIENT_DATA' &&
      res.recommendedPathway === null &&
      res.missingInformation.length > 0,
    'T06',
    'Missing climate telemetry halts generation with INSUFFICIENT_DATA and zero fabricated plans',
    `status=${res.status}, missing=${res.missingInformation.join('; ')}`
  );
}

// Test 7: Different climatic regions (Cool Temperate North vs Warm Semi-Arid)
{
  const coolClim = buildClimateFixture({
    dailyRainMm: 2.5,
    monthlyRainMm: 75,
    anomalyPct: 10,
    tempMeanC: 11,
    tempMinC: 4,
    tempMaxC: 16,
    solarMj: 12.0,
  });
  const warmClim = buildClimateFixture({
    dailyRainMm: 0.3,
    monthlyRainMm: 9,
    anomalyPct: -55,
    tempMeanC: 29,
    tempMinC: 21,
    tempMaxC: 37,
    solarMj: 24.5,
  });

  const coolRes = generateRotationTransitionPlan({
    coordinates: { lat: 48.8, lng: 2.3 },
    climate: { nasaPower: coolClim.nasaPower, nasaGpm: coolClim.nasaGpm, historicalMeteoDays: coolClim.meteo },
    soil: buildSoilFixture({ thetaFc: 0.34, thetaWp: 0.16, socPct: 1.8 }),
    farmerContext: baseProfile({ waterAndTechCapacity: 'modern_irrigation' }),
    constraints: { currentSequence: ['wheat'], horizonSeasons: 3 },
    referenceMonthUtc: 3,
  });

  const warmRes = generateRotationTransitionPlan({
    coordinates: { lat: 30.4, lng: -9.6 },
    climate: { nasaPower: warmClim.nasaPower, nasaGpm: warmClim.nasaGpm, historicalMeteoDays: warmClim.meteo },
    soil: buildSoilFixture({ thetaFc: 0.25, thetaWp: 0.12, socPct: 0.7 }),
    farmerContext: baseProfile({ waterAndTechCapacity: 'limited_irrigation' }),
    constraints: { currentSequence: ['barley'], horizonSeasons: 3 },
    referenceMonthUtc: 5,
  });

  const coolEta = coolRes.recommendedPathway?.steps[0]?.estimatedWindowEtcMm ?? 0;
  const warmEta = warmRes.recommendedPathway?.steps[0]?.estimatedWindowEtcMm ?? 0;

  assert(
    coolRes.status === 'PLANS_READY' && warmRes.status === 'PLANS_READY' && warmEta > coolEta,
    'T07',
    'Adapts across distinct climatic regions with higher ETc in warm semi-arid regime',
    `coolStep1ETc=${coolEta}mm, warmStep1ETc=${warmEta}mm`
  );
}

// Test 8: Southern vs Northern Hemisphere seasonal calendars (October UTC comparison)
{
  const northH = determineHemisphere(33.88);
  const southH = determineHemisphere(-34.6); // Argentina Pampas
  const northSched = buildHemisphereSeasonSchedule({
    hemisphere: northH,
    horizonSeasons: 4,
    startMonthUtc: 10,
    preferredStartSeason: 'unspecified',
  });
  const southSched = buildHemisphereSeasonSchedule({
    hemisphere: southH,
    horizonSeasons: 4,
    startMonthUtc: 10,
    preferredStartSeason: 'unspecified',
  });

  assert(
    northH === 'northern' &&
      southH === 'southern' &&
      northSched[0] === 'autumn_winter' &&
      southSched[0] === 'spring' &&
      northSched.length === 4 &&
      southSched.length === 4,
    'T08',
    'Southern Hemisphere shifts seasonal planting slots by 6 months vs Northern Hemisphere in same month (Oct)',
    `North[Oct]=${northSched.join('->')}, South[Oct]=${southSched.join('->')}`
  );
}

// Test 9: No feasible transition (extreme dry desert + rainfed_only -> NO_FEASIBLE_TRANSITION)
{
  const desertClim = buildClimateFixture({
    dailyRainMm: 0.05,
    monthlyRainMm: 1.5,
    anomalyPct: -90,
    tempMeanC: 33,
    tempMinC: 24,
    tempMaxC: 42,
    solarMj: 26,
  });
  const res = generateRotationTransitionPlan({
    coordinates: { lat: 24.13, lng: 47.31 },
    climate: { nasaPower: desertClim.nasaPower, nasaGpm: desertClim.nasaGpm, historicalMeteoDays: desertClim.meteo },
    soil: buildSoilFixture({ thetaFc: 0.16, thetaWp: 0.07, socPct: 0.4 }),
    farmerContext: baseProfile({ waterAndTechCapacity: 'rainfed_only' }),
    constraints: { currentSequence: ['wheat'], horizonSeasons: 3 },
    referenceMonthUtc: 6,
  });

  assert(
    res.status === 'NO_FEASIBLE_TRANSITION' &&
      res.recommendedPathway === null &&
      res.blockingReasonsEn.length > 0,
    'T09',
    'Extreme arid rainfed-only returns NO_FEASIBLE_TRANSITION with zero fabricated fallback plan',
    `status=${res.status}, reason="${res.blockingReasonsEn[0]}"`
  );
}

// Test 10: Farmer rejection of proposed crop dynamically eliminates it and selects valid alternative
{
  const clim = buildClimateFixture({
    dailyRainMm: 1.6,
    monthlyRainMm: 48,
    anomalyPct: 0,
    tempMeanC: 18,
    tempMinC: 11,
    tempMaxC: 25,
  });
  const initialRes = generateRotationTransitionPlan({
    coordinates: { lat: 33.88, lng: -6.9 },
    climate: { nasaPower: clim.nasaPower, nasaGpm: clim.nasaGpm, historicalMeteoDays: clim.meteo },
    soil: buildSoilFixture({ thetaFc: 0.31, thetaWp: 0.15, socPct: 1.15 }),
    farmerContext: baseProfile(),
    constraints: { currentSequence: ['wheat', 'wheat'], horizonSeasons: 3 },
    referenceMonthUtc: 10,
  });

  const firstProposedNewCrop =
    initialRes.recommendedPathway?.cropSequence.find((c) => c !== 'wheat') || 'chickpea';

  const afterRejectRes = generateRotationTransitionPlan({
    coordinates: { lat: 33.88, lng: -6.9 },
    climate: { nasaPower: clim.nasaPower, nasaGpm: clim.nasaGpm, historicalMeteoDays: clim.meteo },
    soil: buildSoilFixture({ thetaFc: 0.31, thetaWp: 0.15, socPct: 1.15 }),
    farmerContext: baseProfile(),
    constraints: {
      currentSequence: ['wheat', 'wheat'],
      horizonSeasons: 3,
      cropDecisions: { [firstProposedNewCrop]: 'rejected' },
    },
    referenceMonthUtc: 10,
  });

  const postSeq = afterRejectRes.recommendedPathway?.cropSequence ?? [];
  assert(
    afterRejectRes.status === 'PLANS_READY' &&
      !postSeq.includes(firstProposedNewCrop),
    'T10',
    `Farmer rejection of "${firstProposedNewCrop}" removes it from transition pathways`,
    `initial=[${initialRes.recommendedPathway?.cropSequence.join('->')}], afterReject=[${postSeq.join('->')}]`
  );
}

// Test 11: Invalid crop sequence & invalid coordinates handling
{
  const clim = buildClimateFixture({
    dailyRainMm: 1.5,
    monthlyRainMm: 45,
    anomalyPct: 0,
    tempMeanC: 18,
    tempMinC: 11,
    tempMaxC: 25,
  });

  const emptySeqRes = generateRotationTransitionPlan({
    coordinates: { lat: 33.88, lng: -6.9 },
    climate: { nasaPower: clim.nasaPower, nasaGpm: clim.nasaGpm, historicalMeteoDays: clim.meteo },
    soil: buildSoilFixture({ thetaFc: 0.31, thetaWp: 0.15, socPct: 1.15 }),
    farmerContext: baseProfile(),
    constraints: { currentSequence: [], horizonSeasons: 3 },
  });

  const unknownCropRes = generateRotationTransitionPlan({
    coordinates: { lat: 33.88, lng: -6.9 },
    climate: { nasaPower: clim.nasaPower, nasaGpm: clim.nasaGpm, historicalMeteoDays: clim.meteo },
    soil: buildSoilFixture({ thetaFc: 0.31, thetaWp: 0.15, socPct: 1.15 }),
    farmerContext: baseProfile(),
    constraints: { currentSequence: ['unsupported_tropical_99'], horizonSeasons: 3 },
  });

  const badCoordRes = generateRotationTransitionPlan({
    coordinates: { lat: 999, lng: -6.9 },
    climate: { nasaPower: clim.nasaPower, nasaGpm: clim.nasaGpm, historicalMeteoDays: clim.meteo },
    soil: buildSoilFixture({ thetaFc: 0.31, thetaWp: 0.15, socPct: 1.15 }),
    farmerContext: baseProfile(),
    constraints: { currentSequence: ['wheat'], horizonSeasons: 3 },
  });

  assert(
    emptySeqRes.status === 'INVALID_SEQUENCE' &&
      unknownCropRes.status === 'INVALID_SEQUENCE' &&
      badCoordRes.status === 'INSUFFICIENT_DATA',
    'T11',
    'Rejects empty/unknown crop sequences (INVALID_SEQUENCE) and invalid coordinates (INSUFFICIENT_DATA)',
    `empty=${emptySeqRes.status}, unknown=${unknownCropRes.status}, badCoord=${badCoordRes.status}`
  );
}

// Test 12: Determinism & weight sum + per-parcel localStorage isolation check
{
  installLocalStorageMock();
  const clim = buildClimateFixture({
    dailyRainMm: 1.4,
    monthlyRainMm: 42,
    anomalyPct: -5,
    tempMeanC: 18,
    tempMinC: 10,
    tempMaxC: 25,
  });

  const input = {
    coordinates: { lat: 33.88, lng: -6.9 },
    climate: { nasaPower: clim.nasaPower, nasaGpm: clim.nasaGpm, historicalMeteoDays: clim.meteo },
    soil: buildSoilFixture({ thetaFc: 0.31, thetaWp: 0.15, socPct: 1.15 }),
    farmerContext: baseProfile(),
    constraints: { currentSequence: ['wheat', 'wheat'], horizonSeasons: 4 as const },
    referenceMonthUtc: 10,
  };

  const r1 = generateRotationTransitionPlan(input);
  const r2 = generateRotationTransitionPlan(input);

  const weightsSum = Object.values(DEFAULT_TRANSITION_WEIGHTS).reduce((a, b) => a + b, 0);
  const sameRec =
    JSON.stringify(r1.recommendedPathway) === JSON.stringify(r2.recommendedPathway) &&
    JSON.stringify(r1.conservativePathway) === JSON.stringify(r2.conservativePathway);

  saveTransitionStateForFarm('farm-alpha', {
    currentSequence: ['wheat', 'wheat'],
    horizonSeasons: 4,
    maxAcceptableCostTier: 'low',
    availableIrrigationMmPerSeason: 180,
    unfamiliarCropsAllowed: false,
    observedSoilDegradationNote: 'Surface crusting observed',
    cropDecisions: { tomato: 'rejected' },
    resilienceFocus: 'forage_production',
  });
  const loadedAlpha = loadTransitionStateForFarm('farm-alpha');
  const loadedBeta = loadTransitionStateForFarm('farm-beta');
  const validatedCorrupt = validateTransitionState({
    horizonSeasons: 99,
    cropDecisions: { a: 'bogus' },
    resilienceFocus: 'invalid_focus',
  });

  assert(
    Math.abs(weightsSum - 1.0) < 0.001 &&
      sameRec &&
      loadedAlpha.resilienceFocus === 'forage_production' &&
      loadedBeta.currentSequence.length === 0 &&
      validatedCorrupt.horizonSeasons === 3 &&
      validatedCorrupt.resilienceFocus === null &&
      Object.keys(validatedCorrupt.cropDecisions).length === 0,
    'T12',
    'Deterministic pathway search, weights sum=1.00, parcel persistence isolation, and corrupt state sanitization',
    `weightsSum=${weightsSum.toFixed(3)}, deterministic=${sameRec}`
  );
}

// Test 13: Strategy C non-permutation guarantee & Resilience Focus differentiation
{
  const clim = buildClimateFixture({
    dailyRainMm: 1.8,
    monthlyRainMm: 54,
    anomalyPct: 0,
    tempMeanC: 18,
    tempMinC: 11,
    tempMaxC: 25,
  });

  const forageRes = generateRotationTransitionPlan({
    coordinates: { lat: 33.88, lng: -6.9 },
    climate: { nasaPower: clim.nasaPower, nasaGpm: clim.nasaGpm, historicalMeteoDays: clim.meteo },
    soil: buildSoilFixture({ thetaFc: 0.31, thetaWp: 0.15, socPct: 1.15 }),
    farmerContext: baseProfile({ waterAndTechCapacity: 'modern_irrigation' }),
    constraints: {
      currentSequence: ['wheat', 'wheat'],
      horizonSeasons: 3,
      resilienceFocus: 'forage_production',
    },
    referenceMonthUtc: 10,
  });

  const waterRes = generateRotationTransitionPlan({
    coordinates: { lat: 33.88, lng: -6.9 },
    climate: { nasaPower: clim.nasaPower, nasaGpm: clim.nasaGpm, historicalMeteoDays: clim.meteo },
    soil: buildSoilFixture({ thetaFc: 0.31, thetaWp: 0.15, socPct: 1.15 }),
    farmerContext: baseProfile({ waterAndTechCapacity: 'modern_irrigation' }),
    constraints: {
      currentSequence: ['wheat', 'wheat'],
      horizonSeasons: 3,
      resilienceFocus: 'water_conservation',
    },
    referenceMonthUtc: 10,
  });

  const multiset = (arr: string[]) => [...arr].sort().join('|');
  const recM = multiset(forageRes.recommendedPathway?.cropSequence ?? []);
  const consM = multiset(forageRes.conservativePathway?.cropSequence ?? []);
  const altForageM = multiset(forageRes.alternativePathway?.cropSequence ?? []);

  const nonPermutation =
    Boolean(forageRes.alternativePathway) && altForageM !== recM && altForageM !== consM;

  const altForageIncludesAlfalfa =
    forageRes.alternativePathway?.cropSequence.includes('alfalfa') ?? false;

  assert(
    nonPermutation &&
      forageRes.alternativePathway?.resilienceFocusUsed === 'forage_production' &&
      waterRes.alternativePathway?.resilienceFocusUsed === 'water_conservation' &&
      (altForageIncludesAlfalfa ||
        forageRes.alternativePathway?.cropSequence.join('>') !==
          waterRes.alternativePathway?.cropSequence.join('>')),
    'T13',
    'Strategy C enforces non-permutation crop multiset vs Strategy B/Conservative and responds to resilience focus',
    `B=[${forageRes.recommendedPathway?.cropSequence.join('->')}], Cons=[${forageRes.conservativePathway?.cropSequence.join('->')}], C_forage=[${forageRes.alternativePathway?.cropSequence.join('->')}], C_water=[${waterRes.alternativePathway?.cropSequence.join('->')}]`
  );
}

// Test 14: 8-axis explainability, Strategy A missing info, and explicit dataset limitation disclosures
{
  const clim = buildClimateFixture({
    dailyRainMm: 1.5,
    monthlyRainMm: 45,
    anomalyPct: -5,
    tempMeanC: 18,
    tempMinC: 10,
    tempMaxC: 25,
    days: 20,
  });

  const res = generateRotationTransitionPlan({
    coordinates: { lat: 33.88, lng: -6.9 },
    climate: { nasaPower: clim.nasaPower, nasaGpm: clim.nasaGpm, historicalMeteoDays: clim.meteo },
    soil: buildSoilFixture({ thetaFc: 0.31, thetaWp: 0.15, socPct: null }),
    farmerContext: baseProfile({ waterAndTechCapacity: null }),
    previousCropResidue: 'unknown',
    constraints: { currentSequence: ['wheat'], horizonSeasons: 3 },
    referenceMonthUtc: 10,
  });

  const rec = res.recommendedPathway;
  const hasAll8Axes =
    Boolean(rec) &&
    rec!.whyGeneratedEn.length > 0 &&
    rec!.prioritiesAddressedEn.length > 0 &&
    rec!.environmentalDriversEn.length > 0 &&
    rec!.mainAdvantagesEn.length > 0 &&
    rec!.economicOrOperationalLimitationsEn.length > 0 &&
    rec!.requiredFarmerActionsEn.length > 0 &&
    rec!.dataLimitationNoticeEn.includes('SMAP') &&
    rec!.dataLimitationNoticeEn.includes('SoilGrids') &&
    rec!.missingInformationEn.length > 0;

  assert(
    res.baseline.missingInformationEn.length >= 3 &&
      res.baseline.missingInformationAr.length >= 3 &&
      res.baseline.missingInformationFr.length >= 3 &&
      hasAll8Axes,
    'T14',
    'Strategy A surfaces missing baseline info (AR/EN/FR) & strategies populate all 8 explainability axes + SoilGrids/NASA limitation notices',
    `baselineMissingCount=${res.baseline.missingInformationEn.length}, hasAll8Axes=${hasAll8Axes}`
  );
}

// Test 15: Residue removal vs incorporation awareness
{
  const clim = buildClimateFixture({
    dailyRainMm: 1.6,
    monthlyRainMm: 48,
    anomalyPct: 0,
    tempMeanC: 18,
    tempMinC: 11,
    tempMaxC: 25,
  });

  const removedRes = generateRotationTransitionPlan({
    coordinates: { lat: 33.88, lng: -6.9 },
    climate: { nasaPower: clim.nasaPower, nasaGpm: clim.nasaGpm, historicalMeteoDays: clim.meteo },
    soil: buildSoilFixture({ thetaFc: 0.31, thetaWp: 0.15, socPct: 1.1 }),
    farmerContext: baseProfile(),
    previousCropResidue: 'removed',
    constraints: { currentSequence: ['wheat', 'chickpea'], horizonSeasons: 3 },
    referenceMonthUtc: 10,
  });

  const mentionsExportedResidue = removedRes.baseline.nutrientWeaknessesEn.some((w) =>
    /removed|organic carbon/i.test(w)
  );
  const recPrioritiesMentionRemoved = removedRes.recommendedPathway?.prioritiesAddressedEn.some((p) =>
    p.includes('removed')
  );

  assert(
    removedRes.status === 'PLANS_READY' &&
      mentionsExportedResidue &&
      Boolean(recPrioritiesMentionRemoved),
    'T15',
    'Crop residue removal is reflected in baseline nutrient weakness warnings and strategy priority explanations',
    `nutrientWeakness="${removedRes.baseline.nutrientWeaknessesEn[0] || ''}"`
  );
}

console.log(`\nSummary: ${passed}/${total} scenarios passed.`);
if (passed !== total) {
  process.exit(1);
}

