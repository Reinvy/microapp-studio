'use client';

import { microAppRepo } from '@/db/microAppRepo';
import { runHistoryRepo } from '@/db/runHistoryRepo';
import { dashboardStatsService } from '@/services/dashboardStatsService';
import { createIdleScheduler, type IdleScheduler } from '@/lib/progressiveRender';

/**
 * MaintenanceService — idle-time background self-healing for IndexedDB at scale.
 *
 * The app's read paths are all index-optimized (prefix scans on `nameLower`,
 * indexed range counts, bounded-memory aggregation), but a few maintenance
 * invariants only hold if something *runs* them:
 *
 * 1. **Search-index backfill** (`microAppRepo.reindexSearchNames`) — legacy
 *    records created before the `nameLower` index existed (or imported
 *    backups with missing keys) silently degrade `search()` / `getByNamePrefix`
 *    from O(log n) prefix scans to full-table fallbacks. The repo method has
 *    existed but was never invoked at runtime — this service is its home.
 * 2. **Bounded run-history retention** (`runHistoryRepo.prune`) — normally
 *    enforced on every `recordRun`, but a boot-time sweep catches leftovers
 *    from interrupted sessions and keeps storage bounded regardless.
 * 3. **Stats cache warm** (`dashboardStatsService.getStats`) — computing
 *    dashboard stats is the most expensive read on the dashboard; warming it
 *    during idle means the first stats card paint is a cache hit.
 *
 * Scalability properties:
 * - **Idle-only execution**: scheduled via `requestIdleCallback` (the same
 *   scheduler as progressive rendering), so first paint and the initial data
 *   load are never blocked.
 * - **Single-flight**: concurrent `runMaintenance()` calls share one pass;
 *   a scheduled pass while one is pending is a no-op.
 * - **Once per session**: `scheduleIdleMaintenance()` is idempotent — after a
 *   pass completes (or is pending), further schedules no-op, so React
 *   StrictMode double-mounts and page revisits never duplicate maintenance.
 * - **Best-effort per step**: each step is isolated — one failure logs and
 *   never blocks the remaining steps or surfaces to the UI.
 */

export interface MaintenanceReport {
  /** Records whose `nameLower` search key was backfilled by the reindex. */
  reindexed: number;
  /** Run-history records pruned beyond the retention cap. */
  pruned: number;
  /** Whether the dashboard stats cache was warmed in the background. */
  statsWarmed: boolean;
  /** Elapsed wall time of the pass, in ms. */
  durationMs: number;
}

class MaintenanceService {
  /** In-flight pass — concurrent `runMaintenance()` calls share it. */
  private inFlight: Promise<MaintenanceReport> | null = null;
  /** True while a scheduled pass is pending or once one has been scheduled. */
  private scheduled = false;
  /** True once a pass has been scheduled-and-fired this session. */
  private ranOnce = false;
  private readonly scheduler: IdleScheduler;

  constructor(scheduler?: IdleScheduler) {
    this.scheduler = scheduler ?? createIdleScheduler();
  }

  /** True when a maintenance pass has been scheduled this session. */
  hasRun(): boolean {
    return this.ranOnce;
  }

  /**
   * Run the full maintenance pass now (awaited). Single-flight: if a pass is
   * already in flight, the caller receives that same promise.
   */
  runMaintenance(): Promise<MaintenanceReport> {
    if (this.inFlight) return this.inFlight;

    const started = Date.now();
    const run = (async (): Promise<MaintenanceReport> => {
      const report: MaintenanceReport = {
        reindexed: 0,
        pruned: 0,
        statsWarmed: false,
        durationMs: 0,
      };

      // Step 1 — self-healing search-index backfill for legacy records.
      try {
        report.reindexed = await microAppRepo.reindexSearchNames();
      } catch (error) {
        console.error('[MaintenanceService] reindex failed:', error);
      }

      // Step 2 — enforce bounded run-history retention.
      try {
        report.pruned = await runHistoryRepo.prune();
      } catch (error) {
        console.error('[MaintenanceService] prune failed:', error);
      }

      // Step 3 — warm the dashboard stats cache for instant first paint.
      try {
        await dashboardStatsService.getStats();
        report.statsWarmed = true;
      } catch (error) {
        console.error('[MaintenanceService] stats warm failed:', error);
      }

      report.durationMs = Date.now() - started;
      return report;
    })().finally(() => {
      this.inFlight = null;
    });

    this.inFlight = run;
    return run;
  }

  /**
   * Schedule one maintenance pass during the next browser idle period.
   *
   * Idempotent per session: if a pass is already pending or has already been
   * scheduled, this is a no-op (returns a no-op cancel). Returns a cancel
   * function so React effects can clean up on unmount.
   */
  scheduleIdleMaintenance(): () => void {
    if (this.ranOnce || this.scheduled) return () => {};
    this.scheduled = true;

    const cancel = this.scheduler(() => {
      this.scheduled = false;
      // Mark before the async pass so a concurrent schedule call no-ops.
      this.ranOnce = true;
      this.runMaintenance()
        .then((report) => {
          // Only log when the pass actually did something.
          if (report.reindexed > 0 || report.pruned > 0 || report.statsWarmed) {
            console.info('[MaintenanceService] background maintenance:', report);
          }
        })
        .catch(() => {
          // Best-effort — a failed pass must never surface to the UI.
        });
    });

    return cancel;
  }
}

/**
 * Create a fresh service instance — exported so tests can construct isolated
 * instances with a fake scheduler. Production code uses the singleton below.
 */
export function createMaintenanceService(scheduler?: IdleScheduler): MaintenanceService {
  return new MaintenanceService(scheduler);
}

/** Singleton instance. */
export const maintenanceService = createMaintenanceService();
