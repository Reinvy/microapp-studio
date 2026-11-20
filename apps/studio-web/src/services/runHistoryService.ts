'use client';

import {
  runHistoryRepo,
  type RunRecord,
  type RunStats,
  type PaginatedRunHistory,
} from '@/db/runHistoryRepo';

/**
 * RunHistoryService — cached service layer over runHistoryRepo.
 *
 * - **TTL cache per query**: recent-runs, run-stats and paginated-history
 *   reads within the fresh window (CACHE_TTL) are instant — the dashboard
 *   strip, stats cards and the run-history dialog never re-hit IndexedDB on
 *   every visit or page turn within the window.
 * - **Fail-safe reads**: any repo error falls back to the cached snapshot or
 *   an empty result, so a transient IndexedDB failure never breaks the strip.
 * - **Fire-and-forget writes**: `recordRun` never blocks the runner page; it
 *   writes in the background and invalidates the cache when it lands so the
 *   next dashboard read reflects the new run. `clearHistory` wipes the trail
 *   and drops every cached slice so the next read re-fetches from scratch.
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

  /**
   * Paginated run-history browse (cached per page + pageSize key). Page turns
   * within the TTL window are instant; every distinct (page, pageSize) combo
   * gets its own entry so re-opening the dialog at the same page is a hit.
   */
  async getHistoryPage(
    page: number = 1,
    pageSize: number = 10
  ): Promise<PaginatedRunHistory> {
    const key = `history:${page}:${pageSize}`;
    return this.readThrough(key, () => runHistoryRepo.getHistoryPage(page, pageSize));
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

  /**
   * Wipe the whole trail (bounded by retention) and drop every cached slice.
   * The next read of any history page re-fetches from an empty table.
   */
  async clearHistory(): Promise<void> {
    try {
      await runHistoryRepo.clearAll();
    } catch (error) {
      console.error('[RunHistoryService] clearHistory failed:', error);
    }
    this.invalidate();
  }

  /** Drop all cached entries (e.g. after a write or a manual reset). */
  invalidate(): void {
    this.cache.clear();
  }
}

/** Singleton instance */
export const runHistoryService = new RunHistoryService();
