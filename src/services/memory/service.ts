/**
 * TURBA — THE LIVING LAND MEMORY (ذاكرة الأرض)
 * Unified Orchestration Facade & Timeline Builder
 *
 * Bridges TURBA's live geospatial/agronomic views with persistent field memory:
 * - Syncs FieldMemory safely from FarmRecord (strictly preserving null boundaries/areas when not drawn)
 * - Captures EnvironmentalSnapshotRecord & LandMemoryProvenanceEntry[] from live feeds
 * - Records immutable RecommendationSnapshot runs with deterministic inputSignature deduplication
 * - Validates and saves SeasonRecord & ReportedOutcomeRecord
 * - Builds chronological LandMemoryTimelineEvent[] including explicit missing-data gaps
 */

import { getGlobalRotationCropById } from '../../data/crops';
import {
  CopernicusEra5LandSoil,
  CurrentWeatherObservation,
  FarmRecord,
  NasaGpmObservation,
  NasaPowerObservation,
  NasaSmapObservation,
  Sentinel2Observation,
} from '../../types/farm';
import {
  CropResidueManagement,
  FarmerContextProfile,
  GlobalCropRotationAdviceResult,
  IrrigationRecommendationResult,
  RotationTransitionResult,
  SoilHydraulicResult,
} from '../../types/irrigation';
import { deriveEvidenceLearningContext } from './futures';
import { buildEnvironmentalSnapshotAndProvenance } from './provenance';
import {
  appendEnvironmentalSnapshot,
  appendRecommendationSnapshot,
  DEFAULT_LOCAL_OWNER_ID,
  deleteSeasonRecord,
  exportFieldBackupPayload,
  getFieldBundle,
  importFieldBackupPayload,
  listFieldMemoriesForOwner,
  normalizeOwnerScope,
  saveOutcomeReport,
  saveSeasonRecord,
  StoredFieldMemoryBundle,
  updateRecommendationStatus,
  upsertFieldMemory,
} from './repository';
import {
  FieldMemory,
  LandMemoryTimelineEvent,
  LandMemoryWorkspaceState,
  RecommendationSnapshot,
  RecommendationStatus,
  ReportedOutcomeRecord,
  SeasonRecord,
  SeasonRecordOrigin,
} from './types';
import { sanitizeStoredOutcome, validateSeasonInput } from './validation';
import { comparePredictionWithReality } from './predictions';

