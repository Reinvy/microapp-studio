'use client';

/** Admin console is fail-closed on the local host: it belongs to the server. */

import type { ReactElement } from 'react';
import Link from 'next/link';
import { useHost } from '@/features/host/HostProvider';

export default function AdminPage(): ReactElement {
  const host = useHost();
  return (
    <main id="mads-main" className="screen">
      <div className="screen-header">
        <h1>Admin</h1>
        <Link className="button" href="/">
          {host.t('common.back')}
        </Link>
      </div>
      <p role="alert" className="alert alert-error">
        Konsol admin hanya tersedia pada server self-host setelah autentikasi (fase 5). Host lokal menolak akses.
      </p>
    </main>
  );
}
