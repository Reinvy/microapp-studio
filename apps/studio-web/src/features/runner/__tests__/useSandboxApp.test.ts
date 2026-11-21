/**
 * Runner core tests.
 *
 * These drive the pure parts only: the restart-budget transition, the
 * per-mount session id, and the bridge handlers with fail-closed rules. No
 * iframe, no React, no host database — `openAppDb`, `fetch`, and the picker are
 * injected doubles.
 */

import { describe, expect, it, vi } from 'vitest';
import { RESTART_WINDOW_MS, type BridgeContext } from '@microapp/runtime-web';
import {
  INITIAL_RUN_STATE,
  applyWatchdogOutcome,
  createBridgeHandlers,
  createRunnerSession,
  encodePickedFile,
  resetForManualReload,
  runStateToAppState,
  type AppKv,
} from '../useSandboxApp';

const context: BridgeContext = {
  appId: 'studio.test',
  requestId: 'req-1',
  signal: new AbortController().signal,
  mocked: false,
};

const emptyDb: AppKv = {
  get: async () => null,
  set: async () => undefined,
  remove: async () => undefined,
  keys: async () => [],
};

const START = 1_000;

describe('restart budget', () => {
  it('remounts three times, then shows the boundary with a countdown', () => {
    let run = INITIAL_RUN_STATE;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const transition = applyWatchdogOutcome(run, { action: 'restart', attempt }, START + attempt * 1_000);
      expect(transition.effect).toBe('remount');
      expect(transition.state.status).toBe('starting');
      run = transition.state;
    }
    expect(runStateToAppState(run).restarts).toBe(3);

    const boundary = applyWatchdogOutcome(
      run,
      { action: 'error-boundary', reason: 'restart-budget-exhausted' },
      START + 3_000,
    );
    expect(boundary.effect).toBe('crash');
    expect(boundary.state.status).toBe('crashed');
    expect(boundary.state.crash?.code).toBe('E-RUN-001');
    // Blocked until the oldest restart leaves the five-minute window.
    expect(boundary.state.restartBlockedUntil).toBe(START + 1_000 + RESTART_WINDOW_MS);

    // A crashed runner never accepts another automatic restart.
    expect(applyWatchdogOutcome(boundary.state, { action: 'restart', attempt: 4 }, START + 4_000).effect).toBe('none');

    // Manual reload is refused during the countdown and allowed after it.
    expect(resetForManualReload(boundary.state, START + 5_000)).toBeNull();
    const after = resetForManualReload(boundary.state, START + 1_000 + RESTART_WINDOW_MS + 1);
    expect(after?.status).toBe('starting');
    expect(after?.crash).toBeNull();
    expect(after?.restartBlockedUntil).toBeNull();
  });

  it('hibernates only a running sandbox', () => {
    const running = { ...INITIAL_RUN_STATE, status: 'running' as const };
    const hibernated = applyWatchdogOutcome(running, { action: 'hibernate', idleMs: 30_000 }, START);
    expect(hibernated.effect).toBe('hibernate');
    expect(hibernated.state.status).toBe('stopped');

    const starting = applyWatchdogOutcome(INITIAL_RUN_STATE, { action: 'hibernate', idleMs: 30_000 }, START);
    expect(starting.effect).toBe('none');
  });
});

