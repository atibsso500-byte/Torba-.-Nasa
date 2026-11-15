/**
 * TURBA — Rotation Transition Bridge UI (جسر الانتقال الزراعي)
 *
 * Sections A–F + Printable Report Modal (React Portal z-[9999]):
 * A. Strategy A — Current Rotation Baseline Timeline & Weaknesses (+ Missing Info)
 * B. Gradual Transition Bridge Timeline (CURRENT SYSTEM -> TRANSITION -> TARGET SYSTEM)
 * C. Compare Strategies (Strategy B Recommended Gradual, Conservative, Strategy C Alternative Resilience)
 * D. Complete 8-Axis Strategy Explainability, 5 Evaluation Dimensions, Cumulative Outcomes & Provenance
 * E. Direct Farmer Decision & Interactive Constraints (Goal, Resilience Focus, Residue Handling,
 *    Accept / Reject / Unavailable, Horizon, Budget, Quota, Recalculate)
 * F. Printable Transition Report & JSON Export
 */

import React, { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FarmRecord } from '../../types/farm';
import {
  CropResidueManagement,
  FarmerCropDecisionState,
  FarmingSeasonOption,
  PersistedTransitionState,
  PrimaryFarmingGoal,
  RotationCropCategory,
  RotationTransitionResult,
  TransitionDataSourceEntry,
  TransitionDifficulty,
  TransitionEvaluationBadge,
  TransitionPathwayOption,
  TransitionResilienceFocus,
} from '../../types/irrigation';
import {
  GLOBAL_ROTATION_CROP_DATABASE,
  getGlobalRotationCropById,
} from '../../data/crops';
import { useTranslation } from '../../i18n/language';
import {
  AlertTriangle,
  ArrowRight,
  Ban,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Compass,
  Download,
  FileText,
  GitBranch,
  HelpCircle,
  Info,
  Layers,
  Plus,
  Printer,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Sprout,
  Trash2,
  X,
} from 'lucide-react';

interface RotationTransitionSectionProps {
  farm: FarmRecord;
  transitionResult: RotationTransitionResult;
  transitionState: PersistedTransitionState;
  onUpdateTransitionState: (
    updater: (prev: PersistedTransitionState) => PersistedTransitionState
  ) => void;
  previousCropResidue: CropResidueManagement;
  onUpdateResidueManagement: (val: CropResidueManagement) => void;
  primaryGoal: PrimaryFarmingGoal | null;
  onUpdatePrimaryGoal: (val: PrimaryFarmingGoal | null) => void;
  onSeedSequenceFromConfig?: () => void;
  hasConfigSeedAvailable?: boolean;
  isExpanded?: boolean;
}

/**
 * Clean, domain-specific botanical inline SVG emblem (zero external CDN URLs).
 */
const BotanicalCropEmblem: React.FC<{ category: RotationCropCategory; cropId?: string }> = ({
  category,
  cropId,
}) => {
  const baseClass = 'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border';

  if (category === 'cereal') {
    return (
      <div className={`${baseClass} bg-amber-50/70 border-amber-200 text-amber-800`} aria-hidden="true">
        <svg viewBox="0 0 24 24" className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 21V4" strokeLinecap="round" />
          <path d="M12 7c-2.5 0-4-1.5-4-3.5 2.5 0 4 1.5 4 3.5Z" />
          <path d="M12 7c2.5 0 4-1.5 4-3.5-2.5 0-4 1.5-4 3.5Z" />
          <path d="M12 12c-2.8 0-4.5-1.6-4.5-3.8 2.8 0 4.5 1.6 4.5 3.8Z" />
          <path d="M12 12c2.8 0 4.5-1.6 4.5-3.8-2.8 0-4.5 1.6-4.5 3.8Z" />
          <path d="M12 17c-2.5 0-4-1.4-4-3.4 2.5 0 4 1.4 4 3.4Z" />
          <path d="M12 17c2.5 0 4-1.4 4-3.4-2.5 0-4 1.4-4 3.4Z" />
        </svg>
      </div>
    );
  }

  if (category === 'grain_legume' || category === 'forage_legume') {
    return (
      <div className={`${baseClass} bg-emerald-50 border-emerald-200 text-emerald-900`} aria-hidden="true">
        <svg viewBox="0 0 24 24" className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M6 19C7 11 12 6 19 5c-1 7-6 12-13 14Z" strokeLinejoin="round" />
          <circle cx="10.5" cy="14.5" r="1.3" fill="currentColor" stroke="none" />
          <circle cx="13.5" cy="11.5" r="1.3" fill="currentColor" stroke="none" />
          <circle cx="16" cy="8.8" r="1.1" fill="currentColor" stroke="none" />
        </svg>
      </div>
    );
  }

  if (category === 'tuber_crop') {
    return (
      <div className={`${baseClass} bg-stone-100 border-stone-300 text-stone-700`} aria-hidden="true">
        <svg viewBox="0 0 24 24" className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M7 11c0-3.2 2.4-5.5 5.6-5.5 3 0 5.4 2 5.4 5.2 0 4.2-2.6 7.8-6.2 7.8C8.8 18.5 7 15.2 7 11Z" />
          <circle cx="10.5" cy="10.5" r="0.8" fill="currentColor" stroke="none" />
          <circle cx="14" cy="13.5" r="0.8" fill="currentColor" stroke="none" />
        </svg>
      </div>
    );
  }

  if (category === 'bulb_vegetable') {
    return (
      <div className={`${baseClass} bg-amber-50/50 border-stone-300 text-stone-800`} aria-hidden="true">
        <svg viewBox="0 0 24 24" className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 3v4" strokeLinecap="round" />
          <path d="M10 4l2 3 2-3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12 7c-3.8 1.8-6 4.6-6 7.5a6 6 0 0 0 12 0c0-2.9-2.2-5.7-6-7.5Z" />
        </svg>
      </div>
    );
  }

  if (category === 'perennial_tree') {
    const isCitrus = cropId === 'citrus';
    return (
      <div
        className={`${baseClass} ${
          isCitrus ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-emerald-50 border-emerald-200 text-emerald-950'
        }`}
        aria-hidden="true"
      >
        <svg viewBox="0 0 24 24" className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 20v-7" strokeLinecap="round" />
          <path d="M12 13c-3.8 0-6.5-2.2-6.5-5.2 0-2.5 2.4-4.3 6.5-4.3s6.5 1.8 6.5 4.3c0 3-2.7 5.2-6.5 5.2Z" />
          <circle cx="9.5" cy="8.5" r="1" fill="currentColor" stroke="none" />
          <circle cx="14.5" cy="9" r="1" fill="currentColor" stroke="none" />
        </svg>
      </div>
    );
  }

  return (
    <div className={`${baseClass} bg-rose-50/70 border-rose-200 text-rose-900`} aria-hidden="true">
      <svg viewBox="0 0 24 24" className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 5c1-1.5 2.5-2 3.5-1.5M12 5c-1-1.5-2.5-2-3.5-1.5" strokeLinecap="round" />
        <path d="M12 6.5c-4 0-6.5 2.7-6.5 6.5S8 19.5 12 19.5s6.5-2.7 6.5-6.5S16 6.5 12 6.5Z" />
      </svg>
    </div>
  );
};

