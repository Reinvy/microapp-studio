import { afterEach, describe, expect, it, vi } from 'vitest';
import type { VerifiedManifest, VerifiedPackage } from '@microapp/runtime-web';
import type { InstalledApp } from '@/db/repositories/apps';
import type { WorkerHostDb } from '@/db/client';
import type { InstallPlan } from '../packageService';
import type { IndexSource } from '../indexSource';
import { refreshSource } from '../indexSource';
import {
  ALWAYS_GRANTED_PERMISSION,
  approvedPermissionSet,
  initialPermissionSelection,
  installGate,
  inspectForImport,
  packageErrorCode,
  pendingVerificationRows,
  togglePermission,
  validatePackageKeys,
  validateSourceDraft,
  verificationRows,
  type AcknowledgeState,
  type ImportInspectDeps,
  type VerificationRow,
} from '../importFlow';

/**
 * Pure import decisions: verification rows, install gating, permission
 * approval, and source-form validation. The host and `fetch` are mocks, so a
 * regression in "never install automatically / never fetch while validating"
 * fails here instead of in a browser.
 */

const AUTHOR_KEY = 'a'.repeat(64);
const OTHER_KEY = 'c'.repeat(64);
const CONTENT_HASH = 'b'.repeat(64);
const SIGNATURE_B64 = Buffer.alloc(64).toString('base64');

const MANIFEST: VerifiedManifest = {
  schemaVersion: 2,
  id: 'studio.kasir',
  name: 'Kasir Warung',
  version: '1.1.0',
  entry: { bundle: 'bundle/index.js' },
  assetsDir: 'assets/',
  integrity: {
    algorithm: 'sha256',
    contentHash: CONTENT_HASH,
    files: { 'bundle/index.js': 'e'.repeat(64) },
  },
  signature: { algorithm: 'ed25519', keyId: `ed25519:${AUTHOR_KEY}`, value: SIGNATURE_B64 },
  offline: true,
  permissions: ['storage.app', 'network.fetch'],
  networkAllowlist: ['https://api.example.com'],
  capabilities: ['ui.muip', 'storage.app'],
  ui: { engine: 'muip-web', protocol: 1 },
};

function packageFixture(overrides: Partial<VerifiedManifest> = {}): VerifiedPackage {
  const manifest: VerifiedManifest = { ...MANIFEST, ...overrides };
  return {
    manifest,
    digestHex: manifest.integrity.contentHash,
    entries: [],
    bundleBytes: new Uint8Array(0),
    authorSignature: new Uint8Array(64),
  };
}

function installedApp(overrides: Partial<InstalledApp> = {}): InstalledApp {
  return {
    id: 'install-1',
    workspaceId: 'ws-1',
    appId: 'studio.kasir',
    displayName: null,
    name: 'Kasir Warung',
    version: '1.0.0',
    manifestJson: JSON.stringify({ ...MANIFEST, version: '1.0.0' }),
    contentHash: new Uint8Array(32),
    signature: new Uint8Array(64),
    authorKeyFingerprint: `ed25519:${AUTHOR_KEY}`,
    installSource: 'local',
    bundlePath: 'apps/ws-1/studio.kasir/1.0.0',
    packagePath: null,
    state: 'installed',
    pinnedVersion: null,
    updateMode: 'manual',
    previousVersion: null,
    pinned: false,
    installedAtMs: 1_700_000_000_000,
    lastLaunchedAtMs: null,
    ...overrides,
  };
}

function deps(
  inspectPackage: ImportInspectDeps['inspectPackage'],
  existing: InstalledApp | null = null,
): ImportInspectDeps {
  return { inspectPackage, findExisting: () => existing };
}

const file = (): File => new File([new Uint8Array(8)], 'kasir.mapp');

const NO_ACK: AcknowledgeState = { keyChange: false, downgrade: false };

