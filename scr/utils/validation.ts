/**
 * TURBA Scientific Data Validation, Physical Bounds & Provenance Engine
 * Enforces strict scientific verification, physical limits, coordinate sanity,
 * and data provenance tracking across all environmental and agricultural readings.
 */

import { Coordinates, FreshnessStatus, DataProvenanceRecord } from '../types/farm';
import {
  MOROCCO_BOUNDARY,
  PORTUGAL_BOUNDARY,
  SPAIN_BOUNDARY,
  ALGERIA_BOUNDARY,
  MAURITANIA_BOUNDARY,
  SAUDI_ARABIA_BOUNDARY,
  KUWAIT_BOUNDARY,
  QATAR_BOUNDARY,
  BAHRAIN_BOUNDARY,
  IRAN_BOUNDARY,
  UAE_BOUNDARY,
  JORDAN_BOUNDARY,
  IRAQ_BOUNDARY,
  YEMEN_BOUNDARY,
  EGYPT_BOUNDARY,
} from '../data/boundaries';
import { isPointInsidePolygon } from './geo';

export interface PhysicalBounds {
  min: number;
  max: number;
  unit: string;
}

export const PHYSICAL_LIMITS: Record<string, PhysicalBounds> = {
  temperature: { min: -60, max: 60, unit: '°C' },
  relative_humidity: { min: 0, max: 100, unit: '%' },
  wind_speed: { min: 0, max: 120, unit: 'm/s' },
  solar_radiation: { min: 0, max: 45, unit: 'MJ/m²/day' },
  precipitation: { min: 0, max: 800, unit: 'mm/day' },
  soil_wetness_index: { min: 0, max: 1, unit: 'index (0-1)' },
  volumetric_soil_moisture: { min: 0, max: 0.75, unit: 'm³/m³' },
  ndvi: { min: -1.0, max: 1.0, unit: 'NDVI index (-1 to 1)' },
  cloud_cover: { min: 0, max: 100, unit: '%' },
};

export interface CoordinateGeography {
  countryCode: string;
  countryNameEn: string;
  countryNameAr: string;
  countryNameFr: string;
  regionHint: string;
  approximateTimezone: string;
  isMorocco: boolean;
  isPortugal: boolean;
  isSpain: boolean;
  isAlgeria: boolean;
  isMauritania: boolean;
  isMaritime: boolean;
  isNeighboringCountry: boolean;
  isSupported: boolean;
  isOutsideSupportedCoverage: boolean;
  isSaudiArabia: boolean;
  isKuwait?: boolean;
  isQatar?: boolean;
  isBahrain?: boolean;
  isUAE?: boolean;
  isJordan?: boolean;
  isIraq?: boolean;
  isYemen?: boolean;
  isEgypt?: boolean;
  isSweden: boolean;
  isIran: boolean;
  isBrazil: boolean;
  isArgentina: boolean;
}

/**
 * Validates coordinate ranges (-90 to +90 lat, -180 to +180 lng)
 * and resolves geographic sovereign context using simplified approximate boundary polygons (see boundaries.ts).
 * Strictly and accurately classifies:
 * - Morocco (including Oujda, Berkane, Rabat, Casablanca, Dakhla, Lagouira) -> MA
 * - Portugal (including Lisbon, Porto, Faro) -> PT (NOT Spain)
 * - Spain (including Madrid, Andalusia, Barcelona) -> ES (NOT Portugal, NOT Algeria)
 * - Algeria (including Algiers, Oran) -> DZ (NOT Spain)
 * - Mauritania (south of 21.34°N) -> MR
 * - Atlantic Ocean & Mediterranean Sea (offshore waters) -> Maritime Waters
 * - Coordinates outside coverage (Paris, etc.) -> isSupported: false, isOutsideSupportedCoverage: true
 */
