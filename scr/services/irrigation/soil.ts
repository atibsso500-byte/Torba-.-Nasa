/**
 * TURBA Phase 3 — Soil Hydraulic Properties Service (SoilGrids v2.0 + Pedotransfer + Farmer Lab Override)
 *
 * Scientific Integrity Rules:
 * 1. Farmer-provided laboratory measurements (θFC, θWP) take highest precedence and are flagged 'user_provided'.
 * 2. ISRIC SoilGrids v2.0 REST API (https://rest.isric.org/soilgrids/v2.0/properties/query) provides 250m
 *    spatial predictions (clay g/kg, sand g/kg, silt g/kg, soc dg/kg, bdod cg/cm³), converted to θFC and θWP
 *    via Saxton & Rawls (2006) Soil Sci. Soc. Am. J. 70:1569-1578. Strictly identified as spatial estimate.
 * 3. Farmer-selected USDA soil texture preset uses FAO-56 Table 19 typical midpoints (explicitly flagged).
 * 4. If SoilGrids is unavailable/offline AND farmer has not provided soil parameters, explicitly returns
 *    `sourceKind: 'unavailable'` and NEVER invents fake SoilGrids data.
 */

import { Coordinates, DataStatus } from '../../types/farm';
import {
  FarmerIrrigationConfig,
  SoilHydraulicResult,
  SoilLayerProfile,
} from '../../types/irrigation';
import { getTexturePresetById } from '../../data/crops';
import { validateCoordinates } from '../../utils/validation';
import { scientificCache } from '../cache';

interface DepthSpan {
  label: string;
  topCm: number;
  bottomCm: number;
}

const DEPTH_SPANS: DepthSpan[] = [
  { label: '0-5cm', topCm: 0, bottomCm: 5 },
  { label: '5-15cm', topCm: 5, bottomCm: 15 },
  { label: '15-30cm', topCm: 15, bottomCm: 30 },
  { label: '30-60cm', topCm: 30, bottomCm: 60 },
  { label: '60-100cm', topCm: 60, bottomCm: 100 },
];

function isBrowserContext(): boolean {
  return typeof window !== 'undefined' && typeof window.location !== 'undefined';
}

/**
 * Saxton & Rawls (2006) Pedotransfer Function for Soil Water Retention:
 * Calculates Permanent Wilting Point θWP (-1500 kPa) and Field Capacity θFC (-33 kPa) [m³/m³]
 * from sand %, clay % (0..100), and organic matter % (0..8).
 */
export function saxtonRawls2006Hydraulics(params: {
  sandPct: number;
  clayPct: number;
  organicMatterPct: number;
}): { thetaFc: number; thetaWp: number } {
  const S = Math.max(0, Math.min(1, params.sandPct / 100));
  const C = Math.max(0, Math.min(1, params.clayPct / 100));
  const OM = Math.max(0, Math.min(8, params.organicMatterPct));

  // Eq. 1: 1500 kPa (Wilting point)
  const theta1500t =
    -0.024 * S +
    0.487 * C +
    0.006 * OM +
    0.005 * (S * OM) -
    0.013 * (C * OM) +
    0.068 * (S * C) +
    0.031;
  const thetaWp = theta1500t + (0.14 * theta1500t - 0.02);

  // Eq. 2: 33 kPa (Field capacity)
  const theta33t =
    -0.251 * S +
    0.195 * C +
    0.011 * OM +
    0.006 * (S * OM) -
    0.027 * (C * OM) +
    0.452 * (S * C) +
    0.299;
  const thetaFc =
    theta33t + (1.283 * theta33t * theta33t - 0.374 * theta33t - 0.015);

  const safeWp = Math.max(0.02, Math.min(0.45, Math.round(thetaWp * 1000) / 1000));
  const safeFc = Math.max(safeWp + 0.03, Math.min(0.62, Math.round(thetaFc * 1000) / 1000));

  return { thetaFc: safeFc, thetaWp: safeWp };
}

/**
 * Classifies USDA hydrologic soil group & agricultural curve number from sand/clay %
 */
