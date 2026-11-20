/**
 * Host DB worker: SQLite WASM on OPFS with an explicit in-memory fallback.
 *
 * - OPFS when available; otherwise memory with `storage: 'memory'` so the host
 *   can surface `E-HOST-002` instead of silently degrading.
 * - `foreign_keys = ON`, `journal_mode = TRUNCATE` (OPFS VFS has no WAL).
 * - Every statement passes the Rust core SQL guard before execution; the worker
 *   never re-implements the guard in TypeScript.
 * - Migrations come from the generated ledger and run inside the worker.
 */

/// <reference lib="webworker" />

import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import { applyMigrations } from '../migrate';
import { appDatabasePath, type HostDbRequest, type HostDbResponse } from './protocol';
import type { HostDb, HostDbTransaction, SqlValue } from '../driver';
import { isRecord } from '../../lib/guards';
import { createCoreClient, coreWasmUrl, loadCoreWasm } from '@microapp/runtime-web';

type SqliteDb = {
  exec: (sql: string, options?: Record<string, unknown>) => unknown;
  prepare: (sql: string) => {
    all: (params?: unknown[]) => unknown[];
    run: (params?: unknown[]) => { changes?: number };
    finalize: () => void;
  };
  close: () => void;
};

interface GuardApi {
  guardCheckSql(sql: string): Promise<void>;
}

let db: SqliteDb | null = null;
let storage: 'opfs' | 'memory' = 'memory';
let guard: GuardApi | null = null;

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

function wrap(sqlite: SqliteDb): HostDb {
  const transaction: HostDbTransaction = {
    async select<T>(sql: string, params?: readonly SqlValue[]): Promise<T[]> {
      const statement = sqlite.prepare(sql);
      try {
        return statement.all((params ?? []) as unknown[]) as T[];
      } finally {
        statement.finalize();
      }
    },
    async exec(sql: string, params?: readonly SqlValue[]): Promise<number> {
      if (params && params.length > 0) {
        const statement = sqlite.prepare(sql);
        try {
          return statement.run(params as unknown[]).changes ?? 0;
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
    storage,
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

async function initialize(): Promise<void> {
  const sqlite3 = await sqlite3InitModule();
  const oo1 = sqlite3.oo1 as unknown as {
    OpfsDb?: new (filename: string, flags?: string) => SqliteDb;
    DB: new (filename?: string) => SqliteDb;
  };
  if (oo1.OpfsDb) {
    try {
      db = new oo1.OpfsDb('/microapp-studio/host.db');
      storage = 'opfs';
    } catch {
      db = null;
    }
  }
  if (!db) {
    // Explicit ephemeral fallback: surfaced as E-HOST-002 by the host UI.
    db = new oo1.DB(':memory:');
    storage = 'memory';
  }
  db.exec('PRAGMA foreign_keys = ON');
  if (storage === 'opfs') {
    db.exec('PRAGMA journal_mode = TRUNCATE');
  }
  guard = await loadGuard();
  const driver = wrap(db);
  await applyMigrations(driver);
}

async function guarded(sql: string): Promise<void> {
  if (!guard) throw new Error('E-SBX-001 sql guard unavailable');
  await guard.guardCheckSql(sql);
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
      if (!db) {
        fail(id, 'E-DATA-001', 'database not initialized');
        return;
      }
      switch (request.op) {
        case 'exec': {
          const sql = String(request.sql ?? '');
          await guarded(sql);
          const driver = wrap(db);
          const changes = await driver.exec(sql, request.params);
          respond({ id, ok: true, changes, storage });
          return;
        }
        case 'select': {
          const sql = String(request.sql ?? '');
          await guarded(sql);
          const driver = wrap(db);
          const rows = await driver.select(sql, request.params);
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
          respond({
            id,
            ok: true,
            path: appDatabasePath(String(request.workspaceSlug ?? ''), String(request.appInstallId ?? '')),
          });
          return;
        }
        case 'close':
          db.close();
          db = null;
          respond({ id, ok: true });
          return;
        default:
          fail(id, 'E-SBX-005', 'unknown op');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown failure';
      const code = /^E-[A-Z]+-\d{3}/.exec(message)?.[0] ?? 'E-DATA-001';
      fail(id, code, message);
    }
  })();
});
