/**
 * Encrypted `.mapp-backup` v2 export, preview, and restore.
 *
 * The container is built and verified by the Rust core (`backup_seal_v2` /
 * `backup_open_v2`): `MAPPBK01 | u16 version=2 | u16 sectionCount | salt[16] |
 * m | t | p | manifestNonce | manifestLen | manifestCiphertext | repeated
 * sections`. This module only collects plaintext sections, counts rows, and
 * applies verified sections to SQLite. It never logs the passphrase or the
 * recovery phrase.
 *
 * Restore is all-or-nothing: every section checksum is verified before the
 * first write; current host/app databases are exported with
 * `sqlite3_js_db_export` into `restore/<txid>/`; app rows apply in app
 * transactions, host rows in one host transaction; bundle files are staged
 * under the restore prefix. Any failure restores the snapshots and the
 * original `apps/` tree before rethrowing.
 */

import type { HostDb, SqlValue } from '@/db/driver';
import type { WorkerHostDb } from '@/db/client';
import { AppDatabase, type AppDbRecord } from '@/features/appdb/appDb';
import {
  deleteOpfsTree,
  readOpfsTree,
  writeOpfsFile,
  type OpfsFile,
} from '@/features/storage/opfs';
import { createCoreClient, coreWasmUrl, loadCoreWasm } from '@microapp/runtime-web';
import { saveIdentitySecret } from '@/features/identity/secureStore';

export const BACKUP_HEADER = 'MAPPBK01';
export const BACKUP_FORMAT_VERSION = 2;
export const MIN_PASSPHRASE_LENGTH = 12;
export const APP_DATA_SCHEMA_VERSION = 1;

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

export type EncodedValue = string | number | null | { b64: string };
export type EncodedRow = Record<string, EncodedValue>;
export type BackupRows = Record<string, EncodedRow[]>;

export interface BackupWorkspace {
  id: string;
  name: string;
  slug: string;
  locale: string;
}

export interface BackupApp {
  id: string;
  appId: string;
  version?: string;
}

export interface BackupSectionInput {
  name: string;
  plaintextBase64: string;
}

export interface BackupManifestSection {
  name: string;
  sha256: string;
}

export interface OpenedBackupManifest {
  formatVersion: number;
  createdAt: number;
  workspace: unknown;
  sections: BackupManifestSection[];
}

export interface OpenedBackup {
  manifest: OpenedBackupManifest;
  sections: BackupSectionInput[];
  createdAt: number;
  workspace: unknown;
}

/**
 * Crypto seam. The default implementation calls the Rust core; tests inject a
 * deterministic adapter so the service can be exercised without wasm.
 */
export interface BackupCrypto {
  sealV2(
    passphrase: string,
    sections: BackupSectionInput[],
    workspace: string | null,
    createdAtMs: number,
  ): Promise<Uint8Array>;
  openV2(passphrase: string, bytes: Uint8Array): Promise<OpenedBackup>;
}

/** OPFS seam: the browser uses the real OPFS helpers, tests use memory. */
export interface BackupStorage {
  readTree(path: string): Promise<OpfsFile[]>;
  writeFile(path: string, bytes: Uint8Array): Promise<void>;
  deleteTree(path: string): Promise<void>;
}

export interface BackupPreview {
  createdAt: number;
  workspace: string | null;
  sections: Array<{ name: string; rows: number }>;
}

export interface RestoreResult {
  restored: Array<{ name: string; rows: number }>;
  /** True when the backup has no recovery phrase; device keys cannot return. */
  mnemonicMissing: boolean;
}

interface IdentitySection {
  row: EncodedRow | null;
  mnemonic: string | null;
}

interface AppSection {
  schemaVersion: number;
  rows: AppDbRecord[];
}

interface SettingsSection {
  workspace: BackupWorkspace | null;
  preferences: EncodedRow | null;
}

const opfsStorage: BackupStorage = {
  readTree: (path) => readOpfsTree(path),
  writeFile: (path, bytes) => writeOpfsFile(path, bytes),
  deleteTree: (path) => deleteOpfsTree(path),
};

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