function computeDeterministicSignature(obj: unknown): string {
  const json = JSON.stringify(obj);
  let hash = 2166136261;
  for (let i = 0; i < json.length; i++) {
    hash ^= json.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `sig-${(hash >>> 0).toString(16)}`;
}

function getLocationPrecisionLabel(farm: FarmRecord): string {
  if (farm.identificationMethod === 'draw_polygon' && farm.polygon && farm.polygon.length >= 3) {
    return 'User-drawn polygon boundary';
  }
  if (farm.identificationMethod === 'gps' || farm.id.startsWith('gps-')) {
    return 'Device GPS point (no parcel boundary inferred)';
  }
  return 'Point coordinate inspection (no parcel boundary inferred)';
}

export function syncFieldAndCaptureEnvironment(params: {
  farm: FarmRecord;
  ownerId?: string | null;
  currentWeather?: CurrentWeatherObservation | null;
  nasaPower?: NasaPowerObservation | null;
  nasaSmap?: NasaSmapObservation | null;
  nasaGpm?: NasaGpmObservation | null;
  era5LandSoil?: CopernicusEra5LandSoil | null;
  sentinel2?: Sentinel2Observation | null;
  soilHydraulics?: SoilHydraulicResult | null;
}): FieldMemory {
  const {
    farm,
    ownerId,
    currentWeather = null,
    nasaPower = null,
    nasaSmap = null,
    nasaGpm = null,
    era5LandSoil = null,
    sentinel2 = null,
    soilHydraulics = null,
  } = params;

  const hasDrawnBoundary =
    farm.identificationMethod === 'draw_polygon' &&
    Array.isArray(farm.polygon) &&
    farm.polygon.length >= 3;
  const hasRealArea =
    hasDrawnBoundary &&
    typeof farm.calculatedAreaHectares === 'number' &&
    Number.isFinite(farm.calculatedAreaHectares) &&
    farm.calculatedAreaHectares > 0;

  const synced = upsertFieldMemory({
    fieldId: farm.id,
    ownerId: normalizeOwnerScope(ownerId),
    fieldName: farm.name,
    region: farm.region,
    province: farm.province,
    coordinates: farm.centroid,
    boundaryGeometry: hasDrawnBoundary ? farm.polygon : null,
    area: hasRealArea ? farm.calculatedAreaHectares : null,
    areaUnit: hasRealArea ? 'ha' : null,
    locationPrecision: getLocationPrecisionLabel(farm),
    cadastralReference: farm.cadastralReference || null,
    baselineAssessmentRef: null,
    notes: farm.notes || '',
  });

  if (
    currentWeather ||
    nasaPower ||
    nasaSmap ||
    nasaGpm ||
    era5LandSoil ||
    sentinel2 ||
    soilHydraulics
  ) {
    const { snapshot, provenanceEntries } = buildEnvironmentalSnapshotAndProvenance({
      fieldId: synced.fieldId,
      coordinates: farm.centroid,
      currentWeather,
      nasaPower,
      nasaSmap,
      nasaGpm,
      era5LandSoil,
      sentinel2,
      soilHydraulics,
    });
    appendEnvironmentalSnapshot(synced.fieldId, synced.ownerId, snapshot, provenanceEntries);
  }

  return getFieldBundle(synced.fieldId, synced.ownerId)?.fieldMemory || synced;
}

export function recordIrrigationRecommendationSnapshot(params: {
  farm: FarmRecord;
  ownerId?: string | null;
  recommendation: IrrigationRecommendationResult;
  farmerContext: FarmerContextProfile;
  plantingDate: string;
  previousCropId: string;
  residueManagement: CropResidueManagement;
  environmentalSnapshotId?: string | null;
  forceNew?: boolean;
}): RecommendationSnapshot | null {
  const {
    farm,
    ownerId,
    recommendation,
    farmerContext,
    plantingDate,
    previousCropId,
    residueManagement,
    environmentalSnapshotId = null,
    forceNew = false,
  } = params;

  if (!recommendation.crop || recommendation.status === 'INSUFFICIENT_DATA') {
    return null;
  }

  syncFieldAndCaptureEnvironment({ farm, ownerId, soilHydraulics: recommendation.soilProfile });
  const scopeOwner = normalizeOwnerScope(ownerId);

  const signature = computeDeterministicSignature({
    kind: 'irrigation',
    cropId: recommendation.crop.id,
    plantingDate,
    status: recommendation.status,
    netMm: recommendation.netIrrigationDepthMm,
    grossMm: recommendation.grossIrrigationDepthMm,
    thetaFc: recommendation.soilProfile.thetaFc.value,
    thetaWp: recommendation.soilProfile.thetaWp.value,
  });

  const socVal = recommendation.soilProfile.layers[0]?.organicCarbonPct ?? null;

  const snap: RecommendationSnapshot = {
    recommendationId: `rec-irr-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    fieldId: farm.id,
    ownerId: scopeOwner,
    createdAt: recommendation.generatedAt || new Date().toISOString(),
    kind: 'irrigation',
    inputSignature: signature,
    seasonContext: {
      seasonStart: plantingDate || null,
      seasonEnd: null,
      currentCropId: recommendation.crop.id,
      previousCropId: previousCropId || null,
      horizonSeasons: null,
      referenceDateUtc: recommendation.et0Current.observationDate || new Date().toISOString().slice(0, 10),
    },
    proposedSummary: {
      proposedCropIds: [recommendation.crop.id],
      primaryCropId: recommendation.crop.id,
      irrigationDecisionStatus: recommendation.status,
      netIrrigationMm: recommendation.netIrrigationDepthMm,
      grossIrrigationMm: recommendation.grossIrrigationDepthMm,
      expectedWindowEtcMm: recommendation.forecastSummary?.projectedTotalEtcMm ?? null,
      expectedWindowRainMm: recommendation.forecastSummary?.projectedTotalForecastRainMm ?? null,
      expectedWindowDays: recommendation.forecastSummary?.horizonDays ?? null,
    },
    inputSnapshot: {
      farmerContext,
      soilSourceKind: recommendation.soilProfile.sourceKind,
      thetaFc: recommendation.soilProfile.thetaFc.value,
      thetaWp: recommendation.soilProfile.thetaWp.value,
      socPct: socVal,
      residueManagement,
    },
    environmentalDataRefs: [
      ...(environmentalSnapshotId ? [environmentalSnapshotId] : []),
      recommendation.et0Current.source,
    ],
    soilDataRefs: [recommendation.soilProfile.sourceLabel],
    calculationMethodVersion: 'FAO-56 Penman-Monteith + Soil Water Balance v1',
    assumptionsEn: recommendation.confidenceFactors.map((f) => f.messageEn),
    assumptionsAr: recommendation.confidenceFactors.map((f) => f.messageAr),
    assumptionsFr: recommendation.confidenceFactors.map((f) => f.messageFr),
    missingInputs: recommendation.insufficientDataReasons,
    scientificLimitationsEn: [
      recommendation.soilProfile.notes[0] || recommendation.soilProfile.sourceLabel,
      'ET0 and rainfall windows rely on gridded ~50 km NASA POWER and Open-Meteo NWP feeds rather than in-field gauges.',
    ],
    scientificLimitationsAr: [
      recommendation.soilProfile.notes[0] || recommendation.soilProfile.sourceLabel,
      'تعتمد حسابات ET0 والتساقطات على نماذج شبكية (~50 كم) وليس على محطة رصد داخل الحقل.',
    ],
    scientificLimitationsFr: [
      recommendation.soilProfile.notes[0] || recommendation.soilProfile.sourceLabel,
      "L'ET0 et les pluies reposent sur des modèles maillés (~50 km) et non sur un pluviomètre de parcelle.",
    ],
    explanationEn: recommendation.explanationEn,
    explanationAr: recommendation.explanationAr,
    explanationFr: recommendation.explanationFr,
    status: 'proposed',
    statusUpdatedAt: new Date().toISOString(),
  };

  return appendRecommendationSnapshot(farm.id, scopeOwner, snap, forceNew)?.snapshot || null;
}

export function recordRotationRecommendationSnapshot(params: {
  farm: FarmRecord;
  ownerId?: string | null;
  advice: GlobalCropRotationAdviceResult;
  soil: SoilHydraulicResult;
  farmerContext: FarmerContextProfile;
  residueManagement: CropResidueManagement;
  forceNew?: boolean;
}): RecommendationSnapshot | null {
  const {
    farm,
    ownerId,
    advice,
    soil,
    farmerContext,
    residueManagement,
    forceNew = false,
  } = params;

  if (advice.status !== 'RECOMMENDATIONS_READY' || advice.recommendations.length === 0) {
    return null;
  }

  syncFieldAndCaptureEnvironment({ farm, ownerId, soilHydraulics: soil });
  const scopeOwner = normalizeOwnerScope(ownerId);

  const topIds = advice.recommendations.map((c) => c.cropId);
  const signature = computeDeterministicSignature({
    kind: 'rotation',
    currentCropId: advice.currentCropId,
    previousCropId: advice.previousCropId,
    topIds,
    goal: farmerContext.primaryGoal,
    water: farmerContext.waterAndTechCapacity,
    fin: farmerContext.financialCapacity,
    thetaFc: soil.thetaFc.value,
  });

  const top = advice.recommendations[0];
  const socVal = soil.layers[0]?.organicCarbonPct ?? null;

  const snap: RecommendationSnapshot = {
    recommendationId: `rec-rot-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    fieldId: farm.id,
    ownerId: scopeOwner,
    createdAt: advice.generatedAt || new Date().toISOString(),
    kind: 'rotation',
    inputSignature: signature,
    seasonContext: {
      seasonStart: null,
      seasonEnd: null,
      currentCropId: advice.currentCropId || null,
      previousCropId: advice.previousCropId || null,
      horizonSeasons: 1,
      referenceDateUtc: new Date().toISOString().slice(0, 10),
    },
    proposedSummary: {
      proposedCropIds: topIds,
      primaryCropId: top?.cropId || null,
      expectedWindowRainMm: top?.waterAssessment.observedRainfallMm ?? null,
      expectedWindowDays: top?.waterAssessment.observedWindowDays ?? null,
    },
    inputSnapshot: {
      farmerContext,
      soilSourceKind: soil.sourceKind,
      thetaFc: soil.thetaFc.value,
      thetaWp: soil.thetaWp.value,
      socPct: socVal,
      residueManagement,
    },
    environmentalDataRefs: advice.referenceSources,
    soilDataRefs: [soil.sourceLabel],
    calculationMethodVersion: 'TURBA Global Crop Rotation & Soil Health Advisor v1',
    assumptionsEn: advice.evidenceSummary.contextualAssumptions,
    assumptionsAr: advice.evidenceSummary.contextualAssumptions,
    assumptionsFr: advice.evidenceSummary.contextualAssumptions,
    missingInputs: advice.missingInformation,
    scientificLimitationsEn: [soil.notes[0] || soil.sourceLabel],
    scientificLimitationsAr: [soil.notes[0] || soil.sourceLabel],
    scientificLimitationsFr: [soil.notes[0] || soil.sourceLabel],
    explanationEn: top.whyRecommendedEn,
    explanationAr: top.whyRecommendedAr,
    explanationFr: top.whyRecommendedFr,
    status: 'proposed',
    statusUpdatedAt: new Date().toISOString(),
  };

  return appendRecommendationSnapshot(farm.id, scopeOwner, snap, forceNew)?.snapshot || null;
}

export function recordTransitionRecommendationSnapshot(params: {
  farm: FarmRecord;
  ownerId?: string | null;
  transition: RotationTransitionResult;
  soil: SoilHydraulicResult;
  farmerContext: FarmerContextProfile;
  residueManagement: CropResidueManagement;
  forceNew?: boolean;
}): RecommendationSnapshot | null {
  const {
    farm,
    ownerId,
    transition,
    soil,
    farmerContext,
    residueManagement,
    forceNew = false,
  } = params;

  if (transition.status !== 'PLANS_READY' || !transition.recommendedPathway) {
    return null;
  }

  syncFieldAndCaptureEnvironment({ farm, ownerId, soilHydraulics: soil });
  const scopeOwner = normalizeOwnerScope(ownerId);

  const strategyB = transition.recommendedPathway.cropSequence;
  const conservative = transition.conservativePathway?.cropSequence || [];
  const strategyC = transition.alternativePathway?.cropSequence || [];

  const signature = computeDeterministicSignature({
    kind: 'transition',
    baseline: transition.baseline.sequenceCropIds,
    strategyB,
    conservative,
    strategyC,
    goal: farmerContext.primaryGoal,
    water: farmerContext.waterAndTechCapacity,
  });

  const socVal = soil.layers[0]?.organicCarbonPct ?? null;

  const snap: RecommendationSnapshot = {
    recommendationId: `rec-trn-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    fieldId: farm.id,
    ownerId: scopeOwner,
    createdAt: transition.generatedAt || new Date().toISOString(),
    kind: 'transition',
    inputSignature: signature,
    seasonContext: {
      seasonStart: null,
      seasonEnd: null,
      currentCropId:
        transition.baseline.sequenceCropIds[transition.baseline.sequenceCropIds.length - 1] || null,
      previousCropId:
        transition.baseline.sequenceCropIds.length > 1
          ? transition.baseline.sequenceCropIds[transition.baseline.sequenceCropIds.length - 2]
          : null,
      horizonSeasons: strategyB.length,
      referenceDateUtc: new Date().toISOString().slice(0, 10),
    },
    proposedSummary: {
      proposedCropIds: strategyB,
      primaryCropId: strategyB[0] || null,
      strategyBSequence: strategyB,
      conservativeSequence: conservative,
      strategyCSequence: strategyC,
      resilienceFocus: transition.alternativePathway?.resilienceFocusUsed ?? null,
    },
    inputSnapshot: {
      farmerContext,
      soilSourceKind: soil.sourceKind,
      thetaFc: soil.thetaFc.value,
      thetaWp: soil.thetaWp.value,
      socPct: socVal,
      residueManagement,
    },
    environmentalDataRefs: transition.dataSourcesUsed.map((d) => `${d.source} (${d.retrievalDate})`),
    soilDataRefs: [soil.sourceLabel],
    calculationMethodVersion: 'Rotation Transition Bridge Dijkstra Planner v1',
    assumptionsEn: transition.assumptionsEn,
    assumptionsAr: transition.assumptionsAr,
    assumptionsFr: transition.assumptionsFr,
    missingInputs: transition.missingInformation,
    scientificLimitationsEn: [soil.notes[0] || soil.sourceLabel],
    scientificLimitationsAr: [soil.notes[0] || soil.sourceLabel],
    scientificLimitationsFr: [soil.notes[0] || soil.sourceLabel],
    explanationEn: transition.recommendedPathway.whyGeneratedEn,
    explanationAr: transition.recommendedPathway.whyGeneratedAr,
    explanationFr: transition.recommendedPathway.whyGeneratedFr,
    status: 'proposed',
    statusUpdatedAt: new Date().toISOString(),
  };

  return appendRecommendationSnapshot(farm.id, scopeOwner, snap, forceNew)?.snapshot || null;
}

export function saveSeasonWithValidation(params: {
  fieldId: string;
  ownerId?: string | null;
  seasonInput: Parameters<typeof validateSeasonInput>[0];
  editNote?: string;
}): {
  ok: boolean;
  errors: string[];
  season?: SeasonRecord;
  isEdit?: boolean;
} {
  const { fieldId, ownerId, seasonInput, editNote } = params;
  const validation = validateSeasonInput({ ...seasonInput, fieldId });
  if (!validation.valid || !validation.sanitized) {
    return { ok: false, errors: validation.errors };
  }

  const bundle = getFieldBundle(fieldId, ownerId);
  if (!bundle) {
    return { ok: false, errors: ['Field memory does not exist for this field ID and owner scope.'] };
  }

  const res = saveSeasonRecord(fieldId, ownerId, validation.sanitized, editNote);
  if (!res) {
    return { ok: false, errors: ['Failed to save season record.'] };
  }
  return { ok: true, errors: [], season: res.saved, isEdit: res.isEdit };
}

export function saveOutcomeWithSanitization(params: {
  fieldId: string;
  ownerId?: string | null;
  rawOutcome: Omit<ReportedOutcomeRecord, 'reportedAt' | 'updatedAt' | 'outcomeId'> & {
    outcomeId?: string;
  };
}): ReportedOutcomeRecord | null {
  const { fieldId, ownerId, rawOutcome } = params;
  const outcomeId = rawOutcome.outcomeId || `out-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const nowIso = new Date().toISOString();
  const clean = sanitizeStoredOutcome({
    ...rawOutcome,
    fieldId,
    outcomeId,
    reportedAt: nowIso,
    updatedAt: nowIso,
  });
  if (!clean) return null;
  return saveOutcomeReport(fieldId, ownerId, clean);
}

export function buildFieldTimeline(bundle: StoredFieldMemoryBundle): LandMemoryTimelineEvent[] {
  const events: LandMemoryTimelineEvent[] = [];
  const sortedSeasons = [...bundle.seasons].sort((a, b) => a.seasonStart.localeCompare(b.seasonStart));

  // 1. Season Records + multi-month gaps between seasons
  for (let i = 0; i < sortedSeasons.length; i++) {
    const s = sortedSeasons[i];
    events.push({
      eventId: `tl-season-${s.seasonId}`,
      fieldId: bundle.fieldMemory.fieldId,
      eventType: 'season_record',
      sourceRecordId: s.seasonId,
      dateSortKey: s.seasonStart,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      titleEn: `Season: ${s.cropName}${s.cropFamily ? ` (${s.cropFamily})` : ''}`,
      titleAr: `موسم: ${getGlobalRotationCropById(s.cropId)?.commonNameAr || s.cropName}${
        s.cropFamily ? ` (${s.cropFamily})` : ''
      }`,
      titleFr: `Saison : ${getGlobalRotationCropById(s.cropId)?.commonNameFr || s.cropName}${
        s.cropFamily ? ` (${s.cropFamily})` : ''
      }`,
      summaryEn: `Period: ${s.seasonStart}${s.seasonEnd ? ` → ${s.seasonEnd}` : ' (ongoing/open)'}${
        s.irrigationAmountMm !== null ? ` • Applied irrigation: ${s.irrigationAmountMm} mm` : ' • Irrigation volume not reported'
      }`,
      summaryAr: `الفترة: ${s.seasonStart}${s.seasonEnd ? ` ← ${s.seasonEnd}` : ' (مستمر/غير محدد)'}${
        s.irrigationAmountMm !== null ? ` • الري المطبق: ${s.irrigationAmountMm} مم` : ' • كمية الري غير مسجلة'
      }`,
      summaryFr: `Période : ${s.seasonStart}${s.seasonEnd ? ` → ${s.seasonEnd}` : ' (en cours/ouvert)'}${
        s.irrigationAmountMm !== null ? ` • Irrigation : ${s.irrigationAmountMm} mm` : ' • Dose non saisie'
      }`,
      origin: s.dataOrigin as SeasonRecordOrigin,
      qualityStatus: s.dataOrigin === 'verified_measurement' ? 'verified_measurement' : 'farmer_reported',
      hasMissingData: s.isIncomplete,
      missingDetails: s.missingFields,
      editable: true,
    });

    // Check explicit inter-season gap (> 240 days between previous end/start and next start)
    if (i > 0) {
      const prev = sortedSeasons[i - 1];
      const anchorPrev = (prev.harvestDate || prev.seasonEnd || prev.seasonStart).slice(0, 10);
      const anchorCurr = s.seasonStart.slice(0, 10);
      const t1 = Date.parse(anchorPrev.length === 7 ? `${anchorPrev}-01` : anchorPrev);
      const t2 = Date.parse(anchorCurr.length === 7 ? `${anchorCurr}-01` : anchorCurr);
      if (!Number.isNaN(t1) && !Number.isNaN(t2)) {
        const gapDays = Math.round((t2 - t1) / (1000 * 60 * 60 * 24));
        if (gapDays > 240) {
          events.push({
            eventId: `tl-gap-${prev.seasonId}-${s.seasonId}`,
            fieldId: bundle.fieldMemory.fieldId,
            eventType: 'data_gap',
            sourceRecordId: `gap-${prev.seasonId}-${s.seasonId}`,
            dateSortKey: anchorPrev,
            createdAt: s.createdAt,
            updatedAt: s.updatedAt,
            titleEn: `Missing History Gap (~${gapDays} days unrecorded)`,
            titleAr: `فجوة زمنية بدون سجل (~${gapDays} يوماً غير موثق)`,
            titleFr: `Lacune d'historique (~${gapDays} jours non documentés)`,
            summaryEn: `No crop or fallow status recorded between ${anchorPrev} and ${anchorCurr}. Record fallow or intermediate crops if known.`,
            summaryAr: `لم يُسجل أي محصول أو راحة أرض بين ${anchorPrev} و ${anchorCurr}.`,
            summaryFr: `Aucune culture ni jachère enregistrée entre le ${anchorPrev} et le ${anchorCurr}.`,
            origin: 'system_analysis',
            qualityStatus: 'missing_data',
            hasMissingData: true,
            missingDetails: ['Unrecorded interval between seasons'],
            editable: false,
          });
        }
      }
    }
  }

  // 2. Recommendation Snapshots
  for (const rec of bundle.recommendations) {
    const kindLabelEn =
      rec.kind === 'irrigation' ? 'Irrigation Decision' : rec.kind === 'rotation' ? 'Crop Rotation Advice' : 'Transition Plan';
    const kindLabelAr =
      rec.kind === 'irrigation' ? 'قرار الري' : rec.kind === 'rotation' ? 'استشارة الدورة' : 'مسار الانتقال';
    const kindLabelFr =
      rec.kind === 'irrigation' ? 'Décision Irrigation' : rec.kind === 'rotation' ? 'Conseil Rotation' : 'Plan de Transition';

    events.push({
      eventId: `tl-rec-${rec.recommendationId}`,
      fieldId: bundle.fieldMemory.fieldId,
      eventType: 'recommendation',
      sourceRecordId: rec.recommendationId,
      dateSortKey: rec.createdAt.slice(0, 10),
      createdAt: rec.createdAt,
      updatedAt: rec.statusUpdatedAt,
      titleEn: `Snapshot (${kindLabelEn}) • ${rec.status.toUpperCase()}`,
      titleAr: `توصية محفوظة (${kindLabelAr}) • ${rec.status}`,
      titleFr: `Instantané (${kindLabelFr}) • ${rec.status}`,
      summaryEn: rec.explanationEn,
      summaryAr: rec.explanationAr,
      summaryFr: rec.explanationFr,
      origin: 'calculated',
      qualityStatus: 'calculated',
      hasMissingData: rec.missingInputs.length > 0,
      missingDetails: rec.missingInputs,
      editable: false,
    });
  }

  // 3. Farmer Reported Outcomes
  for (const out of bundle.outcomes) {
    events.push({
      eventId: `tl-out-${out.outcomeId}`,
      fieldId: bundle.fieldMemory.fieldId,
      eventType: 'reported_outcome',
      sourceRecordId: out.outcomeId,
      dateSortKey: (out.actualPlantingDate || out.reportedAt).slice(0, 10),
      createdAt: out.reportedAt,
      updatedAt: out.updatedAt,
      titleEn: `Reported Outcome: ${out.actualCropPlanted || out.actualCropId || 'Field Observation'} (${out.observedCropCondition})`,
      titleAr: `نتيجة فعلية: ${out.actualCropPlanted || out.actualCropId || 'ملاحظة ميدانية'} (${out.observedCropCondition})`,
      titleFr: `Bilan réel : ${out.actualCropPlanted || out.actualCropId || 'Observation'} (${out.observedCropCondition})`,
      summaryEn: out.farmerAssessment || 'Outcome archived for Prediction vs. Reality audit.',
      summaryAr: out.farmerAssessment || 'تم توثيق النتيجة الفعلية للمقارنة مع التوقعات.',
      summaryFr: out.farmerAssessment || 'Bilan réel archivé pour comparaison prévision vs réalité.',
      origin: 'farmer_report',
      qualityStatus: 'farmer_reported',
      hasMissingData: out.actualIrrigationAmount === null && out.yieldValue === null,
      missingDetails: [
        ...(out.actualIrrigationAmount === null ? ['actualIrrigationAmount'] : []),
        ...(out.yieldValue === null ? ['yieldValue'] : []),
      ],
      editable: true,
    });
  }

  // 4. Environmental Snapshots (compact summary points)
  for (const snap of bundle.environmentalSnapshots) {
    const missingEnv: string[] = [];
    if (snap.nasaPowerTempMeanC === null) missingEnv.push('NASA POWER unavailable');
    if (snap.soilThetaFc === null) missingEnv.push('Soil baseline unavailable');
    if (snap.sentinel2Status === 'UNAVAILABLE') missingEnv.push('Sentinel-2 unavailable');

    events.push({
      eventId: `tl-env-${snap.snapshotId}`,
      fieldId: bundle.fieldMemory.fieldId,
      eventType: 'environmental_snapshot',
      sourceRecordId: snap.snapshotId,
      dateSortKey: snap.capturedAt.slice(0, 10),
      createdAt: snap.capturedAt,
      updatedAt: snap.capturedAt,
      titleEn: 'Environmental Baseline Snapshot (NASA / Open-Meteo / Soil / S-2)',
      titleAr: 'لقطة بيئية مرجعية (ناسا / Open-Meteo / التربة / S-2)',
      titleFr: 'Capture environnementale (NASA / Open-Meteo / Sol / S-2)',
      summaryEn: `T2M=${snap.nasaPowerTempMeanC ?? 'N/A'}°C • 30d Rain=${snap.nasaPower30DayRainMm ?? 'N/A'} mm • Soil=${snap.soilSourceLabel}`,
      summaryAr: `الحرارة=${snap.nasaPowerTempMeanC ?? 'غير متوفر'}°م • أمطار 30ي=${snap.nasaPower30DayRainMm ?? 'غير متوفر'} مم • التربة=${snap.soilSourceLabel}`,
      summaryFr: `T2M=${snap.nasaPowerTempMeanC ?? 'N/A'}°C • Pluie 30j=${snap.nasaPower30DayRainMm ?? 'N/A'} mm • Sol=${snap.soilSourceLabel}`,
      origin: 'spatial_estimate',
      qualityStatus: missingEnv.length === 3 ? 'missing_data' : 'estimated',
      hasMissingData: missingEnv.length > 0,
      missingDetails: missingEnv,
      editable: false,
    });
  }

  // Sort newest first by dateSortKey, then createdAt desc
  return events.sort((a, b) => {
    const dCmp = b.dateSortKey.localeCompare(a.dateSortKey);
    if (dCmp !== 0) return dCmp;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

export function getLandMemoryWorkspaceState(
  fieldId: string,
  ownerId: string | null = DEFAULT_LOCAL_OWNER_ID
): LandMemoryWorkspaceState {
  const bundle = getFieldBundle(fieldId, ownerId);
  if (!bundle) {
    return {
      fieldMemory: null,
      seasons: [],
      recommendations: [],
      outcomes: [],
      environmentalSnapshots: [],
      provenanceEntries: [],
      comparisons: [],
      timeline: [],
      learningContext: null,
    };
  }

  const comparisons = [...bundle.recommendations]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((rec) => {
      const outcome =
        bundle.outcomes.find((o) => o.recommendationId === rec.recommendationId) || null;
      return comparePredictionWithReality({
        fieldMemory: bundle.fieldMemory,
        recommendation: rec,
        outcome,
      });
    });

  const timeline = buildFieldTimeline(bundle);
  const learningContext = deriveEvidenceLearningContext({
    fieldId: bundle.fieldMemory.fieldId,
    seasons: bundle.seasons,
    recommendations: bundle.recommendations,
    outcomes: bundle.outcomes,
  });

  return {
    fieldMemory: bundle.fieldMemory,
    seasons: bundle.seasons,
    recommendations: [...bundle.recommendations].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt)
    ),
    outcomes: bundle.outcomes,
    environmentalSnapshots: bundle.environmentalSnapshots,
    provenanceEntries: bundle.provenanceEntries,
    comparisons,
    timeline,
    learningContext,
  };
}

export {
  DEFAULT_LOCAL_OWNER_ID,
  deleteSeasonRecord,
  exportFieldBackupPayload,
  importFieldBackupPayload,
  listFieldMemoriesForOwner,
  updateRecommendationStatus,
};
export type { RecommendationStatus };
