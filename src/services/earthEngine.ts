/**
 * Google Earth Engine (GEE) & ESA WorldCereal Integration Service
 * Official Earth Engine Collection: ESA/WorldCereal/2021/MODELS/v100
 * Secondary: Digital Earth Africa Cropland Extent 2019
 */

export interface EarthEngineConfigStatus {
  collectionId: string;
  spatialResolution: string;
  serviceAccountConfigured: boolean;
  privateKeyConfigured: boolean;
  projectIdConfigured: boolean;
  status: 'IMPLEMENTED AND TESTED WITH REAL DATA' | 'NOT CONFIGURED';
  missingItems: string[];
  bandsAvailable: Array<{
    id: string;
    description: string;
    product: string;
  }>;
}

export function checkEarthEngineStatus(): EarthEngineConfigStatus {
  // Security & Data Integrity Rule:
  // Never expose or check private service account keys in frontend client bundles.
  // GEE raster computations require authenticated backend server-side orchestration.
  // Until an authenticated server proxy is deployed, status is honestly reported as NOT CONFIGURED.

  return {
    collectionId: 'ESA/WorldCereal/2021/MODELS/v100',
    spatialResolution: '10 metres (Sentinel-1 / Sentinel-2 composite)',
    serviceAccountConfigured: false,
    privateKeyConfigured: false,
    projectIdConfigured: false,
    status: 'NOT CONFIGURED',
    missingItems: [
      'EE_SERVICE_ACCOUNT (Compte de service GCP habilité pour Earth Engine)',
      'EE_PRIVATE_KEY (Clé privée conservée strictement côté serveur)',
      'EE_PROJECT_ID (ID de projet Google Cloud avec API Earth Engine activée)',
    ],
    bandsAvailable: [
      {
        id: 'temporarycrops',
        description: 'Classification binaire des cultures temporaires (Cultures annuelles récoltées)',
        product: 'WorldCereal 2021 v100',
      },
      {
        id: 'temporarycrops_confidence',
        description: 'Score de confiance de la classification (0 à 100%)',
        product: 'WorldCereal 2021 v100',
      },
      {
        id: 'cereals_winter',
        description: 'Céréales d\'hiver (Blé tendre, Blé dur, Orge)',
        product: 'WorldCereal 2021 Season 1',
      },
      {
        id: 'maize',
        description: 'Identification des parcelles de maïs pluvial et irrigué',
        product: 'WorldCereal 2021 Season 2',
      },
      {
        id: 'irrigation_mask',
        description: 'Probabilité et détection active de l\'irrigation agricole',
        product: 'WorldCereal 2021 Active Irrigation',
      },
    ],
  };
}
