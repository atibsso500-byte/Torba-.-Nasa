/**
 * TURBA Phase 3 — Smart Irrigation Decision Engine UI Panel
 * Displays:
 * - Farmer field/crop/soil/irrigation system configuration & previous irrigation log
 * - Current irrigation status & explainable qualitative confidence
 * - FAO-56 ET0, ETc / ETc_adj, Kc, Ks, TAW, RAW, Depletion D(t)
 * - Net & Gross irrigation depths, m³ water volume, conditional run duration (ONLY if flow > 0)
 * - Forecast irrigation window & interactive daily soil-water balance chart
 * - Complete parameter provenance distinguishing Measured/Assimilated, Estimated, Forecast & User-Provided inputs
 */

import React, { useState, useEffect, useMemo } from 'react';
import { FarmRecord, NasaGpmObservation, NasaPowerObservation } from '../../types/farm';
import {
  CropGrowthStage,
  CropResidueManagement,
  CulturalFarmingPractice,
  FarmerContextProfile,
  FarmerIrrigationConfig,
  FarmingSeasonOption,
  FinancialCapacityLevel,
  IrrigationMethodId,
  PersistedTransitionState,
  PrimaryFarmingGoal,
  SoilHydraulicResult,
  ValueOrigin,
  WaterAndTechCapacity,
  WeatherSeriesResult,
} from '../../types/irrigation';
import {
  MOROCCAN_CROP_DATABASE,
  GLOBAL_ROTATION_CROP_DATABASE,
  IRRIGATION_METHOD_PRESETS,
  SOIL_TEXTURE_PRESETS,
} from '../../data/crops';
import { fetchIrrigationWeatherSeries } from '../../services/irrigation/weather';
import { resolveSoilHydraulics } from '../../services/irrigation/soil';
import { computeSmartIrrigationDecision } from '../../services/irrigation/engine';
import { generateCropRotationAdvice } from '../../services/irrigation/rotationAdvisor';
import { generateRotationTransitionPlan } from '../../services/irrigation/rotationEngine';
import {
  loadFarmerContextForFarm,
  loadIrrigationConfigForFarm,
  loadTransitionStateForFarm,
  saveFarmerContextForFarm,
  saveIrrigationConfigForFarm,
  saveTransitionStateForFarm,
} from '../../services/irrigation/storage';
import {
  recordIrrigationRecommendationSnapshot,
  recordRotationRecommendationSnapshot,
  recordTransitionRecommendationSnapshot,
} from '../../services/memory/service';
import { useTranslation } from '../../i18n/language';
import { WaterBalanceChart } from './WaterChart';
import { RotationTransitionSection } from './RotationPanel';
import {
  Droplets,
  AlertTriangle,
  CheckCircle2,
  Clock,
  SlidersHorizontal,
  Plus,
  Trash2,
  Maximize2,
  Minimize2,
  Info,
  Calendar,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Sprout,
  Globe,
  Ban,
  BookOpen,
  Layers,
  Users,
} from 'lucide-react';

interface IrrigationEnginePanelProps {
  farm: FarmRecord;
  nasaPower?: NasaPowerObservation | null;
  nasaGpm?: NasaGpmObservation | null;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export const IrrigationEnginePanel: React.FC<IrrigationEnginePanelProps> = ({
  farm,
  nasaPower = null,
  nasaGpm = null,
  isExpanded = false,
  onToggleExpand,
}) => {
  const { t, language } = useTranslation();

  const [config, setConfig] = useState<FarmerIrrigationConfig>(() =>
    loadIrrigationConfigForFarm(farm.id, farm.calculatedAreaHectares)
  );
  const [weather, setWeather] = useState<WeatherSeriesResult | null>(null);
  const [soil, setSoil] = useState<SoilHydraulicResult | null>(null);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Previous irrigation add form state
  const [newIrrDate, setNewIrrDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [newIrrDepthMm, setNewIrrDepthMm] = useState<string>('20');
  const [showDailyTable, setShowDailyTable] = useState<boolean>(false);
  const [showConfigForm, setShowConfigForm] = useState<boolean>(true);

  // FarmerContextProfile & Crop Rotation Advisor state
  const [farmerContext, setFarmerContext] = useState<FarmerContextProfile>(() =>
    loadFarmerContextForFarm(farm.id)
  );
  const [rotationCropOverride, setRotationCropOverride] = useState<string>('');
  const [familiarCropsInput, setFamiliarCropsInput] = useState<string>(() =>
    loadFarmerContextForFarm(farm.id).localContext.familiarCrops.join(', ')
  );
  const [localAvailCropsInput, setLocalAvailCropsInput] = useState<string>(() =>
    loadFarmerContextForFarm(farm.id).localContext.locallyAvailableCrops.join(', ')
  );
  const [showFarmerContextSection, setShowFarmerContextSection] = useState<boolean>(true);
  const [showAdvancedLocalContext, setShowAdvancedLocalContext] = useState<boolean>(false);
  const [showExcludedCandidates, setShowExcludedCandidates] = useState<boolean>(false);
  const [showEvidenceDistinction, setShowEvidenceDistinction] = useState<boolean>(false);

  // Rotation Transition Bridge persisted state
  const [transitionState, setTransitionState] = useState<PersistedTransitionState>(() => {
    const loadedConfig = loadIrrigationConfigForFarm(farm.id, farm.calculatedAreaHectares);
    const loadedTransition = loadTransitionStateForFarm(farm.id);
    if (loadedTransition.currentSequence.length === 0) {
      const seeded = [loadedConfig.previousCropId, loadedConfig.cropId].filter(
        (id): id is string => Boolean(id)
      );
      if (seeded.length > 0) {
        return { ...loadedTransition, currentSequence: seeded };
      }
    }
    return loadedTransition;
  });

  // Sync config, farmer context, and transition state cleanly when switching parcels
  useEffect(() => {
    const loadedConfig = loadIrrigationConfigForFarm(farm.id, farm.calculatedAreaHectares);
    setConfig(loadedConfig);
    const loadedContext = loadFarmerContextForFarm(farm.id);
    setFarmerContext(loadedContext);
    setFamiliarCropsInput(loadedContext.localContext.familiarCrops.join(', '));
    setLocalAvailCropsInput(loadedContext.localContext.locallyAvailableCrops.join(', '));
    setRotationCropOverride('');

    const loadedTransition = loadTransitionStateForFarm(farm.id);
    if (loadedTransition.currentSequence.length === 0) {
      const seeded = [loadedConfig.previousCropId, loadedConfig.cropId].filter(
        (id): id is string => Boolean(id)
      );
      setTransitionState(
        seeded.length > 0 ? { ...loadedTransition, currentSequence: seeded } : loadedTransition
      );
    } else {
      setTransitionState(loadedTransition);
    }
  }, [farm.id, farm.calculatedAreaHectares]);

  // Persist config updates
  const updateConfig = (updater: (prev: FarmerIrrigationConfig) => FarmerIrrigationConfig) => {
    setConfig((prev) => {
      const next = updater(prev);
      saveIrrigationConfigForFarm(farm.id, next);
      return next;
    });
  };

  // Persist farmer context profile updates per parcel
  const updateFarmerContext = (updater: (prev: FarmerContextProfile) => FarmerContextProfile) => {
    setFarmerContext((prev) => {
      const sanitized = saveFarmerContextForFarm(farm.id, updater(prev));
      return sanitized;
    });
  };

  // Persist transition bridge state updates per parcel
  const updateTransitionState = (
    updater: (prev: PersistedTransitionState) => PersistedTransitionState
  ) => {
    setTransitionState((prev) => {
      const sanitized = saveTransitionStateForFarm(farm.id, updater(prev));
      return sanitized;
    });
  };

  // Load real weather series + SoilGrids / farmer hydraulics when farm or soil source settings change
  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function load() {
      setIsLoadingData(true);
      setFetchError(null);
      setWeather(null);
      setSoil(null);

      try {
        const cropRootGuess = config.customRootDepthM || 0.8;
        const [wRes, sRes] = await Promise.all([
          fetchIrrigationWeatherSeries(farm.centroid, controller.signal),
          resolveSoilHydraulics({
            coordinates: farm.centroid,
            config,
            rootDepthM: cropRootGuess,
            signal: controller.signal,
          }),
        ]);
        if (!active || controller.signal.aborted) return;
        setWeather(wRes);
        setSoil(sRes);
      } catch (err) {
        if (!active || controller.signal.aborted) return;
        setFetchError(err instanceof Error ? err.message : 'Failed to load irrigation datasets');
      } finally {
        if (active && !controller.signal.aborted) {
          setIsLoadingData(false);
        }
      }
    }

    load();
    return () => {
      active = false;
      controller.abort();
    };
    // Trigger reload on location or soil source preference/values change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    farm.centroid.lat,
    farm.centroid.lng,
    config.soilSourcePreference,
    config.farmerTextureId,
    config.labThetaFc,
    config.labThetaWp,
    config.customRootDepthM,
  ]);

