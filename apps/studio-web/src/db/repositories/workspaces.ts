/**
 * Workspace and launcher-state repository.
 *
 * Every function takes `workspaceId` explicitly; the repository never infers a
 * "current" workspace, which keeps cross-workspace queries a compile-time
 * mistake rather than a runtime leak (E-DATA-001).
 */

import type { HostDb } from '../driver';
import { uuidv7 } from '../ids';

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  theme: string;
  locale: string;
  isDefault: boolean;
  createdAtMs: number;
  lastOpenedAtMs: number | null;
}

interface WorkspaceRow {
  id: string;
  name: string;
  slug: string;
  theme: string;
  locale: string;
  is_default: number;
  created_at_ms: number;
  last_opened_at_ms: number | null;
}

function toWorkspace(row: WorkspaceRow): Workspace {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    theme: row.theme,
    locale: row.locale,
    isDefault: row.is_default === 1,
    createdAtMs: Number(row.created_at_ms),
    lastOpenedAtMs: row.last_opened_at_ms === null ? null : Number(row.last_opened_at_ms),
  };
}

export function slugifyWorkspace(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return slug.length > 0 ? slug : 'workspace';
}

/** Create the default workspace and its launcher state on first run. */
export async function ensureDefaultWorkspace(
  db: HostDb,
  options: { name?: string; locale?: string; nowMs?: number } = {},
): Promise<Workspace> {
  const now = options.nowMs ?? Date.now();
  const existing = await db.select<WorkspaceRow>(
    'SELECT * FROM workspaces WHERE is_default = 1 AND deleted_at_ms IS NULL',
  );
  if (existing[0]) return toWorkspace(existing[0]);
  const id = uuidv7(now);
  const name = options.name ?? 'Workspace';
  const baseSlug = slugifyWorkspace(name);
  const taken = await db.select<{ slug: string }>('SELECT slug FROM workspaces WHERE slug LIKE ?', [`${baseSlug}%`]);
  const slug = taken.some((row) => row.slug === baseSlug) ? `${baseSlug}-${taken.length}` : baseSlug;
  await db.transaction(async (tx) => {
    await tx.exec(
      `INSERT INTO workspaces (id, name, slug, theme, locale, is_default, created_at_ms, updated_at_ms, last_opened_at_ms)
       VALUES (?, ?, ?, 'studio', ?, 1, ?, ?, ?)`,
      [id, name, slug, options.locale ?? 'id-ID', now, now, now],
    );
    await tx.exec(
      `INSERT INTO workspace_state (workspace_id, last_app_id, home_scroll, filters_json, updated_at_ms)
       VALUES (?, NULL, 0, '{}', ?)`,
      [id, now],
    );
  });
  return {
    id,
    name,
    slug,
    theme: 'studio',
    locale: options.locale ?? 'id-ID',
    isDefault: true,
    createdAtMs: now,
    lastOpenedAtMs: now,
  };
}

export async function renameWorkspace(
  db: HostDb,
  workspaceId: string,
  name: string,
  nowMs = Date.now(),
): Promise<void> {
  const changed = await db.exec('UPDATE workspaces SET name = ?, updated_at_ms = ? WHERE id = ?', [
    name,
    nowMs,
    workspaceId,
  ]);
  if (changed === 0) throw new Error(`E-DATA-001 workspace ${workspaceId} not found`);
}

export async function listWorkspaces(db: HostDb): Promise<Workspace[]> {
  const rows = await db.select<WorkspaceRow>(
    'SELECT * FROM workspaces WHERE deleted_at_ms IS NULL ORDER BY is_default DESC, last_opened_at_ms DESC',
  );
  return rows.map(toWorkspace);
}

export async function touchWorkspace(db: HostDb, workspaceId: string, nowMs = Date.now()): Promise<void> {
  await db.exec('UPDATE workspaces SET last_opened_at_ms = ? WHERE id = ?', [nowMs, workspaceId]);
}

export interface WorkspaceState {
  lastAppId: string | null;
  homeScroll: number;
  filters: Record<string, unknown>;
}

