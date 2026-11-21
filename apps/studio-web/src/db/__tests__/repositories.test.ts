import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NodeSqliteDriver } from '../node-sqlite-driver';
import { applyMigrations, rollbackLastMigration } from '../migrate';
import { HOST_MIGRATIONS } from '../migrations/index.generated';
import { isUuidv7, uuidv7 } from '../ids';
import { createIdentity, loadIdentity, resetIdentity, setRecoveryHint } from '../repositories/identity';
import {
  createWorkspace,
  deleteWorkspace,
  ensureDefaultWorkspace,
  listWorkspaces,
  loadWorkspaceState,
  saveWorkspaceState,
  renameWorkspace,
  setActiveWorkspace,
} from '../repositories/workspaces';
import {
  appPolicy,
  duplicateApp,
  getApp,
  getVersion,
  installApp,
  listApps,
  listVersions,
  nextCopyAppId,
  preserveVersion,
  recordLaunch,
  rollbackToVersion,
  setDisplayName,
  setOfflineCage,
  setPinned,
  startRuntimeSession,
  uninstallApp,
} from '../repositories/apps';
import { listPlacements, placeApp } from '../repositories/launcher';
import {
  clearSessionGrants,
  grantPermission,
  listActiveGrants,
  permissionDecision,
  revokePermission,
  revokeUndeclaredGrants,
} from '../repositories/permissions';
import { appendAudit, listAudit, listSandboxAudit, verifyAuditChain } from '../repositories/audit';
import {
  activeKeyWrap,
  createVaultItem,
  grantVaultItem,
  listVaultItems,
  revokeVaultItem,
  saveKeyWrap,
  vaultItemForApp,
} from '../repositories/vault';
import {
  cancelNotification,
  listNotifications,
  markNotificationFired,
  pendingNotifications,
  scheduleNotification,
} from '../repositories/notifications';
import {
  finishMigrationReport,
  indexRecord,
  listPins,
  pinStorage,
  rebuildSearchIndex,
  recordLegacyMapping,
  removeSearchRef,
  resolveLegacyMapping,
  search,
  startMigrationReport,
} from '../repositories/search';
import { getSetting, setSetting } from '../repositories/settings';
import { createStudioProject, getStudioProject, listAllProjects } from '../repositories/studio';

const bytes = (length: number, fill = 1): Uint8Array => new Uint8Array(length).fill(fill);
const hex = (data: Uint8Array): string => [...data].map((b) => b.toString(16).padStart(2, '0')).join('');

/** Test double for the Rust core's audit hash (algorithm covered by core tests). */
function testHasher(prev: string, seq: number, payload: string): Promise<string> {
  return Promise.resolve(createHash('sha256').update(`${prev}:${seq}:${payload}`).digest('hex'));
}

async function freshDb(): Promise<NodeSqliteDriver> {
  const db = new NodeSqliteDriver();
  await applyMigrations(db);
  return db;
}

async function seed(db: NodeSqliteDriver) {
  const workspace = await ensureDefaultWorkspace(db, { name: 'Rumah', locale: 'id-ID', nowMs: 1_000 });
  const app = await installApp(db, {
    workspaceId: workspace.id,
    appId: 'org.reinvy.kas',
    version: '1.3.0',
    manifestJson: JSON.stringify({ id: 'org.reinvy.kas', name: 'KasLokal', version: '1.3.0' }),
    contentHash: bytes(32, 2),
    signature: bytes(64, 3),
    authorKeyFingerprint: 'f'.repeat(64),
    installSource: 'local',
    bundlePath: 'apps/org.reinvy.kas/1.3.0',
    dbRelativePath: 'workspaces/rumah/apps/org.reinvy.kas.db',
    schemaVersion: 1,
    nowMs: 2_000,
  });
  return { workspace, app };
}

/** Install a second app in the same workspace; `sortOrder` follows insertion. */
async function seedSecondApp(db: NodeSqliteDriver, workspaceId: string, nowMs = 3_000) {
  return installApp(db, {
    workspaceId,
    appId: 'org.reinvy.notes',
    version: '2.0.0',
    manifestJson: JSON.stringify({ id: 'org.reinvy.notes', name: 'Catatan', version: '2.0.0' }),
    contentHash: bytes(32, 5),
    signature: bytes(64, 6),
    authorKeyFingerprint: 'a'.repeat(64),
    installSource: 'local',
    bundlePath: 'apps/org.reinvy.notes/2.0.0',
    dbRelativePath: 'workspaces/rumah/apps/org.reinvy.notes.db',
    schemaVersion: 1,
    nowMs,
  });
}

async function tableNames(db: NodeSqliteDriver): Promise<string[]> {
  const rows = await db.select<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
  );
  return rows.map((row) => row.name);
}

let db: NodeSqliteDriver;

beforeEach(async () => {
  db = await freshDb();
});

