/**
 * Static package index sources.
 *
 * A "source" is a URL to a read-only JSON index plus the public key its entries
 * are expected to be signed with. Nothing here fetches on its own: refresh is a
 * user action, the response is length-capped, every entry is validated with a
 * strict schema, and an entry that fails validation is reported as unavailable
 * rather than silently dropped.
 */

import type { WorkerHostDb } from '@/db/client';
import { uuidv7 } from '@/db/ids';
import { bytesToHex, hexToBytes, sha256HexOfText } from '@/lib/bytes';

export const PERMISSION_IDS = [
  'clipboard.read',
  'clipboard.write',
  'notifications.local',
  'files.pick',
  'network.fetch',
  'storage.app',
  'vault.read',
  'share.export',
] as const;

type PermissionId = (typeof PERMISSION_IDS)[number];

export interface IndexEntry {
  id: string;
  name?: string;
  version: string;
  url: string;
  sha256: string;
  signature: string;
  publicKey?: string;
  permissions: PermissionId[];
  description?: string;
}

export interface PackageIndex {
  schemaVersion: 1;
  name: string;
  updatedAt: string;
  apps: IndexEntry[];
}

const ID_PATTERN = /^[a-z][a-z0-9]*(\.[a-z0-9]+){1,4}$/;
const SEMVER_PATTERN = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
const ENTRY_KEYS = new Set(['id', 'name', 'version', 'url', 'sha256', 'signature', 'publicKey', 'permissions', 'description']);
const INDEX_KEYS = new Set(['schemaVersion', 'name', 'updatedAt', 'apps']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Strict, dependency-free validation of a cached index entry.
 * Every unknown key is a rejection: the index is a trust boundary, so a field we
 * do not understand is a field we cannot honour.
 */
function parseEntry(raw: unknown): { entry: IndexEntry } | { error: string } {
  if (!isRecord(raw)) return { error: 'entry is not an object' };
  for (const key of Object.keys(raw)) {
    if (!ENTRY_KEYS.has(key)) return { error: `unknown field ${key}` };
  }
  if (typeof raw.id !== 'string' || !ID_PATTERN.test(raw.id)) return { error: 'invalid id' };
  if (raw.name !== undefined && (typeof raw.name !== 'string' || raw.name.length === 0 || raw.name.length > 80)) {
    return { error: 'invalid name' };
  }
  if (typeof raw.version !== 'string' || !SEMVER_PATTERN.test(raw.version)) return { error: 'invalid version' };
  if (typeof raw.url !== 'string' || !raw.url.startsWith('https://')) return { error: 'url must be https' };
  if (typeof raw.sha256 !== 'string' || !SHA256_PATTERN.test(raw.sha256)) return { error: 'invalid sha256' };
  if (typeof raw.signature !== 'string' || raw.signature.length < 16 || raw.signature.length > 512) {
    return { error: 'invalid signature' };
  }
  if (raw.publicKey !== undefined && (typeof raw.publicKey !== 'string' || raw.publicKey.length > 256)) {
    return { error: 'invalid publicKey' };
  }
  if (raw.description !== undefined && (typeof raw.description !== 'string' || raw.description.length > 280)) {
    return { error: 'invalid description' };
  }
  if (!Array.isArray(raw.permissions)) return { error: 'invalid permissions' };
  const permissions: PermissionId[] = [];
  for (const permission of raw.permissions) {
    if (typeof permission !== 'string' || !(PERMISSION_IDS as readonly string[]).includes(permission)) {
      return { error: 'unknown permission' };
    }
    if (!permissions.includes(permission as PermissionId)) permissions.push(permission as PermissionId);
  }
  const entry: IndexEntry = {
    id: raw.id,
    version: raw.version,
    url: raw.url,
    sha256: raw.sha256,
    signature: raw.signature,
    permissions,
  };
  if (typeof raw.name === 'string') entry.name = raw.name;
  if (typeof raw.publicKey === 'string') entry.publicKey = raw.publicKey;
  if (typeof raw.description === 'string') entry.description = raw.description;
  return { entry };
}

export interface IndexValidation {
  index: PackageIndex | null;
  unavailable: Array<{ index: number; reason: string }>;
}

export interface IndexSource {
  id: string;
  name: string;
  url: string;
  keyFingerprint: string;
  publicSigningKey: Uint8Array;
  cachedIndex: PackageIndex | null;
  lastFetchedAtMs: number | null;
  enabled: boolean;
}

export interface IndexValidation {
  index: PackageIndex | null;
  unavailable: Array<{ index: number; reason: string }>;
}

const MAX_INDEX_BYTES = 512 * 1024;

/**
 * Validate an index payload entry-by-entry so one bad row does not hide the rest.
 * The envelope itself must be strict.
 */
export function validateIndex(payload: unknown): IndexValidation {
  if (!isRecord(payload)) throw new Error('E-PACK-001 index is not an object');
  for (const key of Object.keys(payload)) {
    if (!INDEX_KEYS.has(key)) throw new Error(`E-PACK-001 unknown field ${key}`);
  }
  if (payload.schemaVersion !== 1) throw new Error('E-PACK-001 unsupported index version');
  if (typeof payload.name !== 'string' || payload.name.length === 0 || payload.name.length > 80) {
    throw new Error('E-PACK-001 index name is invalid');
  }
  if (typeof payload.updatedAt !== 'string' || !ISO_DATE.test(payload.updatedAt)) {
    throw new Error('E-PACK-001 index updatedAt is invalid');
  }
  if (!Array.isArray(payload.apps) || payload.apps.length > 500) {
    throw new Error('E-PACK-001 index apps must be an array of at most 500 entries');
  }

  const unavailable: IndexValidation['unavailable'] = [];
  const apps: IndexEntry[] = [];
  payload.apps.forEach((raw, index) => {
    const result = parseEntry(raw);
    if ('error' in result) unavailable.push({ index, reason: result.error });
    else apps.push(result.entry);
  });

  return { index: { schemaVersion: 1, name: payload.name, updatedAt: payload.updatedAt, apps }, unavailable };
}

export async function listSources(db: WorkerHostDb, workspaceId: string): Promise<IndexSource[]> {
  const rows = await db.select<{
    id: string;
    name: string;
    url: string;
    key_fingerprint: string;
    public_signing_key: Uint8Array;
    cached_index_json: string | null;
    last_fetched_at_ms: number | null;
    enabled: number;
  }>(
    `SELECT id, name, url, key_fingerprint, public_signing_key, cached_index_json,
            last_fetched_at_ms, enabled
     FROM registry_sources WHERE workspace_id = ? ORDER BY priority ASC, name ASC`,
    [workspaceId],
  );
  return rows.map((row) => {
    let cached: PackageIndex | null = null;
    if (row.cached_index_json) {
      try {
        // A cached row is accepted only if it still passes the strict envelope.
        cached = validateIndex(JSON.parse(row.cached_index_json) as unknown).index;
      } catch {
        cached = null;
      }
    }
    return {
      id: row.id,
      name: row.name,
      url: row.url,
      keyFingerprint: row.key_fingerprint,
      publicSigningKey: row.public_signing_key,
      cachedIndex: cached,
      lastFetchedAtMs: row.last_fetched_at_ms === null ? null : Number(row.last_fetched_at_ms),
      enabled: row.enabled === 1,
    };
  });
}

export async function addSource(
  db: WorkerHostDb,
  input: { workspaceId: string; name: string; url: string; publicKeyHex: string; nowMs?: number },
): Promise<IndexSource> {
  const url = new URL(input.url);
  if (url.protocol !== 'https:') throw new Error('E-PACK-001 source url must be https');
  const key = hexToBytes(input.publicKeyHex);
  if (key.length !== 32) throw new Error('E-PACK-002 source key must be 32 bytes');
  const fingerprint = `ed25519:${bytesToHex(key)}`;
  const now = input.nowMs ?? Date.now();
  const id = uuidv7(now);
  await db.exec(
    `INSERT INTO registry_sources
       (id, workspace_id, name, url, kind, trust_level, public_signing_key, key_fingerprint,
        cached_index_json, last_fetched_at_ms, cache_ttl_s, priority, enabled)
     VALUES (?, ?, ?, ?, 'http', 'community', ?, ?, NULL, NULL, 86400, 100, 1)`,
    [id, input.workspaceId, input.name.trim().slice(0, 80) || url.hostname, url.toString(), key, fingerprint],
  );
  return {
    id,
    name: input.name,
    url: url.toString(),
    keyFingerprint: fingerprint,
    publicSigningKey: key,
    cachedIndex: null,
    lastFetchedAtMs: null,
    enabled: true,
  };
}

/**
 * Fetch and cache an index. Only called from an explicit user action; the bytes
 * are capped before parsing and the cached copy is stored verbatim.
 */
export async function refreshSource(
  db: WorkerHostDb,
  source: IndexSource,
  nowMs = Date.now(),
): Promise<IndexValidation & { fetchedAtMs: number }> {
  const response = await fetch(source.url, { method: 'GET', credentials: 'omit', cache: 'no-store' });
  if (!response.ok) throw new Error('E-PACK-001 index request failed');
  const text = await response.text();
  if (text.length > MAX_INDEX_BYTES) throw new Error('E-PACK-001 index is too large');
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    throw new Error('E-PACK-001 index is not valid JSON');
  }
  const validation = validateIndex(parsed);
  await db.exec(
    'UPDATE registry_sources SET cached_index_json = ?, last_fetched_at_ms = ? WHERE id = ?',
    [JSON.stringify(validation.index), nowMs, source.id],
  );
  return { ...validation, fetchedAtMs: nowMs };
}

