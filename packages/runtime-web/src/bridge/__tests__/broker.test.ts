import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BridgeBroker, type AuditEvent } from '../broker';
import type { BridgeHandler } from '../broker';

function recorder() {
  const calls: Array<{ method: string; params: Record<string, unknown> }> = [];
  const handler: BridgeHandler = (params, context) => {
    calls.push({ method: context.appId, params });
    return { ok: true };
  };
  return { calls, handler };
}

function brokerWith(options: {
  handler?: BridgeHandler;
  permission?: 'granted' | 'denied' | 'mocked';
  consent?: 'granted' | 'denied';
  audit?: (event: AuditEvent) => void;
  now?: () => number;
}) {
  const handler = options.handler ?? (() => ({ ok: true }));
  return new BridgeBroker({
    appId: 'org.reinvy.kas',
    handlers: { 'storage.get': handler, 'db.query': handler, 'db.exec': handler, 'ai.infer': handler },
    checkPermission: () => options.permission ?? 'granted',
    requestConsent: () => options.consent ?? 'granted',
    audit: options.audit,
    now: options.now,
  });
}

const storageGet = (id: string, params: Record<string, unknown> = { key: 'k' }) => ({
  v: 1,
  id,
  ns: 'storage',
  method: 'get',
  params,
});

describe('bridge broker', () => {
  it('checks permission before validating parameters', async () => {
    const { calls, handler } = recorder();
    const audits: AuditEvent[] = [];
    const broker = brokerWith({ handler, permission: 'denied', audit: (event) => audits.push(event) });
    // Invalid params + denied permission: the denial response must not leak field details.
    const response = await broker.handle(storageGet('req-1', { unexpected: true }));
    expect(response.ok).toBe(false);
    if (response.ok) throw new Error('expected failure');
    expect(response.error.code).toBe('E-SBX-005');
    expect(response.error.details?.permission).toBe('storage.local');
    expect(response.error.details?.field).toBeUndefined();
    expect(calls).toHaveLength(0);
    expect(audits[0]?.result).toBe('error');
  });

  it('executes granted requests and audits success', async () => {
    const { calls, handler } = recorder();
    const audits: AuditEvent[] = [];
    const broker = brokerWith({ handler, audit: (event) => audits.push(event) });
    const response = await broker.handle(storageGet('req-2'));
    expect(response).toEqual({ id: 'req-2', ok: true, result: { ok: true } });
    expect(calls).toHaveLength(1);
    expect(audits[0]).toMatchObject({ result: 'ok', method: 'storage.get' });
  });

  it('marks mocked grants in audit', async () => {
    const audits: AuditEvent[] = [];
    const broker = brokerWith({ permission: 'mocked', audit: (event) => audits.push(event) });
    await broker.handle(storageGet('req-3'));
    expect(audits[0]?.mocked).toBe(true);
  });

  it('rejects unknown methods and disabled methods', async () => {
    const broker = brokerWith({});
    const unknown = await broker.handle({ v: 1, id: 'req-4', ns: 'fs', method: 'nope', params: {} });
    expect(unknown.ok).toBe(false);
    const ai = await broker.handle({ v: 1, id: 'req-5', ns: 'ai', method: 'infer', params: {} });
    expect(ai.ok).toBe(false);
    if (ai.ok) throw new Error('expected failure');
    expect(ai.error.code).toBe('E-SBX-005');
    expect(ai.error.details?.reason).toBe('not_available_in_this_host_version');
  });

  it('enforces 100 calls/second and then recovers', async () => {
    let now = 0;
    const broker = brokerWith({ now: () => now });
    const first = await broker.handle({ ...storageGet('req-ok'), id: 'a' });
    expect(first.ok).toBe(true);
    // Drain the bucket in the same millisecond.
    const responses = [];
    for (let index = 0; index < 100; index += 1) {
      responses.push(await broker.handle({ ...storageGet(`burst-${index}`), id: `burst-${index}` }));
    }
    // Capacity is 100/s: the first call plus the burst leaves exactly one
    // rejected call in the same millisecond.
    const rejected = responses.filter((response) => !response.ok);
    expect(rejected).toHaveLength(1);
    const rateLimited = rejected.map((response) => (!response.ok ? response.error.details?.reason : undefined));
    expect(rateLimited).toEqual(['rate_limited']);
    // One second later capacity is restored.
    now = 1000;
    const recovered = await broker.handle({ ...storageGet('after'), id: 'after' });
    expect(recovered.ok).toBe(true);
  });

  it('rejects duplicate request ids in a session', async () => {
    const broker = brokerWith({});
    expect((await broker.handle(storageGet('dup'))).ok).toBe(true);
    const duplicate = await broker.handle(storageGet('dup'));
    expect(duplicate.ok).toBe(false);
    if (duplicate.ok) throw new Error('expected failure');
    expect(duplicate.error.code).toBe('E-SBX-008');
  });

  it('cancel stops an in-flight request without delivering a result', async () => {
    const pending = Promise.withResolvers<unknown>();
    const broker = brokerWith({ handler: () => pending.promise });
    const request = broker.handle(storageGet('cancel-me'));
    await Promise.resolve();
    expect(broker.activeRequests()).toBe(1);
    expect(broker.cancel('cancel-me')).toBe(true);
    const response = await request;
    expect(response.ok).toBe(false);
    if (response.ok) throw new Error('expected failure');
    expect(response.error.code).toBe('E-SBX-006');
    pending.resolve({ late: true });
    expect(broker.activeRequests()).toBe(0);
  });

  it('times out idempotent reads with a retryable error', async () => {
    vi.useFakeTimers();
    const broker = brokerWith({ handler: () => Promise.withResolvers<unknown>().promise });
    const request = broker.handle({
      v: 1,
      id: 'slow',
      ns: 'db',
      method: 'query',
      params: { sql: 'SELECT 1' },
      timeoutMs: 10_000,
    });
    await vi.advanceTimersByTimeAsync(10_001);
    const response = await request;
    expect(response.ok).toBe(false);
    if (response.ok) throw new Error('expected failure');
    expect(response.error.code).toBe('E-NET-003');
    expect(response.error.retryable).toBe(true);
    vi.useRealTimers();
  });

  it('times out non-idempotent writes without claiming retryability', async () => {
    vi.useFakeTimers();
    const broker = brokerWith({ handler: () => Promise.withResolvers<unknown>().promise });
    const request = broker.handle({
      v: 1,
      id: 'slow-write',
      ns: 'db',
      method: 'exec',
      params: { sql: 'UPDATE notes SET title = ?' },
      timeoutMs: 10_000,
    });
    await vi.advanceTimersByTimeAsync(10_001);
    const response = await request;
    expect(response.ok).toBe(false);
    if (response.ok) throw new Error('expected failure');
    expect(response.error.code).toBe('E-SBX-005');
    expect(response.error.retryable).toBe(false);
    vi.useRealTimers();
  });

  it('denies consent-gated intents without calling the handler', async () => {
    const { calls, handler } = recorder();
    const broker = new BridgeBroker({
      appId: 'org.reinvy.kas',
      handlers: { 'intents.dispatch': handler },
      checkPermission: () => 'granted',
      requestConsent: () => 'denied',
    });
    const response = await broker.handle({
      v: 1,
      id: 'intent-1',
      ns: 'intents',
      method: 'dispatch',
      params: { intent: 'text.plain', target: 'org.reinvy.notes' },
    });
    expect(response.ok).toBe(false);
    if (response.ok) throw new Error('expected failure');
    expect(response.error.code).toBe('E-SBX-009');
    expect(calls).toHaveLength(0);
  });

  beforeEach(() => {
    vi.useRealTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });
});
