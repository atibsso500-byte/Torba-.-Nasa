/**
 * TURBA (تُربة) – Moroccan Agricultural Intelligence Platform
 * Main Application Orchestrator with Multilingual Support (Arabic, English, French)
 * Strict Data Integrity:
 * - Immediate invalidation of prior location data upon coordinate shift
 * - AbortController to prevent in-flight asynchronous race conditions
 * - Complete absence of mock/demonstration seeds
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  FarmRecord,
  Coordinates,
  AgriculturalClassification,
  NasaPowerObservation,
  NasaSmapObservation,
  NasaGpmObservation,
  Sentinel2Observation,
  CurrentWeatherObservation,
  CopernicusEra5LandSoil,
  DataProvenanceRecord,
} from './types/farm';
import {
  loadSavedFarms,
  deleteFarmRecord,
  createNewFarmRecord,
  getActiveFarmId,
  setActiveFarmId,
} from './services/farmStorage';
import { fetchNasaObservations } from './services/nasa';
import { fetchSentinel2Observations } from './services/copernicus';
import { classifyAgriculturalCoordinate } from './utils/geo';
import { validateCoordinates } from './utils/validation';
import { getZoneDisplayName } from './data/morocco';
import { AgriculturalMap } from './components/FarmMap';
import { EnvironmentalDashboard } from './components/Dashboard';
import { FarmListDrawer } from './components/FarmList';
import { FarmProfileModal } from './components/FarmProfile';
import { SystemStatusModal } from './components/SystemStatus';
import { QuotaBanner } from './components/QuotaBanner';
import { LanguageSelector } from './components/LanguageSelector';
import { LanguageProvider, useTranslation } from './i18n/language';
import {
  Layers,
  Sprout,
  ShieldCheck,
  Compass,
} from 'lucide-react';

function TurbaAppContent() {
  const apiKey = (import.meta as unknown as { env: Record<string, string> }).env.VITE_GOOGLE_MAPS_API_KEY || '';
  const { t, language, isRtl } = useTranslation();

  // Saved farms & active farm
  const [savedFarms, setSavedFarms] = useState<FarmRecord[]>([]);
  const [activeFarm, setActiveFarm] = useState<FarmRecord | null>(null);

  // Environmental observations
  const [currentWeather, setCurrentWeather] = useState<CurrentWeatherObservation | null>(null);
  const [nasaPower, setNasaPower] = useState<NasaPowerObservation | null>(null);
  const [nasaSmap, setNasaSmap] = useState<NasaSmapObservation | null>(null);
  const [era5LandSoil, setEra5LandSoil] = useState<CopernicusEra5LandSoil | null>(null);
  const [nasaGpm, setNasaGpm] = useState<NasaGpmObservation | null>(null);
  const [sentinel2, setSentinel2] = useState<Sentinel2Observation | null>(null);
  const [provenanceRecords, setProvenanceRecords] = useState<DataProvenanceRecord[]>([]);
  const [isLoadingEnv, setIsLoadingEnv] = useState<boolean>(false);

  // Active fetch abort controller to cancel stale in-flight requests when switching locations
  const abortControllerRef = useRef<AbortController | null>(null);

  // UI Modals & Drawers
  const [isFarmListOpen, setIsFarmListOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isDashboardExpanded, setIsDashboardExpanded] = useState(false);

  // Save Modal parameters
  const [pendingPolygon, setPendingPolygon] = useState<Coordinates[] | null>(null);
  const [pendingCentroid, setPendingCentroid] = useState<Coordinates>({ lat: 33.5, lng: -6.8 });
  const [pendingAreaHa, setPendingAreaHa] = useState<number>(0);
  const [pendingAreaM2, setPendingAreaM2] = useState<number>(0);
  const [pendingMethod, setPendingMethod] = useState<FarmRecord['identificationMethod']>('draw_polygon');
  const [resetDrawingTrigger, setResetDrawingTrigger] = useState<number>(0);
  const [dismissMapOverlaysTrigger, setDismissMapOverlaysTrigger] = useState<number>(0);

  const triggerDismissMapOverlays = useCallback(() => {
    setDismissMapOverlaysTrigger((prev) => prev + 1);
  }, []);

  // Load farms on mount (strictly returns empty array if no real farm was registered)
  useEffect(() => {
    const farms = loadSavedFarms();
    setSavedFarms(farms);
    const activeId = getActiveFarmId();
    if (activeId) {
      const found = farms.find((f) => f.id === activeId);
      if (found) {
        setActiveFarm(found);
      }
    }
  }, []);

  // Fetch real environmental data whenever the active farm changes
  const loadEnvironmentalDataForFarm = useCallback(async (farm: FarmRecord) => {
    // 1. Immediately abort previous in-flight request to avoid race condition
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // 2. Invalidate previous location data immediately (Rule 3)
    setCurrentWeather(null);
    setNasaPower(null);
    setNasaSmap(null);
    setEra5LandSoil(null);
    setNasaGpm(null);
    setSentinel2(null);
    setProvenanceRecords([]);
    setIsLoadingEnv(true);

    try {
      const [envResult, sentinelResult] = await Promise.allSettled([
  fetchNasaObservations(farm.centroid, controller.signal),
  fetchSentinel2Observations(farm.centroid, controller.signal),
]);

if (controller.signal.aborted) return;

if (envResult.status === 'fulfilled') {
  const envData = envResult.value;

  setCurrentWeather(envData.currentWeather);
  setNasaPower(envData.nasaPower);
  setNasaSmap(envData.nasaSmap);
  setEra5LandSoil(envData.era5LandSoil);
  setNasaGpm(envData.nasaGpm);
  setProvenanceRecords(envData.provenanceRecords);
} else {
  console.error('NASA data retrieval failed:', envResult.reason);
}

if (sentinelResult.status === 'fulfilled') {
  setSentinel2(sentinelResult.value);
} else {
  console.error('Sentinel-2 retrieval failed:', sentinelResult.reason);
}

      if (!controller.signal.aborted) {
        setCurrentWeather(envData.currentWeather);
        setNasaPower(envData.nasaPower);
        setNasaSmap(envData.nasaSmap);
        setEra5LandSoil(envData.era5LandSoil);
        setNasaGpm(envData.nasaGpm);
        setSentinel2(sentinelData);
        setProvenanceRecords(envData.provenanceRecords);
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        console.error('Failed to retrieve environmental data:', err);
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsLoadingEnv(false);
      }
    }
  }, []);

  useEffect(() => {
    if (activeFarm) {
      loadEnvironmentalDataForFarm(activeFarm);
    }
  }, [activeFarm, loadEnvironmentalDataForFarm]);

  // Handle map coordinate selection (Method 1)
  const handleSelectCoordinate = useCallback(
    (coords: Coordinates, classification?: AgriculturalClassification) => {
      const coordGeo = validateCoordinates(coords);
      const { zone, classification: calculatedClass } = classifyAgriculturalCoordinate(coords);
      const usedClass = classification || calculatedClass;

      let defaultName = '';
      let region = '';
      let province = '';

      if (coordGeo.geography.isMaritime) {
        defaultName = language === 'ar' ? coordGeo.geography.countryNameAr : language === 'fr' ? coordGeo.geography.countryNameFr : coordGeo.geography.countryNameEn;
        region = coordGeo.geography.countryNameFr;
        province = 'Eaux maritimes internationales';
      } else if (!coordGeo.geography.isMorocco) {
        defaultName = `${coordGeo.geography.countryNameFr} (${coords.lat.toFixed(4)}°, ${coords.lng.toFixed(4)}°)`;
        region = coordGeo.geography.countryNameFr;
        province = coordGeo.geography.regionHint;
      } else if (zone) {
        defaultName = getZoneDisplayName(zone, language);
        region = zone.region;
        province = zone.province;
      } else {
        defaultName = `${t.map.inspectedPoint} (${coords.lat.toFixed(4)}°, ${coords.lng.toFixed(4)}°)`;
        region = 'Maroc (Hors périmètre WorldCereal 10m)';
        province = 'Point géoréférencé non vérifié';
      }

      const tempRecord: FarmRecord = {
        id: `inspect-${coords.lat.toFixed(5)}-${coords.lng.toFixed(5)}`,
        farmerId: 'farmer-morocco',
        name: defaultName,
        region,
        province,
        centroid: coords,
        polygon: null,
        calculatedAreaHectares: 0,
        calculatedAreaM2: 0,
        identificationMethod: 'map_selection',
        classification: usedClass,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setActiveFarm(tempRecord);
    },
    [language, t.map.inspectedPoint]
  );

  // Handle Polygon completion from map (Method 3)
  const handleOpenSaveModal = (
    polygon: Coordinates[],
    areaHa: number,
    areaM2: number,
    coords: Coordinates
  ) => {
    triggerDismissMapOverlays();
    setPendingPolygon(polygon);
    setPendingCentroid(coords);
    setPendingAreaHa(areaHa);
    setPendingAreaM2(areaM2);
    setPendingMethod('draw_polygon');
    setIsSaveModalOpen(true);
  };

  // Handle saving confirmed farm
  const handleSaveFarm = (data: {
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
  }) => {
    const newRecord = createNewFarmRecord({
      name: data.name,
      notes: data.notes,
      cadastralReference: data.cadastralReference,
      region: data.region,
      province: data.province,
      centroid: data.centroid,
      polygon: data.polygon,
      calculatedAreaHectares: data.calculatedAreaHectares,
      calculatedAreaM2: data.calculatedAreaM2,
      identificationMethod: data.identificationMethod,
      classification: data.classification,
    });

    const updated = loadSavedFarms();
    setSavedFarms(updated);
    setActiveFarm(newRecord);
    setActiveFarmId(newRecord.id);
    setResetDrawingTrigger((prev) => prev + 1);
  };

  // Handle Farm Deletion
  const handleDeleteFarm = (id: string) => {
    const updated = deleteFarmRecord(id);
    setSavedFarms(updated);
    if (activeFarm?.id === id) {
      setActiveFarm(updated[0] || null);
    }
  };

  // Handle Method 4: Manual coordinate entry
  const handleEnterCoordinates = (coords: Coordinates, label?: string) => {
    const coordGeo = validateCoordinates(coords);
    const { zone, classification } = classifyAgriculturalCoordinate(coords);

    let defaultName = '';
    let region = '';
    let province = '';

    if (coordGeo.geography.isMaritime) {
      defaultName = label || (language === 'ar' ? coordGeo.geography.countryNameAr : language === 'fr' ? coordGeo.geography.countryNameFr : coordGeo.geography.countryNameEn);
      region = coordGeo.geography.countryNameFr;
      province = 'Eaux maritimes internationales';
    } else if (!coordGeo.geography.isMorocco) {
      defaultName = label || `${coordGeo.geography.countryNameFr} (${coords.lat.toFixed(4)}°, ${coords.lng.toFixed(4)}°)`;
      region = coordGeo.geography.countryNameFr;
      province = coordGeo.geography.regionHint;
    } else if (zone) {
      defaultName = label || getZoneDisplayName(zone, language);
      region = zone.region;
      province = zone.province;
    } else {
      defaultName = label || `${t.map.inspectedPoint} (${coords.lat.toFixed(5)}°, ${coords.lng.toFixed(5)}°)`;
      region = 'Maroc (Hors périmètre WorldCereal 10m)';
      province = 'Point géoréférencé non vérifié';
    }

    const tempRecord: FarmRecord = {
      id: `coord-${Date.now()}`,
      farmerId: 'farmer-morocco',
      name: defaultName,
      region,
      province,
      centroid: coords,
      polygon: null,
      calculatedAreaHectares: 0,
      calculatedAreaM2: 0,
      identificationMethod: 'coordinates_entry',
      classification,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setActiveFarm(tempRecord);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-stone-100 text-stone-900 overflow-hidden font-sans">
      {/* Google Maps Quota Defense Banner */}
      <QuotaBanner />

      {/* Main Top Header with Language Switcher */}
      <header className="h-14 bg-white border-b border-stone-200 px-3 sm:px-4 flex items-center justify-between shrink-0 z-30 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-800 flex items-center justify-center shadow-sm shadow-emerald-700/30 border border-emerald-500/20">
              <Sprout className="w-4 h-4 text-emerald-50" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-base tracking-tight text-stone-900 flex items-center gap-1.5">
                  TURBA <span className="text-emerald-700 font-bold text-xs font-sans" dir="rtl">(تُربة)</span>
                </h1>
                <span className="hidden sm:inline-block text-[10px] font-mono uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 font-semibold">
                  {t.header.realMorocco}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons: Language Selector + Real Data Audit + My Parcels */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Top Navbar Language Selector Button */}
          <LanguageSelector
            onOpenChange={(open) => {
              if (open) triggerDismissMapOverlays();
            }}
          />

          {/* Status Modal Trigger */}
          <button
            onClick={() => {
              triggerDismissMapOverlays();
              setIsStatusModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200 text-xs font-medium text-stone-700 hover:text-stone-900 transition-colors shadow-xs"
            title={t.common.auditButtonTooltip}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="hidden md:inline">{t.common.auditButton}</span>
          </button>

          {/* Farm Drawer Trigger */}
          <button
            onClick={() => {
              triggerDismissMapOverlays();
              setIsFarmListOpen(true);
            }}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm shadow-emerald-600/30 transition-colors shrink-0"
          >
            <Layers className="w-3.5 h-3.5 shrink-0" />
            <span>
              {t.common.parcelsButton} ({savedFarms.length})
            </span>
          </button>
        </div>
      </header>

      {/* Main Split Body: Map (Left/Center) + Environmental Intelligence (Right) */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Left: Agricultural Map of Morocco */}
        <div
          className={`${
            isDashboardExpanded ? 'hidden lg:block lg:w-[380px] xl:w-[440px]' : 'flex-1'
          } h-1/2 lg:h-full relative overflow-hidden bg-stone-100`}
        >
          <AgriculturalMap
            apiKey={apiKey}
            activeFarm={activeFarm}
            savedFarms={savedFarms}
            onSelectCoordinate={handleSelectCoordinate}
            onSelectFarm={(farm) => {
              setActiveFarm(farm);
              setActiveFarmId(farm.id);
            }}
            onOpenSaveModal={handleOpenSaveModal}
            resetDrawingTrigger={resetDrawingTrigger}
            dismissOverlaysTrigger={dismissMapOverlaysTrigger}
          />
        </div>

        {/* Right: Environmental Dashboard & Smart Irrigation Engine */}
        <div
          className={`${
            isDashboardExpanded ? 'flex-1 h-full' : 'w-full lg:w-[420px] xl:w-[460px] h-1/2 lg:h-full'
          } shrink-0 flex flex-col bg-stone-50 border-t lg:border-t-0 ${
            isRtl ? 'lg:border-r' : 'lg:border-l'
          } border-stone-200 shadow-xl z-10`}
        >
          {activeFarm ? (
            <EnvironmentalDashboard
              farm={activeFarm}
              currentWeather={currentWeather}
              nasaPower={nasaPower}
              nasaSmap={nasaSmap}
              era5LandSoil={era5LandSoil}
              nasaGpm={nasaGpm}
              sentinel2={sentinel2}
              provenanceRecords={provenanceRecords}
              isLoading={isLoadingEnv}
              onRefresh={() => loadEnvironmentalDataForFarm(activeFarm)}
              isExpanded={isDashboardExpanded}
              onToggleExpand={() => setIsDashboardExpanded((prev) => !prev)}
              onOverlayOrTabInteraction={triggerDismissMapOverlays}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-3 text-stone-500 bg-white">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shadow-xs">
                <Compass className="w-8 h-8 text-emerald-600 animate-pulse" />
              </div>
              <p className="text-sm font-bold text-stone-800">{t.dashboard.emptyPromptTitle}</p>
              <p className="text-xs text-stone-500 max-w-xs leading-relaxed">
                {t.dashboard.emptyPromptDesc}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Farm List Drawer (Portaled to document.body at z-[9999]) */}
      {typeof document !== 'undefined' &&
        createPortal(
          <FarmListDrawer
            isOpen={isFarmListOpen}
            onClose={() => setIsFarmListOpen(false)}
            savedFarms={savedFarms}
            activeFarmId={activeFarm?.id || null}
            onSelectFarm={(farm) => {
              setActiveFarm(farm);
              setActiveFarmId(farm.id);
            }}
            onDeleteFarm={handleDeleteFarm}
            onEnterCoordinates={handleEnterCoordinates}
          />,
          document.body
        )}

      {/* Save Farm Profile Modal (Portaled to document.body at z-[9999]) */}
      {typeof document !== 'undefined' &&
        createPortal(
          <FarmProfileModal
            key={`farm-profile-modal-${isSaveModalOpen}-${pendingCentroid.lat}-${pendingCentroid.lng}`}
            isOpen={isSaveModalOpen}
            onClose={() => setIsSaveModalOpen(false)}
            polygon={pendingPolygon}
            centroid={pendingCentroid}
            areaHa={pendingAreaHa}
            areaM2={pendingAreaM2}
            identificationMethod={pendingMethod}
            onSave={handleSaveFarm}
          />,
          document.body
        )}

      {/* Real Systems Status & Verification Modal (Portaled to document.body at z-[9999]) */}
      {typeof document !== 'undefined' &&
        createPortal(
          <SystemStatusModal
            isOpen={isStatusModalOpen}
            onClose={() => setIsStatusModalOpen(false)}
            mapsConnected={Boolean(apiKey)}
            nasaPowerConnected={Boolean(nasaPower?.dataStatus === 'VERIFIED')}
            nasaSmapConnected={Boolean(nasaSmap?.dataStatus === 'VERIFIED')}
            nasaGpmConnected={Boolean(nasaGpm?.dataStatus === 'VERIFIED')}
            sentinel2Connected={Boolean(sentinel2?.dataStatus === 'METADATA_ONLY' || sentinel2?.dataStatus === 'VERIFIED')}
            isGpsAcquired={activeFarm?.identificationMethod === 'gps'}
            isMoroccanBasinActive={activeFarm ? activeFarm.classification.status === 'confirmed_agricultural' : true}
            onSelectTestLocation={handleEnterCoordinates}
          />,
          document.body
        )}
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <TurbaAppContent />
    </LanguageProvider>
  );
}
