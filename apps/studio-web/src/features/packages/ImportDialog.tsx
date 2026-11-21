'use client';

/**
 * Import dialog: verify → permissions → acknowledgements → install.
 *
 * The same component powers the `/packages/import` screen (`embedded`) and the
 * `?import=1` overlay sheet, so the two surfaces can never drift. Every stage is
 * observable: three verification rows (manifest/signature/digest), the
 * permission preview, key-change and downgrade acknowledgements, and a success
 * state that opens the installed app.
 *
 * Nothing installs automatically, no verification row can be bypassed, and a
 * failure keeps the selected file so retrying never means picking it again.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type ReactElement,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  DataTable,
  FieldError,
  FilePicker,
  PermissionBadge,
  Sheet,
  Stack,
  TextField,
} from '@microapp/ui-kit';
import type { InstalledApp } from '@/db/repositories/apps';
import { useHost } from '@/features/host/HostProvider';
import { permissionDefinition, riskLabel, type PermissionRisk } from '@/features/permissions/catalog';
import { formatBytes } from '@/i18n';
import type { VerifiedPackage } from '@microapp/runtime-web';
import type { InstallPlan } from './packageService';
import {
  ALWAYS_GRANTED_PERMISSION,
  approvedPermissionSet,
  initialPermissionSelection,
  installGate,
  inspectForImport,
  packageErrorCode,
  pendingVerificationRows,
  togglePermission,
  validatePackageKeys,
  verificationRows,
  type VerificationKey,
  type VerificationRow,
} from './importFlow';

type Stage = 'idle' | 'inspecting' | 'review' | 'installing' | 'installed';

export const PACKAGE_KEYS_STORAGE = 'microapp.package.keys';

const VERIFY_LABEL: Record<VerificationKey, string> = {
  manifest: 'packages.manifest',
  signature: 'packages.signature',
  digest: 'packages.digest',
};

const VERIFY_PASS: Record<VerificationKey, string> = {
  manifest: 'packages.verifyManifest',
  signature: 'packages.verifySignature',
  digest: 'packages.verifyDigest',
};

const RISK_TONE: Record<PermissionRisk, 'success' | 'warning' | 'danger'> = {
  low: 'success',
  medium: 'warning',
  high: 'danger',
};

const DROP_ZONE: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 'var(--mads-space-2)',
  padding: 'var(--mads-space-5)',
  border: '1px dashed var(--mads-color-border-strong)',
  borderRadius: 'var(--mads-radius-clay-md)',
  textAlign: 'center',
};

export interface ImportDialogProps {
  /** Render inside a `Sheet` (used by `?import=1`) instead of page flow. */
  asSheet?: boolean;
  open?: boolean;
  /** File handed over by a drop zone; inspected immediately, no second picker. */
  initialFile?: File | null;
  onClose?: () => void;
  onInstalled?: (app: InstalledApp) => void;
}

