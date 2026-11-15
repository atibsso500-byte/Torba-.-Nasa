/**
 * TURBA — THE LIVING LAND MEMORY (ذاكرة الأرض)
 * Core Scientific & Persistence Type Definitions
 *
 * Strict Integrity Principles:
 * - Zero fabricated field boundaries, seasons, yields, or telemetry.
 * - Unknown or unreported measurements remain strictly `null`.
 * - Every observation, report, and derived indicator preserves origin and provenance.
 */

import { Coordinates, DataStatus, FreshnessStatus } from '../../types/farm';
import {
  CropBotanicalFamily,
  FarmerContextProfile,
  IrrigationDecisionStatus,
  RotationTransitionResult,
  SoilDataSourceKind,
  TransitionResilienceFocus,
} from '../../types/irrigation';

export type LandMemoryDataOrigin =
  | 'farmer_report'
  | 'imported_record'
  | 'verified_measurement'
  | 'calculated'
  | 'spatial_estimate'
  | 'system_analysis';

export type SeasonRecordOrigin =
  | 'farmer_report'
  | 'imported_record'
  | 'verified_measurement'
  | 'system_analysis';

export type LandMemoryQualityStatus =
  | 'verified_measurement'
  | 'farmer_reported'
  | 'estimated'
  | 'calculated'
  | 'missing_data'
  | 'outdated_data';

export type RecommendationKind = 'irrigation' | 'rotation' | 'transition';

export type RecommendationStatus =
  | 'proposed'
  | 'accepted'
  | 'rejected'
  | 'modified'
  | 'not_recorded';

export interface LandMemoryProvenanceEntry {
  provenanceId: string;
  fieldId: string;
  sourceProvider: string;
  variable: string;
  value: number | string | null;
  unit: string;
  observationOrReferenceDate: string; // YYYY-MM-DD or ISO timestamp, or 'Unavailable'
  retrievalTimestamp: string; // ISO 8601 UTC
  coordinates: Coordinates;
  spatialResolution: string;
  temporalResolution: string;
  processingMethod: string;
  origin: LandMemoryDataOrigin;
  qualityStatus: LandMemoryQualityStatus;
  dataStatus: DataStatus;
  freshness: FreshnessStatus;
  limitations: string;
}

export interface EnvironmentalSnapshotRecord {
  snapshotId: string;
  fieldId: string;
  capturedAt: string; // ISO 8601 UTC
  coordinates: Coordinates;
  nasaPowerDateUtc: string | null;
  nasaPowerTempMeanC: number | null;
  nasaPowerTempMinC: number | null;
  nasaPowerTempMaxC: number | null;
  nasaPowerRainfallDailyMm: number | null;
  nasaPower30DayRainMm: number | null;
  nasaPower30DayBaselineMm: number | null;
  nasaPowerAnomalyPct: number | null;
  nasaPowerSolarMjM2Day: number | null;
  nasaPowerWind2mMs: number | null;
  nasaPowerRh2mPct: number | null;
  nasaMerra2RootWetnessIndex: number | null;
  nasaMerra2SurfaceWetnessIndex: number | null;
  openMeteoObsTime: string | null;
  openMeteoTemp2mC: number | null;
  openMeteoSoil0_7M3M3: number | null;
  sentinel2GranuleName: string | null;
  sentinel2AcquisitionDateUtc: string | null;
  sentinel2CloudCoverPct: number | null;
  sentinel2Status: DataStatus;
  soilSourceKind: SoilDataSourceKind | 'unavailable';
  soilSourceLabel: string;
  soilThetaFc: number | null;
  soilThetaWp: number | null;
  soilSocPct: number | null;
  soilClayPct: number | null;
  soilSandPct: number | null;
  provenanceIds: string[];
}

export interface FieldMemory {
  fieldId: string;
  ownerId: string; // 'local-unauthenticated' when no auth provider is active
  createdAt: string;
  updatedAt: string;
  fieldName: string;
  region: string;
  province: string;
  coordinates: Coordinates;
  /** Strictly null unless real boundary polygon was drawn by user */
  boundaryGeometry: Coordinates[] | null;
  area: number | null;
  areaUnit: 'ha' | null;
  locationPrecision: string;
  cadastralReference: string | null;
  baselineAssessmentRef: string | null; // latest EnvironmentalSnapshotRecord.snapshotId
  notes: string;
}

export interface SeasonEditAuditEntry {
  editedAt: string;
  note: string;
}

