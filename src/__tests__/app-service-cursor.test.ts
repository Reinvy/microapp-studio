/**
 * app-service-cursor.test.ts — Unit tests for the keyset (cursor) pagination
 * path of AppService (getAppsCursor).
 *
 * The repo layer is fully mocked (Dexie/IndexedDB never loads), isolating
 * the service's own guarantees for the cursor path:
 * - Fresh cursor-page cache hits skip the DB entirely.
 * - Concurrent identical cursor reads (e.g. double "load more" taps) are
 *   coalesced into ONE IndexedDB round-trip.
 * - Mutations invalidate cursor pages like any other cached query.
 * - The LRU cap applies to cursor keys too (deep paging = many distinct
 *   cursor keys).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/db/microAppRepo', () => ({
  microAppRepo: {
    getPageAfter: vi.fn(),
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
import type { Cursor, CursorPage } from '@/lib/cursorPagination';

type Service = ReturnType<typeof createAppService>;

function makeService(maxEntries?: number): Service {
  return maxEntries === undefined ? createAppService() : createAppService(maxEntries);
}

function makeApp(id: string, updatedAt: number): AppSchema {
  return {
    id,
    name: `App ${id}`,
    description: 'desc',
    prompt: 'prompt',
    fields: [],
    logicNodes: [],
    layout: [],
    createdAt: updatedAt,
    updatedAt,
    version: 1,
  };
}

function cursorPage(
  items: AppSchema[],
  pageSize: number,
  nextCursor: Cursor | null = null
): CursorPage<AppSchema> {
  return {
    items,
    total: 100,
    nextCursor,
    hasMore: nextCursor !== null,
    pageSize,
  };
}

/** Flush pending microtask chains (background revalidation completes here). */
async function flush(): Promise<void> {
  for (let i = 0; i < 5; i++) await Promise.resolve();
}

describe('AppService getAppsCursor', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fetches the first page through the repo when the cache is cold', async () => {
    const service = makeService();
    const page = cursorPage([makeApp('a', 300)], 12, { updatedAt: 300, id: 'a' });
    vi.mocked(microAppRepo.getPageAfter).mockResolvedValue(page);

    const result = await service.getAppsCursor(null, 12);

    expect(result).toEqual(page);
    expect(microAppRepo.getPageAfter).toHaveBeenCalledTimes(1);
    expect(microAppRepo.getPageAfter).toHaveBeenCalledWith(null, 12);
  });

  it('serves a fresh cursor page from cache without touching the DB twice', async () => {
    const service = makeService();
    const cursor: Cursor = { updatedAt: 300, id: 'a' };
    const page = cursorPage([makeApp('b', 200)], 12, null);
    vi.mocked(microAppRepo.getPageAfter).mockResolvedValue(page);

    const first = await service.getAppsCursor(cursor, 12);
    const second = await service.getAppsCursor(cursor, 12);

    expect(first).toEqual(page);
    expect(second).toEqual(page);
    expect(microAppRepo.getPageAfter).toHaveBeenCalledTimes(1);
  });

  it('uses distinct cache keys for the start page vs cursor pages', async () => {
    const service = makeService();
    const cursor: Cursor = { updatedAt: 300, id: 'a' };
    vi.mocked(microAppRepo.getPageAfter).mockResolvedValue(
      cursorPage([makeApp('x', 1)], 12, null)
    );

    await service.getAppsCursor(null, 12);
    await service.getAppsCursor(cursor, 12);

    // Two independent cache entries (start key + cursor key) — each page is
    // cached under its own key, so paging forward never evicts the start
    // page or aliases it with a cursor page.
    expect(service.getCacheSize()).toBe(2);
    expect(microAppRepo.getPageAfter).toHaveBeenCalledTimes(2);
  });

  it('coalesces concurrent identical cursor reads into one DB round-trip', async () => {
    const service = makeService();
    const cursor: Cursor = { updatedAt: 300, id: 'a' };
    vi.mocked(microAppRepo.getPageAfter).mockResolvedValue(
      cursorPage([makeApp('b', 200)], 12, null)
    );

    const [r1, r2, r3] = await Promise.all([
      service.getAppsCursor(cursor, 12),
      service.getAppsCursor(cursor, 12),
      service.getAppsCursor(cursor, 12),
    ]);

    expect(r1.items).toHaveLength(1);
    expect(r2.items).toHaveLength(1);
    expect(r3.items).toHaveLength(1);
    expect(microAppRepo.getPageAfter).toHaveBeenCalledTimes(1);
  });

  it('invalidates cursor pages after a mutation', async () => {
    const service = makeService();
    const cursor: Cursor = { updatedAt: 300, id: 'a' };
    vi.mocked(microAppRepo.getPageAfter).mockResolvedValue(
      cursorPage([makeApp('b', 200)], 12, null)
    );

    await service.getAppsCursor(cursor, 12);
    await service.removeApp('b');
    await service.getAppsCursor(cursor, 12);

    // First read + post-mutation re-read → two repo calls.
    expect(microAppRepo.getPageAfter).toHaveBeenCalledTimes(2);
  });

  it('drops stale in-flight cursor reads that complete after a mutation', async () => {
    const service = makeService();
    const cursor: Cursor = { updatedAt: 300, id: 'a' };

    // A slow read that resolves AFTER the mutation.
    let resolveSlow!: (p: CursorPage<AppSchema>) => void;
    vi.mocked(microAppRepo.getPageAfter).mockImplementationOnce(
      () =>
        new Promise<CursorPage<AppSchema>>((resolve) => {
          resolveSlow = resolve;
        })
    );

    const pending = service.getAppsCursor(cursor, 12);
    await service.removeApp('b'); // bumps epoch + clears cache
    resolveSlow(cursorPage([makeApp('stale', 1)], 12, null));
    await flush();

    // The stale result must NOT have been cached: a fresh read hits the repo.
    vi.mocked(microAppRepo.getPageAfter).mockResolvedValue(
      cursorPage([makeApp('fresh', 2)], 12, null)
    );
    const result = await service.getAppsCursor(cursor, 12);

    expect(result.items[0].id).toBe('fresh');
    expect(microAppRepo.getPageAfter).toHaveBeenCalledTimes(2);
    await pending;
  });

  it('applies the LRU cap to cursor cache entries', async () => {
    const service = makeService(2); // tiny cap for the test
    vi.mocked(microAppRepo.getPageAfter).mockImplementation(
      async (_cursor: Cursor | null) =>
        cursorPage([makeApp('x', Math.random())], 12, null)
    );

    const c1: Cursor = { updatedAt: 1, id: 'a' };
    const c2: Cursor = { updatedAt: 2, id: 'b' };
    const c3: Cursor = { updatedAt: 3, id: 'c' };

    await service.getAppsCursor(c1, 12);
    await service.getAppsCursor(c2, 12);
    await service.getAppsCursor(c3, 12); // evicts c1 (LRU)

    expect(service.getCacheSize()).toBeLessThanOrEqual(2);

    // c1 was evicted → refetch hits the repo again.
    await service.getAppsCursor(c1, 12);
    expect(microAppRepo.getPageAfter).toHaveBeenCalledTimes(4);
  });
});
