/**
 * `.mapp` verification and OPFS materialization.
 *
 * The loader never executes anything before `mapp_verify` succeeds. Entry
 * integrity (`entry.integrity`, SRI sha384) is re-checked on the extracted
 * bundle so a package cannot swap bytes between verification and install.
 */

import { BridgeError } from '../bridge/errors';
import { isRecord } from '../types/guards';

export type InstallSourceName = 'local' | 'registry' | 'git' | 'enterprise';

export interface MappEntryData {
  path: string;
  isDir: boolean;
  dataBase64: string;
}

export interface VerifiedManifest {
  id: string;
  version: string;
  contentHash: string;
  minHostVersion: string;
  runtime: { maxMemoryMb: number; secureDisplay?: boolean };
  entry: { bundle: string; assetsDir: string; integrity: string; signature: string };
  permissions: { required: string[]; optional: string[]; networkAllowlist: string[] };
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
}

export interface StorageWriter {
  write(path: string, bytes: Uint8Array): Promise<void>;
}

function decodeBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function base64FromBytes(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

async function sha384Base64(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-384', bytes.slice().buffer);
  return base64FromBytes(new Uint8Array(digest));
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
    throw toPackageError(error, 'E-REG-001');
  }
  const verified: unknown = JSON.parse(verifyJson);
  if (!isRecord(verified) || !isRecord(verified.manifest)) {
    throw new BridgeError('E-REG-003', { reason: 'verifier_response_invalid' });
  }
  const manifest = verified.manifest;
  if (
    typeof manifest.id !== 'string' ||
    typeof manifest.version !== 'string' ||
    typeof verified.digest !== 'string'
  ) {
    throw new BridgeError('E-REG-003', { reason: 'manifest_invalid' });
  }
  const entry = manifest.entry;
  const runtime = manifest.runtime;
  const permissions = manifest.permissions;
  if (!isRecord(entry) || !isRecord(runtime) || !isRecord(permissions)) {
    throw new BridgeError('E-REG-003', { reason: 'manifest_invalid' });
  }

  let entriesJson: string;
  try {
    entriesJson = await core.extractEntries(bytes);
  } catch (error) {
    throw toPackageError(error, 'E-REG-003');
  }
  const rawEntries: unknown = JSON.parse(entriesJson);
  if (!Array.isArray(rawEntries)) {
    throw new BridgeError('E-REG-003', { reason: 'entries_invalid' });
  }
  const entries: MappEntryData[] = rawEntries.map((item) => {
    if (!isRecord(item) || typeof item.path !== 'string') {
      throw new BridgeError('E-REG-003', { reason: 'entry_invalid' });
    }
    return {
      path: item.path,
      isDir: item.isDir === true,
      dataBase64: typeof item.dataBase64 === 'string' ? item.dataBase64 : '',
    };
  });

  const bundlePath = String(entry.bundle ?? '');
  const bundleEntry = entries.find((candidate) => candidate.path === bundlePath);
  if (!bundleEntry || bundleEntry.isDir) {
    throw new BridgeError('E-REG-003', { reason: 'bundle_missing' });
  }
  const bundleBytes = decodeBase64(bundleEntry.dataBase64);
  const integrity = String(entry.integrity ?? '');
  if (integrity.startsWith('sha384-')) {
    const actual = await sha384Base64(bundleBytes);
    if (`sha384-${actual}` !== integrity) {
      throw new BridgeError('E-SBX-007', { reason: 'bundle_integrity_mismatch' });
    }
  } else {
    throw new BridgeError('E-REG-003', { reason: 'integrity_unsupported' });
  }

  return {
    manifest: {
      id: manifest.id,
      version: manifest.version,
      contentHash: String(manifest.contentHash ?? ''),
      minHostVersion: String(manifest.minHostVersion ?? '2.0.0'),
      runtime: {
        maxMemoryMb: Number(runtime.maxMemoryMb ?? 128),
        secureDisplay: runtime.secureDisplay === true,
      },
      entry: {
        bundle: bundlePath,
        assetsDir: String(entry.assetsDir ?? 'assets/'),
        integrity,
        signature: String(entry.signature ?? ''),
      },
      permissions: {
        required: asStringArray(permissions.required),
        optional: asStringArray(permissions.optional),
        networkAllowlist: asStringArray(permissions.networkAllowlist),
      },
    },
    digestHex: verified.digest,
    entries,
    bundleBytes,
  };
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function toPackageError(error: unknown, fallback: 'E-REG-001' | 'E-REG-003'): BridgeError {
  if (error instanceof Error) {
    const message = error.message;
    if (message.startsWith('E-REG-001')) return new BridgeError('E-REG-001');
    if (message.startsWith('E-REG-002')) return new BridgeError('E-REG-003', { reason: 'key_changed' });
    if (message.startsWith('E-REG-003')) return new BridgeError('E-REG-003');
    if (message.startsWith('E-SBX-007')) return new BridgeError('E-SBX-007');
  }
  return new BridgeError(fallback);
}

/**
 * Deterministic install path: `apps/<appId>/<version>/`. Writing outside this
 * prefix is rejected by the caller's OPFS guard.
 */
export function installPrefix(appId: string, version: string): string {
  const safe = /^[a-z][a-z0-9]*(\.[a-z][a-z0-9-]*)+$/.test(appId);
  if (!safe || !/^[0-9]+\.[0-9]+\.[0-9]+/.test(version)) {
    throw new BridgeError('E-REG-003', { reason: 'invalid_install_path' });
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
