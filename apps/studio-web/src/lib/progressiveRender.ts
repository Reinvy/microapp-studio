/**
 * progressiveRender.ts — Time-sliced progressive rendering helpers.
 *
 * The dashboard grid mounts one <AppCard /> per app on the page. At large
 * page sizes (config-driven up to dozens of cards) that synchronous mount
 * blocks the main thread on every page/sort/search change, and the layout
 * paints nothing until every card has rendered. These helpers time-slice
 * the reveal:
 *
 * 1. The FIRST batch renders synchronously — first paint is fast and the
 *    user sees content immediately.
 * 2. The remaining cards are revealed in small batches during idle periods
 *    (`requestIdleCallback`, falling back to `setTimeout`), so the main
 *    thread stays responsive no matter how many cards the page holds.
 * 3. Hidden cards render as lightweight skeleton placeholders, so the grid
 *    keeps its full height and the layout does not jump as batches land.
 *
 * The module is pure and framework-free: the reveal state machine and the
 * scheduler are unit-testable without React or a DOM. React glue lives in
 * `hooks/useProgressiveRender.ts`, the grid UI in
 * `components/dashboard/ProgressiveAppGrid.tsx`.
 */

/** Current reveal state: how many items are visible, and are we done? */
export interface ProgressiveState {
  /** Number of items currently revealed (rendered). */
  visibleCount: number;
  /** True when every item is revealed (or the dataset is empty). */
  done: boolean;
}

/**
 * Initial reveal state: show the first `initialBatch` items synchronously.
 *
 * Clamps to the dataset size and never returns `done: false` for an empty
 * dataset (an empty grid must not render placeholders).
 */
export function initialProgressiveState(
  total: number,
  initialBatch: number
): ProgressiveState {
  if (total <= 0) return { visibleCount: 0, done: true };
  const safeBatch = Math.max(1, Math.floor(initialBatch));
  const visibleCount = Math.min(total, safeBatch);
  return { visibleCount, done: visibleCount >= total };
}

/**
 * Advance the reveal by one batch of `batchSize` items.
 *
 * Idempotent: calling it twice with the same state returns the same result,
 * so duplicate idle callbacks (StrictMode double-effects, coalesced
 * timers) can never over-reveal.
 */
export function nextProgressiveState(
  state: ProgressiveState,
  total: number,
  batchSize: number
): ProgressiveState {
  if (state.done) return state;
  const safeBatch = Math.max(1, Math.floor(batchSize));
  const visibleCount = Math.min(total, state.visibleCount + safeBatch);
  return { visibleCount, done: visibleCount >= total };
}

/** Number of items still hidden — render this many skeleton placeholders. */
export function pendingProgressiveCount(
  state: ProgressiveState,
  total: number
): number {
  return Math.max(0, total - state.visibleCount);
}

/** A function that cancels a scheduled idle callback. */
export type IdleCancel = () => void;
/** A function that schedules `fn` to run during an idle period. */
export type IdleScheduler = (fn: () => void) => IdleCancel;

/**
 * Create an idle-time scheduler.
 *
 * - Browsers: `requestIdleCallback` with a `timeout` so the reveal still
 *   progresses even when the tab never goes idle (busy main thread).
 * - Fallback (jsdom, older engines): `setTimeout` with a short delay.
 *
 * The returned scheduler hands back a cancel function so React effects can
 * clean up on unmount / dependency change.
 */
export function createIdleScheduler(fallbackDelayMs = 24): IdleScheduler {
  const win = typeof window !== 'undefined' ? window : undefined;
  if (
    win &&
    typeof (win as Window & { requestIdleCallback?: unknown }).requestIdleCallback ===
      'function'
  ) {
    const ric = win as Window & {
      requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback: (id: number) => void;
    };
    return (fn) => {
      const id = ric.requestIdleCallback(() => fn(), { timeout: 200 });
      return () => ric.cancelIdleCallback(id);
    };
  }
  return (fn) => {
    const id = setTimeout(fn, fallbackDelayMs);
    return () => clearTimeout(id);
  };
}