  const recommendation = useMemo(() => {
    if (!weather || !soil) return null;
    return computeSmartIrrigationDecision({
      coordinates: farm.centroid,
      polygonAreaHectares: farm.calculatedAreaHectares,
      config,
      weather,
      soil,
    });
  }, [farm.centroid, farm.calculatedAreaHectares, config, weather, soil]);

  const activeRotationCropId = rotationCropOverride || config.cropId;

  const rotationAdvice = useMemo(() => {
    if (!soil || !activeRotationCropId) return null;
    return generateCropRotationAdvice({
      currentCropId: activeRotationCropId,
      previousCropId: config.previousCropId || undefined,
      previousCropResidue: config.previousCropResidue || 'unknown',
      climate: {
        nasaPower,
        nasaGpm,
        historicalMeteoDays: weather?.historicalDaily,
        et0DailyValues: recommendation?.historicalBalance.map((step) => ({
          date: step.date,
          et0MmDay: step.et0Mm,
        })),
        latitudeDeg: farm.centroid.lat,
        elevationM: weather?.elevationM ?? null,
      },
      soil,
      farmerContext,
      verifiedRegionLabel: [farm.province, farm.region].filter(Boolean).join(', ') || null,
    });
  }, [
    soil,
    activeRotationCropId,
    config.previousCropId,
    config.previousCropResidue,
    nasaPower,
    nasaGpm,
    weather,
    recommendation,
    farm.centroid.lat,
    farm.province,
    farm.region,
    farmerContext,
  ]);

  const transitionResult = useMemo(() => {
    if (!soil) return null;
    return generateRotationTransitionPlan({
      coordinates: farm.centroid,
      climate: {
        nasaPower,
        nasaGpm,
        historicalMeteoDays: weather?.historicalDaily,
        et0DailyValues: recommendation?.historicalBalance.map((step) => ({
          date: step.date,
          et0MmDay: step.et0Mm,
        })),
        elevationM: weather?.elevationM ?? null,
      },
      soil,
      farmerContext,
      previousCropResidue: config.previousCropResidue || 'unknown',
      constraints: {
        currentSequence: transitionState.currentSequence,
        horizonSeasons: transitionState.horizonSeasons,
        maxAcceptableCostTier: transitionState.maxAcceptableCostTier,
        availableIrrigationMmPerSeason: transitionState.availableIrrigationMmPerSeason,
        unfamiliarCropsAllowed: transitionState.unfamiliarCropsAllowed,
        observedSoilDegradationNote: transitionState.observedSoilDegradationNote,
        confirmedAvailableCrops: farmerContext.localContext.locallyAvailableCrops,
        cropDecisions: transitionState.cropDecisions,
        resilienceFocus: transitionState.resilienceFocus,
      },
      verifiedRegionLabel: [farm.province, farm.region].filter(Boolean).join(', ') || null,
    });
  }, [
    soil,
    farm.centroid,
    farm.province,
    farm.region,
    nasaPower,
    nasaGpm,
    weather,
    recommendation,
    farmerContext,
    config.previousCropResidue,
    transitionState,
  ]);

  // Archive immutable Land Memory snapshots cleanly (deduplicated by inputSignature)
  useEffect(() => {
    if (!recommendation) return;
    recordIrrigationRecommendationSnapshot({
      farm,
      recommendation,
      farmerContext,
      plantingDate: config.plantingDate,
      previousCropId: config.previousCropId || '',
      residueManagement: config.previousCropResidue || 'unknown',
    });
  }, [
    farm,
    recommendation,
    farmerContext,
    config.plantingDate,
    config.previousCropId,
    config.previousCropResidue,
  ]);

  useEffect(() => {
    if (!rotationAdvice || !soil) return;
    recordRotationRecommendationSnapshot({
      farm,
      advice: rotationAdvice,
      soil,
      farmerContext,
      residueManagement: config.previousCropResidue || 'unknown',
    });
  }, [farm, rotationAdvice, soil, farmerContext, config.previousCropResidue]);

  useEffect(() => {
    if (!transitionResult || !soil) return;
    recordTransitionRecommendationSnapshot({
      farm,
      transition: transitionResult,
      soil,
      farmerContext,
      residueManagement: config.previousCropResidue || 'unknown',
    });
  }, [farm, transitionResult, soil, farmerContext, config.previousCropResidue]);

  const configSeedSequence = useMemo(
    () => [config.previousCropId, activeRotationCropId].filter((id): id is string => Boolean(id)),
    [config.previousCropId, activeRotationCropId]
  );

  const handleSeedSequenceFromConfig = () => {
    if (configSeedSequence.length === 0) return;
    updateTransitionState((prev) => ({
      ...prev,
      currentSequence: configSeedSequence,
    }));
  };

  const getCropLabelLocal = (c: (typeof MOROCCAN_CROP_DATABASE)[number]) =>
    language === 'ar' ? c.nameAr : language === 'fr' ? c.nameFr : c.nameEn;

  const getGlobalCropLabel = (c: (typeof GLOBAL_ROTATION_CROP_DATABASE)[number]) =>
    language === 'ar' ? c.commonNameAr : language === 'fr' ? c.commonNameFr : c.commonNameEn;

  const getOriginLabel = (origin: ValueOrigin): string => {
    switch (origin) {
      case 'measured':
        return t.irrigation.originMeasured;
      case 'reanalysis_assimilated':
        return t.irrigation.originAssimilated;
      case 'nwp_forecast':
        return t.irrigation.originForecast;
      case 'spatial_estimate':
        return t.irrigation.originSpatialEstimate;
      case 'fao56_estimated':
        return t.irrigation.originFaoEstimated;
      case 'user_provided':
        return t.irrigation.originUserProvided;
    }
  };

  const handleMethodChange = (methodId: IrrigationMethodId) => {
    const preset = IRRIGATION_METHOD_PRESETS.find((m) => m.id === methodId);
    updateConfig((prev) => ({
      ...prev,
      irrigationMethod: methodId,
      applicationEfficiency: preset ? preset.typicalEfficiency : prev.applicationEfficiency,
    }));
  };

  const handleAddIrrigationEvent = () => {
    const depth = Number(newIrrDepthMm);
    if (!newIrrDate || !Number.isFinite(depth) || depth <= 0) return;
    updateConfig((prev) => ({
      ...prev,
      previousIrrigations: [
        ...prev.previousIrrigations,
        {
          id: `irr-${Date.now()}`,
          date: newIrrDate,
          netDepthMm: depth,
        },
      ].sort((a, b) => a.date.localeCompare(b.date)),
    }));
  };

  const handleRemoveIrrigationEvent = (id: string) => {
    updateConfig((prev) => ({
      ...prev,
      previousIrrigations: prev.previousIrrigations.filter((e) => e.id !== id),
    }));
  };

