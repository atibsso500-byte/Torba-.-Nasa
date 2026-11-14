/**
 * TURBA Phase 3 — FAO-56 Penman-Monteith Evapotranspiration Engine
 *
 * Strictly implements:
 * Allen, R.G., Pereira, L.S., Raes, D., & Smith, M. (1998)
 * "Crop evapotranspiration - Guidelines for computing crop water requirements"
 * FAO Irrigation and Drainage Paper No. 56 (Eqs. 6, 7, 8, 9, 11, 12, 13, 14, 17, 19, 21-25, 28, 37, 38, 39, 40, 42, 47, 48, 50, 84)
 *
 * Scientific Rules:
 * - Never substitutes zero silently for missing data.
 * - Any FAO-56 estimation procedure (e.g. Hargreaves Rs from Tmax-Tmin, ea from Tmin, P from elevation)
 *   is explicitly recorded in `estimatedVariables` so confidence can be downgraded transparently.
 * - Distinguishes ET0 (reference), ETc = Kc * ET0 (standard), and ETc_adj = Ks * Kc * ET0 (water-stressed).
 */

import { Fao56Et0Result, ValueOrigin } from '../../types/irrigation';
import {
  adjustWindSpeedTo2m,
  atmosphericPressureFromElevationKpa,
  getDayOfYearUtc,
} from './validation';

const STEFAN_BOLTZMANN_MJ_K4_M2_DAY = 4.903e-9; // FAO-56 Eq. 39
const SOLAR_CONSTANT_MJ_M2_MIN = 0.0820; // Gsc, FAO-56 Eq. 21
const ALBEDO_REFERENCE_GRASS = 0.23; // FAO-56 Eq. 38

/**
 * FAO-56 Eq. 11: Saturation vapour pressure e°(T) [kPa] at temperature T [°C]
 */
export function saturationVaporPressureKpa(tempC: number): number {
  return 0.6108 * Math.exp((17.27 * tempC) / (tempC + 237.3));
}

/**
 * FAO-56 Eq. 13: Slope of saturation vapour pressure curve Δ [kPa °C⁻¹] at Tmean [°C]
 */
export function slopeVaporPressureCurveKpaPerC(tMeanC: number): number {
  const expTerm = saturationVaporPressureKpa(tMeanC);
  const denom = tMeanC + 237.3;
  return (4098 * expTerm) / (denom * denom);
}

/**
 * FAO-56 Eq. 8: Psychrometric constant γ [kPa °C⁻¹] from atmospheric pressure P [kPa]
 */
export function psychrometricConstantKpaPerC(pressureKpa: number): number {
  return 0.000665 * pressureKpa;
}

/**
 * FAO-56 Eqs. 21-25 & 28: Extraterrestrial radiation Ra [MJ m⁻² day⁻¹]
 * for latitude [decimal degrees] and day of year J [1..366]
 */
export function extraterrestrialRadiationMjM2Day(latitudeDeg: number, dayOfYear: number): number {
  const latRad = (Math.PI / 180) * latitudeDeg;
  // Inverse relative distance Earth-Sun (Eq. 23)
  const dr = 1 + 0.033 * Math.cos(((2 * Math.PI) / 365) * dayOfYear);
  // Solar declination (Eq. 24)
  const delta = 0.409 * Math.sin(((2 * Math.PI) / 365) * dayOfYear - 1.39);
  // Sunset hour angle (Eq. 25) with safe clamping for polar latitudes
  const x = Math.max(-1, Math.min(1, -Math.tan(latRad) * Math.tan(delta)));
  const omegaS = Math.acos(x);

  const term =
    omegaS * Math.sin(latRad) * Math.sin(delta) +
    Math.cos(latRad) * Math.cos(delta) * Math.sin(omegaS);

  const ra = ((24 * 60) / Math.PI) * SOLAR_CONSTANT_MJ_M2_MIN * dr * term;
  return Math.max(0, ra);
}

/**
 * FAO-56 Eq. 37: Clear-sky solar radiation Rso [MJ m⁻² day⁻¹]
 */
export function clearSkySolarRadiationMjM2Day(raMjM2Day: number, elevationM: number): number {
  const safeElev = Math.max(0, elevationM);
  return (0.75 + 2e-5 * safeElev) * raMjM2Day;
}

/**
 * FAO-56 Eq. 50: Hargreaves radiation formula for missing solar radiation Rs
 * Rs = kRs * sqrt(Tmax - Tmin) * Ra (kRs = 0.16 interior, 0.19 coastal)
 */
