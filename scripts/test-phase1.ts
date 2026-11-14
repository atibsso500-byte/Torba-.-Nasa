/**
 * TURBA — Comprehensive Section 9 Test Suite
 *
 * Covers:
 * 1. Country Classification:
 *    - Oujda (34.68, -1.91) -> Morocco (MA), isMorocco=true
 *    - Berkane (34.92, -2.32) -> Morocco (MA), isMorocco=true
 *    - Rabat (34.02, -6.84) -> Morocco (MA), isMorocco=true
 *    - Casablanca (33.59, -7.62) -> Morocco (MA), isMorocco=true
 *    - Lisbon (38.72, -9.14) -> Portugal (PT), isPortugal=true, isSpain=false
 *    - Algiers (36.75, 3.06) -> Algeria (DZ), isAlgeria=true, isSpain=false
 *    - Madrid (40.42, -3.70) -> Spain (ES), isSpain=true, isPortugal=false
 *    - Paris (48.85, 2.35) -> Outside supported coverage, isOutsideSupportedCoverage=true, isMorocco=false
 *
 * 2. Polygon Validation:
 *    - Valid 4-point polygon -> isValid=true, areaHa > 0
 *    - 2-point polygon (< 3 vertices) -> isValid=false
 *    - Polygon with consecutive duplicate points -> isValid=false
 *    - Bowtie self-intersecting polygon -> isValid=false
 *    - Colinear 3-point polygon with zero area -> isValid=false
 *    - Polygon with NaN or out-of-range coordinates -> isValid=false
 *
 * 3. Centroid Verification:
 *    - Known symmetrical polygon -> centroid equals geometric center
 *    - Centroid is strictly NOT equal to polygon[0]
 *
 * 4. Coordinate Formatting:
 *    - Rabat (34.02, -6.84) -> "34.0200°N, 6.8400°W" (NO minus before W)
 *    - Southern / Eastern coordinates tested
 *    - Invalid coordinates return "N/A"
 *
 * 5. GeoJSON Export (RFC 7946):
 *    - Linear rings closed (first point equals last point)
 *    - Point geometries exported as Point, not 1-point Polygon
 *    - Obsolete "crs" property is NOT present
 */

import { validateCoordinates } from '../src/utils/validation';
import {
  validatePolygon,
  calculateCentroid,
  calculateGeodesicAreaM2,
  formatCoordinates,
  formatLatitude,
  formatLongitude,
} from '../src/utils/geo';
import { exportFarmsToGeoJson } from '../src/services/farmStorage';
import { FarmRecord } from '../src/types/farm';

let passed = 0;
let total = 0;

function assert(condition: boolean, testId: string, description: string, evidence?: string) {
  total++;
  if (condition) {
    console.log(`[PASS] ${testId}: ${description}`);
    if (evidence) console.log(`       Evidence: ${evidence}`);
    passed++;
  } else {
    console.error(`[FAIL] ${testId}: ${description}`);
    if (evidence) console.error(`       Failure Details: ${evidence}`);
  }
}

console.log('================================================================================');
console.log('TURBA PHASE 1: SECTION 9 MANDATORY AUTOMATED TEST SUITE');
console.log('================================================================================\n');

// -----------------------------------------------------------------------------
// 1. COUNTRY CLASSIFICATION TESTS
// -----------------------------------------------------------------------------
console.log('--- 1. Country Classification Tests ---');

// Oujda (Morocco - Eastern Border)
const oujda = validateCoordinates({ lat: 34.68, lng: -1.91 });
assert(
  oujda.geography.countryCode === 'MA' &&
  oujda.geography.isMorocco === true &&
  oujda.geography.isAlgeria === false &&
  oujda.geography.isSupported === true,
  'GEO-01',
  'Oujda correctly classified as Morocco (MA), not Algeria',
  `Code: ${oujda.geography.countryCode}, Name: ${oujda.geography.countryNameEn}`
);

// Berkane (Morocco - Eastern Rif / Beni Snassen)
const berkane = validateCoordinates({ lat: 34.92, lng: -2.32 });
assert(
  berkane.geography.countryCode === 'MA' &&
  berkane.geography.isMorocco === true &&
  berkane.geography.isAlgeria === false &&
  berkane.geography.isSupported === true,
  'GEO-02',
  'Berkane correctly classified as Morocco (MA), not Algeria',
  `Code: ${berkane.geography.countryCode}, Name: ${berkane.geography.countryNameEn}`
);

