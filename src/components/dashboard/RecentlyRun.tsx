'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { History, Play } from 'lucide-react';
import { runHistoryService } from '@/services/runHistoryService';
import { contentService } from '@/services/contentService';
import type { RunRecord } from '@/db/runHistoryRepo';
import type { RecentlyRunCopy } from '@/db/contentRepo';
import { pastelPalette } from '@/lib/claymorphism';
import { formatRelativeTime } from '@/lib/relativeTime';

interface RecentlyRunProps {
  /** Hide the strip entirely when the user has no apps yet. */
  hasApps: boolean;
}

// DB-driven copy ('recently-run-copy' via contentRepo) — fallback keeps first
// paint intact and mirrors the seeded defaults exactly.
const defaultCopy: RecentlyRunCopy = {
  title: 'Recently Run',
  subtitle: 'Your latest app launches',
  emptyText: 'No runs yet — hit Run on any app card to start your trail.',
  chipLabel: 'Open',
  regionLabel: 'Recently run apps',
};

// DB-driven chip palette ('recently-run-chips' via contentRepo) — previously
// hardcoded as a 5-color subset here. Falls back to the shared claymorphism
// pastel palette until the async read completes.
const DEFAULT_CHIP_COLORS = [...pastelPalette];

export default function RecentlyRun({ hasApps }: RecentlyRunProps) {
  const router = useRouter();
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [copy, setCopy] = useState<RecentlyRunCopy>(defaultCopy);
  const [chipColors, setChipColors] = useState<string[]>(DEFAULT_CHIP_COLORS);

  useEffect(() => {
    // Load the run trail through the cached service — repeated dashboard
    // visits within the TTL window are instant (no IndexedDB round trip).
    runHistoryService.getRecentRuns(5).then(setRuns).catch(() => {});
    // Load DB-driven strip copy — falls back to the defaults above.
    contentService.getContent<RecentlyRunCopy>('recently-run-copy')
      .then((c) => {
        if (c) setCopy(c);
      })
      .catch(() => {});
    // Load DB-driven chip palette ('recently-run-chips') — falls back to the
    // shared claymorphism pastel palette if unseeded or invalid.
    contentService.getContent<string[]>('recently-run-chips')
      .then((colors) => {
        if (Array.isArray(colors) && colors.length > 0 && colors.every((c) => typeof c === 'string')) {
          setChipColors(colors);
        }
      })
      .catch(() => {});
  }, []);

  if (!hasApps) return null;

  return (
    <section aria-label={copy.regionLabel} className="mb-5">
      <div className="mb-2 flex items-baseline gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-xl clay-sm bg-[#FFE5D0]">
          <History className="h-3.5 w-3.5 text-clay-foreground" />
        </div>
        <h2 className="text-sm font-semibold text-clay-foreground">{copy.title}</h2>
        <span className="text-xs text-clay-muted">{copy.subtitle}</span>
      </div>

      {runs.length === 0 ? (
        <div className="clay-card px-4 py-3">
          <p className="text-xs text-clay-muted">{copy.emptyText}</p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {runs.map((run, idx) => (
            <button
              key={run.id}
              onClick={() => router.push(`/run/${run.appId}`)}
              aria-label={`${copy.chipLabel} ${run.appName}`}
              title={`${run.appName} — ${formatRelativeTime(run.ranAt)}`}
              className="clay-sm group flex items-center gap-2 px-3 py-2 text-left transition-all duration-200 hover:scale-[1.03] active:scale-95"
              style={{ backgroundColor: chipColors[idx % chipColors.length] }}
            >
              <Play className="h-3 w-3 fill-current text-clay-foreground/70 transition-transform duration-200 group-hover:scale-110" />
              <span className="max-w-[11rem] truncate text-xs font-medium text-clay-foreground">
                {run.appName}
              </span>
              <span className="text-[10px] text-clay-muted whitespace-nowrap">
                {formatRelativeTime(run.ranAt)}
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
