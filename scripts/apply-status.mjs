#!/usr/bin/env node
/**
 * apply-status.mjs — the only supported way to change the Status column of
 * `docs/00-foundation/prd-compliance-matrix.md`.
 *
 * Usage:
 *   node scripts/apply-status.mjs --evidence docs/08-quality/evidence/phase-1.json [--write]
 *
 * Rules:
 *  - every entry needs a known requirement ID and an `evidence` string;
 *  - status must be `implemented`, `partial`, or `blocked`;
 *  - `implemented` is rejected when the evidence file's overall result is not
 *    `pass` (a failed gate cannot promote requirements);
 *  - unknown IDs are rejected.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const MATRIX = join(ROOT, 'docs', '00-foundation', 'prd-compliance-matrix.md');

const args = process.argv.slice(2);
const evidencePath = args.includes('--evidence') ? args[args.indexOf('--evidence') + 1] : null;
const write = args.includes('--write');

if (!evidencePath || !existsSync(evidencePath)) {
  console.error('usage: node scripts/apply-status.mjs --evidence <phase-<n>.json> [--write]');
  process.exit(2);
}

const evidence = JSON.parse(readFileSync(evidencePath, 'utf8'));
const allowedStatuses = new Set(['implemented', 'partial', 'blocked']);
const failures = [];

if (!Array.isArray(evidence.requirements)) {
  console.error('evidence file has no requirements array');
  process.exit(2);
}

const byId = new Map();
for (const entry of evidence.requirements) {
  if (!entry || typeof entry.id !== 'string' || typeof entry.status !== 'string') {
    failures.push('malformed requirement entry');
    continue;
  }
  if (!allowedStatuses.has(entry.status)) {
    failures.push(`${entry.id}: invalid status ${entry.status}`);
  }
  if (typeof entry.evidence !== 'string' || entry.evidence.trim().length === 0) {
    failures.push(`${entry.id}: missing evidence`);
  }
  if (entry.status === 'implemented' && evidence.result !== 'pass') {
    failures.push(`${entry.id}: cannot promote to implemented while gate result is ${evidence.result}`);
  }
  byId.set(entry.id, entry);
}

const lines = readFileSync(MATRIX, 'utf8').split('\n');
let updated = 0;
const unknown = [];
for (let index = 0; index < lines.length; index += 1) {
  const line = lines[index];
  if (!line.startsWith('|')) continue;
  const cells = line.split('|');
  if (cells.length < 8) continue;
  const match = /\b(FR-[A-Z]+-\d{3}|NFR-[A-Z][A-Z0-9]*-\d{3}|SEC-\d{3})\b/.exec(cells[2] ?? '');
  if (!match) continue;
  const entry = byId.get(match[1]);
  if (!entry) continue;
  cells[6] = ` ${entry.status} `;
  lines[index] = cells.join('|');
  updated += 1;
  byId.delete(match[1]);
}

for (const leftover of byId.keys()) unknown.push(leftover);

if (failures.length > 0) {
  for (const failure of failures) console.error(`error: ${failure}`);
  process.exit(1);
}
if (unknown.length > 0) {
  for (const id of unknown) console.error(`error: unknown requirement ID ${id}`);
  process.exit(1);
}

if (write) {
  writeFileSync(MATRIX, lines.join('\n'));
  console.log(`matrix updated: ${updated} rows from ${evidencePath}`);
} else {
  console.log(`dry run: ${updated} rows would change (pass --write to apply)`);
}
