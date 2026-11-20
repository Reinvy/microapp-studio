/**
 * Launcher repository: folders (max 3 levels), placements, dock (max 8),
 * widgets, and the search index.
 */

import type { HostDb } from '../driver';
import { uuidv7 } from '../ids';

export const MAX_FOLDER_DEPTH = 3;
export const MAX_DOCK_ITEMS = 8;
export const MIN_WIDGET_REFRESH_MS = 5_000;

export interface Folder {
  id: string;
  parentId: string | null;
  name: string;
  depth: number;
  sortOrder: number;
}

export async function createFolder(
  db: HostDb,
  input: { workspaceId: string; name: string; parentId?: string | null; nowMs?: number },
): Promise<Folder> {
  const now = input.nowMs ?? Date.now();
  let depth = 1;
  if (input.parentId) {
    const parent = await db.select<{ depth: number }>(
      'SELECT depth FROM folders WHERE id = ? AND workspace_id = ?',
      [input.parentId, input.workspaceId],
    );
    const parentRow = parent[0];
    if (!parentRow) throw new Error('E-HOST-007 folder parent not found in workspace');
    depth = Number(parentRow.depth) + 1;
    if (depth > MAX_FOLDER_DEPTH) throw new Error('E-HOST-007 folder depth exceeds three levels');
  }
  const id = uuidv7(now);
  const maxOrder = await db.select<{ max_order: number | null }>(
    'SELECT MAX(sort_order) AS max_order FROM folders WHERE workspace_id = ? AND parent_id IS ?',
    [input.workspaceId, input.parentId ?? null],
  );
  const sortOrder = Number(maxOrder[0]?.max_order ?? -1) + 1;
  await db.exec(
    `INSERT INTO folders (id, workspace_id, parent_id, name, depth, sort_order, created_at_ms, updated_at_ms)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, input.workspaceId, input.parentId ?? null, input.name, depth, sortOrder, now, now],
  );
  return { id, parentId: input.parentId ?? null, name: input.name, depth, sortOrder };
}

export async function listFolders(db: HostDb, workspaceId: string): Promise<Folder[]> {
  const rows = await db.select<{ id: string; parent_id: string | null; name: string; depth: number; sort_order: number }>(
    'SELECT id, parent_id, name, depth, sort_order FROM folders WHERE workspace_id = ? ORDER BY depth, sort_order',
    [workspaceId],
  );
  return rows.map((row) => ({
    id: row.id,
    parentId: row.parent_id,
    name: row.name,
    depth: Number(row.depth),
    sortOrder: Number(row.sort_order),
  }));
}

export async function deleteFolder(db: HostDb, workspaceId: string, folderId: string): Promise<void> {
  const changed = await db.exec('DELETE FROM folders WHERE id = ? AND workspace_id = ?', [folderId, workspaceId]);
  if (changed === 0) throw new Error('E-HOST-007 folder not found in workspace');
}

export interface Placement {
  appInstallId: string;
  folderId: string | null;
  sortOrder: number;
  pinned: boolean;
}

export async function listPlacements(db: HostDb, workspaceId: string): Promise<Placement[]> {
  const rows = await db.select<{ app_install_id: string; folder_id: string | null; sort_order: number; pinned: number }>(
    'SELECT app_install_id, folder_id, sort_order, pinned FROM app_placements WHERE workspace_id = ? ORDER BY sort_order',
    [workspaceId],
  );
  return rows.map((row) => ({
    appInstallId: row.app_install_id,
    folderId: row.folder_id,
    sortOrder: Number(row.sort_order),
    pinned: row.pinned === 1,
  }));
}

export async function placeApp(
  db: HostDb,
  input: { workspaceId: string; appInstallId: string; folderId?: string | null; sortOrder?: number; pinned?: boolean },
): Promise<void> {
  await db.exec(
    `INSERT INTO app_placements (workspace_id, app_install_id, folder_id, sort_order, pinned)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (workspace_id, app_install_id) DO UPDATE SET
       folder_id = excluded.folder_id,
       sort_order = excluded.sort_order,
       pinned = excluded.pinned`,
    [
      input.workspaceId,
      input.appInstallId,
      input.folderId ?? null,
      input.sortOrder ?? 0,
      input.pinned ? 1 : 0,
    ],
  );
}

export async function setPinned(
  db: HostDb,
  workspaceId: string,
  appInstallId: string,
  pinned: boolean,
): Promise<void> {
  await db.exec('UPDATE app_placements SET pinned = ? WHERE workspace_id = ? AND app_install_id = ?', [
    pinned ? 1 : 0,
    workspaceId,
    appInstallId,
  ]);
}

export async function listDock(db: HostDb, workspaceId: string): Promise<string[]> {
  const rows = await db.select<{ app_install_id: string }>(
    'SELECT app_install_id FROM dock_items WHERE workspace_id = ? ORDER BY sort_order',
    [workspaceId],
  );
  return rows.map((row) => row.app_install_id);
}

/** Add an app to the dock; the 8-item limit is enforced here and in SQL. */
export async function addDockItem(
  db: HostDb,
  input: { workspaceId: string; appInstallId: string },
): Promise<void> {
  const count = await db.select<{ total: number }>(
    'SELECT COUNT(*) AS total FROM dock_items WHERE workspace_id = ?',
    [input.workspaceId],
  );
  if (Number(count[0]?.total ?? 0) >= MAX_DOCK_ITEMS) {
    throw new Error('E-DATA-006 dock limit is eight items');
  }
  await db.exec(
    `INSERT INTO dock_items (workspace_id, app_install_id, sort_order)
     VALUES (?, ?, (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM dock_items WHERE workspace_id = ?))
     ON CONFLICT (workspace_id, app_install_id) DO NOTHING`,
    [input.workspaceId, input.appInstallId, input.workspaceId],
  );
}

export async function removeDockItem(db: HostDb, workspaceId: string, appInstallId: string): Promise<void> {
  await db.exec('DELETE FROM dock_items WHERE workspace_id = ? AND app_install_id = ?', [workspaceId, appInstallId]);
}

export interface Widget {
  id: string;
  appInstallId: string;
  kind: string;
  config: Record<string, unknown>;
  sortOrder: number;
  refreshIntervalMs: number;
}

export async function addWidget(
  db: HostDb,
  input: {
    workspaceId: string;
    appInstallId: string;
    kind: string;
    config?: Record<string, unknown>;
    refreshIntervalMs?: number;
    nowMs?: number;
  },
): Promise<Widget> {
  const refresh = input.refreshIntervalMs ?? MIN_WIDGET_REFRESH_MS;
  if (refresh < MIN_WIDGET_REFRESH_MS) {
    throw new Error('E-SBX-005 widget refresh interval must be at least 5 seconds');
  }
  const id = uuidv7(input.nowMs ?? Date.now());
  const maxOrder = await db.select<{ max_order: number | null }>(
    'SELECT MAX(sort_order) AS max_order FROM widgets WHERE workspace_id = ?',
    [input.workspaceId],
  );
  const sortOrder = Number(maxOrder[0]?.max_order ?? -1) + 1;
  await db.exec(
    `INSERT INTO widgets (id, workspace_id, app_install_id, kind, config_json, sort_order, refresh_interval_ms)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.workspaceId,
      input.appInstallId,
      input.kind,
      JSON.stringify(input.config ?? {}),
      sortOrder,
      refresh,
    ],
  );
  return {
    id,
    appInstallId: input.appInstallId,
    kind: input.kind,
    config: input.config ?? {},
    sortOrder,
    refreshIntervalMs: refresh,
  };
}

export async function listWidgets(db: HostDb, workspaceId: string): Promise<Widget[]> {
  const rows = await db.select<{
    id: string;
    app_install_id: string;
    kind: string;
    config_json: string;
    sort_order: number;
    refresh_interval_ms: number;
  }>(
    'SELECT id, app_install_id, kind, config_json, sort_order, refresh_interval_ms FROM widgets WHERE workspace_id = ? ORDER BY sort_order',
    [workspaceId],
  );
  return rows.map((row) => {
    let config: Record<string, unknown> = {};
    try {
      const parsed: unknown = JSON.parse(row.config_json);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        config = parsed as Record<string, unknown>;
      }
    } catch {
      config = {};
    }
    return {
      id: row.id,
      appInstallId: row.app_install_id,
      kind: row.kind,
      config,
      sortOrder: Number(row.sort_order),
      refreshIntervalMs: Number(row.refresh_interval_ms),
    };
  });
}
