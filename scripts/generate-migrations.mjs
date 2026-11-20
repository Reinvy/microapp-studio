#!/usr/bin/env node
/**
 * generate-migrations.mjs — keep the host schema migration in lockstep with the
 * canonical DDL in `docs/01-architecture/data-model.md` §5.
 *
 * Emits:
 *   apps/studio-web/src/db/migrations/001_host.up.sql   (verbatim DDL)
 *   apps/studio-web/src/db/migrations/001_host.down.sql (generated drop order)
 *   apps/studio-web/src/db/migrations/index.generated.ts (ledger input)
 *
 * `--check` fails when the committed files drift from the documentation.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const DOC = join(ROOT, 'docs', '01-architecture', 'data-model.md');
const DIR = join(ROOT, 'apps', 'studio-web', 'src', 'db', 'migrations');
const CHECK = process.argv.includes('--check');

const doc = readFileSync(DOC, 'utf8');
const sectionStart = doc.indexOf('## 5. DDL Kanonik Host');
const sectionEnd = doc.indexOf('## 6. Tabel Server Rinci');
if (sectionStart === -1 || sectionEnd === -1) {
  console.error('cannot locate §5 canonical DDL in data-model.md');
  process.exit(1);
}
const section = doc.slice(sectionStart, sectionEnd);
const fence = /```sql\n([\s\S]*?)```/.exec(section);
if (!fence) {
  console.error('canonical DDL code fence not found');
  process.exit(1);
}
const upSql = `${fence[1].trimEnd()}\n`;

const createPattern = /^CREATE\s+(?:UNIQUE\s+)?(TABLE|INDEX|VIEW|TRIGGER)\s+(?:IF\s+NOT\s+EXISTS\s+)?([A-Za-z0-9_]+)/gim;
const objects = [];
let creationIndex = 0;
for (const match of upSql.matchAll(createPattern)) {
  objects.push({ kind: match[1].toUpperCase(), name: match[2], creationIndex });
  creationIndex += 1;
}
if (objects.length === 0) {
  console.error('no schema objects found in canonical DDL');
  process.exit(1);
}

const dropOrder = { TRIGGER: 1, VIEW: 2, INDEX: 3, TABLE: 4 };
const downStatements = [...objects]
  .sort((a, b) => {
    if (dropOrder[a.kind] !== dropOrder[b.kind]) return dropOrder[a.kind] - dropOrder[b.kind];
    // Children reference parents, so tables drop in reverse creation order.
    return a.kind === 'TABLE' ? b.creationIndex - a.creationIndex : a.creationIndex - b.creationIndex;
  })
  .map(({ kind, name }) => `DROP ${kind} IF EXISTS ${name};`);
const downSql = `${['-- Generated from docs/01-architecture/data-model.md §5.', ...downStatements].join('\n')}\n`;

function checksum(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

function writeOrCheck(path, content) {
  if (CHECK) {
    const current = existsSync(path) ? readFileSync(path, 'utf8') : '';
    if (current !== content) {
      console.error(`${path} is out of date; run node scripts/generate-migrations.mjs`);
      process.exit(1);
    }
    return;
  }
  writeFileSync(path, content);
}

writeOrCheck(join(DIR, '001_host.up.sql'), upSql);
writeOrCheck(join(DIR, '001_host.down.sql'), downSql);

const files = readdirSync(DIR).filter((name) => /^\d{3}_.+\.up\.sql$/.test(name));
const migrations = files
  .sort()
  .map((fileName) => {
    const version = Number.parseInt(fileName.slice(0, 3), 10);
    const name = fileName.slice(4, -'.up.sql'.length);
    const up = readFileSync(join(DIR, fileName), 'utf8');
    const downPath = join(DIR, `${String(version).padStart(3, '0')}_${name}.down.sql`);
    if (!existsSync(downPath)) {
      console.error(`missing rollback file for ${fileName}: ${downPath}`);
      process.exit(1);
    }
    const down = readFileSync(downPath, 'utf8');
    return {
      version,
      name,
      checksum: checksum(up),
      up,
      down,
    };
  });

for (let index = 1; index < migrations.length; index += 1) {
  if (migrations[index].version <= migrations[index - 1].version) {
    console.error('migration versions must be strictly increasing');
    process.exit(1);
  }
}

const indexFile = `// GENERATED FILE — do not edit by hand.
// Source: docs/01-architecture/data-model.md §5 + db/migrations/*.up.sql
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

writeOrCheck(join(DIR, 'index.generated.ts'), indexFile);

if (CHECK) {
  console.log(`migrations up to date (${migrations.length} migrations)`);
} else {
  console.log(`wrote ${migrations.length} migrations to ${DIR}`);
}
