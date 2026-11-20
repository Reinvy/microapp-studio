/**
 * Cursor (keyset) pagination helpers — pure, framework-free, unit-tested.
 *
 * Offset pagination (`offset(n).limit(k)`) is O(n) on large datasets: every
 * page past the first forces IndexedDB to skip over `n` records. Keyset
 * pagination replaces the offset with a **cursor** — the sort position of the
 * last item on the previous page — so each page reads ONLY its own slice via
 * the `[updatedAt+id]` compound index: O(log n + pageSize) per page, no matter
 * how deep you are.
 *
 * The cursor is the pair `(updatedAt, id)` — the tiebreaker makes it
 * unambiguous even when many apps share the exact same `updatedAt`
 * timestamp. Pages are ordered by `updatedAt` DESC, `id` DESC (the same
 * "most recently updated first" order the dashboard already uses).
 *
 * This module holds ONLY the pure derivation logic (what cursor does a page
 * produce? is there a next page?) so it can be unit-tested without Dexie.
 * The IndexedDB queries live in microAppRepo.getPageAfter().
 */

/** Sort position of the last item on a page — the key for the next page. */
export interface Cursor {
  updatedAt: number;
  id: string;
}

/** A page of results produced by keyset pagination. */
export interface CursorPage<T> {
  items: T[];
  /** Exact total record count (indexed count, cheap even at scale). */
  total: number;
  /**
   * Cursor for the NEXT page, or null when this is the last page.
   * A full page ALWAYS yields a cursor (even if it happens to be the final
   * page — the next read then simply returns an empty slice, which the
   * caller can detect via `items.length === 0`).
   */
  nextCursor: Cursor | null;
  /** True when a next page is likely to exist (items filled the page). */
  hasMore: boolean;
  pageSize: number;
}

/**
 * Derive the next-page cursor from a page of items.
 *
 * Rule: a page that came back FULL (exactly `pageSize` items) means there is
 * (almost certainly) more data, so the cursor points just past the last item.
 * A short page (or an empty one) means we reached the end → null.
 *
 * `T` is constrained to the shape that matters (updatedAt + id) so any
 * record type can be paged.
 */
export function deriveNextCursor<T extends { updatedAt: number; id: string }>(
  items: T[],
  pageSize: number
): Cursor | null {
  if (items.length === 0) return null;
  if (items.length < pageSize) return null;
  const last = items[items.length - 1];
  return { updatedAt: last.updatedAt, id: last.id };
}

/**
 * True when a full page implies more records exist. Kept as a separate pure
 * predicate so callers (and tests) can decide "should I fetch page N+1?"
 * without re-deriving the cursor object.
 */
export function hasMoreItems<T>(items: T[], pageSize: number): boolean {
  return items.length === pageSize;
}

/**
 * Compare two cursors in the `[updatedAt+id]` compound-index ordering
 * (ascending: smaller updatedAt first; ties broken by id).
 *
 * Useful for validating cursor chains in tests and for consumers that need
 * to reason about cursor monotonicity (each page's cursor must be strictly
 * "below" the previous page's first item, etc.).
 *
 * Returns -1 / 0 / 1.
 */
export function compareCursors(a: Cursor, b: Cursor): number {
  if (a.updatedAt !== b.updatedAt) {
    return a.updatedAt < b.updatedAt ? -1 : 1;
  }
  if (a.id !== b.id) {
    return a.id < b.id ? -1 : 1;
  }
  return 0;
}
