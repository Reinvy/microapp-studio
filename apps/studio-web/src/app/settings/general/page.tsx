'use client';

/**
 * General settings: theme, locale, text scale, reduced motion, identity, and
 * workspaces. Every control applies immediately — there is no Save button, and a
 * persistence failure surfaces `E-SET-002` with a retry.
 */

import { useState, type ReactElement } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Badge, Button, Card, ConfirmDialog, RadioGroup, Slider, Switch, TextField } from '@microapp/ui-kit';
import { useHost } from '@/features/host/HostProvider';
import { SettingsShell } from '@/features/settings/SettingsShell';
import { RecoverySheet } from '@/features/identity/RecoverySheet';
import { TEXT_SCALES, THEME_PREFERENCES, type TextScale, type ThemePreference } from '@/features/preferences/types';
import { exportSettings, parseSettingsImport, type SettingsImportResult } from '@/features/settings/preferencesTransfer';

const SCALE_LABELS: Record<string, string> = { '1': '1×', '1.125': '1.125×', '1.25': '1.25×' };

export default function GeneralSettingsPage(): ReactElement {
  const host = useHost();
  const router = useRouter();
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('');
  const [creating, setCreating] = useState(false);
  const [pendingImport, setPendingImport] = useState<SettingsImportResult | null>(null);
  const [transferError, setTransferError] = useState<'E-SET-001' | null>(null);

  const themeLabels: Record<ThemePreference, string> = {
    system: host.t('settings.general.themeSystem'),
    light: host.t('settings.general.themeLight'),
    dark: host.t('settings.general.themeDark'),
    'high-contrast': host.t('settings.general.themeHighContrast'),
  };

  return (
    <SettingsShell title={host.t('settings.groups.general.title')} description={host.t('settings.groups.general.description')}>
      {host.prefsError ? (
        <Alert
          tone="error"
          title={host.t(`errors.${host.prefsError}`)}
          actions={<Button size="sm" onClick={host.retryPrefsSave}>{host.t('common.retry')}</Button>}
        >
          <p>{host.t('settings.general.identityDegraded')}</p>
        </Alert>
      ) : null}

      <Card title={host.t('settings.general.theme')}>
        <RadioGroup
          label={host.t('settings.general.theme')}
          value={host.prefs.theme}
          onChange={(value) => host.setPrefs({ theme: value as ThemePreference })}
          options={THEME_PREFERENCES.map((theme) => ({ value: theme, label: themeLabels[theme] }))}
        />
      </Card>

      <Card title={host.t('settings.general.locale')}>
        <RadioGroup
          label={host.t('settings.general.locale')}
          value={host.prefs.locale}
          onChange={(value) => host.setPrefs({ locale: value === 'en-US' ? 'en-US' : 'id-ID' })}
          options={[
            { value: 'id-ID', label: 'Bahasa Indonesia' },
            { value: 'en-US', label: 'English (US)' },
          ]}
        />
      </Card>

      <Card title={host.t('settings.general.textScale')}>
        <Slider
          label={host.t('settings.general.textScale')}
          value={host.prefs.textScale}
          min={1}
          max={1.25}
          step={0.125}
          valueText={`${SCALE_LABELS[String(host.prefs.textScale)] ?? host.prefs.textScale}×`}
          ticks={TEXT_SCALES.map((scale) => ({ value: scale, label: SCALE_LABELS[String(scale)] ?? String(scale) }))}
          onChange={(value) => {
            const nearest = TEXT_SCALES.reduce((best, candidate) =>
              Math.abs(candidate - value) < Math.abs(best - value) ? candidate : best,
            );
            host.setPrefs({ textScale: nearest as TextScale });
          }}
        />
      </Card>

      <Card title={host.t('settings.general.reducedMotion')}>
        <Switch
          label={host.t('settings.general.reducedMotion')}
          checked={host.prefs.reducedMotion}
          onChange={(value) => host.setPrefs({ reducedMotion: value })}
        />
      </Card>

      <Card title={host.t('settings.general.identity')}>
        <div className="mads-stack">
          <p>
            <Badge tone={host.ephemeral ? 'warning' : 'success'}>
              {host.ephemeral ? host.t('settings.general.identityDegraded') : host.t('settings.general.identityHealthy')}
            </Badge>
          </p>
          <p>
            <code>{host.identity?.id ?? '—'}</code>
          </p>
          <div className="mads-row">
            <Button onClick={() => setRecoveryOpen(true)}>{host.t('settings.general.recover')}</Button>
            {host.prefs.recoverySecured ? (
              <Badge tone="success">{host.t('common.done')}</Badge>
            ) : (
              <Badge tone="warning">{host.t('shell.recoveryBanner')}</Badge>
            )}
          </div>
        </div>
      </Card>

      <Card title={host.t('settings.general.workspaces')}>
        <div className="mads-stack">
          {host.workspaces.length > 1 ? (
            <RadioGroup
              label={host.t('settings.general.switchWorkspace')}
              value={host.workspace?.id ?? ''}
              onChange={(value) => void host.switchWorkspace(value)}
              options={host.workspaces.map((workspace) => ({ value: workspace.id, label: workspace.name }))}
            />
          ) : (
            <p>
              <Badge tone="neutral">{host.t('shell.singleWorkspace')}</Badge>
            </p>
          )}
          <TextField
            label={host.t('settings.general.workspaceName')}
            value={workspaceName}
            onChange={setWorkspaceName}
            description={host.t('settings.general.createWorkspace')}
          />
          <div className="mads-row">
            <Button
              loading={creating}
              disabled={workspaceName.trim().length === 0}
              onClick={() => {
                setCreating(true);
                void host
                  .createWorkspace(workspaceName)
                  .then((created) => {
                    setWorkspaceName('');
                    void host.switchWorkspace(created.id);
                  })
                  .finally(() => setCreating(false));
              }}
            >
              {host.t('settings.general.createWorkspace')}
            </Button>
            <Button variant="ghost" onClick={() => router.push('/')}>
              {host.t('common.back')}
            </Button>
          </div>
        </div>
      </Card>

      <Card title={host.t('settings.title')}>
        <div className="mads-stack">
          {transferError ? (
            <Alert tone="error" title={host.t('errors.E-SET-001')}>
              <p>{host.t('settings.title')}</p>
            </Alert>
          ) : null}
          <p>{host.t('settings.subtitle')}</p>
          <div className="mads-row">
            <Button
              variant="secondary"
              onClick={() => {
                const blob = new Blob([exportSettings(host.prefs)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const anchor = window.document.createElement('a');
                anchor.href = url;
                anchor.download = 'microapp-settings.json';
                anchor.click();
                setTimeout(() => URL.revokeObjectURL(url), 2000);
              }}
            >
              {host.t('common.export')}
            </Button>
            <label className="mads-button mads-button--secondary mads-button--sm">
              {host.t('common.import')}
              <input
                type="file"
                accept="application/json,.json"
                className="mads-visually-hidden"
                aria-label={host.t('common.import')}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  setTransferError(null);
                  void file.text().then((text) => {
                    let payload: unknown;
                    try {
                      payload = JSON.parse(text) as unknown;
                    } catch {
                      setTransferError('E-SET-001');
                      return;
                    }
                    const result = parseSettingsImport(payload, host.prefs, host.locale);
                    if (!result.ok) {
                      setTransferError('E-SET-001');
                      return;
                    }
                    setPendingImport(result);
                  });
                  event.target.value = '';
                }}
              />
            </label>
          </div>
        </div>
      </Card>

      <ConfirmDialog
        open={pendingImport !== null}
        title={host.t('settings.title')}
        description={
          pendingImport
            ? pendingImport.diff.map((entry) => `${entry.field}: ${String(entry.from)} → ${String(entry.to)}`).join('\n')
            : undefined
        }
        confirmLabel={host.t('common.apply')}
        cancelLabel={host.t('common.cancel')}
        onClose={() => setPendingImport(null)}
        onConfirm={() => {
          const result = pendingImport;
          setPendingImport(null);
          if (result?.preferences) host.setPrefs(result.preferences);
        }}
      />

      <RecoverySheet open={recoveryOpen} onClose={() => setRecoveryOpen(false)} />
    </SettingsShell>
  );
}
