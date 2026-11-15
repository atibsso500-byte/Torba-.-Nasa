/**
 * TURBA Backend Server (Node.js + Express)
 * Provides authenticated proxies, coordinate-keyed caching, and server-side processing for NASA and Copernicus APIs.
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '256kb' }));

// Non-blocking security headers
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  next();
});

// Bounded in-memory per-IP rate limiting for /api/* proxy endpoints
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 120;
const MAX_RATE_ENTRIES = 2000;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

app.use('/api', (req, res, next) => {
  if (req.path === '/health') {
    next();
    return;
  }
  const now = Date.now();
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  let entry = rateLimitMap.get(clientIp);

  if (!entry || now >= entry.resetAt) {
    if (rateLimitMap.size >= MAX_RATE_ENTRIES) {
      for (const [ip, rec] of rateLimitMap.entries()) {
        if (now >= rec.resetAt) rateLimitMap.delete(ip);
      }
      if (rateLimitMap.size >= MAX_RATE_ENTRIES) {
        const oldestKey = rateLimitMap.keys().next().value;
        if (oldestKey !== undefined) rateLimitMap.delete(oldestKey);
      }
    }
    entry = { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
  }

  entry.count += 1;
  rateLimitMap.set(clientIp, entry);

  const remaining = Math.max(0, RATE_LIMIT_MAX_REQUESTS - entry.count);
  res.setHeader('X-RateLimit-Limit', String(RATE_LIMIT_MAX_REQUESTS));
  res.setHeader('X-RateLimit-Remaining', String(remaining));

  if (entry.count > RATE_LIMIT_MAX_REQUESTS) {
    const retryAfterSec = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    res.setHeader('Retry-After', String(retryAfterSec));
    res.status(429).json({
      error: 'Too many requests to TURBA API proxy. Please retry shortly.',
      retryAfterSeconds: retryAfterSec,
    });
    return;
  }

  next();
});

// Bounded in-memory cache strictly keyed by coordinate and observation period
const apiCache = new Map<string, { timestamp: number; data: unknown }>();
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes cache for daily agroclimatology
const MAX_CACHE_ENTRIES = 250;

function setBoundedCache(key: string, data: unknown): void {
  const now = Date.now();
  if (apiCache.has(key)) {
    apiCache.delete(key);
  } else if (apiCache.size >= MAX_CACHE_ENTRIES) {
    for (const [k, v] of apiCache.entries()) {
      if (now - v.timestamp > CACHE_TTL_MS * 2) {
        apiCache.delete(k);
      }
    }
    while (apiCache.size >= MAX_CACHE_ENTRIES) {
      const oldestKey = apiCache.keys().next().value;
      if (oldestKey === undefined) break;
      apiCache.delete(oldestKey);
    }
  }
  apiCache.set(key, { timestamp: now, data });
}

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'TURBA-Morocco-Agricultural-Intelligence',
    timestamp: new Date().toISOString(),
  });
});

// Validation helpers
function validateGeoParams(lat: unknown, lng: unknown): { isValid: boolean; latNum: number; lngNum: number; error?: string } {
 if (
  lat === undefined ||
  lng === undefined ||
  String(lat).trim() === "" ||
  String(lng).trim() === ""
) {
  return {
    isValid: false,
    latNum: 0,
    lngNum: 0,
    error: "Latitude and longitude are required"
  };
 }
  const latNum = Number(lat);
  const lngNum = Number(lng);
  if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
    return { isValid: false, latNum: 0, lngNum: 0, error: 'Coordinates must be valid finite numbers' };
  }
  if (latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
    return { isValid: false, latNum: 0, lngNum: 0, error: 'Coordinates out of WGS84 range [-90..90, -180..180]' };
  }
  return { isValid: true, latNum, lngNum };
}

function parseYyyyMmDdUtc(str: string): Date | null {
  if (!/^\d{8}$/.test(str)) return null;
  const year = Number(str.slice(0, 4));
  const month = Number(str.slice(4, 6));
  const day = Number(str.slice(6, 8));
  const dt = new Date(Date.UTC(year, month - 1, day));
  if (
    dt.getUTCFullYear() !== year ||
    dt.getUTCMonth() + 1 !== month ||
    dt.getUTCDate() !== day
  ) {
    return null;
  }
  return dt;
}

function validateDateRange(start: unknown, end: unknown): { isValid: boolean; startStr: string; endStr: string; error?: string } {
  const startStr = String(start || '');
  const endStr = String(end || '');
  const startDt = parseYyyyMmDdUtc(startStr);
  const endDt = parseYyyyMmDdUtc(endStr);
  if (!startDt || !endDt) {
    return { isValid: false, startStr: '', endStr: '', error: 'Start and end dates must be valid calendar dates in YYYYMMDD format' };
  }
  if (startDt.getTime() > endDt.getTime()) {
    return { isValid: false, startStr: '', endStr: '', error: 'Start date must be on or before end date' };
  }
  const spanDays = (endDt.getTime() - startDt.getTime()) / 86400000;
  if (spanDays > 366) {
    return { isValid: false, startStr: '', endStr: '', error: 'Requested date range cannot exceed 366 days' };
  }
  return { isValid: true, startStr, endStr };
}

async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 12000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error(`Upstream timeout after ${timeoutMs}ms`)), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// NASA POWER daily agroclimatology proxy
app.get('/api/nasa/power', async (req, res) => {
  const { lat, lng, start, end } = req.query;

  const geoCheck = validateGeoParams(lat, lng);
  if (!geoCheck.isValid) {
    res.status(400).json({ error: geoCheck.error });
    return;
  }

  const dateCheck = validateDateRange(start, end);
  if (!dateCheck.isValid) {
    res.status(400).json({ error: dateCheck.error });
    return;
  }

  const cacheKey = `nasa-power-${geoCheck.latNum.toFixed(4)}-${geoCheck.lngNum.toFixed(4)}-${dateCheck.startStr}-${dateCheck.endStr}`;
  const cached = apiCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    res.json(cached.data);
    return;
  }

  try {
    const parameters = 'T2M,T2M_MAX,T2M_MIN,RH2M,WS2M,ALLSKY_SFC_SW_DWN,PRECTOTCORR,PS,GWETROOT,GWETTOP';
    // Explicitly enforce &time-standard=UTC
    const nasaUrl = `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=${parameters}&community=AG&longitude=${geoCheck.lngNum.toFixed(4)}&latitude=${geoCheck.latNum.toFixed(4)}&start=${dateCheck.startStr}&end=${dateCheck.endStr}&time-standard=UTC&format=JSON`;

    const response = await fetchWithTimeout(nasaUrl, {
      headers: { Accept: 'application/json' },
    }, 15000);

    if (!response.ok) {
      res.status(response.status).json({ error: `NASA POWER API error: ${response.statusText}` });
      return;
    }

    const data = await response.json();
    setBoundedCache(cacheKey, data);
    res.json(data);
  } catch (error) {
    console.error('Server error proxying NASA POWER:', error);
    res.status(502).json({ error: 'Failed to communicate with NASA POWER service' });
  }
});

// NASA POWER 30-year climatology baseline proxy
app.get('/api/nasa/climatology', async (req, res) => {
  const { lat, lng } = req.query;

  const geoCheck = validateGeoParams(lat, lng);
  if (!geoCheck.isValid) {
    res.status(400).json({ error: geoCheck.error });
    return;
  }

  const cacheKey = `nasa-climo-${geoCheck.latNum.toFixed(4)}-${geoCheck.lngNum.toFixed(4)}`;
  const cached = apiCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS * 2) {
    res.json(cached.data);
    return;
  }

  try {
    const climoUrl = `https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=PRECTOTCORR&community=AG&longitude=${geoCheck.lngNum.toFixed(4)}&latitude=${geoCheck.latNum.toFixed(4)}&format=JSON`;
    const response = await fetchWithTimeout(climoUrl, {
      headers: { Accept: 'application/json' },
    }, 15000);

    if (!response.ok) {
      res.status(response.status).json({ error: `NASA Climatology error: ${response.statusText}` });
      return;
    }

    const data = await response.json();
    setBoundedCache(cacheKey, data);
    res.json(data);
  } catch (error) {
    console.error('Server error proxying NASA Climatology:', error);
    res.status(502).json({ error: 'Failed to communicate with NASA POWER Climatology service' });
  }
});

// Open-Meteo NWP forecast & soil moisture proxy
app.get('/api/meteo/forecast', async (req, res) => {
  const { lat, lng } = req.query;

  const geoCheck = validateGeoParams(lat, lng);
  if (!geoCheck.isValid) {
    res.status(400).json({ error: geoCheck.error });
    return;
  }

  const cacheKey = `meteo-forecast-${geoCheck.latNum.toFixed(4)}-${geoCheck.lngNum.toFixed(4)}`;
  const cached = apiCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < 1000 * 60 * 15) {
    res.json(cached.data);
    return;
  }

  try {
    const meteoUrl = `https://api.open-meteo.com/v1/forecast?latitude=${geoCheck.latNum.toFixed(4)}&longitude=${geoCheck.lngNum.toFixed(4)}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,wind_speed_10m,weather_code&hourly=soil_moisture_0_to_7cm,soil_moisture_7_to_28cm,soil_moisture_28_to_100cm,soil_moisture_100_to_255cm&wind_speed_unit=ms&timezone=UTC`;
    const response = await fetchWithTimeout(meteoUrl, {
      headers: { Accept: 'application/json' },
    }, 10000);

    if (!response.ok) {
      res.status(response.status).json({ error: `Open-Meteo API error: ${response.statusText}` });
      return;
    }

    const data = await response.json();
    setBoundedCache(cacheKey, data);
    res.json(data);
  } catch (error) {
    console.error('Server error proxying Open-Meteo:', error);
    res.status(502).json({ error: 'Failed to communicate with Open-Meteo service' });
  }
});

// Open-Meteo daily agro-forecast (past 14 days + future 14 days) for Phase 3 Irrigation Engine
app.get('/api/meteo/daily-forecast', async (req, res) => {
  const { lat, lng } = req.query;

  const geoCheck = validateGeoParams(lat, lng);
  if (!geoCheck.isValid) {
    res.status(400).json({ error: geoCheck.error });
    return;
  }

  const cacheKey = `meteo-daily-${geoCheck.latNum.toFixed(4)}-${geoCheck.lngNum.toFixed(4)}`;
  const cached = apiCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < 1000 * 60 * 20) {
    res.json(cached.data);
    return;
  }

  try {
    const meteoUrl = `https://api.open-meteo.com/v1/forecast?latitude=${geoCheck.latNum.toFixed(4)}&longitude=${geoCheck.lngNum.toFixed(4)}&past_days=14&forecast_days=14&daily=temperature_2m_max,temperature_2m_min,temperature_2m_mean,relative_humidity_2m_mean,wind_speed_10m_mean,shortwave_radiation_sum,precipitation_sum,et0_fao_evapotranspiration&hourly=soil_moisture_0_to_7cm,soil_moisture_7_to_28cm,soil_moisture_28_to_100cm&wind_speed_unit=ms&timezone=UTC`;
    const response = await fetchWithTimeout(meteoUrl, {
      headers: { Accept: 'application/json' },
    }, 10000);

    if (!response.ok) {
      res.status(response.status).json({ error: `Open-Meteo daily forecast error: ${response.statusText}` });
      return;
    }

    const data = await response.json();
    setBoundedCache(cacheKey, data);
    res.json(data);
  } catch (error) {
    console.error('Server error proxying Open-Meteo daily forecast:', error);
    res.status(502).json({ error: 'Failed to communicate with Open-Meteo daily forecast service' });
  }
});

// ISRIC SoilGrids v2.0 properties proxy (250m spatial estimates; never cached as valid data on error)
let soilGridsOutageUntil = 0;

app.get('/api/soilgrids/properties', async (req, res) => {
  const { lat, lng } = req.query;

  const geoCheck = validateGeoParams(lat, lng);
  if (!geoCheck.isValid) {
    res.status(400).json({ error: geoCheck.error });
    return;
  }

  const cacheKey = `soilgrids-${geoCheck.latNum.toFixed(4)}-${geoCheck.lngNum.toFixed(4)}`;
  const cached = apiCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < 1000 * 60 * 60 * 12) {
    res.json(cached.data);
    return;
  }

  const now = Date.now();
  if (now < soilGridsOutageUntil) {
    const retryAfterSec = Math.max(1, Math.ceil((soilGridsOutageUntil - now) / 1000));
    res.setHeader('Retry-After', String(retryAfterSec));
    res.status(503).json({ error: 'ISRIC SoilGrids service temporarily unavailable (cooldown active)' });
    return;
  }

  try {
    // Request the 3 required hydraulic inputs (clay, sand, soc) to cut ISRIC raster reads by 40%
    const url =
      `https://rest.isric.org/soilgrids/v2.0/properties/query?lon=${geoCheck.lngNum.toFixed(4)}&lat=${geoCheck.latNum.toFixed(4)}` +
      `&property=clay&property=sand&property=soc` +
      `&depth=0-5cm&depth=5-15cm&depth=15-30cm&depth=30-60cm&depth=60-100cm&value=mean`;

    const response = await fetchWithTimeout(url, {
      headers: { Accept: 'application/json' },
    }, 15000);

    if (!response.ok) {
      if (response.status === 429 || response.status >= 500) {
        soilGridsOutageUntil = Date.now() + 60 * 1000;
      }
      res.status(response.status).json({ error: `ISRIC SoilGrids HTTP ${response.status}: ${response.statusText}` });
      return;
    }

    const data = await response.json();
    soilGridsOutageUntil = 0;
    setBoundedCache(cacheKey, data);
    res.json(data);
  } catch (error) {
    soilGridsOutageUntil = Date.now() + 60 * 1000;
    const isTimeout = error instanceof Error && (error.name === 'AbortError' || error.message.includes('timeout'));
    if (isTimeout) {
      console.warn('ISRIC SoilGrids upstream request timed out (60s cooldown enabled):', error instanceof Error ? error.message : error);
      res.status(504).json({ error: 'ISRIC SoilGrids service timed out' });
      return;
    }
    console.warn('ISRIC SoilGrids upstream request unavailable:', error instanceof Error ? error.message : error);
    res.status(503).json({ error: 'ISRIC SoilGrids service unavailable' });
  }
});

// Copernicus CDSE Sentinel-2 OData products catalog proxy
app.get('/api/copernicus/products', async (req, res) => {
  const { lat, lng } = req.query;

  const geoCheck = validateGeoParams(lat, lng);
  if (!geoCheck.isValid) {
    res.status(400).json({ error: geoCheck.error });
    return;
  }

  const cacheKey = `copernicus-s2-${geoCheck.latNum.toFixed(4)}-${geoCheck.lngNum.toFixed(4)}`;
  const cached = apiCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < 1000 * 60 * 60) {
    res.json(cached.data);
    return;
  }

  try {
    const spatialPoint = `geography'SRID=4326;POINT(${geoCheck.lngNum.toFixed(4)} ${geoCheck.latNum.toFixed(4)})'`;
    const cutoffIso = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString();
    const filter = `Collection/Name eq 'SENTINEL-2' and Attributes/OData.CSC.StringAttribute/any(att:att/Name eq 'productType' and att/OData.CSC.StringAttribute/Value eq 'S2MSI2A') and OData.CSC.Intersects(area=${spatialPoint}) and ContentDate/Start gt ${cutoffIso}`;
    const url = `https://catalogue.dataspace.copernicus.eu/odata/v1/Products?$filter=${encodeURIComponent(filter)}&$orderby=ContentDate/Start desc&$expand=Attributes&$top=5`;

    const response = await fetchWithTimeout(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'TURBA-Morocco-Agricultural-Platform/2.0',
      },
    }, 20000);

    if (!response.ok) {
      res.status(response.status).json({ error: `Copernicus CDSE error: ${response.statusText}` });
      return;
    }

    const data = await response.json();
    setBoundedCache(cacheKey, data);
    res.json(data);
  } catch (error) {
    const isTimeout = error instanceof Error && (error.name === 'AbortError' || error.message.includes('timeout'));
    if (isTimeout) {
      console.warn('Copernicus CDSE upstream request timed out:', error instanceof Error ? error.message : error);
      res.status(504).json({ error: 'Copernicus CDSE catalog request timed out' });
      return;
    }
    console.error('Server error proxying Copernicus CDSE:', error);
    res.status(502).json({ error: 'Failed to communicate with Copernicus CDSE service' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve frontend build in production
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));

    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`TURBA Agricultural Intelligence Server listening on port ${PORT}`);
  });
}

startServer();
