/**
 * Host database contract.
 *
 * Both the browser worker (SQLite WASM + OPFS) and the Node test driver
 * (`node:sqlite`) implement this interface, so repositories are exercised
 * against a real SQLite engine in tests and against OPFS in the browser.
 */

export type SqlValue = string | number | bigint | null | Uint8Array;

export interface HostDbTransaction {
  select<T = Record<string, SqlValue>>(sql: string, params?: readonly SqlValue[]): Promise<T[]>;
  exec(sql: string, params?: readonly SqlValue[]): Promise<number>;
}

export interface HostDb extends HostDbTransaction {
  /** Run `fn` inside `BEGIN IMMEDIATE … COMMIT`, rolling back on any throw. */
  transaction<T>(fn: (tx: HostDbTransaction) => Promise<T>): Promise<T>;
  close(): Promise<void>;
  /** `opfs` when persisted, `memory` for the explicit ephemeral fallback. */
  readonly storage: 'opfs' | 'memory';
}
