/**
 * Typed client for the Rust core compiled to WebAssembly.
 *
 * The generated bindings live in `packages/runtime-web/wasm` (gitignored,
 * produced by `npm run build:core`). When they are absent the client refuses to
 * start: the web runtime MUST NOT fall back to a TypeScript crypto or manifest
 * implementation.
 */

import { isRecord } from '../types/guards';
import type { CoreMappApi, InstallSourceName } from './mapp';

export interface DeviceCertRequest {
  phrase: string;
  passphrase: string;
  hkdfSaltHex: string;
  deviceSignPubkeyHex: string;
  deviceEcdhPubkeyHex: string;
  issuedAtMs: number;
  expiresAtMs: number;
  capabilities: string[];
}

export interface VaultSealRequest {
  phrase: string;
  passphrase: string;
  hkdfSaltHex: string;
  aadJson: string;
  plaintext: Uint8Array;
}

export interface VaultOpenRequest {
  phrase: string;
  passphrase: string;
  hkdfSaltHex: string;
  aadJson: string;
  envelope: Uint8Array;
}

export interface CoreClient extends CoreMappApi {
  manifestValidate(json: string): Promise<string>;
  identityCreate(): Promise<string>;
  identityRecover(
    phrase: string,
    passphrase: string,
    hkdfSaltHex: string,
    expectedPubkeyHex: string,
  ): Promise<string>;
  envelopeSeal(keyHex: string, label: string, aadJson: string, plaintext: Uint8Array): Promise<Uint8Array>;
  envelopeOpen(keyHex: string, label: string, aadJson: string, envelope: Uint8Array): Promise<Uint8Array>;
  auditHash(prevHashHex: string, seqId: number, payloadJson: string): Promise<string>;
  hlcTick(hlcJson: string, nowMs: number): Promise<string>;
  guardCheckSql(sql: string): Promise<void>;
  guardCheckPath(path: string): Promise<void>;
  guardCheckDomain(host: string): Promise<void>;
  sha256Hex(bytes: Uint8Array): Promise<string>;
  mnemonicValidate(phrase: string): Promise<void>;
  deviceCertCreate(request: DeviceCertRequest): Promise<Uint8Array>;
  sealWithVaultKey(request: VaultSealRequest): Promise<Uint8Array>;
  openWithVaultKey(request: VaultOpenRequest): Promise<Uint8Array>;
  signWithSeed(seed: Uint8Array, digest: Uint8Array): Promise<Uint8Array>;
  publicFromSeed(seedHex: string): Promise<string>;
  vaultKeyWrap(request: { phrase: string; passphrase: string; hkdfSaltHex: string; pin: string }): Promise<Uint8Array>;
  vaultVerifyWrap(pin: string, blob: Uint8Array): Promise<boolean>;
  vaultSealWrapped(request: { pin: string; blob: Uint8Array; aadJson: string; plaintext: Uint8Array }): Promise<Uint8Array>;
  vaultOpenWrapped(request: { pin: string; blob: Uint8Array; aadJson: string; envelope: Uint8Array }): Promise<Uint8Array>;
}

export interface CoreWasmModule {
  /** wasm-bindgen `--target web` default export: initializes the wasm instance. */
  default(input?: unknown): Promise<unknown>;
  identity_create(): string;
  identity_recover(phrase: string, passphrase: string, salt: string, expected: string): string;
  envelope_seal_js(key: string, label: string, aad: string, plaintext: Uint8Array): Uint8Array;
  envelope_open_js(key: string, label: string, aad: string, envelope: Uint8Array): Uint8Array;
  manifest_validate(json: string): string;
  mapp_verify(bytes: Uint8Array, source: string, author: string, registry: string): string;
  mapp_extract_entries(bytes: Uint8Array): string;
  audit_hash_js(prev: string, seq: number, payload: string): string;
  hlc_tick(json: string, nowMs: number): string;
  guard_check_sql(sql: string): void;
  guard_check_path(path: string): void;
  guard_check_domain(host: string): void;
  sha256_hex(bytes: Uint8Array): string;
  mnemonic_validate(phrase: string): string;
  device_cert_create(
    phrase: string,
    passphrase: string,
    hkdfSaltHex: string,
    deviceSignPubkeyHex: string,
    deviceEcdhPubkeyHex: string,
    issuedAtMs: number,
    expiresAtMs: number,
    capabilitiesJson: string,
  ): Uint8Array;
  vault_seal(phrase: string, passphrase: string, hkdfSaltHex: string, aadJson: string, plaintext: Uint8Array): Uint8Array;
  vault_open(phrase: string, passphrase: string, hkdfSaltHex: string, aadJson: string, envelope: Uint8Array): Uint8Array;
  ed25519_sign_seed(seedHex: string, digest: Uint8Array): Uint8Array;
  ed25519_public_seed(seedHex: string): string;
  vault_key_wrap(phrase: string, passphrase: string, hkdfSaltHex: string, pin: string): Uint8Array;
  vault_verify_wrap(pin: string, blob: Uint8Array): boolean;
  vault_seal_wrapped(pin: string, blob: Uint8Array, aadJson: string, plaintext: Uint8Array): Uint8Array;
  vault_open_wrapped(pin: string, blob: Uint8Array, aadJson: string, envelope: Uint8Array): Uint8Array;
}

