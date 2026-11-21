/**
 * Host DB worker: SQLite WASM on OPFS with an explicit in-memory fallback.
 *
 * - OPFS when available; otherwise memory with `storage: 'memory'` so the host
 *   can surface `E-SHELL-001` instead of silently degrading.
 * - `foreign_keys = ON`, `journal_mode = TRUNCATE` (OPFS VFS has no WAL).
 * - Every statement passes the Rust core SQL guard before execution; the worker
 *   never re-implements the guard in TypeScript.
 * - Migrations come from the generated ledger and run inside the worker, after a
 *   consistent snapshot is exported so a failed migration can be rolled back.
 * - Per-app databases live in their own `SqliteDb` handles keyed by path; they
 *   are never ATTACHed, so a query can never reach another app's rows.
 */

/// <reference lib="webworker" />

import { HOST_MIGRATIONS } from '../migrations/index.generated';
import { applyMigrations } from '../migrate';
import {
  appDatabasePath,
  assertInstallId,
  type HostDbRequest,
  type HostDbResponse,
} from './protocol';
import type { HostDb, HostDbTransaction, SqlValue } from '../driver';
import { isRecord } from '../../lib/guards';
import { createCoreClient, coreWasmUrl, loadCoreWasm } from '@microapp/runtime-web';

interface SqliteStatement {
  bind: (params?: unknown[]) => boolean;
  step: () => boolean;
  get: (options?: Record<string, unknown>) => unknown;
  finalize: () => void;
}

type SqliteDb = {
  exec: (sql: string, options?: Record<string, unknown>) => unknown;
  prepare: (sql: string) => SqliteStatement;
  changes: () => number;
  close: () => void;
};

interface GuardApi {
  guardCheckSql(sql: string): Promise<void>;
}

const HOST_DB_PATH = '/host.db';
const HOST_DB_OPFS_PATH = 'microapp-studio/host.db';
const OPFS_DIRECTORY = '/microapp-studio';
const SNAPSHOT_DIR = 'microapp-studio/snapshots';
const SNAPSHOT_RETENTION = 3;
const APP_DB_SCHEMA_VERSION = 1;

let db: SqliteDb | null = null;
let storage: 'opfs' | 'memory' = 'memory';
let guard: GuardApi | null = null;
let sqlite3: SqliteModule | null = null;
let opfsPool: OpfsPool | null = null;

interface OpfsPool {
  OpfsSAHPoolDb: new (filename: string) => SqliteDb;
}

interface SqliteModule {
  capi: { sqlite3_js_db_export: (db: SqliteDb, schema?: string) => Uint8Array };
  oo1: {
    OpfsDb?: new (filename: string, flags?: string) => SqliteDb;
    DB: new (filename?: string) => SqliteDb;
  };
  /**
   * The supported OPFS entry point in current builds. Requires
   * `createSyncAccessHandle`, which only exists in workers — which is why the
   * host database lives in this worker and not on the main thread.
   */
  installOpfsSAHPoolVfs?: (options: { name: string; directory: string }) => Promise<OpfsPool>;
}

/** Open per-app databases, keyed by their relative path. */
const appDbs = new Map<string, SqliteDb>();

function respond(response: HostDbResponse): void {
  (self as unknown as DedicatedWorkerGlobalScope).postMessage(response);
}

function fail(id: number, code: string, message: string): void {
  respond({ id, ok: false, code, message });
}

async function loadGuard(): Promise<GuardApi> {
  // Guard and crypto come from the Rust core only; no TypeScript duplicate.
  const coreModule = await loadCoreWasm(coreWasmUrl());
  return createCoreClient(coreModule);
}

/** Guard a host statement. App statements are guarded by the same Rust rule set. */
async function guarded(sql: string): Promise<void> {
  if (!guard) throw new Error('E-RUN-002 sql guard unavailable');
  await guard.guardCheckSql(sql);
}

