/**
 * TURBA — Global Crop Rotation & Soil Health Advisor
 *
 * Scientific Implementation:
 * - FAO Irrigation & Drainage Paper No. 56 (Tables 11, 12, 19, 22; Penman-Monteith ET0)
 * - NASA POWER (MERRA-2 / GEOS-FP) observed agroclimatology & 30-year rainfall anomalies
 * - ISRIC SoilGrids v2.0 / Lab / FAO-56 Table 19 soil hydraulic & organic carbon data
 * - Botanical family disease-break & biological nitrogen fixation agronomy rules
 *
 * Integrity Guarantees:
 * - Zero fabricated yields, prices, profits, fertilizer doses, or synthetic climate values.
 * - Hard exclusions applied prior to weighted deterministic scoring.
 * - Explicit separation of Measured/Retrieved, Calculated, Reference, Assumption, and Missing info.
 * - Never masks missing evidence with generic crop fallback padding.
 */

import { NasaGpmObservation, NasaPowerObservation } from '../../types/farm';
import {
  CropBotanicalFamily,
  CropResidueManagement,
  CropRotationCandidateResult,
  DailyMeteoRecord,
  ExcludedRotationCandidate,
  FarmerContextProfile,
  GlobalCropRotationAdviceResult,
  GlobalRotationCropProfile,
  IrrigationConfidenceLevel,
  RotationEvidenceDistinction,
  RotationScoreBreakdown,
  RotationSuitabilityStatus,
  RotationWaterAssessment,
  SoilDataSourceKind,
  SoilHydraulicResult,
} from '../../types/irrigation';
import {
  GLOBAL_ROTATION_CROP_DATABASE,
  getGlobalRotationCropById,
} from '../../data/crops';
import { computeFao56DailyEt0 } from './fao56';
import { computeSurfaceRunoffScs } from './rainfall';

export interface CropRotationAdvisorInput {
  currentCropId: string;
  previousCropId?: string;
  previousCropResidue?: CropResidueManagement;
  climate: {
    nasaPower: NasaPowerObservation | null;
    nasaGpm: NasaGpmObservation | null;
    historicalMeteoDays?: DailyMeteoRecord[];
    et0DailyValues?: Array<{ date: string; et0MmDay: number | null }>;
    latitudeDeg?: number;
    elevationM?: number | null;
  };
  soil: SoilHydraulicResult;
  farmerContext: FarmerContextProfile;
  verifiedRegionLabel?: string | null;
}

export interface ExtractedSoilIndicators {
  sourceKind: SoilDataSourceKind;
  clayPct: number | null;
  sandPct: number | null;
  socPct: number | null;
  omPct: number | null;
  thetaFc: number | null;
  thetaWp: number | null;
  awcMmPerM: number | null;
  sourceLabel: string;
  isSpatialModel: boolean;
  retrievalDate: string;
}

