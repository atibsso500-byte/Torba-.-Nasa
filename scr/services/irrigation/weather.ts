/**
 * TURBA Phase 3 — Agro-Meteorological Weather Service for Irrigation
 * Integrates:
 * 1. NASA POWER Daily Point API (T2M_MAX, T2M_MIN, T2M, RH2M, WS2M, ALLSKY_SFC_SW_DWN, PRECTOTCORR, PS, GWETROOT)
 * 2. Open-Meteo Forecast API (past_days=14 + forecast_days=14, &wind_speed_unit=ms&timezone=UTC)
 *
 * Scientific Rules:
 * - Never mixes future forecasts into historical/observed records.
 * - Adjusts Open-Meteo 10m wind speed to 2m height using FAO-56 Eq. 47.
 * - Reuses coordinate validation, -999 rejection, physical bounds, and scientificCache.
 */

import { Coordinates, DataStatus, FreshnessStatus } from '../../types/farm';
import { DailyMeteoRecord, WeatherSeriesResult } from '../../types/irrigation';
import { validateCoordinates, validatePhysicalValue, classifyFreshness } from '../../utils/validation';
import { scientificCache } from '../cache';
import { formatDateToNasa, formatNasaDateToStandard, findClosestHourlyIndex } from '../nasa';
import {
  adjustWindSpeedTo2m,
  validateAtmosphericPressureKpa,
  validateDailyMeteoField,
} from './validation';

const NASA_POWER_DAILY_BASE = 'https://power.larc.nasa.gov/api/temporal/daily/point';
const OPEN_METEO_BASE = 'https://api.open-meteo.com/v1/forecast';

function isBrowserContext(): boolean {
  return typeof window !== 'undefined' && typeof window.location !== 'undefined';
}

