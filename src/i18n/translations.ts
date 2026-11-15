/**
 * TURBA (تُربة) – Multilingual Translation System
 * Comprehensive localizations for Arabic (ar), English (en), and French (fr).
 * Strict Integrity Rule: Missing data text is strictly preserved as:
 * - ar: "البيانات غير متاحة حالياً"
 * - en: "Data currently unavailable"
 * - fr: "Données actuellement indisponibles"
 */

export type Language = 'ar' | 'en' | 'fr';

export interface Translations {
  common: {
    appName: string;
    appTagline: string;
    realDataBadge: string;
    auditButton: string;
    auditButtonTooltip: string;
    parcelsButton: string;
    close: string;
    cancel: string;
    save: string;
    delete: string;
    refresh: string;
    loading: string;
    hectares: string;
    sqMeters: string;
    syncTime: string;
    waiting: string;
    dataUnavailable: string;
    notAvailable: string;
    verified: string;
    historical: string;
    notConfigured: string;
    unavailable: string;
    fresh: string;
    delayed: string;
    stale: string;
    dataProvenance: string;
  };
  header: {
    title: string;
    subtitle: string;
    realMorocco: string;
  };
  map: {
    satellite: string;
    roadmap: string;
    worldCerealLayer: string;
    worldCerealTooltip: string;
    deAfricaLayer: string;
    deAfricaTooltip: string;
    selectBasinPlaceholder: string;
    basinsLabel: string;
    myGpsPosition: string;
    locatingGps: string;
    gpsAcquiredReal: string;
    gpsAccuracy: string;
    gpsStandardAccuracy: string;
    gpsDeviceNote: string;
    gpsErrorUnsupported: string;
    gpsErrorDenied: string;
    gpsErrorUnavailable: string;
    gpsErrorTimeout: string;
    gpsErrorGeneric: string;
    drawParcel: string;
    drawingActive: string;
    verticesCount: string;
    geodesicArea: string;
    drawingHintStart: string;
    drawingHintClose: string;
    undoLastPoint: string;
    saveParcelButton: string;
    inspectedPoint: string;
    moroccoOverview: string;
    agriculturalPerimeter: string;
    pointMarkerTitle: string;
    gpsMarkerTitle: string;
  };
  dashboard: {
    emptyPromptTitle: string;
    emptyPromptDesc: string;
    connectingServers: string;
    tabWeather: string;
    tabSoil: string;
    tabRainfall: string;
    tabVegetation: string;
    tabIrrigation: string;
    tabLandMemory: string;
    sourceTraceability: string;
    // Weather
    weatherHeader: string;
    currentObservationTitle: string;
    instantaneousSubtitle: string;
    dailyMeanTitle: string;
    apparentTemp: string;
    airTemperature: string;
    relativeHumidity: string;
    relativeHumiditySub: string;
    windSpeed: string;
    windSpeedSub: string;
    solarRadiation: string;
    solarRadiationSub: string;
    thermalHistoryTitle: string;
    lastOverpass: string;
    daysAgo20: string;
    daysAgo10: string;
    nasaTraceabilityTitle: string;
    sourceLabel: string;
    obsDateUtc: string;
    resolutionLabel: string;
    typeLabel: string;
    nasaDelayNotice: string;
    // Soil
    soilHeader: string;
    era5SoilTitle: string;
    era5Layer0_7: string;
    era5Layer7_28: string;
    era5Layer28_100: string;
    era5Layer100_255: string;
    era5SourceNote: string;
    rootZoneMoisture: string;
    rootZoneIndexLabel: string;
    rootZoneSub: string;
    surfaceMoisture: string;
    surfaceMoistureIndexLabel: string;
    surfaceMoistureSub: string;
    volumetricMoisture: string;
    volumetricMoistureLayer: string;
    droughtIndicatorTitle: string;
    droughtSevere: string;
    droughtModerate: string;
    droughtMild: string;
    droughtNormal: string;
    droughtSurplus: string;
    smapResolutionNoticeTitle: string;
    smapResolutionNoticeDesc: string;
    // Rainfall
    rainfallHeader: string;
    dailyRainfall: string;
    obsFrom: string;
    monthlyAccumulation: string;
    climatologicalNorm: string;
    anomalyComparisonTitle: string;
    climatology30Year: string;
    // Vegetation
    vegetationHeader: string;
    satelliteOverpassTitle: string;
    cdseCatalog: string;
    overpassDateUtc: string;
    cloudCoverage: string;
    granuleId: string;
    ndviSpectralTitle: string;
    ndviRuleNotice: string;
    recentOverpassesTitle: string;
    tileLabel: string;
    cloudsLabel: string;
    // Traceability Modal & Data Provenance
    traceabilityModalTitle: string;
    provenanceModalTitle: string;
    inspectProvenanceButton: string;
    provenanceVarName: string;
    provenanceSource: string;
    provenanceRawValue: string;
    provenanceOriginalUnit: string;
    provenanceTransformation: string;
    provenanceFreshness: string;
    provenanceSpatial: string;
    provenanceTemporal: string;
    provenanceEndpoint: string;
    provenanceStatus: string;
    provenanceNotes: string;
    testLocationsTitle: string;
    moroccoTest: string;
    swedenTest: string;
    iranTest: string;
    brazilTest: string;
    argentinaTest: string;
    saudiTest: string;
    quickTestNotice: string;
    nasaPowerSourceDesc: string;
    nasaSmapSourceDesc: string;
    nasaGpmSourceDesc: string;
    sentinel2SourceDesc: string;
  };
  drawer: {
    myParcelsTitle: string;
    registeredParcelsCount: string;
    addManualCoordinate: string;
    hideManualEntry: string;
    manualEntryTitle: string;
    manualEntryDesc: string;
    latitude: string;
    longitude: string;
    parcelOrCadastreName: string;
    locateAndInspect: string;
    exportGeoJson: string;
    emptyParcelsTitle: string;
    emptyParcelsDesc: string;
    deleteConfirm: string;
    viewOnMap: string;
  };
  profileModal: {
    modalTitle: string;
    modalSubtitle: string;
    geodesicAreaSummary: string;
    centroidCoordinates: string;
    identificationMethod: string;
    polygonDrawn: string;
    mapPoint: string;
    manualCoords: string;
    parcelName: string;
    parcelNamePlaceholder: string;
    region: string;
    province: string;
    cadastralRef: string;
    cadastralRefPlaceholder: string;
    notes: string;
    notesPlaceholder: string;
    classificationSummary: string;
    sourceLabel: string;
    confidenceLabel: string;
    resolutionLabel: string;
    saveFarmButton: string;
  };
  systemStatus: {
    modalTitle: string;
    modalSubtitle: string;
    colFeature: string;
    colStatus: string;
    colSpatialRes: string;
    colTemporalRes: string;
    colAuth: string;
    colNotes: string;
    legendTitle: string;
    statusImplementedAndTested: string;
    statusNotConfigured: string;
    statusFailed: string;
    closeAudit: string;
  };
  quota: {
    quotaReached: string;
    ownerNotice: string;
    developerSiteLink: string;
    closeBanner: string;
  };
  irrigation: {
    engineTitle: string;
    engineSubtitle: string;
    expandWorkspace: string;
    collapseWorkspace: string;
    cropSelectionTitle: string;
    selectCropPlaceholder: string;
    plantingDateLabel: string;
    growthStageLabel: string;
    stageAuto: string;
    stageInitial: string;
    stageDevelopment: string;
    stageMidSeason: string;
    stageLateSeason: string;
    fieldAreaLabel: string;
    fieldAreaPlaceholder: string;
    soilSourceLabel: string;
    soilAutoSoilgrids: string;
    soilLabOption: string;
    soilTextureOption: string;
    soilTextureSelectLabel: string;
    labThetaFcLabel: string;
    labThetaWpLabel: string;
    irrigationMethodLabel: string;
    efficiencyLabel: string;
    targetDepletionLabel: string;
    flowRateLabel: string;
    flowRatePlaceholder: string;
    logIrrigationTitle: string;
    addEventButton: string;
    dateLabel: string;
    netDepthLabel: string;
    statusNoImmediate: string;
    statusApproaching: string;
    statusRequired: string;
    statusInsufficient: string;
    confidenceLabel: string;
    confHigh: string;
    confMedium: string;
    confLow: string;
    confInsufficient: string;
    et0Label: string;
    etcLabel: string;
    depletionLabel: string;
    tawRawLabel: string;
    netDepthCardLabel: string;
    grossDepthCardLabel: string;
    volumeCardLabel: string;
    durationCardLabel: string;
    areaRequiredForVolume: string;
    forecastWindowTitle: string;
    nextRawDateLabel: string;
    recommendedWindowLabel: string;
    rainDelayNotice: string;
    noRawInHorizon: string;
    chartTitle: string;
    observedLabel: string;
    forecastLabel: string;
    explanationTitle: string;
    confidenceFactorsTitle: string;
    provenanceTableTitle: string;
    originMeasured: string;
    originAssimilated: string;
    originForecast: string;
    originSpatialEstimate: string;
    originFaoEstimated: string;
    originUserProvided: string;
    loadingWeatherAndSoil: string;
  };
  rotationAdvisor: {
    sectionContextTitle: string;
    sectionAdvisorTitle: string;
    sectionAdvisorSubtitle: string;
    currentCropNote: string;
    previousCropLabel: string;
    previousCropNone: string;
    residueLabel: string;
    residueIncorporated: string;
    residueRemoved: string;
    residueGrazed: string;
    residueUnknown: string;
    financialCapacityLabel: string;
    finUnspecified: string;
    finLowInput: string;
    finModerate: string;
    finHighInvestment: string;
    primaryGoalLabel: string;
    goalUnspecified: string;
    goalFoodSecurity: string;
    goalCommercialProfit: string;
    goalSoilRegeneration: string;
    goalWaterConservation: string;
    waterCapacityLabel: string;
    waterUnspecified: string;
    waterRainfed: string;
    waterLimited: string;
    waterModern: string;
    culturalPracticeLabel: string;
    cultureUnspecified: string;
    cultureTraditional: string;
    cultureDiversification: string;
    cultureMixedLivestock: string;
    advancedLocalToggle: string;
    countryRegionLabel: string;
    countryRegionPlaceholder: string;
    seasonLabel: string;
    seasonUnspecified: string;
    seasonAutumnWinter: string;
    seasonSpring: string;
    seasonSummer: string;
    seasonPerennial: string;
    familiarCropsLabel: string;
    locallyAvailableLabel: string;
    livestockIntegrationLabel: string;
    livestockAuto: string;
    livestockYes: string;
    livestockNo: string;
    provisionalHistoryBadge: string;
    preliminaryClimateBadge: string;
    statusSuitable: string;
    statusConditionallySuitable: string;
    statusInsufficientData: string;
    statusNoEligible: string;
    compatibilityIndexLabel: string;
    compatibilityDisclaimer: string;
    whyRecommendedLabel: string;
    soilHealthHeader: string;
    waterClimateHeader: string;
    socioEconomicHeader: string;
    cautionsHeader: string;
    missingInfoHeader: string;
    referencesHeader: string;
    excludedCropsToggle: string;
    evidenceDistinctionToggle: string;
    measuredLabel: string;
    calculatedLabel: string;
    assumptionsLabel: string;
    selectCropForRotationHint: string;
  };
  transitionBridge: {
    sectionTitle: string;
    sectionSubtitle: string;
    hemisphereLabel: string;
    hemisphereNorthern: string;
    hemisphereSouthern: string;
    hemisphereEquatorial: string;
    badgePlansReady: string;
    badgeInsufficientData: string;
    badgeNoFeasible: string;
    badgeInvalidSequence: string;
    sectionATitle: string;
    currentSequenceLabel: string;
    addCropPlaceholder: string;
    addToSequenceBtn: string;
    seedFromConfigBtn: string;
    emptySequenceHint: string;
    repeatedFamiliesLabel: string;
    diseaseRisksLabel: string;
    nutrientWeaknessesLabel: string;
    waterConcentrationLabel: string;
    rootRepetitionYes: string;
    rootRepetitionNo: string;
    missingDiversityLabel: string;
    opportunitiesLabel: string;
    soilConditionLabel: string;
    sectionBTitle: string;
    stageCurrentSystem: string;
    stageTransition: string;
    stageTargetSystem: string;
    seasonPrefix: string;
    changeRetained: string;
    changeMinorAdjustment: string;
    changeNewIntroduction: string;
    difficultyLabel: string;
    diffLow: string;
    diffModerate: string;
    diffHigh: string;
    waterClassLabel: string;
    waterLowMod: string;
    waterModerate: string;
    waterHigh: string;
    estEtcLabel: string;
    reasonSelectedLabel: string;
    soilConsiderationLabel: string;
    nitrogenNoteLabel: string;
    mainBenefitLabel: string;
    risksLimitsLabel: string;
    farmerActionsLabel: string;
    sectionCTitle: string;
    pathwayRecommended: string;
    pathwayConservative: string;
    pathwayAlternative: string;
    selectedBadge: string;
    selectPathwayBtn: string;
    changesCountLabel: string;
    planningScoreLabel: string;
    planningScoreDisclaimer: string;
    advantagesLabel: string;
    limitationsLabel: string;
    tradeOffLabel: string;
    criteriaBreakdownToggle: string;
    critAgronomic: string;
    critSoil: string;
    critWater: string;
    critEconomic: string;
    critMinimality: string;
    critFarmerPref: string;
    critSeasonal: string;
    weightShort: string;
    sectionDTitle: string;
    qaWhyChange: string;
    qaWhatPreserved: string;
    qaRisksReduced: string;
    qaIfRejected: string;
    qaAssumptions: string;
    dimDiversity: string;
    dimSoilHealth: string;
    dimWaterFit: string;
    dimEconomicFit: string;
    dimSeasonalFit: string;
    evalSuitable: string;
    evalCaution: string;
    evalInsufficientData: string;
    cumulativeTitle: string;
    cumQuantified: string;
    cumQualitative: string;
    cumUnverified: string;
    dataSourcesTitle: string;
    catMeasuredRetrieved: string;
    catModelEstimate: string;
    catCalculated: string;
    catUserProvided: string;
    catMissing: string;
    assumptionsTitle: string;
    sectionETitle: string;
    horizonLabel: string;
    seasons3: string;
    seasons4: string;
    maxCostTierLabel: string;
    costAuto: string;
    costLow: string;
    costModerate: string;
    costHigh: string;
    irrigationQuotaLabel: string;
    irrigationQuotaPlaceholder: string;
    unfamiliarCropsLabel: string;
    unfamiliarAuto: string;
    unfamiliarYes: string;
    unfamiliarNo: string;
    soilObservationLabel: string;
    soilObservationPlaceholder: string;
    perCropDecisionsLabel: string;
    decisionAccept: string;
    decisionReject: string;
    decisionUnavailable: string;
    decisionClear: string;
    resetDecisionsBtn: string;
    recalculateBtn: string;
    sectionFTitle: string;
    openReportBtn: string;
    exportJsonBtn: string;
    reportModalTitle: string;
    reportModalSubtitle: string;
    printReportBtn: string;
    reportParcelSummary: string;
    reportConfidenceLimitations: string;
    blockingReasonsTitle: string;
    confidenceReasonsTitle: string;
    waterConcLowMod: string;
    waterConcModerate: string;
    waterConcHigh: string;
    waterConcMixed: string;
    waterConcUnknown: string;
    strategyATag: string;
    baselineTimelineTitle: string;
    baselineMissingTitle: string;
    familyBreakLabel: string;
    sameFamilyRepeatLabel: string;
    rootDepthShort: string;
    resilienceFocusLabel: string;
    focusAuto: string;
    focusWaterConservation: string;
    focusSoilStructure: string;
    focusNutrientCycling: string;
    focusForageProduction: string;
    focusFinancialAccessibility: string;
    focusClimateResilience: string;
    residueHandlingLabel: string;
    primaryObjectiveLabel: string;
    explain8Title: string;
    exWhyGenerated: string;
    exPrioritiesAddressed: string;
    exEnvDrivers: string;
    exExpectedBenefits: string;
    exRisksTradeoffs: string;
    exFarmerActions: string;
    exSourcesLimits: string;
    exMissingConfidence: string;
  };
  landMemory: {
    title: string;
    subtitle: string;
    storageDisclosure: string;
    navOverview: string;
    navTimeline: string;
    navPredictionReality: string;
    navLandFutures: string;
    navAddSeason: string;
    navEvidenceDetails: string;
    addSeasonBtn: string;
    editSeasonBtn: string;
    exportBackupBtn: string;
    importBackupBtn: string;
    importSuccess: string;
    importError: string;
    fieldSummaryTitle: string;
    fieldIdLabel: string;
    precisionLabel: string;
    boundaryStatusDrawn: string;
    boundaryStatusPointOnly: string;
    areaLabel: string;
    areaUnknown: string;
    seasonsRecordedCount: string;
    snapshotsRecordedCount: string;
    outcomesRecordedCount: string;
    missingHistoryCount: string;
    noBoundaryWarning: string;
    recentHighlightsTitle: string;
    emptySeasonsTitle: string;
    emptySeasonsDesc: string;
    emptySnapshotsNotice: string;
    originFarmerReport: string;
    originImportedRecord: string;
    originVerifiedMeasurement: string;
    originCalculated: string;
    originSpatialEstimate: string;
    originSystemAnalysis: string;
    qualityVerified: string;
    qualityFarmerReported: string;
    qualityEstimated: string;
    qualityCalculated: string;
    qualityMissing: string;
    qualityOutdated: string;
    timelineFilterAll: string;
    timelineFilterSeasons: string;
    timelineFilterRecommendations: string;
    timelineFilterOutcomes: string;
    timelineFilterGaps: string;
    timelineMissingDataTag: string;
    createdAtLabel: string;
    updatedAtLabel: string;
    editHistoryLabel: string;
    seasonFormTitleAdd: string;
    seasonFormTitleEdit: string;
    cropCatalogLabel: string;
    customCropOption: string;
    cropNameLabel: string;
    cropFamilyLabel: string;
    seasonStartLabel: string;
    seasonEndLabel: string;
    plantingDateLabel: string;
    harvestDateLabel: string;
    previousCropLabel: string;
    irrigationMethodLabel: string;
    irrigationAmountMmLabel: string;
    irrigationAmountHint: string;
    fertilizerLabel: string;
    practicesLabel: string;
    evidenceRefsLabel: string;
    notesLabel: string;
    editNoteLabel: string;
    saveSeasonBtn: string;
    predictionRealityTitle: string;
    predictionRealitySubtitle: string;
    recStatusLabel: string;
    statusProposed: string;
    statusAccepted: string;
    statusRejected: string;
    statusModified: string;
    statusNotRecorded: string;
    reportOutcomeBtn: string;
    editOutcomeBtn: string;
    actualCropLabel: string;
    actualPlantingDateLabel: string;
    actualHarvestDateLabel: string;
    actualIrrAmountLabel: string;
    actualIrrUnitLabel: string;
    observedConditionLabel: string;
    condGood: string;
    condModerateStress: string;
    condSevereStress: string;
    condFailed: string;
    condNotReported: string;
    yieldValueLabel: string;
    yieldUnitLabel: string;
    waterShortageLabel: string;
    yesLabel: string;
    noLabel: string;
    unknownLabel: string;
    pestObservationsLabel: string;
    recordedRainMmLabel: string;
    recordedRainSourceLabel: string;
    postSeasonSocLabel: string;
    postSeasonSocHint: string;
    farmerAssessmentLabel: string;
    saveOutcomeBtn: string;
    expectedCol: string;
    actualCol: string;
    deltaCol: string;
    comparableBadge: string;
    incompatibleBadge: string;
    awaitingOutcomeBadge: string;
    futuresTitle: string;
    futuresSubtitle: string;
    deterministicNoticeTitle: string;
    rememberedSequenceLabel: string;
    familyConflictsLabel: string;
    waterShortagesLoggedLabel: string;
    recDeltaTitle: string;
    triggersTitle: string;
    blockingMissingTitle: string;
    hardConstraintsTitle: string;
    rankingPreferencesTitle: string;
    verificationConditionsTitle: string;
    pathATitle: string;
    pathBTitle: string;
    pathCTitle: string;
    evidenceDetailsTitle: string;
    evidenceDetailsSubtitle: string;
    chartHistoryTitle: string;
    chartNoSeriesNotice: string;
    colSourceProvider: string;
    colVariable: string;
    colValueUnit: string;
    colRefDate: string;
    colRetrievalTime: string;
    colResolution: string;
    colOriginQuality: string;
    colLimitations: string;
  };
}

