/**
 * TURBA Phase 3 — Scientific Smart Irrigation Decision Engine Types
 * Reference Standard: FAO Irrigation and Drainage Paper No. 56 (Allen et al., 1998)
 */

import { Coordinates, DataStatus, FreshnessStatus } from './farm';

export type ValueOrigin =
  | 'measured'
  | 'reanalysis_assimilated'
  | 'nwp_forecast'
  | 'spatial_estimate'
  | 'fao56_estimated'
  | 'user_provided';

export type SoilDataSourceKind =
  | 'farmer_lab'
  | 'soilgrids_v2'
  | 'farmer_texture_table19'
  | 'unavailable';

export type IrrigationMethodId =
  | 'drip'
  | 'subsurface_drip'
  | 'micro_sprinkler'
  | 'sprinkler'
  | 'surface_furrow'
  | 'surface_basin'
  | 'custom';

export type CropGrowthStage = 'initial' | 'development' | 'mid_season' | 'late_season';

export type IrrigationDecisionStatus =
  | 'NO_IMMEDIATE_IRRIGATION'
  | 'IRRIGATION_APPROACHING'
  | 'IRRIGATION_REQUIRED'
  | 'INSUFFICIENT_DATA';

export type IrrigationConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT_DATA';

export interface TracedValue<T = number> {
  value: T | null;
  unit: string;
  parameterName: string;
  source: string;
  origin: ValueOrigin;
  observationDate: string; // YYYY-MM-DD or ISO timestamp
  retrievalTimestamp: string;
  spatialResolution?: string;
  estimationMethod?: string;
  warning?: string;
}

export interface CropStageCoefficients {
  kcIni: number;
  kcMid: number;
  kcEnd: number;
  /** Standard FAO-56 stage lengths (days) */
  stageDays: {
    initial: number;
    development: number;
    midSeason: number;
    lateSeason: number;
  };
  rootDepthMinM: number;
  rootDepthMaxM: number;
  allowableDepletionP: number; // FAO-56 Table 22 base depletion fraction (at ETc ≈ 5 mm/d)
}

export interface CropDefinition {
  id: 'wheat' | 'tomato' | 'potato' | 'olive' | 'citrus' | 'maize' | 'onion';
  nameEn: string;
  nameAr: string;
  nameFr: string;
  scientificName: string;
  isPerennial: boolean;
  coefficients: CropStageCoefficients;
  /** Reference citation for each agronomic parameter */
  sources: {
    kcReference: string;
    stageDurationReference: string;
    rootDepthReference: string;
    depletionFractionReference: string;
  };
  /** True if parameters are regional/canopy-sensitive and should be verified locally */
  isProvisional: boolean;
  provisionalNoteEn?: string;
  provisionalNoteAr?: string;
  provisionalNoteFr?: string;
  climaticLimitationsEn: string;
  climaticLimitationsAr: string;
  climaticLimitationsFr: string;
}

export interface SoilTexturePreset {
  id:
    | 'sand'
    | 'loamy_sand'
    | 'sandy_loam'
    | 'loam'
    | 'silt_loam'
    | 'silt'
    | 'sandy_clay_loam'
    | 'clay_loam'
    | 'silty_clay_loam'
    | 'clay';
  nameEn: string;
  nameAr: string;
  nameFr: string;
  /** FAO-56 Table 19 typical midpoint values in m³/m³ (strictly marked as texture reference estimates) */
  thetaFcTypical: number;
  thetaWpTypical: number;
  /** USDA-NRCS Hydrologic Soil Group for SCS Curve Number runoff estimation */
  hydrologicGroup: 'A' | 'B' | 'C' | 'D';
  curveNumberRowCrop: number;
}

export interface LoggedIrrigationEvent {
  id: string;
  date: string; // YYYY-MM-DD
  netDepthMm?: number;
  grossDepthMm?: number;
  volumeM3?: number;
  note?: string;
}

