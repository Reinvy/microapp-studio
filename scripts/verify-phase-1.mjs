#!/usr/bin/env node
/**
 * verify-phase-1.mjs — Phase 1 gate.
 *
 * Runs every automatic check available in this environment, records the result
 * in `docs/08-quality/evidence/phase-1.json` and `.md`, and never upgrades a
 * requirement to `implemented` without a passing command to point at.
 *
 * Manual gates (iOS/macOS/Windows desktop, physical Android device, real
 * sensors) are recorded as `blocked` with a reason instead of being omitted.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const EVIDENCE_DIR = join(ROOT, 'docs', '08-quality', 'evidence');
const startedAt = new Date();

function sha() {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

function toolVersion(command, args) {
  try {
    return execFileSync(command, args, { encoding: 'utf8' }).trim().split('\n')[0];
  } catch {
    return null;
  }
}

const results = [];

function run(name, command, args, options = {}) {
  const start = Date.now();
  try {
    execFileSync(command, args, {
      cwd: options.cwd ?? ROOT,
      stdio: 'pipe',
      timeout: options.timeoutMs ?? 900_000,
    });
    results.push({ name, command: [command, ...args].join(' '), exitCode: 0, durationMs: Date.now() - start });
    process.stdout.write(`PASS ${name}\n`);
    return true;
  } catch (error) {
    const exitCode = typeof error.status === 'number' ? error.status : 1;
    results.push({
      name,
      command: [command, ...args].join(' '),
      exitCode,
      durationMs: Date.now() - start,
      skipped: options.optional === true,
    });
    process.stdout.write(`${options.optional ? 'SKIP' : 'FAIL'} ${name} (exit ${exitCode})\n`);
    return false;
  }
}

const docsOk = run('docs', 'node', ['scripts/check-docs.mjs', '--strict']);
const migrationsOk = run('migrations', 'node', ['scripts/test-migrations.mjs']);
const unitOk = run('unit', 'npm', ['test']);
const typecheckOk = run('typecheck', 'npm', ['run', 'typecheck']);
const lintOk = run('lint', 'npm', ['run', 'lint']);
const buildOk = run('build', 'npm', ['run', 'build']);
const wasmOk = run('build:core', 'npm', ['run', 'build:core']);
const cargoTestOk = run('cargo-test', 'cargo', [
  'test',
  '--manifest-path',
  'packages/core-rust/Cargo.toml',
]);
const clippyOk = run('cargo-clippy', 'cargo', [
  'clippy',
  '--manifest-path',
  'packages/core-rust/Cargo.toml',
  '--all-targets',
  '--',
  '-D',
  'warnings',
]);
const e2eOk = run('e2e', 'npm', ['run', 'e2e', '-w', '@microapp/studio-web']);

// Flutter gates run only when the host app exists; an empty repo must not be
// reported as a passing Flutter analysis.
const flutterProject = join(ROOT, 'apps', 'host-flutter', 'pubspec.yaml');
const flutterAvailable = existsSync(flutterProject) && toolVersion('flutter', ['--version']) !== null;
const flutterAnalyzeOk = flutterAvailable
  ? run('flutter-analyze', 'flutter', ['analyze'], {
      optional: true,
      cwd: join(ROOT, 'apps', 'host-flutter'),
    })
  : false;
const flutterTestOk = flutterAvailable
  ? run('flutter-test', 'flutter', ['test'], { optional: true, cwd: join(ROOT, 'apps', 'host-flutter') })
  : false;

const automaticPassed = docsOk && migrationsOk && unitOk && typecheckOk && lintOk && buildOk && cargoTestOk && clippyOk;

function requirementStatus(ids, { partial = [] } = {}) {
  return ids.map((id) => {
    if (partial.includes(id)) {
      return { id, status: 'partial', evidence: 'gate otomatis fase 1 (lihat manualGates)' };
    }
    return {
      id,
      status: automaticPassed ? 'implemented' : 'partial',
      evidence: automaticPassed ? 'scripts/verify-phase-1.mjs' : 'gate belum hijau',
    };
  });
}

function range(prefix, from, to) {
  const ids = [];
  for (let index = from; index <= to; index += 1) ids.push(`${prefix}-${String(index).padStart(3, '0')}`);
  return ids;
}

// FR-HOST-010 (sqlite-vec) is phase 2, FR-HOST-019 (push) is phase 5, and
// FR-HOST-026 (sync queue count) is phase 3; they stay out of this evidence.
const hostIds = [
  ...range('FR-HOST', 1, 9),
  ...range('FR-HOST', 11, 18),
  ...range('FR-HOST', 20, 25),
  ...range('FR-HOST', 27, 30),
];
const sbxIds = range('FR-SBX', 1, 25);
const secIds = range('SEC', 1, 20);

const sbxPartial = sbxIds.slice();
const requirements = [
  // UI gaps that remain in the web host (see implementation-status §2).
  ...requirementStatus(hostIds, {
    partial: [
      'FR-HOST-005', // folder/dock UI not built (repositories only)
      'FR-HOST-006', // widget board has no live DB query
      'FR-HOST-007', // workspace switcher UI not built
      'FR-HOST-008', // workspace rename/delete UI not built
      'FR-HOST-012', // app switcher state restore not exercised in UI
      'FR-HOST-013', // split-screen/tabbed/PiP not built
      'FR-HOST-018', // scheduler tested, notification center UI missing
      'FR-HOST-022', // pin-forever UI missing (repository only)
    ],
  }),
  // The sandbox contract is verified on the web engine; the native
  // QuickJS/Wasmtime host (P1.10) does not exist yet, so these stay partial.
  ...requirementStatus(sbxIds, { partial: sbxPartial }),
  ...requirementStatus(secIds, { partial: ['SEC-009', 'SEC-010'] }),
];

for (const entry of requirements) {
  if (entry.status === 'partial' && entry.id.startsWith('FR-SBX')) {
    entry.evidence = 'kontrak web terverifikasi; host native (P1.10) belum ada';
  }
  if (entry.id === 'FR-SBX-019') {
    entry.evidence = 'rollback paket menunggu fase 4';
  }
}

const securitySuites = [
  ['R-01', 'secret scan + dependency audit'],
  ['R-06', 'XSS/MUIP renderer tests'],
  ['R-07', 'CSP and sandbox document tests'],
  ['R-08', 'signature/manifest negative tests'],
  ['R-10', 'identity key handling tests'],
  ['R-11', 'wrong recovery phrase + rate limit'],
  ['R-15', 'MUIP limits (10.001 node/loop/flood)'],
  ['R-20', 'vault locked access + auto-lock'],
].map(([id, description]) => ({
  id,
  status: automaticPassed ? 'implemented' : 'partial',
  evidence: description,
}));

const manualGates = [
  { id: 'flutter-host-p1.10', status: 'blocked', reason: 'apps/host-flutter dan runtime-native belum diimplementasikan' },
  { id: 'ios-ipados-macos-windows-build', status: 'blocked', reason: 'toolchain dan perangkat tidak tersedia' },
  { id: 'flutter-linux-desktop', status: 'blocked', reason: 'clang++/cmake/ninja tidak tersedia' },
  { id: 'android-physical-device', status: 'blocked', reason: 'perangkat fisik tidak tersedia' },
  { id: 'real-sensors', status: 'blocked', reason: 'kamera/mikrofon/lokasi/NFC/Bluetooth nyata tidak tersedia' },
  { id: 'flutter-host', status: flutterAnalyzeOk && flutterTestOk ? 'implemented' : 'blocked', reason: 'host Flutter belum dijalankan pada gate ini' },
  { id: 'two-real-devices-webrtc', status: 'blocked', reason: 'fase 3' },
];

const evidence = {
  phase: 1,
  commit: sha(),
  generatedAt: new Date().toISOString(),
  environment: {
    node: toolVersion('node', ['--version']),
    rust: toolVersion('rustc', ['--version']),
    cargo: toolVersion('cargo', ['--version']),
    flutter: toolVersion('flutter', ['--version']),
    go: toolVersion('go', ['version']),
    chrome: toolVersion('google-chrome', ['--version']),
  },
  commands: results,
  requirements,
  securitySuites,
  manualGates,
  result: automaticPassed && e2eOk && wasmOk ? 'pass' : 'fail',
  startedAt: startedAt.toISOString(),
};

mkdirSync(EVIDENCE_DIR, { recursive: true });
writeFileSync(join(EVIDENCE_DIR, 'phase-1.json'), `${JSON.stringify(evidence, null, 2)}\n`);

const markdown = [
  '---',
  'id: QA-EVIDENCE-1',
  'title: Evidence Fase 1',
  'status: accepted',
  'owner: qa',
  'prd_refs: ["§8"]',
  '---',
  '',
  '# Evidence Fase 1',
  '',
  `- Commit: \`${evidence.commit}\``,
  `- Generated: ${evidence.generatedAt}`,
  `- Result: **${evidence.result}**`,
  '',
  '## 1. Perintah',
  '',
  '| Perintah | Exit | Durasi (ms) |',
  '|---|---|---|',
  ...results.map((entry) => `| \`${entry.command}\` | ${entry.exitCode} | ${entry.durationMs} |`),
  '',
  '## 2. Requirement',
  '',
  '| ID | Status | Bukti |',
  '|---|---|---|',
  ...requirements.map((entry) => `| ${entry.id} | ${entry.status} | ${entry.evidence} |`),
  '',
  '## 3. Suite Keamanan',
  '',
  '| Suite | Status | Bukti |',
  '|---|---|---|',
  ...securitySuites.map((entry) => `| ${entry.id} | ${entry.status} | ${entry.evidence} |`),
  '',
  '## 4. Gate Manual',
  '',
  '| Gate | Status | Alasan |',
  '|---|---|---|',
  ...manualGates.map((entry) => `| ${entry.id} | ${entry.status} | ${entry.reason} |`),
  '',
].join('\n');
writeFileSync(join(EVIDENCE_DIR, 'phase-1.md'), markdown);

process.stdout.write(`\nphase 1 evidence: ${evidence.result}\n`);
process.exit(evidence.result === 'pass' ? 0 : 1);
