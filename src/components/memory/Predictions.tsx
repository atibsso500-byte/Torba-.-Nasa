/**
 * TURBA — THE LIVING LAND MEMORY (ذاكرة الأرض)
 * Prediction vs. Reality Comparison Panel (View 3)
 *
 * Enables farmers to:
 * - Track status (`proposed | accepted | rejected | modified | not_recorded`) of saved snapshots
 * - Submit or update real observed field outcomes (actual crop, dates, irrigation depth/volume,
 *   yield, water shortages, pest observations, field rain gauge, or lab soil SOC test)
 * - View strict unit- & period-checked comparisons and causal disclaimers
 */

import React, { useState } from 'react';
import { GLOBAL_ROTATION_CROP_DATABASE, getGlobalRotationCropById } from '../../data/crops';
import { useTranslation } from '../../i18n/language';
import {
  ObservedCropCondition,
  PredictionRealityComparison,
  RecommendationSnapshot,
  RecommendationStatus,
  ReportedOutcomeRecord,
} from '../../services/memory/types';
import {
  saveOutcomeWithSanitization,
  updateRecommendationStatus,
} from '../../services/memory/service';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Edit3,
  Info,
  Save,
  XCircle,
} from 'lucide-react';

interface PredictionRealityPanelProps {
  fieldId: string;
  ownerId: string;
  recommendations: RecommendationSnapshot[];
  outcomes: ReportedOutcomeRecord[];
  comparisons: PredictionRealityComparison[];
  focusedRecommendationId: string | null;
  onChanged: () => void;
}

