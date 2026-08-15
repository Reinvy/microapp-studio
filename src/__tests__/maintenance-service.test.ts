/**
 * maintenance-service.test.ts — Unit tests for the idle-time maintenance layer.
 *
 * Repos/services are fully mocked (Dexie/IndexedDB never loads), isolating the
 * service's own guarantees:
 * - runMaintenance() performs all three steps (reindex, prune, stats warm) and
 *   reports the result.
 * - Single-flight: concurrent runMaintenance() calls share ONE pass.
 * - Best-effort per step: a failing step logs and never blocks the others.
 * - scheduleIdleMaintenance() is idempotent per session (StrictMode-safe):
 *   a pending schedule and a completed pass both make later schedules no-ops.
 * - The scheduler's cancel function actually prevents a pending pass.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IdleScheduler } from '@/lib/progressiveRender';

// Stub the repo modules so the real modules (which import Dexie) never load.
vi.mock('@/db/microAppRepo', () => ({
  microAppRepo: {
    reindexSearchNames: vi.fn(),
  },
}));

vi.mock('@/db/runHistoryRepo', () => ({
  runHistoryRepo: {
    prune: vi.fn(),
  },
}));

vi.mock('@/services/dashboardStatsService', () => ({
  dashboardStatsService: {
    getStats: vi.fn(),
  },
}));

import { createMaintenanceService } from '@/services/maintenanceService';
import { microAppRepo } from '@/db/microAppRepo';
import { runHistoryRepo } from '@/db/runHistoryRepo';
import { dashboardStatsService } from '@/services/dashboardStatsService';

/** Flush pending microtask chains so awaited promises settle. */
async function flush(): Promise<void> {
  for (let i = 0; i < 5; i++) await Promise.resolve();
}

/** A fake scheduler that captures the callback instead of running it. */
function captureScheduler(): {
  scheduler: IdleScheduler;
  fire: () => void;
  cancelled: () => boolean;
} {
  let captured: (() => void) | null = null;
  let cancelled = false;
  const scheduler: IdleScheduler = (fn) => {
    captured = fn;
    return () => {
      cancelled = true;
      captured = null; // real cancelIdleCallback/clearTimeout prevents the fire
    };
  };
  return {
    scheduler,
    fire: () => {
      const fn = captured;
      captured = null;
      if (fn) fn();
    },
    cancelled: () => cancelled,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  // Default happy-path behavior.
  vi.mocked(microAppRepo.reindexSearchNames).mockResolvedValue(3);
  vi.mocked(runHistoryRepo.prune).mockResolvedValue(2);
  vi.mocked(dashboardStatsService.getStats).mockResolvedValue({
    totalApps: 3,
    totalFields: 9,
    totalLogicNodes: 0,
    avgFieldsPerApp: 3,
    fieldTypeDistribution: [],
    appsByMonth: [],
    topFieldType: null,
    recentlyUpdated: 1,
  });
});

describe('MaintenanceService.runMaintenance', () => {
  it('runs all three steps and reports the result', async () => {
    const service = createMaintenanceService();
    const report = await service.runMaintenance();

    expect(microAppRepo.reindexSearchNames).toHaveBeenCalledTimes(1);
    expect(runHistoryRepo.prune).toHaveBeenCalledTimes(1);
    expect(dashboardStatsService.getStats).toHaveBeenCalledTimes(1);
    expect(report).toMatchObject({
      reindexed: 3,
      pruned: 2,
      statsWarmed: true,
    });
    expect(report.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('is single-flight — concurrent calls share one pass', async () => {
    const service = createMaintenanceService();
    // Keep the first step pending so both calls overlap.
    let release!: () => void;
    vi.mocked(microAppRepo.reindexSearchNames).mockImplementation(
      () =>
        new Promise<number>((resolve) => {
          release = () => resolve(5);
        })
    );

    const first = service.runMaintenance();
    const second = service.runMaintenance();

    expect(first).toBe(second); // same promise object

    release();
    const report = await first;
    expect(report.reindexed).toBe(5);
    expect(microAppRepo.reindexSearchNames).toHaveBeenCalledTimes(1);
  });

  it('is best-effort per step — a failing step never blocks the others', async () => {
    const service = createMaintenanceService();
    vi.mocked(microAppRepo.reindexSearchNames).mockRejectedValue(
      new Error('index broken')
    );
    // Prune also fails — only stats should survive.
    vi.mocked(runHistoryRepo.prune).mockRejectedValue(new Error('tx failed'));

    const report = await service.runMaintenance();

    expect(report.reindexed).toBe(0);
    expect(report.pruned).toBe(0);
    expect(report.statsWarmed).toBe(true);
    expect(dashboardStatsService.getStats).toHaveBeenCalledTimes(1);
  });

  it('resets the in-flight slot after completion (later calls run again)', async () => {
    const service = createMaintenanceService();
    await service.runMaintenance();
    await service.runMaintenance();

    expect(microAppRepo.reindexSearchNames).toHaveBeenCalledTimes(2);
  });
});

describe('MaintenanceService.scheduleIdleMaintenance', () => {
  it('runs a full pass when the idle callback fires', async () => {
    const { scheduler, fire } = captureScheduler();
    const service = createMaintenanceService(scheduler);

    service.scheduleIdleMaintenance();
    expect(service.hasRun()).toBe(false); // not yet fired

    fire();
    await flush();

    expect(service.hasRun()).toBe(true);
    expect(microAppRepo.reindexSearchNames).toHaveBeenCalledTimes(1);
    expect(runHistoryRepo.prune).toHaveBeenCalledTimes(1);
    expect(dashboardStatsService.getStats).toHaveBeenCalledTimes(1);
  });

  it('is idempotent while a pass is pending — second schedule no-ops', () => {
    const { scheduler, fire } = captureScheduler();
    const service = createMaintenanceService(scheduler);

    const cancel1 = service.scheduleIdleMaintenance();
    const cancel2 = service.scheduleIdleMaintenance();

    // Only one callback was captured by the scheduler.
    fire();
    fire(); // second fire has nothing captured

    expect(cancel1).toBeTypeOf('function');
    expect(cancel2).toBeTypeOf('function');
    expect(microAppRepo.reindexSearchNames).toHaveBeenCalledTimes(1);
  });

  it('is idempotent after a completed pass — later schedules no-op', async () => {
    const { scheduler, fire } = captureScheduler();
    const service = createMaintenanceService(scheduler);

    service.scheduleIdleMaintenance();
    fire();
    await flush();

    // After the pass completed, a fresh schedule must not run again.
    service.scheduleIdleMaintenance();
    fire();

    expect(microAppRepo.reindexSearchNames).toHaveBeenCalledTimes(1);
  });

  it('cancel prevents the pending pass from running', () => {
    const { scheduler, fire, cancelled } = captureScheduler();
    const service = createMaintenanceService(scheduler);

    const cancel = service.scheduleIdleMaintenance();
    cancel();
    expect(cancelled()).toBe(true);

    // Even if the scheduler still fires (shouldn't happen after cancel),
    // nothing is captured to run.
    fire();
    expect(microAppRepo.reindexSearchNames).not.toHaveBeenCalled();
  });

  it('a failed scheduled pass never rejects (best-effort)', async () => {
    const { scheduler, fire } = captureScheduler();
    const service = createMaintenanceService(scheduler);
    vi.mocked(microAppRepo.reindexSearchNames).mockRejectedValue(
      new Error('boom')
    );

    service.scheduleIdleMaintenance();
    fire();
    await flush();

    expect(service.hasRun()).toBe(true);
    expect(runHistoryRepo.prune).toHaveBeenCalledTimes(1);
  });
});
