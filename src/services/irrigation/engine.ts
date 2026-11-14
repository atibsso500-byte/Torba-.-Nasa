/**
 * TURBA Phase 3 — Smart Irrigation Decision Engine Orchestrator
 *
 * Combines:
 * - FAO-56 Penman-Monteith ET0 & water-stress adjusted ETc_adj
 * - Crop stage & root-zone storage (TAW, RAW)
 * - Historical daily soil-water balance spin-up (observational/assimilated only)
 * - Forward NWP forecast horizon (+7 days)
 * - Net & gross irrigation depth, m³ volume, optional flow-rate duration
 * - Explainable qualitative confidence scoring (HIGH / MEDIUM / LOW / INSUFFICIENT_DATA)
 */

import { Coordinates } from '../../types/farm';
import {
  ConfidenceFactor,
  DailyWaterBalanceStep,
  FarmerIrrigationConfig,
  Fao56Et0Result,
  IrrigationConfidenceLevel,
  IrrigationDecisionStatus,
  IrrigationRecommendationResult,
  SoilHydraulicResult,
  TracedValue,
  WeatherSeriesResult,
} from '../../types/irrigation';
import { getCropById, resolveCropStageForDay } from '../../data/crops';
import {
  adjustAllowableDepletionP,
  computeCropEtc,
  computeFao56DailyEt0,
  computeWaterStressKs,
} from './fao56';
import {
  computeRawMm,
  computeTawMm,
  estimateInitialDepletionMm,
  runDailySoilWaterBalance,
  WaterBalanceDayInput,
} from './waterBalance';
import { buildIrrigationForecast } from './forecast';
import {
  diffDaysUtc,
  resolveLoggedIrrigationNetMm,
  validateIrrigationInputs,
} from './validation';

