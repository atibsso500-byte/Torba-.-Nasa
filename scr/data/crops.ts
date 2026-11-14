/**
 * TURBA Phase 3 — Moroccan-Relevant Crop & Soil Texture Scientific Reference Database
 *
 * Primary Scientific Source:
 * Allen, R.G., Pereira, L.S., Raes, D., & Smith, M. (1998).
 * "Crop evapotranspiration - Guidelines for computing crop water requirements."
 * FAO Irrigation and Drainage Paper No. 56, Rome.
 * - Kc values: FAO-56 Table 12 (Single crop coefficient)
 * - Growth stage lengths: FAO-56 Table 11 (Mediterranean / Semi-arid climate entries)
 * - Root depth (Zr) & depletion fraction (p): FAO-56 Table 22
 * - Soil hydraulic properties: FAO-56 Table 19 (typical texture estimates) & USDA-NRCS NEH-630
 *
 * Scientific Integrity Note:
 * Parameters sensitive to local Moroccan cultivar, tree spacing, or canopy cover (especially Olive and Citrus)
 * are explicitly flagged as `isProvisional: true` pending local ORMVA / farmer verification.
 */

import {
  CropDefinition,
  CropGrowthStage,
  GlobalRotationCropProfile,
  IrrigationMethodId,
  SoilTexturePreset,
} from '../types/irrigation';

export const MOROCCAN_CROP_DATABASE: CropDefinition[] = [
  {
    id: 'wheat',
    nameEn: 'Winter / Durum Wheat',
    nameAr: 'القمح (الطري والصلب)',
    nameFr: 'Blé (Tendre / Dur d\'hiver)',
    scientificName: 'Triticum aestivum / Triticum durum',
    isPerennial: false,
    coefficients: {
      kcIni: 0.30,
      kcMid: 1.15,
      kcEnd: 0.25,
      stageDays: {
        initial: 30,
        development: 140,
        midSeason: 40,
        lateSeason: 30,
      },
      rootDepthMinM: 0.25,
      rootDepthMaxM: 1.50,
      allowableDepletionP: 0.55,
    },
    sources: {
      kcReference: 'FAO-56 Table 12 (Winter Wheat, standard non-frozen soil Kc_ini=0.7 or 0.4; Mediterranean autumn sowing Kc_ini=0.30)',
      stageDurationReference: 'FAO-56 Table 11 (Winter Wheat, Mediterranean semi-arid ~240 days total)',
      rootDepthReference: 'FAO-56 Table 22 (Wheat: Zr_max = 1.5–1.8 m, conservative lower bound 1.5 m)',
      depletionFractionReference: 'FAO-56 Table 22 (Wheat: p = 0.55)',
    },
    isProvisional: false,
    climaticLimitationsEn: 'Assumes non-frozen winter soil; early-season Kc varies with wetting frequency from autumn rains.',
    climaticLimitationsAr: 'يفترض عدم تجمد التربة شتاءً؛ تتغير قيمة Kc الأولية حسب تواتر الأمطار الخريفية.',
    climaticLimitationsFr: 'Suppose un sol non gelé en hiver ; le Kc initial varie selon la fréquence des pluies d\'automne.',
  },
  {
    id: 'tomato',
    nameEn: 'Tomato (Field / Processing)',
    nameAr: 'الطماطم الحقلية',
    nameFr: 'Tomate (Plein champ)',
    scientificName: 'Solanum lycopersicum',
    isPerennial: false,
    coefficients: {
      kcIni: 0.60,
      kcMid: 1.15,
      kcEnd: 0.80,
      stageDays: {
        initial: 30,
        development: 40,
        midSeason: 45,
        lateSeason: 30,
      },
      rootDepthMinM: 0.25,
      rootDepthMaxM: 1.00,
      allowableDepletionP: 0.40,
    },
    sources: {
      kcReference: 'FAO-56 Table 12 (Tomatoes: Kc_ini=0.60, Kc_mid=1.15, Kc_end=0.70–0.90)',
      stageDurationReference: 'FAO-56 Table 11 (Tomato, Semi-arid Mediterranean 145 days)',
      rootDepthReference: 'FAO-56 Table 22 (Tomatoes: Zr_max = 0.7–1.5 m, standard 1.0 m)',
      depletionFractionReference: 'FAO-56 Table 22 (Tomatoes: p = 0.40)',
    },
    isProvisional: false,
    climaticLimitationsEn: 'Sensitive to water stress during flowering and fruit set; protected greenhouse tomato requires adjusted microclimate values.',
    climaticLimitationsAr: 'حساسة للإجهاد المائي أثناء الإزهار وعقد الثمار؛ زراعة البيوت المغطاة تتطلب تعديلاً مناخياً خاصاً.',
    climaticLimitationsFr: 'Sensible au stress hydrique lors de la floraison et nouaison ; la culture sous serre nécessite un ajustement microclimatique.',
  },
  {
    id: 'potato',
    nameEn: 'Potato',
    nameAr: 'البطاطس',
    nameFr: 'Pomme de terre',
    scientificName: 'Solanum tuberosum',
    isPerennial: false,
    coefficients: {
      kcIni: 0.50,
      kcMid: 1.15,
      kcEnd: 0.75,
      stageDays: {
        initial: 25,
        development: 30,
        midSeason: 45,
        lateSeason: 30,
      },
      rootDepthMinM: 0.20,
      rootDepthMaxM: 0.60,
      allowableDepletionP: 0.35,
    },
    sources: {
      kcReference: 'FAO-56 Table 12 (Potato: Kc_ini=0.50, Kc_mid=1.15, Kc_end=0.75 with vine senescence)',
      stageDurationReference: 'FAO-56 Table 11 (Potato, Semi-arid climate 130 days)',
      rootDepthReference: 'FAO-56 Table 22 (Potato: Zr_max = 0.4–0.6 m, shallow rooting)',
      depletionFractionReference: 'FAO-56 Table 22 (Potato: p = 0.35)',
    },
    isProvisional: false,
    climaticLimitationsEn: 'Shallow root system requires frequent light irrigations; highly sensitive to depletion > RAW during tuber bulking.',
    climaticLimitationsAr: 'جذورها سطحية وتتطلب ريات خفيفة ومتقاربة؛ حساسة جداً لتجاوز حد الاستنزاف المسموح أثناء تكوّن الدرنات.',
    climaticLimitationsFr: 'Système racinaire superficiel exigeant des apports fréquents ; très sensible au stress hydrique lors de la tubérisation.',
  },
  {
    id: 'olive',
    nameEn: 'Olive Orchard',
    nameAr: 'أشجار الزيتون',
    nameFr: 'Olivier',
    scientificName: 'Olea europaea',
    isPerennial: true,
    coefficients: {
      kcIni: 0.65,
      kcMid: 0.70,
      kcEnd: 0.65,
      stageDays: {
        initial: 30,
        development: 90,
        midSeason: 60,
        lateSeason: 90,
      },
      rootDepthMinM: 1.20,
      rootDepthMaxM: 1.70,
      allowableDepletionP: 0.65,
    },
    sources: {
      kcReference: 'FAO-56 Table 12 (Olives, 40–60% ground cover by canopy: 0.65 / 0.70 / 0.70; deficit/winter 0.65)',
      stageDurationReference: 'FAO-56 Table 12 footnote / Mediterranean dormancy-growth cycle (provisional unless orchard canopy % confirmed)',
      rootDepthReference: 'FAO-56 Table 22 (Olives: Zr = 1.2–1.7 m)',
      depletionFractionReference: 'FAO-56 Table 22 (Olives: p = 0.65)',
    },
    isProvisional: true,
    provisionalNoteEn: 'Provisional orchard parameters (assumes 40–60% canopy cover). Super-intensive vs traditional wide spacing changes effective Kc substantially.',
    provisionalNoteAr: 'معاملات استرشادية أولية (تفترض تغطية ظلية 40–60%). الكثافة الفائقة أو الغرس المتباعد يغيران قيمة Kc فعلياً.',
    provisionalNoteFr: 'Paramètres arboricoles provisoires (couvert 40–60 %). La densité de plantation (super-intensif vs traditionnel) modifie fortement le Kc.',
    climaticLimitationsEn: 'Evergreen Mediterranean tree; regulated deficit irrigation is often practiced after pit hardening depending on oil/table goal.',
    climaticLimitationsAr: 'شجرة دائمة الخضرة؛ قد يُطبق الري الناقص المنظم بعد تصلب النواة حسب هدف الإنتاج.',
    climaticLimitationsFr: 'Arbre persistant méditerranéen ; un déficit hydrique contrôlé est parfois pratiqué après le durcissement du noyau.',
  },
  {
    id: 'citrus',
    nameEn: 'Citrus Orchard (70% Canopy)',
    nameAr: 'الحوامض (تغطية 70%)',
    nameFr: 'Agrumes (Couvert 70 %)',
    scientificName: 'Citrus spp.',
    isPerennial: true,
    coefficients: {
      kcIni: 0.70,
      kcMid: 0.65,
      kcEnd: 0.70,
      stageDays: {
        initial: 60,
        development: 90,
        midSeason: 120,
        lateSeason: 95,
      },
      rootDepthMinM: 1.10,
      rootDepthMaxM: 1.50,
      allowableDepletionP: 0.50,
    },
    sources: {
      kcReference: 'FAO-56 Table 12 (Citrus, clean soil / no ground cover, 70% canopy: Kc_ini=0.70, Kc_mid=0.65, Kc_end=0.70)',
      stageDurationReference: 'FAO-56 Table 11 (Mediterranean evergreen citrus annual cycle)',
      rootDepthReference: 'FAO-56 Table 22 (Citrus: Zr = 1.1–1.5 m)',
      depletionFractionReference: 'FAO-56 Table 22 (Citrus: p = 0.50)',
    },
    isProvisional: true,
    provisionalNoteEn: 'Provisional orchard parameters assuming ~70% canopy cover and clean inter-row cultivation. Ground cover vegetation increases Kc.',
    provisionalNoteAr: 'معاملات أولية تفترض تغطية شجرية بنحو 70% وتربة نظيفة بين الصفوف؛ وجود أعشاب يرفع Kc.',
    provisionalNoteFr: 'Paramètres provisoires supposant ~70 % de couvert sans enherbement inter-rang ; un couvert végétal augmente le Kc.',
    climaticLimitationsEn: 'Lower Kc_mid reflects stomatal control in warm afternoons; sensitive to salinity and excessive hot-wind depletion.',
    climaticLimitationsAr: 'انخفاض Kc في منتصف الموسم يعكس التحكم الثغري؛ حساسة للملوحة والرياح الحارة الجافة (الشركي).',
    climaticLimitationsFr: 'Le Kc_mid plus bas reflète la régulation stomatique ; sensible à la salinité et aux vents chauds desséchants.',
  },
  {
    id: 'maize',
    nameEn: 'Maize (Grain / Silage)',
    nameAr: 'الذرة',
    nameFr: 'Maïs (Grain)',
    scientificName: 'Zea mays',
    isPerennial: false,
    coefficients: {
      kcIni: 0.30,
      kcMid: 1.20,
      kcEnd: 0.35,
      stageDays: {
        initial: 25,
        development: 40,
        midSeason: 45,
        lateSeason: 30,
      },
      rootDepthMinM: 0.25,
      rootDepthMaxM: 1.20,
      allowableDepletionP: 0.55,
    },
    sources: {
      kcReference: 'FAO-56 Table 12 (Maize field/grain: Kc_ini=0.30, Kc_mid=1.20, Kc_end=0.35)',
      stageDurationReference: 'FAO-56 Table 11 (Maize, Arid / Mediterranean spring-summer ~140 days)',
      rootDepthReference: 'FAO-56 Table 22 (Maize: Zr_max = 1.0–1.7 m, conservative 1.2 m)',
      depletionFractionReference: 'FAO-56 Table 22 (Maize: p = 0.55)',
    },
    isProvisional: false,
    climaticLimitationsEn: 'Peak sensitivity occurs at tasseling and silking; if harvested green for silage, late-season Kc does not drop to 0.35.',
    climaticLimitationsAr: 'ذروة الحساسية للإجهاد تكون عند الإزهار وتكوين الحبوب؛ الذرة العلفية (السيلاج) تحصد قبل جفاف الأوراق.',
    climaticLimitationsFr: 'Sensibilité maximale à la floraison/fécondation ; pour l\'ensilage vert, la récolte intervient avant la sénescence complète.',
  },
  {
    id: 'onion',
    nameEn: 'Onion (Dry Bulb)',
    nameAr: 'البصل (اليابس)',
    nameFr: 'Oignon (Sec)',
    scientificName: 'Allium cepa',
    isPerennial: false,
    coefficients: {
      kcIni: 0.70,
      kcMid: 1.05,
      kcEnd: 0.75,
      stageDays: {
        initial: 20,
        development: 35,
        midSeason: 110,
        lateSeason: 45,
      },
      rootDepthMinM: 0.15,
      rootDepthMaxM: 0.50,
      allowableDepletionP: 0.30,
    },
    sources: {
      kcReference: 'FAO-56 Table 12 (Onion dry: Kc_ini=0.70, Kc_mid=1.05, Kc_end=0.75)',
      stageDurationReference: 'FAO-56 Table 11 (Onion dry, Mediterranean ~210 days)',
      rootDepthReference: 'FAO-56 Table 22 (Onion: Zr_max = 0.3–0.6 m, typical 0.5 m)',
      depletionFractionReference: 'FAO-56 Table 22 (Onion: p = 0.30)',
    },
    isProvisional: false,
    climaticLimitationsEn: 'Very shallow root zone and low p=0.30 make frequent precision irrigation essential prior to bulb curing.',
    climaticLimitationsAr: 'مجموع جذري ضحل جداً ومعامل استنزاف منخفض (0.30) يتطلبان ريا دقيقاً ومتواتراً قبل مرحلة النضج.',
    climaticLimitationsFr: 'Enracinement très superficiel et faible seuil p=0,30 nécessitant des apports fréquents avant la maturation des bulbes.',
  },
];