afterEach(async () => {
  await db.close();
});

describe('ids', () => {
  it('generates version-7 UUIDs that sort by time', () => {
    const early = uuidv7(1_000);
    const late = uuidv7(2_000);
    expect(isUuidv7(early)).toBe(true);
    expect(isUuidv7(late)).toBe(true);
    expect(early < late).toBe(true);
    expect(isUuidv7('0190a5b2-0000-4000-8000-000000000000')).toBe(false);
  });
});

describe('migrations', () => {
  it('applies forward, is idempotent, and rolls back the last migration', async () => {
    const fresh = new NodeSqliteDriver();
    const first = await applyMigrations(fresh);
    expect(first.applied).toEqual([1, 2, 3]);
    const second = await applyMigrations(fresh);
    expect(second.applied).toEqual([]);
    expect(second.alreadyApplied).toEqual([1, 2, 3]);

    const rolledBack = await rollbackLastMigration(fresh);
    expect(rolledBack).toBe(3);
    // 003 is additive: rolling it back removes the new tables but keeps search.
    expect(await tableNames(fresh)).not.toContain('app_versions');
    expect(await tableNames(fresh)).not.toContain('dev_log');
    expect(await tableNames(fresh)).toContain('outbox');
    expect(await tableNames(fresh)).toContain('search_index');
    const tables = await fresh.select<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'installed_microapps'",
    );
    expect(tables).toHaveLength(1);
    const columns = await fresh.select<{ name: string }>('PRAGMA table_info(installed_microapps)');
    expect(columns.map((column) => column.name)).not.toContain('display_name');

    // Re-running forward restores the v3 surface.
    expect((await applyMigrations(fresh)).applied).toEqual([3]);
    expect(await tableNames(fresh)).toContain('app_versions');
    await fresh.close();
  });

  it('lands the v3 schema and drops the native-era tables', async () => {
    const tables = await tableNames(db);
    expect(tables).toContain('app_versions');
    expect(tables).toContain('dev_log');
    for (const removed of ['outbox', 'widgets', 'dock_items', 'registry_pins']) {
      expect(tables).not.toContain(removed);
    }
    const columns = await db.select<{ name: string }>('PRAGMA table_info(installed_microapps)');
    expect(columns.map((column) => column.name)).toEqual(
      expect.arrayContaining(['display_name', 'package_path']),
    );

    // `runtime_sessions` was rebuilt so only the web iframe engine is accepted.
    const workspace = await ensureDefaultWorkspace(db, { name: 'Rumah', nowMs: 1_000 });
    const app = await installApp(db, {
      workspaceId: workspace.id,
      appId: 'org.reinvy.engine',
      version: '1.0.0',
      manifestJson: JSON.stringify({ name: 'Engine' }),
      contentHash: bytes(32),
      signature: bytes(64),
      authorKeyFingerprint: 'b'.repeat(64),
      installSource: 'local',
      bundlePath: 'apps/org.reinvy.engine/1.0.0',
      dbRelativePath: 'workspaces/rumah/apps/org.reinvy.engine.db',
      schemaVersion: 1,
    });
    await expect(
      db.exec(
        `INSERT INTO runtime_sessions
           (session_id, workspace_id, app_install_id, engine, state, memory_bytes, started_at_ms, updated_at_ms)
         VALUES ('legacy-session', ?, ?, 'native-quickjs', 'running', 0, 1, 1)`,
        [workspace.id, app.id],
      ),
    ).rejects.toThrow();
  });

  it('refuses to run when an applied migration checksum changed', async () => {
    await applyMigrations(db);
    const tampered = HOST_MIGRATIONS.map((migration) =>
      migration.version === 1 ? { ...migration, checksum: 'deadbeef' } : migration,
    );
    await expect(applyMigrations(db, tampered)).rejects.toThrow(/E-DATA-002/);
  });
});

describe('workspaces', () => {
  it('creates exactly one default workspace and restores launcher state', async () => {
    const workspace = await ensureDefaultWorkspace(db, { name: 'Rumah', locale: 'id-ID', nowMs: 1_000 });
    const again = await ensureDefaultWorkspace(db, { name: 'Lain', nowMs: 2_000 });
    expect(again.id).toBe(workspace.id);
    expect(await listWorkspaces(db)).toHaveLength(1);
    await renameWorkspace(db, workspace.id, 'Kantor', 3_000);
    expect((await listWorkspaces(db))[0]?.name).toBe('Kantor');

    await saveWorkspaceState(
      db,
      workspace.id,
      { lastAppId: 'app-1', homeScroll: 42.5, filters: { kind: 'finance' } },
      4_000,
    );
    expect(await loadWorkspaceState(db, workspace.id)).toEqual({
      lastAppId: 'app-1',
      homeScroll: 42.5,
      filters: { kind: 'finance' },
    });
  });
});

