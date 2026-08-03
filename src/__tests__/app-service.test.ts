/**
 * app-service.test.ts — Unit tests for the AppService scalability layer.
 *
 * The repo layer is fully mocked (Dexie/IndexedDB never loads), isolating the
 * service's own guarantees:
 * - Fresh-window cache hits skip the DB entirely.
 * - Concurrent identical queries are coalesced into ONE IndexedDB round-trip.
 * - Stale-while-revalidate serves a stale snapshot instantly and revalidates
 *   in the background.
 * - Hard-expired entries are re-fetched and awaited.
 * - Mutations invalidate the cache (and stale in-flight writes can never
 *   re-populate it after a mutation).
 * - Subscribers are notified on mutations and background revalidations only
 *   (cold fetches that the caller awaits do NOT notify).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Stub the repo module so the real module (which imports Dexie) never loads.
vi.mock('@/db/microAppRepo', () => ({
  microAppRepo: {
    getPaginated: vi.fn(),
    search: vi.fn(),
    getById: vi.fn(),
    count: vi.fn(),
    getRecentApps: vi.fn(),
    getByIds: vi.fn(),
    getByNamePrefix: vi.fn(),
    reindexSearchNames: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    batchRemove: vi.fn(),
    exportAll: vi.fn(),
    importApps: vi.fn(),
  },
}));

import { createAppService } from '@/services/appService';
import { microAppRepo } from '@/db/microAppRepo';
import type { AppSchema } from '@/types/schema';
import type { PaginatedResult } from '@/db/microAppRepo';

type Service = ReturnType<typeof createAppService>;

/** Fresh service instance per test — isolated cache + in-flight state. */
function makeService(): Service {
  return createAppService();
}

function makeApp(id: string, name = 'Test App'): AppSchema {
  return {
    id,
    name,
    description: 'desc',
    prompt: 'prompt',
    fields: [],
    logicNodes: [],
    layout: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: 1,
  };
}

function pageResult(items: AppSchema[]): PaginatedResult<AppSchema> {
  return {
    items,
    total: items.length,
    page: 1,
    pageSize: 12,
    totalPages: 1,
  };
}

/** Flush pending microtask chains (background revalidation completes here). */
async function flush(): Promise<void> {
  for (let i = 0; i < 5; i++) await Promise.resolve();
}

describe('AppService read caching', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('serves a fresh cache hit without touching the DB twice', async () => {
    const service = makeService();
    vi.mocked(microAppRepo.getPaginated).mockResolvedValue(pageResult([makeApp('a')]));

    const first = await service.getApps(1, 12);
    const second = await service.getApps(1, 12);

    expect(first.items).toHaveLength(1);
    expect(second.items).toHaveLength(1);
    expect(microAppRepo.getPaginated).toHaveBeenCalledTimes(1);
  });

  it('coalesces concurrent identical queries into one DB round-trip', async () => {
    const service = makeService();
    vi.mocked(microAppRepo.getPaginated).mockResolvedValue(pageResult([makeApp('a')]));

    const [a, b] = await Promise.all([
      service.getApps(1, 12),
      service.getApps(1, 12),
    ]);

    expect(a.items).toHaveLength(1);
    expect(b.items).toHaveLength(1);
    expect(microAppRepo.getPaginated).toHaveBeenCalledTimes(1);
  });

  it('coalesces only identical queries — different pages hit the DB separately', async () => {
    const service = makeService();
    vi.mocked(microAppRepo.getPaginated).mockResolvedValue(pageResult([makeApp('a')]));

    await Promise.all([service.getApps(1, 12), service.getApps(2, 12)]);

    expect(microAppRepo.getPaginated).toHaveBeenCalledTimes(2);
  });

  it('serves stale data instantly within the SWR window and revalidates in the background', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-04T00:00:00.000Z'));
    const service = makeService();
    vi.mocked(microAppRepo.getPaginated).mockResolvedValue(pageResult([makeApp('a')]));

    // t0: cold fetch, cache populated.
    await service.getApps(1, 12);
    expect(microAppRepo.getPaginated).toHaveBeenCalledTimes(1);

    // Advance past the fresh window (5s) but inside the SWR window (30s).
    await vi.advanceTimersByTimeAsync(10_000);
    const stale = await service.getApps(1, 12);

    // Stale snapshot returned immediately…
    expect(stale.items[0].id).toBe('a');
    // …and a background revalidation was kicked off (not awaited by caller).
    await flush();
    expect(microAppRepo.getPaginated).toHaveBeenCalledTimes(2);

    // After the revalidation lands, the cache is fresh again — no third fetch.
    const again = await service.getApps(1, 12);
    expect(again.items[0].id).toBe('a');
    expect(microAppRepo.getPaginated).toHaveBeenCalledTimes(2);
  });

  it('re-fetches and awaits when the entry is hard-expired (beyond SWR window)', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-04T00:00:00.000Z'));
    const service = makeService();
    vi.mocked(microAppRepo.getPaginated).mockResolvedValue(pageResult([makeApp('a')]));

    await service.getApps(1, 12);
    expect(microAppRepo.getPaginated).toHaveBeenCalledTimes(1);

    // 31s later — beyond CACHE_TTL and SWR_MAX_AGE → must await a fresh fetch.
    await vi.advanceTimersByTimeAsync(31_000);
    const result = await service.getApps(1, 12);

    expect(result.items[0].id).toBe('a');
    expect(microAppRepo.getPaginated).toHaveBeenCalledTimes(2);
  });

  it('falls back to a stale snapshot when the background revalidation fails', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-04T00:00:00.000Z'));
    const service = makeService();
    vi.mocked(microAppRepo.getPaginated)
      .mockResolvedValueOnce(pageResult([makeApp('a')]))
      .mockRejectedValue(new Error('IndexedDB unavailable'));

    await service.getApps(1, 12);

    await vi.advanceTimersByTimeAsync(10_000);
    const stale = await service.getApps(1, 12);
    expect(stale.items[0].id).toBe('a');

    await flush();
    // Failure was swallowed; stale data remains cached and usable.
    const again = await service.getApps(1, 12);
    expect(again.items[0].id).toBe('a');
  });

  it('count queries cache the value 0 correctly (no falsy-cache bug)', async () => {
    const service = makeService();
    vi.mocked(microAppRepo.count).mockResolvedValue(0);

    const first = await service.getCount();
    const second = await service.getCount();

    expect(first).toBe(0);
    expect(second).toBe(0);
    expect(microAppRepo.count).toHaveBeenCalledTimes(1);
  });
});

