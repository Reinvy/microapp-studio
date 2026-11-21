'use client';

/**
 * DevTools (SCR-12).
 *
 * Local-only diagnostics behind the `devtoolsEnabled` flag. Every panel reads
 * from the device and writes nothing anywhere else; there is no network call in
 * this route.
 */

import type { ReactElement } from 'react';
import Link from 'next/link';
import { Alert, Button, Card } from '@microapp/ui-kit';
import { useHost } from '@/features/host/HostProvider';
import { SettingsShell } from '@/features/settings/SettingsShell';
import { StoragePanel } from '@/features/devtools/StoragePanel';
import { RuntimePanel } from '@/features/devtools/RuntimePanel';
import { PackagePanel } from '@/features/devtools/PackagePanel';
import { BridgeLog, ErrorLog } from '@/features/devtools/BridgeLog';
import { FlagsPanel } from '@/features/devtools/FlagsPanel';

export default function DevToolsPage(): ReactElement {
  const host = useHost();

  if (!host.prefs.devtoolsEnabled) {
    return (
      <SettingsShell title={host.t('settings.groups.dev.title')} description={host.t('settings.groups.dev.description')}>
        <Alert tone="info" title={host.t('settings.dev.disabledHint')}>
          <p>{host.t('settings.groups.dev.description')}</p>
        </Alert>
        <Card>
          <Link href="/settings/general" className="mads-button mads-button--primary">
            {host.t('settings.groups.general.title')}
          </Link>
        </Card>
      </SettingsShell>
    );
  }

  return (
    <SettingsShell title={host.t('settings.groups.dev.title')} description={host.t('settings.groups.dev.description')}>
      <div className="mads-grid" role="list">
        <StoragePanel />
        <RuntimePanel />
      </div>
      <PackagePanel />
      <BridgeLog />
      <ErrorLog />
      <FlagsPanel />
      <div className="mads-row">
        <Button variant="secondary" onClick={() => host.setPrefs({ devtoolsEnabled: false })}>
          {host.t('settings.dev.disabledHint')}
        </Button>
      </div>
    </SettingsShell>
  );
}
