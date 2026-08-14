'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useAuth } from '@/context/AuthContext';
import { appService } from '@/services/appService';
import { dashboardConfigService } from '@/services/dashboardConfigService';
import type { AppSchema } from '@/types/schema';
import type { SortConfig } from '@/services/dashboardSortService';
import { DEFAULT_SORT, DEFAULT_PAGE_SIZE } from '@/services/dashboardSortService';
import { DEFAULT_DASHBOARD_CONFIG, findSortLabel, type DashboardConfig } from '@/lib/dashboardConfig';
import { contentService } from '@/services/contentService';
import type { EmptyStateCopy } from '@/db/contentRepo';
import { clampPage, getPageRange } from '@/lib/pagination';
import AppCard from '@/components/dashboard/AppCard';
import DashboardStats from '@/components/dashboard/DashboardStats';
import RecentlyRun from '@/components/dashboard/RecentlyRun';
import ProgressiveAppGrid from '@/components/dashboard/ProgressiveAppGrid';
import { useIdleMaintenance } from '@/hooks/useIdleMaintenance';
import {
  AppWindow,
  Plus,
  Search,
  LogOut,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Columns3,
  Download,
  Upload,
} from 'lucide-react';

// Lazy-load heavy dialog (parsePrompt engine import is heavy)
const NewAppDialog = dynamic(
  () => import('@/components/dashboard/NewAppDialog'),
  { ssr: false }
);

// Lazy-load backup/restore dialog (file parsing only needed on demand)
const ImportDialog = dynamic(
  () => import('@/components/dashboard/ImportDialog'),
  { ssr: false }
);

