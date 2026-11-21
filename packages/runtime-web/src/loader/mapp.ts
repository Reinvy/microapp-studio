/**
 * `.mapp` verification and OPFS materialization.
 *
 * The loader never executes anything before `mapp_verify_v2` succeeds. The Rust
 * core owns every cryptographic check (per-file digests, contentHash, author and
 * optional registry signatures); this module only maps the verified manifest
 * into the typed shape the host consumes and extracts the bundle bytes.
 */

import { BridgeError } from '../bridge/errors';
import { isRecord } from '../types/guards';

export type InstallSourceName = 'local' | 'registry' | 'git' | 'enterprise';

export interface MappEntryData {
  path: string;
  isDir: boolean;
  dataBase64: string;
}

/** Manifest v2 as verified by the Rust core (`docs/03-specs/manifest.md`). */
export interface VerifiedManifest {
  schemaVersion: 2;
  id: string;
  name: string;
  version: string;
  entry: { bundle: string };
  assetsDir: string;
  integrity: { algorithm: 'sha256'; contentHash: string; files: Record<string, string> };
  signature: { algorithm: 'ed25519'; keyId: string; value: string };
  offline: boolean;
  permissions: string[];
  networkAllowlist: string[];
  capabilities: string[];
  ui: { engine: 'muip-web'; protocol: 1 };
}

export interface CoreMappApi {
  verify: (
    bytes: Uint8Array,
    source: InstallSourceName,
    authorPubkeyHex: string,
    registryPubkeyHex: string,
  ) => Promise<string>;
  extractEntries: (bytes: Uint8Array) => Promise<string>;
}

export interface VerifiedPackage {
  manifest: VerifiedManifest;
  digestHex: string;
  entries: MappEntryData[];
  bundleBytes: Uint8Array;
  authorSignature: Uint8Array | null;
}

export interface StorageWriter {
  write(path: string, bytes: Uint8Array): Promise<void>;
}

const ID_PATTERN = /^[a-z][a-z0-9]*(?:\.[a-z0-9]+){1,4}$/;
const VERSION_PATTERN = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/;

function invalid(reason: string): BridgeError {
  return new BridgeError('E-PACK-001', { reason });
}

function decodeBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string') throw invalid(field);
  return value;
}

function requireRecord(value: unknown, field: string): Record<string, unknown> {
  if (!isRecord(value)) throw invalid(field);
  return value;
}

function readManifest(raw: unknown): VerifiedManifest {
  const manifest = requireRecord(raw, 'manifest');
  if (manifest.schemaVersion !== 2) throw invalid('schemaVersion');

  const id = requireString(manifest.id, 'id');
  if (!ID_PATTERN.test(id)) throw invalid('id');
  const version = requireString(manifest.version, 'version');
  if (!VERSION_PATTERN.test(version)) throw invalid('version');

  const entry = requireRecord(manifest.entry, 'entry');
  const bundle = requireString(entry.bundle, 'entry.bundle');

  const integrity = requireRecord(manifest.integrity, 'integrity');
  if (integrity.algorithm !== 'sha256') throw invalid('integrity.algorithm');
  const contentHash = requireString(integrity.contentHash, 'integrity.contentHash');
  const filesRaw = requireRecord(integrity.files, 'integrity.files');
  const files: Record<string, string> = {};
  for (const [path, digest] of Object.entries(filesRaw)) {
    if (typeof digest !== 'string') throw invalid('integrity.files');
    files[path] = digest;
  }

  const signature = requireRecord(manifest.signature, 'signature');
  if (signature.algorithm !== 'ed25519') throw invalid('signature.algorithm');

  const ui = requireRecord(manifest.ui, 'ui');
  if (ui.engine !== 'muip-web' || ui.protocol !== 1) throw invalid('ui');

  return {
    schemaVersion: 2,
    id,
    name: requireString(manifest.name, 'name'),
    version,
    entry: { bundle },
    assetsDir:
      typeof manifest.assetsDir === 'string' ? manifest.assetsDir : 'assets/',
    integrity: { algorithm: 'sha256', contentHash, files },
    signature: {
      algorithm: 'ed25519',
      keyId: requireString(signature.keyId, 'signature.keyId'),
      value: requireString(signature.value, 'signature.value'),
    },
    offline: manifest.offline === true,
    permissions: asStringArray(manifest.permissions),
    networkAllowlist: asStringArray(manifest.networkAllowlist),
    capabilities: asStringArray(manifest.capabilities),
    ui: { engine: 'muip-web', protocol: 1 },
  };
}

