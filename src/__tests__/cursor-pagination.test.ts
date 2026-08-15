/**
 * cursor-pagination.test.ts — Unit tests for the pure keyset-pagination
 * helpers (src/lib/cursorPagination.ts).
 *
 * These cover the cursor derivation rules that make keyset pagination
 * correct at scale:
 * - A FULL page (exactly pageSize items) yields a cursor pointing just past
 *   its last item — the next read continues from there.
 * - A SHORT or EMPTY page yields null (end of the dataset).
 * - Cursor comparisons follow the [updatedAt+id] compound-index ordering,
 *   with `id` breaking `updatedAt` ties deterministically.
 */

import { describe, it, expect } from 'vitest';
import {
  deriveNextCursor,
  hasMoreItems,
  compareCursors,
  type Cursor,
} from '@/lib/cursorPagination';

interface Item {
  id: string;
  updatedAt: number;
}

function makeItem(id: string, updatedAt: number): Item {
  return { id, updatedAt };
}

describe('deriveNextCursor', () => {
  it('returns null for an empty page', () => {
    expect(deriveNextCursor([], 12)).toBeNull();
  });

  it('returns null when the page is short (end of dataset)', () => {
    const items = [makeItem('a', 100), makeItem('b', 90)];
    expect(deriveNextCursor(items, 12)).toBeNull();
  });

  it('yields a cursor on a full page even when it is the final page', () => {
    // A page that comes back FULL always yields a cursor — the caller
    // detects the end of the dataset by the NEXT read returning an empty
    // slice (the standard keyset contract; avoids a count() per page).
    const items = [makeItem('a', 100), makeItem('b', 90)];
    expect(deriveNextCursor(items, 2)).toEqual({ updatedAt: 90, id: 'b' });
  });

  it('returns a cursor from the last item when the page is full', () => {
    const items = [makeItem('a', 100), makeItem('b', 90), makeItem('c', 80)];
    expect(deriveNextCursor(items, 3)).toEqual({ updatedAt: 80, id: 'c' });
  });

  it('preserves the id tiebreaker for equal timestamps', () => {
    const items = [
      makeItem('a', 100),
      makeItem('b', 100),
      makeItem('c', 100),
    ];
    expect(deriveNextCursor(items, 3)).toEqual({ updatedAt: 100, id: 'c' });
  });

  it('never mutates the input items', () => {
    const items = [makeItem('a', 100), makeItem('b', 90)];
    const snapshot = JSON.stringify(items);
    deriveNextCursor(items, 1);
    expect(JSON.stringify(items)).toBe(snapshot);
  });
});

describe('hasMoreItems', () => {
  it('is true only when the page is exactly full', () => {
    expect(hasMoreItems([makeItem('a', 1)], 1)).toBe(true);
    expect(hasMoreItems([makeItem('a', 1)], 2)).toBe(false);
    expect(hasMoreItems([], 12)).toBe(false);
    expect(hasMoreItems([makeItem('a', 1), makeItem('b', 2)], 2)).toBe(true);
  });
});

describe('compareCursors', () => {
  const a: Cursor = { updatedAt: 100, id: 'a' };

  it('compares by updatedAt first', () => {
    expect(compareCursors(a, { updatedAt: 101, id: 'a' })).toBe(-1);
    expect(compareCursors({ updatedAt: 101, id: 'a' }, a)).toBe(1);
  });

  it('breaks timestamp ties by id', () => {
    expect(compareCursors(a, { updatedAt: 100, id: 'b' })).toBe(-1);
    expect(compareCursors({ updatedAt: 100, id: 'b' }, a)).toBe(1);
  });

  it('returns 0 for identical cursors', () => {
    expect(compareCursors(a, { updatedAt: 100, id: 'a' })).toBe(0);
  });

  it('is consistent with the [updatedAt+id] index ordering', () => {
    // Sort a shuffled list of cursors and assert ascending order.
    const cursors: Cursor[] = [
      { updatedAt: 50, id: 'x' },
      { updatedAt: 100, id: 'a' },
      { updatedAt: 100, id: 'z' },
      { updatedAt: 100, id: 'b' },
      { updatedAt: 70, id: 'm' },
    ];
    const sorted = [...cursors].sort(compareCursors);
    expect(sorted).toEqual([
      { updatedAt: 50, id: 'x' },
      { updatedAt: 70, id: 'm' },
      { updatedAt: 100, id: 'a' },
      { updatedAt: 100, id: 'b' },
      { updatedAt: 100, id: 'z' },
    ]);
  });
});