export async function loadWorkspaceState(db: HostDb, workspaceId: string): Promise<WorkspaceState> {
  const rows = await db.select<{
    last_app_id: string | null;
    home_scroll: number;
    filters_json: string;
  }>('SELECT last_app_id, home_scroll, filters_json FROM workspace_state WHERE workspace_id = ?', [workspaceId]);
  const row = rows[0];
  if (!row) return { lastAppId: null, homeScroll: 0, filters: {} };
  let filters: Record<string, unknown> = {};
  try {
    const parsed: unknown = JSON.parse(row.filters_json);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      filters = parsed as Record<string, unknown>;
    }
  } catch {
    filters = {};
  }
  return {
    lastAppId: row.last_app_id,
    homeScroll: Number(row.home_scroll),
    filters,
  };
}

export async function saveWorkspaceState(
  db: HostDb,
  workspaceId: string,
  state: WorkspaceState,
  nowMs = Date.now(),
): Promise<void> {
  await db.exec(
    `INSERT INTO workspace_state (workspace_id, last_app_id, home_scroll, filters_json, updated_at_ms)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (workspace_id) DO UPDATE SET
       last_app_id = excluded.last_app_id,
       home_scroll = excluded.home_scroll,
       filters_json = excluded.filters_json,
       updated_at_ms = excluded.updated_at_ms`,
    [workspaceId, state.lastAppId, state.homeScroll, JSON.stringify(state.filters), nowMs],
  );
}

/** Create a non-default workspace; the first workspace stays default. */
export async function createWorkspace(
  db: HostDb,
  input: { name: string; locale?: string; nowMs?: number },
): Promise<Workspace> {
  const now = input.nowMs ?? Date.now();
  if (input.name.trim().length === 0) throw new Error('E-RUN-003 workspace name is required');
  const id = uuidv7(now);
  const baseSlug = slugifyWorkspace(input.name);
  const taken = await db.select<{ slug: string }>('SELECT slug FROM workspaces WHERE slug LIKE ?', [`${baseSlug}%`]);
  const slug = taken.some((row) => row.slug === baseSlug) ? `${baseSlug}-${taken.length}` : baseSlug;
  await db.transaction(async (tx) => {
    await tx.exec(
      `INSERT INTO workspaces (id, name, slug, theme, locale, is_default, created_at_ms, updated_at_ms, last_opened_at_ms)
       VALUES (?, ?, ?, 'studio', ?, 0, ?, ?, ?)`,
      [id, input.name.trim(), slug, input.locale ?? 'id-ID', now, now, now],
    );
    await tx.exec(
      `INSERT INTO workspace_state (workspace_id, last_app_id, home_scroll, filters_json, updated_at_ms)
       VALUES (?, NULL, 0, '{}', ?)`,
      [id, now],
    );
  });
  return {
    id,
    name: input.name.trim(),
    slug,
    theme: 'studio',
    locale: input.locale ?? 'id-ID',
    isDefault: false,
    createdAtMs: now,
    lastOpenedAtMs: now,
  };
}

/** Switch the active workspace by moving the single `is_default` flag. */
export async function setActiveWorkspace(db: HostDb, workspaceId: string, nowMs = Date.now()): Promise<void> {
  await db.transaction(async (tx) => {
    const exists = await tx.select<{ id: string }>(
      'SELECT id FROM workspaces WHERE id = ? AND deleted_at_ms IS NULL',
      [workspaceId],
    );
    if (!exists[0]) throw new Error('E-DATA-001 workspace not found');
    await tx.exec('UPDATE workspaces SET is_default = 0 WHERE is_default = 1');
    await tx.exec('UPDATE workspaces SET is_default = 1, last_opened_at_ms = ? WHERE id = ?', [nowMs, workspaceId]);
  });
}

/** Soft-delete a non-default workspace; the default workspace cannot be removed. */
export async function deleteWorkspace(db: HostDb, workspaceId: string, nowMs = Date.now()): Promise<void> {
  const rows = await db.select<{ is_default: number }>('SELECT is_default FROM workspaces WHERE id = ?', [workspaceId]);
  if (!rows[0]) throw new Error('E-DATA-001 workspace not found');
  if (rows[0].is_default === 1) throw new Error('E-DATA-001 default workspace cannot be deleted');
  await db.exec('UPDATE workspaces SET deleted_at_ms = ?, updated_at_ms = ? WHERE id = ?', [nowMs, nowMs, workspaceId]);
}