describe('session grants', () => {
  it('uses a fresh session id per mount and clears it exactly once', async () => {
    const clear = vi.fn(async () => 2);
    const first = createRunnerSession(clear);
    const second = createRunnerSession(clear);

    expect(first.sessionId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(first.sessionId).not.toBe(second.sessionId);

    await Promise.all([first.dispose(), first.dispose()]);
    expect(clear).toHaveBeenCalledTimes(1);
    expect(clear).toHaveBeenCalledWith(first.sessionId);

    await second.dispose();
    expect(clear).toHaveBeenCalledTimes(2);
    expect(clear).toHaveBeenLastCalledWith(second.sessionId);
  });
});

describe('files.pick', () => {
  it('rejects a file larger than the requested cap', async () => {
    const handlers = createBridgeHandlers({
      appId: 'studio.test',
      appName: 'Test',
      version: '1.0.0',
      mode: 'run',
      networkAllowlist: [],
      openAppDb: async () => emptyDb,
      pickFile: async () => ({
        name: 'big.bin',
        size: 400 * 1024,
        arrayBuffer: async () => new ArrayBuffer(0),
      }),
    });

    await expect(handlers['files.pick']({ maxBytes: 256 * 1024 }, context)).rejects.toMatchObject({
      code: 'E-RUN-003',
    });
  });

  it('returns plain JSON for a file inside the cap', async () => {
    const bytes = new TextEncoder().encode('abc');
    const encoded = await encodePickedFile(
      { name: 'a.txt', size: bytes.byteLength, arrayBuffer: async () => bytes.buffer as ArrayBuffer },
      256 * 1024,
    );
    expect(encoded).toEqual({ name: 'a.txt', size: 3, dataBase64: 'YWJj' });
  });
});

describe('net.fetch', () => {
  it('refuses an origin outside the manifest allowlist without fetching', async () => {
    const fetchImpl = vi.fn();
    const handlers = createBridgeHandlers({
      appId: 'studio.test',
      appName: 'Test',
      version: '1.0.0',
      mode: 'run',
      networkAllowlist: ['https://api.example.com'],
      openAppDb: async () => emptyDb,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await expect(
      handlers['net.fetch']({ origin: 'https://evil.example', path: '/v1/ping' }, context),
    ).rejects.toMatchObject({ code: 'E-RUN-003' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('fetches an allowlisted origin and caps the decoded body', async () => {
    const body = new Uint8Array(300 * 1024).fill(97);
    const fetchImpl = vi.fn(async () => new Response(body, { status: 200 }));
    const handlers = createBridgeHandlers({
      appId: 'studio.test',
      appName: 'Test',
      version: '1.0.0',
      mode: 'run',
      networkAllowlist: ['https://api.example.com'],
      openAppDb: async () => emptyDb,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const result = (await handlers['net.fetch'](
      { origin: 'https://api.example.com', path: '/v1/list' },
      context,
    )) as { status: number; bodyText: string };
    expect(result.status).toBe(200);
    expect(new TextEncoder().encode(result.bodyText).byteLength).toBe(256 * 1024);
  });
});

describe('share.export', () => {
  it('refuses preview mode without touching the package store', async () => {
    const exportPackage = vi.fn(async () => new Uint8Array([1, 2, 3]));
    const download = vi.fn();
    const handlers = createBridgeHandlers({
      appId: 'studio.test',
      appName: 'Test',
      version: '1.0.0',
      mode: 'preview',
      networkAllowlist: [],
      openAppDb: async () => emptyDb,
      exportPackage,
      download,
    });

    await expect(handlers['share.export']({}, context)).rejects.toMatchObject({ code: 'E-RUN-003' });
    expect(exportPackage).not.toHaveBeenCalled();
    expect(download).not.toHaveBeenCalled();
  });

  it('downloads `<appId>-<version>.mapp` in run mode', async () => {
    const bytes = new Uint8Array([1, 2, 3, 4]);
    const download = vi.fn();
    const handlers = createBridgeHandlers({
      appId: 'studio.p0123456789ab',
      appName: 'Kasir',
      version: '1.2.3',
      mode: 'run',
      networkAllowlist: [],
      openAppDb: async () => emptyDb,
      exportPackage: async () => bytes,
      download,
    });

    const result = await handlers['share.export']({}, context);
    expect(download).toHaveBeenCalledWith('studio.p0123456789ab-1.2.3.mapp', bytes);
    expect(result).toEqual({ fileName: 'studio.p0123456789ab-1.2.3.mapp', size: 4 });
  });
});
