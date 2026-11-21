#!/usr/bin/env node
/**
 * generate-migrations.mjs — build the migration ledger from the authored SQL and
 * keep it in lockstep with the documented host contract.
 *
 * Migrations are authored files (`NNN_name.up.sql` + `NNN_name.down.sql`);
 * docs/01-architecture/data-model.md §4 names the contract tables. This script:
 *   1. fails if any migration lacks a rollback file;
 *   2. fails if versions are not strictly increasing;
 *   3. fails if a §4 contract table is never created by an `up` migration;
 *   4. writes `index.generated.ts` from the file contents (never edit by hand).
 *
 * `--check` fails when the committed ledger drifts from the SQL files.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const DOC = join(ROOT, 'docs', '01-architecture', 'data-model.md');
const DIR = join(ROOT, 'apps', 'studio-web', 'src', 'db', 'migrations');
const CHECK = process.argv.includes('--check');

function fail(message) {
  console.error(message);
  process.exit(1);
}

/** Tables the target model requires, read from the §4 contract table. */
function contractTables() {
  const doc = readFileSync(DOC, 'utf8');
  const start = doc.indexOf('## 4. Tabel Host');
  if (start === -1) fail('cannot locate "## 4. Tabel Host" in data-model.md');
  const end = doc.indexOf('\n## ', start + 1);
  const section = end === -1 ? doc.slice(start) : doc.slice(start, end);
  const tables = new Set();
  for (const match of section.matchAll(/^\|\s*`([a-z0-9_]+)`\s*\|/gim)) {
    tables.add(match[1]);
  }
  if (tables.size === 0) fail('no contract tables found in data-model.md §4');
  return tables;
}

const upFiles = readdirSync(DIR)
  .filter((name) => /^\d{3}_.+\.up\.sql$/.test(name))
  .sort();
if (upFiles.length === 0) fail('no migrations found');

const migrations = upFiles.map((fileName) => {
  const version = Number.parseInt(fileName.slice(0, 3), 10);
  const name = fileName.slice(4, -'.up.sql'.length);
  const downPath = join(DIR, `${String(version).padStart(3, '0')}_${name}.down.sql`);
  if (!existsSync(downPath)) fail(`missing rollback file for ${fileName}: ${downPath}`);
  const up = readFileSync(join(DIR, fileName), 'utf8');
  const down = readFileSync(downPath, 'utf8');
  return {
    version,
    name,
    checksum: createHash('sha256').update(up, 'utf8').digest('hex'),
    up,
    down,
  };
});

for (let index = 1; index < migrations.length; index += 1) {
  if (migrations[index].version <= migrations[index - 1].version) {
    fail('migration versions must be strictly increasing');
  }
}

const created = new Set();
for (const migration of migrations) {
  for (const match of migration.up.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-z0-9_]+)/gi)) {
    created.add(match[1]);
  }
}
const missing = [...contractTables()].filter((table) => !created.has(table));
if (missing.length > 0) {
  fail(`documented contract tables missing from migrations: ${missing.join(', ')}`);
}

const indexFile = `// GENERATED FILE — do not edit by hand.
// Source: apps/studio-web/src/db/migrations/*.up.sql
// Regenerate: node scripts/generate-migrations.mjs

export interface HostMigration {
  readonly version: number;
  readonly name: string;
  readonly checksum: string;
  readonly up: string;
  readonly down: string;
}

export const HOST_MIGRATIONS: readonly HostMigration[] = [
${migrations
  .map(
    (migration) => `  {
    version: ${migration.version},
    name: ${JSON.stringify(migration.name)},
    checksum: ${JSON.stringify(migration.checksum)},
    up: ${JSON.stringify(migration.up)},
    down: ${JSON.stringify(migration.down)},
  },`,
  )
  .join('\n')}
];
`;

const indexPath = join(DIR, 'index.generated.ts');
if (CHECK) {
  const current = existsSync(indexPath) ? readFileSync(indexPath, 'utf8') : '';
  if (current !== indexFile) fail(`${indexPath} is out of date; run node scripts/generate-migrations.mjs`);
  console.log(`migrations up to date (${migrations.length} migrations)`);
} else {
  writeFileSync(indexPath, indexFile);
  console.log(`wrote ${migrations.length} migrations to ${DIR}`);
}
