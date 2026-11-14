/**
 * TURBA Phase 3 — Scientific Irrigation Validation & Unit Conversion Utilities
 * Reuses Phase 1/2 coordinate validation (`validateCoordinates`) and physical limits.
 */

import { Coordinates } from '../../types/farm';
import { validateCoordinates, validatePhysicalValue } from '../../utils/validation';
import { FarmerIrrigationConfig, LoggedIrrigationEvent } from '../../types/irrigation';

export const IRRIGATION_PHYSICAL_BOUNDS = {
  atmosphericPressureKpa: { min: 50, max: 110, unit: 'kPa' },
  elevationM: { min: -430, max: 6000, unit: 'm' },
  thetaFc: { min: 0.04, max: 0.65, unit: 'm³/m³' },
  thetaWp: { min: 0.01, max: 0.45, unit: 'm³/m³' },
  rootDepthM: { min: 0.05, max: 3.5, unit: 'm' },
  depletionFractionP: { min: 0.05, max: 0.9, unit: 'fraction' },
  efficiencyEa: { min: 0.1, max: 1.0, unit: 'decimal' },
  fieldAreaHa: { min: 0.001, max: 500000, unit: 'ha' },
  flowRateLph: { min: 10, max: 10000000, unit: 'L/h' },
  irrigationDepthMm: { min: 0, max: 500, unit: 'mm' },
};

/**
 * FAO-56 Eq. 47: Adjust wind speed measured at height zw (m) to standard 2 m height.
 * u2 = uz * 4.87 / ln(67.8 * zw - 5.42)
 */
export function adjustWindSpeedTo2m(windSpeedMs: number, measurementHeightM: number): number {
  if (!Number.isFinite(windSpeedMs) || windSpeedMs < 0) {
    throw new Error(`Invalid wind speed: ${windSpeedMs}`);
  }
  if (!Number.isFinite(measurementHeightM) || measurementHeightM < 0.5) {
    throw new Error(`Invalid wind measurement height: ${measurementHeightM} m`);
  }
  if (Math.abs(measurementHeightM - 2) < 0.05) {
    return windSpeedMs;
  }
  const denom = Math.log(67.8 * measurementHeightM - 5.42);
  if (!Number.isFinite(denom) || denom <= 0) {
    throw new Error(`Invalid logarithmic profile denominator at height ${measurementHeightM} m`);
  }
  return windSpeedMs * (4.87 / denom);
}

/**
 * FAO-56 Eq. 7: Atmospheric pressure (kPa) from elevation above sea level z (m).
 * P = 101.3 * ((293 - 0.0065 * z) / 293)^5.26
 */
export function atmosphericPressureFromElevationKpa(elevationM: number): number {
  if (!Number.isFinite(elevationM) || elevationM < -430 || elevationM > 8850) {
    throw new Error(`Elevation out of valid Earth bounds: ${elevationM} m`);
  }
  return 101.3 * Math.pow((293 - 0.0065 * elevationM) / 293, 5.26);
}

/**
 * Validates UTC YYYY-MM-DD date string strictly and parses calendar date without timezone shift.
 */
export function parseIsoDateUtc(dateStr: string): Date | null {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim())) {
    return null;
  }
  const [y, m, d] = dateStr.trim().split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== m - 1 ||
    dt.getUTCDate() !== d
  ) {
    return null;
  }
  return dt;
}

/**
 * Computes integer Day of Year J in [1..366] per FAO-56.
 */
export function getDayOfYearUtc(dateStr: string): number | null {
  const dt = parseIsoDateUtc(dateStr);
  if (!dt) return null;
  const startOfYear = Date.UTC(dt.getUTCFullYear(), 0, 1);
  return Math.floor((dt.getTime() - startOfYear) / 86400000) + 1;
}

/**
 * Difference in integer days between dateA and dateB (dateB - dateA).
 */
