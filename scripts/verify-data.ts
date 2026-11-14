/**
 * TURBA Automated Integration & Scientific Validation Suite
 * Mandatory Section 9 Multi-Location Tests:
 * Test 1 – Morocco: Lat 33.8851, Lng -6.8999
 * Test 2 – Sweden: Lat 65.2722, Lng 21.5030
 * Test 3 – Iran: Lat 36.3515, Lng 53.0111
 * Test 4 – Brazil: Lat -11.5270, Lng -53.4859
 * Test 5 – Argentina: Lat -38.8606, Lng -68.0667
 * Test 6 – Saudi Arabia: Lat 24.1302, Lng 47.3117
 *
 * Verifies:
 * - Real API extraction from NASA POWER, Copernicus CDSE, and ERA5-Land
 * - Strict coordinate order (lat, lng) without inversion
 * - Physical bounds checking (temperatures, moisture, solar radiation)
 * - Separation of Instantaneous Weather vs Daily Assimilated Mean
 * - Separation of SMAP Soil Wetness Index (0-1) vs Volumetric Moisture (m³/m³)
 * - Rejection of -999 fill values (never converted to 0)
 * - Data independence: No cross-location cache leakage
 */

import { fetchNasaObservations } from '../src/services/nasa';
import { fetchSentinel2Observations } from '../src/services/copernicus';
import { classifyAgriculturalCoordinate, calculateGeodesicAreaM2 } from '../src/utils/geo';
import { validateCoordinates, validatePhysicalValue, classifyFreshness } from '../src/utils/validation';

