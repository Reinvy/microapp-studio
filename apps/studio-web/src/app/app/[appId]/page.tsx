'use client';

/**
 * App runner: loads the verified bundle from OPFS, mounts it inside an opaque
 * origin iframe, proxies bridge calls through the broker, and enforces the
 * watchdog restart budget.
 */

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { useParams } from 'next/navigation';
import { useHost } from '@/features/host/HostProvider';
import { BridgeBroker, buildSandboxDocument, FREEZE_MS, type AuditEvent } from '@microapp/runtime-web';
import { permissionDecision } from '@/db/repositories/permissions';
import type { InstalledApp } from '@/db/repositories/apps';

interface CrashState {
  code: string;
  message: string;
}

async function readBundle(app: InstalledApp): Promise<{ bytes: Uint8Array; bundlePath: string }> {
  const manifest = JSON.parse(app.manifestJson) as { entry?: { bundle?: string } };
  const bundlePath = manifest.entry?.bundle ?? 'dist/app.bundle.js';
  const segments = [app.bundlePath, bundlePath].join('/').split('/').filter(Boolean);
  let directory = await navigator.storage.getDirectory();
  for (const segment of segments.slice(0, -1)) {
    directory = await directory.getDirectoryHandle(segment);
  }
  const name = segments.at(-1);
  if (!name) throw new Error('E-DATA-001 invalid bundle path');
  const handle = await directory.getFileHandle(name);
  const file = await handle.getFile();
  return { bytes: new Uint8Array(await file.arrayBuffer()), bundlePath };
}