export interface FarmerIrrigationConfig {
  cropId: CropDefinition['id'] | '';
  plantingDate: string; // YYYY-MM-DD (used for annual crops, or budbreak/season start for perennials)
  growthStageOverride: CropGrowthStage | 'auto';
  fieldAreaHectares: number | null; // Falls back to polygon area if > 0
  soilSourcePreference: 'auto_soilgrids_then_manual' | 'farmer_lab' | 'farmer_texture';
  /** Laboratory measured volumetric field capacity θFC [m³/m³] */
  labThetaFc: number | null;
  /** Laboratory measured permanent wilting point θWP [m³/m³] */
  labThetaWp: number | null;
  /** Optional USDA texture class if lab & SoilGrids are unavailable */
  farmerTextureId: SoilTexturePreset['id'] | '';
  /** Optional custom effective root depth [m] */
  customRootDepthM: number | null;
  irrigationMethod: IrrigationMethodId;
  /** Application efficiency Ea expressed as decimal (0.05..1.0) */
  applicationEfficiency: number;
  /** Target depletion after irrigation as fraction of RAW (0 = refill to Field Capacity) */
  targetDepletionFractionOfRaw: number;
  /** Optional real system flow rate [L/hour]; duration is ONLY calculated when > 0 */
  systemFlowRateLph: number | null;
  /** Optional max net application per single event [mm] */
  maxApplicationDepthMm: number | null;
  /** Logged historical irrigation events (YYYY-MM-DD) */
  previousIrrigations: LoggedIrrigationEvent[];
  /** Optional previous crop ID for rotation & pathogen break analysis */
  previousCropId?: string;
  /** How previous crop residues were handled */
  previousCropResidue?: 'incorporated' | 'removed' | 'grazed' | 'unknown';
}

export interface DailyMeteoRecord {
  date: string; // YYYY-MM-DD
  isForecast: boolean;
  source: string;
  origin: ValueOrigin;
  tMaxC: number | null;
  tMinC: number | null;
  tMeanC: number | null;
  rhMeanPct: number | null;
  rhMaxPct?: number | null;
  rhMinPct?: number | null;
  windSpeed2mMs: number | null;
  windRawHeightM?: number;
  windWasConvertedFrom10m?: boolean;
  solarRadiationMjM2Day: number | null;
  precipitationMm: number | null;
  surfacePressureKpa: number | null;
  /** Optional API-reported FAO ET0 for comparison only */
  apiReferenceEt0Mm?: number | null;
  retrievalTimestamp: string;
  spatialResolution: string;
}

export interface WeatherSeriesResult {
  coordinates: Coordinates;
  elevationM: number | null;
  elevationSource: string | null;
  historicalDaily: DailyMeteoRecord[]; // Past ~14-30 days (NASA POWER + Open-Meteo past gap-fill cleanly separated)
  forecastDaily: DailyMeteoRecord[];   // Future +1..14 days (Open-Meteo NWP forecast)
  nasaPowerStatus: DataStatus;
  openMeteoStatus: DataStatus;
  nasaFreshness: FreshnessStatus;
  openMeteoFreshness: FreshnessStatus;
  initialRootZoneWetnessIndex: number | null; // NASA GWETROOT if available
  nwpSoilMoistureLayers: {
    observationTime: string;
    layer0_7: number | null;
    layer7_28: number | null;
    layer28_100: number | null;
  } | null;
  errors: string[];
  retrievalTimestamp: string;
}

export interface SoilLayerProfile {
  depthLabel: string;
  depthTopCm: number;
  depthBottomCm: number;
  clayPct: number | null;
  sandPct: number | null;
  siltPct: number | null;
  organicCarbonPct: number | null;
  organicMatterPct: number | null;
  bulkDensityGCm3: number | null;
}

