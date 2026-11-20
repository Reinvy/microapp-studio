import { describe, expect, it } from 'vitest';
import {
  MAX_FRAME_BYTES,
  MAX_INTENT_PAYLOAD_BYTES,
  parseRequest,
  validateParams,
  effectiveTimeout,
  methodSpec,
  BRIDGE_METHODS,
} from '../protocol';
import { BridgeError } from '../errors';

const base = { v: 1, id: 'req-1', ns: 'storage', method: 'get', params: { key: 'k' } };

function errorOf(fn: () => unknown): BridgeError {
  try {
    fn();
  } catch (error) {
    if (error instanceof BridgeError) return error;
    throw error;
  }
  throw new Error('expected BridgeError');
}

describe('bridge protocol', () => {
  it('rejects unsupported bridge versions before anything else', () => {
    expect(errorOf(() => parseRequest({ ...base, v: 2 })).code).toBe('E-SBX-001');
    expect(errorOf(() => parseRequest({ v: '1', id: 'x', ns: 'storage', method: 'get' })).code).toBe('E-SBX-001');
  });

  it('rejects frames above 1 MiB', () => {
    const huge = { ...base, params: { key: 'k', blob: 'a'.repeat(MAX_FRAME_BYTES) } };
    expect(errorOf(() => parseRequest(huge)).code).toBe('E-SBX-005');
  });

  it('rejects unknown methods without falling back', () => {
    expect(errorOf(() => parseRequest({ ...base, ns: 'camera', method: 'unknown' })).code).toBe('E-SBX-005');
    // `ui.*` is internal to the sandbox renderer, not a bridge method.
    expect(methodSpec('ui', 'render')).toBeUndefined();
  });

  it('validates request ids and namespaces', () => {
    expect(errorOf(() => parseRequest({ ...base, id: 'bad id' })).code).toBe('E-SBX-005');
    expect(errorOf(() => parseRequest({ ...base, id: '' })).code).toBe('E-SBX-005');
    expect(errorOf(() => parseRequest({ ...base, ns: 42 })).code).toBe('E-SBX-005');
  });

  it('validates parameters per method', () => {
    const camera = { v: 1, id: 'req-2', ns: 'camera', method: 'capture', params: { facing: 'sideways' } };
    expect(errorOf(() => validateParams(parseRequest(camera))).code).toBe('E-SBX-005');

    const unknownProp = { v: 1, id: 'req-3', ns: 'storage', method: 'get', params: { key: 'k', extra: 1 } };
    expect(errorOf(() => validateParams(parseRequest(unknownProp))).code).toBe('E-SBX-005');

    const insecure = { v: 1, id: 'req-4', ns: 'network', method: 'fetch', params: { url: 'http://example.com' } };
    expect(errorOf(() => validateParams(parseRequest(insecure))).code).toBe('E-SBX-005');
  });

  it('caps intent payloads at 64 KiB', () => {
    const intent = {
      v: 1,
      id: 'req-5',
      ns: 'intents',
      method: 'dispatch',
      params: { intent: 'text.plain', payload: 'x'.repeat(MAX_INTENT_PAYLOAD_BYTES + 1) },
    };
    expect(errorOf(() => validateParams(parseRequest(intent))).code).toBe('E-SBX-009');
  });

  it('fails closed for phase-gated AI and workflow methods', () => {
    const ai = { v: 1, id: 'req-6', ns: 'ai', method: 'infer', params: {} };
    const parsed = parseRequest(ai);
    const error = errorOf(() => validateParams(parsed));
    expect(error.code).toBe('E-SBX-005');
    expect(error.details?.reason).toBe('not_available_in_this_host_version');

    const workflow = { v: 1, id: 'req-7', ns: 'workflow', method: 'run', params: {} };
    expect(errorOf(() => validateParams(parseRequest(workflow))).details?.reason).toBe(
      'not_available_in_this_host_version',
    );
  });

  it('exposes the canonical bridge surface without ui.*', () => {
    expect(BRIDGE_METHODS['bridge.cancel']).toBeUndefined();
    expect(BRIDGE_METHODS['vault.read']?.permission).toBe('vault.read');
    expect(BRIDGE_METHODS['intents.dispatch']?.consent).toBe(true);
    expect(BRIDGE_METHODS['db.query']?.permission).toBe('storage.local.sqlite');
    const uiKeys = Object.keys(BRIDGE_METHODS).filter((key) => key.startsWith('ui.'));
    expect(uiKeys).toEqual([]);
  });

  it('clamps requested timeouts to the method ceiling', () => {
    const parsed = parseRequest({ ...base, timeoutMs: 999_999 });
    expect(effectiveTimeout(parsed)).toBe(10_000);
    const aiish = parseRequest({ v: 1, id: 'req-8', ns: 'camera', method: 'capture', params: {} });
    expect(effectiveTimeout(aiish)).toBe(60_000);
  });
});
