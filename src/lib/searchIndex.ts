import type { AppSchema } from '@/types/schema';

/**
 * searchIndex.ts — Normalized search-key helpers for IndexedDB query optimization.
 *
 * MicroAppRepo stores a denormalized lowercase key (`nameLower`) alongside each app's
 * `name`. Prefix search ("pizza") then runs as a pure IndexedDB range scan over the
 * `nameLower` index instead of an in-memory, case-converting scan over the whole table.
 * This keeps dashboard search and name-sorted pagination O(log n + k) instead of O(n).
 */

/** Build a normalized, lowercase search key from an app name. */
export function buildSearchName(name: string): string {
  return String(name || '').toLowerCase().trim();
}

/** Attach the denormalized search key to an app record before persisting. */
export function withSearchIndex(app: AppSchema): AppSchema {
  return { ...app, nameLower: buildSearchName(app.name) };
}
