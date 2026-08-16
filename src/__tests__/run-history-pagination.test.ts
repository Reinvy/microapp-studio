/**
 * run-history-pagination.test.ts — Unit tests for the paginated run-history
 * browser: cached service reads + clear-history invalidation, seeded
 * 'run-history-dialog-copy' / 'recently-run-copy' copy, and claymorphism v3
 * compliance on the new dialog.
 *
 * The repo module is mocked (Dexie/IndexedDB never loads), isolating the
 * service's own guarantees:
 * - getHistoryPage caches per (page, pageSize) key within the TTL window.
 * - clearHistory wipes the repo and drops every cached slice.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';

// Stub the repo module so the real module (which imports Dexie) never loads.
// vi.mock is hoisted above imports by vitest, so the service import below
// already sees the mocked repo.
vi.mock('@/db/runHistoryRepo', () => ({
  runHistoryRepo: {
    recordRun: vi.fn(),
    getRecentRuns: vi.fn(),
    getHistoryPage: vi.fn(),
    getRunStats: vi.fn(),
    prune: vi.fn(),
    count: vi.fn(),
    clearAll: vi.fn(),
  },
}));

import { runHistoryRepo, type RunRecord, type PaginatedRunHistory } from '@/db/runHistoryRepo';
import { runHistoryService } from '@/services/runHistoryService';
import { seedContent } from '@/db/seed';
import type { RunHistoryDialogCopy, RecentlyRunCopy } from '@/db/contentRepo';

const mockedRepo = vi.mocked(runHistoryRepo);

const repoRoot = path.resolve(__dirname, '..', '..');
const dialogSource = readFileSync(
  path.join(repoRoot, 'src', 'components', 'dashboard', 'RunHistoryDialog.tsx'),
  'utf8'
);

function makeRun(id: string, appId: string, appName: string, ranAt: number): RunRecord {
  return { id, appId, appName, ranAt };
}

function makePage(
  page: number,
  pageSize: number,
  total: number
): PaginatedRunHistory {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return { items: [], total, page: Math.min(page, totalPages), pageSize, totalPages };
}

const NOW = 1_800_000_000_000;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  mockedRepo.recordRun.mockReset();
  mockedRepo.getRecentRuns.mockReset();
  mockedRepo.getHistoryPage.mockReset();
  mockedRepo.getRunStats.mockReset();
  mockedRepo.clearAll.mockReset();
  // The service is a module singleton — drop its cache so entries from one
  // test never bleed into the next (fake system time resets backwards).
  runHistoryService.invalidate();
});

afterEach(() => {
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// runHistoryService.getHistoryPage — TTL cache per page/pageSize key
// ---------------------------------------------------------------------------

describe('runHistoryService.getHistoryPage', () => {
  it('serves the same page from cache within the TTL window', async () => {
    const page = makePage(1, 8, 20);
    mockedRepo.getHistoryPage.mockResolvedValue(page);

    await runHistoryService.getHistoryPage(1, 8);
    await runHistoryService.getHistoryPage(1, 8);

    expect(mockedRepo.getHistoryPage).toHaveBeenCalledTimes(1);
    expect(mockedRepo.getHistoryPage).toHaveBeenCalledWith(1, 8);
  });

  it('caches distinct (page, pageSize) combos under separate keys', async () => {
    mockedRepo.getHistoryPage.mockImplementation(async (page?: number, pageSize?: number) =>
      makePage(page ?? 1, pageSize ?? 8, 40)
    );

    await runHistoryService.getHistoryPage(1, 8);
    await runHistoryService.getHistoryPage(2, 8);
    await runHistoryService.getHistoryPage(1, 12);

    expect(mockedRepo.getHistoryPage).toHaveBeenCalledTimes(3);
  });

  it('re-fetches after the TTL window expires', async () => {
    mockedRepo.getHistoryPage.mockResolvedValue(makePage(1, 8, 20));

    await runHistoryService.getHistoryPage(1, 8);
    expect(mockedRepo.getHistoryPage).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(11_000);
    mockedRepo.getHistoryPage.mockResolvedValue(makePage(1, 8, 21));
    const fresh = await runHistoryService.getHistoryPage(1, 8);
    expect(fresh.total).toBe(21);
    expect(mockedRepo.getHistoryPage).toHaveBeenCalledTimes(2);
  });

  it('falls back to the stale snapshot when the repo read fails', async () => {
    const page = makePage(1, 8, 20);
    mockedRepo.getHistoryPage.mockResolvedValueOnce(page);

    await runHistoryService.getHistoryPage(1, 8);

    vi.advanceTimersByTime(11_000);
    mockedRepo.getHistoryPage.mockRejectedValueOnce(new Error('IndexedDB unavailable'));
    const fallback = await runHistoryService.getHistoryPage(1, 8);
    expect(fallback.total).toBe(20);
  });

  it('recordRun invalidates cached history pages', async () => {
    mockedRepo.getHistoryPage.mockResolvedValue(makePage(1, 8, 10));
    mockedRepo.recordRun.mockResolvedValue(makeRun('r2', 'a2', 'Budget', NOW));

    await runHistoryService.getHistoryPage(1, 8);
    expect(mockedRepo.getHistoryPage).toHaveBeenCalledTimes(1);

    runHistoryService.recordRun('a2', 'Budget');
    await Promise.resolve();
    await Promise.resolve();

    mockedRepo.getHistoryPage.mockResolvedValue(makePage(1, 8, 11));
    const after = await runHistoryService.getHistoryPage(1, 8);
    expect(after.total).toBe(11);
    expect(mockedRepo.getHistoryPage).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// runHistoryService.clearHistory — wipe + full cache invalidation
// ---------------------------------------------------------------------------

describe('runHistoryService.clearHistory', () => {
  it('calls repo.clearAll and drops every cached history slice', async () => {
    mockedRepo.getHistoryPage.mockImplementation(async (page?: number, pageSize?: number) =>
      makePage(page ?? 1, pageSize ?? 8, 50)
    );
    mockedRepo.clearAll.mockResolvedValue(undefined);

    await runHistoryService.getHistoryPage(1, 8);
    await runHistoryService.getHistoryPage(3, 8);
    expect(mockedRepo.getHistoryPage).toHaveBeenCalledTimes(2);

    await runHistoryService.clearHistory();
    expect(mockedRepo.clearAll).toHaveBeenCalledTimes(1);

    // Cache was emptied — the next read of either page re-fetches from the repo.
    mockedRepo.getHistoryPage.mockResolvedValue(makePage(1, 8, 0));
    await runHistoryService.getHistoryPage(1, 8);
    expect(mockedRepo.getHistoryPage).toHaveBeenCalledTimes(3);
    expect(mockedRepo.getHistoryPage).toHaveBeenLastCalledWith(1, 8);
  });

  it('never throws when the repo clear fails (best-effort)', async () => {
    mockedRepo.clearAll.mockRejectedValue(new Error('clear failed'));

    await expect(runHistoryService.clearHistory()).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Seed integrity — 'run-history-dialog-copy' + strip copy fallback parity
// ---------------------------------------------------------------------------

/**
 * Extract a plain-data const literal from a component source file and
 * evaluate it (mirrors footer-content.test.ts's extractConst helper).
 */
