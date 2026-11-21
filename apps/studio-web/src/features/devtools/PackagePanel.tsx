'use client';

/**
 * Package inspector.
 *
 * Recomputes the SHA-256 of every stored `.mapp` and compares it to the manifest
 * `integrity.contentHash`. A mismatch is a real integrity signal, so it renders as
 * a danger badge rather than a warning.
 */

import { useCallback, useEffect, useState, type ReactElement } from 'react';
import { Badge, Button, Card } from '@microapp/ui-kit';
import { useHost } from '@/features/host/HostProvider';
import { sha256Hex } from '@/lib/bytes';

interface Row {
  appId: string;
  version: string;
  digest: string | null;
  matches: boolean | null;
  bytes: number;
}

export function PackagePanel(): ReactElement {
  const host = useHost();
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setBusy(true);
    try {
      const next: Row[] = [];
      for (const app of host.apps) {
        let declared: string | null = null;
        try {
          const manifest = JSON.parse(app.manifestJson) as { integrity?: { contentHash?: string } };
          declared = manifest.integrity?.contentHash ?? null;
        } catch {
          declared = null;
        }
        const bytes = await host.exportPackageBytes(app.id);
        const digest = bytes ? await sha256Hex(bytes) : null;
        next.push({
          appId: app.appId,
          version: app.version,
          digest,
          matches: declared && digest ? declared.toLowerCase() === digest.toLowerCase() : null,
          bytes: bytes?.byteLength ?? 0,
        });
      }
      setRows(next);
    } finally {
      setBusy(false);
    }
  }, [host]);

  useEffect(() => {
    void Promise.resolve().then(() => refresh());
  }, [refresh]);

  return (
    <Card title={host.t('settings.dev.packages')}>
      <div className="mads-stack">
        <Button size="sm" variant="secondary" onClick={() => void refresh()} loading={busy}>
          {host.t('settings.dev.refresh')}
        </Button>
        <ul role="list">
          {rows.map((row) => (
            <li key={`${row.appId}-${row.version}`}>
              <code>{row.appId}</code> v{row.version} · {row.bytes} B ·{' '}
              {row.matches === null ? (
                <Badge tone="neutral">{row.digest ? '—' : host.t('settings.dev.packages')}</Badge>
              ) : row.matches ? (
                <Badge tone="success">sha256</Badge>
              ) : (
                <Badge tone="danger">{host.t('settings.dev.digestMismatch')}</Badge>
              )}
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