export function getCropById(cropId: string): CropDefinition | null {
  return MOROCCAN_CROP_DATABASE.find((c) => c.id === cropId) || null;
}

/**
 * FAO-56 Table 19 — Typical Soil Water Characteristics for different soil types
 * Strictly identified as literature texture-class estimates (used only when laboratory measurements and SoilGrids are unavailable or farmer explicitly selects soil texture).
 */
export const SOIL_TEXTURE_PRESETS: SoilTexturePreset[] = [
  {
    id: 'sand',
    nameEn: 'Sand',
    nameAr: 'تربة رملية',
    nameFr: 'Sable',
    thetaFcTypical: 0.12, // midpoint of 0.07–0.17
    thetaWpTypical: 0.04, // midpoint of 0.02–0.07
    hydrologicGroup: 'A',
    curveNumberRowCrop: 67,
  },
  {
    id: 'loamy_sand',
    nameEn: 'Loamy Sand',
    nameAr: 'رملية طميية',
    nameFr: 'Sable limoneux',
    thetaFcTypical: 0.16,
    thetaWpTypical: 0.07,
    hydrologicGroup: 'A',
    curveNumberRowCrop: 70,
  },
  {
    id: 'sandy_loam',
    nameEn: 'Sandy Loam',
    nameAr: 'طميية رملية (رملية خصبة)',
    nameFr: 'Limon sableux',
    thetaFcTypical: 0.23,
    thetaWpTypical: 0.10,
    hydrologicGroup: 'B',
    curveNumberRowCrop: 75,
  },
  {
    id: 'loam',
    nameEn: 'Loam',
    nameAr: 'طميية متوازنة',
    nameFr: 'Limon',
    thetaFcTypical: 0.27,
    thetaWpTypical: 0.13,
    hydrologicGroup: 'B',
    curveNumberRowCrop: 78,
  },
  {
    id: 'silt_loam',
    nameEn: 'Silt Loam',
    nameAr: 'غرينية طميية',
    nameFr: 'Limon argileux léger / Silteux',
    thetaFcTypical: 0.30,
    thetaWpTypical: 0.15,
    hydrologicGroup: 'B',
    curveNumberRowCrop: 78,
  },
  {
    id: 'sandy_clay_loam',
    nameEn: 'Sandy Clay Loam',
    nameAr: 'طينية رملية طميية',
    nameFr: 'Limon argilo-sableux',
    thetaFcTypical: 0.28,
    thetaWpTypical: 0.16,
    hydrologicGroup: 'C',
    curveNumberRowCrop: 82,
  },
  {
    id: 'clay_loam',
    nameEn: 'Clay Loam',
    nameAr: 'طينية طميية (تيرس خفيف)',
    nameFr: 'Limon argileux',
    thetaFcTypical: 0.34,
    thetaWpTypical: 0.20,
    hydrologicGroup: 'C',
    curveNumberRowCrop: 85,
  },
  {
    id: 'silty_clay_loam',
    nameEn: 'Silty Clay Loam',
    nameAr: 'طينية غرينية طميية',
    nameFr: 'Limon argilo-silteux',
    thetaFcTypical: 0.35,
    thetaWpTypical: 0.21,
    hydrologicGroup: 'D',
    curveNumberRowCrop: 87,
  },
  {
    id: 'clay',
    nameEn: 'Clay (Vertisol / Tirs)',
    nameAr: 'تربة طينية ثقيلة (تيرس)',
    nameFr: 'Argile (Tirs)',
    thetaFcTypical: 0.39,
    thetaWpTypical: 0.25,
    hydrologicGroup: 'D',
    curveNumberRowCrop: 89,
  },
];

export function getTexturePresetById(id: string): SoilTexturePreset | null {
  return SOIL_TEXTURE_PRESETS.find((t) => t.id === id) || null;
}

export interface IrrigationMethodPreset {
  id: IrrigationMethodId;
  nameEn: string;
  nameAr: string;
  nameFr: string;
  typicalEfficiency: number; // decimal 0..1
  reference: string;
}

/**
 * Typical Irrigation Application Efficiencies (FAO / Brouwer et al., Irrigation Water Management Training Manual No. 4 & FAO-56)
 */
export const IRRIGATION_METHOD_PRESETS: IrrigationMethodPreset[] = [
  {
    id: 'drip',
    nameEn: 'Drip Irrigation (Localized)',
    nameAr: 'الري بالتنقيط (الموضعي)',
    nameFr: 'Goutte-à-goutte',
    typicalEfficiency: 0.90,
    reference: 'FAO Irrigation Manual / Howell (2003): Surface drip Ea ≈ 0.85–0.92',
  },
  {
    id: 'subsurface_drip',
    nameEn: 'Subsurface Drip (SDI)',
    nameAr: 'التنقيط تحت السطحي',
    nameFr: 'Goutte-à-goutte enterré',
    typicalEfficiency: 0.93,
    reference: 'Howell (2003): Subsurface drip Ea ≈ 0.90–0.95',
  },
  {
    id: 'micro_sprinkler',
    nameEn: 'Micro-sprinkler (Orchard)',
    nameAr: 'الرش الموضعي (الأشجار)',
    nameFr: 'Micro-aspersion',
    typicalEfficiency: 0.85,
    reference: 'FAO Irrigation Manual: Micro-sprinkler Ea ≈ 0.80–0.88',
  },
  {
    id: 'sprinkler',
    nameEn: 'Sprinkler / Pivot',
    nameAr: 'الري بالرش / المحوري',
    nameFr: 'Aspersion / Pivot',
    typicalEfficiency: 0.75,
    reference: 'FAO Irrigation Manual No. 4: Sprinkler Ea ≈ 0.75',
  },
  {
    id: 'surface_furrow',
    nameEn: 'Surface Furrow',
    nameAr: 'الري السطحي بالخطوط (السواقي)',
    nameFr: 'Gravitaire à la raie',
    typicalEfficiency: 0.60,
    reference: 'FAO Irrigation Manual No. 4: Surface furrow Ea ≈ 0.55–0.65',
  },
  {
    id: 'surface_basin',
    nameEn: 'Surface Basin (Robta)',
    nameAr: 'الري السطحي بالأحواض (الربطة)',
    nameFr: 'Gravitaire par calant / bassin',
    typicalEfficiency: 0.65,
    reference: 'FAO Irrigation Manual No. 4: Level basin Ea ≈ 0.60–0.70',
  },
  {
    id: 'custom',
    nameEn: 'Custom System Efficiency',
    nameAr: 'كفاءة مخصصة',
    nameFr: 'Efficience personnalisée',
    typicalEfficiency: 0.80,
    reference: 'Farmer-entered application efficiency Ea',
  },
];

