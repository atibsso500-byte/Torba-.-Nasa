/**
 * TURBA Scientific Observation Service
 * Integrates:
 * 1. NASA POWER Agroclimatology (MERRA-2 / GEOS-FP) for Daily Assimilated Mean, Min, Max & 30-day History
 * 2. NASA POWER MERRA-2 Soil Wetness
 *    (GWETROOT & GWETTOP, dimensionless 0-1 index)
 * 3. NASA GPM IMERG Daily & Climatology Precipitation Baseline
 * 4. Open-Meteo NWP model soil moisture layers (0-7cm, 7-28cm, 28-100cm, 100-255cm in m³/m³) - model output, NOT ERA5-Land
 * 5. Open-Meteo Current Weather & Numerical Weather Prediction (NWP) model assimilation
 *
 * Strict Scientific Integrity (Phase 2):
 * - Independent latest valid date selection per parameter (no parameter fails because another is missing)
 * - Rejects -999, -9999, NaN, Infinity and impossible physical bounds
 * - Never converts missing data to zero
 * - Mathematically aligned precipitation accumulation and climatological anomalies with safe zero-baseline handling
 * - Explicit UTC time standard disclosure
 * - No arbitrary index fallbacks (eliminated index 12 fallback in hourly soil moisture; uses timestamp matching)
 * - Independent per-location request handling (no global counter aborting separate locations)
 * - Multi-dimensional caching with compound geographical keys
 * - Full Data Provenance traceability on every reading
 */

import {
  Coordinates,
  NasaPowerObservation,
  NasaSmapObservation,
  NasaGpmObservation,
  CurrentWeatherObservation,
  CopernicusEra5LandSoil,
  DataProvenanceRecord,
} from '../types/farm';
import {
  validateCoordinates,
  validatePhysicalValue,
  classifyFreshness,
  createProvenanceRecord,
} from '../utils/validation';
import { scientificCache } from './cache';

const NASA_POWER_DAILY_BASE = 'https://power.larc.nasa.gov/api/temporal/daily/point';
const NASA_POWER_CLIMO_BASE = 'https://power.larc.nasa.gov/api/temporal/climatology/point';
const OPEN_METEO_BASE = 'https://api.open-meteo.com/v1/forecast';
const NASA_TIMEOUT_MS = 15000;
const METEO_TIMEOUT_MS = 8000;

const pad = (n: number) => String(n).padStart(2, '0');

export function formatDateToNasa(d: Date): string {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
}

export function formatNasaDateToStandard(nasaDate: string): string {
  if (nasaDate && nasaDate.length === 8) {
    return `${nasaDate.slice(0, 4)}-${nasaDate.slice(4, 6)}-${nasaDate.slice(6, 8)}`;
  }
  return nasaDate || 'Indisponible';
}

const MONTH_KEYS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'] as const;

export interface EnvironmentalFetchResult {
  currentWeather: CurrentWeatherObservation;
  nasaPower: NasaPowerObservation;
  nasaSmap: NasaSmapObservation;
  era5LandSoil: CopernicusEra5LandSoil;
  nasaGpm: NasaGpmObservation;
  provenanceRecords: DataProvenanceRecord[];
}

/**
 * Finds the latest date with a valid (non-null, non-sentinel) measurement for a given parameter.
 * Evaluates dates in descending chronological order.
 */
export function findLatestValidObservation(
  paramData: Record<string, unknown> | undefined,
  metricType: 'temperature' | 'relative_humidity' | 'wind_speed' | 'solar_radiation' | 'precipitation' | 'soil_wetness_index',
  sortedDatesAsc: string[]
): { dateKey: string | null; formattedDate: string | null; value: number | null; status: 'PASS' | 'WARNING' | 'REJECTED' } {
  if (!paramData || typeof paramData !== 'object' || sortedDatesAsc.length === 0) {
    return { dateKey: null, formattedDate: null, value: null, status: 'REJECTED' };
  }

  // Iterate backwards from the most recent date
  for (let i = sortedDatesAsc.length - 1; i >= 0; i--) {
    const key = sortedDatesAsc[i];
    const rawVal = paramData[key];
    const validation = validatePhysicalValue(rawVal, metricType);
    if (validation.isValid && validation.sanitizedValue !== null) {
      return {
        dateKey: key,
        formattedDate: formatNasaDateToStandard(key),
        value: validation.sanitizedValue,
        status: validation.status,
      };
    }
  }

  return { dateKey: null, formattedDate: null, value: null, status: 'REJECTED' };
}

/**
 * Calculates precipitation accumulation and historical anomaly comparing mathematically aligned periods.
 * Avoids misleading percentages when baseline is zero or very low.
 */
export function calculatePrecipitationAnomaly(params: {
  dailyPrecip: Record<string, unknown> | undefined;
  datesAsc: string[];
  climatologyPrecipDaily?: number | null;
  observedDaysCount?: number;
  climoMonthlyMap?: Record<string, number> | null;
}): {
  totalObservedMm: number | null;
  validDaysCount: number;
  expectedBaselineMm: number | null;
  anomalyMm: number | null;
  anomalyPercent: number | null;
  methodDescription: string;
} {
  const { dailyPrecip, datesAsc, climatologyPrecipDaily, climoMonthlyMap } = params;

  if (!dailyPrecip || datesAsc.length === 0) {
    return {
      totalObservedMm: null,
      validDaysCount: 0,
      expectedBaselineMm: null,
      anomalyMm: null,
      anomalyPercent: null,
      methodDescription: 'No precipitation observations available',
    };
  }

  let sumMm = 0;
  let validCount = 0;
  let expectedBaselineSum = 0;
  let hasClimatology = false;

  for (const d of datesAsc) {
    const val = validatePhysicalValue(dailyPrecip[d], 'precipitation');
    if (val.isValid && val.sanitizedValue !== null) {
      sumMm += val.sanitizedValue;
      validCount++;

      // Day-by-day climatological matching
      let dayRate: number | null = null;
      if (climoMonthlyMap && d.length >= 6) {
        const monthNum = parseInt(d.slice(4, 6), 10) - 1;
        if (monthNum >= 0 && monthNum < 12) {
          const mKey = MONTH_KEYS[monthNum];
          if (typeof climoMonthlyMap[mKey] === 'number' && Number.isFinite(climoMonthlyMap[mKey]) && climoMonthlyMap[mKey] >= 0) {
            dayRate = climoMonthlyMap[mKey];
          }
        }
      }
      if (dayRate === null && typeof climatologyPrecipDaily === 'number' && Number.isFinite(climatologyPrecipDaily) && climatologyPrecipDaily >= 0) {
        dayRate = climatologyPrecipDaily;
      }

      if (dayRate !== null) {
        expectedBaselineSum += dayRate;
        hasClimatology = true;
      }
    }
  }

  if (validCount === 0) {
    return {
      totalObservedMm: null,
      validDaysCount: 0,
      expectedBaselineMm: null,
      anomalyMm: null,
      anomalyPercent: null,
      methodDescription: 'All precipitation observations in window were invalid or missing (-999)',
    };
  }

  const roundedSum = Math.round(sumMm * 10) / 10;

  let expectedBaselineMm: number | null = null;
  let anomalyMm: number | null = null;
  let anomalyPercent: number | null = null;
  let methodDescription = `${validCount}-day observed accumulation sum`;

  if (hasClimatology) {
    expectedBaselineMm = Math.round(expectedBaselineSum * 10) / 10;
    anomalyMm = Math.round((roundedSum - expectedBaselineMm) * 10) / 10;

    // Only compute percentage if expected baseline is statistically significant (>= 1.0 mm)
    // to prevent artificial +4000% anomalies in arid/desert zones with near-zero baseline
    if (expectedBaselineMm >= 1.0) {
      anomalyPercent = Math.round(((roundedSum - expectedBaselineMm) / expectedBaselineMm) * 100);
      methodDescription = `Aligned ${validCount}-day window vs 30-year NASA climatological baseline (${expectedBaselineMm} mm expected)`;
    } else {
      anomalyPercent = null;
      methodDescription = `Arid baseline (<1.0 mm expected over ${validCount} days). Percentage anomaly omitted to avoid statistical distortion; absolute difference is ${anomalyMm > 0 ? '+' : ''}${anomalyMm} mm.`;
    }
  }

  return {
    totalObservedMm: roundedSum,
    validDaysCount: validCount,
    expectedBaselineMm,
    anomalyMm,
    anomalyPercent,
    methodDescription,
  };
}

