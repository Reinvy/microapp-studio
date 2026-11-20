'use client';

/** Registry sources. Publishing and remote installs arrive in phase 4. */

import { useCallback, useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import Link from 'next/link';
import { useHost } from '@/features/host/HostProvider';
import { uuidv7 } from '@/db/ids';

interface SourceRow {
  id: string;
  name: string;
  url: string;
  kind: string;
  trust_level: string;
  enabled: number;
}

export default function RegistryPage(): ReactElement {
  const host = useHost();
  const [sources, setSources] = useState<SourceRow[]>([]);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [keyFingerprint, setKeyFingerprint] = useState('');

  const refresh = useCallback(async (): Promise<void> => {
    if (!host.db || !host.workspace) return;
    setSources(
      await host.db.select<SourceRow>(
        'SELECT id, name, url, kind, trust_level, enabled FROM registry_sources WHERE workspace_id = ? ORDER BY priority',
        [host.workspace.id],
      ),
    );
  }, [host.db, host.workspace]);

  useEffect(() => {
    void Promise.resolve().then(refresh);
  }, [refresh]);

  const addSource = async (): Promise<void> => {
    if (!host.db || !host.workspace) return;
    await host.db.exec(
      `INSERT INTO registry_sources
         (id, workspace_id, name, url, kind, trust_level, public_signing_key, key_fingerprint, cache_ttl_s, priority, enabled)
       VALUES (?, ?, ?, ?, 'http', 'community', zeroblob(32), ?, 86400, 100, 1)`,
      [uuidv7(), host.workspace.id, name, url, keyFingerprint],
    );
    await host.audit('registry.source.add', url);
    setName('');
    setUrl('');
    setKeyFingerprint('');
    await refresh();
  };

  return (
    <main id="mads-main" className="screen">
      <div className="screen-header">
        <h1>{host.t('nav.registry')}</h1>
        <Link className="button" href="/">
          {host.t('common.back')}
        </Link>
      </div>
      <p role="status">Instalasi dari registry dan publishing tersedia pada fase 4. Sumber dapat didaftarkan sekarang.</p>

      <ul className="stack-md">
        {sources.map((source) => (
          <li key={source.id} className="card">
            <strong>{source.name}</strong> <span>{source.url}</span>
            <p>
              {source.kind} · {source.trust_level} · {source.enabled === 1 ? 'aktif' : 'nonaktif'}
            </p>
          </li>
        ))}
      </ul>

      <section className="card stack-md" aria-label="Tambah sumber registry">
        <label className="field">
          <span>Nama</span>
          <input type="text" value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="field">
          <span>URL index</span>
          <input type="url" value={url} onChange={(event) => setUrl(event.target.value)} />
        </label>
        <label className="field">
          <span>Fingerprint kunci registry</span>
          <input
            type="text"
            value={keyFingerprint}
            onChange={(event) => setKeyFingerprint(event.target.value)}
            spellCheck={false}
          />
        </label>
        <button type="button" className="button" onClick={() => void addSource()} disabled={!name || !url || keyFingerprint.length < 32}>
          {host.t('common.save')}
        </button>
      </section>
    </main>
  );
}
