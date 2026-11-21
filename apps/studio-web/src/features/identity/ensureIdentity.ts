/**
 * Automatic local identity provisioning.
 *
 * The v3 shell never asks the user to create an identity: boot creates one so
 * Home is immediately usable, and the 24-word phrase is only revealed later
 * through `RecoverySheet`. The mnemonic is never rendered here and never logged;
 * it is handed straight to the encrypted secure store.
 *
 * `inFlight` is module-level on purpose: React StrictMode mounts effects twice in
 * development, and two concurrent creations would violate the single-identity
 * constraint in SQLite.
 */

import type { WorkerHostDb } from '@/db/client';
import { createIdentity, loadIdentity, setDeviceCert, type LocalIdentity } from '@/db/repositories/identity';
import { isDegraded, saveIdentitySecret } from '@/features/identity/secureStore';
import type { IdentityService } from '@/features/identity/identityService';
import { bytesToHex, hexToBytes } from '@/lib/bytes';

const DEVICE_CERT_VALIDITY_MS = 365 * 24 * 60 * 60 * 1000;

export interface EnsureIdentityOptions {
  /** Audit writer; failures must not abort identity creation. */
  audit?: (action: string, target?: string, metadata?: Record<string, unknown>) => Promise<void>;
  now?: () => number;
  service: IdentityService;
}

export interface EnsureIdentityResult {
  identity: LocalIdentity;
  /** True when key material is session-only, so recovery is mandatory after reload. */
  degraded: boolean;
  created: boolean;
}

let inFlight: Promise<EnsureIdentityResult> | null = null;

/** Drop the memoised promise; used after a failed attempt so retry works. */
export function resetEnsureIdentity(): void {
  inFlight = null;
}

export function ensureLocalIdentity(
  db: WorkerHostDb,
  options: EnsureIdentityOptions,
): Promise<EnsureIdentityResult> {
  if (!inFlight) {
    inFlight = run(db, options).finally(() => {
      // Keep the promise only while it is pending; later calls must re-check the DB
      // so a restore or reset is honoured without a full reload.
      inFlight = null;
    });
  }
  return inFlight;
}

async function run(db: WorkerHostDb, options: EnsureIdentityOptions): Promise<EnsureIdentityResult> {
  const existing = await loadIdentity(db);
  if (existing) {
    if (!existing.deviceCert) await issueCertificate(db, options, existing);
    return { identity: existing, degraded: isDegraded(), created: false };
  }

  const now = options.now ?? (() => Date.now());
  const created = await options.service.create();
  const record = created.record;
  const identity = await createIdentity(db, {
    siteId: hexToBytes(record.siteId),
    identityPubkey: hexToBytes(record.identityPubkey),
    keyAgreementPubkey: hexToBytes(record.deviceEcdhPubkey),
    hkdfSalt: hexToBytes(record.hkdfSalt),
    deviceSignPubkey: hexToBytes(record.deviceSignPubkey),
    deviceEcdhPubkey: hexToBytes(record.deviceEcdhPubkey),
    nowMs: now(),
  });

  await saveIdentitySecret(created.mnemonic);
  await issueCertificate(db, options, identity, created.mnemonic as string);
  await options.audit?.('identity.create', bytesToHex(identity.siteId), {
    siteIdBase32: record.siteIdBase32,
  });

  return { identity, degraded: isDegraded(), created: true };
}

async function issueCertificate(
  db: WorkerHostDb,
  options: EnsureIdentityOptions,
  identity: LocalIdentity,
  phrase?: string,
): Promise<void> {
  if (!phrase) return;
  const certificate = await options.service.deviceCertificate({
    phrase,
    passphrase: '',
    record: {
      siteId: bytesToHex(identity.siteId),
      siteIdBase32: '',
      hkdfSalt: bytesToHex(identity.hkdfSalt),
      identityPubkey: bytesToHex(identity.identityPubkey),
      deviceSignPubkey: bytesToHex(identity.deviceSignPubkey),
      deviceEcdhPubkey: bytesToHex(identity.deviceEcdhPubkey),
    },
  });
  await setDeviceCert(db, certificate, (options.now ?? (() => Date.now()))() + DEVICE_CERT_VALIDITY_MS);
}
