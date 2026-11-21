'use client';

/**
 * **Sumber** tab: static package index sources.
 *
 * Everything here is a user action. The list is read from the local cache, a
 * refresh is the only network call, and the form validates the URL (`https:`)
 * and the 32-byte public key locally before anything is fetched or stored.
 */

import { useCallback, useEffect, useState, type ReactElement } from 'react';
import {
  Alert,
  Button,
  Card,
  DataTable,
  EmptyState,
  FieldError,
  Stack,
  TextField,
} from '@microapp/ui-kit';
import type { WorkerHostDb } from '@/db/client';
import { useHost } from '@/features/host/HostProvider';
import { addSource, listSources, refreshSource, type IndexSource } from './indexSource';
import { packageErrorCode, validateSourceDraft } from './importFlow';
import { truncateMiddle } from './download';

interface SourceFieldError {
  field: 'url' | 'key';
  code: string;
}

interface Notice {
  tone: 'success' | 'warning' | 'danger';
  text: string;
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export interface SourcesPanelProps {
  /** Called after a source is added or refreshed so cached updates re-evaluate. */
  onSourcesChanged?: () => void;
}

export function SourcesPanel({ onSourcesChanged }: SourcesPanelProps): ReactElement {
  const host = useHost();
  const t = host.t;

  const [sources, setSources] = useState<IndexSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [publicKeyHex, setPublicKeyHex] = useState('');
  const [fieldError, setFieldError] = useState<SourceFieldError | null>(null);
  const [adding, setAdding] = useState(false);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const db = host.db;
  const workspace = host.workspace;

  const reload = useCallback(
    async (database: WorkerHostDb, workspaceId: string): Promise<void> => {
      setSources(await listSources(database, workspaceId));
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!db || !workspace) {
        if (!cancelled) setLoading(false);
        return;
      }
      if (!cancelled) setLoading(true);
      try {
        const list = await listSources(db, workspace.id);
        if (!cancelled) {
          setSources(list);
          setLoadError(null);
        }
      } catch (error) {
        if (!cancelled) setLoadError(packageErrorCode(error, 'E-DATA-001'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [db, workspace]);

  const submit = useCallback(async () => {
    const validation = validateSourceDraft({ name, url, publicKeyHex });
    if (!validation.ok) {
      setFieldError({ field: validation.field, code: validation.code });
      return;
    }
    if (!db || !workspace) {
      setFieldError({ field: 'url', code: 'E-SHELL-001' });
      return;
    }
    setFieldError(null);
    setAdding(true);
    setNotice(null);
    try {
      await addSource(db, {
        workspaceId: workspace.id,
        name: validation.name,
        url: validation.url,
        publicKeyHex: validation.publicKeyHex,
      });
      await host.audit('registry.source.add', validation.url);
      await reload(db, workspace.id);
      setNotice({ tone: 'success', text: t('packages.sourceAdded', { name: validation.name }) });
      setName('');
      setUrl('');
      setPublicKeyHex('');
      onSourcesChanged?.();
    } catch (error) {
      const code = packageErrorCode(error, 'E-PACK-001');
      setFieldError({ field: code === 'E-PACK-002' ? 'key' : 'url', code });
    } finally {
      setAdding(false);
    }
  }, [db, host, name, onSourcesChanged, publicKeyHex, reload, t, url, workspace]);

  const refresh = useCallback(
    async (source: IndexSource) => {
      if (!db || !workspace) return;
      setRefreshingId(source.id);
      setNotice(null);
      try {
        const result = await refreshSource(db, source);
        await reload(db, workspace.id);
        const count = result.index?.apps.length ?? 0;
        setNotice(
          result.unavailable.length > 0
            ? {
                tone: 'warning',
                text: `${t('packages.sourceEntries', { count })} · ${t('packages.sourceUnavailable', {
                  count: result.unavailable.length,
                })}`,
              }
            : { tone: 'success', text: t('packages.sourceEntries', { count }) },
        );
        onSourcesChanged?.();
      } catch (error) {
        setNotice({ tone: 'danger', text: t(`errors.${packageErrorCode(error, 'E-PACK-001')}`) });
      } finally {
        setRefreshingId(null);
      }
    },
    [db, onSourcesChanged, reload, t, workspace],
  );

  const lastFetched = (source: IndexSource): string => {
    if (source.lastFetchedAtMs === null) return t('packages.sourceNever');
    return new Intl.DateTimeFormat(host.locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(source.lastFetchedAtMs);
  };

  return (
    <Stack gap="md">
      {loadError ? <Alert tone="danger">{t(`errors.${loadError}`)}</Alert> : null}
      {notice ? <Alert tone={notice.tone}>{notice.text}</Alert> : null}

      {!loading && sources.length === 0 ? (
        <EmptyState title={t('packages.sourceEmpty')} description={t('packages.sourceUrl')} />
      ) : (
        <DataTable
          caption={t('packages.tabSources')}
          columns={[
            { key: 'name', label: t('packages.sourceName') },
            { key: 'host', label: t('packages.sourceHost') },
            { key: 'key', label: t('packages.sourceFingerprint') },
            { key: 'fetched', label: t('packages.sourceLastFetched') },
            { key: 'entries', label: t('packages.sourceEntriesLabel') },
            { key: 'action', label: t('packages.sourceRefresh') },
          ]}
          rows={sources.map((source) => ({
            name: <strong>{source.name}</strong>,
            host: hostOf(source.url),
            key: (
              <code title={source.keyFingerprint}>{truncateMiddle(source.keyFingerprint, 24, 12)}</code>
            ),
            fetched: lastFetched(source),
            entries: t('packages.sourceEntries', { count: source.cachedIndex?.apps.length ?? 0 }),
            action: (
              <Button
                size="sm"
                variant="secondary"
                loading={refreshingId === source.id}
                onClick={() => void refresh(source)}
              >
                {t('packages.sourceRefresh')}
              </Button>
            ),
          }))}
        />
      )}

      <Card title={t('packages.sourceAdd')}>
        <Stack gap="md">
          <TextField
            label={t('packages.sourceUrl')}
            value={url}
            onChange={(value) => {
              setUrl(value);
              setFieldError(null);
            }}
            type="url"
            placeholder="https://"
            autoComplete="off"
          />
          {fieldError?.field === 'url' ? (
            <FieldError id="source-url-error">{t(`errors.${fieldError.code}`)}</FieldError>
          ) : null}
          <TextField
            label={t('packages.sourceKey')}
            value={publicKeyHex}
            onChange={(value) => {
              setPublicKeyHex(value);
              setFieldError(null);
            }}
            placeholder="ed25519"
            autoComplete="off"
            description={t('packages.keysHint')}
          />
          {fieldError?.field === 'key' ? (
            <FieldError id="source-key-error">{t(`errors.${fieldError.code}`)}</FieldError>
          ) : null}
          <TextField
            label={t('packages.sourceName')}
            value={name}
            onChange={(value) => {
              setName(value);
              setFieldError(null);
            }}
            autoComplete="off"
          />
          <div className="mads-row mads-row--end">
            <Button onClick={() => void submit()} loading={adding}>
              {t('packages.sourceAdd')}
            </Button>
          </div>
        </Stack>
      </Card>
    </Stack>
  );
}
