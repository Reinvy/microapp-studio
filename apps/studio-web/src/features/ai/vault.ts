/**
 * BYOK key storage.
 *
 * The API key never leaves the vault: it is sealed with the vault key into
 * `vault_items` (kind `api_key`, label `AI API key`) under the documented AAD,
 * and only the last four characters are mirrored into preferences for display.
 *
 * Saving requires a wrapped vault key (PIN >= 6 characters); reading requires an
 * unlock. Nothing here logs the key or returns it to a caller that only needs to
 * know it exists.
 */

import type { WorkerHostDb } from '@/db/client';
import {
  activeKeyWrap,
  createVaultItem,
  listVaultItems,
  saveKeyWrap,
  softDeleteVaultItem,
  type ActiveKeyWrap,
  type VaultItem,
} from '@/db/repositories/vault';
import { loadIdentity } from '@/db/repositories/identity';
import { vaultApi, type IdentityService, type VaultServiceApi } from '@/features/identity/identityService';
import { loadIdentitySecret } from '@/features/identity/secureStore';
import { bytesToHex, hexToBytes } from '@/lib/bytes';

export const AI_VAULT_LABEL = 'AI API key';
export const MIN_PIN_LENGTH = 6;

const AAD = {
  recordType: 'vault_item',
  recordId: 'settings.ai.api_key',
  schemaVersion: 1,
} as const;

export interface AiKeyStatus {
  configured: boolean;
  last4: string;
  vaultWrapped: boolean;
  vaultUnlocked: boolean;
}

function vaultOf(service: IdentityService): VaultServiceApi {
  return vaultApi(service);
}

/** Does a wrap exist and is the vault currently unlocked? */
export async function aiKeyStatus(
  db: WorkerHostDb,
  workspaceId: string,
  service: IdentityService | null,
): Promise<AiKeyStatus> {
  const wrap = await activeKeyWrap(db, workspaceId);
  const items = await listVaultItems(db, workspaceId);
  const item = items.find((candidate) => candidate.kind === 'api_key' && candidate.label === AI_VAULT_LABEL);
  let unlocked = false;
  if (service) {
    try {
      unlocked = (await vaultOf(service).status()).unlocked;
    } catch {
      unlocked = false;
    }
  }
  return {
    configured: item !== undefined,
    last4: '',
    vaultWrapped: wrap !== null,
    vaultUnlocked: unlocked,
  };
}

export interface SaveKeyInput {
  db: WorkerHostDb;
  workspaceId: string;
  service: IdentityService;
  apiKey: string;
  pin: string;
}

/**
 * Seal and store the key.
 * The first save also wraps the vault key; later saves reuse the existing wrap.
 * Returns the last four characters for display only.
 */
export async function saveAiKey(input: SaveKeyInput): Promise<{ last4: string }> {
  const key = input.apiKey.trim();
  if (key.length < 8) throw new Error('E-CREATE-002 AI key is too short');
  if (input.pin.length < MIN_PIN_LENGTH) throw new Error('E-SET-001 PIN must be at least 6 characters');

  const identity = await loadIdentity(input.db);
  if (!identity) throw new Error('E-SHELL-002 identity is unavailable');

  const vault = vaultOf(input.service);
  const existingWrap = await activeKeyWrap(input.db, input.workspaceId);
  if (!existingWrap) {
    const phrase = await loadIdentitySecret();
    if (!phrase) throw new Error('E-AUTH-001 recovery phrase is unavailable');
    const blob = await vault.wrap(input.pin, {
      siteId: bytesToHex(identity.siteId),
      siteIdBase32: '',
      hkdfSalt: bytesToHex(identity.hkdfSalt),
      identityPubkey: bytesToHex(identity.identityPubkey),
      deviceSignPubkey: bytesToHex(identity.deviceSignPubkey),
      deviceEcdhPubkey: bytesToHex(identity.deviceEcdhPubkey),
    }, phrase, '');
    await saveKeyWrap(input.db, { workspaceId: input.workspaceId, ...decodeWrapParams(blob) });
  }
  await unlockVault(input.db, input.workspaceId, input.service, input.pin);

  const sealed = await vault.seal(undefined, { ...AAD, siteId: bytesToHex(identity.siteId) }, key);
  const previous = (await listVaultItems(input.db, input.workspaceId)).filter(
    (item) => item.kind === 'api_key' && item.label === AI_VAULT_LABEL,
  );
  for (const item of previous) {
    await softDeleteVaultItem(input.db, input.workspaceId, item.id);
  }
  await createVaultItem(input.db, {
    workspaceId: input.workspaceId,
    kind: 'api_key',
    label: AI_VAULT_LABEL,
    envelope: sealed.envelope,
    keyId: sealed.keyId,
    nonce: sealed.nonce,
  });
  return { last4: key.slice(-4) };
}

export async function unlockVault(
  db: WorkerHostDb,
  workspaceId: string,
  service: IdentityService,
  pin: string,
): Promise<void> {
  const wrap = await activeKeyWrap(db, workspaceId);
  if (!wrap) throw new Error('E-AUTH-001 vault is not wrapped yet');
  if (pin.length < MIN_PIN_LENGTH) throw new Error('E-SET-001 PIN must be at least 6 characters');
  await vaultOf(service).unlock(pin, concatBytes(wrap.salt, wrap.nonce, wrap.wrappedKey));
}

export async function lockVault(service: IdentityService): Promise<void> {
  await vaultOf(service).lock();
}

/** Read the key for a request; requires an unlocked vault. */
export async function readAiKey(
  db: WorkerHostDb,
  workspaceId: string,
  service: IdentityService,
): Promise<string> {
  const identity = await loadIdentity(db);
  if (!identity) throw new Error('E-SHELL-002 identity is unavailable');
  const status = await vaultOf(service).status();
  if (!status.unlocked) throw new Error('E-AUTH-001 vault is locked');
  const items = await listVaultItems(db, workspaceId);
  const item = items.find((candidate) => candidate.kind === 'api_key' && candidate.label === AI_VAULT_LABEL);
  if (!item) throw new Error('E-CREATE-002 AI key is not configured');
  return vaultOf(service).open({ ...AAD, siteId: bytesToHex(identity.siteId) }, item.envelope);
}

export function keyItemId(items: VaultItem[]): string | null {
  return items.find((item) => item.kind === 'api_key' && item.label === AI_VAULT_LABEL)?.id ?? null;
}

/**
 * The worker returns one opaque blob laid out as `salt[16] | nonce[12] | wrapped`
 * with the documented Argon2id floor. Decoding lives here so no caller invents
 * its own layout.
 */
function decodeWrapParams(blob: Uint8Array): {
  kdf: 'argon2id';
  salt: Uint8Array;
  memoryKib: number;
  iterations: number;
  parallelism: number;
  nonce: Uint8Array;
  wrappedKey: Uint8Array;
} {
  if (blob.byteLength < 28 + 32) throw new Error('E-AUTH-001 vault wrap is malformed');
  return {
    kdf: 'argon2id',
    salt: blob.slice(0, 16),
    memoryKib: 65_536,
    iterations: 3,
    parallelism: 1,
    nonce: blob.slice(16, 28),
    wrappedKey: blob.slice(28),
  };
}

function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.byteLength, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.byteLength;
  }
  return out;
}

export type { ActiveKeyWrap };
export { hexToBytes };
