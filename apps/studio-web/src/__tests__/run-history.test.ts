/**
 * run-history.test.ts — Unit tests for the bounded run-history scalability
 * layer: runHistoryRepo (mocked), runHistoryService (caching + invalidation),
 * the pure relative-time formatter, and the seeded 'recently-run-copy' copy.
 *
 * The repo module is mocked (Dexie/IndexedDB never loads), isolating the
 * service's own guarantees:
 * - Reads within the TTL window are served from cache (no repo call).
 * - Expired reads re-fetch from the repo.
 * - recordRun is fire-and-forget and invalidates the cache when it lands.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Stub the repo module so the real module (which imports Dexie) never loads.
// vi.mock is hoisted above imports by vitest, so the service import below
// already sees the mocked repo.
vi.mock('@/db/runHistoryRepo', () => ({
  runHistoryRepo: {
    recordRun: vi.fn(),
    getRecentRuns: vi.fn(),
    getRunStats: vi.fn(),
    prune: vi.fn(),
    count: vi.fn(),
    clearAll: vi.fn(),
  },
}));

import { runHistoryRepo, type RunRecord, type RunStats } from '@/db/runHistoryRepo';
import { runHistoryService } from '@/services/runHistoryService';
import { formatRelativeTime } from '@/lib/relativeTime';

const mockedRepo = vi.mocked(runHistoryRepo);

function makeRun(id: string, appId: string, appName: string, ranAt: number): RunRecord {
  return { id, appId, appName, ranAt };
}

const NOW = 1_800_000_000_000;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  mockedRepo.recordRun.mockReset();
  mockedRepo.getRecentRuns.mockReset();
  mockedRepo.getRunStats.mockReset();
  // The service is a module singleton — drop its cache so entries from one
  // test never bleed into the next (fake system time resets backwards).
  runHistoryService.invalidate();
});

afterEach(() => {
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// formatRelativeTime — pure helper
// ---------------------------------------------------------------------------

describe('formatRelativeTime', () => {
  it('formats sub-minute timestamps as "just now"', () => {
    expect(formatRelativeTime(NOW - 5_000, NOW)).toBe('just now');
    expect(formatRelativeTime(NOW - 44_000, NOW)).toBe('just now');
  });

  it('formats minutes, hours, days, months, years', () => {
    expect(formatRelativeTime(NOW - 5 * 60_000, NOW)).toBe('5m ago');
    expect(formatRelativeTime(NOW - 2 * 3_600_000, NOW)).toBe('2h ago');
    expect(formatRelativeTime(NOW - 3 * 86_400_000, NOW)).toBe('3d ago');
    expect(formatRelativeTime(NOW - 40 * 86_400_000, NOW)).toBe('1mo ago');
    expect(formatRelativeTime(NOW - 2 * 365 * 86_400_000, NOW)).toBe('2y ago');
  });

  it('falls back gracefully on invalid timestamps', () => {
    expect(formatRelativeTime(0, NOW)).toBe('—');
    expect(formatRelativeTime(NaN, NOW)).toBe('—');
    // Future timestamps clamp to "just now".
    expect(formatRelativeTime(NOW + 60_000, NOW)).toBe('just now');
  });
});

// ---------------------------------------------------------------------------
// runHistoryService — TTL caching + fire-and-forget writes
// ---------------------------------------------------------------------------

describe('runHistoryService', () => {
  it('serves recent runs from cache within the TTL window', async () => {
    const service = runHistoryService;
    const runs = [makeRun('r1', 'a1', 'Todo List', NOW - 60_000)];
    mockedRepo.getRecentRuns.mockResolvedValue(runs);

    const first = await service.getRecentRuns(5);
    expect(first).toEqual(runs);
    expect(mockedRepo.getRecentRuns).toHaveBeenCalledTimes(1);

    // Second read within 10s TTL → cache hit, no repo call.
    const second = await service.getRecentRuns(5);
    expect(second).toEqual(runs);
    expect(mockedRepo.getRecentRuns).toHaveBeenCalledTimes(1);
  });

  it('re-fetches after the TTL window expires', async () => {
    const service = runHistoryService;
    mockedRepo.getRecentRuns.mockResolvedValue([makeRun('r1', 'a1', 'Old', NOW - 60_000)]);

    await service.getRecentRuns(5);
    expect(mockedRepo.getRecentRuns).toHaveBeenCalledTimes(1);

    // Advance past the 10s TTL → next read re-fetches.
    vi.advanceTimersByTime(11_000);
    mockedRepo.getRecentRuns.mockResolvedValue([makeRun('r2', 'a2', 'New', NOW)]);
    const fresh = await service.getRecentRuns(5);
    expect(fresh[0].appName).toBe('New');
    expect(mockedRepo.getRecentRuns).toHaveBeenCalledTimes(2);
  });

  it('caches run stats and caches per limit key', async () => {
    const service = runHistoryService;
    const stats: RunStats = { totalRuns: 10, runsToday: 3, runsThisWeek: 7 };
    mockedRepo.getRunStats.mockResolvedValue(stats);

    expect(await service.getRunStats()).toEqual(stats);
    expect(await service.getRunStats()).toEqual(stats);
    expect(mockedRepo.getRunStats).toHaveBeenCalledTimes(1);

    // Different limit = different cache key → separate repo call.
    mockedRepo.getRecentRuns.mockResolvedValue([]);
    await service.getRecentRuns(3);
    await service.getRecentRuns(5);
    expect(mockedRepo.getRecentRuns).toHaveBeenCalledTimes(2);
  });

  it('recordRun is fire-and-forget and invalidates the cache when it lands', async () => {
    const service = runHistoryService;
    const runs = [makeRun('r1', 'a1', 'Todo List', NOW - 60_000)];
    mockedRepo.getRecentRuns.mockResolvedValue(runs);
    mockedRepo.recordRun.mockResolvedValue(makeRun('r2', 'a2', 'Budget', NOW));

    await service.getRecentRuns(5); // warm the cache

    // recordRun returns synchronously (fire-and-forget) — no await needed.
    service.recordRun('a2', 'Budget');
    expect(mockedRepo.recordRun).toHaveBeenCalledWith('a2', 'Budget');

    // Let the write promise resolve → cache invalidated.
    await Promise.resolve();
    await Promise.resolve();

    // A subsequent read must hit the repo again (cache was cleared).
    mockedRepo.getRecentRuns.mockResolvedValue([
      runs[0],
      makeRun('r2', 'a2', 'Budget', NOW),
    ]);
    const after = await service.getRecentRuns(5);
    expect(after).toHaveLength(2);
    expect(mockedRepo.getRecentRuns).toHaveBeenCalledTimes(2);
  });

  it('falls back to the stale snapshot when the repo read fails', async () => {
    const service = runHistoryService;
    const runs = [makeRun('r1', 'a1', 'Todo List', NOW - 60_000)];
    mockedRepo.getRecentRuns.mockResolvedValueOnce(runs);

    await service.getRecentRuns(5);

    vi.advanceTimersByTime(11_000);
    mockedRepo.getRecentRuns.mockRejectedValueOnce(new Error('IndexedDB unavailable'));
    const fallback = await service.getRecentRuns(5);
    expect(fallback).toEqual(runs);
  });
});
