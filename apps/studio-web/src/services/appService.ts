'use client';

import { microAppRepo, type PaginatedResult } from '@/db/microAppRepo';
import type { AppSchema } from '@/types/schema';
import type { SortConfig } from './dashboardSortService';
import type { Cursor, CursorPage } from '@/lib/cursorPagination';
import { serializeBackup, parseBackup, type ImportSummary } from '@/lib/backup';

/**
 * AppService — Scalable service layer wrapping microAppRepo with:
 *
 * - **Stale-while-revalidate cache**: reads within the fresh window (CACHE_TTL)
 *   are instant. Reads within the SWR window serve the cached snapshot
 *   immediately AND revalidate in the background, so repeated queries of the
 *   same key never block the UI on IndexedDB.
 * - **In-flight query coalescing**: concurrent identical requests share a
 *   single IndexedDB round-trip. Without this, React StrictMode double-effects,
 *   debounced-search races, and delete-then-reload fire duplicate queries.
 * - **Mutation epochs**: every create/update/delete bumps the epoch and clears
 *   the cache; in-flight reads that complete AFTER a mutation are dropped, so
 *   stale data can never re-populate the cache.
 * - **Bounded LRU cache**: the cache is capped at CACHE_MAX_ENTRIES entries.
 *   Every read (fresh or SWR hit) marks its key as most-recently-used; when a
 *   write would exceed the cap, the least-recently-used entry is evicted. This
 *   keeps memory bounded on long sessions that page/sort/search across many
 *   distinct keys, while hot keys stay cached.
 * - Error handling & retry on writes, plus a subscription bus so the UI can
 *   react to background revalidations and cross-component mutations.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  /** Mutation epoch at write time — writes from an older epoch are dropped. */
  epoch: number;
}

/** Fresh window: cached data is served instantly with no background refresh. */
const CACHE_TTL = 5_000; // 5 seconds
/**
 * Stale-while-revalidate window: data older than CACHE_TTL but younger than
 * SWR_MAX_AGE is served instantly AND revalidated in the background.
 */
const SWR_MAX_AGE = 30_000; // 30 seconds

/**
 * Maximum number of cache entries kept before LRU eviction kicks in. The
 * dashboard pages/sorts/searches across many distinct keys (one entry per
 * query × page × pageSize × sort combination); this cap bounds memory on
 * long-lived sessions without hurting hot-key hit rates.
 */
const CACHE_MAX_ENTRIES = 50;

class AppService {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  /** LRU cap — configurable via createAppService(maxEntries) for tests. */
  private readonly maxEntries: number;
  /** In-flight promise per cache key — coalesces concurrent identical queries. */
  private inFlight: Map<string, Promise<unknown>> = new Map();
  private listeners: Set<() => void> = new Set();
  /** Mutation epoch — bumped on every write so stale in-flight reads are dropped. */
  private epoch = 0;

  constructor(maxEntries: number = CACHE_MAX_ENTRIES) {
    this.maxEntries = Math.max(1, maxEntries);
  }

  // ── Cache + query-coalescing core ──

  /**
   * Mark a key as most-recently-used. Map preserves insertion order, so
   * delete + re-set moves the key to the end (MRU position).
   */
  private touch(key: string): void {
    const entry = this.cache.get(key);
    if (entry) {
      this.cache.delete(key);
      this.cache.set(key, entry);
    }
  }

  /** Evict least-recently-used entries until the cache is under the cap. */
  private evictIfNeeded(): void {
    while (this.cache.size > this.maxEntries) {
      const oldest = this.cache.keys().next().value;
      if (oldest === undefined) break;
      this.cache.delete(oldest);
    }
  }

  /** Number of entries currently held — observability/tests. */
  getCacheSize(): number {
    return this.cache.size;
  }