/**
 * Resolves the crop growth stage and interpolates Kc(day) and Zr(day) according to FAO-56 Chapters 6 & 8.
 */
export function resolveCropStageForDay(
  crop: CropDefinition,
  daysAfterPlanting: number,
  stageOverride: CropGrowthStage | 'auto' = 'auto',
  customRootDepthM?: number | null
): {
  stage: CropGrowthStage;
  kc: number;
  rootDepthM: number;
} {
  const { kcIni, kcMid, kcEnd, stageDays, rootDepthMinM, rootDepthMaxM } = crop.coefficients;
  const L1 = stageDays.initial;
  const L2 = stageDays.development;
  const L3 = stageDays.midSeason;
  const L4 = stageDays.lateSeason;
  const totalCycle = L1 + L2 + L3 + L4;

  // For perennial crops, wrap day into 365-day annual cycle if plantingDate is old
  const effectiveDay = crop.isPerennial
    ? ((Math.floor(daysAfterPlanting) % totalCycle) + totalCycle) % totalCycle
    : Math.max(0, Math.floor(daysAfterPlanting));

  let autoStage: CropGrowthStage;
  let kc: number;
  let rootDepthM: number;

  if (effectiveDay < L1) {
    autoStage = 'initial';
    kc = kcIni;
    rootDepthM = rootDepthMinM;
  } else if (effectiveDay < L1 + L2) {
    autoStage = 'development';
    const frac = (effectiveDay - L1) / Math.max(1, L2);
    kc = kcIni + frac * (kcMid - kcIni);
    rootDepthM = rootDepthMinM + frac * (rootDepthMaxM - rootDepthMinM);
  } else if (effectiveDay < L1 + L2 + L3) {
    autoStage = 'mid_season';
    kc = kcMid;
    rootDepthM = rootDepthMaxM;
  } else if (effectiveDay <= totalCycle) {
    autoStage = 'late_season';
    const frac = (effectiveDay - (L1 + L2 + L3)) / Math.max(1, L4);
    kc = kcMid + frac * (kcEnd - kcMid);
    rootDepthM = rootDepthMaxM;
  } else {
    autoStage = 'late_season';
    kc = kcEnd;
    rootDepthM = rootDepthMaxM;
  }

  let finalStage = autoStage;
  if (stageOverride !== 'auto') {
    finalStage = stageOverride;
    switch (stageOverride) {
      case 'initial':
        kc = kcIni;
        rootDepthM = rootDepthMinM;
        break;
      case 'development':
        kc = (kcIni + kcMid) / 2;
        rootDepthM = (rootDepthMinM + rootDepthMaxM) / 2;
        break;
      case 'mid_season':
        kc = kcMid;
        rootDepthM = rootDepthMaxM;
        break;
      case 'late_season':
        kc = (kcMid + kcEnd) / 2;
        rootDepthM = rootDepthMaxM;
        break;
    }
  }

  if (typeof customRootDepthM === 'number' && Number.isFinite(customRootDepthM) && customRootDepthM > 0.05) {
    rootDepthM = Math.min(3.5, Math.max(0.1, customRootDepthM));
  }

  return {
    stage: finalStage,
    kc: Math.round(kc * 1000) / 1000,
    rootDepthM: Math.round(rootDepthM * 100) / 100,
  };
}

/**
 * Globally Reusable Crop Rotation & Soil Health Reference Database
 *
 * Distinct from MOROCCAN_CROP_DATABASE: preserves source-specific FAO-56 values,
 * cultivar/climate conditions, biological nitrogen fixation caveats, and disease-break intervals.
 * Parameters dependent on unmeasured local cultivars, markets, or field trials are marked unknown/null.
 */
