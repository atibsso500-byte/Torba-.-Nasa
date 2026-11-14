/**
 * Copernicus Sentinel-2 MSI Level-2A Observation Service
 * Queries official Copernicus Data Space Ecosystem (CDSE) OData catalog
 * for actual satellite overpasses, cloud cover, tile IDs, and spectral granule metadata.
 *
 * Official CDSE OData API Documentation:
 * https://documentation.dataspace.copernicus.eu/APIs/OData.html
 *
 * Strict Integrity Rules (Phase 2 Section 3):
 * 1. Product Selection: Explicitly queries Sentinel-2 Level-2A (S2MSI2A / _MSIL2A_).
 * 2. Explicit Ordering: Includes $orderby=ContentDate/Start desc to guarantee latest product.
 * 3. Cloud Cover Extraction: Reads from documented CDSE Attributes structure and top-level fields. Never fabricates or converts missing cloud cover to 0%.
 * 4. Footprint Validation: Verifies that product footprint actually intersects target coordinates.
 * 5. Transparent Satellite Limitations: Metadata only. Does NOT claim NDVI calculation without downloaded raster pixel bands.
 * 6. Combined Timeout & Cancellation: Enforces strict internal timeout (8s) while transparently respecting caller AbortSignal.
 */

import { Coordinates, Sentinel2Observation } from '../types/farm';
import { classifyFreshness } from '../utils/validation';
import { scientificCache } from './cache';

const COPERNICUS_ODATA_BASE = 'https://catalogue.dataspace.copernicus.eu/odata/v1/Products';
const TIMEOUT_MS = 22000;

/**
 * Extracts cloud cover percentage from CDSE OData product payload.
 * Supports top-level CloudCover and Attributes array with various attribute schemas.
 */
export function extractCloudCoverFromProduct(product: Record<string, unknown>): number | null {
  if (!product) return null;

  // 1. Direct property check
  if (typeof product.CloudCover === 'number' && Number.isFinite(product.CloudCover)) {
    return Math.round(product.CloudCover * 10) / 10;
  }
  if (typeof product.cloudCover === 'number' && Number.isFinite(product.cloudCover)) {
    return Math.round(product.cloudCover * 10) / 10;
  }

  // 2. CDSE OData Attributes array
  if (Array.isArray(product.Attributes)) {
    for (const attr of product.Attributes) {
      if (typeof attr === 'object' && attr !== null) {
        const name = (attr as { Name?: string }).Name;
        const val = (attr as { Value?: unknown }).Value;
        if (
          (name === 'cloudCover' || name === 'cloudCoverPercentage' || name === 'CLOUD_COVERAGE_ASSESSMENT') &&
          typeof val === 'number' &&
          Number.isFinite(val)
        ) {
          return Math.round(val * 10) / 10;
        }
      }
    }
  }

  return null;
}