export function validateCoordinates(coords: Coordinates): {
  isValid: boolean;
  geography: CoordinateGeography;
  error?: string;
} {
  if (!coords || typeof coords !== 'object') {
    return {
      isValid: false,
      geography: getUnknownGeography(),
      error: 'Coordinates object is missing or invalid',
    };
  }

  const { lat, lng } = coords;

  if (typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return {
      isValid: false,
      geography: getUnknownGeography(),
      error: 'Coordinates must be finite numeric values (NaN and Infinity are rejected)',
    };
  }

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return {
      isValid: false,
      geography: getUnknownGeography(),
      error: `Coordinates (${lat}, ${lng}) exceed WGS84 physical boundaries [-90..90, -180..180]`,
    };
  }

  // --- Authentic Polygon Containment Testing ---

  // 1. Portugal sovereign boundary (Mainland Portugal - Lisbon, Porto, Faro)
  const isPortugal = isPointInsidePolygon(coords, PORTUGAL_BOUNDARY);

  // 2. Spain sovereign boundary (Mainland Spain - Madrid, Seville, Barcelona)
  const isSpain = !isPortugal && isPointInsidePolygon(coords, SPAIN_BOUNDARY);

  // 3. Morocco sovereign boundary (Rabat, Casablanca, Oujda, Berkane, Fez, Agadir, Laâyoune, Dakhla)
  const isMorocco = !isPortugal && !isSpain && isPointInsidePolygon(coords, MOROCCO_BOUNDARY);

  // 4. Algeria sovereign boundary (Algiers, Oran, Constantine, Tindouf)
  const isAlgeria = !isMorocco && !isSpain && !isPortugal && isPointInsidePolygon(coords, ALGERIA_BOUNDARY);

  // 5. Mauritania sovereign boundary (Nouakchott, Nouadhibou, Chinguetti)
  const isMauritania = !isMorocco && !isAlgeria && isPointInsidePolygon(coords, MAURITANIA_BOUNDARY);

  // 6. Middle Eastern & Arabian Peninsula sovereign boundaries
  const isKuwait = isPointInsidePolygon(coords, KUWAIT_BOUNDARY);
  const isQatar = !isKuwait && isPointInsidePolygon(coords, QATAR_BOUNDARY);
  const isBahrain = !isKuwait && !isQatar && isPointInsidePolygon(coords, BAHRAIN_BOUNDARY);
  const isUAE = !isKuwait && !isQatar && !isBahrain && isPointInsidePolygon(coords, UAE_BOUNDARY);
  const isJordan = !isKuwait && !isQatar && !isUAE && isPointInsidePolygon(coords, JORDAN_BOUNDARY);
  const isIraq = !isKuwait && !isQatar && !isUAE && !isJordan && isPointInsidePolygon(coords, IRAQ_BOUNDARY);
  const isYemen = !isKuwait && !isQatar && !isUAE && !isJordan && !isIraq && isPointInsidePolygon(coords, YEMEN_BOUNDARY);
  const isEgypt = !isKuwait && !isQatar && !isUAE && !isJordan && !isIraq && !isYemen && isPointInsidePolygon(coords, EGYPT_BOUNDARY);
  const isSaudiArabia =
    !isKuwait &&
    !isQatar &&
    !isBahrain &&
    !isUAE &&
    !isJordan &&
    !isIraq &&
    !isYemen &&
    !isEgypt &&
    !isMorocco &&
    isPointInsidePolygon(coords, SAUDI_ARABIA_BOUNDARY);

  // 7. Atlantic Ocean & Mediterranean Sea (Offshore maritime waters)
  const isAtlanticOffshore =
    !isMorocco &&
    !isPortugal &&
    !isSpain &&
    !isAlgeria &&
    !isMauritania &&
    lat >= 20.0 &&
    lat <= 36.5 &&
    lng >= -25.0 &&
    lng <= -6.5;

  const isMediterraneanOffshore =
    !isMorocco &&
    !isSpain &&
    !isAlgeria &&
    lat >= 35.2 &&
    lat <= 36.5 &&
    lng >= -5.3 &&
    lng <= 0.0;

  const isMaritime = isAtlanticOffshore || isMediterraneanOffshore;

  // 8. Global comparison points (strictly guarded against neighboring sovereigns)
  const isSweden = lat >= 55.2 && lat <= 69.2 && lng >= 10.9 && lng <= 24.3;
  const isIran = !isIraq && !isKuwait && !isQatar && !isBahrain && !isUAE && !isSaudiArabia && isPointInsidePolygon(coords, IRAN_BOUNDARY);
  const isBrazil = lat >= -33.9 && lat <= 5.4 && lng >= -74.1 && lng <= -34.7;
  const isArgentina = lat >= -55.2 && lat <= -21.7 && lng >= -73.7 && lng <= -53.5;

  let countryCode = 'INT';
  let countryNameEn = 'International Territory';
  let countryNameAr = 'نطاق جغرافي دولي';
  let countryNameFr = 'Territoire international';
  let regionHint = 'Global Coordinates';
  let approximateTimezone = 'UTC';
  let isNeighboringCountry = false;
  let isSupported = false;
  let isOutsideSupportedCoverage = true;

  if (isMorocco) {
    countryCode = 'MA';
    countryNameEn = 'Morocco';
    countryNameAr = 'المملكة المغربية';
    countryNameFr = 'Maroc';
    regionHint = lat > 32 ? 'North/Atlantic Morocco' : 'South/Atlas Morocco';
    approximateTimezone = 'Africa/Casablanca';
    isSupported = true;
    isOutsideSupportedCoverage = false;
  } else if (isSaudiArabia) {
    countryCode = 'SA';
    countryNameEn = 'Saudi Arabia';
    countryNameAr = 'المملكة العربية السعودية';
    countryNameFr = 'Arabie saoudite';
    regionHint = 'Arabian Peninsula / Desert Oasis';
    approximateTimezone = 'Asia/Riyadh';
    isSupported = true;
    isOutsideSupportedCoverage = false;
  } else if (isKuwait) {
    countryCode = 'KW';
    countryNameEn = 'Kuwait';
    countryNameAr = 'الكويت';
    countryNameFr = 'Koweït';
    regionHint = 'Arabian Peninsula / Arabian Gulf';
    approximateTimezone = 'Asia/Kuwait';
  } else if (isQatar) {
    countryCode = 'QA';
    countryNameEn = 'Qatar';
    countryNameAr = 'قطر';
    countryNameFr = 'Qatar';
    regionHint = 'Arabian Peninsula / Arabian Gulf';
    approximateTimezone = 'Asia/Qatar';
  } else if (isBahrain) {
    countryCode = 'BH';
    countryNameEn = 'Bahrain';
    countryNameAr = 'البحرين';
    countryNameFr = 'Bahreïn';
    regionHint = 'Arabian Peninsula / Arabian Gulf';
    approximateTimezone = 'Asia/Bahrain';
  } else if (isUAE) {
    countryCode = 'AE';
    countryNameEn = 'United Arab Emirates';
    countryNameAr = 'الإمارات العربية المتحدة';
    countryNameFr = 'Émirats arabes unis';
    regionHint = 'Arabian Peninsula / Arabian Gulf';
    approximateTimezone = 'Asia/Dubai';
  } else if (isJordan) {
    countryCode = 'JO';
    countryNameEn = 'Jordan';
    countryNameAr = 'الأردن';
    countryNameFr = 'Jordanie';
    regionHint = 'Levant / Middle East';
    approximateTimezone = 'Asia/Amman';
  } else if (isIraq) {
    countryCode = 'IQ';
    countryNameEn = 'Iraq';
    countryNameAr = 'العراق';
    countryNameFr = 'Irak';
    regionHint = 'Mesopotamia / Middle East';
    approximateTimezone = 'Asia/Baghdad';
  } else if (isYemen) {
    countryCode = 'YE';
    countryNameEn = 'Yemen';
    countryNameAr = 'اليمن';
    countryNameFr = 'Yémen';
    regionHint = 'Arabian Peninsula / South Arabia';
    approximateTimezone = 'Asia/Aden';
  } else if (isEgypt) {
    countryCode = 'EG';
    countryNameEn = 'Egypt';
    countryNameAr = 'مصر';
    countryNameFr = 'Égypte';
    regionHint = 'Nile Valley / North Africa';
    approximateTimezone = 'Africa/Cairo';
  } else if (isPortugal) {
    countryCode = 'PT';
    countryNameEn = 'Portugal';
    countryNameAr = 'البرتغال';
    countryNameFr = 'Portugal';
    regionHint = 'Iberian Peninsula / Atlantic Coast';
    approximateTimezone = 'Europe/Lisbon';
    isNeighboringCountry = true;
    isSupported = false;
    isOutsideSupportedCoverage = false;
  } else if (isSpain) {
    countryCode = 'ES';
    countryNameEn = 'Spain';
    countryNameAr = 'إسبانيا';
    countryNameFr = 'Espagne';
    regionHint = 'Iberian Peninsula / Southern Europe';
    approximateTimezone = 'Europe/Madrid';
    isNeighboringCountry = true;
    isSupported = false;
    isOutsideSupportedCoverage = false;
  } else if (isMaritime) {
    countryCode = 'XW'; // International Waters
    countryNameEn = isAtlanticOffshore ? 'Atlantic Ocean (Maritime Waters)' : 'Mediterranean Sea (Maritime Waters)';
    countryNameAr = isAtlanticOffshore ? 'المحيط الأطلسي (مياه بحرية دولية)' : 'البحر الأبيض المتوسط (مياه بحرية)';
    countryNameFr = isAtlanticOffshore ? 'Océan Atlantique (Eaux maritimes)' : 'Mer Méditerranée (Eaux maritimes)';
    regionHint = isAtlanticOffshore ? 'Atlantic Maritime Zone' : 'Mediterranean Marine Waters';
    approximateTimezone = 'UTC';
    isSupported = false;
    isOutsideSupportedCoverage = false;
  } else if (isAlgeria) {
    countryCode = 'DZ';
    countryNameEn = 'Algeria';
    countryNameAr = 'الجمهورية الجزائرية';
    countryNameFr = 'Algérie';
    regionHint = 'North Africa / Maghreb (Algerian Territory)';
    approximateTimezone = 'Africa/Algiers';
    isNeighboringCountry = true;
    isSupported = false;
    isOutsideSupportedCoverage = false;
  } else if (isMauritania) {
    countryCode = 'MR';
    countryNameEn = 'Mauritania';
    countryNameAr = 'موريتانيا';
    countryNameFr = 'Mauritanie';
    regionHint = 'Sahel / Western Sahara Border';
    approximateTimezone = 'Africa/Nouakchott';
    isNeighboringCountry = true;
    isSupported = false;
    isOutsideSupportedCoverage = false;
  } else if (isSweden) {
    countryCode = 'SE';
    countryNameEn = 'Sweden';
    countryNameAr = 'مملكة السويد';
    countryNameFr = 'Suède';
    regionHint = lat > 64 ? 'Subarctic Northern Sweden' : 'Central/Southern Sweden';
    approximateTimezone = 'Europe/Stockholm';
  } else if (isIran) {
    countryCode = 'IR';
    countryNameEn = 'Iran';
    countryNameAr = 'إيران';
    countryNameFr = 'Iran';
    regionHint = 'Middle East / Caspian Basin / Plateau';
    approximateTimezone = 'Asia/Tehran';
  } else if (isBrazil) {
    countryCode = 'BR';
    countryNameEn = 'Brazil';
    countryNameAr = 'البرازيل';
    countryNameFr = 'Brésil';
    regionHint = 'South America / Cerrado - Amazon Basin';
    approximateTimezone = 'America/Cuiaba';
  } else if (isArgentina) {
    countryCode = 'AR';
    countryNameEn = 'Argentina';
    countryNameAr = 'الأرجنتين';
    countryNameFr = 'Argentine';
    regionHint = 'South America / Patagonia / Pampas';
    approximateTimezone = 'America/Argentina/Buenos_Aires';
  }

  return {
    isValid: true,
    geography: {
      countryCode,
      countryNameEn,
      countryNameAr,
      countryNameFr,
      regionHint,
      approximateTimezone,
      isMorocco,
      isPortugal,
      isSpain,
      isAlgeria,
      isMauritania,
      isMaritime,
      isNeighboringCountry,
      isSupported,
      isOutsideSupportedCoverage,
      isSaudiArabia,
      isKuwait,
      isQatar,
      isBahrain,
      isUAE,
      isJordan,
      isIraq,
      isYemen,
      isEgypt,
      isSweden,
      isIran,
      isBrazil,
      isArgentina,
    },
  };
}

