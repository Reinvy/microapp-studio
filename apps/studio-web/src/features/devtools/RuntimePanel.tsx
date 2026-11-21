'use client';

/** Runtime panel: shell/runtime state that explains a broken session. */

import type { ReactElement } from 'react';
import { Badge, Card } from '@microapp/ui-kit';
import { useHost } from '@/features/host/HostProvider';

export function RuntimePanel(): ReactElement {
  const host = useHost();
  return (
    <Card title={host.t('settings.dev.runtime')}>
      <dl>
        <dt>{host.t('settings.dev.storage')}</dt>
        <dd>{host.storage ?? '—'}</dd>
        <dt>{host.t('shell.online')}</dt>
        <dd>{host.online ? host.t('common.yes') : host.t('common.no')}</dd>
        <dt>{host.t('settings.data.cache')}</dt>
        <dd>
          {host.cacheStatus === 'unknown' ? (
            <Badge tone="neutral">—</Badge>
          ) : (
            <Badge tone={host.cacheStatus === 'cached' ? 'success' : 'warning'}>
              {host.cacheStatus === 'cached' ? host.t('shell.cached') : host.t('shell.uncached')}
            </Badge>
          )}
        </dd>
        <dt>{host.t('settings.general.identity')}</dt>
        <dd>{host.identity?.id ?? '—'}</dd>
        <dt>{host.t('settings.general.workspaces')}</dt>
        <dd>{host.workspace?.slug ?? '—'}</dd>
        <dt>{host.t('packages.tabInstalled')}</dt>
        <dd>{host.apps.length}</dd>
      </dl>
    </Card>
  );
}
