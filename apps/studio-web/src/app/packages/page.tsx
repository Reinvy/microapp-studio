'use client';

/**
 * Packages (SCR-09): installed packages and static index sources.
 *
 * Tabs live in the URL (`?tab=installed|sources`), the installed table reads the
 * host app list, and the detail sheet owns signature/digest display, version
 * history with rollback, uninstall (export offered first), and the original
 * `.mapp` export. `?import=1` overlays the shared `ImportDialog` without leaving
 * the list, and a page-wide drop zone hands a dropped file to the import flow.
 *
 * Nothing here installs or fetches automatically: updates are read from the
 * cached index only and every network call is a user action.
 */

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
} from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Alert,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  DataTable,
  EmptyState,
  PermissionBadge,
  Sheet,
  Stack,
  TabBar,
} from '@microapp/ui-kit';
import { listVersions, type AppVersion, type InstalledApp } from '@/db/repositories/apps';
import { useHost } from '@/features/host/HostProvider';
import { permissionDefinition } from '@/features/permissions/catalog';
import { formatBytes, formatDate } from '@/i18n';
import { bytesToHex } from '@/lib/bytes';
import { isRecord } from '@/lib/guards';
import { bundleFiles } from '@/features/packages/packageService';
import {
  cachedUpdates,
  listSources,
  type AvailableUpdate,
} from '@/features/packages/indexSource';
import { packageErrorCode } from '@/features/packages/importFlow';
import { downloadPackage, truncateMiddle } from '@/features/packages/download';
import { setPendingImport, takePendingImport } from '@/features/packages/pendingImport';
import { ImportDialog } from '@/features/packages/ImportDialog';
import { SourcesPanel } from '@/features/packages/SourcesPanel';

type TabId = 'installed' | 'sources';

const TAB_PARAM = 'tab';
const IMPORT_PARAM = 'import';

const PRE_STYLE: CSSProperties = {
  margin: 0,
  padding: 'var(--mads-space-3)',
  background: 'var(--mads-color-surface-raised)',
  border: '1px solid var(--mads-color-border-subtle)',
  borderRadius: 'var(--mads-radius-clay-sm)',
  fontSize: 'var(--mads-text-12)',
  lineHeight: 'var(--mads-leading-20)',
  overflow: 'auto',
  maxBlockSize: '22rem',
  whiteSpace: 'pre-wrap',
  overflowWrap: 'anywhere',
};

const DROP_OVERLAY: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 50,
  display: 'grid',
  placeItems: 'center',
  padding: 'var(--mads-space-6)',
  border: '2px dashed var(--mads-color-focus)',
  background: 'color-mix(in srgb, var(--mads-color-bg) 82%, transparent)',
  pointerEvents: 'none',
};

interface ManifestFields {
  keyId: string;
  signatureValue: string;
  contentHash: string;
  permissions: string[];
}

/** Read only the manifest fields the detail sheet renders; never trusts shape. */
function readManifestFields(manifestJson: string): ManifestFields | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(manifestJson);
  } catch {
    return null;
  }
  if (!isRecord(parsed)) return null;
  const signature = parsed.signature;
  const integrity = parsed.integrity;
  const permissions = parsed.permissions;
  return {
    keyId: isRecord(signature) && typeof signature.keyId === 'string' ? signature.keyId : '',
    signatureValue:
      isRecord(signature) && typeof signature.value === 'string' ? signature.value : '',
    contentHash:
      isRecord(integrity) && typeof integrity.contentHash === 'string' ? integrity.contentHash : '',
    permissions: Array.isArray(permissions)
      ? permissions.filter((permission): permission is string => typeof permission === 'string')
      : [],
  };
}

function readTab(value: string | null): TabId {
  return value === 'sources' ? 'sources' : 'installed';
}

function statusMeta(state: string): { tone: 'success' | 'info' | 'warning' | 'danger' | 'neutral'; key: string } {
  switch (state) {
    case 'running':
      return { tone: 'info', key: 'packages.statusRunning' };
    case 'hibernated':
      return { tone: 'neutral', key: 'packages.statusHibernated' };
    case 'disabled':
      return { tone: 'warning', key: 'packages.statusDisabled' };
    case 'quarantined':
      return { tone: 'danger', key: 'packages.statusQuarantined' };
    default:
      return { tone: 'success', key: 'packages.statusInstalled' };
  }
}

