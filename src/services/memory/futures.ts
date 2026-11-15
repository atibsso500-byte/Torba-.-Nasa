/**
 * TURBA — THE LIVING LAND MEMORY (ذاكرة الأرض)
 * Land Futures & Deterministic Rule-Based Evidence Learning Engine
 *
 * Strictly transparent & deterministic:
 * - Remembers real past crop sequences and botanical families from `SeasonRecord[]`.
 * - Flags repeated botanical family pathogen buildup across recorded seasons.
 * - Tracks recurring farmer-reported water shortages (`observedWaterShortage === true`).
 * - Explains explicitly how the latest recommendation differs from the previous snapshot
 *   and which newly recorded field data triggered that difference.
 * - Calls `generateRotationTransitionPlan()` using remembered history + learned constraints.
 * - Explicitly discloses: NOT machine learning or autonomous AI inference.
 */

import { getGlobalRotationCropById } from '../../data/crops';
import { NasaGpmObservation, NasaPowerObservation } from '../../types/farm';
import {
  CropResidueManagement,
  DailyMeteoRecord,
  FarmerContextProfile,
  PersistedTransitionState,
  SoilHydraulicResult,
} from '../../types/irrigation';
import { generateRotationTransitionPlan } from '../irrigation/rotationEngine';
import {
  FieldMemory,
  LandFuturesAssessment,
  LearningContextSummary,
  RecommendationSnapshot,
  ReportedOutcomeRecord,
  SeasonRecord,
} from './types';