  /**
   * Read-through helper implementing fresh-hit → coalesce → SWR → miss.
   *
   * - Fresh entry: return instantly.
   * - In-flight promise exists for this key: await it (one DB round-trip).
   * - Stale entry within SWR window: return stale instantly, revalidate in the
   *   background, notify subscribers when the refresh lands.
   * - Otherwise: fetch and await; on failure fall back to a stale snapshot if
   *   one exists, otherwise propagate.
   */
  private async readThrough<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    const epoch = this.epoch;
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;

    // 1. Fresh cache hit → serve instantly, no DB touch.
    if (entry && entry.epoch === epoch && Date.now() - entry.timestamp <= CACHE_TTL) {
      this.touch(key);
      return entry.data;
    }

    // 2. Query coalescing — an identical request is already in flight.
    const pending = this.inFlight.get(key);
    if (pending) {
      return pending as Promise<T>;
    }

    // 3. Stale-but-usable → serve instantly, revalidate in the background.
    if (entry && entry.epoch === epoch && Date.now() - entry.timestamp <= SWR_MAX_AGE) {
      this.touch(key);
      const promise = this.fetchAndCache(key, fetcher, epoch, entry.data, true);
      this.inFlight.set(key, promise);
      return entry.data;
    }

    // 4. Miss or hard-expired → fetch and await.
    const promise = this.fetchAndCache(key, fetcher, epoch, entry?.data, false);
    this.inFlight.set(key, promise);
    return promise;
  }

  /** Run the fetcher, store the result, clear the in-flight slot. */
  private fetchAndCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    epoch: number,
    fallback?: T,
    revalidate = false
  ): Promise<T> {
    return fetcher()
      .then((data) => {
        this.writeCache(key, data, epoch);
        // Background revalidation completed → let subscribers re-render.
        // Cold misses do NOT notify — the caller already awaits the result.
        if (revalidate) this.notify();
        return data;
      })
      .catch((error) => {
        console.error(`[AppService] query failed for ${key}:`, error);
        // Serve the stale snapshot if we have one; otherwise propagate.
        if (fallback !== undefined) return fallback;
        throw error;
      })
      .finally(() => {
        this.inFlight.delete(key);
      });
  }

  /** Write only if the mutation epoch still matches (no stale re-population). */
  private writeCache<T>(key: string, data: T, epoch: number): void {
    if (epoch !== this.epoch) return;
    this.cache.set(key, { data, timestamp: Date.now(), epoch });
    this.evictIfNeeded();
  }

  private clearCache(): void {
    this.epoch++;
    this.cache.clear();
    this.inFlight.clear();
  }

  // ── Subscriptions (for reactive UI updates) ──

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn());
  }

  // ── Cache-key builders ──

  /** Cache key for a paginated apps query. */
  private pageKey(page: number, pageSize: number, sort?: SortConfig): string {
    return `apps:${page}:${pageSize}:${sort?.field || 'updatedAt'}:${sort?.direction || 'desc'}`;
  }

  /** Cache key for a paginated search query. */
  private searchKey(
    query: string,
    page: number,
    pageSize: number,
    sort?: SortConfig
  ): string {
    return `search:${query}:${page}:${pageSize}:${sort?.field || 'updatedAt'}:${sort?.direction || 'desc'}`;
  }

  /** Cache key for a keyset (cursor) apps query. */
  private cursorKey(cursor: Cursor | null, pageSize: number): string {
    return cursor
      ? `apps:cursor:${cursor.updatedAt}:${cursor.id}:${pageSize}`
      : `apps:cursor:start:${pageSize}`;
  }

  // ── Public API ──

  /** Get paginated apps with SWR caching + query coalescing */
  async getApps(
    page: number = 1,
    pageSize: number = 12,
    sort?: SortConfig
  ): Promise<PaginatedResult<AppSchema>> {
    const cacheKey = this.pageKey(page, pageSize, sort);
    return this.readThrough(cacheKey, () => microAppRepo.getPaginated(page, pageSize, sort));
  }

  /**
   * Get apps via KEYSET (cursor-based) pagination with SWR caching + query
   * coalescing — the scalable path for very large datasets.
   *
   * Pass `null` for the first page; each response's `nextCursor` feeds the
   * next call. Unlike offset pagination (O(n) skip per page), every page is
   * an O(log n + pageSize) indexed range read. Cache keys are per-cursor, so
   * paging forward through a deep list reuses in-memory pages and concurrent
   * "load more" taps coalesce into one IndexedDB round-trip.
   */
  async getAppsCursor(
    cursor: Cursor | null,
    pageSize: number = 12
  ): Promise<CursorPage<AppSchema>> {
    const cacheKey = this.cursorKey(cursor, pageSize);
    return this.readThrough(cacheKey, () => microAppRepo.getPageAfter(cursor, pageSize));
  }

  /** Search apps with pagination */
  async searchApps(
    query: string,
    page: number = 1,
    pageSize: number = 12,
    sort?: SortConfig
  ): Promise<PaginatedResult<AppSchema>> {
    const cacheKey = this.searchKey(query, page, pageSize, sort);
    return this.readThrough(cacheKey, () => microAppRepo.search(query, page, pageSize, sort));
  }

  /** Get a single app by ID */
  async getAppById(id: string): Promise<AppSchema | undefined> {
    const cacheKey = `app:${id}`;
    return this.readThrough(cacheKey, () => microAppRepo.getById(id));
  }

  /** Create a new app */
  async createApp(app: AppSchema): Promise<void> {
    try {
      await microAppRepo.create(app);
    } catch (error) {
      console.error('[AppService] createApp failed:', error);
      // Retry once
      await microAppRepo.create(app);
    }
    this.clearCache();
    this.notify();
  }

  /** Update an existing app */
  async updateApp(id: string, updates: Partial<AppSchema>): Promise<void> {
    try {
      await microAppRepo.update(id, updates);
    } catch (error) {
      console.error('[AppService] updateApp failed:', error);
      await microAppRepo.update(id, updates);
    }
    this.clearCache();
    this.notify();
  }

  /** Delete an app */
  async removeApp(id: string): Promise<void> {
    try {
      await microAppRepo.remove(id);
    } catch (error) {
      console.error('[AppService] removeApp failed:', error);
      await microAppRepo.remove(id);
    }
    this.clearCache();
    this.notify();
  }

  /** Get total app count */
  async getCount(): Promise<number> {
    return this.readThrough('app:count', () => microAppRepo.count());
  }

  /** Get recently updated apps (dashboard quick-load) */
  async getRecentApps(limit: number = 6): Promise<AppSchema[]> {
    const cacheKey = `recent:${limit}`;
    return this.readThrough(cacheKey, () => microAppRepo.getRecentApps(limit));
  }

  /** Get apps by name prefix (autocomplete) */
  async getByNamePrefix(prefix: string, limit: number = 10): Promise<AppSchema[]> {
    if (!prefix.trim()) return [];
    return await microAppRepo.getByNamePrefix(prefix, limit);
  }

  /** Batch fetch apps by IDs (single bulkGet round trip) */
  async getAppsByIds(ids: string[]): Promise<AppSchema[]> {
    if (ids.length === 0) return [];
    const cacheKey = `apps:ids:${[...ids].sort().join(',')}`;
    return this.readThrough(cacheKey, () => microAppRepo.getByIds(ids));
  }

  /**
   * Predictive prefetch — warm the cache for a page the user is likely to
   * visit next (e.g. page + 1 on the dashboard) without blocking the UI or
   * notifying subscribers.
   *
   * - No-ops when the key is already fresh or a fetch is already in flight
   *   (query coalescing is reused, so a prefetch and a real read for the
   *   same page share ONE IndexedDB round-trip).
   * - Runs entirely in the background: returns immediately; the fetch is
   *   scheduled, not awaited.
   * - Best-effort: a failed prefetch logs at debug level and never surfaces
   *   to the UI — the cache simply stays cold and the next real read fetches
   *   on demand.
   */
  prefetchApps(page: number, pageSize: number, sort?: SortConfig): void {
    this.warmCache(this.pageKey(page, pageSize, sort), () =>
      microAppRepo.getPaginated(page, pageSize, sort)
    );
  }

  /** Predictive prefetch for a search-query page (see prefetchApps). */
  prefetchSearch(
    query: string,
    page: number,
    pageSize: number,
    sort?: SortConfig
  ): void {
    if (!query.trim()) return;
    this.warmCache(this.searchKey(query, page, pageSize, sort), () =>
      microAppRepo.search(query, page, pageSize, sort)
    );
  }

  /**
   * True when the given page query is served by a fresh cache entry (no DB
   * round-trip needed). Lets the dashboard decide whether to prefetch and
   * lets tests assert warming without counting DB calls.
   */
  hasCachedPage(page: number, pageSize: number, sort?: SortConfig): boolean {
    const key = this.pageKey(page, pageSize, sort);
    const entry = this.cache.get(key) as CacheEntry<unknown> | undefined;
    return (
      !!entry &&
      entry.epoch === this.epoch &&
      Date.now() - entry.timestamp <= CACHE_TTL
    );
  }

  /**
   * Fire-and-forget cache warm. Shares the in-flight map with real reads
   * (coalescing) and honors mutation epochs + the LRU cap via writeCache,
   * but never notifies subscribers — prefetches must be invisible to the UI.
   */
  private warmCache<T>(key: string, fetcher: () => Promise<T>): void {
    // Already fetching or freshly cached → nothing to do.
    if (this.inFlight.has(key)) return;
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (
      entry &&
      entry.epoch === this.epoch &&
      Date.now() - entry.timestamp <= CACHE_TTL
    ) {
      return;
    }
    const epoch = this.epoch;
    const promise = fetcher()
      .then((data) => {
        this.writeCache(key, data, epoch);
      })
      .catch((error) => {
        // Best-effort — a failed prefetch must never surface to the UI.
        console.debug(`[AppService] prefetch failed for ${key}:`, error);
      })
      .finally(() => {
        this.inFlight.delete(key);
      });
    this.inFlight.set(key, promise);
  }

  /**
   * Backfill the `nameLower` search index for legacy records.
   * Self-healing maintenance — safe to call on app boot.
   */
  async reindexSearchNames(): Promise<number> {
    return await microAppRepo.reindexSearchNames();
  }

  /** Batch delete multiple apps */
  async batchRemoveApps(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    try {
      await microAppRepo.batchRemove(ids);
    } catch (error) {
      console.error('[AppService] batchRemoveApps failed:', error);
    }
    this.clearCache();
    this.notify();
  }

  /**
   * Export all apps as a portable JSON backup string.
   * Uses the chunked repo read, then serializes via lib/backup (pure).
   */
  async exportApps(): Promise<string> {
    const { apps, exportedAt } = await microAppRepo.exportAll();
    return serializeBackup(apps, exportedAt);
  }

  /**
   * Import apps from a backup JSON string.
   * Parses + validates the envelope (throws Error with a clear message on
   * malformed input), performs the batched transactional write, then clears
   * the read cache and notifies subscribers so the UI reflects the change.
   */
  async importApps(
    json: string,
    mode: 'merge' | 'replace' = 'merge'
  ): Promise<ImportSummary> {
    const backup = parseBackup(json);
    const summary = await microAppRepo.importApps(backup.apps, mode);
    this.clearCache();
    this.notify();
    return summary;
  }
}

/**
 * Create a fresh service instance. Exported so tests can construct isolated
 * instances (clean cache + in-flight state) without shared-singleton leakage.
 * `maxEntries` overrides the LRU cache cap (defaults to CACHE_MAX_ENTRIES).
 * Production code uses the singleton below.
 */
export function createAppService(maxEntries?: number): AppService {
  return maxEntries === undefined ? new AppService() : new AppService(maxEntries);
}

/** Singleton instance */
export const appService = createAppService();