export async function removeSource(db: WorkerHostDb, sourceId: string): Promise<void> {
  await db.exec('DELETE FROM registry_sources WHERE id = ?', [sourceId]);
}

export interface AvailableUpdate {
  appId: string;
  installId: string;
  currentVersion: string;
  nextVersion: string;
  sourceName: string;
  entry: IndexEntry;
}

/**
 * Compare installed versions against the cached indexes — no network access.
 * Returns only entries whose semver is strictly newer.
 */
export function cachedUpdates(
  sources: IndexSource[],
  installed: Array<{ id: string; appId: string; version: string }>,
): AvailableUpdate[] {
  const updates: AvailableUpdate[] = [];
  for (const app of installed) {
    for (const source of sources) {
      if (!source.enabled || !source.cachedIndex) continue;
      for (const entry of source.cachedIndex.apps) {
        if (entry.id !== app.appId) continue;
        if (compareSemver(entry.version, app.version) <= 0) continue;
        updates.push({
          appId: app.appId,
          installId: app.id,
          currentVersion: app.version,
          nextVersion: entry.version,
          sourceName: source.name,
          entry,
        });
      }
    }
  }
  return updates;
}

export function compareSemver(a: string, b: string): number {
  const parse = (value: string): number[] =>
    value.split('-')[0].split('.').map((part) => Number.parseInt(part, 10) || 0);
  const left = parse(a);
  const right = parse(b);
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const diff = (left[index] ?? 0) - (right[index] ?? 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
}

/** Stable checksum of an index payload, shown in the source list. */
export async function indexChecksum(index: PackageIndex): Promise<string> {
  return sha256HexOfText(JSON.stringify(index));
}