export function decodeValue(value: EncodedValue | undefined): SqlValue {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string' || typeof value === 'number') return value;
  const binary = atob(value.b64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function fail(code: string, detail: string): Error {
  return new Error(`${code} ${detail}`);
}

function assertPassphrase(passphrase: string): void {
  if ([...passphrase].length < MIN_PASSPHRASE_LENGTH) {
    throw fail('E-SET-001', `backup passphrase must be at least ${MIN_PASSPHRASE_LENGTH} characters`);
  }
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function encodeSection(value: unknown): string {
  return bytesToBase64(new TextEncoder().encode(JSON.stringify(value)));
}

function decodeSection<T>(section: BackupSectionInput): T {
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(base64ToBytes(section.plaintextBase64)));
  } catch {
    throw fail('E-BACKUP-002', `section ${section.name} is not valid JSON`);
  }
  if (typeof parsed !== 'object' || parsed === null) {
    throw fail('E-BACKUP-002', `section ${section.name} is not an object`);
  }
  return parsed as T;
}

function headerVersion(bytes: Uint8Array): { magic: string; version: number } {
  if (bytes.byteLength < 10) throw fail('E-BACKUP-002', 'backup file is truncated');
  const magic = new TextDecoder().decode(bytes.slice(0, 8));
  if (magic !== BACKUP_HEADER) throw fail('E-BACKUP-002', 'not a .mapp-backup container');
  const version = (bytes[8]! << 8) | bytes[9]!;
  if (version !== BACKUP_FORMAT_VERSION) {
    // v1 containers are rejected deliberately; there is no migration path.
    throw fail('E-BACKUP-002', `unsupported backup format version ${version}`);
  }
  return { magic, version };
}

async function defaultCrypto(): Promise<BackupCrypto> {
  const client = createCoreClient(await loadCoreWasm(coreWasmUrl()));
  return {
    async sealV2(passphrase, sections, workspace, createdAtMs) {
      return client.backupSealV2(passphrase, JSON.stringify({ workspace, sections }), createdAtMs);
    },
    async openV2(passphrase, bytes) {
      const raw = await client.backupOpenV2(passphrase, bytes);
      return JSON.parse(raw) as OpenedBackup;
    },
  };
}

function normalizeCryptoError(error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error);
  if (message.startsWith('E-BACKUP-001')) return error as Error;
  if (message.startsWith('E-BACKUP-002')) return error as Error;
  if (message.startsWith('E-SET-001')) return error as Error;
  return fail('E-BACKUP-002', message);
}

export async function collectHostDb(db: HostDb): Promise<BackupRows> {
  const sections: BackupRows = {};
  for (const table of BACKUP_TABLES) {
    const rows = await db.select<Record<string, unknown>>(`SELECT * FROM ${table}`);
    sections[table] = rows.map((row) => {
      const encoded: EncodedRow = {};
      for (const [key, value] of Object.entries(row)) encoded[key] = encodeValue(value);
      return encoded;
    });
  }
  return sections;
}

function workspaceName(value: unknown): string | null {
  if (typeof value === 'string' && value.length > 0) return value;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (typeof record.name === 'string') return record.name;
    if (typeof record.slug === 'string') return record.slug;
  }
  return null;
}

async function readAppDatabase(input: {
  db: HostDb;
  workspace: BackupWorkspace;
  app: BackupApp;
  appDbs?: (app: BackupApp) => Promise<AppDatabase>;
}): Promise<AppDatabase> {
  if (input.appDbs) return input.appDbs(input.app);
  const client = input.db as WorkerHostDb;
  if (typeof client.openApp !== 'function') {
    throw fail('E-DATA-001', 'app database access is unavailable');
  }
  const database = new AppDatabase(client, {
    workspaceSlug: input.workspace.slug,
    appInstallId: input.app.id,
    appId: input.app.appId,
  });
  await database.open();
  return database;
}

