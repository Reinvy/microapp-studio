import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import type { WorkerHostDb, AppDbKey } from '@/db/client';
import { NodeSqliteDriver } from '@/db/node-sqlite-driver';
import { applyMigrations } from '@/db/migrate';
import { ensureDefaultWorkspace, type Workspace } from '@/db/repositories/workspaces';
import { installApp } from '@/db/repositories/apps';
import { appendAudit } from '@/db/repositories/audit';
import { AppDatabase } from '@/features/appdb/appDb';
import type { OpfsFile } from '@/features/storage/opfs';
import {
  BACKUP_HEADER,
  BACKUP_FORMAT_VERSION,
  MIN_PASSPHRASE_LENGTH,
  createBackup,
  previewBackup,
  restoreBackup,
  type BackupCrypto,
  type BackupSectionInput,
  type BackupStorage,
  type OpenedBackup,
} from '../backupService';

const PASSPHRASE = 'correct horse battery staple';

/** Deterministic stand-in for the Rust container: same service seam, no wasm. */
const fakeCrypto: BackupCrypto = {
  async sealV2(passphrase, sections, workspace, createdAtMs) {
    if ([...passphrase].length < MIN_PASSPHRASE_LENGTH) {
      throw new Error('E-SET-001 passphrase too short');
    }
    const checksums = sections.map((section) => ({
      name: section.name,
      sha256: createHash('sha256').update(section.plaintextBase64).digest('hex'),
    }));
    const body = new TextEncoder().encode(
      JSON.stringify({ passphrase, workspace, createdAtMs, sections, checksums }),
    );
    const out = new Uint8Array(10 + body.length);
    out.set(new TextEncoder().encode(BACKUP_HEADER), 0);
    out[9] = BACKUP_FORMAT_VERSION;
    out.set(body, 10);
    return out;
  },
  async openV2(passphrase, bytes) {
    if (bytes.byteLength < 10) throw new Error('E-BACKUP-002 truncated');
    if (new TextDecoder().decode(bytes.slice(0, 8)) !== BACKUP_HEADER) {
      throw new Error('E-BACKUP-002 wrong magic');
    }
    if ((bytes[8]! << 8 | bytes[9]!) !== BACKUP_FORMAT_VERSION) {
      throw new Error('E-BACKUP-002 unsupported version');
    }
    let payload: {
      passphrase: string;
      workspace: unknown;
      createdAtMs: number;
      sections: BackupSectionInput[];
      checksums: Array<{ name: string; sha256: string }>;
    };
    try {
      payload = JSON.parse(new TextDecoder().decode(bytes.slice(10)));
    } catch {
      throw new Error('E-BACKUP-002 corrupt body');
    }
    if (payload.passphrase !== passphrase) throw new Error('E-BACKUP-001 wrong passphrase');
    for (const expected of payload.checksums) {
      const section = payload.sections.find((candidate) => candidate.name === expected.name);
      if (!section) throw new Error('E-BACKUP-002 missing section');
      const actual = createHash('sha256').update(section.plaintextBase64).digest('hex');
      if (actual !== expected.sha256) throw new Error('E-BACKUP-002 checksum mismatch');
    }
    return {
      manifest: {
        formatVersion: BACKUP_FORMAT_VERSION,
        createdAt: payload.createdAtMs,
        workspace: payload.workspace,
        sections: payload.checksums,
      },
      sections: payload.sections,
      createdAt: payload.createdAtMs,
      workspace: payload.workspace,
    } satisfies OpenedBackup;
  },
};

class MemoryStorage implements BackupStorage {
  readonly files = new Map<string, Uint8Array>();

  async readTree(path: string): Promise<OpfsFile[]> {
    const prefix = `${path.replace(/\/$/, '')}/`;
    return [...this.files.entries()]
      .filter(([candidate]) => candidate.startsWith(prefix))
      .map(([candidate, bytes]) => ({ path: candidate, base64: Buffer.from(bytes).toString('base64') }));
  }

