'use client';

import { db } from './db';

/**
 * RunHistoryRepo — bounded, indexed run-history trail for micro-app runs.
 *
 * Every time a user opens the runner for an app (`/run/[id]`), a lightweight
 * record is written here. The trail powers the dashboard "Recently Run" strip
 * and run analytics (total / today / this week) — all derived from IndexedDB,
 * never hardcoded.
 *
 * Scalability properties:
 * - **Bounded retention**: the table never grows past MAX_RUNS records. After
 *   each insert the oldest excess records are pruned in small batches via the
 *   `ranAt` index (primaryKeys → bulkDelete), so memory and query cost stay
 *   constant no matter how long the app is used.
 * - **Indexed reads**: `orderBy('ranAt')` serves the recent-runs strip with
 *   an O(log n + k) index scan (no full-table load); the daily/weekly stats
 *   are indexed range counts. `appId` is indexed for per-app aggregation.
 * - **Denormalized `appName` snapshot**: the name at run time is stored on
 *   the record so the strip renders instantly without a join; renames of the
 *   app only affect future runs.
 * - **Fail-safe writes**: recording a run is best-effort — a failure logs and
 *   returns null, never breaking the runner page.
 */

export interface RunRecord {
  id: string;
  /** App id that was run. */
  appId: string;
  /** App name at run time (denormalized snapshot — no join needed). */
  appName: string;
  /** Epoch ms when the run happened. */
  ranAt: number;
}

export interface RunStats {
  /** Total runs recorded (bounded by retention). */
  totalRuns: number;
  /** Runs since local midnight — indexed range count. */
  runsToday: number;
  /** Runs in the last 7 days — indexed range count. */
  runsThisWeek: number;
}

/** A paginated slice of the run-history trail (offset pagination over `ranAt`). */
export interface PaginatedRunHistory {
  items: RunRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Retention cap — the trail never grows past this many records. */
const MAX_RUNS = 500;

/** Prune batch size — bounds each prune transaction's work. */
const PRUNE_CHUNK_SIZE = 50;

/** Collision-resistant-enough id generator (matches seed.ts pattern). */
function generateId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

export const runHistoryRepo = {
  /**
   * Record one run and enforce the retention cap.
   * Returns the written record, or null on failure (never throws).
   */
  async recordRun(appId: string, appName: string): Promise<RunRecord | null> {
    try {
      if (!appId) return null;
      const record: RunRecord = {
        id: generateId(),
        appId,
        appName: appName?.trim() ? appName : 'Untitled app',
        ranAt: Date.now(),
      };
      await db.runHistory.add(record);
      await runHistoryRepo.prune();
      return record;
    } catch (error) {
      console.error('[RunHistoryRepo] recordRun failed:', error);
      return null;
    }
  },

  /** Most recent runs, newest first — indexed read, no full-table scan. */
  async getRecentRuns(limit: number = 10): Promise<RunRecord[]> {
    try {
      if (limit <= 0) return [];
      return await db.runHistory.orderBy('ranAt').reverse().limit(limit).toArray();
    } catch {
      return [];
    }
  },

  /**
   * Paginated run-history browse — the scalable way to explore the full
   * (bounded) trail instead of only the top-N strip.
   *
   * Reads only the page slice through the `ranAt` index
   * (`orderBy('ranAt').reverse().offset().limit()`), so a deep page never
   * materializes the whole trail. Mirrors microAppRepo.getPaginated's
   * clamping semantics (page is clamped into [1, totalPages]) so the caller
   * can safely render whatever page number it holds in state.
   */
  async getHistoryPage(
    page: number = 1,
    pageSize: number = 10
  ): Promise<PaginatedRunHistory> {
    try {
      const safeSize = Math.max(1, Math.floor(pageSize));
      const total = await db.runHistory.count();
      const totalPages = Math.max(1, Math.ceil(total / safeSize));
      const safePage = Math.min(Math.max(1, Math.floor(page)), totalPages);
      const offset = (safePage - 1) * safeSize;

      const items = await db.runHistory
        .orderBy('ranAt')
        .reverse()
        .offset(offset)
        .limit(safeSize)
        .toArray();

      return { items, total, page: safePage, pageSize: safeSize, totalPages };
    } catch {
      return { items: [], total: 0, page, pageSize, totalPages: 0 };
    }
  },

  /** Run analytics via indexed range counts. */
  async getRunStats(): Promise<RunStats> {
    try {
      const now = Date.now();
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

      const totalRuns = await db.runHistory.count();
      const runsToday = await db.runHistory
        .where('ranAt')
        .above(startOfDay.getTime())
        .count();
      const runsThisWeek = await db.runHistory.where('ranAt').above(weekAgo).count();
      return { totalRuns, runsToday, runsThisWeek };
    } catch {
      return { totalRuns: 0, runsToday: 0, runsThisWeek: 0 };
    }
  },

  /**
   * Enforce bounded retention — delete the oldest records beyond MAX_RUNS.
   * Reads only primary keys from the `ranAt` index and deletes in chunks, so
   * the prune stays cheap even when a burst of runs pushed well past the cap.
   * Returns the number of records removed.
   */
  async prune(): Promise<number> {
    try {
      const total = await db.runHistory.count();
      const excess = total - MAX_RUNS;
      if (excess <= 0) return 0;
      let removed = 0;
      let remaining = excess;
      while (remaining > 0) {
        const batch = await db.runHistory
          .orderBy('ranAt')
          .limit(Math.min(PRUNE_CHUNK_SIZE, remaining))
          .primaryKeys();
        if (batch.length === 0) break;
        await db.runHistory.bulkDelete(batch);
        removed += batch.length;
        remaining -= batch.length;
      }
      return removed;
    } catch (error) {
      console.error('[RunHistoryRepo] prune failed:', error);
      return 0;
    }
  },

  /** Total run records currently stored (bounded by retention). */
  async count(): Promise<number> {
    try {
      return await db.runHistory.count();
    } catch {
      return 0;
    }
  },

  /** Wipe the trail (e.g. dev reset / settings). */
  async clearAll(): Promise<void> {
    try {
      await db.runHistory.clear();
    } catch (error) {
      console.error('[RunHistoryRepo] clearAll failed:', error);
    }
  },
};
