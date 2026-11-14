/**
 * TURBA Phase 3 — FAO-56 Daily Root-Zone Soil-Water Balance Engine
 *
 * Sign Convention (FAO-56 Chapter 8, Eqs. 82–87):
 * - Depletion D(t) [mm] >= 0 represents water depleted BELOW Field Capacity (θFC):
 *     D = 0 mm    => Soil is at Field Capacity (θ = θFC)
 *     D = RAW mm  => Readily Available Water threshold reached; stress begins (Ks < 1)
 *     D = TAW mm  => Soil is at Permanent Wilting Point (θ = θWP); Ks = 0
 *
 * Daily Mass Balance Identity (zero double-counting):
 *   1. Partition gross rainfall P(t) into surface runoff RO(t) and infiltrated rain Pinfilt(t) = P(t) - RO(t).
 *   2. Compute water stress Ks(t) from starting depletion D(t-1), TAW(t), and RAW(t).
 *   3. Adjusted crop ET: ETc_adj(t) = Ks(t) * Kc(t) * ET0(t) (capped if D(t-1) + ETc_adj > TAW).
 *   4. Tentative end-of-day depletion:
 *        D_tent = D(t-1) + ETc_adj(t) - Pinfilt(t) - I_net(t)
 *   5. If D_tent < 0, excess water drains below the root zone as Deep Percolation:
 *        DP(t) = -D_tent, and D(t) = 0.
 *      Deep percolation overflow is attributed first to rainfall overflow above irrigation retention
 *      so Effective Rainfall is strictly Peff(t) = P(t) - RO(t) - DP_rain(t), satisfying:
 *        D(t) = D(t-1) + ETc_adj(t) - Peff(t) - I_retained(t)
 */

import {
  CropDefinition,
  CropGrowthStage,
  DailyWaterBalanceStep,
  Fao56Et0Result,
  ValueOrigin,
} from '../../types/irrigation';
import { resolveCropStageForDay } from '../../data/crops';
import { adjustAllowableDepletionP, computeCropEtc, computeWaterStressKs } from './fao56';
import { computeSurfaceRunoffScs } from './rainfall';
import { diffDaysUtc } from './validation';

export interface WaterBalanceDayInput {
  date: string;
  isForecast: boolean;
  et0Result: Fao56Et0Result;
  precipitationMm: number | null;
  irrigationNetMm: number;
  meteoOrigin: ValueOrigin;
}

export interface SoilWaterStorageSpec {
  thetaFc: number;
  thetaWp: number;
  curveNumber: number;
  customRootDepthM?: number | null;
}

/**
 * Computes TAW [mm] = 1000 * (thetaFC - thetaWP) * Zr
 */
export function computeTawMm(thetaFc: number, thetaWp: number, rootDepthM: number): number {
  if (
    !Number.isFinite(thetaFc) ||
    !Number.isFinite(thetaWp) ||
    !Number.isFinite(rootDepthM) ||
    thetaFc <= thetaWp ||
    rootDepthM <= 0
  ) {
    return 0;
  }
  return Math.round(1000 * (thetaFc - thetaWp) * rootDepthM * 100) / 100;
}

/**
 * Computes RAW [mm] = p * TAW
 */
export function computeRawMm(tawMm: number, pFraction: number): number {
  if (!Number.isFinite(tawMm) || tawMm <= 0 || !Number.isFinite(pFraction) || pFraction <= 0) {
    return 0;
  }
  return Math.round(tawMm * pFraction * 100) / 100;
}

/**
 * Estimates initial root-zone depletion D0 [mm] from either NWP volumetric soil moisture layers
 * or dimensionless NASA MERRA-2 wetness index (0..1), clamped safely to [0, TAW].
 * Returns null if no soil moisture initialization source exists.
 */
