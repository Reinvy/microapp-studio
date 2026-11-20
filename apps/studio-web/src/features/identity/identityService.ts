/**
 * Main-thread identity service.
 *
 * Wraps the identity worker (key material stays inside it) and exposes the calls
 * the onboarding flow and vault need. No crypto is implemented here.
 */

import type { CreateIdentityResult, IdentityRecordDto, VaultAad, VaultSealResult, WorkerRequest, WorkerResponse } from './types';

const CALL_TIMEOUT_MS = 30_000;

export class IdentityService {
  private nextId = 1;
  private readonly pending = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();
  private readonly worker: Worker;

  constructor(worker: Worker) {
    this.worker = worker;
    this.worker.addEventListener('message', (event: MessageEvent<WorkerResponse>) => {
      const response = event.data;
      const entry = this.pending.get(response.id);
      if (!entry) return;
      this.pending.delete(response.id);
      if (response.ok) entry.resolve(response.result);
      else entry.reject(new Error(`${response.code} ${response.message}`));
    });
  }

  static spawn(): IdentityService {
    const worker = new Worker(new URL('./identity.worker.ts', import.meta.url), { type: 'module' });
    return new IdentityService(worker);
  }

  private request<T>(op: WorkerRequest['op'], payload: Record<string, unknown> = {}): Promise<T> {
    const id = this.nextId;
    this.nextId += 1;
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error('E-AUTH-006 identity worker timed out'));
      }, CALL_TIMEOUT_MS);
      this.pending.set(id, {
        resolve: (value) => {
          clearTimeout(timer);
          resolve(value as T);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      });
      this.worker.postMessage({ id, op, payload } satisfies WorkerRequest);
    });
  }

  create(): Promise<CreateIdentityResult> {
    return this.request<CreateIdentityResult>('create');
  }

  validateMnemonic(phrase: string): Promise<{ ok: boolean }> {
    return this.request('validateMnemonic', { phrase });
  }

  recover(phrase: string, record: IdentityRecordDto, passphrase = ''): Promise<{ identityPubkey: string }> {
    return this.request('recover', {
      phrase,
      passphrase,
      hkdfSalt: record.hkdfSalt,
      expectedPubkey: record.identityPubkey,
    });
  }

  async deviceCertificate(input: {
    phrase: string;
    passphrase: string;
    record: IdentityRecordDto;
    nowMs?: number;
    validityDays?: number;
  }): Promise<Uint8Array> {
    const issuedAtMs = input.nowMs ?? Date.now();
    const expiresAtMs = issuedAtMs + (input.validityDays ?? 365) * 24 * 60 * 60 * 1000;
    const result = await this.request<{ certBase64: string }>('deviceCert', {
      phrase: input.phrase,
      passphrase: input.passphrase,
      hkdfSalt: input.record.hkdfSalt,
      deviceSignPubkey: input.record.deviceSignPubkey,
      deviceEcdhPubkey: input.record.deviceEcdhPubkey,
      issuedAtMs,
      expiresAtMs,
      capabilities: ['sync', 'pairing', 'vault'],
    });
    const binary = atob(result.certBase64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes;
  }

  sealVault(input: {
    phrase: string;
    passphrase: string;
    record: IdentityRecordDto;
    aad: VaultAad;
    plaintext: string;
  }): Promise<VaultSealResult> {
    return this.request('sealVault', {
      phrase: input.phrase,
      passphrase: input.passphrase,
      hkdfSalt: input.record.hkdfSalt,
      siteId: input.aad.siteId,
      recordType: input.aad.recordType,
      recordId: input.aad.recordId,
      schemaVersion: input.aad.schemaVersion,
      plaintext: input.plaintext,
    });
  }

  async openVault(input: {
    phrase: string;
    passphrase: string;
    record: IdentityRecordDto;
    aad: VaultAad;
    envelope: Uint8Array;
  }): Promise<string> {
    const binary = String.fromCharCode(...input.envelope);
    const result = await this.request<{ plaintext: string }>('openVault', {
      phrase: input.phrase,
      passphrase: input.passphrase,
      hkdfSalt: input.record.hkdfSalt,
      siteId: input.aad.siteId,
      recordType: input.aad.recordType,
      recordId: input.aad.recordId,
      schemaVersion: input.aad.schemaVersion,
      envelopeBase64: btoa(binary),
    });
    return result.plaintext;
  }

  async signDigest(seedHex: string, digest: Uint8Array): Promise<Uint8Array> {
    const binary = String.fromCharCode(...digest);
    const result = await this.request<{ signatureBase64: string }>('signDigest', {
      seedHex,
      digestBase64: btoa(binary),
    });
    const decoded = atob(result.signatureBase64);
    const bytes = new Uint8Array(decoded.length);
    for (let index = 0; index < decoded.length; index += 1) bytes[index] = decoded.charCodeAt(index);
    return bytes;
  }

  destroy(): void {
    this.worker.terminate();
  }
}

/** Vault operations exposed to the settings UI (key material stays in the worker). */
export interface VaultServiceApi {
  wrap(pin: string, record: IdentityRecordDto, phrase: string, passphrase?: string): Promise<Uint8Array>;
  unlock(pin: string, blob: Uint8Array): Promise<void>;
  lock(): Promise<void>;
  status(): Promise<{ unlocked: boolean }>;
  seal(pinUnused: undefined, aad: VaultAad, plaintext: string): Promise<VaultSealResult>;
  open(aad: VaultAad, envelope: Uint8Array): Promise<string>;
}

export function vaultApi(service: IdentityService): VaultServiceApi {
  return {
    async wrap(pin, record, phrase, passphrase = '') {
      const result = await service['request']<{ blob: Uint8Array }>('vaultWrap', {
        pin,
        hkdfSalt: record.hkdfSalt,
        phrase,
        passphrase,
      });
      return result.blob;
    },
    async unlock(pin, blob) {
      await service['request']('vaultUnlock', { pin, blob });
    },
    async lock() {
      await service['request']('vaultLock');
    },
    status() {
      return service['request']<{ unlocked: boolean }>('vaultStatus');
    },
    async seal(_unused, aad, plaintext) {
      return service['request']<VaultSealResult>('vaultSealUnlocked', {
        siteId: aad.siteId,
        recordType: aad.recordType,
        recordId: aad.recordId,
        schemaVersion: aad.schemaVersion,
        plaintext,
      });
    },
    async open(aad, envelope) {
      const binary = String.fromCharCode(...envelope);
      const result = await service['request']<{ plaintext: string }>('vaultOpenUnlocked', {
        siteId: aad.siteId,
        recordType: aad.recordType,
        recordId: aad.recordId,
        schemaVersion: aad.schemaVersion,
        envelopeBase64: btoa(binary),
      });
      return result.plaintext;
    },
  };
}