export interface SoilHydraulicResult {
  sourceKind: SoilDataSourceKind;
  origin: ValueOrigin;
  sourceLabel: string;
  isSpatialEstimate: boolean;
  soilGridsStatus: DataStatus;
  soilGridsError?: string;
  thetaFc: TracedValue<number>;
  thetaWp: TracedValue<number>;
  awcMmPerM: number | null;
  hydrologicGroup: 'A' | 'B' | 'C' | 'D' | null;
  curveNumber: number | null;
  layers: SoilLayerProfile[];
  notes: string[];
  retrievalTimestamp: string;
}

export interface Fao56Et0Result {
  date: string;
  et0MmDay: number | null;
  isValid: boolean;
  isForecast: boolean;
  /** Intermediate FAO-56 terms for full scientific auditability */
  intermediates: {
    tMeanC: number | null;
    esKpa: number | null;
    eaKpa: number | null;
    vpdKpa: number | null;
    deltaKpaC: number | null;
    pressureKpa: number | null;
    gammaKpaC: number | null;
    u2Ms: number | null;
    raMjM2Day: number | null;
    rsoMjM2Day: number | null;
    rsMjM2Day: number | null;
    rnsMjM2Day: number | null;
    rnlMjM2Day: number | null;
    rnMjM2Day: number | null;
  };
  estimatedVariables: Array<{
    variable: string;
    method: string;
    reason: string;
  }>;
  missingCriticalVariables: string[];
  origin: ValueOrigin;
  source: string;
}

export interface DailyWaterBalanceStep {
  date: string;
  isForecast: boolean;
  stage: CropGrowthStage;
  kc: number;
  rootDepthM: number;
  tawMm: number;
  rawMm: number;
  et0Mm: number;
  etcPotentialMm: number;
  ks: number;
  etcAdjustedMm: number;
  rainfallTotalMm: number;
  surfaceRunoffMm: number;
  effectiveRainfallMm: number;
  irrigationNetMm: number;
  deepPercolationMm: number;
  depletionStartMm: number;
  depletionEndMm: number;
  /** Fractional depletion relative to RAW (Dr / RAW). >= 1.0 means stress threshold reached */
  depletionRatioToRaw: number;
  meteoOrigin: ValueOrigin;
  estimatedVariablesCount: number;
  exceededRaw: boolean;
}

export interface ConfidenceFactor {
  category: 'meteorology' | 'soil' | 'crop' | 'area' | 'forecast' | 'freshness';
  impact: 'positive' | 'moderate_penalty' | 'major_penalty' | 'blocking';
  messageEn: string;
  messageAr: string;
  messageFr: string;
}

export interface ForecastWindowSummary {
  horizonDays: number;
  firstDayReachingRaw: string | null;
  daysUntilRawReached: number | null;
  projectedTotalEtcMm: number;
  projectedTotalForecastRainMm: number;
  projectedEffectiveRainMm: number;
  recommendedWindowStart: string | null;
  recommendedWindowEnd: string | null;
  rainfallWillDelayIrrigation: boolean;
  forecastUncertaintyNoteEn: string;
  forecastUncertaintyNoteAr: string;
  forecastUncertaintyNoteFr: string;
}