function getUnknownGeography(): CoordinateGeography {
  return {
    countryCode: 'UNK',
    countryNameEn: 'Unknown',
    countryNameAr: 'غير معروف',
    countryNameFr: 'Inconnu',
    regionHint: 'Invalid Coordinates',
    approximateTimezone: 'UTC',
    isMorocco: false,
    isPortugal: false,
    isSpain: false,
    isAlgeria: false,
    isMauritania: false,
    isMaritime: false,
    isNeighboringCountry: false,
    isSupported: false,
    isOutsideSupportedCoverage: true,
    isSaudiArabia: false,
    isKuwait: false,
    isQatar: false,
    isBahrain: false,
    isUAE: false,
    isJordan: false,
    isIraq: false,
    isYemen: false,
    isEgypt: false,
    isSweden: false,
    isIran: false,
    isBrazil: false,
    isArgentina: false,
  };
}

/**
 * Validates a numerical value against strict physical limits and missing-value sentinels.
 * Rules:
 * - Rejects null, undefined, NaN, Infinity, -Infinity.
 * - Rejects non-numeric strings (e.g. "35abc", "null", "N/A"). Never relies on parseFloat alone.
 * - Rejects documented missing data sentinel values (-999, -999.0, -9999, 9999, -99.99).
 * - NEVER converts missing, invalid, or unavailable data into zero.
 */
