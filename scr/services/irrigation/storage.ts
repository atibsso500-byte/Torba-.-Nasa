/**
 * TURBA Phase 3 — Per-Parcel Farmer Agronomic & Irrigation Configuration Persistence
 */

import {
  CropResidueManagement,
  CulturalFarmingPractice,
  FarmerContextProfile,
  FarmerCropDecisionState,
  FarmerIrrigationConfig,
  FarmingSeasonOption,
  FinancialCapacityLevel,
  PersistedTransitionState,
  PrimaryFarmingGoal,
  TransitionFarmerDecisionMap,
  TransitionResilienceFocus,
  WaterAndTechCapacity,
} from '../../types/irrigation';

const CONFIG_STORAGE_KEY = 'turba_phase3_irrigation_configs_v1';
const FARMER_CONTEXT_STORAGE_KEY = 'turba_phase3_farmer_context_v1';
const TRANSITION_STATE_STORAGE_KEY = 'turba_phase3_transition_state_v1';

const VALID_FINANCIAL_CAPACITIES: ReadonlySet<FinancialCapacityLevel> = new Set([
  'low_input',
  'moderate',
  'high_investment',
]);

const VALID_PRIMARY_GOALS: ReadonlySet<PrimaryFarmingGoal> = new Set([
  'food_security',
  'commercial_profit',
  'soil_regeneration',
  'water_conservation',
]);

const VALID_WATER_CAPACITIES: ReadonlySet<WaterAndTechCapacity> = new Set([
  'rainfed_only',
  'limited_irrigation',
  'modern_irrigation',
]);

const VALID_CULTURAL_PRACTICES: ReadonlySet<CulturalFarmingPractice> = new Set([
  'traditional_heritage',
  'open_to_diversification',
  'mixed_crop_livestock',
]);

const VALID_SEASONS: ReadonlySet<FarmingSeasonOption> = new Set([
  'autumn_winter',
  'spring',
  'summer',
  'perennial_year_round',
  'unspecified',
]);

const VALID_RESIDUES: ReadonlySet<CropResidueManagement> = new Set([
  'incorporated',
  'removed',
  'grazed',
  'unknown',
]);

export function getDefaultIrrigationConfig(areaHa: number): FarmerIrrigationConfig {
  const today = new Date();
  // Conservative empty crop by default so user actively confirms their crop rather than assuming Wheat silently
  const defaultPlanting = new Date(today.getTime() - 45 * 86400000).toISOString().slice(0, 10);
  return {
    cropId: '',
    plantingDate: defaultPlanting,
    growthStageOverride: 'auto',
    fieldAreaHectares: areaHa > 0 ? areaHa : null,
    soilSourcePreference: 'auto_soilgrids_then_manual',
    labThetaFc: null,
    labThetaWp: null,
    farmerTextureId: '',
    customRootDepthM: null,
    irrigationMethod: 'drip',
    applicationEfficiency: 0.90,
    targetDepletionFractionOfRaw: 0,
    systemFlowRateLph: null,
    maxApplicationDepthMm: null,
    previousIrrigations: [],
    previousCropId: '',
    previousCropResidue: 'unknown',
  };
}

/**
 * Safe defaults for FarmerContextProfile:
 * Never silently assumes irrigation access, financial capacity, or farming practice.
 */
export function getDefaultFarmerContextProfile(): FarmerContextProfile {
  return {
    financialCapacity: null,
    primaryGoal: null,
    waterAndTechCapacity: null,
    culturalPractice: null,
    localContext: {
      countryOrRegion: '',
      familiarCrops: [],
      season: 'unspecified',
      livestockIntegration: null,
      locallyAvailableCrops: [],
    },
  };
}

function sanitizeStringArray(val: unknown): string[] {
  if (!Array.isArray(val)) return [];
  const cleaned: string[] = [];
  for (const item of val) {
    if (typeof item === 'string') {
      const trimmed = item.trim().slice(0, 64);
      if (trimmed.length > 0 && !cleaned.includes(trimmed)) {
        cleaned.push(trimmed);
      }
    }
    if (cleaned.length >= 20) break;
  }
  return cleaned;
}

