/**
 * Main-thread client for the host DB worker.
 *
 * Owns request ids, timeouts, and transaction serialization. Database status
 * (`opfs` vs `memory`) is exposed so the host can raise `E-SHELL-001` when OPFS
 * is unavailable instead of pretending data is persisted.
 */

import type { HostDb, HostDbTransaction, SqlValue } from './driver';
import type { HostDbOp, HostDbRequest, HostDbResponse, HostDbSuccess } from './worker/protocol';

/** Identifies one per-app database owned by the worker. */
export interface AppDbKey {
  workspaceSlug: string;
  appInstallId: string;
  appId: string;
}

const REQUEST_TIMEOUT_MS = 15_000;

export interface WorkerDbStatus {
  storage: 'opfs' | 'memory';
}

export class WorkerHostDb implements HostDb {
  storage: 'opfs' | 'memory' = 'memory';
  private readonly worker: Worker;
  private nextId = 1;
  private readonly pending = new Map<
    number,
    { resolve: (response: HostDbResponse) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }
  >();
  private txLock: Promise<unknown> = Promise.resolve();

  constructor(worker: Worker) {
    this.worker = worker;
    this.worker.addEventListener('message', (event: MessageEvent<HostDbResponse>) => {
      const response = event.data;
      const entry = this.pending.get(response.id);
      if (!entry) return;
      this.pending.delete(response.id);
      clearTimeout(entry.timer);
      entry.resolve(response);
    });
  }

  static async create(worker: Worker): Promise<WorkerHostDb> {
    const db = new WorkerHostDb(worker);
    const initialized = db.unwrap(await db.call({ op: 'init' }));
    db.storage = initialized.storage ?? 'memory';
    return db;
  }

  private call(request: Omit<HostDbRequest, 'id'>): Promise<HostDbResponse> {
    const id = this.nextId;
    this.nextId += 1;
    return new Promise<HostDbResponse>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error('E-DATA-001 host database request timed out'));
      }, REQUEST_TIMEOUT_MS);
      this.pending.set(id, { resolve, reject, timer });
      this.worker.postMessage({ ...request, id });
    });
  }

  private unwrap(response: HostDbResponse): HostDbSuccess {
    if (!response.ok) throw new Error(`${response.code} ${response.message}`);
    return response;
  }

  async select<T = Record<string, SqlValue>>(sql: string, params?: readonly SqlValue[]): Promise<T[]> {
    const response = this.unwrap(await this.call({ op: 'select', sql, params: [...(params ?? [])] }));
    return (response.rows ?? []) as T[];
  }

  async exec(sql: string, params?: readonly SqlValue[]): Promise<number> {
    const response = this.unwrap(await this.call({ op: 'exec', sql, params: [...(params ?? [])] }));
    return response.changes ?? 0;
  }

  async transaction<T>(fn: (tx: HostDbTransaction) => Promise<T>): Promise<T> {
    const run = async (): Promise<T> => {
      this.unwrap(await this.call({ op: 'begin' }));
      try {
        const result = await fn(this);
        this.unwrap(await this.call({ op: 'commit' }));
        return result;
      } catch (error) {
        await this.call({ op: 'rollback' }).catch(() => undefined);
        throw error;
      }
    };
    const chained = this.txLock.then(run, run);
    this.txLock = chained.catch(() => undefined);
    return chained;
  }

  async close(): Promise<void> {
    await this.call({ op: 'close' }).catch(() => undefined);
    this.worker.terminate();
  }

  /** Deterministic app database path for `app_databases.relative_path`. */
  async appDatabasePath(workspaceSlug: string, appId: string): Promise<string> {
    const response = this.unwrap(await this.call({ op: 'appDbPath', workspaceSlug, appId }));
    if (!response.path) throw new Error('E-DATA-001 host database returned no app path');
    return response.path;
  }

  /** Open (and lazily create) an app database inside the worker. */
  async openApp(key: AppDbKey): Promise<void> {
    this.unwrap(await this.call({ op: 'appOpen', ...key }));
  }

  async appSelect<T = Record<string, SqlValue>>(
    key: AppDbKey,
    sql: string,
    params?: readonly SqlValue[],
  ): Promise<T[]> {
    const response = this.unwrap(
      await this.call({ op: 'appSelect', ...key, sql, params: [...(params ?? [])] }),
    );
    return (response.rows ?? []) as T[];
  }

  async appExec(key: AppDbKey, sql: string, params?: readonly SqlValue[]): Promise<number> {
    const response = this.unwrap(await this.call({ op: 'appExec', ...key, sql, params: [...(params ?? [])] }));
    return response.changes ?? 0;
  }

  /**
   * Run `fn` inside the app database's own transaction. App transactions share
   * the host serialize lock so two interleaved app writes cannot nest BEGINs.
   */
  async appTransaction<T>(key: AppDbKey, fn: () => Promise<T>): Promise<T> {
    const run = async (): Promise<T> => {
      this.unwrap(await this.call({ op: 'appBegin', ...key }));
      try {
        const result = await fn();
        this.unwrap(await this.call({ op: 'appCommit', ...key }));
        return result;
      } catch (error) {
        await this.call({ op: 'appRollback', ...key }).catch(() => undefined);
        throw error;
      }
    };
    const chained = this.txLock.then(run, run);
    this.txLock = chained.catch(() => undefined);
    return chained;
  }

  async closeApp(key: AppDbKey): Promise<void> {
    await this.call({ op: 'appClose', ...key }).catch(() => undefined);
  }

  async listAppKeys(): Promise<string[]> {
    const response = this.unwrap(await this.call({ op: 'appList' }));
    return response.appKeys ?? [];
  }

  /** Consistent export of the host database (`sqlite3_js_db_export`). */
  async snapshot(): Promise<Uint8Array> {
    const response = this.unwrap(await this.call({ op: 'snapshot' }));
    if (!response.bytes) throw new Error('E-DATA-001 host database returned no snapshot');
    return response.bytes;
  }

  /** Consistent export of one app database, used by restore rollback. */
  async appSnapshot(key: AppDbKey): Promise<Uint8Array> {
    const response = this.unwrap(await this.call({ op: 'appSnapshot', ...key }));
    if (!response.bytes) throw new Error('E-DATA-001 app database returned no snapshot');
    return response.bytes;
  }

  /** Close every SQLite handle but keep the worker alive for `reopen`. */
  async detach(): Promise<void> {
    this.unwrap(await this.call({ op: 'detach' }));
  }

  /** Reopen the host database after its OPFS file was replaced. */
  async reopen(): Promise<void> {
    this.unwrap(await this.call({ op: 'reopen' }));
  }

  /** Escape hatch used by the worker protocol tests. */
  protected async raw(op: HostDbOp): Promise<HostDbSuccess> {
    return this.unwrap(await this.call({ op }));
  }
}