export function validatePhysicalValue(
  value: unknown,
  metricType: keyof typeof PHYSICAL_LIMITS
): {
  isValid: boolean;
  sanitizedValue: number | null;
  status: 'PASS' | 'WARNING' | 'REJECTED';
  note?: string;
} {
  if (value === null || value === undefined) {
    return { isValid: false, sanitizedValue: null, status: 'REJECTED', note: 'Value is null/undefined' };
  }

  let num: number;

  if (typeof value === 'number') {
    num = value;
  } else if (typeof value === 'string') {
    const trimmed = value.trim();
    // Strict numeric regex: optional sign, digits, optional decimal, optional exponent
    const isStrictNumeric = /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(trimmed);
    if (!isStrictNumeric) {
      return {
        isValid: false,
        sanitizedValue: null,
        status: 'REJECTED',
        note: `Non-numeric string value rejected: "${value}"`,
      };
    }
    num = Number(trimmed);
  } else {
    return {
      isValid: false,
      sanitizedValue: null,
      status: 'REJECTED',
      note: `Invalid data type: ${typeof value}`,
    };
  }

  if (isNaN(num) || !Number.isFinite(num)) {
    return { isValid: false, sanitizedValue: null, status: 'REJECTED', note: 'Value is NaN or infinite' };
  }

  // Treat documented missing data sentinel values as missing
  if (num === -999 || num === -999.0 || num === -9999 || num === 9999 || num === -99.99 || num === -9999.0) {
    return {
      isValid: false,
      sanitizedValue: null,
      status: 'REJECTED',
      note: `Documented missing fill value sentinel detected (${num})`,
    };
  }

  const bounds = PHYSICAL_LIMITS[metricType];
  if (bounds) {
    if (num < bounds.min || num > bounds.max) {
      return {
        isValid: false,
        sanitizedValue: null,
        status: 'REJECTED',
        note: `Exceeds physical limits (${bounds.min} to ${bounds.max} ${bounds.unit}): received ${num}`,
      };
    }
  }

  return { isValid: true, sanitizedValue: num, status: 'PASS' };
}

