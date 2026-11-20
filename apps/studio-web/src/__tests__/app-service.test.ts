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

describe('AppService bounded LRU cache', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps the cache bounded at the configured cap across many distinct queries', async () => {
    const service = createAppService(3);
    vi.mocked(microAppRepo.getPaginated).mockResolvedValue(pageResult([makeApp('a')]));

    for (let page = 1; page <= 10; page++) {
      await service.getApps(page, 12);
    }

    expect(service.getCacheSize()).toBe(3);
    expect(microAppRepo.getPaginated).toHaveBeenCalledTimes(10);
  });

  it('evicts the least-recently-used entry when the cache exceeds its cap', async () => {
    const service = createAppService(3);
    vi.mocked(microAppRepo.getPaginated).mockResolvedValue(pageResult([makeApp('a')]));

    // Fill the cache: pages 1, 2, 3 → 3 entries.
    await service.getApps(1, 12);
    await service.getApps(2, 12);
    await service.getApps(3, 12);
    expect(service.getCacheSize()).toBe(3);

    // Page 4 evicts the LRU entry (page 1).
    await service.getApps(4, 12);
    expect(service.getCacheSize()).toBe(3);

    // Page 1 was evicted → re-fetch hits the DB again.
    await service.getApps(1, 12);
    expect(microAppRepo.getPaginated).toHaveBeenCalledTimes(5);
  });

  it('a fresh read marks the key as recently used and protects it from eviction', async () => {
    const service = createAppService(3);
    vi.mocked(microAppRepo.getPaginated).mockResolvedValue(pageResult([makeApp('a')]));

    await service.getApps(1, 12);
    await service.getApps(2, 12);
    await service.getApps(3, 12);

    // Re-read page 1 while fresh → touched, becomes MRU.
    await service.getApps(1, 12);

    // Page 4 evicts the NEW LRU (page 2), not the recently-touched page 1.
    await service.getApps(4, 12);

    // Page 2 must re-fetch (evicted)…
    await service.getApps(2, 12);
    expect(microAppRepo.getPaginated).toHaveBeenCalledTimes(5);

    // …but page 1 is still cached fresh — no extra DB call.
    await service.getApps(1, 12);
    expect(microAppRepo.getPaginated).toHaveBeenCalledTimes(5);
  });

  it('an evicted key re-fetches fresh data and re-caches correctly', async () => {
    const service = createAppService(2);
    vi.mocked(microAppRepo.getPaginated)
      .mockResolvedValueOnce(pageResult([makeApp('a')]))
      .mockResolvedValueOnce(pageResult([makeApp('b')]))
      .mockResolvedValueOnce(pageResult([makeApp('c')]))
      .mockResolvedValueOnce(pageResult([makeApp('x', 'fresh-a')]));

    await service.getApps(1, 12); // caches a
    await service.getApps(2, 12); // caches b
    await service.getApps(3, 12); // evicts a

    const refetched = await service.getApps(1, 12); // miss → fresh fetch
    expect(refetched.items[0].name).toBe('fresh-a');
    expect(service.getCacheSize()).toBe(2);
    expect(microAppRepo.getPaginated).toHaveBeenCalledTimes(4);
  });
});

