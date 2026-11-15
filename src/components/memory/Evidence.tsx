/**
 * TURBA — THE LIVING LAND MEMORY (ذاكرة الأرض)
 * Data Sources, Scientific Provenance & Honest Time-Series Evidence (View 6)
 *
 * Displays:
 * - Full provenance table with Source, Variable, Value+Unit, Ref Date, Retrieval Timestamp,
 *   Spatial/Temporal Resolution, Origin & Quality Badge, and Scientific Limitations
 * - Honest real time-series chart from NASA POWER daily history / saved snapshots ONLY
 *   when verified data exists (with explicit source, units, period, and gaps disclosed)
 */

import React from 'react';
import { useTranslation } from '../../i18n/language';
import { NasaPowerObservation } from '../../types/farm';
import {
  EnvironmentalSnapshotRecord,
  LandMemoryDataOrigin,
  LandMemoryProvenanceEntry,
  LandMemoryQualityStatus,
} from '../../services/memory/types';
import { AlertCircle, BarChart3, ShieldCheck } from 'lucide-react';

interface EvidenceDetailsPanelProps {
  provenanceEntries: LandMemoryProvenanceEntry[];
  environmentalSnapshots: EnvironmentalSnapshotRecord[];
  nasaPower: NasaPowerObservation | null;
}

