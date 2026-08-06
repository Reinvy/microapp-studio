/**
 * Pagination helpers — pure, framework-free, unit-tested.
 *
 * Extracted from the dashboard page so pagination math (page clamping and
 * ellipsis windowing) is shared, predictable, and testable in isolation.
 * Keeping this logic framework-free means it can be reused by any view
 * (dashboard grid, admin tables, run-history lists) without dragging in
 * React state.
 */

/** Clamp a page number into the valid range [1, totalPages]. */
export function clampPage(page: number, totalPages: number): number {
  if (!Number.isFinite(page) || page < 1) return 1;
  if (!Number.isFinite(totalPages) || totalPages < 1) return 1;
  return Math.min(page, Math.floor(totalPages));
}

/** One entry in the pagination window: a page number or an ellipsis gap. */
export type PageRangeItem = number | 'ellipsis';

/**
 * Build the pagination window for the page-number bar.
 *
 * Small totals (<= 7 pages) render every page. Larger totals render a
 * compact constant-size window around the current page with ellipsis
 * markers at the gaps, so the bar never grows no matter how many pages
 * exist — this is what keeps the dashboard nav scalable to thousands of
 * apps while staying one row tall.
 */
export function getPageRange(page: number, totalPages: number): PageRangeItem[] {
  const safePage = clampPage(page, totalPages);
  const last = Math.max(1, Math.floor(totalPages));
  const range: PageRangeItem[] = [];

  if (last <= 7) {
    for (let i = 1; i <= last; i++) range.push(i);
    return range;
  }

  range.push(1);
  if (safePage > 3) range.push('ellipsis');
  for (let i = Math.max(2, safePage - 1); i <= Math.min(last - 1, safePage + 1); i++) {
    range.push(i);
  }
  if (safePage < last - 2) range.push('ellipsis');
  range.push(last);
  return range;
}
