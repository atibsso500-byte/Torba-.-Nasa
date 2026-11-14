/**
 * TURBA — Rotation Transition Bridge (جسر الانتقال الزراعي)
 *
 * Deterministic, Explainable Multi-Season Crop-Rotation Transition Planner.
 *
 * Scientific & Engineering Principles:
 * - Directly reuses shared climate/soil extractors from rotationAdvisor.ts,
 *   FAO-56 Penman-Monteith ET0 (fao56.ts), and USDA-SCS Curve Number runoff (rainfall.ts).
 * - Uses bounded Dijkstra / uniform-cost graph search across 3–4 upcoming growing seasons.
 * - Hard agronomic, water, financial, seasonal, and farmer-decision constraints strictly prune
 *   infeasible edges BEFORE multi-criteria path optimization.
 * - Distinguishes Strategy A (Baseline), Strategy B (Recommended Gradual), Conservative, and
 *   Strategy C (Alternative Resilience Strategy tailored to farmer resilience priority), blocking
 *   empty permutations of identical crop multisets.
 * - Adapts crop-season calendars dynamically by hemisphere & latitude (Northern / Southern / Equatorial).
 * - Never fabricates yields, prices, profits, fertilizer amounts, nitrogen gains, or future climate.
 * - Never labels soil as degraded unless supported by soil data or farmer observation.
 * - Explicitly discloses SoilGrids (250 m) and NASA POWER (~50 km) limitations and never claims SMAP/GPM/NDVI/ECOSTRESS.
 */

import { NasaGpmObservation, NasaPowerObservation } from '../../types/farm';
import {
  BaselineSequenceAnalysis,
  CropBotanicalFamily,
  CropResidueManagement,
  DailyMeteoRecord,
  FarmerContextProfile,
  FarmingSeasonOption,
  GlobalRotationCropProfile,
  RotationTransitionResult,
  SoilHydraulicResult,
  TransitionConstraints,
  TransitionCriteriaBreakdown,
  TransitionDataSourceEntry,
  TransitionDifficulty,
  TransitionEvaluationBadge,
  TransitionPathwayOption,
  TransitionResilienceFocus,
  TransitionSeasonStep,
  TransitionWeightsConfig,
} from '../../types/irrigation';
import {
  GLOBAL_ROTATION_CROP_DATABASE,
  getGlobalRotationCropById,
} from '../../data/crops';
import {
  ExtractedClimateIndicators,
  ExtractedSoilIndicators,
  extractClimateIndicators,
  extractSoilIndicators,
} from './rotationAdvisor';

export const DEFAULT_TRANSITION_WEIGHTS: TransitionWeightsConfig = {
  agronomicCompatibility: 0.22,
  soilHealthObjectives: 0.16,
  waterAvailability: 0.18,
  economicFeasibility: 0.14,
  transitionMinimality: 0.14,
  farmerPreferences: 0.08,
  seasonalFeasibility: 0.08,
};

