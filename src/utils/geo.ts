/**
 * Geospatial Calculations and Geodesic Geometry for Agricultural Land
 * Uses WGS84 Geodesic math for accurate hectare & square meter surface calculations
 * and coordinates sovereign country validation.
 */

import { Coordinates, MoroccanAgriculturalZone, AgriculturalClassification } from '../types/farm';
import { MOROCCAN_AGRICULTURAL_ZONES } from '../data/morocco';
import { validateCoordinates } from './validation';

const EARTH_RADIUS_METERS = 6378137; // WGS84 equatorial radius

/**
 * Calculates geodesic polygon area on the spherical Earth in square meters
 * Uses the spherical polygon line-integral formula:
 * Area = R^2 * |sum(dLng * (sin(lat1) + sin(lat2)) / 2)|
 * @param polygon Array of coordinates defining the perimeter
 * @returns Area in square meters (m²)
 */
export function calculateGeodesicAreaM2(polygon: Coordinates[]): number {
  if (!polygon || polygon.length < 3) return 0;

  const points = [...polygon];
  const first = points[0];
  const last = points[points.length - 1];
  if (first.lat !== last.lat || first.lng !== last.lng) {
    points.push(first);
  }

  let totalArea = 0;
  const numPoints = points.length;

  for (let i = 0; i < numPoints - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];

    const lat1Rad = (p1.lat * Math.PI) / 180;
    const lat2Rad = (p2.lat * Math.PI) / 180;
    const dLngRad = ((p2.lng - p1.lng) * Math.PI) / 180;

    totalArea += (dLngRad * (Math.sin(lat1Rad) + Math.sin(lat2Rad))) / 2;
  }

  totalArea = Math.abs(totalArea) * EARTH_RADIUS_METERS * EARTH_RADIUS_METERS;
  return Math.round(totalArea * 100) / 100;
}

/**
 * Converts square meters to agricultural hectares (1 ha = 10,000 m²)
 */
export function convertM2ToHectares(m2: number): number {
  return Math.round((m2 / 10000) * 1000) / 1000;
}

/**
 * Calculates the true area-weighted geometric centroid of a polygon.
 * For planar polygons on the ellipsoid:
 * Signed Area A = 1/2 * sum(x_i * y_{i+1} - x_{i+1} * y_i)
 * C_x = 1/(6A) * sum((x_i + x_{i+1}) * (x_i * y_{i+1} - x_{i+1} * y_i))
 * C_y = 1/(6A) * sum((y_i + y_{i+1}) * (x_i * y_{i+1} - x_{i+1} * y_i))
 * If the calculated centroid lies outside a concave polygon, an interior point is returned.
 */
export function calculateCentroid(points: Coordinates[]): Coordinates {
  if (!points || points.length === 0) {
    return { lat: 33.5, lng: -6.8 };
  }
  if (points.length === 1) {
    return { lat: points[0].lat, lng: points[0].lng };
  }
  if (points.length === 2) {
    return {
      lat: (points[0].lat + points[1].lat) / 2,
      lng: (points[0].lng + points[1].lng) / 2,
    };
  }

  // Ensure closed polygon for Shoelace formula
  const closed = [...points];
  const first = closed[0];
  const last = closed[closed.length - 1];
  if (first.lat !== last.lat || first.lng !== last.lng) {
    closed.push(first);
  }

  let signedArea = 0;
  let cx = 0; // longitude centroid
  let cy = 0; // latitude centroid

  for (let i = 0; i < closed.length - 1; i++) {
    const x0 = closed[i].lng;
    const y0 = closed[i].lat;
    const x1 = closed[i + 1].lng;
    const y1 = closed[i + 1].lat;

    const cross = x0 * y1 - x1 * y0;
    signedArea += cross;
    cx += (x0 + x1) * cross;
    cy += (y0 + y1) * cross;
  }

  signedArea = signedArea * 0.5;

  let centroid: Coordinates;
  if (Math.abs(signedArea) < 1e-12) {
    // Degenerate or colinear polygon: fall back to arithmetic vertex mean
    let sumLat = 0;
    let sumLng = 0;
    for (const pt of points) {
      sumLat += pt.lat;
      sumLng += pt.lng;
    }
    centroid = {
      lat: Math.round((sumLat / points.length) * 100000) / 100000,
      lng: Math.round((sumLng / points.length) * 100000) / 100000,
    };
  } else {
    cx = cx / (6 * signedArea);
    cy = cy / (6 * signedArea);
    centroid = {
      lat: Math.round(cy * 100000) / 100000,
      lng: Math.round(cx * 100000) / 100000,
    };
  }

  // If centroid lies outside a concave / horseshoe polygon, pick an interior sample point
  if (points.length >= 3 && !isPointInsidePolygon(centroid, points)) {
    // Try midpoint of consecutive vertices to find interior point
    for (let i = 0; i < points.length; i++) {
      const p1 = points[i];
      const p2 = points[(i + 2) % points.length];
      const mid = {
        lat: Math.round(((p1.lat + p2.lat) / 2) * 100000) / 100000,
        lng: Math.round(((p1.lng + p2.lng) / 2) * 100000) / 100000,
      };
      if (isPointInsidePolygon(mid, points)) {
        return mid;
      }
    }
  }

  return centroid;
}

