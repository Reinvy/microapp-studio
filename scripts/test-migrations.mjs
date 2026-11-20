#!/usr/bin/env node
/**
 * test-migrations.mjs — prove the host schema migrations are valid, ordered,
 * rollback-safe, and idempotent in a real SQLite engine (`sqlite3` CLI).
 *
 * Steps for every migration set:
 *   1. apply all `up` statements forward, recording `schema_migrations` rows;
 *   2. run `PRAGMA integrity_check` and assert all expected tables exist;
 *   3. apply `down` statements in reverse order and assert the schema is empty;
 *   4. apply forward again to prove a clean re-install works.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const DIR = join(ROOT, 'apps', 'studio-web', 'src', 'db', 'migrations');

function which(binary) {
  try {
    execFileSync(binary, ['--version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

if (!which('sqlite3')) {
  console.error('test-migrations requires the sqlite3 CLI on PATH');
  process.exit(1);
}

const upFiles = readdirSync(DIR)
  .filter((name) => /^\d{3}_.+\.up\.sql$/.test(name))
  .sort();
if (upFiles.length === 0) {
  console.error('no migrations found');
  process.exit(1);
}

const migrations = upFiles.map((fileName) => {
  const version = Number.parseInt(fileName.slice(0, 3), 10);
  const name = fileName.slice(4, -'.up.sql'.length);
  const downPath = join(DIR, `${String(version).padStart(3, '0')}_${name}.down.sql`);
  return {
    version,
    name,
    up: readFileSync(join(DIR, fileName), 'utf8'),
    down: readFileSync(downPath, 'utf8'),
  };
});

const workdir = mkdtempSync(join(tmpdir(), 'microapp-migrations-'));
const dbPath = join(workdir, 'host.db');

function sql(script) {
  return execFileSync('sqlite3', [dbPath, '-batch', '-bail'], {
    input: script,
    encoding: 'utf8',
  }).trim();
}

function expect(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    rmSync(workdir, { recursive: true, force: true });
    process.exit(1);
  }
}

function applyForward(fromIndex = 0) {
  for (const migration of migrations.slice(fromIndex)) {
    sql(
      [
        'PRAGMA foreign_keys = ON;',
        'BEGIN IMMEDIATE;',
        migration.up,
        `INSERT INTO schema_migrations (version, name, checksum, applied_at_ms, rollback_sql)
         VALUES (${migration.version}, '${migration.name}', 'test', strftime('%s','now') * 1000, 'generated');`,
        `PRAGMA user_version = ${migration.version};`,
        'COMMIT;',
      ].join('\n'),
    );
  }
}

// `schema_migrations` must exist before the first ledger insert; the canonical
// DDL creates it, so the first migration inserts after its own DDL ran above.
applyForward(0);

const integrity = sql('PRAGMA integrity_check;');
expect(integrity === 'ok', `integrity_check returned ${integrity}`);

const tables = sql("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name;")
  .split('\n')
  .filter(Boolean);
const required = [
  'local_identity',
  'workspaces',
  'installed_microapps',
  'permission_grants',
  'vault_items',
  'audit_log_chain',
  'outbox',
  'schema_migrations',
  'studio_project',
];
for (const table of required) {
  expect(tables.includes(table), `missing table ${table}`);
}
expect(tables.includes('search_index'), 'missing FTS5 search_index');

const ledger = sql('SELECT version FROM schema_migrations ORDER BY version;')
  .split('\n')
  .filter(Boolean);
expect(
  ledger.length === migrations.length,
  `ledger has ${ledger.length} rows, expected ${migrations.length}`,
);
const userVersion = sql('PRAGMA user_version;');
expect(Number(userVersion) === migrations[migrations.length - 1].version, `user_version ${userVersion}`);

// The FTS5 table rejects cross-workspace queries only by discipline, but it must
// at least accept inserts and MATCH queries.
sql("INSERT INTO search_index (workspace_id, kind, ref_id, app_install_id, title, body) VALUES ('w1','app','a1','a1','KasLokal','saldo harian');");
const hits = sql("SELECT title FROM search_index WHERE search_index MATCH 'saldo';");
expect(hits === 'KasLokal', `FTS5 query returned ${hits}`);

// Roll back in reverse order.
for (const migration of [...migrations].reverse()) {
  sql(['PRAGMA foreign_keys = ON;', 'BEGIN;', migration.down, 'COMMIT;'].join('\n'));
}

const leftover = sql("SELECT name FROM sqlite_master WHERE type IN ('table','view','trigger','index') AND name NOT LIKE 'sqlite_%';")
  .split('\n')
  .filter(Boolean);
expect(leftover.length === 0, `schema not empty after rollback: ${leftover.join(', ')}`);

// Re-apply from scratch to prove a clean install works after rollback.
applyForward(0);
const tablesAgain = sql("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%';")
  .split('\n')
  .filter(Boolean);
expect(tablesAgain.includes('installed_microapps'), 'forward migration after rollback failed');

rmSync(workdir, { recursive: true, force: true });
console.log(`migrations OK: ${migrations.length} forward, ${migrations.length} rollback, re-apply clean`);
