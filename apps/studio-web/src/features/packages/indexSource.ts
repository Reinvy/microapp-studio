/**
 * Static package index sources.
 *
 * A "source" is a URL to a read-only JSON index plus the public key its entries
 * are expected to be signed with. Nothing here fetches on its own: refresh is a
 * user action, the response is length-capped, every entry is validated with a
 * strict schema, and an entry that fails validation is reported as unavailable
 * rather than silently dropped.
 */

import { z } from 'zod';
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

const indexEntrySchema = z
  .object({
    id: z.string().regex(/^[a-z][a-z0-9]*(\.[a-z0-9]+){1,4}$/),
    name: z.string().min(1).max(80).optional(),
    version: z.string().regex(/^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/),
    url: z.string().url().startsWith('https://'),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    signature: z.string().min(16).max(512),
    publicKey: z.string().min(8).max(256).optional(),
    permissions: z.array(z.enum(PERMISSION_IDS)).max(PERMISSION_IDS.length),
    description: z.string().max(280).optional(),
  })
  .strict();

export const indexSchema = z
  .object({
    schemaVersion: z.literal(1),
    name: z.string().min(1).max(80),
    updatedAt: z.string().datetime(),
    apps: z.array(indexEntrySchema).max(500),
  })
  .strict();

export type IndexEntry = z.infer<typeof indexEntrySchema>;
export type PackageIndex = z.infer<typeof indexSchema>;

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
 * The document envelope itself must be strict.
 */
export function validateIndex(payload: unknown): IndexValidation {
  if (!payload || typeof payload !== 'object') {
    throw new Error('E-PACK-001 index is not an object');
  }
  const record = payload as Record<string, unknown>;
  const apps = Array.isArray(record.apps) ? record.apps : [];
  const unavailable: IndexValidation['unavailable'] = [];
  const good: unknown[] = [];
  apps.forEach((entry, index) => {
    const parsed = indexEntrySchema.safeParse(entry);
    if (parsed.success) good.push(entry);
    else unavailable.push({ index, reason: parsed.error.issues[0]?.message ?? 'invalid entry' });
  });
  const envelope = indexSchema.safeParse({ ...record, apps: good });
  if (!envelope.success) {
    // The envelope is broken (wrong schema version / name / timestamp): fail closed.
    throw new Error(`E-PACK-001 ${envelope.error.issues[0]?.message ?? 'index is invalid'}`);
  }
  return { index: envelope.data, unavailable };
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
        const parsed = indexSchema.safeParse(JSON.parse(row.cached_index_json) as unknown);
        cached = parsed.success ? parsed.data : null;
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