export function validateFarmerContextProfile(raw: unknown): FarmerContextProfile {
  const defaults = getDefaultFarmerContextProfile();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return defaults;
  }
  const obj = raw as Record<string, unknown>;

  const financialCapacity =
    typeof obj.financialCapacity === 'string' &&
    VALID_FINANCIAL_CAPACITIES.has(obj.financialCapacity as FinancialCapacityLevel)
      ? (obj.financialCapacity as FinancialCapacityLevel)
      : null;

  const primaryGoal =
    typeof obj.primaryGoal === 'string' &&
    VALID_PRIMARY_GOALS.has(obj.primaryGoal as PrimaryFarmingGoal)
      ? (obj.primaryGoal as PrimaryFarmingGoal)
      : null;

  const waterAndTechCapacity =
    typeof obj.waterAndTechCapacity === 'string' &&
    VALID_WATER_CAPACITIES.has(obj.waterAndTechCapacity as WaterAndTechCapacity)
      ? (obj.waterAndTechCapacity as WaterAndTechCapacity)
      : null;

  const culturalPractice =
    typeof obj.culturalPractice === 'string' &&
    VALID_CULTURAL_PRACTICES.has(obj.culturalPractice as CulturalFarmingPractice)
      ? (obj.culturalPractice as CulturalFarmingPractice)
      : null;

  const rawLocal =
    obj.localContext && typeof obj.localContext === 'object' && !Array.isArray(obj.localContext)
      ? (obj.localContext as Record<string, unknown>)
      : {};

  const countryOrRegion =
    typeof rawLocal.countryOrRegion === 'string'
      ? rawLocal.countryOrRegion.trim().slice(0, 100)
      : '';

  const season =
    typeof rawLocal.season === 'string' && VALID_SEASONS.has(rawLocal.season as FarmingSeasonOption)
      ? (rawLocal.season as FarmingSeasonOption)
      : 'unspecified';

  const livestockIntegration =
    typeof rawLocal.livestockIntegration === 'boolean' ? rawLocal.livestockIntegration : null;

  return {
    financialCapacity,
    primaryGoal,
    waterAndTechCapacity,
    culturalPractice,
    localContext: {
      countryOrRegion,
      familiarCrops: sanitizeStringArray(rawLocal.familiarCrops),
      season,
      livestockIntegration,
      locallyAvailableCrops: sanitizeStringArray(rawLocal.locallyAvailableCrops),
    },
  };
}

function finitePositiveOrNull(val: unknown): number | null {
  return typeof val === 'number' && Number.isFinite(val) && val > 0 ? val : null;
}

function finiteInRangeOrFallback(val: unknown, min: number, max: number, fallback: number): number {
  return typeof val === 'number' && Number.isFinite(val) && val >= min && val <= max ? val : fallback;
}