export interface ExtractedClimateIndicators {
  hasSufficientData: boolean;
  et0MeanMmDay: number | null;
  tMeanAvgC: number | null;
  tMinObservedC: number | null;
  tMaxObservedC: number | null;
  observedWindowDays: number;
  observedRainfallMm: number | null;
  estimatedEffectiveRainWindowMm: number | null;
  rainfallAnomalyPercent: number | null;
  observationEndDate: string | null;
  retrievalDate: string;
  nasaSource: string | null;
  precipSource: string | null;
  missingItems: string[];
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function clamp01to100(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function extractSoilIndicators(soil: SoilHydraulicResult): ExtractedSoilIndicators {
  let claySum = 0;
  let clayW = 0;
  let sandSum = 0;
  let sandW = 0;
  let socSum = 0;
  let socW = 0;
  let omSum = 0;
  let omW = 0;

  for (const layer of soil.layers || []) {
    const thickness = Math.max(1, layer.depthBottomCm - layer.depthTopCm);
    // Top 60 cm for physical rooting / tillage texture; top 30 cm weighted higher for SOC
    if (layer.depthBottomCm <= 60) {
      if (layer.clayPct !== null && Number.isFinite(layer.clayPct)) {
        claySum += layer.clayPct * thickness;
        clayW += thickness;
      }
      if (layer.sandPct !== null && Number.isFinite(layer.sandPct)) {
        sandSum += layer.sandPct * thickness;
        sandW += thickness;
      }
    }
    if (layer.depthBottomCm <= 30) {
      if (layer.organicCarbonPct !== null && Number.isFinite(layer.organicCarbonPct)) {
        socSum += layer.organicCarbonPct * thickness;
        socW += thickness;
      }
      if (layer.organicMatterPct !== null && Number.isFinite(layer.organicMatterPct)) {
        omSum += layer.organicMatterPct * thickness;
        omW += thickness;
      }
    }
  }

  return {
    sourceKind: soil.sourceKind,
    clayPct: clayW > 0 ? round1(claySum / clayW) : null,
    sandPct: sandW > 0 ? round1(sandSum / sandW) : null,
    socPct: socW > 0 ? round2(socSum / socW) : null,
    omPct: omW > 0 ? round2(omSum / omW) : null,
    thetaFc: soil.thetaFc.value,
    thetaWp: soil.thetaWp.value,
    awcMmPerM: soil.awcMmPerM,
    sourceLabel: soil.sourceLabel,
    isSpatialModel: soil.isSpatialEstimate,
    retrievalDate: soil.retrievalTimestamp || soil.thetaFc.observationDate || 'Unavailable',
  };
}

export function extractClimateIndicators(
  climate: CropRotationAdvisorInput['climate'],
  curveNumber: number
): ExtractedClimateIndicators {
  const missingItems: string[] = [];

  // 1. Collect valid ET0 values (reuse Phase 3 computed daily ET0 first; fallback to computing via fao56Engine)
  const validEt0Values: number[] = [];
  if (climate.et0DailyValues && climate.et0DailyValues.length > 0) {
    for (const item of climate.et0DailyValues) {
      if (item.et0MmDay !== null && Number.isFinite(item.et0MmDay) && item.et0MmDay >= 0) {
        validEt0Values.push(item.et0MmDay);
      }
    }
  }

  if (validEt0Values.length === 0 && climate.historicalMeteoDays && climate.historicalMeteoDays.length > 0) {
    const lat = typeof climate.latitudeDeg === 'number' && Number.isFinite(climate.latitudeDeg)
      ? climate.latitudeDeg
      : 33.5;
    for (const m of climate.historicalMeteoDays) {
      if (m.isForecast) continue;
      const res = computeFao56DailyEt0({
        date: m.date,
        latitudeDeg: lat,
        elevationM: climate.elevationM ?? null,
        tMaxC: m.tMaxC,
        tMinC: m.tMinC,
        rhMeanPct: m.rhMeanPct,
        rhMaxPct: m.rhMaxPct,
        rhMinPct: m.rhMinPct,
        windSpeedMs: m.windSpeed2mMs,
        windHeightM: 2,
        solarRadiationMjM2Day: m.solarRadiationMjM2Day,
        atmosphericPressureKpa: m.surfacePressureKpa,
        isForecast: false,
        source: m.source,
        origin: m.origin,
      });
      if (res.isValid && res.et0MmDay !== null) {
        validEt0Values.push(res.et0MmDay);
      }
    }
  }

  const et0MeanMmDay =
    validEt0Values.length > 0
      ? round2(validEt0Values.reduce((acc, v) => acc + v, 0) / validEt0Values.length)
      : null;

  // 2. Collect NASA POWER temperature & rainfall window metrics
  const nasa = climate.nasaPower;
  const gpm = climate.nasaGpm;
  const meteoDays = climate.historicalMeteoDays || [];

  const tempMeans: number[] = [];
  const tMins: number[] = [];
  const tMaxs: number[] = [];
  const precipSeries: number[] = [];
  let latestDate: string | null = nasa?.observationDateUtc || null;

  if (nasa && nasa.dataStatus !== 'UNAVAILABLE' && nasa.dailyHistory.length > 0) {
    for (const d of nasa.dailyHistory) {
      if (d.temperature !== null && Number.isFinite(d.temperature)) {
        tempMeans.push(d.temperature);
      }
      if (d.precipitation !== null && Number.isFinite(d.precipitation)) {
        precipSeries.push(d.precipitation);
      }
    }
    if (nasa.temperatureMin !== null) tMins.push(nasa.temperatureMin);
    if (nasa.temperatureMax !== null) tMaxs.push(nasa.temperatureMax);
  }

  // Supplement temperature extremes and missing daily precip from historicalMeteoDays (all observed, never forecasts)
  if (meteoDays.length > 0) {
    for (const m of meteoDays) {
      if (m.isForecast) continue;
      if (m.tMeanC !== null && Number.isFinite(m.tMeanC) && tempMeans.length === 0) {
        tempMeans.push(m.tMeanC);
      }
      if (m.tMinC !== null && Number.isFinite(m.tMinC)) tMins.push(m.tMinC);
      if (m.tMaxC !== null && Number.isFinite(m.tMaxC)) tMaxs.push(m.tMaxC);
      if (precipSeries.length === 0 && m.precipitationMm !== null && Number.isFinite(m.precipitationMm)) {
        precipSeries.push(m.precipitationMm);
      }
      if (!latestDate || m.date > latestDate) latestDate = m.date;
    }
  }

  const tMeanAvgC =
    tempMeans.length > 0
      ? round1(tempMeans.reduce((a, b) => a + b, 0) / tempMeans.length)
      : nasa?.temperature2m ?? null;
  const tMinObservedC = tMins.length > 0 ? round1(Math.min(...tMins)) : nasa?.temperatureMin ?? null;
  const tMaxObservedC = tMaxs.length > 0 ? round1(Math.max(...tMaxs)) : nasa?.temperatureMax ?? null;

  const observedWindowDays = Math.max(
    nasa?.dailyHistory.length || 0,
    meteoDays.filter((m) => !m.isForecast).length,
    validEt0Values.length
  );

  let observedRainfallMm: number | null = null;
  if (gpm && gpm.dataStatus !== 'UNAVAILABLE' && gpm.monthlyAccumulationMm !== null) {
    observedRainfallMm = round1(gpm.monthlyAccumulationMm);
  } else if (precipSeries.length > 0) {
    observedRainfallMm = round1(precipSeries.reduce((a, b) => a + b, 0));
  }

  let estimatedEffectiveRainWindowMm: number | null = null;
  if (precipSeries.length > 0) {
    let effSum = 0;
    for (const p of precipSeries) {
      effSum += computeSurfaceRunoffScs(p, curveNumber).infiltratedRainfallMm;
    }
    estimatedEffectiveRainWindowMm = round1(effSum);
  } else if (observedRainfallMm !== null) {
    estimatedEffectiveRainWindowMm =
      observedRainfallMm === 0
        ? 0
        : round1(
            computeSurfaceRunoffScs(
              observedRainfallMm / Math.max(1, observedWindowDays / 5),
              curveNumber
            ).infiltratedRainfallMm * Math.max(1, observedWindowDays / 5)
          );
  }

  const rainfallAnomalyPercent =
    gpm && gpm.dataStatus !== 'UNAVAILABLE' && gpm.anomalyPercent !== null
      ? gpm.anomalyPercent
      : null;

  if (et0MeanMmDay === null || validEt0Values.length < 3) {
    missingItems.push('Reference evapotranspiration (ET0) time series (>= 3 observed days required)');
  }
  if (observedRainfallMm === null) {
    missingItems.push('NASA POWER / observed precipitation accumulation');
  }
  if (tMeanAvgC === null) {
    missingItems.push('Daily air temperature observations');
  }

  const hasSufficientData =
    et0MeanMmDay !== null &&
    validEt0Values.length >= 3 &&
    observedRainfallMm !== null &&
    tMeanAvgC !== null &&
    observedWindowDays >= 3;

  return {
    hasSufficientData,
    et0MeanMmDay,
    tMeanAvgC,
    tMinObservedC,
    tMaxObservedC,
    observedWindowDays,
    observedRainfallMm,
    estimatedEffectiveRainWindowMm,
    rainfallAnomalyPercent,
    observationEndDate: latestDate,
    retrievalDate: nasa?.retrievalTimestamp || latestDate || 'Unavailable',
    nasaSource: nasa?.source || null,
    precipSource: gpm?.source || null,
    missingItems,
  };
}

function getNormalizedWeights(farmer: FarmerContextProfile): RotationScoreBreakdown['weights'] {
  let wAgr = 0.25;
  let wSoil = 0.20;
  let wClim = 0.25;
  let wFin = 0.15;
  let wGoal = 0.15;

  if (farmer.primaryGoal === 'water_conservation' || farmer.waterAndTechCapacity === 'rainfed_only') {
    wClim += 0.08;
    wFin -= 0.03;
    wGoal -= 0.02;
    wAgr -= 0.03;
  } else if (farmer.primaryGoal === 'soil_regeneration') {
    wSoil += 0.08;
    wAgr += 0.02;
    wClim -= 0.05;
    wFin -= 0.05;
  }

  if (farmer.financialCapacity === 'low_input') {
    wFin += 0.08;
    wClim -= 0.03;
    wGoal -= 0.05;
  }

  if (farmer.culturalPractice === 'mixed_crop_livestock' || farmer.localContext.livestockIntegration === true) {
    wGoal += 0.06;
    wFin -= 0.03;
    wAgr -= 0.03;
  }

  const sum = wAgr + wSoil + wClim + wFin + wGoal;
  return {
    agronomicRotation: Math.round((wAgr / sum) * 1000) / 1000,
    soilHealthRootZone: Math.round((wSoil / sum) * 1000) / 1000,
    climateWater: Math.round((wClim / sum) * 1000) / 1000,
    financialFeasibility: Math.round((wFin / sum) * 1000) / 1000,
    goalCulturalFit: Math.round((1 - (Math.round((wAgr / sum) * 1000) + Math.round((wSoil / sum) * 1000) + Math.round((wClim / sum) * 1000) + Math.round((wFin / sum) * 1000)) / 1000) * 1000) / 1000,
  };
}

function assessCandidateWater(
  candidate: GlobalRotationCropProfile,
  climate: ExtractedClimateIndicators,
  waterCap: FarmerContextProfile['waterAndTechCapacity'],
  efficiencyDecimal: number
): RotationWaterAssessment {
  if (!climate.hasSufficientData || climate.et0MeanMmDay === null || climate.observedRainfallMm === null) {
    return {
      status: 'insufficient_data',
      seasonalCoverageStatus: 'insufficient_data',
      et0MeanMmDay: climate.et0MeanMmDay,
      observedWindowDays: climate.observedWindowDays,
      observedRainfallMm: climate.observedRainfallMm,
      rainfallAnomalyPercent: climate.rainfallAnomalyPercent,
      estimatedEffectiveRainfallWindowMm: null,
      estimatedCropEtcWindowMm: null,
      estimatedSeasonEtcMm: null,
      estimatedWaterDeficitWindowMm: null,
      notesEn: 'Insufficient observed ET0 or precipitation data to evaluate water suitability.',
      notesAr: 'البيانات المرصودة للتبخر-نتح والأمطار غير كافية لتقييم الملاءمة المائية.',
      notesFr: 'Données ET0 ou pluviométriques insuffisantes pour évaluer l\'adéquation hydrique.',
    };
  }

  // Distinguish ET0 vs Kc * ET0 clearly
  const estimatedCropEtcWindowMm = round1(
    climate.et0MeanMmDay * candidate.seasonalMeanKc * climate.observedWindowDays
  );
  const midSeasonDays = Math.round(
    (candidate.totalSeasonDaysRange[0] + candidate.totalSeasonDaysRange[1]) / 2
  );
  const estimatedSeasonEtcMm = round1(climate.et0MeanMmDay * candidate.seasonalMeanKc * midSeasonDays);

  const peffWindow = climate.estimatedEffectiveRainWindowMm ?? 0;

  // Water deficit = Crop water requirement - Effective rainfall - Available irrigation
  // For rainfed_only or unspecified irrigation capacity, assume 0 supplemental irrigation!
  let availableIrrWindowMm = 0;
  if (waterCap === 'modern_irrigation') {
    // Even modern irrigation cannot erase extreme macro-scarcity; credit up to efficiency-adjusted supplemental cover, never 100% blind exemption
    availableIrrWindowMm = round1(Math.max(0, estimatedCropEtcWindowMm - peffWindow) * 0.75 * efficiencyDecimal);
  } else if (waterCap === 'limited_irrigation') {
    availableIrrWindowMm = round1(Math.max(0, estimatedCropEtcWindowMm - peffWindow) * 0.40 * efficiencyDecimal);
  }

  const netNeedAfterPeff = round1(Math.max(0, estimatedCropEtcWindowMm - peffWindow));
  const residualDeficitAfterCap = round1(Math.max(0, netNeedAfterPeff - availableIrrWindowMm));

  let status: RotationWaterAssessment['status'] = 'adequate';
  if (waterCap === 'rainfed_only' || waterCap === null) {
    if (netNeedAfterPeff > estimatedCropEtcWindowMm * 0.65) {
      status = 'high_deficit_risk';
    } else if (netNeedAfterPeff > estimatedCropEtcWindowMm * 0.30) {
      status = 'deficit_risk';
    }
  } else if (waterCap === 'limited_irrigation') {
    if (candidate.climateSuitability.relativeWaterDemandClass === 'high' && netNeedAfterPeff > 65) {
      status = 'high_deficit_risk';
    } else if (residualDeficitAfterCap > 25) {
      status = 'deficit_risk';
    }
  } else {
    // Modern irrigation still faces risk if regional anomaly is strongly negative or crop is high-demand under arid deficit
    if (
      candidate.climateSuitability.relativeWaterDemandClass === 'high' &&
      (climate.rainfallAnomalyPercent !== null && climate.rainfallAnomalyPercent < -25)
    ) {
      status = 'deficit_risk';
    }
  }

  const negAnomTxt =
    climate.rainfallAnomalyPercent !== null && climate.rainfallAnomalyPercent < -15
      ? ` Negative rainfall anomaly (${climate.rainfallAnomalyPercent}%) increases drought sensitivity.`
      : '';

  return {
    status,
    seasonalCoverageStatus: 'preliminary_short_window',
    et0MeanMmDay: climate.et0MeanMmDay,
    observedWindowDays: climate.observedWindowDays,
    observedRainfallMm: climate.observedRainfallMm,
    rainfallAnomalyPercent: climate.rainfallAnomalyPercent,
    estimatedEffectiveRainfallWindowMm: peffWindow,
    estimatedCropEtcWindowMm,
    estimatedSeasonEtcMm,
    estimatedWaterDeficitWindowMm: waterCap === 'rainfed_only' || waterCap === null ? netNeedAfterPeff : residualDeficitAfterCap,
    notesEn: `Preliminary climate check (${climate.observedWindowDays}-day NASA POWER window): ET0=${climate.et0MeanMmDay} mm/d, seasonal mean Kc=${candidate.seasonalMeanKc} → est. Kc×ET0=${estimatedCropEtcWindowMm} mm vs Peff=${peffWindow} mm.${negAnomTxt}`,
    notesAr: `تقييم مناخي أولي (نافذة ${climate.observedWindowDays} يوماً من NASA POWER): التبخر المرجعي ET0=${climate.et0MeanMmDay} مم/يوم، متوسط Kc=${candidate.seasonalMeanKc} ← احتياج تقديري=${estimatedCropEtcWindowMm} مم مقابل مطر فعال=${peffWindow} مم.`,
    notesFr: `Évaluation climatique préliminaire (fenêtre ${climate.observedWindowDays} j NASA POWER) : ET0=${climate.et0MeanMmDay} mm/j, Kc moyen=${candidate.seasonalMeanKc} → demande estimée=${estimatedCropEtcWindowMm} mm vs Peff=${peffWindow} mm.`,
  };
}

function isFamiliarCropMatch(candidate: GlobalRotationCropProfile, list: string[]): boolean {
  if (!list || list.length === 0) return false;
  const hay = [
    candidate.id,
    candidate.commonNameEn,
    candidate.commonNameFr,
    candidate.commonNameAr,
    candidate.scientificName,
  ].map((s) => s.toLowerCase());
  return list.some((entry) => {
    const q = entry.trim().toLowerCase();
    if (!q) return false;
    return hay.some((h) => h.includes(q) || q.includes(h));
  });
}

export function generateCropRotationAdvice(
  input: CropRotationAdvisorInput
): GlobalCropRotationAdviceResult {
  const nowIso = new Date().toISOString();
  const currentCrop = input.currentCropId ? getGlobalRotationCropById(input.currentCropId) : null;
  const previousCrop = input.previousCropId ? getGlobalRotationCropById(input.previousCropId) : null;
  const residueMgmt: CropResidueManagement = input.previousCropResidue || 'unknown';

  const soilInfo = extractSoilIndicators(input.soil);
  const climateInfo = extractClimateIndicators(input.climate, input.soil.curveNumber ?? 78);

  const isProvisionalHistory = !previousCrop;
  const isPreliminaryClimate = climateInfo.observedWindowDays < 90;

  // Collect global missing evidence & warnings
  const globalMissing: string[] = [...climateInfo.missingItems];
  if (!currentCrop) {
    globalMissing.push('Active/current parcel crop selection');
  }
  if (!previousCrop) {
    globalMissing.push('Previous season crop history (recommendations marked provisional)');
  }
  if (soilInfo.thetaFc === null || soilInfo.thetaWp === null) {
    globalMissing.push('Soil hydraulic properties (θFC, θWP)');
  }
  if (soilInfo.socPct === null) {
    globalMissing.push('Soil Organic Carbon (SOC %) measurement');
  }
  if (input.farmerContext.financialCapacity === null) {
    globalMissing.push('Farmer financial capacity');
  }
  if (input.farmerContext.waterAndTechCapacity === null) {
    globalMissing.push('Water & irrigation infrastructure capacity');
  }
  if (!input.farmerContext.localContext.countryOrRegion && !input.verifiedRegionLabel) {
    globalMissing.push('Local country or agricultural region context');
  }

  // Family-level rotation warnings (check current -> previous crop sequence as well as upcoming Solanaceae constraints)
  const familyWarningsEn: string[] = [];
  const familyWarningsAr: string[] = [];
  const familyWarningsFr: string[] = [];

  if (
    currentCrop &&
    previousCrop &&
    currentCrop.family === 'Solanaceae' &&
    previousCrop.family === 'Solanaceae'
  ) {
    familyWarningsEn.push(
      `Solanaceae disease warning: ${previousCrop.commonNameEn} followed by ${currentCrop.commonNameEn} repeats host crops within Solanaceae (Verticillium, Fusarium, Phytophthora, Meloidogyne; minimum 3–4 year break recommended).`
    );
    familyWarningsAr.push(
      `تحذير عائلة الباذنجانيات: تعاقب ${previousCrop.commonNameAr} ثم ${currentCrop.commonNameAr} يرفع خطر أمراض الذبول والندوة المتأخرة والنيماتودا (يلزم فاصل 3–4 سنوات).`
    );
    familyWarningsFr.push(
      `Alerte Solanacées : la succession ${previousCrop.commonNameFr} → ${currentCrop.commonNameFr} expose aux pathogènes communs (Verticillium, mildiou, nématodes ; pause 3–4 ans).`
    );
  } else if (currentCrop?.family === 'Solanaceae') {
    familyWarningsEn.push(
      `Solanaceae break rule active: crops sharing Solanaceae with ${currentCrop.commonNameEn} (e.g., Tomato ↔ Potato) are excluded to prevent soilborne wilt, blight, and nematode buildup.`
    );
    familyWarningsAr.push(
      `قاعدة كسر أمراض الباذنجانيات مفعّلة: يتم استبعاد المحاصيل من نفس العائلة مع ${currentCrop.commonNameAr} (مثل الطماطم ↔ البطاطس) لتفادي تراكم الذبول والنيماتودا.`
    );
    familyWarningsFr.push(
      `Règle de coupure Solanacées active : les cultures de la même famille que ${currentCrop.commonNameFr} (Tomate ↔ Pomme de terre) sont exclues.`
    );
  }

  // Build global Evidence Distinction summary
  const evidenceSummary: RotationEvidenceDistinction = {
    measuredOrRetrieved: [
      ...(climateInfo.et0MeanMmDay !== null
        ? [`NASA POWER / meteorological observations (${climateInfo.observedWindowDays}d window ending ${climateInfo.observationEndDate || 'N/A'})`]
        : []),
      ...(climateInfo.observedRainfallMm !== null
        ? [`Observed rainfall accumulation: ${climateInfo.observedRainfallMm} mm`]
        : []),
      ...(climateInfo.rainfallAnomalyPercent !== null
        ? [`NASA 30-year precipitation anomaly: ${climateInfo.rainfallAnomalyPercent}%`]
        : []),
      ...(soilInfo.clayPct !== null && soilInfo.sandPct !== null
        ? [`${soilInfo.sourceLabel}: Clay ${soilInfo.clayPct}%, Sand ${soilInfo.sandPct}%${soilInfo.socPct !== null ? `, SOC ${soilInfo.socPct}%` : ''}`]
        : soilInfo.thetaFc !== null
        ? [`${soilInfo.sourceLabel}: θFC=${soilInfo.thetaFc}, θWP=${soilInfo.thetaWp} m³/m³`]
        : []),
    ],
    calculatedIndicators: [
      ...(climateInfo.et0MeanMmDay !== null ? [`Mean reference ET0 = ${climateInfo.et0MeanMmDay} mm/day (FAO-56 Penman-Monteith)`] : []),
      ...(climateInfo.estimatedEffectiveRainWindowMm !== null ? [`SCS Curve Number effective rainfall (window) = ${climateInfo.estimatedEffectiveRainWindowMm} mm`] : []),
      'Normalized weighted agronomic/soil/water/socio-economic compatibility index (0–100)',
    ],
    agronomicReferences: [
      'FAO Irrigation and Drainage Paper No. 56 (Tables 11, 12, 19, 22)',
      'FAO / CIMMYT / ICARDA / CIP Botanical-Family Rotation & Pathogen Break Intervals',
      'Herridge et al. (2008) / Peoples et al. (2009) Biological Nitrogen Fixation Ranges',
    ],
    contextualAssumptions: [
      '30-day meteorological window used as a preliminary proxy where full-season climate forecasts are unavailable.',
      ...(input.farmerContext.localContext.season !== 'unspecified'
        ? [`Target season: ${input.farmerContext.localContext.season}`]
        : ['Target planting season unspecified; year-round suitability screened conservatively']),
      ...(input.farmerContext.waterAndTechCapacity === null
        ? ['Water access not specified; supplemental irrigation assumed unavailable (0 mm) for safety']
        : []),
    ],
    missingOrUnavailable: Array.from(new Set(globalMissing)),
  };

  // Critical Gate: Never generate recommendations if essential evidence is missing
  if (
    !currentCrop ||
    !climateInfo.hasSufficientData ||
    soilInfo.thetaFc === null ||
    soilInfo.thetaWp === null
  ) {
    const missingListText = evidenceSummary.missingOrUnavailable.join('; ');
    return {
      generatedAt: nowIso,
      status: 'INSUFFICIENT_DATA',
      confidence: 'INSUFFICIENT_DATA',
      isProvisionalHistory,
      isPreliminaryClimate,
      currentCropId: input.currentCropId,
      previousCropId: input.previousCropId || '',
      recommendations: [],
      excludedCandidates: [],
      rotationFamilyWarningsEn: familyWarningsEn,
      rotationFamilyWarningsAr: familyWarningsAr,
      rotationFamilyWarningsFr: familyWarningsFr,
      missingInformation: evidenceSummary.missingOrUnavailable,
      evidenceSummary,
      emptyOrBlockedReasonEn: `Cannot generate reliable rotation recommendations without essential evidence: ${missingListText}.`,
      emptyOrBlockedReasonAr: `لا يمكن إصدار توصيات علمية للدورة الزراعية لغياب بيانات أساسية: ${missingListText}.`,
      emptyOrBlockedReasonFr: `Impossible de générer une recommandation fiable sans données essentielles : ${missingListText}.`,
      referenceSources: evidenceSummary.agronomicReferences,
    };
  }

  // Evaluate Hard Exclusions & Score Eligible Candidates
  const weights = getNormalizedWeights(input.farmerContext);
  const excludedCandidates: ExcludedRotationCandidate[] = [];
  const scoredCandidates: CropRotationCandidateResult[] = [];

  const rainMm = climateInfo.observedRainfallMm ?? 0;
  const et0Mean = climateInfo.et0MeanMmDay ?? 3;
  const windowEt0Total = Math.max(1, et0Mean * Math.max(1, climateInfo.observedWindowDays));
  const rainToEt0Ratio = rainMm / windowEt0Total;
  const isAridOrLowRainfall = rainMm < 35 || rainToEt0Ratio < 0.35;
  const isExtremeDesertRainfed = rainMm < 10 && et0Mean >= 4.0 && rainToEt0Ratio < 0.08;

  for (const candidate of GLOBAL_ROTATION_CROP_DATABASE) {
    const exclusionCodes: string[] = [];
    const reasonsEn: string[] = [];
    const reasonsAr: string[] = [];
    const reasonsFr: string[] = [];

    // Exclusion 1: Same annual crop directly back-to-back
    if (!candidate.isPerennial && candidate.id === currentCrop.id) {
      exclusionCodes.push('SAME_CROP_MONOCULTURE');
      reasonsEn.push(`Immediate monoculture of ${candidate.commonNameEn} increases host-specific pests and soilborne diseases.`);
      reasonsAr.push(`تكرار زراعة ${candidate.commonNameAr} مباشرة يرفع خطر الآفات والأمراض المتخصصة.`);
      reasonsFr.push(`La monoculture immédiate de ${candidate.commonNameFr} accroît la pression parasitaire.`);
    }

    // Exclusion 2: Consecutive Solanaceae (Tomato <-> Potato)
    if (
      candidate.family === 'Solanaceae' &&
      (currentCrop.family === 'Solanaceae' || previousCrop?.family === 'Solanaceae')
    ) {
      exclusionCodes.push('SOLANACEAE_DISEASE_BREAK');
      reasonsEn.push(candidate.rotationCompatibility.sharedPathogensNoteEn);
      reasonsAr.push(candidate.rotationCompatibility.sharedPathogensNoteAr);
      reasonsFr.push(candidate.rotationCompatibility.sharedPathogensNoteFr);
    }

    // Exclusion 3: Consecutive Alfalfa autotoxicity or perennial tree replant/mismatch
    if (candidate.id === 'alfalfa' && (currentCrop.id === 'alfalfa' || previousCrop?.id === 'alfalfa')) {
      exclusionCodes.push('ALFALFA_AUTOTOXICITY');
      reasonsEn.push(candidate.rotationCompatibility.sharedPathogensNoteEn);
      reasonsAr.push(candidate.rotationCompatibility.sharedPathogensNoteAr);
      reasonsFr.push(candidate.rotationCompatibility.sharedPathogensNoteFr);
    }

    if (candidate.category === 'perennial_tree') {
      if (input.farmerContext.localContext.season !== 'perennial_year_round') {
        exclusionCodes.push('PERENNIAL_ORCHARD_NOT_ANNUAL_ROTATION');
        reasonsEn.push(`${candidate.commonNameEn} is a multi-year perennial orchard, not a seasonal annual rotation crop.`);
        reasonsAr.push(`${candidate.commonNameAr} غرس شجري معمر متعدد السنوات وليس محصول تناوب موسمي.`);
        reasonsFr.push(`${candidate.commonNameFr} est un verger pérenne et non une culture annuelle de rotation.`);
      } else if (candidate.id === currentCrop.id) {
        exclusionCodes.push('PERENNIAL_REPLANT_DISORDER');
        reasonsEn.push(candidate.rotationCompatibility.sharedPathogensNoteEn);
        reasonsAr.push(candidate.rotationCompatibility.sharedPathogensNoteAr);
        reasonsFr.push(candidate.rotationCompatibility.sharedPathogensNoteFr);
      }
    }

    // Exclusion 4: Rainfed-only water restriction in arid / demonstrably low-rainfall climate
    if (input.farmerContext.waterAndTechCapacity === 'rainfed_only') {
      if (isExtremeDesertRainfed) {
        exclusionCodes.push('EXTREME_ARID_NO_RAINFED_VIABILITY');
        reasonsEn.push(
          `Observed rainfall (${rainMm} mm / ${climateInfo.observedWindowDays}d) vs high evaporative demand (ET0=${et0Mean} mm/d) cannot support rainfed cropping.`
        );
        reasonsAr.push(
          `الأمطار المرصودة (${rainMm} مم خلال ${climateInfo.observedWindowDays} يوماً) مع التبخر المرتفع (${et0Mean} مم/يوم) لا تسمح بالزراعة البعلية المستدامة.`
        );
        reasonsFr.push(
          `Pluviométrie (${rainMm} mm / ${climateInfo.observedWindowDays} j) insuffisante face à ET0=${et0Mean} mm/j en régime pluvial strict.`
        );
      } else if (
        isAridOrLowRainfall &&
        (candidate.climateSuitability.relativeWaterDemandClass === 'high' ||
          (candidate.climateSuitability.relativeWaterDemandClass === 'moderate' && rainMm < 20))
      ) {
        exclusionCodes.push('RAINFED_ARID_WATER_DEFICIT');
        reasonsEn.push(
          `Rainfed-only system with low observed rainfall (${rainMm} mm / ${climateInfo.observedWindowDays}d, ET0=${et0Mean} mm/d) cannot safely meet ${candidate.commonNameEn}'s high water demand.`
        );
        reasonsAr.push(
          `النظام البعلي مع شح الأمطار (${rainMm} مم، ET0=${et0Mean} مم/يوم) لا يغطي الاحتياج المائي المرتفع لمحصول ${candidate.commonNameAr}.`
        );
        reasonsFr.push(
          `En agriculture strictement pluviale sous faible pluviométrie (${rainMm} mm), les besoins hydriques élevés de ${candidate.commonNameFr} ne sont pas couverts.`
        );
      }
    }

    // Exclusion 5: Low-input financial restriction against capital/input-heavy crops
    if (
      input.farmerContext.financialCapacity === 'low_input' &&
      candidate.socioEconomicProfile.inputRequirement === 'high'
    ) {
      exclusionCodes.push('HIGH_INPUT_FINANCIAL_BARRIER');
      reasonsEn.push(
        `${candidate.commonNameEn} requires high external input/seed/protection capital unsuitable for low-input constraints.`
      );
      reasonsAr.push(
        `يتطلب محصول ${candidate.commonNameAr} تكلفة مرتفعة للبذور والمدخلات تفوق القدرة المالية محدودة المدخلات.`
      );
      reasonsFr.push(
        `${candidate.commonNameFr} exige des investissements élevés en intrants incompatibles avec un budget à faibles intrants.`
      );
    }

    // Exclusion 6: Severe observed frost/heat stress mismatch when season is unspecified or matches current window
    const targetSeason = input.farmerContext.localContext.season;
    if (
      targetSeason === 'unspecified' &&
      climateInfo.tMinObservedC !== null &&
      candidate.climateSuitability.frostSensitiveBelowC !== null &&
      climateInfo.tMinObservedC < candidate.climateSuitability.frostSensitiveBelowC - 2
    ) {
      exclusionCodes.push('THERMAL_FROST_MISMATCH');
      reasonsEn.push(
        `Observed minimum temperature (${climateInfo.tMinObservedC}°C) is below frost threshold (${candidate.climateSuitability.frostSensitiveBelowC}°C).`
      );
      reasonsAr.push(
        `درجة الحرارة الدنيا المرصودة (${climateInfo.tMinObservedC}°م) أقل من حد تحمل الصقيع للمحصول.`
      );
      reasonsFr.push(
        `Température minimale observée (${climateInfo.tMinObservedC}°C) inférieure au seuil de tolérance au gel.`
      );
    }

    // Exclusion 7: Season alignment if explicitly chosen by farmer
    if (
      targetSeason !== 'unspecified' &&
      !candidate.climateSuitability.suitableSeasons.includes(targetSeason)
    ) {
      exclusionCodes.push('SEASON_MISMATCH');
      reasonsEn.push(
        `${candidate.commonNameEn} is normally not planted for the selected '${targetSeason}' growing window.`
      );
      reasonsAr.push(`محصول ${candidate.commonNameAr} غير ملائم عادة لموسم النمو المحدد (${targetSeason}).`);
      reasonsFr.push(`${candidate.commonNameFr} n'est généralement pas adapté à la saison sélectionnée (${targetSeason}).`);
    }

    if (exclusionCodes.length > 0) {
      excludedCandidates.push({
        cropId: candidate.id,
        commonNameEn: candidate.commonNameEn,
        commonNameAr: candidate.commonNameAr,
        commonNameFr: candidate.commonNameFr,
        scientificName: candidate.scientificName,
        family: candidate.family,
        exclusionCodes,
        reasonEn: reasonsEn.join(' '),
        reasonAr: reasonsAr.join(' '),
        reasonFr: reasonsFr.join(' '),
      });
      continue;
    }

    // -------------------------------------------------------------------------
    // SCORE ELIGIBLE CANDIDATE ACROSS 5 WEIGHTED DIMENSIONS
    // -------------------------------------------------------------------------
    const waterAssessment = assessCandidateWater(
      candidate,
      climateInfo,
      input.farmerContext.waterAndTechCapacity,
      0.85
    );

    // A. Agronomic Rotation Compatibility (0-100)
    let agrScore = 62;
    const isGoodPredecessor = candidate.rotationCompatibility.goodPredecessors.includes(currentCrop.family);
    const sameFamilyAsCurrent = candidate.family === currentCrop.family;
    const sameFamilyAsPrevious = previousCrop ? candidate.family === previousCrop.family : false;

    if (sameFamilyAsCurrent) {
      agrScore -= 28; // e.g., wheat -> barley same Poaceae family
    } else if (isGoodPredecessor) {
      agrScore += 22;
    }

    if (sameFamilyAsPrevious && candidate.rotationCompatibility.avoidSameFamilyConsecutive) {
      agrScore -= 16;
    }

    // Functional sequence bonuses
    if (currentCrop.family === 'Poaceae' && candidate.family === 'Fabaceae') {
      agrScore += 14; // Cereal -> Legume breaks grass disease & adds functional N cycling
    } else if (currentCrop.family === 'Fabaceae' && candidate.family === 'Poaceae') {
      if (residueMgmt === 'incorporated' || residueMgmt === 'grazed') {
        agrScore += 14;
      } else if (residueMgmt === 'removed') {
        agrScore += 4; // Modest benefit only if legume residues were exported
      } else {
        agrScore += 8;
      }
    }

    agrScore = clamp01to100(agrScore);

    // B. Soil Health & Root-Zone Complementarity (0-100)
    let soilScore = 60;
    const zrDiff = Math.abs(candidate.coefficients.rootDepthMaxM - currentCrop.coefficients.rootDepthMaxM);
    if (zrDiff >= 0.45) {
      soilScore += 15; // Contrasting exploration zones (deep vs shallow/moderate)
    } else if (zrDiff >= 0.20) {
      soilScore += 8;
    }

    if (candidate.nitrogenFixation.capable) {
      soilScore += soilInfo.socPct !== null && soilInfo.socPct < 1.2 ? 18 : 12;
    }
    if (candidate.category === 'forage_legume') {
      soilScore += 10; // Perennial cover & deep roots
    }

    if (
      soilInfo.clayPct !== null &&
      candidate.soilSuitability.heavyClayPenaltyThresholdPct !== null &&
      soilInfo.clayPct >= candidate.soilSuitability.heavyClayPenaltyThresholdPct
    ) {
      soilScore -= 24;
    }
    if (
      soilInfo.sandPct !== null &&
      candidate.soilSuitability.coarseSandPenaltyThresholdPct !== null &&
      soilInfo.sandPct >= candidate.soilSuitability.coarseSandPenaltyThresholdPct
    ) {
      soilScore -= 18;
    }
    if (
      soilInfo.awcMmPerM !== null &&
      soilInfo.awcMmPerM < 90 &&
      candidate.rootCharacteristics.depthClass === 'shallow'
    ) {
      soilScore -= 14;
    }

    soilScore = clamp01to100(soilScore);

    // C. Climate & Water Suitability (0-100)
    let climScore = 65;
    if (waterAssessment.status === 'adequate') {
      climScore = 88;
    } else if (waterAssessment.status === 'deficit_risk') {
      climScore = 60;
    } else if (waterAssessment.status === 'high_deficit_risk') {
      climScore = 32;
    }

    if (climateInfo.rainfallAnomalyPercent !== null && climateInfo.rainfallAnomalyPercent < -15) {
      climScore -= candidate.climateSuitability.relativeWaterDemandClass === 'high' ? 14 : 6;
    }

    if (climateInfo.tMeanAvgC !== null) {
      const [optMin, optMax] = candidate.climateSuitability.optimalMeanTempRangeC;
      if (climateInfo.tMeanAvgC >= optMin && climateInfo.tMeanAvgC <= optMax) {
        climScore += 8;
      } else {
        climScore -= 10;
      }
    }

    if (
      climateInfo.tMaxObservedC !== null &&
      candidate.climateSuitability.heatStressAboveC !== null &&
      climateInfo.tMaxObservedC > candidate.climateSuitability.heatStressAboveC
    ) {
      climScore -= 12;
    }

    climScore = clamp01to100(climScore);

    // D. Financial Feasibility (0-100)
    let finScore = 65;
    const finCap = input.farmerContext.financialCapacity;
    const req = candidate.socioEconomicProfile.inputRequirement;
    if (finCap === 'low_input') {
      finScore = req === 'low' ? 92 : req === 'moderate' ? 56 : 20;
    } else if (finCap === 'moderate') {
      finScore = req === 'low' ? 84 : req === 'moderate' ? 86 : 52;
    } else if (finCap === 'high_investment') {
      finScore = req === 'high' ? 86 : req === 'moderate' ? 84 : 74;
    } else {
      // Unspecified financial capacity -> conservative neutral preference for lower financial risk
      finScore = req === 'low' ? 72 : req === 'moderate' ? 62 : 44;
    }
    finScore = clamp01to100(finScore);

    // E. Farmer Goals & Cultural Compatibility (0-100)
    let goalScore = 60;
    const goal = input.farmerContext.primaryGoal;
    const culture = input.farmerContext.culturalPractice;
    const wantsLivestock =
      culture === 'mixed_crop_livestock' || input.farmerContext.localContext.livestockIntegration === true;

    if (goal === 'food_security') {
      goalScore += candidate.socioEconomicProfile.stapleFoodValue ? 24 : -10;
      if (candidate.category === 'forage_legume') goalScore -= 12;
    } else if (goal === 'soil_regeneration') {
      if (candidate.nitrogenFixation.capable) goalScore += 18;
      if (candidate.category === 'forage_legume') goalScore += 14;
      if (candidate.socioEconomicProfile.forageAndResidueValue.hasUsefulCropResidue) goalScore += 6;
      if (candidate.category === 'tuber_crop' || candidate.category === 'bulb_vegetable') goalScore -= 15;
    } else if (goal === 'water_conservation') {
      if (candidate.climateSuitability.relativeWaterDemandClass === 'low_moderate') goalScore += 24;
      else if (candidate.climateSuitability.relativeWaterDemandClass === 'moderate') goalScore += 8;
      else goalScore -= 22;
    } else if (goal === 'commercial_profit') {
      // Never invent prices; evaluate commercial orientation modestly and note market data unverified
      goalScore += candidate.socioEconomicProfile.commercialMarketChannelDependent ? 12 : 6;
    }

    if (wantsLivestock) {
      if (candidate.socioEconomicProfile.forageAndResidueValue.isDedicatedForage) {
        goalScore += waterAssessment.status === 'high_deficit_risk' ? 6 : 26;
      } else if (candidate.socioEconomicProfile.forageAndResidueValue.hasUsefulCropResidue) {
        goalScore += 14;
      } else {
        goalScore -= 14;
      }
    }

    const isFamiliar = isFamiliarCropMatch(candidate, input.farmerContext.localContext.familiarCrops);
    const isLocallyAvailable = isFamiliarCropMatch(
      candidate,
      input.farmerContext.localContext.locallyAvailableCrops
    );

    if (culture === 'traditional_heritage') {
      if (isFamiliar) goalScore += 18;
      else if (candidate.socioEconomicProfile.stapleFoodValue || candidate.id === 'chickpea' || candidate.id === 'wheat' || candidate.id === 'barley') {
        goalScore += 6;
      } else {
        goalScore -= 10;
      }
    } else if (culture === 'open_to_diversification') {
      if (candidate.family !== currentCrop.family) goalScore += 10;
    }

    if (isLocallyAvailable) goalScore += 8;
    goalScore = clamp01to100(goalScore);

    // Weighted Score (deterministic, 0-100 compatibility index)
    const compatibilityScore = Math.round(
      agrScore * weights.agronomicRotation +
        soilScore * weights.soilHealthRootZone +
        climScore * weights.climateWater +
        finScore * weights.financialFeasibility +
        goalScore * weights.goalCulturalFit
    );

    // Candidate Missing Information & Confidence Calibration
    const candidateMissing = [...evidenceSummary.missingOrUnavailable];
    if (goal === 'commercial_profit' || candidate.socioEconomicProfile.commercialMarketChannelDependent) {
      candidateMissing.push('Verified regional market price & buyer channel data');
    }
    if (candidate.nitrogenFixation.requiresInoculationCheck) {
      candidateMissing.push('Field-level Rhizobium nodulation / soil N mineral baseline');
    }

    const uniqueCandidateMissing = Array.from(new Set(candidateMissing));

    // Strict Status Calibration (Section 9: no misleading green 'suitable' badge on uncertain / incomplete cases)
    let status: RotationSuitabilityStatus = 'suitable';
    if (
      isProvisionalHistory ||
      soilInfo.socPct === null ||
      waterAssessment.status !== 'adequate' ||
      input.farmerContext.waterAndTechCapacity === null ||
      input.farmerContext.financialCapacity === null ||
      compatibilityScore < 68
    ) {
      status = 'conditionally_suitable';
    }

    let confidence: IrrigationConfidenceLevel = 'HIGH';
    if (isProvisionalHistory || soilInfo.socPct === null || input.farmerContext.waterAndTechCapacity === null) {
      confidence = 'MEDIUM';
    }
    if (
      (isProvisionalHistory && soilInfo.socPct === null) ||
      waterAssessment.status === 'high_deficit_risk' ||
      input.soil.sourceKind === 'farmer_texture_table19'
    ) {
      confidence = 'LOW';
    }

    // Build Structured Four-Part Explanations
    const {
      whyRecommendedEn,
      whyRecommendedAr,
      whyRecommendedFr,
      soilHealthBenefitEn,
      soilHealthBenefitAr,
      soilHealthBenefitFr,
      waterClimateFitEn,
      waterClimateFitAr,
      waterClimateFitFr,
      socioEconomicFitEn,
      socioEconomicFitAr,
      socioEconomicFitFr,
      agronomicCautionsEn,
      agronomicCautionsAr,
      agronomicCautionsFr,
    } = buildCandidateExplanations({
      candidate,
      currentCrop,
      previousCrop,
      residueMgmt,
      soilInfo,
      climateInfo,
      waterAssessment,
      farmerContext: input.farmerContext,
      verifiedRegionLabel: input.verifiedRegionLabel,
      isProvisionalHistory,
      sameFamilyAsCurrent,
      sameFamilyAsPrevious,
      isFamiliar,
      isLocallyAvailable,
    });

    const referenceSources = [
      candidate.sources.fao56KcAndStages,
      candidate.sources.fao56RootAndDepletion,
      candidate.sources.rotationAndAgronomy,
      ...(candidate.nitrogenFixation.source ? [candidate.nitrogenFixation.source] : []),
      `Soil source: ${soilInfo.sourceLabel}`,
      'Climate source: NASA POWER (MERRA-2 / GEOS-FP)',
    ];

    scoredCandidates.push({
      cropId: candidate.id,
      commonNameEn: candidate.commonNameEn,
      commonNameAr: candidate.commonNameAr,
      commonNameFr: candidate.commonNameFr,
      scientificName: candidate.scientificName,
      family: candidate.family,
      category: candidate.category,
      status,
      compatibilityScore,
      scoreBreakdown: {
        agronomicRotation: agrScore,
        soilHealthRootZone: soilScore,
        climateWater: climScore,
        financialFeasibility: finScore,
        goalCulturalFit: goalScore,
        weights,
      },
      waterAssessment,
      whyRecommendedEn,
      whyRecommendedAr,
      whyRecommendedFr,
      soilHealthBenefitEn,
      soilHealthBenefitAr,
      soilHealthBenefitFr,
      waterClimateFitEn,
      waterClimateFitAr,
      waterClimateFitFr,
      socioEconomicFitEn,
      socioEconomicFitAr,
      socioEconomicFitFr,
      agronomicCautionsEn,
      agronomicCautionsAr,
      agronomicCautionsFr,
      confidence,
      missingInformation: uniqueCandidateMissing,
      referenceSources: Array.from(new Set(referenceSources)),
      evidenceDistinction: {
        measuredOrRetrieved: evidenceSummary.measuredOrRetrieved,
        calculatedIndicators: [
          `Compatibility Index: ${compatibilityScore}/100 (weighted model, not probability of success)`,
          `Window Kc×ET0 = ${waterAssessment.estimatedCropEtcWindowMm ?? 'N/A'} mm vs Peff = ${waterAssessment.estimatedEffectiveRainfallWindowMm ?? 'N/A'} mm`,
          `Root depth shift: ${currentCrop.coefficients.rootDepthMaxM} m → ${candidate.coefficients.rootDepthMaxM} m`,
        ],
        agronomicReferences: [
          candidate.sources.fao56KcAndStages,
          candidate.sources.fao56RootAndDepletion,
          candidate.sources.rotationAndAgronomy,
        ],
        contextualAssumptions: evidenceSummary.contextualAssumptions,
        missingOrUnavailable: uniqueCandidateMissing,
      },
    });
  }

  // Deterministic Sort: Highest compatibilityScore first, tie-break cleanly by cropId ascending
  scoredCandidates.sort((a, b) => {
    const sDiff = (b.compatibilityScore ?? 0) - (a.compatibilityScore ?? 0);
    if (sDiff !== 0) return sDiff;
    return a.cropId.localeCompare(b.cropId);
  });

  // Return max 3 candidates (Section 6)
  const topRecommendations = scoredCandidates.slice(0, 3);

  if (topRecommendations.length === 0) {
    return {
      generatedAt: nowIso,
      status: 'NO_ELIGIBLE_RECOMMENDATION',
      confidence: isProvisionalHistory ? 'LOW' : 'MEDIUM',
      isProvisionalHistory,
      isPreliminaryClimate,
      currentCropId: input.currentCropId,
      previousCropId: input.previousCropId || '',
      recommendations: [],
      excludedCandidates,
      rotationFamilyWarningsEn: familyWarningsEn,
      rotationFamilyWarningsAr: familyWarningsAr,
      rotationFamilyWarningsFr: familyWarningsFr,
      missingInformation: evidenceSummary.missingOrUnavailable,
      evidenceSummary,
      emptyOrBlockedReasonEn:
        'No candidate crop satisfied all agronomic, water-availability, and socio-economic safety constraints under the current parcel conditions.',
      emptyOrBlockedReasonAr:
        'لم يستوفِ أي محصول مرشح جميع قيود السلامة الزراعية والمائية والاجتماعية-الاقتصادية في ظل ظروف القطعة الحالية.',
      emptyOrBlockedReasonFr:
        'Aucune culture candidate ne satisfait simultanément les contraintes agronomiques, hydriques et socio-économiques pour cette parcelle.',
      referenceSources: evidenceSummary.agronomicReferences,
    };
  }

  const overallConfidence: IrrigationConfidenceLevel = topRecommendations.some((r) => r.confidence === 'HIGH')
    ? 'HIGH'
    : topRecommendations.some((r) => r.confidence === 'MEDIUM')
    ? 'MEDIUM'
    : 'LOW';

  return {
    generatedAt: nowIso,
    status: 'RECOMMENDATIONS_READY',
    confidence: overallConfidence,
    isProvisionalHistory,
    isPreliminaryClimate,
    currentCropId: input.currentCropId,
    previousCropId: input.previousCropId || '',
    recommendations: topRecommendations,
    excludedCandidates,
    rotationFamilyWarningsEn: familyWarningsEn,
    rotationFamilyWarningsAr: familyWarningsAr,
    rotationFamilyWarningsFr: familyWarningsFr,
    missingInformation: evidenceSummary.missingOrUnavailable,
    evidenceSummary,
    emptyOrBlockedReasonEn: null,
    emptyOrBlockedReasonAr: null,
    emptyOrBlockedReasonFr: null,
    referenceSources: Array.from(
      new Set(topRecommendations.flatMap((r) => r.referenceSources))
    ),
  };
}

function buildCandidateExplanations(args: {
  candidate: GlobalRotationCropProfile;
  currentCrop: GlobalRotationCropProfile;
  previousCrop: GlobalRotationCropProfile | null;
  residueMgmt: CropResidueManagement;
  soilInfo: ExtractedSoilIndicators;
  climateInfo: ExtractedClimateIndicators;
  waterAssessment: RotationWaterAssessment;
  farmerContext: FarmerContextProfile;
  verifiedRegionLabel?: string | null;
  isProvisionalHistory: boolean;
  sameFamilyAsCurrent: boolean;
  sameFamilyAsPrevious: boolean;
  isFamiliar: boolean;
  isLocallyAvailable: boolean;
}) {
  const {
    candidate,
    currentCrop,
    previousCrop,
    residueMgmt,
    soilInfo,
    climateInfo,
    waterAssessment,
    farmerContext,
    verifiedRegionLabel,
    isProvisionalHistory,
    sameFamilyAsCurrent,
    sameFamilyAsPrevious,
    isFamiliar,
    isLocallyAvailable,
  } = args;

  const provTagEn = isProvisionalHistory ? ' (Provisional: prior crop history incomplete)' : '';
  const provTagAr = isProvisionalHistory ? ' (استرشادي أولي: سجل المحصول السابق غير مكتمل)' : '';
  const provTagFr = isProvisionalHistory ? ' (Provisoire : historique cultural incomplet)' : '';

  // Why Recommended
  const whyRecommendedEn =
    `${candidate.commonNameEn} (${candidate.family}) provides ${
      sameFamilyAsCurrent ? 'a short-cycle cereal option within Poaceae' : `a botanical family break from ${currentCrop.commonNameEn} (${currentCrop.family})`
    } aligned with observed ET0=${climateInfo.et0MeanMmDay} mm/d and your parcel profile.${provTagEn}`;
  const whyRecommendedAr =
    `يمثل محصول ${candidate.commonNameAr} (${candidate.family}) ${
      sameFamilyAsCurrent ? 'خياراً نجيلياً قصير الدورة' : `تنويعاً نباتياً يكسر دورة ${currentCrop.commonNameAr} (${currentCrop.family})`
    } متوافقاً مع ET0=${climateInfo.et0MeanMmDay} مم/يوم ومعطيات القطعة.${provTagAr}`;
  const whyRecommendedFr =
    `${candidate.commonNameFr} (${candidate.family}) offre ${
      sameFamilyAsCurrent ? 'une céréale à cycle plus court' : `une coupure de famille botanique après ${currentCrop.commonNameFr} (${currentCrop.family})`
    } adaptée à ET0=${climateInfo.et0MeanMmDay} mm/j et au profil parcellaire.${provTagFr}`;

  // A. Soil Health & Root-Zone Benefit
  const zrCur = currentCrop.coefficients.rootDepthMaxM;
  const zrCand = candidate.coefficients.rootDepthMaxM;
  const socTextEn =
    soilInfo.socPct !== null
      ? `SoilGrids topsoil SOC estimate is ${soilInfo.socPct}% (OM ~${soilInfo.omPct}%).`
      : 'Measured Soil Organic Carbon (SOC %) is unavailable for this parcel.';
  const socTextAr =
    soilInfo.socPct !== null
      ? `تقدير الكربون العضوي بالتربة السطحية (SOC) هو ${soilInfo.socPct}%.`
      : 'نسبة الكربون العضوي بالتربة (SOC) غير متوفرة حالياً.';
  const socTextFr =
    soilInfo.socPct !== null
      ? `Carbone organique de surface (SOC SoilGrids) estimé à ${soilInfo.socPct}%.`
      : 'Teneur en carbone organique (SOC) indisponible.';

  const nFixEn = candidate.nitrogenFixation.capable
    ? `Biological N2 fixation potential (${candidate.nitrogenFixation.estimatedRangeKgNPerHa?.[0]}–${candidate.nitrogenFixation.estimatedRangeKgNPerHa?.[1]} kg N/ha) requires effective Rhizobium nodulation and residue retention; it does NOT automatically replace balanced fertilization.`
    : `Non-N-fixing crop; ${candidate.socioEconomicProfile.forageAndResidueValue.hasUsefulCropResidue ? 'retaining residues helps protect surface organic carbon.' : 'offers limited crop residue return.'}`;
  const nFixAr = candidate.nitrogenFixation.capable
    ? `تثبيت النيتروجين الحيوي (${candidate.nitrogenFixation.estimatedRangeKgNPerHa?.[0]}–${candidate.nitrogenFixation.estimatedRangeKgNPerHa?.[1]} كغ/هكتار) مشروط بنجاعة العقد البكتيرية وإبقاء المخلفات ولا يغني تلقائياً عن التسميد.`
    : `محصول غير مثبت للنيتروجين؛ ${candidate.socioEconomicProfile.forageAndResidueValue.hasUsefulCropResidue ? 'إبقاء البقايا يدعم حماية المادة العضوية.' : 'مساهمته في المخلفات محدودة.'}`;
  const nFixFr = candidate.nitrogenFixation.capable
    ? `La fixation symbiotique (${candidate.nitrogenFixation.estimatedRangeKgNPerHa?.[0]}–${candidate.nitrogenFixation.estimatedRangeKgNPerHa?.[1]} kg N/ha) dépend de la nodulation et du maintien des résidus ; elle ne supprime pas les besoins fertilisants.`
    : `Culture non fixatrice ; ${candidate.socioEconomicProfile.forageAndResidueValue.hasUsefulCropResidue ? 'la restitution des résidus préserve le carbone.' : 'faible restitution de biomasse.'}`;

  const soilHealthBenefitEn =
    `Rooting depth Zr transitions from ${zrCur.toFixed(2)} m (${currentCrop.commonNameEn}) to ${zrCand.toFixed(2)} m (${candidate.rootCharacteristics.rootType}), altering soil moisture/nutrient extraction zones (differing root depths alone do not automatically restore fertility). ${socTextEn} ${nFixEn}`;
  const soilHealthBenefitAr =
    `يتغير عمق الجذور الأقصى Zr من ${zrCur.toFixed(2)} م (${currentCrop.commonNameAr}) إلى ${zrCand.toFixed(2)} م (${candidate.rootCharacteristics.notesAr})، مما ينوع نطاق امتصاص الماء دون أن يضمن استعادة الخصوبة تلقائياً. ${socTextAr} ${nFixAr}`;
  const soilHealthBenefitFr =
    `Profondeur racinaire Zr : passage de ${zrCur.toFixed(2)} m (${currentCrop.commonNameFr}) à ${zrCand.toFixed(2)} m (la différence d'enracinement seule ne restaure pas automatiquement la fertilité). ${socTextFr} ${nFixFr}`;

  // B. Water & Climate Fit
  const anomEn =
    climateInfo.rainfallAnomalyPercent !== null
      ? `30-year rainfall anomaly is ${climateInfo.rainfallAnomalyPercent >= 0 ? '+' : ''}${climateInfo.rainfallAnomalyPercent}% (one short-term anomaly does not deterministically forecast full-season drought).`
      : 'Historical rainfall anomaly baseline unavailable.';
  const anomAr =
    climateInfo.rainfallAnomalyPercent !== null
      ? `انحراف الأمطار عن المعدل الثلاثيني هو ${climateInfo.rainfallAnomalyPercent}% (لا يُستنتج من انحراف وحيد حدوث جفاف مؤكد طوال الموسم).`
      : 'خط الأساس التاريخي لانحراف الأمطار غير متوفر.';
  const anomFr =
    climateInfo.rainfallAnomalyPercent !== null
      ? `Anomalie pluviométrique : ${climateInfo.rainfallAnomalyPercent}% (une anomalie ponctuelle ne prédit pas à elle seule une sécheresse saisonnière).`
      : 'Référence historique d\'anomalie indisponible.';

  const waterCapLabel = farmerContext.waterAndTechCapacity || 'unspecified (assumed 0 mm irrigation for safety)';
  const waterClimateFitEn =
    `NASA POWER (${climateInfo.observedWindowDays}-day preliminary window): observed rain=${climateInfo.observedRainfallMm} mm, effective rain≈${waterAssessment.estimatedEffectiveRainfallWindowMm} mm, mean reference ET0=${climateInfo.et0MeanMmDay} mm/d (NOT actual crop consumption). With seasonal mean Kc=${candidate.seasonalMeanKc}, estimated Kc×ET0=${waterAssessment.estimatedCropEtcWindowMm} mm over ${climateInfo.observedWindowDays}d (~${waterAssessment.estimatedSeasonEtcMm} mm scaled seasonal indicator). Water capacity: ${waterCapLabel}. ${anomEn}`;
  const waterClimateFitAr =
    `رصد NASA POWER (نافذة أولية ${climateInfo.observedWindowDays} يوماً): الأمطار المرصودة=${climateInfo.observedRainfallMm} مم، الفعالة≈${waterAssessment.estimatedEffectiveRainfallWindowMm} مم، ET0 المرجعي=${climateInfo.et0MeanMmDay} مم/يوم (وليس استهلاك المحصول الفعلي). الاحتياج التقديري (Kc×ET0)=${waterAssessment.estimatedCropEtcWindowMm} مم لهذه النافذة (~${waterAssessment.estimatedSeasonEtcMm} مم كمؤشر موسمي أولي). حالة الري: ${farmerContext.waterAndTechCapacity || 'غير محددة'}. ${anomAr}`;
  const waterClimateFitFr =
    `NASA POWER (fenêtre préliminaire ${climateInfo.observedWindowDays} j) : pluie=${climateInfo.observedRainfallMm} mm, Peff≈${waterAssessment.estimatedEffectiveRainfallWindowMm} mm, ET0=${climateInfo.et0MeanMmDay} mm/j (distinct de la consommation culturale). Estimation Kc×ET0=${waterAssessment.estimatedCropEtcWindowMm} mm (~${waterAssessment.estimatedSeasonEtcMm} mm indicateur saisonnier). Capacité hydrique : ${farmerContext.waterAndTechCapacity || 'non précisée'}. ${anomFr}`;

  // C. Socio-Economic & Cultural Fit
  const marketNoteEn =
    farmerContext.primaryGoal === 'commercial_profit' || candidate.socioEconomicProfile.commercialMarketChannelDependent
      ? 'Regional crop prices and buyer demand are unverified (never estimated or fabricated).'
      : '';
  const marketNoteAr =
    farmerContext.primaryGoal === 'commercial_profit' || candidate.socioEconomicProfile.commercialMarketChannelDependent
      ? 'الأسعار المحلية وطلب السوق غير متحقق منهما إقليمياً (لا تُفترض أي عوائد مالية).'
      : '';
  const marketNoteFr =
    farmerContext.primaryGoal === 'commercial_profit' || candidate.socioEconomicProfile.commercialMarketChannelDependent
      ? 'Prix locaux et débouchés commerciaux non vérifiés.'
      : '';

  const regionLabel = farmerContext.localContext.countryOrRegion || verifiedRegionLabel || 'Unspecified region';
  const socioEconomicFitEn =
    `Input demand: ${candidate.socioEconomicProfile.inputRequirement} vs farmer capacity (${farmerContext.financialCapacity || 'unspecified'}). Goal (${farmerContext.primaryGoal || 'unspecified'}) & practice (${farmerContext.culturalPractice || 'unspecified'}). Context: ${regionLabel}${isFamiliar ? '; familiar crop match' : ''}${isLocallyAvailable ? '; confirmed locally available' : ''}. ${candidate.socioEconomicProfile.forageAndResidueValue.notesEn} ${marketNoteEn}`.trim();
  const socioEconomicFitAr =
    `مستوى المدخلات: ${candidate.socioEconomicProfile.inputRequirement} مقابل قدرة الفلاح (${farmerContext.financialCapacity || 'غير محددة'}). الهدف (${farmerContext.primaryGoal || 'غير محدد'}). السياق: ${regionLabel}. ${candidate.socioEconomicProfile.forageAndResidueValue.notesAr} ${marketNoteAr}`.trim();
  const socioEconomicFitFr =
    `Niveau d'intrants : ${candidate.socioEconomicProfile.inputRequirement} vs capacité (${farmerContext.financialCapacity || 'non précisée'}). Objectif (${farmerContext.primaryGoal || 'non précisé'}). Contexte : ${regionLabel}. ${candidate.socioEconomicProfile.forageAndResidueValue.notesFr} ${marketNoteFr}`.trim();

  // D. Agronomic Cautions
  const cautionsEn: string[] = [];
  const cautionsAr: string[] = [];
  const cautionsFr: string[] = [];

  if (isProvisionalHistory) {
    cautionsEn.push('Prior crop history before the current crop is missing; recommendation is provisional pending multi-year history.');
    cautionsAr.push('سجل المحاصيل قبل الموسم الحالي غير مكتمل؛ التوصية أولية وتحتاج تأكيد التاريخ الزراعي.');
    cautionsFr.push('Historique cultural antérieur manquant ; recommandation provisoire à confirmer.');
  }

  if (sameFamilyAsCurrent || sameFamilyAsPrevious) {
    cautionsEn.push(candidate.rotationCompatibility.sharedPathogensNoteEn);
    cautionsAr.push(candidate.rotationCompatibility.sharedPathogensNoteAr);
    cautionsFr.push(candidate.rotationCompatibility.sharedPathogensNoteFr);
  }

  if (waterAssessment.status !== 'adequate') {
    cautionsEn.push(`Water deficit risk (${waterAssessment.status}): supplemental irrigation or seasonal adjustment needed.`);
    cautionsAr.push(`مخاطر عجز مائي (${waterAssessment.status}): يتطلب ريّاً تكميلياً أو تعديل موعد الزراعة.`);
    cautionsFr.push(`Risque de déficit hydrique (${waterAssessment.status}) : irrigation d'appoint ou ajustement calendaire requis.`);
  }

  if (soilInfo.clayPct !== null && candidate.soilSuitability.heavyClayPenaltyThresholdPct !== null && soilInfo.clayPct >= candidate.soilSuitability.heavyClayPenaltyThresholdPct) {
    cautionsEn.push(`High clay content (${soilInfo.clayPct}%) may impede drainage/emergence for ${candidate.commonNameEn}.`);
    cautionsAr.push(`ارتفاع نسبة الطين (${soilInfo.clayPct}%) قد يعيق الصرف أو الإنبات لمحصول ${candidate.commonNameAr}.`);
    cautionsFr.push(`Teneur élevée en argile (${soilInfo.clayPct}%) pouvant gêner le drainage pour ${candidate.commonNameFr}.`);
  }

  if (currentCrop.family === 'Fabaceae' && candidate.family === 'Poaceae' && residueMgmt === 'removed') {
    cautionsEn.push('Previous legume biomass was removed: residual nitrogen benefit to following cereal will be substantially lower.');
    cautionsAr.push('إزالة مخلفات البقوليات السابقة تقلل كثيراً من الرصيد النيتروجيني المتبقي للحبوب الموالية.');
    cautionsFr.push('L\'exportation des résidus de légumineuse réduit fortement le reliquat azoté pour la céréale suivante.');
  }

  if (soilInfo.socPct === null) {
    cautionsEn.push('Soil Organic Carbon (SOC %) was not measured/retrieved; organic matter response remains unverified.');
    cautionsAr.push('الكربون العضوي للتربة غير مقاس؛ استجابة المادة العضوية غير مؤكدة.');
    cautionsFr.push('Carbone organique (SOC) non mesuré ; réponse de la matière organique non vérifiée.');
  }

  if (farmerContext.waterAndTechCapacity === null || farmerContext.financialCapacity === null) {
    cautionsEn.push('Farmer water capacity or financial profile is incomplete; verify local feasibility before planting.');
    cautionsAr.push('بيانات القدرة المائية أو المالية غير مكتملة؛ يرجى استكمالها للتحقق من الملاءمة الميدانية.');
    cautionsFr.push('Capacité hydrique ou financière non précisée ; vérifier la faisabilité locale avant semis.');
  }

  // Always preserve at least one clear agronomic management note referencing the crop's FAO-56 condition
  cautionsEn.push(`${candidate.kcConditionsNoteEn} (${candidate.sources.rotationAndAgronomy})`);
  cautionsAr.push(`${candidate.kcConditionsNoteAr}`);
  cautionsFr.push(`${candidate.kcConditionsNoteFr}`);

  return {
    whyRecommendedEn,
    whyRecommendedAr,
    whyRecommendedFr,
    soilHealthBenefitEn,
    soilHealthBenefitAr,
    soilHealthBenefitFr,
    waterClimateFitEn,
    waterClimateFitAr,
    waterClimateFitFr,
    socioEconomicFitEn,
    socioEconomicFitAr,
    socioEconomicFitFr,
    agronomicCautionsEn: cautionsEn,
    agronomicCautionsAr: cautionsAr,
    agronomicCautionsFr: cautionsFr,
  };
}
