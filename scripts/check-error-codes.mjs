#!/usr/bin/env node
/**
 * check-error-codes.mjs — only the 27 documented codes may appear.
 *
 * Scans application and runtime sources for `E-XXX-NNN` literals and fails when a
 * code is missing from `docs/03-specs/error-codes.md`. Comments that name a removed
 * code are violations too: a stale code in a comment becomes a stale code in code.
 *
 * Usage: node scripts/check-error-codes.mjs [--json]
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const CATALOG = join(ROOT, 'docs', '03-specs', 'error-codes.md');
const TARGETS = [
  join(ROOT, 'apps', 'studio-web', 'src'),
  join(ROOT, 'packages', 'runtime-web', 'src'),
];
const EXTENSIONS = /\.(ts|tsx|mjs|js)$/;
// `db/migrations` holds historical SQL (and its generated ledger). A released
// migration's text is immutable, so it is out of scope for this gate even when it
// mentions a code that has since been retired.
const SKIP_DIRS = new Set(['node_modules', '.next', 'dist', 'coverage', '__snapshots__', 'migrations']);
const CODE = /\bE-[A-Z]+-\d{3}\b/g;

const documented = new Set(
  [...readFileSync(CATALOG, 'utf8').matchAll(/\bE-[A-Z]+-\d{3}\b/g)].map((match) => match[0]),
);
if (documented.size !== 27) {
  console.error(`error catalog must document exactly 27 codes, found ${documented.size}`);
  process.exit(1);
}

function walk(directory, out = []) {
  for (const entry of readdirSync(directory)) {
    if (SKIP_DIRS.has(entry)) continue;
    const absolute = join(directory, entry);
    const stats = statSync(absolute);
    if (stats.isDirectory()) walk(absolute, out);
    else if (EXTENSIONS.test(entry)) out.push(absolute);
  }
  return out;
}

const violations = [];
for (const target of TARGETS) {
  for (const file of walk(target)) {
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, index) => {
      for (const match of line.matchAll(CODE)) {
        if (documented.has(match[0])) continue;
        violations.push({ file: relative(ROOT, file), line: index + 1, code: match[0] });
      }
    });
  }
}

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ documented: documented.size, violations }, null, 2));
} else if (violations.length === 0) {
  console.log(`error-code check: OK (${documented.size} documented codes, no strays)`);
} else {
  for (const violation of violations) {
    console.error(`${violation.file}:${violation.line} ${violation.code} is not in the catalog`);
  }
  console.error(`error-code check: ${violations.length} violation(s)`);
  process.exitCode = 1;
}