/**
 * Checks whether two line segments (p1-p2 and p3-p4) intersect in 2D space.
 */
function doSegmentsIntersect(
  p1: Coordinates,
  p2: Coordinates,
  p3: Coordinates,
  p4: Coordinates
): boolean {
  function ccw(a: Coordinates, b: Coordinates, c: Coordinates): number {
    return (c.lat - a.lat) * (b.lng - a.lng) - (b.lat - a.lat) * (c.lng - a.lng);
  }

  const ccw1 = ccw(p1, p3, p4);
  const ccw2 = ccw(p2, p3, p4);
  const ccw3 = ccw(p1, p2, p3);
  const ccw4 = ccw(p1, p2, p4);

  return (
    ((ccw1 > 0 && ccw2 < 0) || (ccw1 < 0 && ccw2 > 0)) &&
    ((ccw3 > 0 && ccw4 < 0) || (ccw3 < 0 && ccw4 > 0))
  );
}

/**
 * Detects self-intersection in a polygon (bowtie / self-crossing edges).
 * Returns true if the polygon self-intersects.
 */
export function checkPolygonSelfIntersection(polygon: Coordinates[]): boolean {
  if (!polygon || polygon.length < 4) return false;

  const n = polygon.length;
  for (let i = 0; i < n; i++) {
    const p1 = polygon[i];
    const p2 = polygon[(i + 1) % n];

    for (let j = i + 2; j < n; j++) {
      // Skip adjacent segments (including wraparound first and last)
      if ((j + 1) % n === i) continue;

      const p3 = polygon[j];
      const p4 = polygon[(j + 1) % n];

      if (doSegmentsIntersect(p1, p2, p3, p4)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Formats latitude with directional N/S indicator and absolute value (no negative signs before letters)
 */
export function formatLatitude(lat: number, precision = 4): string {
  if (typeof lat !== 'number' || !Number.isFinite(lat)) return 'N/A';
  const dir = lat >= 0 ? 'N' : 'S';
  return `${Math.abs(lat).toFixed(precision)}°${dir}`;
}

/**
 * Formats longitude with directional E/W indicator and absolute value (no negative signs before letters)
 */
export function formatLongitude(lng: number, precision = 4): string {
  if (typeof lng !== 'number' || !Number.isFinite(lng)) return 'N/A';
  const dir = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lng).toFixed(precision)}°${dir}`;
}

/**
 * Shared coordinate formatting utility returning standardized format: "34.0200°N, 6.8400°W"
 * Strictly prevents negative numbers before direction letters (e.g. rejects "-6.84°W")
 */
export function formatCoordinates(coords: Coordinates | null | undefined, precision = 4): string {
  if (!coords || typeof coords.lat !== 'number' || typeof coords.lng !== 'number' || !Number.isFinite(coords.lat) || !Number.isFinite(coords.lng)) {
    return 'N/A';
  }
  return `${formatLatitude(coords.lat, precision)}, ${formatLongitude(coords.lng, precision)}`;
}

/**
 * Validates a polygon for agricultural boundary requirements:
 * - At least 3 vertices
 * - Finite, valid coordinates within [-90..90, -180..180]
 * - No duplicate consecutive vertices
 * - Non-zero geodesic area (> 0 m²)
 * - No self-intersections (bowtie geometry)
 */
export function validatePolygon(polygon: Coordinates[]): {
  isValid: boolean;
  error?: string;
  areaHa?: number;
  areaM2?: number;
} {
  if (!polygon || !Array.isArray(polygon)) {
    return { isValid: false, error: 'Polygon must be an array of coordinates' };
  }

  if (polygon.length < 3) {
    return {
      isValid: false,
      error: `Polygon has insufficient vertices (${polygon.length}). Minimum 3 vertices required to define a parcel boundary.`,
    };
  }

  for (let i = 0; i < polygon.length; i++) {
    const pt = polygon[i];
    if (
      !pt ||
      typeof pt.lat !== 'number' ||
      typeof pt.lng !== 'number' ||
      !Number.isFinite(pt.lat) ||
      !Number.isFinite(pt.lng)
    ) {
      return { isValid: false, error: `Vertex at index ${i} has invalid or non-finite coordinates` };
    }

    if (pt.lat < -90 || pt.lat > 90 || pt.lng < -180 || pt.lng > 180) {
      return { isValid: false, error: `Vertex at index ${i} exceeds valid coordinate bounds [-90..90, -180..180]` };
    }
  }

  // Check for duplicate consecutive vertices
  for (let i = 0; i < polygon.length; i++) {
    const nextIdx = (i + 1) % polygon.length;
    // Only check wraparound if length > 3
    if (nextIdx === 0 && polygon.length === 3) continue;
    const p1 = polygon[i];
    const p2 = polygon[nextIdx];
    if (Math.abs(p1.lat - p2.lat) < 1e-9 && Math.abs(p1.lng - p2.lng) < 1e-9) {
      return {
        isValid: false,
        error: `Polygon contains duplicate consecutive vertices at index ${i} and ${nextIdx}. Each boundary vertex must be distinct.`,
      };
    }
  }

  if (checkPolygonSelfIntersection(polygon)) {
    return {
      isValid: false,
      error: 'Polygon has self-intersecting edges (bowtie geometry). Parcel boundaries must form a simple closed perimeter without crossing edges.',
    };
  }

  const areaM2 = calculateGeodesicAreaM2(polygon);
  if (areaM2 <= 0) {
    return { isValid: false, error: 'Polygon area is 0 m² (colinear or degenerate perimeter)' };
  }

  return { isValid: true, areaHa: convertM2ToHectares(areaM2), areaM2 };
}

/**
 * Ray-casting algorithm to test if a point is strictly inside a polygon
 */
export function isPointInsidePolygon(point: Coordinates, polygon: Coordinates[]): boolean {
  if (!polygon || polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng;
    const yi = polygon[i].lat;
    const xj = polygon[j].lng;
    const yj = polygon[j].lat;

    const intersect =
      yi > point.lat !== yj > point.lat &&
      point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Great-circle distance between two coordinates in kilometers (Haversine formula)
 */
export function calculateDistanceKm(c1: Coordinates, c2: Coordinates): number {
  const dLat = ((c2.lat - c1.lat) * Math.PI) / 180;
  const dLng = ((c2.lng - c1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((c1.lat * Math.PI) / 180) *
      Math.cos((c2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c * 0.001;
}

/**
 * Classifies a geographic coordinate against verified agricultural datasets.
 * Respects national and international geographic boundaries.
 * Rules:
 * - Maritime Waters: Classified strictly as 'non_agricultural' (no fake crop or fake soil moisture).
 * - Foreign Countries (Algeria, Spain, Mauritania, etc.): Classified strictly as foreign sovereign territory.
 * - Morocco Outside Basins: Classified as unverified / outside 10m inventory; never claimed as confirmed cropland.
 */
export function classifyAgriculturalCoordinate(coord: Coordinates): {
  zone: MoroccanAgriculturalZone | null;
  classification: AgriculturalClassification;
  distanceKmToKnownPerimeter: number;
} {
  const { geography } = validateCoordinates(coord);

  // 1. Maritime Waters check (Atlantic Ocean / Mediterranean Sea)
  if (geography.isMaritime) {
    return {
      zone: null,
      classification: {
        source: 'None',
        cropType: 'non_cropland',
        cropLabelEn: `${geography.countryNameEn} – Non-agricultural marine area`,
        cropLabelFr: `${geography.countryNameFr} – Zone maritime non agricole`,
        cropLabelAr: `${geography.countryNameAr} – منطقة بحرية غير زراعية`,
        confidence: 100,
        productYear: null,
        spatialResolution: 'WGS84',
        status: 'non_agricultural',
        dataStatus: 'UNAVAILABLE',
        notes: 'Coordonnées situées en zone maritime (Océan Atlantique / Mer Méditerranée). Aucune observation agronomique ou classification de culture applicable.',
      },
      distanceKmToKnownPerimeter: 0,
    };
  }

  // 2. Neighboring and international sovereign territories (Spain, Algeria, Mauritania, etc.)
  if (!geography.isMorocco) {
    return {
      zone: null,
      classification: {
        source: 'None',
        cropType: null,
        cropLabelEn: `${geography.countryNameEn} (${geography.regionHint}) – Sovereign territory outside Morocco`,
        cropLabelFr: `${geography.countryNameFr} (${geography.regionHint}) – Territoire souverain hors Maroc`,
        cropLabelAr: `${geography.countryNameAr} (${geography.regionHint}) – إقليم سيادي خارج حدود المغرب`,
        confidence: null,
        productYear: null,
        spatialResolution: '10m',
        status: 'non_agricultural',
        dataStatus: 'UNAVAILABLE',
        notes: `Coordonnées situées en ${geography.countryNameFr}. L'emprise agricole TURBA est dédiée aux périmètres du Royaume du Maroc.`,
      },
      distanceKmToKnownPerimeter: 0,
    };
  }

  // 3. Direct containment test inside Morocco's 9 verified agricultural basins
  for (const zone of MOROCCAN_AGRICULTURAL_ZONES) {
    if (isPointInsidePolygon(coord, zone.polygon)) {
      return {
        zone,
        classification: zone.classification,
        distanceKmToKnownPerimeter: 0,
      };
    }
  }

  // 4. Moroccan coordinate outside verified agricultural basins:
  // Calculate distance to nearest Moroccan agricultural basin without describing as agricultural land
  let minDistance = Infinity;
  let closestZone: MoroccanAgriculturalZone = MOROCCAN_AGRICULTURAL_ZONES[0];

  for (const zone of MOROCCAN_AGRICULTURAL_ZONES) {
    const d = calculateDistanceKm(coord, zone.centroid);
    if (d < minDistance) {
      minDistance = d;
      closestZone = zone;
    }
  }

  const roundedDistance = Math.round(minDistance * 10) / 10;
  const nearestBasinShort = closestZone.name.split('–')[0]?.trim();

  return {
    zone: null,
    classification: {
      source: 'None',
      cropType: null,
      cropLabelEn: `Unverified / Outside 10m agricultural inventory perimeters (${roundedDistance} km to ${nearestBasinShort})`,
      cropLabelFr: `Zone non répertoriée dans l'emprise 10m WorldCereal (${roundedDistance} km du ${nearestBasinShort})`,
      cropLabelAr: `منطقة غير مصنفة ضمن مساحات WorldCereal 10م (تبعد ${roundedDistance} كم عن ${closestZone.nameAr.split('–')[0]?.trim()})`,
      confidence: null,
      productYear: null,
      spatialResolution: '10m',
      status: 'unverified_outside_perimeter',
      dataStatus: 'UNAVAILABLE',
      notes: `Point géoréférencé situé à ${roundedDistance} km du périmètre agricole répertorié le plus proche (${closestZone.name}). Pas d'attribution agronomique sans survol haute résolution.`,
    },
    distanceKmToKnownPerimeter: roundedDistance,
  };
}
