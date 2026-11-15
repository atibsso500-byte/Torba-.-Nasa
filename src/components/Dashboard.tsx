/**
 * TURBA Scientific Environmental Dashboard
 * Connected to NASA POWER (MERRA-2 / GEOS-FP), Open-Meteo NWP model output,
 * and the Copernicus Sentinel-2 L2A catalogue (metadata only; no NDVI computed).
 *
 * Strict Scientific Integrity:
 * - Clear separation of Instantaneous Weather, Daily Assimilated Mean, and 30-day History.
 * - Clear separation of MERRA-2 Soil Wetness Index (0-1) and Open-Meteo NWP Volumetric Water (m³/m³).
 * - Direct spectral NDVI formula (B8 - B4) / (B8 + B4). Zero synthetic NDVI.
 * - Section 5 Professional Color System with sleek group-colored borders.
 * - Comprehensive Data Provenance inspection on every reading.
 */

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  FarmRecord,
  NasaPowerObservation,
  NasaSmapObservation,
  NasaGpmObservation,
  Sentinel2Observation,
  CurrentWeatherObservation,
  CopernicusEra5LandSoil,
  DataProvenanceRecord,
  FreshnessStatus,
  DataStatus,
} from '../types/farm';
import { useTranslation } from '../i18n/language';
import { Translations } from '../i18n/translations';
import { DataProvenanceModal } from './DataSources';
import { IrrigationEnginePanel } from './irrigation/IrrigationPanel';
import { LandMemoryDashboard } from './memory/MemoryDashboard';
import { syncFieldAndCaptureEnvironment } from '../services/memory/service';
import { formatCoordinates } from '../utils/geo';
import {
  Thermometer,
  Droplets,
  Wind,
  Sun,
  CloudRain,
  Sprout,
  Activity,
  Calendar,
  Info,
  Clock,
  ShieldCheck,
  AlertCircle,
  TrendingUp,
  MapPin,
  CheckCircle2,
  Waves,
  History,
} from 'lucide-react';

interface EnvironmentalDashboardProps {
  farm: FarmRecord;
  currentWeather: CurrentWeatherObservation | null;
  nasaPower: NasaPowerObservation | null;
  nasaSmap: NasaSmapObservation | null;
  era5LandSoil: CopernicusEra5LandSoil | null;
  nasaGpm: NasaGpmObservation | null;
  sentinel2: Sentinel2Observation | null;
  provenanceRecords: DataProvenanceRecord[];
  isLoading: boolean;
  onRefresh: () => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  onOverlayOrTabInteraction?: () => void;
}

type TabKey = 'weather' | 'soil' | 'rainfall' | 'vegetation' | 'irrigation' | 'landMemory';

