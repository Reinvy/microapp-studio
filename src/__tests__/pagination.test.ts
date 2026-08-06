/**
 * pagination.test.ts — Unit tests for the pure pagination helpers.
 *
 * These cover the math that used to live inline in the dashboard page:
 * page clamping (jump-to-page safety) and the constant-size ellipsis
 * window that keeps the nav bar scalable to arbitrarily many pages.
 */

import { describe, it, expect } from 'vitest';
import { clampPage, getPageRange } from '@/lib/pagination';

describe('clampPage', () => {
  it('keeps a valid page unchanged', () => {
    expect(clampPage(3, 10)).toBe(3);
  });

  it('clamps below-range pages to 1', () => {
    expect(clampPage(0, 10)).toBe(1);
    expect(clampPage(-5, 10)).toBe(1);
  });

  it('clamps above-range pages to the last page', () => {
    expect(clampPage(11, 10)).toBe(10);
    expect(clampPage(999, 10)).toBe(10);
  });

  it('handles degenerate totals safely', () => {
    expect(clampPage(1, 0)).toBe(1);
    expect(clampPage(1, -1)).toBe(1);
  });

  it('handles NaN and non-finite input safely', () => {
    // Non-finite page values are treated as invalid → page 1.
    expect(clampPage(Number.NaN, 10)).toBe(1);
    expect(clampPage(Infinity, 10)).toBe(1);
  });

  it('floors fractional totals', () => {
    expect(clampPage(9, 9.7)).toBe(9);
  });
});

describe('getPageRange', () => {
  it('renders every page for small totals (<= 7)', () => {
    expect(getPageRange(1, 1)).toEqual([1]);
    expect(getPageRange(1, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('renders the full set regardless of current page for small totals', () => {
    expect(getPageRange(5, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('stays constant-size with ellipsis gaps for large totals', () => {
    const range = getPageRange(5, 100);
    // 1 … 4 5 6 … 100 → 7 entries, never grows with totalPages.
    expect(range).toEqual([1, 'ellipsis', 4, 5, 6, 'ellipsis', 100]);
  });

  it('omits the leading ellipsis near the start', () => {
    // On page 1 the window collapses to [2] — 1 is the current-page button.
    expect(getPageRange(1, 100)).toEqual([1, 2, 'ellipsis', 100]);
    expect(getPageRange(2, 100)).toEqual([1, 2, 3, 'ellipsis', 100]);
  });

  it('omits the trailing ellipsis near the end', () => {
    expect(getPageRange(100, 100)).toEqual([1, 'ellipsis', 99, 100]);
    expect(getPageRange(99, 100)).toEqual([1, 'ellipsis', 98, 99, 100]);
  });

  it('always includes the current page in the window', () => {
    for (const page of [1, 2, 3, 4, 50, 97, 98, 99, 100]) {
      expect(getPageRange(page, 100)).toContain(page);
    }
  });

  it('clamps out-of-range pages before building the window', () => {
    expect(getPageRange(0, 100)).toEqual([1, 2, 'ellipsis', 100]);
    expect(getPageRange(999, 100)).toEqual([1, 'ellipsis', 99, 100]);
  });

  it('handles a single page gracefully', () => {
    expect(getPageRange(1, 1)).toHaveLength(1);
  });
});
