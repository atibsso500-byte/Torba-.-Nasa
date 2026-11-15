/**
 * TURBA — THE LIVING LAND MEMORY (ذاكرة الأرض)
 * Land Futures Comparison & Deterministic Evidence Learning View (View 4)
 *
 * Displays:
 * - Deterministic rule-based learning context (NOT ML/AI claims)
 * - Remembered crop sequence & repeated family pathogen conflicts
 * - Recurring water shortage signals & missing records
 * - Recommendation Delta: how the latest recommendation shifted & what triggered it
 * - Path A (Current Practice) vs Path B (Gradual Transition) vs Path C (Alternative Resilience)
 * - Explicit Hard Constraints vs Weighted Preferences & Local Verification Conditions
 */

import React, { useMemo } from 'react';
import { getGlobalRotationCropById } from '../../data/crops';
import { useTranslation } from '../../i18n/language';
import {
  FarmRecord,
  NasaGpmObservation,
  NasaPowerObservation,
} from '../../types/farm';
import {
  FarmerContextProfile,
  PersistedTransitionState,
  SoilHydraulicResult,
  WeatherSeriesResult,
} from '../../types/irrigation';
import { generateLandFuturesAssessment } from '../../services/memory/futures';
import {
  FieldMemory,
  RecommendationSnapshot,
  ReportedOutcomeRecord,
  SeasonRecord,
} from '../../services/memory/types';
import {
  AlertTriangle,
  ArrowRightLeft,
  CheckCircle2,
  Compass,
  Droplets,
  GitBranch,
  Info,
  ShieldCheck,
} from 'lucide-react';

interface LandFuturesComparisonProps {
  farm: FarmRecord;
  fieldMemory: FieldMemory;
  seasons: SeasonRecord[];
  recommendations: RecommendationSnapshot[];
  outcomes: ReportedOutcomeRecord[];
  nasaPower: NasaPowerObservation | null;
  nasaGpm: NasaGpmObservation | null;
  weather: WeatherSeriesResult | null;
  soil: SoilHydraulicResult | null;
  farmerContext: FarmerContextProfile;
  transitionState: PersistedTransitionState;
  isLoadingEnv: boolean;
}