describe('AppService mutation invalidation', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('clears the cache after a create — the next read re-fetches', async () => {
    const service = makeService();
    vi.mocked(microAppRepo.getPaginated).mockResolvedValue(pageResult([makeApp('a')]));
    vi.mocked(microAppRepo.create).mockResolvedValue(undefined);

    await service.getApps(1, 12);
    expect(microAppRepo.getPaginated).toHaveBeenCalledTimes(1);

    await service.createApp(makeApp('b', 'New App'));
    await service.getApps(1, 12);

    expect(microAppRepo.getPaginated).toHaveBeenCalledTimes(2);
  });

  it('drops stale in-flight reads that complete after a mutation', async () => {
    const service = makeService();
    let resolveSlow!: (r: PaginatedResult<AppSchema>) => void;
    vi.mocked(microAppRepo.getPaginated).mockImplementation(
      () => new Promise((res) => (resolveSlow = res))
    );
    vi.mocked(microAppRepo.create).mockResolvedValue(undefined);

    // Start a slow read, then mutate before it resolves.
    const slowRead = service.getApps(1, 12);
    await service.createApp(makeApp('b'));
    resolveSlow(pageResult([makeApp('a')])); // stale data arrives AFTER mutation
    await slowRead;

    // The next read must NOT see the stale result — it re-fetches fresh data.
    vi.mocked(microAppRepo.getPaginated).mockResolvedValue(pageResult([makeApp('c', 'Fresh')]));
    const next = await service.getApps(1, 12);
    expect(next.items[0].name).toBe('Fresh');
  });

  it('notifies subscribers on mutations and on background revalidations', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-04T00:00:00.000Z'));
    const service = makeService();
    vi.mocked(microAppRepo.getPaginated).mockResolvedValue(pageResult([makeApp('a')]));
    vi.mocked(microAppRepo.create).mockResolvedValue(undefined);

    const listener = vi.fn();
    const unsubscribe = service.subscribe(listener);

    // Cold fetch — caller awaits the result, so NO notification.
    await service.getApps(1, 12);
    expect(listener).not.toHaveBeenCalled();

    // Mutation → notify.
    await service.createApp(makeApp('b'));
    expect(listener).toHaveBeenCalledTimes(1);

    // Cold refetch after cache clear → still no notification.
    await service.getApps(1, 12);
    expect(listener).toHaveBeenCalledTimes(1);

    // Stale-while-revalidate background refresh → notify.
    await vi.advanceTimersByTimeAsync(10_000);
    await service.getApps(1, 12); // returns stale + kicks off revalidation
    await flush();
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
  });
});
