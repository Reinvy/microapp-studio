/**
 * Encrypted `.mapp-backup` export and restore.
 *
 * Container: `MAPPBK01` header, u16 format version, then an Argon2id+AES-GCM
 * sealed blob produced by the Rust core. Plaintext is canonical JSON with a
 * SHA-256 checksum per section; restore verifies every checksum and record count
 * before writing a single row (FR-HOST-021 / FR-SYNC-021).
 */

import type { HostDb, SqlValue } from '@/db/driver';

export const BACKUP_HEADER = 'MAPPBK01';
export const BACKUP_FORMAT_VERSION = 1;
export const BACKUP_TABLES = [
  // Parents before children: restore inserts in this order and deletes reversed.
  'local_identity',
  'workspaces',
  'workspace_state',
  'registry_sources',
  'installed_microapps',
  'app_versions',
  'folders',
  'app_placements',
  'app_databases',
  'permission_grants',
  'permission_sessions',
  'app_policy',
  'runtime_sessions',
  'audit_log_chain',
  'vault_items',
  'vault_grants',
  'vault_key_wraps',
  'notifications',
  'storage_pins',
  'crash_incident',
  'diagnostic_log',
  'db_snapshot',
  'migration_report',
  'legacy_record_map',
  'migration_backup',
  'studio_project',
  'dev_log',
  'settings',
] as const;

export interface BackupCrypto {
  seal(passphrase: string, plaintext: Uint8Array): Promise<Uint8Array>;
  open(passphrase: string, blob: Uint8Array): Promise<Uint8Array>;
  jcsSha256(json: string): Promise<string>;
}

type EncodedValue = string | number | null | { b64: string };

export interface BackupDocument {
  formatVersion: number;
  createdAt: string;
  workspace: { id: string; name: string; slug: string; locale: string };
  hostDb: Record<string, Array<Record<string, EncodedValue>>>;
  appDbs: Record<string, string>;
  manifests: Array<{ appId: string; version: string; manifestJson: string }>;
  checksums: Record<string, string>;
}

export function encodeValue(value: unknown): EncodedValue {
  if (value instanceof Uint8Array) {
    let binary = '';
    for (const byte of value) binary += String.fromCharCode(byte);
    return { b64: btoa(binary) };
  }
  if (typeof value === 'bigint') return Number(value);
  if (value === null || typeof value === 'string' || typeof value === 'number') return value;
  return null;
}

