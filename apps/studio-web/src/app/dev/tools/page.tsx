'use client';

/** Developer tools: local-only diagnostics, no network and no payload values. */

import type { ReactElement } from 'react';
import Link from 'next/link';
import { useHost } from '@/features/host/HostProvider';

export default function DevToolsPage(): ReactElement {
  const host = useHost();
  return (
    <main id="mads-main" className="screen">
      <div className="screen-header">
        <h1>Dev tools</h1>
        <Link className="button" href="/">
          {host.t('common.back')}
        </Link>
      </div>
      <dl className="card">
        <dt>Host phase</dt>
        <dd>{host.phase}</dd>
        <dt>Storage</dt>
        <dd>{host.storage ?? '—'}</dd>
        <dt>Installed apps</dt>
        <dd>{host.apps.length}</dd>
        <dt>Database</dt>
        <dd>{host.db ? 'worker connected' : 'not connected'}</dd>
      </dl>
      <p role="status">Metrik runtime dan inspector SQL tersedia pada fase 2. Panel ini tidak mengirim data ke jaringan.</p>
    </main>
  );
}
