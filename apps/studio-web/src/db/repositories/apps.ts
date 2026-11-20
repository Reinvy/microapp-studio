/**
 * Installed micro-app repository.
 *
 * One row per `(workspace_id, app_id)`; each install also owns an
 * `app_databases` row, an `app_policy` row (offline cage default on), and an
 * `app_placements` entry so Home can render it immediately.
 */

import type { HostDb, SqlValue } from '../driver';
import { uuidv7 } from '../ids';

export interface InstallInput {
  workspaceId: string;
  appId: string;
  version: string;
  manifestJson: string;
  contentHash: Uint8Array;
  signature: Uint8Array;
  authorKeyFingerprint: string;
  installSource: 'registry' | 'git' | 'enterprise' | 'local';
  bundlePath: string;
  registryId?: string | null;
  dbRelativePath: string;
  schemaVersion: number;
  encryption?: 'sqlcipher' | 'field-aes-gcm' | 'none';
  nowMs?: number;
}

export interface InstalledApp {
  id: string;
  workspaceId: string;
  appId: string;
  version: string;
  manifestJson: string;
  contentHash: Uint8Array;
  signature: Uint8Array;
  authorKeyFingerprint: string;
  installSource: string;
  bundlePath: string;
  state: string;
  pinnedVersion: string | null;
  updateMode: string;
  previousVersion: string | null;
  installedAtMs: number;
  lastLaunchedAtMs: number | null;
}

interface AppRow {
  id: string;
  workspace_id: string;
  app_id: string;
  version: string;
  manifest_json: string;
  content_hash: Uint8Array;
  signature: Uint8Array;
  author_key_fingerprint: string;
  install_source: string;
  bundle_path: string;
  state: string;
  pinned_version: string | null;
  update_mode: string;
  previous_version: string | null;
  installed_at_ms: number;
  last_launched_at_ms: number | null;
}

function toApp(row: AppRow): InstalledApp {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    appId: row.app_id,
    version: row.version,
    manifestJson: row.manifest_json,
    contentHash: row.content_hash,
    signature: row.signature,
    authorKeyFingerprint: row.author_key_fingerprint,
    installSource: row.install_source,
    bundlePath: row.bundle_path,
    state: row.state,
    pinnedVersion: row.pinned_version,
    updateMode: row.update_mode,
    previousVersion: row.previous_version,
    installedAtMs: Number(row.installed_at_ms),
    lastLaunchedAtMs: row.last_launched_at_ms === null ? null : Number(row.last_launched_at_ms),
  };
}

