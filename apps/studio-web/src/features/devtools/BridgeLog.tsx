'use client';

/**
 * Log panels (bridge + errors) backed by `dev_log`.
 *
 * Rows are already redacted before insert; the panels re-apply the redactor when
 * rendering so a legacy row cannot leak either. Export produces a JSON file with
 * no payloads — method, result, code, and duration only.
 */

import { useCallback, useEffect, useState, type ReactElement } from 'react';
import { Badge, Button, Card, Select } from '@microapp/ui-kit';
import { useHost } from '@/features/host/HostProvider';
import { clearDevLog, listDevLog, type DevLogEntry, type DevLogLevel } from '@/db/repositories/devLog';
import { redactText } from './Redaction';

const LEVELS: DevLogLevel[] = ['debug', 'info', 'warn', 'error'];

export interface LogPanelProps {
  kind: 'bridge' | 'error';
  title: string;
}

export function LogPanel({ kind, title }: LogPanelProps): ReactElement {
  const host = useHost();
  const [entries, setEntries] = useState<DevLogEntry[]>([]);
  const [level, setLevel] = useState<DevLogLevel | 'all'>('all');

  const refresh = useCallback(async () => {
    if (!host.db || !host.workspace) return;
    const rows = await listDevLog(host.db, host.workspace.id, {
      kind,
      ...(level === 'all' ? {} : { level }),
      limit: 200,
    });
    setEntries(rows);
  }, [host.db, host.workspace, kind, level]);

  useEffect(() => {
    void Promise.resolve().then(() => refresh());
  }, [refresh]);

  const exportJson = useCallback(() => {
    const payload = entries.map((entry) => ({
      kind: entry.kind,
      level: entry.level,
      code: entry.code,
      message: redactText(entry.message),
      appId: entry.appId,
      createdAtMs: entry.createdAtMs,
    }));
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = window.document.createElement('a');
    anchor.href = url;
    anchor.download = `devtools-${kind}-${Date.now()}.json`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }, [entries, kind]);

  return (
    <Card title={title}>
      <div className="mads-stack">
        <div className="mads-row">
          <Select
            label={host.t('settings.dev.flags')}
            value={level}
            onChange={(value) => setLevel(value as DevLogLevel | 'all')}
            options={[
              { value: 'all', label: host.t('home.filterAll') },
              ...LEVELS.map((entry) => ({ value: entry, label: entry })),
            ]}
          />
          <Button size="sm" variant="secondary" onClick={() => void refresh()}>
            {host.t('settings.dev.refresh')}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              if (!host.db || !host.workspace) return;
              void clearDevLog(host.db, host.workspace.id, kind).then(refresh);
            }}
          >
            {host.t('settings.dev.clear')}
          </Button>
          <Button size="sm" variant="ghost" onClick={exportJson} disabled={entries.length === 0}>
            {host.t('settings.dev.export')}
          </Button>
        </div>

        {entries.length === 0 ? (
          <p>{host.t('settings.dev.enabled')}</p>
        ) : (
          <ul role="list">
            {entries.map((entry) => (
              <li key={entry.id}>
                <Badge tone={entry.level === 'error' ? 'danger' : entry.level === 'warn' ? 'warning' : 'info'}>
                  {entry.level}
                </Badge>{' '}
                {entry.code ? <code>{entry.code}</code> : null} {redactText(entry.message)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

export function BridgeLog(): ReactElement {
  const host = useHost();
  return <LogPanel kind="bridge" title={host.t('settings.dev.bridgeLog')} />;
}

export function ErrorLog(): ReactElement {
  const host = useHost();
  return <LogPanel kind="error" title={host.t('settings.dev.errorLog')} />;
}