/**
 * Evaluates observation age and calculates precise freshness classification.
 * Rules:
 * - Detects future timestamps and rejects them (never marks future as fresh).
 * - Enforces dataset-specific freshness latency policies.
 */
export function classifyFreshness(
  observationTimeStr: string | null | undefined,
  cadenceType: 'instantaneous' | 'nasa_daily' | 'era5_hourly' | 'satellite_overpass'
): {
  freshness: FreshnessStatus;
  ageHuman: string;
  ageDays: number;
  isFuture?: boolean;
} {
  if (!observationTimeStr || observationTimeStr === 'Indisponible' || observationTimeStr === 'Inconnu') {
    return { freshness: 'unavailable', ageHuman: 'N/A', ageDays: 999 };
  }

  const obsDate = new Date(observationTimeStr);
  if (isNaN(obsDate.getTime())) {
    return { freshness: 'unavailable', ageHuman: 'Invalid Date', ageDays: 999 };
  }

  const now = new Date();
  // 5-minute clock drift tolerance
  const futureDriftMs = 5 * 60 * 1000;
  if (obsDate.getTime() > now.getTime() + futureDriftMs) {
    return {
      freshness: 'unavailable',
      ageHuman: 'Future Date (Rejected)',
      ageDays: -1,
      isFuture: true,
    };
  }

  const diffMs = Math.max(0, now.getTime() - obsDate.getTime());
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = Math.floor(diffHours / 24);

  let ageHuman = '';
  if (diffHours < 1) {
    ageHuman = '< 1 hour';
  } else if (diffHours < 24) {
    ageHuman = `${Math.round(diffHours)} hours`;
  } else {
    ageHuman = `${diffDays} days`;
  }

  let freshness: FreshnessStatus = 'fresh';

  switch (cadenceType) {
    case 'instantaneous':
      // Instantaneous current observation should be <= 3 hours old
      if (diffHours <= 3) freshness = 'fresh';
      else if (diffHours <= 24) freshness = 'delayed';
      else freshness = 'stale';
      break;

    case 'nasa_daily':
      // NASA POWER daily agroclimatology publication latency is officially 3-4 days
      // Data <= 5 days old is FRESH for this assimilation product.
      if (diffDays <= 5) freshness = 'fresh';
      else if (diffDays <= 14) freshness = 'delayed';
      else freshness = 'stale';
      break;

    case 'era5_hourly':
      // ERA5-Land reanalysis / hourly assimilation
      if (diffHours <= 24) freshness = 'fresh';
      else if (diffDays <= 7) freshness = 'delayed';
      else freshness = 'stale';
      break;

    case 'satellite_overpass':
      // Sentinel-2 revisit is 5 days
      if (diffDays <= 7) freshness = 'fresh';
      else if (diffDays <= 25) freshness = 'delayed';
      else freshness = 'stale';
      break;
  }

  return { freshness, ageHuman, ageDays: diffDays, isFuture: false };
}

/**
 * Helper to build a validated DataProvenanceRecord for transparency audit.
 */
export function createProvenanceRecord(params: {
  id: string;
  variableKey: string;
  variableName: string;
  variableNameAr?: string;
  variableNameFr?: string;
  category: DataProvenanceRecord['category'];
  sourceName: string;
  sourceEndpoint: string;
  rawParameterName: string;
  rawValue: number | string | null;
  originalUnit: string;
  displayedValue: string;
  displayedUnit: string;
  transformation: string;
  observationTime: string;
  publicationTime?: string;
  syncTime: string;
  dataAge: string;
  freshness: FreshnessStatus;
  temporalResolution: string;
  spatialResolution: string;
  timezone: string;
  validationStatus: 'PASS' | 'WARNING' | 'REJECTED';
  validationNote?: string;
  rawJsonSnippet?: string;
}): DataProvenanceRecord {
  return { ...params };
}
