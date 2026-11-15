/**
 * TURBA — THE LIVING LAND MEMORY (ذاكرة الأرض)
 * Runtime Validation, Sanitization & Integrity Guards
 *
 * Ensures corrupted storage entries, NaN/Infinity values, impossible dates,
 * or invalid enumerations never poison field memory or fabricate records.
 */

import { Coordinates } from '../../types/farm';
import { getGlobalRotationCropById } from '../../data/crops';
import {
  EnvironmentalSnapshotRecord,
  FieldMemory,
  LandMemoryBackupPayload,
  LandMemoryProvenanceEntry,
  ObservedCropCondition,
  RecommendationSnapshot,
  RecommendationStatus,
  ReportedOutcomeRecord,
  SeasonRecord,
  SeasonRecordOrigin,
} from './types';

const VALID_SEASON_ORIGINS: ReadonlySet<SeasonRecordOrigin> = new Set([
  'farmer_report',
  'imported_record',
  'verified_measurement',
  'system_analysis',
]);

const VALID_REC_STATUSES: ReadonlySet<RecommendationStatus> = new Set([
  'proposed',
  'accepted',
  'rejected',
  'modified',
  'not_recorded',
]);

const VALID_CONDITIONS: ReadonlySet<ObservedCropCondition> = new Set([
  'good',
  'moderate_stress',
  'severe_stress',
  'failed',
  'not_reported',
]);

export function sanitizeShortString(val: unknown, maxLen = 160): string {
  if (typeof val !== 'string') return '';
  return val.trim().slice(0, maxLen);
}

export function sanitizeOptionalString(val: unknown, maxLen = 240): string | null {
  if (typeof val !== 'string') return null;
  const trimmed = val.trim().slice(0, maxLen);
  return trimmed.length > 0 ? trimmed : null;
}

export function sanitizeFiniteNumber(
  val: unknown,
  min = -Infinity,
  max = Infinity
): number | null {
  if (typeof val !== 'number' || !Number.isFinite(val)) return null;
  if (val < min || val > max) return null;
  return val;
}

export function sanitizeIsoDateOrNull(val: unknown): string | null {
  if (typeof val !== 'string') return null;
  const t = val.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) {
    const dt = new Date(`${t}T00:00:00Z`);
    if (!Number.isNaN(dt.getTime()) && dt.toISOString().slice(0, 10) === t) {
      return t;
    }
  }
  return null;
}

export function sanitizeSeasonDate(val: unknown): string {
  if (typeof val !== 'string') return '';
  const t = val.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) {
    return sanitizeIsoDateOrNull(t) || '';
  }
  if (/^\d{4}-\d{2}$/.test(t)) {
    const m = Number(t.slice(5, 7));
    if (m >= 1 && m <= 12) return t;
  }
  if (/^\d{4}$/.test(t)) {
    const y = Number(t);
    if (y >= 1950 && y <= 2100) return t;
  }
  return '';
}