describe('workspace management', () => {
  it('creates, switches, renames, and soft-deletes non-default workspaces', async () => {
    const workspace = await ensureDefaultWorkspace(db, { name: 'Rumah', locale: 'id-ID', nowMs: 1_000 });
    const second = await createWorkspace(db, { name: 'Kantor', nowMs: 2_000 });
    expect(second.isDefault).toBe(false);
    expect(await listWorkspaces(db)).toHaveLength(2);

    await setActiveWorkspace(db, second.id, 3_000);
    const active = await db.select<{ id: string }>('SELECT id FROM workspaces WHERE is_default = 1');
    expect(active).toEqual([{ id: second.id }]);

    await renameWorkspace(db, second.id, 'Kantor Pusat', 4_000);
    expect((await listWorkspaces(db)).find((row) => row.id === second.id)?.name).toBe('Kantor Pusat');

    await setActiveWorkspace(db, workspace.id, 4_500);
    await expect(deleteWorkspace(db, second.id, 5_000)).resolves.toBeUndefined();
    expect(await listWorkspaces(db)).toHaveLength(1);
    await expect(deleteWorkspace(db, workspace.id)).rejects.toThrow(/default workspace/);
    await expect(createWorkspace(db, { name: '   ' })).rejects.toThrow(/name is required/);
  });
});

