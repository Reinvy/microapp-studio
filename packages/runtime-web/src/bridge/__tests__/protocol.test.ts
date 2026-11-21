import { describe, expect, it } from 'vitest';
import {
  BRIDGE_METHODS,
  BRIDGE_VERSION,
  DEFAULT_TIMEOUT_MS,
  HEAVY_TIMEOUT_MS,
  MAX_FRAME_BYTES,
  effectiveTimeout,
  methodSpec,
  parseRequest,
  validateParams,
} from '../protocol';
import { BridgeError, ERROR_CODES, toBridgeError } from '../errors';

/** BridgeError messages are user-safe copy; the machine code lives in `.code`. */
function expectCode(fn: () => unknown, code: string): void {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(BridgeError);
    expect((error as BridgeError).code).toBe(code);
    return;
  }
  throw new Error(`expected ${code}`);
}

const request = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  v: BRIDGE_VERSION,
  id: 'req-1',
  ns: 'storage',
  method: 'get',
  params: { key: 'cart' },
  ...overrides,
});

describe('bridge method registry', () => {
  it('exposes exactly the fourteen documented methods', () => {
    expect(Object.keys(BRIDGE_METHODS).sort()).toEqual(
      [
        'app.getInfo',
        'clipboard.read',
        'clipboard.write',
        'files.pick',
        'net.fetch',
        'notify.local',
        'share.export',
        'storage.get',
        'storage.keys',
        'storage.remove',
        'storage.set',
        'ui.ready',
        'ui.toast',
        'vault.read',
      ].sort(),
    );
  });

  it('maps every permissioned method to a documented permission', () => {
    const documented = new Set([
      'clipboard.read',
      'clipboard.write',
      'notifications.local',
      'files.pick',
      'network.fetch',
      'storage.app',
      'vault.read',
      'share.export',
    ]);
    for (const [key, spec] of Object.entries(BRIDGE_METHODS)) {
      if (spec.permission === null) continue;
      expect(documented.has(spec.permission), `${key} → ${spec.permission}`).toBe(true);
    }
  });

  it('gives heavy methods a 30 s timeout and the rest 10 s', () => {
    expect(effectiveTimeout(methodSpec('files', 'pick')!)).toBe(HEAVY_TIMEOUT_MS);
    expect(effectiveTimeout(methodSpec('net', 'fetch')!)).toBe(HEAVY_TIMEOUT_MS);
    expect(effectiveTimeout(methodSpec('share', 'export')!)).toBe(HEAVY_TIMEOUT_MS);
    expect(effectiveTimeout(methodSpec('storage', 'get')!)).toBe(DEFAULT_TIMEOUT_MS);
    expect(HEAVY_TIMEOUT_MS).toBe(30_000);
    expect(DEFAULT_TIMEOUT_MS).toBe(10_000);
  });

  it('has no native-era namespaces left', () => {
    for (const forbidden of ['db', 'fs', 'camera', 'microphone', 'device', 'sync', 'log', 'intents', 'network', 'ai']) {
      expect(Object.keys(BRIDGE_METHODS).some((key) => key.startsWith(`${forbidden}.`)), forbidden).toBe(false);
    }
  });
});

describe('parseRequest', () => {
  it('accepts a well formed envelope', () => {
    expect(parseRequest(request())).toMatchObject({ ns: 'storage', method: 'get' });
  });

  it('rejects an unknown version', () => {
    expect(() => parseRequest(request({ v: 2 }))).toThrow(BridgeError);
  });

  it('rejects unknown envelope fields', () => {
    expectCode(() => parseRequest(request({ extra: 1 })), 'E-RUN-003');
  });

  it('rejects a frame larger than 256 KiB', () => {
    const huge = 'x'.repeat(MAX_FRAME_BYTES);
    expectCode(() => parseRequest(request({ params: { key: huge } })), 'E-RUN-003');
  });

  it('rejects a bad id, namespace, method, or params shape', () => {
    expect(() => parseRequest(request({ id: '' }))).toThrow(BridgeError);
    expect(() => parseRequest(request({ id: 'x'.repeat(65) }))).toThrow(BridgeError);
    expect(() => parseRequest(request({ ns: 'Storage' }))).toThrow(BridgeError);
    expect(() => parseRequest(request({ method: 'get-all' }))).toThrow(BridgeError);
    expect(() => parseRequest(request({ params: [] }))).toThrow(BridgeError);
  });
});

describe('validateParams', () => {
  const valid = () => parseRequest(request());

  it('rejects unknown methods', () => {
    const parsed = parseRequest(request({ ns: 'db', method: 'query' }));
    expectCode(() => validateParams(parsed), 'E-RUN-003');
  });

  it('rejects unknown parameters', () => {
    const parsed = parseRequest(request({ params: { key: 'a', extra: 'b' } }));
    expectCode(() => validateParams(parsed), 'E-RUN-003');
  });

  it('requires a non-empty key for storage methods', () => {
    expect(() => validateParams(parseRequest(request({ params: {} })))).toThrow(BridgeError);
    expect(validateParams(valid())).toEqual({ key: 'cart' });
  });

  it('accepts only https origins without path or query for net.fetch', () => {
    const ok = parseRequest(
      request({ ns: 'net', method: 'fetch', params: { origin: 'https://api.example.com' } }),
    );
    expect(validateParams(ok)).toMatchObject({ origin: 'https://api.example.com', method: 'GET' });

    for (const origin of ['http://api.example.com', 'https://api.example.com/v1', 'https://api.example.com?a=1']) {
      const parsed = parseRequest(request({ ns: 'net', method: 'fetch', params: { origin } }));
      expect(() => expectCode(() => validateParams(parsed), 'E-RUN-003'), origin).not.toThrow();
    }
  });

  it('rejects a callBridge-shaped method that is not in the table', () => {
    const parsed = parseRequest(request({ ns: 'storage', method: 'delete' }));
    expect(() => validateParams(parsed)).toThrow(BridgeError);
  });
});

describe('error catalog', () => {
  it('contains exactly the 27 documented codes', () => {
    expect(ERROR_CODES).toHaveLength(27);
    expect(new Set(ERROR_CODES).size).toBe(27);
  });

  it('never leaks host detail into an app-visible reason', () => {
    const error = toBridgeError(new Error('E-DATA-001 failed at /home/user/secret.db'));
    expect(error.code).toBe('E-DATA-001');
    expect(JSON.stringify(error.toBody())).not.toContain('/home/user');
  });

  it('falls back to E-DEV-001 for an unrecognised failure', () => {
    expect(toBridgeError(new Error('boom')).code).toBe('E-DEV-001');
    expect(toBridgeError('nope').code).toBe('E-DEV-001');
  });
});