describe('AppService prefetch (predictive cache warming)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('warms the cache so a later getApps for the same page skips the DB', async () => {
    const service = makeService();
    vi.mocked(microAppRepo.getPaginated).mockResolvedValue(pageResult([makeApp('a')]));

    service.prefetchApps(2, 12);
    await flush();

    // Prefetched page is now a fresh cache hit.
    expect(service.hasCachedPage(2, 12)).toBe(true);
    const result = await service.getApps(2, 12);
    expect(result.items[0].id).toBe('a');
    // One DB call for the prefetch; the real read was served from cache.
    expect(microAppRepo.getPaginated).toHaveBeenCalledTimes(1);
  });

  it('is silent — prefetching never notifies subscribers', async () => {
    const service = makeService();
    vi.mocked(microAppRepo.getPaginated).mockResolvedValue(pageResult([makeApp('a')]));

    const listener = vi.fn();
    const unsubscribe = service.subscribe(listener);

    service.prefetchApps(2, 12);
    await flush();

    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('no-ops when the page is already cached fresh', async () => {
    const service = makeService();
    vi.mocked(microAppRepo.getPaginated).mockResolvedValue(pageResult([makeApp('a')]));

    // Real read populates the cache…
    await service.getApps(1, 12);
    expect(microAppRepo.getPaginated).toHaveBeenCalledTimes(1);

    // …so prefetching the same page must not hit the DB again.
    service.prefetchApps(1, 12);
    await flush();
    expect(microAppRepo.getPaginated).toHaveBeenCalledTimes(1);
  });

  it('coalesces with an in-flight read — one DB round-trip total', async () => {
    const service = makeService();
    let resolveRead!: (r: PaginatedResult<AppSchema>) => void;
    vi.mocked(microAppRepo.getPaginated).mockImplementation(
      () => new Promise((res) => (resolveRead = res))
    );

    const read = service.getApps(3, 12);
    service.prefetchApps(3, 12); // same key → joins the in-flight read
    resolveRead(pageResult([makeApp('a')]));
    await read;
    await flush();

    expect(microAppRepo.getPaginated).toHaveBeenCalledTimes(1);
    expect(service.hasCachedPage(3, 12)).toBe(true);
  });

  it('swallows fetch failures and leaves the cache cold for a real read', async () => {
    const service = makeService();
    vi.mocked(microAppRepo.getPaginated)
      .mockRejectedValueOnce(new Error('IndexedDB unavailable'))
      .mockResolvedValueOnce(pageResult([makeApp('ok')]));

    // Best-effort: must NOT throw even though the fetch fails.
    service.prefetchApps(4, 12);
    await flush();

    expect(service.hasCachedPage(4, 12)).toBe(false);

    // The next real read re-fetches on demand and succeeds.
    const result = await service.getApps(4, 12);
    expect(result.items[0].id).toBe('ok');
    expect(microAppRepo.getPaginated).toHaveBeenCalledTimes(2);
  });

  it('prefetchSearch warms search keys for a query page', async () => {
    const service = makeService();
    vi.mocked(microAppRepo.search).mockResolvedValue(pageResult([makeApp('s')]));

    service.prefetchSearch('clay', 2, 12);
    await flush();

    const result = await service.searchApps('clay', 2, 12);
    expect(result.items[0].id).toBe('s');
    expect(microAppRepo.search).toHaveBeenCalledTimes(1);
  });

  it('prefetchSearch ignores empty queries (no DB call)', async () => {
    const service = makeService();

    service.prefetchSearch('   ', 2, 12);
    await flush();

    expect(microAppRepo.search).not.toHaveBeenCalled();
  });

  it('drops prefetched data that resolves after a mutation (epoch guard)', async () => {
    const service = makeService();
    let resolvePrefetch!: (r: PaginatedResult<AppSchema>) => void;
    vi.mocked(microAppRepo.getPaginated).mockImplementation(
      () => new Promise((res) => (resolvePrefetch = res))
    );
    vi.mocked(microAppRepo.create).mockResolvedValue(undefined);

    // Start a slow prefetch, then mutate before it resolves.
    service.prefetchApps(2, 12);
    await service.createApp(makeApp('b'));
    resolvePrefetch(pageResult([makeApp('stale')]));
    await flush();

    // The stale prefetch must NOT be cached — next read re-fetches fresh.
    expect(service.hasCachedPage(2, 12)).toBe(false);
    vi.mocked(microAppRepo.getPaginated).mockResolvedValue(pageResult([makeApp('fresh')]));
    const result = await service.getApps(2, 12);
    expect(result.items[0].id).toBe('fresh');
  });

  it('prefetched pages respect LRU eviction alongside real reads', async () => {
    const service = createAppService(3);
    vi.mocked(microAppRepo.getPaginated).mockResolvedValue(pageResult([makeApp('a')]));

    // Two real reads + one prefetch → 3 entries at the cap.
    await service.getApps(1, 12);
    await service.getApps(2, 12);
    service.prefetchApps(3, 12);
    await flush();
    expect(service.getCacheSize()).toBe(3);

    // A fourth read evicts the LRU entry; cache stays bounded.
    await service.getApps(4, 12);
    expect(service.getCacheSize()).toBe(3);
    expect(microAppRepo.getPaginated).toHaveBeenCalledTimes(4);
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

describe('AppService getAppById (run-page read path)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('caches a fetched app so a second read of the same id skips the DB', async () => {
    const service = makeService();
    vi.mocked(microAppRepo.getById).mockResolvedValue(makeApp('run-1'));

    const first = await service.getAppById('run-1');
    const second = await service.getAppById('run-1');

    expect(first?.id).toBe('run-1');
    expect(second?.id).toBe('run-1');
    // Dashboard → run → back → run reuses the cached record, no IndexedDB re-hit.
    expect(microAppRepo.getById).toHaveBeenCalledTimes(1);
  });

  it('caches a miss briefly (negative cache) and re-fetches after the fresh window', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-04T00:00:00.000Z'));
    const service = makeService();
    vi.mocked(microAppRepo.getById).mockResolvedValue(undefined);

    const miss = await service.getAppById('run-1');
    expect(miss).toBeUndefined();
    expect(microAppRepo.getById).toHaveBeenCalledTimes(1);

    // Within the 5s fresh window the miss is served from cache — no DB hit.
    const again = await service.getAppById('run-1');
    expect(again).toBeUndefined();
    expect(microAppRepo.getById).toHaveBeenCalledTimes(1);

    // Past the fresh window but inside the SWR window: stale miss served
    // instantly, then a background revalidation picks up the now-existing app.
    await vi.advanceTimersByTimeAsync(6_000);
    vi.mocked(microAppRepo.getById).mockResolvedValue(makeApp('run-1'));
    const stale = await service.getAppById('run-1');
    expect(stale).toBeUndefined();
    await flush();
    const hit = await service.getAppById('run-1');
    expect(hit?.id).toBe('run-1');
    expect(microAppRepo.getById).toHaveBeenCalledTimes(2);
  });

  it('invalidates the cached app after a mutation (epoch bump)', async () => {
    const service = makeService();
    vi.mocked(microAppRepo.getById).mockResolvedValue(makeApp('run-1', 'Old Name'));
    vi.mocked(microAppRepo.update).mockResolvedValue(undefined);

    await service.getAppById('run-1');
    expect(microAppRepo.getById).toHaveBeenCalledTimes(1);

    // Editing the app in the builder clears the cache — the run page must
    // never show the pre-edit snapshot after a mutation.
    await service.updateApp('run-1', { name: 'New Name' });

    vi.mocked(microAppRepo.getById).mockResolvedValue(makeApp('run-1', 'New Name'));
    const fresh = await service.getAppById('run-1');
    expect(fresh?.name).toBe('New Name');
    expect(microAppRepo.getById).toHaveBeenCalledTimes(2);
  });
});
