'use client';

/** Settings index: identity facts, storage mode, and locale. */

import type { ReactElement } from 'react';
import { useHost } from '@/features/host/HostProvider';
import { SettingsShell } from '@/features/settings/SettingsShell';
import { siteIdBase32 } from '@/features/settings/siteId';

export default function SettingsPage(): ReactElement {
  const host = useHost();
  const identity = host.identity;
  return (
    <SettingsShell title={host.t('settings.title')}>
      <dl className="card">
        <dt>Site ID</dt>
        <dd>{identity ? siteIdBase32(identity.siteId) : '—'}</dd>
        <dt>{host.t('settings.language')}</dt>
        <dd>{host.locale}</dd>
        <dt>{host.t('settings.storage')}</dt>
        <dd>{host.storage === 'opfs' ? 'OPFS' : host.t('errors.opfs')}</dd>
        <dt>Device certificate</dt>
        <dd>{identity?.deviceCertExpiresMs ? new Date(identity.deviceCertExpiresMs).toLocaleString() : '—'}</dd>
      </dl>
      {host.degradedIdentity ? (
        <p role="alert" className="alert alert-warning">
          Identitas hanya tersimpan di memori sesi ini; pulihkan dengan frasa setelah reload.
        </p>
      ) : null}
    </SettingsShell>
  );
}
