import React, { useState } from 'react';
import { FarmRecord, Coordinates } from '../types/farm';
import { exportFarmsToGeoJson } from '../services/farmStorage';
import { useTranslation } from '../i18n/language';
import { getCropLabel } from '../data/morocco';
import { formatCoordinates } from '../utils/geo';
import {
  MapPin,
  Trash2,
  Download,
  Compass,
  Layers,
  ChevronRight,
  ChevronLeft,
  X,
} from 'lucide-react';

interface FarmListDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  savedFarms: FarmRecord[];
  activeFarmId: string | null;
  onSelectFarm: (farm: FarmRecord) => void;
  onDeleteFarm: (id: string) => void;
  onEnterCoordinates: (coords: Coordinates, label?: string) => void;
}

export const FarmListDrawer: React.FC<FarmListDrawerProps> = ({
  isOpen,
  onClose,
  savedFarms,
  activeFarmId,
  onSelectFarm,
  onDeleteFarm,
  onEnterCoordinates,
}) => {
  const { t, language, isRtl } = useTranslation();
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualLat, setManualLat] = useState('34.2650');
  const [manualLng, setManualLng] = useState('-5.9280');
  const [manualCadastre, setManualCadastre] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  if (!isOpen) return null;

  const totalHectares = savedFarms.reduce((sum, f) => sum + f.calculatedAreaHectares, 0);

  const handleDownloadGeoJson = () => {
    const jsonStr = exportFarmsToGeoJson(savedFarms);
    const blob = new Blob([jsonStr], { type: 'application/geo+json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TURBA_Morocco_Parcels_${new Date().toISOString().split('T')[0]}.geojson`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    if (!isNaN(lat) && !isNaN(lng)) {
      onEnterCoordinates({ lat, lng }, manualCadastre.trim() || undefined);
      setShowManualEntry(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={onClose} />

      {/* Drawer Panel */}
      <div
        className={`relative ${
          isRtl ? 'mr-auto border-r' : 'ml-auto border-l'
        } w-full max-w-md bg-white border-stone-200 shadow-2xl flex flex-col h-full z-10 text-stone-900`}
      >
        {/* Header */}
        <div className="p-5 border-b border-stone-200 bg-stone-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-base">{t.drawer.myParcelsTitle}</h3>
              <p className="text-xs text-stone-500">
                {savedFarms.length} {t.drawer.registeredParcelsCount} •{' '}
                <span className="font-mono text-emerald-700 font-bold" dir="ltr">
                  {totalHectares.toFixed(1)} {t.common.hectares}
                </span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label={t.common.close}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Toolbar */}
        <div className="p-3 bg-stone-50/70 border-b border-stone-200 flex items-center gap-2">
          <button
            onClick={() => setShowManualEntry(!showManualEntry)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-stone-100 border border-stone-200 text-xs font-semibold text-stone-700 transition-colors shadow-2xs"
          >
            <Compass className="w-3.5 h-3.5 text-emerald-600" />
            <span>{showManualEntry ? t.drawer.hideManualEntry : t.drawer.addManualCoordinate}</span>
          </button>

          <button
            onClick={handleDownloadGeoJson}
            title={t.drawer.exportGeoJson}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-stone-100 border border-stone-200 text-xs font-semibold text-stone-700 transition-colors shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" />
            <span>GeoJSON</span>
          </button>
        </div>

        {/* Method 4: Manual Coordinates Form */}
        {showManualEntry && (
          <form
            onSubmit={handleManualSubmit}
            className="p-4 bg-stone-50 border-b border-stone-200 space-y-3 animate-fade-in"
          >
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">
              {t.drawer.manualEntryTitle}
            </span>
            <p className="text-[11px] text-stone-500">{t.drawer.manualEntryDesc}</p>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-stone-600 block mb-1 font-medium">{t.drawer.latitude}</label>
                <input
                  type="text"
                  required
                  value={manualLat}
                  onChange={(e) => setManualLat(e.target.value)}
                  className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs text-stone-900 font-mono focus:border-emerald-600 focus:outline-none"
                  placeholder="34.2650"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="text-[11px] text-stone-600 block mb-1 font-medium">{t.drawer.longitude}</label>
                <input
                  type="text"
                  required
                  value={manualLng}
                  onChange={(e) => setManualLng(e.target.value)}
                  className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs text-stone-900 font-mono focus:border-emerald-600 focus:outline-none"
                  placeholder="-5.9280"
                  dir="ltr"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] text-stone-600 block mb-1 font-medium">
                {t.drawer.parcelOrCadastreName}
              </label>
              <input
                type="text"
                value={manualCadastre}
                onChange={(e) => setManualCadastre(e.target.value)}
                className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs text-stone-900 font-mono focus:border-emerald-600 focus:outline-none"
                placeholder="Ex: TF-12345/R"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowManualEntry(false)}
                className="px-3 py-1.5 rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-700 text-xs font-medium"
              >
                {t.common.cancel}
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs"
              >
                {t.drawer.locateAndInspect}
              </button>
            </div>
          </form>
        )}

        {/* Farm Cards List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {savedFarms.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <MapPin className="w-8 h-8 text-stone-400 mx-auto" />
              <p className="text-sm font-semibold text-stone-700">{t.drawer.emptyParcelsTitle}</p>
              <p className="text-xs text-stone-500 max-w-xs mx-auto">
                {t.drawer.emptyParcelsDesc}
              </p>
            </div>
          ) : (
            savedFarms.map((farm) => {
              const isActive = farm.id === activeFarmId;
              return (
                <div
                  key={farm.id}
                  onClick={() => {
                    onSelectFarm(farm);
                    onClose();
                  }}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative group ${
                    isActive
                      ? 'bg-emerald-50/60 border-2 border-emerald-600 shadow-md'
                      : 'bg-white border-stone-200 hover:border-emerald-300 shadow-2xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isActive ? 'bg-emerald-600 animate-pulse' : 'bg-stone-400'
                          }`}
                        />
                        <h4 className="font-bold text-sm text-stone-900 truncate">{farm.name}</h4>
                      </div>
                      <p className="text-xs text-stone-500 mt-0.5">
                        {farm.province}, {farm.region}
                      </p>
                    </div>

                    {confirmDeleteId === farm.id ? (
                      <div
                        className="flex items-center gap-1.5 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteFarm(farm.id);
                            setConfirmDeleteId(null);
                          }}
                          className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-semibold transition-colors"
                        >
                          {t.common.delete}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-1 rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-700 text-[11px] font-medium transition-colors"
                        >
                          {t.common.cancel}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteId(farm.id);
                        }}
                        className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100"
                        title={t.common.delete}
                        aria-label={t.common.delete}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {confirmDeleteId === farm.id && (
                    <p
                      onClick={(e) => e.stopPropagation()}
                      className="mt-2 px-2.5 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-[11px] text-rose-800 font-medium"
                    >
                      {t.drawer.deleteConfirm}
                    </p>
                  )}

                  {/* Badges */}
                  <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 font-mono text-emerald-800 font-bold" dir="ltr">
                      {farm.calculatedAreaHectares} {t.common.hectares}
                    </span>

                    <span className="px-2 py-0.5 rounded-md bg-stone-100 border border-stone-200 text-[11px] text-stone-700 font-medium">
                      {getCropLabel(farm.classification, language).split('–')[0]?.trim()}
                    </span>

                    {farm.cadastralReference && (
                      <span className="px-2 py-0.5 rounded-md bg-stone-100 border border-stone-200 font-mono text-[10px] text-stone-600" dir="ltr">
                        {farm.cadastralReference}
                      </span>
                    )}
                  </div>

                  {/* Centroid coordinates */}
                  <div className="mt-2 pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500 font-mono">
                    <span dir="ltr">
                      {formatCoordinates(farm.centroid, 4)}
                    </span>
                    <span className="flex items-center gap-1 text-emerald-700 font-sans font-semibold">
                      {t.drawer.viewOnMap} {isRtl ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
