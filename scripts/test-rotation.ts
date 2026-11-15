/**
 * TURBA — Global Crop Rotation & Soil Health Advisor Verification Suite
 *
 * Covers all 12 scientific & integration test scenarios:
 * 1. Cereal -> Legume rotation bonus & N-fixation caveats
 * 2. Tomato -> Potato Solanaceae disease-family exclusion & break warning
 * 3. Low-input farmer prioritization & anti-fabrication fertilizer disclaimer
 * 4. Rainfed farmer in arid conditions (high-water crops excluded)
 * 5. Mixed crop-livestock prioritization under adequate water
 * 6. Insufficient climate data gate (empty recommendations, explicit missing info)
 * 7. Missing Soil Organic Carbon (SOC %) gate (refuses 'suitable', lowers confidence)
 * 8. Missing prior crop history (provisional flag + conditionally_suitable)
 * 9. Per-parcel persistence isolation
 * 10. Invalid persisted profile fallback to safe null defaults
 * 11. No eligible recommendation under extreme desert rainfed constraints (zero fallback padding)
 * 12. Deterministic scoring & weight normalization check (sum = 1.00)
 */

import { generateCropRotationAdvice } from '../src/services/irrigation/rotationAdvisor';
import {
  getDefaultFarmerContextProfile,
  loadFarmerContextForFarm,
  saveFarmerContextForFarm,
  validateFarmerContextProfile,
} from '../src/services/irrigation/storage';
import { NasaGpmObservation, NasaPowerObservation } from '../src/types/farm';
import {
  DailyMeteoRecord,
  FarmerContextProfile,
  SoilHydraulicResult,
} from '../src/types/irrigation';

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

// Minimal deterministic localStorage shim for Node test runtime
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

function buildNasaFixtures(opts: {
  dailyRainMm: number;
  monthlyRainMm: number;
  anomalyPct: number | null;
  tempMeanC: number;
  tempMinC: number;
  tempMaxC: number;
  days?: number;
}): { nasaPower: NasaPowerObservation; nasaGpm: NasaGpmObservation; meteo: DailyMeteoRecord[] } {
  const days = opts.days ?? 30;
  const dailyHistory = [];
  const meteo: DailyMeteoRecord[] = [];
  const baseDate = new Date('2026-03-01T00:00:00Z');

  for (let i = 0; i < days; i++) {
    const dt = new Date(baseDate.getTime() + i * 86400000).toISOString().slice(0, 10);
    dailyHistory.push({
      date: dt,
      temperature: opts.tempMeanC,
      humidity: 58,
      precipitation: opts.dailyRainMm,
      radiation: 18.5,
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
      solarRadiationMjM2Day: 18.5,
      precipitationMm: opts.dailyRainMm,
      surfacePressureKpa: 100.8,
      isForecast: false,
      source: 'NASA POWER (Test Fixture)',
      origin: 'reanalysis_assimilated',
      retrievalTimestamp: '2026-03-31T00:00:00Z',
      spatialResolution: '0.5° × 0.625° (~50 km)',
    });
  }

  const lastDate = dailyHistory[dailyHistory.length - 1]?.date || '2026-03-30';

  const nasaPower: NasaPowerObservation = {
    temperature2m: opts.tempMeanC,
    temperatureMin: opts.tempMinC,
    temperatureMax: opts.tempMaxC,
    relativeHumidity2m: 58,
    windSpeed2m: 2.1,
    solarRadiation: 18.5,
    precipitationMm: opts.dailyRainMm,
    observationDateUtc: lastDate,
    observationDateLocal: lastDate,
    retrievalTimestamp: '2026-03-31T00:00:00Z',
    source: 'NASA POWER Agroclimatology (MERRA-2 / GEOS-FP)',
    spatialResolution: '0.5° x 0.625° (~50 km)',
    temporalResolution: 'Daily average assimilation',
    freshness: 'delayed',
    dataStatus: 'VERIFIED',
    dailyHistory,
  };

  const nasaGpm: NasaGpmObservation = {
    dailyRainfallMm: opts.dailyRainMm,
    monthlyAccumulationMm: opts.monthlyRainMm,
    historicalAverageMonthlyMm: 45,
    anomalyPercent: opts.anomalyPct,
    observationDateUtc: lastDate,
    retrievalTimestamp: '2026-03-31T00:00:00Z',
    source: 'NASA POWER PRECTOTCORR',
    spatialResolution: '0.5° × 0.625° (~50 km)',
    temporalResolution: 'Daily accumulation',
    freshness: 'delayed',
    dataStatus: 'VERIFIED',
  };

  return { nasaPower, nasaGpm, meteo };
}