describe('installed apps', () => {
  it('installs an app with database, policy, and placement rows', async () => {
    const { workspace, app } = await seed(db);
    expect(app.appId).toBe('org.reinvy.kas');
    expect(app.state).toBe('installed');
    expect(app.displayName).toBeNull();
    expect(app.name).toBe('KasLokal');
    const policy = await appPolicy(db, workspace.id, app.id);
    expect(policy.offlineCage).toBe(true);
    const dbs = await db.select<{ relative_path: string }>(
      'SELECT relative_path FROM app_databases WHERE app_install_id = ?',
      [app.id],
    );
    expect(dbs[0]?.relative_path).toContain('org.reinvy.kas.db');
    const placements = await db.select<{ sort_order: number }>(
      'SELECT sort_order FROM app_placements WHERE app_install_id = ?',
      [app.id],
    );
    expect(placements).toHaveLength(1);
    const sessionId = await startRuntimeSession(db, { workspaceId: workspace.id, installId: app.id, engine: 'web-iframe' });
    expect(isUuidv7(sessionId)).toBe(true);
    const active = await db.select<{ state: string }>('SELECT state FROM runtime_sessions WHERE session_id = ?', [
      sessionId,
    ]);
    expect(active[0]?.state).toBe('running');
    await setOfflineCage(db, workspace.id, app.id, false);
    expect((await appPolicy(db, workspace.id, app.id)).offlineCage).toBe(false);
  });

  it('places an app once, even when the caller repeats the placement', async () => {
    const { workspace, app } = await seed(db);
    await placeApp(db, workspace.id, app.id);
    await placeApp(db, workspace.id, app.id);
    const placements = await listPlacements(db, workspace.id);
    expect(placements).toHaveLength(1);
    expect(placements[0]?.appInstallId).toBe(app.id);
    expect(placements[0]?.pinned).toBe(false);
  });

  it('keeps workspaces isolated', async () => {
    const { workspace, app } = await seed(db);
    const second = await createWorkspace(db, { name: 'Kedua' });
    // ensureDefaultWorkspace returns the existing default.
    expect(await ensureDefaultWorkspace(db, { name: 'Second' })).toMatchObject({ id: workspace.id });
    expect(await getApp(db, second.id, 'org.reinvy.kas')).toBeNull();
    expect(await listApps(db, second.id)).toHaveLength(0);
    expect(await listVersions(db, second.id, app.id)).toHaveLength(0);
    expect(await listApps(db, workspace.id)).toHaveLength(1);
    await expect(
      installApp(db, {
        workspaceId: 'missing-workspace',
        appId: 'org.reinvy.other',
        version: '1.0.0',
        manifestJson: '{}',
        contentHash: bytes(32),
        signature: bytes(64),
        authorKeyFingerprint: 'a'.repeat(64),
        installSource: 'local',
        bundlePath: 'x',
        dbRelativePath: 'y.db',
        schemaVersion: 1,
      }),
    ).rejects.toThrow();
    void app;
  });

  it('keeps version history, resolves it by version, and rolls back without losing the newer version', async () => {
    const { workspace, app } = await seed(db);
    await preserveVersion(db, { workspaceId: workspace.id, installId: app.id, nowMs: 2_100 });
    expect((await listVersions(db, workspace.id, app.id)).map((version) => version.version)).toEqual(['1.3.0']);

    await installApp(db, {
      workspaceId: workspace.id,
      appId: 'org.reinvy.kas',
      version: '1.4.0',
      manifestJson: JSON.stringify({ id: 'org.reinvy.kas', name: 'KasLokal', version: '1.4.0' }),
      contentHash: bytes(32, 4),
      signature: bytes(64, 7),
      authorKeyFingerprint: 'f'.repeat(64),
      installSource: 'local',
      bundlePath: 'apps/org.reinvy.kas/1.4.0',
      dbRelativePath: 'workspaces/rumah/apps/org.reinvy.kas.db',
      schemaVersion: 1,
      nowMs: 3_000,
    });
    await preserveVersion(db, { workspaceId: workspace.id, installId: app.id, nowMs: 3_100 });

    const versions = await listVersions(db, workspace.id, app.id);
    expect(versions.map((version) => version.version).sort()).toEqual(['1.3.0', '1.4.0']);

    const storedV1 = await getVersion(db, workspace.id, app.id, '1.3.0');
    expect(storedV1).not.toBeNull();
    expect(JSON.parse(storedV1!.manifestJson)).toMatchObject({ version: '1.3.0' });
    expect(storedV1!.bundlePath).toBe('apps/org.reinvy.kas/1.3.0');
    expect(await getVersion(db, workspace.id, app.id, '9.9.9')).toBeNull();

    // Caller flow (packageService.rollbackApp): preserve the current version,
    // then move the installed pointers back to the stored target.
    await preserveVersion(db, { workspaceId: workspace.id, installId: app.id, nowMs: 4_000 });
    await rollbackToVersion(db, workspace.id, app.id, storedV1!, 4_100);

    const restored = await getApp(db, workspace.id, 'org.reinvy.kas');
    expect(restored?.version).toBe('1.3.0');
    expect(restored?.manifestJson).toBe(storedV1!.manifestJson);
    expect(hex(restored!.contentHash)).toBe(hex(storedV1!.contentHash));
    // The rolled-back-from version is still available for a later rollback.
    expect((await listVersions(db, workspace.id, app.id)).map((version) => version.version).sort()).toEqual([
      '1.3.0',
      '1.4.0',
    ]);
  });

  it('renames through display_name only and clears back to the manifest name', async () => {
    const { workspace, app } = await seed(db);
    expect((await listApps(db, workspace.id))[0]?.name).toBe('KasLokal');

    await setDisplayName(db, workspace.id, app.id, '  Kas Warung  ', 3_000);
    const renamed = await getApp(db, workspace.id, 'org.reinvy.kas');
    expect(renamed?.displayName).toBe('Kas Warung');
    expect(renamed?.name).toBe('KasLokal');
    expect(renamed?.appId).toBe('org.reinvy.kas');
    expect(renamed?.manifestJson).toBe(app.manifestJson);
    expect((await listApps(db, workspace.id))[0]?.displayName).toBe('Kas Warung');
    const row = await db.select<{ app_id: string; manifest_json: string }>(
      'SELECT app_id, manifest_json FROM installed_microapps WHERE id = ?',
      [app.id],
    );
    expect(row[0]?.app_id).toBe('org.reinvy.kas');
    expect(row[0]?.manifest_json).toBe(app.manifestJson);

    await setDisplayName(db, workspace.id, app.id, null, 3_100);
    const cleared = await getApp(db, workspace.id, 'org.reinvy.kas');
    expect(cleared?.displayName).toBeNull();
    expect(cleared?.name).toBe('KasLokal');
  });

  it('puts pinned apps first regardless of placement order', async () => {
    const { workspace } = await seed(db);
    const notes = await seedSecondApp(db, workspace.id);
    expect((await listApps(db, workspace.id)).map((app) => app.appId)).toEqual([
      'org.reinvy.kas',
      'org.reinvy.notes',
    ]);

    await setPinned(db, workspace.id, notes.id, true);
    const pinned = await listApps(db, workspace.id);
    expect(pinned.map((app) => app.appId)).toEqual(['org.reinvy.notes', 'org.reinvy.kas']);
    expect(pinned[0]?.pinned).toBe(true);
    expect(pinned[1]?.pinned).toBe(false);
    expect((await listPlacements(db, workspace.id)).find((row) => row.appInstallId === notes.id)?.pinned).toBe(true);

    await setPinned(db, workspace.id, notes.id, false);
    expect((await listApps(db, workspace.id)).map((app) => app.appId)).toEqual([
      'org.reinvy.kas',
      'org.reinvy.notes',
    ]);
  });

  it('records a launch as the workspace resume target', async () => {
    const { workspace, app } = await seed(db);
    expect((await loadWorkspaceState(db, workspace.id)).lastAppId).toBeNull();
    await recordLaunch(db, workspace.id, app.id, 5_000);
    expect((await loadWorkspaceState(db, workspace.id)).lastAppId).toBe(app.id);
    const row = await db.select<{ last_launched_at_ms: number }>(
      'SELECT last_launched_at_ms FROM installed_microapps WHERE id = ?',
      [app.id],
    );
    expect(Number(row[0]?.last_launched_at_ms)).toBe(5_000);
  });

  it('duplicates into `.copy` ids without copying consent', async () => {
    const { workspace, app } = await seed(db);
    await setDisplayName(db, workspace.id, app.id, 'Kas Warung', 2_500);
    await grantPermission(db, {
      workspaceId: workspace.id,
      appInstallId: app.id,
      permissionId: 'camera',
      scope: 'persistent',
      nowMs: 2_600,
    });
    const source = (await getApp(db, workspace.id, 'org.reinvy.kas'))!;

    const firstAppId = await nextCopyAppId(db, workspace.id, source.appId);
    expect(firstAppId).toBe('org.reinvy.kas.copy');
    const first = await duplicateApp(db, {
      workspaceId: workspace.id,
      source,
      newInstallId: uuidv7(3_000),
      newAppId: firstAppId,
      newBundlePath: `apps/${firstAppId}/1.3.0`,
      newDbRelativePath: `workspaces/rumah/apps/${firstAppId}.db`,
      nowMs: 3_000,
    });
    expect(first.id).not.toBe(app.id);
    expect(first.appId).toBe('org.reinvy.kas.copy');
    expect(first.displayName).toBe('Kas Warung salinan');
    expect(first.version).toBe('1.3.0');
    expect(first.manifestJson).toBe(source.manifestJson);
    expect(first.packagePath).toBe(source.packagePath);

    const secondAppId = await nextCopyAppId(db, workspace.id, source.appId);
    expect(secondAppId).toBe('org.reinvy.kas.copy-2');
    const second = await duplicateApp(db, {
      workspaceId: workspace.id,
      source,
      newInstallId: uuidv7(3_100),
      newAppId: secondAppId,
      newBundlePath: `apps/${secondAppId}/1.3.0`,
      newDbRelativePath: `workspaces/rumah/apps/${secondAppId}.db`,
      nowMs: 3_100,
    });
    expect(second.appId).toBe('org.reinvy.kas.copy-2');
    expect(await listApps(db, workspace.id)).toHaveLength(3);

    // A copy starts with no consent, its own database/policy/placement rows.
    for (const copy of [first, second]) {
      const grants = await db.select<{ permission_id: string }>(
        'SELECT permission_id FROM permission_grants WHERE app_install_id = ?',
        [copy.id],
      );
      expect(grants).toHaveLength(0);
      expect(await appPolicy(db, workspace.id, copy.id)).toMatchObject({ offlineCage: true });
      expect(await db.select('SELECT 1 FROM app_databases WHERE app_install_id = ?', [copy.id])).toHaveLength(1);
      expect(await db.select('SELECT 1 FROM app_placements WHERE app_install_id = ?', [copy.id])).toHaveLength(1);
    }
    expect(await listActiveGrants(db, workspace.id, app.id)).toHaveLength(1);
  });

  it('uninstalls the row with its history, grants, placements, search rows, and resume target', async () => {
    const { workspace, app } = await seed(db);
    await grantPermission(db, {
      workspaceId: workspace.id,
      appInstallId: app.id,
      permissionId: 'camera',
      scope: 'persistent',
    });
    await preserveVersion(db, { workspaceId: workspace.id, installId: app.id });
    await indexRecord(db, {
      workspaceId: workspace.id,
      kind: 'app',
      refId: app.id,
      appInstallId: app.id,
      title: 'KasLokal',
      body: 'org.reinvy.kas',
    });
    await indexRecord(db, {
      workspaceId: workspace.id,
      kind: 'record',
      refId: `${app.id}:total`,
      appInstallId: app.id,
      title: 'total',
      body: '42',
    });
    await recordLaunch(db, workspace.id, app.id, 4_000);
    expect((await loadWorkspaceState(db, workspace.id)).lastAppId).toBe(app.id);

    const removed = await uninstallApp(db, workspace.id, app.id);
    expect(removed.id).toBe(app.id);

    expect(await getApp(db, workspace.id, 'org.reinvy.kas')).toBeNull();
    for (const table of ['app_versions', 'permission_grants', 'app_placements', 'app_databases', 'app_policy']) {
      expect(await db.select(`SELECT 1 FROM ${table} WHERE app_install_id = ?`, [app.id])).toHaveLength(0);
    }
    const searchRows = await db.select<{ ref_id: string }>(
      'SELECT ref_id FROM search_index WHERE workspace_id = ? AND (ref_id = ? OR app_install_id = ?)',
      [workspace.id, app.id, app.id],
    );
    expect(searchRows).toHaveLength(0);
    expect((await loadWorkspaceState(db, workspace.id)).lastAppId).toBeNull();
  });

  it('returns empty/null when another workspace asks for this workspace’s ids', async () => {
    const { workspace, app } = await seed(db);
    const project = await createStudioProject(db, {
      workspaceId: workspace.id,
      name: 'Kas draft',
      nowMs: 2_100,
    });
    await preserveVersion(db, { workspaceId: workspace.id, installId: app.id });
    const other = await createWorkspace(db, { name: 'Kedua', nowMs: 2_200 });

    expect(await listApps(db, other.id)).toHaveLength(0);
    expect(await getStudioProject(db, other.id, project.id)).toBeNull();
    expect(await listVersions(db, other.id, app.id)).toHaveLength(0);
    expect(await listAllProjects(db, other.id)).toHaveLength(0);
    expect(await listVersions(db, workspace.id, app.id)).toHaveLength(1);
  });
});

