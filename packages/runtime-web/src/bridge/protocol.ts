/**
 * Host Bridge envelope: parsing, method registry, and parameter validation.
 *
 * Validation order is binding (`host-bridge.md` B-03): version → frame size →
 * permission → parameters → rate limit → execution. This module owns version,
 * size, and parameter checks; the broker owns permission and rate limiting.
 */

import { BridgeError, type BridgeErrorBody } from './errors';
import { isRecord } from '../types/guards';

export const BRIDGE_VERSION = 1;
export const MAX_FRAME_BYTES = 1024 * 1024;
export const MAX_STREAM_CHUNK_BYTES = 256 * 1024;
export const MAX_INTENT_PAYLOAD_BYTES = 64 * 1024;
export const DEFAULT_TIMEOUT_MS = 10_000;
export const TRANSFER_TIMEOUT_MS = 60_000;
export const AI_TIMEOUT_MS = 120_000;
export const MAX_REQUEST_ID_LENGTH = 64;

export interface BridgeRequest {
  v: number;
  id: string;
  ns: string;
  method: string;
  params: Record<string, unknown>;
  timeoutMs?: number;
}

export interface BridgeSuccess {
  id: string;
  ok: true;
  result: unknown;
}

export interface BridgeFailureResponse {
  id: string;
  ok: false;
  error: BridgeErrorBody;
}

export type BridgeResponse = BridgeSuccess | BridgeFailureResponse;

/** Streaming frame: `{id, seq, chunk}` … `{id, done:true}` (B-08). */
export type StreamFrame =
  | { id: string; seq: number; chunk: string | Uint8Array }
  | { id: string; done: true };

export interface MethodSpec {
  /** Permission ID checked before parameters (B-03). `null` = no permission. */
  permission: string | null;
  timeoutMs: number;
  /** Methods that need per-transfer consent rather than a stored grant. */
  consent?: boolean;
  /** Disabled until a later phase: always E-SBX-005, no handler call. */
  disabled?: boolean;
  validate: (params: Record<string, unknown>) => Record<string, unknown>;
}

const isString = (value: unknown): value is string => typeof value === 'string';
const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

function rejectUnknown(params: Record<string, unknown>, allowed: string[]): void {
  for (const key of Object.keys(params)) {
    if (!allowed.includes(key)) {
      throw new BridgeError('E-SBX-005', { field: key, reason: 'unknown_parameter' });
    }
  }
}

function optionalString(params: Record<string, unknown>, key: string, maxLength = 64 * 1024): void {
  const value = params[key];
  if (value === undefined) return;
  if (!isString(value) || value.length > maxLength) {
    throw new BridgeError('E-SBX-005', { field: key, reason: 'expected_string' });
  }
}

function requiredString(params: Record<string, unknown>, key: string, maxLength = 64 * 1024): string {
  const value = params[key];
  if (!isString(value) || value.length === 0 || value.length > maxLength) {
    throw new BridgeError('E-SBX-005', { field: key, reason: 'expected_string' });
  }
  return value;
}

function optionalBoolean(params: Record<string, unknown>, key: string): void {
  const value = params[key];
  if (value !== undefined && typeof value !== 'boolean') {
    throw new BridgeError('E-SBX-005', { field: key, reason: 'expected_boolean' });
  }
}

function optionalNumber(params: Record<string, unknown>, key: string): void {
  const value = params[key];
  if (value !== undefined && !isFiniteNumber(value)) {
    throw new BridgeError('E-SBX-005', { field: key, reason: 'expected_number' });
  }
}

function validateSqlParams(params: Record<string, unknown>): Record<string, unknown> {
  rejectUnknown(params, ['sql', 'params']);
  const sql = requiredString(params, 'sql', 100_000);
  const bound = params.params;
  if (bound !== undefined && !Array.isArray(bound)) {
    throw new BridgeError('E-SBX-005', { field: 'params', reason: 'expected_array' });
  }
  return { sql, params: bound ?? [] };
}

function validateStorageKey(params: Record<string, unknown>): Record<string, unknown> {
  rejectUnknown(params, ['key', 'value']);
  const key = requiredString(params, 'key', 256);
  if (params.value !== undefined && typeof params.value !== 'string' && typeof params.value !== 'number') {
    throw new BridgeError('E-SBX-005', { field: 'value', reason: 'expected_scalar' });
  }
  return { key, value: params.value };
}

function validateFsPath(params: Record<string, unknown>): Record<string, unknown> {
  rejectUnknown(params, ['handleId', 'path', 'dataBase64', 'mode']);
  requiredString(params, 'handleId', 256);
  optionalString(params, 'path', 1024);
  optionalString(params, 'dataBase64', MAX_FRAME_BYTES);
  if (params.mode !== undefined && params.mode !== 'read' && params.mode !== 'write') {
    throw new BridgeError('E-SBX-005', { field: 'mode', reason: 'expected_enum' });
  }
  return params;
}