  async writeFile(path: string, bytes: Uint8Array): Promise<void> {
    this.files.set(path, bytes);
  }

  async deleteTree(path: string): Promise<void> {
    const prefix = `${path.replace(/\/$/, '')}/`;
    for (const key of [...this.files.keys()]) {
      if (key === path || key.startsWith(prefix)) this.files.delete(key);
    }
  }
}

class TestAppClient {
  private readonly dbs = new Map<string, NodeSqliteDriver>();

  async openApp(key: AppDbKey): Promise<void> {
    const path = `${key.workspaceSlug}/${key.appId}`;
    if (this.dbs.has(path)) return;
    const db = new NodeSqliteDriver();
    await db.exec(
      `CREATE TABLE IF NOT EXISTS kv (
         key TEXT PRIMARY KEY,
         value_json TEXT NOT NULL,
         updated_at_ms INTEGER NOT NULL
       )`,
    );
    this.dbs.set(path, db);
  }

  private require(key: AppDbKey): NodeSqliteDriver {
    const db = this.dbs.get(`${key.workspaceSlug}/${key.appId}`);
    if (!db) throw new Error('app database was not opened');
    return db;
  }

  async appSelect<T = Record<string, unknown>>(
    key: AppDbKey,
    sql: string,
    params?: readonly (string | number | bigint | null | Uint8Array)[],
  ): Promise<T[]> {
    return this.require(key).select<T>(sql, params);
  }

  async appExec(
    key: AppDbKey,
    sql: string,
    params?: readonly (string | number | bigint | null | Uint8Array)[],
  ): Promise<number> {
    return this.require(key).exec(sql, params);
  }

  async appTransaction<T>(key: AppDbKey, fn: () => Promise<T>): Promise<T> {
    return this.require(key).transaction(() => fn());
  }

  async closeApp(key: AppDbKey): Promise<void> {
    const path = `${key.workspaceSlug}/${key.appId}`;
    const db = this.dbs.get(path);
    if (!db) return;
    await db.close();
    this.dbs.delete(path);
  }
}

