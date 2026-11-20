/**
 * Permission grant repository.
 *
 * Grants live in `permission_grants` (persistent/session scopes) and
 * `permission_sessions` (`Allow once`). The broker asks this repository on every
 * call, so revoking a grant takes effect immediately (SEC-016).
 */

import type { HostDb } from '../driver';
import { uuidv7 } from '../ids';

export type GrantScope = 'persistent' | 'session' | 'once';
export type PermissionDecision = 'granted' | 'denied' | 'mocked';

export interface GrantInput {
  workspaceId: string;
  appInstallId: string;
  permissionId: string;
  scope: GrantScope;
  mocked?: boolean;
  sessionId?: string;
  expiresAtMs?: number;
  nowMs?: number;
}

export interface ActiveGrant {
  id: string;
  permissionId: string;
  scope: GrantScope;
  mocked: boolean;
  grantedAtMs: number;
}

/** Create or replace the active grant for a permission (state: granted). */
export async function grantPermission(db: HostDb, input: GrantInput): Promise<ActiveGrant> {
  const now = input.nowMs ?? Date.now();
  const id = uuidv7(now);
  await db.transaction(async (tx) => {
    await tx.exec(
      `UPDATE permission_grants SET revoked_at_ms = ?
       WHERE workspace_id = ? AND app_install_id = ? AND permission_id = ? AND revoked_at_ms IS NULL`,
      [now, input.workspaceId, input.appInstallId, input.permissionId],
    );
    if (input.scope === 'once') {
      // `Allow once` is session-scoped only: it must never become a persistent
      // grant row, otherwise expiry would be bypassed.
      if (!input.sessionId) throw new Error('E-SBX-005 allow-once requires a session id');
      await tx.exec(
        `INSERT INTO permission_sessions (session_id, workspace_id, app_install_id, permission_id, granted_at_ms, expires_at_ms)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [input.sessionId, input.workspaceId, input.appInstallId, input.permissionId, now, input.expiresAtMs ?? null],
      );
    } else {
      await tx.exec(
        `INSERT INTO permission_grants
           (id, workspace_id, app_install_id, permission_id, scope, mocked, granted_at_ms, revoked_at_ms)
         VALUES (?, ?, ?, ?, ?, ?, ?, NULL)`,
        [id, input.workspaceId, input.appInstallId, input.permissionId, input.scope, input.mocked ? 1 : 0, now],
      );
    }
  });
  return {
    id,
    permissionId: input.permissionId,
    scope: input.scope,
    mocked: input.mocked === true,
    grantedAtMs: now,
  };
}

/** Revoke the active grant (state: revoked, final for this session). */
export async function revokePermission(
  db: HostDb,
  input: { workspaceId: string; appInstallId: string; permissionId: string; nowMs?: number },
): Promise<boolean> {
  const now = input.nowMs ?? Date.now();
  const changed = await db.exec(
    `UPDATE permission_grants SET revoked_at_ms = ?
     WHERE workspace_id = ? AND app_install_id = ? AND permission_id = ? AND revoked_at_ms IS NULL`,
    [now, input.workspaceId, input.appInstallId, input.permissionId],
  );
  await db.exec(
    `DELETE FROM permission_sessions WHERE workspace_id = ? AND app_install_id = ? AND permission_id = ?`,
    [input.workspaceId, input.appInstallId, input.permissionId],
  );
  return changed > 0;
}

/** Resolve the effective decision for one permission right now. */
export async function permissionDecision(
  db: HostDb,
  input: { workspaceId: string; appInstallId: string; permissionId: string; sessionId?: string; nowMs?: number },
): Promise<PermissionDecision> {
  const now = input.nowMs ?? Date.now();
  const grants = await db.select<{ mocked: number }>(
    `SELECT mocked FROM permission_grants
     WHERE workspace_id = ? AND app_install_id = ? AND permission_id = ? AND revoked_at_ms IS NULL`,
    [input.workspaceId, input.appInstallId, input.permissionId],
  );
  const grant = grants[0];
  if (grant) return grant.mocked === 1 ? 'mocked' : 'granted';

  if (input.sessionId) {
    const once = await db.select<{ expires_at_ms: number | null }>(
      `SELECT expires_at_ms FROM permission_sessions
       WHERE session_id = ? AND workspace_id = ? AND app_install_id = ? AND permission_id = ?`,
      [input.sessionId, input.workspaceId, input.appInstallId, input.permissionId],
    );
    const row = once[0];
    if (row && (row.expires_at_ms === null || Number(row.expires_at_ms) > now)) return 'granted';
  }
  return 'denied';
}

export async function listActiveGrants(
  db: HostDb,
  workspaceId: string,
  appInstallId: string,
): Promise<ActiveGrant[]> {
  const rows = await db.select<{
    id: string;
    permission_id: string;
    scope: GrantScope;
    mocked: number;
    granted_at_ms: number;
  }>(
    `SELECT id, permission_id, scope, mocked, granted_at_ms FROM permission_grants
     WHERE workspace_id = ? AND app_install_id = ? AND revoked_at_ms IS NULL
     ORDER BY granted_at_ms DESC`,
    [workspaceId, appInstallId],
  );
  return rows.map((row) => ({
    id: row.id,
    permissionId: row.permission_id,
    scope: row.scope,
    mocked: row.mocked === 1,
    grantedAtMs: Number(row.granted_at_ms),
  }));
}

/** Drop every `Allow once` entry for a finished app session. */
export async function clearSessionGrants(
  db: HostDb,
  input: { workspaceId: string; appInstallId: string; sessionId?: string },
): Promise<number> {
  const params = [input.workspaceId, input.appInstallId];
  let sql = 'DELETE FROM permission_sessions WHERE workspace_id = ? AND app_install_id = ?';
  if (input.sessionId) {
    sql += ' AND session_id = ?';
    params.push(input.sessionId);
  }
  const sessions = await db.exec(sql, params);
  await db.exec(
    `DELETE FROM permission_grants WHERE workspace_id = ? AND app_install_id = ? AND scope = 'once' AND revoked_at_ms IS NOT NULL`,
    [input.workspaceId, input.appInstallId],
  );
  return sessions;
}

/** Revoke grants that are no longer declared by an updated manifest (SEC-020). */
export async function revokeUndeclaredGrants(
  db: HostDb,
  input: { workspaceId: string; appInstallId: string; declared: string[]; nowMs?: number },
): Promise<string[]> {
  const now = input.nowMs ?? Date.now();
  const active = await listActiveGrants(db, input.workspaceId, input.appInstallId);
  const revoked: string[] = [];
  for (const grant of active) {
    if (!input.declared.includes(grant.permissionId)) {
      await revokePermission(db, {
        workspaceId: input.workspaceId,
        appInstallId: input.appInstallId,
        permissionId: grant.permissionId,
        nowMs: now,
      });
      revoked.push(grant.permissionId);
    }
  }
  return revoked;
}