/**
 * URL of the generated `microapp_core.js` loader.
 *
 * `npm run build:core` copies the wasm-bindgen output into the host's static
 * directory, so hosts serve it from `/wasm/`. The path is a plain string (not a
 * bundler-resolved `new URL`) because the artifacts do not exist at author time.
 */
export function coreWasmUrl(path = '/wasm/microapp_core.js'): string {
  return path;
}

const REQUIRED_EXPORTS: Array<keyof CoreWasmModule> = [
  'default',
  'identity_create',
  'identity_recover',
  'envelope_seal_js',
  'envelope_open_js',
  'manifest_validate',
  'mapp_verify',
  'mapp_extract_entries',
  'audit_hash_js',
  'hlc_tick',
  'guard_check_sql',
  'guard_check_path',
  'guard_check_domain',
  'sha256_hex',
  'mnemonic_validate',
  'device_cert_create',
  'vault_seal',
  'vault_open',
  'ed25519_sign_seed',
  'ed25519_public_seed',
  'vault_key_wrap',
  'vault_verify_wrap',
  'vault_seal_wrapped',
  'vault_open_wrapped',
];

function hexFromBytes(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function assertModule(module: unknown): CoreWasmModule {
  if (!isRecord(module)) {
    throw new Error('core wasm module is not an object');
  }
  for (const name of REQUIRED_EXPORTS) {
    if (typeof module[name] !== 'function') {
      throw new Error(`core wasm module is missing export ${name}`);
    }
  }
  return module as unknown as CoreWasmModule;
}

/**
 * Load the generated wasm bindings.
 *
 * `specifier` is a variable so bundlers keep it external; the caller supplies
 * the real URL of `microapp_core.js` (or an injected loader in tests).
 */
export async function loadCoreWasm(
  specifier: string | (() => Promise<unknown>),
  wasmInput?: unknown,
): Promise<CoreWasmModule> {
  const loaded =
    typeof specifier === 'function'
      ? await specifier()
      : // Runtime-selected URL: the generated bindings are produced by
        // `build:core`, so bundlers must leave this import alone.
        await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ /* @vite-ignore */ specifier);
  const module = assertModule(loaded);
  await module.default(wasmInput);
  return module;
}

/** Wrap the raw module in the typed client used by the host. */
export function createCoreClient(module: CoreWasmModule): CoreClient {
  return {
    async verify(bytes, source, authorPubkeyHex, registryPubkeyHex) {
      return module.mapp_verify(bytes, source satisfies InstallSourceName, authorPubkeyHex, registryPubkeyHex);
    },
    async extractEntries(bytes) {
      return module.mapp_extract_entries(bytes);
    },
    async manifestValidate(json) {
      return module.manifest_validate(json);
    },
    async identityCreate() {
      return module.identity_create();
    },
    async identityRecover(phrase, passphrase, hkdfSaltHex, expectedPubkeyHex) {
      return module.identity_recover(phrase, passphrase, hkdfSaltHex, expectedPubkeyHex);
    },
    async envelopeSeal(keyHex, label, aadJson, plaintext) {
      return module.envelope_seal_js(keyHex, label, aadJson, plaintext);
    },
    async envelopeOpen(keyHex, label, aadJson, envelope) {
      return module.envelope_open_js(keyHex, label, aadJson, envelope);
    },
    async auditHash(prevHashHex, seqId, payloadJson) {
      return module.audit_hash_js(prevHashHex, seqId, payloadJson);
    },
    async hlcTick(hlcJson, nowMs) {
      return module.hlc_tick(hlcJson, nowMs);
    },
    async guardCheckSql(sql) {
      module.guard_check_sql(sql);
    },
    async guardCheckPath(path) {
      module.guard_check_path(path);
    },
    async guardCheckDomain(host) {
      module.guard_check_domain(host);
    },
    async sha256Hex(bytes) {
      return module.sha256_hex(bytes);
    },
    async mnemonicValidate(phrase) {
      module.mnemonic_validate(phrase);
    },
    async deviceCertCreate(request) {
      return module.device_cert_create(
        request.phrase,
        request.passphrase,
        request.hkdfSaltHex,
        request.deviceSignPubkeyHex,
        request.deviceEcdhPubkeyHex,
        request.issuedAtMs,
        request.expiresAtMs,
        JSON.stringify(request.capabilities),
      );
    },
    async sealWithVaultKey(request) {
      return module.vault_seal(
        request.phrase,
        request.passphrase,
        request.hkdfSaltHex,
        request.aadJson,
        request.plaintext,
      );
    },
    async openWithVaultKey(request) {
      return module.vault_open(
        request.phrase,
        request.passphrase,
        request.hkdfSaltHex,
        request.aadJson,
        request.envelope,
      );
    },
    async signWithSeed(seed, digest) {
      return module.ed25519_sign_seed(hexFromBytes(seed), digest);
    },
    async publicFromSeed(seedHex) {
      return module.ed25519_public_seed(seedHex);
    },
    async vaultKeyWrap(request) {
      return module.vault_key_wrap(request.phrase, request.passphrase, request.hkdfSaltHex, request.pin);
    },
    async vaultVerifyWrap(pin, blob) {
      return module.vault_verify_wrap(pin, blob);
    },
    async vaultSealWrapped(request) {
      return module.vault_seal_wrapped(request.pin, request.blob, request.aadJson, request.plaintext);
    },
    async vaultOpenWrapped(request) {
      return module.vault_open_wrapped(request.pin, request.blob, request.aadJson, request.envelope);
    },
  };
}
