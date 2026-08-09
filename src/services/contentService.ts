'use client';

import { contentRepo, type SiteContent, type SiteContentData } from '@/db/contentRepo';

/**
 * ContentService — scalable service layer wrapping contentRepo with:
 *
 * - **Batch reads**: `getContentMany(types)` resolves all requested content
 *   types with ONE IndexedDB round trip (`anyOf` over the `type` index).
 *   The landing page used to fire up to 8 sequential `contentRepo.getByType`
 *   calls on first paint (hero, features, steps, stats, CTA, sections, nav,
 *   footer); the same page now issues a single batched read.
 * - **Per-type SWR cache**: every content type is cached under its own key.
 *   Reads within the fresh window (CACHE_TTL) are instant; reads within the
 *   stale-while-revalidate window (SWR_MAX_AGE) serve the cached snapshot
 *   immediately AND revalidate in the background. Because batch reads write
 *   per-type cache entries, a later single-type read (e.g. Navbar asking for
 *   `nav-links` after the landing page batched it) is a cache hit — no DB.
 * - **In-flight batch coalescing**: concurrent identical batch reads share a
 *   single IndexedDB round-trip (React StrictMode double-effects and
 *   page + Navbar + Footer mounting in the same tick fire duplicate queries).
 * - **Mutation epochs**: every save bumps the epoch and clears the cache, so
 *   in-flight reads that complete AFTER a mutation can never re-populate the
 *   cache with stale content.
 * - **Bounded LRU cache**: capped at CACHE_MAX_ENTRIES; hot types stay cached
 *   while long sessions that touch many distinct types stay memory-bounded.
 * - **Fail-safe reads**: any read error resolves to `undefined` per type —
 *   consumers keep their built-in fallbacks, so the UI never crashes on a
 *   transient IndexedDB failure.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  /** Mutation epoch at write time — writes from an older epoch are dropped. */
  epoch: number;
}

/** Fresh window: cached data is served instantly with no background refresh. */
const CACHE_TTL = 10_000; // 10 seconds

/**
 * Stale-while-revalidate window: data older than CACHE_TTL but younger than
 * SWR_MAX_AGE is served instantly AND revalidated in the background.
 */
const SWR_MAX_AGE = 60_000; // 60 seconds

/** LRU cap — bounds memory as sessions touch many distinct content types. */
const CACHE_MAX_ENTRIES = 30;

class ContentService {
  private cache: Map<string, CacheEntry<SiteContent | undefined>> = new Map();
  /** LRU cap — configurable via createContentService(maxEntries) for tests. */
  private readonly maxEntries: number;
  /** In-flight promise per key — coalesces concurrent identical requests. */
  private inFlight: Map<string, Promise<unknown>> = new Map();
  private listeners: Set<() => void> = new Set();
  /** Mutation epoch — bumped on every write so stale in-flight reads are dropped. */
  private epoch = 0;

  constructor(maxEntries: number = CACHE_MAX_ENTRIES) {
    this.maxEntries = Math.max(1, maxEntries);
  }

  // ── Cache core ──

  /** Mark a type key as most-recently-used (Map insertion order = LRU order). */
  private touch(type: string): void {
    const entry = this.cache.get(type);
    if (entry) {
      this.cache.delete(type);
      this.cache.set(type, entry);
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

  /** True when the type is served by a fresh cache entry (no DB round trip). */
  hasCached(type: string): boolean {
    const entry = this.cache.get(type);
    return (
      !!entry &&
      entry.epoch === this.epoch &&
      Date.now() - entry.timestamp <= CACHE_TTL
    );
  }

  /** Write only if the mutation epoch still matches (no stale re-population). */
  private writeCache(type: string, data: SiteContent | undefined, epoch: number): void {
    if (epoch !== this.epoch) return;
    this.cache.set(type, { data, timestamp: Date.now(), epoch });
    this.evictIfNeeded();
  }

  private clearCache(): void {
    this.epoch++;
    this.cache.clear();
    this.inFlight.clear();
  }

  // ── Subscriptions (reactive UI updates) ──

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn());
  }

  // ── Batch fetch ──

  /**
   * Fetch the missing types in ONE IndexedDB round trip and write per-type
   * cache entries. Any read error resolves to a map of `undefined` values so
   * callers fall back to their built-in defaults instead of crashing.
   */
  private async fetchMany(
    types: string[],
    epoch: number
  ): Promise<Record<string, SiteContent | undefined>> {
    const map: Record<string, SiteContent | undefined> = {};
    try {
      const records = await contentRepo.getMany(types);
      const byType = new Map(records.map((record) => [record.type, record]));
      for (const type of types) {
        const record = byType.get(type);
        this.writeCache(type, record, epoch);
        map[type] = record;
      }
    } catch (error) {
      console.error('[ContentService] batch read failed:', error);
      // Fail-safe: serve stale snapshots when available, otherwise undefined.
      for (const type of types) {
        const entry = this.cache.get(type);
        map[type] = entry && entry.epoch === epoch ? entry.data : undefined;
      }
    }
    return map;
  }