function validateCamera(params: Record<string, unknown>): Record<string, unknown> {
  rejectUnknown(params, ['facing', 'format']);
  if (params.facing !== undefined && params.facing !== 'environment' && params.facing !== 'user') {
    throw new BridgeError('E-SBX-005', { field: 'facing', reason: 'expected_enum' });
  }
  if (params.format !== undefined && params.format !== 'jpeg' && params.format !== 'png') {
    throw new BridgeError('E-SBX-005', { field: 'format', reason: 'expected_enum' });
  }
  return params;
}

function validateNotification(params: Record<string, unknown>): Record<string, unknown> {
  rejectUnknown(params, ['id', 'title', 'body', 'deepLink', 'scheduledAtMs']);
  optionalString(params, 'id', 64);
  optionalString(params, 'title', 200);
  optionalString(params, 'body', 2000);
  optionalString(params, 'deepLink', 2048);
  optionalNumber(params, 'scheduledAtMs');
  return params;
}

function validateDevice(params: Record<string, unknown>): Record<string, unknown> {
  rejectUnknown(params, ['coarse', 'serviceIds', 'timeoutMs']);
  optionalBoolean(params, 'coarse');
  optionalNumber(params, 'timeoutMs');
  if (params.serviceIds !== undefined) {
    if (!Array.isArray(params.serviceIds) || params.serviceIds.some((id) => !isString(id))) {
      throw new BridgeError('E-SBX-005', { field: 'serviceIds', reason: 'expected_string_array' });
    }
  }
  return params;
}

function validateVault(params: Record<string, unknown>): Record<string, unknown> {
  rejectUnknown(params, ['itemId']);
  requiredString(params, 'itemId', 64);
  return params;
}

function validateIntent(params: Record<string, unknown>): Record<string, unknown> {
  rejectUnknown(params, ['intent', 'target', 'payload', 'route']);
  requiredString(params, 'intent', 128);
  optionalString(params, 'target', 256);
  optionalString(params, 'route', 2048);
  const payload = params.payload;
  if (payload !== undefined) {
    const encoded = typeof payload === 'string' ? payload : JSON.stringify(payload);
    if (encoded.length > MAX_INTENT_PAYLOAD_BYTES) {
      throw new BridgeError('E-SBX-009', { reason: 'payload_too_large' });
    }
  }
  return params;
}

function validateNetwork(params: Record<string, unknown>): Record<string, unknown> {
  rejectUnknown(params, ['url', 'method', 'headers', 'body', 'timeoutMs']);
  const url = requiredString(params, 'url', 2048);
  if (!url.startsWith('https://')) {
    throw new BridgeError('E-SBX-005', { field: 'url', reason: 'https_required' });
  }
  if (params.method !== undefined) {
    const method = String(params.method).toUpperCase();
    if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      throw new BridgeError('E-SBX-005', { field: 'method', reason: 'expected_enum' });
    }
  }
  if (params.headers !== undefined && !isRecord(params.headers)) {
    throw new BridgeError('E-SBX-005', { field: 'headers', reason: 'expected_object' });
  }
  optionalString(params, 'body', MAX_FRAME_BYTES);
  optionalNumber(params, 'timeoutMs');
  return params;
}

function validateSync(params: Record<string, unknown>): Record<string, unknown> {
  rejectUnknown(params, ['peerId']);
  optionalString(params, 'peerId', 64);
  return params;
}

function validateLog(params: Record<string, unknown>): Record<string, unknown> {
  rejectUnknown(params, ['level', 'message']);
  if (params.level !== undefined && !['debug', 'info', 'warn', 'error'].includes(String(params.level))) {
    throw new BridgeError('E-SBX-005', { field: 'level', reason: 'expected_enum' });
  }
  requiredString(params, 'message', 8192);
  return params;
}

const passthrough = (params: Record<string, unknown>): Record<string, unknown> => params;

function disabled(): never {
  // Phase-gated features fail closed instead of silently doing nothing.
  throw new BridgeError('E-SBX-005', { reason: 'not_available_in_this_host_version' });
}

/**
 * Canonical method registry. `ui.*` is intentionally absent: MUIP rendering is
 * internal to the sandbox iframe (ADR-0014).
 */
