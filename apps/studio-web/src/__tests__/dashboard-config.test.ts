/**
 * dashboard-config.test.ts — Unit tests for the DB-driven dashboard
 * configuration helpers.
 *
 * Covers the pure sanitization gate between IndexedDB content and the
 * dashboard UI:
 * - sanitizeDashboardConfig: never throws, never returns a partial config,
 *   clamps out-of-range values, drops invalid entries, falls back per-field.
 * - findSortLabel: resolves labels from the (possibly DB-driven) option list.
 */

import { describe, it, expect } from 'vitest';
import {
  sanitizeDashboardConfig,
  findSortLabel,
  DEFAULT_DASHBOARD_CONFIG,
} from '@/lib/dashboardConfig';

describe('sanitizeDashboardConfig', () => {
  it('returns the full default config for undefined / null / garbage input', () => {
    expect(sanitizeDashboardConfig(undefined)).toEqual(DEFAULT_DASHBOARD_CONFIG);
    expect(sanitizeDashboardConfig(null)).toEqual(DEFAULT_DASHBOARD_CONFIG);
    expect(sanitizeDashboardConfig('nonsense')).toEqual(DEFAULT_DASHBOARD_CONFIG);
    expect(sanitizeDashboardConfig(42)).toEqual(DEFAULT_DASHBOARD_CONFIG);
  });

  it('keeps valid values unchanged', () => {
    const config = sanitizeDashboardConfig({
      searchPlaceholder: 'Find an app...',
      searchDebounceMs: 450,
      sortOptions: [
        { value: { field: 'name', direction: 'asc' }, label: 'Name A–Z' },
      ],
      pageSizes: [6, 12, 24],
    });
    expect(config.searchPlaceholder).toBe('Find an app...');
    expect(config.searchDebounceMs).toBe(450);
    expect(config.sortOptions).toEqual([
      { value: { field: 'name', direction: 'asc' }, label: 'Name A–Z' },
    ]);
    expect(config.pageSizes).toEqual([6, 12, 24]);
  });

  it('clamps the debounce delay into [100, 2000]', () => {
    expect(sanitizeDashboardConfig({ searchDebounceMs: 0 }).searchDebounceMs).toBe(100);
    expect(sanitizeDashboardConfig({ searchDebounceMs: -5 }).searchDebounceMs).toBe(100);
    expect(sanitizeDashboardConfig({ searchDebounceMs: 99999 }).searchDebounceMs).toBe(2000);
    expect(sanitizeDashboardConfig({ searchDebounceMs: 'fast' }).searchDebounceMs).toBe(300);
  });

  it('trims and validates the search placeholder', () => {
    expect(sanitizeDashboardConfig({ searchPlaceholder: '  Find apps  ' }).searchPlaceholder).toBe(
      'Find apps'
    );
    expect(sanitizeDashboardConfig({ searchPlaceholder: '   ' }).searchPlaceholder).toBe(
      DEFAULT_DASHBOARD_CONFIG.searchPlaceholder
    );
    expect(sanitizeDashboardConfig({ searchPlaceholder: 7 }).searchPlaceholder).toBe(
      DEFAULT_DASHBOARD_CONFIG.searchPlaceholder
    );
  });

  it('filters invalid page sizes, dedupes, sorts, and caps the list', () => {
    const config = sanitizeDashboardConfig({
      pageSizes: [48, 12, 24, 12, -3, 0, 99999, 4.7, 'big', null],
    });
    expect(config.pageSizes).toEqual([5, 12, 24, 48]);
  });

  it('falls back to defaults when pageSizes is empty or not an array', () => {
    expect(sanitizeDashboardConfig({ pageSizes: [] }).pageSizes).toEqual(
      DEFAULT_DASHBOARD_CONFIG.pageSizes
    );
    expect(sanitizeDashboardConfig({ pageSizes: ['nope'] }).pageSizes).toEqual(
      DEFAULT_DASHBOARD_CONFIG.pageSizes
    );
    expect(sanitizeDashboardConfig({ pageSizes: '12' }).pageSizes).toEqual(
      DEFAULT_DASHBOARD_CONFIG.pageSizes
    );
  });

  it('drops invalid sort options and falls back when none remain', () => {
    const config = sanitizeDashboardConfig({
      sortOptions: [
        { value: { field: 'bogus', direction: 'asc' }, label: 'Bad field' },
        { value: { field: 'name', direction: 'sideways' }, label: 'Bad dir' },
        { value: { field: 'createdAt', direction: 'desc' }, label: '' },
        { value: 'not-an-object', label: 'Garbage' },
        null,
      ],
    });
    expect(config.sortOptions).toEqual(DEFAULT_DASHBOARD_CONFIG.sortOptions);
  });

  it('keeps valid sort options and drops only the invalid ones', () => {
    const config = sanitizeDashboardConfig({
      sortOptions: [
        { value: { field: 'updatedAt', direction: 'desc' }, label: 'Newest Updated' },
        { value: { field: 'name', direction: 'asc' }, label: 'Name A–Z' },
        { value: { field: 'nope', direction: 'asc' }, label: 'Invalid' },
      ],
    });
    expect(config.sortOptions).toHaveLength(2);
    expect(config.sortOptions[0].label).toBe('Newest Updated');
    expect(config.sortOptions[1].label).toBe('Name A–Z');
  });
});

describe('findSortLabel', () => {
  const options = DEFAULT_DASHBOARD_CONFIG.sortOptions;

  it('resolves the label for a known sort config', () => {
    expect(
      findSortLabel(options, { field: 'updatedAt', direction: 'desc' })
    ).toBe('Newest Updated');
    expect(findSortLabel(options, { field: 'name', direction: 'asc' })).toBe('Name A–Z');
  });

  it('falls back to a "field direction" string for unknown configs', () => {
    expect(
      findSortLabel([], { field: 'updatedAt', direction: 'asc' })
    ).toBe('updatedAt asc');
  });
});