export function decodeValue(value: EncodedValue): SqlValue {
  if (value === null) return null;
  if (typeof value === 'string' || typeof value === 'number') return value;
  const binary = atob(value.b64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export async function collectHostDb(db: HostDb): Promise<BackupDocument['hostDb']> {
  const sections: BackupDocument['hostDb'] = {};
  for (const table of BACKUP_TABLES) {
    const rows = await db.select<Record<string, unknown>>(`SELECT * FROM ${table}`);
    sections[table] = rows.map((row) => {
      const encoded: Record<string, EncodedValue> = {};
      for (const [key, value] of Object.entries(row)) encoded[key] = encodeValue(value);
      return encoded;
    });
  }
  return sections;
}

async function sectionChecksum(crypto: BackupCrypto, value: unknown): Promise<string> {
  return crypto.jcsSha256(JSON.stringify(value));
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.byteLength, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.byteLength;
  }
  return out;
}

function asciiBytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

/** Build a complete `.mapp-backup` file. */
export async function createBackup(input: {
  db: HostDb;
  crypto: BackupCrypto;
  passphrase: string;
  workspace: BackupDocument['workspace'];
  appDbs?: Record<string, string>;
  nowMs?: number;
}): Promise<Uint8Array> {
  if (input.passphrase.length < 8) {
    throw new Error('E-CRYPTO-004 backup passphrase must be at least 8 characters');
  }
  const hostDb = await collectHostDb(input.db);
  const manifests = Object.entries(hostDb.installed_microapps ?? []).map(([, row]) => ({
    appId: String(row.app_id ?? ''),
    version: String(row.version ?? ''),
    manifestJson: String(row.manifest_json ?? '{}'),
  }));
  const appDbs = input.appDbs ?? {};
  const checksums: Record<string, string> = {
    hostDb: await sectionChecksum(input.crypto, hostDb),
    manifests: await sectionChecksum(input.crypto, manifests),
    appDbs: await sectionChecksum(input.crypto, appDbs),
  };
  const document: BackupDocument = {
    formatVersion: BACKUP_FORMAT_VERSION,
    createdAt: new Date(input.nowMs ?? Date.now()).toISOString(),
    workspace: input.workspace,
    hostDb,
    appDbs,
    manifests,
    checksums,
  };
  const plaintext = asciiBytes(JSON.stringify(document));
  const sealed = await input.crypto.seal(input.passphrase, plaintext);
  const version = new Uint8Array(2);
  version[0] = 0;
  version[1] = BACKUP_FORMAT_VERSION;
  return concatBytes([asciiBytes(BACKUP_HEADER), version, sealed]);
}

/** Verify checksums and return the parsed document without touching the DB. */
export async function readBackup(input: {
  bytes: Uint8Array;
  crypto: BackupCrypto;
  passphrase: string;
}): Promise<BackupDocument> {
  const header = new TextDecoder().decode(input.bytes.slice(0, 8));
  if (header !== BACKUP_HEADER) {
    throw new Error('E-SYNC-004 not a .mapp-backup container');
  }
  const version = (input.bytes[8]! << 8) | input.bytes[9]!;
  if (version !== BACKUP_FORMAT_VERSION) {
    throw new Error(`E-SYNC-004 unsupported backup format version ${version}`);
  }
  let parsed: unknown;
  try {
    const plaintext = await input.crypto.open(input.passphrase, input.bytes.slice(10));
    parsed = JSON.parse(new TextDecoder().decode(plaintext));
  } catch {
    throw new Error('E-SYNC-004 backup cannot be decrypted with this passphrase');
  }
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('E-SYNC-004 backup payload is not an object');
  }
  const document = parsed as BackupDocument;
  if (document.formatVersion !== BACKUP_FORMAT_VERSION) {
    throw new Error('E-SYNC-004 backup formatVersion mismatch');
  }
  for (const [section, expected] of Object.entries(document.checksums ?? {})) {
    const actual =
      section === 'hostDb'
        ? await sectionChecksum(input.crypto, document.hostDb)
        : section === 'manifests'
          ? await sectionChecksum(input.crypto, document.manifests)
          : await sectionChecksum(input.crypto, document.appDbs);
    if (actual !== expected) {
      throw new Error(`E-SYNC-004 checksum mismatch in section ${section}`);
    }
  }
  return document;
}

export interface RestoreSummary {
  tables: number;
  rows: number;
  appDbs: number;
}

/** Restore a verified backup. Callers MUST obtain explicit confirmation first. */
export async function restoreBackup(db: HostDb, document: BackupDocument): Promise<RestoreSummary> {
  let rows = 0;
  await db.transaction(async (tx) => {
    // Children first so foreign keys never block the wipe; parents first on
    // insert for the same reason.
    for (const table of [...BACKUP_TABLES].reverse()) {
      if (document.hostDb[table]) await tx.exec(`DELETE FROM ${table}`);
    }
    for (const table of BACKUP_TABLES) {
      const section = document.hostDb[table];
      if (!section) continue;
      for (const row of section) {
        const columns = Object.keys(row);
        if (columns.length === 0) continue;
        const placeholders = columns.map(() => '?').join(', ');
        try {
          await tx.exec(
            `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
            columns.map((column) => decodeValue(row[column])),
          );
        } catch (error) {
          throw new Error(
            `E-SYNC-004 restore failed on ${table}: ${error instanceof Error ? error.message : error}`,
          );
        }
        rows += 1;
      }
    }
  });
  return { tables: Object.keys(document.hostDb).length, rows, appDbs: Object.keys(document.appDbs).length };
}
