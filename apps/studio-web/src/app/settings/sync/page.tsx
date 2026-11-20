'use client';

/** Sync settings. Peer sync arrives in phase 3; the page fails closed, not silently. */

import type { ReactElement } from 'react';
import { useHost } from '@/features/host/HostProvider';
import { SettingsShell } from '@/features/settings/SettingsShell';

export default function SyncPage(): ReactElement {
  const host = useHost();
  return (
    <SettingsShell title={host.t('settings.sync')}>
      <div className="card">
        <p role="status">Sinkronisasi peer (E2EE) tersedia pada fase 3. Tidak ada antrean aktif.</p>
        <p>Antrean outbox: 0</p>
      </div>
    </SettingsShell>
  );
}