function wrap(sqlite: SqliteDb, storageKind: 'opfs' | 'memory' = storage): HostDb {
  const transaction: HostDbTransaction = {
    async select<T>(sql: string, params?: readonly SqlValue[]): Promise<T[]> {
      const statement = sqlite.prepare(sql);
      try {
        if (params && params.length > 0) statement.bind(params as unknown[]);
        const rows: T[] = [];
        while (statement.step()) {
          rows.push(statement.get({}) as T);
        }
        return rows;
      } finally {
        statement.finalize();
      }
    },
    async exec(sql: string, params?: readonly SqlValue[]): Promise<number> {
      if (params && params.length > 0) {
        const statement = sqlite.prepare(sql);
        try {
          statement.bind(params as unknown[]);
          statement.step();
          return sqlite.changes();
        } finally {
          statement.finalize();
        }
      }
      sqlite.exec(sql);
      return 0;
    },
  };
  return {
    ...transaction,
    storage: storageKind,
    async transaction<T>(fn: (tx: HostDbTransaction) => Promise<T>): Promise<T> {
      sqlite.exec('BEGIN IMMEDIATE');
      try {
        const result = await fn(transaction);
        sqlite.exec('COMMIT');
        return result;
      } catch (error) {
        sqlite.exec('ROLLBACK');
        throw error;
      }
    },
    async close() {
      sqlite.close();
    },
  };
}

const SQLITE_WASM_URL = '/sqlite-wasm/index.mjs';

interface SqliteInitModule {
  default: (input?: unknown) => Promise<SqliteModule>;
}

/**
 * Load the SQLite WASM ESM at runtime from static assets. A bundler import would
 * try to resolve the package's dynamic OPFS proxy worker URL and fail.
 */
async function sqlite3InitModule(): Promise<SqliteModule> {
  const loaded = (await import(
    /* webpackIgnore: true */ /* turbopackIgnore: true */ /* @vite-ignore */ SQLITE_WASM_URL
  )) as unknown as SqliteInitModule;
  return loaded.default();
}

/**
 * Open a database on OPFS, preferring the pooled sync-access VFS. Returns `null`
 * when no persistent VFS is usable so the caller can fall back to memory.
 */
async function openPersistent(path: string): Promise<SqliteDb | null> {
  if (!sqlite3) return null;
  // Legacy async-proxy VFS: still present in some builds.
  if (sqlite3.oo1.OpfsDb) {
    try {
      return new sqlite3.oo1.OpfsDb(`${OPFS_DIRECTORY}${path}`);
    } catch {
      // fall through to the pooled VFS
    }
  }
  if (!sqlite3.installOpfsSAHPoolVfs) return null;
  try {
    if (!opfsPool) {
      opfsPool = await sqlite3.installOpfsSAHPoolVfs({ name: 'microapp', directory: OPFS_DIRECTORY });
    }
    return new opfsPool.OpfsSAHPoolDb(path);
  } catch {
    return null;
  }
}

async function openHostDb(): Promise<SqliteDb> {
  if (!sqlite3) throw new Error('E-SHELL-001 sqlite module missing');
  const opened = await openPersistent(HOST_DB_PATH);
  if (opened) {
    storage = 'opfs';
    return opened;
  }
  storage = 'memory';
  return new sqlite3.oo1.DB(':memory:');
}

function configure(sqlite: SqliteDb): void {
  sqlite.exec('PRAGMA foreign_keys = ON');
  if (storage === 'opfs') sqlite.exec('PRAGMA journal_mode = TRUNCATE');
}

async function snapshotDir(): Promise<FileSystemDirectoryHandle | null> {
  if (storage !== 'opfs' || typeof navigator === 'undefined' || !navigator.storage?.getDirectory) return null;
  try {
    const root = await navigator.storage.getDirectory();
    return await root.getDirectoryHandle(SNAPSHOT_DIR, { create: true });
  } catch {
    return null;
  }
}

/** Best-effort snapshot of the pre-migration host database. */
async function writeSnapshot(bytes: Uint8Array, version: number): Promise<void> {
  const dir = await snapshotDir();
  if (!dir) return;
  const name = `host-v${version}-${Date.now()}.db`;
  try {
    const handle = await dir.getFileHandle(name, { create: true });
    const writable = await handle.createWritable();
    await writable.write(bytes as unknown as BufferSource);
    await writable.close();
    await pruneSnapshots(dir);
  } catch {
    // A snapshot failure must not block a migration the user needs.
  }
}

interface DirectoryEntries {
  entries(): AsyncIterableIterator<[string, FileSystemHandle]>;
}

