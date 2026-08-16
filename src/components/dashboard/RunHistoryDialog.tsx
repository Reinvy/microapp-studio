'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { History, Play, ChevronLeft, ChevronRight, Trash2, X } from 'lucide-react';
import { runHistoryService } from '@/services/runHistoryService';
import { contentService } from '@/services/contentService';
import type { RunRecord, PaginatedRunHistory } from '@/db/runHistoryRepo';
import type { RunHistoryDialogCopy } from '@/db/contentRepo';
import { pastelPalette } from '@/lib/claymorphism';
import { formatRelativeTime } from '@/lib/relativeTime';
import { clampPage, getPageRange } from '@/lib/pagination';

interface RunHistoryDialogProps {
  open: boolean;
  onClose: () => void;
}

/** Rows per page — keeps the dialog compact while browsing the full trail. */
const PAGE_SIZE = 8;

// DB-driven dialog copy ('run-history-dialog-copy' via contentRepo) — fallback
// keeps first paint intact and mirrors the seeded defaults exactly.
const defaultCopy: RunHistoryDialogCopy = {
  title: 'Run History',
  subtitle: 'Your full app-launch trail — newest first',
  emptyText: 'No runs yet — hit Run on any app card to start your trail.',
  openLabel: 'Open',
  regionLabel: 'Run history list',
  closeLabel: 'Close',
  clearLabel: 'Clear history',
  confirmClear: 'Clear the entire run history? This cannot be undone.',
  clearingLabel: 'Clearing…',
  prevAria: 'Previous page',
  nextAria: 'Next page',
  pageAria: 'Go to page {page}',
  jumpInputAria: 'Jump to page',
  goAria: 'Go to page {page}',
};

/** Format a `{page}` aria template (mirrors dashboardCopy's count templates). */
function formatPageTemplate(template: string, page: number): string {
  return template.replace(/\{page\}/g, String(page));
}

/**
 * RunHistoryDialog — paginated browser for the full (bounded) run trail.
 *
 * The dashboard strip only shows the 5 most recent chips; this dialog unlocks
 * the rest via indexed offset pagination (`runHistoryRepo.getHistoryPage`,
 * cached per page through `runHistoryService`). Includes page-window
 * navigation, jump-to-page for deep trails, opening the run, and a
 * confirm-gated "clear history" action. All copy + chip palette is DB-driven
 * (contentRepo) with built-in fallbacks.
 */
