/**
 * Identity worker: the only place where key material is derived or used.
 *
 * The worker loads the Rust core (wasm-bindgen) and answers the operations in
 * `types.ts`. It never persists anything itself; `secureStore` on the main
 * thread keeps the encrypted recovery phrase.
 */

/// <reference lib="webworker" />

import { createCoreClient, coreWasmUrl, loadCoreWasm, type CoreClient } from '@microapp/runtime-web';
import type { WorkerRequest, WorkerResponse } from './types';

let corePromise: Promise<CoreClient> | null = null;

/** Vault auto-lock: the unlocked wrap is dropped after 5 idle minutes. */
const AUTO_LOCK_MS = 300_000;
let vaultSession: { blob: Uint8Array; pin: string; lastUsedMs: number } | null = null;

function vaultLocked(): boolean {
  if (!vaultSession) return true;
  if (Date.now() - vaultSession.lastUsedMs > AUTO_LOCK_MS) {
    vaultSession = null;
    return true;
  }
  return false;
}

function touchVault(): void {
  if (vaultSession) vaultSession.lastUsedMs = Date.now();
}

async function core(): Promise<CoreClient> {
  corePromise ??= (async () => {
    const coreModule = await loadCoreWasm(coreWasmUrl());
    return createCoreClient(coreModule);
  })();
  return corePromise;
}

function respond(response: WorkerResponse): void {
  (self as unknown as DedicatedWorkerGlobalScope).postMessage(response);
}

