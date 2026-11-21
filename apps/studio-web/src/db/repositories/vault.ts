/**
 * Vault repository: items, per-item grants, and key wraps.
 *
 * The host never sees plaintext in these tables: `ciphertext` is a complete
 * AES-256-GCM envelope and `key_id`/`nonce` must match it. Wrapping and sealing
 * happen in the identity worker via the Rust core.
 */

import type { HostDb } from '../driver';
import { uuidv7 } from '../ids';

export interface VaultItemInput {
  workspaceId: string;
  kind: 'api_key' | 'password' | 'note' | 'certificate';
  label: string;
  envelope: Uint8Array;
  keyId: Uint8Array;
  nonce: Uint8Array;
  nowMs?: number;
}

export interface VaultItem {
  id: string;
  workspaceId: string;
  kind: string;
  label: string;
  envelope: Uint8Array;
  keyId: Uint8Array;
  nonce: Uint8Array;
  createdAtMs: number;
  updatedAtMs: number;
}

export function assertEnvelope(keyId: Uint8Array, nonce: Uint8Array, envelope: Uint8Array): void {
  if (keyId.byteLength !== 16) throw new Error('E-AUTH-001 key_id must be 16 bytes');
  if (nonce.byteLength !== 12) throw new Error('E-AUTH-001 nonce must be 12 bytes');
  if (envelope.byteLength < 1 + 16 + 12 + 16) {
    throw new Error('E-AUTH-001 envelope too short');
  }
  if (envelope[0] !== 1) throw new Error('E-AUTH-001 unsupported envelope version');
  for (let index = 0; index < 16; index += 1) {
    if (envelope[1 + index] !== keyId[index]) {
      throw new Error('E-AUTH-001 key_id does not match envelope');
    }
  }
  for (let index = 0; index < 12; index += 1) {
    if (envelope[17 + index] !== nonce[index]) {
      throw new Error('E-AUTH-001 nonce does not match envelope');
    }
  }
}

interface VaultRow {
  id: string;
  workspace_id: string;
  kind: string;
  label: string;
  ciphertext: Uint8Array;
  key_id: Uint8Array;
  nonce: Uint8Array;
  created_at_ms: number;
  updated_at_ms: number;
}

function toItem(row: VaultRow): VaultItem {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    kind: row.kind,
    label: row.label,
    envelope: row.ciphertext,
    keyId: row.key_id,
    nonce: row.nonce,
    createdAtMs: Number(row.created_at_ms),
    updatedAtMs: Number(row.updated_at_ms),
  };
}

