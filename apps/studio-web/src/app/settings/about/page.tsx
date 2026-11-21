'use client';

/**
 * About settings: build values, license, and policy links.
 *
 * Version and commit come from `next.config.ts` (`NEXT_PUBLIC_APP_VERSION`,
 * `NEXT_PUBLIC_COMMIT`), so the page reports what is actually deployed instead of
 * a hardcoded string.
 */

import type { ReactElement } from 'react';
import Link from 'next/link';
import { Card } from '@microapp/ui-kit';
import { useHost } from '@/features/host/HostProvider';
import { SettingsShell } from '@/features/settings/SettingsShell';

export default function AboutSettingsPage(): ReactElement {
  const host = useHost();
  const version = process.env.NEXT_PUBLIC_APP_VERSION ?? '0.0.0';
  const commit = process.env.NEXT_PUBLIC_COMMIT ?? 'local';

  return (
    <SettingsShell title={host.t('settings.groups.about.title')} description={host.t('settings.groups.about.description')}>
      <Card title={host.t('settings.groups.about.title')}>
        <dl>
          <dt>{host.t('settings.about.version')}</dt>
          <dd>
            <code>{version}</code>
          </dd>
          <dt>{host.t('settings.about.commit')}</dt>
          <dd>
            <code>{commit}</code>
          </dd>
          <dt>{host.t('settings.about.license')}</dt>
          <dd>
            <Link href="/LICENSE">Apache-2.0</Link>
          </dd>
        </dl>
      </Card>

      <Card title={host.t('settings.about.policy')}>
        <ul>
          <li>
            <Link href="/policies/privacy.md">{host.t('settings.about.privacy')}</Link>
          </li>
          <li>
            <Link href="/policies/terms.md">{host.t('settings.about.terms')}</Link>
          </li>
        </ul>
      </Card>

      <Card title={host.t('settings.data.storage')}>
        <dl>
          <dt>{host.t('shell.storagePersisted.true')}</dt>
          <dd>{host.storagePersisted ? host.t('common.yes') : host.t('common.no')}</dd>
          <dt>{host.t('shell.usage')}</dt>
          <dd>
            {host.storageEstimate ? `${host.storageEstimate.usage} / ${host.storageEstimate.quota}` : '—'}
          </dd>
        </dl>
      </Card>
    </SettingsShell>
  );
}