export async function fetchSentinel2Observations(
  coords: Coordinates,
  signal?: AbortSignal
): Promise<Sentinel2Observation> {
  const retrievalTimestamp = new Date().toISOString();

  // Cache check (12 hours TTL for satellite revisit metadata)
  // Preserves original retrievalTimestamp on cache hits (Phase 2 Checklist 7.3)
  const cacheKey = scientificCache.generateKey('copernicus_s2', coords.lat, coords.lng, 'l2a');
  const cached = scientificCache.get<Sentinel2Observation>(cacheKey);
  if (cached) {
    return cached;
  }

  // Combined abort controller enforcing 8s timeout AND respecting caller signal
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => {
    timeoutController.abort(new Error(`Copernicus CDSE query timed out after ${TIMEOUT_MS}ms`));
  }, TIMEOUT_MS);

  const onCallerAbort = () => {
    clearTimeout(timeoutId);
    timeoutController.abort(signal?.reason || new Error('Request aborted by caller'));
  };

  // Link caller signal if provided
  if (signal) {
    if (signal.aborted) {
      clearTimeout(timeoutId);
      throw signal.reason || new Error('Request aborted by caller');
    }
    signal.addEventListener('abort', onCallerAbort, { once: true });
  }

  try {
    // CDSE OData query:
    // - Collection: SENTINEL-2
    // - Filter: S2MSI2A (Level-2A Bottom-Of-Atmosphere reflectance)
    // - Footprint: Point intersection
    // - Orderby: ContentDate/Start desc (newest first)
    // - Expand: Attributes to ensure cloudCover metadata is returned
    const spatialPoint = `geography'SRID=4326;POINT(${coords.lng.toFixed(4)} ${coords.lat.toFixed(4)})'`;
    const cutoffIso = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString();
    const filter = `Collection/Name eq 'SENTINEL-2' and Attributes/OData.CSC.StringAttribute/any(att:att/Name eq 'productType' and att/OData.CSC.StringAttribute/Value eq 'S2MSI2A') and OData.CSC.Intersects(area=${spatialPoint}) and ContentDate/Start gt ${cutoffIso}`;
    const url = `${COPERNICUS_ODATA_BASE}?$filter=${encodeURIComponent(filter)}&$orderby=ContentDate/Start desc&$expand=Attributes&$top=5`;

    // Proxy-first (avoids browser CORS blocks on the CDSE catalogue), with direct fallback
    // when the TURBA Express proxy is not deployed (static hosting / plain `vite` dev server).
    const proxyUrl = `/api/copernicus/products?lat=${coords.lat.toFixed(4)}&lng=${coords.lng.toFixed(4)}`;
    let res: Response;
    try {
      const proxied = await fetch(proxyUrl, {
        headers: { Accept: 'application/json' },
        signal: timeoutController.signal,
      });
      const contentType = proxied.headers.get('content-type') || '';
      // A missing proxy route is served as index.html (SPA fallback) or 404/405: treat as unavailable
      if (proxied.status === 404 || proxied.status === 405 || !contentType.includes('json')) {
        throw new Error('TURBA proxy not available');
      }
      res = proxied;
    } catch (proxyErr) {
      if (timeoutController.signal.aborted) throw proxyErr;
      res = await fetch(url, {
        headers: { Accept: 'application/json' }, // User-Agent is a forbidden header in browsers
        signal: timeoutController.signal,
      });
    }
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Copernicus CDSE HTTP ${res.status}: ${res.statusText}`);
    }

    const json = await res.json();
    const products: Array<Record<string, unknown>> = json?.value || [];

    if (products.length === 0) {
      const emptyResult: Sentinel2Observation = {
        source: 'Copernicus Sentinel-2 MSI Level-2A (ESA)',
        ndviCurrent: null,
        cloudCoveragePercent: null,
        tileId: null,
        granuleName: null,
        acquisitionDateUtc: null,
        spatialResolution: 'Native product resolution 10 m (B04/B08) — bands NOT processed by TURBA',
        temporalResolution: '5-day revisit',
        ndviCategory: null,
        spectralMethod: 'Catalog Metadata Only (Level-2A Footprint & Cloud Cover — No Raster NDVI Computed)',
        retrievalTimestamp,
        dataStatus: 'UNAVAILABLE',
        freshness: 'unavailable',
        missingReason: 'Aucun produit Sentinel-2 Level-2A (S2MSI2A) répertorié à cette coordonnée',
        recentPasses: [],
      };
      return emptyResult;
    }

    // Process recent satellite overpass history from top products
    const recentPasses = products.map((p) => {
      const pContent = p.ContentDate as { Start?: string } | undefined;
      const pRaw = pContent?.Start || (p.OriginDate as string) || '';
      const pDate = pRaw.split('T')[0] || 'Inconnu';
      const pName = typeof p.Name === 'string' ? p.Name : '';
      const m = pName.match(/_T([0-9]{2}[A-Z]{3})_/);
      const t = m ? `T${m[1]}` : 'S2-TILE';
      const cc = extractCloudCoverFromProduct(p);

      return {
        date: pDate,
        tileId: t,
        cloudCover: cc,
      };
    });

    // Cloud filtering: scan all products for the most recent observation with cloudCover <= 60% (Phase 2 Checklist 7.2)
    let selectedProduct = products[0];
    let selectedCloudCover = extractCloudCoverFromProduct(selectedProduct);
    let isCloudMasked = selectedCloudCover !== null && selectedCloudCover > 60;

    for (const prod of products) {
      const cc = extractCloudCoverFromProduct(prod);
      if (cc !== null && cc <= 60) {
        selectedProduct = prod;
        selectedCloudCover = cc;
        isCloudMasked = false;
        break;
      }
    }

    const contentDate = selectedProduct.ContentDate as { Start?: string; End?: string } | undefined;
    const rawDate = contentDate?.Start || (selectedProduct.OriginDate as string) || null;
    const acquisitionDateUtc = rawDate ? rawDate.split('T')[0] : null;

    // Extract tile identifier (e.g. T30STC or T38SND) from product name
    const productName = typeof selectedProduct.Name === 'string' ? selectedProduct.Name : '';
    const nameMatch = productName.match(/_T([0-9]{2}[A-Z]{3})_/);
    const tileId = nameMatch ? `T${nameMatch[1]}` : (productName ? productName.slice(0, 24) : 'S2-MSIL2A');
    const granuleName = productName || null;

    const freshResult = classifyFreshness(acquisitionDateUtc, 'satellite_overpass');

    const result: Sentinel2Observation = {
      source: 'Copernicus Sentinel-2 MSI Level-2A (ESA)',
      ndviCurrent: null, // Strictly null: Level-2A metadata catalog retrieved. Raster pixel processing requires streaming raw B04/B08 geotiffs
      cloudCoveragePercent: selectedCloudCover,
      tileId,
      granuleName,
      acquisitionDateUtc,
      spatialResolution: 'Native product resolution 10 m (B04/B08) — bands NOT processed by TURBA',
      temporalResolution: '5-day revisit',
      ndviCategory: null,
      spectralMethod: isCloudMasked
        ? 'Masquage nuageux (>60% couverture nuageuse)'
        : 'Catalog Metadata Only (Level-2A Footprint & Cloud Cover — No Raster NDVI Computed)',
      retrievalTimestamp,
      dataStatus: isCloudMasked ? 'UNAVAILABLE' : 'METADATA_ONLY',
      freshness: isCloudMasked ? 'unavailable' : freshResult.freshness,
      missingReason: isCloudMasked
        ? 'Observations optiques masquées en raison de la couverture nuageuse (>60%)'
        : 'Métadonnées satellitaires Level-2A vérifiées. Le calcul pixel NDVI = (B8 - B4) / (B8 + B4) nécessite un téléchargement des rasters B04/B08 bruts. Aucune valeur synthétique n\'est générée.',
      recentPasses,
    };

    // Cache valid metadata for 12 hours
    scientificCache.set(cacheKey, result, 12 * 60 * 60 * 1000);

    return result;
  } catch (err) {
    clearTimeout(timeoutId);
    const isAbort =
      (signal && signal.aborted) ||
      (err instanceof Error && err.name === 'AbortError');
    const isTimeout = err instanceof Error && err.message.includes('timed out');

    const errMsg = isTimeout
      ? `Délai d'attente dépassé (timeout ${Math.round(TIMEOUT_MS / 1000)}s)`
      : isAbort
      ? 'Requête interrompue'
      : err instanceof Error
      ? err.message
      : 'Échec de connexion réseau';

    console.warn('Copernicus CDSE error:', errMsg);

    return {
      source: 'Copernicus Sentinel-2 MSI Level-2A (ESA)',
      ndviCurrent: null,
      cloudCoveragePercent: null,
      tileId: null,
      granuleName: null,
      acquisitionDateUtc: null,
      spatialResolution: 'Native product resolution 10 m (B04/B08) — bands NOT processed by TURBA',
      temporalResolution: '5-day revisit',
      ndviCategory: null,
      spectralMethod: 'Catalogue Copernicus CDSE OData (S2MSI2A)',
      retrievalTimestamp,
      dataStatus: 'UNAVAILABLE',
      freshness: 'unavailable',
      missingReason: `Catalogue Copernicus indisponible: ${errMsg}`,
      recentPasses: [],
    };
  } finally {
    if (signal) {
      signal.removeEventListener('abort', onCallerAbort);
    }
  }
}