export interface IrrigationRecommendationResult {
  generatedAt: string;
  coordinates: Coordinates;
  status: IrrigationDecisionStatus;
  confidence: IrrigationConfidenceLevel;
  confidenceFactors: ConfidenceFactor[];
  crop: CropDefinition | null;
  currentStage: CropGrowthStage | null;
  daysAfterPlanting: number | null;
  kcCurrent: TracedValue<number>;
  ksCurrent: TracedValue<number>;
  et0Current: TracedValue<number>;
  etcPotentialCurrent: TracedValue<number>;
  etcAdjustedCurrent: TracedValue<number>;
  rootDepthM: TracedValue<number>;
  tawMm: TracedValue<number>;
  rawMm: TracedValue<number>;
  currentDepletionMm: TracedValue<number>;
  allowableDepletionFractionP: number | null;
  netIrrigationDepthMm: number | null;
  grossIrrigationDepthMm: number | null;
  applicationEfficiency: number;
  fieldAreaHa: number | null;
  /** V(m³) = 10 × Area(ha) × Igross(mm) */
  waterVolumeM3: number | null;
  /** Time(h) = V(m³) × 1000 / Q(L/h) — strictly null when flow data unavailable */
  irrigationDurationHours: number | null;
  wasCappedBySoilStorage: boolean;
  wasCappedByMaxEventDepth: boolean;
  soilProfile: SoilHydraulicResult;
  historicalBalance: DailyWaterBalanceStep[];
  forecastBalance: DailyWaterBalanceStep[];
  forecastSummary: ForecastWindowSummary | null;
  validationErrors: string[];
  validationWarnings: string[];
  explanationEn: string;
  explanationAr: string;
  explanationFr: string;
  insufficientDataReasons: string[];
  traceabilityRecords: TracedValue<number | string>[];
}

// ============================================================================
// GLOBAL CROP ROTATION & SOIL HEALTH ADVISOR TYPES
// ============================================================================

export type FinancialCapacityLevel = 'low_input' | 'moderate' | 'high_investment';

export type PrimaryFarmingGoal =
  | 'food_security'
  | 'commercial_profit'
  | 'soil_regeneration'
  | 'water_conservation';

export type WaterAndTechCapacity =
  | 'rainfed_only'
  | 'limited_irrigation'
  | 'modern_irrigation';

export type CulturalFarmingPractice =
  | 'traditional_heritage'
  | 'open_to_diversification'
  | 'mixed_crop_livestock';

export type FarmingSeasonOption =
  | 'autumn_winter'
  | 'spring'
  | 'summer'
  | 'perennial_year_round'
  | 'unspecified';

export type CropResidueManagement = 'incorporated' | 'removed' | 'grazed' | 'unknown';

export interface LocalAgriculturalContext {
  countryOrRegion: string;
  familiarCrops: string[];
  season: FarmingSeasonOption;
  livestockIntegration: boolean | null;
  locallyAvailableCrops: string[];
}

export interface FarmerContextProfile {
  financialCapacity: FinancialCapacityLevel | null;
  primaryGoal: PrimaryFarmingGoal | null;
  waterAndTechCapacity: WaterAndTechCapacity | null;
  culturalPractice: CulturalFarmingPractice | null;
  localContext: LocalAgriculturalContext;
}

export type CropBotanicalFamily =
  | 'Poaceae'
  | 'Fabaceae'
  | 'Solanaceae'
  | 'Amaryllidaceae'
  | 'Oleaceae'
  | 'Rutaceae';

export type RotationCropCategory =
  | 'cereal'
  | 'grain_legume'
  | 'forage_legume'
  | 'fruiting_vegetable'
  | 'tuber_crop'
  | 'bulb_vegetable'
  | 'perennial_tree';

