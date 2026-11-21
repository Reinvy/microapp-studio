/**
 * Host Bridge envelope and method registry.
 *
 * The table in `docs/03-specs/host-bridge.md` is the contract: 14 methods, each
 * with a permission (or none), a timeout, and a parameter validator. Anything
 * outside this table fails closed with `E-RUN-003` — there is no dynamic method
 * registration, no intents, and no native-era namespaces.
 *
 * Validation order (`host-bridge.md` B-03), split across modules:
 *   envelope/version + frame size  → this module (`parseRequest`)
 *   source/origin                  → the host listener (`sandbox/iframe-doc`)
 *   rate limit                     → `rate-limit.ts`
 *   declared method/permission     → `broker.ts`
 *   consent                        → `broker.ts` via `checkPermission`
 *   parameters                     → this module (`validateParams`)
 *   handler + audit                → `broker.ts`
 */

import { BridgeError } from './errors';
import { isRecord } from '../types/guards';

export const BRIDGE_VERSION = 1;
/** 256 KiB per frame, measured on the serialized envelope. */
export const MAX_FRAME_BYTES = 256 * 1024;
export const DEFAULT_TIMEOUT_MS = 10_000;
/** Heavy methods: file picker, network, share export. */
export const HEAVY_TIMEOUT_MS = 30_000;
export const MAX_REQUEST_ID_LENGTH = 64;
export const MAX_STRING_PARAM_LENGTH = 64 * 1024;

export interface BridgeRequest {
  v: number;
  id: string;
  ns: string;
  method: string;
  params: Record<string, unknown>;
}

export interface BridgeSuccess {
  id: string;
  ok: true;
  result: unknown;
}

export interface BridgeFailureResponse {
  id: string;
  ok: false;
  error: { code: string; message: string; retryable: boolean; details?: Record<string, unknown> };
}

export type BridgeResponse = BridgeSuccess | BridgeFailureResponse;

export interface MethodSpec {
  /** Permission id that must be declared and granted; `null` = no permission. */
  permission: string | null;
  timeoutMs: number;
  validate: (params: Record<string, unknown>) => Record<string, unknown>;
}

const isString = (value: unknown): value is string => typeof value === 'string';

function rejectUnknown(params: Record<string, unknown>, allowed: string[]): void {
  for (const key of Object.keys(params)) {
    if (!allowed.includes(key)) {
      throw new BridgeError('E-RUN-003', { field: key, reason: 'unknown_parameter' });
    }
  }
}

function requiredString(
  params: Record<string, unknown>,
  key: string,
  maxLength = MAX_STRING_PARAM_LENGTH,
): string {
  const value = params[key];
  if (!isString(value) || value.length === 0 || value.length > maxLength) {
    throw new BridgeError('E-RUN-003', { field: key, reason: 'expected_string' });
  }
  return value;
}

function optionalString(params: Record<string, unknown>, key: string, maxLength = MAX_STRING_PARAM_LENGTH): void {
  const value = params[key];
  if (value === undefined) return;
  if (!isString(value) || value.length > maxLength) {
    throw new BridgeError('E-RUN-003', { field: key, reason: 'expected_string' });
  }
}

function optionalJsonSize(params: Record<string, unknown>, key: string, maxBytes: number): void {
  const value = params[key];
  if (value === undefined) return;
  let encoded: string;
  try {
    encoded = JSON.stringify(value);
  } catch {
    throw new BridgeError('E-RUN-003', { field: key, reason: 'not_serializable' });
  }
  if (new TextEncoder().encode(encoded).byteLength > maxBytes) {
    throw new BridgeError('E-RUN-003', { field: key, reason: 'too_large' });
  }
}

const noParams = (params: Record<string, unknown>): Record<string, unknown> => {
  rejectUnknown(params, []);
  return {};
};