export function estimateInitialDepletionMm(params: {
  thetaFc: number;
  thetaWp: number;
  rootDepthM: number;
  nwpLayers: {
    layer0_7: number | null;
    layer7_28: number | null;
    layer28_100: number | null;
  } | null;
  rootZoneWetnessIndex01: number | null;
}): {
  depletionMm: number | null;
  method: string;
} {
  const { thetaFc, thetaWp, rootDepthM, nwpLayers, rootZoneWetnessIndex01 } = params;
  const taw = computeTawMm(thetaFc, thetaWp, rootDepthM);
  if (taw <= 0) {
    return { depletionMm: null, method: 'Invalid TAW' };
  }

  // Priority 1: Depth-weighted Open-Meteo NWP volumetric soil moisture across [0..Zr]
  if (nwpLayers && nwpLayers.layer0_7 !== null) {
    const zCm = rootDepthM * 100;
    const layers = [
      { top: 0, bottom: 7, val: nwpLayers.layer0_7 },
      { top: 7, bottom: 28, val: nwpLayers.layer7_28 },
      { top: 28, bottom: 100, val: nwpLayers.layer28_100 },
    ];
    let weightedSum = 0;
    let totalWeight = 0;
    for (const l of layers) {
      if (l.val === null || !Number.isFinite(l.val)) continue;
      const overlap = Math.max(0, Math.min(zCm, l.bottom) - l.top);
      if (overlap > 0) {
        weightedSum += l.val * overlap;
        totalWeight += overlap;
      }
    }
    if (totalWeight > 0) {
      const avgTheta = weightedSum / totalWeight;
      const clampedTheta = Math.max(thetaWp, Math.min(thetaFc, avgTheta));
      const d0 = Math.round(1000 * (thetaFc - clampedTheta) * rootDepthM * 100) / 100;
      return {
        depletionMm: Math.max(0, Math.min(taw, d0)),
        method: `Depth-weighted Open-Meteo NWP volumetric moisture (θ_init=${clampedTheta.toFixed(3)} m³/m³)`,
      };
    }
  }

  // Priority 2: NASA POWER MERRA-2 dimensionless wetness index (0 = wilting point, 1 = complete saturation / >= FC)
  if (rootZoneWetnessIndex01 !== null && Number.isFinite(rootZoneWetnessIndex01)) {
    const w = Math.max(0, Math.min(1, rootZoneWetnessIndex01));
    // Relative saturation above WP; treat >=0.85 as near field capacity if no volumetric data
    const relAvailable = Math.min(1, w / 0.85);
    const d0 = Math.round((1 - relAvailable) * taw * 100) / 100;
    return {
      depletionMm: Math.max(0, Math.min(taw, d0)),
      method: `NASA POWER MERRA-2 GWETROOT index (${w.toFixed(2)})`,
    };
  }

  return { depletionMm: null, method: 'No initial soil moisture observation available' };
}

/**
 * Simulates daily soil-water balance over a contiguous sorted series of days.
 */