export interface GlobalRotationCropProfile {
  id: string;
  scientificName: string;
  commonNameEn: string;
  commonNameAr: string;
  commonNameFr: string;
  family: CropBotanicalFamily;
  category: RotationCropCategory;
  isPerennial: boolean;
  coefficients: CropStageCoefficients;
  totalSeasonDaysRange: [number, number];
  /** Seasonal Kc weighting factor ≈ weighted mean Kc over active growing cycle (dimensionless) */
  seasonalMeanKc: number;
  kcConditionsNoteEn: string;
  kcConditionsNoteAr: string;
  kcConditionsNoteFr: string;
  rootCharacteristics: {
    depthClass: 'shallow' | 'moderate' | 'deep';
    rootType: 'fibrous' | 'taproot' | 'woody_perennial';
    notesEn: string;
    notesAr: string;
    notesFr: string;
  };
  nitrogenFixation: {
    capable: boolean;
    /** Biological N2 fixation estimate range [kg N/ha/cycle] ONLY under effective nodulation; null if non-fixing */
    estimatedRangeKgNPerHa: [number, number] | null;
    requiresInoculationCheck: boolean;
    benefitDependsOnResidueReturn: boolean;
    notesEn: string;
    notesAr: string;
    notesFr: string;
    source: string | null;
  };
  rotationCompatibility: {
    goodPredecessors: CropBotanicalFamily[];
    avoidSameFamilyConsecutive: boolean;
    minimumSameFamilyBreakYears: number | null;
    sharedPathogensNoteEn: string;
    sharedPathogensNoteAr: string;
    sharedPathogensNoteFr: string;
    breakReference: string | null;
  };
  soilSuitability: {
    preferredTextureNotesEn: string;
    preferredTextureNotesAr: string;
    preferredTextureNotesFr: string;
    heavyClayPenaltyThresholdPct: number | null;
    coarseSandPenaltyThresholdPct: number | null;
    waterloggingSensitive: boolean;
  };
  climateSuitability: {
    optimalMeanTempRangeC: [number, number];
    frostSensitiveBelowC: number | null;
    heatStressAboveC: number | null;
    suitableSeasons: FarmingSeasonOption[];
    relativeWaterDemandClass: 'low_moderate' | 'moderate' | 'high';
  };
  socioEconomicProfile: {
    inputRequirement: 'low' | 'moderate' | 'high';
    stapleFoodValue: boolean;
    commercialMarketChannelDependent: boolean;
    forageAndResidueValue: {
      isDedicatedForage: boolean;
      hasUsefulCropResidue: boolean;
      notesEn: string;
      notesAr: string;
      notesFr: string;
    };
  };
  sources: {
    fao56KcAndStages: string;
    fao56RootAndDepletion: string;
    rotationAndAgronomy: string;
  };
  unknownOrRegionDependentFields: string[];
}

export type RotationSuitabilityStatus =
  | 'suitable'
  | 'conditionally_suitable'
  | 'insufficient_data'
  | 'excluded';

export interface RotationEvidenceDistinction {
  measuredOrRetrieved: string[];
  calculatedIndicators: string[];
  agronomicReferences: string[];
  contextualAssumptions: string[];
  missingOrUnavailable: string[];
}

export interface RotationWaterAssessment {
  status: 'adequate' | 'deficit_risk' | 'high_deficit_risk' | 'insufficient_data';
  seasonalCoverageStatus: 'preliminary_short_window' | 'insufficient_data';
  et0MeanMmDay: number | null;
  observedWindowDays: number;
  observedRainfallMm: number | null;
  rainfallAnomalyPercent: number | null;
  estimatedEffectiveRainfallWindowMm: number | null;
  estimatedCropEtcWindowMm: number | null;
  estimatedSeasonEtcMm: number | null;
  estimatedWaterDeficitWindowMm: number | null;
  notesEn: string;
  notesAr: string;
  notesFr: string;
}

export interface RotationScoreBreakdown {
  agronomicRotation: number; // 0-100
  soilHealthRootZone: number; // 0-100
  climateWater: number; // 0-100
  financialFeasibility: number; // 0-100
  goalCulturalFit: number; // 0-100
  weights: {
    agronomicRotation: number;
    soilHealthRootZone: number;
    climateWater: number;
    financialFeasibility: number;
    goalCulturalFit: number;
  };
}