/** Build a complete `.mapp-backup` v2 file. */
export async function createBackup(input: {
  db: HostDb;
  workspace: BackupWorkspace;
  apps: readonly BackupApp[];
  passphrase: string;
  identitySecret: string | null;
  nowMs?: number;
  crypto?: BackupCrypto;
  storage?: BackupStorage;
  appDbs?: (app: BackupApp) => Promise<AppDatabase>;
}): Promise<Uint8Array> {
  assertPassphrase(input.passphrase);
  const createdAt = input.nowMs ?? Date.now();
  const crypto = input.crypto ?? (await defaultCrypto());
  const storage = input.storage ?? opfsStorage;

  const host = await collectHostDb(input.db);
  const identityRow = host.local_identity?.[0] ?? null;
  const identity: IdentitySection = { row: identityRow, mnemonic: input.identitySecret };
  const settingsRows = host.settings ?? [];
  const preferencesRow = settingsRows.find((row) => row.key === 'preferences') ?? null;
  const settings: SettingsSection = { workspace: input.workspace, preferences: preferencesRow };

  const sections: Array<{ name: string; value: unknown }> = [
    { name: 'identity', value: identity },
    { name: 'host', value: host },
  ];

  for (const app of input.apps) {
    const database = await readAppDatabase({ db: input.db, workspace: input.workspace, app, appDbs: input.appDbs });
    const rows = await database.allRows();
    sections.push({
      name: `app:${app.id}`,
      value: { schemaVersion: APP_DATA_SCHEMA_VERSION, rows } satisfies AppSection,
    });
  }

  // Keys are relative to `apps/`, so restore can rebuild `apps/<key>` without
  // storing an absolute OPFS path in the backup section.
  const bundleFiles = await storage.readTree('apps');
  sections.push({
    name: 'bundles',
    value: Object.fromEntries(
      bundleFiles
        .filter((file) => file.path.startsWith('apps/'))
        .map((file) => [file.path.slice('apps/'.length), file.base64]),
    ),
  });
  sections.push({ name: 'settings', value: settings });

  const sealed = await crypto
    .sealV2(
      input.passphrase,
      sections.map((section) => ({ name: section.name, plaintextBase64: encodeSection(section.value) })),
      input.workspace.name,
      createdAt,
    )
    .catch((error: unknown) => {
      throw normalizeCryptoError(error);
    });

  const { version } = headerVersion(sealed);
  if (version !== BACKUP_FORMAT_VERSION) throw fail('E-BACKUP-002', 'crypto adapter produced an unknown version');
  return sealed;
}

interface ParsedBackup {
  opened: OpenedBackup;
  identity: IdentitySection;
  host: BackupRows;
  apps: Map<string, AppSection>;
  bundles: Record<string, string>;
  settings: SettingsSection;
}

function parseSections(sections: BackupSectionInput[]): Pick<ParsedBackup, 'identity' | 'host' | 'apps' | 'bundles' | 'settings'> {
  const byName = new Map<string, BackupSectionInput>();
  for (const section of sections) {
    if (byName.has(section.name)) throw fail('E-BACKUP-002', `duplicate section ${section.name}`);
    byName.set(section.name, section);
  }

  const identitySection = byName.get('identity');
  const identity: IdentitySection = identitySection
    ? decodeSection<IdentitySection>(identitySection)
    : { row: null, mnemonic: null };
  if (identity.row !== null && (typeof identity.row !== 'object' || Array.isArray(identity.row))) {
    throw fail('E-BACKUP-002', 'identity row is invalid');
  }
  if (identity.mnemonic !== null && typeof identity.mnemonic !== 'string') {
    throw fail('E-BACKUP-002', 'identity mnemonic is invalid');
  }

  const hostSection = byName.get('host');
  const host = hostSection ? decodeSection<BackupRows>(hostSection) : {};
  for (const [table, rows] of Object.entries(host)) {
    if (!Array.isArray(rows)) throw fail('E-BACKUP-002', `host table ${table} is not an array`);
  }

  const apps = new Map<string, AppSection>();
  for (const [name, section] of byName) {
    if (!name.startsWith('app:')) continue;
    const installId = name.slice(4);
    if (installId.length === 0) throw fail('E-BACKUP-002', 'app section has no install id');
    const parsed = decodeSection<AppSection>(section);
    if (parsed.schemaVersion !== APP_DATA_SCHEMA_VERSION || !Array.isArray(parsed.rows)) {
      throw fail('E-BACKUP-002', `app section ${name} has an unsupported schema`);
    }
    for (const row of parsed.rows) {
      if (!row || typeof row.key !== 'string' || typeof row.updatedAtMs !== 'number') {
        throw fail('E-BACKUP-002', `app section ${name} contains an invalid record`);
      }
    }
    apps.set(installId, parsed);
  }

  const bundleSection = byName.get('bundles');
  const bundles = bundleSection ? decodeSection<Record<string, string>>(bundleSection) : {};
  for (const [path, value] of Object.entries(bundles)) {
    if (typeof value !== 'string') throw fail('E-BACKUP-002', `bundle ${path} is not base64`);
  }

  const settingsSection = byName.get('settings');
  const settings = settingsSection
    ? decodeSection<SettingsSection>(settingsSection)
    : { workspace: null, preferences: null };

  return { identity, host, apps, bundles, settings };
}