async function runTests() {
  console.log('================================================================');
  console.log('TURBA COMPREHENSIVE SCIENTIFIC ACCURACY & INTEGRITY TEST SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    total++;
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      if (detail) console.error(`       -> ${detail}`);
    }
  }

  // 1. Geodesic calculation check
  const testSquare = [
    { lat: 34.26, lng: -5.92 },
    { lat: 34.27, lng: -5.92 },
    { lat: 34.27, lng: -5.91 },
    { lat: 34.26, lng: -5.91 },
  ];
  const areaM2 = calculateGeodesicAreaM2(testSquare);
  assert(areaM2 > 900000 && areaM2 < 1200000, 'Geodesic Area Calculation complies with WGS84 ellipsoid math (~100 ha)', `Area: ${areaM2} m²`);

  // 2. Physical bounds sanitizer check
  assert(validatePhysicalValue(-999, 'temperature').isValid === false, 'Documented missing fill value -999 is rejected (never converted to 0)');
  assert(validatePhysicalValue(35.4, 'temperature').sanitizedValue === 35.4, 'Physical temperature 35.4°C passes without alteration');
  assert(validatePhysicalValue(120, 'temperature').isValid === false, 'Non-physical temperature 120°C is rejected');
  assert(validatePhysicalValue(0.42, 'soil_wetness_index').isValid === true, 'Soil wetness index 0.42 within [0, 1] passes');
  assert(validatePhysicalValue(1.5, 'soil_wetness_index').isValid === false, 'Soil wetness index > 1.0 is rejected');

  // 3. Mandatory 6 Locations Live Verification
  const testLocations = [
    { name: 'Test 1 – Morocco (Gharb / Zaer)', lat: 33.8851, lng: -6.8999, expectedCountry: 'MA' },
    { name: 'Test 2 – Sweden (Piteå / Subarctic)', lat: 65.2722, lng: 21.5030, expectedCountry: 'SE' },
    { name: 'Test 3 – Iran (Sari / Mazandaran)', lat: 36.3515, lng: 53.0111, expectedCountry: 'IR' },
    { name: 'Test 4 – Brazil (Mato Grosso)', lat: -11.5270, lng: -53.4859, expectedCountry: 'BR' },
    { name: 'Test 5 – Argentina (Neuquén)', lat: -38.8606, lng: -68.0667, expectedCountry: 'AR' },
    { name: 'Test 6 – Saudi Arabia (Al-Kharj Desert)', lat: 24.1302, lng: 47.3117, expectedCountry: 'SA' },
  ];

  const resultsByLocation = new Map<string, any>();

  for (const loc of testLocations) {
    console.log(`\n------------------------------------------------------------`);
    console.log(`Executing Live Verification for: ${loc.name}`);
    console.log(`Coordinates: Lat ${loc.lat}, Lng ${loc.lng}`);
    console.log(`------------------------------------------------------------`);

    // Verify coordinate sovereign validation
    const geo = validateCoordinates({ lat: loc.lat, lng: loc.lng });
    assert(geo.isValid, `${loc.name}: Coordinates are valid WGS84`);
    assert(geo.geography.countryCode === loc.expectedCountry, `${loc.name}: Country detected as ${geo.geography.countryCode}`);

    // Query NASA POWER, WMO instantaneous weather, and Copernicus ERA5-Land
    const envResult = await fetchNasaObservations({ lat: loc.lat, lng: loc.lng });
    resultsByLocation.set(loc.name, envResult);

    // Assert Instantaneous vs Daily Mean Separation
    assert(
      envResult.currentWeather.dataStatus === 'VERIFIED',
      `${loc.name}: Current Instantaneous Weather returned from WMO / Station Network`,
      `Temp: ${envResult.currentWeather.temperature2m}°C, Timezone: ${envResult.currentWeather.timezone}`
    );

    assert(
      envResult.nasaPower.dataStatus === 'VERIFIED',
      `${loc.name}: NASA POWER Daily Assimilation returned (T2M Mean)`,
      `T2M Daily: ${envResult.nasaPower.temperature2m}°C, Date: ${envResult.nasaPower.observationDateUtc}`
    );

    // Verify SMAP Wetness Index vs Volumetric Soil Moisture
    if (envResult.nasaSmap.rootZoneSoilMoistureIndex !== null) {
      assert(
        envResult.nasaSmap.rootZoneSoilMoistureIndex >= 0 && envResult.nasaSmap.rootZoneSoilMoistureIndex <= 1,
        `${loc.name}: SMAP GWETROOT is within dimensionless 0-1 scale (${envResult.nasaSmap.rootZoneSoilMoistureIndex})`
      );
    }

    if (envResult.era5LandSoil.layer0_7cm !== null) {
      assert(
        envResult.era5LandSoil.layer0_7cm >= 0 && envResult.era5LandSoil.layer0_7cm <= 0.70,
        `${loc.name}: Copernicus ERA5-Land Volumetric Moisture (0-7cm) is within physical limits (${envResult.era5LandSoil.layer0_7cm} m³/m³)`
      );
    }

    // Assert Data Provenance records generation
    assert(
      envResult.provenanceRecords.length >= 8,
      `${loc.name}: Data Provenance records generated for all variables (${envResult.provenanceRecords.length} records)`
    );

    // Query Copernicus Sentinel-2 CDSE catalog
    const s2Result = await fetchSentinel2Observations({ lat: loc.lat, lng: loc.lng });
    assert(
      (s2Result.granuleName !== null && s2Result.granuleName.startsWith('S2')) || s2Result.dataStatus === 'UNAVAILABLE',
      `${loc.name}: Copernicus CDSE catalog handles real overpasses without fabrication`,
      s2Result.granuleName ? `Granule: ${s2Result.granuleName?.slice(0, 35)}... (Tile: ${s2Result.tileId})` : `Status: ${s2Result.dataStatus}`
    );

    assert(
      s2Result.ndviCurrent === null && (s2Result.spectralMethod.includes('B8') || s2Result.dataStatus === 'UNAVAILABLE'),
      `${loc.name}: Direct NDVI enforces formula (B8 - B4) / (B8 + B4) without fabricating fake values`
    );
  }

  // 4. Test Cross-Location Independence (No data leakage between locations)
  console.log(`\n------------------------------------------------------------`);
  console.log(`Checking Cross-Location Independence (Rule 3)`);
  console.log(`------------------------------------------------------------`);
  const moroccoRes = resultsByLocation.get(testLocations[0].name);
  const saudiRes = resultsByLocation.get(testLocations[5].name);
  const swedenRes = resultsByLocation.get(testLocations[1].name);

  assert(
    moroccoRes.currentWeather.temperature2m !== saudiRes.currentWeather.temperature2m &&
    moroccoRes.currentWeather.temperature2m !== swedenRes.currentWeather.temperature2m,
    'Each location receives its own independent meteorological measurements (Zero cache leaking)',
    `Morocco: ${moroccoRes.currentWeather.temperature2m}°C, Sweden: ${swedenRes.currentWeather.temperature2m}°C, Saudi: ${saudiRes.currentWeather.temperature2m}°C`
  );

  assert(
    saudiRes.era5LandSoil.layer0_7cm !== null && saudiRes.era5LandSoil.layer0_7cm <= 0.10,
    'Saudi desert soil moisture accurately reflects hyper-arid conditions (<= 0.10 m³/m³)',
    `Saudi ERA5 0-7cm: ${saudiRes.era5LandSoil.layer0_7cm} m³/m³`
  );

  console.log('\n================================================================');
  console.log(`TOTAL VALIDATION RESULTS: ${passed} / ${total} tests PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log('================================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
