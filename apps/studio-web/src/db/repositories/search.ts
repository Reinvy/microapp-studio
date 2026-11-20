/**
 * Host search repository (FTS5) plus storage pins, settings, Studio drafts, and
 * the Phase 0 migration ledger.
 */

import type { HostDb } from '../driver';
import { uuidv7 } from '../ids';

export type SearchKind = 'app' | 'record' | 'note' | 'form';

export interface SearchRecord {
  workspaceId: string;
  kind: SearchKind;
  refId: string;
  appInstallId?: string | null;
  title: string;
  body: string;
}

export interface SearchHit {
  kind: SearchKind;
  refId: string;
  appInstallId: string | null;
  title: string;
  snippet: string;
}

/** Replace the indexed copy of one record (idempotent per kind+ref). */
export async function indexRecord(db: HostDb, record: SearchRecord): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.exec('DELETE FROM search_index WHERE kind = ? AND ref_id = ? AND workspace_id = ?', [
      record.kind,
      record.refId,
      record.workspaceId,
    ]);
    await tx.exec(
      `INSERT INTO search_index (workspace_id, kind, ref_id, app_install_id, title, body)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [record.workspaceId, record.kind, record.refId, record.appInstallId ?? null, record.title, record.body],
    );
  });
}

function ftsQuery(term: string): string {
  // Quote every token so user input cannot inject FTS operators.
  const tokens = term
    .split(/\s+/)
    .map((token) => token.replace(/["*^:()]/g, '').trim())
    .filter((token) => token.length > 0)
    .slice(0, 8);
  return tokens.map((token) => `"${token}"*`).join(' ');
}

export async function search(
  db: HostDb,
  workspaceId: string,
  term: string,
  limit = 50,
): Promise<SearchHit[]> {
  const query = ftsQuery(term);
  if (query.length === 0) return [];
  const rows = await db.select<{
    kind: SearchKind;
    ref_id: string;
    app_install_id: string | null;
    title: string;
    snippet: string;
  }>(
    `SELECT kind, ref_id, app_install_id, title, snippet(search_index, 4, '[', ']', '…', 12) AS snippet
     FROM search_index
     WHERE search_index MATCH ? AND workspace_id = ?
     ORDER BY rank
     LIMIT ?`,
    [query, workspaceId, Math.min(Math.max(limit, 1), 200)],
  );
  return rows.map((row) => ({
    kind: row.kind,
    refId: row.ref_id,
    appInstallId: row.app_install_id,
    title: row.title,
    snippet: row.snippet,
  }));
}

/** Rebuild the FTS index from the repository-owned source rows. */
export async function rebuildSearchIndex(db: HostDb, workspaceId: string): Promise<number> {
  return db.transaction(async (tx) => {
    await tx.exec('DELETE FROM search_index WHERE workspace_id = ?', [workspaceId]);
    const apps = await tx.select<{ id: string; app_id: string; manifest_json: string }>(
      'SELECT id, app_id, manifest_json FROM installed_microapps WHERE workspace_id = ?',
      [workspaceId],
    );
    let count = 0;
    for (const app of apps) {
      let name = app.app_id;
      try {
        const parsed: unknown = JSON.parse(app.manifest_json);
        if (parsed && typeof parsed === 'object' && 'name' in parsed && typeof parsed.name === 'string') {
          name = parsed.name;
        }
      } catch {
        name = app.app_id;
      }
      await tx.exec(
        `INSERT INTO search_index (workspace_id, kind, ref_id, app_install_id, title, body)
         VALUES (?, 'app', ?, ?, ?, ?)`,
        [workspaceId, app.id, app.id, name, app.app_id],
      );
      count += 1;
    }
    return count;
  });
}

// ---------------------------------------------------------------------------
// Storage pins
// ---------------------------------------------------------------------------

export type PinCategory = 'bundle' | 'database' | 'media' | 'cache';

export async function pinStorage(
  db: HostDb,
  input: {
    workspaceId: string;
    appInstallId: string;
    category: PinCategory;
    relativePath: string;
    nowMs?: number;
  },
): Promise<void> {
  await db.exec(
    `INSERT INTO storage_pins (workspace_id, app_install_id, category, relative_path, pinned_at_ms)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (workspace_id, app_install_id, category, relative_path) DO NOTHING`,
    [input.workspaceId, input.appInstallId, input.category, input.relativePath, input.nowMs ?? Date.now()],
  );
}

export async function unpinStorage(
  db: HostDb,
  input: { workspaceId: string; appInstallId: string; category: PinCategory; relativePath: string },
): Promise<void> {
  await db.exec(
    `DELETE FROM storage_pins
     WHERE workspace_id = ? AND app_install_id = ? AND category = ? AND relative_path = ?`,
    [input.workspaceId, input.appInstallId, input.category, input.relativePath],
  );
}

export async function listPins(
  db: HostDb,
  workspaceId: string,
): Promise<Array<{ appInstallId: string; category: PinCategory; relativePath: string }>> {
  const rows = await db.select<{ app_install_id: string; category: PinCategory; relative_path: string }>(
    'SELECT app_install_id, category, relative_path FROM storage_pins WHERE workspace_id = ?',
    [workspaceId],
  );
  return rows.map((row) => ({
    appInstallId: row.app_install_id,
    category: row.category,
    relativePath: row.relative_path,
  }));
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export async function getSetting<T>(db: HostDb, key: string, fallback: T): Promise<T> {
  const rows = await db.select<{ value_json: string }>('SELECT value_json FROM settings WHERE key = ?', [key]);
  const row = rows[0];
  if (!row) return fallback;
  try {
    return JSON.parse(row.value_json) as T;
  } catch {
    return fallback;
  }
}

export async function setSetting(db: HostDb, key: string, value: unknown, nowMs = Date.now()): Promise<void> {
  await db.exec(
    `INSERT INTO settings (key, value_json, updated_at_ms) VALUES (?, ?, ?)
     ON CONFLICT (key) DO UPDATE SET value_json = excluded.value_json, updated_at_ms = excluded.updated_at_ms`,
    [key, JSON.stringify(value), nowMs],
  );
}

// ---------------------------------------------------------------------------
// Studio drafts and Phase 0 migration ledger
// ---------------------------------------------------------------------------

export interface StudioDraft {
  id: string;
  workspaceId: string;
  name: string;
  status: 'draft' | 'active' | 'archived';
  document: Record<string, unknown>;
  revision: number;
}

export async function createStudioDraft(
  db: HostDb,
  input: {
    workspaceId: string;
    name: string;
    document?: Record<string, unknown>;
    sourceLegacyId?: string | null;
    nowMs?: number;
  },
): Promise<StudioDraft> {
  const now = input.nowMs ?? Date.now();
  const id = uuidv7(now);
  await db.exec(
    `INSERT INTO studio_project
       (id, workspace_id, name, status, source_legacy_id, document_json, revision, created_at_ms, updated_at_ms)
     VALUES (?, ?, ?, 'draft', ?, ?, 0, ?, ?)`,
    [id, input.workspaceId, input.name, input.sourceLegacyId ?? null, JSON.stringify(input.document ?? {}), now, now],
  );
  return {
    id,
    workspaceId: input.workspaceId,
    name: input.name,
    status: 'draft',
    document: input.document ?? {},
    revision: 0,
  };
}

export async function listStudioDrafts(db: HostDb, workspaceId: string): Promise<StudioDraft[]> {
  const rows = await db.select<{
    id: string;
    name: string;
    status: 'draft' | 'active' | 'archived';
    document_json: string;
    revision: number;
  }>(
    'SELECT id, name, status, document_json, revision FROM studio_project WHERE workspace_id = ? ORDER BY updated_at_ms DESC',
    [workspaceId],
  );
  return rows.map((row) => {
    let document: Record<string, unknown> = {};
    try {
      const parsed: unknown = JSON.parse(row.document_json);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        document = parsed as Record<string, unknown>;
      }
    } catch {
      document = {};
    }
    return {
      id: row.id,
      workspaceId,
      name: row.name,
      status: row.status,
      document,
      revision: Number(row.revision),
    };
  });
}

export interface MigrationReportInput {
  source: 'dexie-v6' | 'json-v1';
  counts: Record<string, number>;
  checksum?: string | null;
  notes?: string | null;
  nowMs?: number;
}

export async function startMigrationReport(db: HostDb, input: MigrationReportInput): Promise<string> {
  const now = input.nowMs ?? Date.now();
  const id = uuidv7(now);
  await db.exec(
    `INSERT INTO migration_report (id, source, started_at_ms, finished_at_ms, status, counts_json, checksum, notes)
     VALUES (?, ?, ?, NULL, 'running', ?, ?, ?)`,
    [id, input.source, now, JSON.stringify(input.counts), input.checksum ?? null, input.notes ?? null],
  );
  return id;
}

export async function finishMigrationReport(
  db: HostDb,
  id: string,
  status: 'done' | 'failed',
  counts?: Record<string, number>,
  nowMs = Date.now(),
): Promise<void> {
  await db.exec(
    `UPDATE migration_report SET status = ?, finished_at_ms = ?, counts_json = COALESCE(?, counts_json) WHERE id = ?`,
    [status, nowMs, counts ? JSON.stringify(counts) : null, id],
  );
}

export async function recordLegacyMapping(
  db: HostDb,
  input: { legacyStore: string; legacyId: string; newTable: string; newId: string; nowMs?: number },
): Promise<void> {
  await db.exec(
    `INSERT INTO legacy_record_map (legacy_store, legacy_id, new_table, new_id, migrated_at_ms)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (legacy_store, legacy_id) DO UPDATE SET new_table = excluded.new_table, new_id = excluded.new_id`,
    [input.legacyStore, input.legacyId, input.newTable, input.newId, input.nowMs ?? Date.now()],
  );
}

export async function resolveLegacyMapping(
  db: HostDb,
  legacyStore: string,
  legacyId: string,
): Promise<{ newTable: string; newId: string } | null> {
  const rows = await db.select<{ new_table: string; new_id: string }>(
    'SELECT new_table, new_id FROM legacy_record_map WHERE legacy_store = ? AND legacy_id = ?',
    [legacyStore, legacyId],
  );
  const row = rows[0];
  return row ? { newTable: row.new_table, newId: row.new_id } : null;
}

export async function recordMigrationBackup(
  db: HostDb,
  input: { source: string; relativePath: string; hash: Uint8Array; nowMs?: number },
): Promise<void> {
  await db.exec(
    'INSERT INTO migration_backup (id, source, relative_path, hash, created_at_ms) VALUES (?, ?, ?, ?, ?)',
    [uuidv7(input.nowMs ?? Date.now()), input.source, input.relativePath, input.hash, input.nowMs ?? Date.now()],
  );
}