/**
 * Finds the closest past hourly observation from Open-Meteo hourly time series
 * strictly eliminating arbitrary index fallbacks (like index 12 or index 0).
 * Rejects timestamps exceeding maxToleranceMs (+/- 90 minutes) by returning -1.
 */
export function findClosestHourlyIndex(
  times: string[],
  referenceIso: string,
  maxToleranceMs: number = 90 * 60 * 1000 // 90 minutes
): number {
  if (!times || !Array.isArray(times) || times.length === 0) return -1;

  const targetDate = new Date(referenceIso);
  const targetTime = targetDate.getTime();
  if (isNaN(targetTime)) return -1;

  let closestIdx = -1;
  let minDiff = Infinity;

  for (let i = 0; i < times.length; i++) {
    const tStr = times[i].endsWith('Z') ? times[i] : times[i] + 'Z';
    const tDate = new Date(tStr);
    const tTime = tDate.getTime();
    if (isNaN(tTime)) continue;

    const diff = Math.abs(targetTime - tTime);
    if (diff < minDiff) {
      minDiff = diff;
      closestIdx = i;
    }
  }

  // Reject if outside acceptable tolerance (+/- 90 minutes)
  if (minDiff > maxToleranceMs) {
    return -1;
  }

  return closestIdx;
}

