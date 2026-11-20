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

/**
 * Split a raw query into normalized search tokens.
 *
 * Tokens are lowercased and trimmed; empty tokens (from leading/trailing or
 * repeated whitespace) are dropped. Single-character tokens are KEPT — a
 * one-letter query like "a" is a legitimate search for apps starting with
 * "a" and must not be silently discarded.
 */
export function tokenizeQuery(query: string): string[] {
  return String(query || '')
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
}

/**
 * AND-match an app against every token: each token must appear as a substring
 * of the app's name OR description.
 *
 * Empty token list matches everything (vacuous truth) — used for empty
 * queries, which the repo treats as "return all apps".
 */
export function appMatchesTokens(
  app: Pick<AppSchema, 'name' | 'nameLower' | 'description'>,
  tokens: string[]
): boolean {
  if (tokens.length === 0) return true;
  const name = (app.nameLower || buildSearchName(app.name)).toLowerCase();
  const description = String(app.description || '').toLowerCase();
  return tokens.every(
    (token) => name.includes(token) || description.includes(token)
  );
}