export const RotationTransitionSection: React.FC<RotationTransitionSectionProps> = ({
  farm,
  transitionResult,
  transitionState,
  onUpdateTransitionState,
  previousCropResidue,
  onUpdateResidueManagement,
  primaryGoal,
  onUpdatePrimaryGoal,
  onSeedSequenceFromConfig,
  hasConfigSeedAvailable = false,
  isExpanded = false,
}) => {
  const { t, language, isRtl } = useTranslation();
  const timelineRef = useRef<HTMLDivElement | null>(null);

  const [cropToAdd, setCropToAdd] = useState<string>('');
  const [selectedPathwayType, setSelectedPathwayType] = useState<
    'recommended' | 'conservative' | 'alternative'
  >('recommended');
  const [showCriteriaBreakdown, setShowCriteriaBreakdown] = useState<boolean>(false);
  const [showDataSources, setShowDataSources] = useState<boolean>(false);
  const [showReportModal, setShowReportModal] = useState<boolean>(false);

  const tb = t.transitionBridge;

  const availablePathways = useMemo<TransitionPathwayOption[]>(() => {
    const list: TransitionPathwayOption[] = [];
    if (transitionResult.recommendedPathway) list.push(transitionResult.recommendedPathway);
    if (transitionResult.conservativePathway) list.push(transitionResult.conservativePathway);
    if (transitionResult.alternativePathway) list.push(transitionResult.alternativePathway);
    return list;
  }, [transitionResult]);

  const activePathway = useMemo<TransitionPathwayOption | null>(() => {
    if (availablePathways.length === 0) return null;
    const match = availablePathways.find((p) => p.pathwayType === selectedPathwayType);
    return match || availablePathways[0];
  }, [availablePathways, selectedPathwayType]);

  const getCropName = (cropId: string): string => {
    const c = getGlobalRotationCropById(cropId);
    if (!c) return cropId;
    return language === 'ar' ? c.commonNameAr : language === 'fr' ? c.commonNameFr : c.commonNameEn;
  };

  const pickLang = <T,>(en: T, ar: T, fr: T): T =>
    language === 'ar' ? ar : language === 'fr' ? fr : en;

  const getSeasonSlotLabel = (slot: FarmingSeasonOption): string => {
    switch (slot) {
      case 'autumn_winter':
        return t.rotationAdvisor.seasonAutumnWinter;
      case 'spring':
        return t.rotationAdvisor.seasonSpring;
      case 'summer':
        return t.rotationAdvisor.seasonSummer;
      case 'perennial_year_round':
        return t.rotationAdvisor.seasonPerennial;
      default:
        return t.rotationAdvisor.seasonUnspecified;
    }
  };

  const getHemisphereLabel = (h: RotationTransitionResult['hemisphere']): string => {
    if (h === 'northern') return tb.hemisphereNorthern;
    if (h === 'southern') return tb.hemisphereSouthern;
    return tb.hemisphereEquatorial;
  };

  const getDifficultyLabel = (d: TransitionDifficulty): string =>
    d === 'low' ? tb.diffLow : d === 'moderate' ? tb.diffModerate : tb.diffHigh;

  const getWaterClassLabel = (w: 'low_moderate' | 'moderate' | 'high'): string =>
    w === 'low_moderate' ? tb.waterLowMod : w === 'moderate' ? tb.waterModerate : tb.waterHigh;

  const getWaterConcLabel = (
    w: RotationTransitionResult['baseline']['waterDemandConcentration']
  ): string => {
    switch (w) {
      case 'low_moderate':
        return tb.waterConcLowMod;
      case 'moderate':
        return tb.waterConcModerate;
      case 'high':
        return tb.waterConcHigh;
      case 'mixed':
        return tb.waterConcMixed;
      default:
        return tb.waterConcUnknown;
    }
  };

  const getResilienceFocusLabel = (focus: TransitionResilienceFocus): string => {
    switch (focus) {
      case 'water_conservation':
        return tb.focusWaterConservation;
      case 'soil_structure':
        return tb.focusSoilStructure;
      case 'nutrient_cycling':
        return tb.focusNutrientCycling;
      case 'forage_production':
        return tb.focusForageProduction;
      case 'financial_accessibility':
        return tb.focusFinancialAccessibility;
      case 'climate_resilience':
        return tb.focusClimateResilience;
    }
  };

  const getDimensionBadgeStyle = (badge: TransitionEvaluationBadge) => {
    if (badge === 'suitable') {
      return {
        label: tb.evalSuitable,
        cls: 'bg-emerald-50 text-emerald-900 border-emerald-300',
      };
    }
    if (badge === 'caution') {
      return {
        label: tb.evalCaution,
        cls: 'bg-amber-50 text-amber-900 border-amber-300',
      };
    }
    return {
      label: tb.evalInsufficientData,
      cls: 'bg-stone-100 text-stone-700 border-stone-300',
    };
  };

  const getSourceCategoryLabel = (cat: TransitionDataSourceEntry['category']): string => {
    switch (cat) {
      case 'measured_retrieved':
        return tb.catMeasuredRetrieved;
      case 'model_estimate':
        return tb.catModelEstimate;
      case 'calculated':
        return tb.catCalculated;
      case 'user_provided':
        return tb.catUserProvided;
      case 'missing':
        return tb.catMissing;
    }
  };

  const getConfidenceLabel = (c: TransitionPathwayOption['confidence']): string => {
    if (c === 'HIGH') return t.irrigation.confHigh;
    if (c === 'MODERATE') return t.irrigation.confMedium;
    return t.irrigation.confLow;
  };

  const interactiveDecisionCropIds = useMemo<string[]>(() => {
    const ids = new Set<string>();
    for (const p of availablePathways) {
      for (const s of p.cropSequence) {
        ids.add(s);
      }
    }
    for (const key of Object.keys(transitionState.cropDecisions || {})) {
      ids.add(key);
    }
    return Array.from(ids);
  }, [availablePathways, transitionState.cropDecisions]);

  const handleAddSequenceCrop = () => {
    if (!cropToAdd) return;
    onUpdateTransitionState((prev) => ({
      ...prev,
      currentSequence: [...prev.currentSequence, cropToAdd].slice(-6),
    }));
    setCropToAdd('');
  };

  const handleRemoveSequenceIndex = (idx: number) => {
    onUpdateTransitionState((prev) => ({
      ...prev,
      currentSequence: prev.currentSequence.filter((_, i) => i !== idx),
    }));
  };

  const handleSetCropDecision = (cropId: string, decision: FarmerCropDecisionState | null) => {
    onUpdateTransitionState((prev) => {
      const nextDecisions = { ...prev.cropDecisions };
      if (decision === null) {
        delete nextDecisions[cropId];
      } else {
        nextDecisions[cropId] = decision;
      }
      return {
        ...prev,
        cropDecisions: nextDecisions,
      };
    });
  };

  const handleResetDecisionsAndConstraints = () => {
    onUpdateTransitionState((prev) => ({
      ...prev,
      maxAcceptableCostTier: null,
      availableIrrigationMmPerSeason: null,
      unfamiliarCropsAllowed: null,
      observedSoilDegradationNote: '',
      cropDecisions: {},
      resilienceFocus: null,
    }));
  };

  const handleExportJson = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      parcel: {
        id: farm.id,
        name: farm.name,
        region: farm.region,
        province: farm.province,
        areaHa: farm.calculatedAreaHectares,
        centroid: farm.centroid,
      },
      farmerDecisionsAndConstraints: transitionState,
      previousCropResidue,
      primaryGoal,
      transitionResult,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `turba-rotation-transition-${farm.id || 'parcel'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const statusBadge = (() => {
    switch (transitionResult.status) {
      case 'PLANS_READY':
        return {
          text: tb.badgePlansReady,
          cls: 'bg-emerald-50 text-emerald-900 border-emerald-300',
        };
      case 'NO_FEASIBLE_TRANSITION':
        return {
          text: tb.badgeNoFeasible,
          cls: 'bg-rose-50 text-rose-900 border-rose-300',
        };
      case 'INVALID_SEQUENCE':
        return {
          text: tb.badgeInvalidSequence,
          cls: 'bg-amber-50 text-amber-900 border-amber-300',
        };
      default:
        return {
          text: tb.badgeInsufficientData,
          cls: 'bg-stone-100 text-stone-800 border-stone-300',
        };
    }
  })();

  const diseaseRisks = pickLang(
    transitionResult.baseline.diseaseAndPestRisksEn,
    transitionResult.baseline.diseaseAndPestRisksAr,
    transitionResult.baseline.diseaseAndPestRisksFr
  );
  const nutrientWeaknesses = pickLang(
    transitionResult.baseline.nutrientWeaknessesEn,
    transitionResult.baseline.nutrientWeaknessesAr,
    transitionResult.baseline.nutrientWeaknessesFr
  );
  const missingDiversity = pickLang(
    transitionResult.baseline.missingDiversityEn,
    transitionResult.baseline.missingDiversityAr,
    transitionResult.baseline.missingDiversityFr
  );
  const opportunities = pickLang(
    transitionResult.baseline.opportunitiesEn,
    transitionResult.baseline.opportunitiesAr,
    transitionResult.baseline.opportunitiesFr
  );
  const baselineMissingInfo = pickLang(
    transitionResult.baseline.missingInformationEn,
    transitionResult.baseline.missingInformationAr,
    transitionResult.baseline.missingInformationFr
  );
  const soilConditionNote = pickLang(
    transitionResult.baseline.soilConditionNoteEn,
    transitionResult.baseline.soilConditionNoteAr,
    transitionResult.baseline.soilConditionNoteFr
  );
  const blockingReasons = pickLang(
    transitionResult.blockingReasonsEn,
    transitionResult.blockingReasonsAr,
    transitionResult.blockingReasonsFr
  );
  const activeAssumptions = pickLang(
    transitionResult.assumptionsEn,
    transitionResult.assumptionsAr,
    transitionResult.assumptionsFr
  );

  // Baseline crops for timeline display
  const baselineSequenceProfiles = useMemo(
    () =>
      transitionState.currentSequence.map((cid) => ({
        cropId: cid,
        profile: getGlobalRotationCropById(cid),
      })),
    [transitionState.currentSequence]
  );

  // Last baseline crop family for step 1 family-transition indicator
  const lastBaselineCropProfile =
    baselineSequenceProfiles.length > 0
      ? baselineSequenceProfiles[baselineSequenceProfiles.length - 1].profile
      : null;

  return (
    <div className="rounded-xl bg-[#fbfaf6] border border-stone-200 p-4 space-y-5">
      {/* Section Header & Global Status */}
      <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-stone-200">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-900 text-stone-50 flex items-center justify-center shrink-0">
              <GitBranch className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-950">
              {tb.sectionTitle}
            </h4>
          </div>
          <p className="text-[11px] text-stone-600 leading-relaxed">{tb.sectionSubtitle}</p>
          <div className="text-[11px] text-stone-600 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono" dir="ltr">
            <span className="inline-flex items-center gap-1">
              <Compass className="w-3 h-3 text-emerald-800" />
              {tb.hemisphereLabel}{' '}
              <strong className="text-stone-900">{getHemisphereLabel(transitionResult.hemisphere)}</strong>
            </span>
            {transitionResult.activeCoordinates && (
              <span className="tabular-nums">
                · {transitionResult.activeCoordinates.lat.toFixed(2)}°, {transitionResult.activeCoordinates.lng.toFixed(2)}°
              </span>
            )}
          </div>
        </div>

        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-md border shrink-0 whitespace-nowrap ${statusBadge.cls}`}>
          {statusBadge.text}
        </span>
      </div>

      {/* =================================================================== */}
      {/* SECTION A: STRATEGY A — CURRENT ROTATION BASELINE & WEAKNESSES       */}
      {/* =================================================================== */}
      <div className="rounded-xl bg-white border border-stone-200 p-3.5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">
              {tb.strategyATag}
            </span>
            <h5 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-800" />
              <span>{tb.sectionATitle}</span>
            </h5>
          </div>

          {hasConfigSeedAvailable && onSeedSequenceFromConfig && (
            <button
              type="button"
              onClick={onSeedSequenceFromConfig}
              className="px-2.5 py-1 rounded-lg bg-stone-50 hover:bg-stone-100 border border-stone-200 text-[11px] font-semibold text-stone-700 flex items-center gap-1 whitespace-nowrap"
            >
              <RefreshCw className="w-3 h-3 text-emerald-800" />
              <span>{tb.seedFromConfigBtn}</span>
            </button>
          )}
        </div>

        {/* Visual Baseline Sequence Timeline + Quick Delete */}
        <div className="space-y-2">
          <span className="text-[11px] font-semibold text-stone-700 block">
            {tb.baselineTimelineTitle}
          </span>

          {baselineSequenceProfiles.length === 0 ? (
            <div className="p-3 rounded-lg bg-stone-50 border border-dashed border-stone-300 text-xs text-stone-600">
              {tb.emptySequenceHint}
            </div>
          ) : (
            <div className="flex flex-wrap items-stretch gap-2">
              {baselineSequenceProfiles.map(({ cropId, profile }, idx) => {
                const prevProfile = idx > 0 ? baselineSequenceProfiles[idx - 1].profile : null;
                const sameFamilyPrev = Boolean(prevProfile && profile && prevProfile.family === profile.family);

                return (
                  <React.Fragment key={`${cropId}-${idx}`}>
                    {idx > 0 && (
                      <div className="flex flex-col items-center justify-center px-0.5 text-[9.5px] font-mono">
                        <ArrowRight
                          className={`w-3.5 h-3.5 shrink-0 ${
                            sameFamilyPrev ? 'text-rose-700' : 'text-emerald-800'
                          } ${isRtl ? 'rotate-180' : ''}`}
                        />
                        {prevProfile && profile && (
                          <span className={sameFamilyPrev ? 'text-rose-800 font-bold' : 'text-emerald-800'}>
                            {sameFamilyPrev ? tb.sameFamilyRepeatLabel : tb.familyBreakLabel}
                          </span>
                        )}
                      </div>
                    )}
                    <div
                      className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border text-xs ${
                        sameFamilyPrev
                          ? 'bg-rose-50/40 border-rose-200'
                          : 'bg-[#fbfaf6] border-stone-200'
                      }`}
                    >
                      {profile && (
                        <BotanicalCropEmblem category={profile.category} cropId={cropId} />
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] text-stone-500">#{idx + 1}</span>
                          <span className="font-semibold text-stone-900">{getCropName(cropId)}</span>
                        </div>
                        {profile && (
                          <span className="text-[10px] text-stone-600 block font-mono" dir="ltr">
                            {profile.family} · {tb.rootDepthShort} {profile.coefficients.rootDepthMaxM.toFixed(2)}m
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveSequenceIndex(idx)}
                        className="text-stone-400 hover:text-rose-700 ms-1"
                        title={t.common.delete}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          )}

          {/* Add Crop to Sequence Control */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <select
              value={cropToAdd}
              onChange={(e) => setCropToAdd(e.target.value)}
              className="flex-1 min-w-[200px] rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-900 focus:border-emerald-700 focus:outline-none"
            >
              <option value="">{tb.addCropPlaceholder}</option>
              {GLOBAL_ROTATION_CROP_DATABASE.map((c) => (
                <option key={c.id} value={c.id}>
                  {language === 'ar' ? c.commonNameAr : language === 'fr' ? c.commonNameFr : c.commonNameEn} ({c.family})
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!cropToAdd}
              onClick={handleAddSequenceCrop}
              className="px-3 py-1.5 rounded-lg bg-emerald-900 hover:bg-emerald-950 disabled:bg-stone-300 text-white text-xs font-semibold flex items-center gap-1 shrink-0 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{tb.addToSequenceBtn}</span>
            </button>
          </div>
        </div>

        {/* Baseline Agronomic Weaknesses + Missing Information */}
        {transitionResult.baseline.validSequence && (
          <div className="pt-2.5 border-t border-stone-100 space-y-2.5 text-[11px]">
            <div className={`grid gap-3 ${isExpanded ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
              <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200 space-y-1.5">
                {transitionResult.baseline.repeatedFamilies.length > 0 && (
                  <div>
                    <span className="font-bold text-amber-900">{tb.repeatedFamiliesLabel} </span>
                    <span className="text-stone-800 font-mono tabular-nums">
                      {transitionResult.baseline.repeatedFamilies
                        .map((rf) => `${rf.family} (${rf.positions.join(', ')})`)
                        .join(' · ')}
                    </span>
                  </div>
                )}
                <div>
                  <span className="font-bold text-stone-800">{tb.waterConcentrationLabel} </span>
                  <span className="text-stone-700">
                    {getWaterConcLabel(transitionResult.baseline.waterDemandConcentration)}
                  </span>
                  <span className="text-stone-400 mx-1.5">·</span>
                  <span className="text-stone-700">
                    {transitionResult.baseline.rootDepthRepetition ? tb.rootRepetitionYes : tb.rootRepetitionNo}
                  </span>
                </div>
                <div>
                  <span className="font-bold text-stone-800">{tb.soilConditionLabel} </span>
                  <span className="text-stone-700">{soilConditionNote}</span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200 space-y-1.5">
                {diseaseRisks.length > 0 && (
                  <div>
                    <span className="font-bold text-rose-900 block">{tb.diseaseRisksLabel}</span>
                    <ul className="list-disc list-inside text-stone-700 space-y-0.5">
                      {diseaseRisks.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {nutrientWeaknesses.length > 0 && (
                  <div>
                    <span className="font-bold text-amber-900 block">{tb.nutrientWeaknessesLabel}</span>
                    <ul className="list-disc list-inside text-stone-700 space-y-0.5">
                      {nutrientWeaknesses.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {missingDiversity.length > 0 && (
                  <div>
                    <span className="font-bold text-stone-800 block">{tb.missingDiversityLabel}</span>
                    <span className="text-stone-700">{missingDiversity.join(' · ')}</span>
                  </div>
                )}
                {opportunities.length > 0 && (
                  <div>
                    <span className="font-bold text-emerald-900 block">{tb.opportunitiesLabel}</span>
                    <span className="text-stone-700">{opportunities.join(' · ')}</span>
                  </div>
                )}
              </div>
            </div>

            {baselineMissingInfo.length > 0 && (
              <div className="p-2.5 rounded-lg bg-amber-50/40 border border-amber-200/80 text-stone-700">
                <span className="font-bold text-amber-950 block mb-0.5">{tb.baselineMissingTitle}</span>
                <ul className="list-disc list-inside space-y-0.5">
                  {baselineMissingInfo.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Explicit Blocking / Insufficient / Infeasible Notice */}
      {transitionResult.status !== 'PLANS_READY' && (
        <div
          className={`p-3.5 rounded-xl border space-y-2 ${
            transitionResult.status === 'NO_FEASIBLE_TRANSITION'
              ? 'bg-rose-50/70 border-rose-300 text-rose-950'
              : transitionResult.status === 'INVALID_SEQUENCE'
              ? 'bg-amber-50/80 border-amber-300 text-amber-950'
              : 'bg-stone-100 border-stone-300 text-stone-900'
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-bold">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{statusBadge.text}</span>
          </div>
          {blockingReasons.length > 0 && (
            <div className="text-xs space-y-1">
              <span className="font-semibold block">{tb.blockingReasonsTitle}:</span>
              <ul className="list-disc list-inside space-y-0.5">
                {blockingReasons.map((reason, i) => (
                  <li key={i}>{reason}</li>
                ))}
              </ul>
            </div>
          )}
          {transitionResult.missingInformation.length > 0 && (
            <div className="pt-2 border-t border-stone-200/70 text-[11px] text-stone-700">
              <span className="font-bold block mb-0.5">{t.rotationAdvisor.missingInfoHeader}:</span>
              <span>{transitionResult.missingInformation.join(' · ')}</span>
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* SECTION B: TRANSITION BRIDGE TIMELINE                               */}
      {/* =================================================================== */}
      {activePathway && (
        <div ref={timelineRef} className="rounded-xl bg-white border border-stone-200 p-3.5 space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h5 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                <Sprout className="w-4 h-4 text-emerald-800" />
                <span>{tb.sectionBTitle}</span>
              </h5>
              <span className="text-[11px] font-medium text-emerald-900 block">
                {pickLang(activePathway.titleEn, activePathway.titleAr, activePathway.titleFr)}
              </span>
            </div>

            {/* Clean inline transition stage flow */}
            <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-wide text-stone-600">
              <span className="text-stone-700">{tb.stageCurrentSystem}</span>
              <ArrowRight className={`w-3 h-3 text-stone-400 ${isRtl ? 'rotate-180' : ''}`} />
              <span className="text-amber-900">{tb.stageTransition}</span>
              <ArrowRight className={`w-3 h-3 text-stone-400 ${isRtl ? 'rotate-180' : ''}`} />
              <span className="text-emerald-900">{tb.stageTargetSystem}</span>
            </div>
          </div>

          {/* Step Cards */}
          <div
            className={`grid gap-3 ${
              isExpanded
                ? activePathway.steps.length === 4
                  ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4'
                  : 'grid-cols-1 md:grid-cols-3'
                : 'grid-cols-1'
            }`}
          >
            {activePathway.steps.map((step, sIdx) => {
              const isTarget = sIdx === activePathway.steps.length - 1;
              const stageMarker = isTarget ? tb.stageTargetSystem : tb.stageTransition;
              const prevStepFamily =
                sIdx === 0
                  ? lastBaselineCropProfile?.family || null
                  : activePathway.steps[sIdx - 1].family;
              const familyChanged = prevStepFamily !== null && prevStepFamily !== step.family;

              const changeLabel =
                step.changeType === 'retained'
                  ? tb.changeRetained
                  : step.changeType === 'minor_adjustment'
                  ? tb.changeMinorAdjustment
                  : tb.changeNewIntroduction;

              const changeCls =
                step.changeType === 'retained'
                  ? 'bg-stone-100 text-stone-700 border-stone-200'
                  : step.changeType === 'minor_adjustment'
                  ? 'bg-amber-50 text-amber-900 border-amber-200'
                  : 'bg-emerald-50 text-emerald-900 border-emerald-200';

              const cropTitle = pickLang(step.commonNameEn, step.commonNameAr, step.commonNameFr);
              const reasonText = pickLang(step.reasonSelectedEn, step.reasonSelectedAr, step.reasonSelectedFr);
              const soilText = pickLang(
                step.soilHealthConsiderationsEn,
                step.soilHealthConsiderationsAr,
                step.soilHealthConsiderationsFr
              );
              const nText = pickLang(step.nitrogenExpectationEn, step.nitrogenExpectationAr, step.nitrogenExpectationFr);
              const benefitText = pickLang(
                step.mainAgronomicBenefitEn,
                step.mainAgronomicBenefitAr,
                step.mainAgronomicBenefitFr
              );
              const risks = pickLang(
                step.risksAndLimitationsEn,
                step.risksAndLimitationsAr,
                step.risksAndLimitationsFr
              );
              const actions = pickLang(
                step.requiredFarmerActionsEn,
                step.requiredFarmerActionsAr,
                step.requiredFarmerActionsFr
              );

              return (
                <div
                  key={`${step.seasonNumber}-${step.cropId}`}
                  className={`rounded-xl border p-3 flex flex-col justify-between space-y-2.5 ${
                    isTarget
                      ? 'bg-emerald-50/25 border-emerald-200'
                      : 'bg-[#fbfaf6] border-stone-200'
                  }`}
                >
                  <div className="space-y-2.5">
                    {/* Top Row: Season + Stage Label */}
                    <div className="flex items-center justify-between gap-2 text-[10px]">
                      <span className="font-mono font-bold text-stone-700">
                        {tb.seasonPrefix} {step.seasonNumber} · {getSeasonSlotLabel(step.seasonSlot)}
                      </span>
                      <span className="font-bold tracking-wider uppercase text-emerald-900">
                        {stageMarker}
                      </span>
                    </div>

                    {/* Crop Identity + SVG Emblem */}
                    <div className="flex items-start gap-2.5">
                      <BotanicalCropEmblem category={step.category} cropId={step.cropId} />
                      <div className="min-w-0 flex-1">
                        <h6 className="text-sm font-bold text-stone-900 leading-tight truncate">
                          {cropTitle}
                        </h6>
                        <p className="text-[11px] text-stone-500 italic truncate">
                          {step.scientificName} · {step.family}
                        </p>
                      </div>
                    </div>

                    {/* Botanical Family Transition Marker */}
                    {prevStepFamily && (
                      <div className="text-[10px] font-mono text-stone-600 flex items-center gap-1" dir="ltr">
                        <span>{prevStepFamily}</span>
                        <ArrowRight className="w-3 h-3 text-stone-400" />
                        <strong className={familyChanged ? 'text-emerald-900' : 'text-amber-800'}>
                          {step.family}
                        </strong>
                        <span>
                          ({familyChanged ? tb.familyBreakLabel : tb.sameFamilyRepeatLabel})
                        </span>
                      </div>
                    )}

                    {/* Change Type & Difficulty Metadata (max 1 badge) */}
                    <div className="flex flex-wrap items-center justify-between gap-1.5 text-[10px] pt-1 border-t border-stone-200/70">
                      <span className={`px-2 py-0.5 rounded border font-semibold ${changeCls}`}>
                        {changeLabel}
                      </span>
                      <span className="text-stone-600 font-mono tabular-nums">
                        {tb.difficultyLabel}: <strong className="text-stone-900">{getDifficultyLabel(step.transitionDifficulty)}</strong>
                      </span>
                    </div>

                    {/* Water & ETc hairline readout */}
                    <div className="py-1.5 px-2 rounded-lg bg-white border border-stone-200 text-[11px] flex flex-wrap items-center justify-between gap-1">
                      <span className="text-stone-600">
                        {tb.waterClassLabel}: <strong className="text-stone-900">{getWaterClassLabel(step.waterDemandClass)}</strong>
                      </span>
                      {step.estimatedWindowEtcMm !== null && (
                        <span className="font-mono tabular-nums text-sky-900" dir="ltr">
                          {tb.estEtcLabel}: <strong>{step.estimatedWindowEtcMm} mm</strong>
                        </span>
                      )}
                    </div>

                    {/* Explanations */}
                    <div className="space-y-1.5 text-[11px] leading-relaxed text-stone-700">
                      <div>
                        <span className="font-bold text-stone-900 block">{tb.reasonSelectedLabel}:</span>
                        <p>{reasonText}</p>
                      </div>
                      <div>
                        <span className="font-bold text-emerald-900 block">{tb.soilConsiderationLabel}:</span>
                        <p>{soilText}</p>
                      </div>
                      {nText && (
                        <div>
                          <span className="font-bold text-emerald-800 block">{tb.nitrogenNoteLabel}:</span>
                          <p>{nText}</p>
                        </div>
                      )}
                      <div>
                        <span className="font-bold text-stone-900 block">{tb.mainBenefitLabel}:</span>
                        <p>{benefitText}</p>
                      </div>
                    </div>
                  </div>

                  {/* Risks & Required Farmer Actions Footer */}
                  <div className="pt-2 border-t border-stone-200/80 space-y-1.5 text-[10.5px]">
                    {risks.length > 0 && (
                      <div>
                        <span className="font-bold text-amber-900 block">{tb.risksLimitsLabel}:</span>
                        <ul className="list-disc list-inside text-stone-600 space-y-0.5">
                          {risks.map((rk, rIdx) => (
                            <li key={rIdx}>{rk}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {actions.length > 0 && (
                      <div>
                        <span className="font-bold text-stone-800 block">{tb.farmerActionsLabel}:</span>
                        <ul className="list-disc list-inside text-stone-700 space-y-0.5">
                          {actions.map((act, aIdx) => (
                            <li key={aIdx}>{act}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* SECTION C: COMPARE TRANSITION STRATEGIES                            */}
      {/* =================================================================== */}
      {availablePathways.length > 0 && (
        <div className="rounded-xl bg-white border border-stone-200 p-3.5 space-y-3">
          <h5 className="text-xs font-bold text-stone-900">{tb.sectionCTitle}</h5>

          <div
            className={`grid gap-3 ${
              isExpanded ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1'
            }`}
          >
            {availablePathways.map((pathway) => {
              const isSelected = activePathway?.pathwayType === pathway.pathwayType;
              const modeLabel =
                pathway.pathwayType === 'recommended'
                  ? tb.pathwayRecommended
                  : pathway.pathwayType === 'conservative'
                  ? tb.pathwayConservative
                  : pathway.resilienceFocusUsed
                  ? `${tb.pathwayAlternative} · ${getResilienceFocusLabel(pathway.resilienceFocusUsed)}`
                  : tb.pathwayAlternative;

              const advantages = pickLang(
                pathway.mainAdvantagesEn,
                pathway.mainAdvantagesAr,
                pathway.mainAdvantagesFr
              );
              const limits = pickLang(
                pathway.economicOrOperationalLimitationsEn,
                pathway.economicOrOperationalLimitationsAr,
                pathway.economicOrOperationalLimitationsFr
              );
              const tradeOff = pickLang(
                pathway.tradeOffNoteEn,
                pathway.tradeOffNoteAr,
                pathway.tradeOffNoteFr
              );
              const waterDesc = pickLang(
                pathway.waterDemandAssessmentEn,
                pathway.waterDemandAssessmentAr,
                pathway.waterDemandAssessmentFr
              );

              return (
                <div
                  key={pathway.pathwayType}
                  className={`rounded-xl border p-3 flex flex-col justify-between space-y-2.5 transition-colors ${
                    isSelected
                      ? 'bg-emerald-50/35 border-emerald-800 ring-1 ring-emerald-800/20'
                      : 'bg-[#fbfaf6] border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-bold text-stone-900 leading-snug">{modeLabel}</span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded border shrink-0 whitespace-nowrap ${
                          pathway.confidence === 'HIGH'
                            ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                            : pathway.confidence === 'MODERATE'
                            ? 'bg-amber-50 text-amber-900 border-amber-300'
                            : 'bg-stone-100 text-stone-700 border-stone-300'
                        }`}
                      >
                        {getConfidenceLabel(pathway.confidence)}
                      </span>
                    </div>

                    {/* Sequence Arrow Summary with Family Labels */}
                    <div className="p-2 rounded-lg bg-white border border-stone-200 text-[11px] font-semibold text-stone-900 flex flex-wrap items-center gap-1">
                      {pathway.steps.map((st, idx) => (
                        <React.Fragment key={`${st.cropId}-${idx}`}>
                          {idx > 0 && (
                            <ArrowRight
                              className={`w-3 h-3 text-stone-400 shrink-0 ${isRtl ? 'rotate-180' : ''}`}
                            />
                          )}
                          <span>
                            {pickLang(st.commonNameEn, st.commonNameAr, st.commonNameFr)}{' '}
                            <span className="text-[9.5px] font-normal text-stone-500">({st.family})</span>
                          </span>
                        </React.Fragment>
                      ))}
                    </div>

                    {/* Key Metrics */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono tabular-nums">
                      <div className="py-1.5 px-2 rounded bg-white border border-stone-200">
                        <span className="text-[10px] text-stone-500 font-sans block">{tb.changesCountLabel}</span>
                        <strong className="text-sm text-stone-900">{pathway.changesFromCurrentCount}</strong>
                      </div>
                      <div className="py-1.5 px-2 rounded bg-white border border-stone-200">
                        <span className="text-[10px] text-stone-500 font-sans block">{tb.planningScoreLabel}</span>
                        <strong className="text-sm text-emerald-900" dir="ltr">
                          {pathway.compositePlanningScore} / 100
                        </strong>
                      </div>
                    </div>
                    <p className="text-[10px] text-stone-500 italic">{tb.planningScoreDisclaimer}</p>

                    <p className="text-[11px] text-stone-700">{waterDesc}</p>

                    <div className="text-[11px] space-y-1">
                      <span className="font-bold text-emerald-900 block">{tb.advantagesLabel}:</span>
                      <ul className="list-disc list-inside text-stone-700 space-y-0.5">
                        {advantages.slice(0, 3).map((adv, idx) => (
                          <li key={idx}>{adv}</li>
                        ))}
                      </ul>
                    </div>

                    {limits.length > 0 && (
                      <div className="text-[11px] space-y-1">
                        <span className="font-bold text-amber-900 block">{tb.limitationsLabel}:</span>
                        <ul className="list-disc list-inside text-stone-600 space-y-0.5">
                          {limits.slice(0, 2).map((lim, idx) => (
                            <li key={idx}>{lim}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="p-2 rounded bg-white border border-stone-200 text-[11px] text-stone-700">
                      <strong className="text-stone-900">{tb.tradeOffLabel}: </strong>
                      {tradeOff}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedPathwayType(pathway.pathwayType)}
                    className={`w-full py-1.5 px-3 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap ${
                      isSelected
                        ? 'bg-emerald-900 text-white border-emerald-900'
                        : 'bg-white hover:bg-stone-100 text-stone-800 border-stone-300'
                    }`}
                  >
                    {isSelected ? tb.selectedBadge : tb.selectPathwayBtn}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Explicit No Alternative Reason if absent */}
          {!transitionResult.alternativePathway &&
            (transitionResult.noAlternativeReasonEn ||
              transitionResult.noAlternativeReasonAr ||
              transitionResult.noAlternativeReasonFr) && (
              <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200 text-[11px] text-stone-600 flex items-center gap-2">
                <Info className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                <span>
                  {pickLang(
                    transitionResult.noAlternativeReasonEn,
                    transitionResult.noAlternativeReasonAr,
                    transitionResult.noAlternativeReasonFr
                  )}
                </span>
              </div>
            )}

          {/* Collapsible Dijkstra Criteria Breakdown */}
          {activePathway && (
            <div className="rounded-lg border border-stone-200 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowCriteriaBreakdown((v) => !v)}
                className="w-full px-3 py-2 bg-stone-50 hover:bg-stone-100 flex items-center justify-between text-[11px] font-semibold text-stone-800"
              >
                <span>{tb.criteriaBreakdownToggle}</span>
                {showCriteriaBreakdown ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
              {showCriteriaBreakdown && (
                <div className="p-3 bg-white grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-[11px] font-mono tabular-nums">
                  {[
                    {
                      label: tb.critAgronomic,
                      score: activePathway.criteriaBreakdown.agronomicCompatibility,
                      weight: transitionResult.weightsUsed.agronomicCompatibility,
                    },
                    {
                      label: tb.critSoil,
                      score: activePathway.criteriaBreakdown.soilHealthObjectives,
                      weight: transitionResult.weightsUsed.soilHealthObjectives,
                    },
                    {
                      label: tb.critWater,
                      score: activePathway.criteriaBreakdown.waterAvailability,
                      weight: transitionResult.weightsUsed.waterAvailability,
                    },
                    {
                      label: tb.critEconomic,
                      score: activePathway.criteriaBreakdown.economicFeasibility,
                      weight: transitionResult.weightsUsed.economicFeasibility,
                    },
                    {
                      label: tb.critMinimality,
                      score: activePathway.criteriaBreakdown.transitionMinimality,
                      weight: transitionResult.weightsUsed.transitionMinimality,
                    },
                    {
                      label: tb.critFarmerPref,
                      score: activePathway.criteriaBreakdown.farmerPreferences,
                      weight: transitionResult.weightsUsed.farmerPreferences,
                    },
                    {
                      label: tb.critSeasonal,
                      score: activePathway.criteriaBreakdown.seasonalFeasibility,
                      weight: transitionResult.weightsUsed.seasonalFeasibility,
                    },
                  ].map((item) => (
                    <div key={item.label} className="p-2 rounded bg-stone-50 border border-stone-200">
                      <span className="font-sans text-[10px] text-stone-600 block">{item.label}</span>
                      <div className="flex items-baseline justify-between mt-0.5" dir="ltr">
                        <strong className="text-stone-900">{item.score}/100</strong>
                        <span className="text-[10px] text-stone-500">
                          {tb.weightShort}: {Math.round(item.weight * 100)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* SECTION D: 8-AXIS STRATEGY EXPLAINABILITY & CUMULATIVE OUTCOMES      */}
      {/* =================================================================== */}
      {activePathway && (
        <div className="rounded-xl bg-white border border-stone-200 p-3.5 space-y-4">
          <h5 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4 text-emerald-800" />
            <span>{tb.sectionDTitle}</span>
          </h5>

          {/* 5 Dimension Evaluation Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px]">
            {[
              { label: tb.dimDiversity, val: activePathway.dimensionEvaluations.familyDiversity },
              { label: tb.dimSoilHealth, val: activePathway.dimensionEvaluations.soilHealth },
              { label: tb.dimWaterFit, val: activePathway.dimensionEvaluations.waterCompatibility },
              { label: tb.dimEconomicFit, val: activePathway.dimensionEvaluations.economicFeasibility },
              { label: tb.dimSeasonalFit, val: activePathway.dimensionEvaluations.seasonalCompatibility },
            ].map((dim) => {
              const st = getDimensionBadgeStyle(dim.val);
              return (
                <div key={dim.label} className="p-2 rounded-lg bg-[#fbfaf6] border border-stone-200 space-y-1">
                  <span className="text-[10px] text-stone-600 block">{dim.label}</span>
                  <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border ${st.cls}`}>
                    {st.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* 8 Complete Explainability Axes */}
          <div className="space-y-2.5">
            <span className="text-[11px] font-bold text-emerald-950 block">{tb.explain8Title}</span>
            <div className={`grid gap-2.5 text-[11px] ${isExpanded ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
              {/* 1. Why generated */}
              <div className="p-2.5 rounded-lg bg-[#fbfaf6] border border-stone-200 space-y-1">
                <span className="font-bold text-stone-900 block">{tb.exWhyGenerated}</span>
                <p className="text-stone-700 leading-relaxed">
                  {pickLang(
                    activePathway.whyGeneratedEn,
                    activePathway.whyGeneratedAr,
                    activePathway.whyGeneratedFr
                  )}
                </p>
              </div>

              {/* 2. Farmer priorities & constraints */}
              <div className="p-2.5 rounded-lg bg-[#fbfaf6] border border-stone-200 space-y-1">
                <span className="font-bold text-stone-900 block">{tb.exPrioritiesAddressed}</span>
                <ul className="list-disc list-inside text-stone-700 space-y-0.5">
                  {pickLang(
                    activePathway.prioritiesAddressedEn,
                    activePathway.prioritiesAddressedAr,
                    activePathway.prioritiesAddressedFr
                  ).map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>

              {/* 3. Environmental & agronomic drivers */}
              <div className="p-2.5 rounded-lg bg-[#fbfaf6] border border-stone-200 space-y-1">
                <span className="font-bold text-stone-900 block">{tb.exEnvDrivers}</span>
                <ul className="list-disc list-inside text-stone-700 space-y-0.5">
                  {pickLang(
                    activePathway.environmentalDriversEn,
                    activePathway.environmentalDriversAr,
                    activePathway.environmentalDriversFr
                  ).map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>

              {/* 4. Expected benefits */}
              <div className="p-2.5 rounded-lg bg-emerald-50/35 border border-emerald-200 space-y-1">
                <span className="font-bold text-emerald-950 block">{tb.exExpectedBenefits}</span>
                <ul className="list-disc list-inside text-stone-700 space-y-0.5">
                  {[
                    ...pickLang(
                      activePathway.mainAdvantagesEn,
                      activePathway.mainAdvantagesAr,
                      activePathway.mainAdvantagesFr
                    ),
                    ...pickLang(
                      activePathway.cumulativeOutcomes.qualitativeExpectationsEn,
                      activePathway.cumulativeOutcomes.qualitativeExpectationsAr,
                      activePathway.cumulativeOutcomes.qualitativeExpectationsFr
                    ),
                  ].map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>

              {/* 5. Risks, limitations & trade-offs */}
              <div className="p-2.5 rounded-lg bg-amber-50/35 border border-amber-200 space-y-1">
                <span className="font-bold text-amber-950 block">{tb.exRisksTradeoffs}</span>
                <ul className="list-disc list-inside text-stone-700 space-y-0.5">
                  {[
                    pickLang(
                      activePathway.tradeOffNoteEn,
                      activePathway.tradeOffNoteAr,
                      activePathway.tradeOffNoteFr
                    ),
                    ...pickLang(
                      activePathway.economicOrOperationalLimitationsEn,
                      activePathway.economicOrOperationalLimitationsAr,
                      activePathway.economicOrOperationalLimitationsFr
                    ),
                  ].map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>

              {/* 6. Required farmer actions & preparations */}
              <div className="p-2.5 rounded-lg bg-[#fbfaf6] border border-stone-200 space-y-1">
                <span className="font-bold text-stone-900 block">{tb.exFarmerActions}</span>
                <ul className="list-disc list-inside text-stone-700 space-y-0.5">
                  {pickLang(
                    activePathway.requiredFarmerActionsEn,
                    activePathway.requiredFarmerActionsAr,
                    activePathway.requiredFarmerActionsFr
                  ).map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>

              {/* 7. Data sources, resolution & explicit limitations */}
              <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200 space-y-1">
                <span className="font-bold text-stone-900 block">{tb.exSourcesLimits}</span>
                <p className="text-stone-700 leading-relaxed">
                  {pickLang(
                    activePathway.dataLimitationNoticeEn,
                    activePathway.dataLimitationNoticeAr,
                    activePathway.dataLimitationNoticeFr
                  )}
                </p>
              </div>

              {/* 8. Missing information & confidence level */}
              <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-stone-900">{tb.exMissingConfidence}</span>
                  <span className="font-mono text-[10px] font-bold text-emerald-950">
                    {getConfidenceLabel(activePathway.confidence)}
                  </span>
                </div>
                <ul className="list-disc list-inside text-stone-700 space-y-0.5">
                  {[
                    ...pickLang(
                      activePathway.missingInformationEn,
                      activePathway.missingInformationAr,
                      activePathway.missingInformationFr
                    ),
                    ...pickLang(
                      activePathway.confidenceReasonsEn,
                      activePathway.confidenceReasonsAr,
                      activePathway.confidenceReasonsFr
                    ),
                  ].map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Structured Agronomic Decision Q&A */}
          <div className={`grid gap-2.5 text-xs pt-2 border-t border-stone-100 ${isExpanded ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
            <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200 space-y-1">
              <span className="font-bold text-stone-900 block">{tb.qaWhyChange}</span>
              <p className="text-[11px] text-stone-700 leading-relaxed">
                {pickLang(
                  activePathway.explanationSummary.whyChangeEn,
                  activePathway.explanationSummary.whyChangeAr,
                  activePathway.explanationSummary.whyChangeFr
                )}
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200 space-y-1">
              <span className="font-bold text-stone-900 block">{tb.qaWhatPreserved}</span>
              <p className="text-[11px] text-stone-700 leading-relaxed">
                {pickLang(
                  activePathway.explanationSummary.whatPreservedEn,
                  activePathway.explanationSummary.whatPreservedAr,
                  activePathway.explanationSummary.whatPreservedFr
                )}
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200 space-y-1">
              <span className="font-bold text-emerald-900 block">{tb.qaRisksReduced}</span>
              <p className="text-[11px] text-stone-700 leading-relaxed">
                {pickLang(
                  activePathway.explanationSummary.risksReducedEn,
                  activePathway.explanationSummary.risksReducedAr,
                  activePathway.explanationSummary.risksReducedFr
                )}
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200 space-y-1">
              <span className="font-bold text-stone-900 block">{tb.qaIfRejected}</span>
              <p className="text-[11px] text-stone-700 leading-relaxed">
                {pickLang(
                  activePathway.explanationSummary.whatIfRejectedEn,
                  activePathway.explanationSummary.whatIfRejectedAr,
                  activePathway.explanationSummary.whatIfRejectedFr
                )}
              </p>
            </div>
          </div>

          {/* Cumulative Outcomes: Strictly Separated Quantified vs Qualitative vs Unverified */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-stone-800 block">{tb.cumulativeTitle}</span>
            <div className={`grid gap-2.5 text-[11px] ${isExpanded ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1'}`}>
              <div className="p-2.5 rounded-lg bg-sky-50/40 border border-sky-200 space-y-1">
                <span className="font-bold text-sky-900 block">{tb.cumQuantified}</span>
                <ul className="list-disc list-inside text-stone-700 space-y-0.5">
                  {pickLang(
                    activePathway.cumulativeOutcomes.quantifiedCalculationsEn,
                    activePathway.cumulativeOutcomes.quantifiedCalculationsAr,
                    activePathway.cumulativeOutcomes.quantifiedCalculationsFr
                  ).map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="p-2.5 rounded-lg bg-emerald-50/40 border border-emerald-200 space-y-1">
                <span className="font-bold text-emerald-900 block">{tb.cumQualitative}</span>
                <ul className="list-disc list-inside text-stone-700 space-y-0.5">
                  {pickLang(
                    activePathway.cumulativeOutcomes.qualitativeExpectationsEn,
                    activePathway.cumulativeOutcomes.qualitativeExpectationsAr,
                    activePathway.cumulativeOutcomes.qualitativeExpectationsFr
                  ).map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-300 space-y-1">
                <span className="font-bold text-stone-800 block">{tb.cumUnverified}</span>
                <ul className="list-disc list-inside text-stone-600 space-y-0.5">
                  {pickLang(
                    activePathway.cumulativeOutcomes.unverifiedFutureOutcomesEn,
                    activePathway.cumulativeOutcomes.unverifiedFutureOutcomesAr,
                    activePathway.cumulativeOutcomes.unverifiedFutureOutcomesFr
                  ).map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Data Sources & Epistemic Provenance Accordion */}
          <div className="rounded-lg border border-stone-200 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowDataSources((v) => !v)}
              className="w-full px-3 py-2 bg-stone-50 hover:bg-stone-100 flex items-center justify-between text-[11px] font-semibold text-stone-800"
            >
              <span className="flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-emerald-800" />
                <span>{tb.dataSourcesTitle} ({transitionResult.dataSourcesUsed.length})</span>
              </span>
              {showDataSources ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {showDataSources && (
              <div className="p-3 bg-white space-y-2 text-[11px]">
                {transitionResult.dataSourcesUsed.map((ds, i) => (
                  <div key={i} className="p-2 rounded bg-stone-50 border border-stone-200 space-y-0.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <strong className="text-stone-900">{ds.source}</strong>
                      <span className="text-[10px] font-mono text-stone-600">
                        {getSourceCategoryLabel(ds.category)} · {ds.retrievalDate}
                      </span>
                    </div>
                    <p className="text-stone-700">{ds.detail}</p>
                    <span className="text-[10px] text-stone-500 block font-mono">
                      {ds.spatialResolution} · {ds.temporalCoverage} · {ds.unit}
                    </span>
                  </div>
                ))}
                <div className="pt-1 text-stone-600">
                  <span className="font-bold text-stone-800 block">{tb.assumptionsTitle}:</span>
                  <ul className="list-disc list-inside space-y-0.5">
                    {activeAssumptions.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* SECTION E: DIRECT FARMER DECISION & INTERACTIVE CONSTRAINTS         */}
      {/* =================================================================== */}
      <div className="rounded-xl bg-white border border-stone-200 p-3.5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h5 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-800" />
            <span>{tb.sectionETitle}</span>
          </h5>
          <button
            type="button"
            onClick={handleResetDecisionsAndConstraints}
            className="px-2.5 py-1 rounded-lg bg-stone-50 hover:bg-stone-100 border border-stone-200 text-[11px] font-semibold text-stone-700 flex items-center gap-1 whitespace-nowrap"
          >
            <RotateCcw className="w-3 h-3" />
            <span>{tb.resetDecisionsBtn}</span>
          </button>
        </div>

        {/* Constraints Grid */}
        <div className={`grid gap-2.5 text-xs ${isExpanded ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
          {/* Planning Horizon (3 or 4 Seasons) */}
          <div>
            <label className="block font-semibold text-stone-700 mb-1">{tb.horizonLabel}</label>
            <div className="grid grid-cols-2 gap-1.5">
              {[3, 4].map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() =>
                    onUpdateTransitionState((prev) => ({
                      ...prev,
                      horizonSeasons: h as 3 | 4,
                    }))
                  }
                  className={`py-1.5 px-2 rounded-lg border text-xs font-semibold whitespace-nowrap ${
                    transitionState.horizonSeasons === h
                      ? 'bg-emerald-900 text-white border-emerald-900'
                      : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  {h === 3 ? tb.seasons3 : tb.seasons4}
                </button>
              ))}
            </div>
          </div>

          {/* Primary Farming Objective */}
          <div>
            <label className="block font-semibold text-stone-700 mb-1">{tb.primaryObjectiveLabel}</label>
            <select
              value={primaryGoal ?? ''}
              onChange={(e) =>
                onUpdatePrimaryGoal(
                  e.target.value === '' ? null : (e.target.value as PrimaryFarmingGoal)
                )
              }
              className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-900 focus:border-emerald-700 focus:outline-none"
            >
              <option value="">{t.rotationAdvisor.goalUnspecified}</option>
              <option value="soil_regeneration">{t.rotationAdvisor.goalSoilRegeneration}</option>
              <option value="water_conservation">{t.rotationAdvisor.goalWaterConservation}</option>
              <option value="food_security">{t.rotationAdvisor.goalFoodSecurity}</option>
              <option value="commercial_profit">{t.rotationAdvisor.goalCommercialProfit}</option>
            </select>
          </div>

          {/* Alternative Strategy C Resilience Focus */}
          <div>
            <label className="block font-semibold text-stone-700 mb-1">{tb.resilienceFocusLabel}</label>
            <select
              value={transitionState.resilienceFocus ?? ''}
              onChange={(e) =>
                onUpdateTransitionState((prev) => ({
                  ...prev,
                  resilienceFocus:
                    e.target.value === '' ? null : (e.target.value as TransitionResilienceFocus),
                }))
              }
              className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-900 focus:border-emerald-700 focus:outline-none"
            >
              <option value="">{tb.focusAuto}</option>
              <option value="water_conservation">{tb.focusWaterConservation}</option>
              <option value="soil_structure">{tb.focusSoilStructure}</option>
              <option value="nutrient_cycling">{tb.focusNutrientCycling}</option>
              <option value="forage_production">{tb.focusForageProduction}</option>
              <option value="financial_accessibility">{tb.focusFinancialAccessibility}</option>
              <option value="climate_resilience">{tb.focusClimateResilience}</option>
            </select>
          </div>

          {/* Crop Residue Handling */}
          <div>
            <label className="block font-semibold text-stone-700 mb-1">{tb.residueHandlingLabel}</label>
            <select
              value={previousCropResidue}
              onChange={(e) => onUpdateResidueManagement(e.target.value as CropResidueManagement)}
              className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-900 focus:border-emerald-700 focus:outline-none"
            >
              <option value="unknown">{t.rotationAdvisor.residueUnknown}</option>
              <option value="incorporated">{t.rotationAdvisor.residueIncorporated}</option>
              <option value="removed">{t.rotationAdvisor.residueRemoved}</option>
              <option value="grazed">{t.rotationAdvisor.residueGrazed}</option>
            </select>
          </div>

          {/* Max Cost Tier */}
          <div>
            <label className="block font-semibold text-stone-700 mb-1">{tb.maxCostTierLabel}</label>
            <select
              value={transitionState.maxAcceptableCostTier ?? ''}
              onChange={(e) =>
                onUpdateTransitionState((prev) => ({
                  ...prev,
                  maxAcceptableCostTier:
                    e.target.value === ''
                      ? null
                      : (e.target.value as 'low' | 'moderate' | 'high'),
                }))
              }
              className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-900 focus:border-emerald-700 focus:outline-none"
            >
              <option value="">{tb.costAuto}</option>
              <option value="low">{tb.costLow}</option>
              <option value="moderate">{tb.costModerate}</option>
              <option value="high">{tb.costHigh}</option>
            </select>
          </div>

          {/* Seasonal Irrigation Quota */}
          <div>
            <label className="block font-semibold text-stone-700 mb-1">{tb.irrigationQuotaLabel}</label>
            <input
              type="number"
              min="0"
              max="2500"
              step="10"
              placeholder={tb.irrigationQuotaPlaceholder}
              value={transitionState.availableIrrigationMmPerSeason ?? ''}
              onChange={(e) => {
                const v = e.target.value === '' ? null : Number(e.target.value);
                onUpdateTransitionState((prev) => ({
                  ...prev,
                  availableIrrigationMmPerSeason:
                    v !== null && Number.isFinite(v) && v >= 0 ? v : null,
                }));
              }}
              className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-mono tabular-nums text-stone-900 focus:border-emerald-700 focus:outline-none"
            />
          </div>

          {/* Unfamiliar Crops Toggle */}
          <div>
            <label className="block font-semibold text-stone-700 mb-1">{tb.unfamiliarCropsLabel}</label>
            <select
              value={
                transitionState.unfamiliarCropsAllowed === null
                  ? 'auto'
                  : transitionState.unfamiliarCropsAllowed
                  ? 'yes'
                  : 'no'
              }
              onChange={(e) =>
                onUpdateTransitionState((prev) => ({
                  ...prev,
                  unfamiliarCropsAllowed:
                    e.target.value === 'auto' ? null : e.target.value === 'yes',
                }))
              }
              className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-900 focus:border-emerald-700 focus:outline-none"
            >
              <option value="auto">{tb.unfamiliarAuto}</option>
              <option value="yes">{tb.unfamiliarYes}</option>
              <option value="no">{tb.unfamiliarNo}</option>
            </select>
          </div>

          {/* Field Soil Observation Note */}
          <div className={isExpanded ? 'md:col-span-2' : 'sm:col-span-2'}>
            <label className="block font-semibold text-stone-700 mb-1">{tb.soilObservationLabel}</label>
            <input
              type="text"
              maxLength={200}
              placeholder={tb.soilObservationPlaceholder}
              value={transitionState.observedSoilDegradationNote}
              onChange={(e) =>
                onUpdateTransitionState((prev) => ({
                  ...prev,
                  observedSoilDegradationNote: e.target.value,
                }))
              }
              className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-900 focus:border-emerald-700 focus:outline-none"
            />
          </div>
        </div>

        {/* Interactive Per-Crop Decision Controls */}
        {interactiveDecisionCropIds.length > 0 && (
          <div className="pt-2 border-t border-stone-100 space-y-2">
            <span className="text-[11px] font-bold text-stone-800 block">
              {tb.perCropDecisionsLabel}
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {interactiveDecisionCropIds.map((cid) => {
                const state = transitionState.cropDecisions[cid];
                return (
                  <div
                    key={cid}
                    className="p-2 rounded-lg bg-[#fbfaf6] border border-stone-200 flex flex-wrap items-center justify-between gap-2 text-xs"
                  >
                    <span className="font-semibold text-stone-900">{getCropName(cid)}</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          handleSetCropDecision(cid, state === 'accepted' ? null : 'accepted')
                        }
                        className={`px-2 py-0.5 rounded border text-[10.5px] font-semibold flex items-center gap-0.5 whitespace-nowrap ${
                          state === 'accepted'
                            ? 'bg-emerald-900 text-white border-emerald-900'
                            : 'bg-white text-stone-700 border-stone-300 hover:bg-emerald-50'
                        }`}
                      >
                        <Check className="w-3 h-3" />
                        <span>{tb.decisionAccept}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleSetCropDecision(cid, state === 'rejected' ? null : 'rejected')
                        }
                        className={`px-2 py-0.5 rounded border text-[10.5px] font-semibold flex items-center gap-0.5 whitespace-nowrap ${
                          state === 'rejected'
                            ? 'bg-rose-800 text-white border-rose-800'
                            : 'bg-white text-stone-700 border-stone-300 hover:bg-rose-50'
                        }`}
                      >
                        <X className="w-3 h-3" />
                        <span>{tb.decisionReject}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleSetCropDecision(
                            cid,
                            state === 'unavailable' ? null : 'unavailable'
                          )
                        }
                        className={`px-2 py-0.5 rounded border text-[10.5px] font-semibold flex items-center gap-0.5 whitespace-nowrap ${
                          state === 'unavailable'
                            ? 'bg-amber-800 text-white border-amber-800'
                            : 'bg-white text-stone-700 border-stone-300 hover:bg-amber-50'
                        }`}
                      >
                        <Ban className="w-3 h-3" />
                        <span>{tb.decisionUnavailable}</span>
                      </button>
                      {state && (
                        <button
                          type="button"
                          onClick={() => handleSetCropDecision(cid, null)}
                          className="px-1.5 py-0.5 text-[10px] text-stone-500 hover:text-stone-900 whitespace-nowrap"
                        >
                          {tb.decisionClear}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recalculate CTA + Section F Printable Report Bar */}
        <div className="pt-2 border-t border-stone-200 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              onUpdateTransitionState((prev) => ({ ...prev }));
              timelineRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            className="px-3 py-1.5 rounded-lg bg-emerald-900 hover:bg-emerald-950 text-white text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{tb.recalculateBtn}</span>
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportJson}
              className="px-3 py-1.5 rounded-lg bg-stone-50 hover:bg-stone-100 border border-stone-200 text-xs font-semibold text-stone-700 flex items-center gap-1.5 whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5 text-stone-600" />
              <span>{tb.exportJsonBtn}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowReportModal(true)}
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-stone-50 border border-emerald-800 text-xs font-semibold text-emerald-900 flex items-center gap-1.5 whitespace-nowrap"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{tb.openReportBtn}</span>
            </button>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* SECTION F: PRINTABLE TRANSITION REPORT PORTAL MODAL (z-[9999])      */}
      {/* =================================================================== */}
      {showReportModal &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto print:bg-white print:p-0"
            dir={isRtl ? 'rtl' : 'ltr'}
          >
            <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white border border-stone-200 shadow-2xl p-5 sm:p-7 space-y-5 print:max-h-none print:shadow-none print:border-0 print:rounded-none">
              <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-stone-200">
                <div>
                  <h3 className="text-base font-bold text-emerald-950">{tb.reportModalTitle}</h3>
                  <p className="text-xs text-stone-600">{tb.reportModalSubtitle}</p>
                </div>
                <div className="flex items-center gap-2 print:hidden">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-3 py-1.5 rounded-lg bg-emerald-900 hover:bg-emerald-950 text-white text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>{tb.printReportBtn}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowReportModal(false)}
                    className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold whitespace-nowrap"
                  >
                    {t.common.close}
                  </button>
                </div>
              </div>

              {/* 1. Parcel Summary */}
              <div className="p-3.5 rounded-xl bg-[#fbfaf6] border border-stone-200 space-y-1 text-xs">
                <h4 className="font-bold text-stone-900">{tb.reportParcelSummary}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[11px] text-stone-700 pt-1">
                  <div>
                    <span className="font-sans text-stone-500 block">{t.profileModal.parcelName}</span>
                    <strong className="font-sans text-stone-900">{farm.name}</strong>
                  </div>
                  <div>
                    <span className="font-sans text-stone-500 block">{t.profileModal.centroidCoordinates}</span>
                    <strong dir="ltr">
                      {farm.centroid.lat.toFixed(4)}°, {farm.centroid.lng.toFixed(4)}° ({getHemisphereLabel(transitionResult.hemisphere)})
                    </strong>
                  </div>
                  <div>
                    <span className="font-sans text-stone-500 block">{t.profileModal.geodesicAreaSummary}</span>
                    <strong dir="ltr">{farm.calculatedAreaHectares.toFixed(2)} ha</strong>
                  </div>
                </div>
              </div>

              {/* 2. Baseline Diagnosis */}
              <div className="space-y-1.5 text-xs">
                <h4 className="font-bold text-stone-900">{tb.sectionATitle}</h4>
                <p className="text-stone-700">
                  {transitionState.currentSequence.map(getCropName).join(' → ') || tb.emptySequenceHint}
                </p>
                <p className="text-[11px] text-stone-600">{soilConditionNote}</p>
              </div>

              {/* 3. Selected Transition Timeline Table */}
              {activePathway ? (
                <div className="space-y-2 text-xs">
                  <h4 className="font-bold text-emerald-950">
                    {pickLang(activePathway.titleEn, activePathway.titleAr, activePathway.titleFr)}
                  </h4>
                  <p className="text-[11px] text-stone-700">
                    {pickLang(
                      activePathway.whyGeneratedEn,
                      activePathway.whyGeneratedAr,
                      activePathway.whyGeneratedFr
                    )}
                  </p>
                  <div className="overflow-x-auto border border-stone-200 rounded-xl">
                    <table className="w-full text-start text-[11px]">
                      <thead className="bg-stone-50 border-b border-stone-200 text-stone-700">
                        <tr>
                          <th className="p-2 text-start">{tb.seasonPrefix}</th>
                          <th className="p-2 text-start">{t.rotationAdvisor.currentCropNote}</th>
                          <th className="p-2 text-start">{tb.estEtcLabel}</th>
                          <th className="p-2 text-start">{tb.reasonSelectedLabel}</th>
                          <th className="p-2 text-start">{tb.farmerActionsLabel}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-200">
                        {activePathway.steps.map((s) => (
                          <tr key={s.seasonNumber}>
                            <td className="p-2 font-mono whitespace-nowrap">
                              #{s.seasonNumber} · {getSeasonSlotLabel(s.seasonSlot)}
                            </td>
                            <td className="p-2">
                              <strong className="text-stone-900 block">
                                {pickLang(s.commonNameEn, s.commonNameAr, s.commonNameFr)}
                              </strong>
                              <span className="text-stone-500 italic">{s.family}</span>
                            </td>
                            <td className="p-2 font-mono tabular-nums" dir="ltr">
                              {s.estimatedWindowEtcMm !== null ? `${s.estimatedWindowEtcMm} mm` : '—'}
                            </td>
                            <td className="p-2 text-stone-700">
                              {pickLang(s.reasonSelectedEn, s.reasonSelectedAr, s.reasonSelectedFr)}
                            </td>
                            <td className="p-2 text-stone-700">
                              {pickLang(
                                s.requiredFarmerActionsEn,
                                s.requiredFarmerActionsAr,
                                s.requiredFarmerActionsFr
                              ).join('; ')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-stone-50 border border-stone-200 text-xs text-stone-700">
                  {blockingReasons.join(' · ')}
                </div>
              )}

              {/* 4. Evidence Provenance & Missing Data */}
              <div className="space-y-1.5 text-xs">
                <h4 className="font-bold text-stone-900">{tb.dataSourcesTitle}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  {transitionResult.dataSourcesUsed.map((ds, i) => (
                    <div key={i} className="p-2 rounded bg-stone-50 border border-stone-200">
                      <strong className="text-stone-900 block">{ds.source}</strong>
                      <span className="font-mono text-[10px] text-stone-500 block">
                        {getSourceCategoryLabel(ds.category)} · {ds.retrievalDate}
                      </span>
                      <span className="text-stone-700">{ds.detail}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 5. Confidence & Limitations */}
              {activePathway && (
                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 space-y-1 text-[11px]">
                  <h4 className="font-bold text-stone-900 text-xs">{tb.reportConfidenceLimitations}</h4>
                  <p className="text-stone-700">
                    <CheckCircle2 className="w-3.5 h-3.5 inline-block text-emerald-800 me-1" />
                    {t.irrigation.confidenceLabel} <strong>{getConfidenceLabel(activePathway.confidence)}</strong> —{' '}
                    {pickLang(
                      activePathway.confidenceReasonsEn,
                      activePathway.confidenceReasonsAr,
                      activePathway.confidenceReasonsFr
                    ).join(' · ')}
                  </p>
                  <p className="text-stone-600">
                    {pickLang(
                      activePathway.dataLimitationNoticeEn,
                      activePathway.dataLimitationNoticeAr,
                      activePathway.dataLimitationNoticeFr
                    )}
                  </p>
                  <p className="text-stone-600">{tb.planningScoreDisclaimer}</p>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
