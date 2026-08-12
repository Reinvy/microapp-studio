/**
 * dashboardConfig — pure, framework-free dashboard configuration helpers.
 *
 * The dashboard previously rendered several UI behaviors from hardcoded
 * constants (search placeholder, debounce delay, sort options, page sizes).
 * This module defines the canonical shape for that configuration and a
 * sanitizer that validates/clamps whatever comes out of IndexedDB, so a
 * corrupt or hand-edited `dashboard-config` record can never break the UI —
 * every invalid field falls back to a safe default.
 *
 * The DEFAULT_DASHBOARD_CONFIG values intentionally mirror the constants in
 * services/dashboardSortService.ts; the dashboard starts from these and is
 * then overridden at runtime by the seeded `dashboard-config` content record.
 */

import {
  SORT_OPTIONS,
  PAGE_SIZES,
  DEFAULT_PAGE_SIZE,
  type SortConfig,
} from '@/services/dashboardSortService';

/** One selectable sort in the dashboard sort menu. */
export interface SortOption {
  value: SortConfig;
  label: string;
}

/** Runtime-tunable dashboard configuration (persisted in IndexedDB). */
export interface DashboardConfig {
  /** Placeholder text for the dashboard search input. */
  searchPlaceholder: string;
  /** Debounce delay (ms) applied to search input changes. */
  searchDebounceMs: number;
  /** Sort options rendered in the dashboard sort menu. */
  sortOptions: SortOption[];
  /** Page sizes offered by the pagination control. */
  pageSizes: number[];
  /**
   * Cards rendered synchronously on the first paint of the progressive
   * app grid — keeps first paint fast at large page sizes.
   */
  progressiveInitialBatch: number;
  /**
   * Cards revealed per idle slice by the progressive app grid.
   */
  progressiveBatchSize: number;
}

/** Bounds applied by the sanitizer — keeps DB-provided config sane. */
const MIN_DEBOUNCE_MS = 100;
const MAX_DEBOUNCE_MS = 2000;
const MAX_PAGE_SIZE = 200;
const MAX_PAGE_SIZES = 8;
const MIN_PROGRESSIVE_BATCH = 2;
const MAX_PROGRESSIVE_BATCH = 24;
const VALID_SORT_FIELDS = new Set(['updatedAt', 'createdAt', 'name']);

/** Fallback config — matches the long-standing hardcoded dashboard behavior. */
export const DEFAULT_DASHBOARD_CONFIG: DashboardConfig = {
  searchPlaceholder: 'Search your apps...',
  searchDebounceMs: 300,
  sortOptions: SORT_OPTIONS.map((opt) => ({ value: { ...opt.value }, label: opt.label })),
  pageSizes: [...PAGE_SIZES, DEFAULT_PAGE_SIZE],
  progressiveInitialBatch: 6,
  progressiveBatchSize: 6,
};

/**
 * Sanitize an unknown value into a fully valid DashboardConfig.
 *
 * Never throws and never returns a partial config: every field is validated
 * independently and falls back to its default when missing/invalid. This is
 * the single gate between IndexedDB content and the dashboard UI.
 */
export function sanitizeDashboardConfig(raw: unknown): DashboardConfig {
  const source =
    typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};

  // ── searchPlaceholder ──
  const rawPlaceholder = source.searchPlaceholder;
  const searchPlaceholder =
    typeof rawPlaceholder === 'string' && rawPlaceholder.trim().length > 0
      ? rawPlaceholder.trim()
      : DEFAULT_DASHBOARD_CONFIG.searchPlaceholder;

  // ── searchDebounceMs ──
  const rawDebounce = source.searchDebounceMs;
  const searchDebounceMs =
    typeof rawDebounce === 'number' && Number.isFinite(rawDebounce)
      ? Math.min(MAX_DEBOUNCE_MS, Math.max(MIN_DEBOUNCE_MS, Math.round(rawDebounce)))
      : DEFAULT_DASHBOARD_CONFIG.searchDebounceMs;

  // ── pageSizes ──
  let pageSizes: number[] = DEFAULT_DASHBOARD_CONFIG.pageSizes;
  if (Array.isArray(source.pageSizes)) {
    const valid = source.pageSizes
      .filter(
        (n): n is number =>
          typeof n === 'number' && Number.isFinite(n) && n >= 1 && n <= MAX_PAGE_SIZE
      )
      .map((n) => Math.round(n));
    const unique = Array.from(new Set(valid)).sort((a, b) => a - b);
    if (unique.length > 0) pageSizes = unique.slice(0, MAX_PAGE_SIZES);
  }

  // ── sortOptions ──
  let sortOptions: SortOption[] = DEFAULT_DASHBOARD_CONFIG.sortOptions;
  if (Array.isArray(source.sortOptions)) {
    const valid = source.sortOptions
      .filter((opt): opt is { value?: unknown; label?: unknown } =>
        typeof opt === 'object' && opt !== null
      )
      .map((opt) => {
        const value = (opt as { value?: unknown }).value;
        if (typeof value !== 'object' || value === null) return null;
        const v = value as Record<string, unknown>;
        if (
          typeof v.field !== 'string' ||
          !VALID_SORT_FIELDS.has(v.field) ||
          (v.direction !== 'asc' && v.direction !== 'desc')
        ) {
          return null;
        }
        const label =
          typeof (opt as { label?: unknown }).label === 'string'
            ? ((opt as { label?: unknown }).label as string)
            : '';
        if (label.trim().length === 0) return null;
        return {
          value: { field: v.field as SortConfig['field'], direction: v.direction },
          label: label.trim(),
        } as SortOption;
      })
      .filter((opt): opt is SortOption => opt !== null);
    if (valid.length > 0) sortOptions = valid;
  }

  // ── progressiveInitialBatch / progressiveBatchSize ──
  const sanitizeBatch = (raw: unknown): number | null => {
    if (typeof raw !== 'number' || !Number.isFinite(raw)) return null;
    return Math.min(
      MAX_PROGRESSIVE_BATCH,
      Math.max(MIN_PROGRESSIVE_BATCH, Math.round(raw))
    );
  };
  const progressiveInitialBatch =
    sanitizeBatch(source.progressiveInitialBatch) ??
    DEFAULT_DASHBOARD_CONFIG.progressiveInitialBatch;
  const progressiveBatchSize =
    sanitizeBatch(source.progressiveBatchSize) ??
    DEFAULT_DASHBOARD_CONFIG.progressiveBatchSize;

  return {
    searchPlaceholder,
    searchDebounceMs,
    sortOptions,
    pageSizes,
    progressiveInitialBatch,
    progressiveBatchSize,
  };
}

/**
 * Resolve the display label for a sort config against a given option list
 * (usually the DB-driven sortOptions). Falls back to a plain
 * "field direction" string when no option matches.
 */
export function findSortLabel(options: SortOption[], sort: SortConfig): string {
  const match = options.find(
    (opt) => opt.value.field === sort.field && opt.value.direction === sort.direction
  );
  return match ? match.label : `${sort.field} ${sort.direction}`;
}
