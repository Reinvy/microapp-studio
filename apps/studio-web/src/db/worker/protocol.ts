/**
 * Host DB worker RPC protocol.
 *
 * The worker owns the SQLite WASM handle and every per-app database handle; the
 * main thread only sends SQL with bound parameters. Every request carries a
 * monotonically increasing `id` so responses can be matched and timed out.
 *
 * App-database ops always carry the workspace slug, the install id, and the app
 * id, so the worker can derive the path itself instead of trusting a caller
 * supplied one.
 */

import type { SqlValue } from '../driver';

export type HostDbOp =
  | 'init'
  | 'exec'
  | 'select'
  | 'begin'
  | 'commit'
  | 'rollback'
  | 'close'
  | 'appDbPath'
  | 'appOpen'
  | 'appSelect'
  | 'appExec'
  | 'appBegin'
  | 'appCommit'
  | 'appRollback'
  | 'appClose'
  | 'appList'
  | 'snapshot'
  | 'appSnapshot'
  | 'detach'
  | 'reopen';

export interface HostDbRequest {
  id: number;
  op: HostDbOp;
  sql?: string;
  params?: SqlValue[];
  appInstallId?: string;
  appId?: string;
  workspaceSlug?: string;
}

export interface HostDbSuccess {
  id: number;
  ok: true;
  rows?: unknown[];
  changes?: number;
  storage?: 'opfs' | 'memory';
  path?: string;
  /** Open app database keys, for diagnostics and uninstall cleanup. */
  appKeys?: string[];
  /** Consistent SQLite export, used by restore snapshots. */
  bytes?: Uint8Array;
}

export interface HostDbFailure {
  id: number;
  ok: false;
  code: string;
  message: string;
}

export type HostDbResponse = HostDbSuccess | HostDbFailure;

const APP_ID_PATTERN = /^[a-z][a-z0-9.]{1,127}$/;
const WORKSPACE_SLUG_PATTERN = /^[a-z0-9-]{1,48}$/;

/**
 * Deterministic per-app database path (no ATTACH, no cross-app access).
 *
 * The app id is part of the path so the file survives a reinstall and stays
 * human-readable; it is validated to a restricted alphabet so it can never carry
 * a traversal segment.
 */
export function appDatabasePath(workspaceSlug: string, appId: string): string {
  if (!WORKSPACE_SLUG_PATTERN.test(workspaceSlug)) {
    throw new Error('E-DATA-001 invalid workspace slug');
  }
  if (!APP_ID_PATTERN.test(appId) || appId.includes('..')) {
    throw new Error('E-DATA-001 invalid app id');
  }
  return `workspaces/${workspaceSlug}/apps/${appId}.db`;
}

/** Install id is a uuid v7; kept separate from the path key. */
export function assertInstallId(appInstallId: string): void {
  if (!/^[0-9a-f-]{36}$/.test(appInstallId)) {
    throw new Error('E-DATA-001 invalid app install id');
  }
}