export default function RunHistoryDialog({ open, onClose }: RunHistoryDialogProps) {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [history, setHistory] = useState<PaginatedRunHistory | null>(null);
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [jumpInput, setJumpInput] = useState('');
  const [copy, setCopy] = useState<RunHistoryDialogCopy>(defaultCopy);
  const [chipColors, setChipColors] = useState<string[]>([...pastelPalette]);

  const loadPage = useCallback(async (target: number) => {
    setLoading(true);
    try {
      const result = await runHistoryService.getHistoryPage(target, PAGE_SIZE);
      setHistory(result);
      // Clamp to the actual page range (e.g. after clearing from a deep page).
      setPage((prev) => (prev === target ? result.page : result.page));
    } catch (err) {
      console.error('Failed to load run history:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load DB-driven dialog copy + chip palette; reset to page 1 on open.
  useEffect(() => {
    if (!open) return;
    setPage(1);
    setJumpInput('');
    contentService.getContent<RunHistoryDialogCopy>('run-history-dialog-copy')
      .then((c) => {
        if (c) setCopy(c);
      })
      .catch(() => {});
    contentService.getContent<string[]>('recently-run-chips')
      .then((colors) => {
        if (Array.isArray(colors) && colors.length > 0 && colors.every((c) => typeof c === 'string')) {
          setChipColors(colors);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Load the current page whenever the dialog opens or the page changes.
  useEffect(() => {
    if (!open) return;
    loadPage(page);
  }, [open, page, loadPage]);

  if (!open) return null;

  const totalPages = history?.totalPages ?? 1;

  const goToPage = (p: number) => {
    const target = clampPage(p, totalPages);
    if (target !== page) setPage(target);
  };

  const handleJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const target = clampPage(parseInt(jumpInput, 10) || 1, totalPages);
    goToPage(target);
    setJumpInput('');
  };

  const handleClear = async () => {
    if (clearing) return;
    if (!window.confirm(copy.confirmClear)) return;
    setClearing(true);
    try {
      await runHistoryService.clearHistory();
      setPage(1);
    } catch (err) {
      console.error('Failed to clear run history:', err);
    } finally {
      setClearing(false);
    }
  };

  const items = history?.items ?? [];
  const runs = items;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(74,63,53,0.3)] animate-fade-in">
      <div className="mx-4 w-full max-w-lg animate-scale-in clay-card overflow-hidden">
        {/* Header */}
        <div className="border-b border-clay-border/30 bg-clay-peach/50 px-6 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-foreground">{copy.title}</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">{copy.subtitle}</p>
            </div>
            <button
              onClick={onClose}
              aria-label={copy.closeLabel}
              className="clay-sm flex h-8 w-8 shrink-0 items-center justify-center bg-[#F5EDE5] text-foreground transition-all duration-200 hover:scale-105 active:scale-95"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* History list */}
        <div className="p-5" role="region" aria-label={copy.regionLabel}>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-11 clay-card shimmer" />
              ))}
            </div>
          ) : runs.length === 0 ? (
            <div className="clay-card px-4 py-6 text-center">
              <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl clay-sm bg-[#FFF2C5]">
                <History className="h-4 w-4 text-foreground" />
              </div>
              <p className="text-xs text-clay-muted">{copy.emptyText}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {runs.map((run: RunRecord, idx: number) => (
                <div
                  key={run.id}
                  className="clay-sm flex items-center gap-3 px-3 py-2 transition-all duration-200"
                  style={{ backgroundColor: chipColors[idx % chipColors.length] }}
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-white/50">
                    <Play className="h-3 w-3 fill-current text-clay-foreground/70" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-clay-foreground">{run.appName}</p>
                    <p className="text-[10px] text-clay-muted">
                      {formatRelativeTime(run.ranAt)}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      onClose();
                      router.push(`/run/${run.appId}`);
                    }}
                    aria-label={`${copy.openLabel} ${run.appName}`}
                    className="clay-sm flex h-8 shrink-0 items-center gap-1.5 bg-white/60 px-3 text-xs font-medium text-clay-foreground transition-all duration-200 hover:scale-105 active:scale-95"
                  >
                    <Play className="h-3 w-3 fill-current" />
                    {copy.openLabel}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Pagination bar */}
          {!loading && runs.length > 0 && totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-1.5">
              <button
                onClick={() => goToPage(page - 1)}
                disabled={page === 1}
                aria-label={copy.prevAria}
                className="clay-sm flex h-8 w-8 items-center justify-center bg-[#F5EDE5] text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 active:scale-95"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {getPageRange(page, totalPages).map((item, idx) =>
                item === 'ellipsis' ? (
                  <span key={`ellipsis-${idx}`} className="flex h-8 w-8 items-center justify-center text-sm text-clay-muted">
                    &hellip;
                  </span>
                ) : (
                  <button
                    key={item}
                    onClick={() => goToPage(item)}
                    aria-label={formatPageTemplate(copy.pageAria, item)}
                    aria-current={item === page ? 'page' : undefined}
                    className={`clay-sm flex h-8 min-w-8 items-center justify-center px-2 text-xs font-medium transition-all duration-200 ${
                      item === page
                        ? 'bg-[#D5B8F5] text-foreground scale-105'
                        : 'bg-[#F5EDE5] text-foreground hover:scale-105'
                    }`}
                  >
                    {item}
                  </button>
                )
              )}

              <button
                onClick={() => goToPage(page + 1)}
                disabled={page === totalPages}
                aria-label={copy.nextAria}
                className="clay-sm flex h-8 w-8 items-center justify-center bg-[#F5EDE5] text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 active:scale-95"
              >
                <ChevronRight className="h-4 w-4" />
              </button>

              {totalPages > 7 && (
                <form onSubmit={handleJumpSubmit} className="ml-1.5 flex items-center gap-1" aria-label={copy.jumpInputAria}>
                  <input
                    type="number"
                    min={1}
                    max={totalPages}
                    value={jumpInput}
                    onChange={(e) => setJumpInput(e.target.value)}
                    placeholder={String(page)}
                    aria-label={copy.jumpInputAria}
                    className="clay-input h-8 w-14 rounded-xl px-2 text-center text-xs text-foreground"
                  />
                  <button
                    type="submit"
                    aria-label={formatPageTemplate(copy.goAria, jumpInput ? parseInt(jumpInput, 10) : page)}
                    className="clay-sm h-8 px-3 text-xs font-medium text-foreground bg-[#C5E8F7] hover:scale-105 transition-all duration-200"
                  >
                    Go
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Footer actions */}
          <div className="mt-5 flex items-center justify-between gap-3">
            <button
              onClick={handleClear}
              disabled={clearing || (history?.total ?? 0) === 0}
              className="clay-button flex h-10 items-center gap-2 px-3 text-sm font-medium text-foreground bg-[#FFD5E5] disabled:opacity-50 transition-all duration-200 active:scale-95"
            >
              <Trash2 className="h-4 w-4" />
              {clearing ? copy.clearingLabel : copy.clearLabel}
            </button>
            <button
              onClick={onClose}
              className="clay-button h-10 px-4 text-sm font-medium text-foreground bg-clay-emboss transition-all duration-200 active:scale-95"
            >
              {copy.closeLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}