function gateFor(
  pkg: VerifiedPackage,
  rows: VerificationRow[],
  plan: InstallPlan | null,
  acknowledge: AcknowledgeState = NO_ACK,
) {
  const declared = pkg.manifest.permissions;
  return installGate({
    rows,
    plan,
    acknowledge,
    declaredPermissions: declared,
    approvedPermissions: approvedPermissionSet(declared, initialPermissionSelection(declared)),
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('verification rows', () => {
  it('passes manifest, signature, and digest for a verified package', () => {
    const pkg = packageFixture();
    expect(verificationRows(pkg, null)).toEqual([
      { key: 'manifest', state: 'pass', code: null },
      { key: 'signature', state: 'pass', code: null },
      { key: 'digest', state: 'pass', code: null },
    ]);
    expect(pendingVerificationRows().every((row) => row.state === 'pending')).toBe(true);
  });

  it('fails the digest row when the verifier digest and manifest disagree', () => {
    const pkg = packageFixture();
    const tampered = { ...pkg, digestHex: 'f'.repeat(64) };
    const rows = verificationRows(tampered, null);
    expect(rows.find((row) => row.key === 'digest')).toEqual({
      key: 'digest',
      state: 'fail',
      code: 'E-PACK-003',
    });
  });

  it('marks only the mapped row as failed after an inspection error', () => {
    const rows = verificationRows(null, 'E-PACK-002');
    expect(rows).toEqual([
      { key: 'manifest', state: 'skipped', code: null },
      { key: 'signature', state: 'fail', code: 'E-PACK-002' },
      { key: 'digest', state: 'skipped', code: null },
    ]);
  });
});

describe('install gate', () => {
  it('blocks installation when a verification row failed', () => {
    const pkg = packageFixture();
    const cleanPlan: InstallPlan = { warnings: [], ready: true };
    const gate = gateFor(pkg, verificationRows(pkg, null), cleanPlan);
    expect(gate.ready).toBe(true);

    const blocked = gateFor(pkg, verificationRows({ ...pkg, digestHex: 'f'.repeat(64) }, null), cleanPlan);
    expect(blocked).toEqual({ ready: false, blockedBy: 'verification', code: 'E-PACK-003' });
  });

  it('blocks an unverified file (pending rows) even with a clean plan', () => {
    const pkg = packageFixture();
    const gate = gateFor(pkg, pendingVerificationRows(), null);
    expect(gate.ready).toBe(false);
    expect(gate.blockedBy).toBe('verification');
  });

  it('blocks a key change until the acknowledgement is checked', async () => {
    const pkg = packageFixture();
    const inspect = vi.fn(async () => ({ pkg, bytes: new Uint8Array(8) }));
    const outcome = await inspectForImport(
      deps(inspect, installedApp({ authorKeyFingerprint: `ed25519:${OTHER_KEY}` })),
      file(),
      {},
    );
    expect(outcome.plan?.warnings.map((warning) => warning.code)).toContain('key_change');

    const before = gateFor(pkg, outcome.rows, outcome.plan);
    expect(before).toEqual({ ready: false, blockedBy: 'key_change', code: 'E-PACK-002' });

    const after = gateFor(pkg, outcome.rows, outcome.plan, { keyChange: true, downgrade: false });
    expect(after.ready).toBe(true);
  });

  it('blocks a downgrade until the acknowledgement is checked', async () => {
    const pkg = packageFixture({ version: '0.9.0' });
    const inspect = vi.fn(async () => ({ pkg, bytes: new Uint8Array(8) }));
    const outcome = await inspectForImport(
      deps(inspect, installedApp({ version: '2.0.0' })),
      file(),
      {},
    );
    expect(outcome.plan?.warnings.map((warning) => warning.code)).toContain('downgrade');
    expect(gateFor(pkg, outcome.rows, outcome.plan)).toEqual({
      ready: false,
      blockedBy: 'downgrade',
      code: 'E-PACK-004',
    });
    expect(
      gateFor(pkg, outcome.rows, outcome.plan, { keyChange: false, downgrade: true }).ready,
    ).toBe(true);
  });

  it('blocks a failed inspection and never calls the installer', async () => {
    const failure = Object.assign(new Error('Package integrity check failed'), {
      code: 'E-PACK-003',
    });
    const inspect = vi.fn(async () => {
      throw failure;
    });
    const outcome = await inspectForImport(deps(inspect), file(), {});
    expect(outcome.pkg).toBeNull();
    expect(outcome.errorCode).toBe('E-PACK-003');

    const declared = MANIFEST.permissions;
    const gate = installGate({
      rows: outcome.rows,
      plan: outcome.plan,
      acknowledge: { keyChange: true, downgrade: true },
      declaredPermissions: declared,
      approvedPermissions: declared,
    });
    expect(gate).toEqual({ ready: false, blockedBy: 'verification', code: 'E-PACK-003' });
  });

  it('blocks while a declared permission is unapproved', () => {
    const pkg = packageFixture();
    const declared = pkg.manifest.permissions;
    const gate = installGate({
      rows: verificationRows(pkg, null),
      plan: null,
      acknowledge: { keyChange: true, downgrade: true },
      declaredPermissions: declared,
      approvedPermissions: [ALWAYS_GRANTED_PERMISSION],
    });
    expect(gate).toEqual({ ready: false, blockedBy: 'permission', code: 'E-RUN-003' });
  });
});

describe('permission approval', () => {
  it('always includes storage.app in the approved set', () => {
    const declared = ['storage.app', 'network.fetch'];
    expect(approvedPermissionSet(declared, [])).toEqual(['storage.app']);
    expect(togglePermission(declared, [ALWAYS_GRANTED_PERMISSION], 'storage.app', false)).toEqual([
      'storage.app',
    ]);
    expect(initialPermissionSelection(declared)).toEqual(declared);
  });

  it('drops permissions the manifest did not declare', () => {
    expect(approvedPermissionSet(['storage.app'], ['storage.app', 'vault.read'])).toEqual([
      'storage.app',
    ]);
  });
});

describe('optional package keys', () => {
  it('rejects a malformed author key before verification runs', async () => {
    const inspect = vi.fn(async () => ({ pkg: packageFixture(), bytes: new Uint8Array(8) }));
    const outcome = await inspectForImport(deps(inspect), file(), { authorPubkeyHex: 'abc' });
    expect(inspect).not.toHaveBeenCalled();
    expect(outcome.errorCode).toBe('E-PACK-002');
    expect(outcome.rows.find((row) => row.key === 'signature')?.state).toBe('fail');
  });

  it('normalizes valid keys to lowercase hex', () => {
    const validated = validatePackageKeys({ authorPubkeyHex: AUTHOR_KEY.toUpperCase() });
    expect(validated.ok).toBe(true);
    expect(validated.keys.authorPubkeyHex).toBe(AUTHOR_KEY);
    expect(validatePackageKeys({}).ok).toBe(true);
  });
});

describe('source form', () => {
  it('rejects a non-https URL and a short key without fetching', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    expect(validateSourceDraft({ name: '', url: 'http://example.com/index.json', publicKeyHex: AUTHOR_KEY })).toEqual({
      ok: false,
      field: 'url',
      code: 'E-PACK-001',
    });
    expect(
      validateSourceDraft({
        name: '',
        url: 'https://example.com/index.json',
        publicKeyHex: AUTHOR_KEY.slice(0, 62),
      }),
    ).toEqual({ ok: false, field: 'key', code: 'E-PACK-002' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('accepts a valid https source and derives the name from the host', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    expect(
      validateSourceDraft({
        name: '  ',
        url: 'https://packages.example.com/index.json',
        publicKeyHex: AUTHOR_KEY.toUpperCase(),
      }),
    ).toEqual({
      ok: true,
      name: 'packages.example.com',
      url: 'https://packages.example.com/index.json',
      publicKeyHex: AUTHOR_KEY,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reports unavailable index entries after an explicit refresh', async () => {
    const payload = {
      schemaVersion: 1,
      name: 'Contoh',
      updatedAt: '2026-11-21T00:00:00.000Z',
      apps: [
        {
          id: 'studio.kasir',
          name: 'Kasir',
          version: '1.0.0',
          url: 'https://example.com/kasir.mapp',
          sha256: 'd'.repeat(64),
          signature: 'x'.repeat(20),
          permissions: ['storage.app'],
        },
        { id: 'Not A Valid Id', version: '1.0.0' },
      ],
    };
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify(payload), { status: 200 })),
    );
    const exec = vi.fn(async () => undefined);
    // A refresh only calls `exec`; no worker is needed to exercise validation.
    const fakeDb = { exec } as unknown as WorkerHostDb;
    const source: IndexSource = {
      id: 'src-1',
      name: 'Contoh',
      url: 'https://example.com/index.json',
      keyFingerprint: `ed25519:${AUTHOR_KEY}`,
      publicSigningKey: new Uint8Array(32),
      cachedIndex: null,
      lastFetchedAtMs: null,
      enabled: true,
    };

    const result = await refreshSource(fakeDb, source, 1_700_000_000_000);
    expect(result.index?.apps).toHaveLength(1);
    expect(result.unavailable).toHaveLength(1);
    expect(exec).toHaveBeenCalledTimes(1);
  });
});

describe('error mapping', () => {
  it('keeps catalog codes from errors and message prefixes', () => {
    expect(packageErrorCode(Object.assign(new Error('x'), { code: 'E-PACK-004' }))).toBe('E-PACK-004');
    expect(packageErrorCode(new Error('E-SHELL-001 database unavailable'))).toBe('E-SHELL-001');
    expect(packageErrorCode(new Error('boom'))).toBe('E-PACK-002');
  });
});
