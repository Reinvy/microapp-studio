/**
 * Sandbox bootstrap: the only script that runs inside the opaque-origin iframe.
 *
 * Responsibilities:
 *  - import the app bundle and call its `mount(api)`;
 *  - host the MUIP renderer inside the iframe (the host never touches this DOM);
 *  - proxy bridge calls to the host with request ids;
 *  - translate MUIP `on` actions into bridge calls, toasts, or the app's own
 *    `onAction(action, node)` hook;
 *  - forward lifecycle transitions to the app's optional `onFocus`/`onBlur`/
 *    `onBackground`/`onUnmount` exports, exactly once per transition;
 *  - send heartbeats so the host watchdog can detect a freeze;
 *  - report fatal errors so the host can show an error boundary.
 */

import { MuipRenderer } from '../muip/renderer';
import { validateDocument, type MuipAction, type MuipEvent, type MuipNode, type PatchOperation } from '../muip/validate';

export interface InitMessage {
  type: 'microapp.init';
  appId: string;
  /** App bundle source; converted to an iframe-local blob URL here. */
  bundleSource: string;
  bridgeVersion: number;
}

export type LifecycleEvent = 'focus' | 'blur' | 'background' | 'active' | 'unmount';

interface LifecycleMessage {
  type: 'microapp.lifecycle';
  event: LifecycleEvent;
}

interface BridgeReply {
  type: 'microapp.bridge.reply';
  id: number;
  ok: boolean;
  result?: unknown;
  error?: { code: string; message: string };
}

export interface AppModule {
  mount?: (api: AppApi) => void | Promise<void>;
  onAction?: (action: MuipAction, node: MuipNode) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onBackground?: () => void;
  onUnmount?: () => void;
}

export interface AppApi {
  readonly version: number;
  readonly appId: string;
  render(node: unknown): void;
  patch(operations: PatchOperation[]): void;
  bridge(ns: string, method: string, params?: Record<string, unknown>): Promise<unknown>;
  toast(message: string): void;
  /** Observe events before dispatch; return `true` to stop default handling. */
  onEvent(handler: (nodeId: string, event: MuipEvent, action: MuipAction, node: MuipNode) => boolean | void): void;
}

const HEARTBEAT_MS = 1_000;
const BRIDGE_TIMEOUT_MS = 30_000;

function post(message: Record<string, unknown>): void {
  window.parent.postMessage(message, '*');
}

function startHeartbeat(): void {
  window.setInterval(() => post({ type: 'microapp.heartbeat' }), HEARTBEAT_MS);
}

function fatal(error: unknown): void {
  post({
    type: 'microapp.fatal',
    message: error instanceof Error ? error.message : String(error),
  });
}