export interface CropRotationCandidateResult {
  cropId: string;
  commonNameEn: string;
  commonNameAr: string;
  commonNameFr: string;
  scientificName: string;
  family: CropBotanicalFamily;
  category: RotationCropCategory;
  status: RotationSuitabilityStatus;
  /** Weighted deterministic compatibility index (0-100), never presented as probability of success */
  compatibilityScore: number | null;
  scoreBreakdown: RotationScoreBreakdown;
  waterAssessment: RotationWaterAssessment;
  whyRecommendedEn: string;
  whyRecommendedAr: string;
  whyRecommendedFr: string;
  soilHealthBenefitEn: string;
  soilHealthBenefitAr: string;
  soilHealthBenefitFr: string;
  waterClimateFitEn: string;
  waterClimateFitAr: string;
  waterClimateFitFr: string;
  socioEconomicFitEn: string;
  socioEconomicFitAr: string;
  socioEconomicFitFr: string;
  agronomicCautionsEn: string[];
  agronomicCautionsAr: string[];
  agronomicCautionsFr: string[];
  confidence: IrrigationConfidenceLevel;
  missingInformation: string[];
  referenceSources: string[];
  evidenceDistinction: RotationEvidenceDistinction;
}

export interface ExcludedRotationCandidate {
  cropId: string;
  commonNameEn: string;
  commonNameAr: string;
  commonNameFr: string;
  scientificName: string;
  family: CropBotanicalFamily;
  exclusionCodes: string[];
  reasonEn: string;
  reasonAr: string;
  reasonFr: string;
}

export interface GlobalCropRotationAdviceResult {
  generatedAt: string;
  status: 'RECOMMENDATIONS_READY' | 'NO_ELIGIBLE_RECOMMENDATION' | 'INSUFFICIENT_DATA';
  confidence: IrrigationConfidenceLevel;
  isProvisionalHistory: boolean;
  isPreliminaryClimate: boolean;
  currentCropId: string;
  previousCropId: string;
  recommendations: CropRotationCandidateResult[];
  excludedCandidates: ExcludedRotationCandidate[];
  rotationFamilyWarningsEn: string[];
  rotationFamilyWarningsAr: string[];
  rotationFamilyWarningsFr: string[];
  missingInformation: string[];
  evidenceSummary: RotationEvidenceDistinction;
  emptyOrBlockedReasonEn: string | null;
  emptyOrBlockedReasonAr: string | null;
  emptyOrBlockedReasonFr: string | null;
  referenceSources: string[];
}

// ============================================================================
// ROTATION TRANSITION BRIDGE (GRADUAL MULTI-SEASON PLANNER) TYPES
// ============================================================================

export type TransitionDifficulty = 'low' | 'moderate' | 'high';

export type TransitionEvaluationBadge = 'suitable' | 'caution' | 'insufficient_data';

export type FarmerCropDecisionState = 'accepted' | 'rejected' | 'unavailable';

export type TransitionFarmerDecisionMap = Record<string, FarmerCropDecisionState>;

export type TransitionResilienceFocus =
  | 'water_conservation'
  | 'soil_structure'
  | 'nutrient_cycling'
  | 'forage_production'
  | 'financial_accessibility'
  | 'climate_resilience';

export interface TransitionWeightsConfig {
  agronomicCompatibility: number;
  soilHealthObjectives: number;
  waterAvailability: number;
  economicFeasibility: number;
  transitionMinimality: number;
  farmerPreferences: number;
  seasonalFeasibility: number;
}

export interface TransitionConstraints {
  currentSequence: string[];
  horizonSeasons: 3 | 4;
  maxTransitionChanges?: number | null;
  maxAcceptableCostTier?: 'low' | 'moderate' | 'high' | null;
  confirmedAvailableCrops?: string[];
  unfamiliarCropsAllowed?: boolean | null;
  availableIrrigationMmPerSeason?: number | null;
  observedSoilDegradationNote?: string | null;
  cropDecisions?: TransitionFarmerDecisionMap;
  resilienceFocus?: TransitionResilienceFocus | null;
  weightsOverride?: Partial<TransitionWeightsConfig>;
}

export interface PersistedTransitionState {
  currentSequence: string[];
  horizonSeasons: 3 | 4;
  maxAcceptableCostTier: 'low' | 'moderate' | 'high' | null;
  availableIrrigationMmPerSeason: number | null;
  unfamiliarCropsAllowed: boolean | null;
  observedSoilDegradationNote: string;
  cropDecisions: TransitionFarmerDecisionMap;
  resilienceFocus: TransitionResilienceFocus | null;
}