function countSections(parsed: Pick<ParsedBackup, 'identity' | 'host' | 'apps' | 'bundles' | 'settings'>): Array<{ name: string; rows: number }> {
  const counts: Array<{ name: string; rows: number }> = [];
  for (const [name, section] of parsed.apps) counts.push({ name: `app:${name}`, rows: section.rows.length });
  counts.push({ name: 'identity', rows: parsed.identity.row ? 1 : 0 });
  counts.push({
    name: 'host',
    rows: Object.values(parsed.host).reduce((sum, table) => sum + table.length, 0),
  });
  counts.push({ name: 'bundles', rows: Object.keys(parsed.bundles).length });
  counts.push({ name: 'settings', rows: parsed.settings.preferences ? 1 : 0 });
  return counts;
}

async function openBackup(
  bytes: Uint8Array,
  passphrase: string,
  crypto?: BackupCrypto,
): Promise<{ parsed: ParsedBackup; preview: BackupPreview }> {
  headerVersion(bytes);
  assertPassphrase(passphrase);
  const adapter = crypto ?? (await defaultCrypto());
  let opened: OpenedBackup;
  try {
    opened = await adapter.openV2(passphrase, bytes);
  } catch (error) {
    throw normalizeCryptoError(error);
  }
  if (opened.manifest?.formatVersion !== BACKUP_FORMAT_VERSION) {
    throw fail('E-BACKUP-002', 'manifest formatVersion mismatch');
  }
  if (!Array.isArray(opened.manifest.sections) || !Array.isArray(opened.sections)) {
    throw fail('E-BACKUP-002', 'backup sections are missing');
  }
  if (opened.manifest.sections.length !== opened.sections.length) {
    throw fail('E-BACKUP-002', 'manifest does not list every section');
  }
  const parsed = { opened, ...parseSections(opened.sections) };
  const preview: BackupPreview = {
    createdAt: Number(opened.createdAt ?? opened.manifest.createdAt),
    workspace: workspaceName(opened.workspace ?? opened.manifest.workspace),
    sections: countSections(parsed),
  };
  return { parsed, preview };
}

/** Verify the passphrase and every section checksum without applying anything. */
export async function previewBackup(
  bytes: Uint8Array,
  passphrase: string,
  crypto?: BackupCrypto,
): Promise<BackupPreview> {
  return (await openBackup(bytes, passphrase, crypto)).preview;
}