async function main(): Promise<void> {
  startHeartbeat();
  window.addEventListener('error', (event) => fatal(event.error ?? event.message));
  window.addEventListener('unhandledrejection', (event) => fatal(event.reason));

  const root = document.getElementById('muip-root');
  if (!root) throw new Error('muip root missing');

  let activeAppId = '';
  let appModule: AppModule | null = null;
  let eventHandler: (nodeId: string, event: MuipEvent, action: MuipAction, node: MuipNode) => boolean | void =
    () => undefined;
  let pendingId = 1;
  let lifecycle: LifecycleEvent | null = null;
  const pending = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();

  const renderer = new MuipRenderer(root, {
    onEvent: (nodeId, event, action, node) => {
      const handled = eventHandler(nodeId, event, action, node);
      if (handled === true) return;
      dispatch(action, node);
    },
  });

  function dispatch(action: MuipAction, node: MuipNode): void {
    switch (action.action) {
      case 'toast':
        renderer.toast(String(action.target ?? action.params?.message ?? ''));
        return;
      case 'callBridge': {
        const method = action.method ?? '';
        const separator = method.indexOf('.');
        if (separator <= 0) return;
        const ns = method.slice(0, separator);
        const name = method.slice(separator + 1);
        void bridge(ns, name, scalarParams(action.params)).catch(() => undefined);
        return;
      }
      case 'navigate':
      case 'setState':
      case 'openSheet':
      case 'closeSheet':
        if (appModule?.onAction) {
          try {
            appModule.onAction(action, node);
          } catch (error) {
            fatal(error);
          }
          return;
        }
        // No handler: ignore loudly in the audit trail instead of failing render.
        post({ type: 'microapp.action', action: action.action, target: action.target ?? null, nodeId: node.id });
    }
  }

  window.addEventListener('message', (event: MessageEvent) => {
    if (event.source !== window.parent) return;
    const data = event.data as unknown;
    if (typeof data !== 'object' || data === null) return;
    const message = data as Record<string, unknown>;
    if (message.type === 'microapp.init') {
      void boot(message as unknown as InitMessage);
      return;
    }
    if (message.type === 'microapp.lifecycle') {
      applyLifecycle((message as unknown as LifecycleMessage).event);
      return;
    }
    if (message.type === 'microapp.bridge.reply') {
      const reply = message as unknown as BridgeReply;
      const entry = pending.get(reply.id);
      if (!entry) return;
      pending.delete(reply.id);
      if (reply.ok) entry.resolve(reply.result);
      else entry.reject(new Error(`${reply.error?.code ?? 'E-RUN-003'} ${reply.error?.message ?? ''}`));
    }
  });

  /** Exactly one call per transition; repeats and unknown events are ignored. */
  function applyLifecycle(next: LifecycleEvent): void {
    if (lifecycle === next) return;
    const previous = lifecycle;
    lifecycle = next;
    try {
      if (next === 'unmount') appModule?.onUnmount?.();
      else if (next === 'background') appModule?.onBackground?.();
      else if (next === 'focus') appModule?.onFocus?.();
      else if (next === 'blur') appModule?.onBlur?.();
    } catch (error) {
      fatal(error);
    }
    post({ type: 'microapp.lifecycle.ack', event: next, previous });
  }

  async function bridge(ns: string, method: string, params: Record<string, unknown> = {}): Promise<unknown> {
    const id = pendingId;
    pendingId += 1;
    const { promise, resolve, reject } = Promise.withResolvers<unknown>();
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error('E-RUN-001 bridge call timed out'));
    }, BRIDGE_TIMEOUT_MS);
    pending.set(id, {
      resolve: (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      reject: (error) => {
        clearTimeout(timer);
        reject(error);
      },
    });
    post({ type: 'microapp.bridge', id, appId: activeAppId, ns, method, params, v: 1 });
    return promise;
  }

  async function boot(init: InitMessage): Promise<void> {
    activeAppId = init.appId;
    const api: AppApi = {
      version: init.bridgeVersion,
      appId: init.appId,
      render(node: unknown): void {
        renderer.render(validateDocument(node).node);
      },
      patch(operations: PatchOperation[]): void {
        renderer.patch(operations);
      },
      bridge,
      toast(message: string): void {
        renderer.toast(message);
      },
      onEvent(handler): void {
        eventHandler = handler;
      },
    };
    // A blob URL created inside the opaque-origin iframe is loadable here; a
    // parent-origin blob URL would be rejected by the browser.
    const localBundleUrl = URL.createObjectURL(new Blob([init.bundleSource], { type: 'text/javascript' }));
    appModule = (await import(/* @vite-ignore */ localBundleUrl)) as AppModule;
    if (typeof appModule.mount !== 'function') {
      throw new Error('app bundle must export mount(api)');
    }
    await appModule.mount(api);
    lifecycle = 'focus';
    post({ type: 'microapp.ready', appId: activeAppId });
  }

  // Tell the host the bootstrap is alive; it answers with microapp.init.
  post({ type: 'microapp.hello' });
}

function scalarParams(params: MuipAction['params']): Record<string, unknown> {
  return params ? { ...params } : {};
}

void main().catch((error: unknown) => {
  fatal(error);
});