/** Verify signature/contentHash, then extract entries via the Rust core. */
export async function verifyPackage(
  core: CoreMappApi,
  bytes: Uint8Array,
  source: InstallSourceName,
  keys: { authorPubkeyHex?: string; registryPubkeyHex?: string } = {},
): Promise<VerifiedPackage> {
  let verifyJson: string;
  try {
    verifyJson = await core.verify(bytes, source, keys.authorPubkeyHex ?? '', keys.registryPubkeyHex ?? '');
  } catch (error) {
    throw toPackageError(error);
  }
  const verified: unknown = JSON.parse(verifyJson);
  if (!isRecord(verified)) throw invalid('verifier_response_invalid');
  const digestHex = requireString(verified.digest, 'digest');
  const manifest = readManifest(verified.manifest);

  let entriesJson: string;
  try {
    entriesJson = await core.extractEntries(bytes);
  } catch (error) {
    throw toPackageError(error);
  }
  const rawEntries: unknown = JSON.parse(entriesJson);
  if (!Array.isArray(rawEntries)) throw invalid('entries_invalid');
  const entries: MappEntryData[] = rawEntries.map((item) => {
    if (!isRecord(item) || typeof item.path !== 'string') throw invalid('entry_invalid');
    return {
      path: item.path,
      isDir: item.isDir === true,
      dataBase64: typeof item.dataBase64 === 'string' ? item.dataBase64 : '',
    };
  });

  const bundleEntry = entries.find(
    (candidate) => candidate.path === manifest.entry.bundle && !candidate.isDir,
  );
  if (!bundleEntry) throw invalid('bundle_missing');

  const authorSignature =
    typeof verified.authorSignatureBase64 === 'string' && verified.authorSignatureBase64.length > 0
      ? decodeBase64(verified.authorSignatureBase64)
      : null;

  return {
    manifest,
    digestHex,
    entries,
    bundleBytes: decodeBase64(bundleEntry.dataBase64),
    authorSignature,
  };
}

/**
 * Map a Rust error into the bridge catalog.
 *
 * wasm-bindgen throws the `Result`'s error as a plain `JsValue` string, so the
 * code must be read from `String(error)` as well as from `Error.message` —
 * otherwise every package failure collapses into `E-PACK-001`.
 */
function toPackageError(error: unknown): BridgeError {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  if (message.startsWith('E-PACK-002')) return new BridgeError('E-PACK-002');
  if (message.startsWith('E-PACK-003')) return new BridgeError('E-PACK-003');
  if (message.startsWith('E-PACK-001')) return new BridgeError('E-PACK-001', { reason: message.slice(0, 120) });
  return new BridgeError('E-PACK-001');
}

/**
 * Deterministic install path: `apps/<appId>/<version>/`. Writing outside this
 * prefix is rejected by the caller's OPFS guard.
 */
export function installPrefix(appId: string, version: string): string {
  if (!ID_PATTERN.test(appId) || !VERSION_PATTERN.test(version)) {
    throw new BridgeError('E-PACK-001', { reason: 'invalid_install_path' });
  }
  return `apps/${appId}/${version}/`;
}

/** Write every extracted file under the install prefix. */
export async function materialize(
  pkg: VerifiedPackage,
  writer: StorageWriter,
): Promise<{ files: number; bytes: number }> {
  const prefix = installPrefix(pkg.manifest.id, pkg.manifest.version);
  let files = 0;
  let bytes = 0;
  for (const entry of pkg.entries) {
    if (entry.isDir) continue;
    const data = decodeBase64(entry.dataBase64);
    await writer.write(`${prefix}${entry.path}`, data);
    files += 1;
    bytes += data.byteLength;
  }
  return { files, bytes };
}