export async function fetchIrrigationWeatherSeries(
  coords: Coordinates,
  signal?: AbortSignal
): Promise<WeatherSeriesResult> {
  const now = new Date();
  const syncIso = now.toISOString();
  const todayUtcStr = syncIso.slice(0, 10);

  const coordCheck = validateCoordinates(coords);
  if (!coordCheck.isValid) {
    throw new Error(coordCheck.error || 'Invalid coordinates for weather series');
  }

  const cacheKey = scientificCache.generateKey('irrigation_weather', coords.lat, coords.lng, `v1_${todayUtcStr}`);
  const cached = scientificCache.get<WeatherSeriesResult>(cacheKey);
  if (cached) {
    return cached;
  }

  // Request 25-day NASA POWER historical window (published up to ~3-4 days ago)
  const endDateObj = new Date(now.getTime() - 2 * 86400000);
  const startDateObj = new Date(now.getTime() - 26 * 86400000);
  const startStr = formatDateToNasa(startDateObj);
  const endStr = formatDateToNasa(endDateObj);

  const latStr = coords.lat.toFixed(4);
  const lngStr = coords.lng.toFixed(4);

  const nasaParams = 'T2M,T2M_MAX,T2M_MIN,RH2M,WS2M,ALLSKY_SFC_SW_DWN,PRECTOTCORR,PS,GWETROOT';
  const directNasaUrl = `${NASA_POWER_DAILY_BASE}?parameters=${nasaParams}&community=AG&longitude=${lngStr}&latitude=${latStr}&start=${startStr}&end=${endStr}&time-standard=UTC&format=JSON`;
  const proxyNasaUrl = `/api/nasa/power?lat=${latStr}&lng=${lngStr}&start=${startStr}&end=${endStr}`;

  const directMeteoUrl = `${OPEN_METEO_BASE}?latitude=${latStr}&longitude=${lngStr}&past_days=14&forecast_days=14&daily=temperature_2m_max,temperature_2m_min,temperature_2m_mean,relative_humidity_2m_mean,wind_speed_10m_mean,shortwave_radiation_sum,precipitation_sum,et0_fao_evapotranspiration&hourly=soil_moisture_0_to_7cm,soil_moisture_7_to_28cm,soil_moisture_28_to_100cm&wind_speed_unit=ms&timezone=UTC`;
  const proxyMeteoUrl = `/api/meteo/daily-forecast?lat=${latStr}&lng=${lngStr}`;

  const fetchWithFallback = async (proxyUrl: string, directUrl: string, timeoutMs: number) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs);
    const onCallerAbort = () => controller.abort(signal?.reason);
    if (signal) {
      if (signal.aborted) {
        clearTimeout(timer);
        throw signal.reason || new Error('Aborted');
      }
      signal.addEventListener('abort', onCallerAbort, { once: true });
    }
    try {
      if (isBrowserContext()) {
        try {
          const pRes = await fetch(proxyUrl, { headers: { Accept: 'application/json' }, signal: controller.signal });
          const ct = pRes.headers.get('content-type') || '';
          if (pRes.ok && ct.includes('json')) {
            clearTimeout(timer);
            return await pRes.json();
          }
        } catch (proxyErr) {
          if (controller.signal.aborted) throw proxyErr;
        }
      }
      const dRes = await fetch(directUrl, { headers: { Accept: 'application/json' }, signal: controller.signal });
      clearTimeout(timer);
      if (!dRes.ok) {
        throw new Error(`HTTP ${dRes.status} ${dRes.statusText}`);
      }
      return await dRes.json();
    } catch (err) {
      clearTimeout(timer);
      throw err;
    } finally {
      if (signal) {
        signal.removeEventListener('abort', onCallerAbort);
      }
    }
  };

  const errors: string[] = [];
  const [nasaJson, meteoJson] = await Promise.all([
    fetchWithFallback(proxyNasaUrl, directNasaUrl, 15000).catch((err) => {
      errors.push(`NASA POWER: ${err instanceof Error ? err.message : 'Request failed'}`);
      return null;
    }),
    fetchWithFallback(proxyMeteoUrl, directMeteoUrl, 10000).catch((err) => {
      errors.push(`Open-Meteo: ${err instanceof Error ? err.message : 'Request failed'}`);
      return null;
    }),
  ]);

  let elevationM: number | null = null;
  let elevationSource: string | null = null;

  // Parse NASA POWER historical records
  const historicalByDate = new Map<string, DailyMeteoRecord>();
  let nasaFreshness: FreshnessStatus = 'unavailable';
  let nasaPowerStatus: DataStatus = 'UNAVAILABLE';
  const gwetRootByDate = new Map<string, number>();

  const nasaGeometryElev = nasaJson?.geometry?.coordinates?.[2];
  if (typeof nasaGeometryElev === 'number' && Number.isFinite(nasaGeometryElev) && nasaGeometryElev > -430) {
    elevationM = nasaGeometryElev;
    elevationSource = 'NASA POWER MERRA-2 grid elevation';
  }

  const nasaParamMap = nasaJson?.properties?.parameter;
  if (nasaParamMap && typeof nasaParamMap === 'object') {
    const dateSet = new Set<string>();
    Object.values(nasaParamMap).forEach((series) => {
      if (series && typeof series === 'object') {
        Object.keys(series as Record<string, unknown>).forEach((k) => dateSet.add(k));
      }
    });
    const sortedNasaKeys = Array.from(dateSet).sort();
    let latestValidNasaDate = '';

    for (const rawKey of sortedNasaKeys) {
      const isoDate = formatNasaDateToStandard(rawKey);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate) || isoDate > todayUtcStr) {
        continue;
      }

      const tMax = validateDailyMeteoField(nasaParamMap.T2M_MAX?.[rawKey], 'temperature');
      const tMin = validateDailyMeteoField(nasaParamMap.T2M_MIN?.[rawKey], 'temperature');
      const tMean = validateDailyMeteoField(nasaParamMap.T2M?.[rawKey], 'temperature');
      const rh = validateDailyMeteoField(nasaParamMap.RH2M?.[rawKey], 'relative_humidity');
      const ws2m = validateDailyMeteoField(nasaParamMap.WS2M?.[rawKey], 'wind_speed');
      const solar = validateDailyMeteoField(nasaParamMap.ALLSKY_SFC_SW_DWN?.[rawKey], 'solar_radiation');
      const rain = validateDailyMeteoField(nasaParamMap.PRECTOTCORR?.[rawKey], 'precipitation');
      const pressure = validateAtmosphericPressureKpa(nasaParamMap.PS?.[rawKey]);

      const gwetCheck = validatePhysicalValue(nasaParamMap.GWETROOT?.[rawKey], 'soil_wetness_index');
      if (gwetCheck.isValid && gwetCheck.sanitizedValue !== null) {
        gwetRootByDate.set(isoDate, gwetCheck.sanitizedValue);
      }

      if (tMax !== null && tMin !== null) {
        latestValidNasaDate = isoDate;
        historicalByDate.set(isoDate, {
          date: isoDate,
          isForecast: false,
          source: 'NASA POWER (MERRA-2 / GEOS-FP)',
          origin: 'reanalysis_assimilated',
          tMaxC: tMax,
          tMinC: tMin,
          tMeanC: tMean ?? Math.round(((tMax + tMin) / 2) * 100) / 100,
          rhMeanPct: rh,
          windSpeed2mMs: ws2m,
          windRawHeightM: 2,
          windWasConvertedFrom10m: false,
          solarRadiationMjM2Day: solar,
          precipitationMm: rain,
          surfacePressureKpa: pressure,
          retrievalTimestamp: syncIso,
          spatialResolution: '0.5° × 0.625° (~50 km)',
        });
      }
    }

    if (latestValidNasaDate) {
      nasaPowerStatus = 'VERIFIED';
      nasaFreshness = classifyFreshness(latestValidNasaDate, 'nasa_daily').freshness;
    }
  }

  // Parse Open-Meteo Elevation, Past Analysis (for NASA latency tail), Forecast (+1..14d), and NWP Soil Layers
  let openMeteoStatus: DataStatus = 'UNAVAILABLE';
  let openMeteoFreshness: FreshnessStatus = 'unavailable';
  const forecastDaily: DailyMeteoRecord[] = [];
  let nwpSoilMoistureLayers: WeatherSeriesResult['nwpSoilMoistureLayers'] = null;

  if (meteoJson && meteoJson.daily && Array.isArray(meteoJson.daily.time)) {
    if (typeof meteoJson.elevation === 'number' && Number.isFinite(meteoJson.elevation)) {
      elevationM = meteoJson.elevation;
      elevationSource = 'Open-Meteo DEM Elevation (Copernicus/SRTM 90m)';
    }

    const d = meteoJson.daily;
    const times: string[] = d.time;

    for (let i = 0; i < times.length; i++) {
      const dateStr = times[i];
      if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) continue;

      const tMax = validateDailyMeteoField(d.temperature_2m_max?.[i], 'temperature');
      const tMin = validateDailyMeteoField(d.temperature_2m_min?.[i], 'temperature');
      const tMean = validateDailyMeteoField(d.temperature_2m_mean?.[i], 'temperature');
      const rh = validateDailyMeteoField(d.relative_humidity_2m_mean?.[i], 'relative_humidity');
      const ws10 = validateDailyMeteoField(d.wind_speed_10m_mean?.[i], 'wind_speed');
      const ws2 = ws10 !== null ? Math.round(adjustWindSpeedTo2m(ws10, 10) * 1000) / 1000 : null;
      const solar = validateDailyMeteoField(d.shortwave_radiation_sum?.[i], 'solar_radiation');
      const rain = validateDailyMeteoField(d.precipitation_sum?.[i], 'precipitation');
      const apiEt0 =
        typeof d.et0_fao_evapotranspiration?.[i] === 'number' &&
        Number.isFinite(d.et0_fao_evapotranspiration[i])
          ? d.et0_fao_evapotranspiration[i]
          : null;

      if (tMax === null || tMin === null) continue;

      if (dateStr <= todayUtcStr) {
        // Historical date: preserve NASA POWER if present, otherwise fill NASA 4-day latency gap with Open-Meteo past NWP analysis
        const existing = historicalByDate.get(dateStr);
        if (!existing) {
          historicalByDate.set(dateStr, {
            date: dateStr,
            isForecast: false,
            source: 'Open-Meteo NWP Historical Assimilation',
            origin: 'reanalysis_assimilated',
            tMaxC: tMax,
            tMinC: tMin,
            tMeanC: tMean ?? Math.round(((tMax + tMin) / 2) * 100) / 100,
            rhMeanPct: rh,
            windSpeed2mMs: ws2,
            windRawHeightM: 10,
            windWasConvertedFrom10m: ws2 !== null,
            solarRadiationMjM2Day: solar,
            precipitationMm: rain,
            surfacePressureKpa: null,
            apiReferenceEt0Mm: apiEt0,
            retrievalTimestamp: syncIso,
            spatialResolution: 'Model-dependent (~0.1°–0.25°)',
          });
        } else if (existing.solarRadiationMjM2Day === null && solar !== null) {
          // Fill CERES solar radiation lag cleanly from Open-Meteo NWP daily radiation if NASA -999
          existing.solarRadiationMjM2Day = solar;
        }
      } else {
        // Strict forecast boundary (> todayUtcStr)
        forecastDaily.push({
          date: dateStr,
          isForecast: true,
          source: 'Open-Meteo NWP Daily Forecast',
          origin: 'nwp_forecast',
          tMaxC: tMax,
          tMinC: tMin,
          tMeanC: tMean ?? Math.round(((tMax + tMin) / 2) * 100) / 100,
          rhMeanPct: rh,
          windSpeed2mMs: ws2,
          windRawHeightM: 10,
          windWasConvertedFrom10m: ws2 !== null,
          solarRadiationMjM2Day: solar,
          precipitationMm: rain,
          surfacePressureKpa: null,
          apiReferenceEt0Mm: apiEt0,
          retrievalTimestamp: syncIso,
          spatialResolution: 'Model-dependent (~0.1°–0.25°)',
        });
      }
    }

    if (times.length > 0) {
      openMeteoStatus = 'VERIFIED';
      openMeteoFreshness = 'fresh';
    }

    // Extract NWP soil moisture at lookback window start (defer until sorted historicalDaily is ready)
  }

  const historicalDaily = Array.from(historicalByDate.values()).sort((a, b) => a.date.localeCompare(b.date));
  forecastDaily.sort((a, b) => a.date.localeCompare(b.date));

  // Align initial moisture observations specifically to the 14-day spin-up window start date
  const spinUpWindow = historicalDaily.slice(-14);
  const lookbackStartDate = spinUpWindow[0]?.date || todayUtcStr;

  let initialRootZoneWetnessIndex: number | null = null;
  if (gwetRootByDate.size > 0) {
    const exactGwet = gwetRootByDate.get(lookbackStartDate);
    if (exactGwet !== undefined) {
      initialRootZoneWetnessIndex = exactGwet;
    } else {
      const targetMs = Date.parse(`${lookbackStartDate}T00:00:00Z`);
      let bestDiff = Infinity;
      for (const [dStr, val] of gwetRootByDate.entries()) {
        const diff = Math.abs(Date.parse(`${dStr}T00:00:00Z`) - targetMs);
        if (diff < bestDiff) {
          bestDiff = diff;
          initialRootZoneWetnessIndex = val;
        }
      }
    }
  }

  if (meteoJson?.hourly && Array.isArray(meteoJson.hourly.time) && meteoJson.hourly.time.length > 0) {
    const hTimes: string[] = meteoJson.hourly.time;
    const initRefIso = `${lookbackStartDate}T00:00:00Z`;
    let idx = findClosestHourlyIndex(hTimes, initRefIso, 36 * 60 * 60 * 1000);
    if (idx < 0 && hTimes[0] <= syncIso) {
      // Earliest past NWP hour (never today's syncIso) if lookbackStartDate precedes hourly start slightly
      idx = 0;
    }
    if (idx >= 0) {
      nwpSoilMoistureLayers = {
        observationTime: hTimes[idx],
        layer0_7: validatePhysicalValue(meteoJson.hourly.soil_moisture_0_to_7cm?.[idx], 'volumetric_soil_moisture').sanitizedValue,
        layer7_28: validatePhysicalValue(meteoJson.hourly.soil_moisture_7_to_28cm?.[idx], 'volumetric_soil_moisture').sanitizedValue,
        layer28_100: validatePhysicalValue(meteoJson.hourly.soil_moisture_28_to_100cm?.[idx], 'volumetric_soil_moisture').sanitizedValue,
      };
    }
  }

  const result: WeatherSeriesResult = {
    coordinates: coords,
    elevationM,
    elevationSource,
    historicalDaily,
    forecastDaily,
    nasaPowerStatus,
    openMeteoStatus,
    nasaFreshness,
    openMeteoFreshness,
    initialRootZoneWetnessIndex,
    nwpSoilMoistureLayers,
    errors,
    retrievalTimestamp: syncIso,
  };

  if (nasaPowerStatus === 'VERIFIED' && openMeteoStatus === 'VERIFIED') {
    scientificCache.set(cacheKey, result, 1000 * 60 * 30);
  }

  return result;
}
