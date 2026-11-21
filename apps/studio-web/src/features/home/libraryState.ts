/**
 * Home library view state.
 *
 * Persisted inside `workspace_state.filters_json.library` so the same shape
 * survives reloads and workspace switches. Unknown/legacy values are coerced to
 * defaults instead of being dropped, which keeps older rows readable.
 */

import type { WorkerHostDb } from '@/db/client';
import { loadWorkspaceState, saveWorkspaceState } from '@/db/repositories/workspaces';

export type LibraryView = 'grid' | 'list';
export type LibrarySort = 'recent' | 'name' | 'type' | 'favorite';
export type LibraryFilter = 'all' | 'apps' | 'drafts';

export interface LibraryState {
  view: LibraryView;
  sort: LibrarySort;
  filter: LibraryFilter;
  recentSearches: string[];
}

export const DEFAULT_LIBRARY_STATE: LibraryState = {
  view: 'grid',
  sort: 'recent',
  filter: 'all',
  recentSearches: [],
};

const MAX_RECENT_SEARCHES = 6;

export function parseLibraryState(raw: unknown): LibraryState {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_LIBRARY_STATE };
  const record = raw as Partial<LibraryState>;
  return {
    view: record.view === 'list' ? 'list' : 'grid',
    sort:
      record.sort === 'name' || record.sort === 'type' || record.sort === 'favorite' ? record.sort : 'recent',
    filter: record.filter === 'apps' || record.filter === 'drafts' ? record.filter : 'all',
    recentSearches: Array.isArray(record.recentSearches)
      ? record.recentSearches.filter((item): item is string => typeof item === 'string').slice(0, MAX_RECENT_SEARCHES)
      : [],
  };
}

export async function loadLibraryState(db: WorkerHostDb, workspaceId: string): Promise<LibraryState> {
  const state = await loadWorkspaceState(db, workspaceId);
  return parseLibraryState((state.filters as { library?: unknown }).library);
}

export async function saveLibraryState(
  db: WorkerHostDb,
  workspaceId: string,
  library: LibraryState,
  nowMs = Date.now(),
): Promise<void> {
  const state = await loadWorkspaceState(db, workspaceId);
  const filters = { ...state.filters, library };
  await saveWorkspaceState(
    db,
    workspaceId,
    { lastAppId: state.lastAppId, homeScroll: state.homeScroll, filters },
    nowMs,
  );
}

/** Newest search first, de-duplicated, capped. */
export function pushRecentSearch(state: LibraryState, query: string): LibraryState {
  const trimmed = query.trim();
  if (trimmed.length === 0) return state;
  const recentSearches = [trimmed, ...state.recentSearches.filter((item) => item !== trimmed)].slice(
    0,
    MAX_RECENT_SEARCHES,
  );
  return { ...state, recentSearches };
}