/** Install a verified package into a workspace (idempotent per app id). */
export async function installApp(db: HostDb, input: InstallInput): Promise<InstalledApp> {
  const now = input.nowMs ?? Date.now();
  const existing = await getApp(db, input.workspaceId, input.appId);
  const id = existing?.id ?? uuidv7(now);
  const maxOrder = await db.select<{ max_order: number | null }>(
    'SELECT MAX(sort_order) AS max_order FROM app_placements WHERE workspace_id = ?',
    [input.workspaceId],
  );
  const sortOrder = Number(maxOrder[0]?.max_order ?? -1) + 1;

  await db.transaction(async (tx) => {
    if (existing) {
      await tx.exec(
        `UPDATE installed_microapps SET
           version = ?, manifest_json = ?, content_hash = ?, signature = ?,
           author_key_fingerprint = ?, registry_id = ?, install_source = ?, bundle_path = ?,
           state = 'installed', previous_version = version, previous_content_hash = content_hash,
           updated_at_ms = ?
         WHERE id = ? AND workspace_id = ?`,
        [
          input.version,
          input.manifestJson,
          input.contentHash,
          input.signature,
          input.authorKeyFingerprint,
          input.registryId ?? null,
          input.installSource,
          input.bundlePath,
          now,
          id,
          input.workspaceId,
        ],
      );
      await tx.exec(
        `UPDATE app_databases SET relative_path = ?, schema_version = ?, encryption = ?, updated_at_ms = ?
         WHERE app_install_id = ?`,
        [input.dbRelativePath, input.schemaVersion, input.encryption ?? 'field-aes-gcm', now, id],
      );
    } else {
      await tx.exec(
        `INSERT INTO installed_microapps
           (id, workspace_id, app_id, version, manifest_json, content_hash, signature,
            author_key_fingerprint, registry_id, install_source, bundle_path, state, update_mode,
            installed_at_ms, updated_at_ms)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'installed', 'notify', ?, ?)`,
        [
          id,
          input.workspaceId,
          input.appId,
          input.version,
          input.manifestJson,
          input.contentHash,
          input.signature,
          input.authorKeyFingerprint,
          input.registryId ?? null,
          input.installSource,
          input.bundlePath,
          now,
          now,
        ],
      );
      await tx.exec(
        `INSERT INTO app_databases
           (id, workspace_id, app_install_id, relative_path, schema_version, encryption, size_bytes, created_at_ms, updated_at_ms)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
        [
          uuidv7(now),
          input.workspaceId,
          id,
          input.dbRelativePath,
          input.schemaVersion,
          input.encryption ?? 'field-aes-gcm',
          now,
          now,
        ],
      );
      await tx.exec(
        `INSERT INTO app_policy (workspace_id, app_install_id, offline_cage, mock_permissions_json, updated_at_ms)
         VALUES (?, ?, 1, '[]', ?)`,
        [input.workspaceId, id, now],
      );
      await tx.exec(
        'INSERT INTO app_placements (workspace_id, app_install_id, folder_id, sort_order, pinned) VALUES (?, ?, NULL, ?, 0)',
        [input.workspaceId, id, sortOrder],
      );
    }
  });

  const installed = await getApp(db, input.workspaceId, input.appId);
  if (!installed) throw new Error('E-DATA-001 install row missing after write');
  return installed;
}

export async function getApp(db: HostDb, workspaceId: string, appId: string): Promise<InstalledApp | null> {
  const rows = await db.select<AppRow>(
    'SELECT * FROM installed_microapps WHERE workspace_id = ? AND app_id = ?',
    [workspaceId, appId],
  );
  return rows[0] ? toApp(rows[0]) : null;
}

export async function getAppById(db: HostDb, workspaceId: string, installId: string): Promise<InstalledApp | null> {
  const rows = await db.select<AppRow>(
    'SELECT * FROM installed_microapps WHERE workspace_id = ? AND id = ?',
    [workspaceId, installId],
  );
  return rows[0] ? toApp(rows[0]) : null;
}

export async function listApps(db: HostDb, workspaceId: string): Promise<InstalledApp[]> {
  const rows = await db.select<AppRow>(
    `SELECT * FROM installed_microapps
     WHERE workspace_id = ? AND state <> 'disabled'
     ORDER BY last_launched_at_ms IS NULL, last_launched_at_ms DESC, installed_at_ms DESC`,
    [workspaceId],
  );
  return rows.map(toApp);
}

export async function setAppState(
  db: HostDb,
  workspaceId: string,
  installId: string,
  state: 'installed' | 'running' | 'hibernated' | 'disabled' | 'quarantined',
  nowMs = Date.now(),
): Promise<void> {
  const changed = await db.exec(
    'UPDATE installed_microapps SET state = ?, updated_at_ms = ? WHERE id = ? AND workspace_id = ?',
    [state, nowMs, installId, workspaceId],
  );
  if (changed === 0) throw new Error('E-HOST-007 app not found in workspace');
}

export async function recordLaunch(db: HostDb, workspaceId: string, installId: string, nowMs = Date.now()): Promise<void> {
  await db.exec(
    'UPDATE installed_microapps SET last_launched_at_ms = ?, updated_at_ms = ? WHERE id = ? AND workspace_id = ?',
    [nowMs, nowMs, installId, workspaceId],
  );
}

export interface RuntimeSessionInput {
  workspaceId: string;
  installId: string;
  engine: 'web-iframe' | 'native-quickjs' | 'native-wasmtime';
  nowMs?: number;
}

/** Register the single active runtime session for an app (partial unique index). */
export async function startRuntimeSession(db: HostDb, input: RuntimeSessionInput): Promise<string> {
  const now = input.nowMs ?? Date.now();
  const sessionId = uuidv7(now);
  await db.transaction(async (tx) => {
    await tx.exec(
      `UPDATE runtime_sessions SET state = 'stopped', updated_at_ms = ?
       WHERE workspace_id = ? AND app_install_id = ? AND state IN ('starting','running','background')`,
      [now, input.workspaceId, input.installId],
    );
    await tx.exec(
      `INSERT INTO runtime_sessions (session_id, workspace_id, app_install_id, engine, state, memory_bytes, started_at_ms, updated_at_ms)
       VALUES (?, ?, ?, ?, 'running', 0, ?, ?)`,
      [sessionId, input.workspaceId, input.installId, input.engine, now, now],
    );
  });
  return sessionId;
}

export async function updateRuntimeSession(
  db: HostDb,
  sessionId: string,
  update: { state?: string; memoryBytes?: number; nowMs?: number },
): Promise<void> {
  const now = update.nowMs ?? Date.now();
  const assignments: string[] = ['updated_at_ms = ?'];
  const params: SqlValue[] = [now];
  if (update.state) {
    assignments.unshift('state = ?');
    params.unshift(update.state);
  }
  if (update.memoryBytes !== undefined) {
    assignments.unshift('memory_bytes = ?');
    params.unshift(update.memoryBytes);
  }
  params.push(sessionId);
  await db.exec(`UPDATE runtime_sessions SET ${assignments.join(', ')} WHERE session_id = ?`, params);
}

export async function appPolicy(
  db: HostDb,
  workspaceId: string,
  installId: string,
): Promise<{ offlineCage: boolean; mockPermissions: string[] }> {
  const rows = await db.select<{ offline_cage: number; mock_permissions_json: string }>(
    'SELECT offline_cage, mock_permissions_json FROM app_policy WHERE workspace_id = ? AND app_install_id = ?',
    [workspaceId, installId],
  );
  const row = rows[0];
  if (!row) return { offlineCage: true, mockPermissions: [] };
  let mocks: string[] = [];
  try {
    const parsed: unknown = JSON.parse(row.mock_permissions_json);
    if (Array.isArray(parsed)) mocks = parsed.filter((item): item is string => typeof item === 'string');
  } catch {
    mocks = [];
  }
  return { offlineCage: row.offline_cage === 1, mockPermissions: mocks };
}

export async function setOfflineCage(
  db: HostDb,
  workspaceId: string,
  installId: string,
  enabled: boolean,
  nowMs = Date.now(),
): Promise<void> {
  await db.exec(
    `INSERT INTO app_policy (workspace_id, app_install_id, offline_cage, mock_permissions_json, updated_at_ms)
     VALUES (?, ?, ?, '[]', ?)
     ON CONFLICT (workspace_id, app_install_id) DO UPDATE SET offline_cage = excluded.offline_cage, updated_at_ms = excluded.updated_at_ms`,
    [workspaceId, installId, enabled ? 1 : 0, nowMs],
  );
}

export async function setMockPermissions(
  db: HostDb,
  workspaceId: string,
  installId: string,
  mocks: string[],
  nowMs = Date.now(),
): Promise<void> {
  await db.exec(
    `INSERT INTO app_policy (workspace_id, app_install_id, offline_cage, mock_permissions_json, updated_at_ms)
     VALUES (?, ?, 1, ?, ?)
     ON CONFLICT (workspace_id, app_install_id) DO UPDATE SET mock_permissions_json = excluded.mock_permissions_json, updated_at_ms = excluded.updated_at_ms`,
    [workspaceId, installId, JSON.stringify(mocks), nowMs],
  );
}