async function seeded(): Promise<{ db: NodeSqliteDriver; workspace: Workspace; appId: string }> {
  const db = new NodeSqliteDriver();
  await applyMigrations(db);
  const workspace = await ensureDefaultWorkspace(db, { name: 'Rumah', locale: 'id-ID', nowMs: 1_000 });
  const app = await installApp(db, {
    workspaceId: workspace.id,
    appId: 'org.reinvy.kas',
    version: '1.3.0',
    manifestJson: JSON.stringify({ id: 'org.reinvy.kas', name: 'KasLokal', version: '1.3.0' }),
    contentHash: new Uint8Array(32).fill(2),
    signature: new Uint8Array(64).fill(3),
    authorKeyFingerprint: 'f'.repeat(64),
    installSource: 'local',
    bundlePath: 'apps/org.reinvy.kas/1.3.0',
    dbRelativePath: 'workspaces/rumah/apps/org.reinvy.kas.db',
    schemaVersion: 1,
    nowMs: 2_000,
  });
  await appendAudit(
    db,
    { actor: 'user', action: 'app.install', target: 'org.reinvy.kas', createdAtMs: 3_000 },
    async (prev, seq, payload) => createHash('sha256').update(`${prev}:${seq}:${payload}`).digest('hex'),
  );
  await db.exec(
    `INSERT INTO local_identity (
       id, site_id, identity_pubkey, key_agreement_pubkey, hkdf_salt,
       device_sign_pubkey, device_ecdh_pubkey, created_at_ms
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'identity-backup',
      new Uint8Array(16).fill(1),
      new Uint8Array(32).fill(2),
      new Uint8Array(32).fill(3),
      new Uint8Array(32).fill(4),
      new Uint8Array(32).fill(5),
      new Uint8Array(32).fill(6),
      1_000,
    ],
  );
  await db.exec(
    `INSERT INTO settings (key, value_json, updated_at_ms) VALUES ('greeting', ?, 4)`,
    ['"backup"'],
  );
  return { db, workspace, appId: app.id };
}

async function fresh(): Promise<NodeSqliteDriver> {
  const db = new NodeSqliteDriver();
  await applyMigrations(db);
  return db;
}

function workspaceInput(workspace: Workspace) {
  return { id: workspace.id, name: workspace.name, slug: workspace.slug, locale: workspace.locale };
}

function tamper(bytes: Uint8Array): Uint8Array {
  const copy = bytes.slice();
  copy[copy.length - 1] = (copy[copy.length - 1] ?? 0) ^ 0xff;
  return copy;
}

describe('backup v2 service', () => {
  it('round-trips host rows and bundles, and preview counts without writing', async () => {
    const source = await seeded();
    const storage = new MemoryStorage();
    await storage.writeFile('apps/org.reinvy.kas/1.3.0/bundle/index.js', new TextEncoder().encode('mount'));
    const backup = await createBackup({
      db: source.db,
      workspace: workspaceInput(source.workspace),
      apps: [],
      passphrase: PASSPHRASE,
      identitySecret: 'abandon ability able',
      crypto: fakeCrypto,
      storage,
      nowMs: 1_700_000_000_000,
    });

    expect(new TextDecoder().decode(backup.slice(0, 8))).toBe(BACKUP_HEADER);
    expect((backup[8]! << 8) | backup[9]!).toBe(2);

    const target = await fresh();
    const before = await target.select<{ count: number }>('SELECT COUNT(*) AS count FROM installed_microapps');
    const preview = await previewBackup(backup, PASSPHRASE, fakeCrypto);
    expect(preview.createdAt).toBe(1_700_000_000_000);
    expect(preview.workspace).toBe('Rumah');
    expect(preview.sections.find((section) => section.name === 'host')?.rows).toBeGreaterThan(0);
    expect(preview.sections.find((section) => section.name === 'bundles')?.rows).toBe(1);
    expect(preview.sections.find((section) => section.name === 'identity')?.rows).toBe(1);
    const after = await target.select<{ count: number }>('SELECT COUNT(*) AS count FROM installed_microapps');
    expect(after).toEqual(before);

    const targetStorage = new MemoryStorage();
    const saved: string[] = [];
    const result = await restoreBackup({
      db: target,
      bytes: backup,
      passphrase: PASSPHRASE,
      mode: 'replace',
      workspace: workspaceInput(source.workspace),
      appDbs: async () => {
        throw new Error('no app sections expected');
      },
      crypto: fakeCrypto,
      storage: targetStorage,
      saveIdentitySecret: async (mnemonic) => {
        saved.push(mnemonic);
      },
    });
    expect(result.restored.find((section) => section.name === 'host')?.rows).toBeGreaterThan(0);
    expect(result.mnemonicMissing).toBe(false);
    expect(saved).toEqual(['abandon ability able']);

    const apps = await target.select<{ app_id: string }>('SELECT app_id FROM installed_microapps');
    expect(apps.map((row) => row.app_id)).toEqual(['org.reinvy.kas']);
    expect(await target.select<{ id: string }>('SELECT id FROM local_identity')).toEqual([
      { id: 'identity-backup' },
    ]);
    expect(
      await target.select<{ value_json: string }>(`SELECT value_json FROM settings WHERE key = 'greeting'`),
    ).toEqual([{ value_json: '"backup"' }]);
    expect(targetStorage.files.get('apps/org.reinvy.kas/1.3.0/bundle/index.js')).toBeTruthy();
    expect([...targetStorage.files.keys()].some((path) => path.startsWith('restore/'))).toBe(false);
    await source.db.close();
    await target.close();
  });

  it('merge preserves a conflicting local row and replace drops it', async () => {
    const source = await seeded();
    const backup = await createBackup({
      db: source.db,
      workspace: workspaceInput(source.workspace),
      apps: [],
      passphrase: PASSPHRASE,
      identitySecret: null,
      crypto: fakeCrypto,
      storage: new MemoryStorage(),
    });

    const merged = await fresh();
    await ensureDefaultWorkspace(merged, { name: 'Rumah', locale: 'id-ID', nowMs: 1_000 });
    await merged.exec(`INSERT INTO settings (key, value_json, updated_at_ms) VALUES ('greeting', '"local"', 9)`);
    const mergedResult = await restoreBackup({
      db: merged,
      bytes: backup,
      passphrase: PASSPHRASE,
      mode: 'merge',
      workspace: workspaceInput(source.workspace),
      appDbs: async () => {
        throw new Error('no app sections expected');
      },
      crypto: fakeCrypto,
      storage: new MemoryStorage(),
      saveIdentitySecret: async () => undefined,
    });
    expect(mergedResult.mnemonicMissing).toBe(true);
    expect(
      await merged.select<{ value_json: string }>(`SELECT value_json FROM settings WHERE key = 'greeting'`),
    ).toEqual([{ value_json: '"local"' }]);
    expect(
      await merged.select<{ count: number }>('SELECT COUNT(*) AS count FROM installed_microapps'),
    ).toEqual([{ count: 1 }]);

    const replaced = await fresh();
    await ensureDefaultWorkspace(replaced, { name: 'Rumah', locale: 'id-ID', nowMs: 1_000 });
    await replaced.exec(`INSERT INTO settings (key, value_json, updated_at_ms) VALUES ('greeting', '"local"', 9)`);
    await restoreBackup({
      db: replaced,
      bytes: backup,
      passphrase: PASSPHRASE,
      mode: 'replace',
      workspace: workspaceInput(source.workspace),
      appDbs: async () => {
        throw new Error('no app sections expected');
      },
      crypto: fakeCrypto,
      storage: new MemoryStorage(),
      saveIdentitySecret: async () => undefined,
    });
    expect(
      await replaced.select<{ value_json: string }>(`SELECT value_json FROM settings WHERE key = 'greeting'`),
    ).toEqual([{ value_json: '"backup"' }]);
    await source.db.close();
    await merged.close();
    await replaced.close();
  });

  it('applies app data sections in merge and replace modes', async () => {
    const source = await seeded();
    const sourceClient = new TestAppClient();
    const key: AppDbKey = {
      workspaceSlug: source.workspace.slug,
      appInstallId: source.appId,
      appId: 'org.reinvy.kas',
    };
    const sourceDb = new AppDatabase(sourceClient as unknown as WorkerHostDb, key);
    await sourceDb.set('total', 42, 1);
    await sourceDb.set('note', 'backup', 2);

    const backup = await createBackup({
      db: source.db,
      workspace: workspaceInput(source.workspace),
      apps: [{ id: source.appId, appId: 'org.reinvy.kas' }],
      passphrase: PASSPHRASE,
      identitySecret: null,
      crypto: fakeCrypto,
      storage: new MemoryStorage(),
      appDbs: async () => sourceDb,
    });
    const preview = await previewBackup(backup, PASSPHRASE, fakeCrypto);
    expect(preview.sections.find((section) => section.name === `app:${source.appId}`)?.rows).toBe(2);

    const targetClient = new TestAppClient();
    const targetDb = new AppDatabase(targetClient as unknown as WorkerHostDb, key);
    await targetDb.set('total', 7, 3);

    const target = await fresh();
    await restoreBackup({
      db: target,
      bytes: backup,
      passphrase: PASSPHRASE,
      mode: 'merge',
      workspace: workspaceInput(source.workspace),
      appDbs: async () => targetDb,
      crypto: fakeCrypto,
      storage: new MemoryStorage(),
      saveIdentitySecret: async () => undefined,
    });
    expect(await targetDb.get('total')).toBe(7);
    expect(await targetDb.get('note')).toBe('backup');

    const replaceClient = new TestAppClient();
    const replaceDb = new AppDatabase(replaceClient as unknown as WorkerHostDb, key);
    await replaceDb.set('total', 7, 4);
    const replaceTarget = await fresh();
    await restoreBackup({
      db: replaceTarget,
      bytes: backup,
      passphrase: PASSPHRASE,
      mode: 'replace',
      workspace: workspaceInput(source.workspace),
      appDbs: async () => replaceDb,
      crypto: fakeCrypto,
      storage: new MemoryStorage(),
      saveIdentitySecret: async () => undefined,
    });
    expect(await replaceDb.get('total')).toBe(42);
    expect(await replaceDb.keys()).toEqual(['note', 'total']);

    await sourceDb.close();
    await targetDb.close();
    await replaceDb.close();
    await source.db.close();
    await target.close();
    await replaceTarget.close();
  });

  it('rejects a wrong passphrase with E-BACKUP-001', async () => {
    const source = await seeded();
    const backup = await createBackup({
      db: source.db,
      workspace: workspaceInput(source.workspace),
      apps: [],
      passphrase: PASSPHRASE,
      identitySecret: null,
      crypto: fakeCrypto,
      storage: new MemoryStorage(),
    });
    await expect(previewBackup(backup, 'wrong passphrase here', fakeCrypto)).rejects.toThrow(/E-BACKUP-001/);
    await source.db.close();
  });

  it('rejects a tampered section with E-BACKUP-002 and leaves the database untouched', async () => {
    const source = await seeded();
    const backup = await createBackup({
      db: source.db,
      workspace: workspaceInput(source.workspace),
      apps: [],
      passphrase: PASSPHRASE,
      identitySecret: null,
      crypto: fakeCrypto,
      storage: new MemoryStorage(),
    });
    const target = await fresh();
    await ensureDefaultWorkspace(target, { name: 'Lokal', locale: 'id-ID', nowMs: 5_000 });
    const before = await target.select<{ name: string }>('SELECT name FROM workspaces');
    const storage = new MemoryStorage();

    await expect(
      restoreBackup({
        db: target,
        bytes: tamper(backup),
        passphrase: PASSPHRASE,
        mode: 'replace',
        workspace: workspaceInput(source.workspace),
        appDbs: async () => {
          throw new Error('no app sections expected');
        },
        crypto: fakeCrypto,
        storage,
        saveIdentitySecret: async () => undefined,
      }),
    ).rejects.toThrow(/E-BACKUP-002/);

    expect(await target.select<{ name: string }>('SELECT name FROM workspaces')).toEqual(before);
    expect(storage.files.size).toBe(0);
    await source.db.close();
    await target.close();
  });

  it('rejects a v1 header and weak passphrases', async () => {
    const v1 = new Uint8Array(80);
    v1.set(new TextEncoder().encode(BACKUP_HEADER), 0);
    v1[8] = 0;
    v1[9] = 1;
    await expect(previewBackup(v1, PASSPHRASE, fakeCrypto)).rejects.toThrow(/E-BACKUP-002/);

    const source = await seeded();
    await expect(
      createBackup({
        db: source.db,
        workspace: workspaceInput(source.workspace),
        apps: [],
        passphrase: 'short',
        identitySecret: null,
        crypto: fakeCrypto,
        storage: new MemoryStorage(),
      }),
    ).rejects.toThrow(/E-SET-001/);
    await expect(
      restoreBackup({
        db: source.db,
        bytes: v1,
        passphrase: 'short',
        mode: 'merge',
        workspace: workspaceInput(source.workspace),
        appDbs: async () => {
          throw new Error('no app sections expected');
        },
        crypto: fakeCrypto,
      }),
    ).rejects.toThrow(/E-SET-001/);
    await source.db.close();
  });
});
