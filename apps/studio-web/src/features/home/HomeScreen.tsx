'use client';

/**
 * Home / Library (SCR-02).
 *
 * The shell's work surface: continue card, grouped search, recent drafts, the
 * installed-app library with persisted view/sort/filter, import entry, and the
 * first-run welcome overlay. The overlay never blocks Home, and no mnemonic is
 * ever shown here — recovery lives in `RecoverySheet`.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { useRouter } from 'next/navigation';
import { Badge, Button, Card, ConfirmDialog, EmptyState, Modal, SearchField } from '@microapp/ui-kit';
import { useHost } from '@/features/host/HostProvider';
import { search, type SearchHit, type SearchKind } from '@/db/repositories/search';
import { listRecentProjects, type StudioProject } from '@/db/repositories/studio';
import { getAppById, recordLaunch, type InstalledApp } from '@/db/repositories/apps';
import { loadWorkspaceState } from '@/db/repositories/workspaces';
import { appMenuItems, clampMenuPosition, type AppMenuAction, type ContextMenuState } from './contextMenu';
import {
  DEFAULT_LIBRARY_STATE,
  loadLibraryState,
  pushRecentSearch,
  saveLibraryState,
  type LibraryState,
} from './libraryState';
import { WelcomeOverlay } from './WelcomeOverlay';

const GROUP_ORDER: SearchKind[] = ['app', 'project', 'record', 'action'];

export function HomeScreen(): ReactElement {
  const host = useHost();
  const router = useRouter();
  const [library, setLibrary] = useState<LibraryState>(DEFAULT_LIBRARY_STATE);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [drafts, setDrafts] = useState<StudioProject[]>([]);
  const [menu, setMenu] = useState<ContextMenuState | null>(null);
  const [confirmUninstall, setConfirmUninstall] = useState<InstalledApp | null>(null);
  const [renameTarget, setRenameTarget] = useState<InstalledApp | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [continueApp, setContinueApp] = useState<InstalledApp | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [dragging, setDragging] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const booting = host.phase === 'booting';

  // Library state and the continue card load once per workspace.
  useEffect(() => {
    if (!host.db || !host.workspace) return;
    const db = host.db;
    const workspaceId = host.workspace.id;
    let cancelled = false;
    void (async () => {
      const [state, recent, workspaceState] = await Promise.all([
        loadLibraryState(db, workspaceId),
        listRecentProjects(db, workspaceId, 5),
        loadWorkspaceState(db, workspaceId),
      ]);
      if (cancelled) return;
      setLibrary(state);
      setDrafts(recent);
      if (workspaceState.lastAppId) {
        const app = await getAppById(db, workspaceId, workspaceState.lastAppId);
        if (!cancelled) setContinueApp(app);
      } else {
        setContinueApp(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [host.db, host.workspace]);

  useEffect(() => {
    if (!host.db || !host.workspace) return;
    const db = host.db;
    const workspaceId = host.workspace.id;
    const term = query.trim();
    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        if (term.length === 0) {
          if (!cancelled) setHits([]);
          return;
        }
        const found = await search(db, workspaceId, term, 30);
        if (!cancelled) {
          setHits(found);
          setAnnouncement(found.length === 0 ? host.t('home.noResults') : String(found.length));
        }
      })().catch(() => {
        if (!cancelled) setHits([]);
      });
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [host, query]);

  useEffect(() => {
    if (!menu) return;
    const close = (event: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenu(null);
    };
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setMenu(null);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [menu]);

  const persistLibrary = useCallback(
    (next: LibraryState) => {
      setLibrary(next);
      if (!host.db || !host.workspace) return;
      void saveLibraryState(host.db, host.workspace.id, next);
    },
    [host.db, host.workspace],
  );

  const apps = useMemo(() => {
    const list = [...host.apps];
    if (library.sort === 'name') {
      list.sort((a, b) => (a.displayName ?? a.name).localeCompare(b.displayName ?? b.name, host.locale));
    } else if (library.sort === 'type') {
      list.sort((a, b) => a.appId.localeCompare(b.appId, host.locale));
    } else if (library.sort === 'favorite') {
      list.sort((a, b) => Number(b.pinned) - Number(a.pinned));
    } else {
      list.sort((a, b) => (b.lastLaunchedAtMs ?? 0) - (a.lastLaunchedAtMs ?? 0));
    }
    return list;
  }, [host.apps, host.locale, library.sort]);

  const openApp = useCallback(
    async (app: InstalledApp) => {
      await host.requestPersist();
      if (host.db && host.workspace) void recordLaunch(host.db, host.workspace.id, app.id);
      router.push(`/app/${encodeURIComponent(app.appId)}`);
    },
    [host, router],
  );

  const startCreate = useCallback(
    (mode: 'template' | 'ai' | 'blank') => {
      host.setPrefs({ lastCreateMode: mode });
      router.push(`/create?mode=${mode}`);
    },
    [host, router],
  );

  const onMenuAction = useCallback(
    async (action: AppMenuAction | 'unpin', app: InstalledApp) => {
      setMenu(null);
      switch (action) {
        case 'open':
          await openApp(app);
          return;
        case 'rename':
          setRenameTarget(app);
          setRenameValue(app.displayName ?? app.name);
          return;
        case 'duplicate':
          await host.duplicateApp(app.id);
          return;
        case 'export': {
          const bytes = await host.exportPackageBytes(app.id);
          if (!bytes) return;
          downloadBlob(new Blob([bytes as unknown as BlobPart], { type: 'application/zip' }), `${app.appId}.mapp`);
          return;
        }
        case 'pin':
          await host.setPinned(app.id, true);
          return;
        case 'unpin':
          await host.setPinned(app.id, false);
          return;
        case 'uninstall':
          setConfirmUninstall(app);
      }
    },
    [host, openApp],
  );

  const grouped = useMemo(() => {
    return GROUP_ORDER.map((kind) => ({
      kind,
      hits: hits.filter((hit) => hit.kind === kind),
    })).filter((group) => group.hits.length > 0);
  }, [hits]);

  const searchRef = useRef<HTMLInputElement>(null);

  if (booting) {
    return (
      <div aria-busy="true">
        {/*
          Server-rendered brand heading: it is locale-independent, so it can paint
          with the first HTML without a hydration mismatch, and it is the largest
          contentful element — which is what makes the LCP budget reachable under
          Fast 3G + 4x CPU.
        */}
        <h1 className="mads-page__title">{host.t('app.name')}</h1>
        <p className="mads-visually-hidden" role="status">
          {host.t('a11y.loading')}
        </p>
        {/*
          The skeleton mirrors the final layout's size (SCR-02: same count and
          dimensions as the real grid), so replacing it causes no layout shift and
          no later, larger paint — which is what keeps LCP on the first paint.
        */}
        <div className="mads-skeleton" style={{ blockSize: '20rem', marginBlockEnd: 'var(--mads-space-4)' }} />
        <div className="mads-grid">
          <div className="mads-skeleton" style={{ blockSize: '9rem' }} />
          <div className="mads-skeleton" style={{ blockSize: '9rem' }} />
          <div className="mads-skeleton" style={{ blockSize: '9rem' }} />
        </div>
        {/*
          The welcome overlay is server-rendered too: it is the largest element on
          a first visit, so painting it with the first HTML keeps LCP inside the
          budget. It never blocks Home (`aria-modal="false"`).
        */}
        <WelcomeOverlay
          onTemplate={() => startCreate('template')}
          onMagic={() => startCreate('ai')}
          onBlank={() => startCreate('blank')}
          disabled={host.ephemeral || !host.ready}
        />
      </div>
    );
  }

  return (
    <div onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => {
      event.preventDefault();
      setDragging(false);
      if (event.dataTransfer.files.length > 0) router.push('/packages?import=1');
    }}>
      <p className="mads-visually-hidden" role="status" aria-live="polite">
        {announcement}
      </p>

      {host.bootError ? (
        <Card>
          <h2>E-SHELL-001</h2>
          <p>{host.t('shell.limitedMode')}</p>
          <div className="mads-row">
            <Button onClick={() => void host.refresh()}>{host.t('common.retry')}</Button>
          </div>
        </Card>
      ) : null}

      {host.identityError ? (
        <Card>
          <h2>{host.identityError}</h2>
          <p>{host.t('shell.identityError')}</p>
          <div className="mads-row">
            <Button onClick={() => void host.refresh()}>{host.t('common.retry')}</Button>
            <Button variant="secondary" onClick={() => router.push('/settings/general')}>
              {host.t('nav.settings')}
            </Button>
          </div>
        </Card>
      ) : null}

      <div className="mads-page__header">
        <h1 className="mads-page__title">{host.t('home.title')}</h1>
        <div className="mads-row">
          {!host.online ? <Badge tone="warning">{host.t('shell.offline')}</Badge> : null}
          <Badge tone="info">{host.t(`shell.storagePersisted.${host.storagePersisted}`)}</Badge>
        </div>
      </div>

      <SearchField
        ref={searchRef}
        label={host.t('home.searchPlaceholder')}
        value={query}
        placeholder={host.t('home.searchPlaceholder')}
        onChange={(next) => setQuery(next)}
        onSubmit={() => {
          if (query.trim().length > 0) persistLibrary(pushRecentSearch(library, query));
        }}
      />

      {query.trim().length === 0 ? (
        <>
          {continueApp ? (
            <Card>
              <div className="mads-row" style={{ justifyContent: 'space-between' }}>
                <div>
                  <strong>{host.t('home.continueApp')}</strong>
                  <p>{continueApp.displayName ?? continueApp.name}</p>
                </div>
                <Button onClick={() => void openApp(continueApp)}>{host.t('common.continue')}</Button>
              </div>
            </Card>
          ) : null}

          {drafts.length > 0 ? (
            <section aria-label={host.t('home.recentDrafts')}>
              <h2>{host.t('home.recentDrafts')}</h2>
              <ul className="mads-grid" role="list">
                {drafts.map((draft) => (
                  <li key={draft.id}>
                    <Button variant="secondary" onClick={() => router.push(`/studio/${draft.id}`)}>
                      {draft.name}
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {library.recentSearches.length > 0 ? (
            <section aria-label={host.t('home.recentSearches')}>
              <h2>{host.t('home.recentSearches')}</h2>
              <div className="mads-cluster">
                {library.recentSearches.map((term) => (
                  <Button key={term} size="sm" variant="ghost" onClick={() => setQuery(term)}>
                    {term}
                  </Button>
                ))}
              </div>
            </section>
          ) : null}
        </>
      ) : (
        <section aria-label={host.t('a11y.search')}>
          {grouped.length === 0 ? (
            <EmptyState
              title={host.t('home.noResults')}
              description={host.t('home.noResultsHint')}
              action={
                <Button onClick={() => startCreate('blank')}>{host.t('home.actionBlank')}</Button>
              }
            />
          ) : (
            grouped.map((group) => (
              <div key={group.kind}>
                <h2>{groupLabel(group.kind, host.t)}</h2>
                <ul role="list">
                  {group.hits.map((hit) => (
                    <li key={`${hit.kind}-${hit.refId}`}>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          if (hit.kind === 'project') router.push(`/studio/${hit.refId}`);
                          else if (hit.kind === 'app' || hit.kind === 'record') {
                            router.push(`/app/${encodeURIComponent(hit.refId)}`);
                          } else router.push('/create?mode=blank');
                        }}
                      >
                        {hit.title}
                        <small>{hit.snippet}</small>
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </section>
      )}

      <div className="mads-page__header">
        <h2>{host.t('packages.tabInstalled')}</h2>
        <div className="mads-row">
          <Button size="sm" variant={library.view === 'grid' ? 'primary' : 'secondary'} onClick={() => persistLibrary({ ...library, view: 'grid' })}>
            {host.t('home.viewGrid')}
          </Button>
          <Button size="sm" variant={library.view === 'list' ? 'primary' : 'secondary'} onClick={() => persistLibrary({ ...library, view: 'list' })}>
            {host.t('home.viewList')}
          </Button>
          <label>
            <span className="mads-visually-hidden">{host.t('home.filterAll')}</span>
            <select
              className="mads-field__control"
              value={library.sort}
              onChange={(event) => persistLibrary({ ...library, sort: event.target.value as LibraryState['sort'] })}
            >
              <option value="recent">{host.t('home.sortRecent')}</option>
              <option value="name">{host.t('home.sortName')}</option>
              <option value="type">{host.t('home.sortType')}</option>
              <option value="favorite">{host.t('home.sortFavorite')}</option>
            </select>
          </label>
        </div>
      </div>

      {apps.length === 0 ? (
        <EmptyState
          title={host.t('home.emptyTitle')}
          description={host.t('home.emptyBody')}
          action={
            <div className="mads-cluster">
              <Button onClick={() => startCreate('template')} disabled={host.ephemeral || !host.ready}>
                {host.t('home.actionTemplates')}
              </Button>
              <Button variant="secondary" onClick={() => startCreate('ai')} disabled={host.ephemeral || !host.ready}>
                {host.t('home.actionMagic')}
              </Button>
              <Button variant="secondary" onClick={() => startCreate('blank')} disabled={host.ephemeral || !host.ready}>
                {host.t('home.actionBlank')}
              </Button>
            </div>
          }
        />
      ) : (
        <ul className={library.view === 'grid' ? 'mads-grid' : 'mads-stack'} role="list">
          {apps.map((app) => (
            <li key={app.id}>
              <Card>
                <div className="mads-row" style={{ justifyContent: 'space-between' }}>
                  <button
                    type="button"
                    className="mads-button mads-button--ghost"
                    aria-label={`${app.displayName ?? app.name} ${app.version} ${app.state}`}
                    onClick={() => void openApp(app)}
                    onContextMenu={(event) => {
                      event.preventDefault();
                      setMenu(clampMenuPosition({ appId: app.id, x: event.clientX, y: event.clientY }));
                    }}
                    onKeyDown={(event) => {
                      if (event.shiftKey && event.key === 'F10') {
                        event.preventDefault();
                        const rect = event.currentTarget.getBoundingClientRect();
                        setMenu(clampMenuPosition({ appId: app.id, x: rect.left, y: rect.bottom }));
                      }
                    }}
                  >
                    <strong>{app.displayName ?? app.name}</strong>
                    <span>v{app.version}</span>
                    {app.pinned ? <Badge tone="success">{host.t('home.pin')}</Badge> : null}
                  </button>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={host.t('home.contextMenuLabel')}
                    aria-haspopup="menu"
                    onClick={(event) => {
                      const rect = event.currentTarget.getBoundingClientRect();
                      setMenu(clampMenuPosition({ appId: app.id, x: rect.left, y: rect.bottom }));
                    }}
                  >
                    ⋯
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <div className="mads-row">
        <Button variant="secondary" onClick={() => router.push('/packages?import=1')}>
          {host.t('home.importApp')}
        </Button>
        {dragging ? <Badge tone="info">{host.t('home.dropToImport')}</Badge> : null}
      </div>

      {menu ? (
        <div
          ref={menuRef}
          role="menu"
          aria-label={host.t('home.contextMenuLabel')}
          style={{ position: 'fixed', insetInlineStart: menu.x, insetBlockStart: menu.y, zIndex: 3000 }}
          className="mads-card"
        >
          {(() => {
            const app = apps.find((candidate) => candidate.id === menu.appId);
            if (!app) return null;
            return appMenuItems(app, host.t).map((item) => (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                className="mads-button mads-button--ghost"
                onClick={() => void onMenuAction(item.id, app)}
              >
                {item.label}
              </button>
            ));
          })()}
        </div>
      ) : null}

      <Modal
        open={renameTarget !== null}
        title={host.t('home.renameTitle')}
        onClose={() => setRenameTarget(null)}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRenameTarget(null)}>
              {host.t('common.cancel')}
            </Button>
            <Button
              onClick={() => {
                const target = renameTarget;
                setRenameTarget(null);
                if (target) void host.renameApp(target.id, renameValue);
              }}
            >
              {host.t('common.rename')}
            </Button>
          </>
        }
      >
        <label className="mads-field">
          <span className="mads-field__label">{host.t('home.renameLabel')}</span>
          <input
            className="mads-field__control"
            value={renameValue}
            onChange={(event) => setRenameValue(event.target.value)}
          />
        </label>
      </Modal>

      <ConfirmDialog
        open={confirmUninstall !== null}
        tone="danger"
        title={host.t('home.uninstallTitle')}
        description={`${host.t('home.uninstallBody')} ${host.t('home.uninstallExportFirst')}`}
        confirmLabel={host.t('common.uninstall')}
        cancelLabel={host.t('common.cancel')}
        onClose={() => setConfirmUninstall(null)}
        onConfirm={() => {
          const target = confirmUninstall;
          setConfirmUninstall(null);
          if (target) void host.uninstallApp(target.id);
        }}
      />

      <WelcomeOverlay
        onTemplate={() => startCreate('template')}
        onMagic={() => startCreate('ai')}
        onBlank={() => startCreate('blank')}
        disabled={host.ephemeral || !host.ready}
      />
    </div>
  );
}

function groupLabel(kind: SearchKind, t: (key: string) => string): string {
  switch (kind) {
    case 'app':
      return t('packages.tabInstalled');
    case 'project':
      return t('home.recentDrafts');
    case 'record':
      return t('a11y.search');
    default:
      return t('nav.create');
  }
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
