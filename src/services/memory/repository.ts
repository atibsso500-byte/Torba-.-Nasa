/**
 * TURBA — THE LIVING LAND MEMORY (ذاكرة الأرض)
 * Persistent Storage Repository (Isolated per Owner Scope & Field ID)
 *
 * Architectural Note:
 * - Current runtime has no hosted SQL/Firebase database or user auth configured.
 * - Persistence uses browser localStorage under key `turba_land_memory_v1`
 *   with an automatic in-memory fallback Map for SSR/Node test environments.
 * - Strict isolation key: `${ownerId}::${fieldId}` guarantees one user/field
 *   never leaks seasons, recommendations, or outcomes into another.
 * - Supports full JSON backup export & validated import so farmers never lose records.
 */

import {
  EnvironmentalSnapshotRecord,
  FieldMemory,
  LandMemoryBackupPayload,
  LandMemoryProvenanceEntry,
  RecommendationSnapshot,
  RecommendationStatus,
  ReportedOutcomeRecord,
  SeasonRecord,
} from './types';
import {
  sanitizeBackupPayload,
  sanitizeStoredFieldMemory,
  sanitizeStoredOutcome,
  sanitizeStoredRecommendation,
  sanitizeStoredSeasonRecord,
} from './validation';

export const LAND_MEMORY_STORAGE_KEY = 'turba_land_memory_v1';
export const DEFAULT_LOCAL_OWNER_ID = 'local-unauthenticated';

export interface StoredFieldMemoryBundle {
  fieldMemory: FieldMemory;
  seasons: SeasonRecord[];
  recommendations: RecommendationSnapshot[];
  outcomes: ReportedOutcomeRecord[];
  environmentalSnapshots: EnvironmentalSnapshotRecord[];
  provenanceEntries: LandMemoryProvenanceEntry[];
}

type StoreShape = Record<string, StoredFieldMemoryBundle>;

// Fallback in-memory store when window.localStorage is unavailable (e.g. Node tests without shim)
let memoryFallbackStore: StoreShape = {};

export function normalizeOwnerScope(ownerId?: string | null): string {
  const clean = typeof ownerId === 'string' ? ownerId.trim() : '';
  return clean.length > 0 ? clean : DEFAULT_LOCAL_OWNER_ID;
}

export function makeFieldScopeKey(fieldId: string, ownerId?: string | null): string {
  return `${normalizeOwnerScope(ownerId)}::${fieldId.trim()}`;
}

function getStorageBackend(): Storage | null {
  try {
    if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis && globalThis.localStorage) {
      return globalThis.localStorage;
    }
  } catch {
    // Ignore restricted storage environments
  }
  return null;
}

function readAllBundles(): StoreShape {
  const storage = getStorageBackend();
  if (!storage) {
    return memoryFallbackStore;
  }

  try {
    const raw = storage.getItem(LAND_MEMORY_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }

    const sanitized: StoreShape = {};
    for (const [scopeKey, rawBundle] of Object.entries(parsed as Record<string, unknown>)) {
      if (!rawBundle || typeof rawBundle !== 'object' || Array.isArray(rawBundle)) continue;
      const b = rawBundle as Record<string, unknown>;
      const fm = sanitizeStoredFieldMemory(b.fieldMemory);
      if (!fm) continue;

      const seasons = Array.isArray(b.seasons)
        ? b.seasons
            .map(sanitizeStoredSeasonRecord)
            .filter((s): s is SeasonRecord => s !== null && s.fieldId === fm.fieldId)
        : [];
      const recommendations = Array.isArray(b.recommendations)
        ? b.recommendations
            .map(sanitizeStoredRecommendation)
            .filter(
              (r): r is RecommendationSnapshot =>
                r !== null && r.fieldId === fm.fieldId && r.ownerId === fm.ownerId
            )
        : [];
      const outcomes = Array.isArray(b.outcomes)
        ? b.outcomes
            .map(sanitizeStoredOutcome)
            .filter((o): o is ReportedOutcomeRecord => o !== null && o.fieldId === fm.fieldId)
        : [];
      const environmentalSnapshots = Array.isArray(b.environmentalSnapshots)
        ? (b.environmentalSnapshots.filter(
            (s): s is EnvironmentalSnapshotRecord =>
              Boolean(s) &&
              typeof s === 'object' &&
              typeof (s as EnvironmentalSnapshotRecord).snapshotId === 'string' &&
              (s as EnvironmentalSnapshotRecord).fieldId === fm.fieldId
          ) as EnvironmentalSnapshotRecord[])
        : [];
      const provenanceEntries = Array.isArray(b.provenanceEntries)
        ? (b.provenanceEntries.filter(
            (p): p is LandMemoryProvenanceEntry =>
              Boolean(p) &&
              typeof p === 'object' &&
              typeof (p as LandMemoryProvenanceEntry).provenanceId === 'string' &&
              (p as LandMemoryProvenanceEntry).fieldId === fm.fieldId
          ) as LandMemoryProvenanceEntry[])
        : [];

      sanitized[scopeKey] = {
        fieldMemory: fm,
        seasons,
        recommendations,
        outcomes,
        environmentalSnapshots,
        provenanceEntries,
      };
    }

    return sanitized;
  } catch {
    return {};
  }
}

