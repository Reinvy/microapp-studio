#!/usr/bin/env node
/**
 * verify-web.mjs — run the web verification suite and write baseline evidence.
 *
 * Usage:
 *   node scripts/verify-web.mjs
 *   RUN_E2E=1 node scripts/verify-web.mjs
 *
 * Mandatory commands must pass. `cargo` runs when available and is recorded as
 * skipped otherwise. E2E runs only with RUN_E2E=1. The evidence never claims a
 * requirement is implemented; `requirements` stays empty until a test maps a
 * requirement to a result.
 */

import { spawnSync, execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const EVIDENCE_DIR = join(ROOT, 'docs', '08-quality', 'evidence');
const RUN_E2E = process.env.RUN_E2E === '1';

function hasCargo() {
  const probe = spawnSync('cargo', ['--version'], { stdio: 'ignore' });
  return probe.status === 0;
}

function run(name, command, args, { mandatory = true } = {}) {
  process.stdout.write(`\n==> ${name}: ${command} ${args.join(' ')}\n`);
  const started = Date.now();
  const result = spawnSync(command, args, { cwd: ROOT, stdio: 'inherit' });
  const exitCode = result.status ?? 1;
  const status = exitCode === 0 ? 'pass' : 'fail';
  process.stdout.write(`<== ${name}: ${status} (${Date.now() - started} ms)\n`);
  return { name, command: `${command} ${args.join(' ')}`.trim(), status, exitCode, mandatory };
}

const commands = [];
commands.push(run('docs-check', 'node', ['scripts/check-docs.mjs', '--strict']));
commands.push(run('catalog-check', 'node', ['scripts/generate-catalog.mjs', '--check']));
commands.push(run('tokens-check', 'node', ['scripts/check-tokens.mjs']));
commands.push(run('migrations-check', 'node', ['scripts/generate-migrations.mjs', '--check']));
commands.push(run('migrations-test', 'node', ['scripts/test-migrations.mjs']));
commands.push(run('error-codes', 'node', ['scripts/check-error-codes.mjs']));
commands.push(run('security-scan', 'node', ['scripts/check-security.mjs']));
commands.push(run('test', 'npm', ['test']));
commands.push(run('typecheck', 'npm', ['run', 'typecheck']));
commands.push(run('lint', 'npm', ['run', 'lint']));
commands.push(run('build', 'npm', ['run', 'build']));
commands.push(run('budget', 'node', ['scripts/check-budget.mjs']));

if (hasCargo()) {
  commands.push(
    run('cargo-test', 'cargo', ['test', '--manifest-path', 'packages/core-rust/Cargo.toml']),
  );
  commands.push(
    run('cargo-clippy', 'cargo', [
      'clippy',
      '--manifest-path',
      'packages/core-rust/Cargo.toml',
      '--all-targets',
      '--',
      '-D',
      'warnings',
    ]),
  );
} else {
  commands.push({
    name: 'cargo-test',
    command: 'cargo test --manifest-path packages/core-rust/Cargo.toml',
    status: 'skipped',
    exitCode: null,
    mandatory: false,
    note: 'cargo not available',
  });
}

if (RUN_E2E) {
  commands.push(run('e2e', 'npm', ['run', 'e2e']));
} else {
  commands.push({
    name: 'e2e',
    command: 'npm run e2e',
    status: 'skipped',
    exitCode: null,
    mandatory: false,
    note: 'RUN_E2E not set',
  });
}

const failed = commands.filter((c) => c.mandatory && c.status === 'fail');
const skipped = commands.filter((c) => c.status === 'skipped');
const result = failed.length > 0 ? 'fail' : skipped.length > 0 ? 'partial' : 'pass';

let commit = 'unknown';
try {
  commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
} catch {
  commit = 'unknown';
}

/**
 * Requirement evidence. Each entry names the gate that proves it; a requirement
 * only appears here once a command actually exercises it.
 */
const REQUIREMENTS = [
  { id: 'SEC-009', claim: 'no eval/new Function/innerHTML', gate: 'security-scan' },
  { id: 'SEC-010', claim: 'CSP + COOP/COEP headers', gate: 'e2e' },
  { id: 'SEC-012', claim: 'backup container is sealed', gate: 'cargo-test' },
  { id: 'U-01', claim: 'MUIP limits and catalog', gate: 'test' },
  { id: 'NFR-03', claim: 'route JS budget', gate: 'budget' },
  { id: 'NFR-04', claim: 'a11y sweep', gate: 'e2e' },
  { id: 'FR-DATA-002', claim: 'migrations forward/rollback', gate: 'migrations-test' },
  { id: 'DESIGN-CLAY', claim: 'token-only stylesheets', gate: 'tokens-check' },
  { id: 'SPEC-ERROR', claim: '27-code catalog only', gate: 'error-codes' },
];

const requirements = REQUIREMENTS.map((requirement) => {
  const gate = commands.find((command) => command.name === requirement.gate);
  return {
    id: requirement.id,
    claim: requirement.claim,
    gate: requirement.gate,
    status: gate?.status === 'pass' ? 'proven' : 'unproven',
  };
});

const evidence = {
  generatedAt: new Date().toISOString(),
  commit,
  result,
  commands,
  requirements,
  limitations: skipped.map((c) => `${c.name}: ${c.note}`),
};

mkdirSync(EVIDENCE_DIR, { recursive: true });
writeFileSync(join(EVIDENCE_DIR, 'baseline.json'), `${JSON.stringify(evidence, null, 2)}\n`);

const rows = commands
  .map((c) => `| ${c.name} | \`${c.command}\` | ${c.status} | ${c.exitCode ?? '—'} |`)
  .join('\n');

const md = `---
id: QA-EVIDENCE-BASELINE
title: Baseline Evidence
status: accepted
owner: qa
prd_refs: ["§9 Non-Functional", "§12 Definisi Selesai"]
---

# Baseline Evidence

Baseline ini mencatat hasil verifikasi nyata setelah refactor dokumen web-only. Daftar \`requirements\` hanya memuat requirement yang dipetakan ke gate yang benar-benar dijalankan; requirement lain tetap tanpa klaim sampai ada test yang memetakannya.

## 1. Ringkasan

| Field | Nilai |
|---|---|
| Waktu | ${evidence.generatedAt} |
| Commit | \`${commit}\` |
| Hasil | \`${result}\` |
| Requirement terpetakan | ${requirements.filter((r) => r.status === 'proven').length}/${requirements.length} |

## 2. Perintah

| Nama | Perintah | Status | Exit |
|---|---|---|---|
${rows}

## 3. Requirement yang terbukti

| ID | Klaim | Gate | Status |
|---|---|---|---|
${requirements.map((r) => `| ${r.id} | ${r.claim} | \`${r.gate}\` | ${r.status} |`).join('\n')}

## 4. Batasan

${skipped.length === 0 ? 'Tidak ada perintah yang dilewati.' : skipped.map((c) => `- ${c.name}: ${c.note}.`).join('\n')}

## 5. Aturan

1. \`result\` hanya \`pass\` bila seluruh perintah wajib lulus dan tidak ada yang dilewati.
2. \`partial\` berarti ada verifikasi opsional yang tidak dijalankan; tidak boleh dipakai untuk menaikkan status requirement.
3. \`fail\` memblokir rilis.
4. File ini ditulis oleh \`node scripts/verify-web.mjs\`, bukan diedit manual.
`;

writeFileSync(join(EVIDENCE_DIR, 'baseline.md'), md);

process.stdout.write(`\nbaseline: ${result}\n`);
process.stdout.write(`wrote docs/08-quality/evidence/baseline.json and baseline.md\n`);
process.exit(result === 'fail' ? 1 : 0);