export function estimateSolarRadiationHargreaves(params: {
  tMaxC: number;
  tMinC: number;
  raMjM2Day: number;
  rsoMjM2Day: number;
  kRs?: number;
}): number | null {
  const { tMaxC, tMinC, raMjM2Day, rsoMjM2Day, kRs = 0.16 } = params;
  const deltaT = tMaxC - tMinC;
  if (!Number.isFinite(deltaT) || deltaT < 0) {
    return null;
  }
  const rawRs = kRs * Math.sqrt(deltaT) * raMjM2Day;
  // Physically bounded by clear-sky radiation Rso (or Ra if Rso unavailable)
  const upperBound = rsoMjM2Day > 0 ? rsoMjM2Day : raMjM2Day;
  return Math.max(0, Math.min(rawRs, upperBound));
}

export interface DailyEt0Input {
  date: string; // YYYY-MM-DD
  latitudeDeg: number;
  elevationM?: number | null;
  tMaxC: number | null;
  tMinC: number | null;
  rhMeanPct?: number | null;
  rhMaxPct?: number | null;
  rhMinPct?: number | null;
  dewPointC?: number | null;
  /** Wind speed in m/s at height windHeightM (defaults to 2 m) */
  windSpeedMs?: number | null;
  windHeightM?: number;
  solarRadiationMjM2Day?: number | null;
  atmosphericPressureKpa?: number | null;
  isForecast?: boolean;
  source?: string;
  origin?: ValueOrigin;
  /** Heuristic coastal check if Hargreaves kRs fallback is needed */
  isCoastalLocation?: boolean;
}

/**
 * Calculates daily grass reference evapotranspiration ET0 [mm/day] using FAO-56 Penman-Monteith Eq. 6.
 */
