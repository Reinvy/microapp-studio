'use client';

/*
 * `react-hooks/refs` (React Compiler) treats any value returned by a custom hook
 * that also returns a ref as a ref, so it flags plain state reads and even
 * `ref={sandbox.iframeRef}`. Returning the iframe ref from `useSandboxApp` is the
 * documented pattern; the hook itself keeps every ref access off the render path.
 */
/* eslint-disable react-hooks/refs */

/**
 * Runner page (SCR: `/app/[appId]`).
 *
 * Thin surface over `useSandboxApp`: a banner header with the app identity,
 * status badges, and the runner menu; the sandbox itself; and the crash
 * boundary. Every sandbox decision (consent, watchdog, hibernation, bridge
 * handlers) lives in the hook — this file only renders state and navigation.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Badge, Button, EmptyState, Menu, Modal, type MenuItem } from '@microapp/ui-kit';
import { SANDBOX_IFRAME_ATTRIBUTES } from '@microapp/runtime-web';
import { useHost } from '@/features/host/HostProvider';
import { appPolicy } from '@/db/repositories/apps';
import { readOpfsFile } from '@/features/storage/opfs';
import { downloadBytes, parseManifestFacts } from '@/features/runner/sandboxCore';
import { useSandboxApp } from '@/features/runner/useSandboxApp';

const formatBytes = (value: number, locale: string): string =>
  new Intl.NumberFormat(locale, { style: 'unit', unit: 'megabyte', maximumFractionDigits: 1 }).format(
    value / (1024 * 1024),
  );

interface RunnerPolicy {
  offlineCage: boolean;
  mockPermissions: string[];
}

const FAIL_CLOSED_POLICY: RunnerPolicy = { offlineCage: true, mockPermissions: [] };

export default function AppRunnerPage(): ReactElement {
  const host = useHost();
  const router = useRouter();
  const params = useParams<{ appId: string }>();
  const appId = typeof params?.appId === 'string' ? decodeURIComponent(params.appId) : '';

  const hostRef = useRef(host);
  useEffect(() => {
    hostRef.current = host;
  });
  const t = host.t;

  const app = useMemo(() => host.apps.find((candidate) => candidate.appId === appId) ?? null, [host.apps, appId]);
  const manifest = useMemo(() => parseManifestFacts(app?.manifestJson), [app?.manifestJson]);

  const [policyRow, setPolicyRow] = useState<{ installId: string; policy: RunnerPolicy } | null>(null);
  const [storageOpen, setStorageOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [clock, setClock] = useState<number | null>(null);

  const reloadButtonRef = useRef<HTMLButtonElement | null>(null);
  const exportButtonRef = useRef<HTMLButtonElement | null>(null);

  const appInstallId = app?.id ?? null;
  const workspaceId = host.workspace?.id ?? null;

  // Policy is per app: the cage defaults to on until the row says otherwise.
  // Keyed on the install id, never the row object, so a launch refresh cannot
  // re-run the query in a loop.
  useEffect(() => {
    if (!host.db || !workspaceId || !appInstallId) return undefined;
    const db = host.db;
    let cancelled = false;
    void appPolicy(db, workspaceId, appInstallId)
      .then((row) => {
        if (!cancelled) setPolicyRow({ installId: appInstallId, policy: row });
      })
      .catch(() => {
        if (!cancelled) setPolicyRow({ installId: appInstallId, policy: FAIL_CLOSED_POLICY });
      });
    return () => {
      cancelled = true;
    };
  }, [host.db, workspaceId, appInstallId]);

  const policy = policyRow && policyRow.installId === app?.id ? policyRow.policy : FAIL_CLOSED_POLICY;

  // Lifecycle: register the launch, release the runtime session on unmount.
  // `appInstallId` is a scalar: `launchApp` refreshes `host.apps`, and depending
  // on the row object would stop and relaunch the app on its own refresh.
  useEffect(() => {
    if (host.phase !== 'ready' || !appInstallId) return undefined;
    void hostRef.current.launchApp(appId);
    return () => {
      void hostRef.current.stopApp(appId);
    };
  }, [appId, appInstallId, host.phase]);

  const bundleSource = useCallback(async (): Promise<string> => {
    if (!app) throw new Error('E-RUN-002 app not installed');
    const entry = manifest.bundle ?? 'bundle/index.js';
    const bytes = await readOpfsFile(`${app.bundlePath}/${entry}`);
    if (!bytes) throw new Error('E-RUN-002 app bundle missing');
    return new TextDecoder().decode(bytes);
  }, [app, manifest.bundle]);

  const sandbox = useSandboxApp({
    workspaceId: host.workspace?.id ?? '',
    workspaceSlug: host.workspace?.slug ?? '',
    appInstallId: app?.id ?? `uninstalled:${appId}`,
    appId,
    bundleSource,
    declaredPermissions: manifest.permissions,
    mode: 'run',
    offlineCage: policy.offlineCage,
  });

  const blockedUntil = sandbox.app.restartBlockedUntil;
  const restartBlocked = blockedUntil !== null && (clock === null || clock < blockedUntil);
  const remainingSeconds =
    blockedUntil === null || clock === null ? 0 : Math.max(0, Math.ceil((blockedUntil - clock) / 1000));

  // Countdown while the budget is exhausted; no timer otherwise.
  useEffect(() => {
    if (blockedUntil === null) return undefined;
    const kickoff = setTimeout(() => setClock(Date.now()), 0);
    const timer = setInterval(() => setClock(Date.now()), 1000);
    return () => {
      clearTimeout(kickoff);
      clearInterval(timer);
    };
  }, [blockedUntil]);

  const goHome = useCallback((): void => {
    if (sandbox.app.status === 'running' && typeof window !== 'undefined') {
      if (!window.confirm(hostRef.current.t('runner.leaveConfirm'))) return;
    }
    router.push('/');
  }, [router, sandbox.app.status]);

  // Boundary focus: "Muat ulang app" first, or the export action while blocked.
  useEffect(() => {
    if (!sandbox.app.crash) return;
    const target = restartBlocked ? exportButtonRef.current : reloadButtonRef.current;
    target?.focus();
  }, [sandbox.app.crash, restartBlocked]);

  // Esc from the boundary always means "back home"; status is crashed, so no
  // unsaved-work confirmation is needed.
  useEffect(() => {
    if (!sandbox.app.crash) return undefined;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      router.push('/');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [router, sandbox.app.crash]);

  const exportData = useCallback(async (): Promise<void> => {
    if (!app) return;
    setActionError(null);
    try {
      const text = await hostRef.current.exportAppData(app.id, 'json');
      downloadBytes(`${app.appId}-data.json`, new TextEncoder().encode(text));
    } catch {
      setActionError('E-DATA-002');
    }
  }, [app]);

  const emptyApp = app !== null && manifest.bundle === null;
  const ready = host.phase === 'ready';
  const missing = ready && app === null;

  const menuItems = useMemo<MenuItem[]>(
    () => [
      { id: 'permissions', label: t('runner.permissions'), onSelect: () => router.push('/settings/permissions') },
      { id: 'storage', label: t('runner.storage'), onSelect: () => setStorageOpen(true) },
      { id: 'reload', label: t('runner.reload'), disabled: restartBlocked, onSelect: () => sandbox.reload() },
      { id: 'home', label: t('runner.backHome'), onSelect: () => goHome() },
    ],
    [goHome, restartBlocked, router, sandbox, t],
  );

  const statusTone =
    sandbox.app.status === 'running'
      ? 'success'
      : sandbox.app.status === 'crashed'
        ? 'danger'
        : sandbox.app.status === 'stopped'
          ? 'warning'
          : 'info';
  const statusLabel = t(
    sandbox.app.status === 'running'
      ? 'runner.statusRunning'
      : sandbox.app.status === 'stopped'
        ? 'runner.statusStopped'
        : sandbox.app.status === 'crashed'
          ? 'runner.statusCrashed'
          : 'runner.starting',
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minBlockSize: '100dvh' }}>
      <header
        role="banner"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--mads-space-3)',
          padding: 'var(--mads-space-3) var(--mads-space-4)',
          borderBlockEnd: '1px solid var(--mads-color-border-subtle)',
          background: 'var(--mads-color-surface)',
        }}
      >
        <div className="mads-row">
          <Button variant="secondary" size="sm" onClick={goHome}>
            {t('runner.backHome')}
          </Button>
          <div>
            <h1 style={{ fontSize: 'var(--mads-text-20)' }}>{app?.name ?? appId}</h1>
            <p style={{ color: 'var(--mads-color-muted)', fontSize: 'var(--mads-text-14)' }}>
              {manifest.version ?? app?.version ?? ''}
            </p>
          </div>
        </div>
        <div className="mads-row">
          {policy.offlineCage ? <Badge tone="info">{t('settings.permissions.cageOn')}</Badge> : null}
          <Badge tone={statusTone}>{statusLabel}</Badge>
          <Menu label={t('a11y.menu')} items={menuItems} />
        </div>
      </header>

      <main
        id="mads-main"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--mads-space-4)',
          padding: 'var(--mads-space-4)',
          flex: '1 1 auto',
        }}
      >
        <p className="mads-visually-hidden" role="status" aria-live="polite">
          {statusLabel}
        </p>

        {actionError ? (
          <p role="alert" style={{ color: 'var(--mads-color-error)' }}>
            {t(`errors.${actionError}`)}
          </p>
        ) : null}

        {!ready ? <p role="status">{t('runner.starting')}</p> : null}

        {missing ? (
          <EmptyState
            title={t('runner.notFound')}
            description={t('runner.notInstalled')}
            action={<Button onClick={goHome}>{t('runner.backHome')}</Button>}
          />
        ) : null}

        {emptyApp && app ? (
          <EmptyState
            title={app.name}
            description={t('runner.notFound')}
            action={<Button onClick={goHome}>{t('runner.backHome')}</Button>}
          />
        ) : null}

        {app && !emptyApp ? (
          <>
            {sandbox.app.status === 'starting' && !sandbox.app.crash ? <p role="status">{t('runner.starting')}</p> : null}
            <iframe
              ref={sandbox.iframeRef}
              title={`Sandbox ${app.name}`}
              {...SANDBOX_IFRAME_ATTRIBUTES}
              style={{
                display: sandbox.app.crash ? 'none' : 'block',
                inlineSize: '100%',
                blockSize: 'min(72vh, 760px)',
                border: 0,
                borderRadius: 'var(--mads-radius-clay-lg)',
                background: 'var(--mads-color-surface)',
              }}
            />
          </>
        ) : null}
      </main>

      {sandbox.app.crash && app ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            padding: 'var(--mads-space-4)',
            background: 'color-mix(in srgb, var(--mads-color-fg) 40%, transparent)',
            zIndex: 1000,
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="runner-crash-title"
            aria-describedby="runner-crash-body"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--mads-space-4)',
              inlineSize: 'min(32rem, 100%)',
              padding: 'var(--mads-space-6)',
              borderRadius: 'var(--mads-radius-clay-lg)',
              background: 'var(--mads-color-surface-raised)',
              boxShadow: 'var(--mads-clay-shadow-3)',
            }}
          >
            <h2 id="runner-crash-title">{t('runner.crashTitle')}</h2>
            <p id="runner-crash-body" style={{ color: 'var(--mads-color-muted)' }}>
              {t('runner.crashBody', { app: app.name })}
            </p>
            <p style={{ fontFamily: 'var(--mads-font-mono)', fontSize: 'var(--mads-text-14)' }}>
              {sandbox.app.crash.code} · {sandbox.app.crash.message}
            </p>
            {restartBlocked ? (
              <div role="status" style={{ color: 'var(--mads-color-warning)' }}>
                <p>{t('runner.restartBudget')}</p>
                {remainingSeconds > 0 ? (
                  <p>{t('runner.restartCountdown', { seconds: remainingSeconds })}</p>
                ) : null}
              </div>
            ) : null}
            <div className="mads-row">
              <Button ref={reloadButtonRef} onClick={() => sandbox.reload()} disabled={restartBlocked}>
                {t('runner.reloadApp')}
              </Button>
              <Button ref={exportButtonRef} variant="secondary" onClick={() => void exportData()}>
                {t('runner.exportData')}
              </Button>
              <Button variant="ghost" onClick={goHome}>
                {t('runner.backHome')}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <Modal
        open={storageOpen}
        onClose={() => setStorageOpen(false)}
        title={t('runner.storage')}
        footer={
          <div className="mads-row">
            <Button variant="secondary" onClick={() => void exportData()}>
              {t('runner.exportData')}
            </Button>
            <Button variant="ghost" onClick={() => setStorageOpen(false)}>
              {t('common.close')}
            </Button>
          </div>
        }
      >
        <p>
          {host.storageEstimate
            ? `${formatBytes(host.storageEstimate.usage, host.locale)} / ${formatBytes(host.storageEstimate.quota, host.locale)}`
            : t('common.loading')}
        </p>
        <p style={{ color: 'var(--mads-color-muted)' }}>{t('settings.permissions.cage')}</p>
        <p>{policy.offlineCage ? t('settings.permissions.cageOn') : t('settings.permissions.cageOff')}</p>
      </Modal>
    </div>
  );
}
