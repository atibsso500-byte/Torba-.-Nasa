/**
 * TURBA — THE LIVING LAND MEMORY (ذاكرة الأرض)
 * Scientific Provenance & Environmental Snapshot Builder
 *
 * Connects ONLY to operational TURBA data services:
 * - NASA POWER Agroclimatology (MERRA-2 / GEOS-FP ~50 km grid)
 * - NASA POWER PRECTOTCORR Precipitation & 30-year climatology
 * - Open-Meteo NWP Model Output & Volumetric Soil Moisture
 * - Copernicus CDSE Sentinel-2 L2A (Product Metadata ONLY — no NDVI or vegetation claims)
 * - ISRIC SoilGrids v2.0 (250 m spatial estimate + Saxton & Rawls 2006) or Farmer Lab / FAO-56 Table 19
 *
 * Never invents missing metadata, never treats gridded estimates as in-situ farm sensors.
 */

import {
  Coordinates,
  CopernicusEra5LandSoil,
  CurrentWeatherObservation,
  NasaGpmObservation,
  NasaPowerObservation,
  NasaSmapObservation,
  Sentinel2Observation,
} from '../../types/farm';
import { SoilHydraulicResult } from '../../types/irrigation';
import {
  EnvironmentalSnapshotRecord,
  LandMemoryProvenanceEntry,
} from './types';

export interface LiveEnvironmentalInputs {
  fieldId: string;
  coordinates: Coordinates;
  currentWeather: CurrentWeatherObservation | null;
  nasaPower: NasaPowerObservation | null;
  nasaSmap: NasaSmapObservation | null;
  nasaGpm: NasaGpmObservation | null;
  era5LandSoil: CopernicusEra5LandSoil | null;
  sentinel2: Sentinel2Observation | null;
  soilHydraulics: SoilHydraulicResult | null;
}

