'use client';

/**
 * Share sheet.
 *
 * Builds a signed `.mapp` from the current draft: name + semver + permission
 * checkboxes, then size/checksum preview, download, JSON export, and a copy-index
 * link that only appears when a static source is configured.
 *
 * Missing signing material is `E-PACK-002` with a link to Settings; a bad version
 * is `E-PACK-001`.
 */

import { useCallback, useMemo, useState, type ReactElement } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Badge, Button, Card, Checkbox, Sheet, TextField } from '@microapp/ui-kit';
import { useHost } from '@/features/host/HostProvider';
import { permissionDefinition } from '@/features/permissions/catalog';
import { buildPackage, isValidVersion, manifestIdFor } from './buildPackage';
import type { StudioDocument } from './types';

export interface ShareSheetProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  document: StudioDocument;
  onShareStateChange?: (state: { kind: 'saved'; status: 'saved' | 'saving' | 'dirty' }) => void;
}

const ALL_PERMISSIONS = [
  'storage.app',
  'clipboard.read',
  'clipboard.write',
  'notifications.local',
  'network.fetch',
  'files.pick',
  'vault.read',
  'share.export',
] as const;

export function ShareSheet({ open, onClose, projectId, document }: ShareSheetProps): ReactElement {
  const host = useHost();
  const router = useRouter();
  const [name, setName] = useState(document.name);
  const [version, setVersion] = useState('1.0.0');
  const [permissions, setPermissions] = useState<string[]>(document.permissions.length > 0 ? document.permissions : ['storage.app']);
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [built, setBuilt] = useState<{ size: number; checksum: string; bytes: Uint8Array } | null>(null);
  const [hasSource, setHasSource] = useState(false);

  const manifestId = useMemo(() => manifestIdFor(projectId), [projectId]);

  const toggle = (permission: string): void => {
    if (permission === 'storage.app') return;
    setPermissions((current) =>
      current.includes(permission) ? current.filter((entry) => entry !== permission) : [...current, permission],
    );
  };

  const build = useCallback(async () => {
    setError(null);
    if (!host.db || !host.identity || !host.identityService) {
      setError('E-PACK-002');
      return;
    }
    if (!isValidVersion(version)) {
      setError('E-PACK-001');
      return;
    }
    if (name.trim().length === 0) {
      setError('E-SET-001');
      return;
    }
    setBuilding(true);
    try {
      const result = await buildPackage({
        db: host.db,
        identity: host.identity,
        service: host.identityService,
        document,
        name,
        version,
        permissions,
        projectId,
      });
      setBuilt({ size: result.size, checksum: result.checksum, bytes: result.bytes });
      await host.audit('app.package.build', projectId, { version, permissions });
    } catch (failure) {
      const message = failure instanceof Error ? failure.message : '';
      setError(message.startsWith('E-PACK') || message.startsWith('E-AUTH') ? message.slice(0, 10) : 'E-PACK-002');
    } finally {
      setBuilding(false);
    }
  }, [document, host, name, permissions, projectId, version]);

  const download = useCallback(() => {
    if (!built) return;
    const blob = new Blob([built.bytes as unknown as BlobPart], { type: 'application/zip' });
    const url = URL.createObjectURL(blob);
    const anchor = window.document.createElement('a');
    anchor.href = url;
    anchor.download = `${name.replace(/[^a-zA-Z0-9._-]+/g, '-')}-${version}.mapp`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }, [built, name, version]);

  return (
    <Sheet
      open={open}
      title={host.t('studio.shareTitle')}
      onClose={onClose}
      footer={
        <div className="mads-row">
          <Button variant="secondary" onClick={onClose}>
            {host.t('common.close')}
          </Button>
          <Button onClick={() => void build()} loading={building}>
            {host.t('studio.share')}
          </Button>
        </div>
      }
    >
      <div className="mads-stack">
        {error ? (
          <Alert
            tone="error"
            title={host.t(`errors.${error}`)}
            actions={
              error === 'E-PACK-002' ? (
                <Button size="sm" onClick={() => router.push('/settings/general')}>
                  {host.t('nav.settings')}
                </Button>
              ) : null
            }
          >
            <p>{host.t(`errors.${error}`)}</p>
          </Alert>
        ) : null}

        <TextField label={host.t('common.edit')} value={name} onChange={setName} />
        <TextField label={host.t('studio.shareVersion')} value={version} onChange={setVersion} />
        <p>
          <code>{manifestId}</code>
        </p>

        <fieldset>
          <legend>{host.t('studio.sharePermissions')}</legend>
          {ALL_PERMISSIONS.map((permission) => {
            const definition = permissionDefinition(permission, host.locale);
            return (
              <Checkbox
                key={permission}
                label={`${definition.label} — ${definition.reason}`}
                checked={permissions.includes(permission)}
                disabled={permission === 'storage.app'}
                onChange={() => toggle(permission)}
              />
            );
          })}
        </fieldset>

        {built ? (
          <Card title={host.t('studio.share')}>
            <div className="mads-stack">
              <p>
                <Badge tone="success">{host.t('studio.shareSuccess')}</Badge>
              </p>
              <dl>
                <dt>{host.t('studio.shareSize')}</dt>
                <dd>{built.size} B</dd>
                <dt>{host.t('studio.shareChecksum')}</dt>
                <dd>
                  <code>{built.checksum}</code>
                </dd>
              </dl>
              <div className="mads-row">
                <Button onClick={download}>{host.t('studio.shareDownload')}</Button>
                <Button
                  variant="secondary"
                  disabled={!hasSource}
                  title={hasSource ? undefined : host.t('studio.shareCopyLinkUnavailable')}
                  onClick={() => {
                    void navigator.clipboard?.writeText(`${window.location.origin}/packages?tab=sources`).catch(() => {
                      setHasSource(false);
                    });
                  }}
                >
                  {host.t('studio.shareCopyLink')}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    const blob = new Blob([JSON.stringify(document, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const anchor = window.document.createElement('a');
                    anchor.href = url;
                    anchor.download = `${projectId}.json`;
                    anchor.click();
                    setTimeout(() => URL.revokeObjectURL(url), 2000);
                  }}
                >
                  {host.t('studio.shareExportJson')}
                </Button>
              </div>
            </div>
          </Card>
        ) : null}
      </div>
    </Sheet>
  );
}