function writeAllBundles(store: StoreShape): boolean {
  const storage = getStorageBackend();
  if (!storage) {
    memoryFallbackStore = store;
    return true;
  }

  try {
    storage.setItem(LAND_MEMORY_STORAGE_KEY, JSON.stringify(store));
    return true;
  } catch {
    // Fallback to in-memory copy if quota exceeded without crashing UI
    memoryFallbackStore = store;
    return false;
  }
}

export function isPersistentBrowserStorageActive(): boolean {
  return getStorageBackend() !== null;
}

export function getFieldBundle(
  fieldId: string,
  ownerId?: string | null
): StoredFieldMemoryBundle | null {
  if (!fieldId || !fieldId.trim()) return null;
  const store = readAllBundles();
  const key = makeFieldScopeKey(fieldId, ownerId);
  const found = store[key];
  if (!found) return null;
  const expectedOwner = normalizeOwnerScope(ownerId);
  if (found.fieldMemory.ownerId !== expectedOwner || found.fieldMemory.fieldId !== fieldId.trim()) {
    return null;
  }
  return found;
}

export function listFieldMemoriesForOwner(ownerId?: string | null): FieldMemory[] {
  const expectedOwner = normalizeOwnerScope(ownerId);
  const store = readAllBundles();
  return Object.values(store)
    .map((b) => b.fieldMemory)
    .filter((fm) => fm.ownerId === expectedOwner)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function upsertFieldMemory(
  draft: Omit<FieldMemory, 'createdAt' | 'updatedAt' | 'ownerId'> & {
    ownerId?: string | null;
    createdAt?: string;
  }
): FieldMemory {
  const ownerId = normalizeOwnerScope(draft.ownerId);
  const key = makeFieldScopeKey(draft.fieldId, ownerId);
  const store = readAllBundles();
  const existing = store[key];
  const nowIso = new Date().toISOString();

  const merged: FieldMemory = {
    fieldId: draft.fieldId.trim(),
    ownerId,
    createdAt: existing?.fieldMemory.createdAt || draft.createdAt || nowIso,
    updatedAt: nowIso,
    fieldName: draft.fieldName,
    region: draft.region,
    province: draft.province,
    coordinates: { ...draft.coordinates },
    boundaryGeometry:
      draft.boundaryGeometry && draft.boundaryGeometry.length >= 3
        ? draft.boundaryGeometry.map((pt) => ({ ...pt }))
        : existing?.fieldMemory.boundaryGeometry ?? null,
    area:
      draft.area !== null && Number.isFinite(draft.area) && draft.area > 0
        ? draft.area
        : existing?.fieldMemory.area ?? null,
    areaUnit:
      draft.area !== null && Number.isFinite(draft.area) && draft.area > 0
        ? 'ha'
        : existing?.fieldMemory.areaUnit ?? null,
    locationPrecision: draft.locationPrecision,
    cadastralReference: draft.cadastralReference ?? existing?.fieldMemory.cadastralReference ?? null,
    baselineAssessmentRef:
      draft.baselineAssessmentRef ?? existing?.fieldMemory.baselineAssessmentRef ?? null,
    notes: draft.notes ?? existing?.fieldMemory.notes ?? '',
  };

  store[key] = {
    fieldMemory: merged,
    seasons: existing?.seasons || [],
    recommendations: existing?.recommendations || [],
    outcomes: existing?.outcomes || [],
    environmentalSnapshots: existing?.environmentalSnapshots || [],
    provenanceEntries: existing?.provenanceEntries || [],
  };
  writeAllBundles(store);
  return merged;
}

export function saveSeasonRecord(
  fieldId: string,
  ownerId: string | null | undefined,
  seasonDraft: Omit<SeasonRecord, 'createdAt' | 'updatedAt' | 'editHistory'>,
  editNote?: string
): { saved: SeasonRecord; isEdit: boolean } | null {
  const key = makeFieldScopeKey(fieldId, ownerId);
  const store = readAllBundles();
  const bundle = store[key];
  if (!bundle) return null;

  const nowIso = new Date().toISOString();
  const existingIdx = bundle.seasons.findIndex((s) => s.seasonId === seasonDraft.seasonId);

  if (existingIdx >= 0) {
    const prev = bundle.seasons[existingIdx];
    const updated: SeasonRecord = {
      ...seasonDraft,
      fieldId: bundle.fieldMemory.fieldId,
      createdAt: prev.createdAt,
      updatedAt: nowIso,
      editHistory: [
        ...prev.editHistory,
        {
          editedAt: nowIso,
          note: editNote?.trim() || `Updated crop/management details (${seasonDraft.cropName})`,
        },
      ].slice(-30),
    };
    const nextSeasons = [...bundle.seasons];
    nextSeasons[existingIdx] = updated;
    nextSeasons.sort((a, b) => a.seasonStart.localeCompare(b.seasonStart));

    store[key] = {
      ...bundle,
      fieldMemory: { ...bundle.fieldMemory, updatedAt: nowIso },
      seasons: nextSeasons,
    };
    writeAllBundles(store);
    return { saved: updated, isEdit: true };
  }

  const created: SeasonRecord = {
    ...seasonDraft,
    fieldId: bundle.fieldMemory.fieldId,
    createdAt: nowIso,
    updatedAt: nowIso,
    editHistory: [],
  };
  const nextSeasons = [...bundle.seasons, created].sort((a, b) =>
    a.seasonStart.localeCompare(b.seasonStart)
  );
  store[key] = {
    ...bundle,
    fieldMemory: { ...bundle.fieldMemory, updatedAt: nowIso },
    seasons: nextSeasons,
  };
  writeAllBundles(store);
  return { saved: created, isEdit: false };
}

export function deleteSeasonRecord(
  fieldId: string,
  ownerId: string | null | undefined,
  seasonId: string
): boolean {
  const key = makeFieldScopeKey(fieldId, ownerId);
  const store = readAllBundles();
  const bundle = store[key];
  if (!bundle) return false;
  const before = bundle.seasons.length;
  const next = bundle.seasons.filter((s) => s.seasonId !== seasonId);
  if (next.length === before) return false;

  store[key] = {
    ...bundle,
    fieldMemory: { ...bundle.fieldMemory, updatedAt: new Date().toISOString() },
    seasons: next,
  };
  writeAllBundles(store);
  return true;
}

/**
 * Saves an immutable recommendation snapshot. Never overwrites prior recommendations.
 * Deduplicates ONLY when the most recent snapshot of the same kind has the exact
 * same `inputSignature` (unless `forceNewSnapshot === true`).
 */
export function appendRecommendationSnapshot(
  fieldId: string,
  ownerId: string | null | undefined,
  snapshot: RecommendationSnapshot,
  forceNewSnapshot = false
): { snapshot: RecommendationSnapshot; deduplicated: boolean } | null {
  const key = makeFieldScopeKey(fieldId, ownerId);
  const store = readAllBundles();
  const bundle = store[key];
  if (!bundle) return null;

  if (!forceNewSnapshot) {
    const latestOfKind = [...bundle.recommendations]
      .reverse()
      .find((r) => r.kind === snapshot.kind);
    if (latestOfKind && latestOfKind.inputSignature === snapshot.inputSignature) {
      return { snapshot: latestOfKind, deduplicated: true };
    }
  }

  const immutableCopy: RecommendationSnapshot = {
    ...snapshot,
    fieldId: bundle.fieldMemory.fieldId,
    ownerId: bundle.fieldMemory.ownerId,
  };

  store[key] = {
    ...bundle,
    fieldMemory: { ...bundle.fieldMemory, updatedAt: snapshot.createdAt },
    recommendations: [...bundle.recommendations, immutableCopy].slice(-100),
  };
  writeAllBundles(store);
  return { snapshot: immutableCopy, deduplicated: false };
}

export function updateRecommendationStatus(
  fieldId: string,
  ownerId: string | null | undefined,
  recommendationId: string,
  status: RecommendationStatus
): RecommendationSnapshot | null {
  const key = makeFieldScopeKey(fieldId, ownerId);
  const store = readAllBundles();
  const bundle = store[key];
  if (!bundle) return null;

  const idx = bundle.recommendations.findIndex((r) => r.recommendationId === recommendationId);
  if (idx < 0) return null;

  const nowIso = new Date().toISOString();
  const updated: RecommendationSnapshot = {
    ...bundle.recommendations[idx],
    status,
    statusUpdatedAt: nowIso,
  };
  const nextRecs = [...bundle.recommendations];
  nextRecs[idx] = updated;
  store[key] = {
    ...bundle,
    fieldMemory: { ...bundle.fieldMemory, updatedAt: nowIso },
    recommendations: nextRecs,
  };
  writeAllBundles(store);
  return updated;
}

export function saveOutcomeReport(
  fieldId: string,
  ownerId: string | null | undefined,
  outcome: ReportedOutcomeRecord
): ReportedOutcomeRecord | null {
  const key = makeFieldScopeKey(fieldId, ownerId);
  const store = readAllBundles();
  const bundle = store[key];
  if (!bundle) return null;

  // Enforce link to existing recommendation inside same field bundle
  const recExists = bundle.recommendations.some(
    (r) => r.recommendationId === outcome.recommendationId
  );
  if (!recExists) return null;

  const nowIso = new Date().toISOString();
  const existingIdx = bundle.outcomes.findIndex(
    (o) =>
      o.outcomeId === outcome.outcomeId || o.recommendationId === outcome.recommendationId
  );

  const sanitized: ReportedOutcomeRecord = {
    ...outcome,
    fieldId: bundle.fieldMemory.fieldId,
    reportedAt:
      existingIdx >= 0 ? bundle.outcomes[existingIdx].reportedAt : outcome.reportedAt || nowIso,
    updatedAt: nowIso,
  };

  const nextOutcomes = [...bundle.outcomes];
  if (existingIdx >= 0) {
    nextOutcomes[existingIdx] = sanitized;
  } else {
    nextOutcomes.push(sanitized);
  }

  store[key] = {
    ...bundle,
    fieldMemory: { ...bundle.fieldMemory, updatedAt: nowIso },
    outcomes: nextOutcomes,
  };
  writeAllBundles(store);
  return sanitized;
}

export function appendEnvironmentalSnapshot(
  fieldId: string,
  ownerId: string | null | undefined,
  snapshot: EnvironmentalSnapshotRecord,
  provenanceEntries: LandMemoryProvenanceEntry[]
): EnvironmentalSnapshotRecord | null {
  const key = makeFieldScopeKey(fieldId, ownerId);
  const store = readAllBundles();
  const bundle = store[key];
  if (!bundle) return null;

  const latest = bundle.environmentalSnapshots[bundle.environmentalSnapshots.length - 1];
  if (
    latest &&
    latest.nasaPowerDateUtc === snapshot.nasaPowerDateUtc &&
    latest.openMeteoObsTime === snapshot.openMeteoObsTime &&
    latest.sentinel2GranuleName === snapshot.sentinel2GranuleName &&
    latest.soilSourceKind === snapshot.soilSourceKind &&
    latest.soilThetaFc === snapshot.soilThetaFc
  ) {
    return latest;
  }

  const nextSnaps = [...bundle.environmentalSnapshots, snapshot].slice(-120);
  const retainedSnapIds = new Set(nextSnaps.map((s) => s.snapshotId));
  const retainedProvSet = new Set(nextSnaps.flatMap((s) => s.provenanceIds));

  const mergedProv = [...bundle.provenanceEntries, ...provenanceEntries]
    .filter((p) => retainedProvSet.has(p.provenanceId) || retainedSnapIds.has(snapshot.snapshotId))
    .slice(-500);

  store[key] = {
    ...bundle,
    fieldMemory: {
      ...bundle.fieldMemory,
      baselineAssessmentRef: snapshot.snapshotId,
      updatedAt: snapshot.capturedAt,
    },
    environmentalSnapshots: nextSnaps,
    provenanceEntries: mergedProv,
  };
  writeAllBundles(store);
  return snapshot;
}

export function exportFieldBackupPayload(
  fieldId: string,
  ownerId?: string | null
): LandMemoryBackupPayload | null {
  const bundle = getFieldBundle(fieldId, ownerId);
  if (!bundle) return null;

  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    ownerScope: bundle.fieldMemory.ownerId,
    fieldId: bundle.fieldMemory.fieldId,
    storageDisclosure:
      'Stored in browser localStorage (no remote cloud database configured). Retain exported JSON for permanent backup.',
    fieldMemory: bundle.fieldMemory,
    seasons: bundle.seasons,
    recommendations: bundle.recommendations,
    outcomes: bundle.outcomes,
    environmentalSnapshots: bundle.environmentalSnapshots,
    provenanceEntries: bundle.provenanceEntries,
  };
}

