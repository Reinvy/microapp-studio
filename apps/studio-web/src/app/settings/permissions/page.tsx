'use client';

/** Per-app permission management: list active grants, revoke, toggle mock data. */

import { useCallback, useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { useHost } from '@/features/host/HostProvider';
import { SettingsShell } from '@/features/settings/SettingsShell';
import {
  grantPermission,
  listActiveGrants,
  revokePermission,
  type ActiveGrant,
} from '@/db/repositories/permissions';

export default function PermissionsPage(): ReactElement {
  const host = useHost();
  const [selected, setSelected] = useState<string>('');
  const [grants, setGrants] = useState<ActiveGrant[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (installId: string): Promise<void> => {
      if (!host.db || !host.workspace || !installId) {
        setGrants([]);
        return;
      }
      setGrants(await listActiveGrants(host.db, host.workspace.id, installId));
    },
    [host.db, host.workspace],
  );

  useEffect(() => {
    if (!selected && host.apps[0]) {
      const first = host.apps[0].id;
      void Promise.resolve().then(() => setSelected(first));
    }
  }, [host.apps, selected]);

  useEffect(() => {
    void Promise.resolve().then(() => load(selected));
  }, [load, selected]);

  const revoke = async (permissionId: string): Promise<void> => {
    if (!host.db || !host.workspace) return;
    try {
      await revokePermission(host.db, {
        workspaceId: host.workspace.id,
        appInstallId: selected,
        permissionId,
      });
      await host.audit('permission.revoke', permissionId);
      await load(selected);
    } catch (revokeError) {
      setError(revokeError instanceof Error ? revokeError.message : host.t('errors.generic'));
    }
  };

  const toggleMock = async (permissionId: string, mocked: boolean): Promise<void> => {
    if (!host.db || !host.workspace) return;
    await grantPermission(host.db, {
      workspaceId: host.workspace.id,
      appInstallId: selected,
      permissionId,
      scope: 'persistent',
      mocked,
    });
    await host.audit('permission.mock', permissionId, { mocked });
    await load(selected);
  };

  return (
    <SettingsShell title={host.t('permissions.title')}>
      {host.apps.length === 0 ? <p>{host.t('home.emptyTitle')}</p> : null}
      {host.apps.length > 0 ? (
        <label className="field">
          <span>Aplikasi</span>
          <select value={selected} onChange={(event) => setSelected(event.target.value)}>
            {host.apps.map((app) => (
              <option key={app.id} value={app.id}>
                {app.appId}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {error ? (
        <p role="alert" className="alert alert-error">
          {error}
        </p>
      ) : null}

      {grants.length === 0 ? <p>{host.t('permissions.none')}</p> : null}

      <ul className="stack-md">
        {grants.map((grant) => (
          <li key={grant.id} className="card">
            <strong>{grant.permissionId}</strong>
            <span>{grant.scope}</span>
            {grant.mocked ? <span className="badge">{host.t('permissions.mocked')}</span> : null}
            <div className="badge-row">
              <button type="button" className="button" onClick={() => void revoke(grant.permissionId)}>
                {host.t('permissions.revoke')}
              </button>
              <button
                type="button"
                className="button"
                onClick={() => void toggleMock(grant.permissionId, !grant.mocked)}
              >
                {host.t('permissions.mock')}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </SettingsShell>
  );
}