export const EvidenceDetailsPanel: React.FC<EvidenceDetailsPanelProps> = ({
  provenanceEntries,
  environmentalSnapshots,
  nasaPower,
}) => {
  const { t } = useTranslation();

  // Deduplicate latest provenance entry per variable to keep table crisp while showing retrieval history count
  const latestProvByVar = React.useMemo(() => {
    const map = new Map<string, LandMemoryProvenanceEntry>();
    for (const p of provenanceEntries) {
      map.set(`${p.sourceProvider}::${p.variable}`, p);
    }
    return Array.from(map.values());
  }, [provenanceEntries]);

  const getOriginLabel = (origin: LandMemoryDataOrigin): string => {
    switch (origin) {
      case 'farmer_report':
        return t.landMemory.originFarmerReport;
      case 'imported_record':
        return t.landMemory.originImportedRecord;
      case 'verified_measurement':
        return t.landMemory.originVerifiedMeasurement;
      case 'calculated':
        return t.landMemory.originCalculated;
      case 'spatial_estimate':
        return t.landMemory.originSpatialEstimate;
      case 'system_analysis':
        return t.landMemory.originSystemAnalysis;
    }
  };

  const getQualityLabel = (q: LandMemoryQualityStatus): string => {
    switch (q) {
      case 'verified_measurement':
        return t.landMemory.qualityVerified;
      case 'farmer_reported':
        return t.landMemory.qualityFarmerReported;
      case 'estimated':
        return t.landMemory.qualityEstimated;
      case 'calculated':
        return t.landMemory.qualityCalculated;
      case 'missing_data':
        return t.landMemory.qualityMissing;
      case 'outdated_data':
        return t.landMemory.qualityOutdated;
    }
  };

  // Real historical daily chart points directly from NASA POWER verified history (no synthetic backfill)
  const nasaRainSeries =
    nasaPower?.dataStatus === 'VERIFIED' && nasaPower.dailyHistory.length > 0
      ? nasaPower.dailyHistory.slice(-20)
      : [];

  return (
    <div className="space-y-4 text-xs">
      <div className="p-3.5 rounded-xl bg-white border border-stone-200 space-y-1">
        <h4 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-700" />
          <span>{t.landMemory.evidenceDetailsTitle}</span>
        </h4>
        <p className="text-stone-600">{t.landMemory.evidenceDetailsSubtitle}</p>
      </div>

      {/* Honest Environmental Time-Series Chart (NASA POWER Daily PRECTOTCORR & Temp) */}
      <div className="p-3.5 rounded-xl bg-white border border-stone-200 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-bold text-stone-900 flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4 text-sky-700" />
            <span>{t.landMemory.chartHistoryTitle}</span>
          </span>
          <span className="text-[10px] font-mono text-stone-500">
            Snapshots saved: {environmentalSnapshots.length}
          </span>
        </div>

        {nasaRainSeries.length > 0 ? (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between text-[10px] font-mono text-stone-600" dir="ltr">
              <span>NASA POWER MERRA-2 Daily Precipitation (mm/d) & T2M (°C)</span>
              <span>
                {nasaRainSeries[0].date} → {nasaRainSeries[nasaRainSeries.length - 1].date}
              </span>
            </div>

            <div className="h-24 flex items-end gap-1 p-2 rounded-lg bg-stone-50 border border-stone-200">
              {nasaRainSeries.map((d) => {
                const maxRain = Math.max(
                  5,
                  ...nasaRainSeries.map((x) => x.precipitation ?? 0)
                );
                const val = d.precipitation;
                const pct =
                  val === null ? 0 : val === 0 ? 4 : Math.max(10, Math.min(100, (val / maxRain) * 100));
                return (
                  <div
                    key={d.date}
                    className="flex-1 flex flex-col items-center justify-end h-full group"
                    title={`${d.date} | Rain: ${val !== null ? `${val} mm` : 'N/A'} | T2M: ${
                      d.temperature !== null ? `${d.temperature}°C` : 'N/A'
                    }`}
                  >
                    {val === null ? (
                      <div className="w-full h-1 bg-amber-400/70 rounded" title="Missing day" />
                    ) : (
                      <div
                        className={`w-full rounded-t transition-colors ${
                          val > 0 ? 'bg-sky-600 hover:bg-sky-700' : 'bg-stone-300'
                        }`}
                        style={{ height: `${pct}%` }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-stone-500">
              Source: NASA POWER ~50 km grid (gridded assimilation, not an in-situ rain gauge). Grey baseline bars = 0.0 mm; amber line = missing NASA record day.
            </p>
          </div>
        ) : (
          <div className="p-3 rounded-lg bg-stone-50 border border-stone-200 text-stone-600 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-stone-400 shrink-0" />
            <span>{t.landMemory.chartNoSeriesNotice}</span>
          </div>
        )}
      </div>

      {/* Provenance Registry Table */}
      <div className="rounded-xl bg-white border border-stone-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-start border-collapse text-[11px]">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-700 font-bold">
              <tr>
                <th className="p-2.5 text-start">{t.landMemory.colSourceProvider}</th>
                <th className="p-2.5 text-start">{t.landMemory.colVariable}</th>
                <th className="p-2.5 text-start">{t.landMemory.colValueUnit}</th>
                <th className="p-2.5 text-start">{t.landMemory.colRefDate}</th>
                <th className="p-2.5 text-start">{t.landMemory.colResolution}</th>
                <th className="p-2.5 text-start">{t.landMemory.colOriginQuality}</th>
                <th className="p-2.5 text-start">{t.landMemory.colLimitations}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {latestProvByVar.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-4 text-center text-stone-500">
                    {t.common.dataUnavailable}
                  </td>
                </tr>
              ) : (
                latestProvByVar.map((p) => (
                  <tr key={p.provenanceId} className="align-top hover:bg-stone-50/70">
                    <td className="p-2.5 font-semibold text-stone-900">{p.sourceProvider}</td>
                    <td className="p-2.5 text-stone-700">{p.variable}</td>
                    <td className="p-2.5 font-mono tabular-nums font-bold text-stone-900" dir="ltr">
                      {p.value !== null ? `${p.value} ${p.unit}` : t.common.unavailable}
                    </td>
                    <td className="p-2.5 font-mono text-stone-600 whitespace-nowrap" dir="ltr">
                      <div>{p.observationOrReferenceDate}</div>
                      <div className="text-[9px] text-stone-400">
                        Fetched: {p.retrievalTimestamp.slice(0, 16).replace('T', ' ')}
                      </div>
                    </td>
                    <td className="p-2.5 text-stone-600">
                      <div>{p.spatialResolution}</div>
                      <div className="text-[10px] text-stone-400">{p.temporalResolution}</div>
                    </td>
                    <td className="p-2.5">
                      <span className="font-semibold text-stone-800 block">
                        {getOriginLabel(p.origin)}
                      </span>
                      <span
                        className={`text-[10px] font-mono ${
                          p.qualityStatus === 'missing_data'
                            ? 'text-rose-700'
                            : p.qualityStatus === 'verified_measurement'
                            ? 'text-emerald-700'
                            : 'text-amber-800'
                        }`}
                      >
                        {getQualityLabel(p.qualityStatus)}
                      </span>
                    </td>
                    <td className="p-2.5 text-stone-600 max-w-xs">{p.limitations}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