describe('permissions', () => {
  it('grants, revokes, mocks, and expires allow-once', async () => {
    const { workspace, app } = await seed(db);
    await grantPermission(db, {
      workspaceId: workspace.id,
      appInstallId: app.id,
      permissionId: 'camera',
      scope: 'persistent',
      nowMs: 10,
    });
    expect(
      await permissionDecision(db, {
        workspaceId: workspace.id,
        appInstallId: app.id,
        permissionId: 'camera',
        nowMs: 11,
      }),
    ).toBe('granted');
    expect(await listActiveGrants(db, workspace.id, app.id)).toHaveLength(1);

    // Re-granting as mocked replaces the active row (partial unique index).
    await grantPermission(db, {
      workspaceId: workspace.id,
      appInstallId: app.id,
      permissionId: 'camera',
      scope: 'persistent',
      mocked: true,
      nowMs: 12,
    });
    expect(
      await permissionDecision(db, {
        workspaceId: workspace.id,
        appInstallId: app.id,
        permissionId: 'camera',
        nowMs: 13,
      }),
    ).toBe('mocked');

    await grantPermission(db, {
      workspaceId: workspace.id,
      appInstallId: app.id,
      permissionId: 'location',
      scope: 'once',
      sessionId: 'session-1',
      expiresAtMs: 5_000,
      nowMs: 20,
    });
    expect(
      await permissionDecision(db, {
        workspaceId: workspace.id,
        appInstallId: app.id,
        permissionId: 'location',
        sessionId: 'session-1',
        nowMs: 100,
      }),
    ).toBe('granted');
    expect(
      await permissionDecision(db, {
        workspaceId: workspace.id,
        appInstallId: app.id,
        permissionId: 'location',
        sessionId: 'session-1',
        nowMs: 6_000,
      }),
    ).toBe('denied');
    await clearSessionGrants(db, { workspaceId: workspace.id, appInstallId: app.id, sessionId: 'session-1' });
    expect(
      await permissionDecision(db, {
        workspaceId: workspace.id,
        appInstallId: app.id,
        permissionId: 'location',
        sessionId: 'session-1',
        nowMs: 100,
      }),
    ).toBe('denied');

    expect(
      await revokePermission(db, {
        workspaceId: workspace.id,
        appInstallId: app.id,
        permissionId: 'camera',
        nowMs: 30,
      }),
    ).toBe(true);
    expect(
      await permissionDecision(db, {
        workspaceId: workspace.id,
        appInstallId: app.id,
        permissionId: 'camera',
        nowMs: 31,
      }),
    ).toBe('denied');
  });

  it('revokes grants no longer declared by an updated manifest', async () => {
    const { workspace, app } = await seed(db);
    for (const permissionId of ['camera', 'microphone', 'location']) {
      await grantPermission(db, {
        workspaceId: workspace.id,
        appInstallId: app.id,
        permissionId,
        scope: 'persistent',
      });
    }
    const revoked = await revokeUndeclaredGrants(db, {
      workspaceId: workspace.id,
      appInstallId: app.id,
      declared: ['camera'],
    });
    expect(revoked.sort()).toEqual(['location', 'microphone']);
    expect(await listActiveGrants(db, workspace.id, app.id)).toHaveLength(1);
  });
});

