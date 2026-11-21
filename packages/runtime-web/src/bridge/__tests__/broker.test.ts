import { describe, expect, it, vi } from 'vitest';
import { BridgeBroker, type AuditEvent } from '../broker';
import { BridgeError } from '../errors';
import { RATE_LIMIT_CAPACITY } from '../rate-limit';
import { MAX_FRAME_BYTES } from '../protocol';

interface HarnessOptions {
  declaredPermissions?: string[];
  offlineCage?: boolean;
  permission?: 'granted' | 'denied' | 'mocked';
  handlers?: Record<string, (params: Record<string, unknown>) => Promise<unknown> | unknown>;
  now?: () => number;
}

function harness(options: HarnessOptions = {}) {
  const audits: AuditEvent[] = [];
  const requested: string[] = [];
  const handlers = options.handlers ?? {
    'storage.get': (params) => ({ key: params.key, value: 'v' }),
    'ui.toast': () => true,
    'net.fetch': () => 'network',
    'share.export': () => 'shared',
  };
  const broker = new BridgeBroker({
    appId: 'studio.p123456789ab',
    declaredPermissions: options.declaredPermissions ?? ['storage.app', 'network.fetch', 'share.export'],
    offlineCage: options.offlineCage ?? false,
    handlers,
    checkPermission: (permissionId) => {
      requested.push(permissionId);
      return options.permission ?? 'granted';
    },
    audit: (event) => audits.push(event),
    now: options.now,
  });
  return { broker, audits, requested };
}

const envelope = (ns: string, method: string, params: Record<string, unknown> = {}, id = 'r1') => ({
  v: 1,
  id,
  ns,
  method,
  params,
});

describe('BridgeBroker', () => {
  it('runs a declared method and audits method/result/duration without params', async () => {
    const { broker, audits } = harness();
    const response = await broker.handle(envelope('storage', 'get', { key: 'cart' }));
    expect(response).toMatchObject({ ok: true, result: { key: 'cart' } });
    expect(audits).toHaveLength(1);
    expect(audits[0]).toMatchObject({ method: 'storage.get', result: 'ok' });
    expect(JSON.stringify(audits[0])).not.toContain('cart');
  });

  it('fails closed when the permission is not declared, before any consent prompt', async () => {
    const { broker, requested, audits } = harness({ declaredPermissions: [] });
    const response = await broker.handle(envelope('storage', 'get', { key: 'cart' }));
    expect(response.ok).toBe(false);
    if (!response.ok) expect(response.error.code).toBe('E-RUN-003');
    expect(requested).toEqual([]);
    expect(audits.at(-1)?.code).toBe('E-RUN-003');
  });

  it('does not ask for consent for storage.app', async () => {
    const { broker, requested } = harness();
    await broker.handle(envelope('storage', 'get', { key: 'cart' }));
    expect(requested).toEqual([]);
  });

  it('asks for consent on a permissioned method and denies without a grant', async () => {
    const { broker, requested } = harness({ permission: 'denied' });
    const response = await broker.handle(envelope('share', 'export', {}));
    expect(requested).toEqual(['share.export']);
    expect(response.ok).toBe(false);
    if (!response.ok) expect(response.error.code).toBe('E-RUN-003');
  });

  it('blocks network.fetch with E-NET-001 while the Offline Cage is active, before consent', async () => {
    const { broker, requested } = harness({ offlineCage: true });
    const response = await broker.handle(envelope('net', 'fetch', { origin: 'https://api.example.com' }));
    expect(response.ok).toBe(false);
    if (!response.ok) expect(response.error.code).toBe('E-NET-001');
    expect(requested).toEqual([]);
  });

  it('rejects unknown methods and unknown parameters', async () => {
    const { broker } = harness();
    const unknown = await broker.handle(envelope('db', 'query'));
    expect(unknown.ok).toBe(false);
    if (!unknown.ok) expect(unknown.error.code).toBe('E-RUN-003');

    const badParams = await broker.handle(envelope('storage', 'get', { key: 'a', nope: 1 }));
    expect(badParams.ok).toBe(false);
    if (!badParams.ok) expect(badParams.error.code).toBe('E-RUN-003');
  });

  it('rejects an oversized frame with E-RUN-003', async () => {
    const { broker } = harness();
    const response = await broker.handle(envelope('storage', 'get', { key: 'x'.repeat(MAX_FRAME_BYTES) }));
    expect(response.ok).toBe(false);
    if (!response.ok) expect(response.error.code).toBe('E-RUN-003');
  });

  it('allows 30 calls per 10 s and rejects the next one', async () => {
    const { broker } = harness();
    for (let index = 0; index < RATE_LIMIT_CAPACITY; index += 1) {
      const response = await broker.handle(envelope('ui', 'toast', { message: 'hi' }, `r${index}`));
      expect(response.ok, `call ${index}`).toBe(true);
    }
    const rejected = await broker.handle(envelope('ui', 'toast', { message: 'hi' }, 'overflow'));
    expect(rejected.ok).toBe(false);
    if (!rejected.ok) {
      expect(rejected.error.code).toBe('E-RUN-003');
      expect(rejected.error.details?.reason).toBe('rate_limited');
    }
  });

  it('refills three tokens per second', async () => {
    let now = 1_000;
    const { broker } = harness({ now: () => now });
    for (let index = 0; index < RATE_LIMIT_CAPACITY; index += 1) {
      await broker.handle(envelope('ui', 'toast', { message: 'hi' }, `r${index}`));
    }
    now += 1_000;
    for (let index = 0; index < 3; index += 1) {
      const response = await broker.handle(envelope('ui', 'toast', { message: 'hi' }, `t${index}`));
      expect(response.ok, `refilled ${index}`).toBe(true);
    }
    const fourth = await broker.handle(envelope('ui', 'toast', { message: 'hi' }, 't3'));
    expect(fourth.ok).toBe(false);
  });

  it('rejects a replayed request id', async () => {
    const { broker } = harness();
    expect((await broker.handle(envelope('ui', 'toast', { message: 'a' }, 'same'))).ok).toBe(true);
    const replay = await broker.handle(envelope('ui', 'toast', { message: 'a' }, 'same'));
    expect(replay.ok).toBe(false);
    if (!replay.ok) expect(replay.error.code).toBe('E-RUN-003');
  });

  it('turns a handler timeout into the watchdog code', async () => {
    vi.useFakeTimers();
    const { broker } = harness({
      handlers: { 'storage.get': () => new Promise(() => undefined) },
    });
    const pending = broker.handle(envelope('storage', 'get', { key: 'a' }));
    await vi.advanceTimersByTimeAsync(10_001);
    const response = await pending;
    vi.useRealTimers();
    expect(response.ok).toBe(false);
    if (!response.ok) expect(response.error.code).toBe('E-RUN-001');
  });

  it('reports a missing handler as a sandbox failure', async () => {
    const { broker } = harness({ handlers: {} });
    const response = await broker.handle(envelope('storage', 'get', { key: 'a' }));
    expect(response.ok).toBe(false);
    if (!response.ok) expect(response.error.code).toBe('E-RUN-002');
  });

  it('never exposes host paths in an error body', async () => {
    const { broker } = harness({
      handlers: {
        'storage.get': () => {
          throw new BridgeError('E-DATA-001', { reason: 'open_failed' });
        },
      },
    });
    const response = await broker.handle(envelope('storage', 'get', { key: 'a' }));
    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.error.code).toBe('E-DATA-001');
      expect(JSON.stringify(response)).not.toMatch(/\/(home|Users|var)\//);
    }
  });
});