export const PredictionRealityPanel: React.FC<PredictionRealityPanelProps> = ({
  fieldId,
  ownerId,
  recommendations,
  outcomes,
  comparisons,
  focusedRecommendationId,
  onChanged,
}) => {
  const { t, language } = useTranslation();

  const [editingRecId, setEditingRecId] = useState<string | null>(focusedRecommendationId);
  const [actualCropId, setActualCropId] = useState<string>('');
  const [actualCropPlanted, setActualCropPlanted] = useState<string>('');
  const [actualPlantingDate, setActualPlantingDate] = useState<string>('');
  const [actualHarvestDate, setActualHarvestDate] = useState<string>('');
  const [actualIrrigationAmount, setActualIrrigationAmount] = useState<string>('');
  const [actualIrrigationUnit, setActualIrrigationUnit] = useState<'mm' | 'm3' | 'L/plant'>('mm');
  const [observedCondition, setObservedCondition] = useState<ObservedCropCondition>('good');
  const [yieldValue, setYieldValue] = useState<string>('');
  const [yieldUnit, setYieldUnit] = useState<'t/ha' | 'kg/ha' | 'kg/plot'>('t/ha');
  const [observedWaterShortage, setObservedWaterShortage] = useState<'yes' | 'no' | 'unknown'>('unknown');
  const [pestObs, setPestObs] = useState<string>('');
  const [recordedRainMm, setRecordedRainMm] = useState<string>('');
  const [recordedRainSource, setRecordedRainSource] = useState<string>('');
  const [postSeasonSocPct, setPostSeasonSocPct] = useState<string>('');
  const [farmerAssessment, setFarmerAssessment] = useState<string>('');

  const openOutcomeEditor = (rec: RecommendationSnapshot) => {
    const existing = outcomes.find((o) => o.recommendationId === rec.recommendationId);
    setEditingRecId(rec.recommendationId);
    if (existing) {
      setActualCropId(existing.actualCropId || '');
      setActualCropPlanted(existing.actualCropPlanted || '');
      setActualPlantingDate(existing.actualPlantingDate || '');
      setActualHarvestDate(existing.actualHarvestDate || '');
      setActualIrrigationAmount(
        existing.actualIrrigationAmount !== null ? String(existing.actualIrrigationAmount) : ''
      );
      setActualIrrigationUnit(existing.actualIrrigationUnit || 'mm');
      setObservedCondition(existing.observedCropCondition);
      setYieldValue(existing.yieldValue !== null ? String(existing.yieldValue) : '');
      setYieldUnit(existing.yieldUnit || 't/ha');
      setObservedWaterShortage(
        existing.observedWaterShortage === true
          ? 'yes'
          : existing.observedWaterShortage === false
          ? 'no'
          : 'unknown'
      );
      setPestObs(existing.pestOrDiseaseObservations || '');
      setRecordedRainMm(
        existing.recordedPeriodRainfallMm !== null ? String(existing.recordedPeriodRainfallMm) : ''
      );
      setRecordedRainSource(existing.recordedRainfallSource || '');
      setPostSeasonSocPct(
        existing.measuredPostSeasonSocPct !== null ? String(existing.measuredPostSeasonSocPct) : ''
      );
      setFarmerAssessment(existing.farmerAssessment || '');
    } else {
      setActualCropId(rec.proposedSummary.primaryCropId || '');
      const known = rec.proposedSummary.primaryCropId
        ? getGlobalRotationCropById(rec.proposedSummary.primaryCropId)
        : null;
      setActualCropPlanted(
        known
          ? language === 'ar'
            ? known.commonNameAr
            : language === 'fr'
            ? known.commonNameFr
            : known.commonNameEn
          : ''
      );
      setActualPlantingDate(rec.seasonContext.seasonStart || '');
      setActualHarvestDate('');
      setActualIrrigationAmount('');
      setActualIrrigationUnit('mm');
      setObservedCondition('good');
      setYieldValue('');
      setYieldUnit('t/ha');
      setObservedWaterShortage('unknown');
      setPestObs('');
      setRecordedRainMm('');
      setRecordedRainSource('');
      setPostSeasonSocPct('');
      setFarmerAssessment('');
    }
  };

  const handleStatusChange = (recId: string, status: RecommendationStatus) => {
    updateRecommendationStatus(fieldId, ownerId, recId, status);
    onChanged();
  };

  const handleSaveOutcome = (e: React.FormEvent, rec: RecommendationSnapshot) => {
    e.preventDefault();
    const existing = outcomes.find((o) => o.recommendationId === rec.recommendationId);

    saveOutcomeWithSanitization({
      fieldId,
      ownerId,
      rawOutcome: {
        outcomeId: existing?.outcomeId,
        fieldId,
        recommendationId: rec.recommendationId,
        seasonId: null,
        actualCropId: actualCropId || null,
        actualCropPlanted: actualCropPlanted || null,
        actualPlantingDate: actualPlantingDate || null,
        actualHarvestDate: actualHarvestDate || null,
        actualIrrigationAmount:
          actualIrrigationAmount.trim() === '' ? null : Number(actualIrrigationAmount),
        actualIrrigationUnit:
          actualIrrigationAmount.trim() === '' ? null : actualIrrigationUnit,
        actualIrrigationOrigin: 'farmer_report',
        observedCropCondition: observedCondition,
        yieldValue: yieldValue.trim() === '' ? null : Number(yieldValue),
        yieldUnit: yieldValue.trim() === '' ? null : yieldUnit,
        yieldOrigin: yieldValue.trim() === '' ? null : 'farmer_report',
        observedWaterShortage:
          observedWaterShortage === 'yes' ? true : observedWaterShortage === 'no' ? false : null,
        pestOrDiseaseObservations: pestObs || null,
        farmerAssessment,
        supportingReferences: [],
        recordedPeriodRainfallMm: recordedRainMm.trim() === '' ? null : Number(recordedRainMm),
        recordedRainfallSource: recordedRainSource || null,
        measuredPostSeasonSocPct: postSeasonSocPct.trim() === '' ? null : Number(postSeasonSocPct),
        measuredPostSeasonSoilOrigin:
          postSeasonSocPct.trim() === '' ? null : 'verified_measurement',
      },
    });

    setEditingRecId(null);
    onChanged();
  };

  return (
    <div className="space-y-4">
      <div className="p-3.5 rounded-xl bg-white border border-stone-200 space-y-1">
        <h4 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
          <ClipboardCheck className="w-4 h-4 text-emerald-700" />
          <span>{t.landMemory.predictionRealityTitle}</span>
        </h4>
        <p className="text-xs text-stone-600">{t.landMemory.predictionRealitySubtitle}</p>
      </div>

      {recommendations.length === 0 ? (
        <div className="p-5 rounded-xl bg-white border border-stone-200 text-center text-xs text-stone-600">
          {t.landMemory.emptySnapshotsNotice}
        </div>
      ) : (
        <div className="space-y-3">
          {recommendations.map((rec) => {
            const cmp = comparisons.find((c) => c.recommendationId === rec.recommendationId);
            const outcome = outcomes.find((o) => o.recommendationId === rec.recommendationId) || null;
            const isEditingThis = editingRecId === rec.recommendationId;
            const expl =
              language === 'ar'
                ? rec.explanationAr
                : language === 'fr'
                ? rec.explanationFr
                : rec.explanationEn;

            const badgeCls =
              cmp?.status === 'COMPARABLE'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : cmp?.status === 'PARTIAL'
                ? 'bg-amber-50 text-amber-900 border-amber-300'
                : cmp?.status === 'INCOMPATIBLE'
                ? 'bg-rose-50 text-rose-800 border-rose-300'
                : 'bg-stone-100 text-stone-700 border-stone-300';

            const badgeLabel =
              cmp?.status === 'COMPARABLE'
                ? t.landMemory.comparableBadge
                : cmp?.status === 'INCOMPATIBLE'
                ? t.landMemory.incompatibleBadge
                : cmp?.status === 'PARTIAL'
                ? `${t.landMemory.comparableBadge} (Partial)`
                : t.landMemory.awaitingOutcomeBadge;

            return (
              <div
                key={rec.recommendationId}
                className={`p-3.5 rounded-xl bg-white border space-y-3 text-xs ${
                  focusedRecommendationId === rec.recommendationId
                    ? 'border-emerald-500 ring-1 ring-emerald-500/30'
                    : 'border-stone-200'
                }`}
              >
                {/* Header & Decision Status Controls */}
                <div className="flex flex-wrap items-start justify-between gap-2 border-b border-stone-100 pb-2.5">
                  <div className="space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-stone-900 uppercase font-mono text-[11px]">
                        {rec.kind}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold ${badgeCls}`}>
                        {badgeLabel}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-stone-500 block" dir="ltr">
                      {rec.createdAt.slice(0, 16).replace('T', ' ')} UTC · {rec.calculationMethodVersion}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      aria-label={t.landMemory.recStatusLabel}
                      value={rec.status}
                      onChange={(e) =>
                        handleStatusChange(rec.recommendationId, e.target.value as RecommendationStatus)
                      }
                      className="rounded-lg border border-stone-200 bg-stone-50 px-2 py-1 text-[11px] font-semibold text-stone-800"
                    >
                      <option value="proposed">{t.landMemory.statusProposed}</option>
                      <option value="accepted">{t.landMemory.statusAccepted}</option>
                      <option value="modified">{t.landMemory.statusModified}</option>
                      <option value="rejected">{t.landMemory.statusRejected}</option>
                      <option value="not_recorded">{t.landMemory.statusNotRecorded}</option>
                    </select>

                    <button
                      type="button"
                      onClick={() =>
                        isEditingThis ? setEditingRecId(null) : openOutcomeEditor(rec)
                      }
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold flex items-center gap-1"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>
                        {outcome ? t.landMemory.editOutcomeBtn : t.landMemory.reportOutcomeBtn}
                      </span>
                    </button>
                  </div>
                </div>

                <p className="text-stone-700 leading-relaxed">{expl}</p>

                {/* Outcome Input Form */}
                {isEditingThis && (
                  <form
                    onSubmit={(e) => handleSaveOutcome(e, rec)}
                    className="p-3 rounded-lg bg-stone-50 border border-stone-200 space-y-3"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block font-semibold text-stone-700 mb-1">
                          {t.landMemory.actualCropLabel}
                        </label>
                        <select
                          value={actualCropId}
                          onChange={(e) => {
                            const id = e.target.value;
                            setActualCropId(id);
                            const found = getGlobalRotationCropById(id);
                            if (found) {
                              setActualCropPlanted(
                                language === 'ar'
                                  ? found.commonNameAr
                                  : language === 'fr'
                                  ? found.commonNameFr
                                  : found.commonNameEn
                              );
                            }
                          }}
                          className="w-full rounded-lg border border-stone-200 bg-white px-2 py-1 text-xs"
                        >
                          <option value="">-- {t.landMemory.customCropOption} --</option>
                          {GLOBAL_ROTATION_CROP_DATABASE.map((c) => (
                            <option key={c.id} value={c.id}>
                              {language === 'ar'
                                ? c.commonNameAr
                                : language === 'fr'
                                ? c.commonNameFr
                                : c.commonNameEn}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={actualCropPlanted}
                          onChange={(e) => setActualCropPlanted(e.target.value)}
                          placeholder={t.landMemory.actualCropLabel}
                          className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-2 py-1 text-xs"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-stone-700 mb-1">
                          {t.landMemory.observedConditionLabel}
                        </label>
                        <select
                          value={observedCondition}
                          onChange={(e) =>
                            setObservedCondition(e.target.value as ObservedCropCondition)
                          }
                          className="w-full rounded-lg border border-stone-200 bg-white px-2 py-1 text-xs"
                        >
                          <option value="good">{t.landMemory.condGood}</option>
                          <option value="moderate_stress">{t.landMemory.condModerateStress}</option>
                          <option value="severe_stress">{t.landMemory.condSevereStress}</option>
                          <option value="failed">{t.landMemory.condFailed}</option>
                          <option value="not_reported">{t.landMemory.condNotReported}</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-semibold text-stone-700 mb-1">
                          {t.landMemory.actualPlantingDateLabel}
                        </label>
                        <input
                          type="date"
                          value={actualPlantingDate}
                          onChange={(e) => setActualPlantingDate(e.target.value)}
                          className="w-full rounded-lg border border-stone-200 bg-white px-2 py-1 text-xs font-mono"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-stone-700 mb-1">
                          {t.landMemory.actualHarvestDateLabel}
                        </label>
                        <input
                          type="date"
                          value={actualHarvestDate}
                          onChange={(e) => setActualHarvestDate(e.target.value)}
                          className="w-full rounded-lg border border-stone-200 bg-white px-2 py-1 text-xs font-mono"
                        />
                      </div>

                      {/* Actual Irrigation Amount + Unit */}
                      <div className="flex gap-1.5">
                        <div className="flex-1">
                          <label className="block font-semibold text-stone-700 mb-1">
                            {t.landMemory.actualIrrAmountLabel}
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={actualIrrigationAmount}
                            onChange={(e) => setActualIrrigationAmount(e.target.value)}
                            placeholder="Blank if unknown"
                            className="w-full rounded-lg border border-stone-200 bg-white px-2 py-1 text-xs font-mono"
                          />
                        </div>
                        <div className="w-24">
                          <label className="block font-semibold text-stone-700 mb-1">
                            {t.landMemory.actualIrrUnitLabel}
                          </label>
                          <select
                            value={actualIrrigationUnit}
                            onChange={(e) =>
                              setActualIrrigationUnit(e.target.value as 'mm' | 'm3' | 'L/plant')
                            }
                            className="w-full rounded-lg border border-stone-200 bg-white px-2 py-1 text-xs font-mono"
                          >
                            <option value="mm">mm</option>
                            <option value="m3">m³</option>
                            <option value="L/plant">L/plant</option>
                          </select>
                        </div>
                      </div>

                      {/* Yield + Unit */}
                      <div className="flex gap-1.5">
                        <div className="flex-1">
                          <label className="block font-semibold text-stone-700 mb-1">
                            {t.landMemory.yieldValueLabel}
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={yieldValue}
                            onChange={(e) => setYieldValue(e.target.value)}
                            placeholder="Optional"
                            className="w-full rounded-lg border border-stone-200 bg-white px-2 py-1 text-xs font-mono"
                          />
                        </div>
                        <div className="w-24">
                          <label className="block font-semibold text-stone-700 mb-1">
                            {t.landMemory.yieldUnitLabel}
                          </label>
                          <select
                            value={yieldUnit}
                            onChange={(e) =>
                              setYieldUnit(e.target.value as 't/ha' | 'kg/ha' | 'kg/plot')
                            }
                            className="w-full rounded-lg border border-stone-200 bg-white px-2 py-1 text-xs font-mono"
                          >
                            <option value="t/ha">t/ha</option>
                            <option value="kg/ha">kg/ha</option>
                            <option value="kg/plot">kg/plot</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block font-semibold text-stone-700 mb-1">
                          {t.landMemory.waterShortageLabel}
                        </label>
                        <select
                          value={observedWaterShortage}
                          onChange={(e) =>
                            setObservedWaterShortage(e.target.value as 'yes' | 'no' | 'unknown')
                          }
                          className="w-full rounded-lg border border-stone-200 bg-white px-2 py-1 text-xs"
                        >
                          <option value="unknown">{t.landMemory.unknownLabel}</option>
                          <option value="yes">{t.landMemory.yesLabel}</option>
                          <option value="no">{t.landMemory.noLabel}</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-semibold text-stone-700 mb-1">
                          {t.landMemory.postSeasonSocLabel}
                        </label>
                        <input
                          type="number"
                          step="0.05"
                          min="0"
                          max="40"
                          value={postSeasonSocPct}
                          onChange={(e) => setPostSeasonSocPct(e.target.value)}
                          placeholder="Lab SOC % only"
                          className="w-full rounded-lg border border-stone-200 bg-white px-2 py-1 text-xs font-mono"
                        />
                        <span className="text-[10px] text-stone-500 block mt-0.5">
                          {t.landMemory.postSeasonSocHint}
                        </span>
                      </div>

                      <div>
                        <label className="block font-semibold text-stone-700 mb-1">
                          {t.landMemory.recordedRainMmLabel}
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={recordedRainMm}
                          onChange={(e) => setRecordedRainMm(e.target.value)}
                          className="w-full rounded-lg border border-stone-200 bg-white px-2 py-1 text-xs font-mono"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-stone-700 mb-1">
                          {t.landMemory.recordedRainSourceLabel}
                        </label>
                        <input
                          type="text"
                          value={recordedRainSource}
                          onChange={(e) => setRecordedRainSource(e.target.value)}
                          className="w-full rounded-lg border border-stone-200 bg-white px-2 py-1 text-xs"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block font-semibold text-stone-700 mb-1">
                          {t.landMemory.pestObservationsLabel}
                        </label>
                        <input
                          type="text"
                          value={pestObs}
                          onChange={(e) => setPestObs(e.target.value)}
                          className="w-full rounded-lg border border-stone-200 bg-white px-2 py-1 text-xs"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block font-semibold text-stone-700 mb-1">
                          {t.landMemory.farmerAssessmentLabel}
                        </label>
                        <textarea
                          rows={2}
                          value={farmerAssessment}
                          onChange={(e) => setFarmerAssessment(e.target.value)}
                          className="w-full rounded-lg border border-stone-200 bg-white px-2 py-1 text-xs"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingRecId(null)}
                        className="px-3 py-1 rounded-lg bg-stone-200 text-stone-800 font-semibold"
                      >
                        {t.common.cancel}
                      </button>
                      <button
                        type="submit"
                        className="px-3.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{t.landMemory.saveOutcomeBtn}</span>
                      </button>
                    </div>
                  </form>
                )}

                {/* Comparison Metrics Breakdown */}
                {cmp && cmp.metrics.length > 0 && (
                  <div className="space-y-2 pt-1">
                    {cmp.metrics.map((m) => {
                      const label =
                        language === 'ar' ? m.labelAr : language === 'fr' ? m.labelFr : m.labelEn;
                      const interp =
                        language === 'ar'
                          ? m.interpretationAr
                          : language === 'fr'
                          ? m.interpretationFr
                          : m.interpretationEn;
                      const incomp =
                        language === 'ar'
                          ? m.incompatibilityReasonAr
                          : language === 'fr'
                          ? m.incompatibilityReasonFr
                          : m.incompatibilityReasonEn;

                      return (
                        <div
                          key={m.metricKey}
                          className={`p-2.5 rounded-lg border space-y-1.5 ${
                            m.comparable
                              ? 'border-stone-200 bg-stone-50/70'
                              : 'border-amber-200 bg-amber-50/40'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-stone-900 flex items-center gap-1.5">
                              {m.comparable ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              ) : (
                                <XCircle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                              )}
                              <span>{label}</span>
                            </span>
                            {m.periodStart && (
                              <span className="text-[10px] font-mono text-stone-500" dir="ltr">
                                {m.periodStart}
                                {m.periodEnd ? ` → ${m.periodEnd}` : ''}
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-3 gap-2 font-mono text-[11px] bg-white p-2 rounded border border-stone-200">
                            <div>
                              <span className="text-[9px] text-stone-500 block">
                                {t.landMemory.expectedCol}
                              </span>
                              <span className="font-bold text-stone-900">
                                {m.expectedDisplay || t.common.notAvailable}
                              </span>
                            </div>
                            <div>
                              <span className="text-[9px] text-stone-500 block">
                                {t.landMemory.actualCol}
                              </span>
                              <span className="font-bold text-stone-900">
                                {m.actualDisplay || t.common.notAvailable}
                              </span>
                            </div>
                            <div>
                              <span className="text-[9px] text-stone-500 block">
                                {t.landMemory.deltaCol}
                              </span>
                              <span className="font-bold text-stone-900 tabular-nums" dir="ltr">
                                {m.comparable && m.deltaNumeric !== null
                                  ? `${m.deltaNumeric >= 0 ? `+${m.deltaNumeric}` : m.deltaNumeric} ${
                                      m.expectedUnit || ''
                                    }${m.deltaPercent !== null ? ` (${m.deltaPercent}%)` : ''}`
                                  : m.comparable
                                  ? 'OK'
                                  : 'Blocked'}
                              </span>
                            </div>
                          </div>

                          {incomp && (
                            <p className="text-[11px] text-amber-900 flex items-start gap-1">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-700 mt-0.5 shrink-0" />
                              <span>{incomp}</span>
                            </p>
                          )}
                          <p className="text-[11px] text-stone-700">{interp}</p>
                        </div>
                      );
                    })}

                    <div className="p-2 rounded-lg bg-stone-50 border border-stone-200 text-[10px] text-stone-600 flex items-start gap-1.5">
                      <Info className="w-3.5 h-3.5 text-stone-500 mt-0.5 shrink-0" />
                      <span>
                        {language === 'ar'
                          ? cmp.causalCaveatAr
                          : language === 'fr'
                          ? cmp.causalCaveatFr
                          : cmp.causalCaveatEn}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
