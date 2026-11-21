/**
 * Main-thread wrapper for per-app key/value databases.
 *
 * Everything goes through `WorkerHostDb`: the worker owns the SQLite handles, so
 * this module only speaks the `kv` table and the export/import envelope. App
 * data never touches the host tables, and every statement is guarded by the
 * Rust core inside the worker.
 */

import type { WorkerHostDb, AppDbKey } from '@/db/client';
import { sha256Hex } from '@/lib/bytes';

export interface AppDbRecord {
  key: string;
  value: unknown;
  updatedAtMs: number;
}

export interface AppDataExport {
  schemaVersion: 1;
  checksum: string;
  records: AppDbRecord[];
}

export const APP_DATA_SCHEMA_VERSION = 1;

/** Canonical, key-sorted JSON used for the export checksum. */
export function canonicalRecordsJson(records: AppDbRecord[]): string {
  const sorted = [...records]
    .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
    .map((record) => ({ key: record.key, value: record.value, updatedAtMs: record.updatedAtMs }));
  return JSON.stringify(sorted);
}

export async function checksumRecords(records: AppDbRecord[]): Promise<string> {
  return sha256Hex(new TextEncoder().encode(canonicalRecordsJson(records)));
}

export class AppDatabase {
  private readonly client: WorkerHostDb;
  private readonly key: AppDbKey;
  private opened = false;

  constructor(client: WorkerHostDb, key: AppDbKey) {
    this.client = client;
    this.key = key;
  }

  get identity(): AppDbKey {
    return this.key;
  }

  async open(): Promise<void> {
    if (this.opened) return;
    await this.client.openApp(this.key);
    this.opened = true;
  }

  private async ready(): Promise<void> {
    await this.open();
  }

  async get(key: string): Promise<unknown> {
    const rows = await this.getMany([key]);
    return rows.length > 0 ? rows[0].value : null;
  }

  async getMany(keys: string[]): Promise<AppDbRecord[]> {
    if (keys.length === 0) return [];
    await this.ready();
    const placeholders = keys.map(() => '?').join(', ');
    const rows = await this.client.appSelect<{ key: string; value_json: string; updated_at_ms: number }>(
      this.key,
      `SELECT key, value_json, updated_at_ms FROM kv WHERE key IN (${placeholders})`,
      keys,
    );
    return rows.map((row) => ({
      key: row.key,
      value: parseJson(row.value_json),
      updatedAtMs: Number(row.updated_at_ms),
    }));
  }

  async set(key: string, value: unknown, nowMs = Date.now()): Promise<void> {
    await this.ready();
    await this.client.appExec(
      this.key,
      `INSERT INTO kv (key, value_json, updated_at_ms) VALUES (?, ?, ?)
       ON CONFLICT (key) DO UPDATE SET value_json = excluded.value_json, updated_at_ms = excluded.updated_at_ms`,
      [key, JSON.stringify(value ?? null), nowMs],
    );
  }

  async remove(key: string): Promise<void> {
    await this.ready();
    await this.client.appExec(this.key, 'DELETE FROM kv WHERE key = ?', [key]);
  }

  async keys(): Promise<string[]> {
    await this.ready();
    const rows = await this.client.appSelect<{ key: string }>(this.key, 'SELECT key FROM kv ORDER BY key');
    return rows.map((row) => row.key);
  }

  async allRows(): Promise<AppDbRecord[]> {
    await this.ready();
    const rows = await this.client.appSelect<{ key: string; value_json: string; updated_at_ms: number }>(
      this.key,
      'SELECT key, value_json, updated_at_ms FROM kv ORDER BY key',
    );
    return rows.map((row) => ({
      key: row.key,
      value: parseJson(row.value_json),
      updatedAtMs: Number(row.updated_at_ms),
    }));
  }