export default function DashboardPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [apps, setApps] = useState<AppSchema[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalApps, setTotalApps] = useState(0);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [sort, setSort] = useState<SortConfig>(DEFAULT_SORT);
  // Runtime-tunable dashboard config — loaded from IndexedDB ('dashboard-config'),
  // falls back to DEFAULT_DASHBOARD_CONFIG until the async read completes.
  const [dashboardConfig, setDashboardConfig] = useState<DashboardConfig>(DEFAULT_DASHBOARD_CONFIG);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  // Jump-to-page input value (large page counts) — empty = untouched
  const [jumpInput, setJumpInput] = useState('');
  // Empty-state copy is DB-driven ('dashboard-empty' via contentRepo) — fallback keeps first paint intact
  const [emptyCopy, setEmptyCopy] = useState<EmptyStateCopy>({
    emptyTitle: 'No apps yet',
    emptySubtitle:
      "Create your first micro-app with AI — describe what you want to build and we'll generate it for you.",
    ctaLabel: 'Create Your First App',
    noResultsTitle: 'No matching apps',
    noResultsSubtitle: 'Try a different search term or clear the filter.',
  });
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // One background self-healing pass per session (search-index backfill,
  // run-history retention prune, stats-cache warm) — scheduled for browser
  // idle time so first paint and the initial data load are never blocked.
  useIdleMaintenance();

  const loadApps = useCallback(async (q: string, p: number, ps: number, s: SortConfig) => {
    setLoading(true);
    try {
      if (q.trim()) {
        const result = await appService.searchApps(q, p, ps, s);
        setApps(result.items);
        setTotalPages(result.totalPages);
        setTotalApps(result.total);
      } else {
        const result = await appService.getApps(p, ps, s);
        setApps(result.items);
        setTotalPages(result.totalPages);
        setTotalApps(result.total);
      }
    } catch (err) {
      console.error('Failed to load apps:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadApps(searchQuery, page, pageSize, sort);
  }, [page, pageSize, sort]); // eslint-disable-line react-hooks/exhaustive-deps

  // Latest-view ref for the subscription below — kept current in an effect so
  // the subscription callback always reloads the CURRENT view state.
  const viewRef = useRef({ searchQuery, page, pageSize, sort });
  useEffect(() => {
    viewRef.current = { searchQuery, page, pageSize, sort };
  });

  useEffect(() => {
    // Load DB-driven empty-state copy — falls back to the default above if unseeded.
    // Read through the content service (SWR-cached, coalesced).
    contentService.getContent<EmptyStateCopy>('dashboard-empty').then((copy) => {
      if (copy) {
        setEmptyCopy(copy);
      }
    }).catch(() => {});
    // Load DB-driven dashboard config (placeholder, debounce, sort options,
    // page sizes) — sanitized by the service, falls back to defaults.
    dashboardConfigService.load().then(setDashboardConfig).catch(() => {});
  }, []);

  // Subscribe once to the service layer's refresh bus. The grid re-loads the
  // current view whenever data changes — background SWR revalidations,
  // mutations from other components, and imports all propagate without the
  // caller having to reload manually.
  useEffect(() => {
    return appService.subscribe(() => {
      const view = viewRef.current;
      loadApps(view.searchQuery, view.page, view.pageSize, view.sort);
    });
  }, [loadApps]);

  // Debounced search — resets to page 1 on query change
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setPage(1);
      loadApps(value, 1, pageSize, sort);
    }, dashboardConfig.searchDebounceMs);
  };

  const handleDeleteApp = async (id: string) => {
    await appService.removeApp(id);
    loadApps(searchQuery, page, pageSize, sort);
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const handleExport = async () => {
    try {
      const json = await appService.exportApps();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `microapp-studio-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const handleImportSuccess = () => {
    setShowImportDialog(false);
    // Reload the current page so imported apps appear immediately
    setPage(1);
    loadApps(searchQuery, 1, pageSize, sort);
  };

  const goToPage = (p: number) => {
    if (p < 1 || p > totalPages) return;
    setPage(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  };

  const handleSortChange = (newSort: SortConfig) => {
    setSort(newSort);
    setPage(1);
    setShowSortMenu(false);
  };

  // Predictive prefetch — warm the cache for the pages the user is most
  // likely to visit next (forward page, plus the previous page when deep in
  // the list) so paging feels instant. Best-effort + silent by design: a
  // failed prefetch never surfaces, and the current view is never disturbed.
  useEffect(() => {
    if (totalPages <= 1) return;
    const prefetch = (p: number) => {
      if (p < 1 || p > totalPages) return;
      if (searchQuery.trim()) {
        appService.prefetchSearch(searchQuery, p, pageSize, sort);
      } else {
        appService.prefetchApps(p, pageSize, sort);
      }
    };
    prefetch(page + 1);
    if (page > 1) prefetch(page - 1);
  }, [page, totalPages, pageSize, sort, searchQuery]);

  const handleJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const target = clampPage(parseInt(jumpInput, 10) || 1, totalPages);
    goToPage(target);
    setJumpInput('');
  };

  return (
    <div className="min-h-screen bg-background relative">
      {/* Decorative pastel blobs — plain blurred circles, NOT .clay cards.
          The .clay class sets background var(--clay-cream) + 28px radius,
          which (as unlayered CSS) overrides Tailwind's bg-[...]/rounded-full
          utilities, rendering the orbs as invisible cream squares. */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-[#FFD5E5]" style={{filter:'blur(60px)', opacity:0.3}} />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-[#C5E8F7]" style={{filter:'blur(50px)', opacity:0.25}} />
        <div className="absolute top-1/3 left-3/4 w-64 h-64 rounded-full bg-[#FFF2C5]" style={{filter:'blur(45px)', opacity:0.2}} />
        <div className="absolute bottom-1/3 right-3/4 w-72 h-72 rounded-full bg-[#D5B8F5]" style={{filter:'blur(45px)', opacity:0.15}} />
      </div>

      {/* Top Navigation */}
      <header className="sticky top-0 z-50 clay-header">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl clay-sm bg-[#D5B8F5] text-foreground">
              <AppWindow className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold text-foreground">MicroApp Studio</span>
          </div>
          <div className="flex items-center gap-3">
            {user && (
              <span className="hidden text-sm text-muted-foreground sm:block">
                Hi, <span className="font-medium text-foreground">{user.name}</span>
              </span>
            )}
            <button onClick={handleLogout}
              className="clay-sm flex h-9 items-center gap-2 px-3 text-sm text-foreground bg-[#FFD5E5]">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Your Micro Apps</h1>
            <p className="mt-1 text-sm text-clay-muted">
              {totalApps} {totalApps === 1 ? 'app' : 'apps'} created
              {totalPages > 1 && ` — Page ${page} of ${totalPages}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              title="Download a JSON backup of all your apps"
              className="clay-button flex h-10 items-center gap-2 px-3 text-sm font-medium text-foreground bg-[#C5F0D5] sm:px-4"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
            </button>
            <button
              onClick={() => setShowImportDialog(true)}
              title="Restore apps from a JSON backup"
              className="clay-button flex h-10 items-center gap-2 px-3 text-sm font-medium text-foreground bg-[#FFF2C5] sm:px-4"
            >
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">Import</span>
            </button>
            <button onClick={() => setShowNewDialog(true)}
              className="clay-button h-10 flex items-center gap-2 px-4 text-sm font-medium text-foreground bg-[#D5B8F5]">
              <Plus className="h-4 w-4" />
              New App
            </button>
          </div>
        </div>

        {/* Stats Banner */}
        <div className="mb-5">
          <DashboardStats />
        </div>

        {/* Recently Run — bounded, IndexedDB-backed run trail */}
        <RecentlyRun hasApps={totalApps > 0} />

        {/* Controls Row: Search + Sort + Page Size */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-clay-muted" />
            <input
              placeholder={dashboardConfig.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="clay-input h-10 w-full pl-10 pr-4 text-sm text-foreground"
            />
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {/* Sort Dropdown */}
            <div className="relative" ref={sortMenuRef}>
              <button
                onClick={() => setShowSortMenu(!showSortMenu)}
                className="clay-sm flex h-9 items-center gap-1.5 px-3 text-xs font-medium text-foreground bg-[#F5EDE5]"
              >
                <ArrowUpDown className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{findSortLabel(dashboardConfig.sortOptions, sort)}</span>
              </button>
              {showSortMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowSortMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 z-20 min-w-[160px] clay-card p-1.5 origin-top-right">
                    {dashboardConfig.sortOptions.map((opt) => (
                      <button
                        key={opt.label}
                        onClick={() => handleSortChange(opt.value)}
                        className={`w-full text-left px-3 py-2 text-xs rounded-xl transition-all ${
                          sort.field === opt.value.field && sort.direction === opt.value.direction
                            ? 'bg-[#D5B8F5] text-foreground font-medium'
                            : 'text-foreground hover:bg-[#F5EDE5]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Page Size Selector */}
            <div className="flex flex-wrap items-center gap-1">
              <Columns3 className="h-3.5 w-3.5 text-clay-muted" />
              {dashboardConfig.pageSizes.map((size) => (
                <button
                  key={size}
                  onClick={() => handlePageSizeChange(size)}
                  className={`clay-sm h-7 min-w-[2rem] px-2 text-xs font-medium transition-all ${
                    pageSize === size
                      ? 'bg-[#D5B8F5] text-foreground scale-105'
                      : 'bg-[#F5EDE5] text-foreground hover:scale-105'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* App Grid */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-44 clay-card shimmer" />
            ))}
          </div>
        ) : apps.length === 0 ? (
          <div className="flex flex-col items-center justify-center clay-card px-6 py-16 text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-[50%] clay-sm bg-[#FFF2C5]">
              <Sparkles className="h-8 w-8 text-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              {searchQuery.trim() ? emptyCopy.noResultsTitle : emptyCopy.emptyTitle}
            </h3>
            <p className="mt-1 max-w-sm text-sm text-clay-muted">
              {searchQuery.trim()
                ? emptyCopy.noResultsSubtitle
                : emptyCopy.emptySubtitle}
            </p>
            {!searchQuery.trim() && (
              <button onClick={() => setShowNewDialog(true)}
                className="clay-button mt-6 flex items-center gap-2 px-4 h-10 text-sm font-medium text-foreground bg-[#D5B8F5]">
                <Plus className="h-4 w-4" />
                {emptyCopy.ctaLabel}
              </button>
            )}
          </div>
        ) : (
          <>
            <ProgressiveAppGrid
              apps={apps}
              initialBatch={dashboardConfig.progressiveInitialBatch}
              batchSize={dashboardConfig.progressiveBatchSize}
              renderCard={(app) => (
                <AppCard
                  key={app.id}
                  app={app}
                  onRun={(id) => router.push(`/run/${id}`)}
                  onDelete={() => handleDeleteApp(app.id)}
                />
              )}
            />

            {/* Pagination */}
            {totalPages > 1 && (
              <nav className="mt-8 flex items-center justify-center gap-1.5">
                <button
                  onClick={() => goToPage(page - 1)}
                  disabled={page === 1}
                  className="clay-sm flex h-9 w-9 items-center justify-center bg-[#F5EDE5] text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                {getPageRange(page, totalPages).map((item, idx) =>
                  item === 'ellipsis' ? (
                    <span key={`ellipsis-${idx}`} className="flex h-9 w-9 items-center justify-center text-sm text-clay-muted">
                      &hellip;
                    </span>
                  ) : (
                    <button
                      key={item}
                      onClick={() => goToPage(item)}
                      className={`clay-sm flex h-9 w-9 items-center justify-center text-sm font-medium transition-all duration-200 ${
                        item === page
                          ? 'bg-[#D5B8F5] text-foreground scale-105'
                          : 'bg-[#F5EDE5] text-foreground hover:scale-105'
                      }`}
                      aria-label={`Page ${item}`}
                      aria-current={item === page ? 'page' : undefined}
                    >
                      {item}
                    </button>
                  )
                )}

                <button
                  onClick={() => goToPage(page + 1)}
                  disabled={page === totalPages}
                  className="clay-sm flex h-9 w-9 items-center justify-center bg-[#F5EDE5] text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>

                {/* Jump-to-page — appears when the ellipsis window can't
                    reach far pages quickly (large datasets). */}
                {totalPages > 7 && (
                  <form
                    onSubmit={handleJumpSubmit}
                    className="ml-2 flex items-center gap-1.5"
                    aria-label="Jump to page"
                  >
                    <span className="hidden text-xs text-clay-muted sm:inline">
                      Go to
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={totalPages}
                      value={jumpInput}
                      onChange={(e) => setJumpInput(e.target.value)}
                      placeholder={String(page)}
                      aria-label="Page number to jump to"
                      className="clay-input h-9 w-14 rounded-xl px-2 text-center text-sm text-foreground"
                    />
                    <button
                      type="submit"
                      aria-label={`Go to page ${jumpInput || page}`}
                      className="clay-sm h-9 px-3 text-xs font-medium text-foreground bg-[#C5E8F7] hover:scale-105 transition-all duration-200"
                    >
                      Go
                    </button>
                  </form>
                )}
              </nav>
            )}
          </>
        )}

        {/* New App Dialog — lazily loaded via next/dynamic */}
        <NewAppDialog
          open={showNewDialog}
          onClose={() => {
            setShowNewDialog(false);
            // Reset to first page and reload
            setPage(1);
            loadApps(searchQuery, 1, pageSize, sort);
          }}
        />

        {/* Import Backup Dialog — lazily loaded via next/dynamic */}
        <ImportDialog
          open={showImportDialog}
          onClose={() => setShowImportDialog(false)}
          onImported={handleImportSuccess}
        />
      </main>
    </div>
  );
}