export function deriveEvidenceLearningContext(params: {
  fieldId: string;
  seasons: SeasonRecord[];
  recommendations: RecommendationSnapshot[];
  outcomes: ReportedOutcomeRecord[];
}): LearningContextSummary {
  const { fieldId, seasons, recommendations, outcomes } = params;
  const nowIso = new Date().toISOString();

  const sortedSeasons = [...seasons].sort((a, b) => a.seasonStart.localeCompare(b.seasonStart));
  const rememberedSequenceCropIds: string[] = [];
  for (const s of sortedSeasons) {
    if (s.cropId) {
      rememberedSequenceCropIds.push(s.cropId);
    }
  }

  // Fallback check: if seasons empty, check if an actualCropId was reported in an outcome
  if (rememberedSequenceCropIds.length === 0) {
    const sortedOutcomes = [...outcomes].sort((a, b) => a.reportedAt.localeCompare(b.reportedAt));
    for (const o of sortedOutcomes) {
      if (o.actualCropId) rememberedSequenceCropIds.push(o.actualCropId);
    }
  }

  const mostRecentCropId =
    rememberedSequenceCropIds.length > 0
      ? rememberedSequenceCropIds[rememberedSequenceCropIds.length - 1]
      : null;

  // Detect repeated botanical family conflicts across recorded seasons
  const conflicts: LearningContextSummary['detectedRepeatedFamilyConflicts'] = [];
  for (let i = 1; i < sortedSeasons.length; i++) {
    const prev = sortedSeasons[i - 1];
    const curr = sortedSeasons[i];
    const prevFam = prev.cropFamily || getGlobalRotationCropById(prev.cropId)?.family || null;
    const currFam = curr.cropFamily || getGlobalRotationCropById(curr.cropId)?.family || null;
    if (prevFam && currFam && prevFam === currFam) {
      const existing = conflicts.find((c) => c.family === currFam);
      if (existing) {
        if (!existing.seasonIds.includes(curr.seasonId)) {
          existing.seasonIds.push(curr.seasonId);
          existing.cropIds.push(curr.cropId);
        }
      } else {
        conflicts.push({
          family: currFam,
          seasonIds: [prev.seasonId, curr.seasonId],
          cropIds: [prev.cropId, curr.cropId],
        });
      }
    }
  }

  // Track farmer-reported water shortages
  const shortageOutcomes = outcomes.filter((o) => o.observedWaterShortage === true);
  const recurringWaterShortageCount = shortageOutcomes.length;

  let waterShortageWarningEn: string | null = null;
  let waterShortageWarningAr: string | null = null;
  let waterShortageWarningFr: string | null = null;
  if (recurringWaterShortageCount >= 2) {
    waterShortageWarningEn = `${recurringWaterShortageCount} past outcomes reported field water shortage. Deterministic rule prioritizes lower-water / drought-resilient crops unless an explicit seasonal irrigation quota is confirmed.`;
    waterShortageWarningAr = `أبلغ الفلاح عن نقص في المياه خلال ${recurringWaterShortageCount} مواسم سابقة. القاعدة الحتمية تُعطي أولوية للمحاصيل الأقل استهلاكاً للماء ما لم تتوفر حصة ري مؤكدة.`;
    waterShortageWarningFr = `${recurringWaterShortageCount} bilans passés signalent un déficit hydrique. La règle déterministe privilégie les cultures sobres tant qu'un quota d'irrigation n'est pas confirmé.`;
  } else if (recurringWaterShortageCount === 1) {
    waterShortageWarningEn =
      '1 previous outcome reported water shortage; high-water-demand sequences carry a field stress caution.';
    waterShortageWarningAr =
      'تم تسجيل نقص مياه في نتيجة سابقة واحدة؛ المسارات عالية الاستهلاك المائي تخضع لتحفظ ميداني.';
    waterShortageWarningFr =
      '1 résultat antérieur a signalé un manque d’eau ; les séquences très exigeantes portent une alerte de prudence.';
  }

  // Identify missing records limiting deterministic reliability
  const missingEn: string[] = [];
  const missingAr: string[] = [];
  const missingFr: string[] = [];

  if (sortedSeasons.length === 0) {
    missingEn.push('No agricultural seasons recorded yet for this parcel.');
    missingAr.push('لا توجد مواسم زراعية مسجلة بعد لهذه القطعة.');
    missingFr.push("Aucune saison agricole n'a encore été enregistrée pour cette parcelle.");
  }

  const incompleteSeasons = sortedSeasons.filter((s) => s.isIncomplete);
  if (incompleteSeasons.length > 0) {
    missingEn.push(
      `${incompleteSeasons.length} recorded season(s) have incomplete details (e.g. missing irrigation volume, dates, or previous crop).`
    );
    missingAr.push(
      `${incompleteSeasons.length} موسم(مواسم) مسجل(ة) تنقصها تفاصيل (مثل كمية الري أو التواريخ أو المحصول السابق).`
    );
    missingFr.push(
      `${incompleteSeasons.length} saison(s) enregistrée(s) restent incomplètes (volume d'irrigation, dates ou précédent manquants).`
    );
  }

  const outcomeRecIds = new Set(outcomes.map((o) => o.recommendationId));
  const pendingRecs = recommendations.filter((r) => !outcomeRecIds.has(r.recommendationId));
  if (recommendations.length > 0 && pendingRecs.length > 0) {
    missingEn.push(
      `${pendingRecs.length} saved recommendation snapshot(s) have no farmer-reported outcome yet.`
    );
    missingAr.push(
      `${pendingRecs.length} توصية محفوظة لا تزال بدون تسجيل للنتيجة الفعلية في الحقل.`
    );
    missingFr.push(
      `${pendingRecs.length} instantané(s) de recommandation n'ont pas encore de retour terrain.`
    );
  }

  const hasAnyLabSoil = recommendations.some((r) => r.inputSnapshot.soilSourceKind === 'farmer_lab') ||
    outcomes.some((o) => o.measuredPostSeasonSocPct !== null);
  if (!hasAnyLabSoil) {
    missingEn.push('No parcel-level laboratory soil test recorded (using 250 m SoilGrids / Table 19 estimates).');
    missingAr.push('لا يوجد تحليل مخبري للتربة على مستوى القطعة (يعتمد النظام على تقدير SoilGrids 250م أو جدول الفاو).');
    missingFr.push('Aucune analyse de laboratoire parcellaire (estimations SoilGrids 250 m / Table 19 utilisées).');
  }

  // Analyze delta between latest and previous recommendation snapshots
  const sortedRecs = [...recommendations].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const latestRec = sortedRecs.length >= 1 ? sortedRecs[sortedRecs.length - 1] : null;
  const prevRec = sortedRecs.length >= 2 ? sortedRecs[sortedRecs.length - 2] : null;

  let changedCropsOrPathway = false;
  const triggersEn: string[] = [];
  const triggersAr: string[] = [];
  const triggersFr: string[] = [];

  let deltaSummaryEn =
    'Fewer than 2 recommendation snapshots recorded; subsequent runs will show how new field records alter guidance.';
  let deltaSummaryAr =
    'يتطلب رصد تغير التوصيات حفظ توصيتين على الأقل؛ ستظهر التعديلات الناتجة عن المعطيات الجديدة هنا.';
  let deltaSummaryFr =
    "Moins de 2 instantanés enregistrés ; l'évolution des recommandations apparaîtra dès la prochaine analyse.";

  if (prevRec && latestRec) {
    const prevKey = [
      prevRec.proposedSummary.primaryCropId || '',
      ...(prevRec.proposedSummary.strategyBSequence || prevRec.proposedSummary.proposedCropIds),
      prevRec.proposedSummary.irrigationDecisionStatus || '',
    ].join('|');
    const latestKey = [
      latestRec.proposedSummary.primaryCropId || '',
      ...(latestRec.proposedSummary.strategyBSequence || latestRec.proposedSummary.proposedCropIds),
      latestRec.proposedSummary.irrigationDecisionStatus || '',
    ].join('|');

    changedCropsOrPathway = prevKey !== latestKey;

    // Find new events that arrived after prevRec.createdAt and before/at latestRec.createdAt
    const newSeasons = sortedSeasons.filter(
      (s) => s.createdAt > prevRec.createdAt && s.createdAt <= latestRec.createdAt
    );
    const newOutcomes = outcomes.filter(
      (o) => o.reportedAt > prevRec.createdAt && o.reportedAt <= latestRec.createdAt
    );

    if (newSeasons.length > 0) {
      triggersEn.push(
        `${newSeasons.length} newly added season record(s): ${newSeasons.map((s) => s.cropName).join(', ')}`
      );
      triggersAr.push(
        `إضافة ${newSeasons.length} سجل(سجلات) موسم جديد: ${newSeasons.map((s) => s.cropName).join('، ')}`
      );
      triggersFr.push(
        `${newSeasons.length} nouvelle(s) saison(s) ajoutée(s) : ${newSeasons.map((s) => s.cropName).join(', ')}`
      );
    }
    if (newOutcomes.length > 0) {
      const shortageNew = newOutcomes.some((o) => o.observedWaterShortage === true);
      triggersEn.push(
        `${newOutcomes.length} new field outcome report(s)${shortageNew ? ' (including water shortage alert)' : ''}`
      );
      triggersAr.push(
        `إضافة ${newOutcomes.length} تقرير نتيجة حقلية${shortageNew ? ' (يتضمن تنبيه نقص المياه)' : ''}`
      );
      triggersFr.push(
        `${newOutcomes.length} nouveau(x) bilan(s) terrain${shortageNew ? ' (avec déficit hydrique)' : ''}`
      );
    }
    if (prevRec.inputSnapshot.soilSourceKind !== latestRec.inputSnapshot.soilSourceKind) {
      triggersEn.push(
        `Soil data source changed (${prevRec.inputSnapshot.soilSourceKind} → ${latestRec.inputSnapshot.soilSourceKind})`
      );
      triggersAr.push(
        `تغير مصدر بيانات التربة (${prevRec.inputSnapshot.soilSourceKind} ← ${latestRec.inputSnapshot.soilSourceKind})`
      );
      triggersFr.push(
        `Source de sol modifiée (${prevRec.inputSnapshot.soilSourceKind} → ${latestRec.inputSnapshot.soilSourceKind})`
      );
    }
    if (triggersEn.length === 0) {
      triggersEn.push('Updated NASA POWER / Open-Meteo environmental conditions or farmer parameters');
      triggersAr.push('تحديث المعطيات المناخية لوكالة ناسا / Open-Meteo أو تفضيلات الفلاح');
      triggersFr.push('Mise à jour des données météo NASA POWER / Open-Meteo ou paramètres agriculteur');
    }

    if (changedCropsOrPathway) {
      deltaSummaryEn = `Latest recommendation (${latestRec.kind}) shifted from prior snapshot (${prevRec.kind}) in response to updated field evidence.`;
      deltaSummaryAr = `تغيرت التوصية الأحدث مقارنة بالتوصية السابقة استناداً إلى المعطيات المسجلة حديثاً.`;
      deltaSummaryFr = `La dernière recommandation diffère de la précédente suite aux nouvelles informations enregistrées.`;
    } else {
      deltaSummaryEn = `Latest recommendation (${latestRec.kind}) remained consistent with the prior snapshot (${prevRec.kind}).`;
      deltaSummaryAr = `حافظت التوصية الأحدث على نفس التوجيه العام مقارنة بالتوصية السابقة.`;
      deltaSummaryFr = `La dernière recommandation reste cohérente avec l'instantané précédent.`;
    }
  }

  return {
    fieldId,
    generatedAt: nowIso,
    rememberedSequenceCropIds,
    mostRecentCropId,
    detectedRepeatedFamilyConflicts: conflicts,
    recurringWaterShortageCount,
    waterShortageWarningEn,
    waterShortageWarningAr,
    waterShortageWarningFr,
    missingRecordsBlockingReliabilityEn: missingEn,
    missingRecordsBlockingReliabilityAr: missingAr,
    missingRecordsBlockingReliabilityFr: missingFr,
    recommendationDelta: {
      hasPreviousRecommendation: Boolean(prevRec && latestRec),
      previousRecommendationId: prevRec?.recommendationId || null,
      previousCreatedAt: prevRec?.createdAt || null,
      latestRecommendationId: latestRec?.recommendationId || null,
      latestCreatedAt: latestRec?.createdAt || null,
      changedCropsOrPathway,
      deltaSummaryEn,
      deltaSummaryAr,
      deltaSummaryFr,
      triggeringNewInformationEn: triggersEn,
      triggeringNewInformationAr: triggersAr,
      triggeringNewInformationFr: triggersFr,
    },
    methodologyNoteEn:
      'Deterministic rule-based evidence memory (no hidden machine learning): TURBA tracks recorded crops, family repeats, water shortages, and verified soil/climate snapshots to adjust hard constraints and preference weights.',
    methodologyNoteAr:
      'ذاكرة قواعدية حتمية قائمة على الأدلة (وليست تعلماً آلياً غامضاً): تستند منصة تُربة إلى المحاصيل المسجلة وتكرار العائلات ونقص المياه المرصود وتحاليل التربة لضبط القيود وترتيب الأولويات.',
    methodologyNoteFr:
      'Mémoire déterministe fondée sur les preuves (sans apprentissage automatique caché) : TURBA exploite les cultures enregistrées, les répétitions de familles et les pénuries d’eau signalées pour ajuster contraintes et priorités.',
  };
}

