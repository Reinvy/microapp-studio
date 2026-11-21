import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NodeSqliteDriver } from '../node-sqlite-driver';
import { applyMigrations } from '../migrate';
import { createWorkspace, ensureDefaultWorkspace } from '../repositories/workspaces';
import { appendDevLog, clearDevLog, listDevLog, redactForLog, redactText } from '../repositories/devLog';

const JWT = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.c2lnbmF0dXJlLWJ5dGVz';
const PEM = '-----BEGIN PRIVATE KEY-----\nMIIBVgIBADANBgkqhkiG9w0BAQEFAASCAUAwggE8AgEAAkEA\n-----END PRIVATE KEY-----';

let db: NodeSqliteDriver;
let workspaceId: string;

beforeEach(async () => {
  db = new NodeSqliteDriver();
  await applyMigrations(db);
  workspaceId = (await ensureDefaultWorkspace(db, { name: 'Rumah', nowMs: 1_000 })).id;
});

afterEach(async () => {
  await db.close();
});

describe('dev log', () => {
  it('redacts secrets and machine paths before they reach the table', async () => {
    await appendDevLog(db, {
      workspaceId,
      kind: 'error',
      level: 'error',
      code: 'E-DATA-001',
      // `appendDevLog` is typed for strings but the implementation deliberately
      // accepts any value (redacting by key before serialising); logging a whole
      // request object must not leak it.
      message: {
        request: 'POST https://api.example.com/v1/chat',
        token: 'sk-live-abcdef123456',
        passphrase: 'correct horse battery staple',
        authorization: `Bearer ${JWT}`,
        note: `jwt ${JWT}`,
        cert: PEM,
        file: '/home/reinvy/Workspace/secret.txt',
        nested: { api_key: 'AIzaSy0123456789' },
      } as unknown as string,
      nowMs: 2_000,
    });

    const [entry] = await listDevLog(db, workspaceId);
    expect(entry?.message).toContain('[redacted]');
    for (const secret of [
      'sk-live-abcdef123456',
      'correct horse battery staple',
      'Bearer ',
      JWT,
      'BEGIN PRIVATE KEY',
      '/home/reinvy',
      'AIzaSy0123456789',
    ]) {
      expect(entry?.message ?? '').not.toContain(secret);
    }
    // Non-sensitive context survives so the row is still useful.
    expect(entry?.message).toContain('api.example.com');
    expect(entry?.message).toContain('POST');
    expect(entry?.code).toBe('E-DATA-001');

    // The redactor is exported for the browser panels and follows the same rules.
    expect(redactText(JWT)).toBe('[redacted]');
    expect(redactForLog({ Cookie: 'session=abc' })).toEqual({ Cookie: '[redacted]' });
  });

  it('filters by kind and level, honours the limit, and clears one or all kinds', async () => {
    await appendDevLog(db, { workspaceId, kind: 'bridge', level: 'debug', message: 'storage.get', nowMs: 1_000 });
    await appendDevLog(db, { workspaceId, kind: 'bridge', level: 'info', message: 'storage.set', nowMs: 2_000 });
    await appendDevLog(db, { workspaceId, kind: 'error', level: 'error', message: 'E-DATA-001 boom', nowMs: 3_000 });
    await appendDevLog(db, { workspaceId, kind: 'flag', level: 'warn', message: 'devtools on', nowMs: 4_000 });

    expect((await listDevLog(db, workspaceId, { kind: 'bridge' })).map((entry) => entry.message)).toEqual([
      'storage.set',
      'storage.get',
    ]);
    expect(await listDevLog(db, workspaceId, { kind: 'bridge', limit: 1 })).toHaveLength(1);
    expect((await listDevLog(db, workspaceId, { kind: 'bridge', limit: 1 }))[0]?.message).toBe('storage.set');
    expect(await listDevLog(db, workspaceId, { level: 'error' })).toHaveLength(1);
    expect((await listDevLog(db, workspaceId, { limit: 3 })).map((entry) => entry.kind)).toEqual([
      'flag',
      'error',
      'bridge',
    ]);

    const other = await createWorkspace(db, { name: 'Kedua', nowMs: 5_000 });
    expect(await listDevLog(db, other.id)).toHaveLength(0);

    await clearDevLog(db, workspaceId, 'bridge');
    expect(await listDevLog(db, workspaceId, { kind: 'bridge' })).toHaveLength(0);
    expect(await listDevLog(db, workspaceId)).toHaveLength(2);
    await clearDevLog(db, workspaceId);
    expect(await listDevLog(db, workspaceId)).toHaveLength(0);
  });
});
