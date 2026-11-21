'use client';

/**
 * Update banner: compares installed versions against the *cached* static index.
 * It never fetches — an update is only offered, never installed, and the user
 * has to open the package detail to act on it.
 */

import { useEffect, useState, type ReactElement } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@microapp/ui-kit';
import { useHost } from '@/features/host/HostProvider';
import { cachedUpdates, listSources, type AvailableUpdate } from '@/features/packages/indexSource';

export function UpdateBanner(): ReactElement | null {
  const host = useHost();
  const router = useRouter();
  const [updates, setUpdates] = useState<AvailableUpdate[]>([]);

  const db = host.db;
  const workspace = host.workspace;
  const installed = host.apps;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!db || !workspace || installed.length === 0) {
        if (!cancelled) setUpdates([]);
        return;
      }
      try {
        const sources = await listSources(db, workspace.id);
        if (cancelled) return;
        setUpdates(cachedUpdates(sources, installed));
      } catch {
        if (!cancelled) setUpdates([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [db, installed, workspace]);

  if (updates.length === 0) return null;
  const first = updates[0];

  return (
    <div className="mads-cluster" role="region" aria-label={host.t('home.updateCardTitle')}>
      <div>
        <strong>{host.t('home.updateCardTitle')}</strong>
        <p>{host.t('home.updateCardBody', { current: first.currentVersion, next: first.nextVersion })}</p>
        <p>
          {first.appId} {first.currentVersion} → {first.nextVersion}
        </p>
      </div>
      <div className="mads-row">
        <Button size="sm" onClick={() => router.push('/packages')}>
          {host.t('home.updateCardReview')}
        </Button>
      </div>
    </div>
  );
}