// Rabat (Morocco - Capital)
const rabat = validateCoordinates({ lat: 34.02, lng: -6.84 });
assert(
  rabat.geography.countryCode === 'MA' &&
  rabat.geography.isMorocco === true &&
  rabat.geography.isSupported === true,
  'GEO-03',
  'Rabat correctly classified as Morocco (MA)',
  `Code: ${rabat.geography.countryCode}, Name: ${rabat.geography.countryNameEn}`
);

// Casablanca (Morocco - Atlantic Coast)
const casablanca = validateCoordinates({ lat: 33.59, lng: -7.62 });
assert(
  casablanca.geography.countryCode === 'MA' &&
  casablanca.geography.isMorocco === true &&
  casablanca.geography.isSupported === true,
  'GEO-04',
  'Casablanca correctly classified as Morocco (MA)',
  `Code: ${casablanca.geography.countryCode}, Name: ${casablanca.geography.countryNameEn}`
);

// Lisbon (Portugal - Iberian Peninsula)
const lisbon = validateCoordinates({ lat: 38.72, lng: -9.14 });
assert(
  lisbon.geography.countryCode === 'PT' &&
  lisbon.geography.isPortugal === true &&
  lisbon.geography.isSpain === false &&
  lisbon.geography.isMorocco === false,
  'GEO-05',
  'Lisbon correctly classified as Portugal (PT), NOT Spain (ES)',
  `Code: ${lisbon.geography.countryCode}, Name: ${lisbon.geography.countryNameEn}`
);

// Algiers (Algeria - Capital)
const algiers = validateCoordinates({ lat: 36.75, lng: 3.06 });
assert(
  algiers.geography.countryCode === 'DZ' &&
  algiers.geography.isAlgeria === true &&
  algiers.geography.isSpain === false &&
  algiers.geography.isMorocco === false,
  'GEO-06',
  'Algiers correctly classified as Algeria (DZ), NOT Spain (ES)',
  `Code: ${algiers.geography.countryCode}, Name: ${algiers.geography.countryNameEn}`
);

// Madrid (Spain - Capital)
const madrid = validateCoordinates({ lat: 40.42, lng: -3.70 });
assert(
  madrid.geography.countryCode === 'ES' &&
  madrid.geography.isSpain === true &&
  madrid.geography.isPortugal === false &&
  madrid.geography.isMorocco === false,
  'GEO-07',
  'Madrid correctly classified as Spain (ES), NOT Portugal (PT)',
  `Code: ${madrid.geography.countryCode}, Name: ${madrid.geography.countryNameEn}`
);

// Paris (France - Outside Supported Coverage)
const paris = validateCoordinates({ lat: 48.85, lng: 2.35 });
assert(
  paris.geography.isMorocco === false &&
  paris.geography.isSupported === false &&
  paris.geography.isOutsideSupportedCoverage === true,
  'GEO-08',
  'Paris correctly classified as outside supported coverage',
  `Code: ${paris.geography.countryCode}, OutsideCoverage: ${paris.geography.isOutsideSupportedCoverage}`
);

// -----------------------------------------------------------------------------
// 2. POLYGON VALIDATION TESTS
// -----------------------------------------------------------------------------
console.log('\n--- 2. Polygon Validation Tests ---');

// 2.1 Valid 4-point polygon
const validQuad = [
  { lat: 34.20, lng: -6.00 },
  { lat: 34.22, lng: -6.00 },
  { lat: 34.22, lng: -5.98 },
  { lat: 34.20, lng: -5.98 },
];
const validRes = validatePolygon(validQuad);
assert(
  validRes.isValid === true && (validRes.areaHa || 0) > 0,
  'POLY-01',
  'Valid 4-point parcel polygon accepted with non-zero area',
  `Area: ${validRes.areaHa} ha, areaM2: ${validRes.areaM2} m²`
);

// 2.2 Less than 3 vertices
const twoPoint = [
  { lat: 34.20, lng: -6.00 },
  { lat: 34.22, lng: -6.00 },
];
const twoPointRes = validatePolygon(twoPoint);
assert(
  twoPointRes.isValid === false && Boolean(twoPointRes.error?.includes('insufficient vertices')),
  'POLY-02',
  'Polygon with < 3 vertices rejected with clear message',
  `Error: "${twoPointRes.error}"`
);

