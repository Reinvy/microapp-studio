import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { WorkerHostDb, AppDbKey } from '@/db/client';
import { NodeSqliteDriver } from '@/db/node-sqlite-driver';
import {
  AppDatabase,
  checksumRecords,
  exportAppDataCsv,
  exportAppDataJson,
  validateImport,
  type AppDbRecord,
} from '@/features/appdb/appDb';

const KEY: AppDbKey = {
  workspaceSlug: 'rumah',
  appInstallId: '0190a5b2-0000-7000-8000-000000000001',
  appId: 'org.reinvy.kas',
};

/**
 * Minimal `WorkerHostDb` app-database surface backed by real SQLite, so the
 * wrapper's SQL, transaction boundary, and rollback are exercised for real.
 */
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

const RECORDS: AppDbRecord[] = [
  { key: 'total', value: { amount: 42, currency: 'IDR' }, updatedAtMs: 2 },
  { key: 'catatan', value: 'kopi pagi', updatedAtMs: 1 },
];

let appDb: AppDatabase;

beforeEach(() => {
  appDb = new AppDatabase(new TestAppClient() as unknown as WorkerHostDb, KEY);
});

afterEach(async () => {
  await appDb.close();
});

describe('app data export/import', () => {
  it('round-trips a JSON export through validateImport', async () => {
    const json = await exportAppDataJson(RECORDS);
    const restored = await validateImport(JSON.parse(json));
    expect(restored.schemaVersion).toBe(1);
    expect(restored.records).toEqual(RECORDS);
    expect(restored.checksum).toBe(await checksumRecords(RECORDS));
  });

  it('canonicalises record order in the checksum', async () => {
    const forward = await exportAppDataJson(RECORDS);
    const reversed = await exportAppDataJson([...RECORDS].reverse());
    expect(JSON.parse(reversed).records).toEqual([...RECORDS].reverse());
    expect(JSON.parse(reversed).checksum).toBe(JSON.parse(forward).checksum);
    // A reordered (but unchanged) file is still valid.
    const payload = JSON.parse(forward);
    payload.records.reverse();
    await expect(validateImport(payload)).resolves.toBeTruthy();
  });

  it('rejects a tampered record or an unsupported schema with E-DATA-002', async () => {
    const payload = JSON.parse(await exportAppDataJson(RECORDS));
    payload.records[0].value = { amount: 43, currency: 'IDR' };
    await expect(validateImport(payload)).rejects.toThrow(/E-DATA-002/);

    const future = JSON.parse(await exportAppDataJson(RECORDS));
    future.schemaVersion = 2;
    await expect(validateImport(future)).rejects.toThrow(/E-DATA-002/);

    await expect(validateImport({ schemaVersion: 1, records: RECORDS })).rejects.toThrow(/E-DATA-002/);
    await expect(validateImport(null)).rejects.toThrow(/E-DATA-002/);
  });

  it('writes the documented CSV preamble and one escaped row per record', async () => {
    const csv = await exportAppDataCsv([
      ...RECORDS,
      { key: 'quote', value: 'kata "kunci"', updatedAtMs: 3 },
    ]);
    const [preamble, header, ...rows] = csv.split('\n');
    expect(preamble).toBe(`# schemaVersion=1 checksum=${await checksumRecords([
      ...RECORDS,
      { key: 'quote', value: 'kata "kunci"', updatedAtMs: 3 },
    ])}`);
    expect(header).toBe('key,value_json,updated_at_ms');
    expect(rows).toHaveLength(3);
    // The JSON value's quotes are CSV-escaped, not dropped.
    expect(rows[2]).toMatch(/^"quote","""kata/);
    expect(rows[2]?.endsWith(',3')).toBe(true);
  });
});

describe('AppDatabase.replaceRows', () => {
  it('replaces every row in one transaction', async () => {
    await appDb.set('a', 1, 1);
    await appDb.set('b', 2, 2);
    const written = await appDb.replaceRows([{ key: 'c', value: { n: 3 }, updatedAtMs: 3 }]);
    expect(written).toBe(1);
    expect(await appDb.keys()).toEqual(['c']);
    expect(await appDb.get('c')).toEqual({ n: 3 });
    expect(await appDb.get('a')).toBeNull();
  });

  it('keeps the previous rows when a later insert fails', async () => {
    await appDb.set('a', 1, 1);
    await appDb.set('b', 2, 2);
    // JSON.stringify throws on BigInt, which makes the second insert fail after
    // the DELETE already ran; the transaction must roll that DELETE back.
    await expect(
      appDb.replaceRows([
        { key: 'c', value: 3, updatedAtMs: 3 },
        { key: 'bad', value: BigInt(10), updatedAtMs: 4 },
      ]),
    ).rejects.toThrow();
    expect(await appDb.keys()).toEqual(['a', 'b']);
    expect(await appDb.get('a')).toBe(1);
    expect(await appDb.get('b')).toBe(2);
  });
});
