import { describe, expect, it } from 'vitest';
import {
  FREEZE_MS,
  HIBERNATE_AFTER_MS,
  MAX_RESTARTS,
  RESTART_WINDOW_MS,
  SandboxWatchdog,
} from '../watchdog';
import { LifecycleController } from '../lifecycle';
import {
  SANDBOX_CSP,
  SANDBOX_CSP_TEMPLATE,
  buildSandboxDocument,
  isTrustedMessage,
} from '../iframe-doc';

describe('sandbox watchdog', () => {
  it('detects a freeze after 5 seconds and restarts within budget', () => {
    const watchdog = new SandboxWatchdog(0);
    expect(watchdog.tick(FREEZE_MS - 1)).toEqual({ action: 'none' });
    expect(watchdog.tick(FREEZE_MS)).toEqual({ action: 'restart', attempt: 1 });
    watchdog.heartbeat(FREEZE_MS);
    expect(watchdog.tick(FREEZE_MS + 10)).toEqual({ action: 'none' });
  });

  it('allows three restarts in five minutes and then shows a persistent boundary', () => {
    const watchdog = new SandboxWatchdog(0);
    for (let attempt = 1; attempt <= MAX_RESTARTS; attempt += 1) {
      const at = attempt * FREEZE_MS * 2;
      expect(watchdog.tick(at)).toEqual({ action: 'restart', attempt });
      watchdog.heartbeat(at + 500);
    }
    expect(watchdog.tick(MAX_RESTARTS * FREEZE_MS * 2 + 2 * FREEZE_MS)).toEqual({
      action: 'error-boundary',
      reason: 'restart-budget-exhausted',
    });
    expect(watchdog.restartCount()).toBe(MAX_RESTARTS);
  });

  it('forgets restarts that fall outside the five minute window', () => {
    const watchdog = new SandboxWatchdog(0);
    expect(watchdog.tick(FREEZE_MS)).toEqual({ action: 'restart', attempt: 1 });
    watchdog.heartbeat(FREEZE_MS + 500);
    expect(watchdog.tick(RESTART_WINDOW_MS + FREEZE_MS * 2)).toEqual({ action: 'restart', attempt: 1 });
  });

  it('hibernates after 30 seconds without user interaction while heartbeats keep flowing', () => {
    const watchdog = new SandboxWatchdog(0);
    watchdog.heartbeat(HIBERNATE_AFTER_MS - 1_000);
    expect(watchdog.tick(HIBERNATE_AFTER_MS)).toEqual({ action: 'hibernate', idleMs: HIBERNATE_AFTER_MS });
    watchdog.touch(HIBERNATE_AFTER_MS);
    watchdog.heartbeat(HIBERNATE_AFTER_MS + 1_000);
    expect(watchdog.tick(HIBERNATE_AFTER_MS + 10)).toEqual({ action: 'none' });
  });

  it('warns once per cycle at 80% and resets below 60%', () => {
    const watchdog = new SandboxWatchdog(0);
    expect(watchdog.sampleMemory(80, 100)).toEqual({ warning: true, ratio: 0.8, reset: false });
    expect(watchdog.sampleMemory(85, 100)).toEqual({ warning: false, ratio: 0.85, reset: false });
    expect(watchdog.sampleMemory(50, 100)).toEqual({ warning: false, ratio: 0.5, reset: true });
    expect(watchdog.sampleMemory(90, 100)).toEqual({ warning: true, ratio: 0.9, reset: false });
    watchdog.beginCycle(1_000);
    expect(watchdog.sampleMemory(90, 100)).toEqual({ warning: true, ratio: 0.9, reset: false });
  });
});

