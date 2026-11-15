/**
 * TURBA — THE LIVING LAND MEMORY (ذاكرة الأرض)
 * Prediction vs. Reality Deterministic Comparison Engine
 *
 * Strict Scientific Integrity Gates:
 * Never compares expected vs actual unless ALL 4 conditions hold:
 *   1. A recorded recommendation snapshot exists.
 *   2. A farmer-reported (or measured) actual outcome exists.
 *   3. Units match or have an exact physical conversion (e.g. m³ -> mm via known area in ha).
 *   4. Time periods / scope are compatible and explicitly disclosed.
 *
 * Strictly NEVER claims crop rotation alone improved or degraded soil fertility
 * without an actual post-season soil measurement, and never implies single-factor causation.
 */

import { getGlobalRotationCropById } from '../../data/crops';
import {
  ComparisonMetricResult,
  FieldMemory,
  PredictionRealityComparison,
  RecommendationSnapshot,
  ReportedOutcomeRecord,
} from './types';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function getCropDisplayName(cropIdOrName: string | null): string | null {
  if (!cropIdOrName) return null;
  const known = getGlobalRotationCropById(cropIdOrName);
  return known ? known.commonNameEn : cropIdOrName;
}

function daysBetweenIso(d1: string | null, d2: string | null): number | null {
  if (!d1 || !d2) return null;
  const t1 = Date.parse(d1.slice(0, 10));
  const t2 = Date.parse(d2.slice(0, 10));
  if (Number.isNaN(t1) || Number.isNaN(t2)) return null;
  return Math.abs(Math.round((t2 - t1) / (1000 * 60 * 60 * 24)));
}

