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
commands.push(run('test', 'npm', ['test']));
commands.push(run('typecheck', 'npm', ['run', 'typecheck']));
commands.push(run('lint', 'npm', ['run', 'lint']));
commands.push(run('build', 'npm', ['run', 'build']));

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

const evidence = {
  generatedAt: new Date().toISOString(),
  commit,
  result,
  commands,
  requirements: [],
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

Baseline ini mencatat hasil verifikasi nyata setelah refactor dokumen web-only. Evidence tidak mengklaim requirement apa pun sebagai \`implemented\`; daftar \`requirements\` sengaja kosong sampai ada pemetaan test per requirement.

## 1. Ringkasan

| Field | Nilai |
|---|---|
| Waktu | ${evidence.generatedAt} |
| Commit | \`${commit}\` |
| Hasil | \`${result}\` |
| Requirement terpetakan | 0 |

## 2. Perintah

| Nama | Perintah | Status | Exit |
|---|---|---|---|
${rows}

## 3. Batasan

${skipped.length === 0 ? 'Tidak ada perintah yang dilewati.' : skipped.map((c) => `- ${c.name}: ${c.note}.`).join('\n')}

## 4. Aturan

1. \`result\` hanya \`pass\` bila seluruh perintah wajib lulus dan tidak ada yang dilewati.
2. \`partial\` berarti ada verifikasi opsional yang tidak dijalankan; tidak boleh dipakai untuk menaikkan status requirement.
3. \`fail\` memblokir rilis.
4. File ini ditulis oleh \`node scripts/verify-web.mjs\`, bukan diedit manual.
`;

writeFileSync(join(EVIDENCE_DIR, 'baseline.md'), md);

process.stdout.write(`\nbaseline: ${result}\n`);
process.stdout.write(`wrote docs/08-quality/evidence/baseline.json and baseline.md\n`);
process.exit(result === 'fail' ? 1 : 0);