describe('audit chain', () => {
  it('appends a verifiable chain and detects tampering', async () => {
    await appendAudit(db, { actor: 'user', action: 'app.install', target: 'org.reinvy.kas', createdAtMs: 1 }, testHasher);
    await appendAudit(db, { actor: 'user', action: 'permission.grant', createdAtMs: 2 }, testHasher);
    const entries = await listAudit(db);
    expect(entries.map((entry) => entry.seqId)).toEqual([1, 2]);
    expect(entries[0]?.prevHash).toBe('0'.repeat(64));
    expect(entries[1]?.prevHash).toBe(entries[0]?.entryHash);
    expect(await verifyAuditChain(db, testHasher)).toBeNull();

    await db.exec("UPDATE audit_log_chain SET metadata_json = '{\"tampered\":true}' WHERE seq_id = 2");
    expect(await verifyAuditChain(db, testHasher)).toBe(2);
  });

  it('exposes the sandbox_audit view', async () => {
    await appendAudit(db, { actor: 'system', action: 'sandbox.launch' }, testHasher);
    await appendAudit(db, { actor: 'user', action: 'settings.update' }, testHasher);
    const sandbox = await listSandboxAudit(db);
    expect(sandbox).toHaveLength(1);
    expect(sandbox[0]?.action).toBe('sandbox.launch');
  });
});

