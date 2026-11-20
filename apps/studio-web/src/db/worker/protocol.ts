/**
 * Host DB worker RPC protocol.
 *
 * The worker owns the SQLite WASM handle; the main thread only sends SQL with
 * bound parameters. Every request carries a monotonically increasing `id` so
 * responses can be matched and timed out.
 */

import type { SqlValue } from '../driver';

export type HostDbOp = 'init' | 'exec' | 'select' | 'begin' | 'commit' | 'rollback' | 'close' | 'appDbPath';

export interface HostDbRequest {
  id: number;
  op: HostDbOp;
  sql?: string;
  params?: SqlValue[];
  appInstallId?: string;
  workspaceSlug?: string;
}

export interface HostDbSuccess {
  id: number;
  ok: true;
  rows?: unknown[];
  changes?: number;
  storage?: 'opfs' | 'memory';
  path?: string;
}

export interface HostDbFailure {
  id: number;
  ok: false;
  code: string;
  message: string;
}

export type HostDbResponse = HostDbSuccess | HostDbFailure;

/** Deterministic per-app database path (no ATTACH, no cross-app access). */
export function appDatabasePath(workspaceSlug: string, appInstallId: string): string {
  if (!/^[a-z0-9-]{1,48}$/.test(workspaceSlug)) {
    throw new Error('E-HOST-007 invalid workspace slug');
  }
  if (!/^[0-9a-f-]{36}$/.test(appInstallId)) {
    throw new Error('E-HOST-007 invalid app install id');
  }
  return `workspaces/${workspaceSlug}/apps/${appInstallId}.db`;
}