export async function createVaultItem(db: HostDb, input: VaultItemInput): Promise<VaultItem> {
  assertEnvelope(input.keyId, input.nonce, input.envelope);
  const now = input.nowMs ?? Date.now();
  const id = uuidv7(now);
  await db.exec(
    `INSERT INTO vault_items
       (id, workspace_id, kind, label, ciphertext, key_id, nonce, created_at_ms, updated_at_ms)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.workspaceId,
      input.kind,
      input.label,
      input.envelope,
      input.keyId,
      input.nonce,
      now,
      now,
    ],
  );
  return {
    id,
    workspaceId: input.workspaceId,
    kind: input.kind,
    label: input.label,
    envelope: input.envelope,
    keyId: input.keyId,
    nonce: input.nonce,
    createdAtMs: now,
    updatedAtMs: now,
  };
}

export async function listVaultItems(db: HostDb, workspaceId: string): Promise<VaultItem[]> {
  const rows = await db.select<VaultRow>(
    'SELECT * FROM vault_items WHERE workspace_id = ? AND deleted_at_ms IS NULL ORDER BY updated_at_ms DESC',
    [workspaceId],
  );
  return rows.map(toItem);
}

export async function softDeleteVaultItem(
  db: HostDb,
  workspaceId: string,
  itemId: string,
  nowMs = Date.now(),
): Promise<void> {
  const changed = await db.exec(
    'UPDATE vault_items SET deleted_at_ms = ?, updated_at_ms = ? WHERE id = ? AND workspace_id = ?',
    [nowMs, nowMs, itemId, workspaceId],
  );
  if (changed === 0) throw new Error('E-DATA-001 vault item not found in workspace');
}

/** Grant an app read access to exactly one vault item (FR-HOST-017). */
export async function grantVaultItem(
  db: HostDb,
  input: { workspaceId: string; itemId: string; appInstallId: string; nowMs?: number },
): Promise<string> {
  const now = input.nowMs ?? Date.now();
  const id = uuidv7(now);
  await db.transaction(async (tx) => {
    await tx.exec(
      `UPDATE vault_grants SET revoked_at_ms = ?
       WHERE workspace_id = ? AND vault_item_id = ? AND app_install_id = ? AND revoked_at_ms IS NULL`,
      [now, input.workspaceId, input.itemId, input.appInstallId],
    );
    await tx.exec(
      `INSERT INTO vault_grants (id, workspace_id, vault_item_id, app_install_id, granted_at_ms, revoked_at_ms)
       VALUES (?, ?, ?, ?, ?, NULL)`,
      [id, input.workspaceId, input.itemId, input.appInstallId, now],
    );
  });
  return id;
}

export async function revokeVaultItem(
  db: HostDb,
  input: { workspaceId: string; itemId: string; appInstallId: string; nowMs?: number },
): Promise<boolean> {
  const now = input.nowMs ?? Date.now();
  const changed = await db.exec(
    `UPDATE vault_grants SET revoked_at_ms = ?
     WHERE workspace_id = ? AND vault_item_id = ? AND app_install_id = ? AND revoked_at_ms IS NULL`,
    [now, input.workspaceId, input.itemId, input.appInstallId],
  );
  return changed > 0;
}

export async function vaultItemForApp(
  db: HostDb,
  input: { workspaceId: string; itemId: string; appInstallId: string },
): Promise<VaultItem | null> {
  const rows = await db.select<VaultRow>(
    `SELECT v.* FROM vault_items v
     JOIN vault_grants g ON g.vault_item_id = v.id
     WHERE v.id = ? AND v.workspace_id = ? AND v.deleted_at_ms IS NULL
       AND g.app_install_id = ? AND g.revoked_at_ms IS NULL`,
    [input.itemId, input.workspaceId, input.appInstallId],
  );
  return rows[0] ? toItem(rows[0]) : null;
}

export interface KeyWrapInput {
  workspaceId: string;
  kdf: 'argon2id' | 'master-hkdf';
  salt: Uint8Array;
  memoryKib: number;
  iterations: number;
  parallelism: number;
  nonce: Uint8Array;
  wrappedKey: Uint8Array;
  nowMs?: number;
}

/** Store a new active key wrap, retiring the previous one for the workspace. */
export async function saveKeyWrap(db: HostDb, input: KeyWrapInput): Promise<string> {
  if (input.salt.byteLength !== 16) throw new Error('E-AUTH-001 salt must be 16 bytes');
  if (input.nonce.byteLength !== 12) throw new Error('E-AUTH-001 nonce must be 12 bytes');
  if (input.memoryKib < 65_536 || input.iterations < 3 || input.parallelism < 1) {
    throw new Error('E-AUTH-001 argon2id parameters below the documented floor');
  }
  const now = input.nowMs ?? Date.now();
  const id = uuidv7(now);
  await db.transaction(async (tx) => {
    await tx.exec(
      'UPDATE vault_key_wraps SET retired_at_ms = ? WHERE workspace_id = ? AND retired_at_ms IS NULL',
      [now, input.workspaceId],
    );
    await tx.exec(
      `INSERT INTO vault_key_wraps
         (id, workspace_id, kdf, salt, memory_kib, iterations, parallelism, nonce, wrapped_key, created_at_ms, retired_at_ms)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
      [
        id,
        input.workspaceId,
        input.kdf,
        input.salt,
        input.memoryKib,
        input.iterations,
        input.parallelism,
        input.nonce,
        input.wrappedKey,
        now,
      ],
    );
  });
  return id;
}

export interface ActiveKeyWrap {
  id: string;
  kdf: string;
  salt: Uint8Array;
  memoryKib: number;
  iterations: number;
  parallelism: number;
  nonce: Uint8Array;
  wrappedKey: Uint8Array;
  createdAtMs: number;
}

export async function activeKeyWrap(db: HostDb, workspaceId: string): Promise<ActiveKeyWrap | null> {
  const rows = await db.select<{
    id: string;
    kdf: string;
    salt: Uint8Array;
    memory_kib: number;
    iterations: number;
    parallelism: number;
    nonce: Uint8Array;
    wrapped_key: Uint8Array;
    created_at_ms: number;
  }>(
    'SELECT * FROM vault_key_wraps WHERE workspace_id = ? AND retired_at_ms IS NULL LIMIT 1',
    [workspaceId],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    kdf: row.kdf,
    salt: row.salt,
    memoryKib: Number(row.memory_kib),
    iterations: Number(row.iterations),
    parallelism: Number(row.parallelism),
    nonce: row.nonce,
    wrappedKey: row.wrapped_key,
    createdAtMs: Number(row.created_at_ms),
  };
}
