'use client';

/** Storage manager: usage estimate, pins, and per-app Offline Cage. */

import { useCallback, useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { useHost } from '@/features/host/HostProvider';
import { SettingsShell } from '@/features/settings/SettingsShell';
import { listPins } from '@/db/repositories/search';
import { appPolicy, setOfflineCage } from '@/db/repositories/apps';

export default function StoragePage(): ReactElement {
  const host = useHost();
  const [usage, setUsage] = useState<{ usage?: number; quota?: number }>({});
  const [pins, setPins] = useState<Array<{ appInstallId: string; category: string; relativePath: string }>>([]);
  const [cages, setCages] = useState<Record<string, boolean>>({});

  const refresh = useCallback(async (): Promise<void> => {
    if (navigator.storage?.estimate) {
      const estimate = await navigator.storage.estimate();
      setUsage({ usage: estimate.usage, quota: estimate.quota });
    }
    if (!host.db || !host.workspace) return;
    setPins(await listPins(host.db, host.workspace.id));
    const next: Record<string, boolean> = {};
    for (const app of host.apps) {
      next[app.id] = (await appPolicy(host.db, host.workspace.id, app.id)).offlineCage;
    }
    setCages(next);
  }, [host.apps, host.db, host.workspace]);

  useEffect(() => {
    void Promise.resolve().then(refresh);
  }, [refresh]);

  const toggleCage = async (installId: string): Promise<void> => {
    if (!host.db || !host.workspace) return;
    const next = !cages[installId];
    await setOfflineCage(host.db, host.workspace.id, installId, next);
    await host.audit('app.policy.offline_cage', installId, { enabled: next });
    setCages((prev) => ({ ...prev, [installId]: next }));
  };

  const mb = (bytes?: number): string => (bytes === undefined ? '—' : `${(bytes / (1024 * 1024)).toFixed(1)} MB`);

  return (
    <SettingsShell title={host.t('settings.storage')}>
      <dl className="card">
        <dt>{host.t('settings.storageUsed')}</dt>
        <dd>{mb(usage.usage)}</dd>
        <dt>Quota</dt>
        <dd>{mb(usage.quota)}</dd>
        <dt>{host.t('settings.storagePinned')}</dt>
        <dd>{pins.length}</dd>
        <dt>Mode</dt>
        <dd>{host.storage === 'opfs' ? 'OPFS' : 'ephemeral'}</dd>
      </dl>

      <ul className="stack-md">
        {host.apps.map((app) => (
          <li key={app.id} className="card">
            <strong>{app.appId}</strong>
            <div className="badge-row">
              <button type="button" className="button" onClick={() => void toggleCage(app.id)}>
                {host.t('settings.offlineCage')}: {cages[app.id] ? 'aktif' : 'nonaktif'}
              </button>
            </div>
            <p>{host.t('settings.offlineCageHint')}</p>
          </li>
        ))}
      </ul>

      {pins.length > 0 ? (
        <ul>
          {pins.map((pin) => (
            <li key={`${pin.appInstallId}-${pin.relativePath}`}>{pin.relativePath}</li>
          ))}
        </ul>
      ) : null}
    </SettingsShell>
  );
}