export function computeSmartIrrigationDecision(params: {
  coordinates: Coordinates;
  polygonAreaHectares: number;
  config: FarmerIrrigationConfig;
  weather: WeatherSeriesResult;
  soil: SoilHydraulicResult;
  referenceDateUtc?: string;
}): IrrigationRecommendationResult {
  const { coordinates, polygonAreaHectares, config, weather, soil } = params;
  const nowIso = new Date().toISOString();
  const refDateUtc = params.referenceDateUtc || nowIso.slice(0, 10);

  const effectiveAreaHa =
    config.fieldAreaHectares !== null && config.fieldAreaHectares > 0
      ? config.fieldAreaHectares
      : polygonAreaHectares > 0
      ? polygonAreaHectares
      : null;

  const crop = config.cropId ? getCropById(config.cropId) : null;
  const inputValidation = validateIrrigationInputs({
    coordinates,
    config: { ...config, fieldAreaHectares: effectiveAreaHa },
    referenceDateUtc: refDateUtc,
  });

  const confidenceFactors: ConfidenceFactor[] = [];
  const insufficientReasons: string[] = [...inputValidation.errors];
  const traceabilityRecords: TracedValue<number | string>[] = [];

  // Default empty traced builder
  const emptyTraced = <T,>(parameterName: string, unit: string, source = 'Unavailable'): TracedValue<T> => ({
    value: null,
    unit,
    parameterName,
    source,
    origin: 'fao56_estimated',
    observationDate: refDateUtc,
    retrievalTimestamp: nowIso,
  });

  // 1. Check historical weather & crop & soil readiness
  const histMeteo = weather.historicalDaily.slice(-14); // 14-day spin-up lookback
  if (histMeteo.length === 0) {
    insufficientReasons.push('No verified historical daily meteorological records (NASA POWER or Open-Meteo) available for this coordinate.');
    confidenceFactors.push({
      category: 'meteorology',
      impact: 'blocking',
      messageEn: 'Daily meteorological observations (Tmax, Tmin) are unavailable.',
      messageAr: 'بيانات الأرصاد اليومية (الحرارة العظمى والصغرى) غير متوفرة حالياً.',
      messageFr: 'Les observations météorologiques journalières (Tmax, Tmin) sont indisponibles.',
    });
  }

  if (!crop) {
    confidenceFactors.push({
      category: 'crop',
      impact: 'blocking',
      messageEn: 'No crop has been selected for irrigation calculation.',
      messageAr: 'لم يتم اختيار أي محصول بعد لحساب الاحتياج المائي.',
      messageFr: 'Aucune culture n\'a été sélectionnée pour le calcul d\'irrigation.',
    });
  } else if (crop.isProvisional) {
    confidenceFactors.push({
      category: 'crop',
      impact: 'moderate_penalty',
      messageEn: `${crop.nameEn} parameters are provisional (depend on canopy cover and local spacing).`,
      messageAr: `معاملات ${crop.nameAr} أولية وتعتمد على نسبة التغطية الظلية وكثافة الغرس المحلية.`,
      messageFr: `Les paramètres de ${crop.nameFr} sont provisoires (dépendent du taux de couverture).`,
    });
  }

  // Soil source confidence evaluation
  if (soil.sourceKind === 'unavailable' || soil.thetaFc.value === null || soil.thetaWp.value === null) {
    insufficientReasons.push(
      soil.soilGridsError ||
        'Soil hydraulic properties (θFC, θWP) unavailable. SoilGrids could not be reached and no farmer laboratory/texture input was provided.'
    );
    confidenceFactors.push({
      category: 'soil',
      impact: 'blocking',
      messageEn: 'Soil field capacity (θFC) and wilting point (θWP) are unavailable. Select your soil texture or enter lab test values.',
      messageAr: 'ثوابت التربة الهيدروليكية (السعة الحقلية ونقطة الذبول) غير متوفرة. اختر نوع التربة أو أدخل نتائج التحليل المخبري.',
      messageFr: 'La capacité au champ (θFC) et le point de flétrissement (θWP) sont indisponibles. Sélectionnez la texture ou saisissez vos analyses.',
    });
  } else if (soil.sourceKind === 'farmer_lab') {
    confidenceFactors.push({
      category: 'soil',
      impact: 'positive',
      messageEn: 'Using farmer-supplied field laboratory soil hydraulic thresholds (θFC, θWP).',
      messageAr: 'اعتماد قياسات مخبرية مباشرة للتربة مقدمة من الفلاح (θFC و θWP).',
      messageFr: 'Utilisation des seuils hydrauliques mesurés en laboratoire (θFC, θWP).',
    });
  } else if (soil.sourceKind === 'soilgrids_v2') {
    confidenceFactors.push({
      category: 'soil',
      impact: 'moderate_penalty',
      messageEn: 'Soil hydraulic thresholds estimated via SoilGrids v2.0 (250 m spatial model + Saxton & Rawls 2006), not a field lab test.',
      messageAr: 'الخصائص الهيدروليكية مقدرة مكانياً عبر SoilGrids بدقة 250م وليست تحليلاً مخبرياً لتربة قطعتك.',
      messageFr: 'Seuils hydriques estimés via SoilGrids 250 m (modèle spatial), et non par analyse de laboratoire parcellaire.',
    });
  } else if (soil.sourceKind === 'farmer_texture_table19') {
    confidenceFactors.push({
      category: 'soil',
      impact: 'moderate_penalty',
      messageEn: 'Soil thresholds use FAO-56 Table 19 reference midpoints for your selected soil texture.',
      messageAr: 'تم اعتماد القيم المرجعية لمنظمة الفاو (الجدول 19) بناءً على نوع التربة المختار.',
      messageFr: 'Seuils issus des valeurs typiques FAO-56 (Tableau 19) pour la texture sélectionnée.',
    });
  }

  // If critical blocking gaps exist, return explicit INSUFFICIENT_DATA state
  if (insufficientReasons.length > 0 || !crop || soil.thetaFc.value === null || soil.thetaWp.value === null || histMeteo.length === 0) {
    return buildInsufficientResult({
      nowIso,
      refDateUtc,
      coordinates,
      crop,
      config,
      effectiveAreaHa,
      soil,
      confidenceFactors,
      validationErrors: inputValidation.errors,
      validationWarnings: inputValidation.warnings,
      insufficientReasons,
      emptyTraced,
    });
  }

  // 2. Compute daily Penman-Monteith ET0 across historical lookback
  const latestMeteoDay = histMeteo[histMeteo.length - 1];
  const dapCurrent = config.plantingDate ? diffDaysUtc(config.plantingDate, latestMeteoDay.date) ?? 30 : 30;
  const stageInfoCurrent = resolveCropStageForDay(
    crop,
    dapCurrent,
    config.growthStageOverride,
    config.customRootDepthM
  );

  // Build map of farmer-logged irrigations by date (historical only, deduplicated)
  const irrigationMapMm = new Map<string, number>();
  const seenIrrKeys = new Set<string>();
  for (const ev of config.previousIrrigations || []) {
    const dedup = `${ev.date}:${ev.netDepthMm ?? ''}:${ev.grossDepthMm ?? ''}:${ev.volumeM3 ?? ''}`;
    if (seenIrrKeys.has(dedup)) continue;
    seenIrrKeys.add(dedup);
    if (ev.date > latestMeteoDay.date) continue; // Guard: future events excluded from historical depletion
    const netMm = resolveLoggedIrrigationNetMm(ev, config.applicationEfficiency, effectiveAreaHa);
    if (netMm !== null && netMm > 0) {
      irrigationMapMm.set(ev.date, (irrigationMapMm.get(ev.date) || 0) + netMm);
    }
  }

  let totalEstimatedParamsCount = 0;
  const estimatedParamSet = new Set<string>();
  const historicalDayInputs: WaterBalanceDayInput[] = [];
  const et0Results: Fao56Et0Result[] = [];

  for (const m of histMeteo) {
    const et0Res = computeFao56DailyEt0({
      date: m.date,
      latitudeDeg: coordinates.lat,
      elevationM: weather.elevationM,
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
    et0Results.push(et0Res);
    if (et0Res.isValid) {
      totalEstimatedParamsCount += et0Res.estimatedVariables.length;
      et0Res.estimatedVariables.forEach((ev) => estimatedParamSet.add(ev.variable));
      historicalDayInputs.push({
        date: m.date,
        isForecast: false,
        et0Result: et0Res,
        precipitationMm: m.precipitationMm,
        irrigationNetMm: irrigationMapMm.get(m.date) || 0,
        meteoOrigin: m.origin,
      });
    }
  }

  const latestValidEt0 = [...et0Results].reverse().find((e) => e.isValid && e.et0MmDay !== null);
  if (!latestValidEt0 || latestValidEt0.et0MmDay === null || historicalDayInputs.length === 0) {
    insufficientReasons.push('FAO-56 ET0 could not be computed due to missing or invalid meteorological variables.');
    return buildInsufficientResult({
      nowIso,
      refDateUtc,
      coordinates,
      crop,
      config,
      effectiveAreaHa,
      soil,
      confidenceFactors,
      validationErrors: inputValidation.errors,
      validationWarnings: inputValidation.warnings,
      insufficientReasons,
      emptyTraced,
    });
  }

  // Record meteorological estimation impacts cleanly
  if (estimatedParamSet.size > 0) {
    const estList = Array.from(estimatedParamSet).join(', ');
    confidenceFactors.push({
      category: 'meteorology',
      impact: estimatedParamSet.size >= 2 ? 'major_penalty' : 'moderate_penalty',
      messageEn: `FAO-56 fallback estimation applied for missing variable(s): ${estList}.`,
      messageAr: `تم تطبيق تقدير علمي (FAO-56) للمتغيرات الناقصة: ${estList}.`,
      messageFr: `Procédure d'estimation FAO-56 appliquée pour variable(s) manquante(s) : ${estList}.`,
    });
  } else {
    confidenceFactors.push({
      category: 'meteorology',
      impact: 'positive',
      messageEn: 'All FAO-56 Penman-Monteith inputs (Tmax, Tmin, RH, u2, Rs, P) obtained without fallback estimation.',
      messageAr: 'جميع متغيرات معادلة بنمان-مونتيث (FAO-56) مستمدة مباشرة بدون تقدير بديل.',
      messageFr: 'Toutes les variables FAO-56 Penman-Monteith sont disponibles sans procédure de substitution.',
    });
  }

  // Freshness check on latest historical meteorological date
  const daysStale = diffDaysUtc(latestValidEt0.date, refDateUtc) ?? 0;
  if (daysStale > 5) {
    confidenceFactors.push({
      category: 'freshness',
      impact: 'major_penalty',
      messageEn: `Latest meteorological record (${latestValidEt0.date}) is ${daysStale} days old.`,
      messageAr: `أحدث رصد جوي متاح (${latestValidEt0.date}) متأخر بـ ${daysStale} يوماً.`,
      messageFr: `La dernière donnée météo (${latestValidEt0.date}) date de ${daysStale} jours.`,
    });
  }

  // 3. Determine initial soil depletion D0 at start of historical spin-up
  const firstHistDay = historicalDayInputs[0];
  const firstDap = config.plantingDate ? diffDaysUtc(config.plantingDate, firstHistDay.date) ?? 30 : 30;
  const firstStageInfo = resolveCropStageForDay(
    crop,
    firstDap,
    config.growthStageOverride,
    config.customRootDepthM
  );
  const initialTaw = computeTawMm(soil.thetaFc.value, soil.thetaWp.value, firstStageInfo.rootDepthM);
  const initialP = adjustAllowableDepletionP(
    crop.coefficients.allowableDepletionP,
    computeCropEtc(firstHistDay.et0Result.et0MmDay!, firstStageInfo.kc)
  );
  const initialRaw = computeRawMm(initialTaw, initialP);

  const initEst = estimateInitialDepletionMm({
    thetaFc: soil.thetaFc.value,
    thetaWp: soil.thetaWp.value,
    rootDepthM: firstStageInfo.rootDepthM,
    nwpLayers: weather.nwpSoilMoistureLayers,
    rootZoneWetnessIndex01: weather.initialRootZoneWetnessIndex,
  });

  let startDepletionMm: number;
  if (initEst.depletionMm !== null) {
    startDepletionMm = initEst.depletionMm;
  } else {
    // Only if neither NWP layers nor MERRA-2 wetness index exist: initialize at conservative 50% RAW and flag low confidence
    startDepletionMm = Math.round(initialRaw * 0.5 * 100) / 100;
    confidenceFactors.push({
      category: 'soil',
      impact: 'major_penalty',
      messageEn: 'Initial soil moisture at lookback start unavailable; initialized spin-up at 50% RAW (verify with recent irrigation history).',
      messageAr: 'رطوبة التربة الابتدائية غير متوفرة؛ بدأ التتبع عند 50% من RAW (يُنصح بإدخال آخر عملية ري).',
      messageFr: 'Humidité initiale indisponible ; initialisation à 50 % de la RFU (saisissez vos dernières irrigations).',
    });
  }

  // 4. Run Historical Soil-Water Balance Spin-Up
  const historicalBalance: DailyWaterBalanceStep[] = runDailySoilWaterBalance({
    days: historicalDayInputs,
    crop,
    plantingDate: config.plantingDate,
    stageOverride: config.growthStageOverride,
    soil: {
      thetaFc: soil.thetaFc.value,
      thetaWp: soil.thetaWp.value,
      curveNumber: soil.curveNumber ?? 78,
      customRootDepthM: config.customRootDepthM,
    },
    initialDepletionMm: startDepletionMm,
  });

  const currentStep = historicalBalance[historicalBalance.length - 1];
  const currentDepletionMm = currentStep.depletionEndMm;
  const currentTawMm = currentStep.tawMm;
  const currentRawMm = currentStep.rawMm;
  const currentKs =
    computeWaterStressKs({
      depletionMm: currentDepletionMm,
      tawMm: currentTawMm,
      rawMm: currentRawMm,
    }) ?? 1.0;

  const etcPotentialCurrent = currentStep.etcPotentialMm;
  const etcAdjustedCurrent = Math.round(etcPotentialCurrent * currentKs * 1000) / 1000;
  const adjustedP = adjustAllowableDepletionP(crop.coefficients.allowableDepletionP, etcPotentialCurrent);

  // 5. Run Forward Forecast Horizon (+7 days)
  const { forecastSteps, summary: forecastSummary } = buildIrrigationForecast({
    forecastMeteo: weather.forecastDaily,
    latitudeDeg: coordinates.lat,
    elevationM: weather.elevationM,
    crop,
    plantingDate: config.plantingDate,
    stageOverride: config.growthStageOverride,
    soil: {
      thetaFc: soil.thetaFc.value,
      thetaWp: soil.thetaWp.value,
      curveNumber: soil.curveNumber ?? 78,
      customRootDepthM: config.customRootDepthM,
    },
    currentDepletionMm,
    currentRawMm,
    horizonDays: 7,
  });

  if (forecastSteps.length === 0) {
    confidenceFactors.push({
      category: 'forecast',
      impact: 'moderate_penalty',
      messageEn: 'Forward NWP forecast horizon unavailable; recommendation reflects current balance only.',
      messageAr: 'التوقعات الجوية للأيام القادمة غير متوفرة؛ التوصية تعتمد على الرصيد الحالي فقط.',
      messageFr: 'Prévisions météo futures indisponibles ; la recommandation repose uniquement sur le bilan actuel.',
    });
  }

  // 6. Decision Classification & Net / Gross Irrigation Depth Calculation
  let status: IrrigationDecisionStatus = 'NO_IMMEDIATE_IRRIGATION';
  const approachingRatio = 0.7;
  if (currentRawMm > 0) {
    if (currentDepletionMm >= currentRawMm) {
      status = 'IRRIGATION_REQUIRED';
    } else if (currentDepletionMm >= currentRawMm * approachingRatio) {
      status = 'IRRIGATION_APPROACHING';
    } else {
      status = 'NO_IMMEDIATE_IRRIGATION';
    }
  }

  // Net irrigation depth: bring root-zone depletion back to targetDepletionFractionOfRaw * RAW
  const targetDepletionMm = Math.max(0, Math.min(currentRawMm, config.targetDepletionFractionOfRaw * currentRawMm));
  let netIrrigationDepthMm = Math.max(0, Math.round((currentDepletionMm - targetDepletionMm) * 10) / 10);

  let wasCappedBySoilStorage = false;
  if (netIrrigationDepthMm > currentDepletionMm) {
    netIrrigationDepthMm = Math.round(currentDepletionMm * 10) / 10;
    wasCappedBySoilStorage = true;
  }

  let wasCappedByMaxEventDepth = false;
  if (
    config.maxApplicationDepthMm !== null &&
    Number.isFinite(config.maxApplicationDepthMm) &&
    config.maxApplicationDepthMm > 0 &&
    netIrrigationDepthMm > config.maxApplicationDepthMm
  ) {
    netIrrigationDepthMm = Math.round(config.maxApplicationDepthMm * 10) / 10;
    wasCappedByMaxEventDepth = true;
  }

  // When no immediate irrigation is required and depletion < 70% RAW, report 0 mm active requirement
  const recommendedNetMm =
    status === 'NO_IMMEDIATE_IRRIGATION' ? 0 : netIrrigationDepthMm;

  const grossIrrigationDepthMm =
    recommendedNetMm > 0
      ? Math.round((recommendedNetMm / config.applicationEfficiency) * 10) / 10
      : 0;

  // Volume: V(m³) = 10 * Area(ha) * Igross(mm)
  let waterVolumeM3: number | null = null;
  if (effectiveAreaHa !== null && effectiveAreaHa > 0) {
    waterVolumeM3 = Math.round(10 * effectiveAreaHa * grossIrrigationDepthMm * 10) / 10;
  } else {
    confidenceFactors.push({
      category: 'area',
      impact: 'moderate_penalty',
      messageEn: 'Field area (ha) is missing; water depth (mm) is calculated, but total volume (m³) requires parcel area.',
      messageAr: 'مساحة القطعة بالهكتار غير محددة؛ تم حساب عمق الري (مم)، وأدخل المساحة لحساب الحجم بالمتر المكعب.',
      messageFr: 'Surface (ha) non renseignée ; la dose (mm) est calculée, mais le volume (m³) requiert la superficie.',
    });
  }

  // Duration: Time(h) = V(m³) * 1000 / Q(L/h) — ONLY calculated when real flow rate Q > 0 exists
  let irrigationDurationHours: number | null = null;
  if (
    waterVolumeM3 !== null &&
    config.systemFlowRateLph !== null &&
    Number.isFinite(config.systemFlowRateLph) &&
    config.systemFlowRateLph > 0
  ) {
    irrigationDurationHours =
      Math.round(((waterVolumeM3 * 1000) / config.systemFlowRateLph) * 100) / 100;
  }

  // 7. Determine Qualitative Confidence Level (HIGH / MEDIUM / LOW)
  const hasMajorPenalty = confidenceFactors.some((f) => f.impact === 'major_penalty');
  const moderateCount = confidenceFactors.filter((f) => f.impact === 'moderate_penalty').length;

  let confidence: IrrigationConfidenceLevel = 'HIGH';
  if (hasMajorPenalty || totalEstimatedParamsCount > 4 || moderateCount >= 3) {
    confidence = 'LOW';
  } else if (moderateCount >= 1 || crop.isProvisional) {
    confidence = 'MEDIUM';
  }

  // 8. Build Traceability Records
  const latestMeteoSource = latestMeteoDay.source;
  const latestMeteoOrigin = latestMeteoDay.origin;

  traceabilityRecords.push(
    {
      value: currentStep.et0Mm,
      unit: 'mm/day',
      parameterName: 'Reference Evapotranspiration (ET0)',
      source: `FAO-56 Penman-Monteith (${latestMeteoSource})`,
      origin: latestValidEt0.origin,
      observationDate: latestValidEt0.date,
      retrievalTimestamp: weather.retrievalTimestamp,
      spatialResolution: latestMeteoDay.spatialResolution,
      estimationMethod:
        latestValidEt0.estimatedVariables.length > 0
          ? `Estimated fallbacks: ${latestValidEt0.estimatedVariables.map((e) => e.variable).join(', ')}`
          : undefined,
    },
    {
      value: currentStep.kc,
      unit: 'dimensionless',
      parameterName: `Crop Coefficient (Kc - ${stageInfoCurrent.stage})`,
      source: crop.sources.kcReference,
      origin: crop.isProvisional ? 'fao56_estimated' : 'user_provided',
      observationDate: latestValidEt0.date,
      retrievalTimestamp: nowIso,
    },
    soil.thetaFc,
    soil.thetaWp,
    {
      value: currentDepletionMm,
      unit: 'mm',
      parameterName: 'Current Root-Zone Depletion D(t)',
      source: `FAO-56 Daily Water Balance (${initEst.method})`,
      origin: 'fao56_estimated',
      observationDate: currentStep.date,
      retrievalTimestamp: nowIso,
    }
  );

  // 9. Generate Clear Farmer-Friendly Scientific Explanations (EN / AR / FR)
  const { explanationEn, explanationAr, explanationFr } = buildExplanations({
    crop,
    status,
    stage: stageInfoCurrent.stage,
    et0Mm: currentStep.et0Mm,
    etcMm: etcAdjustedCurrent,
    depletionMm: currentDepletionMm,
    rawMm: currentRawMm,
    tawMm: currentTawMm,
    netMm: recommendedNetMm,
    grossMm: grossIrrigationDepthMm,
    efficiency: config.applicationEfficiency,
    volumeM3: waterVolumeM3,
    forecastSummary,
  });

  return {
    generatedAt: nowIso,
    coordinates,
    status,
    confidence,
    confidenceFactors,
    crop,
    currentStage: stageInfoCurrent.stage,
    daysAfterPlanting: config.plantingDate ? dapCurrent : null,
    kcCurrent: {
      value: currentStep.kc,
      unit: 'dimensionless',
      parameterName: 'Crop Coefficient (Kc)',
      source: crop.sources.kcReference,
      origin: crop.isProvisional ? 'fao56_estimated' : 'user_provided',
      observationDate: currentStep.date,
      retrievalTimestamp: nowIso,
    },
    ksCurrent: {
      value: currentKs,
      unit: 'dimensionless',
      parameterName: 'Water Stress Coefficient (Ks)',
      source: 'FAO-56 Eq. 84',
      origin: 'fao56_estimated',
      observationDate: currentStep.date,
      retrievalTimestamp: nowIso,
    },
    et0Current: {
      value: currentStep.et0Mm,
      unit: 'mm/day',
      parameterName: 'Reference Evapotranspiration (ET0)',
      source: `FAO-56 Penman-Monteith via ${latestMeteoSource}`,
      origin: latestValidEt0.origin,
      observationDate: latestValidEt0.date,
      retrievalTimestamp: weather.retrievalTimestamp,
      spatialResolution: latestMeteoDay.spatialResolution,
    },
    etcPotentialCurrent: {
      value: etcPotentialCurrent,
      unit: 'mm/day',
      parameterName: 'Standard Crop Evapotranspiration (ETc)',
      source: 'FAO-56 ETc = Kc × ET0',
      origin: latestMeteoOrigin,
      observationDate: currentStep.date,
      retrievalTimestamp: nowIso,
    },
    etcAdjustedCurrent: {
      value: etcAdjustedCurrent,
      unit: 'mm/day',
      parameterName: 'Stress-Adjusted Crop ET (ETc_adj)',
      source: 'FAO-56 ETc_adj = Ks × Kc × ET0',
      origin: 'fao56_estimated',
      observationDate: currentStep.date,
      retrievalTimestamp: nowIso,
    },
    rootDepthM: {
      value: currentStep.rootDepthM,
      unit: 'm',
      parameterName: 'Effective Root Depth (Zr)',
      source: config.customRootDepthM ? 'Farmer Custom Root Depth' : crop.sources.rootDepthReference,
      origin: config.customRootDepthM ? 'user_provided' : 'fao56_estimated',
      observationDate: currentStep.date,
      retrievalTimestamp: nowIso,
    },
    tawMm: {
      value: currentTawMm,
      unit: 'mm',
      parameterName: 'Total Available Water (TAW)',
      source: `1000 × (θFC - θWP) × Zr (${soil.sourceLabel})`,
      origin: soil.origin,
      observationDate: currentStep.date,
      retrievalTimestamp: soil.retrievalTimestamp,
    },
    rawMm: {
      value: currentRawMm,
      unit: 'mm',
      parameterName: 'Readily Available Water (RAW)',
      source: `p × TAW (p=${adjustedP})`,
      origin: soil.origin,
      observationDate: currentStep.date,
      retrievalTimestamp: soil.retrievalTimestamp,
    },
    currentDepletionMm: {
      value: currentDepletionMm,
      unit: 'mm',
      parameterName: 'Root-Zone Depletion D(t)',
      source: `FAO-56 Daily Balance (${initEst.method})`,
      origin: 'fao56_estimated',
      observationDate: currentStep.date,
      retrievalTimestamp: nowIso,
    },
    allowableDepletionFractionP: adjustedP,
    netIrrigationDepthMm: recommendedNetMm,
    grossIrrigationDepthMm,
    applicationEfficiency: config.applicationEfficiency,
    fieldAreaHa: effectiveAreaHa,
    waterVolumeM3,
    irrigationDurationHours,
    wasCappedBySoilStorage,
    wasCappedByMaxEventDepth,
    soilProfile: soil,
    historicalBalance,
    forecastBalance: forecastSteps,
    forecastSummary,
    validationErrors: inputValidation.errors,
    validationWarnings: inputValidation.warnings,
    explanationEn,
    explanationAr,
    explanationFr,
    insufficientDataReasons: [],
    traceabilityRecords,
  };
}

function buildInsufficientResult(args: {
  nowIso: string;
  refDateUtc: string;
  coordinates: Coordinates;
  crop: ReturnType<typeof getCropById>;
  config: FarmerIrrigationConfig;
  effectiveAreaHa: number | null;
  soil: SoilHydraulicResult;
  confidenceFactors: ConfidenceFactor[];
  validationErrors: string[];
  validationWarnings: string[];
  insufficientReasons: string[];
  emptyTraced: <T>(name: string, unit: string, source?: string) => TracedValue<T>;
}): IrrigationRecommendationResult {
  const uniqueReasons = Array.from(new Set(args.insufficientReasons));
  const summaryText = uniqueReasons.join(' ');
  return {
    generatedAt: args.nowIso,
    coordinates: args.coordinates,
    status: 'INSUFFICIENT_DATA',
    confidence: 'INSUFFICIENT_DATA',
    confidenceFactors: args.confidenceFactors,
    crop: args.crop,
    currentStage: null,
    daysAfterPlanting: null,
    kcCurrent: args.emptyTraced('Crop Coefficient (Kc)', 'dimensionless'),
    ksCurrent: args.emptyTraced('Water Stress Coefficient (Ks)', 'dimensionless'),
    et0Current: args.emptyTraced('Reference Evapotranspiration (ET0)', 'mm/day'),
    etcPotentialCurrent: args.emptyTraced('Standard Crop ET (ETc)', 'mm/day'),
    etcAdjustedCurrent: args.emptyTraced('Adjusted Crop ET (ETc_adj)', 'mm/day'),
    rootDepthM: args.emptyTraced('Effective Root Depth (Zr)', 'm'),
    tawMm: args.emptyTraced('Total Available Water (TAW)', 'mm'),
    rawMm: args.emptyTraced('Readily Available Water (RAW)', 'mm'),
    currentDepletionMm: args.emptyTraced('Root-Zone Depletion D(t)', 'mm'),
    allowableDepletionFractionP: null,
    netIrrigationDepthMm: null,
    grossIrrigationDepthMm: null,
    applicationEfficiency: args.config.applicationEfficiency,
    fieldAreaHa: args.effectiveAreaHa,
    waterVolumeM3: null,
    irrigationDurationHours: null,
    wasCappedBySoilStorage: false,
    wasCappedByMaxEventDepth: false,
    soilProfile: args.soil,
    historicalBalance: [],
    forecastBalance: [],
    forecastSummary: null,
    validationErrors: args.validationErrors,
    validationWarnings: args.validationWarnings,
    explanationEn: `Insufficient verified data to generate a scientifically defensible irrigation recommendation: ${summaryText}`,
    explanationAr: `البيانات الموثقة غير كافية لإصدار توصية ري علمية موثوقة: ${summaryText}`,
    explanationFr: `Données vérifiées insuffisantes pour formuler une recommandation d'irrigation fiable : ${summaryText}`,
    insufficientDataReasons: uniqueReasons,
    traceabilityRecords: [],
  };
}

function buildExplanations(p: {
  crop: NonNullable<ReturnType<typeof getCropById>>;
  status: IrrigationDecisionStatus;
  stage: string;
  et0Mm: number;
  etcMm: number;
  depletionMm: number;
  rawMm: number;
  tawMm: number;
  netMm: number;
  grossMm: number;
  efficiency: number;
  volumeM3: number | null;
  forecastSummary: IrrigationRecommendationResult['forecastSummary'];
}) {
  const effPct = Math.round(p.efficiency * 100);
  const volEn = p.volumeM3 !== null ? ` (${p.volumeM3.toLocaleString()} m³ across parcel area)` : '';
  const volAr = p.volumeM3 !== null ? ` (${p.volumeM3.toLocaleString()} م³ لمساحة القطعة)` : '';
  const volFr = p.volumeM3 !== null ? ` (${p.volumeM3.toLocaleString()} m³ pour la parcelle)` : '';

  if (p.status === 'IRRIGATION_REQUIRED') {
    return {
      explanationEn:
        `${p.crop.nameEn} (${p.stage}) root-zone depletion has reached ${p.depletionMm.toFixed(1)} mm, exceeding the Readily Available Water threshold (RAW = ${p.rawMm.toFixed(1)} mm out of ${p.tawMm.toFixed(1)} mm TAW). Current reference ET0 is ${p.et0Mm.toFixed(2)} mm/day and crop demand is ${p.etcMm.toFixed(2)} mm/day. Apply ${p.netMm.toFixed(1)} mm net (${p.grossMm.toFixed(1)} mm gross at ${effPct}% system efficiency)${volEn}.` +
        (p.forecastSummary?.rainfallWillDelayIrrigation ? ' Note: Meaningful forecast rainfall is expected; verify field moisture before full application.' : ''),
      explanationAr:
        `بلغ استنزاف منطقة جذور محصول ${p.crop.nameAr} (${p.depletionMm.toFixed(1)} مم) أو تجاوز حد الماء القابل للاستيعاب بسهولة (RAW = ${p.rawMm.toFixed(1)} مم من أصل ${p.tawMm.toFixed(1)} مم). التبخر-نتح المرجعي ET0 هو ${p.et0Mm.toFixed(2)} مم/يوم واحتياج المحصول ${p.etcMm.toFixed(2)} مم/يوم. يُوصى بجرعة صافية ${p.netMm.toFixed(1)} مم (إجمالية ${p.grossMm.toFixed(1)} مم بكفاءة ${effPct}%)${volAr}.`,
      explanationFr:
        `L'épuisement racinaire pour ${p.crop.nameFr} (${p.depletionMm.toFixed(1)} mm) atteint le seuil de réserve facilement utilisable (RFU/RAW = ${p.rawMm.toFixed(1)} mm sur ${p.tawMm.toFixed(1)} mm de RU). ET0 = ${p.et0Mm.toFixed(2)} mm/j et demande culturale = ${p.etcMm.toFixed(2)} mm/j. Appliquer ${p.netMm.toFixed(1)} mm net (${p.grossMm.toFixed(1)} mm brut à ${effPct}% d'efficience)${volFr}.`,
    };
  }

  if (p.status === 'IRRIGATION_APPROACHING') {
    const winEn = p.forecastSummary?.firstDayReachingRaw
      ? ` Projected depletion reaches RAW on ${p.forecastSummary.firstDayReachingRaw}.`
      : '';
    const winAr = p.forecastSummary?.firstDayReachingRaw
      ? ` يُتوقع بلوغ عتبة الري (RAW) بتاريخ ${p.forecastSummary.firstDayReachingRaw}.`
      : '';
    const winFr = p.forecastSummary?.firstDayReachingRaw
      ? ` Le seuil RAW devrait être atteint le ${p.forecastSummary.firstDayReachingRaw}.`
      : '';
    return {
      explanationEn: `${p.crop.nameEn} root-zone depletion (${p.depletionMm.toFixed(1)} mm) is approaching RAW (${p.rawMm.toFixed(1)} mm). Prepare for an application of ~${p.netMm.toFixed(1)} mm net (${p.grossMm.toFixed(1)} mm gross)${volEn}.${winEn}`,
      explanationAr: `استنزاف الرطوبة في منطقة الجذور (${p.depletionMm.toFixed(1)} مم) يقترب من عتبة الري الحرجة (${p.rawMm.toFixed(1)} مم). استعد لرية صافية تقارب ${p.netMm.toFixed(1)} مم (${p.grossMm.toFixed(1)} مم إجمالاً)${volAr}.${winAr}`,
      explanationFr: `L'épuisement hydrique (${p.depletionMm.toFixed(1)} mm) approche du seuil RAW (${p.rawMm.toFixed(1)} mm). Préparez un apport d'environ ${p.netMm.toFixed(1)} mm net (${p.grossMm.toFixed(1)} mm brut)${volFr}.${winFr}`,
    };
  }

  const rainEn = p.forecastSummary?.firstDayReachingRaw
    ? ` Next irrigation window is projected around ${p.forecastSummary.firstDayReachingRaw}.`
    : ' Soil moisture remains comfortably above RAW throughout the 7-day forecast horizon.';
  const rainAr = p.forecastSummary?.firstDayReachingRaw
    ? ` يُتوقع الوصول إلى عتبة الري القادمة حوالي ${p.forecastSummary.firstDayReachingRaw}.`
    : ' تبقى رطوبة التربة فوق عتبة الإجهاد (RAW) طوال أفق التوقعات لسبعة أيام.';
  const rainFr = p.forecastSummary?.firstDayReachingRaw
    ? ` Prochaine fenêtre d'irrigation projetée autour du ${p.forecastSummary.firstDayReachingRaw}.`
    : ' La réserve reste au-dessus du seuil RAW sur tout l\'horizon prévisionnel de 7 jours.';

  return {
    explanationEn: `No immediate irrigation required for ${p.crop.nameEn}. Current depletion (${p.depletionMm.toFixed(1)} mm) is well within Readily Available Water (RAW = ${p.rawMm.toFixed(1)} mm).${rainEn}`,
    explanationAr: `لا حاجة للري الفوري لمحصول ${p.crop.nameAr}. الاستنزاف الحالي (${p.depletionMm.toFixed(1)} مم) لا يزال أقل بكثير من عتبة الإجهاد المسموح (${p.rawMm.toFixed(1)} مم).${rainAr}`,
    explanationFr: `Aucune irrigation immédiate requise pour ${p.crop.nameFr}. Le déficit actuel (${p.depletionMm.toFixed(1)} mm) reste nettement sous le seuil RAW (${p.rawMm.toFixed(1)} mm).${rainFr}`,
  };
}
