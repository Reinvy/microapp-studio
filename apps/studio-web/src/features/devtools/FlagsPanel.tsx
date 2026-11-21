'use client';

/** Local feature flags. Nothing here leaves the device. */

import type { ReactElement } from 'react';
import { Card, Switch } from '@microapp/ui-kit';
import { useHost } from '@/features/host/HostProvider';

export function FlagsPanel(): ReactElement {
  const host = useHost();
  return (
    <Card title={host.t('settings.dev.flags')}>
      <Switch label="verboseBridge" checked={host.prefs.verboseBridge} onChange={(value) => host.setPrefs({ verboseBridge: value })} />
      <Switch label="showPlaceholders" checked={host.prefs.showPlaceholders} onChange={(value) => host.setPrefs({ showPlaceholders: value })} />
      <Switch label="advancedJson" checked={host.prefs.advancedJson} onChange={(value) => host.setPrefs({ advancedJson: value })} />
      <Switch label="devtoolsEnabled" checked={host.prefs.devtoolsEnabled} onChange={(value) => host.setPrefs({ devtoolsEnabled: value })} />
    </Card>
  );
}