export function comparePredictionWithReality(params: {
  fieldMemory: FieldMemory;
  recommendation: RecommendationSnapshot;
  outcome: ReportedOutcomeRecord | null;
}): PredictionRealityComparison {
  const { fieldMemory, recommendation, outcome } = params;

  const causalCaveatEn =
    'Correlation caveat: Observed field outcomes reflect weather variability, soil heterogeneity, pest pressure, management timing, and unrecorded factors—not the TURBA recommendation alone.';
  const causalCaveatAr =
    'تنبيه السببية العلمية: النتائج الميدانية المسجلة تتأثر بتقلبات الطقس وتباين التربة والآفات وتوقيت المعاملات وعوامل أخرى غير مسجلة، ولا تثبت بمفردها علاقة سببية مباشرة مع توصية المنصة.';
  const causalCaveatFr =
    "Avertissement de causalité : Les résultats observés dépendent aussi du climat, de l'hétérogénéité du sol, des ravageurs, du calendrier cultural et de facteurs non enregistrés—pas uniquement de la recommandation.";

  if (!outcome) {
    return {
      comparisonId: `cmp-${recommendation.recommendationId}-awaiting`,
      fieldId: fieldMemory.fieldId,
      recommendationId: recommendation.recommendationId,
      recommendationCreatedAt: recommendation.createdAt,
      recommendationKind: recommendation.kind,
      outcomeId: null,
      status: 'AWAITING_OUTCOME',
      metrics: [],
      overallSummaryEn:
        'No actual field outcome has been reported yet for this recommendation snapshot. Report planting, irrigation, or harvest observations when available.',
      overallSummaryAr:
        'لم يتم تسجيل النتيجة الفعلية في الحقل بعد لهذه التوصية المحفوظة. يمكنك إضافة ما تم تطبيقه وملاحظته لاحقاً.',
      overallSummaryFr:
        "Aucun résultat réel de terrain n'a encore été saisi pour cet instantané. Renseignez les observations réelles ultérieurement.",
      causalCaveatEn,
      causalCaveatAr,
      causalCaveatFr,
    };
  }

  const metrics: ComparisonMetricResult[] = [];
  const periodStart = outcome.actualPlantingDate || recommendation.seasonContext.seasonStart;
  const periodEnd = outcome.actualHarvestDate || recommendation.seasonContext.seasonEnd;

  // --------------------------------------------------------------------------
  // 1. Crop Choice Metric
  // --------------------------------------------------------------------------
  const proposedCrops = recommendation.proposedSummary.proposedCropIds;
  const expectedPrimary =
    recommendation.proposedSummary.primaryCropId ||
    proposedCrops[0] ||
    recommendation.seasonContext.currentCropId;
  const actualCropRef = outcome.actualCropId || outcome.actualCropPlanted;

  if (expectedPrimary || proposedCrops.length > 0 || actualCropRef) {
    if (!actualCropRef) {
      metrics.push({
        metricKey: 'crop_choice',
        labelEn: 'Crop Selection vs Actual Planted Crop',
        labelAr: 'المحصول المقترح مقابل المزروع فعلياً',
        labelFr: 'Culture proposée vs culture réellement semée',
        comparable: false,
        incompatibilityReasonEn: 'Actual crop planted was not reported in the outcome record.',
        incompatibilityReasonAr: 'لم يتم تسجيل المحصول المزروع فعلياً في تقرير النتيجة.',
        incompatibilityReasonFr: "La culture réellement semée n'a pas été renseignée.",
        expectedDisplay: expectedPrimary ? getCropDisplayName(expectedPrimary) : null,
        expectedNumeric: null,
        expectedUnit: null,
        expectedOrigin: 'calculated',
        actualDisplay: null,
        actualNumeric: null,
        actualUnit: null,
        actualOrigin: null,
        deltaNumeric: null,
        deltaPercent: null,
        periodStart,
        periodEnd,
        interpretationEn: 'Awaiting actual crop report before evaluating alignment.',
        interpretationAr: 'يلزم تحديد المحصول المزروع فعلياً قبل تقييم التطابق.',
        interpretationFr: 'Renseignez la culture réelle pour comparer les choix.',
      });
    } else if (!expectedPrimary && proposedCrops.length === 0) {
      metrics.push({
        metricKey: 'crop_choice',
        labelEn: 'Crop Selection vs Actual Planted Crop',
        labelAr: 'المحصول المقترح مقابل المزروع فعلياً',
        labelFr: 'Culture proposée vs culture réellement semée',
        comparable: false,
        incompatibilityReasonEn: 'No proposed crop was present in the original recommendation snapshot.',
        incompatibilityReasonAr: 'لا تتضمن التوصية الأصلية محصولاً مقترحاً للمقارنة.',
        incompatibilityReasonFr: "Aucune culture cible n'était définie dans l'instantané initial.",
        expectedDisplay: null,
        expectedNumeric: null,
        expectedUnit: null,
        expectedOrigin: null,
        actualDisplay: getCropDisplayName(actualCropRef),
        actualNumeric: null,
        actualUnit: null,
        actualOrigin: 'farmer_report',
        deltaNumeric: null,
        deltaPercent: null,
        periodStart,
        periodEnd,
        interpretationEn: 'Actual planted crop recorded without a target recommendation crop.',
        interpretationAr: 'تم توثيق المحصول المزروع بدون محصول مستهدف في التوصية الأصلية.',
        interpretationFr: 'Culture réelle archivée sans culture cible comparable.',
      });
    } else {
      const normalizedActualId = (outcome.actualCropId || '').toLowerCase();
      const matchedTarget =
        (expectedPrimary && expectedPrimary.toLowerCase() === normalizedActualId) ||
        proposedCrops.some((c) => c.toLowerCase() === normalizedActualId) ||
        (expectedPrimary &&
          outcome.actualCropPlanted &&
          getCropDisplayName(expectedPrimary)?.toLowerCase() ===
            outcome.actualCropPlanted.trim().toLowerCase());

      const expectedLabel =
        proposedCrops.length > 1
          ? proposedCrops.map((c) => getCropDisplayName(c)).join(' → ')
          : getCropDisplayName(expectedPrimary);
      const actualLabel = outcome.actualCropPlanted || getCropDisplayName(outcome.actualCropId);

      metrics.push({
        metricKey: 'crop_choice',
        labelEn: 'Crop Selection vs Actual Planted Crop',
        labelAr: 'المحصول المقترح مقابل المزروع فعلياً',
        labelFr: 'Culture proposée vs culture réellement semée',
        comparable: true,
        incompatibilityReasonEn: null,
        incompatibilityReasonAr: null,
        incompatibilityReasonFr: null,
        expectedDisplay: expectedLabel,
        expectedNumeric: null,
        expectedUnit: null,
        expectedOrigin: 'calculated',
        actualDisplay: actualLabel,
        actualNumeric: null,
        actualUnit: null,
        actualOrigin: 'farmer_report',
        deltaNumeric: null,
        deltaPercent: null,
        periodStart,
        periodEnd,
        interpretationEn: matchedTarget
          ? `Farmer planted ${actualLabel}, aligning with the recorded target (${expectedLabel}).`
          : `Farmer planted ${actualLabel} instead of the proposed ${expectedLabel}; preserved in history for next-season planning.`,
        interpretationAr: matchedTarget
          ? `زرع الفلاح ${actualLabel} بما يتوافق مع الخيار الموصى به (${expectedLabel}).`
          : `اختار الفلاح زراعة ${actualLabel} بدلاً من (${expectedLabel})؛ تم حفظ الاختلاف في ذاكرة الحقل.`,
        interpretationFr: matchedTarget
          ? `L'agriculteur a semé ${actualLabel}, conformément à l'option proposée (${expectedLabel}).`
          : `L'agriculteur a semé ${actualLabel} au lieu de ${expectedLabel} ; divergence enregistrée pour la suite.`,
      });
    }
  }

  // --------------------------------------------------------------------------
  // 2. Irrigation Depth / Volume Metric (Strict Unit & Area Guard)
  // --------------------------------------------------------------------------
  const expectedGrossMm = recommendation.proposedSummary.grossIrrigationMm ?? null;
  const expectedNetMm = recommendation.proposedSummary.netIrrigationMm ?? null;
  const expectedIrrMm = expectedGrossMm ?? expectedNetMm;

  if (expectedIrrMm !== null || outcome.actualIrrigationAmount !== null) {
    const startDriftDays = daysBetweenIso(
      recommendation.seasonContext.seasonStart,
      outcome.actualPlantingDate
    );

    if (expectedIrrMm === null) {
      metrics.push({
        metricKey: 'irrigation_applied',
        labelEn: 'Recommended vs Applied Irrigation',
        labelAr: 'الري الموصى به مقابل المطبق فعلياً',
        labelFr: 'Irrigation recommandée vs appliquée',
        comparable: false,
        incompatibilityReasonEn:
          'This recommendation snapshot is a crop/rotation plan with no numeric irrigation depth target (mm).',
        incompatibilityReasonAr:
          'هذه التوصية خاصة بالدورة الزراعية ولا تحتوي على كمية ري رقمية (مم) للمقارنة.',
        incompatibilityReasonFr:
          "Cet instantané porte sur la rotation sans dose d'irrigation numérique (mm) comparable.",
        expectedDisplay: null,
        expectedNumeric: null,
        expectedUnit: 'mm',
        expectedOrigin: null,
        actualDisplay:
          outcome.actualIrrigationAmount !== null && outcome.actualIrrigationUnit
            ? `${outcome.actualIrrigationAmount} ${outcome.actualIrrigationUnit}`
            : null,
        actualNumeric: outcome.actualIrrigationAmount,
        actualUnit: outcome.actualIrrigationUnit,
        actualOrigin: outcome.actualIrrigationOrigin || 'farmer_report',
        deltaNumeric: null,
        deltaPercent: null,
        periodStart,
        periodEnd,
        interpretationEn: 'Actual irrigation recorded as field history.',
        interpretationAr: 'تم حفظ كمية الري المطبقة كسجل ميداني فقط.',
        interpretationFr: "Dose d'irrigation réelle archivée comme historique de parcelle.",
      });
    } else if (outcome.actualIrrigationAmount === null || !outcome.actualIrrigationUnit) {
      metrics.push({
        metricKey: 'irrigation_applied',
        labelEn: 'Recommended vs Applied Irrigation',
        labelAr: 'الري الموصى به مقابل المطبق فعلياً',
        labelFr: 'Irrigation recommandée vs appliquée',
        comparable: false,
        incompatibilityReasonEn: 'Actual irrigation amount or unit was not reported by the farmer.',
        incompatibilityReasonAr: 'لم يتم إدخال كمية الري المطبقة فعلياً أو وحدتها.',
        incompatibilityReasonFr: "La dose d'irrigation appliquée ou son unité n'a pas été saisie.",
        expectedDisplay: `${expectedIrrMm} mm`,
        expectedNumeric: expectedIrrMm,
        expectedUnit: 'mm',
        expectedOrigin: 'calculated',
        actualDisplay: null,
        actualNumeric: null,
        actualUnit: null,
        actualOrigin: null,
        deltaNumeric: null,
        deltaPercent: null,
        periodStart,
        periodEnd,
        interpretationEn: 'Cannot evaluate irrigation adherence without measured or reported applied water.',
        interpretationAr: 'لا يمكن تقييم الالتزام بالري بدون كمية فعلية موثقة.',
        interpretationFr: "Impossible d'évaluer l'écart sans apport réel renseigné.",
      });
    } else if (outcome.actualIrrigationUnit === 'L/plant') {
      metrics.push({
        metricKey: 'irrigation_applied',
        labelEn: 'Recommended vs Applied Irrigation',
        labelAr: 'الري الموصى به مقابل المطبق فعلياً',
        labelFr: 'Irrigation recommandée vs appliquée',
        comparable: false,
        incompatibilityReasonEn:
          'Unit incompatibility: L/plant cannot be converted to area depth (mm) without verified plant density and wetted-area spacing.',
        incompatibilityReasonAr:
          'تعارض وحدات القياس: لا يمكن تحويل (لتر/شتلة) إلى (مم) بدون كثافة الغرس ومساحة الترطيب الموثقة.',
        incompatibilityReasonFr:
          "Incompatibilité d'unités : L/plant ne peut pas être converti en mm sans densité de plantation vérifiée.",
        expectedDisplay: `${expectedIrrMm} mm`,
        expectedNumeric: expectedIrrMm,
        expectedUnit: 'mm',
        expectedOrigin: 'calculated',
        actualDisplay: `${outcome.actualIrrigationAmount} L/plant`,
        actualNumeric: outcome.actualIrrigationAmount,
        actualUnit: 'L/plant',
        actualOrigin: outcome.actualIrrigationOrigin || 'farmer_report',
        deltaNumeric: null,
        deltaPercent: null,
        periodStart,
        periodEnd,
        interpretationEn: 'Both records preserved separately; no artificial unit conversion applied.',
        interpretationAr: 'تم حفظ القيمتين منفصلتين دون أي تحويل وحدات غير دقيق.',
        interpretationFr: 'Valeurs conservées séparément sans conversion artificielle.',
      });
    } else if (
      outcome.actualIrrigationUnit === 'm3' &&
      (fieldMemory.area === null || fieldMemory.area <= 0 || fieldMemory.areaUnit !== 'ha')
    ) {
      metrics.push({
        metricKey: 'irrigation_applied',
        labelEn: 'Recommended vs Applied Irrigation',
        labelAr: 'الري الموصى به مقابل المطبق فعلياً',
        labelFr: 'Irrigation recommandée vs appliquée',
        comparable: false,
        incompatibilityReasonEn:
          'Unit conversion blocked: Reported volume (m³) cannot be converted to mm because verified parcel area (ha) is missing.',
        incompatibilityReasonAr:
          'تعذر التحويل: لا يمكن تحويل الحجم (م³) إلى عمق (مم) لغياب المساحة الموثقة للقطعة بالهكتار.',
        incompatibilityReasonFr:
          'Conversion bloquée : Le volume (m³) nécessite la superficie exacte (ha) pour être converti en mm.',
        expectedDisplay: `${expectedIrrMm} mm`,
        expectedNumeric: expectedIrrMm,
        expectedUnit: 'mm',
        expectedOrigin: 'calculated',
        actualDisplay: `${outcome.actualIrrigationAmount} m³`,
        actualNumeric: outcome.actualIrrigationAmount,
        actualUnit: 'm3',
        actualOrigin: outcome.actualIrrigationOrigin || 'farmer_report',
        deltaNumeric: null,
        deltaPercent: null,
        periodStart,
        periodEnd,
        interpretationEn: 'Draw or enter verified parcel area in hectares to enable m³ ↔ mm equivalence.',
        interpretationAr: 'أدخل مساحة القطعة بالهكتار أو ارسم حدودها لتفعيل المقارنة بوحدة مم.',
        interpretationFr: 'Renseignez la superficie (ha) pour convertir m³ en mm.',
      });
    } else if (startDriftDays !== null && startDriftDays > 45) {
      metrics.push({
        metricKey: 'irrigation_applied',
        labelEn: 'Recommended vs Applied Irrigation',
        labelAr: 'الري الموصى به مقابل المطبق فعلياً',
        labelFr: 'Irrigation recommandée vs appliquée',
        comparable: false,
        incompatibilityReasonEn: `Time period mismatch: Reported planting date (${outcome.actualPlantingDate}) differs by ${startDriftDays} days from snapshot season context (${recommendation.seasonContext.seasonStart}).`,
        incompatibilityReasonAr: `اختلاف الفترة الزمنية: تاريخ الزرع الفعلي (${outcome.actualPlantingDate}) يختلف بـ ${startDriftDays} يوماً عن سياق التوصية (${recommendation.seasonContext.seasonStart}).`,
        incompatibilityReasonFr: `Décalage de période : La date de semis réelle (${outcome.actualPlantingDate}) diffère de ${startDriftDays} jours du contexte initial (${recommendation.seasonContext.seasonStart}).`,
        expectedDisplay: `${expectedIrrMm} mm`,
        expectedNumeric: expectedIrrMm,
        expectedUnit: 'mm',
        expectedOrigin: 'calculated',
        actualDisplay: `${outcome.actualIrrigationAmount} ${outcome.actualIrrigationUnit}`,
        actualNumeric: outcome.actualIrrigationAmount,
        actualUnit: outcome.actualIrrigationUnit,
        actualOrigin: outcome.actualIrrigationOrigin || 'farmer_report',
        deltaNumeric: null,
        deltaPercent: null,
        periodStart,
        periodEnd,
        interpretationEn: 'Different cropping windows prevent a valid 1:1 water comparison.',
        interpretationAr: 'اختلاف الفترة الزراعية يمنع مقارنة كمية المياه بشكل مباشر.',
        interpretationFr: 'Des fenêtres culturales différentes empêchent une comparaison directe.',
      });
    } else {
      const actualMm =
        outcome.actualIrrigationUnit === 'm3' && fieldMemory.area
          ? round2(outcome.actualIrrigationAmount / (10 * fieldMemory.area))
          : round2(outcome.actualIrrigationAmount);

      const delta = round2(actualMm - expectedIrrMm);
      const deltaPct = expectedIrrMm > 0 ? round2((delta / expectedIrrMm) * 100) : null;
      const actualDisplayStr =
        outcome.actualIrrigationUnit === 'm3' && fieldMemory.area
          ? `${actualMm} mm (${outcome.actualIrrigationAmount} m³ / ${fieldMemory.area} ha)`
          : `${actualMm} mm`;

      metrics.push({
        metricKey: 'irrigation_applied',
        labelEn: 'Recommended vs Applied Irrigation',
        labelAr: 'الري الموصى به مقابل المطبق فعلياً',
        labelFr: 'Irrigation recommandée vs appliquée',
        comparable: true,
        incompatibilityReasonEn: null,
        incompatibilityReasonAr: null,
        incompatibilityReasonFr: null,
        expectedDisplay: `${expectedIrrMm} mm${expectedGrossMm !== null ? ' (gross)' : ' (net)'}`,
        expectedNumeric: expectedIrrMm,
        expectedUnit: 'mm',
        expectedOrigin: 'calculated',
        actualDisplay: actualDisplayStr,
        actualNumeric: actualMm,
        actualUnit: 'mm',
        actualOrigin: outcome.actualIrrigationOrigin || 'farmer_report',
        deltaNumeric: delta,
        deltaPercent: deltaPct,
        periodStart,
        periodEnd,
        interpretationEn:
          Math.abs(delta) <= 5
            ? `Applied depth (${actualMm} mm) matched recommended depth (${expectedIrrMm} mm) within ±5 mm.`
            : delta < 0
            ? `Applied ${Math.abs(delta)} mm less than recommended (${actualMm} vs ${expectedIrrMm} mm)${
                outcome.observedWaterShortage ? ' alongside farmer-reported water shortage.' : '.'
              }`
            : `Applied ${delta} mm above snapshot target (${actualMm} vs ${expectedIrrMm} mm)${
                recommendation.proposedSummary.expectedWindowDays
                  ? ` — verify whether reported figure spans more than the ${recommendation.proposedSummary.expectedWindowDays}-day event window.`
                  : '.'
              }`,
        interpretationAr:
          Math.abs(delta) <= 5
            ? `الكمية المطبقة (${actualMm} مم) مطابقة تقريباً للتوصية (${expectedIrrMm} مم) ضمن ±5 مم.`
            : delta < 0
            ? `تم تطبيق كمية أقل بـ ${Math.abs(delta)} مم من الموصى به (${actualMm} مقابل ${expectedIrrMm} مم)${
                outcome.observedWaterShortage ? ' مع الإبلاغ عن نقص مياه.' : '.'
              }`
            : `تم تطبيق كمية أعلى بـ ${delta} مم من الموصى به (${actualMm} مقابل ${expectedIrrMm} مم)${
                recommendation.proposedSummary.expectedWindowDays
                  ? ` — يُرجى التحقق مما إذا كان الرقم يغطي فترة أطول من نافذة (${recommendation.proposedSummary.expectedWindowDays} أيام).`
                  : '.'
              }`,
        interpretationFr:
          Math.abs(delta) <= 5
            ? `Dose appliquée (${actualMm} mm) conforme à la recommandation (${expectedIrrMm} mm) à ±5 mm près.`
            : delta < 0
            ? `${Math.abs(delta)} mm de moins que recommandé (${actualMm} vs ${expectedIrrMm} mm)${
                outcome.observedWaterShortage ? ' avec manque d’eau signalé.' : '.'
              }`
            : `${delta} mm au-dessus de la cible (${actualMm} vs ${expectedIrrMm} mm).`,
      });
    }
  }

  // --------------------------------------------------------------------------
  // 3. Forecast / Window Rainfall vs Observed Period Rainfall (if recorded)
  // --------------------------------------------------------------------------
  const expectedRainMm = recommendation.proposedSummary.expectedWindowRainMm ?? null;
  if (expectedRainMm !== null && outcome.recordedPeriodRainfallMm !== null) {
    const delta = round2(outcome.recordedPeriodRainfallMm - expectedRainMm);
    const deltaPct = expectedRainMm > 0 ? round2((delta / expectedRainMm) * 100) : null;
    metrics.push({
      metricKey: 'rainfall_window',
      labelEn: 'Forecast/Expected Rain vs Recorded Rain',
      labelAr: 'الأمطار المتوقعة مقابل المسجلة للفترة',
      labelFr: 'Pluie prévue vs pluie enregistrée',
      comparable: true,
      incompatibilityReasonEn: null,
      incompatibilityReasonAr: null,
      incompatibilityReasonFr: null,
      expectedDisplay: `${expectedRainMm} mm`,
      expectedNumeric: expectedRainMm,
      expectedUnit: 'mm',
      expectedOrigin: 'spatial_estimate',
      actualDisplay: `${outcome.recordedPeriodRainfallMm} mm`,
      actualNumeric: outcome.recordedPeriodRainfallMm,
      actualUnit: 'mm',
      actualOrigin: 'farmer_report',
      deltaNumeric: delta,
      deltaPercent: deltaPct,
      periodStart,
      periodEnd,
      interpretationEn: `Recorded period rainfall (${outcome.recordedPeriodRainfallMm} mm via ${
        outcome.recordedRainfallSource || 'field report'
      }) differed by ${delta >= 0 ? `+${delta}` : delta} mm from the ${expectedRainMm} mm window projection.`,
      interpretationAr: `الأمطار المسجلة (${outcome.recordedPeriodRainfallMm} مم) اختلفت بـ ${
        delta >= 0 ? `+${delta}` : delta
      } مم عن التوقع (${expectedRainMm} مم).`,
      interpretationFr: `La pluie enregistrée (${outcome.recordedPeriodRainfallMm} mm) diffère de ${
        delta >= 0 ? `+${delta}` : delta
      } mm de la prévision (${expectedRainMm} mm).`,
    });
  }

  // --------------------------------------------------------------------------
  // 4. Soil Organic Carbon (STRICT: never assume fertility improvement without lab measurement)
  // --------------------------------------------------------------------------
  const baselineSoc = recommendation.inputSnapshot.socPct;
  const baselineIsLab = recommendation.inputSnapshot.soilSourceKind === 'farmer_lab';

  if (outcome.measuredPostSeasonSocPct !== null) {
    if (baselineSoc !== null && baselineIsLab) {
      const delta = round2(outcome.measuredPostSeasonSocPct - baselineSoc);
      const deltaPct = baselineSoc > 0 ? round2((delta / baselineSoc) * 100) : null;
      metrics.push({
        metricKey: 'soil_organic_carbon',
        labelEn: 'Soil Organic Carbon (Lab Baseline vs Post-Season)',
        labelAr: 'الكربون العضوي للتربة (تحليل قبلي مقابل بعدي)',
        labelFr: 'Carbone organique du sol (labo initial vs post-saison)',
        comparable: true,
        incompatibilityReasonEn: null,
        incompatibilityReasonAr: null,
        incompatibilityReasonFr: null,
        expectedDisplay: `${baselineSoc}% (Lab)`,
        expectedNumeric: baselineSoc,
        expectedUnit: '%',
        expectedOrigin: 'verified_measurement',
        actualDisplay: `${outcome.measuredPostSeasonSocPct}%`,
        actualNumeric: outcome.measuredPostSeasonSocPct,
        actualUnit: '%',
        actualOrigin: outcome.measuredPostSeasonSoilOrigin || 'verified_measurement',
        deltaNumeric: delta,
        deltaPercent: deltaPct,
        periodStart,
        periodEnd,
        interpretationEn: `Measured SOC shifted by ${delta >= 0 ? `+${delta}` : delta}% across two parcel laboratory tests.`,
        interpretationAr: `تغير الكربون العضوي المقاس مخبرياً بمقدار ${delta >= 0 ? `+${delta}` : delta}%.`,
        interpretationFr: `Le COS mesuré a varié de ${delta >= 0 ? `+${delta}` : delta} % entre deux analyses de laboratoire.`,
      });
    } else {
      metrics.push({
        metricKey: 'soil_organic_carbon',
        labelEn: 'Soil Organic Carbon Verification',
        labelAr: 'التحقق من الكربون العضوي للتربة',
        labelFr: 'Vérification du carbone organique du sol',
        comparable: false,
        incompatibilityReasonEn:
          baselineSoc === null
            ? 'No baseline laboratory SOC test was recorded at recommendation time.'
            : 'Spatial scale incompatibility: Baseline SOC came from 250 m ISRIC SoilGrids estimate and cannot be quantitatively subtracted from a parcel-level laboratory sample.',
        incompatibilityReasonAr:
          baselineSoc === null
            ? 'لا يوجد تحليل مخبري أساسي للكربون العضوي وقت صدور التوصية.'
            : 'تعارض الدقة المكانية: القيمة الأساسية من تقدير SoilGrids (250م) ولا يجوز مقارنتها حسابياً مع عينة مخبرية موضعية.',
        incompatibilityReasonFr:
          baselineSoc === null
            ? "Aucune analyse de laboratoire initiale n'était disponible."
            : 'Échelles incompatibles : la référence SoilGrids (250 m) ne peut pas être soustraite à une analyse parcellaire de laboratoire.',
        expectedDisplay: baselineSoc !== null ? `${baselineSoc}% (250m grid estimate)` : null,
        expectedNumeric: null,
        expectedUnit: '%',
        expectedOrigin: baselineSoc !== null ? 'spatial_estimate' : null,
        actualDisplay: `${outcome.measuredPostSeasonSocPct}% (Post-season sample)`,
        actualNumeric: outcome.measuredPostSeasonSocPct,
        actualUnit: '%',
        actualOrigin: outcome.measuredPostSeasonSoilOrigin || 'verified_measurement',
        deltaNumeric: null,
        deltaPercent: null,
        periodStart,
        periodEnd,
        interpretationEn:
          'Post-season soil sample preserved as the new field-verified baseline for future seasons.',
        interpretationAr: 'تم حفظ العينة المخبرية البعدية كمرجع ميداني موثق للمواسم القادمة.',
        interpretationFr: 'Échantillon post-saison archivé comme nouvelle référence de laboratoire.',
      });
    }
  } else if (recommendation.kind === 'rotation' || recommendation.kind === 'transition') {
    metrics.push({
      metricKey: 'soil_organic_carbon',
      labelEn: 'Soil Fertility / Organic Matter Change',
      labelAr: 'تطور خصوبة التربة والمادة العضوية',
      labelFr: 'Évolution de la fertilité / matière organique',
      comparable: false,
      incompatibilityReasonEn:
        'No post-season soil test provided. Changing crops alone does NOT verify soil fertility or organic carbon improvement.',
      incompatibilityReasonAr:
        'لا يوجد تحليل تربة بعدي. تغيير المحصول وحده لا يُثبت تحسن خصوبة التربة أو المادة العضوية بدون قياس.',
      incompatibilityReasonFr:
        "Aucune analyse de sol post-saison saisie. Changer de culture ne prouve pas à lui seul une amélioration de la fertilité.",
      expectedDisplay: 'Unverified qualitative agronomic expectation',
      expectedNumeric: null,
      expectedUnit: null,
      expectedOrigin: 'calculated',
      actualDisplay: null,
      actualNumeric: null,
      actualUnit: null,
      actualOrigin: null,
      deltaNumeric: null,
      deltaPercent: null,
      periodStart,
      periodEnd,
      interpretationEn:
        'Upload or enter post-season laboratory SOC/soil analysis if you wish to measure real soil change.',
      interpretationAr: 'أدخل نتيجة تحليل مخبري بعد الموسم لقياس أي تغير فعلي في خصوبة التربة.',
      interpretationFr: "Saisissez une analyse de laboratoire post-saison pour mesurer l'évolution réelle.",
    });
  }

  // --------------------------------------------------------------------------
  // 5. Farmer-Reported Yield (Preserved honestly, NEVER compared against fake forecast)
  // --------------------------------------------------------------------------
  if (outcome.yieldValue !== null && outcome.yieldUnit) {
    metrics.push({
      metricKey: 'yield_expectation',
      labelEn: 'Observed Crop Yield (Reported Outcome)',
      labelAr: 'الإنتاجية المسجلة فعلياً',
      labelFr: 'Rendement observé (retour terrain)',
      comparable: false,
      incompatibilityReasonEn:
        'TURBA never fabricates target yield numbers; reported yield is archived strictly as measured field history.',
      incompatibilityReasonAr:
        'لا تختلق منصة تُربة أرقام إنتاجية متوقعة؛ يتم حفظ المردود الفعلي كمرجع تاريخي للقطعة فقط.',
      incompatibilityReasonFr:
        'TURBA ne fabrique jamais de prévisions de rendement ; la mesure reste archivée comme historique réel.',
      expectedDisplay: 'Not estimated by TURBA',
      expectedNumeric: null,
      expectedUnit: null,
      expectedOrigin: null,
      actualDisplay: `${outcome.yieldValue} ${outcome.yieldUnit}`,
      actualNumeric: outcome.yieldValue,
      actualUnit: outcome.yieldUnit,
      actualOrigin: outcome.yieldOrigin || 'farmer_report',
      deltaNumeric: null,
      deltaPercent: null,
      periodStart,
      periodEnd,
      interpretationEn: `Archived observed yield: ${outcome.yieldValue} ${outcome.yieldUnit}.`,
      interpretationAr: `المردود الفعلي الموثق: ${outcome.yieldValue} ${outcome.yieldUnit}.`,
      interpretationFr: `Rendement réel archivé : ${outcome.yieldValue} ${outcome.yieldUnit}.`,
    });
  }

  const comparableCount = metrics.filter((m) => m.comparable).length;
  const incompatibleCount = metrics.filter((m) => !m.comparable).length;

  let status: PredictionRealityComparison['status'];
  if (comparableCount === 0) {
    status = 'INCOMPATIBLE';
  } else if (incompatibleCount > 0) {
    status = 'PARTIAL';
  } else {
    status = 'COMPARABLE';
  }

  const overallSummaryEn =
    comparableCount > 0
      ? `${comparableCount} comparable metric(s) evaluated${
          incompatibleCount > 0 ? ` and ${incompatibleCount} blocked/non-comparable check(s) explained` : ''
        }.`
      : 'No metrics passed strict unit, time-period, and baseline compatibility checks; incompatibilities are detailed below.';

  const overallSummaryAr =
    comparableCount > 0
      ? `تمت مقارنة ${comparableCount} مؤشر(ات) متوافقة علمياً${
          incompatibleCount > 0 ? ` مع توضيح أسباب تعذر مقارنة ${incompatibleCount} مؤشر(ات)` : ''
        }.`
      : 'تعذرت المقارنة الرقمية المباشرة بسبب غياب قياسات متوافقة أو اختلاف الوحدات/الفترات، وتم توضيح الأسباب بدقة.';

  const overallSummaryFr =
    comparableCount > 0
      ? `${comparableCount} indicateur(s) comparable(s) évalué(s)${
          incompatibleCount > 0 ? ` et ${incompatibleCount} vérification(s) bloquée(s) expliquée(s)` : ''
        }.`
      : 'Aucun indicateur ne satisfait les critères stricts de compatibilité ; motifs détaillés ci-dessous.';

  return {
    comparisonId: `cmp-${recommendation.recommendationId}-${outcome.outcomeId}`,
    fieldId: fieldMemory.fieldId,
    recommendationId: recommendation.recommendationId,
    recommendationCreatedAt: recommendation.createdAt,
    recommendationKind: recommendation.kind,
    outcomeId: outcome.outcomeId,
    status,
    metrics,
    overallSummaryEn,
    overallSummaryAr,
    overallSummaryFr,
    causalCaveatEn,
    causalCaveatAr,
    causalCaveatFr,
  };
}
