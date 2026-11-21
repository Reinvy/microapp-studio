'use client';

/**
 * Sandbox app hook: the single runner used by `/app/[appId]` and, later, the
 * builder preview.
 *
 * A mount owns exactly one opaque-origin iframe, one bridge broker, one app
 * database handle, and one permission session. Nothing about that session
 * survives the unmount: `Allow once` grants are cleared with the session id,
 * the iframe document is dropped, and the app DB is closed.
 *
 * Fail-closed rules that shape the code:
 *  - the iframe document must come from `buildSandboxDocument`; a bootstrap
 *    fetch failure is `E-RUN-002`, never a same-origin fallback;
 *  - only messages from that iframe window with an opaque origin are read;
 *  - the watchdog is the only source of automatic restarts, capped by
 *    `SandboxWatchdog` (3 per 5 minutes) — the fourth shows the boundary;
 *  - bridge calls are audited with method/result/duration and never params.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { useHost } from '@/features/host/HostProvider';
import {
  BridgeBroker,
  HEARTBEAT_MS,
  HIBERNATE_AFTER_MS,
  SandboxWatchdog,
  buildSandboxDocument,
  isRecord,
  isTrustedMessage,
  type AuditEvent,
  type BridgeHandler,
  type PermissionDecision,
} from '@microapp/runtime-web';
import { clearSessionGrants, permissionDecision } from '@/db/repositories/permissions';
import { indexRecord } from '@/db/repositories/search';
import { scheduleNotification } from '@/db/repositories/notifications';
import { vaultItemForApp } from '@/db/repositories/vault';
import { vaultApi } from '@/features/identity/identityService';
import type { AppDatabase } from '@/features/appdb/appDb';
import {
  INITIAL_RUN_STATE,
  appFactsFor,
  applyWatchdogOutcome,
  createBridgeHandlers,
  createRunnerSession,
  indexBodyFor,
  resetForManualReload,
  runStateToAppState,
  type AppKv,
  type BridgeHandlerDeps,
  type SandboxAppState,
  type SandboxRunState,
} from './sandboxCore';

export * from './sandboxCore';

export interface SandboxAppOptions {
  workspaceId: string;
  workspaceSlug: string;
  appInstallId: string;
  appId: string;
  /** Bundle source used for `microapp.init`. */
  bundleSource: () => Promise<string>;
  /** Manifest-shaped permissions; `storage.app` is granted implicitly by the broker. */
  declaredPermissions: string[];
  /** Preview mode never schedules notifications and never exports packages. */
  mode: 'run' | 'preview';
  offlineCage: boolean;
}

export interface SandboxAppHandle {
  iframeRef: RefObject<HTMLIFrameElement | null>;
  reload(): void;
}

/**
 * State is nested under `app` so consumers can read it during render; `iframeRef`
 * is a ref and must only be touched by React itself or inside effects.
 */
export type SandboxAppResult = { app: SandboxAppState } & SandboxAppHandle;

/**
 * A message is accepted only when it comes from the mounted iframe with an
 * opaque origin. Bootstrap messages use the `type: 'microapp.*'` envelope; the
 * envelope form (`source: 'muip' | 'bridge'`) still goes through
 * `isTrustedMessage`. Either way the app id must match this mount.
 */
export function isTrustedSandboxEvent(
  event: { source: unknown; data: unknown; origin?: string },
  expectedWindow: unknown,
  appId: string,
): boolean {
  if (!expectedWindow || event.source !== expectedWindow) return false;
  // The sandbox iframe has an opaque origin, which serializes as "null".
  if (event.origin !== 'null') return false;
  const data = event.data;
  if (typeof data !== 'object' || data === null) return false;
  const message = data as { type?: unknown; appId?: unknown };
  if (typeof message.type !== 'string' || !message.type.startsWith('microapp.')) {
    return isTrustedMessage(event, expectedWindow, appId);
  }
  if (message.type === 'microapp.bridge' || message.type === 'microapp.ready') {
    return message.appId === appId;
  }
  return message.appId === undefined || message.appId === appId;
}

const BOOTSTRAP_URL = '/sandbox-bootstrap.js';

async function fetchBootstrapSource(): Promise<string> {
  if (typeof fetch !== 'function') throw new Error('E-RUN-002 sandbox bootstrap unavailable');
  const response = await fetch(BOOTSTRAP_URL, { cache: 'no-store' });
  if (!response.ok) throw new Error('E-RUN-002 sandbox bootstrap unavailable');
  const source = await response.text();
  if (source.trim().length === 0) throw new Error('E-RUN-002 sandbox bootstrap empty');
  return source;
}

