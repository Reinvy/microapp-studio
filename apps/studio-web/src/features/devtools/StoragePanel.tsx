'use client';

/** Storage panel: real numbers from `navigator.storage`, refreshed on demand. */

import type { ReactElement } from 'react';
import { Button, Card, StorageMeter } from '@microapp/ui-kit';
import { useHost } from '@/features/host/HostProvider';

export function StoragePanel(): ReactElement {
  const host = useHost();
  const estimate = host.storageEstimate;

  return (
    <Card title={host.t('settings.dev.storage')}>
      <div className="mads-stack">
        {estimate ? (
          <StorageMeter
            label={host.t('settings.dev.storage')}
            used={estimate.usage}
            quota={estimate.quota}
            locale={host.locale}
          />
        ) : (
          <p>{host.t('settings.data.used')}: —</p>
        )}
        <dl>
          <dt>{host.t('settings.data.persist')}</dt>
          <dd>{host.storagePersisted ? host.t('common.yes') : host.t('common.no')}</dd>
          <dt>{host.t('shell.storagePersisted.false')}</dt>
          <dd>{host.storage ?? '—'}</dd>
        </dl>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            void host.refreshStorageEstimate();
          }}
        >
          {host.t('settings.dev.refresh')}
        </Button>
      </div>
    </Card>
  );
}