export interface RotationTransitionInput {
  coordinates: { lat: number; lng: number };
  climate: {
    nasaPower: NasaPowerObservation | null;
    nasaGpm: NasaGpmObservation | null;
    historicalMeteoDays?: DailyMeteoRecord[];
    et0DailyValues?: Array<{ date: string; et0MmDay: number | null }>;
    elevationM?: number | null;
  };
  soil: SoilHydraulicResult;
  farmerContext: FarmerContextProfile;
  previousCropResidue?: CropResidueManagement;
  constraints: TransitionConstraints;
  verifiedRegionLabel?: string | null;
  /** Optional UTC month [1..12] override for deterministic testing across seasons */
  referenceMonthUtc?: number;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function clamp100(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function areValidCoordinates(coords: { lat: number; lng: number }): boolean {
  return (
    coords !== null &&
    typeof coords.lat === 'number' &&
    typeof coords.lng === 'number' &&
    Number.isFinite(coords.lat) &&
    Number.isFinite(coords.lng) &&
    coords.lat >= -90 &&
    coords.lat <= 90 &&
    coords.lng >= -180 &&
    coords.lng <= 180
  );
}

function getMultisetKey(cropIds: string[]): string {
  return [...cropIds].sort().join('|');
}

export function determineHemisphere(lat: number): 'northern' | 'southern' | 'equatorial' {
  if (lat > 5) return 'northern';
  if (lat < -5) return 'southern';
  return 'equatorial';
}

/**
 * Generates an ordered list of upcoming growing season slots adapted to hemisphere and starting month.
 * Never hardcodes Moroccan seasons globally.
 */
export function buildHemisphereSeasonSchedule(params: {
  hemisphere: 'northern' | 'southern' | 'equatorial';
  horizonSeasons: 3 | 4;
  startMonthUtc: number; // 1..12
  preferredStartSeason: FarmingSeasonOption;
}): FarmingSeasonOption[] {
  const { hemisphere, horizonSeasons, startMonthUtc, preferredStartSeason } = params;

  if (hemisphere === 'equatorial') {
    if (preferredStartSeason !== 'unspecified' && preferredStartSeason !== 'perennial_year_round') {
      const cycle: FarmingSeasonOption[] = ['spring', 'summer', 'autumn_winter'];
      const startIdx = Math.max(0, cycle.indexOf(preferredStartSeason));
      return Array.from({ length: horizonSeasons }, (_, i) => cycle[(startIdx + i) % cycle.length]);
    }
    return Array.from({ length: horizonSeasons }, () => 'unspecified');
  }

  let initialSlot: FarmingSeasonOption;
  if (preferredStartSeason !== 'unspecified' && preferredStartSeason !== 'perennial_year_round') {
    initialSlot = preferredStartSeason;
  } else if (hemisphere === 'northern') {
    if (startMonthUtc >= 9 || startMonthUtc <= 2) {
      initialSlot = 'autumn_winter';
    } else if (startMonthUtc >= 3 && startMonthUtc <= 5) {
      initialSlot = 'spring';
    } else {
      initialSlot = 'summer';
    }
  } else {
    // Southern Hemisphere: meteorological seasons shifted by 6 months
    if (startMonthUtc >= 9 && startMonthUtc <= 11) {
      initialSlot = 'spring';
    } else if (startMonthUtc === 12 || startMonthUtc <= 2) {
      initialSlot = 'summer';
    } else {
      initialSlot = 'autumn_winter';
    }
  }

  const cycle: FarmingSeasonOption[] = ['autumn_winter', 'spring', 'summer'];
  const startIdx = Math.max(0, cycle.indexOf(initialSlot));
  return Array.from({ length: horizonSeasons }, (_, i) => cycle[(startIdx + i) % cycle.length]);
}

export function resolveAlternativeResilienceFocus(
  farmer: FarmerContextProfile,
  constraints: TransitionConstraints
): TransitionResilienceFocus {
  if (constraints.resilienceFocus) {
    return constraints.resilienceFocus;
  }
  if (farmer.primaryGoal === 'water_conservation' || farmer.waterAndTechCapacity === 'rainfed_only') {
    return 'water_conservation';
  }
  if (farmer.culturalPractice === 'mixed_crop_livestock' || farmer.localContext.livestockIntegration === true) {
    return 'forage_production';
  }
  if (farmer.primaryGoal === 'soil_regeneration') {
    return 'soil_structure';
  }
  if (farmer.financialCapacity === 'low_input') {
    return 'financial_accessibility';
  }
  return 'water_conservation';
}

function getFocusLabel(focus: TransitionResilienceFocus, lang: 'en' | 'ar' | 'fr'): string {
  const labels: Record<TransitionResilienceFocus, { en: string; ar: string; fr: string }> = {
    water_conservation: {
      en: 'Water Conservation',
      ar: 'الترشيد المائي',
      fr: 'Sobriété hydrique',
    },
    soil_structure: {
      en: 'Soil Structure & Root Diversity',
      ar: 'بنية التربة وتنويع الجذور',
      fr: 'Structure du sol & enracinement',
    },
    nutrient_cycling: {
      en: 'Nutrient Cycling & Legume Integration',
      ar: 'تدوير العناصر وإدماج البقوليات',
      fr: 'Cycle des nutriments & légumineuses',
    },
    forage_production: {
      en: 'Forage & Mixed Livestock Resilience',
      ar: 'إنتاج الأعلاف وتكامل الثروة الحيوانية',
      fr: 'Fourrages & polyculture-élevage',
    },
    financial_accessibility: {
      en: 'Financial Accessibility (Lower Input Cost)',
      ar: 'القدرة المالية وتقليل كلفة المدخلات',
      fr: 'Accessibilité financière (intrants réduits)',
    },
    climate_resilience: {
      en: 'Climate & Thermal Stress Buffer',
      ar: 'التكيف المناخي ومقاومة الإجهاد الحراري',
      fr: 'Résilience climatique & thermique',
    },
  };
  return labels[focus][lang];
}

function normalizeWeights(
  farmer: FarmerContextProfile,
  override?: Partial<TransitionWeightsConfig>,
  mode: 'recommended' | 'conservative' | 'alternative' = 'recommended',
  resilienceFocus?: TransitionResilienceFocus
): TransitionWeightsConfig {
  const base: TransitionWeightsConfig = {
    ...DEFAULT_TRANSITION_WEIGHTS,
    ...(override || {}),
  };

  if (mode === 'conservative') {
    base.transitionMinimality += 0.24;
    base.agronomicCompatibility -= 0.06;
    base.soilHealthObjectives -= 0.06;
    base.waterAvailability -= 0.06;
    base.economicFeasibility -= 0.06;
  } else if (mode === 'alternative') {
    base.transitionMinimality -= 0.08;
    const focus = resilienceFocus || 'water_conservation';
    switch (focus) {
      case 'water_conservation':
        base.waterAvailability += 0.22;
        base.economicFeasibility += 0.06;
        base.farmerPreferences -= 0.04;
        base.agronomicCompatibility -= 0.08;
        base.soilHealthObjectives -= 0.08;
        break;
      case 'soil_structure':
        base.soilHealthObjectives += 0.22;
        base.agronomicCompatibility += 0.06;
        base.economicFeasibility -= 0.06;
        base.farmerPreferences -= 0.06;
        base.waterAvailability -= 0.08;
        break;
      case 'nutrient_cycling':
        base.soilHealthObjectives += 0.18;
        base.agronomicCompatibility += 0.10;
        base.economicFeasibility -= 0.06;
        base.waterAvailability -= 0.08;
        base.farmerPreferences -= 0.06;
        break;
      case 'forage_production':
        base.farmerPreferences += 0.34;
        base.soilHealthObjectives += 0.06;
        base.agronomicCompatibility -= 0.08;
        base.economicFeasibility -= 0.08;
        base.waterAvailability -= 0.10;
        base.transitionMinimality -= 0.06;
        break;
      case 'financial_accessibility':
        base.economicFeasibility += 0.22;
        base.transitionMinimality += 0.06;
        base.waterAvailability += 0.04;
        base.soilHealthObjectives -= 0.10;
        base.agronomicCompatibility -= 0.08;
        base.farmerPreferences -= 0.06;
        break;
      case 'climate_resilience':
        base.seasonalFeasibility += 0.14;
        base.waterAvailability += 0.14;
        base.agronomicCompatibility -= 0.06;
        base.economicFeasibility -= 0.06;
        base.farmerPreferences -= 0.08;
        break;
    }
  } else {
    if (farmer.primaryGoal === 'soil_regeneration') {
      base.soilHealthObjectives += 0.08;
      base.agronomicCompatibility += 0.04;
      base.transitionMinimality -= 0.06;
      base.farmerPreferences -= 0.06;
    } else if (farmer.primaryGoal === 'water_conservation' || farmer.waterAndTechCapacity === 'rainfed_only') {
      base.waterAvailability += 0.10;
      base.economicFeasibility -= 0.04;
      base.farmerPreferences -= 0.03;
      base.transitionMinimality -= 0.03;
    }
    if (farmer.financialCapacity === 'low_input') {
      base.economicFeasibility += 0.08;
      base.transitionMinimality += 0.04;
      base.soilHealthObjectives -= 0.06;
      base.farmerPreferences -= 0.06;
    }
  }

  const keys = Object.keys(base) as Array<keyof TransitionWeightsConfig>;
  let sum = 0;
  for (const k of keys) {
    base[k] = Math.max(0.01, base[k]);
    sum += base[k];
  }
  const normalized = {} as TransitionWeightsConfig;
  let running = 0;
  keys.forEach((k, idx) => {
    if (idx === keys.length - 1) {
      normalized[k] = Math.round((1 - running) * 1000) / 1000;
    } else {
      const w = Math.round((base[k] / sum) * 1000) / 1000;
      normalized[k] = w;
      running += w;
    }
  });
  return normalized;
}

/**
 * Step A: Analyze the farmer's actual current crop sequence baseline (Strategy A).
 */
export function analyzeBaselineSequence(params: {
  sequenceCropIds: string[];
  soil: ExtractedSoilIndicators;
  climate?: ExtractedClimateIndicators | null;
  observedSoilNote?: string | null;
  residueMgmt: CropResidueManagement;
  farmerContext?: FarmerContextProfile;
}): BaselineSequenceAnalysis {
  const { sequenceCropIds, soil, climate, observedSoilNote, residueMgmt, farmerContext } = params;

  const invalidReasonsEn: string[] = [];
  const invalidReasonsAr: string[] = [];
  const invalidReasonsFr: string[] = [];

  if (!Array.isArray(sequenceCropIds) || sequenceCropIds.length === 0) {
    invalidReasonsEn.push('Current crop sequence is empty; provide at least 1 active or recent crop.');
    invalidReasonsAr.push('سلسلة المحاصيل الحالية فارغة؛ يرجى إدخال محصول حالي أو سابق واحد على الأقل.');
    invalidReasonsFr.push('La séquence culturale actuelle est vide ; saisissez au moins une culture.');
  }

  const crops: GlobalRotationCropProfile[] = [];
  const unknownIds: string[] = [];
  for (const id of sequenceCropIds) {
    const found = getGlobalRotationCropById(id);
    if (!found) {
      unknownIds.push(id);
    } else {
      crops.push(found);
    }
  }

  if (unknownIds.length > 0) {
    invalidReasonsEn.push(`Unsupported or unrecognized crop identifier(s): ${unknownIds.join(', ')}.`);
    invalidReasonsAr.push(`معرفات محاصيل غير مدعومة أو غير معروفة: ${unknownIds.join('، ')}.`);
    invalidReasonsFr.push(`Culture(s) non prise(s) en charge ou inconnue(s) : ${unknownIds.join(', ')}.`);
  }

  const validSequence = invalidReasonsEn.length === 0 && crops.length > 0;

  const missingInformationEn: string[] = [];
  const missingInformationAr: string[] = [];
  const missingInformationFr: string[] = [];

  if (crops.length === 1) {
    missingInformationEn.push('Prior seasons before the single entered crop are unrecorded; multi-year pest buildup cannot be confirmed.');
    missingInformationAr.push('المواسم السابقة للمحصول الوحيد غير مسجلة؛ لا يمكن الجزم بتراكم الآفات متعدد السنوات.');
    missingInformationFr.push('Les saisons antérieures à l\'unique culture saisie manquent ; l\'historique sanitaire reste partiel.');
  }
  if (residueMgmt === 'unknown') {
    missingInformationEn.push('Crop residue handling (retained, removed, or grazed) is unspecified; organic matter and N carry-over remain unverified.');
    missingInformationAr.push('طريقة تدبير بقايا المحاصيل (إبقاء، إزالة، أو رعي) غير محددة؛ أثر المادة العضوية والنيتروجين المتبقي غير مؤكد.');
    missingInformationFr.push('Gestion des résidus non précisée (restitués, exportés ou pâturés) ; bilan organique/azoté partiel.');
  }
  if (soil.socPct === null) {
    missingInformationEn.push('Laboratory or retrieved Soil Organic Carbon (SOC %) is unavailable for this parcel.');
    missingInformationAr.push('نسبة الكربون العضوي للتربة (SOC %) غير متوفرة لهذه القطعة.');
    missingInformationFr.push('Teneur en carbone organique du sol (SOC %) indisponible pour cette parcelle.');
  } else if (soil.isSpatialModel) {
    missingInformationEn.push('Topsoil properties rely on 250 m SoilGrids spatial estimates rather than parcel-level lab soil testing.');
    missingInformationAr.push('خصائص التربة مستمدة من تقديرات SoilGrids المكانية (250م) وليست من تحليل مخبري للحقل.');
    missingInformationFr.push('Propriétés du sol issues de SoilGrids (250 m) et non d\'une analyse de laboratoire parcellaire.');
  }
  if (climate && climate.observedWindowDays < 35) {
    missingInformationEn.push(`Climate observations cover a ${climate.observedWindowDays}-day NASA POWER window rather than multi-year seasonal history.`);
    missingInformationAr.push(`المعطيات المناخية تغطي نافذة ${climate.observedWindowDays} يوماً من NASA POWER وليس سلسلة مناخية متعددة السنوات.`);
    missingInformationFr.push(`Les données climatiques couvrent ${climate.observedWindowDays} jours NASA POWER au lieu d'une série pluriannuelle.`);
  }
  if (farmerContext?.waterAndTechCapacity === null) {
    missingInformationEn.push('Farmer irrigation infrastructure capacity was not specified.');
    missingInformationAr.push('القدرة المائية وتجهيزات الري للفلاح غير محددة.');
    missingInformationFr.push('Capacité d\'irrigation de l\'exploitation non précisée.');
  }

  // Family repetitions
  const familyPositions = new Map<CropBotanicalFamily, number[]>();
  crops.forEach((c, idx) => {
    const arr = familyPositions.get(c.family) || [];
    arr.push(idx + 1);
    familyPositions.set(c.family, arr);
  });

  const repeatedFamilies: Array<{ family: CropBotanicalFamily; positions: number[] }> = [];
  familyPositions.forEach((positions, family) => {
    if (positions.length > 1) {
      repeatedFamilies.push({ family, positions });
    }
  });

  const diseaseAndPestRisksEn: string[] = [];
  const diseaseAndPestRisksAr: string[] = [];
  const diseaseAndPestRisksFr: string[] = [];
  const nutrientWeaknessesEn: string[] = [];
  const nutrientWeaknessesAr: string[] = [];
  const nutrientWeaknessesFr: string[] = [];
  const missingDiversityEn: string[] = [];
  const missingDiversityAr: string[] = [];
  const missingDiversityFr: string[] = [];
  const opportunitiesEn: string[] = [];
  const opportunitiesAr: string[] = [];
  const opportunitiesFr: string[] = [];

  if (validSequence) {
    for (let i = 1; i < crops.length; i++) {
      const prev = crops[i - 1];
      const curr = crops[i];
      if (prev.family === curr.family) {
        diseaseAndPestRisksEn.push(
          `Positions ${i}→${i + 1} repeat ${curr.family} (${prev.commonNameEn} → ${curr.commonNameEn}): ${curr.rotationCompatibility.sharedPathogensNoteEn}`
        );
        diseaseAndPestRisksAr.push(
          `المواضع ${i}→${i + 1} تكرر عائلة ${curr.family} (${prev.commonNameAr} ← ${curr.commonNameAr}): ${curr.rotationCompatibility.sharedPathogensNoteAr}`
        );
        diseaseAndPestRisksFr.push(
          `Positions ${i}→${i + 1} répètent ${curr.family} (${prev.commonNameFr} → ${curr.commonNameFr}) : ${curr.rotationCompatibility.sharedPathogensNoteFr}`
        );
      }
    }

    const hasLegume = crops.some((c) => c.nitrogenFixation.capable);
    if (!hasLegume) {
      nutrientWeaknessesEn.push('Sequence relies exclusively on non-N-fixing crops; lacks biological N2 fixation cycling.');
      nutrientWeaknessesAr.push('السلسلة تعتمد حصرياً على محاصيل غير مثبتة للنيتروجين وتفتقر للتثبيت الحيوي.');
      nutrientWeaknessesFr.push('La séquence ne comporte aucune légumineuse fixatrice d\'azote.');
      opportunitiesEn.push('Introducing an adapted legume (e.g., chickpea, dry beans, or alfalfa) adds botanical break and potential N cycling.');
      opportunitiesAr.push('إدخال محصول بقولي ملائم (مثل الحمص أو الفاصولياء الجافة أو الفصة) يكسر الآفات ويدعم دورة النيتروجين.');
      opportunitiesFr.push('L\'introduction d\'une légumineuse adaptée (pois chiche, haricot sec, luzerne) coupe les cycles parasitaires.');
    }
    if (residueMgmt === 'removed') {
      nutrientWeaknessesEn.push('Crop residues are removed off-field, lowering organic carbon and nutrient return.');
      nutrientWeaknessesAr.push('إزالة مخلفات المحاصيل خارج الحقل يقلص استرجاع المادة العضوية والعناصر الغذائية.');
      nutrientWeaknessesFr.push('L\'exportation des résidus hors parcelle réduit le retour de carbone organique et d\'éléments.');
    } else if (residueMgmt === 'grazed') {
      opportunitiesEn.push('Grazed residues cycle biomass through livestock; monitor surface cover compaction and manure return.');
      opportunitiesAr.push('رعي البقايا يدمج التبادل الحيواني؛ ينصح بمراقبة رص التربة السطحية وإرجاع السماد العضوي.');
      opportunitiesFr.push('Le pâturage des résidus valorise le fourrage ; surveiller le tassement et la restitution organique.');
    }

    const distinctFamilies = new Set(crops.map((c) => c.family));
    if (crops.length >= 2 && distinctFamilies.size === 1) {
      missingDiversityEn.push(`Single botanical family (${crops[0].family}) dominates the entire recorded sequence.`);
      missingDiversityAr.push(`عائلة نباتية واحدة (${crops[0].family}) تهيمن على كامل السلسلة المسجلة.`);
      missingDiversityFr.push(`Une seule famille botanique (${crops[0].family}) domine toute la séquence.`);
    }

    const zrValues = crops.map((c) => c.coefficients.rootDepthMaxM);
    const zrSpread = Math.max(...zrValues) - Math.min(...zrValues);
    const rootDepthRepetition = crops.length >= 2 && zrSpread < 0.25;
    if (rootDepthRepetition) {
      opportunitiesEn.push(`Root depth contrast is minimal (all ~${zrValues[0].toFixed(2)} m); alternating deep/moderate root crops diversifies extraction.`);
      opportunitiesAr.push(`تباين عمق الجذور محدود (~${zrValues[0].toFixed(2)}م)؛ التنويع بين الجذور العميقة والمتوسطة يحسن استغلال التربة.`);
      opportunitiesFr.push(`Contraste racinaire faible (~${zrValues[0].toFixed(2)} m) ; alterner enracinements profonds et intermédiaires.`);
    }

    const demandSet = new Set(crops.map((c) => c.climateSuitability.relativeWaterDemandClass));
    const waterDemandConcentration: BaselineSequenceAnalysis['waterDemandConcentration'] =
      demandSet.size === 1 ? crops[0].climateSuitability.relativeWaterDemandClass : 'mixed';

    if (waterDemandConcentration === 'high') {
      opportunitiesEn.push('Baseline concentrates high-water-demand crops; integrating lower-demand crops lowers seasonal drought vulnerability.');
      opportunitiesAr.push('النظام الحالي يركز على محاصيل عالية الاستهلاك المائي؛ إدخال محاصيل أقل احتياجاً يخفف مخاطر العجز المائي.');
      opportunitiesFr.push('Concentration de cultures exigeantes en eau ; intégrer des cultures plus sobres réduit la vulnérabilité.');
    }

    // Strict Soil Degradation Guardrail: Never label soil as degraded without evidence!
    const hasLowSocEvidence = soil.socPct !== null && soil.socPct < 0.8;
    const hasUserDegradationObs = Boolean(observedSoilNote && observedSoilNote.trim().length > 0);
    const soilConditionNoteEn = hasLowSocEvidence || hasUserDegradationObs
      ? `Supporting evidence flags soil organic matter / physical concern (${hasLowSocEvidence ? `topsoil SOC ${soil.socPct}% < 0.8%` : ''}${hasLowSocEvidence && hasUserDegradationObs ? '; ' : ''}${hasUserDegradationObs ? `farmer observation: "${observedSoilNote?.trim()}"` : ''}).`
      : soil.socPct !== null
      ? `Topsoil SOC estimate is ${soil.socPct}% (${soil.sourceLabel}); soil is NOT classified as degraded without direct lab/field confirmation.`
      : 'Soil Organic Carbon (SOC %) is unavailable; soil is NOT classified as degraded without field or laboratory evidence.';

    const soilConditionNoteAr = hasLowSocEvidence || hasUserDegradationObs
      ? `توجد مؤشرات تستدعي العناية بالتربة (${hasLowSocEvidence ? `نسبة الكربون العضوي SOC ${soil.socPct}% < 0.8%` : ''}${hasLowSocEvidence && hasUserDegradationObs ? '؛ ' : ''}${hasUserDegradationObs ? `ملاحظة الفلاح: "${observedSoilNote?.trim()}"` : ''}).`
      : soil.socPct !== null
      ? `تقدير الكربون العضوي بالتربة ${soil.socPct}% (${soil.sourceLabel})؛ لا تُصنّف التربة كمتدهورة بدون تأكيد مخبري أو ميداني.`
      : 'بيانات الكربون العضوي غير متوفرة؛ لا تُصنّف التربة كمتدهورة بدون دليل ميداني أو مخبري.';

    const soilConditionNoteFr = hasLowSocEvidence || hasUserDegradationObs
      ? `Des indices signalent une vigilance pédologique (${hasLowSocEvidence ? `SOC ${soil.socPct}% < 0,8%` : ''}${hasUserDegradationObs ? ` ; observation : "${observedSoilNote?.trim()}"` : ''}).`
      : soil.socPct !== null
      ? `SOC estimé à ${soil.socPct}% (${soil.sourceLabel}) ; le sol n'est PAS classé dégradé sans confirmation directe.`
      : 'SOC indisponible ; le sol n\'est PAS classé dégradé sans preuve de terrain ou de laboratoire.';

    return {
      sequenceCropIds,
      validSequence,
      invalidReasonsEn,
      invalidReasonsAr,
      invalidReasonsFr,
      repeatedFamilies,
      diseaseAndPestRisksEn,
      diseaseAndPestRisksAr,
      diseaseAndPestRisksFr,
      nutrientWeaknessesEn,
      nutrientWeaknessesAr,
      nutrientWeaknessesFr,
      waterDemandConcentration,
      rootDepthRepetition,
      missingDiversityEn,
      missingDiversityAr,
      missingDiversityFr,
      opportunitiesEn,
      opportunitiesAr,
      opportunitiesFr,
      missingInformationEn,
      missingInformationAr,
      missingInformationFr,
      soilConditionNoteEn,
      soilConditionNoteAr,
      soilConditionNoteFr,
    };
  }

  return {
    sequenceCropIds,
    validSequence: false,
    invalidReasonsEn,
    invalidReasonsAr,
    invalidReasonsFr,
    repeatedFamilies: [],
    diseaseAndPestRisksEn: [],
    diseaseAndPestRisksAr: [],
    diseaseAndPestRisksFr: [],
    nutrientWeaknessesEn: [],
    nutrientWeaknessesAr: [],
    nutrientWeaknessesFr: [],
    waterDemandConcentration: 'unknown',
    rootDepthRepetition: false,
    missingDiversityEn: [],
    missingDiversityAr: [],
    missingDiversityFr: [],
    opportunitiesEn: [],
    opportunitiesAr: [],
    opportunitiesFr: [],
    missingInformationEn,
    missingInformationAr,
    missingInformationFr,
    soilConditionNoteEn: 'Baseline sequence could not be validated.',
    soilConditionNoteAr: 'تعذر التحقق من سلسلة المحاصيل الحالية.',
    soilConditionNoteFr: 'La séquence de référence n\'a pas pu être validée.',
  };
}

interface SearchEdgeEval {
  allowed: boolean;
  edgeCost: number;
  subScores: Record<keyof TransitionWeightsConfig, number>;
  isBaselineCrop: boolean;
  isChangedFromPrevBaselineSlot: boolean;
  changeType: TransitionSeasonStep['changeType'];
  difficulty: TransitionDifficulty;
  estimatedWindowEtcMm: number | null;
  waterDeficitRisk: 'adequate' | 'deficit_risk' | 'high_deficit_risk';
}

function evaluateTransitionEdge(params: {
  candidate: GlobalRotationCropProfile;
  seasonNumber: number;
  seasonSlot: FarmingSeasonOption;
  historyIds: string[];
  baselineSet: Set<string>;
  baselineCrops: GlobalRotationCropProfile[];
  climate: ExtractedClimateIndicators;
  soil: ExtractedSoilIndicators;
  farmerContext: FarmerContextProfile;
  residueMgmt: CropResidueManagement;
  constraints: TransitionConstraints;
  weights: TransitionWeightsConfig;
  mode: 'recommended' | 'conservative' | 'alternative';
  resilienceFocus?: TransitionResilienceFocus;
}): SearchEdgeEval {
  const {
    candidate,
    seasonNumber,
    seasonSlot,
    historyIds,
    baselineSet,
    baselineCrops,
    climate,
    soil,
    farmerContext,
    residueMgmt,
    constraints,
    weights,
    mode,
    resilienceFocus,
  } = params;

  const rejectedEval: SearchEdgeEval = {
    allowed: false,
    edgeCost: Infinity,
    subScores: {
      agronomicCompatibility: 0,
      soilHealthObjectives: 0,
      waterAvailability: 0,
      economicFeasibility: 0,
      transitionMinimality: 0,
      farmerPreferences: 0,
      seasonalFeasibility: 0,
    },
    isBaselineCrop: baselineSet.has(candidate.id),
    isChangedFromPrevBaselineSlot: true,
    changeType: 'new_introduction',
    difficulty: 'high',
    estimatedWindowEtcMm: null,
    waterDeficitRisk: 'high_deficit_risk',
  };

  // 1. Farmer explicit rejection / unavailability check
  const decisions = constraints.cropDecisions || {};
  const globalDec = decisions[candidate.id];
  const stepDec = decisions[`s${seasonNumber}:${candidate.id}`];
  if (globalDec === 'rejected' || globalDec === 'unavailable' || stepDec === 'rejected' || stepDec === 'unavailable') {
    return rejectedEval;
  }

  // 2. Confirmed seed/local availability restriction when farmer disallows unfamiliar crops
  const unfamiliarAllowed =
    constraints.unfamiliarCropsAllowed !== null && constraints.unfamiliarCropsAllowed !== undefined
      ? constraints.unfamiliarCropsAllowed
      : farmerContext.culturalPractice === 'traditional_heritage'
      ? false
      : true;

  const confirmedAvail = (constraints.confirmedAvailableCrops || farmerContext.localContext.locallyAvailableCrops || []).map((s) =>
    s.trim().toLowerCase()
  );
  const familiarList = (farmerContext.localContext.familiarCrops || []).map((s) => s.trim().toLowerCase());

  const matchesList = (list: string[]) =>
    list.some((item) => {
      if (!item) return false;
      return (
        candidate.id.toLowerCase() === item ||
        candidate.commonNameEn.toLowerCase().includes(item) ||
        candidate.commonNameFr.toLowerCase().includes(item) ||
        candidate.commonNameAr.includes(item)
      );
    });

  const isConfirmedAvail = matchesList(confirmedAvail);
  const isFamiliar = matchesList(familiarList);
  const isBaselineCrop = baselineSet.has(candidate.id);

  if (!unfamiliarAllowed && !isBaselineCrop && !isFamiliar && confirmedAvail.length > 0 && !isConfirmedAvail) {
    return rejectedEval;
  }

  // 3. Hard Agronomic Rotation Rules (NEVER bypassed by high score)
  const prev1Id = historyIds[historyIds.length - 1];
  const prev1 = getGlobalRotationCropById(prev1Id);

  if (!candidate.isPerennial && prev1Id === candidate.id) {
    return rejectedEval;
  }

  if (
    candidate.category === 'perennial_tree' &&
    !isBaselineCrop &&
    farmerContext.localContext.season !== 'perennial_year_round'
  ) {
    return rejectedEval;
  }
  if (candidate.category === 'perennial_tree' && prev1Id === candidate.id && !isBaselineCrop) {
    return rejectedEval;
  }

  if (candidate.family === 'Solanaceae') {
    const recent3 = historyIds.slice(-3);
    const hasRecentSolanaceae = recent3.some((id) => getGlobalRotationCropById(id)?.family === 'Solanaceae');
    if (hasRecentSolanaceae) {
      return rejectedEval;
    }
  }

  if (candidate.id === 'alfalfa' && prev1Id === 'alfalfa') {
    return rejectedEval;
  }

  // 4. Hard Financial Constraint
  const effectiveCostCap =
    constraints.maxAcceptableCostTier ||
    (farmerContext.financialCapacity === 'low_input'
      ? 'low'
      : farmerContext.financialCapacity === 'moderate'
      ? 'moderate'
      : farmerContext.financialCapacity === 'high_investment'
      ? 'high'
      : null);

  if (effectiveCostCap === 'low' && candidate.socioEconomicProfile.inputRequirement === 'high') {
    return rejectedEval;
  }

  if (
    mode === 'alternative' &&
    (resilienceFocus === 'financial_accessibility' || resilienceFocus === 'water_conservation' || !resilienceFocus) &&
    candidate.socioEconomicProfile.inputRequirement === 'high'
  ) {
    return rejectedEval;
  }

  // 5. Hard Seasonal & Thermal Compatibility
  if (
    seasonSlot !== 'unspecified' &&
    !candidate.climateSuitability.suitableSeasons.includes(seasonSlot)
  ) {
    return rejectedEval;
  }

  if (seasonNumber === 1 && climate.tMinObservedC !== null && candidate.climateSuitability.frostSensitiveBelowC !== null) {
    if (climate.tMinObservedC < candidate.climateSuitability.frostSensitiveBelowC - 2) {
      return rejectedEval;
    }
  }

  // 6. Hard Water Availability Constraint
  const rainMm = climate.observedRainfallMm ?? 0;
  const peffWindow = climate.estimatedEffectiveRainWindowMm ?? 0;
  const et0Mean = climate.et0MeanMmDay ?? 3;
  const windowEt0Total = Math.max(1, et0Mean * Math.max(1, climate.observedWindowDays));
  const rainToEt0Ratio = rainMm / windowEt0Total;
  const isAridOrLowRain = rainMm < 35 || rainToEt0Ratio < 0.35;
  const isExtremeDesert = rainMm < 10 && et0Mean >= 4.0 && rainToEt0Ratio < 0.08;

  const estimatedWindowEtcMm = round1(et0Mean * candidate.seasonalMeanKc * climate.observedWindowDays);
  const netGapWindow = Math.max(0, estimatedWindowEtcMm - peffWindow);
  const waterCap = farmerContext.waterAndTechCapacity;

  if (waterCap === 'rainfed_only') {
    if (isExtremeDesert) {
      return rejectedEval;
    }
    if (
      isAridOrLowRain &&
      (candidate.climateSuitability.relativeWaterDemandClass === 'high' ||
        (candidate.climateSuitability.relativeWaterDemandClass === 'moderate' && rainMm < 20))
    ) {
      return rejectedEval;
    }
  }

  if (
    constraints.availableIrrigationMmPerSeason !== null &&
    constraints.availableIrrigationMmPerSeason !== undefined &&
    Number.isFinite(constraints.availableIrrigationMmPerSeason)
  ) {
    const midCycleDays = Math.round(
      (candidate.totalSeasonDaysRange[0] + candidate.totalSeasonDaysRange[1]) / 2
    );
    const scaleFactor = midCycleDays / Math.max(1, climate.observedWindowDays);
    const estSeasonalNetGap = netGapWindow * Math.min(4.5, Math.max(1, scaleFactor * 0.6));
    if (estSeasonalNetGap > constraints.availableIrrigationMmPerSeason * 1.15 + 40 && candidate.climateSuitability.relativeWaterDemandClass === 'high') {
      return rejectedEval;
    }
  }

  let waterDeficitRisk: SearchEdgeEval['waterDeficitRisk'] = 'adequate';
  if (waterCap === 'rainfed_only' || waterCap === null) {
    if (netGapWindow > estimatedWindowEtcMm * 0.65) waterDeficitRisk = 'high_deficit_risk';
    else if (netGapWindow > estimatedWindowEtcMm * 0.30) waterDeficitRisk = 'deficit_risk';
  } else if (waterCap === 'limited_irrigation') {
    if (candidate.climateSuitability.relativeWaterDemandClass === 'high' && netGapWindow > 65) {
      waterDeficitRisk = 'high_deficit_risk';
    } else if (netGapWindow * 0.6 > 25) {
      waterDeficitRisk = 'deficit_risk';
    }
  }

  // ---------------------------------------------------------------------------
  // SCORING ACROSS THE 7 CONFIGURABLE CRITERIA (each 0-100, cost = 100 - score)
  // ---------------------------------------------------------------------------
  // 1. Agronomic Compatibility
  let agrScore = 62;
  if (prev1) {
    if (prev1.family === candidate.family) {
      agrScore -= 26;
    } else if (candidate.rotationCompatibility.goodPredecessors.includes(prev1.family)) {
      agrScore += 24;
    }
    if (prev1.family === 'Poaceae' && candidate.family === 'Fabaceae') {
      agrScore += 14;
    } else if (prev1.family === 'Fabaceae' && candidate.family === 'Poaceae') {
      if (residueMgmt === 'incorporated' || residueMgmt === 'grazed') {
        agrScore += 16;
      } else if (residueMgmt === 'removed') {
        agrScore += 5; // Exported legume residues deliver markedly smaller N carry-over
      } else {
        agrScore += 10;
      }
    }
  }
  const historyFamilies = historyIds
    .map((id) => getGlobalRotationCropById(id)?.family)
    .filter((f): f is CropBotanicalFamily => Boolean(f));
  if (!historyFamilies.includes(candidate.family)) {
    agrScore += 8;
  }
  agrScore = clamp100(agrScore);

  // 2. Soil Health Objectives
  let soilScore = 58;
  if (prev1) {
    const zrDiff = Math.abs(candidate.coefficients.rootDepthMaxM - prev1.coefficients.rootDepthMaxM);
    if (zrDiff >= 0.45) soilScore += mode === 'alternative' && resilienceFocus === 'soil_structure' ? 24 : 16;
    else if (zrDiff >= 0.20) soilScore += 8;
  }
  if (candidate.nitrogenFixation.capable) {
    const legBoost =
      mode === 'alternative' && resilienceFocus === 'nutrient_cycling'
        ? 22
        : soil.socPct !== null && soil.socPct < 1.2
        ? 18
        : 12;
    soilScore += legBoost;
  }
  if (candidate.socioEconomicProfile.forageAndResidueValue.hasUsefulCropResidue) {
    soilScore += residueMgmt === 'incorporated' ? 10 : residueMgmt === 'removed' ? 2 : 6;
  }
  if (mode === 'alternative' && resilienceFocus === 'soil_structure' && candidate.rootCharacteristics.depthClass === 'deep') {
    soilScore += 14;
  }
  if (mode === 'alternative' && resilienceFocus === 'forage_production' && candidate.socioEconomicProfile.forageAndResidueValue.isDedicatedForage) {
    soilScore += 16;
  }
  if (soil.clayPct !== null && candidate.soilSuitability.heavyClayPenaltyThresholdPct !== null && soil.clayPct >= candidate.soilSuitability.heavyClayPenaltyThresholdPct) {
    soilScore -= 24;
  }
  if (soil.sandPct !== null && candidate.soilSuitability.coarseSandPenaltyThresholdPct !== null && soil.sandPct >= candidate.soilSuitability.coarseSandPenaltyThresholdPct) {
    soilScore -= 18;
  }
  soilScore = clamp100(soilScore);

  // 3. Water Availability
  let waterScore = waterDeficitRisk === 'adequate' ? 90 : waterDeficitRisk === 'deficit_risk' ? 62 : 34;
  if (candidate.climateSuitability.relativeWaterDemandClass === 'low_moderate') {
    waterScore += mode === 'alternative' && resilienceFocus === 'water_conservation' ? 14 : 6;
  } else if (
    candidate.climateSuitability.relativeWaterDemandClass === 'high' &&
    (waterCap === 'limited_irrigation' ||
      (mode === 'alternative' && (resilienceFocus === 'water_conservation' || resilienceFocus === 'climate_resilience')))
  ) {
    waterScore -= 20;
  }
  if (climate.rainfallAnomalyPercent !== null && climate.rainfallAnomalyPercent < -15 && candidate.climateSuitability.relativeWaterDemandClass === 'high') {
    waterScore -= 12;
  }
  waterScore = clamp100(waterScore);

  // 4. Economic Feasibility
  const req = candidate.socioEconomicProfile.inputRequirement;
  let econScore = 65;
  if (effectiveCostCap === 'low') {
    econScore = req === 'low' ? 94 : req === 'moderate' ? 54 : 18;
  } else if (effectiveCostCap === 'moderate') {
    econScore = req === 'low' ? 86 : req === 'moderate' ? 84 : 48;
  } else if (effectiveCostCap === 'high') {
    econScore = req === 'high' ? 84 : req === 'moderate' ? 84 : 76;
  } else {
    econScore = req === 'low' ? 76 : req === 'moderate' ? 66 : 42;
  }
  if (mode === 'alternative' && resilienceFocus === 'financial_accessibility') {
    if (req === 'low') econScore += 14;
    else if (req === 'moderate') econScore -= 4;
  }
  econScore = clamp100(econScore);

  // 5. Transition Minimality
  const baselineFamilies = new Set(baselineCrops.map((c) => c.family));
  let minScore = 50;
  let changeType: TransitionSeasonStep['changeType'] = 'new_introduction';
  let difficulty: TransitionDifficulty = req === 'high' ? 'high' : 'moderate';
  const isChangedFromPrevBaselineSlot = !isBaselineCrop;

  if (isBaselineCrop) {
    minScore = 95;
    changeType = 'retained';
    difficulty = 'low';
  } else if (baselineFamilies.has(candidate.family) || isFamiliar || isConfirmedAvail) {
    minScore = 76;
    changeType = 'minor_adjustment';
    difficulty = req === 'high' ? 'moderate' : 'low';
  } else {
    minScore = req === 'low' ? 62 : req === 'moderate' ? 48 : 30;
    changeType = 'new_introduction';
    difficulty = req === 'low' ? 'moderate' : 'high';
  }
  minScore = clamp100(minScore);

  // 6. Farmer Preferences & Resilience Focus
  let prefScore = 62;
  if (mode === 'alternative' && resilienceFocus === 'forage_production') {
    if (candidate.socioEconomicProfile.forageAndResidueValue.isDedicatedForage) {
      prefScore = 98 + (stepDec === 'accepted' || globalDec === 'accepted' ? 2 : 0);
    } else if (candidate.socioEconomicProfile.forageAndResidueValue.hasUsefulCropResidue) {
      prefScore = 44 + (stepDec === 'accepted' || globalDec === 'accepted' ? 16 : 0) + (isFamiliar ? 6 : 0);
    } else {
      prefScore = 18 + (stepDec === 'accepted' || globalDec === 'accepted' ? 16 : 0);
    }
  } else {
    if (stepDec === 'accepted' || globalDec === 'accepted') prefScore += 24;
    if (isFamiliar) prefScore += 12;
    if (isConfirmedAvail) prefScore += 8;
    const wantsLivestock =
      farmerContext.culturalPractice === 'mixed_crop_livestock' ||
      farmerContext.localContext.livestockIntegration === true;

    if (wantsLivestock) {
      if (candidate.socioEconomicProfile.forageAndResidueValue.isDedicatedForage) {
        prefScore += 20;
      } else if (candidate.socioEconomicProfile.forageAndResidueValue.hasUsefulCropResidue) {
        prefScore += 12;
      }
    }
    if (farmerContext.primaryGoal === 'food_security' && candidate.socioEconomicProfile.stapleFoodValue) {
      prefScore += 18;
    }
  }
  prefScore = clamp100(prefScore);

  // 7. Seasonal & Thermal Feasibility
  let seasScore = 75;
  if (climate.tMeanAvgC !== null) {
    const [optMin, optMax] = candidate.climateSuitability.optimalMeanTempRangeC;
    if (seasonNumber === 1) {
      seasScore = climate.tMeanAvgC >= optMin && climate.tMeanAvgC <= optMax ? 92 : 64;
    } else {
      seasScore = 82;
    }
  }
  if (mode === 'alternative' && resilienceFocus === 'climate_resilience') {
    const [optMin, optMax] = candidate.climateSuitability.optimalMeanTempRangeC;
    const thermalBreadth = optMax - optMin;
    if (thermalBreadth >= 12) seasScore += 8;
    if (candidate.climateSuitability.relativeWaterDemandClass === 'low_moderate') seasScore += 8;
  }
  seasScore = clamp100(seasScore);

  const subScores: Record<keyof TransitionWeightsConfig, number> = {
    agronomicCompatibility: agrScore,
    soilHealthObjectives: soilScore,
    waterAvailability: waterScore,
    economicFeasibility: econScore,
    transitionMinimality: minScore,
    farmerPreferences: prefScore,
    seasonalFeasibility: seasScore,
  };

  const stepWeightedUtility =
    agrScore * weights.agronomicCompatibility +
    soilScore * weights.soilHealthObjectives +
    waterScore * weights.waterAvailability +
    econScore * weights.economicFeasibility +
    minScore * weights.transitionMinimality +
    prefScore * weights.farmerPreferences +
    seasScore * weights.seasonalFeasibility;

  const edgeCost = Math.max(0.01, round2(100 - stepWeightedUtility));

  return {
    allowed: true,
    edgeCost,
    subScores,
    isBaselineCrop,
    isChangedFromPrevBaselineSlot,
    changeType,
    difficulty,
    estimatedWindowEtcMm,
    waterDeficitRisk,
  };
}

interface SearchNode {
  seasonIdx: number;
  pathIds: string[];
  edgeEvals: SearchEdgeEval[];
  totalCost: number;
  changesCount: number;
}

/**
 * Bounded Dijkstra / Uniform-Cost Search across multi-season transition graph.
 * Rejects disallowed ordered sequences AND disallowed unordered crop multisets
 * when enforcing distinct strategies (blocking empty crop-reorderings).
 */
function runDijkstraTransitionSearch(params: {
  horizonSeasons: 3 | 4;
  seasonSchedule: FarmingSeasonOption[];
  baselineCropIds: string[];
  baselineCrops: GlobalRotationCropProfile[];
  climate: ExtractedClimateIndicators;
  soil: ExtractedSoilIndicators;
  farmerContext: FarmerContextProfile;
  residueMgmt: CropResidueManagement;
  constraints: TransitionConstraints;
  weights: TransitionWeightsConfig;
  mode: 'recommended' | 'conservative' | 'alternative';
  resilienceFocus?: TransitionResilienceFocus;
  disallowedSequenceKey?: string[];
  disallowedMultisets?: string[];
  requireImprovementOverBaseline: boolean;
}): SearchNode | null {
  const {
    horizonSeasons,
    seasonSchedule,
    baselineCropIds,
    baselineCrops,
    climate,
    soil,
    farmerContext,
    residueMgmt,
    constraints,
    weights,
    mode,
    resilienceFocus,
    disallowedSequenceKey = [],
    disallowedMultisets = [],
    requireImprovementOverBaseline,
  } = params;

  const baselineSet = new Set(baselineCropIds);
  const maxChangesAllowed =
    typeof constraints.maxTransitionChanges === 'number' && constraints.maxTransitionChanges >= 0
      ? constraints.maxTransitionChanges
      : mode === 'conservative'
      ? Math.max(1, Math.ceil(horizonSeasons / 2))
      : horizonSeasons;

  const queue: SearchNode[] = [
    {
      seasonIdx: 0,
      pathIds: [],
      edgeEvals: [],
      totalCost: 0,
      changesCount: 0,
    },
  ];

  const visitedBestCost = new Map<string, number>();

  while (queue.length > 0) {
    queue.sort((a, b) => {
      const cDiff = a.totalCost - b.totalCost;
      if (Math.abs(cDiff) > 1e-6) return cDiff;
      return a.pathIds.join('>').localeCompare(b.pathIds.join('>'));
    });

    const curr = queue.shift()!;

    if (curr.seasonIdx === horizonSeasons) {
      const seqKey = curr.pathIds.join('>');
      if (disallowedSequenceKey.includes(seqKey)) {
        continue;
      }

      const multisetKey = getMultisetKey(curr.pathIds);
      if (disallowedMultisets.includes(multisetKey)) {
        continue;
      }

      if (requireImprovementOverBaseline) {
        const distinctFamilies = new Set(
          curr.pathIds.map((id) => getGlobalRotationCropById(id)?.family).filter(Boolean)
        );
        if (baselineCropIds.length >= 2 && distinctFamilies.size < 2) {
          continue;
        }
      }

      return curr;
    }

    const seasonNumber = curr.seasonIdx + 1;
    const seasonSlot = seasonSchedule[curr.seasonIdx];
    const fullHistory = [...baselineCropIds, ...curr.pathIds];

    for (const candidate of GLOBAL_ROTATION_CROP_DATABASE) {
      const edge = evaluateTransitionEdge({
        candidate,
        seasonNumber,
        seasonSlot,
        historyIds: fullHistory,
        baselineSet,
        baselineCrops,
        climate,
        soil,
        farmerContext,
        residueMgmt,
        constraints,
        weights,
        mode,
        resilienceFocus,
      });

      if (!edge.allowed) continue;

      const nextChanges = curr.changesCount + (edge.isChangedFromPrevBaselineSlot ? 1 : 0);
      if (nextChanges > maxChangesAllowed) continue;

      const nextPath = [...curr.pathIds, candidate.id];
      const nextCost = round2(curr.totalCost + edge.edgeCost);

      const recent3 = [...fullHistory, candidate.id].slice(-3);
      const solanWait = recent3.reduce(
        (acc, id, idx) => (getGlobalRotationCropById(id)?.family === 'Solanaceae' ? idx + 1 : acc),
        0
      );
      const prevFamily = getGlobalRotationCropById(fullHistory[fullHistory.length - 1])?.family || 'none';
      const stateKey = `${seasonNumber}|${candidate.id}|${prevFamily}|s${solanWait}|c${nextChanges}|d${
        new Set(nextPath.map((id) => getGlobalRotationCropById(id)?.family)).size
      }|m${
        disallowedMultisets.length > 0 ? getMultisetKey(nextPath) : ''
      }`;

      const bestSoFar = visitedBestCost.get(stateKey);
      if (bestSoFar !== undefined && bestSoFar <= nextCost) {
        continue;
      }
      visitedBestCost.set(stateKey, nextCost);

      queue.push({
        seasonIdx: seasonNumber,
        pathIds: nextPath,
        edgeEvals: [...curr.edgeEvals, edge],
        totalCost: nextCost,
        changesCount: nextChanges,
      });
    }
  }

  return null;
}

function buildPathwayOption(params: {
  mode: 'recommended' | 'conservative' | 'alternative';
  resilienceFocus?: TransitionResilienceFocus;
  node: SearchNode;
  seasonSchedule: FarmingSeasonOption[];
  baseline: BaselineSequenceAnalysis;
  climate: ExtractedClimateIndicators;
  soil: ExtractedSoilIndicators;
  farmerContext: FarmerContextProfile;
  residueMgmt: CropResidueManagement;
  constraints: TransitionConstraints;
  weights: TransitionWeightsConfig;
}): TransitionPathwayOption {
  const {
    mode,
    resilienceFocus,
    node,
    seasonSchedule,
    baseline,
    climate,
    soil,
    farmerContext,
    residueMgmt,
    constraints,
    weights,
  } = params;

  const altFocusEn = resilienceFocus ? getFocusLabel(resilienceFocus, 'en') : 'Water & Cost Resilience';
  const altFocusAr = resilienceFocus ? getFocusLabel(resilienceFocus, 'ar') : 'الترشيد المائي والكلفة';
  const altFocusFr = resilienceFocus ? getFocusLabel(resilienceFocus, 'fr') : 'Sobriété hydrique & intrants';

  const titles = {
    recommended: {
      en: 'Strategy B — Gradual Sustainable Transition',
      ar: 'الاستراتيجية ب — الانتقال المتدرج المستدام',
      fr: 'Stratégie B — Transition graduelle durable',
    },
    conservative: {
      en: 'Conservative Pathway (Minimal Disruption)',
      ar: 'المسار المحافظ (أقل تعديل ممكن)',
      fr: 'Trajectoire conservatrice (changement minimal)',
    },
    alternative: {
      en: `Strategy C — Alternative Resilience (${altFocusEn})`,
      ar: `الاستراتيجية ج — البديل التكيفي (${altFocusAr})`,
      fr: `Stratégie C — Résilience alternative (${altFocusFr})`,
    },
  };

  const steps: TransitionSeasonStep[] = [];
  const fullHistory = [...baseline.sequenceCropIds];

  for (let i = 0; i < node.pathIds.length; i++) {
    const crop = getGlobalRotationCropById(node.pathIds[i])!;
    const evalItem = node.edgeEvals[i];
    const prevCrop = getGlobalRotationCropById(fullHistory[fullHistory.length - 1])!;
    const seasonNumber = i + 1;
    const seasonSlot = seasonSchedule[i];

    const reasonEn = evalItem.isBaselineCrop
      ? `Retains familiar crop ${crop.commonNameEn} after breaking with ${prevCrop.commonNameEn} (${prevCrop.family}), keeping existing market and equipment continuity.`
      : crop.family === 'Fabaceae'
      ? `Introduces ${crop.commonNameEn} (${crop.family}) after ${prevCrop.commonNameEn} (${prevCrop.family}) to break shared pest/disease cycles and vary rooting depth (${prevCrop.coefficients.rootDepthMaxM}→${crop.coefficients.rootDepthMaxM} m).`
      : `Transitions to ${crop.commonNameEn} (${crop.family}) for botanical-family diversity and seasonal suitability (${seasonSlot}).`;

    const reasonAr = evalItem.isBaselineCrop
      ? `يحافظ على محصول ${crop.commonNameAr} المألوف بعد كسر التسلسل بـ ${prevCrop.commonNameAr}، مما يحافظ على الاستمرارية التسويقية والمعدات.`
      : crop.family === 'Fabaceae'
      ? `يدخل ${crop.commonNameAr} (${crop.family}) بعد ${prevCrop.commonNameAr} لكسر دورة الآفات وتنويع عمق الجذور.`
      : `ينتقل إلى ${crop.commonNameAr} (${crop.family}) لتنويع العائلات النباتية وملاءمة الموسم.`;

    const reasonFr = evalItem.isBaselineCrop
      ? `Maintient la culture familière ${crop.commonNameFr} après coupure par ${prevCrop.commonNameFr}, préservant équipements et débouchés.`
      : crop.family === 'Fabaceae'
      ? `Introduit ${crop.commonNameFr} (${crop.family}) après ${prevCrop.commonNameFr} pour couper les bioagresseurs et varier l'enracinement.`
      : `Introduite pour diversifier la famille botanique (${crop.family}) en accord avec la fenêtre ${seasonSlot}.`;

    const nExpEn = crop.nitrogenFixation.capable
      ? `Biological N2 fixation potential (${crop.nitrogenFixation.estimatedRangeKgNPerHa?.[0]}–${crop.nitrogenFixation.estimatedRangeKgNPerHa?.[1]} kg N/ha literature range) only under verified Rhizobium nodulation and residue retention; does NOT guarantee a specific soil nitrogen gain.`
      : null;
    const nExpAr = crop.nitrogenFixation.capable
      ? `تثبيت نيتروجيني حيوي محتمل (${crop.nitrogenFixation.estimatedRangeKgNPerHa?.[0]}–${crop.nitrogenFixation.estimatedRangeKgNPerHa?.[1]} كغ/هكتار حسب المراجع) مشروط بنجاعة العقد البكتيرية وإبقاء البقايا ولا يضمن زيادة محددة تلقائياً.`
      : null;
    const nExpFr = crop.nitrogenFixation.capable
      ? `Fixation symbiotique potentielle (${crop.nitrogenFixation.estimatedRangeKgNPerHa?.[0]}–${crop.nitrogenFixation.estimatedRangeKgNPerHa?.[1]} kg N/ha selon littérature) conditionnée à la nodulation et au maintien des résidus ; aucun gain chiffré garanti.`
      : null;

    const soilConsEn = `${crop.rootCharacteristics.notesEn}${soil.socPct === null ? ' Topsoil SOC % unmeasured.' : ` Current ${soil.isSpatialModel ? 'SoilGrids' : 'reported'} topsoil SOC: ${soil.socPct}%.`}`;
    const soilConsAr = `${crop.rootCharacteristics.notesAr}${soil.socPct === null ? ' نسبة الكربون العضوي بالتربة غير مقاسة.' : ` الكربون العضوي السطحي: ${soil.socPct}%.`}`;
    const soilConsFr = `${crop.rootCharacteristics.notesFr}${soil.socPct === null ? ' SOC non mesuré.' : ` SOC de surface : ${soil.socPct}%.`}`;

    const actionsEn: string[] = [];
    const actionsAr: string[] = [];
    const actionsFr: string[] = [];
    if (crop.nitrogenFixation.requiresInoculationCheck) {
      actionsEn.push('Verify local seed availability and check Rhizobium inoculant compatibility before sowing.');
      actionsAr.push('التأكد من توفر البذور محلياً وفحص الحاجة لتلقيح العقد البكتيرية قبل الزرع.');
      actionsFr.push('Vérifier la disponibilité des semences et l\'inoculation Rhizobium avant semis.');
    } else {
      actionsEn.push('Confirm local planting-window dates and retain non-diseased crop residues on-field where feasible.');
      actionsAr.push('تأكيد موعد الزرع المحلي وإبقاء المخلفات السليمة بالحقل قدر الإمكان.');
      actionsFr.push('Confirmer les dates locales de semis et conserver les résidus sains si possible.');
    }

    const stepMissing: string[] = [];
    if (soil.socPct === null) stepMissing.push('Soil Organic Carbon (SOC %)');
    if (farmerContext.waterAndTechCapacity === null) stepMissing.push('Confirmed irrigation infrastructure/water quota');
    if (crop.socioEconomicProfile.commercialMarketChannelDependent) stepMissing.push('Verified local buyer/price channel');

    steps.push({
      seasonNumber,
      seasonSlot,
      cropId: crop.id,
      commonNameEn: crop.commonNameEn,
      commonNameAr: crop.commonNameAr,
      commonNameFr: crop.commonNameFr,
      scientificName: crop.scientificName,
      family: crop.family,
      category: crop.category,
      isExistingBaselineCrop: evalItem.isBaselineCrop,
      changeType: evalItem.changeType,
      transitionDifficulty: evalItem.difficulty,
      waterDemandClass: crop.climateSuitability.relativeWaterDemandClass,
      estimatedWindowEtcMm: evalItem.estimatedWindowEtcMm,
      reasonSelectedEn: reasonEn,
      reasonSelectedAr: reasonAr,
      reasonSelectedFr: reasonFr,
      soilHealthConsiderationsEn: soilConsEn,
      soilHealthConsiderationsAr: soilConsAr,
      soilHealthConsiderationsFr: soilConsFr,
      nitrogenExpectationEn: nExpEn,
      nitrogenExpectationAr: nExpAr,
      nitrogenExpectationFr: nExpFr,
      mainAgronomicBenefitEn:
        crop.family === 'Fabaceae'
          ? 'Disease-cycle break + potential biological N2 fixation'
          : evalItem.isBaselineCrop
          ? 'Operational continuity on diversified rotation slot'
          : `Botanical diversity (${crop.family}) & root-zone shift (${crop.coefficients.rootDepthMaxM} m)`,
      mainAgronomicBenefitAr:
        crop.family === 'Fabaceae'
          ? 'كسر دورة الأمراض + تثبيت حيوي محتمل للنيتروجين'
          : evalItem.isBaselineCrop
          ? 'استمرارية العمليات الزراعية مع تباعد الأجيال'
          : `تنويع عائلي (${crop.family}) واختلاف عمق الجذور`,
      mainAgronomicBenefitFr:
        crop.family === 'Fabaceae'
          ? 'Coupure sanitaire + fixation symbiotique potentielle'
          : evalItem.isBaselineCrop
          ? 'Continuité technique sur créneau diversifié'
          : `Diversité botanique (${crop.family}) & enracinement (${crop.coefficients.rootDepthMaxM} m)`,
      risksAndLimitationsEn: [crop.kcConditionsNoteEn],
      risksAndLimitationsAr: [crop.kcConditionsNoteAr],
      risksAndLimitationsFr: [crop.kcConditionsNoteFr],
      requiredFarmerActionsEn: actionsEn,
      requiredFarmerActionsAr: actionsAr,
      requiredFarmerActionsFr: actionsFr,
      missingInformation: stepMissing,
    });

    fullHistory.push(crop.id);
  }

  const keys = Object.keys(weights) as Array<keyof TransitionWeightsConfig>;
  const avgSubs = {} as Record<keyof TransitionWeightsConfig, number>;
  const contributions = {} as Record<keyof TransitionWeightsConfig, number>;
  let composite = 0;

  for (const k of keys) {
    const avg = Math.round(
      node.edgeEvals.reduce((acc, ev) => acc + ev.subScores[k], 0) / Math.max(1, node.edgeEvals.length)
    );
    avgSubs[k] = avg;
    const contrib = round1(avg * weights[k]);
    contributions[k] = contrib;
    composite += contrib;
  }

  const distinctFamilies = Array.from(new Set(steps.map((s) => s.family)));
  const minZr = Math.min(...steps.map((s) => getGlobalRotationCropById(s.cropId)!.coefficients.rootDepthMaxM));
  const maxZr = Math.max(...steps.map((s) => getGlobalRotationCropById(s.cropId)!.coefficients.rootDepthMaxM));
  const hasHighRiskStep = node.edgeEvals.some((e) => e.waterDeficitRisk === 'high_deficit_risk');
  const hasDeficitRiskStep = node.edgeEvals.some((e) => e.waterDeficitRisk !== 'adequate');

  const missingCoreForHigh =
    soil.socPct === null ||
    soil.isSpatialModel ||
    farmerContext.waterAndTechCapacity === null ||
    farmerContext.financialCapacity === null ||
    climate.observedWindowDays < 14 ||
    baseline.sequenceCropIds.length < 2;

  const majorGapsForLow =
    (soil.socPct === null && farmerContext.waterAndTechCapacity === null) ||
    soil.sourceKind === 'farmer_texture_table19' ||
    hasHighRiskStep;

  const confidence: TransitionPathwayOption['confidence'] = majorGapsForLow
    ? 'LOW'
    : missingCoreForHigh
    ? 'MODERATE'
    : 'HIGH';

  const confReasonsEn: string[] = [];
  const confReasonsAr: string[] = [];
  const confReasonsFr: string[] = [];
  if (soil.isSpatialModel) {
    confReasonsEn.push('Soil hydraulics & SOC come from 250 m SoilGrids spatial estimates, not laboratory tests.');
    confReasonsAr.push('خصائص التربة مستمدة من تقديرات SoilGrids بدقة 250م وليس من تحليل مخبري.');
    confReasonsFr.push('Propriétés du sol estimées via SoilGrids (250 m) et non par analyse de laboratoire.');
  }
  if (soil.socPct === null) {
    confReasonsEn.push('Soil Organic Carbon (SOC %) is unavailable.');
    confReasonsAr.push('الكربون العضوي للتربة غير متوفر.');
    confReasonsFr.push('Carbone organique (SOC) indisponible.');
  }
  if (farmerContext.waterAndTechCapacity === null || farmerContext.financialCapacity === null) {
    confReasonsEn.push('Irrigation infrastructure or financial capacity was left unspecified.');
    confReasonsAr.push('لم تُحدد القدرة المائية أو المالية بشكل صريح.');
    confReasonsFr.push('Capacité hydrique ou financière non précisée.');
  }
  if (climate.observedWindowDays < 35) {
    confReasonsEn.push(`Climate check relies on ${climate.observedWindowDays}-day NASA POWER window rather than multi-year site series.`);
    confReasonsAr.push(`التقييم المناخي يعتمد على نافذة رصد قصيرة (${climate.observedWindowDays} يوماً) من NASA POWER.`);
    confReasonsFr.push(`L'analyse climatique repose sur une fenêtre de ${climate.observedWindowDays} j NASA POWER.`);
  }

  const familyDiversity: TransitionEvaluationBadge =
    distinctFamilies.length >= 2 ? 'suitable' : 'caution';
  const soilHealth: TransitionEvaluationBadge =
    soil.socPct === null ? 'insufficient_data' : soil.isSpatialModel || avgSubs.soilHealthObjectives < 70 ? 'caution' : 'suitable';
  const waterCompatibility: TransitionEvaluationBadge =
    farmerContext.waterAndTechCapacity === null
      ? 'insufficient_data'
      : hasHighRiskStep || hasDeficitRiskStep
      ? 'caution'
      : 'suitable';
  const economicFeasibility: TransitionEvaluationBadge =
    farmerContext.financialCapacity === null && !constraints.maxAcceptableCostTier
      ? 'insufficient_data'
      : avgSubs.economicFeasibility < 65
      ? 'caution'
      : 'suitable';
  const seasonalCompatibility: TransitionEvaluationBadge =
    seasonSchedule.every((s) => s === 'unspecified')
      ? 'caution'
      : 'suitable';

  const retainedNamesEn = steps.filter((s) => s.isExistingBaselineCrop).map((s) => s.commonNameEn);
  const retainedNamesAr = steps.filter((s) => s.isExistingBaselineCrop).map((s) => s.commonNameAr);
  const retainedNamesFr = steps.filter((s) => s.isExistingBaselineCrop).map((s) => s.commonNameFr);

  // 8 Explicit Explainability Items
  const whyGeneratedEn =
    mode === 'recommended'
      ? `Generated to resolve baseline weaknesses (${baseline.repeatedFamilies.length > 0 ? 'repeated family hosts' : 'single-crop functional uniformity'}) across ${steps.length} seasons while preserving ${retainedNamesEn.length > 0 ? Array.from(new Set(retainedNamesEn)).join(', ') : 'practical operational continuity'}.`
      : mode === 'conservative'
      ? `Generated to limit crop substitutions (${node.changesCount} change(s) across ${steps.length} seasons) for farmers needing low operational risk and gradual adaptation.`
      : `Generated as a structurally distinct crop composition emphasizing ${altFocusEn}, avoiding simple reorderings of the same crops used in Strategy B.`;

  const whyGeneratedAr =
    mode === 'recommended'
      ? `أُنشئت هذه الاستراتيجية لمعالجة نقاط ضعف النظام الحالي عبر ${steps.length} مواسم مع الحفاظ على التدرج العملي والجدوى الميدانية.`
      : mode === 'conservative'
      ? `أُنشئ هذا المسار لتقليص التعديلات إلى أدنى حد (${node.changesCount} تغيير خلال ${steps.length} مواسم) وتفادي المخاطرة التشغيلية المفاجئة.`
      : `أُنشئت كبديل بتركيبة محصولية مختلفة فعلياً يركّز على أولوية "${altFocusAr}" دون إعادة ترتيب نفس المحاصيل فحسب.`;

  const whyGeneratedFr =
    mode === 'recommended'
      ? `Générée pour corriger les faiblesses de la rotation actuelle sur ${steps.length} saisons tout en maintenant une continuité opérationnelle.`
      : mode === 'conservative'
      ? `Conçue pour limiter les substitutions (${node.changesCount} changement(s) sur ${steps.length} saisons) afin de réduire le risque d'adoption.`
      : `Conçue comme composition distincte priorisant « ${altFocusFr} », sans simple réordonnancement de la stratégie B.`;

  const prioritiesAddressedEn = [
    `Primary objective: ${farmerContext.primaryGoal || 'Balanced sustainability'}`,
    ...(mode === 'alternative' ? [`Resilience focus: ${altFocusEn}`] : []),
    `Water access: ${farmerContext.waterAndTechCapacity || 'Unspecified (conservative 0 mm assumption)'}`,
    `Input tier: ${constraints.maxAcceptableCostTier || farmerContext.financialCapacity || 'Moderate default'}`,
    `Residue handling: ${residueMgmt}`,
  ];
  const prioritiesAddressedAr = [
    `الهدف الرئيسي: ${farmerContext.primaryGoal || 'توازن زراعي عام'}`,
    ...(mode === 'alternative' ? [`تركيز المرونة البديلة: ${altFocusAr}`] : []),
    `القدرة المائية: ${farmerContext.waterAndTechCapacity || 'غير محددة'}`,
    `سقف المدخلات: ${constraints.maxAcceptableCostTier || farmerContext.financialCapacity || 'متوسط'}`,
    `تدبير البقايا: ${residueMgmt}`,
  ];
  const prioritiesAddressedFr = [
    `Objectif principal : ${farmerContext.primaryGoal || 'Équilibre agronomique'}`,
    ...(mode === 'alternative' ? [`Priorité de résilience : ${altFocusFr}`] : []),
    `Capacité hydrique : ${farmerContext.waterAndTechCapacity || 'Non précisée'}`,
    `Budget intrants : ${constraints.maxAcceptableCostTier || farmerContext.financialCapacity || 'Modéré'}`,
    `Gestion des résidus : ${residueMgmt}`,
  ];

  const environmentalDriversEn = [
    `Mean ET0 = ${climate.et0MeanMmDay} mm/day over ${climate.observedWindowDays}-day NASA POWER window (ending ${climate.observationEndDate || 'N/A'}).`,
    `Observed rainfall = ${climate.observedRainfallMm} mm (SCS effective rain ≈ ${climate.estimatedEffectiveRainWindowMm} mm).`,
    `Soil (${soil.sourceLabel}): θFC=${soil.thetaFc} m³/m³, θWP=${soil.thetaWp} m³/m³${soil.clayPct !== null ? `, Clay=${soil.clayPct}%, Sand=${soil.sandPct}%` : ''}${soil.socPct !== null ? `, SOC=${soil.socPct}%` : ''}.`,
  ];
  const environmentalDriversAr = [
    `متوسط التبخر المرجعي ET0 = ${climate.et0MeanMmDay} مم/يوم خلال ${climate.observedWindowDays} يوماً (NASA POWER).`,
    `الأمطار المرصودة = ${climate.observedRainfallMm} مم (الفعالة SCS ≈ ${climate.estimatedEffectiveRainWindowMm} مم).`,
    `التربة (${soil.sourceLabel}): θFC=${soil.thetaFc}، θWP=${soil.thetaWp} م³/م³${soil.socPct !== null ? `، SOC=${soil.socPct}%` : ''}.`,
  ];
  const environmentalDriversFr = [
    `ET0 moyen = ${climate.et0MeanMmDay} mm/j sur fenêtre NASA POWER de ${climate.observedWindowDays} j.`,
    `Pluie observée = ${climate.observedRainfallMm} mm (pluie efficace SCS ≈ ${climate.estimatedEffectiveRainWindowMm} mm).`,
    `Sol (${soil.sourceLabel}) : θFC=${soil.thetaFc}, θWP=${soil.thetaWp} m³/m³${soil.socPct !== null ? `, SOC=${soil.socPct}%` : ''}.`,
  ];

  const requiredFarmerActionsEn = Array.from(new Set(steps.flatMap((s) => s.requiredFarmerActionsEn)));
  const requiredFarmerActionsAr = Array.from(new Set(steps.flatMap((s) => s.requiredFarmerActionsAr)));
  const requiredFarmerActionsFr = Array.from(new Set(steps.flatMap((s) => s.requiredFarmerActionsFr)));

  const uniqueStepMissing = Array.from(new Set([
    ...baseline.missingInformationEn,
    ...steps.flatMap((s) => s.missingInformation),
  ]));
  const missingInformationEn = uniqueStepMissing;
  const missingInformationAr = Array.from(new Set([
    ...baseline.missingInformationAr,
    ...(soil.socPct === null ? ['نسبة الكربون العضوي للتربة (SOC %)'] : []),
    ...(farmerContext.waterAndTechCapacity === null ? ['تأكيد قدرة وحصة مياه الري'] : []),
  ]));
  const missingInformationFr = Array.from(new Set([
    ...baseline.missingInformationFr,
    ...(soil.socPct === null ? ['Teneur en carbone organique (SOC %)'] : []),
    ...(farmerContext.waterAndTechCapacity === null ? ['Capacité et quota d\'irrigation'] : []),
  ]));

  const dataLimitationNoticeEn =
    'NASA POWER (~50 km grid) is agroclimatological assimilation, NOT a field weather station or in-situ soil moisture sensor. ISRIC SoilGrids (250 m) is a spatial prediction, NOT a parcel lab soil test. Direct SMAP, GPM IMERG, NDVI, and ECOSTRESS imagery are NOT used in rotation transition scoring.';
  const dataLimitationNoticeAr =
    'بيانات NASA POWER (شبكة ~50 كم) هي استيعاب مناخي وليست محطة رصد ميدانية أو حساس رطوبة تربة؛ كما أن SoilGrids (250م) تقدير مكاني وليس تحليلاً مخبرياً للحقل. لا يتم استخدام بيانات SMAP أو GPM أو NDVI أو ECOSTRESS في هذا المحرك.';
  const dataLimitationNoticeFr =
    'NASA POWER (~50 km) est une réanalyse agroclimatique et non une station locale ni un capteur d\'humidité du sol ; SoilGrids (250 m) est une estimation spatiale et non une analyse de laboratoire. Aucune donnée SMAP, GPM, NDVI ou ECOSTRESS n\'est utilisée.';

  return {
    pathwayType: mode,
    resilienceFocusUsed: mode === 'alternative' ? resilienceFocus : undefined,
    titleEn: titles[mode].en,
    titleAr: titles[mode].ar,
    titleFr: titles[mode].fr,
    cropSequence: [...node.pathIds],
    steps,
    changesFromCurrentCount: node.changesCount,
    whyGeneratedEn,
    whyGeneratedAr,
    whyGeneratedFr,
    prioritiesAddressedEn,
    prioritiesAddressedAr,
    prioritiesAddressedFr,
    environmentalDriversEn,
    environmentalDriversAr,
    environmentalDriversFr,
    requiredFarmerActionsEn,
    requiredFarmerActionsAr,
    requiredFarmerActionsFr,
    missingInformationEn,
    missingInformationAr,
    missingInformationFr,
    dataLimitationNoticeEn,
    dataLimitationNoticeAr,
    dataLimitationNoticeFr,
    waterDemandAssessmentEn: `Window ET0 mean = ${climate.et0MeanMmDay} mm/d; pathway spans ${Array.from(
      new Set(steps.map((s) => s.waterDemandClass))
    ).join(', ')} demand classes.${hasDeficitRiskStep ? ' Supplemental irrigation or rainfed drought buffer required.' : ''}`,
    waterDemandAssessmentAr: `متوسط ET0 المرصود = ${climate.et0MeanMmDay} مم/يوم؛ تتوزع مستويات الاستهلاك المائي بين فئات المحاصيل المختارة.${hasDeficitRiskStep ? ' يتطلب متابعة العجز المائي أو الري التكميلي.' : ''}`,
    waterDemandAssessmentFr: `ET0 moyen = ${climate.et0MeanMmDay} mm/j ; classes hydriques : ${Array.from(
      new Set(steps.map((s) => s.waterDemandClass))
    ).join(', ')}.${hasDeficitRiskStep ? ' Vigilance déficit hydrique requise.' : ''}`,
    mainAdvantagesEn: [
      `Spans ${distinctFamilies.length} botanical families (${distinctFamilies.join(', ')}).`,
      `Diversifies rooting depth from ${minZr.toFixed(2)} m to ${maxZr.toFixed(2)} m.`,
      ...(steps.some((s) => getGlobalRotationCropById(s.cropId)?.nitrogenFixation.capable)
        ? ['Integrates biological N2-fixing legume crop(s) without replacing soil fertility testing.']
        : []),
    ],
    mainAdvantagesAr: [
      `يغطي ${distinctFamilies.length} عائلات نباتية (${distinctFamilies.join('، ')}).`,
      `ينوع عمق الجذور من ${minZr.toFixed(2)}م إلى ${maxZr.toFixed(2)}م.`,
      ...(steps.some((s) => getGlobalRotationCropById(s.cropId)?.nitrogenFixation.capable)
        ? ['يدمج محاصيل بقولية مع الحفاظ على التوصية بتحليل التربة.']
        : []),
    ],
    mainAdvantagesFr: [
      `Couvre ${distinctFamilies.length} familles botaniques (${distinctFamilies.join(', ')}).`,
      `Diversifie l'enracinement de ${minZr.toFixed(2)} m à ${maxZr.toFixed(2)} m.`,
      ...(steps.some((s) => getGlobalRotationCropById(s.cropId)?.nitrogenFixation.capable)
        ? ['Intègre une légumineuse fixatrice d\'azote sans remplacer l\'analyse de sol.']
        : []),
    ],
    economicOrOperationalLimitationsEn: [
      `${node.changesCount} of ${steps.length} season(s) introduce adjusted or non-baseline crops.`,
      ...(farmerContext.financialCapacity === null
        ? ['Farmer financial capacity unspecified; input affordability unconfirmed.']
        : []),
      'Crop yields, local prices, and seed market stock are not pre-assumed or fabricated.',
    ],
    economicOrOperationalLimitationsAr: [
      `${node.changesCount} من أصل ${steps.length} مواسم تتطلب محاصيل معدلة أو جديدة مقارنة بالسلسلة الحالية.`,
      ...(farmerContext.financialCapacity === null
        ? ['القدرة المالية غير محددة؛ يرجى التحقق من كلفة البذور والمدخلات.']
        : []),
      'لا تُفترض أو تُختلق أي عوائد مالية أو غلات أو أسعار سوق غير مؤكدة.',
    ],
    economicOrOperationalLimitationsFr: [
      `${node.changesCount} saison(s) sur ${steps.length} modifient la sole actuelle.`,
      ...(farmerContext.financialCapacity === null
        ? ['Capacité financière non précisée ; faisabilité économique à confirmer.']
        : []),
      'Rendements, prix locaux et disponibilité semencière non fabriqués.',
    ],
    cumulativeOutcomes: {
      quantifiedCalculationsEn: [
        `${distinctFamilies.length} botanical families over ${steps.length} seasons`,
        `Rooting depth contrast: ${minZr.toFixed(2)}–${maxZr.toFixed(2)} m`,
        `Changes from baseline: ${node.changesCount} season slots`,
      ],
      quantifiedCalculationsAr: [
        `${distinctFamilies.length} عائلات نباتية على مدى ${steps.length} مواسم`,
        `مدى عمق الجذور: ${minZr.toFixed(2)}–${maxZr.toFixed(2)} م`,
        `عدد التغييرات عن النظام الحالي: ${node.changesCount} مواسم`,
      ],
      quantifiedCalculationsFr: [
        `${distinctFamilies.length} familles botaniques sur ${steps.length} saisons`,
        `Amplitude racinaire : ${minZr.toFixed(2)}–${maxZr.toFixed(2)} m`,
        `Changements par rapport à l'actuel : ${node.changesCount}`,
      ],
      qualitativeExpectationsEn: [
        'Interrupts single-family soilborne pathogen & weed buildup.',
        'Alternates shallow and deeper soil exploration zones.',
      ],
      qualitativeExpectationsAr: [
        'كسر تراكم أمراض التربة والأعشاب الضارة المرتبطة بتكرار العائلة الواحدة.',
        'تناوب استغلال الطبقات السطحية والعميقة للتربة.',
      ],
      qualitativeExpectationsFr: [
        'Rupture du cycle des pathogènes et adventices spécialisés.',
        'Alternance de prospection racinaire superficielle et profonde.',
      ],
      unverifiedFutureOutcomesEn: [
        'Actual crop yield (t/ha), regional market prices, and net profit margins (never estimated).',
        'Exact soil organic matter increase or mineral N gain (cannot be guaranteed without longitudinal field sampling).',
      ],
      unverifiedFutureOutcomesAr: [
        'الإنتاجية الفعلية (طن/هكتار)، أسعار السوق، والربح الصافي (لا تُختلق أرقامها).',
        'نسبة الزيادة الدقيقة في المادة العضوية أو النيتروجين بالتربة (لا يمكن ضمانها بدون تحاليل دورية).',
      ],
      unverifiedFutureOutcomesFr: [
        'Rendements futurs (t/ha), prix de marché et marges (jamais fabriqués).',
        'Gain exact en matière organique ou azote du sol (non garanti sans suivi analytique).',
      ],
    },
    explanationSummary: {
      whyChangeEn:
        baseline.diseaseAndPestRisksEn[0] ||
        baseline.nutrientWeaknessesEn[0] ||
        'Gradually diversifies crop families and root architecture over 3–4 seasons.',
      whyChangeAr:
        baseline.diseaseAndPestRisksAr[0] ||
        baseline.nutrientWeaknessesAr[0] ||
        'تنويع تدريجي للعائلات النباتية وبنية الجذور على مدى 3 إلى 4 مواسم.',
      whyChangeFr:
        baseline.diseaseAndPestRisksFr[0] ||
        baseline.nutrientWeaknessesFr[0] ||
        'Diversifie progressivement les familles et l\'enracinement sur 3–4 saisons.',
      whatPreservedEn:
        retainedNamesEn.length > 0
          ? `Preserves existing crop(s): ${Array.from(new Set(retainedNamesEn)).join(', ')} separated by break crops.`
          : 'Replaces high-risk continuous hosts while matching local climatic and resource limits.',
      whatPreservedAr:
        retainedNamesAr.length > 0
          ? `يحافظ على المحاصيل المألوفة (${Array.from(new Set(retainedNamesAr)).join('، ')}) مع الفصل بينها بمحاصيل كاسرة للدورة.`
          : 'يستبدل التسلسل عالي المخاطر بمحاصيل متوافقة مع القيود المحلية.',
      whatPreservedFr:
        retainedNamesFr.length > 0
          ? `Conserve les cultures habituelles (${Array.from(new Set(retainedNamesFr)).join(', ')}) espacées par des cultures de rupture.`
          : 'Remplace la succession à risque tout en respectant les contraintes locales.',
      risksReducedEn:
        'Reduces consecutive host-family pathogen persistence, continuous nutrient mining at one root depth, and concentrated water stress.',
      risksReducedAr:
        'يقلص تراكم أمراض التربة المرتبطة بتكرار العائلة، وإجهاد استنزاف طبقة جذرية واحدة، وتركز الطلب المائي.',
      risksReducedFr:
        'Réduit la persistance des pathogènes, l\'épuisement à profondeur unique et la concentration hydrique.',
      whatIfRejectedEn:
        'Use the Farmer Decision controls below to mark any proposed crop as Rejected or Unavailable; the search engine immediately computes the next valid pathway or reports blocking constraints.',
      whatIfRejectedAr:
        'استخدم خيارات قرار الفلاح أدناه لرفض أي محصول مقترح أو تحديد عدم توفره؛ سيعيد المحرك البحث عن المسار الصالح التالي فوراً.',
      whatIfRejectedFr:
        'Utilisez les contrôles de décision ci-dessous pour rejeter ou marquer indisponible toute culture ; le graphe recalcule aussitôt.',
      influencingAssumptionsEn: [
        'Weights reflect documented planning priorities, NOT statistical yield probabilities.',
        'Preliminary seasonal water demand scales observed NASA POWER ET0 by FAO-56 seasonal mean Kc.',
      ],
      influencingAssumptionsAr: [
        'الأوزان تعبر عن أولويات تخطيط موثقة وليس نسبة احتمال نجاح.',
        'الاحتياج المائي التقديري مبني على ET0 المرصود وقيم Kc من الفاو-56.',
      ],
      influencingAssumptionsFr: [
        'Les poids traduisent des priorités de planification et non une probabilité de succès.',
        'Les besoins hydriques sont calculés à partir de ET0 NASA POWER et des Kc FAO-56.',
      ],
    },
    dimensionEvaluations: {
      familyDiversity,
      soilHealth,
      waterCompatibility,
      economicFeasibility,
      seasonalCompatibility,
    },
    confidence,
    confidenceReasonsEn: confReasonsEn,
    confidenceReasonsAr: confReasonsAr,
    confidenceReasonsFr: confReasonsFr,
    criteriaBreakdown: {
      ...avgSubs,
      totalPathCost: node.totalCost,
      changesFromBaselineCount: node.changesCount,
      criterionContributions: contributions,
    },
    compositePlanningScore: round1(composite),
    tradeOffNoteEn:
      mode === 'recommended'
        ? 'Balanced compromise between agronomic improvement, water fit, and minimal disruption.'
        : mode === 'conservative'
        ? `Minimizes practice changes (${node.changesCount} slot change(s)) at the cost of slower diversification.`
        : `Prioritizes ${altFocusEn} over minimum-change continuity or commercial intensity.`,
    tradeOffNoteAr:
      mode === 'recommended'
        ? 'توازن عملي بين تحسين الدورة الزراعية وملاءمة المياه وتقليل التغيير المفاجئ.'
        : mode === 'conservative'
        ? `يقلص التغييرات (${node.changesCount} مواسم) مع تنويع أبطأ تدريجياً.`
        : `يعطي الأولوية لـ (${altFocusAr}) على حساب تقليص التغييرات أو الكثافة التجارية.`,
    tradeOffNoteFr:
      mode === 'recommended'
        ? 'Compromis équilibré entre amélioration agronomique, eau et changements graduels.'
        : mode === 'conservative'
        ? `Minimise les changements (${node.changesCount}) au prix d'une diversification plus lente.`
        : `Priorise « ${altFocusFr} » plutôt que le statu quo.`,
  };
}

export function generateRotationTransitionPlan(
  input: RotationTransitionInput
): RotationTransitionResult {
  const nowIso = new Date().toISOString();
  const validCoords = areValidCoordinates(input.coordinates);
  const safeLat = validCoords ? input.coordinates.lat : 0;
  const hemisphere = validCoords ? determineHemisphere(safeLat) : 'equatorial';

  const soilInfo = extractSoilIndicators(input.soil);
  const climateInfo = validCoords
    ? extractClimateIndicators(
        { ...input.climate, latitudeDeg: safeLat },
        input.soil.curveNumber ?? 78
      )
    : {
        hasSufficientData: false,
        et0MeanMmDay: null,
        tMeanAvgC: null,
        tMinObservedC: null,
        tMaxObservedC: null,
        observedWindowDays: 0,
        observedRainfallMm: null,
        estimatedEffectiveRainWindowMm: null,
        rainfallAnomalyPercent: null,
        observationEndDate: null,
        retrievalDate: 'Unavailable',
        nasaSource: null,
        precipSource: null,
        missingItems: ['Valid geographic coordinates (lat in [-90,90], lng in [-180,180])'],
      };

  const residueMgmt: CropResidueManagement = input.previousCropResidue || 'unknown';
  const baseline = analyzeBaselineSequence({
    sequenceCropIds: input.constraints.currentSequence,
    soil: soilInfo,
    climate: climateInfo,
    observedSoilNote: input.constraints.observedSoilDegradationNote,
    residueMgmt,
    farmerContext: input.farmerContext,
  });

  const weightsUsed = normalizeWeights(
    input.farmerContext,
    input.constraints.weightsOverride,
    'recommended'
  );

  // Build Explicit Data Sources Provenance Log (Strictly accurate to real services)
  const dataSourcesUsed: TransitionDataSourceEntry[] = [
    {
      source: climateInfo.nasaSource || 'NASA POWER Agroclimatology (MERRA-2 / GEOS-FP)',
      category: climateInfo.hasSufficientData ? 'model_estimate' : 'missing',
      retrievalDate: climateInfo.retrievalDate,
      unit: '°C, MJ/m²/d, m/s, mm',
      spatialResolution: '0.5° × 0.625° (~50 km grid cell — NOT a field station)',
      temporalCoverage: `${climateInfo.observedWindowDays}-day observed window ending ${climateInfo.observationEndDate || 'N/A'}`,
      detail: climateInfo.hasSufficientData
        ? `Mean T=${climateInfo.tMeanAvgC}°C, Observed rain=${climateInfo.observedRainfallMm} mm, Mean ET0=${climateInfo.et0MeanMmDay} mm/d`
        : 'Climate observations insufficient or unavailable',
    },
    ...(climateInfo.precipSource || climateInfo.rainfallAnomalyPercent !== null
      ? [
          {
            source: climateInfo.precipSource || 'NASA POWER Precipitation (MERRA-2 / GEOS-FP PRECTOTCORR)',
            category: 'model_estimate' as const,
            retrievalDate: climateInfo.retrievalDate,
            unit: 'mm, % anomaly',
            spatialResolution: '0.5° × 0.625° (~50 km grid cell — NOT GPM/SMAP direct satellite)',
            temporalCoverage: `${climateInfo.observedWindowDays}-day accumulation vs 30-year climatology`,
            detail:
              climateInfo.observedRainfallMm !== null
                ? `Observed=${climateInfo.observedRainfallMm} mm, SCS Effective=${climateInfo.estimatedEffectiveRainWindowMm ?? 'N/A'} mm${
                    climateInfo.rainfallAnomalyPercent !== null
                      ? `, 30-yr anomaly=${climateInfo.rainfallAnomalyPercent >= 0 ? '+' : ''}${climateInfo.rainfallAnomalyPercent}%`
                      : ''
                  }`
                : 'Precipitation anomaly unavailable',
          },
        ]
      : []),
    {
      source: soilInfo.sourceLabel,
      category:
        soilInfo.thetaFc === null
          ? 'missing'
          : input.soil.sourceKind === 'farmer_lab'
          ? 'measured_retrieved'
          : 'model_estimate',
      retrievalDate: soilInfo.retrievalDate,
      unit: 'm³/m³ (θFC/θWP), % (clay/sand/SOC)',
      spatialResolution: input.soil.isSpatialEstimate ? '250 m spatial prediction (NOT parcel lab test)' : 'Field lab / FAO-56 Table 19 reference',
      temporalCoverage: 'Static soil profile',
      detail:
        soilInfo.thetaFc !== null
          ? `θFC=${soilInfo.thetaFc}, θWP=${soilInfo.thetaWp}, SOC=${soilInfo.socPct !== null ? `${soilInfo.socPct}%` : 'Missing'}`
          : 'Soil hydraulic parameters unavailable',
    },
    {
      source: 'FAO Irrigation & Drainage Paper No. 56 + Global Crop Database',
      category: 'calculated',
      retrievalDate: 'Reference constants (Allen et al., 1998)',
      unit: 'Kc, Zr (m), p, mm/d',
      spatialResolution: 'Crop-level reference',
      temporalCoverage: `${input.constraints.horizonSeasons}-season transition horizon`,
      detail: 'FAO-56 Penman-Monteith ET0, USDA-SCS Curve Number runoff, botanical family break rules',
    },
    {
      source: 'Farmer Profile, Residue & Constraint Inputs',
      category: 'user_provided',
      retrievalDate: nowIso.slice(0, 10),
      unit: 'Categorical / mm',
      spatialResolution: 'Parcel-specific',
      temporalCoverage: 'Current sequence & active constraints',
      detail: `Sequence: [${input.constraints.currentSequence.join(' → ')}]; Water=${input.farmerContext.waterAndTechCapacity || 'Unspecified'}; Budget=${input.farmerContext.financialCapacity || 'Unspecified'}; Residue=${residueMgmt}`,
    },
  ];

  const missingInfo: string[] = [...climateInfo.missingItems];
  if (soilInfo.thetaFc === null || soilInfo.thetaWp === null) {
    missingInfo.push('Soil hydraulic properties (θFC, θWP)');
  }
  if (soilInfo.socPct === null) {
    missingInfo.push('Soil Organic Carbon (SOC %)');
  }
  if (input.farmerContext.waterAndTechCapacity === null) {
    missingInfo.push('Irrigation infrastructure / water availability');
  }
  if (input.farmerContext.financialCapacity === null && !input.constraints.maxAcceptableCostTier) {
    missingInfo.push('Farmer financial / input capacity');
  }
  if (residueMgmt === 'unknown') {
    missingInfo.push('Crop residue handling (retained, removed, or grazed)');
  }

  const assumptionsEn = [
    `Hemisphere calendar mode: ${hemisphere} (lat ${safeLat.toFixed(2)}°); seasonal planting windows follow hemisphere-adjusted slots unless overridden.`,
    'Climate suitability uses observed NASA POWER values (~50 km resolution, NOT a field station) as a preliminary screen, not a multi-year forecast.',
    'Where water capacity is unspecified, supplemental irrigation is not assumed.',
  ];
  const assumptionsAr = [
    `نظام الفصول حسب نصف الكرة الأرضية: ${hemisphere} (خط العرض ${safeLat.toFixed(2)}°).`,
    'الفحص المناخي يعتمد على نافذة NASA POWER المرصودة (~50 كم) كمؤشر أولي وليس كتوقع موسمي طويل الأمد.',
    'عند عدم تحديد القدرة المائية لا يُفترض توفر ري تكميلي.',
  ];
  const assumptionsFr = [
    `Calendrier hémisphérique : ${hemisphere} (lat ${safeLat.toFixed(2)}°).`,
    'Le filtre climatique utilise NASA POWER (~50 km, non station locale) comme indicateur préliminaire.',
    'Sans précision sur l\'irrigation, aucun apport supplémentaire n\'est supposé.',
  ];

  // Gate 1: Invalid Coordinates or Insufficient Environmental Evidence
  if (!validCoords || !climateInfo.hasSufficientData || soilInfo.thetaFc === null || soilInfo.thetaWp === null) {
    return {
      generatedAt: nowIso,
      status: 'INSUFFICIENT_DATA',
      hemisphere,
      activeCoordinates: validCoords ? input.coordinates : null,
      baseline,
      recommendedPathway: null,
      conservativePathway: null,
      alternativePathway: null,
      noAlternativeReasonEn: null,
      noAlternativeReasonAr: null,
      noAlternativeReasonFr: null,
      blockingReasonsEn: missingInfo,
      blockingReasonsAr: missingInfo,
      blockingReasonsFr: missingInfo,
      dataSourcesUsed,
      assumptionsEn,
      assumptionsAr,
      assumptionsFr,
      missingInformation: Array.from(new Set(missingInfo)),
      weightsUsed,
    };
  }

  // Gate 2: Invalid Crop Sequence
  if (!baseline.validSequence) {
    return {
      generatedAt: nowIso,
      status: 'INVALID_SEQUENCE',
      hemisphere,
      activeCoordinates: input.coordinates,
      baseline,
      recommendedPathway: null,
      conservativePathway: null,
      alternativePathway: null,
      noAlternativeReasonEn: null,
      noAlternativeReasonAr: null,
      noAlternativeReasonFr: null,
      blockingReasonsEn: baseline.invalidReasonsEn,
      blockingReasonsAr: baseline.invalidReasonsAr,
      blockingReasonsFr: baseline.invalidReasonsFr,
      dataSourcesUsed,
      assumptionsEn,
      assumptionsAr,
      assumptionsFr,
      missingInformation: Array.from(new Set(missingInfo)),
      weightsUsed,
    };
  }

  const obsMonth =
    input.referenceMonthUtc ||
    (climateInfo.observationEndDate && /^\d{4}-\d{2}/.test(climateInfo.observationEndDate)
      ? Number(climateInfo.observationEndDate.slice(5, 7))
      : new Date().getUTCMonth() + 1);

  const horizonSeasons: 3 | 4 = input.constraints.horizonSeasons === 4 ? 4 : 3;
  const seasonSchedule = buildHemisphereSeasonSchedule({
    hemisphere,
    horizonSeasons,
    startMonthUtc: obsMonth,
    preferredStartSeason: input.farmerContext.localContext.season,
  });

  const baselineCrops = baseline.sequenceCropIds
    .map((id) => getGlobalRotationCropById(id))
    .filter((c): c is GlobalRotationCropProfile => Boolean(c));

  // Strategy B — Recommended Gradual Transition
  let recNode = runDijkstraTransitionSearch({
    horizonSeasons,
    seasonSchedule,
    baselineCropIds: baseline.sequenceCropIds,
    baselineCrops,
    climate: climateInfo,
    soil: soilInfo,
    farmerContext: input.farmerContext,
    residueMgmt,
    constraints: input.constraints,
    weights: weightsUsed,
    mode: 'recommended',
    requireImprovementOverBaseline: true,
  });

  if (!recNode) {
    recNode = runDijkstraTransitionSearch({
      horizonSeasons,
      seasonSchedule,
      baselineCropIds: baseline.sequenceCropIds,
      baselineCrops,
      climate: climateInfo,
      soil: soilInfo,
      farmerContext: input.farmerContext,
      residueMgmt,
      constraints: input.constraints,
      weights: weightsUsed,
      mode: 'recommended',
      requireImprovementOverBaseline: false,
    });
  }

  if (!recNode) {
    return {
      generatedAt: nowIso,
      status: 'NO_FEASIBLE_TRANSITION',
      hemisphere,
      activeCoordinates: input.coordinates,
      baseline,
      recommendedPathway: null,
      conservativePathway: null,
      alternativePathway: null,
      noAlternativeReasonEn: null,
      noAlternativeReasonAr: null,
      noAlternativeReasonFr: null,
      blockingReasonsEn: [
        'No feasible transition pathway satisfies all agronomic family-break, climate/water, financial, seasonal, and farmer rejection constraints.',
      ],
      blockingReasonsAr: [
        'لا يوجد مسار انتقالي صالح يستوفي في آنٍ واحد قيود كسر العائلات، والمناخ والمياه، والميزانية، وقرارات الفلاح.',
      ],
      blockingReasonsFr: [
        'Aucune trajectoire de transition ne satisfait simultanément les contraintes agronomiques, hydriques, budgétaires et les rejets saisis.',
      ],
      dataSourcesUsed,
      assumptionsEn,
      assumptionsAr,
      assumptionsFr,
      missingInformation: Array.from(new Set(missingInfo)),
      weightsUsed,
    };
  }

  const recKey = recNode.pathIds.join('>');
  const recMultiset = getMultisetKey(recNode.pathIds);

  const recommendedPathway = buildPathwayOption({
    mode: 'recommended',
    node: recNode,
    seasonSchedule,
    baseline,
    climate: climateInfo,
    soil: soilInfo,
    farmerContext: input.farmerContext,
    residueMgmt,
    constraints: input.constraints,
    weights: weightsUsed,
  });

  // Conservative Pathway — Minimal Disruption
  const consWeights = normalizeWeights(input.farmerContext, input.constraints.weightsOverride, 'conservative');
  let consNode = runDijkstraTransitionSearch({
    horizonSeasons,
    seasonSchedule,
    baselineCropIds: baseline.sequenceCropIds,
    baselineCrops,
    climate: climateInfo,
    soil: soilInfo,
    farmerContext: input.farmerContext,
    residueMgmt,
    constraints: input.constraints,
    weights: consWeights,
    mode: 'conservative',
    disallowedSequenceKey: [recKey],
    requireImprovementOverBaseline: true,
  });
  if (!consNode) {
    consNode = runDijkstraTransitionSearch({
      horizonSeasons,
      seasonSchedule,
      baselineCropIds: baseline.sequenceCropIds,
      baselineCrops,
      climate: climateInfo,
      soil: soilInfo,
      farmerContext: input.farmerContext,
      residueMgmt,
      constraints: input.constraints,
      weights: consWeights,
      mode: 'conservative',
      disallowedSequenceKey: [recKey],
      requireImprovementOverBaseline: false,
    });
  }

  const conservativePathway = consNode
    ? buildPathwayOption({
        mode: 'conservative',
        node: consNode,
        seasonSchedule,
        baseline,
        climate: climateInfo,
        soil: soilInfo,
        farmerContext: input.farmerContext,
        residueMgmt,
        constraints: input.constraints,
        weights: consWeights,
      })
    : null;

  // Strategy C — Alternative Resilience Strategy (blocks identical multisets / mere permutations!)
  const resilienceFocus = resolveAlternativeResilienceFocus(input.farmerContext, input.constraints);
  const altWeights = normalizeWeights(
    input.farmerContext,
    input.constraints.weightsOverride,
    'alternative',
    resilienceFocus
  );
  const disallowedForAlt = [recKey, ...(consNode ? [consNode.pathIds.join('>')] : [])];
  const disallowedMultisets = [recMultiset, ...(consNode ? [getMultisetKey(consNode.pathIds)] : [])];

  const altNode = runDijkstraTransitionSearch({
    horizonSeasons,
    seasonSchedule,
    baselineCropIds: baseline.sequenceCropIds,
    baselineCrops,
    climate: climateInfo,
    soil: soilInfo,
    farmerContext: input.farmerContext,
    residueMgmt,
    constraints: input.constraints,
    weights: altWeights,
    mode: 'alternative',
    resilienceFocus,
    disallowedSequenceKey: disallowedForAlt,
    disallowedMultisets,
    requireImprovementOverBaseline: false,
  });

  const alternativePathway = altNode
    ? buildPathwayOption({
        mode: 'alternative',
        resilienceFocus,
        node: altNode,
        seasonSchedule,
        baseline,
        climate: climateInfo,
        soil: soilInfo,
        farmerContext: input.farmerContext,
        residueMgmt,
        constraints: input.constraints,
        weights: altWeights,
      })
    : null;

  const noAlternativeReasonEn = !alternativePathway
    ? `No genuinely distinct crop-composition alternative emphasizing "${getFocusLabel(resilienceFocus, 'en')}" remained feasible without duplicating the same crops under active constraints and rejections.`
    : null;
  const noAlternativeReasonAr = !alternativePathway
    ? `لا توجد تركيبة محاصيل بديلة ومختلفة فعلياً تركز على "${getFocusLabel(resilienceFocus, 'ar')}" وتستوفي القيود وقرارات الرفض الحالية دون مجرد إعادة ترتيب نفس المحاصيل.`
    : null;
  const noAlternativeReasonFr = !alternativePathway
    ? `Aucune composition distincte centrée sur « ${getFocusLabel(resilienceFocus, 'fr')} » ne reste réalisable sous les contraintes et rejets actuels sans simple permutation.`
    : null;

  return {
    generatedAt: nowIso,
    status: 'PLANS_READY',
    hemisphere,
    activeCoordinates: input.coordinates,
    baseline,
    recommendedPathway,
    conservativePathway,
    alternativePathway,
    noAlternativeReasonEn,
    noAlternativeReasonAr,
    noAlternativeReasonFr,
    blockingReasonsEn: [],
    blockingReasonsAr: [],
    blockingReasonsFr: [],
    dataSourcesUsed,
    assumptionsEn,
    assumptionsAr,
    assumptionsFr,
    missingInformation: Array.from(new Set(missingInfo)),
    weightsUsed,
  };
}
