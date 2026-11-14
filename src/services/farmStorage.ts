/**
 * Farm Land Records Storage Service
 * Manages persistent storage, unique identifiers, and GeoJSON export/import
 * for Moroccan farmers' authentic parcels.
 * Strict Rule: Never inject mock or fabricated farm parcels.
 */

import { FarmRecord, Coordinates, AgriculturalClassification } from '../types/farm';

const STORAGE_KEY = 'turba_morocco_farm_records_v2';
const CURRENT_FARM_KEY = 'turba_morocco_active_farm_id';

function isValidSavedFarm(raw: unknown): raw is FarmRecord {
  if (!raw || typeof raw !== 'object') return false;
  const r = raw as Partial<FarmRecord>;
  if (typeof r.id !== 'string' || !r.id.trim()) return false;
  if (typeof r.name !== 'string' || !r.name.trim()) return false;
  if (!r.centroid || typeof r.centroid !== 'object') return false;
  const { lat, lng } = r.centroid as { lat?: unknown; lng?: unknown };
  if (
    typeof lat !== 'number' ||
    typeof lng !== 'number' ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return false;
  }
  if (
    typeof r.calculatedAreaHectares !== 'number' ||
    !Number.isFinite(r.calculatedAreaHectares) ||
    r.calculatedAreaHectares < 0
  ) {
    return false;
  }
  if (!r.classification || typeof r.classification !== 'object') return false;
  if (r.polygon !== null && r.polygon !== undefined) {
    if (!Array.isArray(r.polygon)) return false;
    const validPoly = r.polygon.every(
      (pt) =>
        pt &&
        typeof pt === 'object' &&
        typeof pt.lat === 'number' &&
        typeof pt.lng === 'number' &&
        Number.isFinite(pt.lat) &&
        Number.isFinite(pt.lng)
    );
    if (!validPoly) return false;
  }
  return true;
}

export function loadSavedFarms(): FarmRecord[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter(isValidSavedFarm);
    }
    return [];
  } catch (err) {
    console.warn('Could not read farm records from localStorage:', err);
    return [];
  }
}

export function saveAllFarms(farms: FarmRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(farms));
  } catch (err) {
    console.error('Failed to save farms to localStorage:', err);
  }
}

export function getActiveFarmId(): string | null {
  try {
    return localStorage.getItem(CURRENT_FARM_KEY);
  } catch {
    return null;
  }
}

export function setActiveFarmId(id: string | null): void {
  try {
    if (id) {
      localStorage.setItem(CURRENT_FARM_KEY, id);
    } else {
      localStorage.removeItem(CURRENT_FARM_KEY);
    }
  } catch (err) {
    console.warn('Could not set active farm ID:', err);
  }
}

export function saveFarmRecord(record: FarmRecord): void {
  const current = loadSavedFarms();
  const index = current.findIndex((f) => f.id === record.id);
  if (index >= 0) {
    current[index] = { ...record, updatedAt: new Date().toISOString() };
  } else {
    current.unshift(record);
  }
  saveAllFarms(current);
  setActiveFarmId(record.id);
}

export function deleteFarmRecord(id: string): FarmRecord[] {
  const current = loadSavedFarms();
  const filtered = current.filter((f) => f.id !== id);
  saveAllFarms(filtered);
  const activeId = getActiveFarmId();
  if (activeId === id) {
    setActiveFarmId(filtered.length > 0 ? filtered[0].id : null);
  }
  return filtered;
}

export function createNewFarmRecord(params: {
  name: string;
  notes?: string;
  cadastralReference?: string;
  region: string;
  province: string;
  centroid: Coordinates;
  polygon: Coordinates[] | null;
  calculatedAreaHectares: number;
  calculatedAreaM2: number;
  identificationMethod: FarmRecord['identificationMethod'];
  classification: AgriculturalClassification;
}): FarmRecord {
  const now = new Date().toISOString();
  const id = `farm-morocco-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const record: FarmRecord = {
    id,
    farmerId: 'farmer-morocco',
    name: params.name || `Parcelle ${params.province} (${params.calculatedAreaHectares} ha)`,
    notes: params.notes,
    cadastralReference: params.cadastralReference,
    region: params.region,
    province: params.province,
    centroid: params.centroid,
    polygon: params.polygon,
    calculatedAreaHectares: params.calculatedAreaHectares,
    calculatedAreaM2: params.calculatedAreaM2,
    identificationMethod: params.identificationMethod,
    classification: params.classification,
    createdAt: now,
    updatedAt: now,
  };

  saveFarmRecord(record);
  return record;
}

/**
 * Generates standard RFC 7946 compliant GeoJSON FeatureCollection of saved farms.
 * Rules:
 * - Coordinates are strictly longitude-first: [longitude, latitude].
 * - Polygon linear rings MUST be closed (first coordinate equals last coordinate).
 * - Single-point farms are exported as "Point" geometry, never a 1-point Polygon.
 * - Obsolete "crs" property is removed per RFC 7946 Section 4.
 */
export function exportFarmsToGeoJson(farms: FarmRecord[]): string {
  const features = farms.map((f) => {
    let geometry:
      | { type: 'Polygon'; coordinates: number[][][] }
      | { type: 'Point'; coordinates: number[] };

    if (f.polygon && Array.isArray(f.polygon) && f.polygon.length >= 3) {
      // Build closed linear ring [lng, lat]
      const ring: number[][] = f.polygon.map((p) => [p.lng, p.lat]);
      const first = ring[0];
      const last = ring[ring.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        ring.push([first[0], first[1]]);
      }
      geometry = {
        type: 'Polygon',
        coordinates: [ring],
      };
    } else {
      geometry = {
        type: 'Point',
        coordinates: [f.centroid.lng, f.centroid.lat],
      };
    }

    return {
      type: 'Feature',
      id: f.id,
      geometry,
      properties: {
        id: f.id,
        name: f.name,
        region: f.region,
        province: f.province,
        cadastralReference: f.cadastralReference || null,
        areaHectares: f.calculatedAreaHectares,
        areaM2: f.calculatedAreaM2,
        classificationSource: f.classification.source,
        cropType: f.classification.cropType,
        cropLabelEn: f.classification.cropLabelEn,
        confidence: f.classification.confidence,
        identificationMethod: f.identificationMethod,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
      },
    };
  });

  const geoJson = {
    type: 'FeatureCollection',
    name: 'TURBA_Morocco_Agricultural_Parcels',
    features,
  };

  return JSON.stringify(geoJson, null, 2);
}
