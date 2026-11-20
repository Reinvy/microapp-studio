'use client';

/** Data settings: encrypted backup export/restore and the Phase 0 migration. */

import { useCallback, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { useHost } from '@/features/host/HostProvider';
import { SettingsShell } from '@/features/settings/SettingsShell';
import { createBackup, readBackup, restoreBackup, type BackupCrypto } from '@/features/backup/backupService';
import { dexieReader } from '@/features/migration/dexieReader';
import { migratePhase0, type MigrationSummary } from '@/features/migration/phase0Migration';
import { mapToOpfsFiles, opfsFilesToMap, readWorkspaceFiles, writeOpfsFiles } from '@/features/storage/opfs';
import { createCoreClient, coreWasmUrl, loadCoreWasm } from '@microapp/runtime-web';

async function browserCrypto(): Promise<BackupCrypto> {
  const coreModule = await loadCoreWasm(coreWasmUrl());
  const client = createCoreClient(coreModule);
  return {
    seal: (passphrase, plaintext) => client.backupSeal(passphrase, plaintext),
    open: (passphrase, blob) => client.backupOpen(passphrase, blob),
    jcsSha256: (json) => client.jsonJcsSha256(json),
  };
}

export default function BackupPage(): ReactElement {
  const host = useHost();
  const [passphrase, setPassphrase] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [migration, setMigration] = useState<MigrationSummary | null>(null);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);
  const fileRef = useRef<File | null>(null);

  const exportBackup = async (): Promise<void> => {
    if (!host.db || !host.workspace) return;
    setBusy(true);
    setError(null);
    try {
      const files = await readWorkspaceFiles();
      const bytes = await createBackup({
        db: host.db,
        crypto: await browserCrypto(),
        passphrase,
        workspace: {
          id: host.workspace.id,
          name: host.workspace.name,
          slug: host.workspace.slug,
          locale: host.workspace.locale,
        },
        appDbs: opfsFilesToMap(files),
      });
      const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `microapp-${new Date().toISOString().slice(0, 10)}.mapp-backup`;
      anchor.click();
      URL.revokeObjectURL(url);
      await host.audit('backup.export', undefined, { files: files.length });
      setNotice(host.t('backup.success'));
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : host.t('backup.fail'));
    } finally {
      setBusy(false);
    }
  };

  const importBackup = async (): Promise<void> => {
    if (!host.db || !host.workspace) return;
    if (!fileRef.current) {
      setError(host.t('backup.fail'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const bytes = new Uint8Array(await fileRef.current.arrayBuffer());
      const document = await readBackup({ bytes, crypto: await browserCrypto(), passphrase });
      if (!confirmOverwrite) throw new Error(host.t('backup.confirmOverwrite'));
      const summary = await restoreBackup(host.db, document);
      await writeOpfsFiles(mapToOpfsFiles(document.appDbs));
      await host.audit('backup.restore', undefined, { rows: summary.rows, appDbs: summary.appDbs });
      await host.refresh();
      setNotice(`${host.t('backup.success')}: ${summary.rows} baris`);
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : host.t('backup.fail'));
    } finally {
      setBusy(false);
    }
  };

  const runMigration = useCallback(async (): Promise<void> => {
    if (!host.db || !host.workspace) return;
    setBusy(true);
    setError(null);
    try {
      const summary = await migratePhase0(host.db, dexieReader, host.workspace.id);
      setMigration(summary);
      await host.audit('migration.phase0', undefined, {
        apps: summary.apps,
        drafts: summary.drafts,
        skipped: summary.skipped,
      });
    } catch (migrationError) {
      setError(migrationError instanceof Error ? migrationError.message : host.t('errors.generic'));
    } finally {
      setBusy(false);
    }
  }, [host]);

  return (
    <SettingsShell title={host.t('backup.title')}>
      {error ? (
        <p role="alert" className="alert alert-error">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="alert">
          {notice}
        </p>
      ) : null}

      <section className="card stack-md" aria-label={host.t('backup.export')}>
        <h2>{host.t('backup.title')}</h2>
        <label className="field">
          <span>{host.t('backup.passphrase')}</span>
          <input
            type="password"
            value={passphrase}
            onChange={(event) => setPassphrase(event.target.value)}
            autoComplete="new-password"
          />
        </label>
        <div className="badge-row">
          <button
            type="button"
            className="button button-primary"
            onClick={() => void exportBackup()}
            disabled={busy || passphrase.length < 8}
          >
            {host.t('backup.export')}
          </button>
        </div>
        <label className="field">
          <span>Pilih berkas backup</span>
          <input
            type="file"
            accept=".mapp-backup,application/octet-stream"
            aria-label="Pilih berkas backup"
            onChange={(event) => {
              fileRef.current = event.target.files?.[0] ?? null;
            }}
          />
        </label>
        <label className="field">
          <input
            type="checkbox"
            checked={confirmOverwrite}
            onChange={(event) => setConfirmOverwrite(event.target.checked)}
          />
          <span>{host.t('backup.confirmOverwrite')}</span>
        </label>
        <button
          type="button"
          className="button"
          onClick={() => void importBackup()}
          disabled={busy || !confirmOverwrite || passphrase.length < 8}
        >
          Pulihkan backup
        </button>
      </section>

      <section className="card stack-md" aria-label="Migrasi Phase 0">
        <h2>Migrasi Phase 0</h2>
        <p>Membaca Dexie v6 secara read-only dan mengimpor app sebagai draft Studio. Dexie tidak dihapus.</p>
        <button type="button" className="button" onClick={() => void runMigration()} disabled={busy}>
          Jalankan migrasi
        </button>
        {migration ? (
          <dl>
            <dt>App</dt>
            <dd>{migration.apps}</dd>
            <dt>Draft dibuat</dt>
            <dd>{migration.drafts}</dd>
            <dt>Dilewati</dt>
            <dd>{migration.skipped}</dd>
            <dt>Checksum</dt>
            <dd>
              <code>{migration.checksum.slice(0, 16)}…</code>
            </dd>
          </dl>
        ) : null}
      </section>
    </SettingsShell>
  );
}
