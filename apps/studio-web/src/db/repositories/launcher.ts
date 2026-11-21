/**
 * Library placement repository.
 *
 * `app_placements` is the single source of pin state and ordering in v3. The
 * folder pointer is kept as an inert optional grouping column: nothing in the
 * shipped UI creates folders, but a row may still carry one.
 */

import type { HostDb } from '../driver';

export interface Placement {
  appInstallId: string;
  folderId: string | null;
  sortOrder: number;
  pinned: boolean;
}

export async function listPlacements(db: HostDb, workspaceId: string): Promise<Placement[]> {
  const rows = await db.select<{
    app_install_id: string;
    folder_id: string | null;
    sort_order: number;
    pinned: number;
  }>(
    'SELECT app_install_id, folder_id, sort_order, pinned FROM app_placements WHERE workspace_id = ? ORDER BY sort_order ASC',
    [workspaceId],
  );
  return rows.map((row) => ({
    appInstallId: row.app_install_id,
    folderId: row.folder_id,
    sortOrder: Number(row.sort_order),
    pinned: row.pinned === 1,
  }));
}

/** Ensure a placement row exists for an install; idempotent. */
export async function placeApp(
  db: HostDb,
  workspaceId: string,
  appInstallId: string,
  sortOrder?: number,
): Promise<void> {
  const order =
    sortOrder ??
    Number(
      (
        await db.select<{ max_order: number | null }>(
          'SELECT MAX(sort_order) AS max_order FROM app_placements WHERE workspace_id = ?',
          [workspaceId],
        )
      )[0]?.max_order ?? -1,
    ) + 1;
  await db.exec(
    `INSERT INTO app_placements (workspace_id, app_install_id, folder_id, sort_order, pinned)
     VALUES (?, ?, NULL, ?, 0)
     ON CONFLICT (workspace_id, app_install_id) DO NOTHING`,
    [workspaceId, appInstallId, order],
  );
}