export const BRIDGE_METHODS: Record<string, MethodSpec> = {
  'db.query': { permission: 'storage.local.sqlite', timeoutMs: DEFAULT_TIMEOUT_MS, validate: validateSqlParams },
  'db.exec': { permission: 'storage.local.sqlite', timeoutMs: DEFAULT_TIMEOUT_MS, validate: validateSqlParams },
  'db.transaction': { permission: 'storage.local.sqlite', timeoutMs: DEFAULT_TIMEOUT_MS, validate: (params) => {
    rejectUnknown(params, ['statements']);
    if (!Array.isArray(params.statements)) {
      throw new BridgeError('E-SBX-005', { field: 'statements', reason: 'expected_array' });
    }
    for (const statement of params.statements) {
      if (!isRecord(statement) || !isString(statement.sql)) {
        throw new BridgeError('E-SBX-005', { field: 'statements', reason: 'expected_statement' });
      }
    }
    return params;
  } },
  'db.migrate': { permission: 'storage.local.sqlite', timeoutMs: TRANSFER_TIMEOUT_MS, validate: (params) => {
    rejectUnknown(params, ['version']);
    if (!isFiniteNumber(params.version)) {
      throw new BridgeError('E-SBX-005', { field: 'version', reason: 'expected_number' });
    }
    return params;
  } },
  'storage.get': { permission: 'storage.local', timeoutMs: DEFAULT_TIMEOUT_MS, validate: validateStorageKey },
  'storage.set': { permission: 'storage.local', timeoutMs: DEFAULT_TIMEOUT_MS, validate: validateStorageKey },
  'storage.remove': { permission: 'storage.local', timeoutMs: DEFAULT_TIMEOUT_MS, validate: validateStorageKey },
  'storage.keys': { permission: 'storage.local', timeoutMs: DEFAULT_TIMEOUT_MS, validate: passthrough },
  'fs.pick': { permission: 'filesystem.picker', timeoutMs: TRANSFER_TIMEOUT_MS, validate: validateFsPath },
  'fs.read': { permission: 'filesystem.picker', timeoutMs: TRANSFER_TIMEOUT_MS, validate: validateFsPath },
  'fs.write': { permission: 'filesystem.picker', timeoutMs: TRANSFER_TIMEOUT_MS, validate: validateFsPath },
  'fs.stat': { permission: 'filesystem.picker', timeoutMs: TRANSFER_TIMEOUT_MS, validate: validateFsPath },
  'camera.capture': { permission: 'camera', timeoutMs: TRANSFER_TIMEOUT_MS, validate: validateCamera },
  'camera.scanQr': { permission: 'camera.qr', timeoutMs: TRANSFER_TIMEOUT_MS, validate: validateCamera },
  'camera.scanBarcode': { permission: 'camera.qr', timeoutMs: TRANSFER_TIMEOUT_MS, validate: validateCamera },
  'microphone.record': { permission: 'microphone', timeoutMs: TRANSFER_TIMEOUT_MS, validate: validateCamera },
  'notifications.schedule': { permission: 'notifications.local', timeoutMs: DEFAULT_TIMEOUT_MS, validate: validateNotification },
  'notifications.cancel': { permission: 'notifications.local', timeoutMs: DEFAULT_TIMEOUT_MS, validate: validateNotification },
  'notifications.list': { permission: 'notifications.local', timeoutMs: DEFAULT_TIMEOUT_MS, validate: passthrough },
  'device.info': { permission: null, timeoutMs: DEFAULT_TIMEOUT_MS, validate: passthrough },
  'device.biometrics': { permission: 'biometrics', timeoutMs: DEFAULT_TIMEOUT_MS, validate: validateDevice },
  'device.location': { permission: 'location', timeoutMs: DEFAULT_TIMEOUT_MS, validate: validateDevice },
  'device.bluetooth': { permission: 'bluetooth', timeoutMs: DEFAULT_TIMEOUT_MS, validate: validateDevice },
  'device.nfc': { permission: 'nfc', timeoutMs: DEFAULT_TIMEOUT_MS, validate: validateDevice },
  'sync.status': { permission: null, timeoutMs: DEFAULT_TIMEOUT_MS, validate: passthrough },
  'sync.request': { permission: null, timeoutMs: DEFAULT_TIMEOUT_MS, validate: validateSync },
  'sync.cancel': { permission: null, timeoutMs: DEFAULT_TIMEOUT_MS, validate: validateSync },
  'log.write': { permission: null, timeoutMs: DEFAULT_TIMEOUT_MS, validate: validateLog },
  'log.flush': { permission: null, timeoutMs: DEFAULT_TIMEOUT_MS, validate: passthrough },
  'intents.dispatch': { permission: null, consent: true, timeoutMs: DEFAULT_TIMEOUT_MS, validate: validateIntent },
  'intents.canHandle': { permission: null, timeoutMs: DEFAULT_TIMEOUT_MS, validate: validateIntent },
  'intents.route': { permission: null, consent: true, timeoutMs: DEFAULT_TIMEOUT_MS, validate: validateIntent },
  'vault.read': { permission: 'vault.read', timeoutMs: DEFAULT_TIMEOUT_MS, validate: validateVault },
  'network.fetch': { permission: 'network.allowlist', timeoutMs: TRANSFER_TIMEOUT_MS, validate: validateNetwork },
  'network.subscribe': { permission: 'network.allowlist', timeoutMs: TRANSFER_TIMEOUT_MS, validate: validateNetwork },
  // Phase-gated: AI and workflow arrive in phase 3 and must fail closed now.
  'ai.infer': { permission: 'local_ai.inference', timeoutMs: AI_TIMEOUT_MS, disabled: true, validate: disabled },
  'ai.embed': { permission: 'local_ai.inference', timeoutMs: AI_TIMEOUT_MS, disabled: true, validate: disabled },
  'ai.classify': { permission: 'local_ai.inference', timeoutMs: AI_TIMEOUT_MS, disabled: true, validate: disabled },
  'workflow.run': { permission: null, timeoutMs: AI_TIMEOUT_MS, disabled: true, validate: disabled },
};

