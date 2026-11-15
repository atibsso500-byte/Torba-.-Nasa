/**
 * TURBA — THE LIVING LAND MEMORY (ذاكرة الأرض)
 * Add / Edit Season Record Form
 *
 * Strict integrity:
 * - Zero fabricated defaults for unknown dates, amounts, or previous crops.
 * - Unknown irrigation volume stays blank (`null`), never 0.
 * - Records edit note & origin transparently on every save.
 */

import React, { useEffect, useState } from 'react';
import {
  GLOBAL_ROTATION_CROP_DATABASE,
  IRRIGATION_METHOD_PRESETS,
  getGlobalRotationCropById,
} from '../../data/crops';
import { useTranslation } from '../../i18n/language';
import { SeasonRecord, SeasonRecordOrigin } from '../../services/memory/types';
import { saveSeasonWithValidation } from '../../services/memory/service';
import { AlertCircle, CheckCircle2, Save } from 'lucide-react';

interface SeasonRecordFormProps {
  fieldId: string;
  ownerId: string;
  editingSeason: SeasonRecord | null;
  onSaved: () => void;
  onCancel?: () => void;
}

export const SeasonRecordForm: React.FC<SeasonRecordFormProps> = ({
  fieldId,
  ownerId,
  editingSeason,
  onSaved,
  onCancel,
}) => {
  const { t, language } = useTranslation();

  const [catalogCropId, setCatalogCropId] = useState<string>('');
  const [cropName, setCropName] = useState<string>('');
  const [cropFamily, setCropFamily] = useState<string>('');
  const [seasonStart, setSeasonStart] = useState<string>('');
  const [seasonEnd, setSeasonEnd] = useState<string>('');
  const [plantingDate, setPlantingDate] = useState<string>('');
  const [harvestDate, setHarvestDate] = useState<string>('');
  const [previousCropId, setPreviousCropId] = useState<string>('');
  const [irrigationMethod, setIrrigationMethod] = useState<string>('');
  const [irrigationAmountMm, setIrrigationAmountMm] = useState<string>('');
  const [fertilizerAndAmendments, setFertilizerAndAmendments] = useState<string>('');
  const [managementPractices, setManagementPractices] = useState<string>('');
  const [evidenceRefsText, setEvidenceRefsText] = useState<string>('');
  const [farmerNotes, setFarmerNotes] = useState<string>('');
  const [dataOrigin, setDataOrigin] = useState<SeasonRecordOrigin>('farmer_report');
  const [editNote, setEditNote] = useState<string>('');
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (editingSeason) {
      const known = getGlobalRotationCropById(editingSeason.cropId);
      setCatalogCropId(known ? known.id : '__custom__');
      setCropName(editingSeason.cropName);
      setCropFamily(editingSeason.cropFamily || '');
      setSeasonStart(editingSeason.seasonStart);
      setSeasonEnd(editingSeason.seasonEnd || '');
      setPlantingDate(editingSeason.plantingDate || '');
      setHarvestDate(editingSeason.harvestDate || '');
      setPreviousCropId(editingSeason.previousCropId || '');
      setIrrigationMethod(editingSeason.irrigationMethod || '');
      setIrrigationAmountMm(
        editingSeason.irrigationAmountMm !== null ? String(editingSeason.irrigationAmountMm) : ''
      );
      setFertilizerAndAmendments(editingSeason.fertilizerAndAmendments || '');
      setManagementPractices(editingSeason.managementPractices || '');
      setEvidenceRefsText(editingSeason.evidenceReferences.join(', '));
      setFarmerNotes(editingSeason.farmerNotes || '');
      setDataOrigin(editingSeason.dataOrigin);
      setEditNote('');
      setErrors([]);
    } else {
      setCatalogCropId('');
      setCropName('');
      setCropFamily('');
      setSeasonStart('');
      setSeasonEnd('');
      setPlantingDate('');
      setHarvestDate('');
      setPreviousCropId('');
      setIrrigationMethod('');
      setIrrigationAmountMm('');
      setFertilizerAndAmendments('');
      setManagementPractices('');
      setEvidenceRefsText('');
      setFarmerNotes('');
      setDataOrigin('farmer_report');
      setEditNote('');
      setErrors([]);
    }
  }, [editingSeason]);

  const handleCatalogChange = (val: string) => {
    setCatalogCropId(val);
    if (val && val !== '__custom__') {
      const profile = getGlobalRotationCropById(val);
      if (profile) {
        setCropName(
          language === 'ar'
            ? profile.commonNameAr
            : language === 'fr'
            ? profile.commonNameFr
            : profile.commonNameEn
        );
        setCropFamily(profile.family);
      }
    } else if (val === '__custom__') {
      setCropName('');
      setCropFamily('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const refs = evidenceRefsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const res = saveSeasonWithValidation({
      fieldId,
      ownerId,
      editNote: editingSeason ? editNote : undefined,
      seasonInput: {
        seasonId: editingSeason?.seasonId,
        fieldId,
        seasonStart,
        seasonEnd: seasonEnd || null,
        cropId: catalogCropId && catalogCropId !== '__custom__' ? catalogCropId : '',
        cropName,
        cropFamily: cropFamily || null,
        plantingDate: plantingDate || null,
        harvestDate: harvestDate || null,
        previousCropId: previousCropId || null,
        irrigationMethod: irrigationMethod || null,
        irrigationAmountMm: irrigationAmountMm.trim() === '' ? null : Number(irrigationAmountMm),
        fertilizerAndAmendments: fertilizerAndAmendments || null,
        managementPractices: managementPractices || null,
        farmerNotes,
        evidenceReferences: refs,
        dataOrigin,
      },
    });

    if (!res.ok) {
      setErrors(res.errors);
      return;
    }

    setErrors([]);
    onSaved();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-4 rounded-xl bg-white border border-stone-200 space-y-4 text-xs"
    >
      <div className="flex items-center justify-between border-b border-stone-200 pb-2.5">
        <h4 className="text-sm font-bold text-stone-900">
          {editingSeason ? t.landMemory.seasonFormTitleEdit : t.landMemory.seasonFormTitleAdd}
        </h4>
        {editingSeason && (
          <span className="text-[10px] font-mono text-stone-500">
            ID: {editingSeason.seasonId}
          </span>
        )}
      </div>

      {errors.length > 0 && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 space-y-1">
          {errors.map((err, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{err}</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Catalog Crop */}
        <div>
          <label className="block font-semibold text-stone-700 mb-1">
            {t.landMemory.cropCatalogLabel}
          </label>
          <select
            value={catalogCropId}
            onChange={(e) => handleCatalogChange(e.target.value)}
            className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-900 focus:border-emerald-600 focus:outline-none"
          >
            <option value="">-- {t.landMemory.cropCatalogLabel} --</option>
            {GLOBAL_ROTATION_CROP_DATABASE.map((c) => (
              <option key={c.id} value={c.id}>
                {language === 'ar'
                  ? c.commonNameAr
                  : language === 'fr'
                  ? c.commonNameFr
                  : c.commonNameEn}{' '}
                ({c.family})
              </option>
            ))}
            <option value="__custom__">{t.landMemory.customCropOption}</option>
          </select>
        </div>

        {/* Crop Name */}
        <div>
          <label className="block font-semibold text-stone-700 mb-1">
            {t.landMemory.cropNameLabel}
          </label>
          <input
            type="text"
            value={cropName}
            onChange={(e) => setCropName(e.target.value)}
            placeholder="e.g. Durum Wheat / Faba Bean"
            className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-900 focus:border-emerald-600 focus:outline-none"
          />
        </div>

        {/* Botanical Family */}
        <div>
          <label className="block font-semibold text-stone-700 mb-1">
            {t.landMemory.cropFamilyLabel}
          </label>
          <input
            type="text"
            value={cropFamily}
            onChange={(e) => setCropFamily(e.target.value)}
            placeholder="Poaceae, Fabaceae, Solanaceae..."
            className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-900 focus:border-emerald-600 focus:outline-none"
          />
        </div>

        {/* Record Origin */}
        <div>
          <label className="block font-semibold text-stone-700 mb-1">
            {t.landMemory.colOriginQuality}
          </label>
          <select
            value={dataOrigin}
            onChange={(e) => setDataOrigin(e.target.value as SeasonRecordOrigin)}
            className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-900 focus:border-emerald-600 focus:outline-none"
          >
            <option value="farmer_report">{t.landMemory.originFarmerReport}</option>
            <option value="verified_measurement">{t.landMemory.originVerifiedMeasurement}</option>
            <option value="imported_record">{t.landMemory.originImportedRecord}</option>
          </select>
        </div>

        {/* Season Start */}
        <div>
          <label className="block font-semibold text-stone-700 mb-1">
            {t.landMemory.seasonStartLabel}
          </label>
          <input
            type="text"
            value={seasonStart}
            onChange={(e) => setSeasonStart(e.target.value)}
            placeholder="YYYY-MM-DD (e.g. 2025-11-15)"
            className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-mono tabular-nums text-stone-900 focus:border-emerald-600 focus:outline-none"
          />
        </div>

        {/* Season End */}
        <div>
          <label className="block font-semibold text-stone-700 mb-1">
            {t.landMemory.seasonEndLabel}
          </label>
          <input
            type="text"
            value={seasonEnd}
            onChange={(e) => setSeasonEnd(e.target.value)}
            placeholder="YYYY-MM-DD"
            className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-mono tabular-nums text-stone-900 focus:border-emerald-600 focus:outline-none"
          />
        </div>

        {/* Planting Date */}
        <div>
          <label className="block font-semibold text-stone-700 mb-1">
            {t.landMemory.plantingDateLabel}
          </label>
          <input
            type="date"
            value={plantingDate}
            onChange={(e) => {
              setPlantingDate(e.target.value);
              if (!seasonStart) setSeasonStart(e.target.value);
            }}
            className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-mono tabular-nums text-stone-900 focus:border-emerald-600 focus:outline-none"
          />
        </div>

        {/* Harvest Date */}
        <div>
          <label className="block font-semibold text-stone-700 mb-1">
            {t.landMemory.harvestDateLabel}
          </label>
          <input
            type="date"
            value={harvestDate}
            onChange={(e) => setHarvestDate(e.target.value)}
            className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-mono tabular-nums text-stone-900 focus:border-emerald-600 focus:outline-none"
          />
        </div>

        {/* Previous Crop */}
        <div>
          <label className="block font-semibold text-stone-700 mb-1">
            {t.landMemory.previousCropLabel}
          </label>
          <select
            value={previousCropId}
            onChange={(e) => setPreviousCropId(e.target.value)}
            className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-900 focus:border-emerald-600 focus:outline-none"
          >
            <option value="">-- {t.landMemory.unknownLabel} --</option>
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
        </div>

        {/* Irrigation Method */}
        <div>
          <label className="block font-semibold text-stone-700 mb-1">
            {t.landMemory.irrigationMethodLabel}
          </label>
          <select
            value={irrigationMethod}
            onChange={(e) => setIrrigationMethod(e.target.value)}
            className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-900 focus:border-emerald-600 focus:outline-none"
          >
            <option value="">-- {t.landMemory.unknownLabel} --</option>
            <option value="rainfed">Rainfed / Pluvial / بعلية</option>
            {IRRIGATION_METHOD_PRESETS.map((m) => (
              <option key={m.id} value={m.id}>
                {language === 'ar' ? m.nameAr : language === 'fr' ? m.nameFr : m.nameEn}
              </option>
            ))}
          </select>
        </div>

        {/* Applied Irrigation Amount mm */}
        <div className="sm:col-span-2">
          <label className="block font-semibold text-stone-700 mb-1">
            {t.landMemory.irrigationAmountMmLabel}
          </label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="5000"
            value={irrigationAmountMm}
            onChange={(e) => setIrrigationAmountMm(e.target.value)}
            placeholder="Blank if unknown / غير مقاس"
            className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-mono tabular-nums text-stone-900 focus:border-emerald-600 focus:outline-none"
          />
          <span className="text-[10px] text-stone-500 block mt-1">
            {t.landMemory.irrigationAmountHint}
          </span>
        </div>

        {/* Fertilizer */}
        <div>
          <label className="block font-semibold text-stone-700 mb-1">
            {t.landMemory.fertilizerLabel}
          </label>
          <input
            type="text"
            value={fertilizerAndAmendments}
            onChange={(e) => setFertilizerAndAmendments(e.target.value)}
            className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-900 focus:border-emerald-600 focus:outline-none"
          />
        </div>

        {/* Practices */}
        <div>
          <label className="block font-semibold text-stone-700 mb-1">
            {t.landMemory.practicesLabel}
          </label>
          <input
            type="text"
            value={managementPractices}
            onChange={(e) => setManagementPractices(e.target.value)}
            className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-900 focus:border-emerald-600 focus:outline-none"
          />
        </div>

        {/* Evidence references */}
        <div className="sm:col-span-2">
          <label className="block font-semibold text-stone-700 mb-1">
            {t.landMemory.evidenceRefsLabel}
          </label>
          <input
            type="text"
            value={evidenceRefsText}
            onChange={(e) => setEvidenceRefsText(e.target.value)}
            placeholder="Lab #102, Field logbook..."
            className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-900 focus:border-emerald-600 focus:outline-none"
          />
        </div>

        {/* Notes */}
        <div className="sm:col-span-2">
          <label className="block font-semibold text-stone-700 mb-1">
            {t.landMemory.notesLabel}
          </label>
          <textarea
            rows={2}
            value={farmerNotes}
            onChange={(e) => setFarmerNotes(e.target.value)}
            className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-900 focus:border-emerald-600 focus:outline-none"
          />
        </div>

        {editingSeason && (
          <div className="sm:col-span-2">
            <label className="block font-semibold text-stone-700 mb-1">
              {t.landMemory.editNoteLabel}
            </label>
            <input
              type="text"
              value={editNote}
              onChange={(e) => setEditNote(e.target.value)}
              placeholder="e.g. Corrected harvest date & meter reading"
              className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-900 focus:border-emerald-600 focus:outline-none"
            />
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold"
          >
            {t.common.cancel}
          </button>
        )}
        <button
          type="submit"
          className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{t.landMemory.saveSeasonBtn}</span>
        </button>
      </div>

      <div className="flex items-center gap-1.5 text-[10px] text-stone-500">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        <span>
          {language === 'ar'
            ? 'الحقول الفارغة تبقى محفوظة كغير مسجلة دون تعويض تلقائي بأرقام وهمية.'
            : language === 'fr'
            ? 'Les champs vides restent enregistrés comme manquants sans valeur par défaut fictive.'
            : 'Blank measurements remain missing honestly with zero synthetic fallback numbers.'}
        </span>
      </div>
    </form>
  );
};
