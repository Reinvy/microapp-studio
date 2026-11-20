'use client';

/**
 * Home screen: installed apps, omni-search over the FTS index, and the local
 * `.mapp` install flow (verify → consent → materialize → install → audit).
 */

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { useHost } from '@/features/host/HostProvider';
import { search, type SearchHit } from '@/db/repositories/search';
import type { VerifiedPackage } from '@microapp/runtime-web';

interface PendingInstall {
  file: File;
  authorPubkeyHex: string;
  preview: VerifiedPackage;
}

export function HomeScreen(): ReactElement {
  const host = useHost();
  const t = host.t;
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [installError, setInstallError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingInstall | null>(null);
  const [authorKey, setAuthorKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [installedNotice, setInstalledNotice] = useState<string | null>(null);

  const filteredApps = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return host.apps;
    return host.apps.filter(
      (app) => app.appId.toLowerCase().includes(term) || app.version.includes(term),
    );
  }, [host.apps, query]);

  useEffect(() => {
    const db = host.db;
    const workspace = host.workspace;
    let cancelled = false;
    void Promise.resolve().then(async () => {
      if (cancelled) return;
      if (!db || !workspace || query.trim().length === 0) {
        setHits([]);
        return;
      }
      try {
        const results = await search(db, workspace.id, query.trim(), 20);
        if (!cancelled) setHits(results.filter((hit) => hit.kind !== 'app'));
      } catch {
        if (!cancelled) setHits([]);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [host.db, host.workspace, query]);

  const onFileChosen = useCallback(
    async (file: File): Promise<void> => {
      setBusy(true);
      setInstallError(null);
      try {
        const preview = await host.inspectPackage(file, 'local', {
          authorPubkeyHex: authorKey.trim(),
        });
        setPending({ file, authorPubkeyHex: authorKey.trim(), preview });
      } catch (error) {
        setInstallError(error instanceof Error ? error.message : t('install.verifyFailed'));
      } finally {
        setBusy(false);
      }
    },
    [authorKey, host, t],
  );

  const approveInstall = useCallback(async (): Promise<void> => {
    if (!pending) return;
    setBusy(true);
    setInstallError(null);
    try {
      const permissions = [
        ...pending.preview.manifest.permissions.required,
        ...pending.preview.manifest.permissions.optional,
      ];
      const installed = await host.installPackage(pending.file, 'local', permissions, {
        authorPubkeyHex: pending.authorPubkeyHex,
      });
      setInstalledNotice(`${t('install.success')}: ${installed.appId} ${installed.version}`);
      setPending(null);
    } catch (error) {
      setInstallError(error instanceof Error ? error.message : t('install.verifyFailed'));
    } finally {
      setBusy(false);
    }
  }, [host, pending, t]);

  return (
    <main id="mads-main" className="screen">
      <div className="screen-header">
        <div>
          <h1>{t('home.title')}</h1>
          <p>{host.workspace?.name}</p>
        </div>
        <nav className="badge-row" aria-label="Navigasi utama">
          <Link className="button" href="/registry">
            {t('nav.registry')}
          </Link>
          <Link className="button" href="/studio">
            {t('nav.studio')}
          </Link>
          <Link className="button" href="/settings">
            {t('nav.settings')}
          </Link>
          <Link className="button" href="/settings/vault">
            {t('nav.vault')}
          </Link>
        </nav>
      </div>

      {host.storage === 'memory' ? (
        <p role="status" className="alert alert-warning">
          {t('errors.opfs')}
        </p>
      ) : null}

      {installedNotice ? (
        <p role="status" className="alert">
          {installedNotice}
        </p>
      ) : null}

      <section aria-label={t('home.searchPlaceholder')} className="stack-md">
        <label className="field">
          <span>{t('common.search')}</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('home.searchPlaceholder')}
            aria-label={t('home.searchPlaceholder')}
          />
        </label>

        <div className="badge-row">
          <label className="button file-button">
            {t('home.install')}
            <input
              type="file"
              accept=".mapp,application/zip"
              aria-label={t('home.install')}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void onFileChosen(file);
              }}
            />
          </label>
          <label className="field">
            <span>Author public key (hex)</span>
            <input
              type="text"
              value={authorKey}
              onChange={(event) => setAuthorKey(event.target.value)}
              spellCheck={false}
              autoComplete="off"
              aria-label="Author public key (hex)"
            />
          </label>
        </div>
      </section>

      {installError ? (
        <p role="alert" className="alert alert-error">
          {installError}
        </p>
      ) : null}

      {busy ? <p role="status">{t('install.verifying')}</p> : null}

      <section aria-labelledby="apps-heading" className="stack-md">
        <h2 id="apps-heading">{t('nav.home')}</h2>
        {filteredApps.length === 0 ? (
          <div className="empty-state">
            <h3>{t('home.emptyTitle')}</h3>
            <p>{t('home.emptyBody')}</p>
          </div>
        ) : (
          <ul className="app-grid">
            {filteredApps.map((app) => (
              <li key={app.id} className="card">
                <h3>{app.appId}</h3>
                <p>{app.version}</p>
                <Link className="button" href={`/app/${encodeURIComponent(app.appId)}`}>
                  {t('app.run')}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {hits.length > 0 ? (
        <section aria-label={t('search.title')} className="stack-md">
          <h2>{t('search.results', { count: hits.length })}</h2>
          <ul>
            {hits.map((hit) => (
              <li key={`${hit.kind}-${hit.refId}`}>
                <strong>{hit.title}</strong> <span>{hit.snippet}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {pending ? (
        <div role="dialog" aria-modal="true" aria-labelledby="consent-title" className="modal">
          <h2 id="consent-title">{t('install.consentTitle')}</h2>
          <p>{t('install.consentBody')}</p>
          <ul>
            {pending.preview.manifest.permissions.required.map((permission) => (
              <li key={`req-${permission}`}>
                {permission} — {t('common.required')}
              </li>
            ))}
            {pending.preview.manifest.permissions.optional.map((permission) => (
              <li key={`opt-${permission}`}>{permission}</li>
            ))}
          </ul>
          <div className="badge-row">
            <button type="button" className="button button-primary" onClick={() => void approveInstall()} disabled={busy}>
              {t('install.allow')}
            </button>
            <button type="button" className="button" onClick={() => setPending(null)} disabled={busy}>
              {t('install.deny')}
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
