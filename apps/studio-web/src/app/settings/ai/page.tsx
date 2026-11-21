'use client';

/**
 * AI settings: BYOK endpoint, model, and key.
 *
 * The key is sealed into the vault (`features/ai/vault`), and only its last four
 * characters are mirrored into preferences for display. Reading it back requires
 * an unlocked vault, so the page exposes the wrap/unlock controls and never
 * renders the key itself.
 */

import { useCallback, useEffect, useState, type ReactElement } from 'react';
import { Alert, Badge, Button, Card, FieldError, TextField } from '@microapp/ui-kit';
import { useHost } from '@/features/host/HostProvider';
import { SettingsShell } from '@/features/settings/SettingsShell';
import { assertEndpoint } from '@/features/ai/client';
import { lockVault, saveAiKey, unlockVault } from '@/features/ai/vault';
import { vaultApi } from '@/features/identity/identityService';
import { activeKeyWrap } from '@/db/repositories/vault';

export default function AiSettingsPage(): ReactElement {
  const host = useHost();
  const [endpoint, setEndpoint] = useState(host.prefs.aiEndpoint);
  const [model, setModel] = useState(host.prefs.aiModel);
  const [apiKey, setApiKey] = useState('');
  const [pin, setPin] = useState('');
  const [wrapped, setWrapped] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!host.db || !host.workspace) return;
    const wrap = await activeKeyWrap(host.db, host.workspace.id);
    setWrapped(wrap !== null);
    if (host.identityService) {
      try {
        const status = await vaultApi(host.identityService).status();
        setUnlocked(status.unlocked);
      } catch {
        setUnlocked(false);
      }
    }
  }, [host.db, host.identityService, host.workspace]);

  useEffect(() => {
    void Promise.resolve().then(() => refresh());
  }, [refresh]);

  const save = useCallback(async () => {
    setError(null);
    setNotice(null);
    if (!host.db || !host.workspace || !host.identityService) {
      setError('E-CREATE-002');
      return;
    }
    try {
      const url = assertEndpoint(endpoint, { allowLocalHttp: process.env.NODE_ENV !== 'production' });
      setBusy(true);
      const { last4 } = await saveAiKey({
        db: host.db,
        workspaceId: host.workspace.id,
        service: host.identityService,
        apiKey,
        pin,
      });
      host.setPrefs({ aiEndpoint: url.toString(), aiModel: model.trim(), aiKeyLast4: last4 });
      setApiKey('');
      await host.audit('settings.ai.key.save');
      setNotice(host.t('settings.ai.keyMasked', { last4 }));
      await refresh();
    } catch (failure) {
      const message = failure instanceof Error ? failure.message : '';
      setError(/^E-[A-Z]+-\d{3}/.test(message) ? message.slice(0, 10) : 'E-CREATE-002');
    } finally {
      setBusy(false);
    }
  }, [apiKey, endpoint, host, model, pin, refresh]);

  return (
    <SettingsShell title={host.t('settings.groups.ai.title')} description={host.t('settings.groups.ai.description')}>
      {error ? (
        <Alert tone="error" title={host.t(`errors.${error}`)}>
          <p>{host.t('settings.ai.apiKey')}</p>
        </Alert>
      ) : null}
      {notice ? (
        <Alert tone="success" title={notice}>
          <p>{host.t('settings.ai.keyMasked', { last4: host.prefs.aiKeyLast4 })}</p>
        </Alert>
      ) : null}

      <Card title={host.t('settings.groups.ai.title')}>
        <div className="mads-stack">
          <TextField
            label={host.t('settings.ai.endpoint')}
            value={endpoint}
            onChange={setEndpoint}
            placeholder="https://api.example.com/v1"
            description="https://"
          />
          <TextField label={host.t('settings.ai.model')} value={model} onChange={setModel} placeholder="gpt-4o-mini" />
          <TextField
            label={host.t('settings.ai.apiKey')}
            type="password"
            value={apiKey}
            onChange={setApiKey}
            description={host.prefs.aiKeyLast4 ? host.t('settings.ai.keyMasked', { last4: host.prefs.aiKeyLast4 }) : undefined}
          />
          <TextField
            label={host.t('settings.ai.pinTitle')}
            type="password"
            value={pin}
            onChange={setPin}
            description={host.t('settings.ai.pinHint')}
          />
          <div className="mads-row">
            <Button onClick={() => void save()} loading={busy}>
              {host.t('settings.ai.saveKey')}
            </Button>
            <Badge tone={wrapped ? 'success' : 'warning'}>
              {wrapped ? host.t('settings.ai.keyMasked', { last4: host.prefs.aiKeyLast4 || '••••' }) : host.t('settings.ai.vaultLocked')}
            </Badge>
          </div>
          <div className="mads-row">
            <Button
              variant="secondary"
              disabled={!wrapped || pin.length < 6}
              onClick={() => {
                if (!host.db || !host.workspace || !host.identityService) return;
                void unlockVault(host.db, host.workspace.id, host.identityService, pin)
                  .then(() => {
                    setNotice(host.t('settings.ai.unlock'));
                    return refresh();
                  })
                  .catch(() => setError('E-AUTH-001'));
              }}
            >
              {host.t('settings.ai.unlock')}
            </Button>
            <Button
              variant="ghost"
              disabled={!unlocked}
              onClick={() => {
                if (!host.identityService) return;
                void lockVault(host.identityService).then(() => refresh());
              }}
            >
              {host.t('settings.ai.vaultLocked')}
            </Button>
          </div>
          {!wrapped ? <FieldError id="ai-pin-hint">{host.t('settings.ai.pinHint')}</FieldError> : null}
        </div>
      </Card>
    </SettingsShell>
  );
}
