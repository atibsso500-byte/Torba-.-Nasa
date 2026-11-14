/**
 * TURBA (تُربة) – Moroccan Agricultural Intelligence Platform
 * TypeScript Data Models & Scientific Integrity Types
 */

export interface Coordinates {
  lat: number;
  lng: number;
}

export type DataStatus =
  | 'VERIFIED'
  | 'HISTORICAL'
  | 'METADATA_ONLY'
  | 'ESTIMATED'
  | 'STALE'
  | 'UNAVAILABLE'
  | 'NOT_CONFIGURED'
  | 'INVALID';

export type AgriculturalStatus =
  | 'confirmed_agricultural'
  | 'unverified_outside_perimeter'
  | 'non_agricultural'
  | 'unavailable';

export interface AgriculturalClassification {
  source: 'ESA_WorldCereal_2021' | 'Digital_Earth_Africa_2019' | 'None';
  cropType:
    | 'temporary_crops'
    | 'cereals_winter'
    | 'cereals_spring'
    | 'maize'
    | 'irrigation_active'
    | 'cropland_general'
    | 'non_cropland'
    | null;
  cropLabelEn: string;
  cropLabelFr: string;
  cropLabelAr: string;
  confidence: number | null; // 0-100% or null if not classified
  productYear: number | null; // e.g. 2021 for WorldCereal, 2019 for DE Africa
  spatialResolution: string; // e.g. "10m"
  status: AgriculturalStatus;
  dataStatus: DataStatus;
  notes?: string;
}

export interface DeAfricaComparison {
  mask: number | null; // 1 = cropland, 0 = non-cropland, null = missing
  prob: number | null; // probability 0-100
  filtered: number | null;
  observationYear: 2019;
  spatialResolution: '10m';
  agreement: 'agree' | 'divergent' | 'uncertain' | 'outside_coverage';
  dataStatus: DataStatus;
  note: string;
}

export type FreshnessStatus = 'fresh' | 'delayed' | 'stale' | 'unavailable';

export interface DataProvenanceRecord {
  id: string;
  variableKey: string;
  variableName: string;
  variableNameAr?: string;
  variableNameFr?: string;
  category: 'weather' | 'soil' | 'rainfall' | 'vegetation' | 'radiation' | 'wind';
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
}

export interface CurrentWeatherObservation {
  temperature2m: number | null;
  relativeHumidity2m: number | null;
  windSpeed10m: number | null;
  apparentTemperature: number | null;
  precipitationMm: number | null;
  weatherCode: number | null;
  observationTime: string;
  source: string;
  temporalResolution: string;
  spatialResolution: string;
  timezone: string;
  dataStatus: DataStatus;
  freshness: FreshnessStatus;
}

export interface CopernicusEra5LandSoil {
  source: 'Open-Meteo NWP Soil Moisture Model'; // NWP model output (resolution varies by model); NOT ERA5-Land
  layer0_7cm: number | null; // m³/m³
  layer7_28cm: number | null; // m³/m³
  layer28_100cm: number | null; // m³/m³
  layer100_255cm: number | null; // m³/m³
  observationTime: string;
  temporalResolution: 'Hourly NWP soil model assimilation';
  spatialResolution: string; // varies by underlying NWP model (~0.1-0.25°); not guaranteed
  timezone: string;
  dataStatus: DataStatus;
  freshness: FreshnessStatus;
}

export interface NasaPowerObservation {
  source: 'NASA POWER Agroclimatology (MERRA-2 / GEOS-FP)';
  temperature2m: number | null; // Daily Average in °C
  temperatureMax: number | null; // Daily Maximum in °C
  temperatureMin: number | null; // Daily Minimum in °C
  relativeHumidity2m: number | null; // Daily Average %
  windSpeed2m: number | null; // Daily Average m/s
  solarRadiation: number | null; // Daily Sum MJ/m²/day
  precipitationMm: number | null; // Daily Sum mm
  observationDateUtc: string; // YYYY-MM-DD
  observationDateLocal: string; // Local date
  spatialResolution: '0.5° x 0.625° (~50 km)';
  temporalResolution: 'Daily average assimilation';
  retrievalTimestamp: string;
  dataStatus: DataStatus;
  freshness: FreshnessStatus;
  missingReason?: string;
  dailyHistory: Array<{
    date: string;
    temperature: number | null;
    humidity: number | null;
    precipitation: number | null;
    radiation: number | null;
  }>;
}