export function importFieldBackupPayload(
  rawPayload: unknown,
  targetOwnerId?: string | null
): { imported: boolean; fieldId: string | null; reason?: string } {
  const payload = sanitizeBackupPayload(rawPayload);
  if (!payload) {
    return {
      imported: false,
      fieldId: null,
      reason: 'Invalid or corrupted Land Memory backup JSON file.',
    };
  }

  const ownerId = normalizeOwnerScope(targetOwnerId);
  const key = makeFieldScopeKey(payload.fieldMemory.fieldId, ownerId);
  const store = readAllBundles();
  const nowIso = new Date().toISOString();

  store[key] = {
    fieldMemory: {
      ...payload.fieldMemory,
      ownerId,
      updatedAt: nowIso,
    },
    seasons: payload.seasons.sort((a, b) => a.seasonStart.localeCompare(b.seasonStart)),
    recommendations: payload.recommendations.map((r) => ({ ...r, ownerId })),
    outcomes: payload.outcomes,
    environmentalSnapshots: payload.environmentalSnapshots,
    provenanceEntries: payload.provenanceEntries,
  };

  writeAllBundles(store);
  return { imported: true, fieldId: payload.fieldMemory.fieldId };
}

export function deleteFieldBundle(fieldId: string, ownerId?: string | null): boolean {
  const key = makeFieldScopeKey(fieldId, ownerId);
  const store = readAllBundles();
  if (!(key in store)) return false;
  delete store[key];
  writeAllBundles(store);
  return true;
}

export function resetAllLandMemoryStoreForTests(): void {
  memoryFallbackStore = {};
  const storage = getStorageBackend();
  if (storage) {
    try {
      storage.removeItem(LAND_MEMORY_STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}
