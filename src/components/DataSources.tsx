/**
 * TURBA Scientific Data Provenance & Traceability Modal
 * Fulfills Section 6 & 7: Comprehensive traceability from UI reading back to raw API source.
 * Displays raw parameters, original units, applied transformations, timestamps, and validation status.
 */

import React, { useState } from 'react';
import { DataProvenanceRecord, Coordinates } from '../types/farm';
import { useTranslation } from '../i18n/language';
import { formatCoordinates } from '../utils/geo';
import {
  ShieldCheck,
  Clock,
  Database,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
  Code2,
  X,
  Search,
} from 'lucide-react';

interface DataProvenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: DataProvenanceRecord[];
  coordinates: Coordinates;
  farmName: string;
}

export const DataProvenanceModal: React.FC<DataProvenanceModalProps> = ({
  isOpen,
  onClose,
  records,
  coordinates,
  farmName,
}) => {
  const { t, language } = useTranslation();
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const filteredRecords = records.filter((rec) => {
    const matchesCat = filterCategory === 'all' || rec.category === filterCategory;
    const matchesSearch =
      rec.variableName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.rawParameterName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.sourceName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const activeRecord = records.find((r) => r.id === selectedRecordId) || filteredRecords[0];

  const renderStatusTag = (status: DataProvenanceRecord['validationStatus']) => {
    switch (status) {
      case 'PASS':
        return (
          <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            PASS
          </span>
        );
      case 'WARNING':
        return (
          <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-300 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            WARNING
          </span>
        );
      case 'REJECTED':
      default:
        return (
          <span className="text-[10px] font-mono font-bold text-rose-800 bg-rose-50 px-2 py-0.5 rounded border border-rose-300 flex items-center gap-1">
            <XCircle className="w-3 h-3 text-rose-600" />
            REJECTED
          </span>
        );
    }
  };

  const renderFreshnessTag = (freshness: DataProvenanceRecord['freshness']) => {
    switch (freshness) {
      case 'fresh':
        return (
          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
            {t.common.fresh}
          </span>
        );
      case 'delayed':
        return (
          <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-300">
            {t.common.delayed}
          </span>
        );
      case 'stale':
        return (
          <span className="text-[10px] font-bold text-orange-800 bg-orange-50 px-2 py-0.5 rounded border border-orange-300">
            {t.common.stale}
          </span>
        );
      case 'unavailable':
      default:
        return (
          <span className="text-[10px] font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded border border-stone-300">
            {t.common.unavailable}
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-black/40 backdrop-blur-xs">
      <div className="bg-white border border-stone-200 max-w-5xl w-full h-[90vh] rounded-2xl flex flex-col shadow-2xl overflow-hidden text-stone-900">
        {/* Modal Header */}
        <div className="p-4 bg-stone-50 border-b border-stone-200 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-stone-900 flex items-center gap-2">
                {t.dashboard.provenanceModalTitle}
              </h3>
              <p className="text-xs text-stone-500 font-mono mt-0.5" dir="ltr">
                {farmName} • {formatCoordinates(coordinates, 5)}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 hover:text-stone-900 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-3 bg-stone-50/70 border-b border-stone-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {['all', 'weather', 'soil', 'rainfall', 'vegetation', 'radiation', 'wind'].map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-2.5 py-1 rounded-lg uppercase font-mono text-[11px] transition-colors ${
                  filterCategory === cat
                    ? 'bg-emerald-600 text-white font-bold shadow-xs'
                    : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter parameter or source..."
              className="w-full bg-white border border-stone-200 pl-8 pr-3 py-1.5 rounded-xl text-xs text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-emerald-600 font-mono shadow-2xs"
            />
          </div>
        </div>

        {/* Content Split: Left List / Right Details */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Table / List */}
          <div className="w-full md:w-1/2 border-b md:border-b-0 md:border-r border-stone-200 overflow-y-auto p-2 space-y-1.5 bg-stone-50/40">
            {filteredRecords.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-400">
                {t.common.dataUnavailable}
              </div>
            ) : (
              filteredRecords.map((rec) => {
                const isSelected = activeRecord?.id === rec.id;
                return (
                  <div
                    key={rec.id}
                    onClick={() => setSelectedRecordId(rec.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer text-xs ${
                      isSelected
                        ? 'bg-emerald-50/60 border-2 border-emerald-600 text-stone-900 shadow-sm'
                        : 'bg-white border-stone-200 hover:border-emerald-300 text-stone-700 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="font-bold block truncate text-stone-900">
                          {language === 'ar' && rec.variableNameAr ? rec.variableNameAr : language === 'fr' && rec.variableNameFr ? rec.variableNameFr : rec.variableName}
                        </span>
                        <span className="font-mono text-[10px] text-stone-500 block truncate" dir="ltr">
                          {rec.rawParameterName} • {rec.sourceName}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {renderStatusTag(rec.validationStatus)}
                      </div>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[11px] pt-1 border-t border-stone-100 font-mono">
                      <div className="flex items-baseline gap-1.5" dir="ltr">
                        <span className="font-extrabold text-stone-900 text-sm">
                          {rec.displayedValue}
                        </span>
                        <span className="text-stone-500 text-[10px]">{rec.displayedUnit}</span>
                      </div>
                      {renderFreshnessTag(rec.freshness)}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right Detailed Inspector Panel */}
          <div className="w-full md:w-1/2 p-4 overflow-y-auto bg-white space-y-3.5 text-xs">
            {activeRecord ? (
              <>
                <div className="flex items-start justify-between border-b border-stone-100 pb-3">
                  <div>
                    <h4 className="font-bold text-sm text-stone-900">
                      {language === 'ar' && activeRecord.variableNameAr ? activeRecord.variableNameAr : language === 'fr' && activeRecord.variableNameFr ? activeRecord.variableNameFr : activeRecord.variableName}
                    </h4>
                    <span className="text-[11px] font-mono text-emerald-700 font-semibold block mt-0.5" dir="ltr">
                      {activeRecord.rawParameterName}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {renderStatusTag(activeRecord.validationStatus)}
                    {renderFreshnessTag(activeRecord.freshness)}
                  </div>
                </div>

                {/* Value Comparison Card */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 font-mono">
                    <span className="text-[10px] text-stone-500 block font-sans font-medium">{t.dashboard.provenanceRawValue}</span>
                    <span className="text-base font-bold text-stone-900 block mt-1" dir="ltr">
                      {activeRecord.rawValue !== null ? String(activeRecord.rawValue) : 'null'}
                    </span>
                    <span className="text-[10px] text-stone-500 block mt-0.5" dir="ltr">
                      Unit: {activeRecord.originalUnit}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200 font-mono">
                    <span className="text-[10px] text-emerald-800 block font-sans font-medium">TURBA Displayed Value</span>
                    <span className="text-base font-bold text-emerald-800 block mt-1" dir="ltr">
                      {activeRecord.displayedValue} {activeRecord.displayedUnit}
                    </span>
                    <span className="text-[10px] text-emerald-700/80 block mt-0.5 font-sans">
                      Verified & sanitized
                    </span>
                  </div>
                </div>

                {/* Transformation Formula */}
                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
                  <span className="text-[10px] text-stone-600 font-semibold block flex items-center gap-1.5 font-sans">
                    <Code2 className="w-3.5 h-3.5 text-amber-600" />
                    {t.dashboard.provenanceTransformation}
                  </span>
                  <p className="font-mono text-[11px] text-stone-800 font-medium" dir="ltr">
                    {activeRecord.transformation}
                  </p>
                </div>

                {/* Spatial & Temporal Resolution */}
                <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                  <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200">
                    <span className="text-[9px] text-stone-500 uppercase block font-sans">{t.dashboard.provenanceSpatial}</span>
                    <span className="text-stone-800 font-semibold block mt-0.5">{activeRecord.spatialResolution}</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200">
                    <span className="text-[9px] text-stone-500 uppercase block font-sans">{t.dashboard.provenanceTemporal}</span>
                    <span className="text-stone-800 font-semibold block mt-0.5">{activeRecord.temporalResolution}</span>
                  </div>
                </div>

                {/* Timestamps Card */}
                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 space-y-1.5 font-mono text-[11px]">
                  <div className="flex items-center gap-1.5 text-stone-800 font-semibold mb-1 font-sans">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    <span>Scientific Temporal Provenance</span>
                  </div>
                  <div className="flex justify-between text-stone-600" dir="ltr">
                    <span>Observation Time:</span>
                    <span className="text-stone-900 font-semibold">{activeRecord.observationTime}</span>
                  </div>
                  <div className="flex justify-between text-stone-600" dir="ltr">
                    <span>TURBA Sync Time:</span>
                    <span className="text-stone-900 font-semibold">{new Date(activeRecord.syncTime).toISOString()}</span>
                  </div>
                  <div className="flex justify-between text-stone-600" dir="ltr">
                    <span>Data Age:</span>
                    <span className="text-emerald-700 font-bold">{activeRecord.dataAge}</span>
                  </div>
                  <div className="flex justify-between text-stone-600" dir="ltr">
                    <span>Timezone:</span>
                    <span className="text-stone-900 font-semibold">{activeRecord.timezone}</span>
                  </div>
                </div>

                {/* API Source Endpoint */}
                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
                  <span className="text-[10px] text-stone-600 font-semibold block flex items-center gap-1.5 font-sans">
                    <Database className="w-3.5 h-3.5 text-emerald-600" />
                    {t.dashboard.provenanceSource}
                  </span>
                  <span className="text-xs text-stone-900 font-bold block">{activeRecord.sourceName}</span>
                  <div className="p-2 rounded-lg bg-white border border-stone-200 font-mono text-[10px] text-emerald-900 break-all select-all flex items-start gap-1.5 mt-1" dir="ltr">
                    <ExternalLink className="w-3 h-3 text-stone-400 shrink-0 mt-0.5" />
                    <span>{activeRecord.sourceEndpoint}</span>
                  </div>
                </div>

                {/* Validation Notes */}
                {activeRecord.validationNote && (
                  <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-[11px] text-amber-900 space-y-1">
                    <span className="font-bold text-amber-800 block font-sans">{t.dashboard.provenanceNotes}</span>
                    <p>{activeRecord.validationNote}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="p-8 text-center text-xs text-stone-500">
                Select a variable on the left to inspect its complete scientific provenance.
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-stone-50 border-t border-stone-200 flex items-center justify-between text-xs text-stone-500 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-600" />
            <span>Strict Scientific Integrity: Zero Mock / Zero Synthetic Fallbacks</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 border border-stone-200 text-stone-700 font-semibold transition-colors"
          >
            {t.common.close}
          </button>
        </div>
      </div>
    </div>
  );
};
