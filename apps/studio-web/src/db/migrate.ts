/**
 * Host migration runner.
 *
 * The canonical DDL is generated from `docs/01-architecture/data-model.md` §5
 * into `migrations/001_host.up.sql`; this module applies migrations in order,
 * verifies checksums for already-applied versions, records `schema_migrations`,
 * mirrors `PRAGMA user_version`, and can roll the last migration back.
 */

import type { HostDb } from './driver';
import { HOST_MIGRATIONS, type HostMigration } from './migrations/index.generated';

export interface MigrationResult {
  applied: number[];
  alreadyApplied: number[];
}

function assertChecksum(current: string, migration: HostMigration): void {
  if (current !== migration.checksum) {
    // E-DATA-002: migration failed / ledger mismatch. Changing an applied
    // migration is a bug, not a warning.
    throw new Error(
      `E-DATA-002 migration ${migration.version} checksum mismatch: ledger has ${current}`,
    );
  }
}

async function ledgerTableExists(db: HostDb): Promise<boolean> {
  const rows = await db.select<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'schema_migrations'",
  );
  return rows.length > 0;
}

/** Apply all pending migrations in order. */
export async function applyMigrations(
  db: HostDb,
  migrations: readonly HostMigration[] = HOST_MIGRATIONS,
): Promise<MigrationResult> {
  const applied: number[] = [];
  const alreadyApplied: number[] = [];
  const ledger = (await ledgerTableExists(db))
    ? await db.select<{ version: number; checksum: string }>(
        'SELECT version, checksum FROM schema_migrations ORDER BY version',
      )
    : [];
  const byVersion = new Map(ledger.map((row) => [Number(row.version), row.checksum]));

  for (const migration of migrations) {
    const existing = byVersion.get(migration.version);
    if (existing !== undefined) {
      assertChecksum(existing, migration);
      alreadyApplied.push(migration.version);
      continue;
    }
    await db.exec('BEGIN IMMEDIATE');
    try {
      await db.exec(migration.up);
      await db.exec(
        `INSERT INTO schema_migrations (version, name, checksum, applied_at_ms, rollback_sql)
         VALUES (?, ?, ?, ?, ?)`,
        [migration.version, migration.name, migration.checksum, Date.now(), migration.down],
      );
      await db.exec(`PRAGMA user_version = ${migration.version}`);
      await db.exec('COMMIT');
    } catch (error) {
      await db.exec('ROLLBACK').catch(() => {
        // The transaction may already be gone; the original error is authoritative.
      });
      throw error;
    }
    applied.push(migration.version);
  }

  const version = migrations.at(-1)?.version;
  if (version !== undefined && applied.length > 0) {
    const rows = await db.select<{ user_version: number }>('PRAGMA user_version');
    const actual = Number(rows[0]?.user_version ?? 0);
    if (actual !== version) {
      throw new Error(`E-DATA-002 user_version ${actual}, expected ${version}`);
    }
  }
  return { applied, alreadyApplied };
}

/** Roll back the newest applied migration using its stored rollback SQL. */
export async function rollbackLastMigration(
  db: HostDb,
  migrations: readonly HostMigration[] = HOST_MIGRATIONS,
): Promise<number | null> {
  if (!(await ledgerTableExists(db))) return null;
  const rows = await db.select<{ version: number; rollback_sql: string }>(
    'SELECT version, rollback_sql FROM schema_migrations ORDER BY version DESC LIMIT 1',
  );
  const latest = rows[0];
  if (!latest) return null;
  const version = Number(latest.version);
  const known = migrations.find((migration) => migration.version === version);
  const downSql = latest.rollback_sql || known?.down;
  if (!downSql) {
    throw new Error(`E-DATA-002 rollback SQL missing for migration ${version}`);
  }
  await db.exec('BEGIN IMMEDIATE');
  try {
    await db.exec(downSql);
    await db.exec('DELETE FROM schema_migrations WHERE version = ?', [version]);
    const previous = await db.select<{ version: number }>(
      'SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1',
    );
    await db.exec(`PRAGMA user_version = ${Number(previous[0]?.version ?? 0)}`);
    await db.exec('COMMIT');
  } catch (error) {
    await db.exec('ROLLBACK').catch(() => {});
    throw error;
  }
  return version;
}