export default function AppRunnerPage(): ReactElement {
  const host = useHost();
  const params = useParams<{ appId: string }>();
  const appId = typeof params?.appId === 'string' ? decodeURIComponent(params.appId) : '';
  const [app, setApp] = useState<InstalledApp | null>(null);
  const [crash, setCrash] = useState<CrashState | null>(null);
  const [status, setStatus] = useState<string>('loading');
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const lastBeatRef = useRef<number>(0);
  const startedRef = useRef<number>(0);
  const restartsRef = useRef<number[]>([]);
  const brokerRef = useRef<BridgeBroker | null>(null);

  const t = host.t;

  const kill = useCallback(
    async (code: string, message: string): Promise<void> => {
      const iframe = iframeRef.current;
      if (iframe) {
        iframe.remove();
        iframeRef.current = null;
      }
      setCrash({ code, message });
      await host.stopApp(appId);
      await host.audit('sandbox.kill', appId, { code });
    },
    [appId, host],
  );

  const mount = useCallback(async (): Promise<(() => void) | undefined> => {
    setCrash(null);
    setStatus('loading');
    if (!host.db || !host.workspace) return undefined;
    const installed = await host.launchApp(appId);
    if (!installed) {
      setCrash({ code: 'E-HOST-003', message: t('app.notInstalled') });
      return;
    }
    setApp(installed);

    const { bytes } = await readBundle(installed);
    const bundleSource = new TextDecoder().decode(bytes);

    const bootstrapSource = await fetch('/sandbox-bootstrap.js').then((response) => {
      if (!response.ok) throw new Error('E-HOST-002 sandbox bootstrap missing');
      return response.text();
    });
    const nonce = crypto.randomUUID().replaceAll('-', '');

    const broker = new BridgeBroker({
      appId,
      handlers: {
        'log.write': (params) => {
          if (typeof params.message === 'string') console.info('[micro-app]', params.message);
          return { accepted: true };
        },
        'log.flush': () => ({ accepted: true }),
        'sync.status': () => ({ state: 'local', cursor: null }),
        'sync.request': () => ({ queued: false }),
        'sync.cancel': () => ({ cancelled: false }),
        'device.info': () => ({ platform: navigator.platform, language: navigator.language }),
        'storage.get': (params) => ({ value: sessionStorage.getItem(`mapp:${appId}:${String(params.key)}`) }),
        'storage.set': (params) => {
          sessionStorage.setItem(`mapp:${appId}:${String(params.key)}`, String(params.value ?? ''));
          return { saved: true };
        },
        'storage.remove': (params) => {
          sessionStorage.removeItem(`mapp:${appId}:${String(params.key)}`);
          return { removed: true };
        },
        'storage.keys': () => ({ keys: [] }),
      },
      checkPermission: async (permissionId) => {
        const decision = await permissionDecision(host.db!, {
          workspaceId: host.workspace!.id,
          appInstallId: installed.id,
          permissionId,
        });
        return decision;
      },
      audit: (event: AuditEvent) => {
        void host.audit('bridge.call', `${event.method}`, {
          result: event.result,
          code: event.code,
          durationMs: event.durationMs,
        });
      },
    });
    brokerRef.current = broker;

    const iframe = document.createElement('iframe');
    iframe.setAttribute('sandbox', 'allow-scripts');
    iframe.setAttribute('title', `Sandbox ${appId}`);
    iframe.setAttribute('referrerpolicy', 'no-referrer');
    iframe.style.width = '100%';
    iframe.style.minHeight = '480px';
    iframe.style.border = '0';
    iframe.srcdoc = buildSandboxDocument({ bootstrapSource, nonce, appId, locale: host.locale });
    iframeRef.current = iframe;
    const container = document.getElementById('sandbox-container');
    if (!container) throw new Error('E-DATA-001 sandbox container missing');
    container.replaceChildren(iframe);

    lastBeatRef.current = Date.now();
    startedRef.current = Date.now();

    const onMessage = (event: MessageEvent): void => {
      if (event.source !== iframe.contentWindow) return;
      if (typeof event.data !== 'object' || event.data === null) return;
      const message = event.data as Record<string, unknown>;
      switch (message.type) {
        case 'microapp.hello':
          iframe.contentWindow?.postMessage(
            {
              type: 'microapp.init',
              appId,
              bundleSource,
              bridgeVersion: 1,
            },
            '*',
          );
          return;
        case 'microapp.heartbeat':
          lastBeatRef.current = Date.now();
          return;
        case 'microapp.ready':
          setStatus('ready');
          return;
        case 'microapp.fatal':
          void kill('E-SBX-003', String(message.message ?? t('app.errorBody')));
          return;
        case 'microapp.event':
          void host.audit('muip.event', String(message.nodeId), { event: String(message.event) });
          return;
        case 'microapp.bridge': {
          void (async () => {
            const response = await broker.handle({
              v: 1,
              id: String(message.id),
              ns: String(message.ns),
              method: String(message.method),
              params: (message.params as Record<string, unknown>) ?? {},
            });
            iframe.contentWindow?.postMessage({ type: 'microapp.bridge.reply', ...response }, '*');
          })();
          return;
        }
        default:
          return;
      }
    };
    window.addEventListener('message', onMessage);

    return () => {
      window.removeEventListener('message', onMessage);
    };
  }, [appId, host, kill, t]);

  const mountRef = useRef(mount);
  useEffect(() => {
    mountRef.current = mount;
  }, [mount]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    void mountRef.current().then((dispose) => {
      cleanup = dispose;
    });
    return () => {
      cleanup?.();
      if (iframeRef.current) iframeRef.current.remove();
    };
  }, [appId]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (!iframeRef.current) return;
      const silentMs = Date.now() - lastBeatRef.current;
      if (silentMs < FREEZE_MS) return;
      const windowStart = Date.now() - 60_000;
      restartsRef.current = restartsRef.current.filter((at) => at > windowStart);
      if (restartsRef.current.length >= 2) {
        void kill('E-SBX-003', 'Batas restart otomatis tercapai');
        return;
      }
      restartsRef.current.push(Date.now());
      void kill('E-SBX-003', 'Sandbox tidak merespons (freeze)');
    }, 1_000);
    return () => clearInterval(timer);
  }, [kill]);

  const header = useMemo(
    () => (
      <div className="screen-header">
        <div>
          <h1>{app?.appId ?? appId}</h1>
          <p>{app ? `${app.version} · ${app.state}` : t('app.loading')}</p>
        </div>
        <div className="badge-row">
          <button type="button" className="button" onClick={() => void mount()} disabled={StatusCodeBusy(status)}>
            {t('app.restart')}
          </button>
          <Link className="button" href="/">
            {t('common.back')}
          </Link>
        </div>
      </div>
    ),
    [app, appId, mount, status, t],
  );

  return (
    <main id="mads-main" className="screen">
      {header}
      <p role="status">{status === 'ready' ? t('app.run') : t('app.loading')}</p>
      {crash ? (
        <section role="alert" className="alert alert-error">
          <h2>{t('app.errorTitle')}</h2>
          <p>{t('app.errorBody')}</p>
          <p>
            <code>{crash.code}</code> {crash.message}
          </p>
          <button type="button" className="button" onClick={() => void mount()}>
            {t('app.restart')}
          </button>
        </section>
      ) : null}
      <div id="sandbox-container" aria-live="polite" />
    </main>
  );
}

function StatusCodeBusy(status: string): boolean {
  return status === 'loading';
}
