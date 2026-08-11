'use client';

import { runHistoryRepo, type RunRecord, type RunStats } from '@/db/runHistoryRepo';

/**
 * RunHistoryService — cached service layer over runHistoryRepo.
 *
 * - **TTL cache per query**: recent-runs and run-stats reads within the fresh
 *   window (CACHE_TTL) are instant — the dashboard strip and stats cards never
 *   re-hit IndexedDB on every visit.
 * - **Fail-safe reads**: any repo error falls back to the cached snapshot or
 *   an empty result, so a transient IndexedDB failure never breaks the strip.
 * - **Fire-and-forget writes**: `recordRun` never blocks the runner page; it
 *   writes in the background and invalidates the cache when it lands so the
 *   next dashboard read reflects the new run.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

/** Fresh window: cached data is served instantly with no DB round trip. */
const CACHE_TTL = 10_000; // 10 seconds

class RunHistoryService {
  private cache: Map<string, CacheEntry<unknown>> = new Map();

  /** Serve a cached entry if it is still fresh; otherwise fetch + cache. */
  private async readThrough<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (entry && now - entry.timestamp < CACHE_TTL) {
      return entry.data;
    }
    try {
      const data = await fetcher();
      this.cache.set(key, { data, timestamp: now });
      return data;
    } catch (error) {
      console.error(`[RunHistoryService] read failed for ${key}:`, error);
      // Fail-safe: serve the stale snapshot when available.
      if (entry) return entry.data;
      throw error;
    }
  }

  /** Most recent runs (cached per limit). */
  async getRecentRuns(limit: number = 5): Promise<RunRecord[]> {
    const key = `recent:${limit}`;
    return this.readThrough(key, () => runHistoryRepo.getRecentRuns(limit));
  }

  /** Run analytics (cached). */
  async getRunStats(): Promise<RunStats> {
    return this.readThrough('stats', () => runHistoryRepo.getRunStats());
  }

  /**
   * Record a run in the background. Never throws and never blocks the caller;
   * the cache is invalidated once the write lands so the next read reflects it.
   */
  recordRun(appId: string, appName: string): void {
    runHistoryRepo
      .recordRun(appId, appName)
      .then(() => this.invalidate())
      .catch(() => {
        // Best-effort — a failed write must never surface to the runner page.
      });
  }

  /** Drop all cached entries (e.g. after a write or a manual reset). */
  invalidate(): void {
    this.cache.clear();
  }
}

/** Singleton instance */
export const runHistoryService = new RunHistoryService();