export interface SeasonRecord {
  seasonId: string;
  fieldId: string;
  seasonStart: string; // YYYY-MM-DD or YYYY-MM
  seasonEnd: string | null; // null if ongoing or unrecorded
  cropId: string;
  cropName: string;
  cropFamily: CropBotanicalFamily | string | null;
  plantingDate: string | null; // YYYY-MM-DD
  harvestDate: string | null; // YYYY-MM-DD
  previousCropId: string | null;
  irrigationMethod: string | null;
  /** Strictly null unless explicitly supplied or measured (mm over season) */
  irrigationAmountMm: number | null;
  irrigationAmountOrigin: SeasonRecordOrigin | null;
  fertilizerAndAmendments: string | null;
  managementPractices: string | null;
  farmerNotes: string;
  evidenceReferences: string[];
  createdAt: string;
  updatedAt: string;
  dataOrigin: SeasonRecordOrigin;
  isIncomplete: boolean;
  missingFields: string[];
  editHistory: SeasonEditAuditEntry[];
}

export interface RecommendationSnapshot {
  recommendationId: string;
  fieldId: string;
  ownerId: string;
  createdAt: string;
  kind: RecommendationKind;
  /** Deterministic content fingerprint to avoid duplicate auto-saves of identical inputs */
  inputSignature: string;
  seasonContext: {
    seasonStart: string | null;
    seasonEnd: string | null;
    currentCropId: string | null;
    previousCropId: string | null;
    horizonSeasons: number | null;
    referenceDateUtc: string;
  };
  proposedSummary: {
    proposedCropIds: string[];
    primaryCropId: string | null;
    irrigationDecisionStatus?: IrrigationDecisionStatus;
    netIrrigationMm?: number | null;
    grossIrrigationMm?: number | null;
    expectedWindowEtcMm?: number | null;
    expectedWindowRainMm?: number | null;
    expectedWindowDays?: number | null;
    strategyBSequence?: string[];
    conservativeSequence?: string[];
    strategyCSequence?: string[];
    resilienceFocus?: TransitionResilienceFocus | null;
  };
  /** Snapshot of farmer profile & constraints used during generation */
  inputSnapshot: {
    farmerContext: FarmerContextProfile | null;
    soilSourceKind: SoilDataSourceKind | 'unavailable';
    thetaFc: number | null;
    thetaWp: number | null;
    socPct: number | null;
    residueManagement: string | null;
  };
  environmentalDataRefs: string[]; // provenanceIds + snapshotId
  soilDataRefs: string[];
  calculationMethodVersion: string;
  assumptionsEn: string[];
  assumptionsAr: string[];
  assumptionsFr: string[];
  missingInputs: string[];
  scientificLimitationsEn: string[];
  scientificLimitationsAr: string[];
  scientificLimitationsFr: string[];
  explanationEn: string;
  explanationAr: string;
  explanationFr: string;
  status: RecommendationStatus;
  statusUpdatedAt: string;
}

export type ObservedCropCondition =
  | 'good'
  | 'moderate_stress'
  | 'severe_stress'
  | 'failed'
  | 'not_reported';

export interface ReportedOutcomeRecord {
  outcomeId: string;
  fieldId: string;
  recommendationId: string;
  seasonId: string | null;
  reportedAt: string;
  updatedAt: string;
  actualCropPlanted: string | null;
  actualCropId: string | null;
  actualPlantingDate: string | null;
  actualHarvestDate: string | null;
  /** Strictly numeric value with explicit unit to prevent silent incompatible comparison */
  actualIrrigationAmount: number | null;
  actualIrrigationUnit: 'mm' | 'm3' | 'L/plant' | null;
  actualIrrigationOrigin: SeasonRecordOrigin | null;
  observedCropCondition: ObservedCropCondition;
  yieldValue: number | null;
  yieldUnit: 't/ha' | 'kg/ha' | 'kg/plot' | null;
  yieldOrigin: SeasonRecordOrigin | null;
  observedWaterShortage: boolean | null;
  pestOrDiseaseObservations: string | null;
  farmerAssessment: string;
  supportingReferences: string[];
  /** Optional observed rainfall recorded for the exact outcome period (mm) */
  recordedPeriodRainfallMm: number | null;
  recordedRainfallSource: string | null;
  /** Soil measurement check: only filled when real lab measurement provided */
  measuredPostSeasonSocPct: number | null;
  measuredPostSeasonSoilOrigin: SeasonRecordOrigin | null;
}

export interface ComparisonMetricResult {
  metricKey: 'crop_choice' | 'irrigation_applied' | 'rainfall_window' | 'soil_organic_carbon' | 'yield_expectation';
  labelEn: string;
  labelAr: string;
  labelFr: string;
  comparable: boolean;
  incompatibilityReasonEn: string | null;
  incompatibilityReasonAr: string | null;
  incompatibilityReasonFr: string | null;
  expectedDisplay: string | null;
  expectedNumeric: number | null;
  expectedUnit: string | null;
  expectedOrigin: LandMemoryDataOrigin | null;
  actualDisplay: string | null;
  actualNumeric: number | null;
  actualUnit: string | null;
  actualOrigin: LandMemoryDataOrigin | null;
  deltaNumeric: number | null;
  deltaPercent: number | null;
  periodStart: string | null;
  periodEnd: string | null;
  interpretationEn: string;
  interpretationAr: string;
  interpretationFr: string;
}

