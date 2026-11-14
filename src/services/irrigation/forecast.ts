/**
 * TURBA Phase 3 — Forward Irrigation Forecasting Engine
 *
 * Strictly separates future forecasts from historical rainfall/weather observations.
 * Simulates daily soil-water balance over the forecast horizon (+1 to +14 days)
 * to identify:
 * - Projected daily ETc
 * - Effective forecast rainfall
 * - Date when root-zone depletion D(t) reaches RAW
 * - Recommended irrigation timing window & whether forecast rain delays irrigation
 */

import {
  CropDefinition,
  CropGrowthStage,
  DailyMeteoRecord,
  DailyWaterBalanceStep,
  ForecastWindowSummary,
} from '../../types/irrigation';
import { computeFao56DailyEt0 } from './fao56';
import { runDailySoilWaterBalance, SoilWaterStorageSpec, WaterBalanceDayInput } from './waterBalance';

export function buildIrrigationForecast(params: {
  forecastMeteo: DailyMeteoRecord[];
  latitudeDeg: number;
  elevationM: number | null;
  crop: CropDefinition;
  plantingDate: string;
  stageOverride: CropGrowthStage | 'auto';
  soil: SoilWaterStorageSpec;
  currentDepletionMm: number;
  currentRawMm: number;
  horizonDays?: number;
}): {
  forecastSteps: DailyWaterBalanceStep[];
  summary: ForecastWindowSummary | null;
} {
  const {
    forecastMeteo,
    latitudeDeg,
    elevationM,
    crop,
    plantingDate,
    stageOverride,
    soil,
    currentDepletionMm,
    currentRawMm,
    horizonDays = 7,
  } = params;

  const usableForecast = forecastMeteo.filter((m) => m.isForecast).slice(0, horizonDays);
  if (usableForecast.length === 0) {
    return { forecastSteps: [], summary: null };
  }

  const dayInputs: WaterBalanceDayInput[] = usableForecast.map((m) => {
    const et0Result = computeFao56DailyEt0({
      date: m.date,
      latitudeDeg,
      elevationM,
      tMaxC: m.tMaxC,
      tMinC: m.tMinC,
      rhMeanPct: m.rhMeanPct,
      windSpeedMs: m.windSpeed2mMs,
      windHeightM: 2, // weatherDataService already converted 10m wind to 2m
      solarRadiationMjM2Day: m.solarRadiationMjM2Day,
      atmosphericPressureKpa: m.surfacePressureKpa,
      isForecast: true,
      source: m.source,
      origin: 'nwp_forecast',
    });

    return {
      date: m.date,
      isForecast: true,
      et0Result,
      precipitationMm: m.precipitationMm,
      irrigationNetMm: 0, // Never assume unscheduled future irrigations occurred
      meteoOrigin: 'nwp_forecast',
    };
  });

  const forecastSteps = runDailySoilWaterBalance({
    days: dayInputs,
    crop,
    plantingDate,
    stageOverride,
    soil,
    initialDepletionMm: currentDepletionMm,
  });

  if (forecastSteps.length === 0) {
    return { forecastSteps: [], summary: null };
  }

  // Also run a zero-rain comparison counterfactual across the forecast horizon
  // to test objectively whether forecast rainfall delays or relieves irrigation timing
  const noRainSteps = runDailySoilWaterBalance({
    days: dayInputs.map((d) => ({ ...d, precipitationMm: 0 })),
    crop,
    plantingDate,
    stageOverride,
    soil,
    initialDepletionMm: currentDepletionMm,
  });

  const firstRawStepIdx = forecastSteps.findIndex((s) => s.depletionEndMm >= s.rawMm);
  const firstNoRainRawIdx = noRainSteps.findIndex((s) => s.depletionEndMm >= s.rawMm);

  const firstDayReachingRaw = firstRawStepIdx >= 0 ? forecastSteps[firstRawStepIdx].date : null;
  const daysUntilRawReached = firstRawStepIdx >= 0 ? firstRawStepIdx + 1 : null;

  const projectedTotalEtcMm = Math.round(forecastSteps.reduce((acc, s) => acc + s.etcAdjustedMm, 0) * 10) / 10;
  const projectedTotalForecastRainMm = Math.round(forecastSteps.reduce((acc, s) => acc + s.rainfallTotalMm, 0) * 10) / 10;
  const projectedEffectiveRainMm = Math.round(forecastSteps.reduce((acc, s) => acc + s.effectiveRainfallMm, 0) * 10) / 10;

  let recommendedWindowStart: string | null = null;
  let recommendedWindowEnd: string | null = null;

  if (currentDepletionMm >= currentRawMm) {
    // Already at/above RAW: window is immediate (today..tomorrow), unless meaningful rain > (D - RAW + ETc) arrives within 24h
    recommendedWindowStart = forecastSteps[0].date;
    recommendedWindowEnd = forecastSteps[Math.min(1, forecastSteps.length - 1)].date;
  } else if (firstRawStepIdx >= 0) {
    const startIdx = Math.max(0, firstRawStepIdx - 1);
    recommendedWindowStart = forecastSteps[startIdx].date;
    recommendedWindowEnd = forecastSteps[firstRawStepIdx].date;
  }

  const rainfallWillDelayIrrigation =
    projectedEffectiveRainMm >= 2 &&
    ((firstNoRainRawIdx >= 0 && firstRawStepIdx < 0) ||
      (firstNoRainRawIdx >= 0 && firstRawStepIdx > firstNoRainRawIdx));

  return {
    forecastSteps,
    summary: {
      horizonDays: forecastSteps.length,
      firstDayReachingRaw,
      daysUntilRawReached,
      projectedTotalEtcMm,
      projectedTotalForecastRainMm,
      projectedEffectiveRainMm,
      recommendedWindowStart,
      recommendedWindowEnd,
      rainfallWillDelayIrrigation,
      forecastUncertaintyNoteEn:
        'Forecast water balance uses Open-Meteo NWP daily predictions; rainfall timing and intensity carry forecast uncertainty beyond 72 hours.',
      forecastUncertaintyNoteAr:
        'يعتمد التوازن المائي المستقبلي على تنبؤات نموذج Open-Meteo NWP؛ وتبقى دقة كمية وتوقيت الأمطار المتوقعة ذات هامش عدم يقين بعد 72 ساعة.',
      forecastUncertaintyNoteFr:
        'Le bilan hydrique prévisionnel repose sur Open-Meteo NWP ; les cumuls et le calendrier des pluies prévues comportent une incertitude croissante au-delà de 72 heures.',
    },
  };
}