export interface NasaSmapObservation {
  source: string;
  surfaceSoilMoistureIndex: number | null; // GWETTOP 0-1 dimensionless scale
  rootZoneSoilMoistureIndex: number | null; // GWETROOT 0-1 dimensionless scale
  observationDateUtc: string;
  spatialResolution: string;
  temporalResolution: 'Daily assimilation';
  retrievalTimestamp: string;
  dataStatus: DataStatus;
  freshness: FreshnessStatus;
  missingReason?: string;
}

export interface NasaGpmObservation {
  source: string;
  dailyRainfallMm: number | null;
  monthlyAccumulationMm: number | null;
  historicalAverageMonthlyMm: number | null;
  anomalyPercent: number | null;
  observationDateUtc: string;
  spatialResolution: string;
  temporalResolution: 'Daily accumulation';
  retrievalTimestamp: string;
  dataStatus: DataStatus;
  freshness: FreshnessStatus;
  missingReason?: string;
}

export interface Sentinel2Observation {
  source: 'Copernicus Sentinel-2 MSI Level-2A (ESA)';
  ndviCurrent: number | null; // Calculated from (B8 - B4) / (B8 + B4) or null
  cloudCoveragePercent: number | null;
  tileId: string | null;
  granuleName: string | null;
  acquisitionDateUtc: string | null;
  spatialResolution: 'Native product resolution 10 m (B04/B08) — bands NOT processed by TURBA' | '10m (Bands B04 665nm & B08 842nm)';
  temporalResolution: '5-day revisit';
  ndviCategory: 'dense_vegetation' | 'moderate_vegetation' | 'sparse_vegetation' | 'bare_soil' | null;
  spectralMethod: string;
  retrievalTimestamp: string;
  dataStatus: DataStatus;
  freshness: FreshnessStatus;
  missingReason?: string;
  recentPasses: Array<{
    date: string;
    tileId: string;
    cloudCover: number | null;
  }>;
}

export interface MoroccanAgriculturalZone {
  id: string;
  name: string;
  nameAr: string;
  nameEn?: string;
  region: string;
  province: string;
  basin: string;
  primaryCrops: string[];
  centroid: Coordinates;
  polygon: Coordinates[];
  classification: AgriculturalClassification;
  deAfricaVerification: DeAfricaComparison;
}

export interface GpsLocationRecord {
  coordinates: Coordinates;
  accuracyMeters: number | null;
  timestamp: string; // ISO 8601 UTC
  displayTimeMorocco: string;
}

export interface FarmRecord {
  id: string;
  farmerId: string;
  name: string;
  notes?: string;
  region: string;
  province: string;
  centroid: Coordinates;
  polygon: Coordinates[] | null;
  calculatedAreaHectares: number;
  calculatedAreaM2: number;
  identificationMethod: 'map_selection' | 'gps' | 'draw_polygon' | 'coordinates_entry';
  cadastralReference?: string;
  classification: AgriculturalClassification;
  currentWeather?: CurrentWeatherObservation | null;
  nasaPower?: NasaPowerObservation | null;
  nasaSmap?: NasaSmapObservation | null;
  era5LandSoil?: CopernicusEra5LandSoil | null;
  nasaGpm?: NasaGpmObservation | null;
  sentinel2?: Sentinel2Observation | null;
  provenanceRecords?: DataProvenanceRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface ApiStatusReport {
  name: string;
  category: 'maps' | 'agriculture' | 'nasa' | 'sentinel' | 'storage';
  endpointOrDataset: string;
  implementationStatus:
    | 'IMPLEMENTED AND TESTED WITH REAL DATA'
    | 'IMPLEMENTED BUT NOT TESTED'
    | 'PARTIALLY WORKING'
    | 'NOT CONFIGURED'
    | 'FAILED'
    | 'NOT IMPLEMENTED';
  realDataVerified: boolean;
  notes: string;
}