export const GLOBAL_ROTATION_CROP_DATABASE: GlobalRotationCropProfile[] = [
  {
    id: 'wheat',
    scientificName: 'Triticum aestivum / Triticum durum',
    commonNameEn: 'Wheat (Winter / Spring)',
    commonNameAr: 'القمح (الشتوي / الربيعي)',
    commonNameFr: 'Blé (Tendre / Dur)',
    family: 'Poaceae',
    category: 'cereal',
    isPerennial: false,
    coefficients: {
      kcIni: 0.30,
      kcMid: 1.15,
      kcEnd: 0.25,
      stageDays: { initial: 30, development: 140, midSeason: 40, lateSeason: 30 },
      rootDepthMinM: 0.25,
      rootDepthMaxM: 1.50,
      allowableDepletionP: 0.55,
    },
    totalSeasonDaysRange: [120, 240],
    seasonalMeanKc: 0.72,
    kcConditionsNoteEn: 'FAO-56 Table 12/11 winter wheat (non-frozen soil ~240d, Kc_ini 0.30); spring-sown wheat cycles ~120–150d with Kc_end 0.25–0.40.',
    kcConditionsNoteAr: 'قيم الفاو 56 (الجدول 11/12) للقمح الشتوي (~240 يوماً بدون تجمد التربة)؛ القمح الربيعي يستغرق ~120-150 يوماً.',
    kcConditionsNoteFr: 'FAO-56 Tableau 11/12 blé d\'hiver (~240 j, sol non gelé) ; blé de printemps ~120–150 j.',
    rootCharacteristics: {
      depthClass: 'deep',
      rootType: 'fibrous',
      notesEn: 'Dense fibrous roots reaching 1.5–1.8 m in unrestricted soils; extracts residual subsoil moisture and nitrate effectively.',
      notesAr: 'جذور ليفية كثيفة تصل إلى 1.5–1.8م في التربة العميقة، فعالة في استخلاص الرطوبة والنترات المتبقية.',
      notesFr: 'Enracinement fasciculé dense jusqu\'à 1,5–1,8 m en sol profond, valorisant l\'eau et les nitrates résiduels.',
    },
    nitrogenFixation: {
      capable: false,
      estimatedRangeKgNPerHa: null,
      requiresInoculationCheck: false,
      benefitDependsOnResidueReturn: false,
      notesEn: 'Non-fixing cereal crop; leaves carbon-rich straw residue that ties up mineral N temporarily if incorporated without N source.',
      notesAr: 'محصول غير مثبت للنيتروجين؛ يترك قشاً غنياً بالكربون يتطلب إدارة ملائمة للمخلفات.',
      notesFr: 'Céréale non fixatrice d\'azote ; la paille riche en carbone immobilise temporairement l\'azote minéral lors de l\'enfouissement.',
      source: null,
    },
    rotationCompatibility: {
      goodPredecessors: ['Fabaceae', 'Solanaceae', 'Amaryllidaceae'],
      avoidSameFamilyConsecutive: true,
      minimumSameFamilyBreakYears: 1,
      sharedPathogensNoteEn: 'Continuous Poaceae rotations increase take-all (Gaeumannomyces graminis), Fusarium crown rot, and grass weed pressure.',
      sharedPathogensNoteAr: 'تكرار النجيليات يرفع خطر أعفان الجذور (Fusarium / take-all) والأعشاب النجيلية الضارة.',
      sharedPathogensNoteFr: 'La succession continue de Poacées favorise le piétin-échaudage, la fusariose et les graminées adventices.',
      breakReference: 'FAO Conservation Agriculture & CIMMYT Wheat Rotation Guidelines (minimum 1–2 non-cereal break seasons recommended)',
    },
    soilSuitability: {
      preferredTextureNotesEn: 'Adaptable from sandy loam to clay loam/vertisol with surface drainage.',
      preferredTextureNotesAr: 'يتأقلم من الطميية الرملية إلى الطينية بشرط الصرف الجيد.',
      preferredTextureNotesFr: 'Adaptable du limon sableux à l\'argile bien drainée.',
      heavyClayPenaltyThresholdPct: 60,
      coarseSandPenaltyThresholdPct: 85,
      waterloggingSensitive: false,
    },
    climateSuitability: {
      optimalMeanTempRangeC: [10, 24],
      frostSensitiveBelowC: -6,
      heatStressAboveC: 32,
      suitableSeasons: ['autumn_winter', 'spring', 'unspecified'],
      relativeWaterDemandClass: 'low_moderate',
    },
    socioEconomicProfile: {
      inputRequirement: 'low',
      stapleFoodValue: true,
      commercialMarketChannelDependent: false,
      forageAndResidueValue: {
        isDedicatedForage: false,
        hasUsefulCropResidue: true,
        notesEn: 'Dual-purpose staple grain and straw fodder/bedding residue for livestock.',
        notesAr: 'حبوب غذائية أساسية مع التبن كعلف أو فرشة للماشية.',
        notesFr: 'Culture vivrière de base fournissant grain et paille fourragère.',
      },
    },
    sources: {
      fao56KcAndStages: 'FAO Irrigation & Drainage Paper 56, Tables 11 & 12 (Wheat)',
      fao56RootAndDepletion: 'FAO-56 Table 22 (Wheat: Zr=1.5–1.8m, p=0.55)',
      rotationAndAgronomy: 'CIMMYT / FAO Cereal-Legume Rotation Guidelines',
    },
    unknownOrRegionDependentFields: ['Local cultivar yield', 'Regional market grain/straw price', 'Vernalization hour requirement'],
  },
  {
    id: 'barley',
    scientificName: 'Hordeum vulgare',
    commonNameEn: 'Barley (Grain / Dual-Purpose)',
    commonNameAr: 'الشعير (حبوب / علف)',
    commonNameFr: 'Orge (Grain / Fourrage)',
    family: 'Poaceae',
    category: 'cereal',
    isPerennial: false,
    coefficients: {
      kcIni: 0.30,
      kcMid: 1.15,
      kcEnd: 0.25,
      stageDays: { initial: 20, development: 35, midSeason: 45, lateSeason: 30 },
      rootDepthMinM: 0.25,
      rootDepthMaxM: 1.25,
      allowableDepletionP: 0.55,
    },
    totalSeasonDaysRange: [110, 160],
    seasonalMeanKc: 0.71,
    kcConditionsNoteEn: 'FAO-56 Table 12 Barley (Kc_ini=0.30, Kc_mid=1.15, Kc_end=0.25); shorter semi-arid maturity (~120–150d) reduces cumulative ETc vs winter wheat.',
    kcConditionsNoteAr: 'الفاو 56 للشعير (120-150 يوماً)، مما يجعله أكثر تحملاً للجفاف وقصر الموسم في المناطق شبه الجافة.',
    kcConditionsNoteFr: 'FAO-56 Orge (120–150 j), cycle plus court limitant l\'ETc cumulée en zone semi-aride.',
    rootCharacteristics: {
      depthClass: 'deep',
      rootType: 'fibrous',
      notesEn: 'Fast early fibrous root establishment (1.0–1.5 m FAO-56 Table 22); tolerates lower fertility and moderate salinity better than wheat.',
      notesAr: 'نمو جذري ليفي سريع التأسيس (1.0–1.5م)، يتحمل الملوحة المتوسطة وضعف الخصوبة أفضل من القمح.',
      notesFr: 'Installation racinaire rapide (1,0–1,5 m FAO-56 Tab. 22) ; tolère mieux la sécheresse et la salinité modérée.',
    },
    nitrogenFixation: {
      capable: false,
      estimatedRangeKgNPerHa: null,
      requiresInoculationCheck: false,
      benefitDependsOnResidueReturn: false,
      notesEn: 'Non-fixing cereal; competes strongly with weeds early in season.',
      notesAr: 'لا يثبت النيتروجين؛ ينافس الأعشاب مبكراً.',
      notesFr: 'Non fixateur d\'azote ; forte compétitivité précoce contre les adventices.',
      source: null,
    },
    rotationCompatibility: {
      goodPredecessors: ['Fabaceae', 'Solanaceae', 'Amaryllidaceae'],
      avoidSameFamilyConsecutive: true,
      minimumSameFamilyBreakYears: 1,
      sharedPathogensNoteEn: 'Shares cereal root rots (Cochliobolus, Fusarium) with wheat; avoid continuous barley-wheat monoculture.',
      sharedPathogensNoteAr: 'يشترك في أمراض الجذور مع القمح؛ يُنصح بكسر الدورة بمحصول بقولي أو غير نجيلي.',
      sharedPathogensNoteFr: 'Partage des pathogènes racinaires avec le blé ; éviter les successions céréale sur céréale.',
      breakReference: 'ICARDA Dryland Barley-Legume Rotation Guidelines',
    },
    soilSuitability: {
      preferredTextureNotesEn: 'Tolerates shallow, calcareous, and moderately coarse soils better than maize or vegetables.',
      preferredTextureNotesAr: 'يتحمل الترب الكلسية والخفيفة أفضل من الذرة والخضروات.',
      preferredTextureNotesFr: 'Tolère les sols calcaires et légers mieux que le maïs ou les maraîchages.',
      heavyClayPenaltyThresholdPct: 60,
      coarseSandPenaltyThresholdPct: 88,
      waterloggingSensitive: true,
    },
    climateSuitability: {
      optimalMeanTempRangeC: [9, 25],
      frostSensitiveBelowC: -5,
      heatStressAboveC: 34,
      suitableSeasons: ['autumn_winter', 'spring', 'unspecified'],
      relativeWaterDemandClass: 'low_moderate',
    },
    socioEconomicProfile: {
      inputRequirement: 'low',
      stapleFoodValue: true,
      commercialMarketChannelDependent: false,
      forageAndResidueValue: {
        isDedicatedForage: false,
        hasUsefulCropResidue: true,
        notesEn: 'High dual-purpose value for smallholder grain, green grazing, and straw.',
        notesAr: 'قيمة مزدوجة عالية كحبوب أو رعي أخضر أو تبن للمربين الصغار.',
        notesFr: 'Forte valeur mixte grain/paille et pâturage d\'appoint pour élevage intégré.',
      },
    },
    sources: {
      fao56KcAndStages: 'FAO-56 Tables 11 & 12 (Barley / Small Grains)',
      fao56RootAndDepletion: 'FAO-56 Table 22 (Barley: Zr=1.0–1.5m, p=0.55)',
      rotationAndAgronomy: 'ICARDA Mediterranean Semi-Arid Cereal-Legume Systems',
    },
    unknownOrRegionDependentFields: ['Local cultivar yield', 'Local market forage/grain price'],
  },
  {
    id: 'maize',
    scientificName: 'Zea mays',
    commonNameEn: 'Maize (Grain / Silage)',
    commonNameAr: 'الذرة (حبوب / سيلاج)',
    commonNameFr: 'Maïs (Grain / Ensilage)',
    family: 'Poaceae',
    category: 'cereal',
    isPerennial: false,
    coefficients: {
      kcIni: 0.30,
      kcMid: 1.20,
      kcEnd: 0.35,
      stageDays: { initial: 25, development: 40, midSeason: 45, lateSeason: 30 },
      rootDepthMinM: 0.25,
      rootDepthMaxM: 1.20,
      allowableDepletionP: 0.55,
    },
    totalSeasonDaysRange: [125, 160],
    seasonalMeanKc: 0.80,
    kcConditionsNoteEn: 'FAO-56 Table 12 Field Maize (Kc_mid=1.20; silage harvested green maintains higher late Kc ~1.05).',
    kcConditionsNoteAr: 'الفاو 56 للذرة الحقلية (Kc_mid=1.20)؛ ذرة السيلاج تحصد خضراء بمعامل متأخر أعلى (~1.05).',
    kcConditionsNoteFr: 'FAO-56 Maïs grain (Kc_mid=1,20) ; récolté en ensilage vert, le Kc final reste élevé (~1,05).',
    rootCharacteristics: {
      depthClass: 'deep',
      rootType: 'fibrous',
      notesEn: 'Deep fibrous root system (1.0–1.7 m) with high peak daily transpiration during warm summer seasons.',
      notesAr: 'جذور ليفية عميقة (1.0–1.7م) باحتياج مائي مرتفع صيفاً أثناء الإزهار.',
      notesFr: 'Enracinement fasciculé profond (1,0–1,7 m) à forte demande hydrique estivale.',
    },
    nitrogenFixation: {
      capable: false,
      estimatedRangeKgNPerHa: null,
      requiresInoculationCheck: false,
      benefitDependsOnResidueReturn: false,
      notesEn: 'Non-fixing high-N-demanding cereal; benefits from mineralized N only when preceded by well-managed legume/manure.',
      notesAr: 'محصول مستهلك للنيتروجين ولا يثبته؛ يستفيد من البقوليات السابقة فقط عند إدارة التسميد والمخلفات.',
      notesFr: 'Céréale exigeante en azote, ne fixant pas l\'azote atmosphérique.',
      source: null,
    },
    rotationCompatibility: {
      goodPredecessors: ['Fabaceae', 'Solanaceae', 'Amaryllidaceae'],
      avoidSameFamilyConsecutive: true,
      minimumSameFamilyBreakYears: 1,
      sharedPathogensNoteEn: 'Monoculture maize promotes corn rootworms, stalk borers, and Fusarium/Gibberella ear rots.',
      sharedPathogensNoteAr: 'تكرار الذرة يعزز ثاقبات الساق وأعفان الكيزان الفطرية.',
      sharedPathogensNoteFr: 'La monoculture de maïs favorise les foreurs, chrysomèles et fusarioses.',
      breakReference: 'FAO / USDA-SARE Crop Rotation on Organic & Conventional Farms (rotate with legumes/non-grass)',
    },
    soilSuitability: {
      preferredTextureNotesEn: 'Best on deep loamy/clay-loam soils with high AWC and good aeration.',
      preferredTextureNotesAr: 'يفضل الترب العميقة الخصبة جيدة التهوية والاحتفاظ بالماء.',
      preferredTextureNotesFr: 'Préfère les limons profonds bien aérés à bonne réserve utile.',
      heavyClayPenaltyThresholdPct: 50,
      coarseSandPenaltyThresholdPct: 75,
      waterloggingSensitive: true,
    },
    climateSuitability: {
      optimalMeanTempRangeC: [18, 30],
      frostSensitiveBelowC: 2,
      heatStressAboveC: 36,
      suitableSeasons: ['spring', 'summer', 'unspecified'],
      relativeWaterDemandClass: 'high',
    },
    socioEconomicProfile: {
      inputRequirement: 'moderate',
      stapleFoodValue: true,
      commercialMarketChannelDependent: false,
      forageAndResidueValue: {
        isDedicatedForage: false,
        hasUsefulCropResidue: true,
        notesEn: 'High biomass silage/stover value for mixed crop-livestock farms where water supports growth.',
        notesAr: 'كتلة حيوية وعلفية عالية (سيلاج أو سيقان) بشرط توفر الماء الكافي.',
        notesFr: 'Forte biomasse fourragère (ensilage/cannes) si la ressource en eau est assurée.',
      },
    },
    sources: {
      fao56KcAndStages: 'FAO-56 Tables 11 & 12 (Maize field/sweet)',
      fao56RootAndDepletion: 'FAO-56 Table 22 (Maize: Zr=1.0–1.7m, p=0.55)',
      rotationAndAgronomy: 'FAO Crop Rotation & Conservation Agriculture Guidelines',
    },
    unknownOrRegionDependentFields: ['Hybrid maturity group GDD', 'Regional grain/silage price'],
  },
  {
    id: 'dry_beans',
    scientificName: 'Phaseolus vulgaris',
    commonNameEn: 'Dry Beans / Common Bean',
    commonNameAr: 'الفاصوليا الجافة (اللوبيا)',
    commonNameFr: 'Haricot sec',
    family: 'Fabaceae',
    category: 'grain_legume',
    isPerennial: false,
    coefficients: {
      kcIni: 0.40,
      kcMid: 1.15,
      kcEnd: 0.35,
      stageDays: { initial: 20, development: 30, midSeason: 40, lateSeason: 20 },
      rootDepthMinM: 0.15,
      rootDepthMaxM: 0.70,
      allowableDepletionP: 0.45,
    },
    totalSeasonDaysRange: [95, 115],
    seasonalMeanKc: 0.74,
    kcConditionsNoteEn: 'FAO-56 Table 12 Beans (dry): Kc_ini=0.40, Kc_mid=1.15, Kc_end=0.35 over ~110 days (short cycle keeps seasonal water volume moderate).',
    kcConditionsNoteAr: 'الفاو 56 للفاصوليا الجافة (~110 أيام)؛ قصر الدورة يحد من الاستهلاك الموسمي الكلي.',
    kcConditionsNoteFr: 'FAO-56 Haricot sec (~110 j) : cycle court limitant la consommation saisonnière totale.',
    rootCharacteristics: {
      depthClass: 'moderate',
      rootType: 'taproot',
      notesEn: 'Moderate taproot (0.5–0.7 m FAO-56 Table 22); breaks cereal fibrous root pans when soil is non-compacted.',
      notesAr: 'جذر وتدي متوسط (0.5–0.7م)؛ يساعد في تنويع البنية الجذرية بعد الحبوب.',
      notesFr: 'Racine pivotante modérée (0,5–0,7 m FAO-56 Tab. 22) diversifiant l\'exploration après céréales.',
    },
    nitrogenFixation: {
      capable: true,
      estimatedRangeKgNPerHa: [20, 60],
      requiresInoculationCheck: true,
      benefitDependsOnResidueReturn: true,
      notesEn: 'Phaseolus vulgaris is a relatively modest N fixer compared to alfalfa/faba bean; net N credit to the next crop is small or near zero if whole plants/pods are exported and nodulation fails.',
      notesAr: 'تثبيت النيتروجين في الفاصوليا الجافة محدود نسبياً (20–60 كغ/هكتار)، ولا يترك فائضاً إذا أزيلت المخلفات أو غابت العقد البكتيرية.',
      notesFr: 'Fixation symbiotique modeste (20–60 kg N/ha) ; le reliquat azoté dépend de la nodulation et du retour des fanes au sol.',
      source: 'FAO-56 / Herridge et al. (2008) Plant and Soil 311:1–18 (Phaseolus vulgaris BNF)',
    },
    rotationCompatibility: {
      goodPredecessors: ['Poaceae', 'Amaryllidaceae'],
      avoidSameFamilyConsecutive: true,
      minimumSameFamilyBreakYears: 3,
      sharedPathogensNoteEn: 'Avoid back-to-back Fabaceae to prevent white mold (Sclerotinia), Fusarium root rot, and anthracnose buildup (3–4 yr break).',
      sharedPathogensNoteAr: 'تجنب تكرار البقوليات لتفادي العفن الأبيض وأعفان الجذور (فترة راحة 3 سنوات).',
      sharedPathogensNoteFr: 'Éviter Fabacées sur Fabacées pour limiter Sclerotinia et anthracnose (délai 3 ans).',
      breakReference: 'FAO / CIAT Dry Bean Disease Rotation Guidelines (3-year non-host break)',
    },
    soilSuitability: {
      preferredTextureNotesEn: 'Prefers well-drained loam to sandy loam; sensitive to soil crusting, salinity, and waterlogging.',
      preferredTextureNotesAr: 'يفضل الترب الطميية جيدة الصرف؛ حساس لتغدق المياه والملوحة.',
      preferredTextureNotesFr: 'Préfère les limons drainants ; sensible à l\'engorgement et à la salinité.',
      heavyClayPenaltyThresholdPct: 45,
      coarseSandPenaltyThresholdPct: 82,
      waterloggingSensitive: true,
    },
    climateSuitability: {
      optimalMeanTempRangeC: [16, 26],
      frostSensitiveBelowC: 3,
      heatStressAboveC: 33,
      suitableSeasons: ['spring', 'summer', 'unspecified'],
      relativeWaterDemandClass: 'moderate',
    },
    socioEconomicProfile: {
      inputRequirement: 'low',
      stapleFoodValue: true,
      commercialMarketChannelDependent: false,
      forageAndResidueValue: {
        isDedicatedForage: false,
        hasUsefulCropResidue: true,
        notesEn: 'Protein-rich staple grain; haulms can feed livestock or return organic N if incorporated.',
        notesAr: 'مصدر بروتيني غذائي مهم مع مخلفات نافعة للتربة أو العلف عند التدبير السليم.',
        notesFr: 'Légumineuse alimentaire riche en protéines ; fanes valorisables en fourrage ou résidus.',
      },
    },
    sources: {
      fao56KcAndStages: 'FAO-56 Tables 11 & 12 (Beans, dry)',
      fao56RootAndDepletion: 'FAO-56 Table 22 (Beans: Zr=0.5–0.7m, p=0.45)',
      rotationAndAgronomy: 'Herridge et al. (2008) & CIAT / FAO Pulses Rotation Guide',
    },
    unknownOrRegionDependentFields: ['Local soil rhizobia presence', 'Regional dry bean market price', 'Salinity EC threshold'],
  },
  {
    id: 'chickpea',
    scientificName: 'Cicer arietinum',
    commonNameEn: 'Chickpea (Rainfed Pulse)',
    commonNameAr: 'الحمص (بقولي بوري)',
    commonNameFr: 'Pois chiche',
    family: 'Fabaceae',
    category: 'grain_legume',
    isPerennial: false,
    coefficients: {
      kcIni: 0.40,
      kcMid: 1.00,
      kcEnd: 0.35,
      stageDays: { initial: 20, development: 30, midSeason: 40, lateSeason: 25 },
      rootDepthMinM: 0.20,
      rootDepthMaxM: 0.90,
      allowableDepletionP: 0.50,
    },
    totalSeasonDaysRange: [100, 140],
    seasonalMeanKc: 0.68,
    kcConditionsNoteEn: 'FAO-56 Table 12 Chickpea (Kc_ini=0.40, Kc_mid=1.00, Kc_end=0.35); adapted to residual moisture & semi-arid spring systems.',
    kcConditionsNoteAr: 'الفاو 56 للحمص (Kc_mid=1.00)؛ ملائم للزراعات البعلية والمناطق شبه الجافة.',
    kcConditionsNoteFr: 'FAO-56 Pois chiche (Kc_mid=1,00) ; adapté aux systèmes pluviaux semi-arides.',
    rootCharacteristics: {
      depthClass: 'moderate',
      rootType: 'taproot',
      notesEn: 'Deep-penetrating taproot (0.6–1.0 m FAO-56 Table 22) extracting subsoil moisture under low-rainfall conditions.',
      notesAr: 'جذر وتدي عميق نسبياً (0.6–1.0م) يستغل الرطوبة المخزنة في التربة البعلية.',
      notesFr: 'Pivot racinaire profond (0,6–1,0 m) exploitant l\'humidité résiduelle du sous-sol.',
    },
    nitrogenFixation: {
      capable: true,
      estimatedRangeKgNPerHa: [40, 100],
      requiresInoculationCheck: true,
      benefitDependsOnResidueReturn: true,
      notesEn: 'Fixes atmospheric N via Mesorhizobium ciceri when nodulated; residual benefit depends on avoiding total residue removal and adequate moisture.',
      notesAr: 'يثبت النيتروجين مع بكتيريا Mesorhizobium؛ يستلزم حفظ المخلفات ورطوبة كافية لتحقق الفائدة للزرع الموالي.',
      notesFr: 'Fixation symbiotique significative (40–100 kg N/ha) conditionnée par la nodulation et la gestion des résidus.',
      source: 'ICARDA / Herridge et al. (2008) Mediterranean Pulse Rotation Studies',
    },
    rotationCompatibility: {
      goodPredecessors: ['Poaceae'],
      avoidSameFamilyConsecutive: true,
      minimumSameFamilyBreakYears: 3,
      sharedPathogensNoteEn: 'Ascochyta blight and Fusarium wilt persist on stubble; keep >= 3-year interval between chickpea/legume crops.',
      sharedPathogensNoteAr: 'مرض اللفحة (Ascochyta) والذبول الفيوزاري يبقى في التربة؛ يلزم فاصل 3 سنوات.',
      sharedPathogensNoteFr: 'Ascochyta et fusariose persistent sur résidus ; respecter un délai d\'au moins 3 ans.',
      breakReference: 'ICARDA Ascochyta & Wilt Break Rotation Protocol (3–4 years)',
    },
    soilSuitability: {
      preferredTextureNotesEn: 'Well-drained loams and clay loams; intolerant of standing water.',
      preferredTextureNotesAr: 'ترب متوازنة إلى طينية جيدة الصرف؛ لا يتحمل الركود المائي.',
      preferredTextureNotesFr: 'Limons à argilo-limons drainants ; intolérant à l\'asphyxie racinaire.',
      heavyClayPenaltyThresholdPct: 50,
      coarseSandPenaltyThresholdPct: 85,
      waterloggingSensitive: true,
    },
    climateSuitability: {
      optimalMeanTempRangeC: [12, 26],
      frostSensitiveBelowC: -2,
      heatStressAboveC: 34,
      suitableSeasons: ['autumn_winter', 'spring', 'unspecified'],
      relativeWaterDemandClass: 'low_moderate',
    },
    socioEconomicProfile: {
      inputRequirement: 'low',
      stapleFoodValue: true,
      commercialMarketChannelDependent: false,
      forageAndResidueValue: {
        isDedicatedForage: false,
        hasUsefulCropResidue: true,
        notesEn: 'Low-input protein food crop suited to cereal-legume dryland rotations.',
        notesAr: 'محصول غذائي بقولي قليل المدخلات ملائم للدورة مع الحبوب البعلية.',
        notesFr: 'Légumineuse sobre en intrants adaptée aux rotations pluviales avec céréales.',
      },
    },
    sources: {
      fao56KcAndStages: 'FAO-56 Tables 11 & 12 (Chickpea / Pulses)',
      fao56RootAndDepletion: 'FAO-56 Table 22 (Chickpea: Zr=0.6–1.0m, p=0.50)',
      rotationAndAgronomy: 'ICARDA Cereal–Chickpea Rotation Studies',
    },
    unknownOrRegionDependentFields: ['Local Ascochyta pathotype risk', 'Regional pulse price'],
  },
  {
    id: 'alfalfa',
    scientificName: 'Medicago sativa',
    commonNameEn: 'Alfalfa / Lucerne (Forage)',
    commonNameAr: 'الفصة (البرسيم الحجازي)',
    commonNameFr: 'Luzerne',
    family: 'Fabaceae',
    category: 'forage_legume',
    isPerennial: true,
    coefficients: {
      kcIni: 0.40,
      kcMid: 1.20,
      kcEnd: 1.15,
      stageDays: { initial: 25, development: 35, midSeason: 150, lateSeason: 90 },
      rootDepthMinM: 0.30,
      rootDepthMaxM: 1.50,
      allowableDepletionP: 0.55,
    },
    totalSeasonDaysRange: [180, 330],
    seasonalMeanKc: 0.95,
    kcConditionsNoteEn: 'FAO-56 Table 12 Alfalfa Hay (averaged across cutting cycles: Kc_ini=0.40 after cutting, Kc_mid=1.20, Kc_end=1.15). Long active season results in high annual water demand.',
    kcConditionsNoteAr: 'الفاو 56 للفصة (متوسط دورات الحش: 0.40–1.20)؛ طول موسم النمو يجعل احتياجها السنوي للماء مرتفعاً.',
    kcConditionsNoteFr: 'FAO-56 Luzerne moyenne inter-coupes (Kc 0,40–1,20) ; forte consommation annuelle sur cycle long.',
    rootCharacteristics: {
      depthClass: 'deep',
      rootType: 'taproot',
      notesEn: 'Very deep taproot (1.0–2.0 m FAO-56 Table 22); improves deep macroporosity, subsoil structure, and perennial soil cover.',
      notesAr: 'جذر وتدي عميق جداً (1.0–2.0م) يحسن بنية الأعماق والغطاء الترابي الدائم.',
      notesFr: 'Pivot très profond (1,0–2,0 m FAO-56 Tab. 22) structurant les horizons profonds et protégeant le sol.',
    },
    nitrogenFixation: {
      capable: true,
      estimatedRangeKgNPerHa: [100, 250],
      requiresInoculationCheck: true,
      benefitDependsOnResidueReturn: true,
      notesEn: 'Strong BNF potential over established stands, but repeated green hay harvest removes large K and N; net soil N gain concentrates at stand termination/incorporation.',
      notesAr: 'تثبيت قوي للنيتروجين، لكن الحش المتكرر ونقل العلف يستنزف البوتاسيوم وجزءاً من النيتروجين ما لم تُعد البقايا والروث.',
      notesFr: 'Forte fixation (100–250 kg N/ha) mais l\'exportation des coupes prélève K et N ; l\'effet azoté maximal survient au retournement.',
      source: 'FAO-56 / Peoples et al. (2009) Symbiosis 48:1–17',
    },
    rotationCompatibility: {
      goodPredecessors: ['Poaceae', 'Solanaceae'],
      avoidSameFamilyConsecutive: true,
      minimumSameFamilyBreakYears: 2,
      sharedPathogensNoteEn: 'Autotoxicity and Verticillium/Phytophthora root rot make immediate alfalfa-after-alfalfa re-seeding risky (1–2+ year cereal break needed).',
      sharedPathogensNoteAr: 'التسمم الذاتي وأمراض الجذور تمنع إعادة زراعة الفصة مباشرة بعد الفصة (يلزم فاصل بالحبوب).',
      sharedPathogensNoteFr: 'L\'autotoxicité et Verticillium empêchent un resemis immédiat de luzerne sur luzerne.',
      breakReference: 'USDA/FAO Alfalfa Autotoxicity & Stand Rotation Standard (1–2 year non-alfalfa break)',
    },
    soilSuitability: {
      preferredTextureNotesEn: 'Needs deep, non-acidic, well-drained soils; sensitive to prolonged waterlogging.',
      preferredTextureNotesAr: 'تحتاج تربة عميقة غير حامضية وجيدة الصرف؛ تتضرر من غمر المياه.',
      preferredTextureNotesFr: 'Exige un sol profond, non acide et bien drainé ; sensible à l\'excès d\'eau.',
      heavyClayPenaltyThresholdPct: 55,
      coarseSandPenaltyThresholdPct: 80,
      waterloggingSensitive: true,
    },
    climateSuitability: {
      optimalMeanTempRangeC: [14, 28],
      frostSensitiveBelowC: -8,
      heatStressAboveC: 36,
      suitableSeasons: ['autumn_winter', 'spring', 'perennial_year_round', 'unspecified'],
      relativeWaterDemandClass: 'high',
    },
    socioEconomicProfile: {
      inputRequirement: 'moderate',
      stapleFoodValue: false,
      commercialMarketChannelDependent: false,
      forageAndResidueValue: {
        isDedicatedForage: true,
        hasUsefulCropResidue: true,
        notesEn: 'Premier forage crop for crop-livestock integration and organic matter building when irrigation water is sustainable.',
        notesAr: 'أفضل محصول علفي لدمج الزراعة وتربية الماشية وتحسين المادة العضوية عند توفر المياه.',
        notesFr: 'Fourrage de référence pour l\'intégration culture-élevage et la matière organique si l\'eau est disponible.',
      },
    },
    sources: {
      fao56KcAndStages: 'FAO-56 Tables 11 & 12 (Alfalfa Hay average cycles)',
      fao56RootAndDepletion: 'FAO-56 Table 22 (Alfalfa: Zr=1.0–2.0m, p=0.55)',
      rotationAndAgronomy: 'FAO Forage-Cereal Rotation & USDA Autotoxicity Guidelines',
    },
    unknownOrRegionDependentFields: ['Cutting frequency (cuts/year)', 'Stand longevity', 'Regional hay market price'],
  },
  {
    id: 'tomato',
    scientificName: 'Solanum lycopersicum',
    commonNameEn: 'Tomato (Open Field)',
    commonNameAr: 'الطماطم الحقلية',
    commonNameFr: 'Tomate (Plein champ)',
    family: 'Solanaceae',
    category: 'fruiting_vegetable',
    isPerennial: false,
    coefficients: {
      kcIni: 0.60,
      kcMid: 1.15,
      kcEnd: 0.80,
      stageDays: { initial: 30, development: 40, midSeason: 45, lateSeason: 30 },
      rootDepthMinM: 0.25,
      rootDepthMaxM: 1.00,
      allowableDepletionP: 0.40,
    },
    totalSeasonDaysRange: [130, 165],
    seasonalMeanKc: 0.90,
    kcConditionsNoteEn: 'FAO-56 Table 12 Tomato (Kc_ini=0.60, Kc_mid=1.15, Kc_end=0.80; open-field staked/processing conditions).',
    kcConditionsNoteAr: 'الفاو 56 للطماطم الحقلية (145 يوماً)؛ البيوت المحمية تتطلب تعديلاً مناخياً.',
    kcConditionsNoteFr: 'FAO-56 Tomate plein champ (~145 j) ; sous serre, le microclimat modifie l\'ETc.',
    rootCharacteristics: {
      depthClass: 'moderate',
      rootType: 'taproot',
      notesEn: 'Moderate branching taproot (0.7–1.5 m potential, typical 1.0 m); requires uniform moisture supply.',
      notesAr: 'جذر متوسط العمق (نحو 1.0م) يتطلب انتظاماً في الرطوبة.',
      notesFr: 'Enracinement moyen (~1,0 m) exigeant une alimentation hydrique régulière.',
    },
    nitrogenFixation: {
      capable: false,
      estimatedRangeKgNPerHa: null,
      requiresInoculationCheck: false,
      benefitDependsOnResidueReturn: false,
      notesEn: 'Heavy nutrient feeder; does not fix nitrogen and requires high external fertilization/management.',
      notesAr: 'محصول مستنزف للعناصر الغذائية ويحتاج مدخلات تسميد ووقاية عالية.',
      notesFr: 'Culture exigeante en fertilisation et protection phytosanitaire ; ne fixe pas d\'azote.',
      source: null,
    },
    rotationCompatibility: {
      goodPredecessors: ['Poaceae', 'Fabaceae', 'Amaryllidaceae'],
      avoidSameFamilyConsecutive: true,
      minimumSameFamilyBreakYears: 3,
      sharedPathogensNoteEn: 'CRITICAL: Never rotate consecutively with Potato or other Solanaceae (pepper, eggplant) due to shared Verticillium, Fusarium wilt, Phytophthora blight, and Meloidogyne root-knot nematodes (minimum 3–4 year break).',
      sharedPathogensNoteAr: 'تحذير حرج: لا تزرع الطماطم بعد البطاطس أو الباذنجانيات بسبب أمراض الذبول والندوة المتأخرة ونيماتودا الجذور (فاصل 3–4 سنوات).',
      sharedPathogensNoteFr: 'CRITIQUE : Éviter toute succession Solanacées (Tomate/Pomme de terre) face à Verticillium, Fusarium, mildiou et nématodes (délai 3–4 ans).',
      breakReference: 'FAO Horticultural IPM & Solanaceae Nematode/Wilt Rotation Standard (3–4 years)',
    },
    soilSuitability: {
      preferredTextureNotesEn: 'Fertile, well-drained loam/sandy-loam; sensitive to heavy compaction and poor aeration.',
      preferredTextureNotesAr: 'ترب خصبة جيدة الصرف والتهوية.',
      preferredTextureNotesFr: 'Limon fertile bien drainé et aéré.',
      heavyClayPenaltyThresholdPct: 45,
      coarseSandPenaltyThresholdPct: 80,
      waterloggingSensitive: true,
    },
    climateSuitability: {
      optimalMeanTempRangeC: [18, 28],
      frostSensitiveBelowC: 4,
      heatStressAboveC: 35,
      suitableSeasons: ['spring', 'summer', 'unspecified'],
      relativeWaterDemandClass: 'high',
    },
    socioEconomicProfile: {
      inputRequirement: 'high',
      stapleFoodValue: false,
      commercialMarketChannelDependent: true,
      forageAndResidueValue: {
        isDedicatedForage: false,
        hasUsefulCropResidue: false,
        notesEn: 'Solanaceous vines are not safe livestock forage (alkaloids) and diseased vines must not be composted back into Solanaceae ground.',
        notesAr: 'بقايا الباذنجانيات غير صالحة للرعي ولا يُنصح بإعادتها لنفس العائلة النباتية لتفادي نقل الأمراض.',
        notesFr: 'Résidus impropres au pâturage et vecteurs potentiels d\'inoculum phytopathogène.',
      },
    },
    sources: {
      fao56KcAndStages: 'FAO-56 Tables 11 & 12 (Tomatoes)',
      fao56RootAndDepletion: 'FAO-56 Table 22 (Tomatoes: Zr=0.7–1.5m, p=0.40)',
      rotationAndAgronomy: 'FAO Integrated Pest Management for Solanaceous Vegetables',
    },
    unknownOrRegionDependentFields: ['Local fresh/processing price', 'Greenhouse vs open-field infrastructure', 'Meloidogyne nematode load'],
  },
  {
    id: 'potato',
    scientificName: 'Solanum tuberosum',
    commonNameEn: 'Potato',
    commonNameAr: 'البطاطس',
    commonNameFr: 'Pomme de terre',
    family: 'Solanaceae',
    category: 'tuber_crop',
    isPerennial: false,
    coefficients: {
      kcIni: 0.50,
      kcMid: 1.15,
      kcEnd: 0.75,
      stageDays: { initial: 25, development: 30, midSeason: 45, lateSeason: 30 },
      rootDepthMinM: 0.20,
      rootDepthMaxM: 0.60,
      allowableDepletionP: 0.35,
    },
    totalSeasonDaysRange: [110, 145],
    seasonalMeanKc: 0.87,
    kcConditionsNoteEn: 'FAO-56 Table 12 Potato (Kc_ini=0.50, Kc_mid=1.15, Kc_end=0.75 with vine senescence).',
    kcConditionsNoteAr: 'الفاو 56 للبطاطس (~130 يوماً، حساسة جداً للإجهاد المائي أثناء تكوّن الدرنات).',
    kcConditionsNoteFr: 'FAO-56 Pomme de terre (~130 j) ; très sensible au stress hydrique lors de la tubérisation.',
    rootCharacteristics: {
      depthClass: 'shallow',
      rootType: 'fibrous',
      notesEn: 'Shallow sparse root system (0.4–0.6 m FAO-56 Table 22) leaves deeper moisture/nutrients untapped and needs frequent precision water.',
      notesAr: 'جذور سطحية ضحلة (0.4–0.6م)؛ لا تستغل أعماق التربة وتحتاج تربة مفككة وريات منتظمة.',
      notesFr: 'Système racinaire très superficiel (0,4–0,6 m) nécessitant un sol meuble et des apports fréquents.',
    },
    nitrogenFixation: {
      capable: false,
      estimatedRangeKgNPerHa: null,
      requiresInoculationCheck: false,
      benefitDependsOnResidueReturn: false,
      notesEn: 'Non-fixing, intensive tillage crop that can accelerate organic carbon oxidation if not followed by high-residue cover/cereal crops.',
      notesAr: 'محصول غير مثبت للنيتروجين؛ تتطلب زراعته حرثاً مكثفاً قد يسرّع فقدان المادة العضوية إن لم تعقبه محاصيل غطاء أو حبوب.',
      notesFr: 'Non fixatrice d\'azote ; le travail intensif du sol accélère la minéralisation du carbone organique.',
      source: null,
    },
    rotationCompatibility: {
      goodPredecessors: ['Poaceae', 'Fabaceae'],
      avoidSameFamilyConsecutive: true,
      minimumSameFamilyBreakYears: 3,
      sharedPathogensNoteEn: 'CRITICAL: Avoid consecutive Solanaceae (Tomato ↔ Potato) due to shared Verticillium wilt, Phytophthora infestans, Rhizoctonia, and cyst/root-knot nematodes (3–4 year break recommended).',
      sharedPathogensNoteAr: 'تحذير حرج: يمنع تعاقب البطاطس والطماطم لتشارك أمراض الذبول والندوة المتأخرة والنيماتودا (فاصل 3–4 سنوات).',
      sharedPathogensNoteFr: 'CRITIQUE : Éviter toute rotation directe Pomme de terre ↔ Tomate (Verticillium, mildiou, nématodes ; délai 3–4 ans).',
      breakReference: 'FAO / CIP Potato Crop Rotation Guidelines (minimum 3–4 years between Solanaceae)',
    },
    soilSuitability: {
      preferredTextureNotesEn: 'Friable sandy loam to loam; heavy clay impairs tuber expansion, promotes scab/rot, and complicates harvest.',
      preferredTextureNotesAr: 'ترب رملية طميية مفككة؛ الطين الثقيل يعيق نمو الدرنات ويزيد تعفنها.',
      preferredTextureNotesFr: 'Limon sableux meuble ; les argiles lourdes gênent la tubérisation et favorisent les pourritures.',
      heavyClayPenaltyThresholdPct: 35,
      coarseSandPenaltyThresholdPct: 82,
      waterloggingSensitive: true,
    },
    climateSuitability: {
      optimalMeanTempRangeC: [14, 23],
      frostSensitiveBelowC: 1,
      heatStressAboveC: 30,
      suitableSeasons: ['autumn_winter', 'spring', 'unspecified'],
      relativeWaterDemandClass: 'high',
    },
    socioEconomicProfile: {
      inputRequirement: 'high',
      stapleFoodValue: true,
      commercialMarketChannelDependent: true,
      forageAndResidueValue: {
        isDedicatedForage: false,
        hasUsefulCropResidue: false,
        notesEn: 'Tuber crop with high seed-tuber and input investment requirements; foliage is toxic to livestock.',
        notesAr: 'يتطلب استثماراً مرتفعاً في البذور والمبيدات؛ الأوراق غير صالحة كعلف.',
        notesFr: 'Coût élevé en plants certifiés et intrants ; fanes impropres au fourrage.',
      },
    },
    sources: {
      fao56KcAndStages: 'FAO-56 Tables 11 & 12 (Potato)',
      fao56RootAndDepletion: 'FAO-56 Table 22 (Potato: Zr=0.4–0.6m, p=0.35)',
      rotationAndAgronomy: 'FAO / International Potato Center (CIP) Rotation Best Practices',
    },
    unknownOrRegionDependentFields: ['Certified seed-tuber cost', 'Local cold-storage market price', 'Soil cyst nematode status'],
  },
  {
    id: 'onion',
    scientificName: 'Allium cepa',
    commonNameEn: 'Onion (Dry Bulb)',
    commonNameAr: 'البصل (اليابس)',
    commonNameFr: 'Oignon (Sec)',
    family: 'Amaryllidaceae',
    category: 'bulb_vegetable',
    isPerennial: false,
    coefficients: {
      kcIni: 0.70,
      kcMid: 1.05,
      kcEnd: 0.75,
      stageDays: { initial: 20, development: 35, midSeason: 110, lateSeason: 45 },
      rootDepthMinM: 0.15,
      rootDepthMaxM: 0.50,
      allowableDepletionP: 0.30,
    },
    totalSeasonDaysRange: [150, 210],
    seasonalMeanKc: 0.92,
    kcConditionsNoteEn: 'FAO-56 Table 12 Onion (dry): Kc_ini=0.70, Kc_mid=1.05, Kc_end=0.75 over 150–210d; shallow roots and low p=0.30 require steady irrigation.',
    kcConditionsNoteAr: 'الفاو 56 للبصل اليابس (150-210 يوماً)؛ جذوره سطحية جداً ومعامل الاستنزاف منخفض (0.30).',
    kcConditionsNoteFr: 'FAO-56 Oignon sec (150–210 j) ; enracinement très superficiel et seuil p=0,30 exigeant.',
    rootCharacteristics: {
      depthClass: 'shallow',
      rootType: 'fibrous',
      notesEn: 'Very shallow fibrous root zone (0.3–0.6 m, typical 0.5 m); poor competitor with weeds.',
      notesAr: 'مجموع جذري ضحل جداً (0.3–0.6م) وضعيف المنافسة مع الأعشاب الضارة.',
      notesFr: 'Racines très superficielles (0,3–0,6 m), faible compétitivité contre les adventices.',
    },
    nitrogenFixation: {
      capable: false,
      estimatedRangeKgNPerHa: null,
      requiresInoculationCheck: false,
      benefitDependsOnResidueReturn: false,
      notesEn: 'Non-fixing shallow-rooted crop; low soil cover offers minimal erosion protection.',
      notesAr: 'لا يثبت النيتروجين وتغطيته للتربة محدودة ضد التعرية.',
      notesFr: 'Non fixateur d\'azote ; faible couverture du sol contre l\'érosion.',
      source: null,
    },
    rotationCompatibility: {
      goodPredecessors: ['Poaceae', 'Fabaceae'],
      avoidSameFamilyConsecutive: true,
      minimumSameFamilyBreakYears: 4,
      sharedPathogensNoteEn: 'Avoid back-to-back Allium crops (onion, garlic, leek) due to long-lived white rot (Sclerotium cepivorum) and pink root (4+ year break).',
      sharedPathogensNoteAr: 'تجنب تكرار الثوميات (البصل/الثوم) بسبب العفن الأبيض طويل البقاء في التربة (فاصل >= 4 سنوات).',
      sharedPathogensNoteFr: 'Éviter Allium sur Allium face à la pourriture blanche (Sclerotium cepivorum, délai >= 4 ans).',
      breakReference: 'FAO Allium Soilborne Disease Management (4–5 year rotation interval)',
    },
    soilSuitability: {
      preferredTextureNotesEn: 'Loose loam/sandy loam free of surface crusting; heavy clay deforms bulbs and traps moisture.',
      preferredTextureNotesAr: 'ترب طميية مفككة خالية من القشرة السطحية؛ الطين الثقيل يشوه الأبصال.',
      preferredTextureNotesFr: 'Limon léger sans battance ; les argiles lourdes déforment les bulbes.',
      heavyClayPenaltyThresholdPct: 38,
      coarseSandPenaltyThresholdPct: 80,
      waterloggingSensitive: true,
    },
    climateSuitability: {
      optimalMeanTempRangeC: [13, 25],
      frostSensitiveBelowC: -2,
      heatStressAboveC: 33,
      suitableSeasons: ['autumn_winter', 'spring', 'unspecified'],
      relativeWaterDemandClass: 'high',
    },
    socioEconomicProfile: {
      inputRequirement: 'moderate',
      stapleFoodValue: false,
      commercialMarketChannelDependent: true,
      forageAndResidueValue: {
        isDedicatedForage: false,
        hasUsefulCropResidue: false,
        notesEn: 'High-value bulb crop with low crop residue contribution and strong hand-weeding/irrigation needs.',
        notesAr: 'محصول تسويقي مرتفع القيمة لكنه قليل المخلفات ويتطلب مكافحة أعشاب ورياً دقيقاً.',
        notesFr: 'Culture maraîchère commerciale à faible restitution de résidus et fort besoin en désherbage/eau.',
      },
    },
    sources: {
      fao56KcAndStages: 'FAO-56 Tables 11 & 12 (Onion, dry)',
      fao56RootAndDepletion: 'FAO-56 Table 22 (Onion: Zr=0.3–0.6m, p=0.30)',
      rotationAndAgronomy: 'FAO / AVRDC Allium Integrated Crop & Disease Rotation Guide',
    },
    unknownOrRegionDependentFields: ['Photoperiod bulbing group (short/intermediate/long day)', 'Curing/storage losses', 'Regional bulb price'],
  },
  {
    id: 'olive',
    scientificName: 'Olea europaea',
    commonNameEn: 'Olive (Perennial Orchard)',
    commonNameAr: 'الزيتون (غرس شجري معمر)',
    commonNameFr: 'Olivier (Vergers pérennes)',
    family: 'Oleaceae',
    category: 'perennial_tree',
    isPerennial: true,
    coefficients: {
      kcIni: 0.65,
      kcMid: 0.70,
      kcEnd: 0.65,
      stageDays: { initial: 30, development: 90, midSeason: 60, lateSeason: 90 },
      rootDepthMinM: 1.20,
      rootDepthMaxM: 1.70,
      allowableDepletionP: 0.65,
    },
    totalSeasonDaysRange: [270, 365],
    seasonalMeanKc: 0.68,
    kcConditionsNoteEn: 'FAO-56 Table 12 Olives (40–60% canopy cover): Kc 0.65–0.70. Perennial tree crop, NOT an annual seasonal rotation substitute.',
    kcConditionsNoteAr: 'الفاو 56 للزيتون (تغطية 40–60%): محصول شجري معمر وليس دورة سنوية متعاقبة.',
    kcConditionsNoteFr: 'FAO-56 Olivier (couvert 40–60 %) : culture arboricole pérenne, non comparable à une rotation annuelle.',
    rootCharacteristics: {
      depthClass: 'deep',
      rootType: 'woody_perennial',
      notesEn: 'Deep woody root system (1.2–1.7 m+) highly tolerant of periodic Mediterranean drought once established.',
      notesAr: 'جذور خشبية عميقة (1.2–1.7م+) مقاومة للجفاف المتوسطي بعد التأسيس.',
      notesFr: 'Système racinaire ligneux profond (1,2–1,7 m+) résistant aux déficits hydriques modérés après installation.',
    },
    nitrogenFixation: {
      capable: false,
      estimatedRangeKgNPerHa: null,
      requiresInoculationCheck: false,
      benefitDependsOnResidueReturn: false,
      notesEn: 'Non-fixing perennial; inter-row cover crops (legume/barley) improve orchard SOC and infiltration when water permits.',
      notesAr: 'شجرة غير مثبتة للنيتروجين؛ تغطية ما بين الصفوف بالبقوليات أو الشعير تحسن المادة العضوية عند توفر أمطار كافية.',
      notesFr: 'Ne fixe pas l\'azote ; l\'enherbement ou les engrais verts inter-rangs améliorent le carbone organique si l\'eau le permet.',
      source: null,
    },
    rotationCompatibility: {
      goodPredecessors: ['Poaceae', 'Fabaceae'],
      avoidSameFamilyConsecutive: true,
      minimumSameFamilyBreakYears: 5,
      sharedPathogensNoteEn: 'Perennial orchard: avoid planting olives on ground recently cropped with Verticillium-susceptible Solanaceae (tomato/potato) without pathogen clearing.',
      sharedPathogensNoteAr: 'تحذير بستاني: تجنب غرس الزيتون مباشرة بعد الطماطم أو البطاطس المصابة بالذبول الفيرتيسيلي (Verticillium).',
      sharedPathogensNoteFr: 'Verger pérenne : éviter d\'implanter l\'olivier juste après Solanacées sensibles à Verticillium dahliae.',
      breakReference: 'International Olive Council (IOC) Verticillium Site Selection Guidelines',
    },
    soilSuitability: {
      preferredTextureNotesEn: 'Adaptable to calcareous, stony, and medium-textured soils provided root zone drains freely.',
      preferredTextureNotesAr: 'يتأقلم مع الترب الكلسية والحصوية بشرط عدم ركود الماء في الجذور.',
      preferredTextureNotesFr: 'Tolère les sols calcaires et caillouteux bien drainés.',
      heavyClayPenaltyThresholdPct: 55,
      coarseSandPenaltyThresholdPct: 88,
      waterloggingSensitive: true,
    },
    climateSuitability: {
      optimalMeanTempRangeC: [12, 26],
      frostSensitiveBelowC: -7,
      heatStressAboveC: 38,
      suitableSeasons: ['perennial_year_round'],
      relativeWaterDemandClass: 'low_moderate',
    },
    socioEconomicProfile: {
      inputRequirement: 'high',
      stapleFoodValue: false,
      commercialMarketChannelDependent: true,
      forageAndResidueValue: {
        isDedicatedForage: false,
        hasUsefulCropResidue: true,
        notesEn: 'Multi-year capital establishment; pruning leaves/twigs can be chipped for mulch or seasonal browse.',
        notesAr: 'استثمار طويل الأمد لتأسيس البستان؛ مخلفات التقليم تفيد كغطاء عضوي (Mulch) للتربة.',
        notesFr: 'Investissement pluriannuel lourd ; le broyat de taille valorise l\'humus du verger.',
      },
    },
    sources: {
      fao56KcAndStages: 'FAO-56 Table 12 (Olives, 40–60% ground cover)',
      fao56RootAndDepletion: 'FAO-56 Table 22 (Olives: Zr=1.2–1.7m, p=0.65)',
      rotationAndAgronomy: 'International Olive Council (IOC) / FAO Orchard Soil Management',
    },
    unknownOrRegionDependentFields: ['Orchard tree density & canopy cover %', 'Multi-year establishment capital cost', 'Soil Verticillium dahliae inoculum'],
  },
  {
    id: 'citrus',
    scientificName: 'Citrus spp.',
    commonNameEn: 'Citrus (Perennial Orchard)',
    commonNameAr: 'الحوامض (غرس شجري معمر)',
    commonNameFr: 'Agrumes (Vergers pérennes)',
    family: 'Rutaceae',
    category: 'perennial_tree',
    isPerennial: true,
    coefficients: {
      kcIni: 0.70,
      kcMid: 0.65,
      kcEnd: 0.70,
      stageDays: { initial: 60, development: 90, midSeason: 120, lateSeason: 95 },
      rootDepthMinM: 1.10,
      rootDepthMaxM: 1.50,
      allowableDepletionP: 0.50,
    },
    totalSeasonDaysRange: [300, 365],
    seasonalMeanKc: 0.68,
    kcConditionsNoteEn: 'FAO-56 Table 12 Citrus (70% canopy, clean inter-row): Kc ~0.65–0.70 year-round evergreen transpiration across 365 days requires substantial annual water.',
    kcConditionsNoteAr: 'الفاو 56 للحوامض (تغطية 70%): شجرة دائمة الخضرة تتطلب مياهاً مستمرة طوال السنة.',
    kcConditionsNoteFr: 'FAO-56 Agrumes (couvert 70 %) : feuillage persistant nécessitant un apport hydrique annuel élevé.',
    rootCharacteristics: {
      depthClass: 'deep',
      rootType: 'woody_perennial',
      notesEn: 'Deep evergreen root profile (1.1–1.5 m) with high sensitivity to salinity and poor drainage.',
      notesAr: 'جذور معمرة (1.1–1.5م) حساسة للملوحة والاختناق الجذري.',
      notesFr: 'Racines pérennes (1,1–1,5 m) sensibles à la salinité et à l\'asphyxie.',
    },
    nitrogenFixation: {
      capable: false,
      estimatedRangeKgNPerHa: null,
      requiresInoculationCheck: false,
      benefitDependsOnResidueReturn: false,
      notesEn: 'Non-fixing perennial tree crop requiring multi-year fertigation and orchard capital.',
      notesAr: 'شجرة غير مثبتة للنيتروجين وتحتاج استثماراً رأسمالياً ورياً موضعياً منتظماً.',
      notesFr: 'Culture pérenne non fixatrice nécessitant fertigation et investissement pluriannuel.',
      source: null,
    },
    rotationCompatibility: {
      goodPredecessors: ['Poaceae', 'Fabaceae'],
      avoidSameFamilyConsecutive: true,
      minimumSameFamilyBreakYears: 5,
      sharedPathogensNoteEn: 'Avoid replanting citrus immediately on old citrus land (replant disorder / Phytophthora / Tylenchulus nematodes).',
      sharedPathogensNoteAr: 'تجنب إعادة غرس الحوامض مكان بساتين حوامض قديمة لتفادي أمراض الإعادة والنيماتودا.',
      sharedPathogensNoteFr: 'Éviter la replantation immédiate d\'agrumes sur vieux verger (fatigue du sol / Phytophthora).',
      breakReference: 'FAO Citrus Replant & Nematode Sanitation Guidelines',
    },
    soilSuitability: {
      preferredTextureNotesEn: 'Deep well-drained sandy loam to loam; avoid heavy clay, high CaCO3 chlorosis risk, and saline water.',
      preferredTextureNotesAr: 'تربة عميقة خفيفة إلى متوازنة جيدة الصرف؛ تجنب الطين الثقيل والملوحة.',
      preferredTextureNotesFr: 'Sol profond léger à limoneux bien drainé ; sensible à la salinité et au calcaire actif.',
      heavyClayPenaltyThresholdPct: 40,
      coarseSandPenaltyThresholdPct: 85,
      waterloggingSensitive: true,
    },
    climateSuitability: {
      optimalMeanTempRangeC: [15, 29],
      frostSensitiveBelowC: -2,
      heatStressAboveC: 37,
      suitableSeasons: ['perennial_year_round'],
      relativeWaterDemandClass: 'high',
    },
    socioEconomicProfile: {
      inputRequirement: 'high',
      stapleFoodValue: false,
      commercialMarketChannelDependent: true,
      forageAndResidueValue: {
        isDedicatedForage: false,
        hasUsefulCropResidue: false,
        notesEn: 'High-capital perennial orchard crop unsuited to short-term annual rotation.',
        notesAr: 'استثمار شجري مرتفع التكلفة وغير مخصص للتناوب الموسمي السنوي.',
        notesFr: 'Verger à fort capital inadapté aux rotations saisonnières annuelles.',
      },
    },
    sources: {
      fao56KcAndStages: 'FAO-56 Tables 11 & 12 (Citrus, 70% canopy)',
      fao56RootAndDepletion: 'FAO-56 Table 22 (Citrus: Zr=1.1–1.5m, p=0.50)',
      rotationAndAgronomy: 'FAO Citrus Orchard & Irrigation Management Guidelines',
    },
    unknownOrRegionDependentFields: ['Rootstock salinity/lime tolerance', 'Irrigation water EC', 'Export/local market pricing'],
  },
];

export function getGlobalRotationCropById(cropId: string): GlobalRotationCropProfile | null {
  return GLOBAL_ROTATION_CROP_DATABASE.find((c) => c.id === cropId) || null;
}

