/**
 * content-service.test.ts — Unit tests for the ContentService scalability layer.
 *
 * The repo layer is fully mocked (Dexie/IndexedDB never loads), isolating the
 * service's own guarantees:
 * - Batch reads resolve N content types with ONE repo round trip (`anyOf`).
 * - Fresh-window cache hits skip the DB entirely.
 * - Batch reads warm per-type cache entries, so later single-type reads
 *   (Navbar/Footer mounting after the landing page) are instant cache hits.
 * - Concurrent identical batches are coalesced into ONE IndexedDB round-trip.
 * - Stale-while-revalidate serves a stale snapshot instantly and revalidates
 *   in the background.
 * - Mutations invalidate the cache and notify subscribers.
 * - The LRU cap keeps memory bounded across many distinct content types.
 * - Read failures resolve to `undefined` per type — consumers keep fallbacks.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Stub the repo module so the real module (which imports Dexie) never loads.
vi.mock('@/db/contentRepo', () => ({
  contentRepo: {
    getByType: vi.fn(),
    getMany: vi.fn(),
    save: vi.fn(),
    bulkSave: vi.fn(),
    exists: vi.fn(),
  },
}));

import { createContentService } from '@/services/contentService';
import { contentRepo } from '@/db/contentRepo';
import type { SiteContent, SiteContentData } from '@/db/contentRepo';

type Service = ReturnType<typeof createContentService>;

/** Fresh service instance per test — isolated cache + in-flight state. */
function makeService(maxEntries?: number): Service {
  return createContentService(maxEntries);
}

function makeContent(type: string, data: unknown = { value: type }): SiteContent {
  return { id: type, type, data: data as SiteContentData };
}

/** Flush pending microtask chains (background revalidation completes here). */
async function flush(): Promise<void> {
  for (let i = 0; i < 5; i++) await Promise.resolve();
}

describe('ContentService batch reads', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves N types with ONE repo round trip', async () => {
    const service = makeService();
    vi.mocked(contentRepo.getMany).mockResolvedValue([
      makeContent('hero-content', { badge: 'Hi' }),
      makeContent('landing-features', [{ title: 'F1' }]),
    ]);

    const map = await service.getContentMany(['hero-content', 'landing-features']);

    expect(map['hero-content']?.data).toEqual({ badge: 'Hi' });
    expect(map['landing-features']?.data).toEqual([{ title: 'F1' }]);
    expect(contentRepo.getMany).toHaveBeenCalledTimes(1);
    expect(contentRepo.getMany).toHaveBeenCalledWith(['hero-content', 'landing-features']);
  });

  it('dedupes repeated types within one batch call', async () => {
    const service = makeService();
    vi.mocked(contentRepo.getMany).mockResolvedValue([makeContent('a')]);

    const map = await service.getContentMany(['a', 'a', 'a']);

    expect(contentRepo.getMany).toHaveBeenCalledTimes(1);
    expect(contentRepo.getMany).toHaveBeenCalledWith(['a']);
    expect(map['a']).toBeDefined();
  });

  it('returns an empty map for an empty type list without touching the DB', async () => {
    const service = makeService();
    const map = await service.getContentMany([]);
    expect(map).toEqual({});
    expect(contentRepo.getMany).not.toHaveBeenCalled();
  });
});

