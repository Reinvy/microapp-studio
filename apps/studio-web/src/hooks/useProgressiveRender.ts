'use client';

import { useEffect, useState } from 'react';
import {
  createIdleScheduler,
  initialProgressiveState,
  nextProgressiveState,
  type ProgressiveState,
} from '@/lib/progressiveRender';

export interface UseProgressiveRenderOptions {
  /** Items rendered synchronously on the first paint (default 6). */
  initialBatch?: number;
  /** Items revealed per idle slice (default 6). */
  batchSize?: number;
  /** setTimeout fallback delay when requestIdleCallback is unavailable (default 24ms). */
  fallbackDelayMs?: number;
}

export interface ProgressiveRenderResult<T> {
  /** The items that should be rendered right now. */
  visibleItems: T[];
  /** Number of still-hidden items — render this many skeleton placeholders. */
  pendingCount: number;
  /** True once every item is visible (skeletons can be dropped). */
  done: boolean;
}

/**
 * useProgressiveRender — reveal a large list in time slices.
 *
 * - First paint renders `initialBatch` items synchronously.
 * - The rest are revealed `batchSize` at a time during idle periods
 *   (`requestIdleCallback`, falling back to `setTimeout`).
 * - The reveal resets whenever the `items` reference changes (new page,
 *   search, sort) — the new dataset renders its first batch instantly and
 *   re-reveals from scratch. The reset uses the "adjust state when props
 *   change" pattern (setState during render, guarded by a stored previous
 *   reference), so no effect is needed and there is no cascading render.
 * - Cleanup-safe: the pending idle callback is cancelled on unmount and on
 *   every state advance, so a component that disappears mid-reveal never
 *   calls setState after unmount. The callback advances via the functional
 *   setState form (`nextProgressiveState` is idempotent), so it always
 *   computes from the LATEST state — a stale timer can never over-reveal
 *   or re-reveal a stale dataset.
 *
 * The reveal math lives in the pure `lib/progressiveRender` helpers; this
 * hook is thin React glue.
 */
export function useProgressiveRender<T>(
  items: T[],
  options: UseProgressiveRenderOptions = {}
): ProgressiveRenderResult<T> {
  const { initialBatch = 6, batchSize = 6, fallbackDelayMs = 24 } = options;
  const total = items.length;

  const [state, setState] = useState<ProgressiveState>(() =>
    initialProgressiveState(total, initialBatch)
  );

  // Reset the reveal whenever the dataset identity changes: first batch
  // renders instantly, the rest re-reveals from scratch. This is the
  // React-docs "adjusting state when a prop changes" pattern — setState
  // during render, guarded by a stored previous reference — which keeps
  // the reset out of an effect (no cascading render).
  const [prevItems, setPrevItems] = useState(items);
  if (prevItems !== items) {
    setPrevItems(items);
    setState(initialProgressiveState(total, initialBatch));
  }

  // Schedule the next reveal slice during idle time. Depends on `state`
  // so each advance schedules exactly one follow-up slice (the previous
  // timer is cancelled by the effect cleanup), and a `done` state
  // schedules nothing. The closure captures the `state`/`total` that were
  // current when the effect ran; the functional setState update advances
  // from the live state regardless, so a stale callback is harmless.
  useEffect(() => {
    if (state.done) return;
    const schedule = createIdleScheduler(fallbackDelayMs);
    const cancel = schedule(() => {
      setState((prev) => nextProgressiveState(prev, total, batchSize));
    });
    return cancel;
  }, [state, total, batchSize, fallbackDelayMs]);

  const visibleCount = Math.min(state.visibleCount, total);
  return {
    visibleItems: items.slice(0, visibleCount),
    pendingCount: Math.max(0, total - visibleCount),
    done: state.done || visibleCount >= total,
  };
}