export const translations: Record<Language, Translations> = {
  ar: {
    common: {
      appName: 'تُربة',
      appTagline: 'منصة الاستخبارات الزراعية بالمغرب',
      realDataBadge: 'الزراعة المغربية • بيانات حقيقية',
      auditButton: 'تدقيق البيانات الحقيقية',
      auditButtonTooltip: 'فحص اتصال تدفقات وكالة ناسا، وكالة الفضاء الأوروبية، وخرائط جوجل',
      parcelsButton: 'قطعي الأرضية',
      close: 'إغلاق',
      cancel: 'إلغاء',
      save: 'حفظ',
      delete: 'حذف',
      refresh: 'تحديث',
      loading: 'جاري التحميل...',
      hectares: 'هكتار',
      sqMeters: 'م²',
      syncTime: 'المزامنة:',
      waiting: 'في الانتظار',
      dataUnavailable: 'البيانات غير متاحة حالياً',
      notAvailable: 'غير متوفر',
      verified: 'تم التحقق',
      historical: 'تاريخي',
      notConfigured: 'غير مهيأ',
      unavailable: 'البيانات غير متاحة حالياً',
      fresh: 'بيانات حديثة وموثوقة',
      delayed: 'بيانات متأخرة مقبولة',
      stale: 'بيانات قديمة',
      dataProvenance: 'سجل تتبع مصدر البيانات',
    },
    header: {
      title: 'تُربة',
      subtitle: 'المنصة الذكية للزراعة المغربية',
      realMorocco: 'الزراعة المغربية • بيانات حقيقية',
    },
    map: {
      satellite: 'قمر صناعي',
      roadmap: 'خريطة',
      worldCerealLayer: 'ESA WorldCereal 2021 (10م)',
      worldCerealTooltip: 'إظهار/إخفاء طبقة المحاصيل الزراعية ESA WorldCereal بدقة 10 أمتار',
      deAfricaLayer: 'DE Africa 2019',
      deAfricaTooltip: 'إظهار الطبقة المرجعية التاريخية لـ Digital Earth Africa 2019',
      selectBasinPlaceholder: 'اختر حوضاً زراعياً مغربياً...',
      basinsLabel: 'الأحواض:',
      myGpsPosition: 'موقعي الجغرافي GPS',
      locatingGps: 'جاري تحديد الموقع...',
      gpsAcquiredReal: 'موقع GPS حقيقي',
      gpsAccuracy: 'الدقة:',
      gpsStandardAccuracy: 'عادية',
      gpsDeviceNote: 'موقع الجهاز الحالي (لا يمثل تلقائياً حدود قطعة أرضية).',
      gpsErrorUnsupported: 'خاصية تحديد الموقع الجغرافي غير مدعومة في متصفحك.',
      gpsErrorDenied: 'تم رفض إذن الوصول إلى الموقع الجغرافي من قِبل المستخدم.',
      gpsErrorUnavailable: 'إشارة GPS غير متاحة حالياً.',
      gpsErrorTimeout: 'انتهت مهلة انتظار إشارة GPS.',
      gpsErrorGeneric: 'تعذر الوصول إلى موقع GPS.',
      drawParcel: 'رسم حدود قطعتي',
      drawingActive: 'وضع الرسم نشط',
      verticesCount: 'نقطة',
      geodesicArea: 'المساحة الجيوديسية الحقيقية:',
      drawingHintStart: 'انقر على الخريطة لتحديد رؤوس القطعة الأرضية بدقة.',
      drawingHintClose: 'اكتملت حدود القطعة. يمكنك الحفظ أو التعديل.',
      undoLastPoint: 'تراجع عن آخر نقطة',
      saveParcelButton: 'حفظ القطعة الأرضية',
      inspectedPoint: 'نقطة المعاينة',
      moroccoOverview: 'المغرب الزراعي',
      agriculturalPerimeter: 'محيط زراعي بالمغرب',
      pointMarkerTitle: 'النقطة المحددة',
      gpsMarkerTitle: 'موقعك الجغرافي الفعلي',
    },
    dashboard: {
      emptyPromptTitle: 'اختر منطقة أو قطعة زراعية في المغرب',
      emptyPromptDesc:
        'انقر على الخريطة، أو حدد موقعك عبر GPS، أو ارسم المضلع الجغرافي الدقيق لقطعتك لاسترجاع البيانات البيئية الحقيقية من أقمار ناسا وسنتينل-2 بدون أي محاكاة.',
      connectingServers: 'جاري الاتصال المباشر بالخوادم العلمية لناسا وكوبرنيكوس...',
      tabWeather: 'طقس ناسا',
      tabSoil: 'رطوبة التربة (MERRA-2 / NWP)',
      tabRainfall: 'الأمطار (NASA POWER)',
      tabVegetation: 'غطاء نباتي S-2',
      tabIrrigation: 'الري الذكي FAO-56',
      tabLandMemory: 'ذاكرة الأرض',
      sourceTraceability: 'شفافية ومصدر البيانات',
      weatherHeader: 'الأرصاد الجوية الزراعية السطحية',
      currentObservationTitle: 'الرصد الجوي التقديري اللحظي',
      instantaneousSubtitle: 'نموذج التنبؤ العددي بالطقس (Open-Meteo NWP Assimilation)',
      dailyMeanTitle: 'المتوسط اليومي المستوعب (NASA MERRA-2)',
      apparentTemp: 'الحرارة المحسوسة',
      airTemperature: 'درجة حرارة الهواء (2م)',
      relativeHumidity: 'الرطوبة النسبية (2م)',
      relativeHumiditySub: 'رطوبة الغلاف الجوي (≠ رطوبة التربة)',
      windSpeed: 'سرعة الرياح (2م)',
      windSpeedSub: 'معدل يومي لنموذج MERRA-2',
      solarRadiation: 'الإشعاع الشمسي الكلي',
      solarRadiationSub: 'الإشعاع الساقط على السطح',
      thermalHistoryTitle: 'سجل الحرارة الحقيقي (30 يوماً)',
      lastOverpass: 'آخر قراءة:',
      daysAgo20: '-20 يوم',
      daysAgo10: '-10 أيام',
      nasaTraceabilityTitle: 'مصدر ومواصفات بيانات NASA POWER',
      sourceLabel: 'المصدر:',
      obsDateUtc: 'تاريخ الرصد (UTC):',
      resolutionLabel: 'الدقة المكانية:',
      typeLabel: 'النوع:',
      nasaDelayNotice: 'فترة المعالجة الرسمية لوكالة ناسا: 4 أيام. بيانات استيعاب فضائي إقليمية.',
      soilHeader: 'رطوبة التربة والإجهاد المائي',
      era5SoilTitle: 'رطوبة طبقات التربة الحجمية (نموذج Open-Meteo NWP)',
      era5Layer0_7: 'الطبقة السطحية (0-7 سم)',
      era5Layer7_28: 'طبقة الجذور العليا (7-28 سم)',
      era5Layer28_100: 'طبقة الجذور العميقة (28-100 سم)',
      era5Layer100_255: 'الطبقة السفلية (100-255 سم)',
      era5SourceNote: 'ناتج نموذج توقعات الطقس العددي (NWP) عبر Open-Meteo بوحدات م³/م³. هو مخرج نموذج وليس قياساً مباشراً للحقل ولا إعادة تحليل ERA5-Land.',
      rootZoneMoisture: 'رطوبة المنطقة الجذرية (0-100 سم)',
      rootZoneIndexLabel: 'مؤشر البلل (0-1)',
      rootZoneSub: 'مؤشر بلل نسبي بدون أبعاد (ليس رطوبة حجمية)',
      surfaceMoisture: 'رطوبة التربة السطحية (0-5 سم)',
      surfaceMoistureIndexLabel: 'مؤشر البلل (0-1)',
      surfaceMoistureSub: 'مؤشر بلل نسبي بدون أبعاد',
      volumetricMoisture: 'الرطوبة الحجمية (Copernicus ECMWF)',
      volumetricMoistureLayer: 'الطبقة 0-7 سم',
      droughtIndicatorTitle: 'مؤشر الجفاف الزراعي الفضائي',
      droughtSevere: 'جفاف حاد',
      droughtModerate: 'عجز مائي متوسط',
      droughtMild: 'عجز طفيف',
      droughtNormal: 'ظروف طبيعية',
      droughtSurplus: 'فائض مائي',
      smapResolutionNoticeTitle: 'تنبيه دقة نموذج MERRA-2',
      smapResolutionNoticeDesc:
        'هذه القيمة ناتج نموذج إعادة التحليل NASA MERRA-2 (عبر NASA POWER) بدقة خلايا تقارب 50 كم (0.5° × 0.625°). هي مخرج نموذج إقليمي وليست رصداً من مستشعر SMAP ولا مسباراً أرضياً داخل الحقل.',
      rainfallHeader: 'التساقطات المطرية والهطول',
      dailyRainfall: 'الأمطار اليومية (آخر رصد)',
      obsFrom: 'رصد يوم:',
      monthlyAccumulation: 'التراكم الشهري المرصود (30 يوماً)',
      climatologicalNorm: 'المعدل المناخي الشهري:',
      anomalyComparisonTitle: 'الفارق مقارنة بالمعدل المناخي لـ 30 سنة (ناسا)',
      climatology30Year: 'بيانات مناخية 30 عاماً\nدقة 0.5° × 0.625° (~50 كم)',
      vegetationHeader: 'الاستشعار عن بعد عبر القمر Sentinel-2',
      satelliteOverpassTitle: 'مرور فضائي حقيقي وموثق',
      cdseCatalog: 'سجل كوبرنيكوس CDSE',
      overpassDateUtc: 'تاريخ التحليق (UTC)',
      cloudCoverage: 'الغطاء السحابي',
      granuleId: 'معرّف بلاطة القمر الصناعي MSI L2A:',
      ndviSpectralTitle: 'حساب مؤشر NDVI الطيفي الفعلي: (B8 - B4) / (B8 + B4)',
      ndviRuleNotice: 'وفقاً لميثاق المصداقية العلمية الصارم لمنصة تُربة، لا يتم اختلاق أو تقدير مؤشرات غطاء نباتي وهمية.',
      recentOverpassesTitle: 'آخر التحليقات الفضائية المسجلة فوق هذه الإحداثيات',
      tileLabel: 'البلاطة:',
      cloudsLabel: 'الغيوم:',
      traceabilityModalTitle: 'مصدر ودقة البيانات العلمية الحقيقية',
      provenanceModalTitle: 'السجل العلمي الموثق لتتبع البيانات (Data Provenance)',
      inspectProvenanceButton: 'فحص السجل العلمي',
      provenanceVarName: 'اسم المتغير العلمي',
      provenanceSource: 'المصدر العلمي والنموذج',
      provenanceRawValue: 'القيمة الأصلية في استجابة الخادم',
      provenanceOriginalUnit: 'الوحدة الأصلية',
      provenanceTransformation: 'المعادلة أو التحويل المطبق',
      provenanceFreshness: 'حالة الحداثة الزمنية',
      provenanceSpatial: 'الدقة المكانية',
      provenanceTemporal: 'الدقة الزمنية',
      provenanceEndpoint: 'رابط واجهة API',
      provenanceStatus: 'حالة التحقق الفيزيائي',
      provenanceNotes: 'ملاحظات التحقق',
      testLocationsTitle: 'مواقع الاختبار والتحقق العلمي الإلزامية (المواقع الستة)',
      moroccoTest: 'المغرب (33.8851, -6.8999)',
      swedenTest: 'السويد (65.2722, 21.5030)',
      iranTest: 'إيران (36.3515, 53.0111)',
      brazilTest: 'البرازيل (-11.5270, -53.4859)',
      argentinaTest: 'الأرجنتين (-38.8606, -68.0667)',
      saudiTest: 'السعودية (24.1302, 47.3117)',
      quickTestNotice: 'انقر على أي موقع لتطبيقه فورياً على الخريطة والتحقق من الاستجابة الحقيقية لمصادره.',
      nasaPowerSourceDesc:
        'نموذج MERRA-2 / GEOS-FP. الدقة المكانية: 0.5° × 0.625° (~50 كم). فترة المعالجة الرسمية: 4 أيام. رفض تام للأرقام السالبة -999.',
      nasaSmapSourceDesc:
        'بيانات الرطوبة الجذرية والسطحية. دقة رادارية فضائية: 9–36 كم. تختلف تماماً عن رطوبة الهواء.',
      nasaGpmSourceDesc:
        'تساقطات مطرية فضائية بدقة 0.5° × 0.625° (~50 كم) مدمجة مع المعدل المناخي لثلاثين عاماً لحساب الفوارق المناخية الحقيقية.',
      sentinel2SourceDesc:
        'الكتالوج الرسمي المفتوح لـ Copernicus Data Space Ecosystem (CDSE). رصد بصري بدقة 10 أمتار مع تتبع الغطاء السحابي.',
    },
    drawer: {
      myParcelsTitle: 'قطعي الأرضية المسجلة',
      registeredParcelsCount: 'قطعة مسجلة',
      addManualCoordinate: 'إدخال إحداثيات أو مرجع عقاري',
      hideManualEntry: 'إخفاء الإدخال اليدوي',
      manualEntryTitle: 'تحديد القطعة عبر الإحداثيات (الطريقة 4)',
      manualEntryDesc: 'أدخل الإحداثيات الجغرافية بدقة عشرية لمعاينة أي بقعة زراعية في المغرب.',
      latitude: 'خط العرض (Latitude N)',
      longitude: 'خط الطول (Longitude W)',
      parcelOrCadastreName: 'اسم القطعة أو رقم الرسم العقاري (اختياري)',
      locateAndInspect: 'تحديد واسترجاع البيانات الفضائية',
      exportGeoJson: 'تصدير القطع بصيغة GeoJSON رسمية',
      emptyParcelsTitle: 'لا توجد قطع أرضية مسجلة بعد',
      emptyParcelsDesc: 'استخدم أداة الرسم على الخريطة أو زر موقع GPS أو أدخل الإحداثيات لتسجيل قطعتك الزراعية الأولى.',
      deleteConfirm: 'هل أنت متأكد من حذف هذه القطعة؟',
      viewOnMap: 'معاينة على الخريطة',
    },
    profileModal: {
      modalTitle: 'تسجيل القطعة الزراعية',
      modalSubtitle: 'إنشاء ملف أرض زراعية على منصة تُربة (TURBA)',
      geodesicAreaSummary: 'المساحة الجيوديسية:',
      centroidCoordinates: 'إحداثيات المركز:',
      identificationMethod: 'طريقة التحديد:',
      polygonDrawn: 'رسم مضلع على الخريطة',
      mapPoint: 'تحديد نقطة على الخريطة',
      manualCoords: 'إدخال إحداثيات يدوية',
      parcelName: 'اسم القطعة الزراعية',
      parcelNamePlaceholder: 'مثال: حقل سيدي سليمان 01',
      region: 'الجهة الإدارية',
      province: 'الإقليم / العمالة',
      cadastralRef: 'المرجع العقاري (مطلب التحفيظ / الرسم العقاري إن وجد)',
      cadastralRefPlaceholder: 'مثال: TF-12345/R أو بدون',
      notes: 'ملاحظات حول الزراعات ونظام الري',
      notesPlaceholder: 'مثال: مزروعة قمح صلب، ري بالتنقيط، قطاع بهت...',
      classificationSummary: 'التصنيف الزراعي المعتمد (ESA WorldCereal 2021):',
      sourceLabel: 'المصدر:',
      confidenceLabel: 'نسبة الثقة:',
      resolutionLabel: 'الدقة المكانية:',
      saveFarmButton: 'تأكيد وحفظ القطعة الزراعية',
    },
    systemStatus: {
      modalTitle: 'تقرير التحقق والاتصال بالأنظمة الحقيقية',
      modalSubtitle: 'مراقبة حية للاتصال المباشر مع Google Maps وNASA وESA وCopernicus وGEE',
      colFeature: 'الميزة والخدمة',
      colStatus: 'حالة التحقق العلمي',
      colSpatialRes: 'الدقة المكانية',
      colTemporalRes: 'الدقة الزمنية',
      colAuth: 'حالة التفويض',
      colNotes: 'الملاحظات والقيود',
      legendTitle: 'دليل تصنيفات الحالة وفق المعيار العلمي:',
      statusImplementedAndTested: 'مُفعل ومُختبر ببيانات حقيقية',
      statusNotConfigured: 'غير مهيأ (بحاجة لمفاتيح الربط)',
      statusFailed: 'فشل الاتصال',
      closeAudit: 'إغلاق نافذة التدقيق',
    },
    quota: {
      quotaReached: 'تم بلوغ الحصة المخصصة لخرائط Google Maps Platform.',
      ownerNotice: 'إذا كنت مالك التطبيق، يرجى زيارة',
      developerSiteLink: 'موقع مطوري خرائط جوجل',
      closeBanner: 'إغلاق',
    },
    irrigation: {
      engineTitle: 'محرك قرار الري الذكي (FAO-56)',
      engineSubtitle: 'نموذج بنمان-مونتيث والتوازن المائي اليومي للتربة',
      expandWorkspace: 'توسيع مساحة التحليل',
      collapseWorkspace: 'تصغير اللوحة',
      cropSelectionTitle: 'إعدادات المحصول والتربة والري',
      selectCropPlaceholder: 'اختر المحصول المزروع...',
      plantingDateLabel: 'تاريخ الزرع / بداية الموسم',
      growthStageLabel: 'مرحلة النمو',
      stageAuto: 'تلقائي حسب تاريخ الزرع (FAO-56)',
      stageInitial: 'المرحلة الأولية (Initial)',
      stageDevelopment: 'مرحلة النمو الخضري (Dev)',
      stageMidSeason: 'منتصف الموسم / الذروة (Mid)',
      stageLateSeason: 'أواخر الموسم / النضج (Late)',
      fieldAreaLabel: 'مساحة القطعة (هكتار)',
      fieldAreaPlaceholder: 'أدخل المساحة بالهكتار',
      soilSourceLabel: 'مصدر خصائص التربة',
      soilAutoSoilgrids: 'تلقائي: SoilGrids 250م ثم اليدوي',
      soilLabOption: 'تحليل مخبري للتربة (θFC و θWP)',
      soilTextureOption: 'قوام التربة الميداني (جدول الفاو 19)',
      soilTextureSelectLabel: 'اختر قوام التربة',
      labThetaFcLabel: 'السعة الحقلية θFC (م³/م³)',
      labThetaWpLabel: 'نقطة الذبول θWP (م³/م³)',
      irrigationMethodLabel: 'طريقة الري',
      efficiencyLabel: 'كفاءة الري (Ea)',
      targetDepletionLabel: 'الاستنزاف المستهدف بعد الري (% من RAW)',
      flowRateLabel: 'صبيب النظام الحقيقي (لتر/ساعة - اختياري)',
      flowRatePlaceholder: 'يظهر زمن الري فقط عند توفر الصبيب',
      logIrrigationTitle: 'سجل عمليات الري السابقة',
      addEventButton: 'إضافة رية سابقة',
      dateLabel: 'التاريخ',
      netDepthLabel: 'الكمية الصافية (مم)',
      statusNoImmediate: 'لا حاجة للري الفوري',
      statusApproaching: 'موعد الري يقترب',
      statusRequired: 'الري مطلوب الآن',
      statusInsufficient: 'البيانات غير كافية للتوصية',
      confidenceLabel: 'مستوى الثقة العلمية:',
      confHigh: 'مرتفع',
      confMedium: 'متوسط',
      confLow: 'منخفض',
      confInsufficient: 'بيانات غير كافية',
      et0Label: 'التبخر-نتح المرجعي (ET0)',
      etcLabel: 'الاحتياج المحصولي (ETc / المعدل)',
      depletionLabel: 'الاستنزاف الحالي بمنطقة الجذور',
      tawRawLabel: 'المتاح الكلي (TAW) / الميسر (RAW)',
      netDepthCardLabel: 'عمق الري الصافي (Inet)',
      grossDepthCardLabel: 'عمق الري الإجمالي (Igross)',
      volumeCardLabel: 'الحجم المائي التقديري',
      durationCardLabel: 'مدة التشغيل التقديرية',
      areaRequiredForVolume: 'أدخل مساحة القطعة بالهكتار لحساب الحجم بالمتر المكعب',
      forecastWindowTitle: 'نافذة الري المتوقعة (الأفق المستقبلي)',
      nextRawDateLabel: 'تاريخ بلوغ عتبة الإجهاد (RAW)',
      recommendedWindowLabel: 'النافذة المقترحة للري',
      rainDelayNotice: 'الأمطار المتوقعة تؤخر موعد الحاجة إلى الري',
      noRawInHorizon: 'لا يتوقع بلوغ حد الإجهاد خلال الأيام السبعة القادمة',
      chartTitle: 'منحنى التوازن المائي اليومي (الماضي المرصود مقابل التوقعات)',
      observedLabel: 'بيانات مرصودة/مستوعبة',
      forecastLabel: 'توقعات نموذج NWP',
      explanationTitle: 'التفسير العلمي للقرار',
      confidenceFactorsTitle: 'عوامل الدقة وعدم اليقين',
      provenanceTableTitle: 'تتبع المصادر والطوابع الزمنية للقرار',
      originMeasured: 'قياس حقيقي',
      originAssimilated: 'استيعاب مرجعي/رصد',
      originForecast: 'توقعات NWP',
      originSpatialEstimate: 'تقدير مكاني',
      originFaoEstimated: 'تقدير علمي FAO-56',
      originUserProvided: 'إدخال الفلاح',
      loadingWeatherAndSoil: 'جاري تحميل السلاسل الجوية لـ NASA POWER و Open-Meteo وبيانات التربة...',
    },
    rotationAdvisor: {
      sectionContextTitle: 'أولويات الفلاح والسياق الزراعي المحلي',
      sectionAdvisorTitle: 'مستشار الدورة الزراعية وصحة التربة العالمي',
      sectionAdvisorSubtitle: 'تحليل متعدد العوامل وفق الفاو-56 وبيانات ناسا وخصائص التربة',
      currentCropNote: 'المحصول الحالي / المحصود للتناوب',
      previousCropLabel: 'محصول الموسم السابق (اختياري)',
      previousCropNone: 'غير محدد (تقييم استرشادي أولي)',
      residueLabel: 'إدارة مخلفات المحصول السابق',
      residueIncorporated: 'مدمجة في التربة',
      residueRemoved: 'أُزيلت من الحقل',
      residueGrazed: 'رعي الماشية',
      residueUnknown: 'غير معروف',
      financialCapacityLabel: 'القدرة المالية ومستوى المدخلات',
      finUnspecified: 'غير محددة (فحص محايد)',
      finLowInput: 'مدخلات محدودة / تكلفة دنيا',
      finModerate: 'مدخلات متوسطة متوازنة',
      finHighInvestment: 'استثمار مرتفع (زراعة مكثفة)',
      primaryGoalLabel: 'الهدف الزراعي الأساسي',
      goalUnspecified: 'غير محدد',
      goalFoodSecurity: 'الأمن الغذائي والتموين المحلي',
      goalCommercialProfit: 'الربح التجاري والتسويق',
      goalSoilRegeneration: 'تجديد خصوبة التربة والمادة العضوية',
      goalWaterConservation: 'توفير المياه ومقاومة الجفاف',
      waterCapacityLabel: 'القدرة المائية وتجهيز الري',
      waterUnspecified: 'غير محددة (افتراض عدم توفر ري تكميلي)',
      waterRainfed: 'زراعة بعلية / مطرية فقط',
      waterLimited: 'ري تكميلي محدود',
      waterModern: 'ري حديث منتظم (تنقيط / رش)',
      culturalPracticeLabel: 'نمط الممارسة الزراعية',
      cultureUnspecified: 'غير محدد',
      cultureTraditional: 'زراعة تقليدية ومحاصيل مألوفة',
      cultureDiversification: 'منفتح على التنويع المحصولي',
      cultureMixedLivestock: 'نظام مختلط (زراعة وتربية الماشية)',
      advancedLocalToggle: 'سياق زراعي محلي متقدم (اختياري)',
      countryRegionLabel: 'البلد / الجهة الزراعية',
      countryRegionPlaceholder: 'مثال: الغرب، سوس، الساحل...',
      seasonLabel: 'موسم الزرع المستهدف',
      seasonUnspecified: 'غير محدد (فحص عام)',
      seasonAutumnWinter: 'خريف / شتاء',
      seasonSpring: 'ربيع',
      seasonSummer: 'صيف',
      seasonPerennial: 'أشجار / محاصيل معمرة',
      familiarCropsLabel: 'محاصيل مألوفة محلياً (مفصولة بفاصلة)',
      locallyAvailableLabel: 'بذور ومدخلات متوفرة محلياً',
      livestockIntegrationLabel: 'إدماج تربية الماشية بالضيعة',
      livestockAuto: 'تلقائي حسب النمط',
      livestockYes: 'نعم — تثمين الأعلاف والبقايا',
      livestockNo: 'لا توجد ماشية',
      provisionalHistoryBadge: 'سجل تاريخي غير مكتمل (توصية أولية)',
      preliminaryClimateBadge: 'تقييم مناخي أولي (نافذة رصد قصيرة)',
      statusSuitable: 'ملائم',
      statusConditionallySuitable: 'ملائم بشروط',
      statusInsufficientData: 'بيانات غير كافية',
      statusNoEligible: 'لا توجد توصية مؤهلة',
      compatibilityIndexLabel: 'مؤشر التوافق العلمي',
      compatibilityDisclaimer: 'مؤشر توافق متعدد المعايير — وليس نسبة احتمال نجاح مضمونة',
      whyRecommendedLabel: 'لماذا يُوصى به',
      soilHealthHeader: 'صحة التربة والمنطقة الجذرية',
      waterClimateHeader: 'الملاءمة المائية والمناخية',
      socioEconomicHeader: 'الملاءمة الاقتصادية والاجتماعية',
      cautionsHeader: 'تنبيهات زراعية مهمة',
      missingInfoHeader: 'معلومات ناقصة أو غير متحقق منها',
      referencesHeader: 'المصادر العلمية المعتمدة',
      excludedCropsToggle: 'المحاصيل المستبعدة وأسباب السلامة',
      evidenceDistinctionToggle: 'تفصيل الأدلة العلمية (المرصود مقابل المحسوب والمفترض)',
      measuredLabel: 'مرصود / مسترجع',
      calculatedLabel: 'مؤشرات محسوبة',
      assumptionsLabel: 'افتراضات سياقية',
      selectCropForRotationHint: 'اختر المحصول الحالي أو المحصود أعلاه لتشغيل مستشار الدورة الزراعية وصحة التربة.',
    },
    transitionBridge: {
      sectionTitle: 'جسر الانتقال الزراعي (مخطط الدورة التدريجية)',
      sectionSubtitle: 'تخطيط انتقالي حتمي عبر 3–4 مواسم انطلاقاً من نظامك الحالي نحو استدامة التربة والمياه',
      hemisphereLabel: 'التقويم الفصلي لنصف الكرة:',
      hemisphereNorthern: 'النصف الشمالي',
      hemisphereSouthern: 'النصف الجنوبي',
      hemisphereEquatorial: 'النطاق الاستوائي',
      badgePlansReady: 'المسارات الانتقالية جاهزة',
      badgeInsufficientData: 'بيانات بيئية أو تربوية غير كافية',
      badgeNoFeasible: 'لا يوجد مسار انتقالي ممكن في ظل القيود الحالية',
      badgeInvalidSequence: 'تسلسل المحاصيل الحالي غير صالح',
      sectionATitle: 'أ. الدورة الزراعية الحالية وتحليل المخاطر',
      currentSequenceLabel: 'تسلسل المحاصيل الحالي (من الأقدم إلى الأحدث)',
      addCropPlaceholder: 'إضافة محصول إلى التسلسل الحالي...',
      addToSequenceBtn: 'إضافة للتسلسل',
      seedFromConfigBtn: 'استيراد من المحصول المختار',
      emptySequenceHint: 'أضف محصولاً واحداً على الأقل (مثلاً: القمح الطري ← القمح الطري) لتحليل الدورة الحالية وبناء جسر الانتقال.',
      repeatedFamiliesLabel: 'العائلات النباتية المتكررة:',
      diseaseRisksLabel: 'مخاطر الأمراض والآفات:',
      nutrientWeaknessesLabel: 'نقاط ضعف العناصر والتربة:',
      waterConcentrationLabel: 'تركيز الاحتياج المائي:',
      rootRepetitionYes: 'تكرار نفس عمق الجذور',
      rootRepetitionNo: 'تنوع مقبول في عمق الجذور',
      missingDiversityLabel: 'فجوات التنوع الوظيفي:',
      opportunitiesLabel: 'فرص التحسين الانتقالي:',
      soilConditionLabel: 'حالة التربة الموثقة:',
      sectionBTitle: 'ب. جسر الانتقال الموسمي',
      stageCurrentSystem: 'النظام الحالي',
      stageTransition: 'مرحلة الانتقال',
      stageTargetSystem: 'النظام المستهدف',
      seasonPrefix: 'الموسم',
      changeRetained: 'إبقاء (مألوف)',
      changeMinorAdjustment: 'تعديل طفيف',
      changeNewIntroduction: 'إدخال جديد',
      difficultyLabel: 'صعوبة الانتقال',
      diffLow: 'منخفضة',
      diffModerate: 'متوسطة',
      diffHigh: 'مرتفعة',
      waterClassLabel: 'الطلب المائي',
      waterLowMod: 'منخفض–متوسط',
      waterModerate: 'متوسط',
      waterHigh: 'مرتفع',
      estEtcLabel: 'تقدير ETc الموسمي',
      reasonSelectedLabel: 'سبب الاختيار في هذا الموسم',
      soilConsiderationLabel: 'اعتبارات صحة التربة',
      nitrogenNoteLabel: 'أثر الآزوت والتربة',
      mainBenefitLabel: 'الفائدة الزراعية الرئيسية',
      risksLimitsLabel: 'المخاطر والحدود',
      farmerActionsLabel: 'إجراءات الفلاح المطلوبة',
      sectionCTitle: 'ج. مقارنة المسارات الانتقالية',
      pathwayRecommended: 'المسار الموصى به (متوازن)',
      pathwayConservative: 'المسار المحافظ (أقل تغيير)',
      pathwayAlternative: 'المسار البديل (أقل كلفة ومياه)',
      selectedBadge: 'المسار المختار',
      selectPathwayBtn: 'اعتماد للمعاينة',
      changesCountLabel: 'عدد التغييرات عن الحالي',
      planningScoreLabel: 'مؤشر التخطيط المركب',
      planningScoreDisclaimer: 'مؤشر تخطيطي موزون بالمعايير — وليس احتمال نجاح مضمون',
      advantagesLabel: 'المزايا الرئيسية',
      limitationsLabel: 'القيود الاقتصادية والتشغيلية',
      tradeOffLabel: 'المفاضلة والتوازن',
      criteriaBreakdownToggle: 'تفصيل أوزان ونقاط البحث الحتمي (Dijkstra)',
      critAgronomic: 'التوافق الزراعي وكسر العائلات',
      critSoil: 'أهداف صحة التربة',
      critWater: 'توافر المياه',
      critEconomic: 'الجدوى الاقتصادية والمدخلات',
      critMinimality: 'تقليص التغيير المفاجئ',
      critFarmerPref: 'تفضيلات الفلاح',
      critSeasonal: 'ملاءمة الموسم ونصف الكرة',
      weightShort: 'الوزن',
      sectionDTitle: 'د. التفسير العلمي والآثار التراكمية',
      qaWhyChange: 'لماذا ينبغي تعديل الدورة الحالية؟',
      qaWhatPreserved: 'ما الذي تم الحفاظ عليه من ممارستك؟',
      qaRisksReduced: 'ما المخاطر التي تم تقليلها؟',
      qaIfRejected: 'ماذا يحدث إذا رُفض أحد المحاصيل المقترحة؟',
      qaAssumptions: 'ما الافتراضات المؤثرة في التخطيط؟',
      dimDiversity: 'تنوع العائلات',
      dimSoilHealth: 'صحة التربة',
      dimWaterFit: 'الملاءمة المائية',
      dimEconomicFit: 'الملاءمة الاقتصادية',
      dimSeasonalFit: 'الملاءمة الموسمية',
      evalSuitable: 'ملائم',
      evalCaution: 'تحت التحفظ',
      evalInsufficientData: 'بيانات غير كافية',
      cumulativeTitle: 'النتائج التراكمية عبر الأفق الزمني',
      cumQuantified: 'حسابات كمية موثقة',
      cumQualitative: 'توقعات زراعية نوعية',
      cumUnverified: 'نتائج مستقبلية غير متحقق منها (لا تُفبرك)',
      dataSourcesTitle: 'مصادر البيانات والموثوقية',
      catMeasuredRetrieved: 'مرصود / مسترجع',
      catModelEstimate: 'تقدير نموذجي',
      catCalculated: 'محسوب (FAO-56 / SCS)',
      catUserProvided: 'مدخل من الفلاح',
      catMissing: 'بيانات مفقودة',
      assumptionsTitle: 'الافتراضات والقيود السياقية',
      sectionETitle: 'هـ. قرارات الفلاح والقيود التفاعلية',
      horizonLabel: 'أفق التخطيط (المواسم القادمة)',
      seasons3: '3 مواسم',
      seasons4: '4 مواسم',
      maxCostTierLabel: 'الحد الأقصى لتكلفة المدخلات',
      costAuto: 'تلقائي حسب الملف الشخصي',
      costLow: 'مدخلات منخفضة فقط',
      costModerate: 'مدخلات متوسطة كحد أقصى',
      costHigh: 'مفتوح للاستثمار المرتفع',
      irrigationQuotaLabel: 'حصة مياه الري المتوفرة (مم/موسم — اختياري)',
      irrigationQuotaPlaceholder: 'مثال: 250 (اتركه فارغاً للتلقائي)',
      unfamiliarCropsLabel: 'إدخال محاصيل غير مألوفة محلياً',
      unfamiliarAuto: 'تلقائي (يتبع النمط)',
      unfamiliarYes: 'مسموح بالتنويع الجديد',
      unfamiliarNo: 'الالتزام بالمحاصيل المألوفة',
      soilObservationLabel: 'ملاحظة ميدانية حول التربة (اختياري)',
      soilObservationPlaceholder: 'مثال: تراجع المادة العضوية أو تملح أو تعب التربة...',
      perCropDecisionsLabel: 'تقييم المحاصيل في المسار الحالي',
      decisionAccept: 'قبول',
      decisionReject: 'رفض',
      decisionUnavailable: 'غير متوفر محلياً',
      decisionClear: 'مسح القرار',
      resetDecisionsBtn: 'إعادة ضبط القرارات',
      recalculateBtn: 'إعادة حساب المسار الانتقالي',
      sectionFTitle: 'و. تقرير الانتقال الزراعي القابل للطباعة',
      openReportBtn: 'معاينة التقرير الكامل والطباعة',
      exportJsonBtn: 'تصدير JSON',
      reportModalTitle: 'تقرير جسر الانتقال الزراعي — TURBA (تُربة)',
      reportModalSubtitle: 'تخطيط علمي متدرج للدورة الزراعية وفق FAO-56 و NASA POWER',
      printReportBtn: 'طباعة التقرير',
      reportParcelSummary: 'ملخص القطعة والموقع الجغرافي',
      reportConfidenceLimitations: 'مستوى الثقة والحدود العلمية',
      blockingReasonsTitle: 'أسباب التوقف أو عدم التوفر',
      confidenceReasonsTitle: 'عوامل الثقة العلمية',
      waterConcLowMod: 'منخفض إلى متوسط',
      waterConcModerate: 'متوسط',
      waterConcHigh: 'مرتفع',
      waterConcMixed: 'مختلط',
      waterConcUnknown: 'غير محدد',
      strategyATag: 'الاستراتيجية أ — الدورة الحالية',
      baselineTimelineTitle: 'التسلسل الحالي والعائلات النباتية',
      baselineMissingTitle: 'معلومات ناقصة تحدّ من دقة التشخيص الحالي',
      familyBreakLabel: 'كسر العائلة',
      sameFamilyRepeatLabel: 'تكرار العائلة',
      rootDepthShort: 'الجذور',
      resilienceFocusLabel: 'أولوية المرونة (الاستراتيجية ج)',
      focusAuto: 'تلقائي حسب ملف الفلاح',
      focusWaterConservation: 'الترشيد المائي',
      focusSoilStructure: 'تحسين بنية التربة وتنويع الجذور',
      focusNutrientCycling: 'تدوير العناصر وإدماج البقوليات',
      focusForageProduction: 'إنتاج الأعلاف وتكامل الماشية',
      focusFinancialAccessibility: 'الجدوى المالية وتقليل كلفة المدخلات',
      focusClimateResilience: 'التكيف المناخي ومقاومة الحرارة والجفاف',
      residueHandlingLabel: 'تدبير مخلفات المحاصيل',
      primaryObjectiveLabel: 'الهدف الزراعي الأهم',
      explain8Title: 'بطاقة التفسير الشامل للاستراتيجية (8 محاور)',
      exWhyGenerated: '1. سبب توليد هذه الاستراتيجية',
      exPrioritiesAddressed: '2. الأولويات والقيود المستوفاة',
      exEnvDrivers: '3. المحددات البيئية والزراعية',
      exExpectedBenefits: '4. الفوائد المتوقعة (كمية ونوعية)',
      exRisksTradeoffs: '5. المخاطر والقيود والمفاضلات',
      exFarmerActions: '6. الإجراءات والتحضيرات المطلوبة',
      exSourcesLimits: '7. المصادر والدقة والحدود العلمية',
      exMissingConfidence: '8. المعلومات الناقصة ومستوى الثقة',
    },
    landMemory: {
      title: 'ذاكرة الأرض الحية',
      subtitle: 'سجل ميداني مستمر يربط مواسم الفلاح، البيانات البيئية، التوصيات المحفوظة، والنتائج الفعلية',
      storageDisclosure: 'التخزين المحلي: تُحفظ البيانات محلياً في متصفحك (معزولة لكل قطعة) لعدم تهيئة قاعدة بيانات سحابية حالياً؛ استخدم التصدير JSON للنسخ الاحتياطي الدائم.',
      navOverview: 'نظرة عامة',
      navTimeline: 'الخط الزمني للمواسم',
      navPredictionReality: 'التوقع مقابل الواقع',
      navLandFutures: 'مستقبل الأرض والمسارات',
      navAddSeason: 'إضافة / تعديل موسم',
      navEvidenceDetails: 'المصادر والأدلة العلمية',
      addSeasonBtn: 'تسجيل موسم زراعي',
      editSeasonBtn: 'تعديل السجل',
      exportBackupBtn: 'تصدير نسخة JSON',
      importBackupBtn: 'استيراد JSON',
      importSuccess: 'تم استيراد سجل ذاكرة الأرض لهذه القطعة بنجاح.',
      importError: 'ملف النسخة الاحتياطية غير صالح أو تالف.',
      fieldSummaryTitle: 'هوية القطعة وحدودها الموثقة',
      fieldIdLabel: 'معرّف القطعة',
      precisionLabel: 'دقة التحديد',
      boundaryStatusDrawn: 'مضلع مرسوم فعلياً',
      boundaryStatusPointOnly: 'نقطة إحداثيات فقط (لا تُفترض حدود قطعة)',
      areaLabel: 'المساحة الموثقة',
      areaUnknown: 'غير محددة (بدون مضلع مرسوم)',
      seasonsRecordedCount: 'المواسم المسجلة',
      snapshotsRecordedCount: 'التوصيات المحفوظة',
      outcomesRecordedCount: 'النتائج الفعلية المبلغ عنها',
      missingHistoryCount: 'السجلات غير المكتملة',
      noBoundaryWarning: 'تنبيه: هذه نقطة إحداثيات أو موقع GPS بدون مضلع حدود؛ تبقى المساحة والحدود فارغة حتى يرسمها الفلاح.',
      recentHighlightsTitle: 'ملخص التعلم الحتمي من تاريخ القطعة',
      emptySeasonsTitle: 'لم يُسجَّل أي موسم زراعي لهذه القطعة بعد',
      emptySeasonsDesc: 'تبدأ ذاكرة الأرض بسجل فارغ موثوق ولا تختلق أي تاريخ زراعي وهمي. أضف موسمك الحالي أو السابق لبدء التتبع.',
      emptySnapshotsNotice: 'ستُحفظ التوصيات غير القابلة للتعديل هنا تلقائياً عند تشغيل محرك الري أو مستشار الدورة أو جسر الانتقال.',
      originFarmerReport: 'تقرير الفلاح',
      originImportedRecord: 'سجل مستورد',
      originVerifiedMeasurement: 'قياس مخبري/موثق',
      originCalculated: 'محسوب حتمياً',
      originSpatialEstimate: 'تقدير فضائي/شبكي',
      originSystemAnalysis: 'تحليل النظام',
      qualityVerified: 'قياس موثق',
      qualityFarmerReported: 'تصريح الفلاح',
      qualityEstimated: 'تقدير شبكي/نموذجي',
      qualityCalculated: 'محسوب',
      qualityMissing: 'بيانات مفقودة',
      qualityOutdated: 'بيانات قديمة',
      timelineFilterAll: 'الكل',
      timelineFilterSeasons: 'المواسم',
      timelineFilterRecommendations: 'التوصيات',
      timelineFilterOutcomes: 'النتائج الفعلية',
      timelineFilterGaps: 'الفجوات الزمنية',
      timelineMissingDataTag: 'بيانات ناقصة',
      createdAtLabel: 'تاريخ الإنشاء',
      updatedAtLabel: 'آخر تحديث',
      editHistoryLabel: 'سجل التعديلات',
      seasonFormTitleAdd: 'إضافة سجل موسم زراعي (بدون افتراضات وهمية)',
      seasonFormTitleEdit: 'تعديل سجل الموسم الزراعي',
      cropCatalogLabel: 'اختيار من قاعدة المحاصيل المعتمدة',
      customCropOption: 'محصول آخر / إدخال يدوي',
      cropNameLabel: 'اسم المحصول *',
      cropFamilyLabel: 'العائلة النباتية',
      seasonStartLabel: 'بداية الموسم (YYYY-MM-DD أو YYYY-MM) *',
      seasonEndLabel: 'نهاية الموسم',
      plantingDateLabel: 'تاريخ الزرع الدقيق',
      harvestDateLabel: 'تاريخ الحصاد الدقيق',
      previousCropLabel: 'المحصول السابق في نفس القطعة',
      irrigationMethodLabel: 'طريقة الري المعتمدة',
      irrigationAmountMmLabel: 'كمية الري الفعلية (مم — اتركه فارغاً إن لم تُقَس)',
      irrigationAmountHint: 'لا تضع صفراً إذا كانت الكمية مجهولة؛ اتركه فارغاً لحفظ غياب القياس بصدق.',
      fertilizerLabel: 'الأسمدة والمحسنات العضوية',
      practicesLabel: 'الممارسات الزراعية (حراثة، بقايا...)',
      evidenceRefsLabel: 'مراجع الإثبات (فواتير، رقم تحليل، صور — مفصولة بفاصلة)',
      notesLabel: 'ملاحظات الفلاح الميدانية',
      editNoteLabel: 'سبب التعديل (للتوثيق)',
      saveSeasonBtn: 'حفظ سجل الموسم',
      predictionRealityTitle: 'مقارنة التوقع العلمي بالواقع الميداني',
      predictionRealitySubtitle: 'مقارنة صارمة تتحقق من تطابق الوحدات والفترات الزمنية وتمنع ادعاء تحسن التربة بدون قياس مخبري',
      recStatusLabel: 'حالة تطبيق التوصية',
      statusProposed: 'مقترحة',
      statusAccepted: 'مقبولة',
      statusRejected: 'مرفوضة',
      statusModified: 'معدّلة',
      statusNotRecorded: 'غير مسجلة',
      reportOutcomeBtn: 'تسجيل النتيجة الفعلية',
      editOutcomeBtn: 'تحديث النتيجة الفعلية',
      actualCropLabel: 'المحصول المزروع فعلياً',
      actualPlantingDateLabel: 'تاريخ الزرع الفعلي',
      actualHarvestDateLabel: 'تاريخ الحصاد الفعلي',
      actualIrrAmountLabel: 'كمية الري المطبقة فعلياً',
      actualIrrUnitLabel: 'وحدة الري',
      observedConditionLabel: 'حالة المحصول الملاحظة',
      condGood: 'جيدة',
      condModerateStress: 'إجهاد متوسط',
      condSevereStress: 'إجهاد شديد',
      condFailed: 'فشل المحصول',
      condNotReported: 'غير مبلغ عنها',
      yieldValueLabel: 'المردود المسجل فعلياً (إن قيس)',
      yieldUnitLabel: 'وحدة الإنتاجية',
      waterShortageLabel: 'هل حدث نقص في مياه الري؟',
      yesLabel: 'نعم',
      noLabel: 'لا',
      unknownLabel: 'غير محدد',
      pestObservationsLabel: 'ملاحظات الآفات أو الأمراض',
      recordedRainMmLabel: 'الأمطار المقاسة ميدانياً لنفس الفترة (مم - اختياري)',
      recordedRainSourceLabel: 'مصدر قياس الأمطار (مثل مقياس الضيعة)',
      postSeasonSocLabel: 'الكربون العضوي SOC بعد الموسم (تحليل مخبري % - اختياري)',
      postSeasonSocHint: 'يُقبل فقط عند وجود تحليل مخبري حقيقي للتربة بعد الموسم.',
      farmerAssessmentLabel: 'تقييم الفلاح وخلاصة الموسم',
      saveOutcomeBtn: 'حفظ النتيجة وتحديث المقارنة',
      expectedCol: 'التوقع / الموصى به',
      actualCol: 'الواقع الفعلي',
      deltaCol: 'الفارق',
      comparableBadge: 'مقارنة متوافقة',
      incompatibleBadge: 'غير قابل للمقارنة المباشرة',
      awaitingOutcomeBadge: 'بانتظار النتيجة الفعلية',
      futuresTitle: 'مستقبل الأرض والمسارات الانتقالية المتكيفة',
      futuresSubtitle: 'مقارنة 3 مسارات انطلاقاً من تاريخ القطعة الحقيقي بقواعد حتمية شفافة (بدون تعلّم آلي وهمي)',
      deterministicNoticeTitle: 'محرك قواعد حتمي قائم على الأدلة (وليس AI/ML غامضاً)',
      rememberedSequenceLabel: 'تسلسل المحاصيل المتذكر من السجل',
      familyConflictsLabel: 'تضاربات العائلات النباتية المكتشفة',
      waterShortagesLoggedLabel: 'تقارير نقص المياه السابقة',
      recDeltaTitle: 'كيف تغيّرت التوصية عن السابقة ولماذا؟',
      triggersTitle: 'المعطيات الجديدة المحفّزة للتغير',
      blockingMissingTitle: 'سجلات ناقصة تحدّ من دقة التخطيط',
      hardConstraintsTitle: 'القيود الصارمة المطبقة (حذف الخيارات غير الصالحة)',
      rankingPreferencesTitle: 'ترجيحات الترتيب والأولويات',
      verificationConditionsTitle: 'شروط التحقق المحلي المطلوبة قبل التنفيذ',
      pathATitle: 'المسار أ: الاستمرار في الممارسة الحالية',
      pathBTitle: 'المسار ب: الانتقال التدريجي المتوازن',
      pathCTitle: 'المسار ج: البديل المقاوم للإجهاد والكلفة',
      evidenceDetailsTitle: 'سجل المصادر العلمية، الدقة المكانية والزمنية، والحدود',
      evidenceDetailsSubtitle: 'فصل تام بين التقديرات الشبكية (NASA POWER ~50كم / Open-Meteo / SoilGrids 250م) والقياسات الميدانية وكتالوج Sentinel-2',
      chartHistoryTitle: 'التسلسل الزمني الحقيقي لقياسات البيئة المحفوظة',
      chartNoSeriesNotice: 'التسلسل التاريخي المتعدد للرسوم البيانية يظهر بعد تسجيل لقطات بيئية متعددة لنفس القطعة.',
      colSourceProvider: 'المزود العلمي',
      colVariable: 'المتغير',
      colValueUnit: 'القيمة والوحدة',
      colRefDate: 'تاريخ المرجع',
      colRetrievalTime: 'وقت الجلب',
      colResolution: 'الدقة المكانية/الزمنية',
      colOriginQuality: 'الأصل والجودة',
      colLimitations: 'القيود العلمية',
    },
  },

  en: {
    common: {
      appName: 'TURBA',
      appTagline: 'Moroccan Agricultural Intelligence Platform',
      realDataBadge: 'Moroccan Agriculture • Real Data',
      auditButton: 'Real Data Audit',
      auditButtonTooltip: 'Verify live connectivity for NASA, ESA, and Google Maps feeds',
      parcelsButton: 'My Parcels',
      close: 'Close',
      cancel: 'Cancel',
      save: 'Save',
      delete: 'Delete',
      refresh: 'Refresh',
      loading: 'Loading...',
      hectares: 'ha',
      sqMeters: 'm²',
      syncTime: 'Sync:',
      waiting: 'Pending',
      dataUnavailable: 'Data currently unavailable',
      notAvailable: 'N/A',
      verified: 'VERIFIED',
      historical: 'HISTORICAL',
      notConfigured: 'NOT CONFIGURED',
      unavailable: 'Data currently unavailable',
      fresh: 'Fresh & Verified',
      delayed: 'Delayed Data',
      stale: 'Stale Data',
      dataProvenance: 'Data Provenance Log',
    },
    header: {
      title: 'TURBA',
      subtitle: 'Moroccan Agricultural Intelligence Platform',
      realMorocco: 'Moroccan Agriculture • Real Data',
    },
    map: {
      satellite: 'Satellite',
      roadmap: 'Map',
      worldCerealLayer: 'ESA WorldCereal 2021 (10m)',
      worldCerealTooltip: 'Toggle ESA WorldCereal 2021 crop classification layer (10m resolution)',
      deAfricaLayer: 'DE Africa 2019',
      deAfricaTooltip: 'Toggle Digital Earth Africa Cropland 2019 comparative baseline layer',
      selectBasinPlaceholder: 'Select a Moroccan agricultural basin...',
      basinsLabel: 'Basins:',
      myGpsPosition: 'My GPS Position',
      locatingGps: 'Acquiring GPS...',
      gpsAcquiredReal: 'Authentic GPS Position',
      gpsAccuracy: 'Accuracy:',
      gpsStandardAccuracy: 'Standard',
      gpsDeviceNote: 'Current device position (does not constitute agricultural parcel boundaries).',
      gpsErrorUnsupported: 'Geolocation is not supported by your browser.',
      gpsErrorDenied: 'Geolocation permission was denied by the user.',
      gpsErrorUnavailable: 'GPS signal is currently unavailable.',
      gpsErrorTimeout: 'GPS acquisition request timed out.',
      gpsErrorGeneric: 'Unable to acquire GPS location.',
      drawParcel: 'Draw My Parcel',
      drawingActive: 'Drawing mode active',
      verticesCount: 'vertices',
      geodesicArea: 'Geodesic Area:',
      drawingHintStart: 'Click on the map to place real parcel boundary vertices.',
      drawingHintClose: 'Perimeter closed. Validate to save this agricultural parcel.',
      undoLastPoint: 'Undo last vertex',
      saveParcelButton: 'Save Parcel',
      inspectedPoint: 'Inspected Point',
      moroccoOverview: 'Morocco Agriculture',
      agriculturalPerimeter: 'Moroccan agricultural perimeter',
      pointMarkerTitle: 'Inspected point',
      gpsMarkerTitle: 'Your actual GPS position',
    },
    dashboard: {
      emptyPromptTitle: 'Select an agricultural area in Morocco',
      emptyPromptDesc:
        'Click on the map, use your GPS location, or draw the exact polygon of your farmland to query live NASA POWER, Open-Meteo, and Sentinel-2 catalogue satellite feeds without synthetic simulations.',
      connectingServers: 'Querying scientific NASA & Copernicus servers in real time...',
      tabWeather: 'NASA Weather',
      tabSoil: 'Soil Moisture (MERRA-2 / NWP)',
      tabRainfall: 'Precipitation (NASA POWER)',
      tabVegetation: 'S-2 NDVI',
      tabIrrigation: 'Smart Irrigation',
      tabLandMemory: 'Land Memory',
      sourceTraceability: 'Source Traceability',
      weatherHeader: 'Surface Agrometeorology',
      currentObservationTitle: 'Current Atmospheric Estimates',
      instantaneousSubtitle: 'Open-Meteo NWP Numerical Weather Model Assimilation',
      dailyMeanTitle: 'Daily Assimilated Mean (NASA MERRA-2)',
      apparentTemp: 'Apparent Temp',
      airTemperature: 'Air Temperature (2m)',
      relativeHumidity: 'Relative Humidity (2m)',
      relativeHumiditySub: 'Atmospheric humidity (≠ soil moisture)',
      windSpeed: 'Wind Speed (2m)',
      windSpeedSub: 'MERRA-2 daily assimilation mean',
      solarRadiation: 'Global Solar Radiation',
      solarRadiationSub: 'Surface downwelling irradiance',
      thermalHistoryTitle: 'Real Thermal History (30 Days)',
      lastOverpass: 'Latest obs:',
      daysAgo20: '-20 days',
      daysAgo10: '-10 days',
      nasaTraceabilityTitle: 'NASA POWER Traceability & Specs',
      sourceLabel: 'Source:',
      obsDateUtc: 'Observation Date (UTC):',
      resolutionLabel: 'Spatial Resolution:',
      typeLabel: 'Type:',
      nasaDelayNotice: 'Official NASA publication latency: 4 days. Regional satellite assimilation data.',
      soilHeader: 'Soil Moisture & Water Stress',
      era5SoilTitle: 'Volumetric Soil Moisture Layers (Open-Meteo NWP model)',
      era5Layer0_7: 'Surface Layer (0–7 cm)',
      era5Layer7_28: 'Upper Root Zone (7–28 cm)',
      era5Layer28_100: 'Deep Root Zone (28–100 cm)',
      era5Layer100_255: 'Subsoil Layer (100–255 cm)',
      era5SourceNote: 'Output of the Open-Meteo numerical weather prediction (NWP) model in volumetric units (m³/m³). It is model output, not a direct field measurement and not ERA5-Land reanalysis.',
      rootZoneMoisture: 'Root Zone Moisture (0-100cm)',
      rootZoneIndexLabel: 'Wetness Index (0-1)',
      rootZoneSub: 'Dimensionless relative index (not volumetric water content)',
      surfaceMoisture: 'Surface Moisture (0-5cm)',
      surfaceMoistureIndexLabel: 'Wetness Index (0-1)',
      surfaceMoistureSub: 'Dimensionless topsoil wetness index',
      volumetricMoisture: 'Volumetric Moisture (Copernicus ECMWF)',
      volumetricMoistureLayer: '0-7 cm profile',
      droughtIndicatorTitle: 'Satellite Edaphic Drought Index',
      droughtSevere: 'Severe Drought',
      droughtModerate: 'Moderate Deficit',
      droughtMild: 'Mild Deficit',
      droughtNormal: 'Normal Conditions',
      droughtSurplus: 'Moisture Surplus',
      smapResolutionNoticeTitle: 'MERRA-2 Model Resolution Notice',
      smapResolutionNoticeDesc:
        'This value is output of the NASA MERRA-2 reanalysis model (via NASA POWER) on a ~50 km grid (0.5° × 0.625°). It is a regional model product, not a SMAP radiometer observation and not an in-field sensor.',
      rainfallHeader: 'Precipitation & Rainfall',
      dailyRainfall: 'Daily Rainfall (Latest obs)',
      obsFrom: 'Observed on:',
      monthlyAccumulation: 'Measured 30-Day Accumulation',
      climatologicalNorm: 'Climatological normal:',
      anomalyComparisonTitle: 'Anomaly vs 30-Year NASA Climatology',
      climatology30Year: 'NASA 30-Year Climatology\nResolution 0.5° × 0.625° (~50 km)',
      vegetationHeader: 'Copernicus Sentinel-2 Remote Sensing',
      satelliteOverpassTitle: 'Authentic Satellite Overpass',
      cdseCatalog: 'CDSE Catalog',
      overpassDateUtc: 'Overpass Date (UTC)',
      cloudCoverage: 'Cloud Coverage',
      granuleId: 'Sentinel-2 MSI L2A Granule Identifier:',
      ndviSpectralTitle: 'Direct Spectral NDVI Calculation: (B8 - B4) / (B8 + B4)',
      ndviRuleNotice:
        'In strict accordance with TURBA scientific integrity standards, no synthetic or fabricated NDVI indices are generated.',
      recentOverpassesTitle: 'Recent satellite overpasses recorded over this coordinate',
      tileLabel: 'Tile:',
      cloudsLabel: 'Clouds:',
      traceabilityModalTitle: 'Origin & Resolution of Authentic Datasets',
      provenanceModalTitle: 'Scientific Data Provenance & Traceability Log',
      inspectProvenanceButton: 'Inspect Provenance',
      provenanceVarName: 'Scientific Variable Name',
      provenanceSource: 'Scientific Source & Model',
      provenanceRawValue: 'Raw Value in Source Payload',
      provenanceOriginalUnit: 'Original Unit',
      provenanceTransformation: 'Applied Transformation',
      provenanceFreshness: 'Freshness Status',
      provenanceSpatial: 'Spatial Resolution',
      provenanceTemporal: 'Temporal Resolution',
      provenanceEndpoint: 'API Query Endpoint',
      provenanceStatus: 'Physical Verification Status',
      provenanceNotes: 'Validation Notes',
      testLocationsTitle: 'Mandatory Scientific Verification Locations (Section 9)',
      moroccoTest: 'Morocco (33.8851, -6.8999)',
      swedenTest: 'Sweden (65.2722, 21.5030)',
      iranTest: 'Iran (36.3515, 53.0111)',
      brazilTest: 'Brazil (-11.5270, -53.4859)',
      argentinaTest: 'Argentina (-38.8606, -68.0667)',
      saudiTest: 'Saudi Arabia (24.1302, 47.3117)',
      quickTestNotice: 'Click any location to immediately inspect it on the map and verify authentic source responses.',
      nasaPowerSourceDesc:
        'MERRA-2 / GEOS-FP assimilation. Spatial resolution: 0.5° x 0.625° (~50 km). Official delay: 4 days. Strict rejection of -999 fill values.',
      nasaSmapSourceDesc:
        'Root-zone and surface wetness products. Satellite microwave resolution: 9–36 km. Distinct from atmospheric humidity.',
      nasaGpmSourceDesc:
        'Reanalysis-corrected precipitation (NASA POWER PRECTOTCORR) at 0.5° × 0.625° (~50 km) combined with NASA 30-year monthly climatology for authentic anomaly calculation.',
      sentinel2SourceDesc:
        'Official Copernicus Data Space Ecosystem (CDSE) catalog. 10m optical observation with cloud masking.',
    },
    drawer: {
      myParcelsTitle: 'My Agricultural Parcels',
      registeredParcelsCount: 'parcels registered',
      addManualCoordinate: 'Add via Coordinates / Cadastre',
      hideManualEntry: 'Hide manual entry',
      manualEntryTitle: 'Register by Geographic Coordinates (Method 4)',
      manualEntryDesc: 'Enter exact decimal degrees to inspect any agricultural area in Morocco.',
      latitude: 'Latitude (Decimal Degrees N)',
      longitude: 'Longitude (Decimal Degrees W)',
      parcelOrCadastreName: 'Parcel Name or Title Ref (Optional)',
      locateAndInspect: 'Locate & Retrieve Satellite Observations',
      exportGeoJson: 'Export Parcels as Official GeoJSON',
      emptyParcelsTitle: 'No agricultural parcels registered yet',
      emptyParcelsDesc:
        'Use the map drawing tool, GPS location, or enter coordinates to register your first agricultural parcel.',
      deleteConfirm: 'Are you sure you want to delete this parcel?',
      viewOnMap: 'View on map',
    },
    profileModal: {
      modalTitle: 'Register Agricultural Parcel',
      modalSubtitle: 'Create a permanent farmland profile on TURBA (تُربة)',
      geodesicAreaSummary: 'Geodesic Area:',
      centroidCoordinates: 'Centroid Coordinates:',
      identificationMethod: 'Registration Method:',
      polygonDrawn: 'Polygon drawn on map',
      mapPoint: 'Point selected on map',
      manualCoords: 'Manual coordinate entry',
      parcelName: 'Parcel Name',
      parcelNamePlaceholder: 'e.g., Sidi Slimane Orchard 01',
      region: 'Administrative Region',
      province: 'Province / Prefecture',
      cadastralRef: 'Cadastral Title Reference (If registered)',
      cadastralRefPlaceholder: 'e.g., TF-12345/R or unmapped',
      notes: 'Crops & Irrigation Notes',
      notesPlaceholder: 'e.g., Durum wheat, drip irrigation, Beht sector...',
      classificationSummary: 'Classified Cropland (ESA WorldCereal 2021):',
      sourceLabel: 'Source:',
      confidenceLabel: 'Confidence:',
      resolutionLabel: 'Spatial Resolution:',
      saveFarmButton: 'Confirm & Save Parcel',
    },
    systemStatus: {
      modalTitle: 'Scientific System Integration & Verification Audit',
      modalSubtitle: 'Live status report for Google Maps, NASA, ESA, Copernicus, and Google Earth Engine',
      colFeature: 'Feature & Service',
      colStatus: 'Verification Status',
      colSpatialRes: 'Spatial Resolution',
      colTemporalRes: 'Temporal Resolution',
      colAuth: 'Authentication Status',
      colNotes: 'Technical Notes & Disclosures',
      legendTitle: 'Status Classification Legend (Section 12 Standards):',
      statusImplementedAndTested: 'IMPLEMENTED AND TESTED WITH REAL DATA',
      statusNotConfigured: 'NOT CONFIGURED',
      statusFailed: 'FAILED',
      closeAudit: 'Close Audit Window',
    },
    quota: {
      quotaReached: 'Google Maps Platform quota reached.',
      ownerNotice: 'If you are the app owner, visit',
      developerSiteLink: 'maps developer site',
      closeBanner: 'Close',
    },
    irrigation: {
      engineTitle: 'Smart Irrigation Decision Engine (FAO-56)',
      engineSubtitle: 'Penman-Monteith ET0 & Daily Root-Zone Soil-Water Balance',
      expandWorkspace: 'Expand Workspace',
      collapseWorkspace: 'Compact View',
      cropSelectionTitle: 'Field, Crop, Soil & System Parameters',
      selectCropPlaceholder: 'Select active crop...',
      plantingDateLabel: 'Planting / Season Start Date',
      growthStageLabel: 'Growth Stage',
      stageAuto: 'Auto from planting date (FAO-56)',
      stageInitial: 'Initial stage',
      stageDevelopment: 'Crop development',
      stageMidSeason: 'Mid-season (Peak)',
      stageLateSeason: 'Late season / Ripening',
      fieldAreaLabel: 'Field Area (ha)',
      fieldAreaPlaceholder: 'Enter area in hectares',
      soilSourceLabel: 'Soil Hydraulic Data Source',
      soilAutoSoilgrids: 'Auto: SoilGrids 250m + Fallback',
      soilLabOption: 'Farmer Field Lab Analysis (θFC & θWP)',
      soilTextureOption: 'Field Soil Texture (FAO-56 Table 19)',
      soilTextureSelectLabel: 'Select Soil Texture Class',
      labThetaFcLabel: 'Field Capacity θFC (m³/m³)',
      labThetaWpLabel: 'Wilting Point θWP (m³/m³)',
      irrigationMethodLabel: 'Irrigation Method',
      efficiencyLabel: 'Efficiency (Ea)',
      targetDepletionLabel: 'Target Post-Irrigation Depletion (% of RAW)',
      flowRateLabel: 'System Flow Rate (L/hour — optional)',
      flowRatePlaceholder: 'Duration displays only when real flow is provided',
      logIrrigationTitle: 'Logged Previous Irrigation Events',
      addEventButton: 'Log Irrigation Event',
      dateLabel: 'Date',
      netDepthLabel: 'Net Depth (mm)',
      statusNoImmediate: 'No immediate irrigation requirement',
      statusApproaching: 'Irrigation approaching',
      statusRequired: 'Irrigation required',
      statusInsufficient: 'Insufficient data for recommendation',
      confidenceLabel: 'Scientific Confidence:',
      confHigh: 'High',
      confMedium: 'Medium',
      confLow: 'Low',
      confInsufficient: 'Insufficient data',
      et0Label: 'Reference ET0 (FAO-56)',
      etcLabel: 'Crop ETc / Stress-Adjusted',
      depletionLabel: 'Root-Zone Depletion D(t)',
      tawRawLabel: 'TAW / RAW Storage Thresholds',
      netDepthCardLabel: 'Net Irrigation Depth (Inet)',
      grossDepthCardLabel: 'Gross Irrigation Depth (Igross)',
      volumeCardLabel: 'Estimated Water Volume',
      durationCardLabel: 'Estimated Run Time',
      areaRequiredForVolume: 'Enter field area (ha) to compute cubic meters (m³)',
      forecastWindowTitle: 'Forecast Irrigation Window (Future Horizon)',
      nextRawDateLabel: 'Projected RAW Crossing Date',
      recommendedWindowLabel: 'Recommended Window',
      rainDelayNotice: 'Forecast rainfall delays projected irrigation timing',
      noRawInHorizon: 'Depletion stays below RAW through the 7-day forecast horizon',
      chartTitle: 'Daily Soil-Water Balance (Observed History vs Future Forecast)',
      observedLabel: 'Observed / Assimilated',
      forecastLabel: 'NWP Forecast',
      explanationTitle: 'Scientific Decision Explanation',
      confidenceFactorsTitle: 'Confidence & Uncertainty Factors',
      provenanceTableTitle: 'Data Traceability, Sources & Timestamps',
      originMeasured: 'Measured',
      originAssimilated: 'Assimilated',
      originForecast: 'Forecast',
      originSpatialEstimate: 'Spatial Estimate',
      originFaoEstimated: 'FAO-56 Estimated',
      originUserProvided: 'User Provided',
      loadingWeatherAndSoil: 'Loading NASA POWER, Open-Meteo NWP forecast & soil hydraulics...',
    },
    rotationAdvisor: {
      sectionContextTitle: 'Farmer Priorities & Global Context',
      sectionAdvisorTitle: 'Global Crop Rotation & Soil Health Advisor',
      sectionAdvisorSubtitle: 'Multi-factor FAO-56, NASA POWER & Soil-Hydraulic Compatibility',
      currentCropNote: 'Current / Harvested Crop',
      previousCropLabel: 'Previous Season Crop (Optional)',
      previousCropNone: 'Not specified (Provisional mode)',
      residueLabel: 'Previous Crop Residue Handling',
      residueIncorporated: 'Incorporated into soil',
      residueRemoved: 'Removed / harvested off-field',
      residueGrazed: 'Grazed by livestock',
      residueUnknown: 'Unknown',
      financialCapacityLabel: 'Financial & Input Capacity',
      finUnspecified: 'Not specified (Neutral screening)',
      finLowInput: 'Low input (minimal capital/inputs)',
      finModerate: 'Moderate balanced inputs',
      finHighInvestment: 'High investment (intensive inputs)',
      primaryGoalLabel: 'Primary Farming Objective',
      goalUnspecified: 'Not specified',
      goalFoodSecurity: 'Household / local food security',
      goalCommercialProfit: 'Commercial market income',
      goalSoilRegeneration: 'Soil health & organic matter regeneration',
      goalWaterConservation: 'Water conservation & drought resilience',
      waterCapacityLabel: 'Water & Irrigation Infrastructure',
      waterUnspecified: 'Not specified (Assumes 0 mm irrigation)',
      waterRainfed: 'Rainfed only (No irrigation)',
      waterLimited: 'Limited / supplemental irrigation',
      waterModern: 'Modern full irrigation (drip/sprinkler)',
      culturalPracticeLabel: 'Farming System & Practice',
      cultureUnspecified: 'Not specified',
      cultureTraditional: 'Traditional / heritage crops',
      cultureDiversification: 'Open to crop diversification',
      cultureMixedLivestock: 'Mixed crop–livestock system',
      advancedLocalToggle: 'Advanced Local Agricultural Context (Optional)',
      countryRegionLabel: 'Country / Agricultural Region',
      countryRegionPlaceholder: 'e.g. Gharb, Souss, Sahel...',
      seasonLabel: 'Target Planting Season',
      seasonUnspecified: 'Unspecified (Year-round check)',
      seasonAutumnWinter: 'Autumn / Winter',
      seasonSpring: 'Spring',
      seasonSummer: 'Summer',
      seasonPerennial: 'Perennial / Orchard',
      familiarCropsLabel: 'Locally Familiar Crops (comma-separated)',
      locallyAvailableLabel: 'Available Seeds / Inputs Locally',
      livestockIntegrationLabel: 'On-farm Livestock Integration',
      livestockAuto: 'Auto (follow practice)',
      livestockYes: 'Yes — forage/residue valued',
      livestockNo: 'No livestock on parcel',
      provisionalHistoryBadge: 'Provisional History (Prior crop missing)',
      preliminaryClimateBadge: 'Preliminary Short-Window Climate',
      statusSuitable: 'Suitable',
      statusConditionallySuitable: 'Conditionally Suitable',
      statusInsufficientData: 'Insufficient Data',
      statusNoEligible: 'No Eligible Recommendation',
      compatibilityIndexLabel: 'Compatibility Index',
      compatibilityDisclaimer: 'Weighted agronomic/water/socio-economic index — not a probability of success',
      whyRecommendedLabel: 'Why Recommended',
      soilHealthHeader: 'Soil Health & Root-Zone Benefit',
      waterClimateHeader: 'Water & Climate Fit',
      socioEconomicHeader: 'Socio-Economic & Cultural Fit',
      cautionsHeader: 'Agronomic Cautions',
      missingInfoHeader: 'Missing or Unverified Evidence',
      referencesHeader: 'Scientific References',
      excludedCropsToggle: 'Excluded Candidates & Safety Filters',
      evidenceDistinctionToggle: 'Evidence Distinction (Measured vs Calculated vs Assumed)',
      measuredLabel: 'Measured / Retrieved',
      calculatedLabel: 'Calculated Indicators',
      assumptionsLabel: 'Contextual Assumptions',
      selectCropForRotationHint: 'Select an active or harvested crop above to run the Global Crop Rotation & Soil Health Advisor.',
    },
    transitionBridge: {
      sectionTitle: 'Rotation Transition Bridge (Gradual Multi-Season Planner)',
      sectionSubtitle: 'Deterministic 3–4 season transition planning from your current sequence toward soil & water resilience',
      hemisphereLabel: 'Hemisphere Seasonal Calendar:',
      hemisphereNorthern: 'Northern Hemisphere',
      hemisphereSouthern: 'Southern Hemisphere',
      hemisphereEquatorial: 'Equatorial Belt',
      badgePlansReady: 'Transition Pathways Ready',
      badgeInsufficientData: 'Insufficient Climate or Soil Data',
      badgeNoFeasible: 'No Feasible Transition Under Active Constraints',
      badgeInvalidSequence: 'Invalid Current Crop Sequence',
      sectionATitle: 'A. Current Rotation & Baseline Diagnosis',
      currentSequenceLabel: 'Current Crop Sequence (Oldest → Most Recent)',
      addCropPlaceholder: 'Add crop to current sequence...',
      addToSequenceBtn: 'Add to Sequence',
      seedFromConfigBtn: 'Load from Active/Previous Crop',
      emptySequenceHint: 'Add at least one current or recent crop (e.g., Wheat → Wheat) to analyze your baseline and generate transition pathways.',
      repeatedFamiliesLabel: 'Repeated Botanical Families:',
      diseaseRisksLabel: 'Disease & Pest Pressures:',
      nutrientWeaknessesLabel: 'Nutrient & Soil Weaknesses:',
      waterConcentrationLabel: 'Water Demand Concentration:',
      rootRepetitionYes: 'Repeated rooting depth pattern',
      rootRepetitionNo: 'Adequate root depth variation',
      missingDiversityLabel: 'Missing Functional Diversity:',
      opportunitiesLabel: 'Transition Improvement Opportunities:',
      soilConditionLabel: 'Documented Soil Condition:',
      sectionBTitle: 'B. Gradual Transition Bridge Timeline',
      stageCurrentSystem: 'CURRENT SYSTEM',
      stageTransition: 'TRANSITION',
      stageTargetSystem: 'TARGET SYSTEM',
      seasonPrefix: 'Season',
      changeRetained: 'Retained (Familiar)',
      changeMinorAdjustment: 'Minor Adjustment',
      changeNewIntroduction: 'New Introduction',
      difficultyLabel: 'Transition Difficulty',
      diffLow: 'Low',
      diffModerate: 'Moderate',
      diffHigh: 'High',
      waterClassLabel: 'Water Demand',
      waterLowMod: 'Low–Moderate',
      waterModerate: 'Moderate',
      waterHigh: 'High',
      estEtcLabel: 'Est. Window ETc',
      reasonSelectedLabel: 'Why Chosen for This Season',
      soilConsiderationLabel: 'Soil Health Considerations',
      nitrogenNoteLabel: 'Nitrogen & Residue Note',
      mainBenefitLabel: 'Main Agronomic Benefit',
      risksLimitsLabel: 'Risks & Limitations',
      farmerActionsLabel: 'Required Farmer Actions',
      sectionCTitle: 'C. Compare Transition Pathways',
      pathwayRecommended: 'Recommended Pathway (Balanced)',
      pathwayConservative: 'Conservative Pathway (Minimal Change)',
      pathwayAlternative: 'Alternative Pathway (Lower Input / Water)',
      selectedBadge: 'Active Selection',
      selectPathwayBtn: 'Inspect Pathway',
      changesCountLabel: 'Changes vs Current',
      planningScoreLabel: 'Composite Planning Index',
      planningScoreDisclaimer: 'Documented weighted planning score — not a probability of success',
      advantagesLabel: 'Main Advantages',
      limitationsLabel: 'Economic & Operational Limitations',
      tradeOffLabel: 'Key Trade-Off',
      criteriaBreakdownToggle: 'Deterministic Search Criteria & Weights Breakdown (Dijkstra)',
      critAgronomic: 'Agronomic & Family Break',
      critSoil: 'Soil Health Objectives',
      critWater: 'Water Availability Fit',
      critEconomic: 'Economic & Input Feasibility',
      critMinimality: 'Transition Minimality',
      critFarmerPref: 'Farmer Preferences',
      critSeasonal: 'Hemisphere Seasonal Fit',
      weightShort: 'Weight',
      sectionDTitle: 'D. Why This Transition? & Cumulative Outcomes',
      qaWhyChange: 'Why should the rotation change?',
      qaWhatPreserved: 'What is preserved from current practice?',
      qaRisksReduced: 'What agronomic or water risks are reduced?',
      qaIfRejected: 'What happens if a proposed crop is rejected?',
      qaAssumptions: 'Which assumptions influence this plan?',
      dimDiversity: 'Family Diversity',
      dimSoilHealth: 'Soil Health',
      dimWaterFit: 'Water Fit',
      dimEconomicFit: 'Economic Fit',
      dimSeasonalFit: 'Seasonal Fit',
      evalSuitable: 'Suitable',
      evalCaution: 'Caution',
      evalInsufficientData: 'Insufficient Data',
      cumulativeTitle: 'Cumulative Multi-Season Effects',
      cumQuantified: 'Quantified Calculations',
      cumQualitative: 'Qualitative Agronomic Expectations',
      cumUnverified: 'Unverified Future Outcomes (Never Fabricated)',
      dataSourcesTitle: 'Data Sources & Epistemic Categories',
      catMeasuredRetrieved: 'Measured / Retrieved',
      catModelEstimate: 'Model Estimate',
      catCalculated: 'Calculated (FAO-56 / SCS)',
      catUserProvided: 'User Provided',
      catMissing: 'Missing / Unavailable',
      assumptionsTitle: 'Active Assumptions & Constraints',
      sectionETitle: 'E. Farmer Decisions & Interactive Constraints',
      horizonLabel: 'Transition Planning Horizon',
      seasons3: '3 Seasons',
      seasons4: '4 Seasons',
      maxCostTierLabel: 'Max Input Cost Capacity',
      costAuto: 'Auto from Profile',
      costLow: 'Low Input Only',
      costModerate: 'Up to Moderate Input',
      costHigh: 'High Investment Allowed',
      irrigationQuotaLabel: 'Seasonal Irrigation Quota (mm/season — optional)',
      irrigationQuotaPlaceholder: 'e.g. 250 (blank = auto)',
      unfamiliarCropsLabel: 'Allow Locally Unfamiliar Crops',
      unfamiliarAuto: 'Auto (Follow Practice)',
      unfamiliarYes: 'Yes — Allow New Diversification',
      unfamiliarNo: 'No — Stick to Familiar Crops',
      soilObservationLabel: 'Field Soil Observation (Optional)',
      soilObservationPlaceholder: 'e.g. compaction, low organic matter, surface crusting...',
      perCropDecisionsLabel: 'Decision Controls for Proposed Crops',
      decisionAccept: 'Accept',
      decisionReject: 'Reject',
      decisionUnavailable: 'Unavailable',
      decisionClear: 'Clear',
      resetDecisionsBtn: 'Reset Decisions',
      recalculateBtn: 'Recalculate Transition Plan',
      sectionFTitle: 'F. Printable Transition Plan Report',
      openReportBtn: 'Open Printable Report',
      exportJsonBtn: 'Export JSON',
      reportModalTitle: 'TURBA Rotation Transition Report',
      reportModalSubtitle: 'Gradual Evidence-Based Multi-Season Agronomic Plan (FAO-56 & NASA POWER)',
      printReportBtn: 'Print Report',
      reportParcelSummary: 'Parcel & Geographic Context',
      reportConfidenceLimitations: 'Scientific Confidence & Limitations',
      blockingReasonsTitle: 'Blocking Reasons',
      confidenceReasonsTitle: 'Confidence Basis',
      waterConcLowMod: 'Low to Moderate',
      waterConcModerate: 'Moderate',
      waterConcHigh: 'High',
      waterConcMixed: 'Mixed',
      waterConcUnknown: 'Unknown',
      strategyATag: 'Strategy A — Current Rotation',
      baselineTimelineTitle: 'Current Sequence & Botanical Families',
      baselineMissingTitle: 'Missing Information Limiting Baseline Conclusions',
      familyBreakLabel: 'Family Break',
      sameFamilyRepeatLabel: 'Family Repeat',
      rootDepthShort: 'Root Zr',
      resilienceFocusLabel: 'Alternative Resilience Focus (Strategy C)',
      focusAuto: 'Auto from Farmer Profile',
      focusWaterConservation: 'Water Conservation',
      focusSoilStructure: 'Soil Structure & Root Diversity',
      focusNutrientCycling: 'Nutrient Cycling & Legumes',
      focusForageProduction: 'Forage & Livestock Integration',
      focusFinancialAccessibility: 'Financial Accessibility (Lower Cost)',
      focusClimateResilience: 'Climate & Thermal Resilience',
      residueHandlingLabel: 'Crop Residue Handling',
      primaryObjectiveLabel: 'Most Important Farming Objective',
      explain8Title: 'Complete Strategy Explainability (8 Key Axes)',
      exWhyGenerated: '1. Why This Strategy Was Generated',
      exPrioritiesAddressed: '2. Priorities & Constraints Addressed',
      exEnvDrivers: '3. Environmental & Agronomic Drivers',
      exExpectedBenefits: '4. Expected Benefits',
      exRisksTradeoffs: '5. Risks, Limitations & Trade-Offs',
      exFarmerActions: '6. Required Farmer Actions & Preparation',
      exSourcesLimits: '7. Data Sources, Units & Scientific Limits',
      exMissingConfidence: '8. Missing Information & Confidence Level',
    },
    landMemory: {
      title: 'Living Land Memory (ذاكرة الأرض)',
      subtitle: 'Persistent field evidence linking recorded seasons, live environmental baselines, immutable recommendations, and actual outcomes',
      storageDisclosure: 'Persistence disclosure: Records are stored in browser localStorage isolated per field ID (no remote database configured). Export JSON regularly for permanent backup.',
      navOverview: 'Overview',
      navTimeline: 'Season Timeline',
      navPredictionReality: 'Prediction vs Reality',
      navLandFutures: 'Land Futures',
      navAddSeason: 'Add / Edit Season',
      navEvidenceDetails: 'Sources & Evidence',
      addSeasonBtn: 'Record Season',
      editSeasonBtn: 'Edit Record',
      exportBackupBtn: 'Export JSON',
      importBackupBtn: 'Import JSON',
      importSuccess: 'Field Land Memory backup imported cleanly.',
      importError: 'Backup JSON file is invalid or failed validation.',
      fieldSummaryTitle: 'Field Identity & Verified Geometry',
      fieldIdLabel: 'Field ID',
      precisionLabel: 'Location Precision',
      boundaryStatusDrawn: 'User-drawn boundary polygon',
      boundaryStatusPointOnly: 'Point only (no parcel boundary assumed)',
      areaLabel: 'Verified Area',
      areaUnknown: 'Unavailable (no polygon drawn)',
      seasonsRecordedCount: 'Seasons Recorded',
      snapshotsRecordedCount: 'Saved Recommendations',
      outcomesRecordedCount: 'Reported Outcomes',
      missingHistoryCount: 'Incomplete Seasons',
      noBoundaryWarning: 'Notice: Coordinates represent a point or device GPS fix, NOT parcel boundaries. Area remains null until a polygon is drawn.',
      recentHighlightsTitle: 'Deterministic Memory Summary',
      emptySeasonsTitle: 'No Agricultural Seasons Recorded Yet',
      emptySeasonsDesc: 'Land Memory begins strictly empty with zero fabricated crop history. Record your current or past season to build verified memory.',
      emptySnapshotsNotice: 'Immutable recommendation snapshots are automatically archived here whenever you run Irrigation, Rotation Advisor, or Transition Bridge.',
      originFarmerReport: 'Farmer Report',
      originImportedRecord: 'Imported Record',
      originVerifiedMeasurement: 'Verified Measurement',
      originCalculated: 'Deterministic Calc',
      originSpatialEstimate: 'Gridded/Spatial Estimate',
      originSystemAnalysis: 'System Analysis',
      qualityVerified: 'Verified Measurement',
      qualityFarmerReported: 'Farmer Reported',
      qualityEstimated: 'Model / Spatial Estimate',
      qualityCalculated: 'Calculated',
      qualityMissing: 'Missing Data',
      qualityOutdated: 'Outdated Data',
      timelineFilterAll: 'All Events',
      timelineFilterSeasons: 'Seasons',
      timelineFilterRecommendations: 'Recommendations',
      timelineFilterOutcomes: 'Outcomes',
      timelineFilterGaps: 'History Gaps',
      timelineMissingDataTag: 'Incomplete',
      createdAtLabel: 'Created',
      updatedAtLabel: 'Updated',
      editHistoryLabel: 'Edit Audit Log',
      seasonFormTitleAdd: 'Record Agricultural Season (No Fake Defaults)',
      seasonFormTitleEdit: 'Edit Season Record',
      cropCatalogLabel: 'Select Crop from Catalog',
      customCropOption: 'Custom / Other Crop',
      cropNameLabel: 'Crop Name *',
      cropFamilyLabel: 'Botanical Family',
      seasonStartLabel: 'Season Start (YYYY-MM-DD or YYYY-MM) *',
      seasonEndLabel: 'Season End',
      plantingDateLabel: 'Exact Planting Date',
      harvestDateLabel: 'Exact Harvest Date',
      previousCropLabel: 'Previous Crop on This Parcel',
      irrigationMethodLabel: 'Irrigation Method',
      irrigationAmountMmLabel: 'Applied Irrigation (mm — leave blank if unknown)',
      irrigationAmountHint: 'Do NOT enter 0 when unknown; leave blank to preserve missing measurement honestly.',
      fertilizerLabel: 'Fertilizer & Soil Amendments',
      practicesLabel: 'Management Practices (tillage, residue...)',
      evidenceRefsLabel: 'Supporting References (comma-separated)',
      notesLabel: 'Field Notes & Observations',
      editNoteLabel: 'Reason for Edit (audit trail)',
      saveSeasonBtn: 'Save Season Record',
      predictionRealityTitle: 'Prediction vs. Reality Comparison',
      predictionRealitySubtitle: 'Enforces strict unit, time-period, and lab baseline compatibility; never infers soil gain without measurements',
      recStatusLabel: 'Farmer Decision Status',
      statusProposed: 'Proposed',
      statusAccepted: 'Accepted',
      statusRejected: 'Rejected',
      statusModified: 'Modified',
      statusNotRecorded: 'Not Recorded',
      reportOutcomeBtn: 'Report Actual Outcome',
      editOutcomeBtn: 'Edit Outcome Report',
      actualCropLabel: 'Actual Crop Planted',
      actualPlantingDateLabel: 'Actual Planting Date',
      actualHarvestDateLabel: 'Actual Harvest Date',
      actualIrrAmountLabel: 'Actual Irrigation Applied',
      actualIrrUnitLabel: 'Unit',
      observedConditionLabel: 'Observed Crop Condition',
      condGood: 'Good',
      condModerateStress: 'Moderate Stress',
      condSevereStress: 'Severe Stress',
      condFailed: 'Crop Failed',
      condNotReported: 'Not Reported',
      yieldValueLabel: 'Measured/Harvested Yield (if known)',
      yieldUnitLabel: 'Yield Unit',
      waterShortageLabel: 'Did water shortage occur?',
      yesLabel: 'Yes',
      noLabel: 'No',
      unknownLabel: 'Unknown',
      pestObservationsLabel: 'Pest or Disease Observations',
      recordedRainMmLabel: 'Field-Recorded Period Rain (mm — optional)',
      recordedRainSourceLabel: 'Rain Gauge / Source',
      postSeasonSocLabel: 'Post-Season Lab SOC % (optional)',
      postSeasonSocHint: 'Enter ONLY from an actual parcel laboratory soil test.',
      farmerAssessmentLabel: 'Farmer Field Assessment',
      saveOutcomeBtn: 'Save Outcome & Compare',
      expectedCol: 'Predicted / Target',
      actualCol: 'Actual Reality',
      deltaCol: 'Difference',
      comparableBadge: 'Comparable',
      incompatibleBadge: 'Incompatible / Blocked',
      awaitingOutcomeBadge: 'Awaiting Outcome',
      futuresTitle: 'Land Futures & Multi-Pathway Comparison',
      futuresSubtitle: 'Deterministic rule-based comparison grounded in recorded field seasons, water shortages, and live soil/climate feeds',
      deterministicNoticeTitle: 'Deterministic Evidence Rules (Not Machine Learning or Hidden AI)',
      rememberedSequenceLabel: 'Remembered Crop Sequence',
      familyConflictsLabel: 'Detected Family Repeat Conflicts',
      waterShortagesLoggedLabel: 'Water Shortage Reports',
      recDeltaTitle: 'How Latest Recommendation Changed & Why',
      triggersTitle: 'New Field Information Triggering Change',
      blockingMissingTitle: 'Missing Records Limiting Reliability',
      hardConstraintsTitle: 'Hard Agronomic / Resource Constraints Applied',
      rankingPreferencesTitle: 'Weighted Ranking Preferences Applied',
      verificationConditionsTitle: 'Local Verification Conditions Required',
      pathATitle: 'Path A: Continuing Current Practice',
      pathBTitle: 'Path B: Gradual Sustainable Transition',
      pathCTitle: 'Path C: Resilience / Lower-Cost Alternative',
      evidenceDetailsTitle: 'Data Sources, Spatial/Temporal Resolution & Provenance',
      evidenceDetailsSubtitle: 'Strict separation between gridded climate (~50 km), NWP forecasts, 250 m SoilGrids estimates, and Sentinel-2 metadata',
      chartHistoryTitle: 'Recorded Environmental Baseline History',
      chartNoSeriesNotice: 'Historical time-series charts appear once multiple live environmental snapshots accumulate for this parcel.',
      colSourceProvider: 'Provider',
      colVariable: 'Variable',
      colValueUnit: 'Value & Unit',
      colRefDate: 'Reference Date',
      colRetrievalTime: 'Retrieved At',
      colResolution: 'Resolution',
      colOriginQuality: 'Origin & Quality',
      colLimitations: 'Scientific Limitations',
    },
  },

  fr: {
    common: {
      appName: 'TURBA',
      appTagline: 'Plateforme d\'Intelligence Agricole du Maroc',
      realDataBadge: 'Maroc Agricole • Données Réelles',
      auditButton: 'Audit données réelles',
      auditButtonTooltip: 'Vérifier la connectivité réelle des flux NASA, ESA et Google Maps',
      parcelsButton: 'Mes parcelles',
      close: 'Fermer',
      cancel: 'Annuler',
      save: 'Enregistrer',
      delete: 'Supprimer',
      refresh: 'Actualiser',
      loading: 'Chargement...',
      hectares: 'ha',
      sqMeters: 'm²',
      syncTime: 'Sync:',
      waiting: 'En attente',
      dataUnavailable: 'Données actuellement indisponibles',
      notAvailable: 'N/D',
      verified: 'VÉRIFIÉ',
      historical: 'HISTORIQUE',
      notConfigured: 'NON CONFIGURÉ',
      unavailable: 'Données actuellement indisponibles',
      fresh: 'Données fraîches vérifiées',
      delayed: 'Données différées',
      stale: 'Données anciennes',
      dataProvenance: 'Registre de traçabilité',
    },
    header: {
      title: 'TURBA',
      subtitle: 'Plateforme d\'Intelligence Agricole du Maroc',
      realMorocco: 'Maroc Agricole • Données Réelles',
    },
    map: {
      satellite: 'Satellite',
      roadmap: 'Plan',
      worldCerealLayer: 'ESA WorldCereal 2021 (10m)',
      worldCerealTooltip: 'Afficher/Masquer la couche ESA WorldCereal 2021 (10m)',
      deAfricaLayer: 'DE Africa 2019',
      deAfricaTooltip: 'Afficher la couche comparative Digital Earth Africa Cropland 2019',
      selectBasinPlaceholder: 'Sélectionner un bassin agricole...',
      basinsLabel: 'Périmètres:',
      myGpsPosition: 'Ma position GPS',
      locatingGps: 'Acquisition GPS...',
      gpsAcquiredReal: 'Position GPS Réelle',
      gpsAccuracy: 'Précision:',
      gpsStandardAccuracy: 'Standard',
      gpsDeviceNote: 'Position de l\'appareil (ne constitue pas les limites d\'une parcelle).',
      gpsErrorUnsupported: 'La géolocalisation n\'est pas supportée par votre navigateur.',
      gpsErrorDenied: 'Autorisation de géolocalisation refusée par l\'utilisateur.',
      gpsErrorUnavailable: 'Signal GPS non disponible.',
      gpsErrorTimeout: 'Délai d\'attente GPS dépassé.',
      gpsErrorGeneric: 'Position GPS inaccessible.',
      drawParcel: 'Tracer ma parcelle',
      drawingActive: 'Mode tracé actif',
      verticesCount: 'sommets',
      geodesicArea: 'Superficie géodésique:',
      drawingHintStart: 'Cliquez sur la carte pour poser les sommets réels du périmètre.',
      drawingHintClose: 'Périmètre fermé. Validez pour enregistrer la parcelle.',
      undoLastPoint: 'Annuler le dernier point',
      saveParcelButton: 'Enregistrer la parcelle',
      inspectedPoint: 'Point inspecté',
      moroccoOverview: 'Maroc Agricole',
      agriculturalPerimeter: 'Périmètre agricole du Maroc',
      pointMarkerTitle: 'Point inspecté',
      gpsMarkerTitle: 'Votre position GPS réelle',
    },
    dashboard: {
      emptyPromptTitle: 'Sélectionnez une zone agricole au Maroc',
      emptyPromptDesc:
        'Cliquez sur la carte, utilisez votre position GPS, ou tracez le polygone exact de votre terre pour interroger les flux satellitaires NASA POWER, Open-Meteo et catalogue Sentinel-2 sans valeurs simulées.',
      connectingServers: 'Interrogation des serveurs scientifiques NASA & Copernicus en cours...',
      tabWeather: 'Météo NASA',
      tabSoil: 'Humidité du sol (MERRA-2 / NWP)',
      tabRainfall: 'Précipitations (NASA POWER)',
      tabVegetation: 'NDVI S-2',
      tabIrrigation: 'Irrigation FAO-56',
      tabLandMemory: 'Mémoire Terre',
      sourceTraceability: 'Traçabilité des sources',
      weatherHeader: 'Agrométéorologie de surface',
      currentObservationTitle: 'Estimations atmosphériques actuelles',
      instantaneousSubtitle: 'Modèles de prévision numérique Open-Meteo NWP',
      dailyMeanTitle: 'Moyenne quotidienne assimilée (NASA MERRA-2)',
      apparentTemp: 'Temp. ressentie',
      airTemperature: 'Température de l\'air (2m)',
      relativeHumidity: 'Humidité relative (2m)',
      relativeHumiditySub: 'Atmosphère (≠ humidité du sol)',
      windSpeed: 'Vitesse du vent (2m)',
      windSpeedSub: 'Moyenne journalière MERRA-2',
      solarRadiation: 'Rayonnement global',
      solarRadiationSub: 'Irradiance solaire descendante',
      thermalHistoryTitle: 'Historique thermique réel (30 jours)',
      lastOverpass: 'Dernier survol:',
      daysAgo20: '-20 jours',
      daysAgo10: '-10 jours',
      nasaTraceabilityTitle: 'Traçabilité & Métadonnées NASA POWER',
      sourceLabel: 'Source:',
      obsDateUtc: 'Date d\'obs (UTC):',
      resolutionLabel: 'Résolution:',
      typeLabel: 'Type:',
      nasaDelayNotice: 'Délai de traitement officiel de la NASA : 4 jours. Données d\'assimilation satellitaire régionale.',
      soilHeader: 'Humidité du sol & Stress hydrique',
      era5SoilTitle: 'Humidité volumique des couches du sol (modèle NWP Open-Meteo)',
      era5Layer0_7: 'Couche de surface (0–7 cm)',
      era5Layer7_28: 'Zone racinaire supérieure (7–28 cm)',
      era5Layer28_100: 'Zone racinaire profonde (28–100 cm)',
      era5Layer100_255: 'Couche sous-jacente (100–255 cm)',
      era5SourceNote: 'Sortie du modèle de prévision numérique (NWP) Open-Meteo en teneur volumique (m³/m³). Il s\'agit d\'une sortie de modèle, ni une mesure directe de la parcelle ni une réanalyse ERA5-Land.',
      rootZoneMoisture: 'Humidité racinaire (0-100cm)',
      rootZoneIndexLabel: 'Indice wetness (0-1)',
      rootZoneSub: 'Indice sans dimension (distinct de l\'humidité volumique)',
      surfaceMoisture: 'Humidité superficielle (0-5cm)',
      surfaceMoistureIndexLabel: 'Indice wetness (0-1)',
      surfaceMoistureSub: 'Indice sans dimension de la couche arable',
      volumetricMoisture: 'Humidité volumique (Copernicus ECMWF)',
      volumetricMoistureLayer: 'Couche 0-7 cm',
      droughtIndicatorTitle: 'Indicateur de sécheresse édaphique',
      droughtSevere: 'Sécheresse sévère',
      droughtModerate: 'Déficit hydrique modéré',
      droughtMild: 'Léger déficit',
      droughtNormal: 'Conditions normales',
      droughtSurplus: 'Excédent hydrique',
      smapResolutionNoticeTitle: 'Avertissement de résolution du modèle MERRA-2',
      smapResolutionNoticeDesc:
        'Cette valeur est une sortie du modèle de réanalyse NASA MERRA-2 (via NASA POWER) sur une maille d\'environ 50 km (0,5° × 0,625°). Il s\'agit d\'un produit de modèle régional, ni une observation du radiomètre SMAP ni une sonde intra-parcellaire.',
      rainfallHeader: 'Pluviométrie & Précipitations',
      dailyRainfall: 'Pluie journalière (Dernière obs)',
      obsFrom: 'Obs. du',
      monthlyAccumulation: 'Cumul 30 jours mesuré',
      climatologicalNorm: 'Normale climatologique:',
      anomalyComparisonTitle: 'Écart à la normale trentenaire NASA',
      climatology30Year: 'Climatologie NASA 30 ans\nRésolution 0,5° × 0,625° (~50 km)',
      vegetationHeader: 'Télédétection Sentinel-2',
      satelliteOverpassTitle: 'Survol Satellite Authentique',
      cdseCatalog: 'Catalogue CDSE',
      overpassDateUtc: 'Date de survol (UTC)',
      cloudCoverage: 'Couverture nuageuse',
      granuleId: 'Identifiant du Granule MSI L2A:',
      ndviSpectralTitle: 'Calcul Spectral NDVI Réel: (B8 - B4) / (B8 + B4)',
      ndviRuleNotice:
        'Conformément à la règle de scientificité stricte de TURBA, aucun faux indice NDVI n\'est généré ou substitué.',
      recentOverpassesTitle: 'Derniers survols répertoriés au-dessus de cette coordonnée',
      tileLabel: 'Tuile:',
      cloudsLabel: 'Nuages:',
      traceabilityModalTitle: 'Origine & Résolution des Données Réelles',
      provenanceModalTitle: 'Registre Scientifique de Traçabilité des Données (Provenance)',
      inspectProvenanceButton: 'Examiner la provenance',
      provenanceVarName: 'Paramètre scientifique',
      provenanceSource: 'Source scientifique & Modèle',
      provenanceRawValue: 'Valeur brute reçue',
      provenanceOriginalUnit: 'Unité d\'origine',
      provenanceTransformation: 'Transformation / Formule appliquée',
      provenanceFreshness: 'Fraîcheur temporelle',
      provenanceSpatial: 'Résolution spatiale',
      provenanceTemporal: 'Résolution temporelle',
      provenanceEndpoint: 'Point de terminaison API',
      provenanceStatus: 'Vérification physique',
      provenanceNotes: 'Notes de validation',
      testLocationsTitle: 'Localisations de Vérification Scientifique (Section 9)',
      moroccoTest: 'Maroc (33.8851, -6.8999)',
      swedenTest: 'Suède (65.2722, 21.5030)',
      iranTest: 'Iran (36.3515, 53.0111)',
      brazilTest: 'Brésil (-11.5270, -53.4859)',
      argentinaTest: 'Argentine (-38.8606, -68.0667)',
      saudiTest: 'Arabie saoudite (24.1302, 47.3117)',
      quickTestNotice: 'Cliquez sur n\'importe quelle localisation pour l\'inspecter directement et vérifier la réponse brute de ses sources.',
      nasaPowerSourceDesc:
        'Modèle MERRA-2 / GEOS-FP. Résolution spatiale : 0.5° x 0.625° (~50 km). Délai de traitement officiel : 4 jours. Rejet strict des codes d\'absence (-999).',
      nasaSmapSourceDesc:
        'Produits d\'humidité racinaire et superficielle. Résolution satellitaire micro-ondes : 9–36 km. Distinct de l\'humidité atmosphérique.',
      nasaGpmSourceDesc:
        'Précipitations (NASA POWER PRECTOTCORR) à 0,5° × 0,625° (~50 km) combinées à la climatologie trentenaire NASA POWER pour le calcul réel des anomalies.',
      sentinel2SourceDesc:
        'Catalogue officiel Copernicus Data Space Ecosystem (CDSE). Détection optique à 10m avec masquage nuageux.',
    },
    drawer: {
      myParcelsTitle: 'Mes Parcelles Agricoles',
      registeredParcelsCount: 'parcelles enregistrées',
      addManualCoordinate: 'Ajouter par coordonnées / cadastre',
      hideManualEntry: 'Masquer la saisie manuelle',
      manualEntryTitle: 'Saisie manuelle des coordonnées (Méthode 4)',
      manualEntryDesc: 'Saisissez des coordonnées en degrés décimaux pour inspecter une zone agricole au Maroc.',
      latitude: 'Latitude (Degrés décimaux N)',
      longitude: 'Longitude (Degrés décimaux W)',
      parcelOrCadastreName: 'Nom de la parcelle ou réf. cadastrale (optionnel)',
      locateAndInspect: 'Localiser & Récupérer les données',
      exportGeoJson: 'Exporter en GeoJSON standard',
      emptyParcelsTitle: 'Aucune parcelle enregistrée pour l\'instant',
      emptyParcelsDesc:
        'Utilisez l\'outil de tracé sur la carte, votre position GPS ou saisissez des coordonnées pour enregistrer votre première terre agricole.',
      deleteConfirm: 'Voulez-vous vraiment supprimer cette parcelle ?',
      viewOnMap: 'Voir sur la carte',
    },
    profileModal: {
      modalTitle: 'Enregistrer la parcelle agricole',
      modalSubtitle: 'Création d\'un profil de terre TURBA (تُربة)',
      geodesicAreaSummary: 'Superficie géodésique :',
      centroidCoordinates: 'Coordonnées du barycentre :',
      identificationMethod: 'Méthode d\'identification :',
      polygonDrawn: 'Polygone tracé sur la carte',
      mapPoint: 'Point sélectionné sur la carte',
      manualCoords: 'Saisie manuelle de coordonnées',
      parcelName: 'Nom de la parcelle',
      parcelNamePlaceholder: 'Ex: Verger Sidi Slimane 01',
      region: 'Région administrative',
      province: 'Province / Préfecture',
      cadastralRef: 'Référence cadastrale (Titre foncier / Réquisition si disponible)',
      cadastralRefPlaceholder: 'Ex: TF-12345/R ou Non immatriculé',
      notes: 'Notes agricoles et irrigation',
      notesPlaceholder: 'Ex: Blé dur, irrigation goutte-à-goutte, secteur Beht...',
      classificationSummary: 'Classification agricole identifiée (ESA WorldCereal 2021) :',
      sourceLabel: 'Source :',
      confidenceLabel: 'Confiance :',
      resolutionLabel: 'Résolution spatiale :',
      saveFarmButton: 'Confirmer et enregistrer la parcelle',
    },
    systemStatus: {
      modalTitle: 'Rapport d\'Audit & Intégration des Données Réelles',
      modalSubtitle: 'Contrôle en direct des flux Google Maps, NASA, ESA, Copernicus et GEE',
      colFeature: 'Fonctionnalité & Service',
      colStatus: 'Statut de vérification scientifique',
      colSpatialRes: 'Résolution spatiale',
      colTemporalRes: 'Résolution temporelle',
      colAuth: 'Statut d\'authentification',
      colNotes: 'Notes techniques & Divulgations',
      legendTitle: 'Légende des statuts de conformité (Règles Section 12) :',
      statusImplementedAndTested: 'IMPLEMENTED AND TESTED WITH REAL DATA',
      statusNotConfigured: 'NOT CONFIGURED',
      statusFailed: 'FAILED',
      closeAudit: 'Fermer le rapport d\'audit',
    },
    quota: {
      quotaReached: 'Google Maps Platform quota reached.',
      ownerNotice: 'Si vous êtes le propriétaire de l\'application, visitez',
      developerSiteLink: 'le site développeur Google Maps',
      closeBanner: 'Fermer',
    },
    irrigation: {
      engineTitle: 'Moteur de Décision d\'Irrigation (FAO-56)',
      engineSubtitle: 'ET0 Penman-Monteith & Bilan Hydrique Journalier du Sol',
      expandWorkspace: 'Agrandir l\'espace',
      collapseWorkspace: 'Vue compacte',
      cropSelectionTitle: 'Paramètres Parcelle, Culture, Sol & Système',
      selectCropPlaceholder: 'Sélectionner une culture...',
      plantingDateLabel: 'Date de semis / début de cycle',
      growthStageLabel: 'Stade phénologique',
      stageAuto: 'Auto depuis date de semis (FAO-56)',
      stageInitial: 'Stade initial',
      stageDevelopment: 'Développement foliaire',
      stageMidSeason: 'Mi-saison (Pic)',
      stageLateSeason: 'Fin de cycle / Maturation',
      fieldAreaLabel: 'Surface parcelle (ha)',
      fieldAreaPlaceholder: 'Saisir la surface en hectares',
      soilSourceLabel: 'Source des propriétés du sol',
      soilAutoSoilgrids: 'Auto : SoilGrids 250 m + Repli',
      soilLabOption: 'Analyse laboratoire (θFC & θWP)',
      soilTextureOption: 'Texture observée (FAO-56 Tableau 19)',
      soilTextureSelectLabel: 'Classe de texture du sol',
      labThetaFcLabel: 'Capacité au champ θFC (m³/m³)',
      labThetaWpLabel: 'Point de flétrissement θWP (m³/m³)',
      irrigationMethodLabel: 'Méthode d\'irrigation',
      efficiencyLabel: 'Efficience (Ea)',
      targetDepletionLabel: 'Déficit cible après irrigation (% RFU)',
      flowRateLabel: 'Débit réel du système (L/h — optionnel)',
      flowRatePlaceholder: 'Durée affichée uniquement si débit réel saisi',
      logIrrigationTitle: 'Historique des apports d\'irrigation',
      addEventButton: 'Ajouter un arrosage',
      dateLabel: 'Date',
      netDepthLabel: 'Dose nette (mm)',
      statusNoImmediate: 'Aucune irrigation immédiate requise',
      statusApproaching: 'Irrigation imminente',
      statusRequired: 'Irrigation requise',
      statusInsufficient: 'Données insuffisantes pour recommander',
      confidenceLabel: 'Niveau de confiance scientifique :',
      confHigh: 'Élevé',
      confMedium: 'Moyen',
      confLow: 'Faible',
      confInsufficient: 'Données insuffisantes',
      et0Label: 'ET0 de référence (FAO-56)',
      etcLabel: 'ETc / Ajustée au stress (Ks)',
      depletionLabel: 'Déficit hydrique racinaire D(t)',
      tawRawLabel: 'Réserve Utile (RU/TAW) & RFU (RAW)',
      netDepthCardLabel: 'Dose nette recommandée (Inet)',
      grossDepthCardLabel: 'Dose brute (Igross)',
      volumeCardLabel: 'Volume d\'eau estimé',
      durationCardLabel: 'Durée estimée',
      areaRequiredForVolume: 'Renseignez la superficie (ha) pour calculer le volume (m³)',
      forecastWindowTitle: 'Fenêtre d\'Irrigation Prévisionnelle',
      nextRawDateLabel: 'Date prévue d\'atteinte du seuil RAW',
      recommendedWindowLabel: 'Fenêtre conseillée',
      rainDelayNotice: 'Les pluies prévues retardent le besoin d\'irrigation',
      noRawInHorizon: 'Le déficit reste sous le seuil RAW sur les 7 prochains jours',
      chartTitle: 'Bilan Hydrique Journalier (Historique Observé vs Prévisions)',
      observedLabel: 'Observé / Assimilé',
      forecastLabel: 'Prévision NWP',
      explanationTitle: 'Explication scientifique de la décision',
      confidenceFactorsTitle: 'Facteurs de précision et d\'incertitude',
      provenanceTableTitle: 'Traçabilité des données et horodatages',
      originMeasured: 'Mesuré',
      originAssimilated: 'Assimilé',
      originForecast: 'Prévision NWP',
      originSpatialEstimate: 'Estimation spatiale',
      originFaoEstimated: 'Estimation FAO-56',
      originUserProvided: 'Saisi par l\'agriculteur',
      loadingWeatherAndSoil: 'Chargement des séries NASA POWER, prévisions Open-Meteo et propriétés du sol...',
    },
    rotationAdvisor: {
      sectionContextTitle: 'Priorités de l\'Agriculteur & Contexte Global',
      sectionAdvisorTitle: 'Conseiller Global de Rotation & Santé des Sols',
      sectionAdvisorSubtitle: 'Analyse multicritère FAO-56, NASA POWER & hydraulique des sols',
      currentCropNote: 'Culture actuelle / récoltée',
      previousCropLabel: 'Culture précédente (Optionnel)',
      previousCropNone: 'Non précisée (Mode provisoire)',
      residueLabel: 'Gestion des résidus précédents',
      residueIncorporated: 'Enfouis dans le sol',
      residueRemoved: 'Exportés hors parcelle',
      residueGrazed: 'Pâturés par le bétail',
      residueUnknown: 'Inconnu',
      financialCapacityLabel: 'Capacité financière & intrants',
      finUnspecified: 'Non précisée (Filtrage neutre)',
      finLowInput: 'Faibles intrants (budget réduit)',
      finModerate: 'Intrants modérés équilibrés',
      finHighInvestment: 'Investissement élevé (intensif)',
      primaryGoalLabel: 'Objectif agricole principal',
      goalUnspecified: 'Non précisé',
      goalFoodSecurity: 'Sécurité alimentaire locale',
      goalCommercialProfit: 'Revenu commercial & marché',
      goalSoilRegeneration: 'Régénération du sol & matière organique',
      goalWaterConservation: 'Économie d\'eau & résilience hydrique',
      waterCapacityLabel: 'Capacité hydrique & irrigation',
      waterUnspecified: 'Non précisée (0 mm d\'irrigation supposé)',
      waterRainfed: 'Pluvial strict (Sans irrigation)',
      waterLimited: 'Irrigation d\'appoint limitée',
      waterModern: 'Irrigation moderne maîtrisée (goutte-à-goutte)',
      culturalPracticeLabel: 'Système & pratique culturale',
      cultureUnspecified: 'Non précisée',
      cultureTraditional: 'Cultures traditionnelles / familières',
      cultureDiversification: 'Ouvert à la diversification culturale',
      cultureMixedLivestock: 'Système mixte culture–élevage',
      advancedLocalToggle: 'Contexte agricole local avancé (Optionnel)',
      countryRegionLabel: 'Pays / Région agricole',
      countryRegionPlaceholder: 'Ex : Gharb, Souss, Sahel...',
      seasonLabel: 'Saison de semis visée',
      seasonUnspecified: 'Non précisée (Examen annuel)',
      seasonAutumnWinter: 'Automne / Hiver',
      seasonSpring: 'Printemps',
      seasonSummer: 'Été',
      seasonPerennial: 'Pérenne / Verger',
      familiarCropsLabel: 'Cultures familières localement (séparées par virgule)',
      locallyAvailableLabel: 'Semences / intrants disponibles localement',
      livestockIntegrationLabel: 'Intégration élevage sur la parcelle',
      livestockAuto: 'Auto (selon la pratique)',
      livestockYes: 'Oui — fourrages/résidus valorisés',
      livestockNo: 'Aucun élevage',
      provisionalHistoryBadge: 'Historique provisoire (Précédent manquant)',
      preliminaryClimateBadge: 'Climat préliminaire (Fenêtre courte)',
      statusSuitable: 'Adapté',
      statusConditionallySuitable: 'Adapté sous conditions',
      statusInsufficientData: 'Données insuffisantes',
      statusNoEligible: 'Aucune recommandation éligible',
      compatibilityIndexLabel: 'Indice de compatibilité',
      compatibilityDisclaimer: 'Indice agronomique/hydrique pondéré — non une probabilité de succès',
      whyRecommendedLabel: 'Pourquoi cette culture',
      soilHealthHeader: 'Santé des sols & enracinement',
      waterClimateHeader: 'Adéquation hydrique & climatique',
      socioEconomicHeader: 'Adéquation socio-économique & culturelle',
      cautionsHeader: 'Précautions agronomiques',
      missingInfoHeader: 'Données manquantes ou non vérifiées',
      referencesHeader: 'Références scientifiques',
      excludedCropsToggle: 'Cultures exclues & filtres de sécurité',
      evidenceDistinctionToggle: 'Distinction des preuves (Mesuré vs Calculé vs Supposé)',
      measuredLabel: 'Mesuré / Récupéré',
      calculatedLabel: 'Indicateurs calculés',
      assumptionsLabel: 'Hypothèses contextuelles',
      selectCropForRotationHint: 'Sélectionnez une culture actuelle ou récoltée ci-dessus pour lancer le conseiller de rotation.',
    },
    transitionBridge: {
      sectionTitle: 'Pont de Transition Culturale (Planificateur Graduel)',
      sectionSubtitle: 'Planification déterministe sur 3–4 saisons vers une rotation durable adaptée à vos moyens',
      hemisphereLabel: 'Calendrier hémisphérique :',
      hemisphereNorthern: 'Hémisphère Nord',
      hemisphereSouthern: 'Hémisphère Sud',
      hemisphereEquatorial: 'Ceinture Équatoriale',
      badgePlansReady: 'Trajectoires de transition prêtes',
      badgeInsufficientData: 'Données climatiques ou pédologiques insuffisantes',
      badgeNoFeasible: 'Aucune transition réalisable sous ces contraintes',
      badgeInvalidSequence: 'Séquence de cultures invalide',
      sectionATitle: 'A. Rotation actuelle & diagnostic initial',
      currentSequenceLabel: 'Séquence culturale actuelle (plus ancienne → plus récente)',
      addCropPlaceholder: 'Ajouter une culture à la séquence...',
      addToSequenceBtn: 'Ajouter',
      seedFromConfigBtn: 'Importer culture active / précédente',
      emptySequenceHint: 'Ajoutez au moins une culture récente (ex. Blé → Blé) pour diagnostiquer la rotation et calculer la transition.',
      repeatedFamiliesLabel: 'Familles botaniques répétées :',
      diseaseRisksLabel: 'Risques phytosanitaires :',
      nutrientWeaknessesLabel: 'Faiblesses en nutriments / sol :',
      waterConcentrationLabel: 'Concentration de la demande en eau :',
      rootRepetitionYes: 'Répétition de profondeur racinaire',
      rootRepetitionNo: 'Variation racinaire satisfaisante',
      missingDiversityLabel: 'Manques de diversité fonctionnelle :',
      opportunitiesLabel: 'Opportunités de transition :',
      soilConditionLabel: 'État documenté du sol :',
      sectionBTitle: 'B. Chronologie du Pont de Transition',
      stageCurrentSystem: 'SYSTÈME ACTUEL',
      stageTransition: 'TRANSITION',
      stageTargetSystem: 'SYSTÈME CIBLE',
      seasonPrefix: 'Saison',
      changeRetained: 'Maintenue (Familière)',
      changeMinorAdjustment: 'Ajustement mineur',
      changeNewIntroduction: 'Nouvelle introduction',
      difficultyLabel: 'Difficulté',
      diffLow: 'Faible',
      diffModerate: 'Modérée',
      diffHigh: 'Élevée',
      waterClassLabel: 'Demande en eau',
      waterLowMod: 'Faible–Modérée',
      waterModerate: 'Modérée',
      waterHigh: 'Élevée',
      estEtcLabel: 'ETc estimée',
      reasonSelectedLabel: 'Pourquoi ce choix à cette saison',
      soilConsiderationLabel: 'Santé du sol',
      nitrogenNoteLabel: 'Azote & résidus',
      mainBenefitLabel: 'Bénéfice agronomique principal',
      risksLimitsLabel: 'Risques & limites',
      farmerActionsLabel: 'Actions requises',
      sectionCTitle: 'C. Comparer les trajectoires de transition',
      pathwayRecommended: 'Trajectoire Recommandée (Équilibrée)',
      pathwayConservative: 'Trajectoire Conservatrice (Changement minimal)',
      pathwayAlternative: 'Trajectoire Alternative (Sobriété eau/intrants)',
      selectedBadge: 'Sélectionnée',
      selectPathwayBtn: 'Examiner',
      changesCountLabel: 'Changements vs actuel',
      planningScoreLabel: 'Indice de planification',
      planningScoreDisclaimer: 'Score pondéré multicritère — non une probabilité de succès',
      advantagesLabel: 'Avantages principaux',
      limitationsLabel: 'Limites économiques & opérationnelles',
      tradeOffLabel: 'Compromis principal',
      criteriaBreakdownToggle: 'Détail des critères et poids du graphe (Dijkstra)',
      critAgronomic: 'Compatibilité agronomique',
      critSoil: 'Objectifs santé du sol',
      critWater: 'Disponibilité en eau',
      critEconomic: 'Faisabilité économique',
      critMinimality: 'Minimalité des changements',
      critFarmerPref: 'Préférences agriculteur',
      critSeasonal: 'Saisonnalité hémisphérique',
      weightShort: 'Poids',
      sectionDTitle: 'D. Justification scientifique & effets cumulés',
      qaWhyChange: 'Pourquoi modifier la rotation ?',
      qaWhatPreserved: 'Qu\'est-ce qui est préservé ?',
      qaRisksReduced: 'Quels risques sont réduits ?',
      qaIfRejected: 'Et si une culture proposée est rejetée ?',
      qaAssumptions: 'Quelles hypothèses influencent ce plan ?',
      dimDiversity: 'Diversité botanique',
      dimSoilHealth: 'Santé du sol',
      dimWaterFit: 'Adéquation hydrique',
      dimEconomicFit: 'Faisabilité éco.',
      dimSeasonalFit: 'Saisonnalité',
      evalSuitable: 'Adapté',
      evalCaution: 'Prudence',
      evalInsufficientData: 'Données insuffisantes',
      cumulativeTitle: 'Effets cumulés sur l\'horizon',
      cumQuantified: 'Calculs quantifiés',
      cumQualitative: 'Attentes agronomiques qualitatives',
      cumUnverified: 'Résultats futurs non vérifiés (jamais fabriqués)',
      dataSourcesTitle: 'Sources de données & catégories',
      catMeasuredRetrieved: 'Mesuré / Récupéré',
      catModelEstimate: 'Estimation modèle',
      catCalculated: 'Calculé (FAO-56 / SCS)',
      catUserProvided: 'Saisi par l\'agriculteur',
      catMissing: 'Données manquantes',
      assumptionsTitle: 'Hypothèses actives',
      sectionETitle: 'E. Décisions de l\'agriculteur & contraintes',
      horizonLabel: 'Horizon de planification',
      seasons3: '3 Saisons',
      seasons4: '4 Saisons',
      maxCostTierLabel: 'Plafond de coût des intrants',
      costAuto: 'Auto selon profil',
      costLow: 'Faibles intrants uniquement',
      costModerate: 'Intrants modérés max',
      costHigh: 'Investissement élevé permis',
      irrigationQuotaLabel: 'Quota d\'irrigation saisonnier (mm/saison — optionnel)',
      irrigationQuotaPlaceholder: 'Ex: 250 (vide = auto)',
      unfamiliarCropsLabel: 'Autoriser des cultures peu familières',
      unfamiliarAuto: 'Auto (selon pratique)',
      unfamiliarYes: 'Oui — diversification ouverte',
      unfamiliarNo: 'Non — cultures familières uniquement',
      soilObservationLabel: 'Observation terrain du sol (Optionnel)',
      soilObservationPlaceholder: 'Ex : compaction, faible matière organique...',
      perCropDecisionsLabel: 'Décisions par culture proposée',
      decisionAccept: 'Accepter',
      decisionReject: 'Rejeter',
      decisionUnavailable: 'Indisponible',
      decisionClear: 'Effacer',
      resetDecisionsBtn: 'Réinitialiser',
      recalculateBtn: 'Recalculer la transition',
      sectionFTitle: 'F. Rapport imprimable de transition',
      openReportBtn: 'Ouvrir le rapport imprimable',
      exportJsonBtn: 'Exporter JSON',
      reportModalTitle: 'Rapport de Transition Culturale — TURBA',
      reportModalSubtitle: 'Plan graduel basé sur FAO-56, NASA POWER et hydraulique des sols',
      printReportBtn: 'Imprimer le rapport',
      reportParcelSummary: 'Résumé parcelle & contexte géographique',
      reportConfidenceLimitations: 'Confiance scientifique & limites',
      blockingReasonsTitle: 'Raisons de blocage',
      confidenceReasonsTitle: 'Facteurs de confiance',
      waterConcLowMod: 'Faible à modéré',
      waterConcModerate: 'Modéré',
      waterConcHigh: 'Élevé',
      waterConcMixed: 'Mixte',
      waterConcUnknown: 'Inconnu',
      strategyATag: 'Stratégie A — Rotation actuelle',
      baselineTimelineTitle: 'Séquence actuelle & familles botaniques',
      baselineMissingTitle: 'Informations manquantes limitant le diagnostic initial',
      familyBreakLabel: 'Rupture famille',
      sameFamilyRepeatLabel: 'Répétition famille',
      rootDepthShort: 'Racine Zr',
      resilienceFocusLabel: 'Priorité de résilience (Stratégie C)',
      focusAuto: 'Auto selon profil',
      focusWaterConservation: 'Sobriété hydrique',
      focusSoilStructure: 'Structure du sol & diversité racinaire',
      focusNutrientCycling: 'Cycle des nutriments & légumineuses',
      focusForageProduction: 'Fourrages & polyculture-élevage',
      focusFinancialAccessibility: 'Accessibilité financière (intrants réduits)',
      focusClimateResilience: 'Résilience climatique & thermique',
      residueHandlingLabel: 'Gestion des résidus de culture',
      primaryObjectiveLabel: 'Objectif agricole prioritaire',
      explain8Title: 'Fiche explicative complète (8 axes)',
      exWhyGenerated: '1. Pourquoi cette stratégie a été générée',
      exPrioritiesAddressed: '2. Priorités et contraintes traitées',
      exEnvDrivers: '3. Déterminants environnementaux & agronomiques',
      exExpectedBenefits: '4. Bénéfices attendus',
      exRisksTradeoffs: '5. Risques, limites & compromis',
      exFarmerActions: '6. Actions et préparations requises',
      exSourcesLimits: '7. Sources, unités & limites scientifiques',
      exMissingConfidence: '8. Informations manquantes & niveau de confiance',
    },
    landMemory: {
      title: 'Mémoire Vivante de la Terre (ذاكرة الأرض)',
      subtitle: 'Historique persistant reliant saisons culturales, captures environnementales, recommandations immuables et bilans réels',
      storageDisclosure: 'Persistance locale : données stockées dans localStorage isolées par parcelle (aucune base distante configurée). Exportez régulièrement en JSON.',
      navOverview: 'Vue d’ensemble',
      navTimeline: 'Chronologie',
      navPredictionReality: 'Prévision vs Réalité',
      navLandFutures: 'Trajectoires Futures',
      navAddSeason: 'Ajouter / Éditer Saison',
      navEvidenceDetails: 'Sources & Preuves',
      addSeasonBtn: 'Enregistrer une saison',
      editSeasonBtn: 'Modifier',
      exportBackupBtn: 'Exporter JSON',
      importBackupBtn: 'Importer JSON',
      importSuccess: 'Sauvegarde importée avec succès pour cette parcelle.',
      importError: 'Fichier JSON invalide ou corrompu.',
      fieldSummaryTitle: 'Identité & Géométrie Vérifiée de la Parcelle',
      fieldIdLabel: 'ID Parcelle',
      precisionLabel: 'Précision spatiale',
      boundaryStatusDrawn: 'Polygone tracé par l’utilisateur',
      boundaryStatusPointOnly: 'Point seul (aucune limite supposée)',
      areaLabel: 'Superficie vérifiée',
      areaUnknown: 'Indisponible (aucun polygone tracé)',
      seasonsRecordedCount: 'Saisons enregistrées',
      snapshotsRecordedCount: 'Instantanés archivés',
      outcomesRecordedCount: 'Bilans réels saisis',
      missingHistoryCount: 'Saisons incomplètes',
      noBoundaryWarning: 'Attention : Ces coordonnées correspondent à un point ou GPS sans limites parcellaires. La superficie reste nulle tant qu’aucun polygone n’est tracé.',
      recentHighlightsTitle: 'Synthèse Déterministe de la Mémoire',
      emptySeasonsTitle: 'Aucune saison agricole enregistrée',
      emptySeasonsDesc: 'La Mémoire de la Terre démarre strictement vide sans aucun historique fictif. Ajoutez votre première saison réelle.',
      emptySnapshotsNotice: 'Les instantanés immuables s’archivent automatiquement dès que vous utilisez l’irrigation, la rotation ou le pont de transition.',
      originFarmerReport: 'Déclaration agriculteur',
      originImportedRecord: 'Archive importée',
      originVerifiedMeasurement: 'Mesure vérifiée / labo',
      originCalculated: 'Calcul déterministe',
      originSpatialEstimate: 'Estimation spatiale/grille',
      originSystemAnalysis: 'Analyse système',
      qualityVerified: 'Mesure vérifiée',
      qualityFarmerReported: 'Saisi agriculteur',
      qualityEstimated: 'Estimation modèle/grille',
      qualityCalculated: 'Calculé',
      qualityMissing: 'Données manquantes',
      qualityOutdated: 'Données anciennes',
      timelineFilterAll: 'Tout',
      timelineFilterSeasons: 'Saisons',
      timelineFilterRecommendations: 'Recommandations',
      timelineFilterOutcomes: 'Bilans réels',
      timelineFilterGaps: 'Lacunes',
      timelineMissingDataTag: 'Incomplet',
      createdAtLabel: 'Créé le',
      updatedAtLabel: 'Modifié le',
      editHistoryLabel: 'Journal des modifications',
      seasonFormTitleAdd: 'Enregistrer une Saison (Sans valeurs par défaut fictives)',
      seasonFormTitleEdit: 'Modifier la Saison',
      cropCatalogLabel: 'Sélectionner une culture du catalogue',
      customCropOption: 'Autre culture / Saisie libre',
      cropNameLabel: 'Nom de la culture *',
      cropFamilyLabel: 'Famille botanique',
      seasonStartLabel: 'Début de saison (YYYY-MM-DD ou YYYY-MM) *',
      seasonEndLabel: 'Fin de saison',
      plantingDateLabel: 'Date exacte de semis',
      harvestDateLabel: 'Date exacte de récolte',
      previousCropLabel: 'Culture précédente sur la parcelle',
      irrigationMethodLabel: 'Méthode d’irrigation',
      irrigationAmountMmLabel: 'Dose d’irrigation appliquée (mm — laisser vide si inconnue)',
      irrigationAmountHint: 'N’inscrivez pas 0 si la dose est inconnue ; laissez vide pour préserver l’information manquante.',
      fertilizerLabel: 'Engrais & amendements',
      practicesLabel: 'Pratiques culturales (travail du sol, résidus...)',
      evidenceRefsLabel: 'Références justificatives (séparées par virgule)',
      notesLabel: 'Observations de terrain',
      editNoteLabel: 'Motif de modification (journal)',
      saveSeasonBtn: 'Enregistrer la saison',
      predictionRealityTitle: 'Comparaison Prévision vs Réalité',
      predictionRealitySubtitle: 'Contrôle strict de compatibilité d’unités, périodes et analyses de sol avant toute comparaison',
      recStatusLabel: 'Statut de la décision',
      statusProposed: 'Proposée',
      statusAccepted: 'Acceptée',
      statusRejected: 'Rejetée',
      statusModified: 'Modifiée',
      statusNotRecorded: 'Non renseignée',
      reportOutcomeBtn: 'Saisir le bilan réel',
      editOutcomeBtn: 'Modifier le bilan réel',
      actualCropLabel: 'Culture réellement semée',
      actualPlantingDateLabel: 'Date réelle de semis',
      actualHarvestDateLabel: 'Date réelle de récolte',
      actualIrrAmountLabel: 'Dose d’irrigation réelle',
      actualIrrUnitLabel: 'Unité',
      observedConditionLabel: 'État observé de la culture',
      condGood: 'Bon état',
      condModerateStress: 'Stress modéré',
      condSevereStress: 'Stress sévère',
      condFailed: 'Échec cultural',
      condNotReported: 'Non renseigné',
      yieldValueLabel: 'Rendement réel mesuré (si connu)',
      yieldUnitLabel: 'Unité rendement',
      waterShortageLabel: 'Manque d’eau observé ?',
      yesLabel: 'Oui',
      noLabel: 'Non',
      unknownLabel: 'Inconnu',
      pestObservationsLabel: 'Ravageurs ou maladies observés',
      recordedRainMmLabel: 'Pluie mesurée sur la période (mm — optionnel)',
      recordedRainSourceLabel: 'Source pluviométrique',
      postSeasonSocLabel: 'Carbone organique labo post-saison % (optionnel)',
      postSeasonSocHint: 'Uniquement depuis une véritable analyse de laboratoire parcellaire.',
      farmerAssessmentLabel: 'Bilan de l’agriculteur',
      saveOutcomeBtn: 'Enregistrer et comparer',
      expectedCol: 'Prévision / Cible',
      actualCol: 'Réalité observée',
      deltaCol: 'Écart',
      comparableBadge: 'Comparable',
      incompatibleBadge: 'Incompatible / Bloqué',
      awaitingOutcomeBadge: 'En attente de bilan',
      futuresTitle: 'Trajectoires Futures de la Terre',
      futuresSubtitle: 'Comparaison déterministe de 3 scénarios fondée sur vos saisons réelles, déficits signalés et données sol/climat',
      deterministicNoticeTitle: 'Règles déterministes fondées sur les preuves (sans IA/ML opaque)',
      rememberedSequenceLabel: 'Séquence mémorisée depuis l’historique',
      familyConflictsLabel: 'Conflits de familles botaniques détectés',
      waterShortagesLoggedLabel: 'Signalements de manque d’eau',
      recDeltaTitle: 'Évolution entre les deux dernières recommandations',
      triggersTitle: 'Nouvelles données ayant déclenché ce changement',
      blockingMissingTitle: 'Archives manquantes limitant la fiabilité',
      hardConstraintsTitle: 'Contraintes strictes appliquées',
      rankingPreferencesTitle: 'Préférences pondérées appliquées',
      verificationConditionsTitle: 'Vérifications locales requises avant mise en œuvre',
      pathATitle: 'Scénario A : Maintien de la pratique actuelle',
      pathBTitle: 'Scénario B : Transition durable graduelle',
      pathCTitle: 'Scénario C : Alternative résiliente / sobre en intrants',
      evidenceDetailsTitle: 'Sources scientifiques, résolutions & limites',
      evidenceDetailsSubtitle: 'Séparation stricte entre réanalyses maillées (~50 km), NWP, SoilGrids 250 m et catalogue Sentinel-2',
      chartHistoryTitle: 'Historique réel des captures environnementales',
      chartNoSeriesNotice: 'Les séries graphiques apparaîtront dès l’accumulation de plusieurs captures environnementales pour cette parcelle.',
      colSourceProvider: 'Fournisseur',
      colVariable: 'Variable',
      colValueUnit: 'Valeur & Unité',
      colRefDate: 'Date de référence',
      colRetrievalTime: 'Horodatage',
      colResolution: 'Résolution',
      colOriginQuality: 'Origine & Qualité',
      colLimitations: 'Limites scientifiques',
    },
  },
};
