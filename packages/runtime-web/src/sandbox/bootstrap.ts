/**
 * Sandbox bootstrap: the only script that runs inside the opaque-origin iframe.
 *
 * Responsibilities:
 *  - receive the app bundle blob URL from the Host and import it;
 *  - host the MUIP renderer inside the iframe (Host never touches this DOM);
 *  - proxy bridge calls to the Host with request ids;
 *  - send heartbeats so the Host watchdog can detect a freeze;
 *  - report fatal errors so the Host can show an error boundary.
 */

import { MuipRenderer } from '../muip/renderer';
import { applyPatch, validateDocument, type MuipNode, type PatchOperation } from '../muip/validate';
import type { EventBinding } from '../muip/validate';

interface InitMessage {
  type: 'microapp.init';
  appId: string;
  /** App bundle source; converted to an iframe-local blob URL here. */
  bundleSource: string;
  bridgeVersion: number;
}

interface BridgeReply {
  type: 'microapp.bridge.reply';
  id: number;
  ok: boolean;
  result?: unknown;
  error?: { code: string; message: string };
}

interface AppModule {
  mount?: (api: AppApi) => void | Promise<void>;
  unmount?: () => void;
}

export interface AppApi {
  readonly version: number;
  render(node: unknown): void;
  patch(operations: PatchOperation[]): void;
  bridge(ns: string, method: string, params?: Record<string, unknown>): Promise<unknown>;
  onEvent(handler: (nodeId: string, event: string, binding: EventBinding) => void): void;
}

const HEARTBEAT_MS = 1_000;

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
  let eventHandler: ((nodeId: string, event: string, binding: EventBinding) => void) | null = null;
  let pendingId = 1;
  const pending = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();

  const renderer = new MuipRenderer(root, {
    onEvent: (nodeId, event, binding) => {
      if (eventHandler) eventHandler(nodeId, event, binding);
      else post({ type: 'microapp.event', nodeId, event, binding });
    },
  });

  window.addEventListener('message', (event: MessageEvent) => {
    if (event.source !== window.parent) return;
    const data = event.data as unknown;
    if (typeof data !== 'object' || data === null) return;
    const message = data as Record<string, unknown>;
    if (message.type === 'microapp.init') {
      void boot(message as unknown as InitMessage);
      return;
    }
    if (message.type === 'microapp.bridge.reply') {
      const reply = message as unknown as BridgeReply;
      const entry = pending.get(reply.id);
      if (!entry) return;
      pending.delete(reply.id);
      if (reply.ok) entry.resolve(reply.result);
      else entry.reject(new Error(`${reply.error?.code ?? 'E-SBX-001'} ${reply.error?.message ?? ''}`));
    }
  });

  async function bridge(ns: string, method: string, params: Record<string, unknown> = {}): Promise<unknown> {
    const id = pendingId;
    pendingId += 1;
    const { promise, resolve, reject } = Promise.withResolvers<unknown>();
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error('E-NET-003 bridge call timed out'));
    }, 10_000);
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
    post({ type: 'microapp.bridge', id, appId: activeAppId, ns, method, params });
    return promise;
  }

  async function boot(init: InitMessage): Promise<void> {
    activeAppId = init.appId;
    const api: AppApi = {
      version: init.bridgeVersion,
      render(node: unknown): void {
        const validated = validateDocument(node);
        renderer.render(validated.node as MuipNode);
      },
      patch(operations: PatchOperation[]): void {
        renderer.patch(operations);
      },
      bridge,
      onEvent(handler): void {
        eventHandler = handler;
      },
    };
    // A blob URL created inside the opaque-origin iframe is loadable here; a
    // parent-origin blob URL would be rejected by the browser.
    const localBundleUrl = URL.createObjectURL(
      new Blob([init.bundleSource], { type: 'text/javascript' }),
    );
    const appModule = (await import(/* @vite-ignore */ localBundleUrl)) as AppModule;
    if (typeof appModule.mount !== 'function') {
      throw new Error('app bundle must export mount(api)');
    }
    await appModule.mount(api);
    post({ type: 'microapp.ready', appId: activeAppId });
  }

  // Tell the Host the bootstrap is alive; it answers with microapp.init.
  post({ type: 'microapp.hello' });
  void applyPatch;
}

void main().catch((error: unknown) => {
  fatal(error);
});
