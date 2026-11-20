/**
 * backup.ts — Pure backup/restore logic for MicroApp Studio.
 *
 * Defines the portable JSON backup format and the validation/sanitization
 * helpers behind the dashboard Export/Import feature. This module is kept free
 * of IndexedDB/Dexie so it can be unit-tested with vitest and reused by any
 * layer (repo, service, UI).
 *
 * Format envelope:
 * {
 *   "format": "microapp-studio-backup",
 *   "version": 1,
 *   "exportedAt": 1730000000000,
 *   "apps": [ AppSchema, ... ]
 * }
 */
import type { AppSchema } from '@/types/schema';
import { withSearchIndex } from '@/lib/searchIndex';

/** Format marker for portable backup files. */
export const BACKUP_FORMAT = 'microapp-studio-backup';
/** Current backup schema version. Bump on breaking format changes. */
export const BACKUP_VERSION = 1;

/** Portable backup file envelope. */
export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: number;
  apps: AppSchema[];
}

/** Result of importing a backup into the store. */
export interface ImportSummary {
  /** Records that were newly added. */
  imported: number;
  /** Records that overwrote an existing app with the same id. */
  replaced: number;
  /** Records skipped (e.g. invalid shape that could not be sanitized). */
  skipped: number;
  /** Records that failed validation and were dropped. */
  failed: number;
}

/** Serialize apps into the portable backup JSON string. */
export function serializeBackup(
  apps: AppSchema[],
  exportedAt: number = Date.now()
): string {
  const file: BackupFile = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt,
    apps,
  };
  return JSON.stringify(file, null, 2);
}

/**
 * Parse and structurally validate a backup JSON string.
 * Throws Error with a human-readable message on malformed input.
 */
export function parseBackup(json: string): BackupFile {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new Error('File is not valid JSON.');
  }

  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Backup file must be a JSON object.');
  }

  const obj = raw as Record<string, unknown>;

  if (obj.format !== BACKUP_FORMAT) {
    throw new Error('Not a MicroApp Studio backup file (missing format marker).');
  }
  if (typeof obj.version !== 'number' || obj.version > BACKUP_VERSION) {
    throw new Error(`Unsupported backup version ${String(obj.version)}.`);
  }
  if (!Array.isArray(obj.apps)) {
    throw new Error('Backup file contains no "apps" array.');
  }

  return {
    format: BACKUP_FORMAT,
    version: obj.version,
    exportedAt: typeof obj.exportedAt === 'number' ? obj.exportedAt : Date.now(),
    apps: obj.apps as AppSchema[],
  };
}

/**
 * Validate a single app record. Returns an array of human-readable problems
 * (empty array = valid). Structural checks only — no DB access.
 */
export function validateAppRecord(record: unknown): string[] {
  const problems: string[] = [];
  if (typeof record !== 'object' || record === null) {
    return ['Record is not an object.'];
  }
  const app = record as Record<string, unknown>;
  if (typeof app.id !== 'string' || app.id.length === 0) {
    problems.push('Missing string "id".');
  }
  if (typeof app.name !== 'string' || app.name.length === 0) {
    problems.push('Missing string "name".');
  }
  if (typeof app.description !== 'string') {
    problems.push('Missing string "description".');
  }
  if (typeof app.prompt !== 'string') {
    problems.push('Missing string "prompt".');
  }
  if (!Array.isArray(app.fields)) {
    problems.push('Missing array "fields".');
  }
  if (!Array.isArray(app.logicNodes)) {
    problems.push('Missing array "logicNodes".');
  }
  if (!Array.isArray(app.layout)) {
    problems.push('Missing array "layout".');
  }
  if (typeof app.createdAt !== 'number') {
    problems.push('Missing number "createdAt".');
  }
  if (typeof app.updatedAt !== 'number') {
    problems.push('Missing number "updatedAt".');
  }
  return problems;
}

/**
 * Normalize a raw record into a valid AppSchema, or return null when the
 * record is structurally broken. Repairable records get defaults for optional
 * fields and a fresh `nameLower` search key via withSearchIndex.
 */
export function sanitizeAppRecord(record: unknown): AppSchema | null {
  if (typeof record !== 'object' || record === null) return null;
  if (validateAppRecord(record).length > 0) return null;

  const app = record as Record<string, unknown>;

  const sanitized: AppSchema = {
    id: app.id as string,
    name: app.name as string,
    description: app.description as string,
    prompt: app.prompt as string,
    fields: Array.isArray(app.fields)
      ? (app.fields as AppSchema['fields']).filter(
          (f) => f && typeof f === 'object' && typeof (f as { id?: unknown }).id === 'string'
        )
      : [],
    logicNodes: Array.isArray(app.logicNodes)
      ? (app.logicNodes as AppSchema['logicNodes']).filter(
          (n) => n && typeof n === 'object'
        )
      : [],
    layout: Array.isArray(app.layout)
      ? (app.layout as AppSchema['layout']).filter(
          (l) => l && typeof l === 'object'
        )
      : [],
    createdAt: app.createdAt as number,
    updatedAt: app.updatedAt as number,
    version: typeof app.version === 'number' ? app.version : 1,
    settings:
      app.settings && typeof app.settings === 'object'
        ? (app.settings as AppSchema['settings'])
        : undefined,
  };

  // Re-attach the denormalized search key so imported records are immediately
  // findable by the indexed nameLower prefix scan.
  return withSearchIndex(sanitized);
}
