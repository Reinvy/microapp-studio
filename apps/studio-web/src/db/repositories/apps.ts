/**
 * Installed micro-app repository.
 *
 * One row per `(workspace_id, app_id)`; each install also owns an
 * `app_databases` row, an `app_policy` row (offline cage default on), and an
 * `app_placements` entry so Home can render it immediately.
 *
 * `installed_microapps.app_id` is the URL key and stays tied to the signed
 * manifest id. Renames only touch the local `display_name`, and a duplicate is a
 * new row with a derived `.copy` app id — the signed manifest is never mutated.
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
  packagePath?: string | null;
  nowMs?: number;
}

export interface InstalledApp {
  id: string;
  workspaceId: string;
  appId: string;
  /** Local alias from `display_name`; `null` means "use the manifest name". */
  displayName: string | null;
  /** Manifest `name`, falling back to `app_id` when the manifest is unreadable. */
  name: string;
  version: string;
  manifestJson: string;
  contentHash: Uint8Array;
  signature: Uint8Array;
  authorKeyFingerprint: string;
  installSource: string;
  bundlePath: string;
  packagePath: string | null;
  state: string;
  pinnedVersion: string | null;
  updateMode: string;
  previousVersion: string | null;
  /** Placement flag; `app_placements` is the only pin source in v3. */
  pinned: boolean;
  installedAtMs: number;
  lastLaunchedAtMs: number | null;
}

export interface AppVersion {
  id: string;
  version: string;
  manifestJson: string;
  contentHash: Uint8Array;
  signature: Uint8Array;
  authorKeyFingerprint: string;
  bundlePath: string;
  packagePath: string | null;
  installedAtMs: number;
}

interface AppRow {
  id: string;
  workspace_id: string;
  app_id: string;
  display_name: string | null;
  version: string;
  manifest_json: string;
  content_hash: Uint8Array;
  signature: Uint8Array;
  author_key_fingerprint: string;
  install_source: string;
  bundle_path: string;
  package_path: string | null;
  state: string;
  pinned_version: string | null;
  update_mode: string;
  previous_version: string | null;
  installed_at_ms: number;
  last_launched_at_ms: number | null;
  pinned?: number | null;
}

/** Manifest `name`, falling back to the app id; never throws on bad JSON. */
export function manifestName(manifestJson: string, appId: string): string {
  try {
    const parsed: unknown = JSON.parse(manifestJson);
    if (parsed && typeof parsed === 'object' && 'name' in parsed) {
      const name = (parsed as { name?: unknown }).name;
      if (typeof name === 'string' && name.trim().length > 0) return name;
    }
  } catch {
    return appId;
  }
  return appId;
}

