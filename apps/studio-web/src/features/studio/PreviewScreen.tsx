'use client';

/**
 * Builder preview.
 *
 * Runs the draft through the *same* sandbox as an installed app: an opaque-origin
 * iframe with the shared bootstrap, the same broker, the same permission rules.
 * The only difference is the bundle source — a string built from the document
 * instead of an OPFS file — so nothing is installed and no package is written.
 */

import { useCallback, useMemo, useState, type ReactElement } from 'react';
import { useRouter } from 'next/navigation';
import { Badge, Button, RadioGroup } from '@microapp/ui-kit';
import { useHost } from '@/features/host/HostProvider';
import { useSandboxApp } from '@/features/runner/useSandboxApp';
import { bundleSource } from './buildPackage';
import { applyResponsive } from './document';
import { STUDIO_DEVICES, type StudioDevice, type StudioDocument } from './types';

export interface PreviewScreenProps {
  projectId: string;
  document: StudioDocument;
  onEdit: () => void;
  onDeviceChange: (device: StudioDevice) => void;
}

export function PreviewScreen({ projectId, document, onEdit, onDeviceChange }: PreviewScreenProps): ReactElement {
  const host = useHost();
  const router = useRouter();
  const [device, setDevice] = useState<StudioDevice>(document.device);

  const previewRoot = useMemo(() => applyResponsive(document, device).nodes[0], [device, document]);
  const source = useMemo(() => bundleSource(previewRoot), [previewRoot]);
  const bundleBuilder = useCallback(async () => source, [source]);

  const sandbox = useSandboxApp({
    workspaceId: host.workspace?.id ?? '',
    workspaceSlug: host.workspace?.slug ?? '',
    appInstallId: projectId,
    appId: `studio.preview.${projectId}`,
    bundleSource: bundleBuilder,
    declaredPermissions: document.permissions,
    mode: 'preview',
    offlineCage: true,
  });

  const width = STUDIO_DEVICES.find((entry) => entry.id === device)?.width ?? 1280;

  return (
    <div className="mads-page">
      <div className="mads-page__header">
        <div className="mads-row">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            {host.t('common.back')}
          </Button>
          <strong>{document.name}</strong>
          <Badge tone="info">{host.t('studio.preview')}</Badge>
        </div>
        <div className="mads-row">
          <RadioGroup
            label={host.t('studio.preview')}
            value={device}
            onChange={(value) => {
              const next = value as StudioDevice;
              setDevice(next);
              onDeviceChange(next);
            }}
            options={STUDIO_DEVICES.map((entry) => ({ value: entry.id, label: host.t(entry.labelKey) }))}
          />
          <Button size="sm" onClick={onEdit}>
            {host.t('common.edit')}
          </Button>
        </div>
      </div>

      {/*
        The sandbox hook returns its ref alongside the state, so the compiler
        treats the whole handle as ref-bearing. The values read here are plain
        primitives, not refs.
      */}
      {/* eslint-disable-next-line react-hooks/refs */}
      {sandbox.app.crash ? (
        <div role="alertdialog" aria-label={host.t('runner.crashTitle')}>
          {/* eslint-disable-next-line react-hooks/refs */}
          <p>{host.t(`errors.${sandbox.app.crash.code}`)}</p>
          <div className="mads-row">
            <Button onClick={() => sandbox.reload()}>{host.t('runner.reloadApp')}</Button>
            <Button variant="secondary" onClick={onEdit}>
              {host.t('common.edit')}
            </Button>
          </div>
        </div>
      ) : null}

      <div style={{ inlineSize: `${width}px`, maxInlineSize: '100%', marginInline: 'auto', blockSize: '70vh' }}>
        <iframe
          /* eslint-disable-next-line react-hooks/refs -- the sandbox hook owns this element */
          ref={sandbox.iframeRef}
          title={host.t('studio.preview')}
          sandbox="allow-scripts"
          style={{ inlineSize: '100%', blockSize: '100%', border: 0, borderRadius: 'var(--mads-radius-clay-lg)' }}
        />
      </div>
    </div>
  );
}
