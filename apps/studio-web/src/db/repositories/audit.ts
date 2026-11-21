/**
 * Audit repository.
 *
 * `audit_log_chain` is the single append-only audit table; `sandbox_audit` is a
 * view over it. `seq_id` allocation and the insert run in one `BEGIN IMMEDIATE`
 * transaction so a crash cannot leave a gap (E-DATA-001).
 *
 * Hashing is injected: production passes the Rust core (`audit_hash`), tests pass
 * a deterministic test double. The canonical hash algorithm lives in Rust only.
 */

import type { HostDb } from '../driver';
import { uuidv7 } from '../ids';

export interface AuditPayloadInput {
  actor: string;
  action: string;
  target?: string | null;
  metadata?: Record<string, unknown>;
  createdAtMs?: number;
}

export interface AuditEntry {
  id: string;
  seqId: number;
  prevHash: string;
  entryHash: string;
  actor: string;
  action: string;
  target: string | null;
  metadata: Record<string, unknown>;
  createdAtMs: number;
}

/** `(prevHashHex, seqId, payloadJson) => entryHashHex` — Rust core in production. */
export type AuditHasher = (prevHashHex: string, seqId: number, payloadJson: string) => Promise<string>;

export const GENESIS_HASH = '0'.repeat(64);

interface AuditRow {
  id: string;
  seq_id: number;
  prev_hash: Uint8Array;
  entry_hash: Uint8Array;
  actor: string;
  action: string;
  target: string | null;
  metadata_json: string;
  created_at_ms: number;
}

function toHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function fromHex(hex: string): Uint8Array {
  if (hex.length !== 64 || !/^[0-9a-f]+$/.test(hex)) {
    throw new Error('E-DATA-001 audit hash must be 32 bytes of lowercase hex');
  }
  const bytes = new Uint8Array(32);
  for (let index = 0; index < 32; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

function toEntry(row: AuditRow): AuditEntry {
  let metadata: Record<string, unknown> = {};
  try {
    const parsed: unknown = JSON.parse(row.metadata_json);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      metadata = parsed as Record<string, unknown>;
    }
  } catch {
    metadata = {};
  }
  return {
    id: row.id,
    seqId: Number(row.seq_id),
    prevHash: toHex(row.prev_hash),
    entryHash: toHex(row.entry_hash),
    actor: row.actor,
    action: row.action,
    target: row.target,
    metadata,
    createdAtMs: Number(row.created_at_ms),
  };
}

/** Append one entry, chaining it to the current tail. */
export async function appendAudit(
  db: HostDb,
  payload: AuditPayloadInput,
  hasher: AuditHasher,
): Promise<AuditEntry> {
  const createdAtMs = payload.createdAtMs ?? Date.now();
  return db.transaction(async (tx) => {
    const tail = await tx.select<{ seq_id: number; entry_hash: Uint8Array }>(
      'SELECT seq_id, entry_hash FROM audit_log_chain ORDER BY seq_id DESC LIMIT 1',
    );
    const seqId = tail[0] ? Number(tail[0].seq_id) + 1 : 1;
    const prevHash = tail[0] ? toHex(tail[0].entry_hash) : GENESIS_HASH;
    const metadata = payload.metadata ?? {};
    const canonicalPayload = JSON.stringify({
      actor: payload.actor,
      action: payload.action,
      target: payload.target ?? null,
      metadata,
      created_at_ms: createdAtMs,
    });
    const entryHash = await hasher(prevHash, seqId, canonicalPayload);
    const id = uuidv7(createdAtMs);
    await tx.exec(
      `INSERT INTO audit_log_chain
         (id, seq_id, prev_hash, entry_hash, actor, action, target, metadata_json, created_at_ms)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        seqId,
        fromHex(prevHash),
        fromHex(entryHash),
        payload.actor,
        payload.action,
        payload.target ?? null,
        JSON.stringify(metadata),
        createdAtMs,
      ],
    );
    return {
      id,
      seqId,
      prevHash,
      entryHash,
      actor: payload.actor,
      action: payload.action,
      target: payload.target ?? null,
      metadata,
      createdAtMs,
    };
  });
}

/** Read the chain in order (bounded by `limit` and optional `afterSeq`). */
export async function listAudit(
  db: HostDb,
  options: { limit?: number; afterSeq?: number } = {},
): Promise<AuditEntry[]> {
  const limit = Math.min(Math.max(options.limit ?? 100, 1), 1000);
  const afterSeq = options.afterSeq ?? 0;
  const rows = await db.select<AuditRow>(
    'SELECT * FROM audit_log_chain WHERE seq_id > ? ORDER BY seq_id ASC LIMIT ?',
    [afterSeq, limit],
  );
  return rows.map(toEntry);
}

/**
 * Verify the chain: contiguous `seq_id`, matching `prev_hash`, recomputed hash.
 * Returns the first broken sequence number, or null when intact.
 */
export async function verifyAuditChain(db: HostDb, hasher: AuditHasher): Promise<number | null> {
  const rows = await db.select<AuditRow>('SELECT * FROM audit_log_chain ORDER BY seq_id ASC');
  let expectedPrev = GENESIS_HASH;
  for (const [index, row] of rows.entries()) {
    const expectedSeq = index + 1;
    if (Number(row.seq_id) !== expectedSeq) return expectedSeq;
    if (toHex(row.prev_hash) !== expectedPrev) return expectedSeq;
    const entry = toEntry(row);
    const canonicalPayload = JSON.stringify({
      actor: entry.actor,
      action: entry.action,
      target: entry.target,
      metadata: entry.metadata,
      created_at_ms: entry.createdAtMs,
    });
    const recomputed = await hasher(expectedPrev, expectedSeq, canonicalPayload);
    if (recomputed !== entry.entryHash) return expectedSeq;
    expectedPrev = entry.entryHash;
  }
  return null;
}

/** Sandbox-scoped audit trail (the `sandbox_audit` view). */
export async function listSandboxAudit(db: HostDb, limit = 100): Promise<AuditEntry[]> {
  const rows = await db.select<AuditRow>(
    `SELECT id, seq_id, prev_hash, entry_hash, actor, action, target, metadata_json, created_at_ms
     FROM sandbox_audit ORDER BY seq_id DESC LIMIT ?`,
    [limit],
  );
  return rows.map(toEntry);
}
