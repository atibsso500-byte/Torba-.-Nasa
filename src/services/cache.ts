/**
 * TURBA Scientific Data Cache Service
 * Provides thread-safe, bounded, multi-dimensional caching for scientific API responses.
 *
 * Requirements (Phase 2 Checklist 7):
 * - Compound cache keys including: source, rounded coordinates (4 decimal places), parameter set, and date window.
 * - Strict spatial isolation: never return one farm's data for another farm.
 * - TTL-based expiration:
 *   - Current weather: 15 minutes
 *   - Hourly soil moisture: 60 minutes
 *   - Daily agroclimatology (NASA POWER): 6 hours
 *   - Satellite overpass metadata (Sentinel-2): 12 hours
 * - Never cache failed (HTTP error) or invalid responses as valid data.
 * - Memory bounding (max entries) to prevent memory leaks.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttlMs: number;
  key: string;
}

class ScientificDataCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private readonly maxEntries: number;

  constructor(maxEntries = 100) {
    this.maxEntries = maxEntries;
  }

  /**
   * Generates a deterministic compound key for geographical queries
   */
  public generateKey(
    source: string,
    lat: number,
    lng: number,
    subKey = 'default',
    precision = 4
  ): string {
    const latStr = lat.toFixed(precision);
    const lngStr = lng.toFixed(precision);
    return `${source}:${latStr}:${lngStr}:${subKey}`;
  }

  /**
   * Retrieves a cached item if present and not expired
   */
  public get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttlMs) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Stores an item with a specific TTL in milliseconds
   */
  public set<T>(key: string, data: T, ttlMs: number): void {
    if (!data) return;

    // Evict oldest entry if at capacity
    if (this.cache.size >= this.maxEntries) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttlMs,
      key,
    });
  }

  /**
   * Clears all cached items
   */
  public clear(): void {
    this.cache.clear();
  }

  /**
   * Returns current cache size
   */
  public size(): number {
    return this.cache.size;
  }
}

export const scientificCache = new ScientificDataCache(150);