export function loadIrrigationConfigForFarm(
  farmId: string,
  fallbackAreaHa: number
): FarmerIrrigationConfig {
  const defaults = getDefaultIrrigationConfig(fallbackAreaHa);
  try {
    if (typeof localStorage === 'undefined' || !farmId) return defaults;
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return defaults;
    const map = parsed as Record<string, Partial<FarmerIrrigationConfig>>;
    const saved = map[farmId];
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return defaults;

    const validIrrigations = Array.isArray(saved.previousIrrigations)
      ? saved.previousIrrigations.filter(
          (ev) =>
            ev &&
            typeof ev === 'object' &&
            typeof ev.id === 'string' &&
            typeof ev.date === 'string' &&
            /^\d{4}-\d{2}-\d{2}$/.test(ev.date)
        )
      : [];

    const savedArea = finitePositiveOrNull(saved.fieldAreaHectares);

    const previousCropResidue =
      typeof saved.previousCropResidue === 'string' &&
      VALID_RESIDUES.has(saved.previousCropResidue as CropResidueManagement)
        ? (saved.previousCropResidue as CropResidueManagement)
        : 'unknown';

    return {
      ...defaults,
      ...saved,
      cropId: typeof saved.cropId === 'string' ? saved.cropId : defaults.cropId,
      plantingDate:
        typeof saved.plantingDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(saved.plantingDate)
          ? saved.plantingDate
          : defaults.plantingDate,
      // Prefer explicit farm geodesic area if saved fieldAreaHectares is null and farm polygon was drawn
      fieldAreaHectares: savedArea ?? (fallbackAreaHa > 0 ? fallbackAreaHa : null),
      labThetaFc:
        typeof saved.labThetaFc === 'number' && Number.isFinite(saved.labThetaFc) && saved.labThetaFc > 0 && saved.labThetaFc <= 0.7
          ? saved.labThetaFc
          : null,
      labThetaWp:
        typeof saved.labThetaWp === 'number' && Number.isFinite(saved.labThetaWp) && saved.labThetaWp >= 0 && saved.labThetaWp <= 0.6
          ? saved.labThetaWp
          : null,
      customRootDepthM: finitePositiveOrNull(saved.customRootDepthM),
      applicationEfficiency: finiteInRangeOrFallback(saved.applicationEfficiency, 0.1, 1.0, defaults.applicationEfficiency),
      targetDepletionFractionOfRaw: finiteInRangeOrFallback(saved.targetDepletionFractionOfRaw, 0, 0.8, defaults.targetDepletionFractionOfRaw),
      systemFlowRateLph: finitePositiveOrNull(saved.systemFlowRateLph),
      maxApplicationDepthMm: finitePositiveOrNull(saved.maxApplicationDepthMm),
      previousIrrigations: validIrrigations,
      previousCropId: typeof saved.previousCropId === 'string' ? saved.previousCropId.trim().slice(0, 64) : '',
      previousCropResidue,
    };
  } catch {
    return defaults;
  }
}

export function saveIrrigationConfigForFarm(
  farmId: string,
  config: FarmerIrrigationConfig
): void {
  try {
    if (typeof localStorage === 'undefined' || !farmId) return;
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    let map: Record<string, FarmerIrrigationConfig> = {};
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        map = parsed as Record<string, FarmerIrrigationConfig>;
      }
    }
    map[farmId] = config;
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(map));
  } catch (err) {
    console.warn('Could not persist irrigation configuration:', err);
  }
}

/**
 * Loads validated per-parcel FarmerContextProfile from localStorage.
 * Never persists or returns stale recommendation results.
 */
export function loadFarmerContextForFarm(farmId: string): FarmerContextProfile {
  const defaults = getDefaultFarmerContextProfile();
  try {
    if (typeof localStorage === 'undefined' || !farmId) return defaults;
    const raw = localStorage.getItem(FARMER_CONTEXT_STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return defaults;
    }
    const map = parsed as Record<string, unknown>;
    return validateFarmerContextProfile(map[farmId]);
  } catch {
    return defaults;
  }
}

/**
 * Persists validated per-parcel FarmerContextProfile to localStorage without touching other parcels.
 */
export function saveFarmerContextForFarm(
  farmId: string,
  profile: FarmerContextProfile
): FarmerContextProfile {
  const sanitized = validateFarmerContextProfile(profile);
  try {
    if (typeof localStorage === 'undefined' || !farmId) return sanitized;
    const raw = localStorage.getItem(FARMER_CONTEXT_STORAGE_KEY);
    let map: Record<string, FarmerContextProfile> = {};
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          map = parsed as Record<string, FarmerContextProfile>;
        }
      } catch {
        map = {};
      }
    }
    map[farmId] = sanitized;
    localStorage.setItem(FARMER_CONTEXT_STORAGE_KEY, JSON.stringify(map));
  } catch (err) {
    console.warn('Could not persist farmer context profile:', err);
  }
  return sanitized;
}

const VALID_CROP_DECISIONS: ReadonlySet<FarmerCropDecisionState> = new Set([
  'accepted',
  'rejected',
  'unavailable',
]);

const VALID_RESILIENCE_FOCUSES: ReadonlySet<TransitionResilienceFocus> = new Set([
  'water_conservation',
  'soil_structure',
  'nutrient_cycling',
  'forage_production',
  'financial_accessibility',
  'climate_resilience',
]);