function insertRow(
  mode: 'merge' | 'replace',
  table: string,
  row: EncodedRow,
): { sql: string; params: SqlValue[] } | null {
  const columns = Object.keys(row);
  if (columns.length === 0) return null;
  const placeholders = columns.map(() => '?').join(', ');
  return {
    sql: `INSERT ${mode === 'merge' ? 'OR IGNORE ' : ''}INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
    params: columns.map((column) => decodeValue(row[column])),
  };
}

function appDatabasePathFor(database: AppDatabase): string {
  const key = database.identity;
  return `workspaces/${key.workspaceSlug}/apps/${key.appId}.db`;
}

async function snapshotHost(db: HostDb): Promise<Uint8Array | null> {
  const capable = db as HostDb & { snapshot?: () => Promise<Uint8Array> };
  if (typeof capable.snapshot !== 'function') return null;
  return capable.snapshot();
}

async function detachAndReopen(
  db: HostDb,
  snapshots: Array<{ path: string; bytes: Uint8Array }>,
  storage: BackupStorage | null,
): Promise<void> {
  const capable = db as HostDb & { detach?: () => Promise<void>; reopen?: () => Promise<void> };
  if (!storage || snapshots.length === 0) return;
  if (typeof capable.detach !== 'function' || typeof capable.reopen !== 'function') return;
  await capable.detach();
  try {
    for (const snapshot of snapshots) await storage.writeFile(snapshot.path, snapshot.bytes);
  } finally {
    await capable.reopen();
  }
}

/** Restore a verified backup. Callers MUST obtain explicit confirmation first. */
export async function restoreBackup(input: {
  db: HostDb;
  bytes: Uint8Array;
  passphrase: string;
  mode: 'merge' | 'replace';
  workspace: BackupWorkspace;
  appDbs: (installId: string) => Promise<AppDatabase>;
  crypto?: BackupCrypto;
  storage?: BackupStorage;
  saveIdentitySecret?: (mnemonic: string) => Promise<void>;
}): Promise<RestoreResult> {
  assertPassphrase(input.passphrase);
  const storage = input.storage ?? opfsStorage;
  const { parsed } = await openBackup(input.bytes, input.passphrase, input.crypto);

  const txid = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const restoreDir = `restore/${txid}`;
  const stagingDir = `${restoreDir}/staging`;

  // App ids come from the backup's install rows, so a fresh device can open the
  // per-app database before the host rows are applied.
  const appIdByInstall = new Map<string, string>();
  for (const row of parsed.host.installed_microapps ?? []) {
    if (typeof row.id === 'string' && typeof row.app_id === 'string') {
      appIdByInstall.set(row.id, row.app_id);
    }
  }
  const openAppForRestore = async (installId: string): Promise<AppDatabase> => {
    try {
      return await input.appDbs(installId);
    } catch (error) {
      const client = input.db as WorkerHostDb;
      const appId = appIdByInstall.get(installId);
      if (!appId || typeof client.openApp !== 'function') throw error;
      const database = new AppDatabase(client, {
        workspaceSlug: input.workspace.slug,
        appInstallId: installId,
        appId,
      });
      await database.open();
      return database;
    }
  };

  // 1. Snapshot every database that will change, before the first write.
  const hostSnapshot = await snapshotHost(input.db);
  const localIdentityBefore = await input.db.select<{ id: string }>('SELECT id FROM local_identity LIMIT 1');
  const appDatabases = new Map<string, AppDatabase>();
  const dbSnapshots: Array<{ path: string; bytes: Uint8Array }> = [];
  if (hostSnapshot) dbSnapshots.push({ path: 'microapp-studio/host.db', bytes: hostSnapshot });
  for (const installId of parsed.apps.keys()) {
    const database = await openAppForRestore(installId);
    appDatabases.set(installId, database);
    const snapshot = await database.snapshot().catch(() => null);
    if (snapshot) dbSnapshots.push({ path: appDatabasePathFor(database), bytes: snapshot });
  }
  for (const snapshot of dbSnapshots) {
    await storage.writeFile(`${restoreDir}/${snapshot.path}`, snapshot.bytes);
  }

  const originalBundles = Object.keys(parsed.bundles).length > 0 ? await storage.readTree('apps') : [];

  const restoreBundles = async (): Promise<void> => {
    if (Object.keys(parsed.bundles).length === 0) return;
    const staged = await storage.readTree(stagingDir);
    const source: OpfsFile[] =
      staged.length > 0
        ? staged.map((file) => ({
            path: file.path.slice(`${stagingDir}/`.length),
            base64: file.base64,
          }))
        : Object.entries(parsed.bundles).map(([path, base64]) => ({ path, base64 }));
    await storage.deleteTree('apps');
    for (const file of source) {
      await storage.writeFile(`apps/${file.path}`, base64ToBytes(file.base64));
    }
  };

  const rollback = async (): Promise<void> => {
    try {
      await detachAndReopen(input.db, dbSnapshots, storage);
    } catch {
      // Snapshot restore is best effort; the original error is what matters.
    }
    for (const database of appDatabases.values()) {
      await database.close().catch(() => undefined);
    }
    try {
      if (originalBundles.length > 0 || Object.keys(parsed.bundles).length > 0) {
        await storage.deleteTree('apps');
        for (const file of originalBundles) {
          await storage.writeFile(file.path, base64ToBytes(file.base64));
        }
      }
    } catch {
      // Bundles are user files; never mask the database failure with this one.
    }
    await storage.deleteTree(restoreDir).catch(() => undefined);
  };

  try {
    // 2. Stage bundle files; nothing replaces `apps/` until the DBs commit.
    if (Object.keys(parsed.bundles).length > 0) {
      for (const [path, base64] of Object.entries(parsed.bundles)) {
        await storage.writeFile(`${stagingDir}/${path}`, base64ToBytes(base64));
      }
    }

    // 3. App rows first, each in its own transaction.
    const restored: Array<{ name: string; rows: number }> = [];
    for (const [installId, section] of parsed.apps) {
      const database = appDatabases.get(installId) ?? (await openAppForRestore(installId));
      const written =
        input.mode === 'replace'
          ? await database.replaceRows(section.rows)
          : await database.mergeRows(section.rows);
      restored.push({ name: `app:${installId}`, rows: written });
    }

    // Merge keeps the local workspace when the backup carries the same slug or
    // another default workspace. Children are remapped to the surviving row so
    // `INSERT OR IGNORE` never leaves a dangling foreign key.
    const workspaceRemap = new Map<string, string>();
    if (input.mode === 'merge') {
      const local = await input.db.select<{ id: string; slug: string; is_default: number }>(
        'SELECT id, slug, is_default FROM workspaces',
      );
      const bySlug = new Map(local.map((row) => [row.slug, row.id]));
      const hasDefault = local.some((row) => Number(row.is_default) === 1);
      for (const row of parsed.host.workspaces ?? []) {
        const id = typeof row.id === 'string' ? row.id : '';
        const slug = typeof row.slug === 'string' ? row.slug : '';
        if (!id || !slug) continue;
        const existing = bySlug.get(slug);
        if (existing) {
          workspaceRemap.set(id, existing);
        } else if (hasDefault && Number(row.is_default) === 1) {
          row.is_default = 0;
        }
      }
    }

    // 4. Host rows in one transaction: parents first on insert, children first
    //    on delete so foreign keys never block either direction.
    const hostRowsWritten = await input.db.transaction(async (tx) => {
      if (input.mode === 'replace') {
        for (const table of [...BACKUP_TABLES].reverse()) {
          await tx.exec(`DELETE FROM ${table}`);
        }
      }
      let written = 0;
      for (const table of BACKUP_TABLES) {
        const rows = parsed.host[table] ?? [];
        for (const row of rows) {
          if (table === 'workspaces' && typeof row.id === 'string' && workspaceRemap.has(row.id)) {
            continue;
          }
          const workspaceId =
            table === 'workspaces'
              ? null
              : typeof row.workspace_id === 'string'
                ? workspaceRemap.get(row.workspace_id)
                : undefined;
          const effective = workspaceId ? { ...row, workspace_id: workspaceId } : row;
          const statement = insertRow(input.mode, table, effective);
          if (!statement) continue;
          await tx.exec(statement.sql, statement.params);
          written += 1;
        }
      }
      return written;
    });
    restored.push({ name: 'host', rows: hostRowsWritten });

    // 5. Identity: the host rows carry `local_identity`; this fallback covers
    //    older/hand-built containers and writes the recovery phrase separately.
    const identityInHost = (parsed.host.local_identity?.length ?? 0) > 0;
    if (!identityInHost && parsed.identity.row) {
      const statement = insertRow(input.mode, 'local_identity', parsed.identity.row);
      if (statement) await input.db.exec(statement.sql, statement.params);
    }
    // The settings section stays independent of the host table snapshot; merge
    // may import it without replacing a local preference row.
    if (input.mode === 'merge' && parsed.settings.preferences) {
      const statement = insertRow('merge', 'settings', parsed.settings.preferences);
      if (statement) await input.db.exec(statement.sql, statement.params);
    }
    const mnemonic = parsed.identity.mnemonic;
    const shouldSaveMnemonic =
      mnemonic !== null && (input.mode === 'replace' || localIdentityBefore.length === 0);
    if (shouldSaveMnemonic && mnemonic) {
      await (input.saveIdentitySecret ?? saveIdentitySecret)(mnemonic);
    }

    // 6. Commit bundle files and drop the staging/snapshot prefix.
    await restoreBundles();
    await storage.deleteTree(restoreDir);
    return { restored, mnemonicMissing: mnemonic === null };
  } catch (error) {
    await rollback();
    throw error;
  }
}

