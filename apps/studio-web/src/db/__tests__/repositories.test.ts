import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NodeSqliteDriver } from '../node-sqlite-driver';
import { applyMigrations, rollbackLastMigration } from '../migrate';
import { HOST_MIGRATIONS } from '../migrations/index.generated';
import { isUuidv7, uuidv7 } from '../ids';
import { createIdentity, loadIdentity, resetIdentity, setRecoveryHint } from '../repositories/identity';
import {
  ensureDefaultWorkspace,
  listWorkspaces,
  loadWorkspaceState,
  saveWorkspaceState,
  renameWorkspace,
} from '../repositories/workspaces';
import { appPolicy, getApp, installApp, listApps, setOfflineCage, startRuntimeSession } from '../repositories/apps';
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
  addDockItem,
  addWidget,
  createFolder,
  listDock,
  listFolders,
  listWidgets,
  placeApp,
} from '../repositories/launcher';
import {
  createStudioDraft,
  getSetting,
  indexRecord,
  listPins,
  listStudioDrafts,
  pinStorage,
  rebuildSearchIndex,
  resolveLegacyMapping,
  recordLegacyMapping,
  search,
  setSetting,
  startMigrationReport,
  finishMigrationReport,
} from '../repositories/search';

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
    expect(first.applied).toEqual([1, 2]);
    const second = await applyMigrations(fresh);
    expect(second.applied).toEqual([]);
    expect(second.alreadyApplied).toEqual([1, 2]);

    const rolledBack = await rollbackLastMigration(fresh);
    expect(rolledBack).toBe(2);
    const remaining = await fresh.select<{ name: string }>("SELECT name FROM sqlite_master WHERE name = 'search_index'");
    expect(remaining).toHaveLength(0);
    const tables = await fresh.select<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'installed_microapps'",
    );
    expect(tables).toHaveLength(1);
    await fresh.close();
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

describe('installed apps', () => {
  it('installs an app with database, policy, and placement rows', async () => {
    const { workspace, app } = await seed(db);
    expect(app.appId).toBe('org.reinvy.kas');
    expect(app.state).toBe('installed');
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

  it('keeps workspaces isolated', async () => {
    const { workspace, app } = await seed(db);
    const other = await ensureDefaultWorkspace(db, { name: 'Second' });
    // ensureDefaultWorkspace returns the existing default; create a second one manually.
    await db.exec(
      `INSERT INTO workspaces (id, name, slug, theme, locale, is_default, created_at_ms, updated_at_ms)
       VALUES ('ws-2', 'Kedua', 'kedua', 'studio', 'id-ID', 0, 1, 1)`,
    );
    expect(other.id).toBe(workspace.id);
    expect(await getApp(db, 'ws-2', 'org.reinvy.kas')).toBeNull();
    expect(await listApps(db, 'ws-2')).toHaveLength(0);
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
    await expect(
      saveKeyWrap(db, { ...base, memoryKib: 1024, nowMs: 3 }),
    ).rejects.toThrow(/argon2id/);
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

describe('launcher', () => {
  it('enforces folder depth, dock size, and widget refresh floor', async () => {
    const { workspace, app } = await seed(db);
    const level1 = await createFolder(db, { workspaceId: workspace.id, name: 'Satu' });
    const level2 = await createFolder(db, { workspaceId: workspace.id, name: 'Dua', parentId: level1.id });
    const level3 = await createFolder(db, { workspaceId: workspace.id, name: 'Tiga', parentId: level2.id });
    expect(level3.depth).toBe(3);
    await expect(
      createFolder(db, { workspaceId: workspace.id, name: 'Empat', parentId: level3.id }),
    ).rejects.toThrow(/three levels/);
    expect(await listFolders(db, workspace.id)).toHaveLength(3);

    await placeApp(db, { workspaceId: workspace.id, appInstallId: app.id, sortOrder: 0, pinned: true });
    await addDockItem(db, { workspaceId: workspace.id, appInstallId: app.id });
    expect(await listDock(db, workspace.id)).toEqual([app.id]);

    await addWidget(db, { workspaceId: workspace.id, appInstallId: app.id, kind: 'balance', refreshIntervalMs: 5_000 });
    await expect(
      addWidget(db, { workspaceId: workspace.id, appInstallId: app.id, kind: 'fast', refreshIntervalMs: 1_000 }),
    ).rejects.toThrow(/5 seconds/);
    expect(await listWidgets(db, workspace.id)).toHaveLength(1);
  });
});

describe('search, pins, settings, studio, migration ledger', () => {
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

  it('creates Studio drafts and records the Phase 0 migration ledger', async () => {
    const { workspace } = await seed(db);
    const draft = await createStudioDraft(db, {
      workspaceId: workspace.id,
      name: 'Kas draft',
      sourceLegacyId: 'legacy-app-1',
    });
    expect(draft.status).toBe('draft');
    expect(await listStudioDrafts(db, workspace.id)).toHaveLength(1);
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