const hex = (bytes: Uint8Array): string =>
  [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');

export function useSandboxApp(options: SandboxAppOptions): SandboxAppResult {
  const host = useHost();
  // Latest-value refs are synced after commit; the mount effect below only
  // reads them from callbacks/timers, never during render.
  const hostRef = useRef(host);
  const optionsRef = useRef(options);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [runState, setRunState] = useState<SandboxRunState>(INITIAL_RUN_STATE);
  const runStateRef = useRef(runState);

  useEffect(() => {
    hostRef.current = host;
  });
  useEffect(() => {
    optionsRef.current = options;
  });
  useEffect(() => {
    runStateRef.current = runState;
  });
  const bootRef = useRef<(() => Promise<void>) | null>(null);
  const watchdogRef = useRef<SandboxWatchdog | null>(null);

  const { appId, appInstallId, mode } = options;
  const db = host.db;
  const workspaceId = host.workspace?.id ?? null;
  const workspaceSlug = host.workspace?.slug ?? null;

  useEffect(() => {
    if (!db || !workspaceId || !workspaceSlug) return undefined;

    let disposed = false;
    let appDbPromise: Promise<AppDatabase> | null = null;
    let hiddenTimer: ReturnType<typeof setTimeout> | undefined;
    let pauseFreezeDetection = false;

    const facts = appFactsFor(hostRef.current.apps, appInstallId, appId);
    const watchdog = new SandboxWatchdog(Date.now());
    watchdogRef.current = watchdog;

    const session = createRunnerSession(async (sessionId) => {
      const current = hostRef.current;
      if (!current.db || !current.workspace) return 0;
      const removed = await clearSessionGrants(current.db, {
        workspaceId: current.workspace.id,
        appInstallId,
        sessionId,
      });
      if (removed > 0) {
        await current.audit('permission.revoke', appId, { scope: 'once', count: removed });
      }
      return removed;
    });

    const postToSandbox = (message: Record<string, unknown>): void => {
      if (disposed) return;
      iframeRef.current?.contentWindow?.postMessage(message, '*');
    };

    const postLifecycle = (event: 'focus' | 'blur' | 'background' | 'active' | 'unmount'): void => {
      postToSandbox({ type: 'microapp.lifecycle', event });
    };

    const openAppDb = (): Promise<AppDatabase> => {
      if (!appDbPromise) {
        appDbPromise = hostRef.current.openAppDb(appInstallId);
        // A failed open is retryable: do not pin the rejection for the session.
        appDbPromise.catch(() => {
          appDbPromise = null;
        });
      }
      return appDbPromise;
    };

    const handlerDeps: BridgeHandlerDeps = {
      appId,
      appName: facts.name,
      version: facts.version,
      mode,
      networkAllowlist: facts.manifest.networkAllowlist,
      openAppDb: async (): Promise<AppKv> => openAppDb(),
      indexRecord: async (key, value) => {
        const current = hostRef.current;
        if (!current.db || !current.workspace) return;
        await indexRecord(current.db, {
          workspaceId: current.workspace.id,
          kind: 'record',
          refId: `${appInstallId}:${key}`,
          appInstallId,
          title: key,
          body: indexBodyFor(value),
        });
      },
      scheduleNotification: async (title, body) => {
        const current = hostRef.current;
        if (!current.db || !current.workspace) throw new Error('E-DATA-002 database unavailable');
        const scheduled = await scheduleNotification(current.db, {
          workspaceId: current.workspace.id,
          appInstallId,
          title,
          body,
        });
        return scheduled.id;
      },
      exportPackage: () => hostRef.current.exportPackageBytes(appInstallId),
      postToSandbox,
      vaultRead: async (itemId) => {
        const current = hostRef.current;
        if (!current.db || !current.workspace || !current.identityService || !current.identity) {
          throw new Error('E-AUTH-001 key material unavailable');
        }
        const vault = vaultApi(current.identityService);
        const status = await vault.status();
        if (!status.unlocked) throw new Error('E-AUTH-001 vault locked');
        const item = await vaultItemForApp(current.db, {
          workspaceId: current.workspace.id,
          itemId,
          appInstallId,
        });
        if (!item) throw new Error('E-AUTH-001 vault item not granted');
        const value = await vault.open(
          {
            siteId: hex(current.identity.siteId),
            recordType: 'vault_item',
            recordId: item.id,
            schemaVersion: 1,
          },
          item.envelope,
        );
        return { label: item.label, value };
      },
    };

    const handlers: Record<string, BridgeHandler> = createBridgeHandlers(handlerDeps);

    const checkPermission = async (permissionId: string): Promise<PermissionDecision> => {
      const current = hostRef.current;
      const activeDb = current.db;
      const workspace = current.workspace;
      if (!activeDb || !workspace) return 'denied';
      const grant = (): Promise<PermissionDecision> =>
        permissionDecision(activeDb, {
          workspaceId: workspace.id,
          appInstallId,
          permissionId,
          sessionId: session.sessionId,
        });
      const decision = await grant();
      if (decision !== 'denied') return decision;
      const outcome = await current.requestPermission({
        appInstallId,
        appId,
        permissionId,
        sessionId: session.sessionId,
      });
      // The host dialog already writes the `permission.grant` / `permission.deny`
      // ledger entry; auditing it again here would double-count the decision.
      if (outcome === 'denied') return 'denied';
      const recheck = await grant();
      if (recheck !== 'denied') return recheck;
      // The host answered "allow" but the grant row is bound to another session
      // key (older host fallback). The decision still stands for this call.
      return 'granted';
    };

    // Built on the first bridge message: the per-app policy (Offline Cage) is
    // loaded asynchronously, and the broker must capture the value the app
    // actually runs under rather than the fail-closed default.
    let broker: BridgeBroker | null = null;
    const brokerFor = (): BridgeBroker => {
      broker ??= new BridgeBroker({
        appId,
        declaredPermissions: [...optionsRef.current.declaredPermissions],
        offlineCage: optionsRef.current.offlineCage,
        handlers,
        checkPermission,
        audit: (event: AuditEvent) => {
          // No params, ever: the audit trail names the method and outcome only.
          void hostRef.current.audit('bridge.call', appId, {
            method: event.method,
            result: event.result,
            durationMs: event.durationMs,
            ...(event.code ? { code: event.code } : {}),
            ...(event.mocked ? { mocked: true } : {}),
          });
        },
        now: () => Date.now(),
      });
      return broker;
    };

    const fail = (code: string, message?: string): void => {
      if (disposed) return;
      setRunState((previous) =>
        previous.status === 'crashed'
          ? previous
          : { ...previous, status: 'crashed', crash: { code, message: message ?? code } },
      );
      void hostRef.current.audit('sandbox.error', appId, { code });
    };

    const boot = async (): Promise<void> => {
      const frame = iframeRef.current;
      if (!frame || disposed) return;
      try {
        const bootstrapSource = await fetchBootstrapSource();
        if (disposed) return;
        // The sandbox document inherits the host CSP, so its inline bootstrap must
        // carry the host's own nonce (never a locally invented one).
        const nonce =
          document.querySelector('meta[name="csp-nonce"]')?.getAttribute('content') ??
          crypto.randomUUID().replaceAll('-', '');
        // New document = new request-id space; keep the broker's duplicate
        // memory scoped to the document that produced those ids.
        broker = null;
        frame.srcdoc = buildSandboxDocument({
          bootstrapSource,
          nonce,
          appId,
          locale: hostRef.current.locale,
        });
        watchdog.heartbeat(Date.now());
      } catch {
        // Bootstrap or document construction failed: fail closed, never fall
        // back to same-origin or eval-based execution.
        fail('E-RUN-002', 'Sandbox is unavailable');
      }
    };
    bootRef.current = boot;

    const sendInit = async (): Promise<void> => {
      try {
        const bundleSource = await optionsRef.current.bundleSource();
        if (disposed) return;
        iframeRef.current?.contentWindow?.postMessage(
          { type: 'microapp.init', appId, bundleSource, bridgeVersion: 1 },
          '*',
        );
      } catch {
        fail('E-RUN-002', 'App bundle unavailable');
      }
    };

    const forwardBridge = async (data: Record<string, unknown>): Promise<void> => {
      const response = await brokerFor().handle({
        v: 1,
        id: String(data.id ?? ''),
        ns: String(data.ns ?? ''),
        method: String(data.method ?? ''),
        params: isRecord(data.params) ? data.params : {},
      });
      if (disposed) return;
      // The bootstrap keys pending calls by its own numeric id, so echo it back
      // instead of the string form the broker normalized.
      const reply = {
        type: 'microapp.bridge.reply',
        id: data.id ?? response.id,
        ok: response.ok,
        ...(response.ok ? { result: response.result } : { error: response.error }),
      };
      iframeRef.current?.contentWindow?.postMessage(reply, '*');
    };

    const onMessage = (event: MessageEvent): void => {
      const frame = iframeRef.current;
      if (!isTrustedSandboxEvent(event, frame?.contentWindow ?? null, appId)) return;
      const data = event.data as Record<string, unknown>;
      switch (data.type) {
        case 'microapp.hello':
          void sendInit();
          return;
        case 'microapp.heartbeat': {
          const now = Date.now();
          watchdog.heartbeat(now);
          if (document.visibilityState === 'visible' && !pauseFreezeDetection) watchdog.touch(now);
          return;
        }
        case 'microapp.ready':
          setRunState((previous) =>
            previous.status === 'crashed'
              ? previous
              : { ...previous, status: 'running', crash: null, restartBlockedUntil: null },
          );
          return;
        case 'microapp.fatal':
          fail('E-RUN-004', typeof data.message === 'string' ? data.message : 'App renderer failed');
          return;
        case 'microapp.bridge':
          void forwardBridge(data);
          return;
        default:
          return;
      }
    };

    const onVisibilityChange = (): void => {
      if (document.visibilityState === 'hidden') {
        clearTimeout(hiddenTimer);
        hiddenTimer = setTimeout(() => {
          postLifecycle('background');
          setRunState((previous) =>
            previous.status === 'running' ? { ...previous, status: 'stopped' } : previous,
          );
        }, HIBERNATE_AFTER_MS);
        return;
      }
      clearTimeout(hiddenTimer);
      hiddenTimer = undefined;
      // Returning from a throttled background tab: never read the gap as a freeze.
      watchdog.heartbeat(Date.now());
      watchdog.touch(Date.now());
      setRunState((previous) =>
        previous.status === 'stopped' ? { ...previous, status: 'running' } : previous,
      );
      postLifecycle('focus');
    };

    const onWindowFocus = (): void => {
      pauseFreezeDetection = false;
      watchdog.heartbeat(Date.now());
      watchdog.touch(Date.now());
      postLifecycle('focus');
    };

    const onWindowBlur = (): void => {
      pauseFreezeDetection = true;
      postLifecycle('blur');
    };

    const ticker = setInterval(() => {
      // Hidden or unfocused windows throttle timers; a silent interval there is
      // not a frozen app, and hibernation is driven by the visibility timer.
      if (disposed || !iframeRef.current || pauseFreezeDetection) return;
      if (document.visibilityState !== 'visible') return;
      const now = Date.now();
      const transition = applyWatchdogOutcome(runStateRef.current, watchdog.tick(now), now);
      if (transition.effect === 'none') return;
      setRunState(transition.state);
      if (transition.effect === 'remount') {
        void boot();
      } else if (transition.effect === 'hibernate') {
        postLifecycle('background');
      } else if (transition.effect === 'crash') {
        postLifecycle('unmount');
        void hostRef.current.audit('sandbox.watchdog', appId, { code: 'E-RUN-001' });
      }
    }, HEARTBEAT_MS);

    window.addEventListener('message', onMessage);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', onWindowFocus);
    window.addEventListener('blur', onWindowBlur);
    watchdog.beginCycle(Date.now());
    void boot();

    return () => {
      postLifecycle('unmount');
      disposed = true;
      clearInterval(ticker);
      clearTimeout(hiddenTimer);
      window.removeEventListener('message', onMessage);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', onWindowFocus);
      window.removeEventListener('blur', onWindowBlur);
      // The iframe element is rendered unconditionally by the page, so reading
      // the live ref here tears down whichever document is mounted now.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const frame = iframeRef.current;
      if (frame) frame.srcdoc = '';
      watchdogRef.current = null;
      void session.dispose();
      if (appDbPromise) {
        void appDbPromise
          .then((database) => database.close())
          .catch(() => undefined);
      }
    };
  }, [appId, appInstallId, db, mode, workspaceId, workspaceSlug]);

  const reload = useCallback(() => {
    const now = Date.now();
    const next = resetForManualReload(runStateRef.current, now);
    if (!next) return;
    setRunState(next);
    watchdogRef.current?.heartbeat(now);
    void bootRef.current?.();
  }, []);

  // The state lives in its own object so consumers never read a ref while
  // rendering (the compiler flags any ref-bearing object touched during render).
  return { app: runStateToAppState(runState), iframeRef, reload };
}
