/**
 * progressive-grid.test.tsx — Time-sliced progressive grid (Cron 1)
 *
 * jsdom render tests of the ProgressiveAppGrid component + useProgressiveRender
 * hook, verifying the scalability behavior end-to-end:
 * - First paint mounts ONLY the initial batch (fast paint at large page sizes)
 * - Hidden cards render as skeleton placeholders (grid keeps its height)
 * - Remaining cards are revealed batch-by-batch during idle slices
 * - Dataset changes (new page/search/sort) reset the reveal to the first batch
 * - Unmounting mid-reveal cancels the pending idle callback (no setState
 *   after unmount)
 *
 * jsdom has no requestIdleCallback, so the hook exercises the setTimeout
 * fallback scheduler — the same code path used in non-supporting engines.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import ProgressiveAppGrid from '@/components/dashboard/ProgressiveAppGrid';

type FakeApp = { id: string; name: string };

function makeApps(n: number): FakeApp[] {
  return Array.from({ length: n }, (_, i) => ({ id: `app-${i}`, name: `App ${i}` }));
}

function renderGrid(
  apps: FakeApp[],
  opts: { initialBatch?: number; batchSize?: number } = {}
) {
  return render(
    <ProgressiveAppGrid
      apps={apps}
      initialBatch={opts.initialBatch ?? 6}
      batchSize={opts.batchSize ?? 6}
      renderCard={(app) => (
        <div key={app.id} data-testid="card">
          {app.name}
        </div>
      )}
    />
  );
}

describe('ProgressiveAppGrid', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders only the initial batch on first paint, then reveals during idle slices', () => {
    vi.useFakeTimers();
    renderGrid(makeApps(18), { initialBatch: 6, batchSize: 6 });

    // First paint: 6 cards mounted, 12 skeleton placeholders keep the height.
    expect(screen.getAllByTestId('card')).toHaveLength(6);
    expect(document.querySelectorAll('.shimmer')).toHaveLength(12);

    // One idle slice → 12 visible, 6 pending.
    act(() => {
      vi.advanceTimersByTime(24);
    });
    expect(screen.getAllByTestId('card')).toHaveLength(12);
    expect(document.querySelectorAll('.shimmer')).toHaveLength(6);

    // Second idle slice → all 18 visible, no placeholders left.
    act(() => {
      vi.advanceTimersByTime(24);
    });
    expect(screen.getAllByTestId('card')).toHaveLength(18);
    expect(document.querySelectorAll('.shimmer')).toHaveLength(0);
  });

  it('renders everything at once when the dataset fits in the initial batch', () => {
    renderGrid(makeApps(4), { initialBatch: 6 });
    expect(screen.getAllByTestId('card')).toHaveLength(4);
    expect(document.querySelectorAll('.shimmer')).toHaveLength(0);
  });

  it('resets the reveal when the dataset changes (new page/search/sort)', () => {
    vi.useFakeTimers();
    const { rerender } = renderGrid(makeApps(18), { initialBatch: 6, batchSize: 6 });

    // Reveal partway: 12 visible.
    act(() => {
      vi.advanceTimersByTime(24);
    });
    expect(screen.getAllByTestId('card')).toHaveLength(12);

    // New dataset → reveal resets to the initial batch.
    rerender(
      <ProgressiveAppGrid
        apps={makeApps(24)}
        initialBatch={6}
        batchSize={6}
        renderCard={(app) => (
          <div key={app.id} data-testid="card">
            {app.name}
          </div>
        )}
      />
    );
    expect(screen.getAllByTestId('card')).toHaveLength(6);

    // And it completes again over subsequent idle slices (one per act,
    // mirroring real per-frame idle callbacks).
    act(() => {
      vi.advanceTimersByTime(24);
    });
    act(() => {
      vi.advanceTimersByTime(24);
    });
    act(() => {
      vi.advanceTimersByTime(24);
    });
    expect(screen.getAllByTestId('card')).toHaveLength(24);
    expect(document.querySelectorAll('.shimmer')).toHaveLength(0);
  });

  it('cancels the pending idle callback on unmount mid-reveal (no setState after unmount)', () => {
    vi.useFakeTimers();
    const { unmount } = renderGrid(makeApps(24), { initialBatch: 6, batchSize: 6 });
    unmount();
    expect(() => {
      act(() => {
        vi.advanceTimersByTime(24 * 5);
      });
    }).not.toThrow();
  });
});