// 2.3 Consecutive duplicate points
const duplicateVertices = [
  { lat: 34.20, lng: -6.00 },
  { lat: 34.22, lng: -6.00 },
  { lat: 34.22, lng: -6.00 }, // Duplicate
  { lat: 34.20, lng: -5.98 },
];
const dupRes = validatePolygon(duplicateVertices);
assert(
  dupRes.isValid === false && Boolean(dupRes.error?.includes('duplicate consecutive vertices')),
  'POLY-03',
  'Polygon with consecutive duplicate vertices rejected',
  `Error: "${dupRes.error}"`
);

// 2.4 Self-intersecting bowtie polygon
const bowtie = [
  { lat: 34.00, lng: -6.00 },
  { lat: 34.02, lng: -5.98 },
  { lat: 34.02, lng: -6.00 },
  { lat: 34.00, lng: -5.98 },
];
const bowtieRes = validatePolygon(bowtie);
assert(
  bowtieRes.isValid === false && Boolean(bowtieRes.error?.includes('self-intersecting')),
  'POLY-04',
  'Self-intersecting bowtie polygon rejected',
  `Error: "${bowtieRes.error}"`
);

// 2.5 Degenerate colinear zero-area polygon
const colinear = [
  { lat: 34.20, lng: -6.00 },
  { lat: 34.21, lng: -6.00 },
  { lat: 34.22, lng: -6.00 },
];
const colinearRes = validatePolygon(colinear);
assert(
  colinearRes.isValid === false && Boolean(colinearRes.error?.includes('area is 0')),
  'POLY-05',
  'Colinear zero-area polygon rejected',
  `Error: "${colinearRes.error}"`
);

// 2.6 NaN or out-of-bounds coords
const nanPoly = [
  { lat: NaN, lng: -6.00 },
  { lat: 34.22, lng: -6.00 },
  { lat: 34.20, lng: -5.98 },
];
const nanRes = validatePolygon(nanPoly);
assert(
  nanRes.isValid === false && Boolean(nanRes.error?.includes('invalid or non-finite')),
  'POLY-06',
  'Polygon with NaN coordinate rejected',
  `Error: "${nanRes.error}"`
);

// -----------------------------------------------------------------------------
// 3. CENTROID CALCULATION VERIFICATION
// -----------------------------------------------------------------------------
console.log('\n--- 3. Centroid Calculation Verification ---');

// For symmetric box from [34.00, -6.00] to [34.10, -5.90], centroid must be [34.05, -5.95]
const symmetricBox = [
  { lat: 34.00, lng: -6.00 },
  { lat: 34.10, lng: -6.00 },
  { lat: 34.10, lng: -5.90 },
  { lat: 34.00, lng: -5.90 },
];
const boxCentroid = calculateCentroid(symmetricBox);
const isCenterCorrect = Math.abs(boxCentroid.lat - 34.05) < 0.001 && Math.abs(boxCentroid.lng - (-5.95)) < 0.001;
const isNotFirstVertex = boxCentroid.lat !== symmetricBox[0].lat || boxCentroid.lng !== symmetricBox[0].lng;

assert(
  isCenterCorrect && isNotFirstVertex,
  'CENT-01',
  'True geometric centroid calculated accurately (and strictly not first vertex)',
  `Calculated: (${boxCentroid.lat}, ${boxCentroid.lng}), Vertex[0]: (${symmetricBox[0].lat}, ${symmetricBox[0].lng})`
);

// -----------------------------------------------------------------------------
// 4. COORDINATE FORMATTING TESTS
// -----------------------------------------------------------------------------
console.log('\n--- 4. Coordinate Formatting Tests ---');

// Negative longitude (e.g. Rabat) must NOT produce "-6.8400°W"
const formattedRabat = formatCoordinates({ lat: 34.02, lng: -6.84 }, 4);
assert(
  formattedRabat === '34.0200°N, 6.8400°W' && !formattedRabat.includes('-'),
  'FMT-01',
  'West longitude formatted without negative sign ("34.0200°N, 6.8400°W")',
  `Result: "${formattedRabat}"`
);

// Southern hemisphere and Eastern longitude
const formattedSouthEast = formatCoordinates({ lat: -25.5, lng: 28.2 }, 3);
assert(
  formattedSouthEast === '25.500°S, 28.200°E' && !formattedSouthEast.includes('-'),
  'FMT-02',
  'South and East coordinates formatted with directional letters and positive magnitudes',
  `Result: "${formattedSouthEast}"`
);

// Null or invalid coordinates
const formattedNull = formatCoordinates(null);
assert(
  formattedNull === 'N/A',
  'FMT-03',
  'Null coordinates return "N/A" gracefully',
  `Result: "${formattedNull}"`
);