export const EnvironmentalDashboard: React.FC<EnvironmentalDashboardProps> = ({
  farm,
  currentWeather,
  nasaPower,
  nasaSmap,
  era5LandSoil,
  nasaGpm,
  sentinel2,
  provenanceRecords,
  isLoading,
  onRefresh,
  isExpanded = false,
  onToggleExpand,
  onOverlayOrTabInteraction,
}) => {
  const { t, language, isRtl } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabKey>('weather');
  const [isProvenanceModalOpen, setIsProvenanceModalOpen] = useState(false);

  const handleSelectTab = (tab: TabKey) => {
    setActiveTab(tab);
    onOverlayOrTabInteraction?.();
  };

  useEffect(() => {
    if (isLoading) return;
    if (!currentWeather && !nasaPower && !nasaSmap && !era5LandSoil && !nasaGpm && !sentinel2) {
      return;
    }
    syncFieldAndCaptureEnvironment({
      farm,
      currentWeather,
      nasaPower,
      nasaSmap,
      era5LandSoil,
      nasaGpm,
      sentinel2,
    });
  }, [
    farm,
    isLoading,
    currentWeather,
    nasaPower,
    nasaSmap,
    era5LandSoil,
    nasaGpm,
    sentinel2,
  ]);

  const handleOpenProvenanceModal = () => {
    onOverlayOrTabInteraction?.();
    setIsProvenanceModalOpen(true);
  };

  // Status badge with clean light color styling
  const renderFreshnessBadge = (freshness: FreshnessStatus | undefined, dataStatus?: DataStatus) => {
    if (dataStatus === 'UNAVAILABLE' || freshness === 'unavailable' || !freshness) {
      return (
        <span className="text-[10px] font-mono font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md border border-stone-300 flex items-center gap-1">
          <AlertCircle className="w-3 h-3 text-stone-400" />
          {t.common.unavailable}
        </span>
      );
    }

    switch (freshness) {
      case 'fresh':
        return (
          <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-300 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            {t.common.fresh}
          </span>
        );
      case 'delayed':
        return (
          <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-300">
            {t.common.delayed}
          </span>
        );
      case 'stale':
        return (
          <span className="text-[10px] font-mono font-bold text-orange-800 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-300">
            {t.common.stale}
          </span>
        );
    }
  };

  return (
    <div className={`flex flex-col h-full bg-stone-50 ${isRtl ? 'border-r' : 'border-l'} border-stone-200 text-stone-900 overflow-hidden`}>
      {/* Farm Header */}
      <div className="p-4 bg-white border-b border-stone-200 flex items-start justify-between gap-3 shrink-0 shadow-2xs">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 shadow-sm shadow-emerald-500/50 animate-pulse" />
            <h2 className="text-base font-bold text-stone-900 truncate">{farm.name}</h2>
          </div>
          <p className="text-xs text-stone-500 mt-0.5 truncate flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>
              {farm.province}, {farm.region} •{' '}
              <span className="font-mono text-emerald-700 font-bold" dir="ltr">
                {farm.calculatedAreaHectares > 0 ? `${farm.calculatedAreaHectares} ${t.common.hectares}` : t.map.pointMarkerTitle}
              </span>
              {' • '}
              <span className="font-mono text-stone-500" dir="ltr">
                {formatCoordinates(farm.centroid, 5)}
              </span>
            </span>
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleOpenProvenanceModal}
            className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 hover:text-emerald-900 transition-colors text-xs flex items-center gap-1.5 shadow-xs"
            title={t.dashboard.inspectProvenanceButton}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
            <span className="hidden sm:inline font-mono font-semibold">{t.dashboard.inspectProvenanceButton}</span>
          </button>

          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-2 rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-700 hover:text-stone-900 transition-colors disabled:opacity-50 text-xs flex items-center gap-1.5 shadow-xs"
            title={t.common.refresh}
          >
            <Activity className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="grid grid-cols-6 border-b border-stone-200 bg-stone-100/90 text-[10px] sm:text-[11px] font-semibold shrink-0">
        <button
          onClick={() => handleSelectTab('weather')}
          className={`py-2.5 px-1 flex flex-col items-center justify-center gap-1 transition-all border-b-2 ${
            activeTab === 'weather'
              ? 'border-emerald-600 text-emerald-800 bg-white font-bold shadow-2xs'
              : 'border-transparent text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
          }`}
        >
          <Thermometer className="w-4 h-4 text-emerald-700" />
          <span className="truncate max-w-full">{t.dashboard.tabWeather}</span>
        </button>

        <button
          onClick={() => handleSelectTab('soil')}
          className={`py-2.5 px-1 flex flex-col items-center justify-center gap-1 transition-all border-b-2 ${
            activeTab === 'soil'
              ? 'border-emerald-600 text-emerald-800 bg-white font-bold shadow-2xs'
              : 'border-transparent text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
          }`}
        >
          <Droplets className="w-4 h-4 text-emerald-700" />
          <span className="truncate max-w-full">{t.dashboard.tabSoil}</span>
        </button>

        <button
          onClick={() => handleSelectTab('rainfall')}
          className={`py-2.5 px-1 flex flex-col items-center justify-center gap-1 transition-all border-b-2 ${
            activeTab === 'rainfall'
              ? 'border-emerald-600 text-emerald-800 bg-white font-bold shadow-2xs'
              : 'border-transparent text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
          }`}
        >
          <CloudRain className="w-4 h-4 text-emerald-700" />
          <span className="truncate max-w-full">{t.dashboard.tabRainfall}</span>
        </button>

        <button
          onClick={() => handleSelectTab('vegetation')}
          className={`py-2.5 px-1 flex flex-col items-center justify-center gap-1 transition-all border-b-2 ${
            activeTab === 'vegetation'
              ? 'border-emerald-600 text-emerald-800 bg-white font-bold shadow-2xs'
              : 'border-transparent text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
          }`}
        >
          <Sprout className="w-4 h-4 text-emerald-700" />
          <span className="truncate max-w-full">{t.dashboard.tabVegetation}</span>
        </button>

        <button
          onClick={() => handleSelectTab('irrigation')}
          className={`py-2.5 px-1 flex flex-col items-center justify-center gap-1 transition-all border-b-2 ${
            activeTab === 'irrigation'
              ? 'border-emerald-600 text-emerald-800 bg-white font-bold shadow-2xs'
              : 'border-transparent text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
          }`}
        >
          <Waves className="w-4 h-4 text-emerald-700" />
          <span className="truncate max-w-full">{t.dashboard.tabIrrigation}</span>
        </button>

        <button
          onClick={() => handleSelectTab('landMemory')}
          className={`py-2.5 px-1 flex flex-col items-center justify-center gap-1 transition-all border-b-2 ${
            activeTab === 'landMemory'
              ? 'border-emerald-600 text-emerald-800 bg-white font-bold shadow-2xs'
              : 'border-transparent text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
          }`}
        >
          <History className="w-4 h-4 text-emerald-700" />
          <span className="truncate max-w-full">{t.dashboard.tabLandMemory}</span>
        </button>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-xs text-emerald-900 font-medium">
            <div className="w-4 h-4 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
            <span>{t.dashboard.connectingServers}</span>
          </div>
        )}

        {/* TAB 1: WEATHER (Strict separation: Instantaneous vs Daily Mean vs Extremes) */}
        {activeTab === 'weather' && (
          <div className="space-y-4">
            {/* 1. Current / Instantaneous Observation Card */}
            <div className="p-4 rounded-2xl bg-white border border-sky-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-sky-800 block">
                    {t.dashboard.currentObservationTitle}
                  </span>
                  <span className="text-[10px] text-stone-500 font-mono block">
                    {t.dashboard.instantaneousSubtitle}
                  </span>
                </div>
                {renderFreshnessBadge(currentWeather?.freshness, currentWeather?.dataStatus)}
              </div>

              {currentWeather?.dataStatus === 'VERIFIED' ? (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  {/* Current Temp */}
                  <div className="bg-sky-50/50 p-3 rounded-xl border border-sky-100">
                    <span className="text-[11px] text-stone-600 block">{t.dashboard.airTemperature}</span>
                    <div className="mt-1 flex items-baseline gap-1" dir="ltr">
                      <span className="text-3xl font-extrabold font-mono text-stone-900">
                        {currentWeather.temperature2m !== null ? `${currentWeather.temperature2m}°C` : t.common.notAvailable}
                      </span>
                    </div>
                    {currentWeather.apparentTemperature !== null && (
                      <span className="text-[10px] text-stone-500 font-mono block mt-1" dir="ltr">
                        {t.dashboard.apparentTemp}: {currentWeather.apparentTemperature}°C
                      </span>
                    )}
                  </div>

                  {/* Relative Humidity */}
                  <div className="bg-sky-50/50 p-3 rounded-xl border border-sky-100">
                    <span className="text-[11px] text-stone-600 block">{t.dashboard.relativeHumidity}</span>
                    <div className="mt-1 flex items-baseline gap-1" dir="ltr">
                      <span className="text-3xl font-extrabold font-mono text-stone-900">
                        {currentWeather.relativeHumidity2m !== null ? `${currentWeather.relativeHumidity2m}%` : t.common.notAvailable}
                      </span>
                    </div>
                    <span className="text-[10px] text-stone-500 font-mono block mt-1" dir="ltr">
                      Wind: {currentWeather.windSpeed10m !== null ? `${currentWeather.windSpeed10m} m/s` : t.common.notAvailable}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-3 text-center text-xs text-stone-500">
                  {t.common.dataUnavailable}
                </div>
              )}

              {/* Timezone & Time disclosure */}
              <div className="text-[10px] text-stone-500 font-mono flex items-center justify-between border-t border-stone-100 pt-2" dir="ltr">
                <span>Obs Time: {currentWeather?.observationTime}</span>
                <span>TZ: {currentWeather?.timezone}</span>
              </div>
            </div>

            {/* 2. Daily Assimilated Agroclimatology (NASA POWER MERRA-2) */}
            <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-900 block">
                    {t.dashboard.dailyMeanTitle}
                  </span>
                  <span className="text-[10px] text-stone-500 font-mono block">
                    NASA POWER • MERRA-2 / GEOS-FP
                  </span>
                </div>
                {renderFreshnessBadge(nasaPower?.freshness, nasaPower?.dataStatus)}
              </div>

              {nasaPower?.dataStatus === 'VERIFIED' ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    {/* T2M Daily Mean */}
                    <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
                      <div className="flex items-center justify-between text-stone-600 text-xs">
                        <span>T2M Daily Mean</span>
                        <Thermometer className="w-4 h-4 text-amber-600" />
                      </div>
                      <div className="mt-1 flex items-baseline gap-1" dir="ltr">
                        <span className="text-2xl font-bold font-mono text-stone-900">
                          {nasaPower.temperature2m !== null ? `${nasaPower.temperature2m}°C` : t.common.notAvailable}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[10px] text-stone-500 font-mono" dir="ltr">
                        <span>Min: {nasaPower.temperatureMin !== null ? `${nasaPower.temperatureMin}°C` : 'N/A'}</span>
                        <span>Max: {nasaPower.temperatureMax !== null ? `${nasaPower.temperatureMax}°C` : 'N/A'}</span>
                      </div>
                    </div>

                    {/* Solar Radiation */}
                    <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
                      <div className="flex items-center justify-between text-stone-600 text-xs">
                        <span>{t.dashboard.solarRadiation}</span>
                        <Sun className="w-4 h-4 text-amber-600" />
                      </div>
                      <div className="mt-1 flex items-baseline gap-1" dir="ltr">
                        <span className="text-2xl font-bold font-mono text-stone-900">
                          {nasaPower.solarRadiation !== null ? `${nasaPower.solarRadiation}` : t.common.notAvailable}
                        </span>
                        <span className="text-xs text-stone-500">MJ/m²/d</span>
                      </div>
                      <span className="text-[10px] text-stone-500 font-mono block mt-1">
                        CERES / GEOS-IT
                      </span>
                    </div>

                    {/* Wind Speed (2m) */}
                    <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
                      <div className="flex items-center justify-between text-stone-600 text-xs">
                        <span>{t.dashboard.windSpeed}</span>
                        <Wind className="w-4 h-4 text-emerald-700" />
                      </div>
                      <div className="mt-1 flex items-baseline gap-1" dir="ltr">
                        <span className="text-xl font-bold font-mono text-stone-900">
                          {nasaPower.windSpeed2m !== null ? `${nasaPower.windSpeed2m} m/s` : t.common.notAvailable}
                        </span>
                      </div>
                      <span className="text-[10px] text-stone-500 font-mono block mt-1" dir="ltr">
                        {nasaPower.windSpeed2m !== null ? `~${(nasaPower.windSpeed2m * 3.6).toFixed(1)} km/h` : ''}
                      </span>
                    </div>

                    {/* Relative Humidity (2m) */}
                    <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
                      <div className="flex items-center justify-between text-stone-600 text-xs">
                        <span>RH2M Daily</span>
                        <Droplets className="w-4 h-4 text-sky-600" />
                      </div>
                      <div className="mt-1 flex items-baseline gap-1" dir="ltr">
                        <span className="text-xl font-bold font-mono text-stone-900">
                          {nasaPower.relativeHumidity2m !== null ? `${nasaPower.relativeHumidity2m}%` : t.common.notAvailable}
                        </span>
                      </div>
                      <span className="text-[10px] text-stone-500 font-mono block mt-1">
                        Assimilated grid cell
                      </span>
                    </div>
                  </div>

                  {/* 30-Day Thermal History Chart */}
                  {nasaPower.dailyHistory.length > 0 && (
                    <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-stone-800 flex items-center gap-1.5">
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                          {t.dashboard.thermalHistoryTitle}
                        </span>
                        <span className="text-[11px] text-stone-500 font-mono">
                          {t.dashboard.lastOverpass} {nasaPower.observationDateUtc}
                        </span>
                      </div>

                      <div className="h-16 flex items-end gap-1 pt-2">
                        {nasaPower.dailyHistory.slice(-20).map((h, i) => {
                          const temp = h.temperature !== null ? h.temperature : 15;
                          const heightPct = Math.max(15, Math.min(100, ((temp - 5) / 30) * 100));
                          return (
                            <div
                              key={i}
                              className="flex-1 bg-emerald-600/30 hover:bg-emerald-600 transition-colors rounded-t group relative cursor-pointer"
                              style={{ height: `${heightPct}%` }}
                              title={`${h.date}: ${h.temperature !== null ? `${h.temperature}°C` : t.common.notAvailable}`}
                            />
                          );
                        })}
                      </div>
                      <div className="flex justify-between text-[10px] text-stone-500 font-mono">
                        <span>{t.dashboard.daysAgo20}</span>
                        <span>{t.dashboard.daysAgo10}</span>
                        <span>{nasaPower.observationDateUtc}</span>
                      </div>
                    </div>
                  )}

                  {/* Scientific Attribution Footnote */}
                  <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 text-xs space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-stone-600 font-mono">
                      <span>Source: NASA POWER (MERRA-2)</span>
                      <span>Res: ~50 km (0.5°x0.625°)</span>
                    </div>
                    <p className="text-[10px] text-stone-500 italic">
                      {t.dashboard.nasaDelayNotice}
                    </p>
                  </div>
                </>
              ) : (
                <div className="p-4 text-center text-xs text-stone-500">
                  {t.common.dataUnavailable}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: SOIL MOISTURE (Strict separation: MERRA-2 Wetness Index 0-1 vs NWP Volumetric m³/m³) */}
        {activeTab === 'soil' && (
          <div className="space-y-4">
            {/* 1. Open-Meteo NWP Volumetric Soil Moisture Layers */}
            <div className="p-4 rounded-2xl bg-white border border-sky-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-sky-800 block">
                    {t.dashboard.era5SoilTitle}
                  </span>
                  <span className="text-[10px] text-stone-500 font-mono block">
                    Open-Meteo NWP Soil Model (resolution depends on the underlying model, ~0.1°–0.25°) • Volumetric Water Content (m³/m³)
                  </span>
                </div>
                {renderFreshnessBadge(era5LandSoil?.freshness, era5LandSoil?.dataStatus)}
              </div>

              {era5LandSoil?.dataStatus === 'VERIFIED' ? (
                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  {/* Layer 1: 0-7 cm */}
                  <div className="bg-sky-50/50 p-3 rounded-xl border border-sky-100">
                    <span className="text-[11px] text-stone-600 block">{t.dashboard.era5Layer0_7}</span>
                    <div className="mt-1 flex items-baseline gap-1" dir="ltr">
                      <span className="text-2xl font-bold font-mono text-sky-900">
                        {era5LandSoil.layer0_7cm !== null ? `${era5LandSoil.layer0_7cm}` : t.common.notAvailable}
                      </span>
                      <span className="text-xs text-stone-500">m³/m³</span>
                    </div>
                    <span className="text-[10px] text-stone-500 font-mono block mt-0.5">Topsoil layer</span>
                  </div>

                  {/* Layer 2: 7-28 cm */}
                  <div className="bg-sky-50/50 p-3 rounded-xl border border-sky-100">
                    <span className="text-[11px] text-stone-600 block">{t.dashboard.era5Layer7_28}</span>
                    <div className="mt-1 flex items-baseline gap-1" dir="ltr">
                      <span className="text-2xl font-bold font-mono text-sky-900">
                        {era5LandSoil.layer7_28cm !== null ? `${era5LandSoil.layer7_28cm}` : t.common.notAvailable}
                      </span>
                      <span className="text-xs text-stone-500">m³/m³</span>
                    </div>
                    <span className="text-[10px] text-stone-500 font-mono block mt-0.5">Upper root zone</span>
                  </div>

                  {/* Layer 3: 28-100 cm */}
                  <div className="bg-sky-50/50 p-3 rounded-xl border border-sky-100">
                    <span className="text-[11px] text-stone-600 block">{t.dashboard.era5Layer28_100}</span>
                    <div className="mt-1 flex items-baseline gap-1" dir="ltr">
                      <span className="text-2xl font-bold font-mono text-sky-900">
                        {era5LandSoil.layer28_100cm !== null ? `${era5LandSoil.layer28_100cm}` : t.common.notAvailable}
                      </span>
                      <span className="text-xs text-stone-500">m³/m³</span>
                    </div>
                    <span className="text-[10px] text-stone-500 font-mono block mt-0.5">Deep root zone</span>
                  </div>

                  {/* Layer 4: 100-255 cm */}
                  <div className="bg-sky-50/50 p-3 rounded-xl border border-sky-100">
                    <span className="text-[11px] text-stone-600 block">{t.dashboard.era5Layer100_255}</span>
                    <div className="mt-1 flex items-baseline gap-1" dir="ltr">
                      <span className="text-2xl font-bold font-mono text-sky-900">
                        {era5LandSoil.layer100_255cm !== null ? `${era5LandSoil.layer100_255cm}` : t.common.notAvailable}
                      </span>
                      <span className="text-xs text-stone-500">m³/m³</span>
                    </div>
                    <span className="text-[10px] text-stone-500 font-mono block mt-0.5">Subsoil layer</span>
                  </div>
                </div>
              ) : (
                <div className="p-4 text-center text-xs text-stone-500">
                  {t.common.dataUnavailable}
                </div>
              )}

              <p className="text-[10px] text-stone-500 italic pt-1 border-t border-stone-100">
                {t.dashboard.era5SourceNote}
              </p>
            </div>

            {/* 2. NASA MERRA-2 (POWER) Soil Wetness Index (0 to 1 Dimensionless scale) */}
            <div className="p-4 rounded-2xl bg-white border border-amber-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-900 block">
                    NASA POWER • Soil Wetness Index
                  </span>
                  <span className="text-[10px] text-stone-500 font-mono block">
                    MERRA-2 Assimilation (0-1) • Surface & Root Zone
                  </span>
                </div>
                {renderFreshnessBadge(nasaSmap?.freshness, nasaSmap?.dataStatus)}
              </div>

              {nasaSmap?.dataStatus === 'VERIFIED' ? (
                <>
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    {/* Root Zone Wetness Index */}
                    <div className="bg-amber-50/40 p-3 rounded-xl border border-amber-200/70">
                      <span className="text-[11px] text-stone-600 block">{t.dashboard.rootZoneMoisture}</span>
                      <div className="mt-1 flex items-baseline gap-1" dir="ltr">
                        <span className="text-2xl font-bold font-mono text-amber-950">
                          {nasaSmap.rootZoneSoilMoistureIndex !== null ? `${nasaSmap.rootZoneSoilMoistureIndex}` : t.common.notAvailable}
                        </span>
                        <span className="text-xs text-stone-500">{t.dashboard.rootZoneIndexLabel}</span>
                      </div>
                      <span className="text-[10px] text-stone-500 font-mono block mt-1">
                        GWETROOT (0-1 scale)
                      </span>
                    </div>

                    {/* Surface Wetness Index */}
                    <div className="bg-amber-50/40 p-3 rounded-xl border border-amber-200/70">
                      <span className="text-[11px] text-stone-600 block">{t.dashboard.surfaceMoisture}</span>
                      <div className="mt-1 flex items-baseline gap-1" dir="ltr">
                        <span className="text-2xl font-bold font-mono text-amber-950">
                          {nasaSmap.surfaceSoilMoistureIndex !== null ? `${nasaSmap.surfaceSoilMoistureIndex}` : t.common.notAvailable}
                        </span>
                        <span className="text-xs text-stone-500">{t.dashboard.surfaceMoistureIndexLabel}</span>
                      </div>
                      <span className="text-[10px] text-stone-500 font-mono block mt-1">
                        GWETTOP (0-1 scale)
                      </span>
                    </div>
                  </div>

                  {/* NASA MERRA-2 Dimensionless Scale Definition (Phase 2 Checklist Item 8) */}
                  <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200/80 flex flex-col gap-1 text-xs">
                    <span className="text-amber-950 font-semibold flex items-center justify-between">
                      <span>NASA MERRA-2 Wetness Index Scale</span>
                      <span className="font-mono text-[11px] text-amber-800 font-bold">0.00 – 1.00</span>
                    </span>
                    <p className="text-[11px] text-amber-900/80 leading-relaxed">
                      0.00 = Point de flétrissement sec (Wilting point / نقطة الذبول) • 1.00 = Saturation totale du sol (Complete saturation / تشبع تام).
                    </p>
                  </div>

                  <p className="text-[10px] text-stone-500 italic">
                    {t.dashboard.smapResolutionNoticeDesc}
                  </p>
                </>
              ) : (
                <div className="p-4 text-center text-xs text-stone-500">
                  {t.common.dataUnavailable}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: RAINFALL (NASA POWER PRECTOTCORR Daily & Climatology) */}
        {activeTab === 'rainfall' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-white border border-sky-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-sky-800 block">
                    {t.dashboard.rainfallHeader}
                  </span>
                  <span className="text-[10px] text-stone-500 font-mono block">
                    NASA POWER PRECTOTCORR • MERRA-2 Assimilation
                  </span>
                </div>
                {renderFreshnessBadge(nasaGpm?.freshness, nasaGpm?.dataStatus)}
              </div>

              {nasaGpm?.dataStatus === 'VERIFIED' ? (
                <>
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    {/* Daily Rainfall */}
                    <div className="bg-sky-50/50 p-3 rounded-xl border border-sky-100">
                      <span className="text-[11px] text-stone-600 block">{t.dashboard.dailyRainfall}</span>
                      <div className="mt-1 flex items-baseline gap-1" dir="ltr">
                        <span className="text-2xl font-bold font-mono text-stone-900">
                          {nasaGpm.dailyRainfallMm !== null ? `${nasaGpm.dailyRainfallMm}` : t.common.notAvailable}
                        </span>
                        <span className="text-xs text-stone-500">mm</span>
                      </div>
                      <span className="text-[10px] text-stone-500 font-mono block mt-1">
                        {t.dashboard.obsFrom} {nasaGpm.observationDateUtc}
                      </span>
                    </div>

                    {/* 30-Day Accumulation */}
                    <div className="bg-sky-50/50 p-3 rounded-xl border border-sky-100">
                      <span className="text-[11px] text-stone-600 block">{t.dashboard.monthlyAccumulation}</span>
                      <div className="mt-1 flex items-baseline gap-1" dir="ltr">
                        <span className="text-2xl font-bold font-mono text-stone-900">
                          {nasaGpm.monthlyAccumulationMm !== null ? `${nasaGpm.monthlyAccumulationMm}` : t.common.notAvailable}
                        </span>
                        <span className="text-xs text-stone-500">mm</span>
                      </div>
                      <span className="text-[10px] text-stone-500 font-mono block mt-1">
                        Normale: {nasaGpm.historicalAverageMonthlyMm !== null ? `~${nasaGpm.historicalAverageMonthlyMm} mm` : 'N/A'}
                      </span>
                    </div>
                  </div>

                  {/* Anomaly Comparison */}
                  {nasaGpm.anomalyPercent !== null && (
                    <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200 flex items-center justify-between">
                      <div>
                        <span className="text-xs text-stone-600 block">{t.dashboard.anomalyComparisonTitle}</span>
                        <span
                          className={`text-sm font-bold font-mono ${
                            nasaGpm.anomalyPercent >= 0 ? 'text-emerald-700' : 'text-rose-600'
                          }`}
                          dir="ltr"
                        >
                          {nasaGpm.anomalyPercent >= 0 ? `+${nasaGpm.anomalyPercent}%` : `${nasaGpm.anomalyPercent}%`}
                        </span>
                      </div>

                      <div className="text-end text-[11px] text-stone-500 font-mono whitespace-pre-line">
                        {t.dashboard.climatology30Year}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="p-4 text-center text-xs text-stone-500">
                  {t.common.dataUnavailable}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: VEGETATION (Copernicus Sentinel-2 MSI Level-2A) */}
        {activeTab === 'vegetation' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-white border border-emerald-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 block">
                    {t.dashboard.vegetationHeader}
                  </span>
                  <span className="text-[10px] text-stone-500 font-mono block">
                    Copernicus CDSE • Sentinel-2 MSI L2A
                  </span>
                </div>
                {renderFreshnessBadge(sentinel2?.freshness, sentinel2?.dataStatus)}
              </div>

              {sentinel2 && sentinel2.granuleName ? (
                <>
                  {/* Overpass & Cloud Cover */}
                  <div className="grid grid-cols-2 gap-2.5 pt-1 font-mono text-xs">
                    <div className="p-3 rounded-xl bg-emerald-50/40 border border-emerald-100">
                      <span className="text-[10px] text-stone-600 block">{t.dashboard.overpassDateUtc}</span>
                      <span className="text-base font-bold text-stone-900 block mt-1" dir="ltr">
                        {sentinel2.acquisitionDateUtc || t.common.notAvailable}
                      </span>
                      <span className="text-[10px] text-stone-500 block mt-0.5" dir="ltr">
                        Tile: {sentinel2.tileId}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-emerald-50/40 border border-emerald-100">
                      <span className="text-[10px] text-stone-600 block">{t.dashboard.cloudCoverage}</span>
                      <span className="text-base font-bold text-stone-900 block mt-1" dir="ltr">
                        {sentinel2.cloudCoveragePercent !== null ? `${sentinel2.cloudCoveragePercent}%` : t.common.notAvailable}
                      </span>
                      <span className="text-[10px] text-stone-500 block mt-0.5">
                        {sentinel2.cloudCoveragePercent !== null && sentinel2.cloudCoveragePercent > 60 ? 'Masqué' : 'Clair'}
                      </span>
                    </div>
                  </div>

                  {/* Granule ID */}
                  <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200 text-[11px] font-mono break-all" dir="ltr">
                    <span className="text-[9px] text-stone-500 uppercase block mb-0.5">{t.dashboard.granuleId}</span>
                    <span className="text-stone-800 font-semibold">{sentinel2.granuleName}</span>
                  </div>

                  {/* Direct Spectral NDVI Disclosure */}
                  <div className="p-3.5 rounded-xl bg-emerald-50/40 border border-emerald-200 space-y-2">
                    <div className="flex items-center gap-1.5 text-emerald-900 text-xs font-semibold">
                      <Info className="w-4 h-4 text-emerald-700" />
                      <span>{t.dashboard.ndviSpectralTitle}</span>
                    </div>
                    <p className="text-[11px] text-emerald-950 leading-relaxed font-mono font-bold">
                      NDVI = (B08 - B04) / (B08 + B04)
                    </p>
                    <p className="text-[10px] text-stone-600 italic">
                      {sentinel2.missingReason}
                    </p>
                  </div>

                  {/* Overpass History */}
                  {sentinel2.recentPasses.length > 0 && (
                    <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 space-y-2">
                      <span className="text-xs font-semibold text-stone-800 block">
                        {t.dashboard.recentOverpassesTitle}
                      </span>
                      <div className="space-y-1.5 text-xs font-mono">
                        {sentinel2.recentPasses.map((pass, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between p-2 rounded-lg bg-white border border-stone-200 shadow-2xs"
                          >
                            <div className="flex items-center gap-2 text-stone-800" dir="ltr">
                              <Calendar className="w-3.5 h-3.5 text-stone-400" />
                              <span>{pass.date}</span>
                            </div>
                            <div className="flex items-center gap-3 text-stone-500 text-[11px]">
                              <span>{t.dashboard.tileLabel} {pass.tileId}</span>
                              <span>{t.dashboard.cloudsLabel} {pass.cloudCover !== null ? `${pass.cloudCover}%` : t.common.notAvailable}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="p-4 text-center text-xs text-stone-500">
                  {t.common.dataUnavailable}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: SMART IRRIGATION DECISION ENGINE (FAO-56) */}
        {activeTab === 'irrigation' && (
          <IrrigationEnginePanel
            farm={farm}
            nasaPower={nasaPower}
            nasaGpm={nasaGpm}
            isExpanded={isExpanded}
            onToggleExpand={onToggleExpand}
          />
        )}

        {/* TAB 6: LIVING LAND MEMORY (ذاكرة الأرض) */}
        {activeTab === 'landMemory' && (
          <LandMemoryDashboard
            farm={farm}
            currentWeather={currentWeather}
            nasaPower={nasaPower}
            nasaSmap={nasaSmap}
            era5LandSoil={era5LandSoil}
            nasaGpm={nasaGpm}
            sentinel2={sentinel2}
            isExpanded={isExpanded}
            onToggleExpand={onToggleExpand}
          />
        )}
      </div>

      {/* Bottom Bar with Data Provenance Trigger */}
      <div className="p-3 bg-white border-t border-stone-200 flex items-center justify-between text-[11px] text-stone-500 shrink-0">
        <div className="flex items-center gap-1.5 truncate">
          <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span className="truncate">
            {t.common.syncTime}{' '}
            {nasaPower ? new Date(nasaPower.retrievalTimestamp).toLocaleTimeString(language === 'ar' ? 'ar-MA' : language === 'fr' ? 'fr-FR' : 'en-US') : t.common.waiting}
          </span>
        </div>

        <button
          onClick={handleOpenProvenanceModal}
          className="text-emerald-700 hover:text-emerald-800 font-bold underline shrink-0 mx-2 flex items-center gap-1"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>{t.common.dataProvenance}</span>
        </button>
      </div>

      {/* Scientific Data Provenance Modal (Portaled to document.body above map & sidebar layers) */}
      {typeof document !== 'undefined' &&
        createPortal(
          <DataProvenanceModal
            isOpen={isProvenanceModalOpen}
            onClose={() => setIsProvenanceModalOpen(false)}
            records={provenanceRecords}
            coordinates={farm.centroid}
            farmName={farm.name}
          />,
          document.body
        )}
    </div>
  );
};
