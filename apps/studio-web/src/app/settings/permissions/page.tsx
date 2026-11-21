'use client';

/**
 * Permission settings: one card per installed app with its declared permissions,
 * the active grants, a revoke action that takes effect on the next bridge call,
 * and the Offline Cage switch.
 *
 * Declared-but-not-granted permissions show why the app wants them (the catalog
 * reason) so revoking is an informed decision.
 */

import { useCallback, useEffect, useState, type ReactElement } from 'react';
import { Alert, Badge, Button, Card, PermissionBadge, Switch } from '@microapp/ui-kit';
import { useHost } from '@/features/host/HostProvider';
import { SettingsShell } from '@/features/settings/SettingsShell';
import { appPolicy, type InstalledApp } from '@/db/repositories/apps';
import { listActiveGrants, revokePermission, type ActiveGrant } from '@/db/repositories/permissions';
import { permissionDefinition, riskLabel } from '@/features/permissions/catalog';

interface AppPermissions {
  app: InstalledApp;
  declared: string[];
  grants: ActiveGrant[];
  offlineCage: boolean;
}

export default function PermissionsSettingsPage(): ReactElement {
  const host = useHost();
  const [rows, setRows] = useState<AppPermissions[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!host.db || !host.workspace) return;
    const db = host.db;
    const workspaceId = host.workspace.id;
    const next: AppPermissions[] = [];
    for (const app of host.apps) {
      const declared = readDeclared(app);
      const [grants, policy] = await Promise.all([
        listActiveGrants(db, workspaceId, app.id),
        appPolicy(db, workspaceId, app.id),
      ]);
      next.push({ app, declared, grants, offlineCage: policy.offlineCage });
    }
    setRows(next);
  }, [host.apps, host.db, host.workspace]);

  useEffect(() => {
    let cancelled = false;
    // The rows land in a promise callback so the effect never sets state
    // synchronously (React Compiler's cascade guard).
    void Promise.resolve().then(async () => {
      if (!cancelled) await load();
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  const revoke = useCallback(
    async (row: AppPermissions, permissionId: string) => {
      if (!host.db || !host.workspace) return;
      try {
        await revokePermission(host.db, {
          workspaceId: host.workspace.id,
          appInstallId: row.app.id,
          permissionId,
        });
        await host.audit('permission.revoke', row.app.appId, { permission: permissionId });
        await load();
      } catch {
        setError('E-RUN-003');
      }
    },
    [host, load],
  );

  return (
    <SettingsShell
      title={host.t('settings.groups.permissions.title')}
      description={host.t('settings.groups.permissions.description')}
    >
      {error ? (
        <Alert tone="error" title={host.t(`errors.${error}`)}>
          <p>{host.t('settings.permissions.reason')}</p>
        </Alert>
      ) : null}

      {rows.length === 0 ? (
        <p>{host.t('packages.installedEmpty')}</p>
      ) : (
        rows.map((row) => (
          <Card key={row.app.id} title={row.app.displayName ?? row.app.name}>
            <div className="mads-stack">
              <p>
                <code>{row.app.appId}</code> v{row.app.version}
              </p>

              <section aria-label={host.t('settings.permissions.declared')}>
                <h3>{host.t('settings.permissions.declared')}</h3>
                <ul role="list" className="mads-stack">
                  {row.declared.map((permissionId) => {
                    const definition = permissionDefinition(permissionId, host.locale);
                    const grant = row.grants.find((candidate) => candidate.permissionId === permissionId);
                    return (
                      <li key={permissionId} className="mads-row">
                        <PermissionBadge
                          permission={permissionId}
                          granted={grant ? (grant.scope === 'once' ? 'once' : 'granted') : 'declared'}
                          label={`${definition.label} — ${riskLabel(definition.risk, host.locale)}`}
                          reason={definition.reason}
                        />
                        <span>{definition.reason}</span>
                        {grant ? (
                          <Button size="sm" variant="secondary" onClick={() => void revoke(row, permissionId)}>
                            {host.t('settings.permissions.revoke')}
                          </Button>
                        ) : null}
                      </li>
                    );
                  })}
                  {row.declared.length === 0 ? <li>{host.t('settings.permissions.denied')}</li> : null}
                </ul>
              </section>

              <section aria-label={host.t('settings.permissions.granted')}>
                <h3>{host.t('settings.permissions.granted')}</h3>
                {row.grants.length === 0 ? (
                  <p>
                    <Badge tone="neutral">{host.t('settings.permissions.denied')}</Badge>
                  </p>
                ) : (
                  <ul role="list">
                    {row.grants.map((grant) => (
                      <li key={grant.id}>
                        {grant.permissionId} · {grant.scope}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <Switch
                label={host.t('settings.permissions.cage')}
                checked={row.offlineCage}
                onChange={(value) => {
                  if (!host.db || !host.workspace) return;
                  void import('@/db/repositories/apps').then(async ({ setOfflineCage }) => {
                    await setOfflineCage(host.db!, host.workspace!.id, row.app.id, value);
                    await load();
                  });
                }}
              />
              <p>{row.offlineCage ? host.t('settings.permissions.cageOn') : host.t('settings.permissions.cageOff')}</p>
            </div>
          </Card>
        ))
      )}
    </SettingsShell>
  );
}

function readDeclared(app: InstalledApp): string[] {
  try {
    const manifest = JSON.parse(app.manifestJson) as { permissions?: unknown };
    if (Array.isArray(manifest.permissions)) {
      return manifest.permissions.filter((item): item is string => typeof item === 'string');
    }
  } catch {
    return [];
  }
  return [];
}