function buildSoilFixture(opts?: { withSoc?: boolean; clayPct?: number; sandPct?: number }): SoilHydraulicResult {
  const withSoc = opts?.withSoc ?? true;
  const clay = opts?.clayPct ?? 26;
  const sand = opts?.sandPct ?? 38;
  const silt = 100 - clay - sand;
  const soc = withSoc ? 1.15 : null;
  const om = withSoc ? 1.98 : null;

  return {
    sourceKind: withSoc ? 'soilgrids_v2' : 'farmer_texture_table19',
    origin: withSoc ? 'spatial_estimate' : 'fao56_estimated',
    sourceLabel: withSoc ? 'ISRIC SoilGrids v2.0 (250m)' : 'FAO-56 Table 19 Texture Estimate',
    isSpatialEstimate: withSoc,
    soilGridsStatus: withSoc ? 'ESTIMATED' : 'UNAVAILABLE',
    thetaFc: {
      value: 0.31,
      unit: 'm³/m³',
      origin: withSoc ? 'spatial_estimate' : 'fao56_estimated',
      source: 'Saxton & Rawls (2006)',
      observationDate: '2026-03-30',
      retrievalTimestamp: '2026-03-31T00:00:00Z',
      parameterName: 'Field Capacity',
    },
    thetaWp: {
      value: 0.16,
      unit: 'm³/m³',
      origin: withSoc ? 'spatial_estimate' : 'fao56_estimated',
      source: 'Saxton & Rawls (2006)',
      observationDate: '2026-03-30',
      retrievalTimestamp: '2026-03-31T00:00:00Z',
      parameterName: 'Wilting Point',
    },
    awcMmPerM: 150,
    hydrologicGroup: 'C',
    curveNumber: 83,
    layers: [
      {
        depthLabel: '0-5cm',
        depthTopCm: 0,
        depthBottomCm: 5,
        clayPct: clay,
        sandPct: sand,
        siltPct: silt,
        organicCarbonPct: soc,
        organicMatterPct: om,
        bulkDensityGCm3: 1.35,
      },
      {
        depthLabel: '5-15cm',
        depthTopCm: 5,
        depthBottomCm: 15,
        clayPct: clay,
        sandPct: sand,
        siltPct: silt,
        organicCarbonPct: soc,
        organicMatterPct: om,
        bulkDensityGCm3: 1.38,
      },
      {
        depthLabel: '15-30cm',
        depthTopCm: 15,
        depthBottomCm: 30,
        clayPct: clay + 2,
        sandPct: sand - 2,
        siltPct: silt,
        organicCarbonPct: soc ? soc * 0.8 : null,
        organicMatterPct: om ? om * 0.8 : null,
        bulkDensityGCm3: 1.4,
      },
    ],
    notes: [],
    retrievalTimestamp: '2026-03-31T00:00:00Z',
  };
}

function buildContext(overrides?: Partial<FarmerContextProfile>): FarmerContextProfile {
  const base = getDefaultFarmerContextProfile();
  return {
    financialCapacity: 'moderate',
    primaryGoal: 'soil_regeneration',
    waterAndTechCapacity: 'limited_irrigation',
    culturalPractice: 'open_to_diversification',
    localContext: {
      ...base.localContext,
      countryOrRegion: 'Gharb, Morocco',
      season: 'unspecified',
    },
    ...overrides,
  };
}