export interface BaselineSequenceAnalysis {
  sequenceCropIds: string[];
  validSequence: boolean;
  invalidReasonsEn: string[];
  invalidReasonsAr: string[];
  invalidReasonsFr: string[];
  repeatedFamilies: Array<{ family: CropBotanicalFamily; positions: number[] }>;
  diseaseAndPestRisksEn: string[];
  diseaseAndPestRisksAr: string[];
  diseaseAndPestRisksFr: string[];
  nutrientWeaknessesEn: string[];
  nutrientWeaknessesAr: string[];
  nutrientWeaknessesFr: string[];
  waterDemandConcentration: 'low_moderate' | 'moderate' | 'high' | 'mixed' | 'unknown';
  rootDepthRepetition: boolean;
  missingDiversityEn: string[];
  missingDiversityAr: string[];
  missingDiversityFr: string[];
  opportunitiesEn: string[];
  opportunitiesAr: string[];
  opportunitiesFr: string[];
  missingInformationEn: string[];
  missingInformationAr: string[];
  missingInformationFr: string[];
  soilConditionNoteEn: string;
  soilConditionNoteAr: string;
  soilConditionNoteFr: string;
}

export interface TransitionSeasonStep {
  seasonNumber: number;
  seasonSlot: FarmingSeasonOption;
  cropId: string;
  commonNameEn: string;
  commonNameAr: string;
  commonNameFr: string;
  scientificName: string;
  family: CropBotanicalFamily;
  category: RotationCropCategory;
  isExistingBaselineCrop: boolean;
  changeType: 'retained' | 'minor_adjustment' | 'new_introduction';
  transitionDifficulty: TransitionDifficulty;
  waterDemandClass: 'low_moderate' | 'moderate' | 'high';
  estimatedWindowEtcMm: number | null;
  reasonSelectedEn: string;
  reasonSelectedAr: string;
  reasonSelectedFr: string;
  soilHealthConsiderationsEn: string;
  soilHealthConsiderationsAr: string;
  soilHealthConsiderationsFr: string;
  nitrogenExpectationEn: string | null;
  nitrogenExpectationAr: string | null;
  nitrogenExpectationFr: string | null;
  mainAgronomicBenefitEn: string;
  mainAgronomicBenefitAr: string;
  mainAgronomicBenefitFr: string;
  risksAndLimitationsEn: string[];
  risksAndLimitationsAr: string[];
  risksAndLimitationsFr: string[];
  requiredFarmerActionsEn: string[];
  requiredFarmerActionsAr: string[];
  requiredFarmerActionsFr: string[];
  missingInformation: string[];
}

export interface TransitionCriteriaBreakdown {
  agronomicCompatibility: number;
  soilHealthObjectives: number;
  waterAvailability: number;
  economicFeasibility: number;
  transitionMinimality: number;
  farmerPreferences: number;
  seasonalFeasibility: number;
  totalPathCost: number;
  changesFromBaselineCount: number;
  criterionContributions: Record<keyof TransitionWeightsConfig, number>;
}

