/**
 * TURBA — Phase 3: Scientific Smart Irrigation Decision Engine Test Suite
 *
 * Tests all Section 11 requirements:
 * - FAO-56 Penman-Monteith ET0 against FAO-56 Example 18 & Chapter 4 reference calculations
 * - Wind speed height adjustment (10m -> 2m, Eq. 47) & barometric pressure from elevation (Eq. 7)
 * - Missing-variable estimation provenance (Hargreaves Rs) & confidence downgrade
 * - Crop coefficient Kc and root depth Zr progression across FAO-56 growth stages
 * - Soil hydraulics, TAW, RAW, and water stress coefficient Ks (never invented)
 * - Soil-water balance mass conservation, SCS effective rainfall, runoff & deep percolation
 * - Application efficiency (higher Ea reduces Igross), m³ volume, and null duration without flow
 * - Forecast rainfall delaying irrigation timing without contaminating historical precipitation
 * - API failure (SoilGrids HTTP 503) & physically impossible input rejection
 * - Live NASA POWER + Open-Meteo daily forecast end-to-end integration test
 */

import {
  computeFao56DailyEt0,
  computeCropEtc,
  computeWaterStressKs,
} from '../src/services/irrigation/fao56';
import {
  adjustWindSpeedTo2m,
  atmosphericPressureFromElevationKpa,
  validateIrrigationInputs,
} from '../src/services/irrigation/validation';
import { getCropById, resolveCropStageForDay } from '../src/data/crops';
import { computeSurfaceRunoffScs } from '../src/services/irrigation/rainfall';
import {
  computeRawMm,
  computeTawMm,
  runDailySoilWaterBalance,
} from '../src/services/irrigation/waterBalance';
import {
  saxtonRawls2006Hydraulics,
  resolveSoilHydraulics,
} from '../src/services/irrigation/soil';
import {
  computeSmartIrrigationDecision,
} from '../src/services/irrigation/engine';
import {
  getDefaultIrrigationConfig,
  loadIrrigationConfigForFarm,
} from '../src/services/irrigation/storage';
import { loadSavedFarms } from '../src/services/farmStorage';
import { fetchIrrigationWeatherSeries } from '../src/services/irrigation/weather';
import { FarmerIrrigationConfig, SoilHydraulicResult, WeatherSeriesResult } from '../src/types/irrigation';
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

