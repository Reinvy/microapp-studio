/**
 * Identity worker protocol.
 *
 * All key material, derivation, signing, and vault sealing happen inside this
 * worker. The main thread only ever receives public keys, signatures, or the
 * plaintext it explicitly asked to decrypt.
 */

export interface IdentityRecordDto {
  siteId: string;
  siteIdBase32: string;
  hkdfSalt: string;
  identityPubkey: string;
  deviceSignPubkey: string;
  deviceEcdhPubkey: string;
}

export interface CreateIdentityResult {
  mnemonic: string;
  record: IdentityRecordDto;
}

export interface VaultSealResult {
  envelope: Uint8Array;
  keyId: Uint8Array;
  nonce: Uint8Array;
}

export interface WorkerRequest {
  id: number;
  op:
    | 'create'
    | 'recover'
    | 'deviceCert'
    | 'sealVault'
    | 'openVault'
    | 'signDigest'
    | 'publicFromSeed'
    | 'publicIdentity'
    | 'signIdentityMessage'
    | 'validateMnemonic'
    | 'vaultWrap'
    | 'vaultUnlock'
    | 'vaultLock'
    | 'vaultStatus'
    | 'vaultSealUnlocked'
    | 'vaultOpenUnlocked';
  payload?: Record<string, unknown>;
}

export type WorkerResponse =
  | { id: number; ok: true; result: unknown }
  | { id: number; ok: false; code: string; message: string };

export interface VaultAad {
  siteId: string;
  recordType: string;
  recordId: string;
  schemaVersion: number;
}