  const renderDecisionStatusBanner = () => {
    if (!recommendation) return null;

    const status = recommendation.status;
    let statusTitle = t.irrigation.statusInsufficient;
    let borderClass = 'border-stone-300 bg-stone-50 text-stone-900';
    let labelClass = 'text-stone-700';

    if (status === 'IRRIGATION_REQUIRED') {
      statusTitle = t.irrigation.statusRequired;
      borderClass = 'border-rose-300 bg-rose-50/70 text-rose-950';
      labelClass = 'text-rose-700';
    } else if (status === 'IRRIGATION_APPROACHING') {
      statusTitle = t.irrigation.statusApproaching;
      borderClass = 'border-amber-300 bg-amber-50/70 text-amber-950';
      labelClass = 'text-amber-700';
    } else if (status === 'NO_IMMEDIATE_IRRIGATION') {
      statusTitle = t.irrigation.statusNoImmediate;
      borderClass = 'border-emerald-300 bg-emerald-50/70 text-emerald-950';
      labelClass = 'text-emerald-700';
    }

    const confText =
      recommendation.confidence === 'HIGH'
        ? t.irrigation.confHigh
        : recommendation.confidence === 'MEDIUM'
        ? t.irrigation.confMedium
        : recommendation.confidence === 'LOW'
        ? t.irrigation.confLow
        : t.irrigation.confInsufficient;

    const explanationText =
      language === 'ar'
        ? recommendation.explanationAr
        : language === 'fr'
        ? recommendation.explanationFr
        : recommendation.explanationEn;

    return (
      <div className={`p-3.5 rounded-xl border ${borderClass} space-y-2`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {status === 'NO_IMMEDIATE_IRRIGATION' ? (
              <CheckCircle2 className={`w-4 h-4 shrink-0 ${labelClass}`} />
            ) : (
              <AlertTriangle className={`w-4 h-4 shrink-0 ${labelClass}`} />
            )}
            <span className={`text-sm font-bold ${labelClass}`}>{statusTitle}</span>
          </div>

          <span className="text-[11px] font-mono text-stone-700">
            {t.irrigation.confidenceLabel} <strong className="text-stone-900">{confText}</strong>
          </span>
        </div>

        <p className="text-xs leading-relaxed text-stone-800">{explanationText}</p>

        {recommendation.crop?.isProvisional && (
          <div className="pt-1 border-t border-stone-200/70 text-[11px] text-amber-900 flex items-start gap-1.5">
            <Info className="w-3.5 h-3.5 text-amber-700 mt-0.5 shrink-0" />
            <span>
              {language === 'ar'
                ? recommendation.crop.provisionalNoteAr
                : language === 'fr'
                ? recommendation.crop.provisionalNoteFr
                : recommendation.crop.provisionalNoteEn}
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header Bar with Expand/Compact Toggle */}
      <div className="p-3.5 rounded-xl bg-white border border-stone-200 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-900 truncate">
            {t.irrigation.engineTitle}
          </h3>
          <p className="text-[11px] text-stone-500 truncate">{t.irrigation.engineSubtitle}</p>
        </div>

        {onToggleExpand && (
          <button
            type="button"
            onClick={onToggleExpand}
            className="px-2.5 py-1.5 rounded-lg bg-stone-50 hover:bg-stone-100 border border-stone-200 text-[11px] font-semibold text-stone-700 flex items-center gap-1.5 shrink-0 whitespace-nowrap"
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span>{isExpanded ? t.irrigation.collapseWorkspace : t.irrigation.expandWorkspace}</span>
          </button>
        )}
      </div>

      {/* Collapsible Field / Crop / Soil / System Configuration */}
      <div className="rounded-xl bg-white border border-stone-200 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowConfigForm((v) => !v)}
          className="w-full px-3.5 py-2.5 bg-stone-50 border-b border-stone-200 flex items-center justify-between text-xs font-bold text-stone-800 hover:bg-stone-100 transition-colors"
        >
          <span className="flex items-center gap-2">
            <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-700" />
            {t.irrigation.cropSelectionTitle}
          </span>
          {showConfigForm ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showConfigForm && (
          <div className="p-3.5 space-y-3 text-xs">
            <div className={`grid gap-3 ${isExpanded ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
              {/* Crop Selector */}
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  {t.irrigation.selectCropPlaceholder}
                </label>
                <select
                  value={config.cropId}
                  onChange={(e) => {
                    const nextId = e.target.value as FarmerIrrigationConfig['cropId'];
                    setRotationCropOverride('');
                    updateConfig((prev) => ({
                      ...prev,
                      cropId: nextId,
                    }));
                  }}
                  className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-900 focus:border-emerald-600 focus:outline-none"
                >
                  <option value="">{t.irrigation.selectCropPlaceholder}</option>
                  {MOROCCAN_CROP_DATABASE.map((c) => (
                    <option key={c.id} value={c.id}>
                      {getCropLabelLocal(c)} ({c.scientificName})
                    </option>
                  ))}
                </select>
              </div>

              {/* Planting Date */}
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  {t.irrigation.plantingDateLabel}
                </label>
                <input
                  type="date"
                  value={config.plantingDate}
                  onChange={(e) =>
                    updateConfig((prev) => ({ ...prev, plantingDate: e.target.value }))
                  }
                  className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-mono text-stone-900 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              {/* Growth Stage Override */}
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  {t.irrigation.growthStageLabel}
                </label>
                <select
                  value={config.growthStageOverride}
                  onChange={(e) =>
                    updateConfig((prev) => ({
                      ...prev,
                      growthStageOverride: e.target.value as CropGrowthStage | 'auto',
                    }))
                  }
                  className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-900 focus:border-emerald-600 focus:outline-none"
                >
                  <option value="auto">{t.irrigation.stageAuto}</option>
                  <option value="initial">{t.irrigation.stageInitial}</option>
                  <option value="development">{t.irrigation.stageDevelopment}</option>
                  <option value="mid_season">{t.irrigation.stageMidSeason}</option>
                  <option value="late_season">{t.irrigation.stageLateSeason}</option>
                </select>
              </div>

              {/* Field Area (ha) */}
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  {t.irrigation.fieldAreaLabel}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder={t.irrigation.fieldAreaPlaceholder}
                  value={config.fieldAreaHectares ?? ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? null : Number(e.target.value);
                    updateConfig((prev) => ({ ...prev, fieldAreaHectares: val }));
                  }}
                  className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-mono tabular-nums text-stone-900 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              {/* Soil Source Preference */}
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  {t.irrigation.soilSourceLabel}
                </label>
                <select
                  value={config.soilSourcePreference}
                  onChange={(e) =>
                    updateConfig((prev) => ({
                      ...prev,
                      soilSourcePreference: e.target.value as FarmerIrrigationConfig['soilSourcePreference'],
                    }))
                  }
                  className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-900 focus:border-emerald-600 focus:outline-none"
                >
                  <option value="auto_soilgrids_then_manual">{t.irrigation.soilAutoSoilgrids}</option>
                  <option value="farmer_lab">{t.irrigation.soilLabOption}</option>
                  <option value="farmer_texture">{t.irrigation.soilTextureOption}</option>
                </select>
              </div>

              {/* Soil Texture Class (shown if texture mode or if SoilGrids unavailable) */}
              {(config.soilSourcePreference === 'farmer_texture' ||
                (soil && soil.soilGridsStatus === 'UNAVAILABLE')) && (
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    {t.irrigation.soilTextureSelectLabel}
                  </label>
                  <select
                    value={config.farmerTextureId}
                    onChange={(e) =>
                      updateConfig((prev) => ({
                        ...prev,
                        farmerTextureId: e.target.value as FarmerIrrigationConfig['farmerTextureId'],
                      }))
                    }
                    className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-900 focus:border-emerald-600 focus:outline-none"
                  >
                    <option value="">-- {t.irrigation.soilTextureSelectLabel} --</option>
                    {SOIL_TEXTURE_PRESETS.map((sp) => (
                      <option key={sp.id} value={sp.id}>
                        {language === 'ar' ? sp.nameAr : language === 'fr' ? sp.nameFr : sp.nameEn} (θFC={sp.thetaFcTypical}, θWP={sp.thetaWpTypical})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Lab θFC & θWP (when lab mode selected) */}
              {config.soilSourcePreference === 'farmer_lab' && (
                <>
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">
                      {t.irrigation.labThetaFcLabel}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.05"
                      max="0.60"
                      placeholder="0.32"
                      value={config.labThetaFc ?? ''}
                      onChange={(e) =>
                        updateConfig((prev) => ({
                          ...prev,
                          labThetaFc: e.target.value === '' ? null : Number(e.target.value),
                        }))
                      }
                      className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-mono tabular-nums text-stone-900 focus:border-emerald-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">
                      {t.irrigation.labThetaWpLabel}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.02"
                      max="0.45"
                      placeholder="0.16"
                      value={config.labThetaWp ?? ''}
                      onChange={(e) =>
                        updateConfig((prev) => ({
                          ...prev,
                          labThetaWp: e.target.value === '' ? null : Number(e.target.value),
                        }))
                      }
                      className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-mono tabular-nums text-stone-900 focus:border-emerald-600 focus:outline-none"
                    />
                  </div>
                </>
              )}

              {/* Irrigation Method */}
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  {t.irrigation.irrigationMethodLabel}
                </label>
                <select
                  value={config.irrigationMethod}
                  onChange={(e) => handleMethodChange(e.target.value as IrrigationMethodId)}
                  className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-900 focus:border-emerald-600 focus:outline-none"
                >
                  {IRRIGATION_METHOD_PRESETS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {language === 'ar' ? m.nameAr : language === 'fr' ? m.nameFr : m.nameEn}
                    </option>
                  ))}
                </select>
              </div>

              {/* Application Efficiency Ea */}
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  {t.irrigation.efficiencyLabel} ({Math.round(config.applicationEfficiency * 100)}%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.10"
                  max="1.00"
                  value={config.applicationEfficiency}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (Number.isFinite(val)) {
                      updateConfig((prev) => ({
                        ...prev,
                        applicationEfficiency: Math.max(0.1, Math.min(1, val)),
                      }));
                    }
                  }}
                  className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-mono tabular-nums text-stone-900 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              {/* Target Post-Irrigation Depletion (% of RAW) */}
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  {t.irrigation.targetDepletionLabel}
                </label>
                <input
                  type="number"
                  step="5"
                  min="0"
                  max="80"
                  value={Math.round(config.targetDepletionFractionOfRaw * 100)}
                  onChange={(e) => {
                    const pct = Number(e.target.value);
                    if (Number.isFinite(pct)) {
                      updateConfig((prev) => ({
                        ...prev,
                        targetDepletionFractionOfRaw: Math.max(0, Math.min(0.8, pct / 100)),
                      }));
                    }
                  }}
                  className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-mono tabular-nums text-stone-900 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              {/* Optional System Flow Rate (L/h) */}
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  {t.irrigation.flowRateLabel}
                </label>
                <input
                  type="number"
                  step="100"
                  min="1"
                  placeholder={t.irrigation.flowRatePlaceholder}
                  value={config.systemFlowRateLph ?? ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? null : Number(e.target.value);
                    updateConfig((prev) => ({ ...prev, systemFlowRateLph: val }));
                  }}
                  className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-mono tabular-nums text-stone-900 focus:border-emerald-600 focus:outline-none"
                />
              </div>
            </div>

            {/* Previous Irrigation Event Logger */}
            <div className="pt-2.5 border-t border-stone-100 space-y-2">
              <span className="font-semibold text-stone-800 block">{t.irrigation.logIrrigationTitle}</span>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="date"
                  value={newIrrDate}
                  onChange={(e) => setNewIrrDate(e.target.value)}
                  className="rounded-lg border border-stone-200 px-2 py-1 text-xs font-mono text-stone-900"
                />
                <input
                  type="number"
                  step="1"
                  min="1"
                  max="200"
                  value={newIrrDepthMm}
                  onChange={(e) => setNewIrrDepthMm(e.target.value)}
                  placeholder={t.irrigation.netDepthLabel}
                  className="w-28 rounded-lg border border-stone-200 px-2 py-1 text-xs font-mono tabular-nums text-stone-900"
                />
                <button
                  type="button"
                  onClick={handleAddIrrigationEvent}
                  className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1 whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t.irrigation.addEventButton}</span>
                </button>
              </div>

              {config.previousIrrigations.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {config.previousIrrigations.map((ev) => (
                    <div
                      key={ev.id}
                      className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-stone-50 border border-stone-200 text-[11px] font-mono tabular-nums"
                    >
                      <span>{ev.date}</span>
                      <span className="text-emerald-700 font-bold">+{ev.netDepthMm} mm</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveIrrigationEvent(ev.id)}
                        className="text-stone-400 hover:text-rose-600"
                        title={t.common.delete}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Loading & Error states */}
      {isLoadingData && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-xs text-emerald-900 font-medium">
          <div className="w-4 h-4 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin shrink-0" />
          <span>{t.irrigation.loadingWeatherAndSoil}</span>
        </div>
      )}

      {fetchError && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
          {fetchError}
        </div>
      )}

      {/* Results Display */}
      {recommendation && (
        <div className="space-y-4">
          {/* 1. Primary Decision Status & Confidence */}
          {renderDecisionStatusBanner()}

          {/* Validation Warnings if any */}
          {recommendation.validationWarnings.length > 0 && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 space-y-1">
              {recommendation.validationWarnings.map((w, idx) => (
                <div key={idx}>{w}</div>
              ))}
            </div>
          )}

          {/* 2. Key Scientific Metrics Grid (Strictly separated Measured/Assimilated vs Estimated vs Calculated) */}
          {recommendation.status !== 'INSUFFICIENT_DATA' && (
            <>
              <div className={`grid gap-2.5 ${isExpanded ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2'}`}>
                {/* ET0 */}
                <div className="p-3 rounded-xl bg-white border border-stone-200 space-y-1">
                  <span className="text-[11px] text-stone-600 block">{t.irrigation.et0Label}</span>
                  <div className="flex items-baseline gap-1 font-mono tabular-nums" dir="ltr">
                    <span className="text-2xl font-bold text-stone-900">
                      {recommendation.et0Current.value !== null ? recommendation.et0Current.value.toFixed(2) : 'N/A'}
                    </span>
                    <span className="text-[11px] text-stone-500">mm/d</span>
                  </div>
                  <span className="text-[10px] font-mono text-stone-500 block">
                    {getOriginLabel(recommendation.et0Current.origin)} · {recommendation.et0Current.observationDate}
                  </span>
                </div>

                {/* ETc & ETc_adj */}
                <div className="p-3 rounded-xl bg-white border border-stone-200 space-y-1">
                  <span className="text-[11px] text-stone-600 block">{t.irrigation.etcLabel}</span>
                  <div className="flex items-baseline gap-1 font-mono tabular-nums" dir="ltr">
                    <span className="text-2xl font-bold text-stone-900">
                      {recommendation.etcAdjustedCurrent.value !== null
                        ? recommendation.etcAdjustedCurrent.value.toFixed(2)
                        : 'N/A'}
                    </span>
                    <span className="text-[11px] text-stone-500">mm/d</span>
                  </div>
                  <span className="text-[10px] font-mono text-stone-500 block" dir="ltr">
                    Kc {recommendation.kcCurrent.value?.toFixed(2)} · Ks {recommendation.ksCurrent.value?.toFixed(2)}
                  </span>
                </div>

                {/* Root-Zone Depletion */}
                <div className="p-3 rounded-xl bg-white border border-stone-200 space-y-1">
                  <span className="text-[11px] text-stone-600 block">{t.irrigation.depletionLabel}</span>
                  <div className="flex items-baseline gap-1 font-mono tabular-nums" dir="ltr">
                    <span className="text-2xl font-bold text-stone-900">
                      {recommendation.currentDepletionMm.value !== null
                        ? recommendation.currentDepletionMm.value.toFixed(1)
                        : 'N/A'}
                    </span>
                    <span className="text-[11px] text-stone-500">mm</span>
                  </div>
                  <span className="text-[10px] font-mono text-stone-500 block" dir="ltr">
                    Zr: {recommendation.rootDepthM.value?.toFixed(2)} m · {recommendation.currentStage}
                  </span>
                </div>

                {/* TAW / RAW */}
                <div className="p-3 rounded-xl bg-white border border-stone-200 space-y-1">
                  <span className="text-[11px] text-stone-600 block">{t.irrigation.tawRawLabel}</span>
                  <div className="flex items-baseline gap-1 font-mono tabular-nums" dir="ltr">
                    <span className="text-2xl font-bold text-stone-900">
                      {recommendation.rawMm.value !== null ? recommendation.rawMm.value.toFixed(1) : 'N/A'}
                    </span>
                    <span className="text-[11px] text-stone-500">
                      / {recommendation.tawMm.value !== null ? recommendation.tawMm.value.toFixed(1) : 'N/A'} mm
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-stone-500 block">
                    {getOriginLabel(recommendation.soilProfile.origin)} · p={recommendation.allowableDepletionFractionP}
                  </span>
                </div>
              </div>

              {/* 3. Irrigation Requirement & Volume Card */}
              <div className={`grid gap-2.5 ${
                recommendation.irrigationDurationHours !== null
                  ? isExpanded
                    ? 'grid-cols-2 md:grid-cols-4'
                    : 'grid-cols-2'
                  : isExpanded
                  ? 'grid-cols-3'
                  : 'grid-cols-3'
              }`}>
                <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200">
                  <span className="text-[11px] text-stone-700 block">{t.irrigation.netDepthCardLabel}</span>
                  <div className="mt-1 flex items-baseline gap-1 font-mono tabular-nums" dir="ltr">
                    <span className="text-2xl font-bold text-emerald-900">
                      {recommendation.netIrrigationDepthMm?.toFixed(1) ?? '0.0'}
                    </span>
                    <span className="text-xs text-stone-600">mm</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200">
                  <span className="text-[11px] text-stone-700 block">{t.irrigation.grossDepthCardLabel}</span>
                  <div className="mt-1 flex items-baseline gap-1 font-mono tabular-nums" dir="ltr">
                    <span className="text-2xl font-bold text-emerald-900">
                      {recommendation.grossIrrigationDepthMm?.toFixed(1) ?? '0.0'}
                    </span>
                    <span className="text-xs text-stone-600">mm</span>
                  </div>
                  <span className="text-[10px] font-mono text-stone-500 block">
                    Ea = {Math.round(recommendation.applicationEfficiency * 100)}%
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-sky-50/50 border border-sky-200">
                  <span className="text-[11px] text-stone-700 block">{t.irrigation.volumeCardLabel}</span>
                  {recommendation.waterVolumeM3 !== null ? (
                    <>
                      <div className="mt-1 flex items-baseline gap-1 font-mono tabular-nums" dir="ltr">
                        <span className="text-2xl font-bold text-sky-950">
                          {recommendation.waterVolumeM3.toLocaleString()}
                        </span>
                        <span className="text-xs text-stone-600">m³</span>
                      </div>
                      <span className="text-[10px] font-mono text-stone-500 block" dir="ltr">
                        {recommendation.fieldAreaHa} ha
                      </span>
                    </>
                  ) : (
                    <span className="text-[11px] text-amber-800 block mt-1">
                      {t.irrigation.areaRequiredForVolume}
                    </span>
                  )}
                </div>

                {/* STRICT RULE: Do NOT display irrigation duration when flow data is unavailable */}
                {recommendation.irrigationDurationHours !== null && (
                  <div className="p-3 rounded-xl bg-sky-50/50 border border-sky-200">
                    <span className="text-[11px] text-stone-700 block">{t.irrigation.durationCardLabel}</span>
                    <div className="mt-1 flex items-baseline gap-1 font-mono tabular-nums" dir="ltr">
                      <span className="text-2xl font-bold text-sky-950">
                        {recommendation.irrigationDurationHours.toFixed(1)}
                      </span>
                      <span className="text-xs text-stone-600">h</span>
                    </div>
                    <span className="text-[10px] font-mono text-stone-500 block" dir="ltr">
                      Q = {config.systemFlowRateLph?.toLocaleString()} L/h
                    </span>
                  </div>
                )}
              </div>

              {/* 4. Forecast Irrigation Window */}
              {recommendation.forecastSummary && (
                <div className="p-3.5 rounded-xl bg-white border border-sky-200 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-sky-900 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-sky-700" />
                      {t.irrigation.forecastWindowTitle}
                    </span>
                    <span className="text-[10px] font-mono text-sky-800">
                      {t.irrigation.originForecast} · +{recommendation.forecastSummary.horizonDays}d
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono tabular-nums" dir="ltr">
                    <div className="p-2 rounded-lg bg-stone-50 border border-stone-200">
                      <span className="text-[10px] text-stone-500 block">{t.irrigation.nextRawDateLabel}</span>
                      <span className="font-bold text-stone-900">
                        {recommendation.forecastSummary.firstDayReachingRaw || '—'}
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-stone-50 border border-stone-200">
                      <span className="text-[10px] text-stone-500 block">{t.irrigation.recommendedWindowLabel}</span>
                      <span className="font-bold text-stone-900">
                        {recommendation.forecastSummary.recommendedWindowStart
                          ? `${recommendation.forecastSummary.recommendedWindowStart.slice(5)} → ${recommendation.forecastSummary.recommendedWindowEnd?.slice(5)}`
                          : '—'}
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-stone-50 border border-stone-200">
                      <span className="text-[10px] text-stone-500 block">Σ ETc (7d)</span>
                      <span className="font-bold text-stone-900">
                        {recommendation.forecastSummary.projectedTotalEtcMm.toFixed(1)} mm
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-stone-50 border border-stone-200">
                      <span className="text-[10px] text-stone-500 block">Σ Peff / Rain (7d)</span>
                      <span className="font-bold text-sky-800">
                        {recommendation.forecastSummary.projectedEffectiveRainMm.toFixed(1)} / {recommendation.forecastSummary.projectedTotalForecastRainMm.toFixed(1)} mm
                      </span>
                    </div>
                  </div>

                  {recommendation.forecastSummary.rainfallWillDelayIrrigation && (
                    <div className="text-[11px] font-semibold text-sky-800 flex items-center gap-1.5">
                      <Droplets className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                      <span>{t.irrigation.rainDelayNotice}</span>
                    </div>
                  )}

                  {!recommendation.forecastSummary.firstDayReachingRaw && (
                    <p className="text-[11px] text-emerald-800">{t.irrigation.noRawInHorizon}</p>
                  )}

                  <p className="text-[10px] text-stone-500 italic">
                    {language === 'ar'
                      ? recommendation.forecastSummary.forecastUncertaintyNoteAr
                      : language === 'fr'
                      ? recommendation.forecastSummary.forecastUncertaintyNoteFr
                      : recommendation.forecastSummary.forecastUncertaintyNoteEn}
                  </p>
                </div>
              )}

              {/* 5. Daily Soil-Water Balance SVG Chart */}
              <WaterBalanceChart
                historicalSteps={recommendation.historicalBalance}
                forecastSteps={recommendation.forecastBalance}
              />

              {/* Collapsible Daily Water Balance Table */}
              <div className="rounded-xl bg-white border border-stone-200 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowDailyTable((v) => !v)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border-b border-stone-200 flex items-center justify-between text-xs font-semibold text-stone-800 hover:bg-stone-100"
                >
                  <span>Daily Water Balance Breakdown ({recommendation.historicalBalance.length}d obs + {recommendation.forecastBalance.length}d forecast)</span>
                  {showDailyTable ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {showDailyTable && (
                  <div className="overflow-x-auto max-h-64">
                    <table className="w-full text-[11px] font-mono tabular-nums text-left border-collapse" dir="ltr">
                      <thead className="bg-stone-100 text-stone-600 sticky top-0">
                        <tr>
                          <th className="p-2">Date</th>
                          <th className="p-2">Type</th>
                          <th className="p-2">Kc</th>
                          <th className="p-2">ET0</th>
                          <th className="p-2">ETc_adj</th>
                          <th className="p-2">Peff</th>
                          <th className="p-2">In</th>
                          <th className="p-2">D(t)</th>
                          <th className="p-2">RAW</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {[...recommendation.historicalBalance, ...recommendation.forecastBalance].map((row) => (
                          <tr key={row.date} className={row.isForecast ? 'bg-sky-50/40' : 'bg-white'}>
                            <td className="p-2 font-semibold text-stone-800">{row.date}</td>
                            <td className="p-2 text-[10px]">
                              {row.isForecast ? t.irrigation.forecastLabel : t.irrigation.observedLabel}
                            </td>
                            <td className="p-2">{row.kc.toFixed(2)}</td>
                            <td className="p-2">{row.et0Mm.toFixed(2)}</td>
                            <td className="p-2">{row.etcAdjustedMm.toFixed(2)}</td>
                            <td className="p-2 text-sky-700">{row.effectiveRainfallMm.toFixed(1)}</td>
                            <td className="p-2 text-emerald-700">{row.irrigationNetMm.toFixed(1)}</td>
                            <td className={`p-2 font-bold ${row.exceededRaw ? 'text-amber-700' : 'text-stone-900'}`}>
                              {row.depletionEndMm.toFixed(1)}
                            </td>
                            <td className="p-2 text-stone-500">{row.rawMm.toFixed(1)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}

          {/* 6. Confidence Factors & Full Data Traceability Table */}
          <div className="p-3.5 rounded-xl bg-white border border-stone-200 space-y-2.5">
            <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              {t.irrigation.confidenceFactorsTitle}
            </span>
            <ul className="space-y-1.5 text-[11px] text-stone-700">
              {recommendation.confidenceFactors.map((f, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span
                    className={`font-mono font-bold shrink-0 ${
                      f.impact === 'positive'
                        ? 'text-emerald-700'
                        : f.impact === 'blocking'
                        ? 'text-rose-700'
                        : 'text-amber-700'
                    }`}
                  >
                    {f.impact === 'positive' ? '✓' : f.impact === 'blocking' ? '✕' : '▲'}
                  </span>
                  <span>
                    {language === 'ar' ? f.messageAr : language === 'fr' ? f.messageFr : f.messageEn}
                  </span>
                </li>
              ))}
            </ul>

            {recommendation.traceabilityRecords.length > 0 && (
              <div className="pt-2 border-t border-stone-100 space-y-1.5">
                <span className="text-xs font-bold text-stone-900 block">
                  {t.irrigation.provenanceTableTitle}
                </span>
                <div className="space-y-1.5">
                  {recommendation.traceabilityRecords.map((rec, i) => (
                    <div
                      key={i}
                      className="p-2 rounded-lg bg-stone-50 border border-stone-200 flex flex-wrap items-center justify-between gap-2 text-[11px]"
                    >
                      <div className="min-w-0">
                        <span className="font-semibold text-stone-800 block">{rec.parameterName}</span>
                        <span className="text-[10px] text-stone-500 font-mono block truncate max-w-md">
                          {rec.source} · {getOriginLabel(rec.origin)}
                          {rec.spatialResolution ? ` · ${rec.spatialResolution}` : ''}
                        </span>
                      </div>
                      <div className="text-end font-mono tabular-nums" dir="ltr">
                        <span className="font-bold text-stone-900 block">
                          {rec.value !== null ? `${rec.value} ${rec.unit}` : 'N/A'}
                        </span>
                        <span className="text-[10px] text-stone-500 flex items-center gap-1 justify-end">
                          <Clock className="w-3 h-3" />
                          {rec.observationDate}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SECTION A: FARMER PRIORITIES & GLOBAL CONTEXT (PERSISTED PER PARCEL)  */}
      {/* ===================================================================== */}
      <div className="rounded-xl bg-white border border-stone-200 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowFarmerContextSection((v) => !v)}
          className="w-full px-3.5 py-2.5 bg-stone-50 border-b border-stone-200 flex items-center justify-between text-xs font-bold text-stone-800 hover:bg-stone-100 transition-colors"
        >
          <span className="flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-emerald-700" />
            {t.rotationAdvisor.sectionContextTitle}
          </span>
          {showFarmerContextSection ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showFarmerContextSection && (
          <div className="p-3.5 space-y-3 text-xs">
            {/* Crop History + Core 4 Priorities */}
            <div className={`grid gap-3 ${isExpanded ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
              {/* Current / Harvested Crop for Rotation (synced with config.cropId or any global crop) */}
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  {t.rotationAdvisor.currentCropNote}
                </label>
                <select
                  value={activeRotationCropId}
                  onChange={(e) => {
                    const val = e.target.value;
                    const isMoroccan = MOROCCAN_CROP_DATABASE.some((m) => m.id === val);
                    if (isMoroccan || val === '') {
                      setRotationCropOverride('');
                      updateConfig((prev) => ({
                        ...prev,
                        cropId: val as FarmerIrrigationConfig['cropId'],
                      }));
                    } else {
                      setRotationCropOverride(val);
                    }
                  }}
                  className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-900 focus:border-emerald-600 focus:outline-none"
                >
                  <option value="">{t.irrigation.selectCropPlaceholder}</option>
                  {GLOBAL_ROTATION_CROP_DATABASE.map((c) => (
                    <option key={c.id} value={c.id}>
                      {getGlobalCropLabel(c)} ({c.scientificName})
                    </option>
                  ))}
                </select>
              </div>

              {/* Previous Season Crop (Optional) */}
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  {t.rotationAdvisor.previousCropLabel}
                </label>
                <select
                  value={config.previousCropId ?? ''}
                  onChange={(e) =>
                    updateConfig((prev) => ({ ...prev, previousCropId: e.target.value }))
                  }
                  className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-900 focus:border-emerald-600 focus:outline-none"
                >
                  <option value="">{t.rotationAdvisor.previousCropNone}</option>
                  {GLOBAL_ROTATION_CROP_DATABASE.map((c) => (
                    <option key={c.id} value={c.id}>
                      {getGlobalCropLabel(c)} ({c.family})
                    </option>
                  ))}
                </select>
              </div>

              {/* Residue Management */}
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  {t.rotationAdvisor.residueLabel}
                </label>
                <select
                  value={config.previousCropResidue ?? 'unknown'}
                  onChange={(e) =>
                    updateConfig((prev) => ({
                      ...prev,
                      previousCropResidue: e.target.value as CropResidueManagement,
                    }))
                  }
                  className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-900 focus:border-emerald-600 focus:outline-none"
                >
                  <option value="unknown">{t.rotationAdvisor.residueUnknown}</option>
                  <option value="incorporated">{t.rotationAdvisor.residueIncorporated}</option>
                  <option value="removed">{t.rotationAdvisor.residueRemoved}</option>
                  <option value="grazed">{t.rotationAdvisor.residueGrazed}</option>
                </select>
              </div>

              {/* Financial Capacity */}
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  {t.rotationAdvisor.financialCapacityLabel}
                </label>
                <select
                  value={farmerContext.financialCapacity ?? ''}
                  onChange={(e) =>
                    updateFarmerContext((prev) => ({
                      ...prev,
                      financialCapacity:
                        e.target.value === ''
                          ? null
                          : (e.target.value as FinancialCapacityLevel),
                    }))
                  }
                  className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-900 focus:border-emerald-600 focus:outline-none"
                >
                  <option value="">{t.rotationAdvisor.finUnspecified}</option>
                  <option value="low_input">{t.rotationAdvisor.finLowInput}</option>
                  <option value="moderate">{t.rotationAdvisor.finModerate}</option>
                  <option value="high_investment">{t.rotationAdvisor.finHighInvestment}</option>
                </select>
              </div>

              {/* Primary Goal */}
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  {t.rotationAdvisor.primaryGoalLabel}
                </label>
                <select
                  value={farmerContext.primaryGoal ?? ''}
                  onChange={(e) =>
                    updateFarmerContext((prev) => ({
                      ...prev,
                      primaryGoal:
                        e.target.value === ''
                          ? null
                          : (e.target.value as PrimaryFarmingGoal),
                    }))
                  }
                  className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-900 focus:border-emerald-600 focus:outline-none"
                >
                  <option value="">{t.rotationAdvisor.goalUnspecified}</option>
                  <option value="food_security">{t.rotationAdvisor.goalFoodSecurity}</option>
                  <option value="commercial_profit">{t.rotationAdvisor.goalCommercialProfit}</option>
                  <option value="soil_regeneration">{t.rotationAdvisor.goalSoilRegeneration}</option>
                  <option value="water_conservation">{t.rotationAdvisor.goalWaterConservation}</option>
                </select>
              </div>

              {/* Water & Irrigation Capacity */}
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  {t.rotationAdvisor.waterCapacityLabel}
                </label>
                <select
                  value={farmerContext.waterAndTechCapacity ?? ''}
                  onChange={(e) =>
                    updateFarmerContext((prev) => ({
                      ...prev,
                      waterAndTechCapacity:
                        e.target.value === ''
                          ? null
                          : (e.target.value as WaterAndTechCapacity),
                    }))
                  }
                  className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-900 focus:border-emerald-600 focus:outline-none"
                >
                  <option value="">{t.rotationAdvisor.waterUnspecified}</option>
                  <option value="rainfed_only">{t.rotationAdvisor.waterRainfed}</option>
                  <option value="limited_irrigation">{t.rotationAdvisor.waterLimited}</option>
                  <option value="modern_irrigation">{t.rotationAdvisor.waterModern}</option>
                </select>
              </div>

              {/* Cultural Practice */}
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  {t.rotationAdvisor.culturalPracticeLabel}
                </label>
                <select
                  value={farmerContext.culturalPractice ?? ''}
                  onChange={(e) =>
                    updateFarmerContext((prev) => ({
                      ...prev,
                      culturalPractice:
                        e.target.value === ''
                          ? null
                          : (e.target.value as CulturalFarmingPractice),
                    }))
                  }
                  className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-900 focus:border-emerald-600 focus:outline-none"
                >
                  <option value="">{t.rotationAdvisor.cultureUnspecified}</option>
                  <option value="traditional_heritage">{t.rotationAdvisor.cultureTraditional}</option>
                  <option value="open_to_diversification">{t.rotationAdvisor.cultureDiversification}</option>
                  <option value="mixed_crop_livestock">{t.rotationAdvisor.cultureMixedLivestock}</option>
                </select>
              </div>
            </div>

            {/* Collapsible Advanced Local Agricultural Context (Collapsed by default) */}
            <div className="pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setShowAdvancedLocalContext((v) => !v)}
                className="w-full flex items-center justify-between py-1.5 text-[11px] font-semibold text-stone-700 hover:text-emerald-800"
              >
                <span className="flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-emerald-700" />
                  {t.rotationAdvisor.advancedLocalToggle}
                </span>
                {showAdvancedLocalContext ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showAdvancedLocalContext && (
                <div className={`mt-2 grid gap-3 pt-2 border-t border-stone-100 ${isExpanded ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">
                      {t.rotationAdvisor.countryRegionLabel}
                    </label>
                    <input
                      type="text"
                      value={farmerContext.localContext.countryOrRegion}
                      placeholder={t.rotationAdvisor.countryRegionPlaceholder}
                      onChange={(e) =>
                        updateFarmerContext((prev) => ({
                          ...prev,
                          localContext: {
                            ...prev.localContext,
                            countryOrRegion: e.target.value,
                          },
                        }))
                      }
                      className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-900 focus:border-emerald-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">
                      {t.rotationAdvisor.seasonLabel}
                    </label>
                    <select
                      value={farmerContext.localContext.season}
                      onChange={(e) =>
                        updateFarmerContext((prev) => ({
                          ...prev,
                          localContext: {
                            ...prev.localContext,
                            season: e.target.value as FarmingSeasonOption,
                          },
                        }))
                      }
                      className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-900 focus:border-emerald-600 focus:outline-none"
                    >
                      <option value="unspecified">{t.rotationAdvisor.seasonUnspecified}</option>
                      <option value="autumn_winter">{t.rotationAdvisor.seasonAutumnWinter}</option>
                      <option value="spring">{t.rotationAdvisor.seasonSpring}</option>
                      <option value="summer">{t.rotationAdvisor.seasonSummer}</option>
                      <option value="perennial_year_round">{t.rotationAdvisor.seasonPerennial}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">
                      {t.rotationAdvisor.livestockIntegrationLabel}
                    </label>
                    <select
                      value={
                        farmerContext.localContext.livestockIntegration === null
                          ? 'auto'
                          : farmerContext.localContext.livestockIntegration
                          ? 'yes'
                          : 'no'
                      }
                      onChange={(e) =>
                        updateFarmerContext((prev) => ({
                          ...prev,
                          localContext: {
                            ...prev.localContext,
                            livestockIntegration:
                              e.target.value === 'auto' ? null : e.target.value === 'yes',
                          },
                        }))
                      }
                      className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-900 focus:border-emerald-600 focus:outline-none"
                    >
                      <option value="auto">{t.rotationAdvisor.livestockAuto}</option>
                      <option value="yes">{t.rotationAdvisor.livestockYes}</option>
                      <option value="no">{t.rotationAdvisor.livestockNo}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">
                      {t.rotationAdvisor.familiarCropsLabel}
                    </label>
                    <input
                      type="text"
                      value={familiarCropsInput}
                      placeholder="wheat, chickpea, barley"
                      onChange={(e) => {
                        const raw = e.target.value;
                        setFamiliarCropsInput(raw);
                        updateFarmerContext((prev) => ({
                          ...prev,
                          localContext: {
                            ...prev.localContext,
                            familiarCrops: raw
                              .split(',')
                              .map((s) => s.trim())
                              .filter(Boolean),
                          },
                        }));
                      }}
                      className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-900 focus:border-emerald-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">
                      {t.rotationAdvisor.locallyAvailableLabel}
                    </label>
                    <input
                      type="text"
                      value={localAvailCropsInput}
                      placeholder="barley, chickpea, olive"
                      onChange={(e) => {
                        const raw = e.target.value;
                        setLocalAvailCropsInput(raw);
                        updateFarmerContext((prev) => ({
                          ...prev,
                          localContext: {
                            ...prev.localContext,
                            locallyAvailableCrops: raw
                              .split(',')
                              .map((s) => s.trim())
                              .filter(Boolean),
                          },
                        }));
                      }}
                      className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-900 focus:border-emerald-600 focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* SECTION B: GLOBAL CROP ROTATION & SOIL HEALTH ADVISOR                 */}
      {/* ===================================================================== */}
      <div className="p-3.5 rounded-xl bg-white border border-stone-200 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
              <Sprout className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>{t.rotationAdvisor.sectionAdvisorTitle}</span>
            </h4>
            <p className="text-[11px] text-stone-500 mt-0.5">{t.rotationAdvisor.sectionAdvisorSubtitle}</p>
          </div>

          {rotationAdvice && (
            <span className="text-[11px] font-mono text-stone-700">
              {t.irrigation.confidenceLabel}{' '}
              <strong className="text-stone-900">
                {rotationAdvice.confidence === 'HIGH'
                  ? t.irrigation.confHigh
                  : rotationAdvice.confidence === 'MEDIUM'
                  ? t.irrigation.confMedium
                  : rotationAdvice.confidence === 'LOW'
                  ? t.irrigation.confLow
                  : t.irrigation.confInsufficient}
              </strong>
            </span>
          )}
        </div>

        {/* Missing crop hint */}
        {!activeRotationCropId && (
          <div className="p-3 rounded-lg bg-stone-50 border border-stone-200 text-xs text-stone-600 flex items-center gap-2">
            <Info className="w-4 h-4 text-stone-500 shrink-0" />
            <span>{t.rotationAdvisor.selectCropForRotationHint}</span>
          </div>
        )}

        {/* Active Advisor Output */}
        {rotationAdvice && (
          <div className="space-y-3">
            {/* Explicit Provisional / Preliminary Flags */}
            {(rotationAdvice.isProvisionalHistory || rotationAdvice.isPreliminaryClimate) && (
              <div className="flex flex-wrap gap-2 text-[11px]">
                {rotationAdvice.isProvisionalHistory && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-900 font-medium">
                    <Info className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                    {t.rotationAdvisor.provisionalHistoryBadge}
                  </span>
                )}
                {rotationAdvice.isPreliminaryClimate && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-sky-50 border border-sky-200 text-sky-900 font-medium">
                    <Clock className="w-3.5 h-3.5 text-sky-700 shrink-0" />
                    {t.rotationAdvisor.preliminaryClimateBadge}
                  </span>
                )}
              </div>
            )}

            {/* Family-level rotation warnings (e.g. Solanaceae break rule) */}
            {(language === 'ar'
              ? rotationAdvice.rotationFamilyWarningsAr
              : language === 'fr'
              ? rotationAdvice.rotationFamilyWarningsFr
              : rotationAdvice.rotationFamilyWarningsEn
            ).map((warn, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg bg-amber-50/80 border border-amber-300 text-xs text-amber-950 flex items-start gap-2"
              >
                <AlertTriangle className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
                <span className="leading-relaxed">{warn}</span>
              </div>
            ))}

            {/* Insufficient Data or No Eligible Recommendation State (Never green) */}
            {(rotationAdvice.status === 'INSUFFICIENT_DATA' ||
              rotationAdvice.status === 'NO_ELIGIBLE_RECOMMENDATION') && (
              <div
                className={`p-3.5 rounded-xl border space-y-2 ${
                  rotationAdvice.status === 'NO_ELIGIBLE_RECOMMENDATION'
                    ? 'bg-rose-50/70 border-rose-300 text-rose-950'
                    : 'bg-stone-50 border-stone-300 text-stone-900'
                }`}
              >
                <div className="flex items-center gap-2 text-xs font-bold">
                  <AlertTriangle
                    className={`w-4 h-4 shrink-0 ${
                      rotationAdvice.status === 'NO_ELIGIBLE_RECOMMENDATION'
                        ? 'text-rose-700'
                        : 'text-stone-700'
                    }`}
                  />
                  <span>
                    {rotationAdvice.status === 'NO_ELIGIBLE_RECOMMENDATION'
                      ? t.rotationAdvisor.statusNoEligible
                      : t.rotationAdvisor.statusInsufficientData}
                  </span>
                </div>
                <p className="text-xs leading-relaxed">
                  {language === 'ar'
                    ? rotationAdvice.emptyOrBlockedReasonAr
                    : language === 'fr'
                    ? rotationAdvice.emptyOrBlockedReasonFr
                    : rotationAdvice.emptyOrBlockedReasonEn}
                </p>
                {rotationAdvice.missingInformation.length > 0 && (
                  <ul className="list-disc list-inside text-[11px] text-stone-700 space-y-0.5 pt-1 border-t border-stone-200/70">
                    {rotationAdvice.missingInformation.map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Up to 3 Recommended Candidates */}
            {rotationAdvice.recommendations.length > 0 && (
              <div className={`grid gap-3 ${isExpanded ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1'}`}>
                {rotationAdvice.recommendations.map((cand) => {
                  const commonName =
                    language === 'ar'
                      ? cand.commonNameAr
                      : language === 'fr'
                      ? cand.commonNameFr
                      : cand.commonNameEn;
                  const whyText =
                    language === 'ar'
                      ? cand.whyRecommendedAr
                      : language === 'fr'
                      ? cand.whyRecommendedFr
                      : cand.whyRecommendedEn;
                  const soilText =
                    language === 'ar'
                      ? cand.soilHealthBenefitAr
                      : language === 'fr'
                      ? cand.soilHealthBenefitFr
                      : cand.soilHealthBenefitEn;
                  const waterText =
                    language === 'ar'
                      ? cand.waterClimateFitAr
                      : language === 'fr'
                      ? cand.waterClimateFitFr
                      : cand.waterClimateFitEn;
                  const socioText =
                    language === 'ar'
                      ? cand.socioEconomicFitAr
                      : language === 'fr'
                      ? cand.socioEconomicFitFr
                      : cand.socioEconomicFitEn;
                  const cautionsList =
                    language === 'ar'
                      ? cand.agronomicCautionsAr
                      : language === 'fr'
                      ? cand.agronomicCautionsFr
                      : cand.agronomicCautionsEn;

                  const isGreenSuitable = cand.status === 'suitable';
                  const statusBadgeCls = isGreenSuitable
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : cand.status === 'conditionally_suitable'
                    ? 'bg-amber-50 text-amber-900 border-amber-300'
                    : 'bg-stone-100 text-stone-700 border-stone-300';
                  const statusLabel = isGreenSuitable
                    ? t.rotationAdvisor.statusSuitable
                    : cand.status === 'conditionally_suitable'
                    ? t.rotationAdvisor.statusConditionallySuitable
                    : t.rotationAdvisor.statusInsufficientData;

                  return (
                    <div
                      key={cand.cropId}
                      className="rounded-xl border border-stone-200 bg-stone-50/40 p-3.5 space-y-3 flex flex-col justify-between"
                    >
                      <div className="space-y-2.5">
                        {/* Candidate Header */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h5 className="text-sm font-bold text-stone-900 leading-tight">{commonName}</h5>
                            <span className="text-[11px] text-stone-500 italic block">
                              {cand.scientificName} · {cand.family}
                            </span>
                          </div>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${statusBadgeCls}`}
                          >
                            {statusLabel}
                          </span>
                        </div>

                        {/* Compatibility Index (Explicitly NOT probability of success) */}
                        <div className="p-2.5 rounded-lg bg-white border border-stone-200">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="text-[11px] font-semibold text-stone-700">
                              {t.rotationAdvisor.compatibilityIndexLabel}
                            </span>
                            <span className="text-base font-extrabold font-mono text-stone-900 tabular-nums" dir="ltr">
                              {cand.compatibilityScore !== null ? `${cand.compatibilityScore} / 100` : 'N/A'}
                            </span>
                          </div>
                          <span className="text-[10px] text-stone-500 italic block mt-0.5">
                            {t.rotationAdvisor.compatibilityDisclaimer}
                          </span>
                        </div>

                        {/* Why Recommended */}
                        <div className="text-xs text-stone-800 leading-relaxed">
                          <span className="font-bold text-stone-900">{t.rotationAdvisor.whyRecommendedLabel}: </span>
                          {whyText}
                        </div>

                        {/* 4 Structured Agronomic Explanations */}
                        <div className="space-y-2 text-[11px] leading-relaxed">
                          <div className="p-2 rounded-lg bg-white border border-emerald-200/80">
                            <span className="font-bold text-emerald-900 block mb-0.5">
                              {t.rotationAdvisor.soilHealthHeader}
                            </span>
                            <p className="text-stone-700">{soilText}</p>
                          </div>

                          <div className="p-2 rounded-lg bg-white border border-sky-200/80">
                            <span className="font-bold text-sky-900 block mb-0.5">
                              {t.rotationAdvisor.waterClimateHeader}
                            </span>
                            <p className="text-stone-700">{waterText}</p>
                          </div>

                          <div className="p-2 rounded-lg bg-white border border-amber-200/80">
                            <span className="font-bold text-amber-900 block mb-0.5">
                              {t.rotationAdvisor.socioEconomicHeader}
                            </span>
                            <p className="text-stone-700">{socioText}</p>
                          </div>

                          <div className="p-2 rounded-lg bg-rose-50/40 border border-rose-200/80">
                            <span className="font-bold text-rose-900 block mb-0.5">
                              {t.rotationAdvisor.cautionsHeader}
                            </span>
                            <ul className="list-disc list-inside text-stone-700 space-y-0.5">
                              {cautionsList.map((c, idx) => (
                                <li key={idx}>{c}</li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        {/* Missing Info */}
                        {cand.missingInformation.length > 0 && (
                          <div className="p-2 rounded-lg bg-stone-100 border border-stone-200 text-[10px] text-stone-700">
                            <span className="font-bold text-stone-800 block mb-0.5">
                              {t.rotationAdvisor.missingInfoHeader}:
                            </span>
                            <span>{cand.missingInformation.join(' · ')}</span>
                          </div>
                        )}
                      </div>

                      {/* Reference Sources Footer */}
                      <div className="pt-2 border-t border-stone-200 text-[10px] text-stone-500">
                        <span className="font-semibold text-stone-700 flex items-center gap-1 mb-0.5">
                          <BookOpen className="w-3 h-3 text-emerald-700" />
                          {t.rotationAdvisor.referencesHeader}
                        </span>
                        <span className="block leading-snug">{cand.referenceSources.join(' • ')}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Collapsible Excluded Candidates & Safety Filters */}
            {rotationAdvice.excludedCandidates.length > 0 && (
              <div className="rounded-lg border border-stone-200 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowExcludedCandidates((v) => !v)}
                  className="w-full px-3 py-2 bg-stone-50 flex items-center justify-between text-[11px] font-semibold text-stone-800 hover:bg-stone-100"
                >
                  <span className="flex items-center gap-1.5">
                    <Ban className="w-3.5 h-3.5 text-rose-700" />
                    {t.rotationAdvisor.excludedCropsToggle} ({rotationAdvice.excludedCandidates.length})
                  </span>
                  {showExcludedCandidates ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
                {showExcludedCandidates && (
                  <div className="p-3 space-y-2 bg-white text-[11px]">
                    {rotationAdvice.excludedCandidates.map((ex) => (
                      <div key={ex.cropId} className="p-2 rounded-lg bg-rose-50/40 border border-rose-200/70">
                        <div className="font-bold text-stone-900">
                          {language === 'ar' ? ex.commonNameAr : language === 'fr' ? ex.commonNameFr : ex.commonNameEn}{' '}
                          <span className="text-stone-500 font-normal italic">({ex.family})</span>
                        </div>
                        <p className="text-stone-700 mt-0.5">
                          {language === 'ar' ? ex.reasonAr : language === 'fr' ? ex.reasonFr : ex.reasonEn}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Collapsible Evidence Distinction (Measured vs Calculated vs Assumed vs Missing) */}
            <div className="rounded-lg border border-stone-200 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowEvidenceDistinction((v) => !v)}
                className="w-full px-3 py-2 bg-stone-50 flex items-center justify-between text-[11px] font-semibold text-stone-800 hover:bg-stone-100"
              >
                <span className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-sky-700" />
                  {t.rotationAdvisor.evidenceDistinctionToggle}
                </span>
                {showEvidenceDistinction ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
              {showEvidenceDistinction && (
                <div className="p-3 space-y-2 bg-white text-[11px] text-stone-700">
                  <div>
                    <span className="font-bold text-emerald-900 block">{t.rotationAdvisor.measuredLabel}:</span>
                    <ul className="list-disc list-inside">
                      {rotationAdvice.evidenceSummary.measuredOrRetrieved.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <span className="font-bold text-sky-900 block">{t.rotationAdvisor.calculatedLabel}:</span>
                    <ul className="list-disc list-inside">
                      {rotationAdvice.evidenceSummary.calculatedIndicators.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <span className="font-bold text-amber-900 block">{t.rotationAdvisor.assumptionsLabel}:</span>
                    <ul className="list-disc list-inside">
                      {rotationAdvice.evidenceSummary.contextualAssumptions.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  {rotationAdvice.evidenceSummary.missingOrUnavailable.length > 0 && (
                    <div>
                      <span className="font-bold text-rose-900 block">{t.rotationAdvisor.missingInfoHeader}:</span>
                      <ul className="list-disc list-inside">
                        {rotationAdvice.evidenceSummary.missingOrUnavailable.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* SECTION C: ROTATION TRANSITION BRIDGE (جسر الانتقال الزراعي)           */}
      {/* ===================================================================== */}
      {transitionResult && (
        <RotationTransitionSection
          farm={farm}
          transitionResult={transitionResult}
          transitionState={transitionState}
          onUpdateTransitionState={updateTransitionState}
          previousCropResidue={config.previousCropResidue || 'unknown'}
          onUpdateResidueManagement={(val) =>
            updateConfig((prev) => ({ ...prev, previousCropResidue: val }))
          }
          primaryGoal={farmerContext.primaryGoal}
          onUpdatePrimaryGoal={(val) =>
            updateFarmerContext((prev) => ({ ...prev, primaryGoal: val }))
          }
          onSeedSequenceFromConfig={handleSeedSequenceFromConfig}
          hasConfigSeedAvailable={configSeedSequence.length > 0}
          isExpanded={isExpanded}
        />
      )}
    </div>
  );
};