async function runPhase3Tests() {
  console.log('================================================================================');
  console.log('TURBA PHASE 3: SCIENTIFIC SMART IRRIGATION DECISION ENGINE TEST SUITE');
  console.log('================================================================================\n');

  // ---------------------------------------------------------------------------
  // 1. FAO-56 Penman-Monteith Reference Verification & Unit Conversions
  // ---------------------------------------------------------------------------
  console.log('--- 1. FAO-56 Penman-Monteith & Unit Conversions ---');

  // FAO-56 Eq. 47: 10 m wind 2.778 m/s (10 km/h) -> 2 m wind = 2.078 m/s
  const u2Check = adjustWindSpeedTo2m(2.778, 10);
  assert(
    Math.abs(u2Check - 2.078) < 0.005,
    'UNIT-P3-01',
    'Adjusts 10m wind speed (2.778 m/s) to 2m height (~2.078 m/s) per FAO-56 Eq. 47',
    `u2 = ${u2Check.toFixed(4)} m/s`
  );

  // FAO-56 Eq. 7: Pressure at 100 m = 100.12 kPa; at 1800 m (Atlas Mountains) ~ 81.8 kPa
  const p100 = atmosphericPressureFromElevationKpa(100);
  const p1800 = atmosphericPressureFromElevationKpa(1800);
  assert(
    Math.abs(p100 - 100.12) < 0.1 && Math.abs(p1800 - 81.8) < 0.5,
    'UNIT-P3-02',
    'Computes barometric atmospheric pressure P from elevation per FAO-56 Eq. 7',
    `P(100m)=${p100.toFixed(2)} kPa, P(1800m)=${p1800.toFixed(2)} kPa`
  );

  // FAO-56 Chapter 4, Example 18 (Uccle, Belgium, July 6, DOY 187, lat 50.80°N, elev 100m):
  // Tmax=21.5°C, Tmin=12.3°C, RHmax=84%, RHmin=63%, u10=10 km/h (2.778 m/s), Rs=22.07 MJ/m2/day
  // FAO-56 Published Reference Answer: ET0 = 3.9 mm/day
  const ex18 = computeFao56DailyEt0({
    date: '2026-07-06',
    latitudeDeg: 50.8,
    elevationM: 100,
    tMaxC: 21.5,
    tMinC: 12.3,
    rhMaxPct: 84,
    rhMinPct: 63,
    windSpeedMs: 2.778,
    windHeightM: 10,
    solarRadiationMjM2Day: 22.07,
  });

  assert(
    ex18.isValid && ex18.et0MmDay !== null && Math.abs(ex18.et0MmDay - 3.9) <= 0.05,
    'FAO56-01',
    'Matches FAO-56 Chapter 4 Example 18 benchmark ET0 = 3.9 mm/day within ±0.05 mm/day',
    `Computed ET0 = ${ex18.et0MmDay} mm/d, Rn=${ex18.intermediates.rnMjM2Day}, es=${ex18.intermediates.esKpa}, ea=${ex18.intermediates.eaKpa}`
  );

  // Missing Solar Radiation fallback -> Hargreaves Eq. 50 recorded explicitly
  const missingRs = computeFao56DailyEt0({
    date: '2026-07-06',
    latitudeDeg: 34.265,
    elevationM: 34,
    tMaxC: 32.0,
    tMinC: 17.0,
    rhMeanPct: 55,
    windSpeedMs: 2.1,
    windHeightM: 2,
    solarRadiationMjM2Day: null,
  });

  assert(
    missingRs.isValid &&
      missingRs.et0MmDay !== null &&
      missingRs.et0MmDay > 4.0 &&
      missingRs.origin === 'fao56_estimated' &&
      missingRs.estimatedVariables.some((v) => v.variable === 'solarRadiation'),
    'FAO56-02',
    'Uses FAO-56 Eq. 50 Hargreaves estimation when Rs is missing and logs estimated variable provenance',
    `ET0=${missingRs.et0MmDay} mm/d, EstVars=${missingRs.estimatedVariables.map((v) => v.variable).join(',')}`
  );

  // Missing critical Tmax/Tmin -> never substitutes zero; returns invalid
  const missingTemp = computeFao56DailyEt0({
    date: '2026-07-06',
    latitudeDeg: 34.265,
    elevationM: 34,
    tMaxC: null,
    tMinC: 17.0,
    rhMeanPct: 55,
    windSpeedMs: 2.1,
  });
  assert(
    !missingTemp.isValid && missingTemp.et0MmDay === null && missingTemp.missingCriticalVariables.includes('Tmax'),
    'FAO56-03',
    'Refuses to fabricate ET0 (returns null) when Tmax is missing',
    `Missing: ${missingTemp.missingCriticalVariables.join(',')}`
  );

  // Extreme Saharan/arid heat & negative-elevation depression invariance
  const extremeHeat = computeFao56DailyEt0({
    date: '2026-07-20',
    latitudeDeg: 31.1,
    elevationM: -50,
    tMaxC: 46.0,
    tMinC: 29.0,
    rhMeanPct: 15,
    windSpeedMs: 5.5,
    windHeightM: 2,
    solarRadiationMjM2Day: 28.5,
  });
  assert(
    extremeHeat.isValid &&
      extremeHeat.et0MmDay !== null &&
      Number.isFinite(extremeHeat.et0MmDay) &&
      extremeHeat.et0MmDay > 10 &&
      (extremeHeat.intermediates.vpdKpa ?? 0) > 4,
    'FAO56-04',
    'Remains finite and physically valid under extreme arid heat (46°C, low RH, 5.5 m/s) and negative elevation',
    `ET0=${extremeHeat.et0MmDay} mm/d, VPD=${extremeHeat.intermediates.vpdKpa} kPa, P=${extremeHeat.intermediates.pressureKpa} kPa`
  );

  // ---------------------------------------------------------------------------
  // 2. Crop Stages, Kc Interpolation, TAW, RAW & Ks
  // ---------------------------------------------------------------------------
  console.log('\n--- 2. Crop Database, Stage Progression, TAW/RAW & Ks ---');

  const tomato = getCropById('tomato')!;
  const stIni = resolveCropStageForDay(tomato, 10);
  const stDevMid = resolveCropStageForDay(tomato, 50); // mid-way in 40-day dev stage (days 30..70)
  const stMid = resolveCropStageForDay(tomato, 90);
  const stLate = resolveCropStageForDay(tomato, 130);

  assert(
    stIni.stage === 'initial' &&
      stIni.kc === 0.6 &&
      stDevMid.stage === 'development' &&
      stDevMid.kc > 0.6 &&
      stDevMid.kc < 1.15 &&
      stMid.stage === 'mid_season' &&
      stMid.kc === 1.15 &&
      stMid.rootDepthM === 1.0 &&
      stLate.stage === 'late_season' &&
      stLate.kc < 1.15,
    'CROP-01',
    'Interpolates Kc and root depth Zr smoothly across initial, development, mid-season, and late-season stages',
    `Ini=${stIni.kc} (${stIni.rootDepthM}m), Dev=${stDevMid.kc} (${stDevMid.rootDepthM}m), Mid=${stMid.kc} (${stMid.rootDepthM}m), Late=${stLate.kc}`
  );

  const taw = computeTawMm(0.32, 0.16, 1.0); // 1000 * (0.32 - 0.16) * 1.0 = 160 mm
  const raw = computeRawMm(taw, 0.40); // 0.40 * 160 = 64 mm
  const ksNoStress = computeWaterStressKs({ depletionMm: 50, tawMm: taw, rawMm: raw });
  const ksStressed = computeWaterStressKs({ depletionMm: 112, tawMm: taw, rawMm: raw }); // (160-112)/(160-64)=48/96=0.50
  const ksMissing = computeWaterStressKs({ depletionMm: 50, tawMm: null, rawMm: null });

  assert(
    taw === 160 && raw === 64 && ksNoStress === 1.0 && ksStressed === 0.5 && ksMissing === null,
    'SOIL-P3-01',
    'Computes exact TAW=160mm, RAW=64mm, Ks=1.0 (unstressed), Ks=0.50 (stressed), and null when TAW unavailable',
    `TAW=${taw}, RAW=${raw}, Ks_ok=${ksNoStress}, Ks_stress=${ksStressed}, Ks_missing=${ksMissing}`
  );

  const saxtonClayLoam = saxtonRawls2006Hydraulics({ sandPct: 30, clayPct: 35, organicMatterPct: 2.0 });
  assert(
    saxtonClayLoam.thetaFc > 0.30 &&
      saxtonClayLoam.thetaFc < 0.42 &&
      saxtonClayLoam.thetaWp > 0.17 &&
      saxtonClayLoam.thetaFc > saxtonClayLoam.thetaWp,
    'SOIL-P3-02',
    'Saxton & Rawls (2006) pedotransfer yields physically consistent clay-loam θFC > θWP',
    `θFC=${saxtonClayLoam.thetaFc}, θWP=${saxtonClayLoam.thetaWp}`
  );

  // ---------------------------------------------------------------------------
  // 3. Effective Rainfall & Daily Soil-Water Balance Conservation
  // ---------------------------------------------------------------------------
  console.log('\n--- 3. Effective Rainfall & Soil-Water Balance Conservation ---');

  const lightRain = computeSurfaceRunoffScs(6, 78); // Ia = 0.2*(25400/78 - 254) = 14.3 mm => RO = 0
  const heavyStorm = computeSurfaceRunoffScs(80, 78); // Heavy storm produces real non-linear runoff > 0

  assert(
    lightRain.surfaceRunoffMm === 0 &&
      lightRain.infiltratedRainfallMm === 6 &&
      heavyStorm.surfaceRunoffMm > 20 &&
      heavyStorm.surfaceRunoffMm < 80,
    'RAIN-P3-01',
    'SCS Curve Number effective rainfall avoids fixed % assumptions (0 runoff on 6mm rain, non-linear runoff on 80mm storm)',
    `6mm rain -> RO=${lightRain.surfaceRunoffMm}mm; 80mm storm -> RO=${heavyStorm.surfaceRunoffMm}mm, Infilt=${heavyStorm.infiltratedRainfallMm}mm`
  );

  const balanceSteps = runDailySoilWaterBalance({
    days: [
      {
        date: '2026-05-01',
        isForecast: false,
        et0Result: computeFao56DailyEt0({
          date: '2026-05-01',
          latitudeDeg: 34.0,
          elevationM: 50,
          tMaxC: 28,
          tMinC: 14,
          rhMeanPct: 55,
          windSpeedMs: 2.0,
          solarRadiationMjM2Day: 22,
        }),
        precipitationMm: 0,
        irrigationNetMm: 0,
        meteoOrigin: 'reanalysis_assimilated',
      },
      {
        date: '2026-05-02',
        isForecast: false,
        et0Result: computeFao56DailyEt0({
          date: '2026-05-02',
          latitudeDeg: 34.0,
          elevationM: 50,
          tMaxC: 25,
          tMinC: 15,
          rhMeanPct: 75,
          windSpeedMs: 1.5,
          solarRadiationMjM2Day: 15,
        }),
        precipitationMm: 60, // Large rain exceeding depletion -> produces deep percolation & Peff < 60
        irrigationNetMm: 0,
        meteoOrigin: 'reanalysis_assimilated',
      },
    ],
    crop: tomato,
    plantingDate: '2026-02-01', // Mid season: Zr=1.0m, Kc=1.15
    stageOverride: 'mid_season',
    soil: { thetaFc: 0.32, thetaWp: 0.16, curveNumber: 78 },
    initialDepletionMm: 10,
  });

  const day2 = balanceSteps[1];
  const balanceResidual = Math.abs(
    day2.depletionEndMm - (day2.depletionStartMm + day2.etcAdjustedMm - day2.effectiveRainfallMm - day2.irrigationNetMm)
  );
  assert(
    balanceSteps.length === 2 &&
      day2.depletionEndMm === 0 &&
      day2.deepPercolationMm > 0 &&
      day2.effectiveRainfallMm < 60 &&
      balanceResidual < 0.05,
    'BAL-P3-01',
    'Daily water balance tracks ETc, runoff, deep percolation, and maintains mass conservation D(t) = D(t-1)+ETc_adj-Peff-In',
    `Day2 D_start=${day2.depletionStartMm}, ETc_adj=${day2.etcAdjustedMm}, Peff=${day2.effectiveRainfallMm}, RO=${day2.surfaceRunoffMm}, DP=${day2.deepPercolationMm}, D_end=${day2.depletionEndMm}`
  );

  // SCS Curve Number clamping bounds [30..98]
  const lowCn = computeSurfaceRunoffScs(40, 10);
  const highCn = computeSurfaceRunoffScs(40, 120);
  assert(
    lowCn.curveNumberUsed === 30 &&
      highCn.curveNumberUsed === 98 &&
      lowCn.surfaceRunoffMm === 0 &&
      highCn.surfaceRunoffMm > 30,
    'RAIN-P3-02',
    'Clamps USDA-SCS Curve Number strictly within valid domain [30, 98]',
    `CN=10->${lowCn.curveNumberUsed} (RO=${lowCn.surfaceRunoffMm}mm), CN=120->${highCn.curveNumberUsed} (RO=${highCn.surfaceRunoffMm}mm)`
  );

  // Multi-day (10d) drought -> irrigation -> rain mass conservation check
  const hotEt0 = computeFao56DailyEt0({
    date: '2026-07-01',
    latitudeDeg: 31.6,
    elevationM: 450,
    tMaxC: 36,
    tMinC: 20,
    rhMeanPct: 35,
    windSpeedMs: 3.0,
    solarRadiationMjM2Day: 26,
  });
  const tenDayInputs = Array.from({ length: 10 }, (_, idx) => ({
    date: `2026-07-${String(idx + 1).padStart(2, '0')}`,
    isForecast: false,
    et0Result: { ...hotEt0, date: `2026-07-${String(idx + 1).padStart(2, '0')}` },
    precipitationMm: idx === 7 ? 25 : 0,
    irrigationNetMm: idx === 5 ? 45 : 0,
    meteoOrigin: 'reanalysis_assimilated' as const,
  }));
  const tenDaySteps = runDailySoilWaterBalance({
    days: tenDayInputs,
    crop: tomato,
    plantingDate: '2026-04-01',
    stageOverride: 'mid_season',
    soil: { thetaFc: 0.30, thetaWp: 0.16, curveNumber: 78 },
    initialDepletionMm: 40,
  });
  const maxResidual10d = Math.max(
    ...tenDaySteps.map((s) =>
      Math.abs(s.depletionEndMm - (s.depletionStartMm + s.etcAdjustedMm - s.effectiveRainfallMm - s.irrigationNetMm))
    )
  );
  assert(
    tenDaySteps.length === 10 &&
      maxResidual10d < 0.05 &&
      tenDaySteps.every((s) => s.depletionEndMm >= 0 && s.depletionEndMm <= s.tawMm),
    'BAL-P3-02',
    'Preserves strict mass balance conservation (<0.05 mm residual) and [0, TAW] bounds across 10-day dry/irrigation/rain sequence',
    `Max step residual = ${maxResidual10d.toFixed(4)} mm`
  );

  // ---------------------------------------------------------------------------
  // 4. Decision Engine: Efficiency, Volume, Null Flow Duration & Forecast Rain Delay
  // ---------------------------------------------------------------------------
  console.log('\n--- 4. Efficiency, Volume, Conditional Flow Duration & Forecast Rain Delay ---');

  const makeMockWeather = (forecastRainMmDay2: number): WeatherSeriesResult => ({
    coordinates: { lat: 34.265, lng: -5.928 },
    elevationM: 34,
    elevationSource: 'DEM 34m',
    historicalDaily: [
      {
        date: '2026-05-01',
        isForecast: false,
        source: 'NASA POWER',
        origin: 'reanalysis_assimilated',
        tMaxC: 29,
        tMinC: 15,
        tMeanC: 22,
        rhMeanPct: 50,
        windSpeed2mMs: 2.2,
        solarRadiationMjM2Day: 24,
        precipitationMm: 0,
        surfacePressureKpa: 100.8,
        retrievalTimestamp: '2026-05-02T00:00:00Z',
        spatialResolution: '0.5°',
      },
      {
        date: '2026-05-02',
        isForecast: false,
        source: 'NASA POWER',
        origin: 'reanalysis_assimilated',
        tMaxC: 30,
        tMinC: 16,
        tMeanC: 23,
        rhMeanPct: 48,
        windSpeed2mMs: 2.4,
        solarRadiationMjM2Day: 25,
        precipitationMm: 0,
        surfacePressureKpa: 100.7,
        retrievalTimestamp: '2026-05-03T00:00:00Z',
        spatialResolution: '0.5°',
      },
    ],
    forecastDaily: [1, 2, 3, 4, 5].map((d) => ({
      date: `2026-05-0${2 + d}`,
      isForecast: true,
      source: 'Open-Meteo Forecast',
      origin: 'nwp_forecast',
      tMaxC: 28,
      tMinC: 15,
      tMeanC: 21.5,
      rhMeanPct: d === 2 && forecastRainMmDay2 > 0 ? 85 : 55,
      windSpeed2mMs: 2.0,
      solarRadiationMjM2Day: d === 2 && forecastRainMmDay2 > 0 ? 10 : 23,
      precipitationMm: d === 2 ? forecastRainMmDay2 : 0,
      surfacePressureKpa: null,
      retrievalTimestamp: '2026-05-03T00:00:00Z',
      spatialResolution: '~0.1°',
    })),
    nasaPowerStatus: 'VERIFIED',
    openMeteoStatus: 'VERIFIED',
    nasaFreshness: 'fresh',
    openMeteoFreshness: 'fresh',
    initialRootZoneWetnessIndex: 0.4,
    // Start at ~60 mm depletion (0.32 - 0.06 = 0.26 -> 0.06*1000*1 = 60? wait FC=0.32 -> FC-0.26=0.06 -> 60mm)
    nwpSoilMoistureLayers: {
      observationTime: '2026-05-01T00:00:00Z',
      layer0_7: 0.25,
      layer7_28: 0.255,
      layer28_100: 0.255,
    },
    errors: [],
    retrievalTimestamp: '2026-05-03T00:00:00Z',
  });

  const mockLabSoil: SoilHydraulicResult = {
    sourceKind: 'farmer_lab',
    origin: 'user_provided',
    sourceLabel: 'Farmer Field Lab',
    isSpatialEstimate: false,
    soilGridsStatus: 'NOT_CONFIGURED',
    thetaFc: {
      value: 0.32,
      unit: 'm³/m³',
      parameterName: 'θFC',
      source: 'Lab',
      origin: 'user_provided',
      observationDate: '2026-05-01',
      retrievalTimestamp: '2026-05-03T00:00:00Z',
    },
    thetaWp: {
      value: 0.16,
      unit: 'm³/m³',
      parameterName: 'θWP',
      source: 'Lab',
      origin: 'user_provided',
      observationDate: '2026-05-01',
      retrievalTimestamp: '2026-05-03T00:00:00Z',
    },
    awcMmPerM: 160,
    hydrologicGroup: 'B',
    curveNumber: 76,
    layers: [],
    notes: [],
    retrievalTimestamp: '2026-05-03T00:00:00Z',
  };

  const baseConfig: FarmerIrrigationConfig = {
    ...getDefaultIrrigationConfig(2.5),
    cropId: 'tomato',
    plantingDate: '2026-02-01',
    growthStageOverride: 'mid_season',
    fieldAreaHectares: 2.5,
    soilSourcePreference: 'farmer_lab',
    labThetaFc: 0.32,
    labThetaWp: 0.16,
    applicationEfficiency: 0.60,
    systemFlowRateLph: null,
  };

  const decLowEff = computeSmartIrrigationDecision({
    coordinates: { lat: 34.265, lng: -5.928 },
    polygonAreaHectares: 2.5,
    config: baseConfig,
    weather: makeMockWeather(0),
    soil: mockLabSoil,
    referenceDateUtc: '2026-05-03',
  });

  const decHighEff = computeSmartIrrigationDecision({
    coordinates: { lat: 34.265, lng: -5.928 },
    polygonAreaHectares: 2.5,
    config: { ...baseConfig, applicationEfficiency: 0.90, systemFlowRateLph: 50000 },
    weather: makeMockWeather(0),
    soil: mockLabSoil,
    referenceDateUtc: '2026-05-03',
  });

  const expectedVolHigh = Math.round(10 * 2.5 * (decHighEff.grossIrrigationDepthMm || 0) * 10) / 10;
  const expectedDurHours =
    Math.round((((decHighEff.waterVolumeM3 || 0) * 1000) / 50000) * 100) / 100;

  assert(
    decLowEff.status === 'IRRIGATION_REQUIRED' &&
      decHighEff.status === 'IRRIGATION_REQUIRED' &&
      decLowEff.netIrrigationDepthMm === decHighEff.netIrrigationDepthMm &&
      (decHighEff.grossIrrigationDepthMm || 0) < (decLowEff.grossIrrigationDepthMm || 0) &&
      decLowEff.irrigationDurationHours === null &&
      decHighEff.waterVolumeM3 === expectedVolHigh &&
      decHighEff.irrigationDurationHours === expectedDurHours,
    'DEC-01',
    'Higher efficiency reduces gross water depth; volume=10×Area×Igross; duration is null unless flow rate Q>0',
    `Ea=0.60 -> Igross=${decLowEff.grossIrrigationDepthMm}mm (dur=${decLowEff.irrigationDurationHours}); Ea=0.90 -> Igross=${decHighEff.grossIrrigationDepthMm}mm, V=${decHighEff.waterVolumeM3}m³, dur=${decHighEff.irrigationDurationHours}h`
  );

  // Forecast rainfall scenario: start at D0 = 35mm -> ~48mm after 2 historical days (reaches RAW ~64mm on forecast day 3 if dry)
  const wNearDryNoRain = makeMockWeather(0);
  wNearDryNoRain.nwpSoilMoistureLayers = {
    observationTime: '2026-05-01T00:00:00Z',
    layer0_7: 0.285,
    layer7_28: 0.285,
    layer28_100: 0.285, // D0 = (0.32 - 0.285)*1000 = 35 mm
  };
  const wNearDryWithStorm = makeMockWeather(35); // 35 mm forecast rain on Day 2
  wNearDryWithStorm.nwpSoilMoistureLayers = { ...wNearDryNoRain.nwpSoilMoistureLayers };

  const decDryForecast = computeSmartIrrigationDecision({
    coordinates: { lat: 34.265, lng: -5.928 },
    polygonAreaHectares: 2.5,
    config: { ...baseConfig, applicationEfficiency: 0.9 },
    weather: wNearDryNoRain,
    soil: mockLabSoil,
    referenceDateUtc: '2026-05-03',
  });

  const decRainForecast = computeSmartIrrigationDecision({
    coordinates: { lat: 34.265, lng: -5.928 },
    polygonAreaHectares: 2.5,
    config: { ...baseConfig, applicationEfficiency: 0.9 },
    weather: wNearDryWithStorm,
    soil: mockLabSoil,
    referenceDateUtc: '2026-05-03',
  });

  const histRainDry = decDryForecast.historicalBalance.reduce((a, b) => a + b.rainfallTotalMm, 0);
  const histRainStorm = decRainForecast.historicalBalance.reduce((a, b) => a + b.rainfallTotalMm, 0);

  assert(
    histRainDry === 0 &&
      histRainStorm === 0 &&
      decDryForecast.forecastSummary?.firstDayReachingRaw !== null &&
      decRainForecast.forecastSummary?.rainfallWillDelayIrrigation === true &&
      decRainForecast.forecastSummary?.firstDayReachingRaw === null,
    'FCST-P3-01',
    'Forecast rainfall delays/eliminates projected RAW crossing without polluting historical observed rainfall',
    `HistRain(dry=${histRainDry}, storm=${histRainStorm}), DryRAW=${decDryForecast.forecastSummary?.firstDayReachingRaw}, StormRAW=${decRainForecast.forecastSummary?.firstDayReachingRaw}, DelayFlag=${decRainForecast.forecastSummary?.rainfallWillDelayIrrigation}`
  );

  // ---------------------------------------------------------------------------
  // 5. API Failure Handling (SoilGrids HTTP 503) & Invalid Bounds
  // ---------------------------------------------------------------------------
  console.log('\n--- 5. API Failure & Invalid Bounds Safety ---');

  const originalFetch = globalThis.fetch;
  try {
    scientificCache.clear();
    globalThis.fetch = (async () =>
      new Response('Service Unavailable', { status: 503, statusText: 'Service Unavailable' })) as typeof fetch;

    const failedSoil = await resolveSoilHydraulics({
      coordinates: { lat: 34.265, lng: -5.928 },
      config: getDefaultIrrigationConfig(1),
      rootDepthM: 0.8,
    });

    const missingDataDecision = computeSmartIrrigationDecision({
      coordinates: { lat: 34.265, lng: -5.928 },
      polygonAreaHectares: 1,
      config: { ...getDefaultIrrigationConfig(1), cropId: 'tomato' },
      weather: makeMockWeather(0),
      soil: failedSoil,
      referenceDateUtc: '2026-05-03',
    });

    assert(
      failedSoil.sourceKind === 'unavailable' &&
        failedSoil.thetaFc.value === null &&
        missingDataDecision.status === 'INSUFFICIENT_DATA' &&
        missingDataDecision.confidence === 'INSUFFICIENT_DATA' &&
        missingDataDecision.netIrrigationDepthMm === null,
      'ERR-P3-01',
      'SoilGrids HTTP 503 outage is NOT faked and yields explicit INSUFFICIENT_DATA recommendation',
      `SoilStatus=${failedSoil.soilGridsStatus}, Decision=${missingDataDecision.status}, Confidence=${missingDataDecision.confidence}`
    );
  } finally {
    globalThis.fetch = originalFetch;
    scientificCache.clear();
  }

  // Invalid soil thresholds (θFC <= θWP) & negative area rejection
  const badValidation = validateIrrigationInputs({
    coordinates: { lat: 34.265, lng: -5.928 },
    config: {
      ...baseConfig,
      fieldAreaHectares: -5,
      labThetaFc: 0.15,
      labThetaWp: 0.25,
      applicationEfficiency: 1.5,
    },
    referenceDateUtc: '2026-05-03',
  });
  assert(
    !badValidation.isValid && badValidation.errors.length >= 3,
    'VAL-P3-01',
    'Rejects physically impossible soil hydraulics (θFC <= θWP), negative area, and Ea > 1.0',
    `Errors (${badValidation.errors.length}): ${badValidation.errors[0]}`
  );

  // Storage schema sanitization resilience (corrupted localStorage defense)
  const originalLocalStorage = (globalThis as { localStorage?: Storage }).localStorage;
  try {
    const store = new Map<string, string>();
    (globalThis as { localStorage?: Storage }).localStorage = {
      get length() {
        return store.size;
      },
      clear: () => store.clear(),
      getItem: (k: string) => store.get(k) ?? null,
      key: (i: number) => Array.from(store.keys())[i] ?? null,
      removeItem: (k: string) => {
        store.delete(k);
      },
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
    };

    store.set(
      'turba_morocco_farm_records_v2',
      JSON.stringify([
        { id: 'bad-1', name: 'Broken coords', centroid: { lat: 'NaN', lng: -5 } },
        {
          id: 'ok-1',
          name: 'Parcelle Test',
          region: 'Rabat-Salé-Kénitra',
          province: 'Kénitra',
          centroid: { lat: 34.265, lng: -5.928 },
          polygon: null,
          calculatedAreaHectares: 2.5,
          calculatedAreaM2: 25000,
          identificationMethod: 'point_marker',
          classification: { source: 'USER_VERIFIED', cropType: 'cereals', confidence: 'HIGH', cropLabelEn: 'Cereals', cropLabelFr: 'Céréales', cropLabelAr: 'الحبوب' },
          createdAt: '2026-05-01T00:00:00Z',
          updatedAt: '2026-05-01T00:00:00Z',
        },
      ])
    );

    store.set(
      'turba_phase3_irrigation_configs_v1',
      JSON.stringify({
        'ok-1': {
          cropId: 'wheat',
          applicationEfficiency: 4.5, // invalid > 1
          targetDepletionFractionOfRaw: -0.5, // invalid < 0
          labThetaFc: 9.9, // invalid > 0.7
          systemFlowRateLph: -200, // invalid <= 0
          previousIrrigations: [{ bad: true }, { id: 'i1', date: '2026-05-01', netDepthMm: 20 }],
        },
      })
    );

    const sanitizedFarms = loadSavedFarms();
    const sanitizedCfg = loadIrrigationConfigForFarm('ok-1', 2.5);
    assert(
      sanitizedFarms.length === 1 &&
        sanitizedFarms[0].id === 'ok-1' &&
        sanitizedCfg.applicationEfficiency === 0.9 &&
        sanitizedCfg.targetDepletionFractionOfRaw === 0 &&
        sanitizedCfg.labThetaFc === null &&
        sanitizedCfg.systemFlowRateLph === null &&
        sanitizedCfg.previousIrrigations.length === 1,
      'STR-P3-01',
      'Sanitizes corrupted localStorage farm records & out-of-range irrigation configs instead of throwing or propagating NaN',
      `Farms=${sanitizedFarms.length}, Ea=${sanitizedCfg.applicationEfficiency}, Events=${sanitizedCfg.previousIrrigations.length}`
    );
  } finally {
    if (originalLocalStorage === undefined) {
      delete (globalThis as { localStorage?: Storage }).localStorage;
    } else {
      (globalThis as { localStorage?: Storage }).localStorage = originalLocalStorage;
    }
  }

  // ---------------------------------------------------------------------------
  // 6. Live API Integration Test (Gharb, Morocco: NASA POWER + Open-Meteo Forecast)
  // ---------------------------------------------------------------------------
  console.log('\n--- 6. Live End-to-End Integration Test (Sidi Slimane, Morocco) ---');
  try {
    const gharbCoords = { lat: 34.265, lng: -5.928 };
    const liveWeather = await fetchIrrigationWeatherSeries(gharbCoords);
    const spinUpStartDate = liveWeather.historicalDaily.slice(-14)[0]?.date;
    const obsTimeDate = liveWeather.nwpSoilMoistureLayers?.observationTime?.slice(0, 10);
    const liveConfig: FarmerIrrigationConfig = {
      ...getDefaultIrrigationConfig(3.2),
      cropId: 'wheat',
      plantingDate: '2026-10-01',
      growthStageOverride: 'auto',
      soilSourcePreference: 'auto_soilgrids_then_manual',
      farmerTextureId: 'clay_loam', // Verified backup texture only if SoilGrids upstream returns 503
      irrigationMethod: 'drip',
      applicationEfficiency: 0.90,
      systemFlowRateLph: 40000,
    };
    const liveSoil = await resolveSoilHydraulics({
      coordinates: gharbCoords,
      config: liveConfig,
      rootDepthM: 0.6,
    });
    const liveDecision = computeSmartIrrigationDecision({
      coordinates: gharbCoords,
      polygonAreaHectares: 3.2,
      config: liveConfig,
      weather: liveWeather,
      soil: liveSoil,
    });

    assert(
      Boolean(spinUpStartDate) &&
        Boolean(obsTimeDate) &&
        Math.abs((Date.parse(`${obsTimeDate}T00:00:00Z`) - Date.parse(`${spinUpStartDate}T00:00:00Z`)) / 86400000) <= 2,
      'INIT-P3-01',
      'Initial NWP soil moisture aligns with 14-day spin-up start date rather than today or -26d',
      `SpinUpStart=${spinUpStartDate}, NwpInitDate=${obsTimeDate}`
    );

    assert(
      liveWeather.historicalDaily.length >= 7 &&
        liveWeather.forecastDaily.length >= 7 &&
        liveDecision.status !== 'INSUFFICIENT_DATA' &&
        liveDecision.et0Current.value !== null &&
        liveDecision.tawMm.value !== null &&
        liveDecision.forecastBalance.length >= 5,
      'LIVE-P3-01',
      'Live NASA POWER + Open-Meteo forecast decision computed for Gharb (Morocco)',
      `Status=${liveDecision.status}, ET0=${liveDecision.et0Current.value} mm/d, Kc=${liveDecision.kcCurrent.value}, D=${liveDecision.currentDepletionMm.value}/${liveDecision.rawMm.value}mm, SoilSrc=${liveSoil.sourceKind}, Conf=${liveDecision.confidence}`
    );
  } catch (err) {
    assert(
      false,
      'LIVE-P3-01',
      'Live NASA POWER + Open-Meteo forecast decision computed for Gharb (Morocco)',
      err instanceof Error ? err.message : 'Unknown error'
    );
  }

  console.log('\n================================================================================');
  console.log(`PHASE 3 IRRIGATION VERIFICATION RESULTS: ${passed} / ${total} TESTS PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log('================================================================================');

  if (passed < total) {
    process.exit(1);
  }
}

runPhase3Tests();