describe('vault', () => {
  it('stores envelopes, rejects mismatched metadata, and scopes grants per item', async () => {
    const { workspace, app } = await seed(db);
    const keyId = bytes(16, 7);
    const nonce = bytes(12, 8);
    const envelope = new Uint8Array(1 + 16 + 12 + 5 + 16);
    envelope[0] = 1;
    envelope.set(keyId, 1);
    envelope.set(nonce, 17);
    const item = await createVaultItem(db, {
      workspaceId: workspace.id,
      kind: 'api_key',
      label: 'OpenAI',
      envelope,
      keyId,
      nonce,
      nowMs: 10,
    });
    expect(await listVaultItems(db, workspace.id)).toHaveLength(1);
    expect(await vaultItemForApp(db, { workspaceId: workspace.id, itemId: item.id, appInstallId: app.id })).toBeNull();
    await grantVaultItem(db, { workspaceId: workspace.id, itemId: item.id, appInstallId: app.id, nowMs: 11 });
    expect(
      await vaultItemForApp(db, { workspaceId: workspace.id, itemId: item.id, appInstallId: app.id }),
    ).not.toBeNull();
    await revokeVaultItem(db, { workspaceId: workspace.id, itemId: item.id, appInstallId: app.id, nowMs: 12 });
    expect(await vaultItemForApp(db, { workspaceId: workspace.id, itemId: item.id, appInstallId: app.id })).toBeNull();

    await expect(
      createVaultItem(db, {
        workspaceId: workspace.id,
        kind: 'note',
        label: 'Bad',
        envelope,
        keyId: bytes(16, 9),
        nonce,
      }),
    ).rejects.toThrow(/E-CRYPTO-001/);
  });

  it('keeps one active key wrap per workspace', async () => {
    const { workspace } = await seed(db);
    const base = {
      workspaceId: workspace.id,
      kdf: 'argon2id' as const,
      salt: bytes(16, 1),
      memoryKib: 65_536,
      iterations: 3,
      parallelism: 1,
      nonce: bytes(12, 2),
      wrappedKey: bytes(48, 3),
    };
    await saveKeyWrap(db, { ...base, nowMs: 1 });
    await saveKeyWrap(db, { ...base, nowMs: 2 });
    const active = await activeKeyWrap(db, workspace.id);
    expect(active).not.toBeNull();
    expect(active?.createdAtMs).toBe(2);
    await expect(saveKeyWrap(db, { ...base, memoryKib: 1024, nowMs: 3 })).rejects.toThrow(/argon2id/);
  });
});

describe('notifications', () => {
  it('schedules, reschedules on launch, and cancels', async () => {
    const { workspace } = await seed(db);
    const scheduled = await scheduleNotification(db, {
      workspaceId: workspace.id,
      title: 'Buka kas',
      body: 'Catat pengeluaran',
      scheduledAtMs: 50_000,
      nowMs: 1_000,
    });
    expect(scheduled.state).toBe('scheduled');
    expect(await pendingNotifications(db, workspace.id, 2_000)).toHaveLength(1);
    expect(await pendingNotifications(db, workspace.id, 60_000)).toHaveLength(0);
    await markNotificationFired(db, workspace.id, scheduled.id, 50_001);
    expect((await listNotifications(db, workspace.id))[0]?.state).toBe('fired');
    const second = await scheduleNotification(db, {
      workspaceId: workspace.id,
      title: 'Lain',
      body: 'x',
      scheduledAtMs: 70_000,
      nowMs: 1_000,
    });
    expect(await cancelNotification(db, workspace.id, second.id)).toBe(true);
    expect(await listNotifications(db, workspace.id)).toHaveLength(1);
  });
});