export default function PackagesPage(): ReactElement {
  return (
    <Suspense fallback={<PackagesFallback />}>
      <PackagesScreen />
    </Suspense>
  );
}

function PackagesFallback(): ReactElement {
  const host = useHost();
  return (
    <p className="mads-visually-hidden" role="status">
      {host.t('a11y.loading')}
    </p>
  );
}

function PackagesScreen(): ReactElement {
  const host = useHost();
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = host.t;

  const tabParam = searchParams?.get(TAB_PARAM) ?? null;
  const importOpen = searchParams?.get(IMPORT_PARAM) === '1';
  const [pageError, setPageError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [sizes, setSizes] = useState<Record<string, number>>({});
  const [updates, setUpdates] = useState<AvailableUpdate[]>([]);

  const [selected, setSelected] = useState<InstalledApp | null>(null);
  const [versions, setVersions] = useState<AppVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [busyVersion, setBusyVersion] = useState<string | null>(null);
  const [confirmUninstall, setConfirmUninstall] = useState(false);
  const [uninstalling, setUninstalling] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const [dragging, setDragging] = useState(false);
  const [droppedFile, setDroppedFile] = useState<File | null>(null);
  const dragDepth = useRef(0);

  const db = host.db;
  const workspace = host.workspace;
  const apps = host.apps;

  // The URL is the source of truth for the tab, including back/forward, so the
  // value is derived instead of mirrored into state.
  const tab: TabId = readTab(tabParam);

  const selectTab = useCallback(
    (id: string) => {
      const next: TabId = id === 'sources' ? 'sources' : 'installed';
      router.replace(`/packages?${TAB_PARAM}=${next}`, { scroll: false });
    },
    [router],
  );

  const openImport = useCallback(() => {
    setPageError(null);
    router.push('/packages/import');
  }, [router, setPageError]);

  const closeImport = useCallback(() => {
    setDroppedFile(null);
    router.replace(`/packages?${TAB_PARAM}=${tab}`, { scroll: false });
  }, [router, tab, setDroppedFile]);

  // Bundle sizes are read from OPFS once per app list change.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!workspace || apps.length === 0) {
        if (!cancelled) setSizes({});
        return;
      }
      const measured = await Promise.all(
        apps.map(async (app) => {
          try {
            const files = await bundleFiles(workspace, app);
            return [app.id, files.reduce((sum, file) => sum + file.bytes, 0)] as const;
          } catch {
            return [app.id, null] as const;
          }
        }),
      );
      if (cancelled) return;
      const next: Record<string, number> = {};
      for (const [id, bytes] of measured) {
        if (bytes !== null) next[id] = bytes;
      }
      setSizes(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [apps, workspace]);

  const loadUpdates = useCallback(async () => {
    if (!db || !workspace) return;
    const sources = await listSources(db, workspace.id);
    setUpdates(cachedUpdates(sources, apps));
  }, [apps, db, workspace, setUpdates]);

  useEffect(() => {
    if (!db || !workspace) return;
    let cancelled = false;
    void Promise.resolve()
      .then(() => loadUpdates())
      .catch(() => {
        if (!cancelled) setUpdates([]);
      });
    return () => {
      cancelled = true;
    };
  }, [db, workspace, loadUpdates]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(timer);
  }, [notice]);

  const openDetail = useCallback(
    async (app: InstalledApp) => {
      setSelected(app);
      setDetailError(null);
      setNotice(null);
      setConfirmUninstall(false);
      setVersions([]);
      if (!db || !workspace) return;
      setVersionsLoading(true);
      try {
        const history = await listVersions(db, workspace.id, app.id);
        setVersions(history);
      } catch (error) {
        setDetailError(packageErrorCode(error, 'E-DATA-001'));
      } finally {
        setVersionsLoading(false);
      }
    },
    [db, workspace, setConfirmUninstall, setDetailError, setNotice, setSelected, setVersions, setVersionsLoading],
  );

  const closeDetail = useCallback(() => {
    setSelected(null);
    setConfirmUninstall(false);
    setDetailError(null);
    setCopiedField(null);
  }, [setSelected, setConfirmUninstall, setDetailError, setCopiedField]);

  const reloadVersions = useCallback(
    async (installId: string) => {
      if (!db || !workspace) return;
      setVersions(await listVersions(db, workspace.id, installId));
    },
    [db, workspace, setVersions],
  );

  const rollback = useCallback(
    async (version: string) => {
      if (!selected) return;
      setBusyVersion(version);
      setDetailError(null);
      try {
        const updated = await host.rollbackApp(selected.id, version);
        setSelected(updated);
        await reloadVersions(selected.id);
        setNotice(
          t('packages.rollbackDone', {
            app: updated.displayName ?? updated.name,
            version: updated.version,
          }),
        );
      } catch (error) {
        setDetailError(packageErrorCode(error));
      } finally {
        setBusyVersion(null);
      }
    },
    [host, reloadVersions, selected, t, setBusyVersion, setDetailError, setNotice, setSelected],
  );

  const exportSelected = useCallback(async () => {
    if (!selected) return;
    try {
      const bytes = await host.exportPackageBytes(selected.id);
      if (!bytes) {
        setDetailError('E-PACK-002');
        return;
      }
      downloadPackage(bytes, selected.appId);
    } catch (error) {
      setDetailError(packageErrorCode(error));
    }
  }, [host, selected, setDetailError]);

  const uninstallSelected = useCallback(async () => {
    if (!selected) return;
    setUninstalling(true);
    setDetailError(null);
    try {
      const name = selected.displayName ?? selected.name;
      await host.uninstallApp(selected.id);
      setConfirmUninstall(false);
      setSelected(null);
      setNotice(t('packages.uninstalled', { app: name }));
    } catch (error) {
      setDetailError(packageErrorCode(error));
    } finally {
      setUninstalling(false);
    }
  }, [host, selected, t, setConfirmUninstall, setDetailError, setNotice, setSelected, setUninstalling]);

  const copy = useCallback(async (field: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // Clipboard permission is optional; the value stays selectable in the DOM.
    }
  }, [setCopiedField]);

  // --- page-wide drop zone ------------------------------------------------
  const routeDroppedFile = useCallback(
    (file: File) => {
      if (!file.name.toLowerCase().endsWith('.mapp')) {
        setPageError('E-PACK-001');
        return;
      }
      setPageError(null);
      if (importOpen) {
        // The overlay is already open: hand the file straight to it.
        setDroppedFile(file);
        return;
      }
      setPendingImport(file);
      router.push('/packages/import');
    },
    // The compiler needs the stable setters listed; exhaustive-deps disagrees about
    // one of them, so the compiler's requirement wins here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [importOpen, router, setDroppedFile, setPageError, setPendingImport],
  );

  // The drop zone is the whole window, not just this screen's box: a file
  // dropped over the shell chrome still lands in the import flow.
  useEffect(() => {
    const hasFiles = (event: globalThis.DragEvent): boolean =>
      Array.from(event.dataTransfer?.types ?? []).includes('Files');
    const onEnter = (event: globalThis.DragEvent): void => {
      if (!hasFiles(event)) return;
      dragDepth.current += 1;
      setDragging(true);
    };
    const onLeave = (): void => {
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0) setDragging(false);
    };
    const onOver = (event: globalThis.DragEvent): void => {
      if (hasFiles(event)) event.preventDefault();
    };
    const onDropWindow = (event: globalThis.DragEvent): void => {
      dragDepth.current = 0;
      setDragging(false);
      if (event.defaultPrevented) return;
      const file = event.dataTransfer?.files[0];
      if (!file) return;
      event.preventDefault();
      routeDroppedFile(file);
    };
    window.addEventListener('dragenter', onEnter);
    window.addEventListener('dragleave', onLeave);
    window.addEventListener('dragover', onOver);
    window.addEventListener('drop', onDropWindow);
    return () => {
      window.removeEventListener('dragenter', onEnter);
      window.removeEventListener('dragleave', onLeave);
      window.removeEventListener('dragover', onOver);
      window.removeEventListener('drop', onDropWindow);
    };
  }, [routeDroppedFile]);

  // A file may also have been handed over by the import route's twin surface.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await Promise.resolve();
      if (cancelled) return;
      if (!importOpen) {
        setDroppedFile(null);
        return;
      }
      const pending = takePendingImport();
      if (pending) setDroppedFile(pending);
    })();
    return () => {
      cancelled = true;
    };
  }, [importOpen]);

  const manifest = useMemo(
    () => (selected ? readManifestFields(selected.manifestJson) : null),
    [selected],
  );
  const manifestText = useMemo(() => {
    if (!selected) return '';
    try {
      return JSON.stringify(JSON.parse(selected.manifestJson), null, 2);
    } catch {
      return selected.manifestJson;
    }
  }, [selected]);

  const selectedStatus = selected ? statusMeta(selected.state) : null;
  const storedDigestHex = selected ? bytesToHex(selected.contentHash) : '';

  if (host.phase === 'booting') {
    return (
      <div aria-busy="true">
        <p className="mads-visually-hidden" role="status">
          {t('a11y.loading')}
        </p>
        <div className="mads-grid">
          <div className="mads-skeleton" style={{ blockSize: '10rem' }} />
        </div>
      </div>
    );
  }

  const installedTable = (
    <DataTable
      caption={t('packages.tabInstalled')}
      columns={[
        { key: 'name', label: t('packages.sourceName') },
        { key: 'version', label: t('packages.version') },
        { key: 'status', label: t('packages.status') },
        { key: 'size', label: t('packages.size') },
        { key: 'detail', label: t('packages.detailTitle') },
      ]}
      rows={apps.map((app) => {
        const status = statusMeta(app.state);
        return {
          name: (
            <span>
              <strong>{app.displayName ?? app.name}</strong>
              <br />
              <code>{app.appId}</code>
            </span>
          ),
          version: app.version,
          status: <Badge tone={status.tone}>{t(status.key)}</Badge>,
          size: sizes[app.id] === undefined ? '—' : formatBytes(sizes[app.id], host.locale),
          detail: (
            <Button size="sm" variant="secondary" onClick={() => void openDetail(app)}>
              {t('packages.detailTitle')}
            </Button>
          ),
        };
      })}
    />
  );

  return (
    <div>
      {dragging ? (
        <div style={DROP_OVERLAY} role="region" aria-label={t('packages.dropTitle')}>
          <div>
            <strong>{t('packages.dropTitle')}</strong>
            <p>{t('packages.dropBody')}</p>
          </div>
        </div>
      ) : null}

      <div className="mads-page__header">
        <h1 className="mads-page__title">{t('packages.title')}</h1>
        <Button onClick={openImport}>{t('packages.import')}</Button>
      </div>

      {pageError ? <Alert tone="danger">{t(`errors.${pageError}`)}</Alert> : null}
      {notice ? <Alert tone="success">{notice}</Alert> : null}

      <TabBar
        idPrefix="packages"
        label={t('packages.title')}
        activeId={tab}
        onChange={selectTab}
        tabs={[
          { id: 'installed', label: t('packages.tabInstalled') },
          { id: 'sources', label: t('packages.tabSources') },
        ]}
      />

      <div role="tabpanel" id={`packages-panel-${tab}`} aria-labelledby={`packages-tab-${tab}`}>
        {tab === 'installed' ? (
          <Stack gap="md">
            {updates.length > 0 ? (
              <Stack gap="sm">
                {updates.map((update) => {
                  const app = apps.find((candidate) => candidate.id === update.installId) ?? null;
                  const appName = app ? (app.displayName ?? app.name) : update.appId;
                  return (
                    <Card
                      key={`${update.installId}-${update.nextVersion}`}
                      title={t('home.updateCardTitle', { app: appName })}
                      footer={
                        app ? (
                          <Button size="sm" onClick={() => void openDetail(app)}>
                            {t('home.updateCardReview')}
                          </Button>
                        ) : null
                      }
                    >
                      <p>
                        {t('home.updateCardBody', {
                          current: update.currentVersion,
                          next: update.nextVersion,
                        })}
                      </p>
                      <p>
                        <strong>{update.sourceName}</strong> · {update.entry.id}
                      </p>
                    </Card>
                  );
                })}
              </Stack>
            ) : null}

            {apps.length === 0 ? (
              <EmptyState
                title={t('packages.installedEmpty')}
                description={t('packages.dropHint')}
                action={<Button onClick={openImport}>{t('packages.import')}</Button>}
              />
            ) : (
              installedTable
            )}
          </Stack>
        ) : (
          <SourcesPanel onSourcesChanged={() => void loadUpdates()} />
        )}
      </div>

      <Sheet open={selected !== null} title={t('packages.detailTitle')} onClose={closeDetail}>
        {selected ? (
          <Stack gap="md">
            <div className="mads-row">
              <strong>{selected.displayName ?? selected.name}</strong>
              <Badge tone="info">{selected.version}</Badge>
              {selectedStatus ? (
                <Badge tone={selectedStatus.tone}>{t(selectedStatus.key)}</Badge>
              ) : null}
            </div>

            {notice ? <Alert tone="success">{notice}</Alert> : null}
            {detailError ? <Alert tone="danger">{t(`errors.${detailError}`)}</Alert> : null}

            <Stack gap="xs">
              <h3>{t('packages.manifest')}</h3>
              <pre style={PRE_STYLE} data-manifest>
                {manifestText}
              </pre>
            </Stack>

            <Stack gap="xs">
              <h3>{t('packages.signature')}</h3>
              <div className="mads-row">
                <span>{t('packages.keyId')}</span>
                <code title={manifest?.keyId ?? ''}>
                  {truncateMiddle(manifest?.keyId || '—', 26, 10)}
                </code>
                {manifest?.keyId ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void copy('keyId', manifest.keyId)}
                  >
                    {copiedField === 'keyId' ? t('packages.copied') : t('common.copy')}
                  </Button>
                ) : null}
              </div>
              <div className="mads-row">
                <span>{t('packages.signature')}</span>
                <code title={manifest?.signatureValue ?? ''}>
                  {truncateMiddle(manifest?.signatureValue || '—', 24, 12)}
                </code>
                {manifest?.signatureValue ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void copy('signature', manifest.signatureValue)}
                  >
                    {copiedField === 'signature' ? t('packages.copied') : t('common.copy')}
                  </Button>
                ) : null}
              </div>
            </Stack>

            <Stack gap="xs">
              <h3>{t('packages.digest')}</h3>
              <div className="mads-row">
                <code title={manifest?.contentHash ?? storedDigestHex}>
                  {manifest?.contentHash || truncateMiddle(storedDigestHex, 26, 10)}
                </code>
                {manifest?.contentHash ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void copy('digest', manifest.contentHash)}
                  >
                    {copiedField === 'digest' ? t('packages.copied') : t('common.copy')}
                  </Button>
                ) : null}
              </div>
            </Stack>

            {manifest && manifest.permissions.length > 0 ? (
              <Stack gap="xs">
                <h3>{t('packages.permissionsTitle')}</h3>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 'var(--mads-space-2)' }}>
                  {manifest.permissions.map((permission) => {
                    const definition = permissionDefinition(permission, host.locale);
                    return (
                      <li key={permission}>
                        <PermissionBadge
                          permission={permission}
                          granted="declared"
                          label={definition.label}
                          reason={definition.reason}
                        />
                      </li>
                    );
                  })}
                </ul>
              </Stack>
            ) : null}

            <Stack gap="xs">
              <h3>{t('packages.versions')}</h3>
              {versionsLoading ? (
                <p>{t('common.loading')}</p>
              ) : versions.length === 0 ? (
                <p>—</p>
              ) : (
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 'var(--mads-space-2)' }}>
                  {versions.map((version) => (
                    <li
                      key={version.id}
                      className="mads-row"
                      style={{ justifyContent: 'space-between' }}
                    >
                      <span className="mads-row">
                        <strong>{version.version}</strong>
                        {version.version === selected.version ? (
                          <Badge tone="success">{t('packages.current')}</Badge>
                        ) : null}
                        <span>{formatDate(version.installedAtMs, host.locale)}</span>
                      </span>
                      {version.version !== selected.version ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          loading={busyVersion === version.version}
                          onClick={() => void rollback(version.version)}
                        >
                          {t('packages.rollback')}
                        </Button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </Stack>

            <div className="mads-row mads-row--end">
              <Button variant="secondary" onClick={() => void exportSelected()}>
                {t('packages.exportMapp')}
              </Button>
              <Button variant="danger" onClick={() => setConfirmUninstall(true)}>
                {t('packages.uninstall')}
              </Button>
            </div>
          </Stack>
        ) : null}
      </Sheet>

      <ConfirmDialog
        open={confirmUninstall}
        tone="danger"
        title={t('packages.uninstall')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        loading={uninstalling}
        description={
          <Stack gap="sm">
            <p>{t('packages.uninstallConfirm')}</p>
            <Button variant="secondary" onClick={() => void exportSelected()}>
              {t('packages.exportFirst')}
            </Button>
          </Stack>
        }
        onClose={() => setConfirmUninstall(false)}
        onConfirm={() => void uninstallSelected()}
      />

      <ImportDialog
        asSheet
        open={importOpen}
        initialFile={droppedFile}
        onClose={closeImport}
        onInstalled={() => void loadUpdates()}
      />
    </div>
  );
}
