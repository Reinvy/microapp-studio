'use client';

/**
 * SCR-11 data settings: storage, cache, encrypted backup/restore, reset,
 * Phase 0 migration, and per-app data export/import.
 *
 * No network request is made by backup or restore (FR-BACKUP-008). The
 * passphrase and recovery phrase never leave this component except as sealed
 * plaintext passed to the Rust core.
 */

import { useCallback, useMemo, useState, type ReactElement } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  FilePicker,
  RadioGroup,
  StorageMeter,
  TextField,
} from '@microapp/ui-kit';
import { useHost } from '@/features/host/HostProvider';
import { SettingsShell } from '@/features/settings/SettingsShell';
import {
  MIN_PASSPHRASE_LENGTH,
  collectHostDb,
  createBackup,
  previewBackup,
  restoreBackup,
  type BackupPreview,
  type RestoreResult,
} from '@/features/backup/backupService';
import { loadIdentitySecret } from '@/features/identity/secureStore';
import { deleteOpfsTree } from '@/features/storage/opfs';
import { dexieReader } from '@/features/migration/dexieReader';
import { migratePhase0, type MigrationSummary } from '@/features/migration/phase0Migration';
import { formatNumber } from '@/i18n';

async function clearCacheApi(): Promise<number> {
  if (typeof caches === 'undefined') return 0;
  const names = await caches.keys();
  await Promise.all(names.map((name) => caches.delete(name)));
  return names.length;
}