export interface TransitionPathwayOption {
  pathwayType: 'recommended' | 'conservative' | 'alternative';
  resilienceFocusUsed?: TransitionResilienceFocus | null;
  titleEn: string;
  titleAr: string;
  titleFr: string;
  cropSequence: string[];
  steps: TransitionSeasonStep[];
  changesFromCurrentCount: number;
  whyGeneratedEn: string;
  whyGeneratedAr: string;
  whyGeneratedFr: string;
  prioritiesAddressedEn: string[];
  prioritiesAddressedAr: string[];
  prioritiesAddressedFr: string[];
  environmentalDriversEn: string[];
  environmentalDriversAr: string[];
  environmentalDriversFr: string[];
  requiredFarmerActionsEn: string[];
  requiredFarmerActionsAr: string[];
  requiredFarmerActionsFr: string[];
  missingInformationEn: string[];
  missingInformationAr: string[];
  missingInformationFr: string[];
  dataLimitationNoticeEn: string;
  dataLimitationNoticeAr: string;
  dataLimitationNoticeFr: string;
  waterDemandAssessmentEn: string;
  waterDemandAssessmentAr: string;
  waterDemandAssessmentFr: string;
  mainAdvantagesEn: string[];
  mainAdvantagesAr: string[];
  mainAdvantagesFr: string[];
  economicOrOperationalLimitationsEn: string[];
  economicOrOperationalLimitationsAr: string[];
  economicOrOperationalLimitationsFr: string[];
  cumulativeOutcomes: {
    quantifiedCalculationsEn: string[];
    quantifiedCalculationsAr: string[];
    quantifiedCalculationsFr: string[];
    qualitativeExpectationsEn: string[];
    qualitativeExpectationsAr: string[];
    qualitativeExpectationsFr: string[];
    unverifiedFutureOutcomesEn: string[];
    unverifiedFutureOutcomesAr: string[];
    unverifiedFutureOutcomesFr: string[];
  };
  explanationSummary: {
    whyChangeEn: string;
    whyChangeAr: string;
    whyChangeFr: string;
    whatPreservedEn: string;
    whatPreservedAr: string;
    whatPreservedFr: string;
    risksReducedEn: string;
    risksReducedAr: string;
    risksReducedFr: string;
    whatIfRejectedEn: string;
    whatIfRejectedAr: string;
    whatIfRejectedFr: string;
    influencingAssumptionsEn: string[];
    influencingAssumptionsAr: string[];
    influencingAssumptionsFr: string[];
  };
  dimensionEvaluations: {
    familyDiversity: TransitionEvaluationBadge;
    soilHealth: TransitionEvaluationBadge;
    waterCompatibility: TransitionEvaluationBadge;
    economicFeasibility: TransitionEvaluationBadge;
    seasonalCompatibility: TransitionEvaluationBadge;
  };
  confidence: 'HIGH' | 'MODERATE' | 'LOW';
  confidenceReasonsEn: string[];
  confidenceReasonsAr: string[];
  confidenceReasonsFr: string[];
  criteriaBreakdown: TransitionCriteriaBreakdown;
  compositePlanningScore: number;
  tradeOffNoteEn: string;
  tradeOffNoteAr: string;
  tradeOffNoteFr: string;
}

export interface TransitionDataSourceEntry {
  source: string;
  category:
    | 'measured_retrieved'
    | 'model_estimate'
    | 'calculated'
    | 'user_provided'
    | 'missing';
  retrievalDate: string;
  unit: string;
  spatialResolution: string;
  temporalCoverage: string;
  detail: string;
}

export interface RotationTransitionResult {
  generatedAt: string;
  status: 'PLANS_READY' | 'INSUFFICIENT_DATA' | 'NO_FEASIBLE_TRANSITION' | 'INVALID_SEQUENCE';
  hemisphere: 'northern' | 'southern' | 'equatorial';
  activeCoordinates: { lat: number; lng: number } | null;
  baseline: BaselineSequenceAnalysis;
  recommendedPathway: TransitionPathwayOption | null;
  conservativePathway: TransitionPathwayOption | null;
  alternativePathway: TransitionPathwayOption | null;
  noAlternativeReasonEn: string | null;
  noAlternativeReasonAr: string | null;
  noAlternativeReasonFr: string | null;
  blockingReasonsEn: string[];
  blockingReasonsAr: string[];
  blockingReasonsFr: string[];
  dataSourcesUsed: TransitionDataSourceEntry[];
  assumptionsEn: string[];
  assumptionsAr: string[];
  assumptionsFr: string[];
  missingInformation: string[];
  weightsUsed: TransitionWeightsConfig;
}