export function isValidCoordinatesPair(raw: unknown): raw is Coordinates {
  if (!raw || typeof raw !== 'object') return false;
  const { lat, lng } = raw as { lat?: unknown; lng?: unknown };
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

export function computeSeasonMissingFields(draft: {
  seasonStart: string;
  seasonEnd: string | null;
  plantingDate: string | null;
  harvestDate: string | null;
  irrigationMethod: string | null;
  irrigationAmountMm: number | null;
  cropFamily: string | null;
  previousCropId: string | null;
}): string[] {
  const missing: string[] = [];
  if (!draft.seasonStart) missing.push('seasonStart');
  if (!draft.plantingDate) missing.push('plantingDate');
  if (!draft.harvestDate && !draft.seasonEnd) missing.push('harvestDate / seasonEnd');
  if (!draft.cropFamily) missing.push('cropFamily');
  if (!draft.previousCropId) missing.push('previousCropId');
  if (!draft.irrigationMethod) missing.push('irrigationMethod');
  if (draft.irrigationAmountMm === null) missing.push('irrigationAmountMm');
  return missing;
}

export function validateSeasonInput(raw: {
  seasonId?: string;
  fieldId: string;
  seasonStart: unknown;
  seasonEnd?: unknown;
  cropId?: unknown;
  cropName?: unknown;
  cropFamily?: unknown;
  plantingDate?: unknown;
  harvestDate?: unknown;
  previousCropId?: unknown;
  irrigationMethod?: unknown;
  irrigationAmountMm?: unknown;
  irrigationAmountOrigin?: unknown;
  fertilizerAndAmendments?: unknown;
  managementPractices?: unknown;
  farmerNotes?: unknown;
  evidenceReferences?: unknown;
  dataOrigin?: unknown;
}): {
  valid: boolean;
  errors: string[];
  sanitized?: Omit<SeasonRecord, 'createdAt' | 'updatedAt' | 'editHistory'>;
} {
  const errors: string[] = [];
  const fieldId = sanitizeShortString(raw.fieldId, 120);
  if (!fieldId) {
    errors.push('Field ID is required to record a season.');
  }

  const plantingDate = sanitizeIsoDateOrNull(raw.plantingDate);
  const harvestDate = sanitizeIsoDateOrNull(raw.harvestDate);
  let seasonStart = sanitizeSeasonDate(raw.seasonStart);
  if (!seasonStart && plantingDate) {
    seasonStart = plantingDate;
  }
  if (!seasonStart) {
    errors.push('Season start date (YYYY-MM-DD or YYYY-MM) is required.');
  }

  let seasonEnd = sanitizeOptionalString(
    typeof raw.seasonEnd === 'string' ? sanitizeSeasonDate(raw.seasonEnd) : null,
    16
  );
  if (!seasonEnd && harvestDate) {
    seasonEnd = harvestDate;
  }
  if (plantingDate && harvestDate && harvestDate < plantingDate) {
    errors.push('Harvest date cannot be earlier than planting date.');
  }
  if (seasonStart && seasonEnd && seasonEnd < seasonStart) {
    errors.push('Season end cannot be earlier than season start.');
  }

  const rawCropId = sanitizeShortString(raw.cropId, 64);
  const knownCrop = rawCropId ? getGlobalRotationCropById(rawCropId) : null;
  const rawCropName = sanitizeShortString(raw.cropName, 120);
  const cropId = knownCrop ? knownCrop.id : rawCropId || rawCropName.toLowerCase().replace(/\s+/g, '_');
  const cropName = rawCropName || (knownCrop ? knownCrop.commonNameEn : '');

  if (!cropName) {
    errors.push('Crop name or known crop selection is required.');
  }

  const cropFamily =
    sanitizeOptionalString(raw.cropFamily, 64) || (knownCrop ? knownCrop.family : null);

  const rawIrr =
    raw.irrigationAmountMm === '' || raw.irrigationAmountMm === null || raw.irrigationAmountMm === undefined
      ? null
      : Number(raw.irrigationAmountMm);
  if (rawIrr !== null && (!Number.isFinite(rawIrr) || rawIrr < 0 || rawIrr > 5000)) {
    errors.push('Irrigation amount must be a finite number between 0 and 5000 mm.');
  }

  const dataOrigin: SeasonRecordOrigin =
    typeof raw.dataOrigin === 'string' && VALID_SEASON_ORIGINS.has(raw.dataOrigin as SeasonRecordOrigin)
      ? (raw.dataOrigin as SeasonRecordOrigin)
      : 'farmer_report';

  const irrigationAmountOrigin: SeasonRecordOrigin | null =
    rawIrr === null
      ? null
      : typeof raw.irrigationAmountOrigin === 'string' &&
        VALID_SEASON_ORIGINS.has(raw.irrigationAmountOrigin as SeasonRecordOrigin)
      ? (raw.irrigationAmountOrigin as SeasonRecordOrigin)
      : dataOrigin;

  const evidenceReferences = Array.isArray(raw.evidenceReferences)
    ? raw.evidenceReferences
        .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
        .map((s) => s.trim().slice(0, 240))
        .slice(0, 10)
    : [];

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const previousCropId = sanitizeOptionalString(raw.previousCropId, 64);
  const irrigationMethod = sanitizeOptionalString(raw.irrigationMethod, 64);
  const missingFields = computeSeasonMissingFields({
    seasonStart,
    seasonEnd,
    plantingDate,
    harvestDate,
    irrigationMethod,
    irrigationAmountMm: rawIrr,
    cropFamily,
    previousCropId,
  });

  const seasonId =
    raw.seasonId && sanitizeShortString(raw.seasonId, 120)
      ? sanitizeShortString(raw.seasonId, 120)
      : `season-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  return {
    valid: true,
    errors: [],
    sanitized: {
      seasonId,
      fieldId,
      seasonStart,
      seasonEnd,
      cropId,
      cropName,
      cropFamily,
      plantingDate,
      harvestDate,
      previousCropId,
      irrigationMethod,
      irrigationAmountMm: rawIrr,
      irrigationAmountOrigin,
      fertilizerAndAmendments: sanitizeOptionalString(raw.fertilizerAndAmendments, 320),
      managementPractices: sanitizeOptionalString(raw.managementPractices, 320),
      farmerNotes: sanitizeShortString(raw.farmerNotes, 1000),
      evidenceReferences,
      dataOrigin,
      isIncomplete: missingFields.length > 0,
      missingFields,
    },
  };
}

export function sanitizeStoredFieldMemory(raw: unknown): FieldMemory | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const fieldId = sanitizeShortString(r.fieldId, 120);
  const fieldName = sanitizeShortString(r.fieldName, 160);
  if (!fieldId || !fieldName || !isValidCoordinatesPair(r.coordinates)) return null;

  let boundaryGeometry: Coordinates[] | null = null;
  if (Array.isArray(r.boundaryGeometry) && r.boundaryGeometry.length >= 3) {
    const pts = r.boundaryGeometry.filter(isValidCoordinatesPair);
    if (pts.length >= 3) boundaryGeometry = pts;
  }

  const area = sanitizeFiniteNumber(r.area, 0.0001, 500000);

  return {
    fieldId,
    ownerId: sanitizeShortString(r.ownerId, 120) || 'local-unauthenticated',
    createdAt: sanitizeShortString(r.createdAt, 64) || new Date().toISOString(),
    updatedAt: sanitizeShortString(r.updatedAt, 64) || new Date().toISOString(),
    fieldName,
    region: sanitizeShortString(r.region, 120),
    province: sanitizeShortString(r.province, 120),
    coordinates: { lat: r.coordinates.lat, lng: r.coordinates.lng },
    boundaryGeometry,
    area,
    areaUnit: area !== null ? 'ha' : null,
    locationPrecision: sanitizeShortString(r.locationPrecision, 160) || 'Point coordinate',
    cadastralReference: sanitizeOptionalString(r.cadastralReference, 120),
    baselineAssessmentRef: sanitizeOptionalString(r.baselineAssessmentRef, 120),
    notes: sanitizeShortString(r.notes, 1000),
  };
}

export function sanitizeStoredSeasonRecord(raw: unknown): SeasonRecord | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const validated = validateSeasonInput({
    seasonId: typeof r.seasonId === 'string' ? r.seasonId : undefined,
    fieldId: typeof r.fieldId === 'string' ? r.fieldId : '',
    seasonStart: r.seasonStart,
    seasonEnd: r.seasonEnd,
    cropId: r.cropId,
    cropName: r.cropName,
    cropFamily: r.cropFamily,
    plantingDate: r.plantingDate,
    harvestDate: r.harvestDate,
    previousCropId: r.previousCropId,
    irrigationMethod: r.irrigationMethod,
    irrigationAmountMm: r.irrigationAmountMm,
    irrigationAmountOrigin: r.irrigationAmountOrigin,
    fertilizerAndAmendments: r.fertilizerAndAmendments,
    managementPractices: r.managementPractices,
    farmerNotes: r.farmerNotes,
    evidenceReferences: r.evidenceReferences,
    dataOrigin: r.dataOrigin,
  });

  if (!validated.valid || !validated.sanitized) return null;

  const editHistory = Array.isArray(r.editHistory)
    ? r.editHistory
        .filter(
          (e): e is { editedAt: string; note: string } =>
            Boolean(e) &&
            typeof e === 'object' &&
            typeof (e as { editedAt?: unknown }).editedAt === 'string' &&
            typeof (e as { note?: unknown }).note === 'string'
        )
        .slice(0, 30)
    : [];

  return {
    ...validated.sanitized,
    createdAt: sanitizeShortString(r.createdAt, 64) || new Date().toISOString(),
    updatedAt: sanitizeShortString(r.updatedAt, 64) || new Date().toISOString(),
    editHistory,
  };
}

export function sanitizeStoredRecommendation(raw: unknown): RecommendationSnapshot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const recommendationId = sanitizeShortString(r.recommendationId, 120);
  const fieldId = sanitizeShortString(r.fieldId, 120);
  if (!recommendationId || !fieldId) return null;
  const kind =
    r.kind === 'irrigation' || r.kind === 'rotation' || r.kind === 'transition'
      ? r.kind
      : null;
  if (!kind) return null;

  const status: RecommendationStatus =
    typeof r.status === 'string' && VALID_REC_STATUSES.has(r.status as RecommendationStatus)
      ? (r.status as RecommendationStatus)
      : 'not_recorded';

  return {
    ...(r as unknown as RecommendationSnapshot),
    recommendationId,
    fieldId,
    ownerId: sanitizeShortString(r.ownerId, 120) || 'local-unauthenticated',
    kind,
    status,
    statusUpdatedAt: sanitizeShortString(r.statusUpdatedAt, 64) || new Date().toISOString(),
  };
}

export function sanitizeStoredOutcome(raw: unknown): ReportedOutcomeRecord | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const outcomeId = sanitizeShortString(r.outcomeId, 120);
  const fieldId = sanitizeShortString(r.fieldId, 120);
  const recommendationId = sanitizeShortString(r.recommendationId, 120);
  if (!outcomeId || !fieldId || !recommendationId) return null;

  const condition: ObservedCropCondition =
    typeof r.observedCropCondition === 'string' &&
    VALID_CONDITIONS.has(r.observedCropCondition as ObservedCropCondition)
      ? (r.observedCropCondition as ObservedCropCondition)
      : 'not_reported';

  const irrigationUnit =
    r.actualIrrigationUnit === 'mm' ||
    r.actualIrrigationUnit === 'm3' ||
    r.actualIrrigationUnit === 'L/plant'
      ? r.actualIrrigationUnit
      : null;

  const yieldUnit =
    r.yieldUnit === 't/ha' || r.yieldUnit === 'kg/ha' || r.yieldUnit === 'kg/plot'
      ? r.yieldUnit
      : null;

  const actualIrrAmt = sanitizeFiniteNumber(r.actualIrrigationAmount, 0, 10000000);
  const yieldVal = sanitizeFiniteNumber(r.yieldValue, 0, 1000000);

  return {
    outcomeId,
    fieldId,
    recommendationId,
    seasonId: sanitizeOptionalString(r.seasonId, 120),
    reportedAt: sanitizeShortString(r.reportedAt, 64) || new Date().toISOString(),
    updatedAt: sanitizeShortString(r.updatedAt, 64) || new Date().toISOString(),
    actualCropPlanted: sanitizeOptionalString(r.actualCropPlanted, 120),
    actualCropId: sanitizeOptionalString(r.actualCropId, 64),
    actualPlantingDate: sanitizeIsoDateOrNull(r.actualPlantingDate),
    actualHarvestDate: sanitizeIsoDateOrNull(r.actualHarvestDate),
    actualIrrigationAmount: actualIrrAmt,
    actualIrrigationUnit: actualIrrAmt !== null ? irrigationUnit : null,
    actualIrrigationOrigin:
      actualIrrAmt !== null &&
      typeof r.actualIrrigationOrigin === 'string' &&
      VALID_SEASON_ORIGINS.has(r.actualIrrigationOrigin as SeasonRecordOrigin)
        ? (r.actualIrrigationOrigin as SeasonRecordOrigin)
        : actualIrrAmt !== null
        ? 'farmer_report'
        : null,
    observedCropCondition: condition,
    yieldValue: yieldVal,
    yieldUnit: yieldVal !== null ? yieldUnit : null,
    yieldOrigin:
      yieldVal !== null &&
      typeof r.yieldOrigin === 'string' &&
      VALID_SEASON_ORIGINS.has(r.yieldOrigin as SeasonRecordOrigin)
        ? (r.yieldOrigin as SeasonRecordOrigin)
        : yieldVal !== null
        ? 'farmer_report'
        : null,
    observedWaterShortage:
      typeof r.observedWaterShortage === 'boolean' ? r.observedWaterShortage : null,
    pestOrDiseaseObservations: sanitizeOptionalString(r.pestOrDiseaseObservations, 500),
    farmerAssessment: sanitizeShortString(r.farmerAssessment, 1000),
    supportingReferences: Array.isArray(r.supportingReferences)
      ? r.supportingReferences
          .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
          .map((s) => s.trim().slice(0, 240))
          .slice(0, 10)
      : [],
    recordedPeriodRainfallMm: sanitizeFiniteNumber(r.recordedPeriodRainfallMm, 0, 5000),
    recordedRainfallSource: sanitizeOptionalString(r.recordedRainfallSource, 160),
    measuredPostSeasonSocPct: sanitizeFiniteNumber(r.measuredPostSeasonSocPct, 0, 40),
    measuredPostSeasonSoilOrigin:
      typeof r.measuredPostSeasonSoilOrigin === 'string' &&
      VALID_SEASON_ORIGINS.has(r.measuredPostSeasonSoilOrigin as SeasonRecordOrigin)
        ? (r.measuredPostSeasonSoilOrigin as SeasonRecordOrigin)
        : null,
  };
}

export function sanitizeBackupPayload(raw: unknown): LandMemoryBackupPayload | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (r.schemaVersion !== 1) return null;
  const fieldMemory = sanitizeStoredFieldMemory(r.fieldMemory);
  if (!fieldMemory) return null;

  const seasons = Array.isArray(r.seasons)
    ? r.seasons.map(sanitizeStoredSeasonRecord).filter((x): x is SeasonRecord => Boolean(x))
    : [];
  const recommendations = Array.isArray(r.recommendations)
    ? r.recommendations
        .map(sanitizeStoredRecommendation)
        .filter((x): x is RecommendationSnapshot => Boolean(x))
    : [];
  const outcomes = Array.isArray(r.outcomes)
    ? r.outcomes.map(sanitizeStoredOutcome).filter((x): x is ReportedOutcomeRecord => Boolean(x))
    : [];
  const environmentalSnapshots = Array.isArray(r.environmentalSnapshots)
    ? (r.environmentalSnapshots.filter(
        (x) => Boolean(x) && typeof x === 'object' && typeof (x as EnvironmentalSnapshotRecord).snapshotId === 'string'
      ) as EnvironmentalSnapshotRecord[])
    : [];
  const provenanceEntries = Array.isArray(r.provenanceEntries)
    ? (r.provenanceEntries.filter(
        (x) => Boolean(x) && typeof x === 'object' && typeof (x as LandMemoryProvenanceEntry).provenanceId === 'string'
      ) as LandMemoryProvenanceEntry[])
    : [];

  return {
    schemaVersion: 1,
    exportedAt: sanitizeShortString(r.exportedAt, 64) || new Date().toISOString(),
    ownerScope: sanitizeShortString(r.ownerScope, 120) || fieldMemory.ownerId,
    fieldId: fieldMemory.fieldId,
    storageDisclosure: sanitizeShortString(r.storageDisclosure, 400),
    fieldMemory,
    seasons: seasons.filter((s) => s.fieldId === fieldMemory.fieldId),
    recommendations: recommendations.filter((rec) => rec.fieldId === fieldMemory.fieldId),
    outcomes: outcomes.filter((o) => o.fieldId === fieldMemory.fieldId),
    environmentalSnapshots: environmentalSnapshots.filter((s) => s.fieldId === fieldMemory.fieldId),
    provenanceEntries: provenanceEntries.filter((p) => p.fieldId === fieldMemory.fieldId),
  };
}
