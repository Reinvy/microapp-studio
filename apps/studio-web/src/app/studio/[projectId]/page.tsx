'use client';

/** Draft project detail: shows the stored document and status. */

import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useHost } from '@/features/host/HostProvider';

export default function StudioProjectPage(): ReactElement {
  const host = useHost();
  const params = useParams<{ projectId: string }>();
  const projectId = typeof params?.projectId === 'string' ? params.projectId : '';
  const [row, setRow] = useState<{ name: string; status: string; document_json: string; revision: number } | null>(null);

  useEffect(() => {
    if (!host.db || !host.workspace || !projectId) return;
    void (async () => {
      const rows = await host.db!.select<{ name: string; status: string; document_json: string; revision: number }>(
        'SELECT name, status, document_json, revision FROM studio_project WHERE id = ? AND workspace_id = ?',
        [projectId, host.workspace!.id],
      );
      setRow(rows[0] ?? null);
    })();
  }, [host.db, host.workspace, projectId]);

  return (
    <main id="mads-main" className="screen">
      <div className="screen-header">
        <h1>{row?.name ?? host.t('common.loading')}</h1>
        <Link className="button" href="/studio">
          {host.t('common.back')}
        </Link>
      </div>
      {row ? (
        <div className="card">
          <p>
            Status: {row.status} · revisi {row.revision}
          </p>
          <pre>{row.document_json}</pre>
        </div>
      ) : (
        <p role="status">{host.t('common.loading')}</p>
      )}
    </main>
  );
}
