import { describe, expect, it } from 'vitest';
import {
  installPrefix,
  materialize,
  verifyPackage,
  type CoreMappApi,
  type MappEntryData,
} from '../mapp';

function base64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function manifest(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaVersion: 2,
    id: 'studio.p0123456789ab',
    name: 'Kasir Warung',
    version: '1.0.0',
    entry: { bundle: 'bundle/index.js' },
    assetsDir: 'assets/',
    integrity: {
      algorithm: 'sha256',
      contentHash: 'a'.repeat(64),
      files: { 'bundle/index.js': 'b'.repeat(64) },
    },
    signature: {
      algorithm: 'ed25519',
      keyId: `ed25519:${'c'.repeat(64)}`,
      value: base64(new Uint8Array(64).fill(1)),
    },
    offline: true,
    permissions: ['storage.app', 'network.fetch'],
    networkAllowlist: ['https://api.example.com'],
    capabilities: ['ui.muip', 'storage.app'],
    ui: { engine: 'muip-web', protocol: 1 },
    ...overrides,
  };
}

function fakeCore(
  bundle: Uint8Array,
  options: { manifest?: Record<string, unknown> } = {},
): CoreMappApi {
  const entries: MappEntryData[] = [
    { path: 'bundle/index.js', isDir: false, dataBase64: base64(bundle) },
    { path: 'assets/icon.txt', isDir: false, dataBase64: base64(new TextEncoder().encode('icon')) },
    { path: 'LICENSE', isDir: false, dataBase64: base64(new TextEncoder().encode('Apache-2.0')) },
  ];
  return {
    async verify() {
      return JSON.stringify({
        manifest: options.manifest ?? manifest(),
        digest: 'd'.repeat(64),
        authorPubkeyHex: 'c'.repeat(64),
        authorSignatureBase64: base64(new Uint8Array(64).fill(1)),
        entryCount: entries.length,
        decompressedBytes: 40,
      });
    },
    async extractEntries() {
      return JSON.stringify(entries);
    },
  };
}

describe('mapp loader', () => {
  it('verifies and maps the v2 manifest', async () => {
    const bundle = new TextEncoder().encode('globalThis.__mapp = {};');
    const pkg = await verifyPackage(await fakeCore(bundle), new Uint8Array([1, 2, 3]), 'local', {
      authorPubkeyHex: 'c'.repeat(64),
    });
    expect(pkg.manifest.schemaVersion).toBe(2);
    expect(pkg.manifest.id).toBe('studio.p0123456789ab');
    expect(pkg.manifest.entry.bundle).toBe('bundle/index.js');
    expect(pkg.manifest.permissions).toEqual(['storage.app', 'network.fetch']);
    expect(pkg.manifest.networkAllowlist).toEqual(['https://api.example.com']);
    expect(pkg.digestHex).toBe('d'.repeat(64));
    expect(pkg.entries).toHaveLength(3);
    expect(pkg.authorSignature).toHaveLength(64);
    expect(new TextDecoder().decode(pkg.bundleBytes)).toContain('__mapp');
  });

  it('rejects a v1 or malformed manifest', async () => {
    const bundle = new TextEncoder().encode('x');
    for (const overrides of [
      { schemaVersion: 1 },
      { integrity: { algorithm: 'sha384', contentHash: 'a'.repeat(64), files: {} } },
      { ui: { engine: 'hybrid-native', protocol: 1 } },
      { id: 'Org.Invalid' },
      { version: 'v1.0.0' },
    ]) {
      const core = fakeCore(bundle, { manifest: manifest(overrides) });
      await expect(verifyPackage(core, new Uint8Array([1]), 'local')).rejects.toMatchObject({
        code: 'E-PACK-001',
      });
    }
  });

  it('maps verifier failures to catalog codes', async () => {
    const cases: Array<[string, string]> = [
      ['E-PACK-002|author signature invalid', 'E-PACK-002'],
      ['E-PACK-003|digest mismatch', 'E-PACK-003'],
      ['E-PACK-001|layout invalid', 'E-PACK-001'],
    ];
    for (const [message, code] of cases) {
      const failing: CoreMappApi = {
        async verify() {
          throw new Error(message);
        },
        async extractEntries() {
          return '[]';
        },
      };
      await expect(verifyPackage(failing, new Uint8Array([0]), 'registry')).rejects.toMatchObject({
        code,
      });
    }
  });

  it('requires the declared bundle to be present', async () => {
    const core: CoreMappApi = {
      async verify() {
        return JSON.stringify({ manifest: manifest(), digest: 'd'.repeat(64) });
      },
      async extractEntries() {
        return JSON.stringify([{ path: 'assets/icon.txt', isDir: false, dataBase64: '' }]);
      },
    };
    await expect(verifyPackage(core, new Uint8Array([1]), 'local')).rejects.toMatchObject({
      code: 'E-PACK-001',
    });
  });

  it('builds safe install prefixes and rejects invalid ids', () => {
    expect(installPrefix('studio.p0123456789ab', '1.0.0')).toBe(
      'apps/studio.p0123456789ab/1.0.0/',
    );
    expect(() => installPrefix('../evil', '1.0.0')).toThrow();
    expect(() => installPrefix('studio.p0123456789ab', '../1.0.0')).toThrow();
  });

  it('writes every file under the install prefix', async () => {
    const bundle = new TextEncoder().encode('x');
    const pkg = await verifyPackage(await fakeCore(bundle), new Uint8Array([1]), 'local');
    const writes: Array<{ path: string; size: number }> = [];
    const result = await materialize(pkg, {
      async write(path, bytes) {
        writes.push({ path, size: bytes.byteLength });
      },
    });
    expect(result).toEqual({ files: 3, bytes: bundle.byteLength + 4 + 10 });
    expect(writes.map((write) => write.path)).toEqual([
      'apps/studio.p0123456789ab/1.0.0/bundle/index.js',
      'apps/studio.p0123456789ab/1.0.0/assets/icon.txt',
      'apps/studio.p0123456789ab/1.0.0/LICENSE',
    ]);
  });
});
