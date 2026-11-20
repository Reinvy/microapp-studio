/**
 * Main-thread client for the host DB worker.
 *
 * Owns request ids, timeouts, and transaction serialization. Database status
 * (`opfs` vs `memory`) is exposed so the host can raise `E-HOST-002` when OPFS
 * is unavailable instead of pretending data is persisted.
 */

import type { HostDb, HostDbTransaction, SqlValue } from './driver';
import type { HostDbRequest, HostDbResponse, HostDbSuccess } from './worker/protocol';

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
  async appDatabasePath(workspaceSlug: string, appInstallId: string): Promise<string> {
    const response = this.unwrap(
      await this.call({ op: 'appDbPath', workspaceSlug, appInstallId }),
    );
    if (!response.path) throw new Error('E-HOST-007 host database returned no app path');
    return response.path;
  }
}
