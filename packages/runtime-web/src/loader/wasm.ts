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
}

export interface CoreWasmModule {
  init(input?: unknown): Promise<unknown>;
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
}

/** URL of the generated `microapp_core.js` loader (built by `npm run build:core`). */
export function coreWasmUrl(): string {
  return new URL('../wasm/microapp_core.js', import.meta.url).href;
}

const REQUIRED_EXPORTS: Array<keyof CoreWasmModule> = [
  'init',
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
];

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
      : await import(/* @vite-ignore */ specifier);
  const module = assertModule(loaded);
  await module.init(wasmInput);
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
  };
}