function toApp(row: AppRow): InstalledApp {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    appId: row.app_id,
    displayName: row.display_name,
    name: manifestName(row.manifest_json, row.app_id),
    version: row.version,
    manifestJson: row.manifest_json,
    contentHash: row.content_hash,
    signature: row.signature,
    authorKeyFingerprint: row.author_key_fingerprint,
    installSource: row.install_source,
    bundlePath: row.bundle_path,
    packagePath: row.package_path,
    state: row.state,
    pinnedVersion: row.pinned_version,
    updateMode: row.update_mode,
    previousVersion: row.previous_version,
    pinned: (row.pinned ?? 0) === 1,
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
           package_path = COALESCE(?, package_path),
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
          input.packagePath ?? null,
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
            author_key_fingerprint, registry_id, install_source, bundle_path, package_path, state, update_mode,
            installed_at_ms, updated_at_ms)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'installed', 'notify', ?, ?)`,
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
          input.packagePath ?? null,
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
    `SELECT a.*, p.pinned FROM installed_microapps a
     LEFT JOIN app_placements p ON p.workspace_id = a.workspace_id AND p.app_install_id = a.id
     WHERE a.workspace_id = ? AND a.app_id = ?`,
    [workspaceId, appId],
  );
  return rows[0] ? toApp(rows[0]) : null;
}

export async function getAppById(db: HostDb, workspaceId: string, installId: string): Promise<InstalledApp | null> {
  const rows = await db.select<AppRow>(
    `SELECT a.*, p.pinned FROM installed_microapps a
     LEFT JOIN app_placements p ON p.workspace_id = a.workspace_id AND p.app_install_id = a.id
     WHERE a.workspace_id = ? AND a.id = ?`,
    [workspaceId, installId],
  );
  return rows[0] ? toApp(rows[0]) : null;
}

export async function listApps(db: HostDb, workspaceId: string): Promise<InstalledApp[]> {
  const rows = await db.select<AppRow>(
    `SELECT a.*, COALESCE(p.pinned, 0) AS pinned
     FROM installed_microapps a
     LEFT JOIN app_placements p ON p.workspace_id = a.workspace_id AND p.app_install_id = a.id
     WHERE a.workspace_id = ? AND a.state <> 'disabled'
     ORDER BY COALESCE(p.pinned, 0) DESC, COALESCE(p.sort_order, 0) ASC,
              a.last_launched_at_ms IS NULL, a.last_launched_at_ms DESC, a.installed_at_ms DESC`,
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
  if (changed === 0) throw new Error('E-DATA-001 app not found in workspace');
}

/** Local alias only; the signed manifest and the URL key are untouched. */
export async function setDisplayName(
  db: HostDb,
  workspaceId: string,
  installId: string,
  displayName: string | null,
  nowMs = Date.now(),
): Promise<void> {
  const trimmed = displayName?.trim() ?? '';
  const changed = await db.exec(
    'UPDATE installed_microapps SET display_name = ?, updated_at_ms = ? WHERE id = ? AND workspace_id = ?',
    [trimmed.length === 0 ? null : trimmed.slice(0, 80), nowMs, installId, workspaceId],
  );
  if (changed === 0) throw new Error('E-DATA-001 app not found in workspace');
}

export async function setPinned(
  db: HostDb,
  workspaceId: string,
  installId: string,
  pinned: boolean,
): Promise<void> {
  const changed = await db.exec(
    'UPDATE app_placements SET pinned = ? WHERE workspace_id = ? AND app_install_id = ?',
    [pinned ? 1 : 0, workspaceId, installId],
  );
  if (changed === 0) throw new Error('E-DATA-001 placement not found');
}

/** Record a launch and remember it as `workspace_state.last_app_id`. */
export async function recordLaunch(db: HostDb, workspaceId: string, installId: string, nowMs = Date.now()): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.exec(
      'UPDATE installed_microapps SET last_launched_at_ms = ?, updated_at_ms = ? WHERE id = ? AND workspace_id = ?',
      [nowMs, nowMs, installId, workspaceId],
    );
    await tx.exec(
      `INSERT INTO workspace_state (workspace_id, last_app_id, home_scroll, filters_json, updated_at_ms)
       VALUES (?, ?, 0, '{}', ?)
       ON CONFLICT (workspace_id) DO UPDATE SET last_app_id = excluded.last_app_id, updated_at_ms = excluded.updated_at_ms`,
      [workspaceId, installId, nowMs],
    );
  });
}

export async function setLastAppId(
  db: HostDb,
  workspaceId: string,
  installId: string | null,
  nowMs = Date.now(),
): Promise<void> {
  await db.exec('UPDATE workspace_state SET last_app_id = ?, updated_at_ms = ? WHERE workspace_id = ?', [
    installId,
    nowMs,
    workspaceId,
  ]);
}

// ---------------------------------------------------------------------------
// Version history
// ---------------------------------------------------------------------------

/** Append the currently installed version to history (idempotent per version). */
export async function preserveVersion(
  db: HostDb,
  input: { workspaceId: string; installId: string; nowMs?: number },
): Promise<void> {
  const app = await getAppById(db, input.workspaceId, input.installId);
  if (!app) throw new Error('E-DATA-001 app not found in workspace');
  const now = input.nowMs ?? Date.now();
  await db.exec(
    `INSERT INTO app_versions
       (id, workspace_id, app_install_id, version, manifest_json, content_hash, signature,
        author_key_fingerprint, bundle_path, package_path, installed_at_ms)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (app_install_id, version) DO NOTHING`,
    [
      uuidv7(now),
      input.workspaceId,
      app.id,
      app.version,
      app.manifestJson,
      app.contentHash,
      app.signature,
      app.authorKeyFingerprint,
      app.bundlePath,
      app.packagePath,
      // Stamp the moment the version was archived, not when it first installed:
      // the install row keeps a single `installed_at_ms`, so reusing it would
      // give every archived version the same timestamp and break ordering.
      now,
    ],
  );
}

export async function listVersions(db: HostDb, workspaceId: string, installId: string): Promise<AppVersion[]> {
  const rows = await db.select<{
    id: string;
    version: string;
    manifest_json: string;
    content_hash: Uint8Array;
    signature: Uint8Array;
    author_key_fingerprint: string;
    bundle_path: string;
    package_path: string | null;
    installed_at_ms: number;
  }>(
    `SELECT id, version, manifest_json, content_hash, signature, author_key_fingerprint,
            bundle_path, package_path, installed_at_ms
     FROM app_versions
     WHERE workspace_id = ? AND app_install_id = ?
     ORDER BY installed_at_ms DESC`,
    [workspaceId, installId],
  );
  return rows.map((row) => ({
    id: row.id,
    version: row.version,
    manifestJson: row.manifest_json,
    contentHash: row.content_hash,
    signature: row.signature,
    authorKeyFingerprint: row.author_key_fingerprint,
    bundlePath: row.bundle_path,
    packagePath: row.package_path,
    installedAtMs: Number(row.installed_at_ms),
  }));
}

export interface RollbackTarget {
  version: string;
  manifestJson: string;
  contentHash: Uint8Array;
  signature: Uint8Array;
  authorKeyFingerprint: string;
  bundlePath: string;
  packagePath: string | null;
}

/** Fetch a stored version for rollback; `null` when it is not in history. */
export async function getVersion(
  db: HostDb,
  workspaceId: string,
  installId: string,
  version: string,
): Promise<RollbackTarget | null> {
  const rows = await db.select<{
    version: string;
    manifest_json: string;
    content_hash: Uint8Array;
    signature: Uint8Array;
    author_key_fingerprint: string;
    bundle_path: string;
    package_path: string | null;
  }>(
    `SELECT version, manifest_json, content_hash, signature, author_key_fingerprint, bundle_path, package_path
     FROM app_versions WHERE workspace_id = ? AND app_install_id = ? AND version = ?`,
    [workspaceId, installId, version],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    version: row.version,
    manifestJson: row.manifest_json,
    contentHash: row.content_hash,
    signature: row.signature,
    authorKeyFingerprint: row.author_key_fingerprint,
    bundlePath: row.bundle_path,
    packagePath: row.package_path,
  };
}

/**
 * Roll the installed pointers back to a version kept in history.
 * The caller preserves the current version first and moves OPFS bundles.
 */
export async function rollbackToVersion(
  db: HostDb,
  workspaceId: string,
  installId: string,
  target: RollbackTarget,
  nowMs = Date.now(),
): Promise<void> {
  const changed = await db.exec(
    `UPDATE installed_microapps SET
       version = ?, manifest_json = ?, content_hash = ?, signature = ?,
       author_key_fingerprint = ?, bundle_path = ?, package_path = ?,
       state = 'installed', updated_at_ms = ?
     WHERE id = ? AND workspace_id = ?`,
    [
      target.version,
      target.manifestJson,
      target.contentHash,
      target.signature,
      target.authorKeyFingerprint,
      target.bundlePath,
      target.packagePath,
      nowMs,
      installId,
      workspaceId,
    ],
  );
  if (changed === 0) throw new Error('E-DATA-001 app not found in workspace');
}

/** Derive the next free `<appId>.copy[-N]` key for a duplicate. */
export async function nextCopyAppId(db: HostDb, workspaceId: string, appId: string): Promise<string> {
  const base = `${appId}.copy`;
  const rows = await db.select<{ app_id: string }>(
    'SELECT app_id FROM installed_microapps WHERE workspace_id = ? AND app_id LIKE ?',
    [workspaceId, `${base}%`],
  );
  const taken = new Set(rows.map((row) => row.app_id));
  if (!taken.has(base)) return base;
  for (let suffix = 2; suffix < 100; suffix += 1) {
    const candidate = `${base}-${suffix}`;
    if (!taken.has(candidate)) return candidate;
  }
  throw new Error('E-DATA-002 no free duplicate name');
}

export interface DuplicateInput {
  workspaceId: string;
  source: InstalledApp;
  newInstallId: string;
  newAppId: string;
  newBundlePath: string;
  newDbRelativePath: string;
  nowMs?: number;
}

/**
 * Insert the duplicate row. Permission grants, vault grants, and app data are
 * deliberately NOT copied: a copy starts with no consent and an empty database.
 */
export async function duplicateApp(db: HostDb, input: DuplicateInput): Promise<InstalledApp> {
  const now = input.nowMs ?? Date.now();
  const source = input.source;
  const copyLabel = source.displayName?.trim().length
    ? `${source.displayName} salinan`
    : `${source.name} salinan`;
  const maxOrder = await db.select<{ max_order: number | null }>(
    'SELECT MAX(sort_order) AS max_order FROM app_placements WHERE workspace_id = ?',
    [input.workspaceId],
  );
  const sortOrder = Number(maxOrder[0]?.max_order ?? -1) + 1;
  await db.transaction(async (tx) => {
    await tx.exec(
      `INSERT INTO installed_microapps
         (id, workspace_id, app_id, display_name, version, manifest_json, content_hash, signature,
          author_key_fingerprint, install_source, bundle_path, package_path, state, update_mode,
          installed_at_ms, updated_at_ms)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'installed', 'notify', ?, ?)`,
      [
        input.newInstallId,
        input.workspaceId,
        input.newAppId,
        copyLabel.slice(0, 80),
        source.version,
        source.manifestJson,
        source.contentHash,
        source.signature,
        source.authorKeyFingerprint,
        source.installSource,
        input.newBundlePath,
        source.packagePath,
        now,
        now,
      ],
    );
    await tx.exec(
      `INSERT INTO app_databases
         (id, workspace_id, app_install_id, relative_path, schema_version, encryption, size_bytes, created_at_ms, updated_at_ms)
       VALUES (?, ?, ?, ?, 1, 'field-aes-gcm', 0, ?, ?)`,
      [uuidv7(now), input.workspaceId, input.newInstallId, input.newDbRelativePath, now, now],
    );
    await tx.exec(
      `INSERT INTO app_policy (workspace_id, app_install_id, offline_cage, mock_permissions_json, updated_at_ms)
       VALUES (?, ?, 1, '[]', ?)`,
      [input.workspaceId, input.newInstallId, now],
    );
    await tx.exec(
      'INSERT INTO app_placements (workspace_id, app_install_id, folder_id, sort_order, pinned) VALUES (?, ?, NULL, ?, 0)',
      [input.workspaceId, input.newInstallId, sortOrder],
    );
  });
  const created = await getAppById(db, input.workspaceId, input.newInstallId);
  if (!created) throw new Error('E-DATA-001 duplicate row missing after write');
  return created;
}

/**
 * Remove an install and everything that cascades from it. The caller MUST offer
 * an app-data export first and must delete the OPFS tree afterwards.
 */
export async function uninstallApp(db: HostDb, workspaceId: string, installId: string): Promise<InstalledApp> {
  const app = await getAppById(db, workspaceId, installId);
  if (!app) throw new Error('E-DATA-001 app not found in workspace');
  await db.transaction(async (tx) => {
    await tx.exec('DELETE FROM permission_grants WHERE workspace_id = ? AND app_install_id = ?', [
      workspaceId,
      installId,
    ]);
    await tx.exec('DELETE FROM permission_sessions WHERE workspace_id = ? AND app_install_id = ?', [
      workspaceId,
      installId,
    ]);
    await tx.exec('DELETE FROM vault_grants WHERE workspace_id = ? AND app_install_id = ?', [workspaceId, installId]);
    await tx.exec('DELETE FROM app_versions WHERE workspace_id = ? AND app_install_id = ?', [workspaceId, installId]);
    await tx.exec(
      'DELETE FROM search_index WHERE workspace_id = ? AND (ref_id = ? OR app_install_id = ?)',
      [workspaceId, installId, installId],
    );
    // Cascades remove app_databases, app_policy, placements, and runtime sessions.
    await tx.exec('DELETE FROM installed_microapps WHERE workspace_id = ? AND id = ?', [workspaceId, installId]);
    await tx.exec(
      'UPDATE workspace_state SET last_app_id = NULL WHERE workspace_id = ? AND last_app_id = ?',
      [workspaceId, installId],
    );
  });
  return app;
}

export interface RuntimeSessionInput {
  workspaceId: string;
  installId: string;
  engine: 'web-iframe';
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
