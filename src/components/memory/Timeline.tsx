/**
 * TURBA — THE LIVING LAND MEMORY (ذاكرة الأرض)
 * Chronological Agricultural Field Timeline (View 2)
 *
 * Shows seasons, recommendation snapshots, reported outcomes, environmental captures,
 * and explicit missing-data gaps in chronological order with origin & audit trails.
 */

import React, { useMemo, useState } from 'react';
import { useTranslation } from '../../i18n/language';
import {
  LandMemoryDataOrigin,
  LandMemoryTimelineEvent,
  SeasonRecord,
} from '../../services/memory/types';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Edit3,
  History,
  Layers,
  Trash2,
} from 'lucide-react';

interface FieldSeasonTimelineProps {
  timeline: LandMemoryTimelineEvent[];
  seasons: SeasonRecord[];
  onEditSeason: (season: SeasonRecord) => void;
  onDeleteSeason: (seasonId: string) => void;
  onJumpToComparison: (recommendationId: string) => void;
}

type TimelineFilter = 'all' | 'season_record' | 'recommendation' | 'reported_outcome' | 'data_gap';

export const FieldSeasonTimeline: React.FC<FieldSeasonTimelineProps> = ({
  timeline,
  seasons,
  onEditSeason,
  onDeleteSeason,
  onJumpToComparison,
}) => {
  const { t, language } = useTranslation();
  const [filter, setFilter] = useState<TimelineFilter>('all');

  const filtered = useMemo(() => {
    if (filter === 'all') return timeline;
    return timeline.filter((e) => e.eventType === filter);
  }, [timeline, filter]);

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

  return (
    <div className="space-y-3">
      {/* Filter Controls */}
      <div className="flex flex-wrap items-center gap-1.5">
        {(
          [
            ['all', t.landMemory.timelineFilterAll],
            ['season_record', t.landMemory.timelineFilterSeasons],
            ['recommendation', t.landMemory.timelineFilterRecommendations],
            ['reported_outcome', t.landMemory.timelineFilterOutcomes],
            ['data_gap', t.landMemory.timelineFilterGaps],
          ] as Array<[TimelineFilter, string]>
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
              filter === key
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="p-5 rounded-xl bg-white border border-stone-200 text-center space-y-1.5">
          <History className="w-6 h-6 text-stone-400 mx-auto" />
          <p className="text-xs font-bold text-stone-800">{t.landMemory.emptySeasonsTitle}</p>
          <p className="text-[11px] text-stone-500 max-w-md mx-auto">
            {t.landMemory.emptySeasonsDesc}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((ev) => {
            const title =
              language === 'ar' ? ev.titleAr : language === 'fr' ? ev.titleFr : ev.titleEn;
            const summary =
              language === 'ar' ? ev.summaryAr : language === 'fr' ? ev.summaryFr : ev.summaryEn;

            const seasonObj =
              ev.eventType === 'season_record'
                ? seasons.find((s) => s.seasonId === ev.sourceRecordId) || null
                : null;

            const borderStyle =
              ev.eventType === 'data_gap'
                ? 'border-amber-300 bg-amber-50/40'
                : ev.eventType === 'recommendation'
                ? 'border-sky-200 bg-white'
                : ev.eventType === 'reported_outcome'
                ? 'border-emerald-200 bg-white'
                : 'border-stone-200 bg-white';

            return (
              <div key={ev.eventId} className={`p-3 rounded-xl border ${borderStyle} space-y-2 text-xs`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {ev.eventType === 'data_gap' ? (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                      ) : ev.eventType === 'recommendation' ? (
                        <Layers className="w-3.5 h-3.5 text-sky-700 shrink-0" />
                      ) : ev.eventType === 'reported_outcome' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                      ) : (
                        <Calendar className="w-3.5 h-3.5 text-stone-600 shrink-0" />
                      )}
                      <span className="font-bold text-stone-900">{title}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono text-stone-500" dir="ltr">
                      <span>{ev.dateSortKey}</span>
                      <span>•</span>
                      <span>{getOriginLabel(ev.origin)}</span>
                      {ev.hasMissingData && (
                        <>
                          <span>•</span>
                          <span className="text-amber-800 font-semibold">
                            {t.landMemory.timelineMissingDataTag} ({ev.missingDetails.join(', ')})
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Interactive Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {seasonObj && (
                      <>
                        <button
                          type="button"
                          onClick={() => onEditSeason(seasonObj)}
                          className="px-2 py-1 rounded-md bg-stone-100 hover:bg-stone-200 text-stone-700 text-[11px] font-semibold flex items-center gap-1"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>{t.landMemory.editSeasonBtn}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteSeason(seasonObj.seasonId)}
                          className="p-1 rounded-md text-stone-400 hover:text-rose-700 hover:bg-rose-50"
                          title={t.common.delete}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                    {ev.eventType === 'recommendation' && (
                      <button
                        type="button"
                        onClick={() => onJumpToComparison(ev.sourceRecordId)}
                        className="px-2 py-1 rounded-md bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-900 text-[11px] font-semibold flex items-center gap-1"
                      >
                        <ClipboardList className="w-3 h-3" />
                        <span>{t.landMemory.navPredictionReality}</span>
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-stone-700 leading-relaxed">{summary}</p>

                {/* Audit Timestamps & Edit History for editable records */}
                {seasonObj && (
                  <div className="pt-1.5 border-t border-stone-100 text-[10px] text-stone-500 flex flex-wrap items-center justify-between gap-2 font-mono">
                    <span dir="ltr">
                      {t.landMemory.createdAtLabel}: {seasonObj.createdAt.slice(0, 10)} ·{' '}
                      {t.landMemory.updatedAtLabel}: {seasonObj.updatedAt.slice(0, 10)}
                    </span>
                    {seasonObj.editHistory.length > 0 && (
                      <span className="text-stone-600">
                        {t.landMemory.editHistoryLabel}: {seasonObj.editHistory.length}x (
                        {seasonObj.editHistory[seasonObj.editHistory.length - 1].note})
                      </span>
                    )}
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