function runTests() {
  console.log('================================================================================');
  console.log('TURBA GLOBAL CROP ROTATION & SOIL HEALTH ADVISOR TEST SUITE');
  console.log('================================================================================\n');

  installLocalStorageMock();
  const moderateClimate = buildNasaFixtures({
    dailyRainMm: 1.8,
    monthlyRainMm: 54,
    anomalyPct: 5,
    tempMeanC: 17.5,
    tempMinC: 11,
    tempMaxC: 24,
  });
  const soilWithSoc = buildSoilFixture({ withSoc: true });
  const soilWithoutSoc = buildSoilFixture({ withSoc: false });

  // ---------------------------------------------------------------------------
  // TEST 1: Cereal -> Legume Rotation Positive Bonus & Realistic N Caveats
  // ---------------------------------------------------------------------------
  const res1 = generateCropRotationAdvice({
    currentCropId: 'wheat',
    previousCropId: 'maize',
    previousCropResidue: 'incorporated',
    climate: {
      nasaPower: moderateClimate.nasaPower,
      nasaGpm: moderateClimate.nasaGpm,
      historicalMeteoDays: moderateClimate.meteo,
      latitudeDeg: 34.26,
    },
    soil: soilWithSoc,
    farmerContext: buildContext({ primaryGoal: 'soil_regeneration' }),
    verifiedRegionLabel: 'Gharb, Morocco',
  });

  const legumeRecs = res1.recommendations.filter(
    (r) => r.family === 'Fabaceae'
  );
  assert(
    res1.status === 'RECOMMENDATIONS_READY' &&
      legumeRecs.length >= 1 &&
      legumeRecs[0].scoreBreakdown.agronomicRotation >= 90 &&
      legumeRecs[0].soilHealthBenefitEn.includes('does NOT automatically replace balanced fertilization'),
    'ROT-01',
    'Cereal (wheat) -> Legume (Fabaceae) receives strong agronomic rotation score with non-fabricated N2 caveats',
    `Top=${res1.recommendations[0]?.cropId} (agr=${res1.recommendations[0]?.scoreBreakdown.agronomicRotation}, total=${res1.recommendations[0]?.compatibilityScore})`
  );

  // ---------------------------------------------------------------------------
  // TEST 2: Tomato -> Potato Disease-Family Warning & Hard Exclusion
  // ---------------------------------------------------------------------------
  const res2 = generateCropRotationAdvice({
    currentCropId: 'tomato',
    previousCropId: 'potato',
    previousCropResidue: 'removed',
    climate: {
      nasaPower: moderateClimate.nasaPower,
      nasaGpm: moderateClimate.nasaGpm,
      historicalMeteoDays: moderateClimate.meteo,
      latitudeDeg: 30.42,
    },
    soil: soilWithSoc,
    farmerContext: buildContext({ waterAndTechCapacity: 'modern_irrigation', financialCapacity: 'high_investment' }),
    verifiedRegionLabel: 'Souss-Massa, Morocco',
  });

  const potatoExcluded = res2.excludedCandidates.find((e) => e.cropId === 'potato');
  assert(
    Boolean(potatoExcluded) &&
      potatoExcluded!.exclusionCodes.includes('SOLANACEAE_DISEASE_BREAK') &&
      res2.rotationFamilyWarningsEn.some((w) => w.includes('Solanaceae') && w.includes('3–4 year')),
    'ROT-02',
    'Tomato after/with Potato triggers Solanaceae 3-4 year break warning and hard-excludes Potato',
    `ExcludedCodes=${potatoExcluded?.exclusionCodes.join(',')}, Warnings=${res2.rotationFamilyWarningsEn[0]}`
  );

  // ---------------------------------------------------------------------------
  // TEST 3: Low-Input Farmer Prioritization (No Fertilizer Elimination Promise)
  // ---------------------------------------------------------------------------
  const res3 = generateCropRotationAdvice({
    currentCropId: 'wheat',
    previousCropId: 'chickpea',
    previousCropResidue: 'incorporated',
    climate: {
      nasaPower: moderateClimate.nasaPower,
      nasaGpm: moderateClimate.nasaGpm,
      historicalMeteoDays: moderateClimate.meteo,
      latitudeDeg: 33.8,
    },
    soil: soilWithSoc,
    farmerContext: buildContext({
      financialCapacity: 'low_input',
      primaryGoal: 'food_security',
      waterAndTechCapacity: 'limited_irrigation',
    }),
    verifiedRegionLabel: 'Rabat-Salé-Kénitra',
  });

  const highInputExcluded = res3.excludedCandidates.filter((e) =>
    e.exclusionCodes.includes('HIGH_INPUT_FINANCIAL_BARRIER')
  );
  assert(
    res3.status === 'RECOMMENDATIONS_READY' &&
      highInputExcluded.some((e) => e.cropId === 'tomato') &&
      highInputExcluded.some((e) => e.cropId === 'potato') &&
      res3.recommendations.every(
        (r) =>
          r.cropId !== 'tomato' &&
          r.cropId !== 'potato' &&
          !r.soilHealthBenefitEn.toLowerCase().includes('eliminates fertilizer')
      ),
    'ROT-03',
    'Low-input farmer excludes high-input crops (Tomato, Potato) and prioritizes low/moderate-input candidates safely',
    `ExcludedHighInput=${highInputExcluded.map((e) => e.cropId).join(',')}, Top3=${res3.recommendations.map((r) => r.cropId).join(',')}`
  );

  // ---------------------------------------------------------------------------
  // TEST 4: Rainfed Farmer in Arid Conditions (Excludes High-Water Crops)
  // ---------------------------------------------------------------------------
  const aridRainfedClimate = buildNasaFixtures({
    dailyRainMm: 0.6,
    monthlyRainMm: 18,
    anomalyPct: -32,
    tempMeanC: 22.0,
    tempMinC: 14,
    tempMaxC: 31,
  });

  const res4 = generateCropRotationAdvice({
    currentCropId: 'wheat',
    previousCropId: 'barley',
    climate: {
      nasaPower: aridRainfedClimate.nasaPower,
      nasaGpm: aridRainfedClimate.nasaGpm,
      historicalMeteoDays: aridRainfedClimate.meteo,
      latitudeDeg: 32.3,
    },
    soil: soilWithSoc,
    farmerContext: buildContext({
      financialCapacity: 'moderate',
      primaryGoal: 'water_conservation',
      waterAndTechCapacity: 'rainfed_only',
    }),
    verifiedRegionLabel: 'Marrakech-Safi',
  });

  const rainfedExcludedIds = new Set(
    res4.excludedCandidates
      .filter((e) => e.exclusionCodes.includes('RAINFED_ARID_WATER_DEFICIT'))
      .map((e) => e.cropId)
  );
  assert(
    rainfedExcludedIds.has('maize') &&
      rainfedExcludedIds.has('tomato') &&
      rainfedExcludedIds.has('potato') &&
      rainfedExcludedIds.has('alfalfa') &&
      rainfedExcludedIds.has('onion'),
    'ROT-04',
    'Rainfed-only farmer under low rainfall (18 mm/30d) excludes high-water crops (maize, tomato, potato, alfalfa, onion)',
    `ExcludedRainfed=${Array.from(rainfedExcludedIds).join(',')}`
  );

  // ---------------------------------------------------------------------------
  // TEST 5: Mixed Crop-Livestock Prioritization
  // ---------------------------------------------------------------------------
  const res5 = generateCropRotationAdvice({
    currentCropId: 'wheat',
    previousCropId: 'tomato',
    previousCropResidue: 'grazed',
    climate: {
      nasaPower: moderateClimate.nasaPower,
      nasaGpm: moderateClimate.nasaGpm,
      historicalMeteoDays: moderateClimate.meteo,
      latitudeDeg: 34.0,
    },
    soil: soilWithSoc,
    farmerContext: buildContext({
      financialCapacity: 'moderate',
      primaryGoal: 'soil_regeneration',
      waterAndTechCapacity: 'modern_irrigation',
      culturalPractice: 'mixed_crop_livestock',
      localContext: {
        countryOrRegion: 'Saïs, Morocco',
        familiarCrops: [],
        season: 'unspecified',
        livestockIntegration: true,
        locallyAvailableCrops: [],
      },
    }),
    verifiedRegionLabel: 'Fès-Meknès',
  });

  const top3MixedIds = res5.recommendations.map((r) => r.cropId);
  assert(
    res5.status === 'RECOMMENDATIONS_READY' &&
      (top3MixedIds.includes('alfalfa') || top3MixedIds.includes('barley') || top3MixedIds.includes('dry_beans')) &&
      !top3MixedIds.includes('onion'),
    'ROT-05',
    'Mixed crop-livestock farmer prioritizes forage/dual-purpose residue crops over non-forage crops',
    `Top3=${top3MixedIds.join(',')}`
  );

  // ---------------------------------------------------------------------------
  // TEST 6: Insufficient Climate Data Gate
  // ---------------------------------------------------------------------------
  const res6 = generateCropRotationAdvice({
    currentCropId: 'wheat',
    previousCropId: 'chickpea',
    climate: {
      nasaPower: null,
      nasaGpm: null,
      historicalMeteoDays: [],
      latitudeDeg: 33.5,
    },
    soil: soilWithSoc,
    farmerContext: buildContext(),
  });

  assert(
    res6.status === 'INSUFFICIENT_DATA' &&
      res6.confidence === 'INSUFFICIENT_DATA' &&
      res6.recommendations.length === 0 &&
      res6.missingInformation.length >= 2 &&
      Boolean(res6.emptyOrBlockedReasonEn),
    'ROT-06',
    'Insufficient climate data blocks recommendations cleanly and enumerates missing observations',
    `Status=${res6.status}, MissingCount=${res6.missingInformation.length}`
  );

  // ---------------------------------------------------------------------------
  // TEST 7: Missing Soil Organic Carbon (SOC %) Handling
  // ---------------------------------------------------------------------------
  const res7 = generateCropRotationAdvice({
    currentCropId: 'wheat',
    previousCropId: 'chickpea',
    climate: {
      nasaPower: moderateClimate.nasaPower,
      nasaGpm: moderateClimate.nasaGpm,
      historicalMeteoDays: moderateClimate.meteo,
      latitudeDeg: 33.8,
    },
    soil: soilWithoutSoc,
    farmerContext: buildContext({ waterAndTechCapacity: 'modern_irrigation' }),
  });

  assert(
    res7.status === 'RECOMMENDATIONS_READY' &&
      res7.missingInformation.some((m) => m.includes('Soil Organic Carbon')) &&
      res7.recommendations.every((r) => r.status !== 'suitable' && r.confidence !== 'HIGH'),
    'ROT-07',
    'Missing SOC % is explicitly reported, blocks green "suitable" badge, and lowers confidence',
    `Statuses=${res7.recommendations.map((r) => r.status).join(',')}, Confs=${res7.recommendations.map((r) => r.confidence).join(',')}`
  );

  // ---------------------------------------------------------------------------
  // TEST 8: Missing Crop History -> Provisional Flag & Cond. Suitable
  // ---------------------------------------------------------------------------
  const res8 = generateCropRotationAdvice({
    currentCropId: 'wheat',
    previousCropId: '',
    climate: {
      nasaPower: moderateClimate.nasaPower,
      nasaGpm: moderateClimate.nasaGpm,
      historicalMeteoDays: moderateClimate.meteo,
      latitudeDeg: 33.8,
    },
    soil: soilWithSoc,
    farmerContext: buildContext({ waterAndTechCapacity: 'modern_irrigation' }),
  });

  assert(
    res8.isProvisionalHistory === true &&
      res8.recommendations.length > 0 &&
      res8.recommendations.every(
        (r) =>
          r.status === 'conditionally_suitable' &&
          r.whyRecommendedEn.includes('Provisional') &&
          r.agronomicCautionsEn.some((c) => c.includes('provisional'))
      ),
    'ROT-08',
    'Missing previous crop history marks advice provisional and prevents green "suitable" status',
    `Provisional=${res8.isProvisionalHistory}, Statuses=${res8.recommendations.map((r) => r.status).join(',')}`
  );

  // ---------------------------------------------------------------------------
  // TEST 9: Per-Parcel FarmerContextProfile Persistence Isolation
  // ---------------------------------------------------------------------------
  saveFarmerContextForFarm('parcel-alpha', buildContext({
    financialCapacity: 'low_input',
    waterAndTechCapacity: 'rainfed_only',
    primaryGoal: 'food_security',
  }));
  saveFarmerContextForFarm('parcel-beta', buildContext({
    financialCapacity: 'high_investment',
    waterAndTechCapacity: 'modern_irrigation',
    primaryGoal: 'commercial_profit',
  }));

  const loadedAlpha = loadFarmerContextForFarm('parcel-alpha');
  const loadedBeta = loadFarmerContextForFarm('parcel-beta');
  assert(
    loadedAlpha.financialCapacity === 'low_input' &&
      loadedAlpha.waterAndTechCapacity === 'rainfed_only' &&
      loadedBeta.financialCapacity === 'high_investment' &&
      loadedBeta.waterAndTechCapacity === 'modern_irrigation',
    'ROT-09',
    'Per-parcel FarmerContextProfile storage isolates profiles cleanly between parcels',
    `Alpha=${loadedAlpha.financialCapacity}/${loadedAlpha.waterAndTechCapacity}, Beta=${loadedBeta.financialCapacity}/${loadedBeta.waterAndTechCapacity}`
  );

  // ---------------------------------------------------------------------------
  // TEST 10: Invalid Persisted Profile Fallback (Zero Silent Optimistic Defaults)
  // ---------------------------------------------------------------------------
  globalThis.localStorage.setItem('turba_phase3_farmer_context_v1', '{corrupted-json');
  const loadedCorrupt = loadFarmerContextForFarm('parcel-alpha');
  const validatedArray = validateFarmerContextProfile(['bad', 'array']);
  const validatedGarbageEnums = validateFarmerContextProfile({
    financialCapacity: 'billionaire_mode',
    waterAndTechCapacity: 'unlimited_ocean',
    primaryGoal: 'magic_yields',
    culturalPractice: 'unknown_enum',
    localContext: { season: 'monsoon_99', livestockIntegration: 'yes_please', familiarCrops: [123, 'wheat'] },
  });

  assert(
    loadedCorrupt.financialCapacity === null &&
      loadedCorrupt.waterAndTechCapacity === null &&
      validatedArray.primaryGoal === null &&
      validatedGarbageEnums.financialCapacity === null &&
      validatedGarbageEnums.waterAndTechCapacity === null &&
      validatedGarbageEnums.localContext.season === 'unspecified' &&
      validatedGarbageEnums.localContext.livestockIntegration === null &&
      validatedGarbageEnums.localContext.familiarCrops.length === 1 &&
      validatedGarbageEnums.localContext.familiarCrops[0] === 'wheat',
    'ROT-10',
    'Corrupted localStorage JSON & invalid enums fall back safely to null/unspecified without assuming irrigation/capital',
    `CorruptWater=${String(loadedCorrupt.waterAndTechCapacity)}, SanitisedCrops=${validatedGarbageEnums.localContext.familiarCrops.join(',')}`
  );

  // ---------------------------------------------------------------------------
  // TEST 11: No Eligible Recommendation (Extreme Desert Rainfed)
  // ---------------------------------------------------------------------------
  const extremeDesert = buildNasaFixtures({
    dailyRainMm: 0.03,
    monthlyRainMm: 1.0,
    anomalyPct: -85,
    tempMeanC: 29.0,
    tempMinC: 20,
    tempMaxC: 39,
  });

  const res11 = generateCropRotationAdvice({
    currentCropId: 'wheat',
    previousCropId: 'barley',
    climate: {
      nasaPower: extremeDesert.nasaPower,
      nasaGpm: extremeDesert.nasaGpm,
      historicalMeteoDays: extremeDesert.meteo,
      latitudeDeg: 24.13,
    },
    soil: soilWithSoc,
    farmerContext: buildContext({
      financialCapacity: 'low_input',
      waterAndTechCapacity: 'rainfed_only',
      primaryGoal: 'water_conservation',
    }),
  });

  assert(
    res11.status === 'NO_ELIGIBLE_RECOMMENDATION' &&
      res11.recommendations.length === 0 &&
      res11.excludedCandidates.length >= 10 &&
      Boolean(res11.emptyOrBlockedReasonEn),
    'ROT-11',
    'Extreme arid desert + rainfed_only returns NO_ELIGIBLE_RECOMMENDATION with zero generic fallback crops',
    `Status=${res11.status}, Recs=${res11.recommendations.length}, Excluded=${res11.excludedCandidates.length}`
  );

  // ---------------------------------------------------------------------------
  // TEST 12: Deterministic Scoring & Weight Sum Verification
  // ---------------------------------------------------------------------------
  const input12 = {
    currentCropId: 'tomato',
    previousCropId: 'wheat',
    previousCropResidue: 'incorporated' as const,
    climate: {
      nasaPower: moderateClimate.nasaPower,
      nasaGpm: moderateClimate.nasaGpm,
      historicalMeteoDays: moderateClimate.meteo,
      latitudeDeg: 33.88,
    },
    soil: soilWithSoc,
    farmerContext: buildContext({
      financialCapacity: 'moderate',
      primaryGoal: 'water_conservation',
      waterAndTechCapacity: 'limited_irrigation',
      culturalPractice: 'open_to_diversification',
    }),
  };
  const runA = generateCropRotationAdvice(input12);
  const runB = generateCropRotationAdvice(input12);

  const weightsObj = runA.recommendations[0]?.scoreBreakdown.weights;
  const weightSum = weightsObj
    ? weightsObj.agronomicRotation +
      weightsObj.soilHealthRootZone +
      weightsObj.climateWater +
      weightsObj.financialFeasibility +
      weightsObj.goalCulturalFit
    : 0;

  const sameRankings =
    JSON.stringify(runA.recommendations.map((r) => ({ id: r.cropId, score: r.compatibilityScore, breakdown: r.scoreBreakdown }))) ===
    JSON.stringify(runB.recommendations.map((r) => ({ id: r.cropId, score: r.compatibilityScore, breakdown: r.scoreBreakdown })));

  assert(
    runA.recommendations.length > 0 &&
      Math.abs(weightSum - 1.0) < 0.002 &&
      sameRankings,
    'ROT-12',
    'Scoring is 100% deterministic across repeated runs and normalized weights sum cleanly to 1.00',
    `WeightSum=${weightSum.toFixed(3)}, Top3=${runA.recommendations.map((r) => `${r.cropId}:${r.compatibilityScore}`).join(', ')}`
  );

  console.log('\n================================================================================');
  console.log(`CROP ROTATION ADVISOR VERIFICATION: ${passed} / ${total} TESTS PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log('================================================================================');

  if (passed < total) {
    process.exit(1);
  }
}

runTests();
