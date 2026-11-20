'use client';

import type { AppSchema } from '@/types/schema';

/**
 * Sort configuration for dashboard queries.
 */
export type SortField = 'updatedAt' | 'createdAt' | 'name';
export type SortDirection = 'desc' | 'asc';

export interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

/** Default sort: newest updated first */
export const DEFAULT_SORT: SortConfig = { field: 'updatedAt', direction: 'desc' };

export const SORT_OPTIONS: Array<{ value: SortConfig; label: string }> = [
  { value: { field: 'updatedAt', direction: 'desc' }, label: 'Newest Updated' },
  { value: { field: 'updatedAt', direction: 'asc' }, label: 'Oldest Updated' },
  { value: { field: 'createdAt', direction: 'desc' }, label: 'Newest Created' },
  { value: { field: 'createdAt', direction: 'asc' }, label: 'Oldest Created' },
  { value: { field: 'name', direction: 'asc' }, label: 'Name A–Z' },
  { value: { field: 'name', direction: 'desc' }, label: 'Name Z–A' },
];

/** Available page sizes */
export const PAGE_SIZES = [12, 24, 48] as const;
export type PageSize = (typeof PAGE_SIZES)[number];
export const DEFAULT_PAGE_SIZE: PageSize = 12;

/**
 * Sort apps by the given config.
 * Used by both paginated queries and full-list operations.
 */
export function sortApps(apps: AppSchema[], sort: SortConfig): AppSchema[] {
  const { field, direction } = sort;
  const sorted = [...apps];

  sorted.sort((a, b) => {
    let cmp: number;

    if (field === 'name') {
      cmp = a.name.localeCompare(b.name);
    } else {
      cmp = a[field] - b[field];
    }

    return direction === 'desc' ? -cmp : cmp;
  });

  return sorted;
}

export function getSortLabel(sort: SortConfig): string {
  return SORT_OPTIONS.find(
    (o) => o.value.field === sort.field && o.value.direction === sort.direction
  )?.label || `${sort.field} ${sort.direction}`;
}
