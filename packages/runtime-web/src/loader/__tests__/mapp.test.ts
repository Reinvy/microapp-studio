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

async function sha384Base64(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-384', bytes.slice().buffer);
  return base64(new Uint8Array(digest));
}

async function fakeCore(bundle: Uint8Array, integrity?: string): Promise<CoreMappApi> {
  const resolvedIntegrity = integrity ?? `sha384-${await sha384Base64(bundle)}`;
  const entries: MappEntryData[] = [
    { path: 'dist/app.bundle.js', isDir: false, dataBase64: base64(bundle) },
    { path: 'assets/icon.txt', isDir: false, dataBase64: base64(new TextEncoder().encode('icon')) },
    { path: 'db/migrations/', isDir: true, dataBase64: '' },
  ];
  const manifest = {
    id: 'org.reinvy.kas',
    version: '1.3.0',
    contentHash: `sha256-${'0'.repeat(64)}`,
    minHostVersion: '2.0.0',
    runtime: { maxMemoryMb: 128, secureDisplay: false },
    entry: {
      bundle: 'dist/app.bundle.js',
      assetsDir: 'assets/',
      integrity: resolvedIntegrity,
      signature: 'ed25519-abcdef0123456789',
    },
    permissions: { required: ['storage.local.sqlite'], optional: [], networkAllowlist: [] },
  };
  return {
    async verify() {
      return JSON.stringify({ manifest, digest: 'a'.repeat(64) });
    },
    async extractEntries() {
      return JSON.stringify(entries);
    },
  };
}

describe('mapp loader', () => {
  it('verifies, extracts, and checks bundle integrity', async () => {
    const bundle = new TextEncoder().encode('globalThis.__mapp = {};');
    const pkg = await verifyPackage(await fakeCore(bundle), new Uint8Array([1, 2, 3]), 'local', {
      authorPubkeyHex: 'f'.repeat(64),
    });
    expect(pkg.manifest.id).toBe('org.reinvy.kas');
    expect(pkg.entries).toHaveLength(3);
    expect(new TextDecoder().decode(pkg.bundleBytes)).toContain('__mapp');
  });

  it('rejects a bundle whose sha384 does not match', async () => {
    const bundle = new TextEncoder().encode('tampered');
    await expect(
      verifyPackage(await fakeCore(bundle, `sha384-${'A'.repeat(64)}`), new Uint8Array([1]), 'local'),
    ).rejects.toMatchObject({ code: 'E-SBX-007' });
  });

  it('maps verifier failures to catalog codes', async () => {
    const failing: CoreMappApi = {
      async verify() {
        throw new Error('E-REG-001|signature invalid');
      },
      async extractEntries() {
        return '[]';
      },
    };
    await expect(verifyPackage(failing, new Uint8Array([0]), 'registry')).rejects.toMatchObject({
      code: 'E-REG-001',
    });
  });

  it('builds safe install prefixes and rejects invalid ids', () => {
    expect(installPrefix('org.reinvy.kas', '1.3.0')).toBe('apps/org.reinvy.kas/1.3.0/');
    expect(() => installPrefix('../evil', '1.0.0')).toThrow();
    expect(() => installPrefix('org.reinvy.kas', '../1.0.0')).toThrow();
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
    expect(result).toEqual({ files: 2, bytes: bundle.byteLength + 4 });
    expect(writes.map((write) => write.path)).toEqual([
      'apps/org.reinvy.kas/1.3.0/dist/app.bundle.js',
      'apps/org.reinvy.kas/1.3.0/assets/icon.txt',
    ]);
  });
});