describe('lifecycle sequencing', () => {
  function controller(): { lifecycle: LifecycleController; seen: string[] } {
    const seen: string[] = [];
    const lifecycle = new LifecycleController(
      (event) => {
        seen.push(event);
      },
      () => 1_000,
    );
    return { lifecycle, seen };
  }

  it('serializes transitions and requires mount before focus', async () => {
    const { lifecycle, seen } = controller();
    await expect(lifecycle.emit('onFocus')).rejects.toThrow(/onMount/);
    await lifecycle.emit('onMount');
    await lifecycle.emit('onFocus');
    await lifecycle.emit('onBlur');
    await lifecycle.emit('onBackground');
    await lifecycle.emit('onFocus');
    expect(seen).toEqual(['onMount', 'onFocus', 'onBlur', 'onBackground', 'onFocus']);
    expect(lifecycle.records()).toHaveLength(5);
  });

  it('emits the memory warning once per cycle', async () => {
    const { lifecycle, seen } = controller();
    await lifecycle.emit('onMount');
    await lifecycle.emit('onMemoryWarning');
    await lifecycle.emit('onMemoryWarning');
    expect(seen.filter((event) => event === 'onMemoryWarning')).toHaveLength(1);
    lifecycle.resetMemoryCycle();
    await lifecycle.emit('onMemoryWarning');
    expect(seen.filter((event) => event === 'onMemoryWarning')).toHaveLength(2);
  });

  it('rejects sync and memory events while unmounted and anything after uninstall', async () => {
    const { lifecycle } = controller();
    await expect(lifecycle.emit('onSync')).rejects.toThrow(/onMount/);
    await lifecycle.emit('onMount');
    await lifecycle.emit('onUninstall');
    await expect(lifecycle.emit('onMount')).rejects.toThrow(/after onUninstall/);
  });
});

describe('sandbox document', () => {
  it('declares the exact CSP with a nonce and no unsafe-eval', () => {
    expect(SANDBOX_CSP).toContain("default-src 'none'");
    expect(SANDBOX_CSP).toContain("script-src blob: 'wasm-unsafe-eval'");
    expect(SANDBOX_CSP).toContain("connect-src 'none'");
    expect(SANDBOX_CSP).not.toContain("'unsafe-eval'");
    expect(SANDBOX_CSP_TEMPLATE).toContain("'nonce-{nonce}'");
  });

  it('inlines the bootstrap with a nonce and never loads parent blob URLs', () => {
    const nonce = 'abc123DEF456ghi789';
    const doc = buildSandboxDocument({
      bootstrapSource: 'console.log("boot");',
      nonce,
      appId: 'org.reinvy.kas',
    });
    expect(doc).toContain('Content-Security-Policy');
    expect(doc).toContain(`nonce="${nonce}"`);
    expect(doc).toContain("'nonce-abc123DEF456ghi789'");
    expect(doc).toContain('console.log("boot");');
    expect(doc).not.toContain('javascript:');
    expect(() =>
      buildSandboxDocument({ bootstrapSource: 'x', nonce: 'short', appId: 'x.y' }),
    ).toThrow(/nonce/);
  });

  it('escapes app id and locale in the template', () => {
    const doc = buildSandboxDocument({
      bootstrapSource: 'void 0;',
      nonce: 'abc123DEF456ghi789',
      appId: 'org.reinvy"kas<script>',
      locale: 'id-ID',
    });
    expect(doc).toContain('&quot;');
    const escaped = buildSandboxDocument({
      bootstrapSource: 'const a = "</script>";',
      nonce: 'abc123DEF456ghi789',
      appId: 'org.x.y',
    });
    expect(escaped.match(/<\/script>/g)?.length).toBe(1);
  });

  it('accepts messages only from the expected window and app id', () => {
    const source = {};
    expect(isTrustedMessage({ source, data: { source: 'bridge', appId: 'org.x.y' } }, source, 'org.x.y')).toBe(true);
    expect(isTrustedMessage({ source: {}, data: { source: 'bridge', appId: 'org.x.y' } }, source, 'org.x.y')).toBe(
      false,
    );
    expect(isTrustedMessage({ source, data: { source: 'bridge', appId: 'org.other' } }, source, 'org.x.y')).toBe(
      false,
    );
    expect(isTrustedMessage({ source, data: 'raw' }, source, 'org.x.y')).toBe(false);
  });
});