export function ImportDialog({
  asSheet = false,
  open = false,
  initialFile = null,
  onClose,
  onInstalled,
}: ImportDialogProps): ReactElement {
  const host = useHost();
  const router = useRouter();
  const t = host.t;

  const [stage, setStage] = useState<Stage>('idle');
  const [file, setFile] = useState<File | null>(null);
  const [pkg, setPkg] = useState<VerifiedPackage | null>(null);
  const [rows, setRows] = useState<VerificationRow[]>(pendingVerificationRows());
  const [plan, setPlan] = useState<InstallPlan | null>(null);
  const [installError, setInstallError] = useState<string | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [acknowledge, setAcknowledge] = useState({ keyChange: false, downgrade: false });
  const [installedApp, setInstalledApp] = useState<InstalledApp | null>(null);
  const [authorKey, setAuthorKey] = useState('');
  const [registryKey, setRegistryKey] = useState('');
  const [keyError, setKeyError] = useState<'author' | 'registry' | null>(null);
  const [keysLoaded, setKeysLoaded] = useState(false);
  const [dragging, setDragging] = useState(false);

  // The optional keys are remembered locally; they are not secrets. The read is
  // deferred to a promise so opening the dialog never cascades a render.
  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (cancelled) return;
      try {
      const raw = window.localStorage.getItem(PACKAGE_KEYS_STORAGE);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          if ('authorPubkeyHex' in parsed && typeof parsed.authorPubkeyHex === 'string') {
            setAuthorKey(parsed.authorPubkeyHex);
          }
          if ('registryPubkeyHex' in parsed && typeof parsed.registryPubkeyHex === 'string') {
            setRegistryKey(parsed.registryPubkeyHex);
          }
        }
      }
      } catch {
        // A corrupt/unavailable localStorage entry is not an error the user can act on.
      }
      setKeysLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!keysLoaded) return;
    try {
      window.localStorage.setItem(
        PACKAGE_KEYS_STORAGE,
        JSON.stringify({ authorPubkeyHex: authorKey.trim(), registryPubkeyHex: registryKey.trim() }),
      );
    } catch {
      // Remembering keys is a convenience; the install flow does not depend on it.
    }
  }, [authorKey, registryKey, keysLoaded]);

  const runInspect = useCallback(
    async (nextFile: File) => {
      setFile(nextFile);
      setStage('inspecting');
      setPkg(null);
      setPlan(null);
      setInstallError(null);
      setInstalledApp(null);
      setAcknowledge({ keyChange: false, downgrade: false });
      setRows(pendingVerificationRows());
      setKeyError(null);

      const keyCheck = validatePackageKeys({
        authorPubkeyHex: authorKey,
        registryPubkeyHex: registryKey,
      });
      if (!keyCheck.ok) {
        // Never reach the verifier with malformed key material.
        setKeyError(keyCheck.field);
        setRows(verificationRows(null, 'E-PACK-002'));
        setStage('review');
        return;
      }

      const outcome = await inspectForImport(
        {
          inspectPackage: host.inspectPackage,
          findExisting: (appId) => host.apps.find((app) => app.appId === appId) ?? null,
        },
        nextFile,
        keyCheck.keys,
      );
      setPkg(outcome.pkg);
      setRows(outcome.rows);
      setPlan(outcome.plan);
      setSelectedPermissions(
        outcome.pkg ? initialPermissionSelection(outcome.pkg.manifest.permissions) : [],
      );
      setStage('review');
    },
    [authorKey, host, registryKey],
  );

  const handledFileRef = useRef<File | null>(null);
  useEffect(() => {
    void Promise.resolve().then(() => {
      if (!initialFile || handledFileRef.current === initialFile) return;
      handledFileRef.current = initialFile;
      void runInspect(initialFile);
    });
  }, [initialFile, runInspect]);

  // A closed overlay must not remember the previous import when reopened.
  useEffect(() => {
    void Promise.resolve().then(() => {
      if (!asSheet || open) return;
      setStage('idle');
      setFile(null);
      setPkg(null);
      setRows(pendingVerificationRows());
      setPlan(null);
      setInstallError(null);
      setInstalledApp(null);
      setSelectedPermissions([]);
      setAcknowledge({ keyChange: false, downgrade: false });
      handledFileRef.current = null;
    });
  }, [asSheet, open]);

  const onFiles = useCallback(
    (files: File[]) => {
      const next = files[0];
      if (!next) return;
      void runInspect(next);
    },
    [runInspect],
  );

  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDragging(false);
      const dropped = event.dataTransfer.files[0];
      if (dropped) void runInspect(dropped);
    },
    [runInspect],
  );

  const declared = useMemo(() => pkg?.manifest.permissions ?? [], [pkg]);
  const approved = useMemo(
    () => approvedPermissionSet(declared, selectedPermissions),
    [declared, selectedPermissions],
  );

  const gate = useMemo(
    () =>
      installGate({
        rows,
        plan,
        acknowledge,
        declaredPermissions: declared,
        approvedPermissions: approved,
      }),
    [rows, plan, acknowledge, declared, approved],
  );

  const hostReady = Boolean(host.db && host.workspace);
  const canInstall = gate.ready && hostReady;

  const install = useCallback(async () => {
    if (!file || !pkg || !gate.ready || !host.db || !host.workspace) return;
    setStage('installing');
    setInstallError(null);
    try {
      const app = await host.installPackage(file, 'local', approved, {
        authorPubkeyHex: authorKey.trim() || undefined,
        registryPubkeyHex: registryKey.trim() || undefined,
        allowKeyChange: acknowledge.keyChange,
        allowDowngrade: acknowledge.downgrade,
      });
      setInstalledApp(app);
      setStage('installed');
      onInstalled?.(app);
    } catch (error) {
      setInstallError(packageErrorCode(error));
      // The file is kept so the user can fix the cause and retry.
      setStage('review');
    }
  }, [acknowledge, approved, authorKey, file, gate.ready, host, onInstalled, pkg, registryKey]);

  const close = useCallback(() => {
    if (onClose) onClose();
    else router.push('/packages');
  }, [onClose, router]);

  const openApp = useCallback(() => {
    if (!installedApp) return;
    router.push(`/app/${encodeURIComponent(installedApp.appId)}`);
  }, [installedApp, router]);

  const verificationList = (
    <ul
      aria-live="polite"
      style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 'var(--mads-space-2)' }}
    >
      {rows.map((row) => (
        <li
          key={row.key}
          className="mads-row"
          data-verify={row.key}
          data-state={row.state}
          style={{ justifyContent: 'space-between' }}
        >
          <span>{t(VERIFY_LABEL[row.key])}</span>
          <span className="mads-row">
            {row.state === 'pass' ? (
              <Badge tone="success">{t(VERIFY_PASS[row.key])}</Badge>
            ) : null}
            {row.state === 'fail' ? (
              <Badge tone="danger">{t('packages.verifyFailed')}</Badge>
            ) : null}
            {row.state === 'fail' && row.code ? <code>{row.code}</code> : null}
            {row.state === 'pending' ? <Badge tone="info">{t('packages.verifyPending')}</Badge> : null}
            {row.state === 'skipped' ? (
              <Badge tone="neutral">{t('packages.verifySkipped')}</Badge>
            ) : null}
          </span>
        </li>
      ))}
    </ul>
  );

  const permissionTable =
    pkg && declared.length > 0 ? (
      <DataTable
        caption={t('packages.permissionsTitle')}
        columns={[
          { key: 'permission', label: t('packages.permission') },
          { key: 'reason', label: t('packages.reason') },
          { key: 'risk', label: t('packages.risk') },
          { key: 'allow', label: t('packages.allow') },
        ]}
        rows={declared.map((id) => {
          const definition = permissionDefinition(id, host.locale);
          const always = id === ALWAYS_GRANTED_PERMISSION;
          return {
            permission: (
              <PermissionBadge
                permission={id}
                granted={always ? 'granted' : 'declared'}
                label={definition.label}
                reason={definition.reason}
              />
            ),
            reason: definition.reason,
            risk: <Badge tone={RISK_TONE[definition.risk]}>{riskLabel(definition.risk, host.locale)}</Badge>,
            allow: (
              <Checkbox
                label={always ? t('packages.alwaysGranted') : t('packages.allow')}
                checked={always || selectedPermissions.includes(id)}
                disabled={always}
                onChange={(checked) =>
                  setSelectedPermissions((current) => togglePermission(declared, current, id, checked))
                }
              />
            ),
          };
        })}
      />
    ) : null;

  const keyChangeWarning = plan?.warnings.some((warning) => warning.code === 'key_change') ?? false;
  const downgradeWarning = plan?.warnings.some((warning) => warning.code === 'downgrade') ?? false;

  const body = (
    <Stack gap="md">
      <div
        style={{
          ...DROP_ZONE,
          ...(dragging
            ? { background: 'var(--mads-color-surface-raised)', borderColor: 'var(--mads-color-focus)' }
            : {}),
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <p>{t('packages.dropHint')}</p>
        <FilePicker
          label={t('packages.import')}
          accept=".mapp,application/zip"
          hint={file ? `${file.name} · ${formatBytes(file.size, host.locale)}` : undefined}
          onFiles={onFiles}
          disabled={stage === 'inspecting' || stage === 'installing'}
        />
      </div>

      <TextField
        label={t('packages.authorKeyHex')}
        value={authorKey}
        onChange={setAuthorKey}
        description={t('packages.keysHint')}
        placeholder="ed25519"
        autoComplete="off"
      />
      {keyError === 'author' ? (
        <FieldError id="import-author-key-error">{t('errors.E-PACK-002')}</FieldError>
      ) : null}
      <TextField
        label={t('packages.registryKeyHex')}
        value={registryKey}
        onChange={setRegistryKey}
        placeholder="ed25519"
        autoComplete="off"
      />
      {keyError === 'registry' ? (
        <FieldError id="import-registry-key-error">{t('errors.E-PACK-002')}</FieldError>
      ) : null}

      {stage === 'idle' ? null : verificationList}

      {stage === 'inspecting' ? (
        <Alert tone="info" title={t('packages.verifying')}>
          <span aria-hidden="true">…</span>
        </Alert>
      ) : null}

      {pkg ? (
        <div className="mads-row">
          <strong>{pkg.manifest.name}</strong>
          <Badge tone="info">{pkg.manifest.version}</Badge>
          <code>{pkg.manifest.id}</code>
        </div>
      ) : null}

      {pkg ? permissionTable : null}

      {keyChangeWarning ? (
        <Alert tone="danger" title={t('packages.keyChangeWarning')}>
          <p>{t('errors.E-PACK-002')}</p>
          <Checkbox
            label={t('packages.keyChangeConfirm')}
            checked={acknowledge.keyChange}
            onChange={(checked) => setAcknowledge((current) => ({ ...current, keyChange: checked }))}
          />
        </Alert>
      ) : null}

      {downgradeWarning ? (
        <Alert tone="warning" title={t('packages.downgradeWarning')}>
          <p>{t('errors.E-PACK-004')}</p>
          <Checkbox
            label={t('packages.downgradeConfirm')}
            checked={acknowledge.downgrade}
            onChange={(checked) => setAcknowledge((current) => ({ ...current, downgrade: checked }))}
          />
        </Alert>
      ) : null}

      {installError ? <Alert tone="danger">{t(`errors.${installError}`)}</Alert> : null}

      {stage === 'review' && !gate.ready ? (
        gate.blockedBy === 'permission' ? (
          <Alert tone="warning">{t('packages.permissionsRequired')}</Alert>
        ) : (
          <Alert
            tone="danger"
            actions={
              !pkg && file ? (
                <Button size="sm" variant="secondary" onClick={() => void runInspect(file)}>
                  {t('common.retry')}
                </Button>
              ) : undefined
            }
          >
            {t(`errors.${gate.code ?? 'E-PACK-002'}`)}
          </Alert>
        )
      ) : null}

      {installedApp ? (
        <Alert
          tone="success"
          title={t('packages.installed', { app: installedApp.displayName ?? installedApp.name })}
          actions={
            <div className="mads-row">
              <Button onClick={openApp}>{t('packages.openApp')}</Button>
              <Button variant="secondary" onClick={close}>
                {t('packages.backToPackages')}
              </Button>
            </div>
          }
        >
          <p>
            {installedApp.appId} · {installedApp.version}
          </p>
        </Alert>
      ) : null}

      {stage === 'installed' ? null : (
        <div className="mads-row mads-row--end">
          <Button variant="ghost" onClick={close} disabled={stage === 'installing'}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={() => void install()}
            disabled={!canInstall || stage === 'inspecting'}
            loading={stage === 'installing'}
          >
            {stage === 'installing' ? t('packages.installing') : t('packages.install')}
          </Button>
        </div>
      )}
    </Stack>
  );

  if (asSheet) {
    return (
      <Sheet open={open} title={t('packages.importTitle')} onClose={close}>
        {body}
      </Sheet>
    );
  }

  return <div data-import-dialog="embedded">{body}</div>;
}
