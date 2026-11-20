/**
 * Local identity repository.
 *
 * Exactly one `local_identity` row exists per installation (enforced by a unique
 * expression index). No mnemonic or mnemonic hash is stored here; recovery
 * verification re-derives `identity_pubkey` through the Rust core.
 */

import type { HostDb } from '../driver';
import { uuidv7 } from '../ids';

export interface IdentityInput {
  siteId: Uint8Array;
  identityPubkey: Uint8Array;
  keyAgreementPubkey: Uint8Array;
  hkdfSalt: Uint8Array;
  deviceSignPubkey: Uint8Array;
  deviceEcdhPubkey: Uint8Array;
  deviceCert?: Uint8Array | null;
  deviceCertExpiresMs?: number | null;
  displayName?: string | null;
  recoveryHint?: string | null;
  nowMs?: number;
}

export interface LocalIdentity {
  id: string;
  siteId: Uint8Array;
  identityPubkey: Uint8Array;
  keyAgreementPubkey: Uint8Array;
  hkdfSalt: Uint8Array;
  deviceSignPubkey: Uint8Array;
  deviceEcdhPubkey: Uint8Array;
  deviceCert: Uint8Array | null;
  deviceCertExpiresMs: number | null;
  displayName: string | null;
  recoveryHint: string | null;
  createdAtMs: number;
}

interface IdentityRow {
  id: string;
  site_id: Uint8Array;
  identity_pubkey: Uint8Array;
  key_agreement_pubkey: Uint8Array;
  hkdf_salt: Uint8Array;
  device_sign_pubkey: Uint8Array;
  device_ecdh_pubkey: Uint8Array;
  device_cert: Uint8Array | null;
  device_cert_expires_ms: number | null;
  display_name: string | null;
  recovery_hint: string | null;
  created_at_ms: number;
}

function toIdentity(row: IdentityRow): LocalIdentity {
  return {
    id: row.id,
    siteId: row.site_id,
    identityPubkey: row.identity_pubkey,
    keyAgreementPubkey: row.key_agreement_pubkey,
    hkdfSalt: row.hkdf_salt,
    deviceSignPubkey: row.device_sign_pubkey,
    deviceEcdhPubkey: row.device_ecdh_pubkey,
    deviceCert: row.device_cert,
    deviceCertExpiresMs: row.device_cert_expires_ms === null ? null : Number(row.device_cert_expires_ms),
    displayName: row.display_name,
    recoveryHint: row.recovery_hint,
    createdAtMs: Number(row.created_at_ms),
  };
}

function assertLength(bytes: Uint8Array, length: number, field: string): void {
  if (bytes.byteLength !== length) {
    throw new Error(`E-AUTH-006 ${field} must be ${length} bytes`);
  }
}

/** Insert the identity row; fails if an identity already exists. */
export async function createIdentity(db: HostDb, input: IdentityInput): Promise<LocalIdentity> {
  assertLength(input.siteId, 16, 'site_id');
  assertLength(input.identityPubkey, 32, 'identity_pubkey');
  assertLength(input.keyAgreementPubkey, 32, 'key_agreement_pubkey');
  assertLength(input.hkdfSalt, 32, 'hkdf_salt');
  assertLength(input.deviceSignPubkey, 32, 'device_sign_pubkey');
  assertLength(input.deviceEcdhPubkey, 32, 'device_ecdh_pubkey');
  const existing = await db.select<{ id: string }>('SELECT id FROM local_identity LIMIT 1');
  if (existing.length > 0) {
    throw new Error('E-AUTH-006 identity already exists; reset explicitly to replace it');
  }
  const now = input.nowMs ?? Date.now();
  const id = uuidv7(now);
  await db.exec(
    `INSERT INTO local_identity
       (id, site_id, identity_pubkey, key_agreement_pubkey, hkdf_salt, device_sign_pubkey,
        device_ecdh_pubkey, device_cert, device_cert_expires_ms, display_name, recovery_hint, created_at_ms)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.siteId,
      input.identityPubkey,
      input.keyAgreementPubkey,
      input.hkdfSalt,
      input.deviceSignPubkey,
      input.deviceEcdhPubkey,
      input.deviceCert ?? null,
      input.deviceCertExpiresMs ?? null,
      input.displayName ?? null,
      input.recoveryHint ?? null,
      now,
    ],
  );
  return {
    id,
    siteId: input.siteId,
    identityPubkey: input.identityPubkey,
    keyAgreementPubkey: input.keyAgreementPubkey,
    hkdfSalt: input.hkdfSalt,
    deviceSignPubkey: input.deviceSignPubkey,
    deviceEcdhPubkey: input.deviceEcdhPubkey,
    deviceCert: input.deviceCert ?? null,
    deviceCertExpiresMs: input.deviceCertExpiresMs ?? null,
    displayName: input.displayName ?? null,
    recoveryHint: input.recoveryHint ?? null,
    createdAtMs: now,
  };
}

export async function loadIdentity(db: HostDb): Promise<LocalIdentity | null> {
  const rows = await db.select<IdentityRow>('SELECT * FROM local_identity LIMIT 1');
  return rows[0] ? toIdentity(rows[0]) : null;
}

export async function setRecoveryHint(db: HostDb, hint: string): Promise<void> {
  const changed = await db.exec('UPDATE local_identity SET recovery_hint = ?', [hint]);
  if (changed === 0) throw new Error('E-AUTH-006 identity missing');
}

export async function setDeviceCert(
  db: HostDb,
  cert: Uint8Array,
  expiresAtMs: number,
): Promise<void> {
  const changed = await db.exec('UPDATE local_identity SET device_cert = ?, device_cert_expires_ms = ?', [
    cert,
    expiresAtMs,
  ]);
  if (changed === 0) throw new Error('E-AUTH-006 identity missing');
}

/** Explicit identity reset; callers MUST export data first. */
export async function resetIdentity(db: HostDb): Promise<void> {
  await db.exec('DELETE FROM local_identity');
}