export function buildEnvironmentalSnapshotAndProvenance(
  input: LiveEnvironmentalInputs
): {
  snapshot: EnvironmentalSnapshotRecord;
  provenanceEntries: LandMemoryProvenanceEntry[];
} {
  const nowIso = new Date().toISOString();
  const {
    fieldId,
    coordinates,
    currentWeather,
    nasaPower,
    nasaSmap,
    nasaGpm,
    era5LandSoil,
    sentinel2,
    soilHydraulics,
  } = input;

  const prov: LandMemoryProvenanceEntry[] = [];
  const snapshotTag = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  // 1. NASA POWER Daily Agroclimatology (gridded ~50 km MERRA-2 / GEOS-FP)
  const nasaDate = nasaPower?.observationDateUtc || 'Unavailable';
  const nasaStatus = nasaPower?.dataStatus || 'UNAVAILABLE';
  const nasaQuality =
    nasaStatus === 'VERIFIED'
      ? nasaPower?.freshness === 'stale'
        ? 'outdated_data'
        : 'estimated'
      : 'missing_data';

  const nasaEntries: Array<{
    key: string;
    variable: string;
    value: number | null;
    unit: string;
  }> = [
    { key: 't2m', variable: 'NASA POWER T2M (Daily Mean Air Temperature)', value: nasaPower?.temperature2m ?? null, unit: '°C' },
    { key: 't2m_max', variable: 'NASA POWER T2M_MAX (Daily Max Temperature)', value: nasaPower?.temperatureMax ?? null, unit: '°C' },
    { key: 't2m_min', variable: 'NASA POWER T2M_MIN (Daily Min Temperature)', value: nasaPower?.temperatureMin ?? null, unit: '°C' },
    { key: 'rh2m', variable: 'NASA POWER RH2M (Relative Humidity 2m)', value: nasaPower?.relativeHumidity2m ?? null, unit: '%' },
    { key: 'ws2m', variable: 'NASA POWER WS2M (Wind Speed 2m)', value: nasaPower?.windSpeed2m ?? null, unit: 'm/s' },
    { key: 'solar', variable: 'NASA POWER ALLSKY_SFC_SW_DWN (Solar Radiation)', value: nasaPower?.solarRadiation ?? null, unit: 'MJ/m²/day' },
  ];

  for (const item of nasaEntries) {
    prov.push({
      provenanceId: `prov-${snapshotTag}-nasa-${item.key}`,
      fieldId,
      sourceProvider: 'NASA POWER Agroclimatology (MERRA-2 / GEOS-FP)',
      variable: item.variable,
      value: item.value,
      unit: item.unit,
      observationOrReferenceDate: nasaDate,
      retrievalTimestamp: nasaPower?.retrievalTimestamp || nowIso,
      coordinates,
      spatialResolution: nasaPower?.spatialResolution || '0.5° × 0.625° (~50 km grid)',
      temporalResolution: nasaPower?.temporalResolution || 'Daily average assimilation',
      processingMethod: 'Gridded agroclimatological assimilation (time-standard=UTC)',
      origin: 'spatial_estimate',
      qualityStatus: item.value !== null ? nasaQuality : 'missing_data',
      dataStatus: item.value !== null ? nasaStatus : 'UNAVAILABLE',
      freshness: nasaPower?.freshness || 'unavailable',
      limitations:
        'Gridded ~50 km reanalysis output, NOT a direct on-farm weather station measurement (typically 3–4 day latency).',
    });
  }

  // 2. NASA POWER PRECTOTCORR Precipitation & Anomaly
  const gpmStatus = nasaGpm?.dataStatus || 'UNAVAILABLE';
  prov.push({
    provenanceId: `prov-${snapshotTag}-nasa-precip`,
    fieldId,
    sourceProvider: 'NASA POWER Precipitation (MERRA-2 / GEOS-FP PRECTOTCORR)',
    variable: 'PRECTOTCORR Daily & 30-day Accumulation',
    value: nasaGpm?.monthlyAccumulationMm ?? nasaGpm?.dailyRainfallMm ?? null,
    unit: 'mm',
    observationOrReferenceDate: nasaGpm?.observationDateUtc || 'Unavailable',
    retrievalTimestamp: nasaGpm?.retrievalTimestamp || nowIso,
    coordinates,
    spatialResolution: nasaGpm?.spatialResolution || '0.5° × 0.625° (~50 km)',
    temporalResolution: 'Daily & 30-day accumulation vs 30-yr NASA climatology',
    processingMethod: 'Day-by-day valid PRECTOTCORR sum; anomaly omitted when arid baseline < 1.0 mm',
    origin: 'spatial_estimate',
    qualityStatus:
      nasaGpm?.monthlyAccumulationMm !== null && nasaGpm?.monthlyAccumulationMm !== undefined
        ? nasaGpm.freshness === 'stale'
          ? 'outdated_data'
          : 'estimated'
        : 'missing_data',
    dataStatus: gpmStatus,
    freshness: nasaGpm?.freshness || 'unavailable',
    limitations:
      'Gridded MERRA-2 PRECTOTCORR (~50 km cell), NOT an in-situ rain gauge or direct GPM IMERG overpass.',
  });

  // 3. NASA MERRA-2 Soil Wetness Index (GWETROOT & GWETTOP)
  prov.push({
    provenanceId: `prov-${snapshotTag}-nasa-gwet`,
    fieldId,
    sourceProvider: 'NASA POWER Soil Wetness (MERRA-2 Assimilation)',
    variable: 'GWETROOT / GWETTOP Soil Wetness Index',
    value: nasaSmap?.rootZoneSoilMoistureIndex ?? null,
    unit: 'dimensionless (0-1)',
    observationOrReferenceDate: nasaSmap?.observationDateUtc || 'Unavailable',
    retrievalTimestamp: nasaSmap?.retrievalTimestamp || nowIso,
    coordinates,
    spatialResolution: nasaSmap?.spatialResolution || '0.5° × 0.625° (~50 km)',
    temporalResolution: 'Daily assimilation',
    processingMethod: 'MERRA-2 dimensionless surface/root wetness index (0=dry, 1=saturated)',
    origin: 'spatial_estimate',
    qualityStatus:
      nasaSmap?.rootZoneSoilMoistureIndex !== null && nasaSmap?.rootZoneSoilMoistureIndex !== undefined
        ? 'estimated'
        : 'missing_data',
    dataStatus: nasaSmap?.dataStatus || 'UNAVAILABLE',
    freshness: nasaSmap?.freshness || 'unavailable',
    limitations:
      'Dimensionless 0-1 gridded wetness index (~50 km), NOT volumetric m³/m³ or direct SMAP radiometer observation.',
  });

  // 4. Open-Meteo NWP (kept strictly separate from NASA POWER)
  prov.push({
    provenanceId: `prov-${snapshotTag}-openmeteo-weather`,
    fieldId,
    sourceProvider: 'Open-Meteo NWP Forecast Model Output',
    variable: 'Instantaneous Air Temperature (2m) & NWP Soil Moisture (0–7 cm)',
    value: currentWeather?.temperature2m ?? null,
    unit: '°C (with m³/m³ soil layer 0-7cm separate)',
    observationOrReferenceDate: currentWeather?.observationTime || 'Unavailable',
    retrievalTimestamp: nowIso,
    coordinates,
    spatialResolution: currentWeather?.spatialResolution || 'Model-dependent (~0.1°–0.25°)',
    temporalResolution: 'Instantaneous / Hourly NWP assimilation',
    processingMethod: 'Kept strictly separate from NASA POWER daily series; wind locked to m/s UTC',
    origin: 'spatial_estimate',
    qualityStatus: currentWeather?.dataStatus === 'VERIFIED' ? 'estimated' : 'missing_data',
    dataStatus: currentWeather?.dataStatus || 'UNAVAILABLE',
    freshness: currentWeather?.freshness || 'unavailable',
    limitations:
      'Numerical Weather Prediction model assimilation, NOT a ground synoptic station or capacitive soil probe.',
  });

  // 5. Copernicus Sentinel-2 L2A (Catalog Metadata ONLY)
  prov.push({
    provenanceId: `prov-${snapshotTag}-copernicus-s2`,
    fieldId,
    sourceProvider: 'Copernicus CDSE Sentinel-2 MSI Level-2A',
    variable: 'Product Granule Metadata & Cloud Cover % (No Raster NDVI Computed)',
    value: sentinel2?.granuleName
      ? `${sentinel2.granuleName} (${sentinel2.cloudCoveragePercent ?? 'N/A'}% cloud)`
      : null,
    unit: '% cloud cover / granule ID',
    observationOrReferenceDate: sentinel2?.acquisitionDateUtc || 'Unavailable',
    retrievalTimestamp: sentinel2?.retrievalTimestamp || nowIso,
    coordinates,
    spatialResolution: sentinel2?.spatialResolution || 'Native 10 m (raster bands NOT downloaded)',
    temporalResolution: '5-day satellite revisit catalog',
    processingMethod: 'OData Level-2A footprint & cloud metadata query only; NDVI strictly null',
    origin: 'system_analysis',
    qualityStatus:
      sentinel2?.dataStatus === 'METADATA_ONLY' || sentinel2?.dataStatus === 'VERIFIED'
        ? sentinel2.freshness === 'stale'
          ? 'outdated_data'
          : 'estimated'
        : 'missing_data',
    dataStatus: sentinel2?.dataStatus || 'UNAVAILABLE',
    freshness: sentinel2?.freshness || 'unavailable',
    limitations:
      'Product catalog metadata only; pixel-level B04/B08 NDVI, vegetation stress, and crop classification are NOT computed.',
  });

  // 6. Soil Hydraulics / SoilGrids v2.0 / Lab / Table 19
  const firstLayerSoc = soilHydraulics?.layers?.[0]?.organicCarbonPct ?? null;
  const firstLayerClay = soilHydraulics?.layers?.[0]?.clayPct ?? null;
  const firstLayerSand = soilHydraulics?.layers?.[0]?.sandPct ?? null;

  if (soilHydraulics && soilHydraulics.sourceKind !== 'unavailable') {
    const isLab = soilHydraulics.sourceKind === 'farmer_lab';
    const isSpatial = soilHydraulics.sourceKind === 'soilgrids_v2';
    prov.push({
      provenanceId: `prov-${snapshotTag}-soil`,
      fieldId,
      sourceProvider: soilHydraulics.sourceLabel,
      variable: 'Root-Zone θFC, θWP, Soil Texture & SOC (where available)',
      value:
        soilHydraulics.thetaFc.value !== null
          ? `θFC=${soilHydraulics.thetaFc.value}, θWP=${soilHydraulics.thetaWp.value}${firstLayerSoc !== null ? `, SOC=${firstLayerSoc}%` : ''}`
          : null,
      unit: 'm³/m³, %',
      observationOrReferenceDate: soilHydraulics.thetaFc.observationDate || 'Static reference',
      retrievalTimestamp: soilHydraulics.retrievalTimestamp || nowIso,
      coordinates,
      spatialResolution: isSpatial
        ? '250 m spatial soil map'
        : isLab
        ? 'Parcel laboratory sample'
        : 'FAO-56 Table 19 texture class midpoint',
      temporalResolution: 'Static soil profile',
      processingMethod: isSpatial
        ? 'ISRIC SoilGrids v2.0 (0–100 cm) + Saxton & Rawls (2006) pedotransfer'
        : isLab
        ? 'Farmer laboratory measurement input'
        : 'FAO-56 Table 19 reference midpoint',
      origin: isLab ? 'verified_measurement' : isSpatial ? 'spatial_estimate' : 'calculated',
      qualityStatus: isLab ? 'verified_measurement' : 'estimated',
      dataStatus: isLab ? 'VERIFIED' : 'ESTIMATED',
      freshness: 'fresh',
      limitations: isLab
        ? 'User-entered laboratory values; retain original lab sheet for institutional audits.'
        : 'Spatial prediction or texture class estimate — NOT a parcel-level laboratory soil test.',
    });
  } else {
    prov.push({
      provenanceId: `prov-${snapshotTag}-soil`,
      fieldId,
      sourceProvider: 'ISRIC SoilGrids v2.0 / Soil Input',
      variable: 'Soil Hydraulic Properties (θFC, θWP, SOC)',
      value: null,
      unit: 'm³/m³, %',
      observationOrReferenceDate: 'Unavailable',
      retrievalTimestamp: soilHydraulics?.retrievalTimestamp || nowIso,
      coordinates,
      spatialResolution: '250 m target grid',
      temporalResolution: 'Static',
      processingMethod: 'Service unavailable and no lab/texture entered',
      origin: 'spatial_estimate',
      qualityStatus: 'missing_data',
      dataStatus: 'UNAVAILABLE',
      freshness: 'unavailable',
      limitations: soilHydraulics?.soilGridsError || 'Soil data unavailable.',
    });
  }

  const snapshot: EnvironmentalSnapshotRecord = {
    snapshotId: `envsnap-${snapshotTag}`,
    fieldId,
    capturedAt: nowIso,
    coordinates,
    nasaPowerDateUtc: nasaPower?.dataStatus === 'VERIFIED' ? nasaPower.observationDateUtc : null,
    nasaPowerTempMeanC: nasaPower?.temperature2m ?? null,
    nasaPowerTempMinC: nasaPower?.temperatureMin ?? null,
    nasaPowerTempMaxC: nasaPower?.temperatureMax ?? null,
    nasaPowerRainfallDailyMm: nasaGpm?.dailyRainfallMm ?? null,
    nasaPower30DayRainMm: nasaGpm?.monthlyAccumulationMm ?? null,
    nasaPower30DayBaselineMm: nasaGpm?.historicalAverageMonthlyMm ?? null,
    nasaPowerAnomalyPct: nasaGpm?.anomalyPercent ?? null,
    nasaPowerSolarMjM2Day: nasaPower?.solarRadiation ?? null,
    nasaPowerWind2mMs: nasaPower?.windSpeed2m ?? null,
    nasaPowerRh2mPct: nasaPower?.relativeHumidity2m ?? null,
    nasaMerra2RootWetnessIndex: nasaSmap?.rootZoneSoilMoistureIndex ?? null,
    nasaMerra2SurfaceWetnessIndex: nasaSmap?.surfaceSoilMoistureIndex ?? null,
    openMeteoObsTime:
      currentWeather?.dataStatus === 'VERIFIED' ? currentWeather.observationTime : null,
    openMeteoTemp2mC: currentWeather?.temperature2m ?? null,
    openMeteoSoil0_7M3M3: era5LandSoil?.layer0_7cm ?? null,
    sentinel2GranuleName: sentinel2?.granuleName ?? null,
    sentinel2AcquisitionDateUtc: sentinel2?.acquisitionDateUtc ?? null,
    sentinel2CloudCoverPct: sentinel2?.cloudCoveragePercent ?? null,
    sentinel2Status: sentinel2?.dataStatus || 'UNAVAILABLE',
    soilSourceKind: soilHydraulics?.sourceKind || 'unavailable',
    soilSourceLabel: soilHydraulics?.sourceLabel || 'Data currently unavailable',
    soilThetaFc: soilHydraulics?.thetaFc.value ?? null,
    soilThetaWp: soilHydraulics?.thetaWp.value ?? null,
    soilSocPct: firstLayerSoc,
    soilClayPct: firstLayerClay,
    soilSandPct: firstLayerSand,
    provenanceIds: prov.map((p) => p.provenanceId),
  };

  return { snapshot, provenanceEntries: prov };
}