function bytesFromHex(hex: string): Uint8Array {
  if (!/^[0-9a-f]*$/.test(hex) || hex.length % 2 !== 0) {
    throw new Error('E-AUTH-001 invalid hex');
  }
  const out = new Uint8Array(hex.length / 2);
  for (let index = 0; index < out.length; index += 1) {
    out[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return out;
}

function base64FromBytes(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function bytesFromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const out = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) out[index] = binary.charCodeAt(index);
  return out;
}

async function handle(request: WorkerRequest): Promise<unknown> {
  const client = await core();
  const payload = request.payload ?? {};
  switch (request.op) {
    case 'create': {
      const raw = await client.identityCreate();
      return JSON.parse(raw) as unknown;
    }
    case 'recover': {
      const raw = await client.identityRecover(
        String(payload.phrase ?? ''),
        String(payload.passphrase ?? ''),
        String(payload.hkdfSalt ?? ''),
        String(payload.expectedPubkey ?? ''),
      );
      return JSON.parse(raw) as unknown;
    }
    case 'validateMnemonic': {
      await client.mnemonicValidate(String(payload.phrase ?? ''));
      return { ok: true };
    }
    case 'deviceCert': {
      const cert = await client.deviceCertCreate({
        phrase: String(payload.phrase ?? ''),
        passphrase: String(payload.passphrase ?? ''),
        hkdfSaltHex: String(payload.hkdfSalt ?? ''),
        deviceSignPubkeyHex: String(payload.deviceSignPubkey ?? ''),
        deviceEcdhPubkeyHex: String(payload.deviceEcdhPubkey ?? ''),
        issuedAtMs: Number(payload.issuedAtMs ?? Date.now()),
        expiresAtMs: Number(payload.expiresAtMs ?? Date.now()),
        capabilities: (payload.capabilities as string[]) ?? ['sync', 'pairing', 'vault'],
      });
      return { certBase64: base64FromBytes(cert) };
    }
    case 'sealVault': {
      const aadJson = JSON.stringify({
        siteId: String(payload.siteId ?? ''),
        recordType: String(payload.recordType ?? 'vault_item'),
        recordId: String(payload.recordId ?? ''),
        schemaVersion: Number(payload.schemaVersion ?? 1),
      });
      const envelope = await client.sealWithVaultKey({
        phrase: String(payload.phrase ?? ''),
        passphrase: String(payload.passphrase ?? ''),
        hkdfSaltHex: String(payload.hkdfSalt ?? ''),
        aadJson,
        plaintext: new TextEncoder().encode(String(payload.plaintext ?? '')),
      });
      const keyId = envelope.slice(1, 17);
      const nonce = envelope.slice(17, 29);
      return { envelope, keyId, nonce } satisfies { envelope: Uint8Array; keyId: Uint8Array; nonce: Uint8Array };
    }
    case 'openVault': {
      const aadJson = JSON.stringify({
        siteId: String(payload.siteId ?? ''),
        recordType: String(payload.recordType ?? 'vault_item'),
        recordId: String(payload.recordId ?? ''),
        schemaVersion: Number(payload.schemaVersion ?? 1),
      });
      const envelope = bytesFromBase64(String(payload.envelopeBase64 ?? ''));
      const plaintext = await client.openWithVaultKey({
        phrase: String(payload.phrase ?? ''),
        passphrase: String(payload.passphrase ?? ''),
        hkdfSaltHex: String(payload.hkdfSalt ?? ''),
        aadJson,
        envelope,
      });
      return { plaintext: new TextDecoder().decode(plaintext) };
    }
    case 'signDigest': {
      const seed = bytesFromHex(String(payload.seedHex ?? ''));
      const digest = bytesFromBase64(String(payload.digestBase64 ?? ''));
      const signature = await client.signWithSeed(seed, digest);
      return { signatureBase64: base64FromBytes(signature) };
    }
    case 'publicIdentity': {
      const publicKeyHex = await client.publicIdentity({
        phrase: String(payload.phrase ?? ''),
        passphrase: String(payload.passphrase ?? ''),
        hkdfSaltHex: String(payload.hkdfSaltHex ?? ''),
      });
      return { publicKeyHex };
    }
    case 'signIdentityMessage': {
      const signatureBase64 = await client.signIdentityMessage({
        phrase: String(payload.phrase ?? ''),
        passphrase: String(payload.passphrase ?? ''),
        hkdfSaltHex: String(payload.hkdfSaltHex ?? ''),
        messageBase64: String(payload.messageBase64 ?? ''),
      });
      return { signatureBase64 };
    }
    case 'publicFromSeed': {
      return JSON.parse(await client.publicFromSeed(String(payload.seedHex ?? ''))) as unknown;
    }
    case 'vaultWrap': {
      const blob = await client.vaultKeyWrap({
        phrase: String(payload.phrase ?? ''),
        passphrase: String(payload.passphrase ?? ''),
        hkdfSaltHex: String(payload.hkdfSalt ?? ''),
        pin: String(payload.pin ?? ''),
      });
      return { blob };
    }
    case 'vaultUnlock': {
      const pin = String(payload.pin ?? '');
      const blob = payload.blob as Uint8Array;
      const ok = await client.vaultVerifyWrap(pin, blob);
      if (!ok) throw new Error('E-AUTH-001 wrong PIN or corrupted key wrap');
      vaultSession = { blob, pin, lastUsedMs: Date.now() };
      return { unlocked: true };
    }
    case 'vaultLock': {
      vaultSession = null;
      return { unlocked: false };
    }
    case 'vaultStatus': {
      const locked = vaultLocked();
      return { unlocked: !locked };
    }
    case 'vaultSealUnlocked': {
      if (vaultLocked() || !vaultSession) throw new Error('E-AUTH-001 vault locked');
      touchVault();
      const aadJson = JSON.stringify({
        siteId: String(payload.siteId ?? ''),
        recordType: String(payload.recordType ?? 'vault_item'),
        recordId: String(payload.recordId ?? ''),
        schemaVersion: Number(payload.schemaVersion ?? 1),
      });
      const envelope = await client.vaultSealWrapped({
        pin: vaultSession.pin,
        blob: vaultSession.blob,
        aadJson,
        plaintext: new TextEncoder().encode(String(payload.plaintext ?? '')),
      });
      return {
        envelope,
        keyId: envelope.slice(1, 17),
        nonce: envelope.slice(17, 29),
      };
    }
    case 'vaultOpenUnlocked': {
      if (vaultLocked() || !vaultSession) throw new Error('E-AUTH-001 vault locked');
      touchVault();
      const aadJson = JSON.stringify({
        siteId: String(payload.siteId ?? ''),
        recordType: String(payload.recordType ?? 'vault_item'),
        recordId: String(payload.recordId ?? ''),
        schemaVersion: Number(payload.schemaVersion ?? 1),
      });
      const envelope = bytesFromBase64(String(payload.envelopeBase64 ?? ''));
      const plaintext = await client.vaultOpenWrapped({
        pin: vaultSession.pin,
        blob: vaultSession.blob,
        aadJson,
        envelope,
      });
      return { plaintext: new TextDecoder().decode(plaintext) };
    }
    default:
      throw new Error('E-DEV-001 unknown identity operation');
  }
}

self.addEventListener('message', (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;
  if (!request || typeof request.id !== 'number') return;
  void (async () => {
    try {
      const result = await handle(request);
      respond({ id: request.id, ok: true, result });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'identity worker failure';
      const code = /^E-[A-Z]+-\d{3}/.exec(message)?.[0] ?? 'E-AUTH-001';
      respond({ id: request.id, ok: false, code, message });
    }
  })();
});