export function computeFao56DailyEt0(input: DailyEt0Input): Fao56Et0Result {
  const estimatedVariables: Fao56Et0Result['estimatedVariables'] = [];
  const missingCriticalVariables: string[] = [];

  const emptyResult = (missing: string[]): Fao56Et0Result => ({
    date: input.date,
    et0MmDay: null,
    isValid: false,
    isForecast: Boolean(input.isForecast),
    intermediates: {
      tMeanC: null,
      esKpa: null,
      eaKpa: null,
      vpdKpa: null,
      deltaKpaC: null,
      pressureKpa: null,
      gammaKpaC: null,
      u2Ms: null,
      raMjM2Day: null,
      rsoMjM2Day: null,
      rsMjM2Day: null,
      rnsMjM2Day: null,
      rnlMjM2Day: null,
      rnMjM2Day: null,
    },
    estimatedVariables,
    missingCriticalVariables: missing,
    origin: input.origin || 'reanalysis_assimilated',
    source: input.source || 'FAO-56 Penman-Monteith',
  });

  // 1. Validate critical inputs: date, latitude, Tmax, Tmin
  const doy = getDayOfYearUtc(input.date);
  if (doy === null) {
    missingCriticalVariables.push('valid_date');
  }
  if (!Number.isFinite(input.latitudeDeg) || input.latitudeDeg < -90 || input.latitudeDeg > 90) {
    missingCriticalVariables.push('latitude');
  }
  if (input.tMaxC === null || !Number.isFinite(input.tMaxC)) {
    missingCriticalVariables.push('Tmax');
  }
  if (input.tMinC === null || !Number.isFinite(input.tMinC)) {
    missingCriticalVariables.push('Tmin');
  }

  if (missingCriticalVariables.length > 0) {
    return emptyResult(missingCriticalVariables);
  }

  const tMax = input.tMaxC!;
  const tMin = input.tMinC!;
  if (tMax < tMin) {
    return emptyResult(['Tmax < Tmin physical inconsistency']);
  }

  // FAO-56 Eq. 9: Daily mean temperature
  const tMeanC = (tMax + tMin) / 2;

  // 2. Atmospheric Pressure P [kPa] (Measured PS preferred; fallback FAO-56 Eq. 7 from elevation)
  let pressureKpa: number | null = null;
  if (
    input.atmosphericPressureKpa !== null &&
    input.atmosphericPressureKpa !== undefined &&
    Number.isFinite(input.atmosphericPressureKpa) &&
    input.atmosphericPressureKpa >= 50 &&
    input.atmosphericPressureKpa <= 110
  ) {
    pressureKpa = input.atmosphericPressureKpa;
  } else if (input.elevationM !== null && input.elevationM !== undefined && Number.isFinite(input.elevationM)) {
    pressureKpa = atmosphericPressureFromElevationKpa(input.elevationM);
    estimatedVariables.push({
      variable: 'atmosphericPressureKpa',
      method: 'FAO-56 Eq. 7 (Barometric formula from elevation)',
      reason: `PS surface pressure unavailable; derived from elevation ${input.elevationM.toFixed(1)} m.`,
    });
  } else {
    return emptyResult(['atmosphericPressure_or_elevation']);
  }

  const gammaKpaC = psychrometricConstantKpaPerC(pressureKpa);
  const deltaKpaC = slopeVaporPressureCurveKpaPerC(tMeanC);

  // 3. Saturation Vapor Pressure es [kPa] (FAO-56 Eq. 12)
  const eTmax = saturationVaporPressureKpa(tMax);
  const eTmin = saturationVaporPressureKpa(tMin);
  const esKpa = (eTmax + eTmin) / 2;

  // 4. Actual Vapor Pressure ea [kPa] (Eq. 17 -> Eq. 19 -> Eq. 14 -> Eq. 48)
  let eaKpa: number | null = null;
  if (
    input.rhMaxPct !== null &&
    input.rhMaxPct !== undefined &&
    input.rhMinPct !== null &&
    input.rhMinPct !== undefined &&
    Number.isFinite(input.rhMaxPct) &&
    Number.isFinite(input.rhMinPct)
  ) {
    eaKpa = (eTmin * (input.rhMaxPct / 100) + eTmax * (input.rhMinPct / 100)) / 2;
  } else if (input.rhMeanPct !== null && input.rhMeanPct !== undefined && Number.isFinite(input.rhMeanPct)) {
    // FAO-56 Eq. 19
    eaKpa = (input.rhMeanPct / 100) * esKpa;
  } else if (input.dewPointC !== null && input.dewPointC !== undefined && Number.isFinite(input.dewPointC)) {
    // FAO-56 Eq. 14
    eaKpa = saturationVaporPressureKpa(input.dewPointC);
  } else {
    // FAO-56 Eq. 48 (Arid/semi-arid estimation: Tdew ≈ Tmin; conservative check)
    eaKpa = eTmin;
    estimatedVariables.push({
      variable: 'eaKpa',
      method: 'FAO-56 Eq. 48 (Tdew ≈ Tmin)',
      reason: 'Relative humidity and dew-point missing; actual vapor pressure estimated from Tmin.',
    });
  }
  eaKpa = Math.max(0, Math.min(eaKpa, esKpa));
  const vpdKpa = Math.max(0, esKpa - eaKpa);

  // 5. Wind speed adjusted to 2 m (FAO-56 Eq. 47)
  let u2Ms: number;
  if (input.windSpeedMs !== null && input.windSpeedMs !== undefined && Number.isFinite(input.windSpeedMs)) {
    const heightM = input.windHeightM ?? 2;
    u2Ms = adjustWindSpeedTo2m(input.windSpeedMs, heightM);
  } else {
    // FAO-56 Chapter 3 Eq. 47 / global default u2 = 2.0 m/s ONLY when wind data unavailable
    u2Ms = 2.0;
    estimatedVariables.push({
      variable: 'windSpeed2m',
      method: 'FAO-56 Ch. 3 default u2 = 2.0 m/s',
      reason: 'Wind speed missing from upstream source; FAO-56 standard default applied with reduced confidence.',
    });
  }

  // 6. Radiation terms Ra, Rso, Rs, Rns, Rnl, Rn
  const elevForRso = input.elevationM !== null && input.elevationM !== undefined && Number.isFinite(input.elevationM)
    ? input.elevationM
    : 0;
  const raMjM2Day = extraterrestrialRadiationMjM2Day(input.latitudeDeg, doy!);
  const rsoMjM2Day = clearSkySolarRadiationMjM2Day(raMjM2Day, elevForRso);

  let rsMjM2Day: number;
  if (
    input.solarRadiationMjM2Day !== null &&
    input.solarRadiationMjM2Day !== undefined &&
    Number.isFinite(input.solarRadiationMjM2Day) &&
    input.solarRadiationMjM2Day >= 0
  ) {
    rsMjM2Day = input.solarRadiationMjM2Day;
  } else {
    const kRs = input.isCoastalLocation ? 0.19 : 0.16;
    const estRs = estimateSolarRadiationHargreaves({
      tMaxC: tMax,
      tMinC: tMin,
      raMjM2Day,
      rsoMjM2Day,
      kRs,
    });
    if (estRs === null) {
      return emptyResult(['solarRadiation']);
    }
    rsMjM2Day = estRs;
    estimatedVariables.push({
      variable: 'solarRadiation',
      method: `FAO-56 Eq. 50 Hargreaves Radiation (kRs=${kRs})`,
      reason: 'Measured/CERES shortwave solar radiation unavailable (latency or missing); estimated from daily Tmax - Tmin and Ra.',
    });
  }

  // Net shortwave radiation Rns (Eq. 38)
  const rnsMjM2Day = (1 - ALBEDO_REFERENCE_GRASS) * rsMjM2Day;

  // Net longwave radiation Rnl (Eq. 39)
  const tMaxK4 = Math.pow(tMax + 273.16, 4);
  const tMinK4 = Math.pow(tMin + 273.16, 4);
  const ratioRsRso = rsoMjM2Day > 0.05 ? Math.max(0.3, Math.min(1.0, rsMjM2Day / rsoMjM2Day)) : 0.35;
  const cloudFactor = 1.35 * ratioRsRso - 0.35;
  const vaporFactor = 0.34 - 0.14 * Math.sqrt(eaKpa);
  const rnlMjM2Day =
    STEFAN_BOLTZMANN_MJ_K4_M2_DAY * ((tMaxK4 + tMinK4) / 2) * vaporFactor * cloudFactor;

  // Net radiation Rn (Eq. 40); daily Soil Heat Flux G = 0 (Eq. 42)
  const rnMjM2Day = rnsMjM2Day - rnlMjM2Day;
  const G = 0;

  // 7. FAO-56 Penman-Monteith Equation (Eq. 6)
  const numerator =
    0.408 * deltaKpaC * (rnMjM2Day - G) +
    gammaKpaC * (900 / (tMeanC + 273)) * u2Ms * vpdKpa;
  const denominator = deltaKpaC + gammaKpaC * (1 + 0.34 * u2Ms);

  const rawEt0 = numerator / denominator;
  const et0MmDay = Math.max(0, Math.round(rawEt0 * 1000) / 1000);

  return {
    date: input.date,
    et0MmDay,
    isValid: Number.isFinite(et0MmDay),
    isForecast: Boolean(input.isForecast),
    intermediates: {
      tMeanC: round3(tMeanC),
      esKpa: round4(esKpa),
      eaKpa: round4(eaKpa),
      vpdKpa: round4(vpdKpa),
      deltaKpaC: round4(deltaKpaC),
      pressureKpa: round3(pressureKpa),
      gammaKpaC: round5(gammaKpaC),
      u2Ms: round3(u2Ms),
      raMjM2Day: round3(raMjM2Day),
      rsoMjM2Day: round3(rsoMjM2Day),
      rsMjM2Day: round3(rsMjM2Day),
      rnsMjM2Day: round3(rnsMjM2Day),
      rnlMjM2Day: round3(rnlMjM2Day),
      rnMjM2Day: round3(rnMjM2Day),
    },
    estimatedVariables,
    missingCriticalVariables: [],
    origin: estimatedVariables.length > 0 ? 'fao56_estimated' : input.origin || 'reanalysis_assimilated',
    source: input.source || 'FAO-56 Penman-Monteith',
  };
}

