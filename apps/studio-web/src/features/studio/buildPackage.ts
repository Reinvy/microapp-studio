/**
 * `.mapp` v2 authoring for the builder.
 *
 * Sequence (mirrors the documented packer):
 *   1. `mapp_prepare_v2` → manifest with `integrity.contentHash` + the signature message;
 *   2. `identity_sign_message` → base64 Ed25519 signature over the JCS bytes;
 *   3. `mapp_finalize_v2` → deterministic ZIP with the manifest and detached signature.
 *
 * The bundle is a tiny ES module that renders the document root, so an installed
 * package runs in the same sandbox as any other micro-app.
 */

import { createCoreClient, coreWasmUrl, loadCoreWasm, type MuipNode } from '@microapp/runtime-web';
import type { IdentityService } from '@/features/identity/identityService';
import { loadIdentity, type LocalIdentity } from '@/db/repositories/identity';
import type { WorkerHostDb } from '@/db/client';
import { loadIdentitySecret } from '@/features/identity/secureStore';
import { bytesToBase64, sha256Hex } from '@/lib/bytes';
import type { StudioDocument } from './types';

/** `studio.p` + 12 lowercase hex characters derived from the project id. */
export function manifestIdFor(projectId: string): string {
  const hex = projectId.replace(/-/g, '').toLowerCase().replace(/[^0-9a-f]/g, '').slice(0, 12);
  return `studio.p${hex.padEnd(12, '0')}`;
}

export const SEMVER = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/;

export function isValidVersion(version: string): boolean {
  return SEMVER.test(version);
}

/** The packaged root always carries the desktop (base) props. */
export function packageRoot(document: StudioDocument): MuipNode {
  return document.nodes[0];
}

/** The bundle source: one ES module that renders the root node. */
export function bundleSource(root: MuipNode): string {
  return `export async function mount(api) {\n  api.render(${JSON.stringify(root)});\n}\n`;
}

export interface BuildPackageInput {
  db: WorkerHostDb;
  identity: LocalIdentity;
  service: IdentityService;
  document: StudioDocument;
  name: string;
  version: string;
  permissions: string[];
  projectId: string;
}

export interface BuiltPackage {
  bytes: Uint8Array;
  manifestJson: string;
  checksum: string;
  size: number;
  keyId: string;
}

export async function buildPackage(input: BuildPackageInput): Promise<BuiltPackage> {
  if (!isValidVersion(input.version)) throw new Error('E-PACK-001 version must be MAJOR.MINOR.PATCH');

  const phrase = await loadIdentitySecret();
  if (!phrase) throw new Error('E-PACK-002 signing key is unavailable; secure your recovery phrase first');

  const freshIdentity = await loadIdentity(input.db);
  if (!freshIdentity) throw new Error('E-PACK-002 local identity is unavailable');
  const hkdfSaltHex = toHex(freshIdentity.hkdfSalt);

  const publicKeyHex = await input.service.publicIdentity({ phrase, passphrase: '', hkdfSaltHex });
  const root = packageRoot(input.document);
  const source = bundleSource(root);
  const bundleBytes = new TextEncoder().encode(source);
  const bundleHash = await sha256Hex(bundleBytes);

  const entries = [{ path: 'bundle/index.js', isDir: false, dataBase64: bytesToBase64(bundleBytes) }];
  const manifest = {
    schemaVersion: 2,
    id: manifestIdFor(input.projectId),
    name: input.name.trim().slice(0, 80),
    version: input.version,
    entry: { bundle: 'bundle/index.js' },
    assetsDir: 'assets/',
    integrity: { algorithm: 'sha256', contentHash: '', files: { 'bundle/index.js': bundleHash } },
    signature: { algorithm: 'ed25519', keyId: `ed25519:${publicKeyHex}`, value: '' },
    offline: true,
    permissions: input.permissions,
    networkAllowlist: [] as string[],
    capabilities: ['ui.muip', 'storage.app'],
    ui: { engine: 'muip-web', protocol: 1 },
  };

  const core = createCoreClient(await loadCoreWasm(coreWasmUrl()));
  const prepared = JSON.parse(
    await core.prepareV2(JSON.stringify(manifest), JSON.stringify(entries)),
  ) as { manifestJson: string; signatureMessageBase64: string };

  const signatureBase64 = await input.service.signIdentityMessage({
    phrase,
    passphrase: '',
    hkdfSaltHex,
    messageBase64: prepared.signatureMessageBase64,
  });

  const bytes = await core.finalizeV2(prepared.manifestJson, JSON.stringify(entries), signatureBase64, publicKeyHex);
  const checksum = await sha256Hex(bytes);
  return {
    bytes,
    manifestJson: prepared.manifestJson,
    checksum,
    size: bytes.byteLength,
    keyId: `ed25519:${publicKeyHex}`,
  };
}

function toHex(bytes: Uint8Array): string {
  let out = '';
  for (const byte of bytes) out += byte.toString(16).padStart(2, '0');
  return out;
}