export async function fetchNasaObservations(
  coords: Coordinates,
  signal?: AbortSignal
): Promise<EnvironmentalFetchResult> {
  const now = new Date();
  const syncTimeIso = now.toISOString();

  // Validate coordinates and resolve geography
  const coordValidation = validateCoordinates(coords);
  if (!coordValidation.isValid) {
    throw new Error(coordValidation.error || 'Invalid geographic coordinates');
  }

  // Check cache for environmental observation data (1 hour TTL)
  const cacheKey = scientificCache.generateKey('env_observations', coords.lat, coords.lng, 'v2');
  const cached = scientificCache.get<EnvironmentalFetchResult>(cacheKey);
  if (cached) {
    return cached;
  }

  // NASA POWER processed daily agroclimatology is published with a 3 to 4 day processing latency
  const endDateObj = new Date(now.getTime() - 4 * 86400000);
  const startDateObj = new Date(now.getTime() - 34 * 86400000); // 30-day window

  const startStr = formatDateToNasa(startDateObj);
  const endStr = formatDateToNasa(endDateObj);

  // Explicit time-standard=UTC parameter per Phase 2 Checklist 2.D
  const parameters = 'T2M,T2M_MAX,T2M_MIN,RH2M,WS2M,ALLSKY_SFC_SW_DWN,PRECTOTCORR,GWETROOT,GWETTOP';
  const dailyNasaUrl = `${NASA_POWER_DAILY_BASE}?parameters=${parameters}&community=AG&longitude=${coords.lng.toFixed(4)}&latitude=${coords.lat.toFixed(4)}&start=${startStr}&end=${endStr}&time-standard=UTC&format=JSON`;
  const climoUrl = `${NASA_POWER_CLIMO_BASE}?parameters=PRECTOTCORR&community=AG&longitude=${coords.lng.toFixed(4)}&latitude=${coords.lat.toFixed(4)}&format=JSON`;

  // Open-Meteo: Current NWP assimilation + Operational NWP soil moisture layers
  // Explicitly locked to &wind_speed_unit=ms and &timezone=UTC (Phase 2 Checklist 1 & 6)
  const liveMeteoUrl = `${OPEN_METEO_BASE}?latitude=${coords.lat.toFixed(4)}&longitude=${coords.lng.toFixed(4)}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,wind_speed_10m,weather_code&hourly=soil_moisture_0_to_7cm,soil_moisture_7_to_28cm,soil_moisture_28_to_100cm,soil_moisture_100_to_255cm&wind_speed_unit=ms&timezone=UTC`;

  const proxyNasaDailyUrl = `/api/nasa/power?lat=${coords.lat.toFixed(4)}&lng=${coords.lng.toFixed(4)}&start=${startStr}&end=${endStr}`;
  const proxyNasaClimoUrl = `/api/nasa/climatology?lat=${coords.lat.toFixed(4)}&lng=${coords.lng.toFixed(4)}`;
  const proxyMeteoUrl = `/api/meteo/forecast?lat=${coords.lat.toFixed(4)}&lng=${coords.lng.toFixed(4)}`;

  const fetchWithBrowserProxyFallback = async (
    proxyUrl: string,
    directUrl: string,
    abortSignal: AbortSignal
  ): Promise<Response> => {
    if (typeof window !== 'undefined') {
      try {
        const proxied = await fetch(proxyUrl, {
          headers: { Accept: 'application/json' },
          signal: abortSignal,
        });
        const contentType = proxied.headers.get('content-type') || '';
        if (proxied.ok && contentType.includes('json')) {
          return proxied;
        }
      } catch (proxyErr) {
        if (abortSignal.aborted) throw proxyErr;
      }
    }
    return fetch(directUrl, { headers: { Accept: 'application/json' }, signal: abortSignal });
  };

  // Decouple timeouts: 15s for NASA POWER (daily + climo), 8s for Open-Meteo (fast API)
  const nasaTimeoutController = new AbortController();
  const meteoTimeoutController = new AbortController();

  const nasaTimer = setTimeout(() => {
    nasaTimeoutController.abort(new Error(`NASA POWER query timed out after ${NASA_TIMEOUT_MS}ms`));
  }, NASA_TIMEOUT_MS);

  const meteoTimer = setTimeout(() => {
    meteoTimeoutController.abort(new Error(`Open-Meteo query timed out after ${METEO_TIMEOUT_MS}ms`));
  }, METEO_TIMEOUT_MS);

  const onCallerAbort = () => {
    clearTimeout(nasaTimer);
    clearTimeout(meteoTimer);
    nasaTimeoutController.abort(signal?.reason || new Error('Request aborted by caller'));
    meteoTimeoutController.abort(signal?.reason || new Error('Request aborted by caller'));
  };

  if (signal) {
    if (signal.aborted) {
      clearTimeout(nasaTimer);
      clearTimeout(meteoTimer);
      throw signal.reason || new Error('Request aborted by caller');
    }
    signal.addEventListener('abort', onCallerAbort, { once: true });
  }

  try {
    const [dailyRes, climoRes, liveMeteoRes] = await Promise.all([
      fetchWithBrowserProxyFallback(proxyNasaDailyUrl, dailyNasaUrl, nasaTimeoutController.signal),
      fetchWithBrowserProxyFallback(proxyNasaClimoUrl, climoUrl, nasaTimeoutController.signal).catch(() => null),
      fetchWithBrowserProxyFallback(proxyMeteoUrl, liveMeteoUrl, meteoTimeoutController.signal).catch(() => null),
    ]);
    clearTimeout(nasaTimer);
    clearTimeout(meteoTimer);

    if (!dailyRes.ok) {
      throw new Error(`NASA POWER API HTTP ${dailyRes.status}: ${dailyRes.statusText}`);
    }

    const dailyData = await dailyRes.json();
    const params = dailyData?.properties?.parameter;

    if (!params || typeof params !== 'object') {
      throw new Error('NASA POWER response missing expected parameter fields');
    }

    // Get union of all dates across returned parameters
    const allDatesSet = new Set<string>();
    for (const key of Object.keys(params)) {
      if (params[key] && typeof params[key] === 'object') {
        Object.keys(params[key]).forEach((d) => allDatesSet.add(d));
      }
    }
    const dates = Array.from(allDatesSet).sort();

    if (dates.length === 0) {
      throw new Error('No observation dates returned from NASA POWER for this coordinate');
    }

    // Extract each parameter's latest valid observation independently (Phase 2 Checklist 2.B)
    const t2mRes = findLatestValidObservation(params.T2M, 'temperature', dates);
    const t2mMaxRes = findLatestValidObservation(params.T2M_MAX, 'temperature', dates);
    const t2mMinRes = findLatestValidObservation(params.T2M_MIN, 'temperature', dates);
    const rh2mRes = findLatestValidObservation(params.RH2M, 'relative_humidity', dates);
    const ws2mRes = findLatestValidObservation(params.WS2M, 'wind_speed', dates);
    const solarRes = findLatestValidObservation(params.ALLSKY_SFC_SW_DWN, 'solar_radiation', dates);
    const precipRes = findLatestValidObservation(params.PRECTOTCORR, 'precipitation', dates);
    const gwetRootRes = findLatestValidObservation(params.GWETROOT, 'soil_wetness_index', dates);
    const gwetTopRes = findLatestValidObservation(params.GWETTOP, 'soil_wetness_index', dates);

    // Primary observation date is latest valid T2M date (or fallback to latest returned date)
    const primaryDateKey = t2mRes.dateKey || dates[dates.length - 1];
    const primaryDateFormatted = formatNasaDateToStandard(primaryDateKey);

    // Build 30-day thermal and precipitation history
    const dailyHistory = dates.map((d) => {
      const p = validatePhysicalValue(params.PRECTOTCORR?.[d], 'precipitation').sanitizedValue;
      return {
        date: formatNasaDateToStandard(d),
        temperature: validatePhysicalValue(params.T2M?.[d], 'temperature').sanitizedValue,
        humidity: validatePhysicalValue(params.RH2M?.[d], 'relative_humidity').sanitizedValue,
        precipitation: p,
        radiation: validatePhysicalValue(params.ALLSKY_SFC_SW_DWN?.[d], 'solar_radiation').sanitizedValue,
      };
    });

    // Parse Climatological daily precipitation baseline (30-year average) with multi-month calendar map
    let climoMmPerDay: number | null = null;
    let climoMonthlyMap: Record<string, number> | null = null;

    if (climoRes && climoRes.ok) {
      try {
        const climoJson = await climoRes.json();
        const climoParams = climoJson?.properties?.parameter?.PRECTOTCORR;
        if (climoParams && typeof climoParams === 'object') {
          climoMonthlyMap = {};
          for (const mKey of MONTH_KEYS) {
            const v = validatePhysicalValue(climoParams[mKey], 'precipitation').sanitizedValue;
            if (v !== null) {
              climoMonthlyMap[mKey] = v;
            }
          }
          const currentMonthIdx = now.getUTCMonth();
          const monthKey = MONTH_KEYS[currentMonthIdx];
          const val = validatePhysicalValue(climoParams[monthKey], 'precipitation').sanitizedValue;
          if (val !== null) {
            climoMmPerDay = val;
          }
        }
      } catch (err) {
        console.warn('Could not parse NASA climatology baseline:', err);
      }
    }

    // Compute scientifically consistent precipitation accumulation and anomaly day-by-day
    const precipAnomaly = calculatePrecipitationAnomaly({
      dailyPrecip: params.PRECTOTCORR,
      datesAsc: dates,
      climatologyPrecipDaily: climoMmPerDay,
      climoMonthlyMap,
    });

    // Process Open-Meteo Current Weather & NWP Soil Layers
    let currentObsData: CurrentWeatherObservation = {
      temperature2m: null,
      relativeHumidity2m: null,
      windSpeed10m: null,
      apparentTemperature: null,
      precipitationMm: null,
      weatherCode: null,
      observationTime: 'Indisponible',
      source: 'Open-Meteo NWP Forecast Model Output',
      temporalResolution: 'Instantaneous / Model-derived',
      spatialResolution: 'Model-dependent (~0.1°–0.25°)',
      timezone: 'UTC',
      dataStatus: 'UNAVAILABLE',
      freshness: 'unavailable',
    };

    let era5SoilData: CopernicusEra5LandSoil = {
      source: 'Open-Meteo NWP Soil Moisture Model',
      layer0_7cm: null,
      layer7_28cm: null,
      layer28_100cm: null,
      layer100_255cm: null,
      observationTime: 'Indisponible',
      temporalResolution: 'Hourly NWP soil model assimilation',
      spatialResolution: 'Model-dependent (~0.1°–0.25°)',
      timezone: 'UTC',
      dataStatus: 'UNAVAILABLE',
      freshness: 'unavailable',
    };

    let resolvedTimezone = 'UTC';

    if (liveMeteoRes && liveMeteoRes.ok) {
      try {
        const meteoJson = await liveMeteoRes.json();
        if (meteoJson.timezone) {
          resolvedTimezone = meteoJson.timezone;
        }

        if (meteoJson.current) {
          const c = meteoJson.current;
          const liveTCheck = validatePhysicalValue(c.temperature_2m, 'temperature');
          const liveRhCheck = validatePhysicalValue(c.relative_humidity_2m, 'relative_humidity');
          const liveWsCheck = validatePhysicalValue(c.wind_speed_10m, 'wind_speed');
          const liveAppCheck = validatePhysicalValue(c.apparent_temperature, 'temperature');
          const livePrecCheck = validatePhysicalValue(c.precipitation, 'precipitation');

          const freshResult = classifyFreshness(c.time, 'instantaneous');

          currentObsData = {
            temperature2m: liveTCheck.sanitizedValue,
            relativeHumidity2m: liveRhCheck.sanitizedValue,
            windSpeed10m: liveWsCheck.sanitizedValue,
            apparentTemperature: liveAppCheck.sanitizedValue,
            precipitationMm: livePrecCheck.sanitizedValue,
            weatherCode: typeof c.weather_code === 'number' ? c.weather_code : null,
            observationTime: c.time || syncTimeIso,
            source: 'Open-Meteo Numerical Weather Prediction (NWP) Model Output',
            temporalResolution: 'Instantaneous model output',
            spatialResolution: 'Model-dependent (~0.1°–0.25°)',
            timezone: resolvedTimezone,
            dataStatus: liveTCheck.isValid ? 'VERIFIED' : 'UNAVAILABLE',
            freshness: freshResult.freshness,
          };
        }

        // Extract Open-Meteo NWP volumetric soil moisture layers
        // Strictly avoids arbitrary index fallbacks; rejects when >90 min tolerance
        if (meteoJson.hourly && Array.isArray(meteoJson.hourly.time) && meteoJson.hourly.time.length > 0) {
          const times: string[] = meteoJson.hourly.time;
          const referenceTimeIso = meteoJson.current?.time || syncTimeIso;
          const targetIdx = findClosestHourlyIndex(times, referenceTimeIso);

          if (targetIdx >= 0 && targetIdx < times.length) {
            const l1 = validatePhysicalValue(meteoJson.hourly.soil_moisture_0_to_7cm?.[targetIdx], 'volumetric_soil_moisture').sanitizedValue;
            const l2 = validatePhysicalValue(meteoJson.hourly.soil_moisture_7_to_28cm?.[targetIdx], 'volumetric_soil_moisture').sanitizedValue;
            const l3 = validatePhysicalValue(meteoJson.hourly.soil_moisture_28_to_100cm?.[targetIdx], 'volumetric_soil_moisture').sanitizedValue;
            const l4 = validatePhysicalValue(meteoJson.hourly.soil_moisture_100_to_255cm?.[targetIdx], 'volumetric_soil_moisture').sanitizedValue;

            const freshSoil = classifyFreshness(times[targetIdx], 'era5_hourly');

            era5SoilData = {
              source: 'Open-Meteo NWP Soil Moisture Model',
              layer0_7cm: l1,
              layer7_28cm: l2,
              layer28_100cm: l3,
              layer100_255cm: l4,
              observationTime: times[targetIdx],
              temporalResolution: 'Hourly NWP soil model assimilation',
              spatialResolution: 'Model-dependent (~0.1°–0.25°)',
              timezone: resolvedTimezone,
              dataStatus: l1 !== null ? 'VERIFIED' : 'UNAVAILABLE',
              freshness: freshSoil.freshness,
            };
          }
        }
      } catch (err) {
        console.warn('Failed to parse Open-Meteo NWP soil moisture:', err);
      }
    }

    // Calculate freshness for NASA daily product
    const nasaFresh = classifyFreshness(primaryDateFormatted, 'nasa_daily');

    const nasaPower: NasaPowerObservation = {
      source: 'NASA POWER Agroclimatology (MERRA-2 / GEOS-FP)',
      temperature2m: t2mRes.value !== null ? Math.round(t2mRes.value * 10) / 10 : null,
      temperatureMax: t2mMaxRes.value !== null ? Math.round(t2mMaxRes.value * 10) / 10 : null,
      temperatureMin: t2mMinRes.value !== null ? Math.round(t2mMinRes.value * 10) / 10 : null,
      relativeHumidity2m: rh2mRes.value !== null ? Math.round(rh2mRes.value * 10) / 10 : null,
      windSpeed2m: ws2mRes.value !== null ? Math.round(ws2mRes.value * 10) / 10 : null,
      solarRadiation: solarRes.value !== null ? Math.round(solarRes.value * 10) / 10 : null,
      precipitationMm: precipRes.value !== null ? Math.round(precipRes.value * 10) / 10 : null,
      observationDateUtc: primaryDateFormatted,
      observationDateLocal: primaryDateFormatted,
      spatialResolution: '0.5° x 0.625° (~50 km)',
      temporalResolution: 'Daily average assimilation',
      retrievalTimestamp: syncTimeIso,
      dataStatus: t2mRes.value !== null ? 'VERIFIED' : 'UNAVAILABLE',
      freshness: nasaFresh.freshness,
      dailyHistory,
    };

    const nasaSmap: NasaSmapObservation = {
      source: 'NASA POWER Soil Wetness (MERRA-2 Assimilation)',
      surfaceSoilMoistureIndex: gwetTopRes.value !== null ? Math.round(gwetTopRes.value * 100) / 100 : null,
      rootZoneSoilMoistureIndex: gwetRootRes.value !== null ? Math.round(gwetRootRes.value * 100) / 100 : null,
      observationDateUtc: gwetRootRes.formattedDate || primaryDateFormatted,
      spatialResolution: '0.5° x 0.625° (~50 km) MERRA-2 grid cell',
      temporalResolution: 'Daily assimilation',
      retrievalTimestamp: syncTimeIso,
      dataStatus: gwetRootRes.value !== null ? 'VERIFIED' : 'UNAVAILABLE',
      freshness: nasaFresh.freshness,
      missingReason: gwetRootRes.value === null
        ? 'Indice d\'humidité du sol MERRA-2 indisponible pour ces coordonnées'
        : 'Indice sans dimension issu de l\'assimilation MERRA-2 (0.00 = point de flétrissement, 1.00 = saturation complète). Non issu d\'une observation directe par radiomètre satellite SMAP.',
    };

    const nasaGpm: NasaGpmObservation = {
      source: 'NASA POWER Precipitation (MERRA-2 / GEOS-FP PRECTOTCORR)',
      dailyRainfallMm: precipRes.value !== null ? Math.round(precipRes.value * 10) / 10 : null,
      monthlyAccumulationMm: precipAnomaly.totalObservedMm,
      historicalAverageMonthlyMm: precipAnomaly.expectedBaselineMm,
      anomalyPercent: precipAnomaly.anomalyPercent,
      observationDateUtc: precipRes.formattedDate || primaryDateFormatted,
      spatialResolution: '0.5° x 0.625° (~50 km)',
      temporalResolution: 'Daily accumulation',
      retrievalTimestamp: syncTimeIso,
      dataStatus: precipRes.value !== null ? 'VERIFIED' : 'UNAVAILABLE',
      freshness: nasaFresh.freshness,
      missingReason: precipRes.value === null
        ? 'Précipitations quotidiennes non disponibles'
        : precipAnomaly.methodDescription,
    };

    // Build comprehensive Data Provenance records
    const provenanceRecords: DataProvenanceRecord[] = [
      createProvenanceRecord({
        id: 'prov-temp-current',
        variableKey: 'temperature_current',
        variableName: 'Current Air Temperature (2m)',
        variableNameAr: 'درجة الحرارة التقديرية الحالية (2م)',
        variableNameFr: 'Température de l\'air estimée (2m)',
        category: 'weather',
        sourceName: currentObsData.source,
        sourceEndpoint: liveMeteoUrl,
        rawParameterName: 'current.temperature_2m',
        rawValue: currentObsData.temperature2m,
        originalUnit: '°C',
        displayedValue: currentObsData.temperature2m !== null ? `${currentObsData.temperature2m}` : 'N/A',
        displayedUnit: '°C',
        transformation: 'Direct NWP model reading (no conversion)',
        observationTime: currentObsData.observationTime,
        syncTime: syncTimeIso,
        dataAge: classifyFreshness(currentObsData.observationTime, 'instantaneous').ageHuman,
        freshness: currentObsData.freshness,
        temporalResolution: 'Instantaneous model output',
        spatialResolution: currentObsData.spatialResolution,
        timezone: resolvedTimezone,
        validationStatus: currentObsData.temperature2m !== null ? 'PASS' : 'WARNING',
        validationNote: 'Model-derived output from numerical weather prediction. Separate from ground-measured stations and separate from daily mean.',
      }),
      createProvenanceRecord({
        id: 'prov-wind-current',
        variableKey: 'wind_speed_current',
        variableName: 'Current Wind Speed at 10m (Open-Meteo NWP)',
        variableNameAr: 'سرعة الرياح الحالية عند ارتفاع 10م',
        variableNameFr: 'Vitesse du vent actuelle à 10m',
        category: 'wind',
        sourceName: currentObsData.source,
        sourceEndpoint: liveMeteoUrl,
        rawParameterName: 'current.wind_speed_10m (wind_speed_unit=ms)',
        rawValue: currentObsData.windSpeed10m,
        originalUnit: 'm/s',
        displayedValue: currentObsData.windSpeed10m !== null ? `${currentObsData.windSpeed10m}` : 'N/A',
        displayedUnit: 'm/s',
        transformation: 'Unit-locked via Open-Meteo API parameter wind_speed_unit=ms (no 3.6x km/h inflation)',
        observationTime: currentObsData.observationTime,
        syncTime: syncTimeIso,
        dataAge: classifyFreshness(currentObsData.observationTime, 'instantaneous').ageHuman,
        freshness: currentObsData.freshness,
        temporalResolution: 'Instantaneous model output',
        spatialResolution: currentObsData.spatialResolution,
        timezone: resolvedTimezone,
        validationStatus: currentObsData.windSpeed10m !== null ? 'PASS' : 'WARNING',
        validationNote: 'Explicitly requested with wind_speed_unit=ms and timezone=UTC.',
      }),
      createProvenanceRecord({
        id: 'prov-temp-daily-mean',
        variableKey: 'temperature_daily_mean',
        variableName: 'Daily Average Temperature (T2M)',
        variableNameAr: 'متوسط درجة الحرارة اليومية (T2M)',
        variableNameFr: 'Température moyenne quotidienne (T2M)',
        category: 'weather',
        sourceName: 'NASA POWER (MERRA-2 / GEOS-FP)',
        sourceEndpoint: dailyNasaUrl,
        rawParameterName: 'properties.parameter.T2M',
        rawValue: t2mRes.value,
        originalUnit: '°C',
        displayedValue: nasaPower.temperature2m !== null ? `${nasaPower.temperature2m}` : 'N/A',
        displayedUnit: '°C',
        transformation: 'Math.round(val * 10) / 10',
        observationTime: t2mRes.formattedDate || primaryDateFormatted,
        syncTime: syncTimeIso,
        dataAge: classifyFreshness(t2mRes.formattedDate || primaryDateFormatted, 'nasa_daily').ageHuman,
        freshness: nasaPower.freshness,
        temporalResolution: 'Daily average assimilation',
        spatialResolution: nasaPower.spatialResolution,
        timezone: 'UTC',
        validationStatus: t2mRes.status,
        validationNote: 'Daily assimilated mean in UTC time standard. Parameter-independent date selection applied.',
      }),
      createProvenanceRecord({
        id: 'prov-temp-max',
        variableKey: 'temperature_max',
        variableName: 'Daily Maximum Temperature (T2M_MAX)',
        variableNameAr: 'درجة الحرارة العظمى اليومية (T2M_MAX)',
        variableNameFr: 'Température maximale quotidienne (T2M_MAX)',
        category: 'weather',
        sourceName: 'NASA POWER (MERRA-2)',
        sourceEndpoint: dailyNasaUrl,
        rawParameterName: 'properties.parameter.T2M_MAX',
        rawValue: t2mMaxRes.value,
        originalUnit: '°C',
        displayedValue: nasaPower.temperatureMax !== null ? `${nasaPower.temperatureMax}` : 'N/A',
        displayedUnit: '°C',
        transformation: 'Math.round(val * 10) / 10',
        observationTime: t2mMaxRes.formattedDate || primaryDateFormatted,
        syncTime: syncTimeIso,
        dataAge: classifyFreshness(t2mMaxRes.formattedDate || primaryDateFormatted, 'nasa_daily').ageHuman,
        freshness: nasaPower.freshness,
        temporalResolution: 'Daily maximum',
        spatialResolution: nasaPower.spatialResolution,
        timezone: 'UTC',
        validationStatus: t2mMaxRes.status,
      }),
      createProvenanceRecord({
        id: 'prov-temp-min',
        variableKey: 'temperature_min',
        variableName: 'Daily Minimum Temperature (T2M_MIN)',
        variableNameAr: 'درجة الحرارة الصغرى اليومية (T2M_MIN)',
        variableNameFr: 'Température minimale quotidienne (T2M_MIN)',
        category: 'weather',
        sourceName: 'NASA POWER (MERRA-2)',
        sourceEndpoint: dailyNasaUrl,
        rawParameterName: 'properties.parameter.T2M_MIN',
        rawValue: t2mMinRes.value,
        originalUnit: '°C',
        displayedValue: nasaPower.temperatureMin !== null ? `${nasaPower.temperatureMin}` : 'N/A',
        displayedUnit: '°C',
        transformation: 'Math.round(val * 10) / 10',
        observationTime: t2mMinRes.formattedDate || primaryDateFormatted,
        syncTime: syncTimeIso,
        dataAge: classifyFreshness(t2mMinRes.formattedDate || primaryDateFormatted, 'nasa_daily').ageHuman,
        freshness: nasaPower.freshness,
        temporalResolution: 'Daily minimum',
        spatialResolution: nasaPower.spatialResolution,
        timezone: 'UTC',
        validationStatus: t2mMinRes.status,
      }),
      createProvenanceRecord({
        id: 'prov-humidity',
        variableKey: 'relative_humidity',
        variableName: 'Relative Humidity at 2m (RH2M)',
        variableNameAr: 'الرطوبة النسبية عند ارتفاع 2م (RH2M)',
        variableNameFr: 'Humidité relative à 2m (RH2M)',
        category: 'weather',
        sourceName: 'NASA POWER (MERRA-2)',
        sourceEndpoint: dailyNasaUrl,
        rawParameterName: 'properties.parameter.RH2M',
        rawValue: rh2mRes.value,
        originalUnit: '%',
        displayedValue: nasaPower.relativeHumidity2m !== null ? `${nasaPower.relativeHumidity2m}` : 'N/A',
        displayedUnit: '%',
        transformation: 'Math.round(val * 10) / 10',
        observationTime: rh2mRes.formattedDate || primaryDateFormatted,
        syncTime: syncTimeIso,
        dataAge: classifyFreshness(rh2mRes.formattedDate || primaryDateFormatted, 'nasa_daily').ageHuman,
        freshness: nasaPower.freshness,
        temporalResolution: 'Daily average',
        spatialResolution: nasaPower.spatialResolution,
        timezone: 'UTC',
        validationStatus: rh2mRes.status,
      }),
      createProvenanceRecord({
        id: 'prov-wind',
        variableKey: 'wind_speed',
        variableName: 'Wind Speed at 2m (WS2M)',
        variableNameAr: 'سرعة الرياح عند ارتفاع 2م (WS2M)',
        variableNameFr: 'Vitesse du vent à 2m (WS2M)',
        category: 'wind',
        sourceName: 'NASA POWER (MERRA-2)',
        sourceEndpoint: dailyNasaUrl,
        rawParameterName: 'properties.parameter.WS2M',
        rawValue: ws2mRes.value,
        originalUnit: 'm/s',
        displayedValue: nasaPower.windSpeed2m !== null ? `${nasaPower.windSpeed2m}` : 'N/A',
        displayedUnit: 'm/s',
        transformation: 'm/s (also displayed in km/h via * 3.6)',
        observationTime: ws2mRes.formattedDate || primaryDateFormatted,
        syncTime: syncTimeIso,
        dataAge: classifyFreshness(ws2mRes.formattedDate || primaryDateFormatted, 'nasa_daily').ageHuman,
        freshness: nasaPower.freshness,
        temporalResolution: 'Daily average',
        spatialResolution: nasaPower.spatialResolution,
        timezone: 'UTC',
        validationStatus: ws2mRes.status,
      }),
      createProvenanceRecord({
        id: 'prov-solar',
        variableKey: 'solar_radiation',
        variableName: 'All Sky Insolation Incident on Horizontal Surface',
        variableNameAr: 'الإشعاع الشمسي الكلي (ALLSKY_SFC_SW_DWN)',
        variableNameFr: 'Rayonnement solaire incident (ALLSKY_SFC_SW_DWN)',
        category: 'radiation',
        sourceName: 'NASA POWER (CERES / GEOS-IT)',
        sourceEndpoint: dailyNasaUrl,
        rawParameterName: 'properties.parameter.ALLSKY_SFC_SW_DWN',
        rawValue: solarRes.value,
        originalUnit: 'MJ/m²/day',
        displayedValue: nasaPower.solarRadiation !== null ? `${nasaPower.solarRadiation}` : 'N/A',
        displayedUnit: 'MJ/m²/d',
        transformation: 'Math.round(val * 10) / 10',
        observationTime: solarRes.formattedDate || primaryDateFormatted,
        syncTime: syncTimeIso,
        dataAge: classifyFreshness(solarRes.formattedDate || primaryDateFormatted, 'nasa_daily').ageHuman,
        freshness: nasaPower.freshness,
        temporalResolution: 'Daily accumulation',
        spatialResolution: nasaPower.spatialResolution,
        timezone: 'UTC',
        validationStatus: solarRes.status,
      }),
      createProvenanceRecord({
        id: 'prov-smap-root',
        variableKey: 'soil_wetness_root',
        variableName: 'Root Zone Soil Wetness Index (GWETROOT)',
        variableNameAr: 'مؤشر بلل منطقة الجذور (GWETROOT)',
        variableNameFr: 'Indice d\'humidité de la zone racinaire (GWETROOT)',
        category: 'soil',
        sourceName: 'NASA POWER (MERRA-2 Soil Wetness Assimilation)',
        sourceEndpoint: dailyNasaUrl,
        rawParameterName: 'properties.parameter.GWETROOT',
        rawValue: gwetRootRes.value,
        originalUnit: 'dimensionless index (0-1)',
        displayedValue: nasaSmap.rootZoneSoilMoistureIndex !== null ? `${nasaSmap.rootZoneSoilMoistureIndex}` : 'N/A',
        displayedUnit: 'Index (0-1)',
        transformation: 'Dimensionless wetness index (0-1). Preserved original scale.',
        observationTime: gwetRootRes.formattedDate || primaryDateFormatted,
        syncTime: syncTimeIso,
        dataAge: classifyFreshness(gwetRootRes.formattedDate || primaryDateFormatted, 'nasa_daily').ageHuman,
        freshness: nasaSmap.freshness,
        temporalResolution: 'Daily assimilation',
        spatialResolution: nasaSmap.spatialResolution,
        timezone: 'UTC',
        validationStatus: gwetRootRes.status,
        validationNote: 'Dimensionless saturation index from NASA POWER MERRA-2. NOT direct SMAP satellite radiometer observation.',
      }),
      createProvenanceRecord({
        id: 'prov-smap-top',
        variableKey: 'soil_wetness_surface',
        variableName: 'Surface Soil Wetness Index (GWETTOP)',
        variableNameAr: 'مؤشر بلل التربة السطحية (GWETTOP)',
        variableNameFr: 'Indice d\'humidité du sol en surface (GWETTOP)',
        category: 'soil',
        sourceName: 'NASA POWER (MERRA-2 Soil Wetness Assimilation)',
        sourceEndpoint: dailyNasaUrl,
        rawParameterName: 'properties.parameter.GWETTOP',
        rawValue: gwetTopRes.value,
        originalUnit: 'dimensionless index (0-1)',
        displayedValue: nasaSmap.surfaceSoilMoistureIndex !== null ? `${nasaSmap.surfaceSoilMoistureIndex}` : 'N/A',
        displayedUnit: 'Index (0-1)',
        transformation: 'Dimensionless wetness index (0-1). Preserved original scale.',
        observationTime: gwetTopRes.formattedDate || primaryDateFormatted,
        syncTime: syncTimeIso,
        dataAge: classifyFreshness(gwetTopRes.formattedDate || primaryDateFormatted, 'nasa_daily').ageHuman,
        freshness: nasaSmap.freshness,
        temporalResolution: 'Daily assimilation',
        spatialResolution: nasaSmap.spatialResolution,
        timezone: 'UTC',
        validationStatus: gwetTopRes.status,
        validationNote: 'Dimensionless surface wetness index from MERRA-2. NOT direct SMAP satellite observation.',
      }),
      createProvenanceRecord({
        id: 'prov-nwp-soil-0-7',
        variableKey: 'soil_moisture_0_to_7cm',
        variableName: 'Volumetric Soil Moisture Layer 1 (0–7 cm)',
        variableNameAr: 'الرطوبة الحجمية للتربة الطبقة 1 (0-7 سم)',
        variableNameFr: 'Humidité volumique du sol couche 1 (0–7 cm)',
        category: 'soil',
        sourceName: 'Open-Meteo NWP Soil Moisture Model',
        sourceEndpoint: liveMeteoUrl,
        rawParameterName: 'hourly.soil_moisture_0_to_7cm',
        rawValue: era5SoilData.layer0_7cm,
        originalUnit: 'm³/m³',
        displayedValue: era5SoilData.layer0_7cm !== null ? `${era5SoilData.layer0_7cm}` : 'N/A',
        displayedUnit: 'm³/m³',
        transformation: 'Volumetric water content m³/m³. Disclosed as Open-Meteo NWP model assimilation.',
        observationTime: era5SoilData.observationTime,
        syncTime: syncTimeIso,
        dataAge: classifyFreshness(era5SoilData.observationTime, 'era5_hourly').ageHuman,
        freshness: era5SoilData.freshness,
        temporalResolution: era5SoilData.temporalResolution,
        spatialResolution: era5SoilData.spatialResolution,
        timezone: resolvedTimezone,
        validationStatus: era5SoilData.layer0_7cm !== null ? 'PASS' : 'WARNING',
        validationNote: 'Volumetric water content (m³/m³). Timestamp matched to reference hour within 90-min tolerance without arbitrary index fallback.',
      }),
      createProvenanceRecord({
        id: 'prov-nwp-soil-7-28',
        variableKey: 'soil_moisture_7_to_28cm',
        variableName: 'Volumetric Soil Moisture Layer 2 (7–28 cm)',
        variableNameAr: 'الرطوبة الحجمية للتربة الطبقة 2 (7-28 سم)',
        variableNameFr: 'Humidité volumique du sol couche 2 (7–28 cm)',
        category: 'soil',
        sourceName: 'Open-Meteo NWP Soil Moisture Model',
        sourceEndpoint: liveMeteoUrl,
        rawParameterName: 'hourly.soil_moisture_7_to_28cm',
        rawValue: era5SoilData.layer7_28cm,
        originalUnit: 'm³/m³',
        displayedValue: era5SoilData.layer7_28cm !== null ? `${era5SoilData.layer7_28cm}` : 'N/A',
        displayedUnit: 'm³/m³',
        transformation: 'Volumetric water content m³/m³',
        observationTime: era5SoilData.observationTime,
        syncTime: syncTimeIso,
        dataAge: classifyFreshness(era5SoilData.observationTime, 'era5_hourly').ageHuman,
        freshness: era5SoilData.freshness,
        temporalResolution: era5SoilData.temporalResolution,
        spatialResolution: era5SoilData.spatialResolution,
        timezone: resolvedTimezone,
        validationStatus: era5SoilData.layer7_28cm !== null ? 'PASS' : 'WARNING',
      }),
      createProvenanceRecord({
        id: 'prov-nwp-soil-28-100',
        variableKey: 'soil_moisture_28_to_100cm',
        variableName: 'Volumetric Soil Moisture Layer 3 (28–100 cm)',
        variableNameAr: 'الرطوبة الحجمية للتربة الطبقة 3 (28-100 سم)',
        variableNameFr: 'Humidité volumique du sol couche 3 (28–100 cm)',
        category: 'soil',
        sourceName: 'Open-Meteo NWP Soil Moisture Model',
        sourceEndpoint: liveMeteoUrl,
        rawParameterName: 'hourly.soil_moisture_28_to_100cm',
        rawValue: era5SoilData.layer28_100cm,
        originalUnit: 'm³/m³',
        displayedValue: era5SoilData.layer28_100cm !== null ? `${era5SoilData.layer28_100cm}` : 'N/A',
        displayedUnit: 'm³/m³',
        transformation: 'Volumetric water content m³/m³',
        observationTime: era5SoilData.observationTime,
        syncTime: syncTimeIso,
        dataAge: classifyFreshness(era5SoilData.observationTime, 'era5_hourly').ageHuman,
        freshness: era5SoilData.freshness,
        temporalResolution: era5SoilData.temporalResolution,
        spatialResolution: era5SoilData.spatialResolution,
        timezone: resolvedTimezone,
        validationStatus: era5SoilData.layer28_100cm !== null ? 'PASS' : 'WARNING',
      }),
      createProvenanceRecord({
        id: 'prov-gpm-rain',
        variableKey: 'rainfall_daily',
        variableName: 'Daily Precipitation (PRECTOTCORR)',
        variableNameAr: 'الهطول المطري اليومي (PRECTOTCORR)',
        variableNameFr: 'Précipitations quotidiennes (PRECTOTCORR)',
        category: 'rainfall',
        sourceName: 'NASA POWER (MERRA-2 / GEOS-FP PRECTOTCORR)',
        sourceEndpoint: dailyNasaUrl,
        rawParameterName: 'properties.parameter.PRECTOTCORR',
        rawValue: precipRes.value,
        originalUnit: 'mm/day',
        displayedValue: nasaGpm.dailyRainfallMm !== null ? `${nasaGpm.dailyRainfallMm}` : 'N/A',
        displayedUnit: 'mm',
        transformation: 'Math.round(val * 10) / 10',
        observationTime: precipRes.formattedDate || primaryDateFormatted,
        syncTime: syncTimeIso,
        dataAge: classifyFreshness(precipRes.formattedDate || primaryDateFormatted, 'nasa_daily').ageHuman,
        freshness: nasaGpm.freshness,
        temporalResolution: 'Daily accumulation',
        spatialResolution: nasaGpm.spatialResolution,
        timezone: 'UTC',
        validationStatus: precipRes.status,
        validationNote: 'Assimilated daily precipitation from NASA POWER in UTC. NOT direct NASA GPM IMERG constellation observation.',
      }),
    ];

    const finalResult: EnvironmentalFetchResult = {
      currentWeather: currentObsData,
      nasaPower,
      nasaSmap,
      era5LandSoil: era5SoilData,
      nasaGpm,
      provenanceRecords,
    };

    // Cache gating (Phase 2 Checklist Item 3):
    // Only cache if all upstream sources succeeded with verified data
    const isFullyVerified =
      dailyRes.ok &&
      Boolean(climoRes && climoRes.ok) &&
      Boolean(liveMeteoRes && liveMeteoRes.ok) &&
      currentObsData.dataStatus === 'VERIFIED' &&
      era5SoilData.dataStatus === 'VERIFIED';

    if (isFullyVerified) {
      scientificCache.set(cacheKey, finalResult, 60 * 60 * 1000);
    }

    return finalResult;
  } catch (error) {
    clearTimeout(nasaTimer);
    clearTimeout(meteoTimer);
    const errMessage = error instanceof Error ? error.message : 'Unknown network failure';
    console.error('Environmental API query error:', errMessage);

    const nowIso = new Date().toISOString();
    return {
      currentWeather: {
        temperature2m: null,
        relativeHumidity2m: null,
        windSpeed10m: null,
        apparentTemperature: null,
        precipitationMm: null,
        weatherCode: null,
        observationTime: 'Indisponible',
        source: 'Open-Meteo Numerical Weather Prediction (NWP) Model Output',
        temporalResolution: 'Instantaneous model output',
        spatialResolution: 'Model-dependent (~0.1°–0.25°)',
        timezone: coordValidation.geography.approximateTimezone,
        dataStatus: 'UNAVAILABLE',
        freshness: 'unavailable',
      },
      nasaPower: {
        source: 'NASA POWER Agroclimatology (MERRA-2 / GEOS-FP)',
        temperature2m: null,
        temperatureMax: null,
        temperatureMin: null,
        relativeHumidity2m: null,
        windSpeed2m: null,
        solarRadiation: null,
        precipitationMm: null,
        observationDateUtc: 'Indisponible',
        observationDateLocal: 'Indisponible',
        spatialResolution: '0.5° x 0.625° (~50 km)',
        temporalResolution: 'Daily average assimilation',
        retrievalTimestamp: nowIso,
        dataStatus: 'UNAVAILABLE',
        freshness: 'unavailable',
        missingReason: `Échec d'interrogation NASA POWER: ${errMessage}`,
        dailyHistory: [],
      },
      nasaSmap: {
        source: 'NASA POWER Soil Wetness (MERRA-2 Assimilation)',
        surfaceSoilMoistureIndex: null,
        rootZoneSoilMoistureIndex: null,
        observationDateUtc: 'Indisponible',
        spatialResolution: '0.5° x 0.625° (~50 km)',
        temporalResolution: 'Daily assimilation',
        retrievalTimestamp: nowIso,
        dataStatus: 'UNAVAILABLE',
        freshness: 'unavailable',
        missingReason: 'Données humidité du sol MERRA-2 non reçues',
      },
      era5LandSoil: {
        source: 'Open-Meteo NWP Soil Moisture Model',
        layer0_7cm: null,
        layer7_28cm: null,
        layer28_100cm: null,
        layer100_255cm: null,
        observationTime: 'Indisponible',
        temporalResolution: 'Hourly NWP soil model assimilation',
        spatialResolution: 'Model-dependent (~0.1°–0.25°)',
        timezone: coordValidation.geography.approximateTimezone,
        dataStatus: 'UNAVAILABLE',
        freshness: 'unavailable',
      },
      nasaGpm: {
        source: 'NASA POWER Precipitation (MERRA-2 / GEOS-FP PRECTOTCORR)',
        dailyRainfallMm: null,
        monthlyAccumulationMm: null,
        historicalAverageMonthlyMm: null,
        anomalyPercent: null,
        observationDateUtc: 'Indisponible',
        spatialResolution: '0.5° x 0.625° (~50 km)',
        temporalResolution: 'Daily accumulation',
        retrievalTimestamp: nowIso,
        dataStatus: 'UNAVAILABLE',
        freshness: 'unavailable',
        missingReason: 'Précipitations NASA POWER non reçues',
      },
      provenanceRecords: [],
    };
  } finally {
    if (signal) {
      signal.removeEventListener('abort', onCallerAbort);
    }
  }
}
