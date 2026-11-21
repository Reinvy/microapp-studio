/**
 * DevTools log repository.
 *
 * Redaction happens *before* insert, so the table can never contain a token, a
 * passphrase, a key, or an absolute path — even if a caller logs a whole object
 * by mistake. The redactor is exported because the browser-side panels need the
 * same rules when they render a row.
 */

import type { HostDb } from '../driver';
import { uuidv7 } from '../ids';

export type DevLogKind = 'bridge' | 'error' | 'flag';
export type DevLogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface DevLogInput {
  workspaceId: string;
  kind: DevLogKind;
  level: DevLogLevel;
  code?: string | null;
  /** Plain text or a structured payload; both are redacted before insert. */
  message: unknown;
  appId?: string | null;
  nowMs?: number;
}

export interface DevLogEntry {
  id: string;
  kind: DevLogKind;
  level: DevLogLevel;
  code: string | null;
  message: string;
  appId: string | null;
  createdAtMs: number;
}

const SENSITIVE_KEY = /(token|secret|passphrase|password|key|authorization|cookie|mnemonic)/i;
const JWT = /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g;
const PEM = /-----BEGIN [A-Z ]+-----[\s\S]*?-----END [A-Z ]+-----/g;
const LONG_BASE64 = /\b[A-Za-z0-9+/]{60,}={0,2}\b/g;
const ABSOLUTE_PATH = /(?:\/(?:home|Users|var|tmp|etc|opt|mnt)\/[^\s"']*|[A-Za-z]:\\[^\s"']*)/g;
const REDACTED = '[redacted]';

/** Redact a value for storage; depth-limited so cycles cannot hang the caller. */
export function redactForLog(value: unknown, depth = 0): unknown {
  if (depth > 6) return REDACTED;
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return redactText(value);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => redactForLog(item, depth + 1));
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SENSITIVE_KEY.test(key) ? REDACTED : redactForLog(nested, depth + 1);
    }
    return out;
  }
  return REDACTED;
}

/** Redact secrets and machine-specific paths out of a plain message. */
export function redactText(text: string): string {
  return text
    .replace(PEM, REDACTED)
    .replace(JWT, REDACTED)
    .replace(LONG_BASE64, REDACTED)
    .replace(ABSOLUTE_PATH, REDACTED)
    .replace(/\b(E-[A-Z]+-\d{3})\s+([^\n]*)/g, (match, code: string, rest: string) => `${code} ${redactText(rest)}`);
}

/** Serialise a message: strings stay as text, objects become redacted JSON. */
function messageFor(message: unknown): string {
  const redacted = typeof message === 'string' ? redactText(message) : JSON.stringify(redactForLog(message));
  return redacted.length > 2000 ? `${redacted.slice(0, 2000)}…` : redacted;
}

export async function appendDevLog(db: HostDb, input: DevLogInput): Promise<void> {
  const now = input.nowMs ?? Date.now();
  await db.exec(
    `INSERT INTO dev_log (id, workspace_id, kind, level, code, message, app_id, created_at_ms)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [uuidv7(now), input.workspaceId, input.kind, input.level, input.code ?? null, messageFor(input.message), input.appId ?? null, now],
  );
}

export async function listDevLog(
  db: HostDb,
  workspaceId: string,
  options: { kind?: DevLogKind; level?: DevLogLevel; limit?: number } = {},
): Promise<DevLogEntry[]> {
  const clauses = ['workspace_id = ?'];
  const params: Array<string | number> = [workspaceId];
  if (options.kind) {
    clauses.push('kind = ?');
    params.push(options.kind);
  }
  if (options.level) {
    clauses.push('level = ?');
    params.push(options.level);
  }
  params.push(Math.min(Math.max(options.limit ?? 200, 1), 500));
  const rows = await db.select<{
    id: string;
    kind: DevLogKind;
    level: DevLogLevel;
    code: string | null;
    message: string;
    app_id: string | null;
    created_at_ms: number;
  }>(
    `SELECT id, kind, level, code, message, app_id, created_at_ms FROM dev_log
     WHERE ${clauses.join(' AND ')}
     ORDER BY created_at_ms DESC LIMIT ?`,
    params,
  );
  return rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    level: row.level,
    code: row.code,
    message: row.message,
    appId: row.app_id,
    createdAtMs: Number(row.created_at_ms),
  }));
}

export async function clearDevLog(db: HostDb, workspaceId: string, kind?: DevLogKind): Promise<void> {
  if (kind) {
    await db.exec('DELETE FROM dev_log WHERE workspace_id = ? AND kind = ?', [workspaceId, kind]);
    return;
  }
  await db.exec('DELETE FROM dev_log WHERE workspace_id = ?', [workspaceId]);
}
