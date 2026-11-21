#!/usr/bin/env node
/**
 * make-fixtures.mjs — build the signed `.mapp` v2 fixtures used by E2E tests.
 *
 * The Ed25519 seed is generated in memory for each run and is never written to
 * disk or committed; only the public key and the package files ship in the
 * fixtures directory. Each package is built by `mapp-tool pack`, which follows
 * the same prepare → sign → finalize path as the Studio.
 */
import { createHash, randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const WORK = join(ROOT, '.tooling', 'fixtures');
const OUT = join(ROOT, 'apps', 'studio-web', 'e2e', 'fixtures');
const CRATE = join(ROOT, 'packages', 'core-rust', 'Cargo.toml');
const AUTHOR_SEED = randomBytes(32).toString('hex');

const VALID_BUNDLE = `export async function mount(api) {
  api.render({
    type: 'Stack',
    id: 'fixture-root',
    props: { direction: 'column', gap: 'md' },
    children: [
      { type: 'Card', id: 'fixture-card', props: { title: 'Kasir Warung' } },
      { type: 'StatCard', id: 'fixture-stat', props: { label: 'Penjualan hari ini', value: 'Rp 120.000' } },
      {
        type: 'Button',
        id: 'fixture-button',
        props: { label: 'Simpan' },
        on: { press: { action: 'toast', params: { message: 'Tersimpan' } } },
      },
    ],
  });
}
`;

const ESCAPE_BUNDLE = `export async function mount(api) {
  const attempts = [];
  try {
    const doc = window.parent.document;
    attempts.push(doc ? 'parent-ok' : 'parent-empty');
  } catch {
    attempts.push('parent-blocked');
  }
  try {
    localStorage.setItem('escape', '1');
    attempts.push('storage-ok');
  } catch {
    attempts.push('storage-blocked');
  }
  let evalBlocked = false;
  try {
    // CSP has no 'unsafe-eval'; this must throw.
    const value = (0, eval)('1 + 1');
    evalBlocked = value !== 2;
  } catch {
    evalBlocked = true;
  }
  attempts.push(evalBlocked ? 'eval-blocked' : 'eval-ok');
  try {
    await fetch('https://example.com/exfil').then(
      () => attempts.push('fetch-allowed'),
      () => attempts.push('fetch-blocked'),
    );
  } catch {
    attempts.push('fetch-blocked');
  }
  api.render({
    type: 'Card',
    id: 'fixture-card',
    props: { title: 'Fixture siap' },
    children: [
      { type: 'StatCard', id: 'fixture-escape', props: { label: 'Escape', value: attempts.join(',') } },
      {
        type: 'Button',
        id: 'fixture-button',
        props: { label: 'Simpan' },
        on: { press: { action: 'toast', params: { message: 'Tersimpan' } } },
      },
    ],
  });
}
`;

const CRASH_BUNDLE = `export function mount(api) {
  api.render({ type: 'Card', id: 'crash-card', props: { title: 'Akan gagal' } });
  setTimeout(() => {
    throw new Error('fixture crash');
  }, 200);
}
`;

const CONSENT_BUNDLE = `export async function mount(api) {
  api.render({
    type: 'Stack',
    id: 'consent-root',
    props: { direction: 'column', gap: 'md' },
    children: [
      { type: 'Card', id: 'consent-card', props: { title: 'Butuh izin' } },
      {
        type: 'Button',
        id: 'consent-button',
        props: { label: 'Salin' },
        on: { press: { action: 'callBridge', method: 'clipboard.write', params: { text: 'halo' } } },
      },
    ],
  });
  // Ask for a consent-gated permission on mount so the host dialog appears.
  try {
    await api.bridge('clipboard', 'write', { text: 'halo' });
  } catch {
    // A denial is a valid outcome; the consent dialog is what this fixture tests.
  }
}
`;

const LOOP_BUNDLE = `export function mount(api) {
  api.render({ type: 'Card', id: 'loop-card', props: { title: 'Loop' } });
  setTimeout(() => {
    // Deliberate freeze: the Host watchdog must kill this isolate in <= 5s.
    for (;;) {}
  }, 300);
}
`;

function sha256Hex(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function keygen() {
  const output = execFileSync(
    'cargo',
    ['run', '-q', '--manifest-path', CRATE, '--bin', 'mapp-tool', '--', 'keygen', '--seed', AUTHOR_SEED],
    { encoding: 'utf8' },
  );
  return JSON.parse(output);
}

function manifestFor({ appId, version = '1.0.0', permissions = ['storage.app'], allowlist }) {
  const manifest = {
    schemaVersion: 2,
    id: appId,
    name: appId.split('.').at(-1),
    version,
    entry: { bundle: 'bundle/index.js' },
    assetsDir: 'assets/',
    integrity: { algorithm: 'sha256', contentHash: '', files: {} },
    signature: { algorithm: 'ed25519', keyId: '', value: '' },
    offline: true,
    permissions,
    capabilities: ['ui.muip', 'storage.app'],
    ui: { engine: 'muip-web', protocol: 1 },
  };
  if (allowlist) {
    manifest.networkAllowlist = allowlist;
  }
  return manifest;
}

function pack({ dirName, appId, bundle, signed = true, permissions, allowlist }) {
  const pkgDir = join(WORK, dirName);
  rmSync(pkgDir, { recursive: true, force: true });
  mkdirSync(join(pkgDir, 'bundle'), { recursive: true });
  mkdirSync(join(pkgDir, 'assets'), { recursive: true });
  writeFileSync(join(pkgDir, 'bundle', 'index.js'), bundle);
  writeFileSync(join(pkgDir, 'assets', 'icon.txt'), 'icon');
  writeFileSync(join(pkgDir, 'LICENSE'), 'Apache-2.0 fixture\n');
  writeFileSync(
    join(pkgDir, 'microapp.manifest.json'),
    JSON.stringify(manifestFor({ appId, permissions, allowlist })),
  );
  const args = [
    'run',
    '-q',
    '--manifest-path',
    CRATE,
    '--bin',
    'mapp-tool',
    '--',
    'pack',
    join(pkgDir, 'microapp.manifest.json'),
    pkgDir,
    '-o',
    join(OUT, `${dirName}.mapp`),
  ];
  if (signed) {
    args.push('--author-seed', AUTHOR_SEED);
  } else {
    args.push('--unsigned');
  }
  execFileSync('cargo', args, { encoding: 'utf8' });
  const bytes = readFileSync(join(OUT, `${dirName}.mapp`));
  return { file: `${dirName}.mapp`, sha256: sha256Hex(bytes) };
}

mkdirSync(OUT, { recursive: true });
mkdirSync(WORK, { recursive: true });

const keys = keygen();

const fixtures = [
  pack({ dirName: 'valid', appId: 'studio.fixture.valid', bundle: VALID_BUNDLE, permissions: ['storage.app', 'network.fetch'], allowlist: ['https://api.example.com'] }),
  pack({ dirName: 'escape', appId: 'studio.fixture.escape', bundle: ESCAPE_BUNDLE, permissions: ['storage.app', 'network.fetch'], allowlist: ['https://example.com'] }),
  pack({ dirName: 'loop', appId: 'studio.fixture.loop', bundle: LOOP_BUNDLE }),
  pack({ dirName: 'crash', appId: 'studio.fixture.crash', bundle: CRASH_BUNDLE }),
  pack({
    dirName: 'consent',
    appId: 'studio.fixture.consent',
    bundle: CONSENT_BUNDLE,
    permissions: ['storage.app', 'clipboard.write'],
  }),
  pack({ dirName: 'unsigned', appId: 'studio.fixture.unsigned', bundle: VALID_BUNDLE, signed: false }),
];

const summary = {
  authorPublicKey: keys.publicKey,
  fixtures,
};
writeFileSync(join(OUT, 'index.json'), `${JSON.stringify(summary, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