export function methodSpec(ns: string, method: string): MethodSpec | undefined {
  return BRIDGE_METHODS[`${ns}.${method}`];
}

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,64}$/;

export interface ParseOptions {
  supportedVersion?: number;
  maxFrameBytes?: number;
}

/** Parse and shape-validate an envelope; throws BridgeError on violation. */
export function parseRequest(raw: unknown, options: ParseOptions = {}): BridgeRequest {
  const supportedVersion = options.supportedVersion ?? BRIDGE_VERSION;
  const maxFrameBytes = options.maxFrameBytes ?? MAX_FRAME_BYTES;

  if (!isRecord(raw)) {
    throw new BridgeError('E-SBX-005', { reason: 'envelope_not_object' });
  }
  // 1. Version negotiation happens before anything else (B-11).
  if (!isFiniteNumber(raw.v) || raw.v !== supportedVersion) {
    throw new BridgeError('E-SBX-001', { reason: 'unsupported_bridge_version', supportedVersion });
  }
  // 2. Frame size.
  let encoded: string;
  try {
    encoded = JSON.stringify(raw);
  } catch {
    throw new BridgeError('E-SBX-005', { reason: 'envelope_not_serializable' });
  }
  if (new TextEncoder().encode(encoded).length > maxFrameBytes) {
    throw new BridgeError('E-SBX-005', { reason: 'frame_too_large', maxFrameBytes });
  }
  // 3. Envelope shape.
  if (!isString(raw.id) || !REQUEST_ID_PATTERN.test(raw.id)) {
    throw new BridgeError('E-SBX-005', { reason: 'invalid_request_id' });
  }
  if (!isString(raw.ns) || !isString(raw.method)) {
    throw new BridgeError('E-SBX-005', { reason: 'invalid_namespace' });
  }
  if (raw.params !== undefined && !isRecord(raw.params)) {
    throw new BridgeError('E-SBX-005', { reason: 'params_not_object' });
  }
  if (raw.timeoutMs !== undefined && (!isFiniteNumber(raw.timeoutMs) || raw.timeoutMs <= 0)) {
    throw new BridgeError('E-SBX-005', { reason: 'invalid_timeout' });
  }
  const spec = methodSpec(raw.ns, raw.method);
  if (!spec) {
    // B-18: unknown methods never fall back to another API.
    throw new BridgeError('E-SBX-005', { reason: 'unknown_method', method: `${raw.ns}.${raw.method}` });
  }
  return {
    v: raw.v,
    id: raw.id,
    ns: raw.ns,
    method: raw.method,
    params: (raw.params as Record<string, unknown> | undefined) ?? {},
    timeoutMs: raw.timeoutMs as number | undefined,
  };
}

/** Validate parameters for a parsed request; returns normalized params. */
export function validateParams(request: BridgeRequest): Record<string, unknown> {
  const spec = methodSpec(request.ns, request.method);
  if (!spec) {
    throw new BridgeError('E-SBX-005', { reason: 'unknown_method' });
  }
  if (spec.disabled) {
    throw new BridgeError('E-SBX-005', { reason: 'not_available_in_this_host_version' });
  }
  return spec.validate(request.params);
}

/** Effective timeout for a method, clamped to the method maximum. */
export function effectiveTimeout(request: BridgeRequest, platformOverride?: number): number {
  const spec = methodSpec(request.ns, request.method);
  const ceiling = platformOverride ?? spec?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const requested = request.timeoutMs ?? ceiling;
  return Math.min(requested, ceiling);
}