export const BRIDGE_METHODS: Readonly<Record<string, MethodSpec>> = {
  'ui.ready': { permission: null, timeoutMs: DEFAULT_TIMEOUT_MS, validate: noParams },
  'ui.toast': {
    permission: null,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    validate: (params) => {
      rejectUnknown(params, ['message', 'tone']);
      const message = requiredString(params, 'message', 500);
      const tone = params.tone;
      const tones = ['default', 'success', 'warning', 'error'];
      if (tone !== undefined && (!isString(tone) || !tones.includes(tone))) {
        throw new BridgeError('E-RUN-003', { field: 'tone', reason: 'expected_enum' });
      }
      return { message, tone: tone ?? 'default' };
    },
  },
  'storage.get': {
    permission: 'storage.app',
    timeoutMs: DEFAULT_TIMEOUT_MS,
    validate: (params) => {
      rejectUnknown(params, ['key']);
      return { key: requiredString(params, 'key', 512) };
    },
  },
  'storage.set': {
    permission: 'storage.app',
    timeoutMs: DEFAULT_TIMEOUT_MS,
    validate: (params) => {
      rejectUnknown(params, ['key', 'value']);
      const key = requiredString(params, 'key', 512);
      if (!('value' in params)) throw new BridgeError('E-RUN-003', { field: 'value', reason: 'missing' });
      optionalJsonSize(params, 'value', 64 * 1024);
      return { key, value: params.value };
    },
  },
  'storage.remove': {
    permission: 'storage.app',
    timeoutMs: DEFAULT_TIMEOUT_MS,
    validate: (params) => {
      rejectUnknown(params, ['key']);
      return { key: requiredString(params, 'key', 512) };
    },
  },
  'storage.keys': { permission: 'storage.app', timeoutMs: DEFAULT_TIMEOUT_MS, validate: noParams },
  'clipboard.read': { permission: 'clipboard.read', timeoutMs: DEFAULT_TIMEOUT_MS, validate: noParams },
  'clipboard.write': {
    permission: 'clipboard.write',
    timeoutMs: DEFAULT_TIMEOUT_MS,
    validate: (params) => {
      rejectUnknown(params, ['text']);
      return { text: requiredString(params, 'text', 64 * 1024) };
    },
  },
  'notify.local': {
    permission: 'notifications.local',
    timeoutMs: DEFAULT_TIMEOUT_MS,
    validate: (params) => {
      rejectUnknown(params, ['title', 'body']);
      const title = requiredString(params, 'title', 120);
      optionalString(params, 'body', 500);
      return { title, body: params.body ?? '' };
    },
  },
  'files.pick': {
    permission: 'files.pick',
    timeoutMs: HEAVY_TIMEOUT_MS,
    validate: (params) => {
      rejectUnknown(params, ['accept', 'maxBytes']);
      optionalString(params, 'accept', 200);
      const maxBytes = params.maxBytes;
      if (maxBytes !== undefined && (typeof maxBytes !== 'number' || !Number.isFinite(maxBytes) || maxBytes <= 0)) {
        throw new BridgeError('E-RUN-003', { field: 'maxBytes', reason: 'expected_number' });
      }
      return { accept: params.accept ?? null, maxBytes: maxBytes ?? 256 * 1024 };
    },
  },
  'net.fetch': {
    permission: 'network.fetch',
    timeoutMs: HEAVY_TIMEOUT_MS,
    validate: (params) => {
      rejectUnknown(params, ['origin', 'path', 'method', 'headers', 'body']);
      const origin = requiredString(params, 'origin', 300);
      try {
        const parsed = new URL(origin);
        if (parsed.protocol !== 'https:' || parsed.pathname !== '/' || parsed.search !== '' || parsed.hash !== '') {
          throw new Error('invalid origin');
        }
      } catch {
        throw new BridgeError('E-RUN-003', { field: 'origin', reason: 'expected_https_origin' });
      }
      optionalString(params, 'path', 512);
      optionalString(params, 'method', 8);
      optionalString(params, 'body', 32 * 1024);
      optionalJsonSize(params, 'headers', 4 * 1024);
      return { origin, path: params.path ?? '/', method: params.method ?? 'GET', headers: params.headers ?? {}, body: params.body ?? null };
    },
  },
  'vault.read': {
    permission: 'vault.read',
    timeoutMs: DEFAULT_TIMEOUT_MS,
    validate: (params) => {
      rejectUnknown(params, ['itemId']);
      return { itemId: requiredString(params, 'itemId', 128) };
    },
  },
  'share.export': {
    permission: 'share.export',
    timeoutMs: HEAVY_TIMEOUT_MS,
    validate: (params) => {
      rejectUnknown(params, ['suggestedName']);
      optionalString(params, 'suggestedName', 128);
      return { suggestedName: params.suggestedName ?? null };
    },
  },
  'app.getInfo': { permission: null, timeoutMs: DEFAULT_TIMEOUT_MS, validate: noParams },
};

export function methodKey(ns: string, method: string): string {
  return `${ns}.${method}`;
}

export function methodSpec(ns: string, method: string): MethodSpec | undefined {
  return BRIDGE_METHODS[methodKey(ns, method)];
}

export function isKnownPermission(permissionId: string): boolean {
  return Object.values(BRIDGE_METHODS).some((spec) => spec.permission === permissionId);
}

/** Parse and bound the envelope. Version and size are checked before anything else. */
export function parseRequest(raw: unknown): BridgeRequest {
  if (!isRecord(raw)) throw new BridgeError('E-RUN-003', { reason: 'envelope_not_object' });

  let serialized: string;
  try {
    serialized = JSON.stringify(raw);
  } catch {
    throw new BridgeError('E-RUN-003', { reason: 'envelope_not_serializable' });
  }
  if (new TextEncoder().encode(serialized).byteLength > MAX_FRAME_BYTES) {
    throw new BridgeError('E-RUN-003', { reason: 'frame_too_large' });
  }

  for (const key of Object.keys(raw)) {
    if (!['v', 'id', 'ns', 'method', 'params'].includes(key)) {
      throw new BridgeError('E-RUN-003', { field: key, reason: 'envelope_field_not_allowed' });
    }
  }
  if (raw.v !== BRIDGE_VERSION) throw new BridgeError('E-RUN-003', { reason: 'version_mismatch' });

  const id = raw.id;
  if (!isString(id) || id.length === 0 || id.length > MAX_REQUEST_ID_LENGTH) {
    throw new BridgeError('E-RUN-003', { reason: 'id_invalid' });
  }
  const ns = raw.ns;
  if (!isString(ns) || !/^[a-z][a-zA-Z]*$/.test(ns)) {
    throw new BridgeError('E-RUN-003', { reason: 'namespace_invalid' });
  }
  const method = raw.method;
  if (!isString(method) || !/^[a-z][a-zA-Z]*$/.test(method)) {
    throw new BridgeError('E-RUN-003', { reason: 'method_invalid' });
  }
  const params = raw.params ?? {};
  if (!isRecord(params)) throw new BridgeError('E-RUN-003', { reason: 'params_not_object' });

  return { v: BRIDGE_VERSION, id, ns, method, params };
}

export function validateParams(request: BridgeRequest): Record<string, unknown> {
  const spec = methodSpec(request.ns, request.method);
  if (!spec) throw new BridgeError('E-RUN-003', { reason: 'unknown_method' });
  return spec.validate(request.params);
}

export function effectiveTimeout(spec: MethodSpec): number {
  return spec.timeoutMs;
}
