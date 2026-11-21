/**
 * Studio project repository.
 *
 * A project is a builder document plus a monotonically increasing `revision`.
 * Autosave is optimistic: the writer must send the revision it read, and a
 * mismatch means another tab (or a stale queue) wrote first. That is surfaced as
 * `E-STUDIO-002` so the builder keeps its local queue instead of clobbering.
 */

import type { HostDb } from '../driver';
import { uuidv7 } from '../ids';

export interface StudioProject {
  id: string;
  workspaceId: string;
  name: string;
  status: 'draft' | 'active' | 'archived';
  document: Record<string, unknown>;
  revision: number;
  createdAtMs: number;
  updatedAtMs: number;
}

interface StudioRow {
  id: string;
  workspace_id: string;
  name: string;
  status: 'draft' | 'active' | 'archived';
  document_json: string;
  revision: number;
  created_at_ms: number;
  updated_at_ms: number;
}

function parseDocument(raw: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return {};
  }
  return {};
}

function toProject(row: StudioRow): StudioProject {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    status: row.status,
    document: parseDocument(row.document_json),
    revision: Number(row.revision),
    createdAtMs: Number(row.created_at_ms),
    updatedAtMs: Number(row.updated_at_ms),
  };
}

export async function getStudioProject(
  db: HostDb,
  workspaceId: string,
  projectId: string,
): Promise<StudioProject | null> {
  const rows = await db.select<StudioRow>(
    'SELECT * FROM studio_project WHERE workspace_id = ? AND id = ?',
    [workspaceId, projectId],
  );
  return rows[0] ? toProject(rows[0]) : null;
}

export async function createStudioProject(
  db: HostDb,
  input: {
    workspaceId: string;
    name: string;
    document?: Record<string, unknown>;
    id?: string;
    /** Phase 0 legacy id, kept in the ledger so re-runs stay idempotent. */
    sourceLegacyId?: string | null;
    nowMs?: number;
  },
): Promise<StudioProject> {
  const now = input.nowMs ?? Date.now();
  const id = input.id ?? uuidv7(now);
  const document = input.document ?? {};
  await db.exec(
    `INSERT INTO studio_project
       (id, workspace_id, name, status, source_legacy_id, document_json, revision, created_at_ms, updated_at_ms)
     VALUES (?, ?, ?, 'draft', ?, ?, 0, ?, ?)`,
    [id, input.workspaceId, input.name, input.sourceLegacyId ?? null, JSON.stringify(document), now, now],
  );
  return {
    id,
    workspaceId: input.workspaceId,
    name: input.name,
    status: 'draft',
    document,
    revision: 0,
    createdAtMs: now,
    updatedAtMs: now,
  };
}

export interface SaveStudioProjectInput {
  workspaceId: string;
  projectId: string;
  document: Record<string, unknown>;
  /** Revision the caller read; the write only lands when it still matches. */
  revision: number;
  name?: string;
  nowMs?: number;
}

/**
 * Persist a document and bump the revision.
 * Returns the new revision. Throws `E-STUDIO-002` when the revision moved.
 */
export async function saveStudioProject(db: HostDb, input: SaveStudioProjectInput): Promise<number> {
  const now = input.nowMs ?? Date.now();
  const next = input.revision + 1;
  const assignments = ['document_json = ?', 'revision = ?', 'updated_at_ms = ?'];
  const params: Array<string | number> = [JSON.stringify(input.document), next, now];
  if (input.name !== undefined) {
    assignments.unshift('name = ?');
    params.unshift(input.name);
  }
  params.push(input.projectId, input.workspaceId, input.revision);
  const changed = await db.exec(
    `UPDATE studio_project SET ${assignments.join(', ')}
     WHERE id = ? AND workspace_id = ? AND revision = ?`,
    params,
  );
  if (changed === 0) {
    const exists = await db.select<{ revision: number }>(
      'SELECT revision FROM studio_project WHERE id = ? AND workspace_id = ?',
      [input.projectId, input.workspaceId],
    );
    if (!exists[0]) throw new Error('E-STUDIO-001 project not found');
    throw new Error('E-STUDIO-002 revision conflict');
  }
  return next;
}

export async function renameStudioProject(
  db: HostDb,
  workspaceId: string,
  projectId: string,
  name: string,
  nowMs = Date.now(),
): Promise<void> {
  const trimmed = name.trim().slice(0, 80);
  if (trimmed.length === 0) throw new Error('E-SET-001 project name is required');
  const changed = await db.exec(
    'UPDATE studio_project SET name = ?, updated_at_ms = ? WHERE id = ? AND workspace_id = ?',
    [trimmed, nowMs, projectId, workspaceId],
  );
  if (changed === 0) throw new Error('E-STUDIO-001 project not found');
}

export async function duplicateStudioProject(
  db: HostDb,
  workspaceId: string,
  projectId: string,
  name?: string,
  nowMs = Date.now(),
): Promise<StudioProject> {
  const source = await getStudioProject(db, workspaceId, projectId);
  if (!source) throw new Error('E-STUDIO-001 project not found');
  const id = uuidv7(nowMs);
  const copyName = (name ?? `${source.name} salinan`).trim().slice(0, 80);
  await db.exec(
    `INSERT INTO studio_project
       (id, workspace_id, name, status, source_legacy_id, document_json, revision, created_at_ms, updated_at_ms)
     VALUES (?, ?, ?, 'draft', ?, ?, 0, ?, ?)`,
    [id, workspaceId, copyName, source.id, JSON.stringify(source.document), nowMs, nowMs],
  );
  const created = await getStudioProject(db, workspaceId, id);
  if (!created) throw new Error('E-DATA-001 duplicate project missing after write');
  return created;
}

/** Newest drafts first; the Home "recent drafts" strip asks for five. */
export async function listRecentProjects(
  db: HostDb,
  workspaceId: string,
  limit = 5,
): Promise<StudioProject[]> {
  const rows = await db.select<StudioRow>(
    `SELECT * FROM studio_project
     WHERE workspace_id = ? AND status <> 'archived'
     ORDER BY updated_at_ms DESC
     LIMIT ?`,
    [workspaceId, Math.min(Math.max(limit, 1), 50)],
  );
  return rows.map(toProject);
}

export async function listAllProjects(db: HostDb, workspaceId: string): Promise<StudioProject[]> {
  const rows = await db.select<StudioRow>(
    'SELECT * FROM studio_project WHERE workspace_id = ? ORDER BY updated_at_ms DESC',
    [workspaceId],
  );
  return rows.map(toProject);
}

export async function deleteStudioProject(
  db: HostDb,
  workspaceId: string,
  projectId: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.exec('DELETE FROM studio_project WHERE id = ? AND workspace_id = ?', [projectId, workspaceId]);
    await tx.exec("DELETE FROM search_index WHERE workspace_id = ? AND kind = 'project' AND ref_id = ?", [
      workspaceId,
      projectId,
    ]);
  });
}