export function getDefaultTransitionState(): PersistedTransitionState {
  return {
    currentSequence: [],
    horizonSeasons: 3,
    maxAcceptableCostTier: null,
    availableIrrigationMmPerSeason: null,
    unfamiliarCropsAllowed: null,
    observedSoilDegradationNote: '',
    cropDecisions: {},
    resilienceFocus: null,
  };
}

export function validateTransitionState(raw: unknown): PersistedTransitionState {
  const defaults = getDefaultTransitionState();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return defaults;
  }
  const obj = raw as Record<string, unknown>;

  const currentSequence = Array.isArray(obj.currentSequence)
    ? obj.currentSequence
        .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
        .map((s) => s.trim().slice(0, 64))
        .slice(0, 6)
    : [];

  const horizonSeasons: 3 | 4 = obj.horizonSeasons === 4 ? 4 : 3;

  const maxAcceptableCostTier =
    obj.maxAcceptableCostTier === 'low' ||
    obj.maxAcceptableCostTier === 'moderate' ||
    obj.maxAcceptableCostTier === 'high'
      ? obj.maxAcceptableCostTier
      : null;

  const availableIrrigationMmPerSeason =
    typeof obj.availableIrrigationMmPerSeason === 'number' &&
    Number.isFinite(obj.availableIrrigationMmPerSeason) &&
    obj.availableIrrigationMmPerSeason >= 0 &&
    obj.availableIrrigationMmPerSeason <= 5000
      ? obj.availableIrrigationMmPerSeason
      : null;

  const unfamiliarCropsAllowed =
    typeof obj.unfamiliarCropsAllowed === 'boolean' ? obj.unfamiliarCropsAllowed : null;

  const observedSoilDegradationNote =
    typeof obj.observedSoilDegradationNote === 'string'
      ? obj.observedSoilDegradationNote.trim().slice(0, 240)
      : '';

  const cropDecisions: TransitionFarmerDecisionMap = {};
  if (obj.cropDecisions && typeof obj.cropDecisions === 'object' && !Array.isArray(obj.cropDecisions)) {
    for (const [k, v] of Object.entries(obj.cropDecisions as Record<string, unknown>)) {
      if (
        typeof k === 'string' &&
        k.trim().length > 0 &&
        typeof v === 'string' &&
        VALID_CROP_DECISIONS.has(v as FarmerCropDecisionState)
      ) {
        cropDecisions[k.trim().slice(0, 64)] = v as FarmerCropDecisionState;
      }
    }
  }

  const resilienceFocus =
    typeof obj.resilienceFocus === 'string' &&
    VALID_RESILIENCE_FOCUSES.has(obj.resilienceFocus as TransitionResilienceFocus)
      ? (obj.resilienceFocus as TransitionResilienceFocus)
      : null;

  return {
    currentSequence,
    horizonSeasons,
    maxAcceptableCostTier,
    availableIrrigationMmPerSeason,
    unfamiliarCropsAllowed,
    observedSoilDegradationNote,
    cropDecisions,
    resilienceFocus,
  };
}

export function loadTransitionStateForFarm(farmId: string): PersistedTransitionState {
  const defaults = getDefaultTransitionState();
  try {
    if (typeof localStorage === 'undefined' || !farmId) return defaults;
    const raw = localStorage.getItem(TRANSITION_STATE_STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return defaults;
    const map = parsed as Record<string, unknown>;
    return validateTransitionState(map[farmId]);
  } catch {
    return defaults;
  }
}

export function saveTransitionStateForFarm(
  farmId: string,
  state: PersistedTransitionState
): PersistedTransitionState {
  const sanitized = validateTransitionState(state);
  try {
    if (typeof localStorage === 'undefined' || !farmId) return sanitized;
    const raw = localStorage.getItem(TRANSITION_STATE_STORAGE_KEY);
    let map: Record<string, PersistedTransitionState> = {};
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          map = parsed as Record<string, PersistedTransitionState>;
        }
      } catch {
        map = {};
      }
    }
    map[farmId] = sanitized;
    localStorage.setItem(TRANSITION_STATE_STORAGE_KEY, JSON.stringify(map));
  } catch (err) {
    console.warn('Could not persist transition planner state:', err);
  }
  return sanitized;
}

