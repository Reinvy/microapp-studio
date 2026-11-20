import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { NodeSqliteDriver } from '@/db/node-sqlite-driver';
import { applyMigrations } from '@/db/migrate';
import { ensureDefaultWorkspace } from '@/db/repositories/workspaces';
import { installApp } from '@/db/repositories/apps';
import { appendAudit } from '@/db/repositories/audit';
import {
  createBackup,
  readBackup,
  restoreBackup,
  BACKUP_HEADER,
  type BackupCrypto,
} from '../backupService';

/** Deterministic JCS-ish canonicalizer + AES-GCM, used only as a test seam. */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, nested]) => nested !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([key, nested]) => `${JSON.stringify(key)}:${canonical(nested)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

const testCrypto: BackupCrypto = {
  async jcsSha256(json) {
    return createHash('sha256').update(canonical(JSON.parse(json))).digest('hex');
  },
  async seal(passphrase, plaintext) {
    const key = createHash('sha256').update(`test-kek:${passphrase}`).digest();
    const iv = createHash('sha256').update(`iv:${plaintext.byteLength}`).digest().subarray(0, 12);
    const cipher = await crypto.subtle.importKey('raw', key, 'AES-GCM', false, ['encrypt']);
    const sealed = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv as unknown as BufferSource },
      cipher,
      plaintext as unknown as BufferSource,
    );
    return new Uint8Array(sealed);
  },
  async open(passphrase, blob) {
    const key = createHash('sha256').update(`test-kek:${passphrase}`).digest();
    const iv = createHash('sha256').update(`iv:${blob.byteLength - 16}`).digest().subarray(0, 12);
    const cipher = await crypto.subtle.importKey('raw', key, 'AES-GCM', false, ['decrypt']);
    const opened = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as unknown as BufferSource },
      cipher,
      blob as unknown as BufferSource,
    );
    return new Uint8Array(opened);
  },
};

const bytes = (length: number, fill = 1): Uint8Array => new Uint8Array(length).fill(fill);

async function seeded(): Promise<{ db: NodeSqliteDriver; workspaceId: string; appId: string }> {
  const db = new NodeSqliteDriver();
  await applyMigrations(db);
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
  await appendAudit(
    db,
    { actor: 'user', action: 'app.install', target: 'org.reinvy.kas', createdAtMs: 3_000 },
    async (prev, seq, payload) => createHash('sha256').update(`${prev}:${seq}:${payload}`).digest('hex'),
  );
  return { db, workspaceId: workspace.id, appId: app.id };
}

describe('encrypted backup', () => {
  it('exports a container and restores identical row counts', async () => {
    const source = await seeded();
    const backup = await createBackup({
      db: source.db,
      crypto: testCrypto,
      passphrase: 'correct horse battery',
      workspace: { id: source.workspaceId, name: 'Rumah', slug: 'rumah', locale: 'id-ID' },
      appDbs: { 'workspaces/rumah/apps/org.reinvy.kas.db': 'AAEC' },
    });
    expect(new TextDecoder().decode(backup.slice(0, 8))).toBe(BACKUP_HEADER);
    const document = await readBackup({ bytes: backup, crypto: testCrypto, passphrase: 'correct horse battery' });
    expect(document.manifests[0]?.appId).toBe('org.reinvy.kas');
    expect(document.appDbs['workspaces/rumah/apps/org.reinvy.kas.db']).toBe('AAEC');

    const target = new NodeSqliteDriver();
    await applyMigrations(target);
    const summary = await restoreBackup(target, document);
    expect(summary.rows).toBeGreaterThan(0);

    const restoredApps = await target.select<{ app_id: string }>('SELECT app_id FROM installed_microapps');
    expect(restoredApps.map((row) => row.app_id)).toEqual(['org.reinvy.kas']);
    const restoredWorkspace = await target.select<{ name: string }>('SELECT name FROM workspaces');
    expect(restoredWorkspace[0]?.name).toBe('Rumah');
    const auditRows = await target.select<{ action: string }>('SELECT action FROM audit_log_chain ORDER BY seq_id');
    expect(auditRows[0]?.action).toBe('app.install');
    await source.db.close();
    await target.close();
  });

  it('rejects a wrong passphrase and a tampered section', async () => {
    const source = await seeded();
    const backup = await createBackup({
      db: source.db,
      crypto: testCrypto,
      passphrase: 'correct horse battery',
      workspace: { id: source.workspaceId, name: 'Rumah', slug: 'rumah', locale: 'id-ID' },
      appDbs: {},
    });
    await expect(
      readBackup({ bytes: backup, crypto: testCrypto, passphrase: 'wrong passphrase' }),
    ).rejects.toThrow(/E-SYNC-004/);

    // Tamper with the ciphertext: decryption must fail closed.
    const tampered = backup.slice();
    tampered[tampered.length - 1] = (tampered[tampered.length - 1] ?? 0) ^ 0xff;
    await expect(
      readBackup({ bytes: tampered, crypto: testCrypto, passphrase: 'correct horse battery' }),
    ).rejects.toThrow(/E-SYNC-004/);
    await source.db.close();
  });

  it('rejects checksum mismatch when a section is edited after sealing', async () => {
    const source = await seeded();
    const backup = await createBackup({
      db: source.db,
      crypto: testCrypto,
      passphrase: 'correct horse battery',
      workspace: { id: source.workspaceId, name: 'Rumah', slug: 'rumah', locale: 'id-ID' },
      appDbs: {},
    });
    const document = await readBackup({ bytes: backup, crypto: testCrypto, passphrase: 'correct horse battery' });
    document.hostDb.settings = [{ key: 'injected', value_json: '"x"', updated_at_ms: 1 }];
    const resealed = await testCrypto.seal('correct horse battery', new TextEncoder().encode(JSON.stringify(document)));
    const forged = new Uint8Array(10 + resealed.byteLength);
    forged.set(new TextEncoder().encode(BACKUP_HEADER), 0);
    forged[9] = 1;
    forged.set(resealed, 10);
    await expect(
      readBackup({ bytes: forged, crypto: testCrypto, passphrase: 'correct horse battery' }),
    ).rejects.toThrow(/checksum mismatch/);
    await source.db.close();
  });

  it('rejects backups with a weak passphrase', async () => {
    const source = await seeded();
    await expect(
      createBackup({
        db: source.db,
        crypto: testCrypto,
        passphrase: 'short',
        workspace: { id: source.workspaceId, name: 'Rumah', slug: 'rumah', locale: 'id-ID' },
      }),
    ).rejects.toThrow(/at least 8/);
    await source.db.close();
  });
});