  /** Background revalidation for a stale-but-served entry. */
  private scheduleRevalidate(type: string): void {
    const key = `content:${type}`;
    if (this.inFlight.has(key)) return;
    const epoch = this.epoch;
    const promise = contentRepo
      .getByType(type)
      .then((record) => {
        this.writeCache(type, record, epoch);
        this.notify();
      })
      .catch(() => {
        // Best-effort — a failed revalidation keeps the stale snapshot.
      })
      .finally(() => {
        this.inFlight.delete(key);
      });
    this.inFlight.set(key, promise);
  }

  // ── Public API ──

  /**
   * Get a single content type. Batched reads for the same type warm the same
   * cache entry, so this is a cache hit whenever the type was already loaded
   * (e.g. Navbar/Footer mounting after the landing page batched nav/footer).
   */
  async getContent<T extends SiteContentData>(type: string): Promise<T | undefined> {
    const map = await this.getContentMany([type]);
    const content = map[type];
    return content?.data as T | undefined;
  }

  /**
   * Batch-read multiple content types with ONE IndexedDB round trip for the
   * missing types. Fresh entries are served instantly; stale entries are
   * served instantly and revalidated in the background; missing types are
   * fetched in a single `anyOf` query. Concurrent identical batches share one
   * in-flight promise (coalescing).
   */
  async getContentMany(
    types: string[]
  ): Promise<Record<string, SiteContent | undefined>> {
    const unique = [...new Set(types)];
    if (unique.length === 0) return {};
    const epoch = this.epoch;
    const result: Record<string, SiteContent | undefined> = {};
    const missing: string[] = [];

    for (const type of unique) {
      const entry = this.cache.get(type);
      if (entry && entry.epoch === epoch && Date.now() - entry.timestamp <= CACHE_TTL) {
        // Fresh hit → serve instantly, no DB touch.
        this.touch(type);
        result[type] = entry.data;
      } else if (entry && entry.epoch === epoch && Date.now() - entry.timestamp <= SWR_MAX_AGE) {
        // Stale-but-usable → serve instantly, revalidate in the background.
        this.touch(type);
        result[type] = entry.data;
        this.scheduleRevalidate(type);
      } else {
        missing.push(type);
      }
    }

    if (missing.length > 0) {
      // Batch-level coalescing: concurrent identical batch reads share ONE
      // IndexedDB round-trip for the missing types.
      const batchKey = `batch:${[...missing].sort().join(',')}`;
      const pending = this.inFlight.get(batchKey);
      if (pending) {
        const fetched = (await pending) as Record<string, SiteContent | undefined>;
        Object.assign(result, fetched);
      } else {
        const promise = this.fetchMany(missing, epoch);
        this.inFlight.set(batchKey, promise);
        try {
          const fetched = await promise;
          Object.assign(result, fetched);
        } finally {
          this.inFlight.delete(batchKey);
        }
      }
    }

    return result;
  }

  /**
   * Save (create or update) one content record, then invalidate the read
   * cache and notify subscribers so the UI reflects the change.
   */
  async saveContent(content: SiteContent): Promise<void> {
    try {
      await contentRepo.save(content);
    } catch (error) {
      console.error('[ContentService] saveContent failed:', error);
      throw error;
    }
    this.clearCache();
    this.notify();
  }

  /** Bulk-save content records (seeding / admin), then invalidate + notify. */
  async saveContentMany(items: SiteContent[]): Promise<void> {
    if (items.length === 0) return;
    try {
      await contentRepo.bulkSave(items);
    } catch (error) {
      console.error('[ContentService] saveContentMany failed:', error);
      throw error;
    }
    this.clearCache();
    this.notify();
  }
}

/**
 * Create a fresh service instance. Exported so tests can construct isolated
 * instances (clean cache + in-flight state) without shared-singleton leakage.
 * `maxEntries` overrides the LRU cache cap (defaults to CACHE_MAX_ENTRIES).
 * Production code uses the singleton below.
 */
export function createContentService(maxEntries?: number): ContentService {
  return maxEntries === undefined ? new ContentService() : new ContentService(maxEntries);
}

/** Singleton instance */
export const contentService = createContentService();