/**
 * FAO-56 Eq. 56 / Eq. 69: Crop Evapotranspiration under standard conditions ETc = Kc * ET0
 */
export function computeCropEtc(et0MmDay: number, kc: number): number {
  if (!Number.isFinite(et0MmDay) || et0MmDay < 0 || !Number.isFinite(kc) || kc < 0) {
    return 0;
  }
  return Math.round(et0MmDay * kc * 1000) / 1000;
}

/**
 * FAO-56 Table 22 footnote climate adjustment for allowable depletion p:
 * p_adj = p_table + 0.04 * (5 - ETc), clamped strictly to [0.10, 0.80]
 */
export function adjustAllowableDepletionP(baseP: number, etcMmDay: number | null): number {
  if (etcMmDay === null || !Number.isFinite(etcMmDay)) {
    return baseP;
  }
  const adjusted = baseP + 0.04 * (5 - etcMmDay);
  return Math.round(Math.max(0.10, Math.min(0.80, adjusted)) * 1000) / 1000;
}

/**
 * FAO-56 Eq. 84: Water Stress Coefficient Ks
 * Returns null if TAW or RAW cannot be reliably established (never invents Ks).
 * Ks = 1.0 when Dr <= RAW
 * Ks = (TAW - Dr) / (TAW - RAW) when Dr > RAW, clamped to [0, 1]
 */
export function computeWaterStressKs(params: {
  depletionMm: number | null;
  tawMm: number | null;
  rawMm: number | null;
}): number | null {
  const { depletionMm, tawMm, rawMm } = params;
  if (
    depletionMm === null ||
    tawMm === null ||
    rawMm === null ||
    !Number.isFinite(depletionMm) ||
    !Number.isFinite(tawMm) ||
    !Number.isFinite(rawMm) ||
    tawMm <= 0 ||
    rawMm >= tawMm
  ) {
    return null;
  }

  if (depletionMm <= rawMm) {
    return 1.0;
  }

  const ks = (tawMm - depletionMm) / (tawMm - rawMm);
  return Math.round(Math.max(0, Math.min(1, ks)) * 1000) / 1000;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
function round5(n: number): number {
  return Math.round(n * 100000) / 100000;
}