export function inferHydrologicGroupFromTexture(sandPct: number, clayPct: number): {
  group: 'A' | 'B' | 'C' | 'D';
  curveNumber: number;
} {
  if (sandPct >= 70 && clayPct < 15) return { group: 'A', curveNumber: 68 };
  if (clayPct >= 35) return { group: 'D', curveNumber: 88 };
  if (clayPct >= 22) return { group: 'C', curveNumber: 83 };
  return { group: 'B', curveNumber: 76 };
}

interface RawSoilGridsParsed {
  layers: SoilLayerProfile[];
  retrievalTimestamp: string;
}

async function fetchSoilGridsRaw(
  coords: Coordinates,
  signal?: AbortSignal
): Promise<{ ok: boolean; data?: RawSoilGridsParsed; status: DataStatus; error?: string }> {
  const cacheKey = scientificCache.generateKey('soilgrids_v2', coords.lat, coords.lng, 'profile');
  const cached = scientificCache.get<RawSoilGridsParsed>(cacheKey);
  if (cached) {
    return { ok: true, data: cached, status: 'ESTIMATED' };
  }

  const cooldownKey = scientificCache.generateKey('soilgrids_v2', coords.lat, coords.lng, 'outage_cooldown');
  const cachedOutage = scientificCache.get<{ error: string }>(cooldownKey);
  if (cachedOutage) {
    return { ok: false, status: 'UNAVAILABLE', error: cachedOutage.error };
  }

  const latStr = coords.lat.toFixed(4);
  const lngStr = coords.lng.toFixed(4);
  const proxyUrl = `/api/soilgrids/properties?lat=${latStr}&lng=${lngStr}`;
  const directUrl =
    `https://rest.isric.org/soilgrids/v2.0/properties/query?lon=${lngStr}&lat=${latStr}` +
    `&property=clay&property=sand&property=soc` +
    `&depth=0-5cm&depth=5-15cm&depth=15-30cm&depth=30-60cm&depth=60-100cm&value=mean`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error('SoilGrids request timed out after 18s')), 18000);
  const onCallerAbort = () => controller.abort(signal?.reason);
  if (signal) {
    if (signal.aborted) {
      clearTimeout(timer);
      return { ok: false, status: 'UNAVAILABLE', error: 'Request aborted' };
    }
    signal.addEventListener('abort', onCallerAbort, { once: true });
  }

  try {
    let res: Response | null = null;
    if (isBrowserContext()) {
      try {
        const proxied = await fetch(proxyUrl, { headers: { Accept: 'application/json' }, signal: controller.signal });
        const ct = proxied.headers.get('content-type') || '';
        if (proxied.status !== 404 && proxied.status !== 405 && ct.includes('json')) {
          res = proxied;
        }
      } catch (proxyErr) {
        if (controller.signal.aborted) throw proxyErr;
        res = null;
      }
    }
    if (!res) {
      res = await fetch(directUrl, { headers: { Accept: 'application/json' }, signal: controller.signal });
    }
    clearTimeout(timer);

    if (!res.ok) {
      const errorMsg = `ISRIC SoilGrids REST API returned HTTP ${res.status} (${res.statusText || 'Service Unavailable'})`;
      if (res.status === 429 || res.status >= 500) {
        scientificCache.set(cooldownKey, { error: errorMsg }, 90 * 1000);
      }
      return {
        ok: false,
        status: 'UNAVAILABLE',
        error: errorMsg,
      };
    }

    const json = await res.json();
    const rawLayers = json?.properties?.layers;
    if (!Array.isArray(rawLayers) || rawLayers.length === 0) {
      return {
        ok: false,
        status: 'UNAVAILABLE',
        error: 'ISRIC SoilGrids returned empty soil property layers for these coordinates',
      };
    }

    const propLookup: Record<string, Record<string, number | null>> = {};
    for (const propEntry of rawLayers) {
      const propName = propEntry?.name;
      if (!propName || !Array.isArray(propEntry.depths)) continue;
      propLookup[propName] = {};
      for (const depthEntry of propEntry.depths) {
        const label = depthEntry?.label;
        const meanVal = depthEntry?.values?.mean;
        if (label && typeof meanVal === 'number' && Number.isFinite(meanVal)) {
          propLookup[propName][label] = meanVal;
        }
      }
    }

    // Apply ISRIC SoilGrids v2.0 conversion factors:
    // clay/sand/silt: g/kg -> % mass (/ 10)
    // soc: dg/kg -> % organic carbon (/ 100); OM% = OC% * 1.724
    // bdod: cg/cm³ -> g/cm³ (/ 100)
    const layers: SoilLayerProfile[] = DEPTH_SPANS.map((span) => {
      const clayRaw = propLookup.clay?.[span.label] ?? null;
      const sandRaw = propLookup.sand?.[span.label] ?? null;
      const siltRaw = propLookup.silt?.[span.label] ?? null;
      const socRaw = propLookup.soc?.[span.label] ?? null;
      const bdodRaw = propLookup.bdod?.[span.label] ?? null;

      const clayPct = clayRaw !== null ? Math.round((clayRaw / 10) * 10) / 10 : null;
      const sandPct = sandRaw !== null ? Math.round((sandRaw / 10) * 10) / 10 : null;
      const siltPct = siltRaw !== null ? Math.round((siltRaw / 10) * 10) / 10 : null;
      const organicCarbonPct = socRaw !== null ? Math.round((socRaw / 100) * 100) / 100 : null;
      const organicMatterPct =
        organicCarbonPct !== null ? Math.round(organicCarbonPct * 1.724 * 100) / 100 : null;
      const bulkDensityGCm3 = bdodRaw !== null ? Math.round((bdodRaw / 100) * 100) / 100 : null;

      return {
        depthLabel: span.label,
        depthTopCm: span.topCm,
        depthBottomCm: span.bottomCm,
        clayPct,
        sandPct,
        siltPct,
        organicCarbonPct,
        organicMatterPct,
        bulkDensityGCm3,
      };
    });

    const hasUsableTexture = layers.some((l) => l.clayPct !== null && l.sandPct !== null);
    if (!hasUsableTexture) {
      return {
        ok: false,
        status: 'UNAVAILABLE',
        error: 'SoilGrids returned null clay/sand predictions (masked urban/water/rock pixel)',
      };
    }

    const parsed: RawSoilGridsParsed = {
      layers,
      retrievalTimestamp: new Date().toISOString(),
    };
    scientificCache.set(cacheKey, parsed, 1000 * 60 * 60 * 12);
    return { ok: true, data: parsed, status: 'ESTIMATED' };
  } catch (err) {
    clearTimeout(timer);
    const errorMsg = err instanceof Error ? err.message : 'SoilGrids network timeout';
    if (!signal?.aborted) {
      scientificCache.set(cooldownKey, { error: errorMsg }, 90 * 1000);
    }
    return {
      ok: false,
      status: 'UNAVAILABLE',
      error: errorMsg,
    };
  } finally {
    if (signal) {
      signal.removeEventListener('abort', onCallerAbort);
    }
  }
}