export function diffDaysUtc(earlierDate: string, laterDate: string): number | null {
  const a = parseIsoDateUtc(earlierDate);
  const b = parseIsoDateUtc(laterDate);
  if (!a || !b) return null;
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

/**
 * Validates all meteorological/irrigation config inputs before running calculations.
 */
export function validateIrrigationInputs(params: {
  coordinates: Coordinates;
  config: FarmerIrrigationConfig;
  referenceDateUtc: string;
}): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  const coordCheck = validateCoordinates(params.coordinates);
  if (!coordCheck.isValid) {
    errors.push(coordCheck.error || 'Invalid farm coordinates');
  }

  const { config, referenceDateUtc } = params;

  if (!config.cropId) {
    errors.push('No crop selected. Select a crop to compute crop evapotranspiration (ETc) and root-zone storage.');
  }

  if (config.plantingDate) {
    const pDate = parseIsoDateUtc(config.plantingDate);
    if (!pDate) {
      errors.push(`Invalid planting/start date format (${config.plantingDate}); expected YYYY-MM-DD.`);
    } else {
      const dap = diffDaysUtc(config.plantingDate, referenceDateUtc);
      if (dap !== null && dap < -30) {
        errors.push(`Planting date (${config.plantingDate}) is more than 30 days in the future relative to reference date (${referenceDateUtc}).`);
      } else if (dap !== null && dap < 0) {
        warnings.push(`Planting date (${config.plantingDate}) is after reference date (${referenceDateUtc}); initial crop stage assumed.`);
      }
    }
  } else if (config.growthStageOverride === 'auto') {
    warnings.push('No planting date provided; crop growth stage must be selected manually or planting date entered.');
  }

  if (config.fieldAreaHectares !== null) {
    if (
      !Number.isFinite(config.fieldAreaHectares) ||
      config.fieldAreaHectares < IRRIGATION_PHYSICAL_BOUNDS.fieldAreaHa.min ||
      config.fieldAreaHectares > IRRIGATION_PHYSICAL_BOUNDS.fieldAreaHa.max
    ) {
      errors.push(
        `Field area (${config.fieldAreaHectares} ha) outside physical bounds [${IRRIGATION_PHYSICAL_BOUNDS.fieldAreaHa.min}..${IRRIGATION_PHYSICAL_BOUNDS.fieldAreaHa.max} ha].`
      );
    }
  }

  if (!Number.isFinite(config.applicationEfficiency) || config.applicationEfficiency <= 0.05 || config.applicationEfficiency > 1.0) {
    errors.push(`Application efficiency Ea (${config.applicationEfficiency}) must be a decimal between 0.05 and 1.00.`);
  }

  if (
    !Number.isFinite(config.targetDepletionFractionOfRaw) ||
    config.targetDepletionFractionOfRaw < 0 ||
    config.targetDepletionFractionOfRaw > 0.95
  ) {
    errors.push(`Target depletion fraction after irrigation (${config.targetDepletionFractionOfRaw}) must be between 0.00 and 0.95.`);
  }

  if (config.labThetaFc !== null) {
    if (
      !Number.isFinite(config.labThetaFc) ||
      config.labThetaFc < IRRIGATION_PHYSICAL_BOUNDS.thetaFc.min ||
      config.labThetaFc > IRRIGATION_PHYSICAL_BOUNDS.thetaFc.max
    ) {
      errors.push(`Laboratory field capacity θFC (${config.labThetaFc} m³/m³) outside valid mineral soil range [0.04..0.65].`);
    }
  }

  if (config.labThetaWp !== null) {
    if (
      !Number.isFinite(config.labThetaWp) ||
      config.labThetaWp < IRRIGATION_PHYSICAL_BOUNDS.thetaWp.min ||
      config.labThetaWp > IRRIGATION_PHYSICAL_BOUNDS.thetaWp.max
    ) {
      errors.push(`Laboratory wilting point θWP (${config.labThetaWp} m³/m³) outside valid mineral soil range [0.01..0.45].`);
    }
  }

  if (config.labThetaFc !== null && config.labThetaWp !== null && config.labThetaFc <= config.labThetaWp) {
    errors.push(`Invalid soil hydraulics: Field capacity θFC (${config.labThetaFc}) must exceed wilting point θWP (${config.labThetaWp}).`);
  }

  if (config.systemFlowRateLph !== null) {
    if (!Number.isFinite(config.systemFlowRateLph) || config.systemFlowRateLph <= 0) {
      errors.push(`System flow rate (${config.systemFlowRateLph} L/h) must be strictly positive when provided.`);
    }
  }

  // Deduplicate/validate logged irrigation events
  const seenEventKeys = new Set<string>();
  for (const ev of config.previousIrrigations || []) {
    if (!parseIsoDateUtc(ev.date)) {
      errors.push(`Invalid irrigation event date: ${ev.date}`);
      continue;
    }
    const futureDiff = diffDaysUtc(referenceDateUtc, ev.date);
    if (futureDiff !== null && futureDiff > 0) {
      warnings.push(`Logged historical irrigation on ${ev.date} is in the future relative to ${referenceDateUtc} and was excluded from historical depletion.`);
    }
    const dedupKey = `${ev.date}:${ev.netDepthMm ?? ''}:${ev.grossDepthMm ?? ''}:${ev.volumeM3 ?? ''}`;
    if (seenEventKeys.has(dedupKey)) {
      warnings.push(`Duplicate irrigation event detected on ${ev.date}; ensure duplicate entries are not double-counted.`);
    }
    seenEventKeys.add(dedupKey);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Resolves net irrigation depth (mm) for a farmer-logged irrigation event, preventing missing-as-zero errors.
 * Depth conversion: 1 mm over 1 ha = 10 m³  =>  depth(mm) = volume(m³) / (10 * Area(ha))
 */
export function resolveLoggedIrrigationNetMm(
  event: LoggedIrrigationEvent,
  efficiencyEa: number,
  fieldAreaHa: number | null
): number | null {
  if (typeof event.netDepthMm === 'number' && Number.isFinite(event.netDepthMm) && event.netDepthMm >= 0) {
    return Math.min(IRRIGATION_PHYSICAL_BOUNDS.irrigationDepthMm.max, event.netDepthMm);
  }
  if (typeof event.grossDepthMm === 'number' && Number.isFinite(event.grossDepthMm) && event.grossDepthMm >= 0) {
    return Math.min(IRRIGATION_PHYSICAL_BOUNDS.irrigationDepthMm.max, event.grossDepthMm * efficiencyEa);
  }
  if (
    typeof event.volumeM3 === 'number' &&
    Number.isFinite(event.volumeM3) &&
    event.volumeM3 >= 0 &&
    fieldAreaHa !== null &&
    fieldAreaHa > 0
  ) {
    const grossMm = event.volumeM3 / (10 * fieldAreaHa);
    return Math.min(IRRIGATION_PHYSICAL_BOUNDS.irrigationDepthMm.max, grossMm * efficiencyEa);
  }
  return null;
}

/**
 * Validates daily atmospheric pressure kPa safely.
 */
export function validateAtmosphericPressureKpa(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  const num = typeof raw === 'number' ? raw : Number(String(raw).trim());
  if (!Number.isFinite(num)) return null;
  if (num === -999 || num === -9999 || num === 9999) return null;
  if (num < IRRIGATION_PHYSICAL_BOUNDS.atmosphericPressureKpa.min || num > IRRIGATION_PHYSICAL_BOUNDS.atmosphericPressureKpa.max) {
    return null;
  }
  return num;
}

export function validateDailyMeteoField(
  val: unknown,
  type: 'temperature' | 'relative_humidity' | 'wind_speed' | 'solar_radiation' | 'precipitation'
): number | null {
  const res = validatePhysicalValue(val, type);
  return res.isValid ? res.sanitizedValue : null;
}