export function generateLandFuturesAssessment(params: {
  fieldMemory: FieldMemory;
  seasons: SeasonRecord[];
  recommendations: RecommendationSnapshot[];
  outcomes: ReportedOutcomeRecord[];
  climate: {
    nasaPower: NasaPowerObservation | null;
    nasaGpm: NasaGpmObservation | null;
    historicalMeteoDays?: DailyMeteoRecord[];
    et0DailyValues?: Array<{ date: string; et0MmDay: number | null }>;
    elevationM?: number | null;
  };
  soil: SoilHydraulicResult | null;
  farmerContext: FarmerContextProfile;
  transitionState: PersistedTransitionState;
  previousCropResidue?: CropResidueManagement;
}): LandFuturesAssessment {
  const {
    fieldMemory,
    seasons,
    recommendations,
    outcomes,
    climate,
    soil,
    farmerContext,
    transitionState,
    previousCropResidue = 'unknown',
  } = params;

  const learningContext = deriveEvidenceLearningContext({
    fieldId: fieldMemory.fieldId,
    seasons,
    recommendations,
    outcomes,
  });

  // Determine the most authentic crop sequence from Land Memory + active transition config
  const rememberedGlobalCrops = learningContext.rememberedSequenceCropIds.filter((id) =>
    Boolean(getGlobalRotationCropById(id))
  );
  const effectiveSequence =
    rememberedGlobalCrops.length > 0
      ? rememberedGlobalCrops.slice(-4)
      : transitionState.currentSequence;

  // Inspect data sufficiency strictly BEFORE planning
  const hasClimate =
    (climate.nasaPower?.dataStatus === 'VERIFIED' && climate.nasaPower.temperature2m !== null) ||
    (climate.historicalMeteoDays && climate.historicalMeteoDays.length > 0);
  const hasSoil = Boolean(soil && soil.sourceKind !== 'unavailable' && soil.thetaFc.value !== null);

  if (!hasClimate || !hasSoil || effectiveSequence.length === 0) {
    const reasonsEn: string[] = [];
    const reasonsAr: string[] = [];
    const reasonsFr: string[] = [];

    if (effectiveSequence.length === 0) {
      reasonsEn.push('At least one recorded season crop is required to project Path A (Current Practice) vs transition futures.');
      reasonsAr.push('يلزم تسجيل محصول موسم واحد على الأقل لبناء مقارنة المسار الحالي مع البدائل المستقبلية.');
      reasonsFr.push('Au moins une culture enregistrée est nécessaire pour comparer les trajectoires futures.');
    }
    if (!hasClimate) {
      reasonsEn.push('NASA POWER or Open-Meteo climate observations are currently unavailable.');
      reasonsAr.push('بيانات المناخ من NASA POWER أو Open-Meteo غير متاحة حالياً.');
      reasonsFr.push('Les observations climatiques NASA POWER ou Open-Meteo sont actuellement indisponibles.');
    }
    if (!hasSoil) {
      reasonsEn.push('Verified soil hydraulic baseline (SoilGrids or Lab/Table 19) is unavailable.');
      reasonsAr.push('بيانات التربة الهيدروليكية (SoilGrids أو المختبر) غير متاحة.');
      reasonsFr.push('Les propriétés hydrauliques du sol (SoilGrids ou laboratoire) sont indisponibles.');
    }

    return {
      generatedAt: new Date().toISOString(),
      status: 'INSUFFICIENT_DATA',
      learningContext,
      transitionPlan: null,
      hardConstraintsAppliedEn: [],
      hardConstraintsAppliedAr: [],
      hardConstraintsAppliedFr: [],
      rankingPreferencesEn: [],
      rankingPreferencesAr: [],
      rankingPreferencesFr: [],
      insufficientReasonsEn: reasonsEn,
      insufficientReasonsAr: reasonsAr,
      insufficientReasonsFr: reasonsFr,
      localVerificationConditionsEn: [
        'Record at least one known crop season in Field History.',
        'Ensure NASA POWER / soil baseline data finished loading.',
      ],
      localVerificationConditionsAr: [
        'سجل موسماً زراعياً واحداً على الأقل في سجل القطعة.',
        'تأكد من تحميل بيانات المناخ والتربة الأساسية.',
      ],
      localVerificationConditionsFr: [
        "Enregistrez au moins une saison culturale dans l'historique.",
        'Vérifiez le chargement des données climat et sol.',
      ],
    };
  }

  // If farmer reported recurring water shortages (>= 2) and did not set a focus, bias Alternative Resilience toward water_conservation
  const effectiveFocus =
    transitionState.resilienceFocus ||
    (learningContext.recurringWaterShortageCount >= 2 ? 'water_conservation' : null);

  const transitionPlan = generateRotationTransitionPlan({
    coordinates: fieldMemory.coordinates,
    climate,
    soil: soil!,
    farmerContext,
    previousCropResidue,
    constraints: {
      currentSequence: effectiveSequence,
      horizonSeasons: transitionState.horizonSeasons,
      maxAcceptableCostTier: transitionState.maxAcceptableCostTier,
      availableIrrigationMmPerSeason: transitionState.availableIrrigationMmPerSeason,
      unfamiliarCropsAllowed: transitionState.unfamiliarCropsAllowed,
      observedSoilDegradationNote: transitionState.observedSoilDegradationNote || null,
      confirmedAvailableCrops: farmerContext.localContext.locallyAvailableCrops,
      cropDecisions: transitionState.cropDecisions,
      resilienceFocus: effectiveFocus,
    },
    verifiedRegionLabel: [fieldMemory.province, fieldMemory.region].filter(Boolean).join(', ') || null,
  });

  if (
    transitionPlan.status === 'INSUFFICIENT_DATA' ||
    transitionPlan.status === 'INVALID_SEQUENCE'
  ) {
    return {
      generatedAt: transitionPlan.generatedAt,
      status: 'INSUFFICIENT_DATA',
      learningContext,
      transitionPlan,
      hardConstraintsAppliedEn: [],
      hardConstraintsAppliedAr: [],
      hardConstraintsAppliedFr: [],
      rankingPreferencesEn: [],
      rankingPreferencesAr: [],
      rankingPreferencesFr: [],
      insufficientReasonsEn: transitionPlan.blockingReasonsEn,
      insufficientReasonsAr: transitionPlan.blockingReasonsAr,
      insufficientReasonsFr: transitionPlan.blockingReasonsFr,
      localVerificationConditionsEn: ['Review season crop IDs and missing soil/climate parameters.'],
      localVerificationConditionsAr: ['راجع أسماء المحاصيل المسجلة ومعطيات التربة والمناخ الناقصة.'],
      localVerificationConditionsFr: ['Vérifiez les cultures saisies et les paramètres sol/climat manquants.'],
    };
  }

  if (transitionPlan.status === 'NO_FEASIBLE_TRANSITION') {
    return {
      generatedAt: transitionPlan.generatedAt,
      status: 'NO_FEASIBLE_PATHWAY',
      learningContext,
      transitionPlan,
      hardConstraintsAppliedEn: transitionPlan.blockingReasonsEn,
      hardConstraintsAppliedAr: transitionPlan.blockingReasonsAr,
      hardConstraintsAppliedFr: transitionPlan.blockingReasonsFr,
      rankingPreferencesEn: [],
      rankingPreferencesAr: [],
      rankingPreferencesFr: [],
      insufficientReasonsEn: transitionPlan.blockingReasonsEn,
      insufficientReasonsAr: transitionPlan.blockingReasonsAr,
      insufficientReasonsFr: transitionPlan.blockingReasonsFr,
      localVerificationConditionsEn: [
        'Relax rejected crop exclusions or adjust maximum input cost/irrigation quota to test feasible futures.',
      ],
      localVerificationConditionsAr: [
        'خفف قيود الرفض أو عدّل سقف الكلفة أو حصة المياه لاختبار مسارات ممكنة.',
      ],
      localVerificationConditionsFr: [
        "Assouplissez les exclusions ou ajustez les plafonds de coût/d'eau pour explorer d'autres trajectoires.",
      ],
    };
  }

  // Separate hard constraints vs ranking preferences transparently
  const hardEn: string[] = [
    'Botanical family break checks across consecutive seasons (pathogen & pest break rules)',
    `Hemisphere seasonal calendar feasibility (${transitionPlan.hemisphere})`,
  ];
  const hardAr: string[] = [
    'قواعد كسر العائلات النباتية المتتالية للحد من أمراض التربة والآفات',
    `ملاءمة المواسم الزراعية لنصف الكرة الأرضية (${transitionPlan.hemisphere})`,
  ];
  const hardFr: string[] = [
    'Règles strictes de coupure entre familles botaniques consécutives',
    `Calendrier saisonnier adapté à l'hémisphère (${transitionPlan.hemisphere})`,
  ];

  if (transitionState.availableIrrigationMmPerSeason !== null) {
    hardEn.push(`Strict seasonal irrigation ceiling <= ${transitionState.availableIrrigationMmPerSeason} mm`);
    hardAr.push(`سقف صارم لحصة مياه الري <= ${transitionState.availableIrrigationMmPerSeason} مم/موسم`);
    hardFr.push(`Plafond strict d'irrigation <= ${transitionState.availableIrrigationMmPerSeason} mm/saison`);
  }
  if (transitionState.maxAcceptableCostTier) {
    hardEn.push(`Input cost tier ceiling <= ${transitionState.maxAcceptableCostTier}`);
    hardAr.push(`سقف تكلفة المدخلات <= ${transitionState.maxAcceptableCostTier}`);
    hardFr.push(`Plafond de coût des intrants <= ${transitionState.maxAcceptableCostTier}`);
  }
  const rejectedIds = Object.entries(transitionState.cropDecisions || {})
    .filter(([, st]) => st === 'rejected' || st === 'unavailable')
    .map(([id]) => id);
  if (rejectedIds.length > 0) {
    hardEn.push(`Farmer-excluded / unavailable crops removed: ${rejectedIds.join(', ')}`);
    hardAr.push(`محاصيل مستبعدة أو غير متوفرة بإرادة الفلاح: ${rejectedIds.join('، ')}`);
    hardFr.push(`Cultures exclues ou indisponibles : ${rejectedIds.join(', ')}`);
  }

  const prefEn: string[] = [
    `Primary farmer objective weighting: ${farmerContext.primaryGoal || 'balanced neutral'}`,
    'Minimizing sudden multi-crop disruptions while rewarding root & N-fixing diversity',
  ];
  const prefAr: string[] = [
    `ترجيح الهدف الزراعي المختار: ${farmerContext.primaryGoal || 'متوازن محايد'}`,
    'تقليص التغيير المفاجئ مع تفضيل التنوع الجذري والبقوليات المثبتة للآزوت',
  ];
  const prefFr: string[] = [
    `Pondération selon l'objectif principal : ${farmerContext.primaryGoal || 'équilibré neutre'}`,
    'Minimisation des ruptures brusques tout en valorisant la diversité racinaire et légumineuses',
  ];

  if (learningContext.recurringWaterShortageCount > 0) {
    prefEn.push(
      `Applied farmer water-shortage learning signal (${learningContext.recurringWaterShortageCount} past shortage report(s)) toward Path C resilience`
    );
    prefAr.push(
      `تم توظيف إشارة نقص المياه المتكررة (${learningContext.recurringWaterShortageCount} تقارير) في ترجيح المسار البديل المقاوم للإجهاد`
    );
    prefFr.push(
      `Prise en compte des ${learningContext.recurringWaterShortageCount} signalement(s) de pénurie d'eau dans le scénario C`
    );
  }

  const verifyEn: string[] = [
    'Confirm local certified seed, rhizobium inoculant, and input availability before sowing',
    'Verify parcel soil salinity, drainage, and actual seasonal rainfall/allocation at planting',
    'Record post-season applied irrigation (mm) and lab soil test to calibrate future cycles',
  ];
  const verifyAr: string[] = [
    'التحقق من توفر البذور المعتمدة واللقاح البكتيري للبقوليات محلياً قبل الزرع',
    'فحص ملوحة التربة وتصريفها ورصيد المياه الفعلي عند بداية كل موسم',
    'توثيق كمية الري الحقيقية (مم) وتحليل التربة بعد الحصاد لتحسين الدورات القادمة',
  ];
  const verifyFr: string[] = [
    'Vérifier la disponibilité locale des semences certifiées et inoculums avant semis',
    'Contrôler la salinité, le drainage et les ressources en eau réelles à la mise en place',
    'Enregistrer les doses réelles (mm) et analyses de sol après récolte pour ajuster les cycles suivants',
  ];

  return {
    generatedAt: transitionPlan.generatedAt,
    status: 'PLANS_READY',
    learningContext,
    transitionPlan,
    hardConstraintsAppliedEn: hardEn,
    hardConstraintsAppliedAr: hardAr,
    hardConstraintsAppliedFr: hardFr,
    rankingPreferencesEn: prefEn,
    rankingPreferencesAr: prefAr,
    rankingPreferencesFr: prefFr,
    insufficientReasonsEn: [],
    insufficientReasonsAr: [],
    insufficientReasonsFr: [],
    localVerificationConditionsEn: verifyEn,
    localVerificationConditionsAr: verifyAr,
    localVerificationConditionsFr: verifyFr,
  };
}