/**
 * Resolves soil hydraulic properties (θFC, θWP, CN) for a farm and effective root depth Zr.
 */
export async function resolveSoilHydraulics(params: {
  coordinates: Coordinates;
  config: FarmerIrrigationConfig;
  rootDepthM: number;
  signal?: AbortSignal;
}): Promise<SoilHydraulicResult> {
  const { coordinates, config, rootDepthM, signal } = params;
  const nowIso = new Date().toISOString();

  const coordCheck = validateCoordinates(coordinates);
  if (!coordCheck.isValid) {
    return buildUnavailableSoilResult(nowIso, coordCheck.error || 'Invalid coordinates');
  }

  // 1. Highest precedence: Farmer laboratory measurements (θFC & θWP)
  if (
    (config.soilSourcePreference === 'farmer_lab' || config.soilSourcePreference === 'auto_soilgrids_then_manual') &&
    config.labThetaFc !== null &&
    config.labThetaWp !== null &&
    Number.isFinite(config.labThetaFc) &&
    Number.isFinite(config.labThetaWp) &&
    config.labThetaFc > config.labThetaWp
  ) {
    const awcMmPerM = Math.round((config.labThetaFc - config.labThetaWp) * 1000);
    const textureFallback = config.farmerTextureId ? getTexturePresetById(config.farmerTextureId) : null;
    return {
      sourceKind: 'farmer_lab',
      origin: 'user_provided',
      sourceLabel: 'Farmer Field Laboratory Soil Analysis',
      isSpatialEstimate: false,
      soilGridsStatus: 'NOT_CONFIGURED',
      thetaFc: {
        value: config.labThetaFc,
        unit: 'm³/m³',
        parameterName: 'Field Capacity (θFC)',
        source: 'Farmer Laboratory Input',
        origin: 'user_provided',
        observationDate: nowIso.slice(0, 10),
        retrievalTimestamp: nowIso,
      },
      thetaWp: {
        value: config.labThetaWp,
        unit: 'm³/m³',
        parameterName: 'Permanent Wilting Point (θWP)',
        source: 'Farmer Laboratory Input',
        origin: 'user_provided',
        observationDate: nowIso.slice(0, 10),
        retrievalTimestamp: nowIso,
      },
      awcMmPerM,
      hydrologicGroup: textureFallback?.hydrologicGroup || 'B',
      curveNumber: textureFallback?.curveNumberRowCrop || 76,
      layers: [],
      notes: [
        'Uses direct farmer-entered laboratory volumetric water content thresholds (θFC and θWP).',
      ],
      retrievalTimestamp: nowIso,
    };
  }

  // 2. Query SoilGrids v2.0 if auto preference selected
  let soilGridsError: string | undefined;
  let soilGridsStatus: DataStatus = 'UNAVAILABLE';

  if (config.soilSourcePreference === 'auto_soilgrids_then_manual') {
    const sg = await fetchSoilGridsRaw(coordinates, signal);
    soilGridsStatus = sg.status;
    soilGridsError = sg.error;

    if (sg.ok && sg.data) {
      // Depth-weighted averaging over effective root zone [0..Zr*100 cm]
      const targetCm = Math.max(15, Math.min(100, rootDepthM * 100));
      let sandWeighted = 0;
      let clayWeighted = 0;
      let omWeighted = 0;
      let sandW = 0;
      let clayW = 0;
      let omW = 0;

      for (const layer of sg.data.layers) {
        const overlap = Math.max(0, Math.min(targetCm, layer.depthBottomCm) - layer.depthTopCm);
        if (overlap <= 0) continue;
        if (layer.sandPct !== null) {
          sandWeighted += layer.sandPct * overlap;
          sandW += overlap;
        }
        if (layer.clayPct !== null) {
          clayWeighted += layer.clayPct * overlap;
          clayW += overlap;
        }
        if (layer.organicMatterPct !== null) {
          omWeighted += layer.organicMatterPct * overlap;
          omW += overlap;
        }
      }

      if (sandW > 0 && clayW > 0) {
        const avgSand = sandWeighted / sandW;
        const avgClay = clayWeighted / clayW;
        const avgOm = omW > 0 ? omWeighted / omW : 1.5;

        const { thetaFc, thetaWp } = saxtonRawls2006Hydraulics({
          sandPct: avgSand,
          clayPct: avgClay,
          organicMatterPct: avgOm,
        });
        const hydro = inferHydrologicGroupFromTexture(avgSand, avgClay);

        return {
          sourceKind: 'soilgrids_v2',
          origin: 'spatial_estimate',
          sourceLabel: 'ISRIC SoilGrids v2.0 (250m Spatial Estimate) + Saxton & Rawls (2006)',
          isSpatialEstimate: true,
          soilGridsStatus: 'ESTIMATED',
          thetaFc: {
            value: thetaFc,
            unit: 'm³/m³',
            parameterName: 'Estimated Field Capacity (θFC)',
            source: 'ISRIC SoilGrids v2.0 + Saxton & Rawls (2006)',
            origin: 'spatial_estimate',
            observationDate: 'Static Global Map (v2.0)',
            retrievalTimestamp: sg.data.retrievalTimestamp,
            spatialResolution: '250 m',
            estimationMethod: `Depth-weighted 0-${Math.round(targetCm)}cm (Sand ${avgSand.toFixed(1)}%, Clay ${avgClay.toFixed(1)}%, OM ${avgOm.toFixed(2)}%)`,
          },
          thetaWp: {
            value: thetaWp,
            unit: 'm³/m³',
            parameterName: 'Estimated Permanent Wilting Point (θWP)',
            source: 'ISRIC SoilGrids v2.0 + Saxton & Rawls (2006)',
            origin: 'spatial_estimate',
            observationDate: 'Static Global Map (v2.0)',
            retrievalTimestamp: sg.data.retrievalTimestamp,
            spatialResolution: '250 m',
            estimationMethod: 'Saxton & Rawls (2006) -1500 kPa pedotransfer equation',
          },
          awcMmPerM: Math.round((thetaFc - thetaWp) * 1000),
          hydrologicGroup: hydro.group,
          curveNumber: hydro.curveNumber,
          layers: sg.data.layers,
          notes: [
            'SoilGrids v2.0 provides 250 m spatial soil map predictions, NOT laboratory measurements of your exact parcel.',
          ],
          retrievalTimestamp: sg.data.retrievalTimestamp,
        };
      }
    }
  }

  // 3. Farmer-selected USDA Soil Texture Class -> FAO-56 Table 19 reference
  if (config.farmerTextureId) {
    const preset = getTexturePresetById(config.farmerTextureId);
    if (preset) {
      return {
        sourceKind: 'farmer_texture_table19',
        origin: 'fao56_estimated',
        sourceLabel: `Farmer-Selected Texture (${preset.nameEn}) — FAO-56 Table 19 Estimate`,
        isSpatialEstimate: false,
        soilGridsStatus,
        soilGridsError,
        thetaFc: {
          value: preset.thetaFcTypical,
          unit: 'm³/m³',
          parameterName: 'Field Capacity (θFC) from FAO-56 Table 19',
          source: `Farmer Texture Selection (${preset.nameEn}) / FAO-56 Table 19`,
          origin: 'fao56_estimated',
          observationDate: nowIso.slice(0, 10),
          retrievalTimestamp: nowIso,
          estimationMethod: 'FAO-56 Table 19 texture-class midpoint',
        },
        thetaWp: {
          value: preset.thetaWpTypical,
          unit: 'm³/m³',
          parameterName: 'Wilting Point (θWP) from FAO-56 Table 19',
          source: `Farmer Texture Selection (${preset.nameEn}) / FAO-56 Table 19`,
          origin: 'fao56_estimated',
          observationDate: nowIso.slice(0, 10),
          retrievalTimestamp: nowIso,
          estimationMethod: 'FAO-56 Table 19 texture-class midpoint',
        },
        awcMmPerM: Math.round((preset.thetaFcTypical - preset.thetaWpTypical) * 1000),
        hydrologicGroup: preset.hydrologicGroup,
        curveNumber: preset.curveNumberRowCrop,
        layers: [],
        notes: [
          ...(soilGridsError ? [`SoilGrids v2.0 unavailable (${soilGridsError}); used farmer-selected FAO-56 Table 19 soil texture class.`] : []),
          'FAO-56 Table 19 values are literature class midpoints, not field laboratory tests.',
        ],
        retrievalTimestamp: nowIso,
      };
    }
  }

  // 4. Safe explicit Unavailable state — never fabricate hydraulic soil parameters
  return buildUnavailableSoilResult(
    nowIso,
    soilGridsError || 'SoilGrids v2.0 unavailable and no farmer soil texture or lab θFC/θWP entered.'
  );
}

function buildUnavailableSoilResult(nowIso: string, errorMsg: string): SoilHydraulicResult {
  return {
    sourceKind: 'unavailable',
    origin: 'spatial_estimate',
    sourceLabel: 'Soil Hydraulic Properties Unavailable',
    isSpatialEstimate: false,
    soilGridsStatus: 'UNAVAILABLE',
    soilGridsError: errorMsg,
    thetaFc: {
      value: null,
      unit: 'm³/m³',
      parameterName: 'Field Capacity (θFC)',
      source: 'Unavailable',
      origin: 'spatial_estimate',
      observationDate: nowIso.slice(0, 10),
      retrievalTimestamp: nowIso,
      warning: errorMsg,
    },
    thetaWp: {
      value: null,
      unit: 'm³/m³',
      parameterName: 'Permanent Wilting Point (θWP)',
      source: 'Unavailable',
      origin: 'spatial_estimate',
      observationDate: nowIso.slice(0, 10),
      retrievalTimestamp: nowIso,
      warning: errorMsg,
    },
    awcMmPerM: null,
    hydrologicGroup: null,
    curveNumber: null,
    layers: [],
    notes: [errorMsg],
    retrievalTimestamp: nowIso,
  };
}
