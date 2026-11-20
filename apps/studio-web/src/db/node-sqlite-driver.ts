/**
 * Node driver used by Vitest and `scripts/test-migrations.mjs`.
 *
 * It is a real SQLite engine (`node:sqlite`), not a mock: repository tests run
 * against the same canonical DDL the browser worker applies to OPFS.
 */

import { DatabaseSync, type StatementSync } from 'node:sqlite';
import type { HostDb, HostDbTransaction, SqlValue } from './driver';

function normalizeParams(params?: readonly SqlValue[]): unknown[] {
  return (params ?? []).map((value) =>
    typeof value === 'bigint' ? Number(value) : value instanceof Uint8Array ? value : value,
  );
}

function runStatement(statement: StatementSync, params?: readonly SqlValue[]): number {
  const result = statement.run(...(normalizeParams(params) as never[]));
  return Number(result.changes ?? 0);
}

function selectStatement<T>(statement: StatementSync, params?: readonly SqlValue[]): T[] {
  return statement.all(...(normalizeParams(params) as never[])) as T[];
}

class NodeSqliteTransaction implements HostDbTransaction {
  constructor(private readonly db: DatabaseSync) {}

  async select<T = Record<string, SqlValue>>(sql: string, params?: readonly SqlValue[]): Promise<T[]> {
    return selectStatement<T>(this.db.prepare(sql), params);
  }

  async exec(sql: string, params?: readonly SqlValue[]): Promise<number> {
    if (params && params.length > 0) {
      return runStatement(this.db.prepare(sql), params);
    }
    this.db.exec(sql);
    return 0;
  }
}

export class NodeSqliteDriver implements HostDb {
  readonly storage = 'memory' as const;
  private readonly db: DatabaseSync;
  private readonly tx: NodeSqliteTransaction;

  constructor(path = ':memory:') {
    this.db = new DatabaseSync(path);
    this.db.exec('PRAGMA foreign_keys = ON');
    this.db.exec('PRAGMA journal_mode = TRUNCATE');
    this.tx = new NodeSqliteTransaction(this.db);
  }

  async select<T = Record<string, SqlValue>>(sql: string, params?: readonly SqlValue[]): Promise<T[]> {
    return this.tx.select<T>(sql, params);
  }

  async exec(sql: string, params?: readonly SqlValue[]): Promise<number> {
    return this.tx.exec(sql, params);
  }

  async transaction<T>(fn: (tx: HostDbTransaction) => Promise<T>): Promise<T> {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const result = await fn(this.tx);
      this.db.exec('COMMIT');
      return result;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  async close(): Promise<void> {
    this.db.close();
  }
}
