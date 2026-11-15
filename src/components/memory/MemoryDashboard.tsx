/**
 * TURBA — THE LIVING LAND MEMORY (ذاكرة الأرض)
 * Unified Field Memory Workspace Dashboard (All 6 Integrated Views)
 *
 * Sub-views:
 * 1. Overview (Field ID, real geometry/boundary status, counts, deterministic summary, backup)
 * 2. Agricultural Season Timeline (Seasons, Recommendations, Outcomes, Missing Gaps)
 * 3. Prediction vs. Reality (Outcome entry + unit/period-guarded comparison)
 * 4. Land Futures Comparison (3 pathways + Evidence Learning + Recommendation Delta)
 * 5. Add / Edit Season Record Form (Strict validation, zero fake defaults)
 * 6. Data Sources & Evidence Details (Provenance table + historical chart)
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getGlobalRotationCropById } from '../../data/crops';
import { useTranslation } from '../../i18n/language';
import {
  CopernicusEra5LandSoil,
  CurrentWeatherObservation,
  FarmRecord,
  NasaGpmObservation,
  NasaPowerObservation,
  NasaSmapObservation,
  Sentinel2Observation,
} from '../../types/farm';
import { SoilHydraulicResult, WeatherSeriesResult } from '../../types/irrigation';
import {
  loadFarmerContextForFarm,
  loadIrrigationConfigForFarm,
  loadTransitionStateForFarm,
} from '../../services/irrigation/storage';
import { resolveSoilHydraulics } from '../../services/irrigation/soil';
import { fetchIrrigationWeatherSeries } from '../../services/irrigation/weather';
import {
  DEFAULT_LOCAL_OWNER_ID,
  deleteSeasonRecord,
  exportFieldBackupPayload,
  getLandMemoryWorkspaceState,
  importFieldBackupPayload,
  syncFieldAndCaptureEnvironment,
} from '../../services/memory/service';
import {
  LandMemoryWorkspaceState,
  SeasonRecord,
} from '../../services/memory/types';
import { EvidenceDetailsPanel } from './Evidence';
import { FieldSeasonTimeline } from './Timeline';
import { LandFuturesComparison } from './Futures';
import { PredictionRealityPanel } from './Predictions';
import { SeasonRecordForm } from './SeasonForm';
import {
  AlertTriangle,
  Compass,
  Database,
  Download,
  FileCheck,
  History,
  Layers,
  Maximize2,
  Minimize2,
  Plus,
  Scale,
  Upload,
} from 'lucide-react';

interface LandMemoryDashboardProps {
  farm: FarmRecord;
  currentWeather: CurrentWeatherObservation | null;
  nasaPower: NasaPowerObservation | null;
  nasaSmap: NasaSmapObservation | null;
  era5LandSoil: CopernicusEra5LandSoil | null;
  nasaGpm: NasaGpmObservation | null;
  sentinel2: Sentinel2Observation | null;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

type MemorySubView =
  | 'overview'
  | 'timeline'
  | 'prediction_reality'
  | 'land_futures'
  | 'season_form'
  | 'evidence_details';

export const LandMemoryDashboard: React.FC<LandMemoryDashboardProps> = ({
  farm,
  currentWeather,
  nasaPower,
  nasaSmap,
  era5LandSoil,
  nasaGpm,
  sentinel2,
  isExpanded = false,
  onToggleExpand,
}) => {
  const { t, language } = useTranslation();
  const ownerId = DEFAULT_LOCAL_OWNER_ID;

  const [subView, setSubView] = useState<MemorySubView>('overview');
  const [editingSeason, setEditingSeason] = useState<SeasonRecord | null>(null);
  const [focusedRecId, setFocusedRecId] = useState<string | null>(null);
  const [importFeedback, setImportFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [weatherSeries, setWeatherSeries] = useState<WeatherSeriesResult | null>(null);
  const [soilHydraulics, setSoilHydraulics] = useState<SoilHydraulicResult | null>(null);
  const [isLoadingEnv, setIsLoadingEnv] = useState<boolean>(false);

  const [workspace, setWorkspace] = useState<LandMemoryWorkspaceState>(() =>
    getLandMemoryWorkspaceState(farm.id, ownerId)
  );

  const reloadWorkspace = useCallback(() => {
    setWorkspace(getLandMemoryWorkspaceState(farm.id, ownerId));
  }, [farm.id, ownerId]);

  // Sync FieldMemory immediately on farm selection / environmental telemetry updates
  useEffect(() => {
    syncFieldAndCaptureEnvironment({
      farm,
      ownerId,
      currentWeather,
      nasaPower,
      nasaSmap,
      nasaGpm,
      era5LandSoil,
      sentinel2,
      soilHydraulics,
    });
    reloadWorkspace();
  }, [
    farm,
    ownerId,
    currentWeather,
    nasaPower,
    nasaSmap,
    nasaGpm,
    era5LandSoil,
    sentinel2,
    soilHydraulics,
    reloadWorkspace,
  ]);

  // Fetch Soil & Meteo series cleanly so Land Futures + Evidence work even if user opened Land Memory tab first
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const cfg = loadIrrigationConfigForFarm(farm.id, farm.calculatedAreaHectares);

    async function loadEnv() {
      setIsLoadingEnv(true);
      try {
        const [wRes, sRes] = await Promise.all([
          fetchIrrigationWeatherSeries(farm.centroid, controller.signal),
          resolveSoilHydraulics({
            coordinates: farm.centroid,
            config: cfg,
            rootDepthM: cfg.customRootDepthM || 0.8,
            signal: controller.signal,
          }),
        ]);
        if (!active || controller.signal.aborted) return;
        setWeatherSeries(wRes);
        setSoilHydraulics(sRes);
      } catch {
        // Handled explicitly via null states
      } finally {
        if (active && !controller.signal.aborted) {
          setIsLoadingEnv(false);
        }
      }
    }

    loadEnv();
    return () => {
      active = false;
      controller.abort();
    };
  }, [farm.id, farm.centroid, farm.calculatedAreaHectares]);

  const farmerContext = loadFarmerContextForFarm(farm.id);
  const transitionState = loadTransitionStateForFarm(farm.id);

  const handleExportJson = () => {
    const payload = exportFieldBackupPayload(farm.id, ownerId);
    if (!payload) return;
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `turba-land-memory-${farm.id}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as unknown;
      const res = importFieldBackupPayload(parsed, ownerId);
      if (res.imported) {
        setImportFeedback({ ok: true, msg: t.landMemory.importSuccess });
        reloadWorkspace();
      } else {
        setImportFeedback({ ok: false, msg: t.landMemory.importError });
      }
    } catch {
      setImportFeedback({ ok: false, msg: t.landMemory.importError });
    } finally {
      e.target.value = '';
    }
  };

  const fm = workspace.fieldMemory;
  const lc = workspace.learningContext;

  const cropLabel = (cropId: string): string => {
    const c = getGlobalRotationCropById(cropId);
    if (!c) return cropId;
    return language === 'ar' ? c.commonNameAr : language === 'fr' ? c.commonNameFr : c.commonNameEn;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="p-3.5 rounded-xl bg-white border border-stone-200 space-y-2.5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-emerald-950 flex items-center gap-1.5">
              <Database className="w-4 h-4 text-emerald-700 shrink-0" />
              <span className="truncate">{t.landMemory.title}</span>
            </h3>
            <p className="text-[11px] text-stone-600 mt-0.5">{t.landMemory.subtitle}</p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleExportJson}
              className="px-2.5 py-1 rounded-lg bg-stone-50 hover:bg-stone-100 border border-stone-200 text-[11px] font-semibold text-stone-700 flex items-center gap-1"
            >
              <Download className="w-3 h-3" />
              <span>{t.landMemory.exportBackupBtn}</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1 rounded-lg bg-stone-50 hover:bg-stone-100 border border-stone-200 text-[11px] font-semibold text-stone-700 flex items-center gap-1"
            >
              <Upload className="w-3 h-3" />
              <span>{t.landMemory.importBackupBtn}</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              onChange={handleImportJson}
              className="hidden"
            />

            {onToggleExpand && (
              <button
                type="button"
                onClick={onToggleExpand}
                className="px-2.5 py-1 rounded-lg bg-stone-50 hover:bg-stone-100 border border-stone-200 text-[11px] font-semibold text-stone-700 flex items-center gap-1"
              >
                {isExpanded ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
                <span className="hidden sm:inline">
                  {isExpanded ? t.irrigation.collapseWorkspace : t.irrigation.expandWorkspace}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Sub-view Navigation (All 6 required views) */}
        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-stone-100">
          {(
            [
              ['overview', t.landMemory.navOverview, Database],
              ['timeline', t.landMemory.navTimeline, History],
              ['prediction_reality', t.landMemory.navPredictionReality, Scale],
              ['land_futures', t.landMemory.navLandFutures, Compass],
              ['season_form', t.landMemory.navAddSeason, Plus],
              ['evidence_details', t.landMemory.navEvidenceDetails, Layers],
            ] as Array<[MemorySubView, string, React.ElementType]>
          ).map(([key, label, Icon]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                if (key === 'season_form') setEditingSeason(null);
                setSubView(key);
              }}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border flex items-center gap-1.5 transition-colors ${
                subView === key
                  ? 'bg-emerald-700 text-white border-emerald-700'
                  : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {importFeedback && (
          <div
            className={`p-2 rounded-lg text-[11px] border ${
              importFeedback.ok
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            {importFeedback.msg}
          </div>
        )}
      </div>

      {/* VIEW 1: FIELD MEMORY OVERVIEW */}
      {subView === 'overview' && fm && (
        <div className="space-y-3 text-xs">
          {/* Storage Disclosure */}
          <div className="p-2.5 rounded-lg bg-stone-100 border border-stone-200 text-[11px] text-stone-700">
            {t.landMemory.storageDisclosure}
          </div>

          {/* Field Geometry & Identity */}
          <div className="p-3.5 rounded-xl bg-white border border-stone-200 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="font-bold text-stone-900 flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-emerald-700" />
                <span>{t.landMemory.fieldSummaryTitle}</span>
              </h4>
              <button
                type="button"
                onClick={() => {
                  setEditingSeason(null);
                  setSubView('season_form');
                }}
                className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t.landMemory.addSeasonBtn}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200">
                <span className="text-[10px] text-stone-500 block">{t.landMemory.fieldIdLabel}</span>
                <span className="font-mono font-bold text-stone-900 break-all" dir="ltr">
                  {fm.fieldId}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200">
                <span className="text-[10px] text-stone-500 block">{t.landMemory.precisionLabel}</span>
                <span className="font-semibold text-stone-900">
                  {fm.boundaryGeometry
                    ? t.landMemory.boundaryStatusDrawn
                    : t.landMemory.boundaryStatusPointOnly}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200">
                <span className="text-[10px] text-stone-500 block">{t.landMemory.areaLabel}</span>
                <span className="font-mono font-bold text-stone-900 tabular-nums">
                  {fm.area !== null ? `${fm.area} ${fm.areaUnit}` : t.landMemory.areaUnknown}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200">
                <span className="text-[10px] text-stone-500 block">GPS / Centroid</span>
                <span className="font-mono font-bold text-stone-900 tabular-nums" dir="ltr">
                  {fm.coordinates.lat.toFixed(5)}, {fm.coordinates.lng.toFixed(5)}
                </span>
              </div>
            </div>

            {!fm.boundaryGeometry && (
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-950 flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-700 mt-0.5 shrink-0" />
                <span>{t.landMemory.noBoundaryWarning}</span>
              </div>
            )}
          </div>

          {/* Persistent Memory KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-xl bg-white border border-stone-200">
              <span className="text-[10px] text-stone-500 block">
                {t.landMemory.seasonsRecordedCount}
              </span>
              <span className="text-2xl font-bold font-mono text-stone-900 tabular-nums">
                {workspace.seasons.length}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-white border border-stone-200">
              <span className="text-[10px] text-stone-500 block">
                {t.landMemory.snapshotsRecordedCount}
              </span>
              <span className="text-2xl font-bold font-mono text-stone-900 tabular-nums">
                {workspace.recommendations.length}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-white border border-stone-200">
              <span className="text-[10px] text-stone-500 block">
                {t.landMemory.outcomesRecordedCount}
              </span>
              <span className="text-2xl font-bold font-mono text-stone-900 tabular-nums">
                {workspace.outcomes.length}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-white border border-stone-200">
              <span className="text-[10px] text-stone-500 block">
                {t.landMemory.missingHistoryCount}
              </span>
              <span className="text-2xl font-bold font-mono text-amber-800 tabular-nums">
                {workspace.seasons.filter((s) => s.isIncomplete).length}
              </span>
            </div>
          </div>

          {/* Deterministic Learning Highlights or Empty Honest Onboarding */}
          {workspace.seasons.length === 0 ? (
            <div className="p-4 rounded-xl bg-white border border-stone-200 space-y-1.5">
              <h5 className="font-bold text-stone-900">{t.landMemory.emptySeasonsTitle}</h5>
              <p className="text-stone-600 leading-relaxed">{t.landMemory.emptySeasonsDesc}</p>
              {workspace.recommendations.length === 0 && (
                <p className="text-[11px] text-sky-800 pt-1">{t.landMemory.emptySnapshotsNotice}</p>
              )}
            </div>
          ) : (
            lc && (
              <div className="p-3.5 rounded-xl bg-white border border-stone-200 space-y-2">
                <h5 className="font-bold text-stone-900">{t.landMemory.recentHighlightsTitle}</h5>
                <p className="text-stone-700">
                  <span className="font-semibold">{t.landMemory.rememberedSequenceLabel}: </span>
                  {lc.rememberedSequenceCropIds.map(cropLabel).join(' → ')}
                </p>
                <p className="text-stone-600">
                  {language === 'ar'
                    ? lc.recommendationDelta.deltaSummaryAr
                    : language === 'fr'
                    ? lc.recommendationDelta.deltaSummaryFr
                    : lc.recommendationDelta.deltaSummaryEn}
                </p>
              </div>
            )
          )}
        </div>
      )}

      {/* VIEW 2: CHRONOLOGICAL TIMELINE */}
      {subView === 'timeline' && (
        <FieldSeasonTimeline
          timeline={workspace.timeline}
          seasons={workspace.seasons}
          onEditSeason={(season) => {
            setEditingSeason(season);
            setSubView('season_form');
          }}
          onDeleteSeason={(seasonId) => {
            deleteSeasonRecord(farm.id, ownerId, seasonId);
            reloadWorkspace();
          }}
          onJumpToComparison={(recId) => {
            setFocusedRecId(recId);
            setSubView('prediction_reality');
          }}
        />
      )}

      {/* VIEW 3: PREDICTION VS REALITY */}
      {subView === 'prediction_reality' && (
        <PredictionRealityPanel
          fieldId={farm.id}
          ownerId={ownerId}
          recommendations={workspace.recommendations}
          outcomes={workspace.outcomes}
          comparisons={workspace.comparisons}
          focusedRecommendationId={focusedRecId}
          onChanged={reloadWorkspace}
        />
      )}

      {/* VIEW 4: LAND FUTURES COMPARISON */}
      {subView === 'land_futures' && fm && (
        <LandFuturesComparison
          farm={farm}
          fieldMemory={fm}
          seasons={workspace.seasons}
          recommendations={workspace.recommendations}
          outcomes={workspace.outcomes}
          nasaPower={nasaPower}
          nasaGpm={nasaGpm}
          weather={weatherSeries}
          soil={soilHydraulics}
          farmerContext={farmerContext}
          transitionState={transitionState}
          isLoadingEnv={isLoadingEnv}
        />
      )}

      {/* VIEW 5: ADD / EDIT SEASON FORM */}
      {subView === 'season_form' && (
        <SeasonRecordForm
          fieldId={farm.id}
          ownerId={ownerId}
          editingSeason={editingSeason}
          onSaved={() => {
            setEditingSeason(null);
            reloadWorkspace();
            setSubView('timeline');
          }}
          onCancel={() => {
            setEditingSeason(null);
            setSubView('timeline');
          }}
        />
      )}

      {/* VIEW 6: DATA SOURCES & EVIDENCE DETAILS */}
      {subView === 'evidence_details' && (
        <EvidenceDetailsPanel
          provenanceEntries={workspace.provenanceEntries}
          environmentalSnapshots={workspace.environmentalSnapshots}
          nasaPower={nasaPower}
        />
      )}
    </div>
  );
};