export function runDailySoilWaterBalance(params: {
  days: WaterBalanceDayInput[];
  crop: CropDefinition;
  plantingDate: string;
  stageOverride: CropGrowthStage | 'auto';
  soil: SoilWaterStorageSpec;
  initialDepletionMm: number;
}): DailyWaterBalanceStep[] {
  const { days, crop, plantingDate, stageOverride, soil, initialDepletionMm } = params;
  const steps: DailyWaterBalanceStep[] = [];

  let prevDepletion = Math.max(0, initialDepletionMm);
  let prevRootDepthM: number | null = null;

  for (const day of days) {
    if (!day.et0Result.isValid || day.et0Result.et0MmDay === null) {
      continue;
    }

    const dap = plantingDate ? diffDaysUtc(plantingDate, day.date) ?? 30 : 30;
    const { stage, kc, rootDepthM } = resolveCropStageForDay(
      crop,
      dap,
      stageOverride,
      soil.customRootDepthM
    );

    const tawMm = computeTawMm(soil.thetaFc, soil.thetaWp, rootDepthM);
    const etcPotentialMm = computeCropEtc(day.et0Result.et0MmDay, kc);
    const pAdjusted = adjustAllowableDepletionP(crop.coefficients.allowableDepletionP, etcPotentialMm);
    const rawMm = computeRawMm(tawMm, pAdjusted);

    // Handle root depth increment: when roots grow into deeper soil assumed at ~50% RAW or FC,
    // FAO-56 notes Dr increases at most modestly; here keep depletion bounded to current TAW
    // without inventing subsoil water deficit.
    if (prevRootDepthM !== null && rootDepthM > prevRootDepthM && prevDepletion > tawMm) {
      prevDepletion = Math.min(prevDepletion, tawMm);
    }
    const depletionStartMm = Math.max(0, Math.min(tawMm, prevDepletion));

    // Stress coefficient Ks from start-of-day depletion (FAO-56 Eq. 84)
    const ks =
      computeWaterStressKs({
        depletionMm: depletionStartMm,
        tawMm,
        rawMm,
      }) ?? 1.0;

    // Limit ETc_adj so soil cannot extract more water than remains down to TAW (wilting point)
    const rawEtcAdjusted = Math.round(etcPotentialMm * ks * 1000) / 1000;
    const rainfallTotalMm =
      day.precipitationMm !== null && Number.isFinite(day.precipitationMm)
        ? Math.max(0, day.precipitationMm)
        : 0;

    // Step 1: Surface runoff on precipitation (SCS Curve Number)
    const rainPart = computeSurfaceRunoffScs(rainfallTotalMm, soil.curveNumber);
    const irrigationNetMm = Math.max(0, day.irrigationNetMm);

    // Available extractable water during day = (TAW - depletionStart) + Pinfilt + Irrigation
    const maxExtractable = Math.max(0, tawMm - depletionStartMm + rainPart.infiltratedRainfallMm + irrigationNetMm);
    const etcAdjustedMm = Math.round(Math.min(rawEtcAdjusted, maxExtractable) * 1000) / 1000;

    // Step 2: Mass balance before deep percolation
    const tentativeDepletion =
      depletionStartMm + etcAdjustedMm - rainPart.infiltratedRainfallMm - irrigationNetMm;

    let deepPercolationMm = 0;
    let depletionEndMm = tentativeDepletion;

    if (tentativeDepletion < 0) {
      deepPercolationMm = Math.round(-tentativeDepletion * 100) / 100;
      depletionEndMm = 0;
    } else if (tentativeDepletion > tawMm) {
      depletionEndMm = tawMm;
    }

    depletionEndMm = Math.round(Math.max(0, Math.min(tawMm, depletionEndMm)) * 100) / 100;

    // Allocate deep percolation overflow to rain first if both rain and irrigation occurred
    const dpFromRain = Math.min(rainPart.infiltratedRainfallMm, deepPercolationMm);
    const effectiveRainfallMm = Math.round(
      Math.max(0, rainPart.infiltratedRainfallMm - dpFromRain) * 100
    ) / 100;

    const depletionRatioToRaw = rawMm > 0 ? Math.round((depletionEndMm / rawMm) * 1000) / 1000 : 0;

    steps.push({
      date: day.date,
      isForecast: day.isForecast,
      stage,
      kc,
      rootDepthM,
      tawMm,
      rawMm,
      et0Mm: Math.round(day.et0Result.et0MmDay * 100) / 100,
      etcPotentialMm: Math.round(etcPotentialMm * 100) / 100,
      ks,
      etcAdjustedMm: Math.round(etcAdjustedMm * 100) / 100,
      rainfallTotalMm: Math.round(rainfallTotalMm * 100) / 100,
      surfaceRunoffMm: rainPart.surfaceRunoffMm,
      effectiveRainfallMm,
      irrigationNetMm: Math.round(irrigationNetMm * 100) / 100,
      deepPercolationMm,
      depletionStartMm: Math.round(depletionStartMm * 100) / 100,
      depletionEndMm,
      depletionRatioToRaw,
      meteoOrigin: day.meteoOrigin,
      estimatedVariablesCount: day.et0Result.estimatedVariables.length,
      exceededRaw: rawMm > 0 && depletionEndMm >= rawMm,
    });

    prevDepletion = depletionEndMm;
    prevRootDepthM = rootDepthM;
  }

  return steps;
}