  /** Insert only missing keys in one transaction (backup merge mode). */
  async mergeRows(records: AppDbRecord[]): Promise<number> {
    await this.ready();
    return this.client.appTransaction(this.key, async () => {
      let written = 0;
      for (const record of records) {
        written += await this.client.appExec(
          this.key,
          `INSERT OR IGNORE INTO kv (key, value_json, updated_at_ms) VALUES (?, ?, ?)`,
          [record.key, JSON.stringify(record.value ?? null), record.updatedAtMs],
        );
      }
      return written;
    });
  }

  /** Consistent SQLite export for restore rollback; `null` without worker support. */
  async snapshot(): Promise<Uint8Array | null> {
    await this.ready();
    const client = this.client as WorkerHostDb & { appSnapshot?: (key: AppDbKey) => Promise<Uint8Array> };
    if (typeof client.appSnapshot !== 'function') return null;
    return client.appSnapshot(this.key);
  }

  /** Replace every row in one transaction; a failure leaves the DB untouched. */
  async replaceRows(records: AppDbRecord[]): Promise<number> {
    await this.ready();
    return this.client.appTransaction(this.key, async () => {
      await this.client.appExec(this.key, 'DELETE FROM kv');
      let written = 0;
      for (const record of records) {
        await this.client.appExec(
          this.key,
          'INSERT INTO kv (key, value_json, updated_at_ms) VALUES (?, ?, ?)',
          [record.key, JSON.stringify(record.value ?? null), record.updatedAtMs],
        );
        written += 1;
      }
      return written;
    });
  }

  async close(): Promise<void> {
    if (!this.opened) return;
    await this.client.closeApp(this.key);
    this.opened = false;
  }
}

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

/**
 * Validate an import payload. Only the shipped export format is accepted; the
 * checksum must match the canonical records JSON exactly.
 */
export async function validateImport(input: unknown): Promise<AppDataExport> {
  if (!input || typeof input !== 'object') throw new Error('E-DATA-002 invalid app data file');
  const record = input as Partial<AppDataExport>;
  if (record.schemaVersion !== APP_DATA_SCHEMA_VERSION) {
    throw new Error('E-DATA-002 unsupported app data schema version');
  }
  if (typeof record.checksum !== 'string' || !Array.isArray(record.records)) {
    throw new Error('E-DATA-002 app data file is missing records or checksum');
  }
  const records: AppDbRecord[] = [];
  for (const entry of record.records) {
    if (!entry || typeof entry !== 'object') throw new Error('E-DATA-002 invalid app data record');
    const { key, value, updatedAtMs } = entry as Partial<AppDbRecord>;
    if (typeof key !== 'string' || key.length === 0) throw new Error('E-DATA-002 app data record needs a key');
    records.push({
      key,
      value,
      updatedAtMs: typeof updatedAtMs === 'number' && Number.isFinite(updatedAtMs) ? updatedAtMs : Date.now(),
    });
  }
  const expected = await checksumRecords(records);
  if (expected !== record.checksum) throw new Error('E-DATA-002 app data checksum mismatch');
  return { schemaVersion: APP_DATA_SCHEMA_VERSION, checksum: expected, records };
}

/** JSON export text (pretty-printed, checksum included). */
export async function exportAppDataJson(records: AppDbRecord[]): Promise<string> {
  const payload: AppDataExport = {
    schemaVersion: APP_DATA_SCHEMA_VERSION,
    checksum: await checksumRecords(records),
    records,
  };
  return JSON.stringify(payload, null, 2);
}

/** CSV export with the documented preamble line. */
export async function exportAppDataCsv(records: AppDbRecord[]): Promise<string> {
  const checksum = await checksumRecords(records);
  const escape = (value: string): string => `"${value.replace(/"/g, '""')}"`;
  const lines = [`# schemaVersion=${APP_DATA_SCHEMA_VERSION} checksum=${checksum}`, 'key,value_json,updated_at_ms'];
  for (const record of records) {
    lines.push(
      [escape(record.key), escape(JSON.stringify(record.value ?? null)), String(record.updatedAtMs)].join(','),
    );
  }
  return lines.join('\n');
}
