'use client';

import type { ReactNode } from 'react';
import { useProgressiveRender } from '@/hooks/useProgressiveRender';

interface ProgressiveAppGridProps<T extends { id: string }> {
  /** The full page of items — only a slice is mounted at any moment. */
  apps: T[];
  /** Render one card (must forward `key` to the root element). */
  renderCard: (app: T) => ReactNode;
  /** Cards rendered on the first paint (default 6). */
  initialBatch?: number;
  /** Cards revealed per idle slice (default 6). */
  batchSize?: number;
}

/**
 * ProgressiveAppGrid — time-sliced grid for large pages of cards.
 *
 * Mounting dozens of cards synchronously blocks first paint on every
 * page/sort/search change. This grid renders the first `initialBatch` cards
 * immediately and reveals the rest `batchSize` at a time during idle
 * periods, showing lightweight skeleton placeholders for the still-hidden
 * cards so the grid keeps its height and the layout never jumps.
 *
 * Generic over the item type (any shape with an `id`) so it works for app
 * cards, run-history rows, or search results. The batch sizes come from
 * the DB-driven dashboard config (see `lib/dashboardConfig`) — no
 * hardcoded tuning in the component.
 */
export default function ProgressiveAppGrid<T extends { id: string }>({
  apps,
  renderCard,
  initialBatch = 6,
  batchSize = 6,
}: ProgressiveAppGridProps<T>) {
  const { visibleItems, pendingCount, done } = useProgressiveRender(apps, {
    initialBatch,
    batchSize,
  });

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {visibleItems.map((app) => renderCard(app))}
      {!done &&
        pendingCount > 0 &&
        Array.from({ length: pendingCount }, (_, i) => (
          <div
            key={`progressive-pending-${i}`}
            className="h-44 clay-card shimmer"
            aria-hidden="true"
          />
        ))}
    </div>
  );
}