describe('search, pins, settings, migration ledger', () => {
  it('indexes records and searches them per workspace', async () => {
    const { workspace, app } = await seed(db);
    await indexRecord(db, {
      workspaceId: workspace.id,
      kind: 'record',
      refId: 'rec-1',
      appInstallId: app.id,
      title: 'Pengeluaran harian',
      body: 'Kopi 25.000 dan transport 15.000',
    });
    const hits = await search(db, workspace.id, 'kopi');
    expect(hits).toHaveLength(1);
    expect(hits[0]?.refId).toBe('rec-1');
    expect(await search(db, 'other-workspace', 'kopi')).toHaveLength(0);
    // Re-indexing the same record replaces the old row.
    await indexRecord(db, {
      workspaceId: workspace.id,
      kind: 'record',
      refId: 'rec-1',
      appInstallId: app.id,
      title: 'Pengeluaran',
      body: 'Teh 5.000',
    });
    expect(await search(db, workspace.id, 'kopi')).toHaveLength(0);
    expect(await search(db, workspace.id, 'teh')).toHaveLength(1);
    expect(await rebuildSearchIndex(db, workspace.id)).toBe(1);
    expect(await search(db, workspace.id, 'KasLokal')).toHaveLength(1);
    expect((await search(db, workspace.id, 'KasLokal'))[0]?.kind).toBe('app');
  });

  it('rebuilds app and project entries with their own kinds and can drop one', async () => {
    const { workspace } = await seed(db);
    const project = await createStudioProject(db, {
      workspaceId: workspace.id,
      name: 'Laporan Bulanan',
      document: { name: 'Ringkasan penjualan' },
      nowMs: 2_500,
    });
    expect(await rebuildSearchIndex(db, workspace.id)).toBe(2);

    const appHits = await search(db, workspace.id, 'kaslokal');
    expect(appHits.map((hit) => hit.kind)).toEqual(['app']);
    const projectHits = await search(db, workspace.id, 'laporan');
    expect(projectHits.map((hit) => hit.kind)).toEqual(['project']);
    expect(projectHits[0]?.refId).toBe(project.id);
    // The document body is indexed too, not just the project name.
    expect(await search(db, workspace.id, 'penjualan')).toHaveLength(1);

    await removeSearchRef(db, workspace.id, 'project', project.id);
    expect(await search(db, workspace.id, 'laporan')).toHaveLength(0);
    expect(await search(db, workspace.id, 'kaslokal')).toHaveLength(1);
  });

  it('pins storage and persists settings', async () => {
    const { workspace, app } = await seed(db);
    await pinStorage(db, {
      workspaceId: workspace.id,
      appInstallId: app.id,
      category: 'database',
      relativePath: 'apps/org.reinvy.kas/1.3.0/app.db',
    });
    expect(await listPins(db, workspace.id)).toHaveLength(1);
    expect(await getSetting(db, 'locale', 'id-ID')).toBe('id-ID');
    await setSetting(db, 'locale', 'en-US');
    expect(await getSetting(db, 'locale', 'id-ID')).toBe('en-US');
  });

  it('records the Phase 0 migration ledger', async () => {
    const { workspace } = await seed(db);
    const draft = await createStudioProject(db, {
      workspaceId: workspace.id,
      name: 'Kas draft',
      sourceLegacyId: 'legacy-app-1',
    });
    expect(draft.status).toBe('draft');
    expect(await listAllProjects(db, workspace.id)).toHaveLength(1);
    const reportId = await startMigrationReport(db, {
      source: 'dexie-v6',
      counts: { apps: 1 },
      checksum: 'abc',
    });
    await finishMigrationReport(db, reportId, 'done', { apps: 1, content: 3 });
    const reports = await db.select<{ status: string; counts_json: string }>(
      'SELECT status, counts_json FROM migration_report WHERE id = ?',
      [reportId],
    );
    expect(reports[0]?.status).toBe('done');
    await recordLegacyMapping(db, {
      legacyStore: 'apps',
      legacyId: 'legacy-app-1',
      newTable: 'studio_project',
      newId: draft.id,
    });
    expect(await resolveLegacyMapping(db, 'apps', 'legacy-app-1')).toEqual({
      newTable: 'studio_project',
      newId: draft.id,
    });
  });
});

describe('identity', () => {
  it('stores only public material and never a mnemonic hash', async () => {
    const identity = await createIdentity(db, {
      siteId: bytes(16, 4),
      identityPubkey: bytes(32, 5),
      keyAgreementPubkey: bytes(32, 6),
      hkdfSalt: bytes(32, 7),
      deviceSignPubkey: bytes(32, 8),
      deviceEcdhPubkey: bytes(32, 9),
      displayName: 'Rina',
      nowMs: 1,
    });
    expect(identity.displayName).toBe('Rina');
    expect(hex((await loadIdentity(db))!.siteId)).toBe(hex(bytes(16, 4)));
    const columns = await db.select<{ name: string }>('PRAGMA table_info(local_identity)');
    const names = columns.map((column) => column.name);
    expect(names).not.toContain('recovery_key_hash');
    expect(names).toContain('hkdf_salt');
    await setRecoveryHint(db, 'bank card pin at home');
    expect((await loadIdentity(db))?.recoveryHint).toBe('bank card pin at home');
    await expect(
      createIdentity(db, {
        siteId: bytes(16),
        identityPubkey: bytes(32),
        keyAgreementPubkey: bytes(32),
        hkdfSalt: bytes(32),
        deviceSignPubkey: bytes(32),
        deviceEcdhPubkey: bytes(32),
      }),
    ).rejects.toThrow(/already exists/);
    await resetIdentity(db);
    expect(await loadIdentity(db)).toBeNull();
  });
});