export interface PredictionRealityComparison {
  comparisonId: string;
  fieldId: string;
  recommendationId: string;
  recommendationCreatedAt: string;
  recommendationKind: RecommendationKind;
  outcomeId: string | null;
  status: 'COMPARABLE' | 'PARTIAL' | 'INCOMPATIBLE' | 'AWAITING_OUTCOME';
  metrics: ComparisonMetricResult[];
  overallSummaryEn: string;
  overallSummaryAr: string;
  overallSummaryFr: string;
  causalCaveatEn: string;
  causalCaveatAr: string;
  causalCaveatFr: string;
}

export type TimelineEventType =
  | 'season_record'
  | 'recommendation'
  | 'reported_outcome'
  | 'environmental_snapshot'
  | 'data_gap';

export interface LandMemoryTimelineEvent {
  eventId: string;
  fieldId: string;
  eventType: TimelineEventType;
  sourceRecordId: string;
  dateSortKey: string; // ISO or YYYY-MM-DD
  createdAt: string;
  updatedAt: string;
  titleEn: string;
  titleAr: string;
  titleFr: string;
  summaryEn: string;
  summaryAr: string;
  summaryFr: string;
  origin: LandMemoryDataOrigin;
  qualityStatus: LandMemoryQualityStatus;
  hasMissingData: boolean;
  missingDetails: string[];
  editable: boolean;
}

export interface LearningContextSummary {
  fieldId: string;
  generatedAt: string;
  rememberedSequenceCropIds: string[];
  mostRecentCropId: string | null;
  detectedRepeatedFamilyConflicts: Array<{
    family: string;
    seasonIds: string[];
    cropIds: string[];
  }>;
  recurringWaterShortageCount: number;
  waterShortageWarningEn: string | null;
  waterShortageWarningAr: string | null;
  waterShortageWarningFr: string | null;
  missingRecordsBlockingReliabilityEn: string[];
  missingRecordsBlockingReliabilityAr: string[];
  missingRecordsBlockingReliabilityFr: string[];
  recommendationDelta: {
    hasPreviousRecommendation: boolean;
    previousRecommendationId: string | null;
    previousCreatedAt: string | null;
    latestRecommendationId: string | null;
    latestCreatedAt: string | null;
    changedCropsOrPathway: boolean;
    deltaSummaryEn: string;
    deltaSummaryAr: string;
    deltaSummaryFr: string;
    triggeringNewInformationEn: string[];
    triggeringNewInformationAr: string[];
    triggeringNewInformationFr: string[];
  };
  methodologyNoteEn: string;
  methodologyNoteAr: string;
  methodologyNoteFr: string;
}

export interface LandFuturesAssessment {
  generatedAt: string;
  status: 'PLANS_READY' | 'INSUFFICIENT_DATA' | 'NO_FEASIBLE_PATHWAY';
  learningContext: LearningContextSummary;
  transitionPlan: RotationTransitionResult | null;
  hardConstraintsAppliedEn: string[];
  hardConstraintsAppliedAr: string[];
  hardConstraintsAppliedFr: string[];
  rankingPreferencesEn: string[];
  rankingPreferencesAr: string[];
  rankingPreferencesFr: string[];
  insufficientReasonsEn: string[];
  insufficientReasonsAr: string[];
  insufficientReasonsFr: string[];
  localVerificationConditionsEn: string[];
  localVerificationConditionsAr: string[];
  localVerificationConditionsFr: string[];
}

export interface ChartSeriesPoint {
  date: string;
  value: number | null;
  origin: LandMemoryDataOrigin;
  source: string;
}

export interface LandMemoryWorkspaceState {
  fieldMemory: FieldMemory | null;
  seasons: SeasonRecord[];
  recommendations: RecommendationSnapshot[];
  outcomes: ReportedOutcomeRecord[];
  environmentalSnapshots: EnvironmentalSnapshotRecord[];
  provenanceEntries: LandMemoryProvenanceEntry[];
  comparisons: PredictionRealityComparison[];
  timeline: LandMemoryTimelineEvent[];
  learningContext: LearningContextSummary | null;
}

export interface LandMemoryBackupPayload {
  schemaVersion: 1;
  exportedAt: string;
  ownerScope: string;
  fieldId: string;
  storageDisclosure: string;
  fieldMemory: FieldMemory;
  seasons: SeasonRecord[];
  recommendations: RecommendationSnapshot[];
  outcomes: ReportedOutcomeRecord[];
  environmentalSnapshots: EnvironmentalSnapshotRecord[];
  provenanceEntries: LandMemoryProvenanceEntry[];
}