function extractConst<T>(source: string, name: string, typeAnnot: string): T {
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = source.match(new RegExp(`const ${esc(name)}: ${esc(typeAnnot)} = ([\\s\\S]*?);`));
  expect(match, `const ${name} not found`).toBeTruthy();
  return new Function(`return (${match![1]})`)() as T;
}

const seedDialogCopy = seedContent.find((c) => c.type === 'run-history-dialog-copy')?.data as
  | RunHistoryDialogCopy
  | undefined;
const seedStripCopy = seedContent.find((c) => c.type === 'recently-run-copy')?.data as
  | RecentlyRunCopy
  | undefined;

describe('run-history copy seeding + fallback parity', () => {
  it('seeds run-history-dialog-copy with every field the dialog uses', () => {
    expect(seedDialogCopy).toBeTruthy();
    expect(seedDialogCopy!.title).toBe('Run History');
    expect(seedDialogCopy!.subtitle).toContain('trail');
    expect(typeof seedDialogCopy!.clearLabel).toBe('string');
    expect(typeof seedDialogCopy!.confirmClear).toBe('string');
    expect(typeof seedDialogCopy!.pageAria).toBe('string');
  });

  it('dialog fallback copy mirrors the seeded copy exactly (no first-paint drift)', () => {
    const fallback = extractConst<RunHistoryDialogCopy>(
      dialogSource,
      'defaultCopy',
      'RunHistoryDialogCopy'
    );
    expect(fallback).toEqual(seedDialogCopy);
  });

  it("strip copy seeds the new viewAllLabel and the strip's fallback mirrors it", () => {
    expect(seedStripCopy!.viewAllLabel).toBe('View all');
    const stripSource = readFileSync(
      path.join(repoRoot, 'src', 'components', 'dashboard', 'RecentlyRun.tsx'),
      'utf8'
    );
    const fallback = extractConst<RecentlyRunCopy>(stripSource, 'defaultCopy', 'RecentlyRunCopy');
    expect(fallback).toEqual(seedStripCopy);
  });
});

// ---------------------------------------------------------------------------
// Claymorphism v3 compliance on the new dialog source
// ---------------------------------------------------------------------------

describe('RunHistoryDialog claymorphism v3 compliance', () => {
  it('uses clay tokens/classes and pastel backgrounds (no raw black text)', () => {
    // Text colors must be warm (#4A3F35) or utility classes — never #000000.
    expect(dialogSource).not.toMatch(/#000000/i);
    // Clay building blocks: cards, buttons, inset shadow input, emboss.
    expect(dialogSource).toMatch(/clay-card/);
    expect(dialogSource).toMatch(/clay-button|clay-sm/);
    expect(dialogSource).toMatch(/clay-input/);
    // Clay interactive scale transforms: hover up, active down.
    expect(dialogSource).toMatch(/hover:scale-105/);
    expect(dialogSource).toMatch(/active:scale-95/);
  });

  it('paginates with bounded window (getPageRange) so the bar never grows', () => {
    // 8 rows per page + shared getPageRange ellipsis window from lib/pagination.
    expect(dialogSource).toMatch(/const PAGE_SIZE = 8/);
    expect(dialogSource).toMatch(/getPageRange\(page, totalPages\)/);
    expect(dialogSource).toMatch(/clampPage/);
  });
});