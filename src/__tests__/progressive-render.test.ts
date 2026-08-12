/**
 * progressive-render.test.ts — Pure time-sliced rendering helpers (Cron 1)
 *
 * Unit tests for the framework-free reveal state machine and idle scheduler
 * in `lib/progressiveRender.ts`:
 * - initial reveal: first batch renders synchronously, clamped to dataset
 * - batch advance: monotonic, clamped at total, idempotent
 * - pending count: skeleton placeholder math
 * - scheduler: setTimeout fallback path (node/jsdom have no
 *   requestIdleCallback) fires the callback and honors cancellation
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  initialProgressiveState,
  nextProgressiveState,
  pendingProgressiveCount,
  createIdleScheduler,
} from '@/lib/progressiveRender';

describe('initialProgressiveState', () => {
  it('empty dataset → done with 0 visible (no placeholders for empty grids)', () => {
    expect(initialProgressiveState(0, 6)).toEqual({ visibleCount: 0, done: true });
  });

  it('dataset smaller than initial batch → all visible, done', () => {
    expect(initialProgressiveState(4, 6)).toEqual({ visibleCount: 4, done: true });
  });

  it('large dataset → first batch visible, not done', () => {
    expect(initialProgressiveState(48, 6)).toEqual({ visibleCount: 6, done: false });
  });

  it('clamps the initial batch to the dataset size', () => {
    expect(initialProgressiveState(3, 12)).toEqual({ visibleCount: 3, done: true });
  });

  it('degenerate batch sizes clamp to at least 1', () => {
    expect(initialProgressiveState(10, 0)).toEqual({ visibleCount: 1, done: false });
    expect(initialProgressiveState(10, -5)).toEqual({ visibleCount: 1, done: false });
  });
});

describe('nextProgressiveState', () => {
  it('advances by the batch size', () => {
    expect(nextProgressiveState({ visibleCount: 6, done: false }, 48, 6)).toEqual({
      visibleCount: 12,
      done: false,
    });
  });

  it('clamps at the total and marks done', () => {
    expect(nextProgressiveState({ visibleCount: 44, done: false }, 48, 6)).toEqual({
      visibleCount: 48,
      done: true,
    });
  });

  it('is a deterministic monotonic sequence (duplicate callbacks cannot over-reveal)', () => {
    const a = nextProgressiveState({ visibleCount: 6, done: false }, 48, 6);
    const b = nextProgressiveState(a, 48, 6);
    const c = nextProgressiveState(b, 48, 6);
    expect([a.visibleCount, b.visibleCount, c.visibleCount]).toEqual([12, 18, 24]);
    // Calling again with the SAME state returns the SAME result (idempotent).
    expect(nextProgressiveState({ visibleCount: 6, done: false }, 48, 6)).toEqual(a);
  });

  it('a done state stays done', () => {
    const done = { visibleCount: 48, done: true };
    expect(nextProgressiveState(done, 48, 6)).toEqual(done);
  });
});

describe('pendingProgressiveCount', () => {
  it('counts the still-hidden items for skeleton placeholders', () => {
    expect(pendingProgressiveCount({ visibleCount: 6, done: false }, 48)).toBe(42);
    expect(pendingProgressiveCount({ visibleCount: 48, done: true }, 48)).toBe(0);
    expect(pendingProgressiveCount({ visibleCount: 0, done: true }, 0)).toBe(0);
  });
});

describe('createIdleScheduler', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('falls back to setTimeout and executes the callback after the delay', () => {
    vi.useFakeTimers();
    const schedule = createIdleScheduler(16);
    const fn = vi.fn();
    schedule(fn);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(16);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('returns a cancel function that prevents execution', () => {
    vi.useFakeTimers();
    const schedule = createIdleScheduler(16);
    const fn = vi.fn();
    const cancel = schedule(fn);
    cancel();
    vi.advanceTimersByTime(100);
    expect(fn).not.toHaveBeenCalled();
  });
});