async function pruneSnapshots(dir: FileSystemDirectoryHandle): Promise<void> {
  const names: string[] = [];
  for await (const [name, handle] of (dir as unknown as DirectoryEntries).entries()) {
    if (handle.kind === 'file' && /^host-v\d+-\d+\.db$/.test(name)) names.push(name);
  }
  names.sort();
  for (const name of names.slice(0, Math.max(0, names.length - SNAPSHOT_RETENTION))) {
    await dir.removeEntry(name).catch(() => undefined);
  }
}

/** Overwrite the OPFS host database with snapshot bytes so it can be reopened. */
async function restoreSnapshot(bytes: Uint8Array): Promise<void> {
  if (typeof navigator === 'undefined' || !navigator.storage?.getDirectory) return;
  const root = await navigator.storage.getDirectory();
  const [dirName, fileName] = HOST_DB_OPFS_PATH.split('/');
  const dir = await root.getDirectoryHandle(dirName, { create: true });
  const handle = await dir.getFileHandle(fileName, { create: true });
  const writable = await handle.createWritable();
  await writable.write(bytes as unknown as BufferSource);
  await writable.close();
}

async function initialize(): Promise<void> {
  sqlite3 = await sqlite3InitModule();
  db = await openHostDb();
  configure(db);
  guard = await loadGuard();
  const driver = wrap(db);
  const before = Number(
    (await driver.select<{ user_version: number }>('PRAGMA user_version'))[0]?.user_version ?? 0,
  );
  const pending = HOST_MIGRATIONS.some((migration) => migration.version > before);
  let snapshot: Uint8Array | null = null;
  if (pending && sqlite3 && storage === 'opfs') {
    try {
      snapshot = sqlite3.capi.sqlite3_js_db_export(db);
    } catch {
      snapshot = null;
    }
    if (snapshot) await writeSnapshot(snapshot, before);
  }
  try {
    await applyMigrations(driver);
  } catch (error) {
    if (snapshot) {
      try {
        db.close();
        await restoreSnapshot(snapshot);
        db = await openHostDb();
        configure(db);
      } catch {
        // Restoring is best effort; the original error is what the user needs.
      }
    }
    throw new Error(
      `E-DATA-001 migration failed${snapshot ? '; previous snapshot restored' : ''}: ${
        error instanceof Error ? error.message : 'unknown'
      }`,
    );
  }
}

interface AppKey {
  workspaceSlug: string;
  appInstallId: string;
  appId: string;
}

function appKeyOf(request: HostDbRequest): AppKey {
  return {
    workspaceSlug: String(request.workspaceSlug ?? ''),
    appInstallId: String(request.appInstallId ?? ''),
    appId: String(request.appId ?? ''),
  };
}

function appPathOf(key: AppKey): string {
  assertInstallId(key.appInstallId);
  return appDatabasePath(key.workspaceSlug, key.appId);
}