function download(blobPart: BlobPart, filename: string, type = 'application/octet-stream'): void {
  const url = URL.createObjectURL(new Blob([blobPart], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function DataSettingsPage(): ReactElement {
  const host = useHost();
  const [busy, setBusy] = useState(false);
  const [errorCodeValue, setErrorCodeValue] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [passphrase, setPassphrase] = useState('');
  const [passphraseConfirm, setPassphraseConfirm] = useState('');
  const [restoreBytes, setRestoreBytes] = useState<Uint8Array | null>(null);
  const [restorePassphrase, setRestorePassphrase] = useState('');
  const [preview, setPreview] = useState<BackupPreview | null>(null);
  const [mode, setMode] = useState<'merge' | 'replace'>('merge');
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [restoreResult, setRestoreResult] = useState<RestoreResult | null>(null);

  const [resetWord, setResetWord] = useState('');
  const [resetOpen, setResetOpen] = useState(false);
  const [migration, setMigration] = useState<MigrationSummary | null>(null);

  const resetWordValue = host.t('settings.data.resetWordValue');
  const passphraseValid =
    [...passphrase].length >= MIN_PASSPHRASE_LENGTH && passphrase === passphraseConfirm;
  const restorePassphraseValid = [...restorePassphrase].length >= MIN_PASSPHRASE_LENGTH;

  const fail = useCallback((error: unknown): void => {
    const message = error instanceof Error ? error.message : String(error);
    setErrorCodeValue(/E-[A-Z]+-\d{3}/.exec(message)?.[0] ?? null);
  }, []);

  const resetMessages = useCallback((): void => {
    setErrorCodeValue(null);
    setNotice(null);
  }, []);

  const runCreateBackup = async (): Promise<void> => {
    if (!host.db || !host.workspace || !passphraseValid) return;
    resetMessages();
    setBusy(true);
    try {
      const identitySecret = await loadIdentitySecret();
      const bytes = await createBackup({
        db: host.db,
        workspace: {
          id: host.workspace.id,
          name: host.workspace.name,
          slug: host.workspace.slug,
          locale: host.workspace.locale,
        },
        apps: host.apps,
        passphrase,
        identitySecret,
      });
      download(
        bytes as unknown as BlobPart,
        `${new Date().toISOString().slice(0, 10)}.mapp-backup`,
      );
      await host.audit('backup.export', undefined, { bytes: bytes.byteLength });
      host.setPrefs({ lastBackupAt: Date.now(), backupNudgeDismissedAt: null });
      setNotice(host.t('backup.done'));
      setPassphrase('');
      setPassphraseConfirm('');
    } catch (createError) {
      fail(createError);
    } finally {
      setBusy(false);
    }
  };

  const runPreview = async (): Promise<void> => {
    if (!restoreBytes || !restorePassphraseValid) return;
    resetMessages();
    setBusy(true);
    try {
      setPreview(await previewBackup(restoreBytes, restorePassphrase));
      setRestoreResult(null);
    } catch (previewError) {
      setPreview(null);
      fail(previewError);
    } finally {
      setBusy(false);
    }
  };

  const applyRestore = async (): Promise<void> => {
    if (!host.db || !host.workspace || !restoreBytes || !restorePassphraseValid) return;
    resetMessages();
    setBusy(true);
    try {
      const result = await restoreBackup({
        db: host.db,
        bytes: restoreBytes,
        passphrase: restorePassphrase,
        mode,
        workspace: {
          id: host.workspace.id,
          name: host.workspace.name,
          slug: host.workspace.slug,
          locale: host.workspace.locale,
        },
        appDbs: (installId) => host.openAppDb(installId),
      });
      await host.audit('backup.restore', undefined, {
        mode,
        rows: result.restored.reduce((sum, section) => sum + section.rows, 0),
      });
      setRestoreResult(result);
      setPreview(null);
      setRestorePassphrase('');
      await host.refresh();
    } catch (restoreError) {
      fail(restoreError);
    } finally {
      setBusy(false);
      setReplaceOpen(false);
    }
  };

  const clearCache = async (): Promise<void> => {
    resetMessages();
    setBusy(true);
    try {
      const count = await clearCacheApi();
      await host.audit('cache.clear', undefined, { caches: count });
      setNotice(host.t('settings.data.cacheCleared'));
    } catch (cacheError) {
      fail(cacheError);
    } finally {
      setBusy(false);
    }
  };

  const exportAll = async (): Promise<void> => {
    if (!host.db) return;
    resetMessages();
    setBusy(true);
    try {
      const hostRows = await collectHostDb(host.db);
      const apps = [] as Array<{ appId: string; rows: unknown }>;
      for (const app of host.apps) {
        const database = await host.openAppDb(app.id);
        apps.push({ appId: app.appId, rows: await database.allRows() });
      }
      download(
        JSON.stringify({ schemaVersion: 1, exportedAt: new Date().toISOString(), host: hostRows, apps }, null, 2),
        `microapp-data-${new Date().toISOString().slice(0, 10)}.json`,
        'application/json',
      );
      await host.audit('data.export', undefined, { apps: apps.length });
      setNotice(host.t('settings.data.exportAllDone'));
    } catch (exportError) {
      fail(exportError);
    } finally {
      setBusy(false);
    }
  };

  const runReset = async (): Promise<void> => {
    resetMessages();
    setBusy(true);
    setResetOpen(false);
    try {
      await host.audit('data.reset');
      await host.db?.close().catch(() => undefined);
      await deleteOpfsTree('apps');
      await deleteOpfsTree('workspaces');
      await deleteOpfsTree('microapp-studio');
      await clearCacheApi();
      const { promise, resolve } = Promise.withResolvers<void>();
      const request = indexedDB.deleteDatabase('microapp-identity');
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
      request.onblocked = () => resolve();
      await promise;
      localStorage.clear();
      // Full reload at Home: every in-memory provider still points at the
      // deleted database, so a client-side router push would be stale.
      window.history.replaceState(null, '', '/');
      window.location.reload();
    } catch (resetError) {
      fail(resetError);
      setBusy(false);
    }
  };

  const runMigration = async (): Promise<void> => {
    if (!host.db || !host.workspace) return;
    resetMessages();
    setBusy(true);
    try {
      const summary = await migratePhase0(host.db, dexieReader, host.workspace.id);
      setMigration(summary);
      await host.audit('migration.phase0', undefined, {
        apps: summary.apps,
        drafts: summary.drafts,
        skipped: summary.skipped,
      });
    } catch (migrationError) {
      fail(migrationError);
    } finally {
      setBusy(false);
    }
  };

  const importAppData = async (installId: string, file: File): Promise<void> => {
    resetMessages();
    setBusy(true);
    try {
      let parsed: unknown;
      try {
        parsed = JSON.parse(await file.text()) as unknown;
      } catch {
        throw new Error('E-DATA-002 invalid app data file');
      }
      const written = await host.importAppData(installId, parsed);
      setNotice(host.t('settings.data.importDone', { rows: formatNumber(written, host.locale) }));
    } catch (importError) {
      fail(importError);
    } finally {
      setBusy(false);
    }
  };

  const exportAppData = async (installId: string, appId: string): Promise<void> => {
    resetMessages();
    setBusy(true);
    try {
      const text = await host.exportAppData(installId, 'json');
      download(text, `${appId}-data.json`, 'application/json');
    } catch (exportError) {
      fail(exportError);
    } finally {
      setBusy(false);
    }
  };

  const sectionLabel = useMemo(
    () => (name: string): string => {
      if (name.startsWith('app:')) return host.t('backup.sections.apps');
      if (name === 'identity') return host.t('backup.sections.identity');
      if (name === 'host') return host.t('backup.sections.host');
      if (name === 'bundles') return host.t('backup.sections.bundles');
      if (name === 'settings') return host.t('backup.sections.settings');
      return name;
    },
    [host],
  );

  return (
    <SettingsShell title={host.t('settings.groups.data.title')} description={host.t('settings.groups.data.description')}>
      {errorCodeValue ? (
        <Alert tone="error" title={host.t(`errors.${errorCodeValue}`)}>
          <p>{host.t('errors.generic')}</p>
        </Alert>
      ) : null}
      {notice ? (
        <Alert tone="success" title={host.t('common.done')}>
          <p>{notice}</p>
        </Alert>
      ) : null}

      <Card title={host.t('settings.data.storage')}>
        <div className="mads-stack">
          {host.storageEstimate ? (
            <StorageMeter
              label={host.t('settings.data.storage')}
              used={host.storageEstimate.usage}
              quota={host.storageEstimate.quota}
              locale={host.locale}
            />
          ) : (
            <p>{host.t('settings.data.storageUnavailable')}</p>
          )}
          <p>
            <Badge tone={host.storagePersisted ? 'success' : 'warning'}>
              {host.storagePersisted
                ? host.t('settings.data.persisted')
                : host.t('settings.data.persist')}
            </Badge>
          </p>
          <div className="mads-row">
            <Button
              variant="secondary"
              onClick={() => void host.requestPersist()}
              disabled={busy || host.storagePersisted}
            >
              {host.t('settings.data.persist')}
            </Button>
            <Button variant="ghost" onClick={() => void host.refreshStorageEstimate()}>
              {host.t('common.refresh')}
            </Button>
          </div>
          <p>{host.t('settings.data.persistHint')}</p>
        </div>
      </Card>

      <Card title={host.t('settings.data.cache')}>
        <div className="mads-stack">
          <p>{host.t('settings.data.cacheHint')}</p>
          <div className="mads-row">
            <Button variant="secondary" onClick={() => void clearCache()} disabled={busy} loading={busy}>
              {host.t('settings.data.clearCache')}
            </Button>
          </div>
        </div>
      </Card>

      <Card title={host.t('settings.data.backup')}>
        <div className="mads-stack">
          <p>{host.t('settings.data.backupHint')}</p>
          <TextField
            label={host.t('settings.data.passphrase')}
            type="password"
            value={passphrase}
            onChange={setPassphrase}
            description={host.t('settings.data.passphraseHint')}
          />
          <TextField
            label={host.t('settings.data.confirmPassphrase')}
            type="password"
            value={passphraseConfirm}
            onChange={setPassphraseConfirm}
            error={
              passphraseConfirm.length > 0 && passphrase !== passphraseConfirm
                ? host.t('settings.data.passphraseMismatch')
                : undefined
            }
          />
          <div className="mads-row">
            <Button
              onClick={() => void runCreateBackup()}
              disabled={busy || !passphraseValid}
              loading={busy}
            >
              {host.t('backup.create')}
            </Button>
          </div>
        </div>
      </Card>

      <Card title={host.t('settings.data.restore')}>
        <div className="mads-stack">
          <p>{host.t('settings.data.restoreHint')}</p>
          <FilePicker
            label={host.t('settings.data.restore')}
            accept=".mapp-backup,application/octet-stream"
            disabled={busy}
            hint={host.t('settings.data.fileHint')}
            onFiles={(files) => {
              const file = files[0];
              if (!file) return;
              void file
                .arrayBuffer()
                .then((buffer) => {
                  setRestoreBytes(new Uint8Array(buffer));
                  setPreview(null);
                  setRestoreResult(null);
                })
                .catch(fail);
            }}
          />
          <TextField
            label={host.t('settings.data.passphrase')}
            type="password"
            value={restorePassphrase}
            onChange={setRestorePassphrase}
            description={host.t('settings.data.passphraseHint')}
          />
          <div className="mads-row">
            <Button
              variant="secondary"
              onClick={() => void runPreview()}
              disabled={busy || !restoreBytes || !restorePassphraseValid}
            >
              {host.t('settings.data.restorePreview')}
            </Button>
          </div>

          {preview ? (
            <div className="mads-stack" role="status">
              <p>
                <strong>{host.t('settings.data.restorePreview')}</strong> · {preview.workspace ?? '—'}
              </p>
              <p>{host.t('backup.previewCounts', { apps: preview.sections.filter((section) => section.name.startsWith('app:')).length, records: preview.sections.reduce((sum, section) => sum + section.rows, 0) })}</p>
              <ul className="mads-stack">
                {preview.sections.map((section) => (
                  <li key={section.name}>
                    {sectionLabel(section.name)}: {formatNumber(section.rows, host.locale)}
                  </li>
                ))}
              </ul>
              <RadioGroup
                label={host.t('settings.data.restore')}
                value={mode}
                onChange={(value) => setMode(value === 'replace' ? 'replace' : 'merge')}
                options={[
                  { value: 'merge', label: host.t('settings.data.modeMerge') },
                  { value: 'replace', label: host.t('settings.data.modeReplace') },
                ]}
              />
              <div className="mads-row">
                <Button
                  onClick={() => {
                    if (mode === 'replace') setReplaceOpen(true);
                    else void applyRestore();
                  }}
                  disabled={busy}
                  loading={busy}
                >
                  {host.t('settings.data.applyRestore')}
                </Button>
              </div>
            </div>
          ) : null}

          {restoreResult ? (
            <Alert
              tone={restoreResult.mnemonicMissing ? 'warning' : 'success'}
              title={host.t('settings.data.restoreDone', {
                rows: formatNumber(
                  restoreResult.restored.reduce((sum, section) => sum + section.rows, 0),
                  host.locale,
                ),
              })}
            >
              <p>
                {restoreResult.mnemonicMissing
                  ? host.t('backup.sections.mnemonicMissing')
                  : host.t('settings.data.restoreIdentity')}
              </p>
            </Alert>
          ) : null}
        </div>
      </Card>

      <Card title={host.t('settings.data.export')}>
        <div className="mads-stack">
          <p>{host.t('settings.data.exportAllHint')}</p>
          <div className="mads-row">
            <Button variant="secondary" onClick={() => void exportAll()} disabled={busy}>
              {host.t('settings.data.exportAll')}
            </Button>
          </div>
          {host.apps.length === 0 ? (
            <p>{host.t('settings.data.noApps')}</p>
          ) : (
            <ul className="mads-stack" role="list">
              {host.apps.map((app) => (
                <li key={app.id} className="mads-cluster">
                  <span>
                    <strong>{app.displayName ?? app.name}</strong> <Badge tone="neutral">{app.appId}</Badge>
                  </span>
                  <div className="mads-row">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => void exportAppData(app.id, app.appId)}
                      disabled={busy}
                    >
                      {host.t('settings.data.exportAppData')}
                    </Button>
                    <FilePicker
                      label={host.t('settings.data.importAppData')}
                      accept="application/json,.json"
                      disabled={busy}
                      onFiles={(files) => {
                        const file = files[0];
                        if (file) void importAppData(app.id, file);
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p>{host.t('settings.data.importHint')}</p>
        </div>
      </Card>

      <Card title={host.t('settings.data.migration')}>
        <div className="mads-stack">
          <p>{host.t('settings.data.migrationBody')}</p>
          <div className="mads-row">
            <Button variant="secondary" onClick={() => void runMigration()} disabled={busy}>
              {host.t('settings.data.migrationRun')}
            </Button>
          </div>
          {migration ? (
            <dl>
              <dt>{host.t('settings.data.migrationApps')}</dt>
              <dd>{formatNumber(migration.apps, host.locale)}</dd>
              <dt>{host.t('settings.data.migrationDrafts')}</dt>
              <dd>{formatNumber(migration.drafts, host.locale)}</dd>
              <dt>{host.t('settings.data.migrationSkipped')}</dt>
              <dd>{formatNumber(migration.skipped, host.locale)}</dd>
              <dt>{host.t('settings.data.checksum')}</dt>
              <dd>
                <code>{migration.checksum.slice(0, 16)}…</code>
              </dd>
            </dl>
          ) : null}
        </div>
      </Card>

      <Card title={host.t('settings.data.resetTitle')}>
        <div className="mads-stack">
          <p>{host.t('settings.data.resetBody')}</p>
          <p>{host.t('settings.data.resetHint')}</p>
          <div className="mads-row">
            <Button variant="secondary" onClick={() => void exportAll()} disabled={busy}>
              {host.t('settings.data.exportAll')}
            </Button>
          </div>
          <TextField
            label={host.t('settings.data.resetHint')}
            value={resetWord}
            onChange={setResetWord}
            description={host.t('settings.data.resetWord', { word: resetWordValue })}
          />
          <div className="mads-row">
            <Button
              variant="danger"
              disabled={busy || resetWord.trim().toUpperCase() !== resetWordValue.toUpperCase()}
              onClick={() => setResetOpen(true)}
            >
              {host.t('common.reset')}
            </Button>
          </div>
        </div>
      </Card>

      <ConfirmDialog
        open={replaceOpen}
        title={host.t('settings.data.modeReplace')}
        description={<p>{host.t('settings.data.replaceConfirm')}</p>}
        tone="danger"
        confirmLabel={host.t('settings.data.modeReplace')}
        cancelLabel={host.t('common.cancel')}
        loading={busy}
        onConfirm={() => void applyRestore()}
        onClose={() => setReplaceOpen(false)}
      />

      <ConfirmDialog
        open={resetOpen}
        title={host.t('settings.data.resetTitle')}
        description={<p>{host.t('settings.data.resetBody')}</p>}
        tone="danger"
        confirmLabel={host.t('common.reset')}
        cancelLabel={host.t('common.cancel')}
        loading={busy}
        onConfirm={() => void runReset()}
        onClose={() => setResetOpen(false)}
      />
    </SettingsShell>
  );
}
