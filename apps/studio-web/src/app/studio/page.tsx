'use client';

/** Studio drafts: real `studio_project` rows with `draft` status. */

import { useCallback, useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import Link from 'next/link';
import { useHost } from '@/features/host/HostProvider';
import { createStudioProject, listRecentProjects, type StudioProject } from '@/db/repositories/studio';

export default function StudioPage(): ReactElement {
  const host = useHost();
  const [drafts, setDrafts] = useState<StudioProject[]>([]);
  const [name, setName] = useState('');

  const refresh = useCallback(async (): Promise<void> => {
    if (!host.db || !host.workspace) return;
    setDrafts(await listRecentProjects(host.db, host.workspace.id, 50));
  }, [host.db, host.workspace]);

  useEffect(() => {
    void Promise.resolve().then(refresh);
  }, [refresh]);

  const create = async (): Promise<void> => {
    if (!host.db || !host.workspace || name.trim().length === 0) return;
    await createStudioProject(host.db, { workspaceId: host.workspace.id, name: name.trim() });
    await host.audit('studio.project.create', name.trim());
    setName('');
    await refresh();
  };

  return (
    <main id="mads-main" className="screen">
      <div className="screen-header">
        <h1>{host.t('nav.studio')}</h1>
        <Link className="button" href="/">
          {host.t('common.back')}
        </Link>
      </div>
      <p role="status">Editor visual dan AI tersedia pada fase 2–3. Draft project sudah dapat dibuat sekarang.</p>

      <section className="card stack-md" aria-label="Draft baru">
        <label className="field">
          <span>Nama project</span>
          <input type="text" value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <button type="button" className="button" onClick={() => void create()} disabled={name.trim().length === 0}>
          {host.t('common.save')}
        </button>
      </section>

      <ul className="stack-md">
        {drafts.map((draft) => (
          <li key={draft.id} className="card">
            <strong>{draft.name}</strong>
            <p>
              {draft.status} · rev {draft.revision}
            </p>
            <Link className="button" href={`/studio/${draft.id}`}>
              Buka
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
