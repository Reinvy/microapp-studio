'use client';

/** Settings overview (SCR-10): group cards with a live count or status each. */

import type { ReactElement } from 'react';
import Link from 'next/link';
import { Badge, Card, StorageMeter } from '@microapp/ui-kit';
import { useHost } from '@/features/host/HostProvider';
import { SettingsShell } from '@/features/settings/SettingsShell';

export default function SettingsPage(): ReactElement {
  const host = useHost();

  const groups = [
    {
      href: '/settings/general',
      title: host.t('settings.groups.general.title'),
      description: host.t('settings.groups.general.description'),
      status: `${host.t(`settings.general.theme${host.prefs.theme.charAt(0).toUpperCase()}${host.prefs.theme.slice(1).replace('-', '')}`)} · ${host.locale}`,
    },
    {
      href: '/settings/permissions',
      title: host.t('settings.groups.permissions.title'),
      description: host.t('settings.groups.permissions.description'),
      status: `${host.apps.length}`,
    },
    {
      href: '/settings/ai',
      title: host.t('settings.groups.ai.title'),
      description: host.t('settings.groups.ai.description'),
      status: host.prefs.aiKeyLast4 ? host.t('settings.ai.keyMasked', { last4: host.prefs.aiKeyLast4 }) : host.t('settings.ai.vaultLocked'),
    },
    {
      href: '/settings/data',
      title: host.t('settings.groups.data.title'),
      description: host.t('settings.groups.data.description'),
      status: host.storagePersisted ? host.t('settings.data.persisted') : host.t('settings.data.persist'),
    },
    {
      href: '/settings/about',
      title: host.t('settings.groups.about.title'),
      description: host.t('settings.groups.about.description'),
      status: process.env.NEXT_PUBLIC_APP_VERSION ?? '0.0.0',
    },
    ...(host.prefs.devtoolsEnabled
      ? [
          {
            href: '/settings/dev',
            title: host.t('settings.groups.dev.title'),
            description: host.t('settings.groups.dev.description'),
            status: host.t('settings.dev.enabled'),
          },
        ]
      : []),
  ];

  return (
    <SettingsShell title={host.t('settings.title')} description={host.t('settings.subtitle')}>
      {host.storageEstimate ? (
        <Card title={host.t('settings.data.storage')}>
          <StorageMeter
            label={host.t('settings.data.storage')}
            used={host.storageEstimate.usage}
            quota={host.storageEstimate.quota}
            locale={host.locale}
          />
        </Card>
      ) : null}

      <ul className="mads-grid" role="list">
        {groups.map((group) => (
          <li key={group.href}>
            <Card title={group.title}>
              <div className="mads-stack">
                <p>{group.description}</p>
                <p>
                  <Badge tone="info">{group.status}</Badge>
                </p>
                <Link href={group.href} className="mads-button mads-button--secondary mads-button--sm">
                  {host.t('settings.backToSettings')}
                </Link>
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </SettingsShell>
  );
}