async function openAppDb(key: AppKey): Promise<SqliteDb> {
  const path = appPathOf(key);
  const existing = appDbs.get(path);
  if (existing) return existing;
  if (!sqlite3) throw new Error('E-SHELL-001 sqlite module missing');
  const persistent = storage === 'opfs' ? await openPersistent(`/${path}`) : null;
  const handle: SqliteDb = persistent ?? new sqlite3.oo1.DB(':memory:');
  handle.exec('PRAGMA foreign_keys = ON');
  handle.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    checksum TEXT NOT NULL,
    applied_at_ms INTEGER NOT NULL
  )`);
  handle.exec(`CREATE TABLE IF NOT EXISTS app_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`);
  handle.exec(`CREATE TABLE IF NOT EXISTS kv (
    key TEXT PRIMARY KEY,
    value_json TEXT NOT NULL,
    updated_at_ms INTEGER NOT NULL
  )`);
  const meta = handle.prepare('SELECT value FROM app_meta WHERE key = ?');
  try {
    meta.bind(['schema_version']);
    if (!meta.step()) {
      const insert = handle.prepare('INSERT INTO app_meta (key, value) VALUES (?, ?)');
      try {
        insert.bind(['schema_version', String(APP_DB_SCHEMA_VERSION)]);
        insert.step();
      } finally {
        insert.finalize();
      }
    }
  } finally {
    meta.finalize();
  }
  appDbs.set(path, handle);
  return handle;
}

async function requireAppDb(request: HostDbRequest): Promise<SqliteDb> {
  return openAppDb(appKeyOf(request));
}

self.addEventListener('message', (event: MessageEvent<HostDbRequest>) => {
  void (async () => {
    const request = event.data;
    if (!isRecord(request) || typeof request.id !== 'number') return;
    const id = request.id;
    try {
      if (request.op === 'init') {
        await initialize();
        respond({ id, ok: true, storage });
        return;
      }
      if (request.op === 'reopen') {
        // Called after restore rewrote the database files on disk. The worker
        // stays alive; only the SQLite handles are replaced.
        db = await openHostDb();
        configure(db);
        respond({ id, ok: true, storage });
        return;
      }
      if (!db) {
        fail(id, 'E-SHELL-001', 'database not initialized');
        return;
      }
      switch (request.op) {
        case 'exec': {
          const sql = String(request.sql ?? '');
          await guarded(sql);
          const changes = await wrap(db).exec(sql, request.params);
          respond({ id, ok: true, changes, storage });
          return;
        }
        case 'select': {
          const sql = String(request.sql ?? '');
          await guarded(sql);
          const rows = await wrap(db).select(sql, request.params);
          respond({ id, ok: true, rows, storage });
          return;
        }
        case 'begin':
          db.exec('BEGIN IMMEDIATE');
          respond({ id, ok: true });
          return;
        case 'commit':
          db.exec('COMMIT');
          respond({ id, ok: true });
          return;
        case 'rollback':
          db.exec('ROLLBACK');
          respond({ id, ok: true });
          return;
        case 'appDbPath': {
          const key = appKeyOf(request);
          respond({ id, ok: true, path: appPathOf(key) });
          return;
        }
        case 'appOpen': {
          await openAppDb(appKeyOf(request));
          respond({ id, ok: true });
          return;
        }
        case 'appSelect': {
          const sql = String(request.sql ?? '');
          await guarded(sql);
          const rows = await wrap(await requireAppDb(request)).select(sql, request.params);
          respond({ id, ok: true, rows });
          return;
        }
        case 'appExec': {
          const sql = String(request.sql ?? '');
          await guarded(sql);
          const changes = await wrap(await requireAppDb(request)).exec(sql, request.params);
          respond({ id, ok: true, changes });
          return;
        }
        case 'appBegin':
          (await requireAppDb(request)).exec('BEGIN IMMEDIATE');
          respond({ id, ok: true });
          return;
        case 'appCommit':
          (await requireAppDb(request)).exec('COMMIT');
          respond({ id, ok: true });
          return;
        case 'appRollback':
          (await requireAppDb(request)).exec('ROLLBACK');
          respond({ id, ok: true });
          return;
        case 'appClose': {
          const key = appKeyOf(request);
          const path = appPathOf(key);
          const handle = appDbs.get(path);
          if (handle) {
            handle.close();
            appDbs.delete(path);
          }
          respond({ id, ok: true });
          return;
        }
        case 'appList':
          respond({ id, ok: true, appKeys: [...appDbs.keys()] });
          return;
        case 'snapshot': {
          if (!sqlite3) throw new Error('E-DATA-001 sqlite module missing');
          const bytes = sqlite3.capi.sqlite3_js_db_export(db);
          respond({ id, ok: true, bytes });
          return;
        }
        case 'appSnapshot': {
          if (!sqlite3) throw new Error('E-DATA-001 sqlite module missing');
          const handle = await requireAppDb(request);
          const bytes = sqlite3.capi.sqlite3_js_db_export(handle);
          respond({ id, ok: true, bytes });
          return;
        }
        case 'detach':
          for (const handle of appDbs.values()) handle.close();
          appDbs.clear();
          db.close();
          db = null;
          respond({ id, ok: true });
          return;
        case 'close':
          for (const handle of appDbs.values()) handle.close();
          appDbs.clear();
          db.close();
          db = null;
          respond({ id, ok: true });
          return;
        default:
          fail(id, 'E-RUN-003', 'unknown op');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown failure';
      const code = /^E-[A-Z]+-\d{3}/.exec(message)?.[0] ?? 'E-DATA-001';
      fail(id, code, message);
    }
  })();
});