// -----------------------------------------------------------------------------
// 5. GEOJSON EXPORT TESTS (RFC 7946)
// -----------------------------------------------------------------------------
console.log('\n--- 5. GeoJSON Export Tests (RFC 7946 Compliance) ---');

const mockPolygonFarm: FarmRecord = {
  id: 'farm-test-1',
  farmerId: 'farmer-1',
  name: 'Parcelle Test Gharb',
  region: 'Rabat-Salé-Kénitra',
  province: 'Sidi Slimane',
  centroid: { lat: 34.26, lng: -5.92 },
  polygon: [
    { lat: 34.25, lng: -5.93 },
    { lat: 34.27, lng: -5.93 },
    { lat: 34.27, lng: -5.91 },
    { lat: 34.25, lng: -5.91 },
  ],
  calculatedAreaHectares: 40.5,
  calculatedAreaM2: 405000,
  identificationMethod: 'draw_polygon',
  classification: {
    source: 'ESA_WorldCereal_2021',
    cropType: 'cereals_winter',
    cropLabelEn: 'Winter Cereals',
    cropLabelFr: 'Céréales d’hiver',
    cropLabelAr: 'حبوب شتوية',
    confidence: 94,
    productYear: 2021,
    spatialResolution: '10m',
    status: 'confirmed_agricultural',
    dataStatus: 'VERIFIED',
  },
  createdAt: '2026-03-01T10:00:00Z',
  updatedAt: '2026-03-01T10:00:00Z',
};

const mockPointFarm: FarmRecord = {
  id: 'farm-test-2',
  farmerId: 'farmer-1',
  name: 'Point Test Saïss',
  region: 'Fès-Meknès',
  province: 'Meknès',
  centroid: { lat: 33.88, lng: -5.55 },
  polygon: null,
  calculatedAreaHectares: 0,
  calculatedAreaM2: 0,
  identificationMethod: 'map_selection',
  classification: {
    source: 'ESA_WorldCereal_2021',
    cropType: 'irrigation_active',
    cropLabelEn: 'Active Irrigation Cropland',
    cropLabelFr: 'Cultures irriguées actives',
    cropLabelAr: 'زراعات مسقية نشطة',
    confidence: 88,
    productYear: 2021,
    spatialResolution: '10m',
    status: 'confirmed_agricultural',
    dataStatus: 'VERIFIED',
  },
  createdAt: '2026-03-01T10:00:00Z',
  updatedAt: '2026-03-01T10:00:00Z',
};

const geoJsonStr = exportFarmsToGeoJson([mockPolygonFarm, mockPointFarm]);
const geoJson = JSON.parse(geoJsonStr);

// Verify RFC 7946 compliance:
// 1. No crs attribute
const hasNoCrs = !('crs' in geoJson);

// 2. Feature 1 is a closed Polygon with [lng, lat]
const f1 = geoJson.features[0];
const f1Geom = f1.geometry;
const ring = f1Geom.coordinates[0];
const f1First = ring[0];
const f1Last = ring[ring.length - 1];
const f1Closed = f1First[0] === f1Last[0] && f1First[1] === f1Last[1];
const f1LngFirst = f1First[0] < 0 && f1First[1] > 0; // lng ~ -5.93, lat ~ 34.25

// 3. Feature 2 is a Point geometry, NOT a 1-point polygon
const f2 = geoJson.features[1];
const f2IsPoint = f2.geometry.type === 'Point';
const f2Coords = f2.geometry.coordinates;
const f2LngFirst = f2Coords[0] === -5.55 && f2Coords[1] === 33.88;

assert(
  hasNoCrs &&
  f1Geom.type === 'Polygon' &&
  f1Closed &&
  f1LngFirst &&
  f2IsPoint &&
  f2LngFirst,
  'GEOJSON-01',
  'GeoJSON export strictly complies with RFC 7946 (closed linear rings, [lng, lat], Point geometry, no obsolete crs)',
  `NoCRS: ${hasNoCrs}, RingClosed: ${f1Closed}, F2Type: ${f2.geometry.type}, F2Coords: [${f2Coords}]`
);

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
console.log('\n================================================================================');
console.log(`SECTION 9 AUTOMATED SUITE RESULTS: ${passed} / ${total} TESTS PASSED (${Math.round((passed / total) * 100)}%)`);
console.log('================================================================================\n');

if (passed !== total) {
  process.exit(1);
} else {
  console.log('ALL PHASE 1 SPECIFICATION VERIFICATIONS COMPLETED SUCCESSFULLY.');
}