describe('ContentService read caching', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('serves a fresh cache hit without touching the DB twice', async () => {
    const service = makeService();
    vi.mocked(contentRepo.getMany).mockResolvedValue([makeContent('hero-content')]);

    await service.getContentMany(['hero-content']);
    await service.getContentMany(['hero-content']);

    expect(contentRepo.getMany).toHaveBeenCalledTimes(1);
  });

  it('warms per-type cache entries so single-type reads are instant hits', async () => {
    const service = makeService();
    const navLinks = [{ label: 'Features', href: '#features' }];
    vi.mocked(contentRepo.getMany).mockResolvedValue([makeContent('nav-links', navLinks)]);

    // Landing page batches everything…
    await service.getContentMany(['hero-content', 'nav-links', 'footer-columns']);
    expect(contentRepo.getMany).toHaveBeenCalledTimes(1);

    // …then Navbar asks for just `nav-links`: cache hit, zero extra DB calls.
    const links = await service.getContent<typeof navLinks>('nav-links');

    expect(links).toEqual(navLinks);
    expect(contentRepo.getMany).toHaveBeenCalledTimes(1);
    expect(contentRepo.getByType).not.toHaveBeenCalled();
  });

  it('coalesces concurrent identical batches into one round trip', async () => {
    const service = makeService();
    let resolveFetch!: (value: SiteContent[]) => void;
    vi.mocked(contentRepo.getMany).mockReturnValue(
      new Promise<SiteContent[]>((resolve) => {
        resolveFetch = resolve;
      })
    );

    const p1 = service.getContentMany(['hero-content']);
    const p2 = service.getContentMany(['hero-content']);
    resolveFetch([makeContent('hero-content')]);
    const [r1, r2] = await Promise.all([p1, p2]);

    expect(contentRepo.getMany).toHaveBeenCalledTimes(1);
    expect(r1['hero-content']).toBeDefined();
    expect(r2['hero-content']).toBeDefined();
  });

  it('serves a stale snapshot instantly and revalidates in the background', async () => {
    vi.useFakeTimers();
    const service = makeService();
    const listener = vi.fn();
    service.subscribe(listener);
    vi.mocked(contentRepo.getMany).mockResolvedValue([makeContent('hero-content', { v: 1 })]);

    await service.getContentMany(['hero-content']);

    // Age past the fresh window (10s) but stay inside the SWR window (60s).
    vi.advanceTimersByTime(11_000);
    vi.mocked(contentRepo.getByType).mockResolvedValue(makeContent('hero-content', { v: 2 }));

    const map = await service.getContentMany(['hero-content']);

    // Stale snapshot served instantly — no new batch fetch. The background
    // revalidation kicked off synchronously (fire-and-forget, non-blocking).
    expect(map['hero-content']?.data).toEqual({ v: 1 });
    expect(contentRepo.getMany).toHaveBeenCalledTimes(1);
    expect(contentRepo.getByType).toHaveBeenCalledTimes(1);

    // Background revalidation completes and notifies subscribers.
    await flush();
    expect(contentRepo.getByType).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledTimes(1);

    // The next read sees the revalidated value.
    const next = await service.getContentMany(['hero-content']);
    expect(next['hero-content']?.data).toEqual({ v: 2 });
  });

  it('evicts least-recently-used types when the LRU cap is exceeded', async () => {
    const service = makeService(2);
    vi.mocked(contentRepo.getMany).mockImplementation(async (types: string[]) =>
      types.map((type) => makeContent(type))
    );

    await service.getContentMany(['a']);
    await service.getContentMany(['b']);
    await service.getContentMany(['c']);

    expect(service.getCacheSize()).toBe(2);

    // 'a' was evicted — reading it again must hit the DB.
    vi.mocked(contentRepo.getMany).mockClear();
    await service.getContentMany(['a']);
    expect(contentRepo.getMany).toHaveBeenCalledTimes(1);
  });
});

describe('ContentService mutations', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('invalidates the cache and notifies subscribers on save', async () => {
    const service = makeService();
    const listener = vi.fn();
    service.subscribe(listener);
    vi.mocked(contentRepo.getMany).mockResolvedValue([makeContent('hero-content', { v: 1 })]);

    await service.getContentMany(['hero-content']);
    expect(contentRepo.getMany).toHaveBeenCalledTimes(1);

    vi.mocked(contentRepo.save).mockResolvedValue(undefined);
    await service.saveContent(makeContent('hero-content', { v: 2 }));

    expect(listener).toHaveBeenCalledTimes(1);
    expect(service.getCacheSize()).toBe(0);

    // Next read hits the DB again and sees the new value.
    vi.mocked(contentRepo.getMany).mockResolvedValue([makeContent('hero-content', { v: 2 })]);
    const map = await service.getContentMany(['hero-content']);
    expect(map['hero-content']?.data).toEqual({ v: 2 });
    expect(contentRepo.getMany).toHaveBeenCalledTimes(2);
  });

  it('invalidates + notifies on bulk save and no-ops on an empty batch', async () => {
    const service = makeService();
    const listener = vi.fn();
    service.subscribe(listener);

    await service.saveContentMany([]);
    expect(contentRepo.bulkSave).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();

    vi.mocked(contentRepo.bulkSave).mockResolvedValue(undefined);
    await service.saveContentMany([makeContent('landing-features')]);
    expect(contentRepo.bulkSave).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('ContentService fail-safe reads', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves undefined per type when the batch read fails', async () => {
    const service = makeService();
    vi.mocked(contentRepo.getMany).mockRejectedValue(new Error('IndexedDB unavailable'));

    const map = await service.getContentMany(['hero-content', 'landing-features']);

    expect(map['hero-content']).toBeUndefined();
    expect(map['landing-features']).toBeUndefined();
  });

  it('serves the stale snapshot for a type whose refresh failed', async () => {
    const service = makeService();
    vi.mocked(contentRepo.getMany).mockResolvedValueOnce([makeContent('hero-content', { v: 1 })]);

    await service.getContentMany(['hero-content']);

    vi.mocked(contentRepo.getMany).mockRejectedValueOnce(new Error('IndexedDB unavailable'));
    const map = await service.getContentMany(['hero-content', 'landing-features']);

    // 'hero-content' falls back to its cached snapshot; 'landing-features' is undefined.
    expect(map['hero-content']?.data).toEqual({ v: 1 });
    expect(map['landing-features']).toBeUndefined();
  });
});
