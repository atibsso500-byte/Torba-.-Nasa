import React, { useState, useEffect } from 'react';
import { Coordinates, AgriculturalClassification, FarmRecord } from '../types/farm';
import { classifyAgriculturalCoordinate, formatCoordinates } from '../utils/geo';
import { useTranslation } from '../i18n/language';
import { getCropLabel } from '../data/morocco';
import { X, Check, MapPin, ShieldAlert, Sparkles, Layers, AlertCircle } from 'lucide-react';

interface FarmProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  polygon: Coordinates[] | null;
  centroid: Coordinates;
  areaHa: number;
  areaM2: number;
  identificationMethod: FarmRecord['identificationMethod'];
  onSave: (data: {
    name: string;
    notes?: string;
    region: string;
    province: string;
    cadastralReference?: string;
    polygon: Coordinates[] | null;
    centroid: Coordinates;
    calculatedAreaHectares: number;
    calculatedAreaM2: number;
    identificationMethod: FarmRecord['identificationMethod'];
    classification: AgriculturalClassification;
  }) => void;
}

export const FarmProfileModal: React.FC<FarmProfileModalProps> = ({
  isOpen,
  onClose,
  polygon,
  centroid,
  areaHa,
  areaM2,
  identificationMethod,
  onSave,
}) => {
  const { t, language, isRtl } = useTranslation();
  const { zone, classification } = classifyAgriculturalCoordinate(centroid);

  // Form states initialized with empty or derived defaults
  const [name, setName] = useState('');
  const [region, setRegion] = useState('');
  const [province, setProvince] = useState('');
  const [cadastralRef, setCadastralRef] = useState('');
  const [notes, setNotes] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Reset form whenever modal opens or centroid/polygon changes
  useEffect(() => {
    if (isOpen) {
      const generatedName = zone
        ? `${language === 'ar' ? 'قطعة' : language === 'fr' ? 'Parcelle' : 'Parcel'} ${zone.province} (${areaHa > 0 ? `${areaHa} ${t.common.hectares}` : t.map.pointMarkerTitle})`
        : '';
      setName(generatedName);
      setRegion(zone ? zone.region : '');
      setProvince(zone ? zone.province : '');
      setCadastralRef('');
      setNotes(zone ? `${zone.basin} • ${zone.primaryCrops.join(', ')}` : '');
      setValidationError(null);
    }
  }, [isOpen, centroid.lat, centroid.lng, areaHa, zone, language, t.common.hectares, t.map.pointMarkerTitle]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setValidationError(
        language === 'ar'
          ? 'يرجى إدخال اسم القطعة الزراعية'
          : language === 'fr'
          ? 'Veuillez saisir le nom de la parcelle agricole'
          : 'Please enter the agricultural parcel name'
      );
      return;
    }

    onSave({
      name: name.trim(),
      notes: notes.trim() || undefined,
      region: region.trim(),
      province: province.trim(),
      cadastralReference: cadastralRef.trim() || undefined,
      polygon,
      centroid,
      calculatedAreaHectares: areaHa,
      calculatedAreaM2: areaM2,
      identificationMethod,
      classification,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
      <div className="bg-white border border-stone-200 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col text-stone-900">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between bg-stone-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-base">{t.profileModal.modalTitle}</h3>
              <p className="text-xs text-stone-500">{t.profileModal.modalSubtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[75vh]">
          {/* Surface & Geo summary */}
          <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-stone-500 font-medium uppercase tracking-wider block">
                {t.profileModal.geodesicAreaSummary}
              </span>
              <span className="text-lg font-mono font-bold text-emerald-700" dir="ltr">
                {areaHa > 0 ? `${areaHa} ${t.common.hectares}` : t.map.pointMarkerTitle}
              </span>
              {areaM2 > 0 && (
                <span className="text-xs text-stone-500 font-mono ml-2" dir="ltr">({areaM2.toLocaleString()} {t.common.sqMeters})</span>
              )}
            </div>

            <div className="text-end">
              <span className="text-[11px] text-stone-500 font-medium uppercase tracking-wider block">
                {t.profileModal.centroidCoordinates}
              </span>
              <span className="text-xs font-mono text-stone-800 font-semibold" dir="ltr">
                {formatCoordinates(centroid, 4)}
              </span>
            </div>
          </div>

          {/* Classification indicator */}
          <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />
            <div className="text-xs">
              <span className="font-bold text-emerald-900">{t.profileModal.classificationSummary}</span>
              <p className="text-stone-800 mt-0.5 font-medium">{getCropLabel(classification, language)}</p>
              <div className="mt-1 flex items-center gap-3 text-[11px] text-stone-500 font-mono">
                <span>{t.profileModal.resolutionLabel} {classification.spatialResolution}</span>
                <span>•</span>
                <span>
                  {classification.confidence !== null ? `${t.profileModal.confidenceLabel} ${classification.confidence}%` : t.common.dataUnavailable}
                </span>
                <span>•</span>
                <span>
                  {classification.productYear !== null ? `2021` : t.common.notAvailable}
                </span>
              </div>
            </div>
          </div>

          {/* Validation error display */}
          {validationError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Inputs */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              {t.profileModal.parcelName} *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (validationError) setValidationError(null);
              }}
              className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-stone-900 text-sm focus:border-emerald-600 focus:outline-none shadow-2xs"
              placeholder={t.profileModal.parcelNamePlaceholder}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">{t.profileModal.region}</label>
              <input
                type="text"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-stone-900 text-xs focus:border-emerald-600 focus:outline-none shadow-2xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">{t.profileModal.province}</label>
              <input
                type="text"
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-stone-900 text-xs focus:border-emerald-600 focus:outline-none shadow-2xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              {t.profileModal.cadastralRef}
            </label>
            <input
              type="text"
              value={cadastralRef}
              onChange={(e) => setCadastralRef(e.target.value)}
              className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-stone-900 text-sm font-mono focus:border-emerald-600 focus:outline-none shadow-2xs"
              placeholder={t.profileModal.cadastralRefPlaceholder}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">{t.profileModal.notes}</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-stone-900 text-xs focus:border-emerald-600 focus:outline-none resize-none shadow-2xs"
              placeholder={t.profileModal.notesPlaceholder}
            />
          </div>

          {/* Legal disclaimer */}
          <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="leading-relaxed">
              {language === 'ar'
                ? 'تنبيه قانوني: الحدود والمساحات المسجلة هي تحديدات جغرافية فضائية للمساعدة في اتخاذ القرارات الزراعية، ولا تشكل رسماً عقارياً رسمياً صادراً عن الوكالة الوطنية للمحافظة العقارية والمسح العقاري والخرائطية (ANCFCC).'
                : language === 'fr'
                ? "Avertissement légal: Les limites et superficies enregistrées constituent des délimitations géographiques satellitaires d'aide à la décision agricole et n'ont pas valeur de titre de propriété cadastral officiel (ANCFCC)."
                : 'Legal Disclaimer: Registered parcel boundaries and areas are satellite-derived geographic estimates intended for agricultural decision support and do not constitute an official cadastral property deed (ANCFCC).'}
            </p>
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-stone-700 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 text-xs font-medium transition-colors"
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{t.profileModal.saveFarmButton}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
