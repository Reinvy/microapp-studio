'use client';

import Link from 'next/link';
import type { ReactElement, ReactNode } from 'react';
import { useHost } from '@/features/host/HostProvider';

export function SettingsShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}): ReactElement {
  const host = useHost();
  return (
    <main id="mads-main" className="screen">
      <div className="screen-header">
        <h1>{title}</h1>
        <Link className="button" href="/">
          {host.t('common.back')}
        </Link>
      </div>
      <nav aria-label={host.t('nav.settings')} className="badge-row">
        <Link className="button" href="/settings">
          {host.t('settings.general')}
        </Link>
        <Link className="button" href="/settings/permissions">
          {host.t('permissions.title')}
        </Link>
        <Link className="button" href="/settings/storage">
          {host.t('settings.storage')}
        </Link>
        <Link className="button" href="/settings/vault">
          {host.t('settings.vault')}
        </Link>
        <Link className="button" href="/settings/sync">
          {host.t('settings.sync')}
        </Link>
        <Link className="button" href="/settings/notifications">
          Notifikasi
        </Link>
        <Link className="button" href="/settings/backup">
          {host.t('backup.title')}
        </Link>
      </nav>
      <section className="stack-md" style={{ marginTop: '1rem' }}>
        {children}
      </section>
    </main>
  );
}