export const LandFuturesComparison: React.FC<LandFuturesComparisonProps> = ({
  farm,
  fieldMemory,
  seasons,
  recommendations,
  outcomes,
  nasaPower,
  nasaGpm,
  weather,
  soil,
  farmerContext,
  transitionState,
  isLoadingEnv,
}) => {
  const { t, language } = useTranslation();

  const assessment = useMemo(() => {
    return generateLandFuturesAssessment({
      fieldMemory,
      seasons,
      recommendations,
      outcomes,
      climate: {
        nasaPower,
        nasaGpm,
        historicalMeteoDays: weather?.historicalDaily,
        elevationM: weather?.elevationM ?? null,
      },
      soil,
      farmerContext,
      transitionState,
    });
  }, [
    fieldMemory,
    seasons,
    recommendations,
    outcomes,
    nasaPower,
    nasaGpm,
    weather,
    soil,
    farmerContext,
    transitionState,
  ]);

  const cropLabel = (cropId: string): string => {
    const c = getGlobalRotationCropById(cropId);
    if (!c) return cropId;
    return language === 'ar'
      ? c.commonNameAr
      : language === 'fr'
      ? c.commonNameFr
      : c.commonNameEn;
  };

  const lc = assessment.learningContext;
  const plan = assessment.transitionPlan;

  const missingBlocking =
    language === 'ar'
      ? lc.missingRecordsBlockingReliabilityAr
      : language === 'fr'
      ? lc.missingRecordsBlockingReliabilityFr
      : lc.missingRecordsBlockingReliabilityEn;

  const waterWarning =
    language === 'ar'
      ? lc.waterShortageWarningAr
      : language === 'fr'
      ? lc.waterShortageWarningFr
      : lc.waterShortageWarningEn;

  const deltaText =
    language === 'ar'
      ? lc.recommendationDelta.deltaSummaryAr
      : language === 'fr'
      ? lc.recommendationDelta.deltaSummaryFr
      : lc.recommendationDelta.deltaSummaryEn;

  const triggers =
    language === 'ar'
      ? lc.recommendationDelta.triggeringNewInformationAr
      : language === 'fr'
      ? lc.recommendationDelta.triggeringNewInformationFr
      : lc.recommendationDelta.triggeringNewInformationEn;

  return (
    <div className="space-y-4 text-xs">
      {/* Header & Deterministic Methodology Disclosure */}
      <div className="p-3.5 rounded-xl bg-white border border-stone-200 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
            <Compass className="w-4 h-4 text-emerald-700" />
            <span>{t.landMemory.futuresTitle}</span>
          </h4>
          {isLoadingEnv && (
            <span className="text-[10px] font-mono text-emerald-700">{t.common.loading}</span>
          )}
        </div>
        <p className="text-stone-600">{t.landMemory.futuresSubtitle}</p>
        <div className="p-2.5 rounded-lg bg-sky-50/70 border border-sky-200 text-[11px] text-sky-950 flex items-start gap-2">
          <Info className="w-3.5 h-3.5 text-sky-700 mt-0.5 shrink-0" />
          <div>
            <span className="font-bold block">{t.landMemory.deterministicNoticeTitle}</span>
            <span>
              {language === 'ar'
                ? lc.methodologyNoteAr
                : language === 'fr'
                ? lc.methodologyNoteFr
                : lc.methodologyNoteEn}
            </span>
          </div>
        </div>
      </div>

      {/* Deterministic Learning Context Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div className="p-3 rounded-xl bg-white border border-stone-200 space-y-1">
          <span className="text-[11px] text-stone-500 block">
            {t.landMemory.rememberedSequenceLabel}
          </span>
          <span className="font-bold text-stone-900 block">
            {lc.rememberedSequenceCropIds.length > 0
              ? lc.rememberedSequenceCropIds.map(cropLabel).join(' → ')
              : t.common.notAvailable}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-white border border-stone-200 space-y-1">
          <span className="text-[11px] text-stone-500 block">
            {t.landMemory.familyConflictsLabel}
          </span>
          <span className="font-bold font-mono text-stone-900 tabular-nums block">
            {lc.detectedRepeatedFamilyConflicts.length > 0
              ? lc.detectedRepeatedFamilyConflicts.map((c) => c.family).join(', ')
              : '0'}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-white border border-stone-200 space-y-1">
          <span className="text-[11px] text-stone-500 block">
            {t.landMemory.waterShortagesLoggedLabel}
          </span>
          <span className="font-bold font-mono text-stone-900 tabular-nums block">
            {lc.recurringWaterShortageCount}
          </span>
        </div>
      </div>

      {waterWarning && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 flex items-start gap-2">
          <Droplets className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
          <span>{waterWarning}</span>
        </div>
      )}

      {/* Recommendation Change Delta */}
      <div className="p-3.5 rounded-xl bg-white border border-stone-200 space-y-2">
        <h5 className="font-bold text-stone-900 flex items-center gap-1.5">
          <ArrowRightLeft className="w-3.5 h-3.5 text-sky-700" />
          <span>{t.landMemory.recDeltaTitle}</span>
        </h5>
        <p className="text-stone-700">{deltaText}</p>
        {triggers.length > 0 && (
          <div>
            <span className="text-[11px] font-bold text-stone-800 block mb-1">
              {t.landMemory.triggersTitle}:
            </span>
            <ul className="list-disc list-inside text-[11px] text-stone-700 space-y-0.5">
              {triggers.map((tr, i) => (
                <li key={i}>{tr}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Insufficient or Blocked Futures State */}
      {assessment.status !== 'PLANS_READY' && (
        <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-300 space-y-2 text-amber-950">
          <div className="font-bold flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              {assessment.status === 'INSUFFICIENT_DATA'
                ? t.transitionBridge.badgeInsufficientData
                : t.transitionBridge.badgeNoFeasible}
            </span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-[11px]">
            {(language === 'ar'
              ? assessment.insufficientReasonsAr
              : language === 'fr'
              ? assessment.insufficientReasonsFr
              : assessment.insufficientReasonsEn
            ).map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 3-Pathway Land Futures Comparison */}
      {assessment.status === 'PLANS_READY' && plan && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Path A: Baseline */}
          <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-300 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-stone-900">{t.landMemory.pathATitle}</span>
            </div>
            <div className="p-2 rounded-lg bg-white border border-stone-200 font-mono text-[11px] font-bold text-stone-800">
              {plan.baseline.sequenceCropIds.map(cropLabel).join(' → ')}
            </div>
            <div className="space-y-1 text-[11px] text-stone-700">
              {(language === 'ar'
                ? plan.baseline.diseaseAndPestRisksAr
                : language === 'fr'
                ? plan.baseline.diseaseAndPestRisksFr
                : plan.baseline.diseaseAndPestRisksEn
              ).map((r, i) => (
                <p key={i} className="flex items-start gap-1">
                  <AlertTriangle className="w-3 h-3 text-amber-700 mt-0.5 shrink-0" />
                  <span>{r}</span>
                </p>
              ))}
              {(language === 'ar'
                ? plan.baseline.nutrientWeaknessesAr
                : language === 'fr'
                ? plan.baseline.nutrientWeaknessesFr
                : plan.baseline.nutrientWeaknessesEn
              ).map((n, i) => (
                <p key={i}>• {n}</p>
              ))}
            </div>
          </div>

          {/* Path B: Gradual Transition */}
          {plan.recommendedPathway && (
            <div className="p-3.5 rounded-xl bg-emerald-50/40 border border-emerald-300 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-emerald-950 flex items-center gap-1">
                  <GitBranch className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span>{t.landMemory.pathBTitle}</span>
                </span>
                <span className="text-[11px] font-mono font-bold text-emerald-800 tabular-nums">
                  {plan.recommendedPathway.compositePlanningScore}/100
                </span>
              </div>
              <div className="p-2 rounded-lg bg-white border border-emerald-200 font-mono text-[11px] font-bold text-emerald-950">
                {plan.recommendedPathway.cropSequence.map(cropLabel).join(' → ')}
              </div>
              <p className="text-[11px] text-stone-800 leading-relaxed">
                {language === 'ar'
                  ? plan.recommendedPathway.whyGeneratedAr
                  : language === 'fr'
                  ? plan.recommendedPathway.whyGeneratedFr
                  : plan.recommendedPathway.whyGeneratedEn}
              </p>
              <div className="text-[10px] text-stone-600 pt-1 border-t border-emerald-200/70">
                <span className="font-bold block">{t.transitionBridge.tradeOffLabel}:</span>
                <span>
                  {language === 'ar'
                    ? plan.recommendedPathway.tradeOffNoteAr
                    : language === 'fr'
                    ? plan.recommendedPathway.tradeOffNoteFr
                    : plan.recommendedPathway.tradeOffNoteEn}
                </span>
              </div>
            </div>
          )}

          {/* Path C: Alternative Resilience */}
          {plan.alternativePathway ? (
            <div className="p-3.5 rounded-xl bg-sky-50/40 border border-sky-300 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-sky-950">{t.landMemory.pathCTitle}</span>
                <span className="text-[11px] font-mono font-bold text-sky-800 tabular-nums">
                  {plan.alternativePathway.compositePlanningScore}/100
                </span>
              </div>
              <div className="p-2 rounded-lg bg-white border border-sky-200 font-mono text-[11px] font-bold text-sky-950">
                {plan.alternativePathway.cropSequence.map(cropLabel).join(' → ')}
              </div>
              <p className="text-[11px] text-stone-800 leading-relaxed">
                {language === 'ar'
                  ? plan.alternativePathway.whyGeneratedAr
                  : language === 'fr'
                  ? plan.alternativePathway.whyGeneratedFr
                  : plan.alternativePathway.whyGeneratedEn}
              </p>
              <div className="text-[10px] text-stone-600 pt-1 border-t border-sky-200/70">
                <span className="font-bold block">{t.transitionBridge.tradeOffLabel}:</span>
                <span>
                  {language === 'ar'
                    ? plan.alternativePathway.tradeOffNoteAr
                    : language === 'fr'
                    ? plan.alternativePathway.tradeOffNoteFr
                    : plan.alternativePathway.tradeOffNoteEn}
                </span>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-white border border-stone-200 space-y-1.5 text-stone-600">
              <span className="font-bold text-stone-800 block">{t.landMemory.pathCTitle}</span>
              <p className="text-[11px]">
                {(language === 'ar'
                  ? plan.noAlternativeReasonAr
                  : language === 'fr'
                  ? plan.noAlternativeReasonFr
                  : plan.noAlternativeReasonEn) || t.transitionBridge.badgeNoFeasible}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Hard Constraints vs Ranking Preferences + Local Verification + Missing Records */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="p-3 rounded-xl bg-white border border-stone-200 space-y-2">
          <span className="font-bold text-stone-900 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
            <span>{t.landMemory.hardConstraintsTitle}</span>
          </span>
          <ul className="list-disc list-inside text-[11px] text-stone-700 space-y-0.5">
            {(language === 'ar'
              ? assessment.hardConstraintsAppliedAr
              : language === 'fr'
              ? assessment.hardConstraintsAppliedFr
              : assessment.hardConstraintsAppliedEn
            ).map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>

          <span className="font-bold text-stone-900 block pt-1.5 border-t border-stone-100">
            {t.landMemory.rankingPreferencesTitle}
          </span>
          <ul className="list-disc list-inside text-[11px] text-stone-700 space-y-0.5">
            {(language === 'ar'
              ? assessment.rankingPreferencesAr
              : language === 'fr'
              ? assessment.rankingPreferencesFr
              : assessment.rankingPreferencesEn
            ).map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </div>

        <div className="p-3 rounded-xl bg-white border border-stone-200 space-y-2">
          <span className="font-bold text-stone-900 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-sky-700" />
            <span>{t.landMemory.verificationConditionsTitle}</span>
          </span>
          <ul className="list-disc list-inside text-[11px] text-stone-700 space-y-0.5">
            {(language === 'ar'
              ? assessment.localVerificationConditionsAr
              : language === 'fr'
              ? assessment.localVerificationConditionsFr
              : assessment.localVerificationConditionsEn
            ).map((v, i) => (
              <li key={i}>{v}</li>
            ))}
          </ul>

          {missingBlocking.length > 0 && (
            <>
              <span className="font-bold text-amber-900 block pt-1.5 border-t border-stone-100">
                {t.landMemory.blockingMissingTitle}
              </span>
              <ul className="list-disc list-inside text-[11px] text-amber-900 space-y-0.5">
                {missingBlocking.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      <span className="block text-[10px] font-mono text-stone-400 text-end" dir="ltr">
        {farm.id} · Ref lat/lng: {farm.centroid.lat.toFixed(4)}, {farm.centroid.lng.toFixed(4)}
      </span>
    </div>
  );
};
