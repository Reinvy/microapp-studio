'use client';

/**
 * Builder screen.
 *
 * Owns the document history, autosave, selection, and every mutation. The palette,
 * canvas, layer tree, and inspector are presentational and call back here, so a
 * single labelled action per edit is what lands in the undo stack.
 *
 * Recovery: a corrupt stored document renders `E-STUDIO-001` with **Kembali ke
 * Home** and **Ekspor JSON**; the stored copy is never overwritten until the user
 * edits a valid document again.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Badge, Button, Card, ConfirmDialog, RadioGroup } from '@microapp/ui-kit';
import { useHost } from '@/features/host/HostProvider';
import { getStudioProject, saveStudioProject } from '@/db/repositories/studio';
import { indexRecord } from '@/db/repositories/search';
import { applyResponsive, countNodes, parseStudioDocument, findNode } from './document';
import { apply as applyHistory, canRedo, canUndo, createHistory, current, redo, undo, type History } from './history';
import { AutosaveQueue, type SaveStatus } from './autosave';
import { nodeFromPalette } from './palette';
import { flattenLayers, insertNode, moveNode, removeNode, updateProps } from './tree';
import { Canvas } from './Canvas';
import { Inspector, type InspectorTab } from './Inspector';
import { LayerTree } from './LayerTree';
import { Palette } from './Palette';
import { ShareSheet } from './ShareSheet';
import { STUDIO_DEVICES, type StudioDevice, type StudioDocument } from './types';

export interface BuilderScreenProps {
  projectId: string;
  /** Swaps to the sandboxed preview without losing the current document. */
  onOpenPreview?: (document: StudioDocument) => void;
}

type LoadState =
  | { status: 'loading' }
  | { status: 'invalid'; message: string; raw: unknown }
  | { status: 'ready'; document: StudioDocument };

export function BuilderScreen({ projectId, onOpenPreview }: BuilderScreenProps): ReactElement {
  const host = useHost();
  const router = useRouter();
  const [load, setLoad] = useState<LoadState>({ status: 'loading' });
  const [history, setHistory] = useState<History<StudioDocument> | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<InspectorTab>('content');
  const [advancedPalette, setAdvancedPalette] = useState(false);
  const [status, setStatus] = useState<SaveStatus>('saved');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<'palette' | 'layers' | 'inspector'>('palette');
  const autosaveRef = useRef<AutosaveQueue<StudioDocument> | null>(null);
  const revisionRef = useRef(0);

  const document = history ? current(history) : null;

  // --- load ---------------------------------------------------------------
  useEffect(() => {
    if (!host.db || !host.workspace) return;
    const db = host.db;
    const workspaceId = host.workspace.id;
    let cancelled = false;
    void (async () => {
      const project = await getStudioProject(db, workspaceId, projectId);
      if (cancelled) return;
      if (!project) {
        setLoad({ status: 'invalid', message: 'project not found', raw: null });
        return;
      }
      const parsed = parseStudioDocument(project.document);
      if (!parsed.ok || !parsed.document) {
        setLoad({ status: 'invalid', message: parsed.message ?? 'invalid', raw: project.document });
        return;
      }
      const recovered = AutosaveQueue.recover<StudioDocument>(projectId);
      let initial = parsed.document;
      if (recovered) {
        const recoveredParse = parseStudioDocument(recovered);
        if (recoveredParse.ok && recoveredParse.document && recoveredParse.document.version >= parsed.document.version) {
          initial = recoveredParse.document;
          setNotice(host.t('studio.saveStatusDirty'));
        }
      }
      revisionRef.current = project.revision;
      setHistory(createHistory(initial, 'load'));
      setLoad({ status: 'ready', document: initial });
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `host` is re-created each render; only its fields matter
  }, [host.db, host.t, host.workspace, projectId]);

  // --- autosave -----------------------------------------------------------
  useEffect(() => {
    if (!host.db || !host.workspace) return;
    const db = host.db;
    const workspaceId = host.workspace.id;
    const queue = new AutosaveQueue<StudioDocument>({
      projectId,
      save: async (next) => {
        const revision = await saveStudioProject(db, {
          workspaceId,
          projectId,
          document: next as unknown as Record<string, unknown>,
          revision: revisionRef.current,
          name: next.name,
        });
        revisionRef.current = revision;
        await indexRecord(db, {
          workspaceId,
          kind: 'project',
          refId: projectId,
          title: next.name,
          body: next.nodes[0]?.type ?? 'Stack',
        });
        return revision;
      },
      onStatus: (next, detail) => {
        setStatus(next);
        setSaveError(next === 'error' ? (detail?.code ?? 'E-STUDIO-002') : null);
      },
    });
    autosaveRef.current = queue;
    return () => {
      queue.dispose();
      autosaveRef.current = null;
    };
  }, [host.db, host.workspace, projectId]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent): void => {
      if (status === 'saved' || status === 'saving') return;
      void autosaveRef.current?.flush();
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [status]);

  const commit = useCallback(
    (label: string, next: StudioDocument) => {
      setHistory((previous) => {
        if (!previous) return previous;
        const updated = applyHistory(previous, label, next);
        if (updated !== previous) autosaveRef.current?.schedule(next);
        return updated;
      });
    },
    [],
  );

  const root = document?.nodes[0] ?? null;

  const mutateRoot = useCallback(
    (label: string, mutate: (rootNode: NonNullable<typeof root>) => NonNullable<typeof root>) => {
      if (!document || !root) return;
      try {
        const nextRoot = mutate(root);
        commit(label, { ...document, nodes: [nextRoot] });
      } catch {
        setNotice(host.t('errors.E-STUDIO-003'));
      }
    },
    // `host.t` is a stable translator for the active locale; `host` itself is
    // re-created every render, so depending on it would rebuild this callback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [commit, document, host.t, root],
  );

  const addNode = useCallback(
    (type: string) => {
      if (!root) return;
      const node = nodeFromPalette(type, root);
      if (!node) return;
      const selected = selectedId ? findNode(root, selectedId) : null;
      const container = selected && (selected.children !== undefined || selected.type === 'Stack') ? selected : root;
      const index = (container.children ?? []).length;
      mutateRoot(`add:${type}`, (rootNode) => insertNode(rootNode, container.id, index, node));
      setSelectedId(node.id);
    },
    [mutateRoot, root, selectedId],
  );

  const handleDropComponent = useCallback(
    (target: { parentId: string; index: number }, type: string) => {
      if (!root) return;
      const node = nodeFromPalette(type, root);
      if (!node) return;
      mutateRoot(`add:${type}`, (rootNode) => insertNode(rootNode, target.parentId, target.index, node));
      setSelectedId(node.id);
    },
    [mutateRoot, root],
  );

  const handleMoveNode = useCallback(
    (target: { parentId: string; index: number }, id: string) => {
      mutateRoot(`move:${id}`, (rootNode) => moveNode(rootNode, id, target.parentId, target.index));
    },
    [mutateRoot],
  );

  const reorder = useCallback(
    (id: string, direction: -1 | 1) => {
      mutateRoot('reorder', (rootNode) => {
        const layers = flattenLayers(rootNode);
        const entry = layers.find((layer) => layer.node.id === id);
        if (!entry || !entry.parentId) return rootNode;
        const parent = findNode(rootNode, entry.parentId);
        if (!parent) return rootNode;
        const siblings = parent.children ?? [];
        const index = siblings.findIndex((child) => child.id === id);
        const nextIndex = index + direction;
        if (nextIndex < 0 || nextIndex >= siblings.length) return rootNode;
        return moveNode(rootNode, id, entry.parentId, nextIndex);
      });
    },
    [mutateRoot],
  );

  const deleteNode = useCallback(
    (id: string) => {
      if (!root || id === root.id) return;
      mutateRoot('delete', (rootNode) => removeNode(rootNode, id));
      setSelectedId(null);
    },
    [mutateRoot, root],
  );

  // --- shortcuts ----------------------------------------------------------
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const mod = event.metaKey || event.ctrlKey;
      if (mod && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        setHistory((previous) => {
          if (!previous) return previous;
          const next = event.shiftKey ? redo(previous) : undo(previous);
          if (next !== previous) autosaveRef.current?.schedule(current(next));
          return next;
        });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const layers = useMemo(() => (root ? flattenLayers(root) : []), [root]);
  const nodeCount = root ? countNodes(root) : 0;
  const previewDoc = useMemo(
    () => (document ? applyResponsive(document, document.device) : null),
    [document],
  );

  const backHome = useCallback(async () => {
    await autosaveRef.current?.flush();
    router.push('/');
  }, [router]);

  if (load.status === 'loading' || !history || !document) {
    return (
      <div className="mads-page" aria-busy="true">
        <p role="status">{host.t('studio.saveStatusSaving')}</p>
      </div>
    );
  }

  if (load.status === 'invalid') {
    return (
      <div className="mads-page">
        <Alert tone="error" title={host.t('errors.E-STUDIO-001')}>
          <div className="mads-stack">
            <p>{host.t('studio.invalidDocument')}</p>
            <div className="mads-row">
              <Button onClick={() => void backHome()}>{host.t('studio.backHome')}</Button>
              <Button
                variant="secondary"
                onClick={() => {
                  const blob = new Blob([JSON.stringify(load.raw, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const anchor = window.document.createElement('a');
                  anchor.href = url;
                  anchor.download = `${projectId}.json`;
                  anchor.click();
                  setTimeout(() => URL.revokeObjectURL(url), 2000);
                }}
              >
                {host.t('studio.exportRaw')}
              </Button>
            </div>
          </div>
        </Alert>
      </div>
    );
  }

  return (
    <div className="mads-page">
      <div className="mads-page__header">
        <div className="mads-row">
          <Button variant="ghost" size="sm" onClick={() => void backHome()}>
            {host.t('common.back')}
          </Button>
          <strong>{document.name}</strong>
          <Badge tone={status === 'error' ? 'danger' : status === 'saved' ? 'success' : 'info'}>
            {host.t(`studio.saveStatus${status.charAt(0).toUpperCase()}${status.slice(1)}`)}
          </Badge>
          <Badge tone="neutral">{nodeCount}</Badge>
        </div>
        <div className="mads-row">
          <Button
            size="sm"
            variant="secondary"
            disabled={!canUndo(history)}
            onClick={() => {
              const next = undo(history);
              setHistory(next);
              autosaveRef.current?.schedule(current(next));
            }}
          >
            {host.t('studio.undo')}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={!canRedo(history)}
            onClick={() => {
              const next = redo(history);
              setHistory(next);
              autosaveRef.current?.schedule(current(next));
            }}
          >
            {host.t('studio.redo')}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => onOpenPreview?.(document)}>
            {host.t('studio.preview')}
          </Button>
          <Button size="sm" onClick={() => setShareOpen(true)}>
            {host.t('studio.share')}
          </Button>
        </div>
      </div>

      {saveError ? (
        <Alert
          tone="error"
          title={host.t(`errors.${saveError}`)}
          actions={
            <Button size="sm" onClick={() => void autosaveRef.current?.flush()}>
              {host.t('studio.retrySave')}
            </Button>
          }
        >
          <p>{host.t('studio.saveStatusError')}</p>
        </Alert>
      ) : null}
      {notice ? (
        <Alert
          tone="warning"
          title={notice}
          actions={
            <Button size="sm" variant="ghost" onClick={() => setNotice(null)}>
              {host.t('common.dismiss')}
            </Button>
          }
        >
          <p>{notice}</p>
        </Alert>
      ) : null}

      <RadioGroup
        label={host.t('studio.deviceDesktop')}
        value={document.device}
        onChange={(value) => commit('device', { ...document, device: value as StudioDevice })}
        options={STUDIO_DEVICES.map((entry) => ({ value: entry.id, label: host.t(entry.labelKey) }))}
      />

      <div className="mads-grid" style={{ gridTemplateColumns: 'minmax(180px, 240px) minmax(0, 1fr) minmax(220px, 300px)' }}>
        <Card title={host.t('studio.palette')}>
          <Palette
            advanced={advancedPalette}
            onAdvancedChange={setAdvancedPalette}
            onAdd={addNode}
            disabled={host.ephemeral}
          />
        </Card>

        <div>
          <Canvas
            document={document}
            device={document.device}
            selectedId={selectedId}
            label={host.t('studio.title')}
            emptyTitle={host.t('studio.canvEmptyTitle')}
            emptyBody={host.t('studio.canvEmptyBody')}
            onSelect={setSelectedId}
            onDropComponent={handleDropComponent}
            onMoveNode={handleMoveNode}
            onEditText={(id, prop, value) => mutateRoot('edit-text', (rootNode) => updateProps(rootNode, id, { [prop]: value }))}
            onInvalidDrop={() => setNotice(host.t('errors.E-STUDIO-003'))}
          />
          {previewDoc ? (
            <p className="mads-visually-hidden">{String(previewDoc.nodes.length)}</p>
          ) : null}
        </div>

        <div className="mads-stack">
          <Card title={host.t('studio.layers')}>
            <LayerTree
              layers={layers}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onMove={reorder}
              onDelete={(id) => setConfirmDelete(id)}
              onDragStartNode={setSelectedId}
            />
          </Card>
          <Card title={host.t('studio.inspector')}>
            <Inspector
              node={selectedId && root ? (findNode(root, selectedId) ?? null) : null}
              tab={tab}
              onTabChange={setTab}
              onChangeProp={(prop, value) => {
                if (!selectedId) return;
                mutateRoot('prop', (rootNode) => updateProps(rootNode, selectedId, { [prop]: value }));
              }}
              onRemoveProp={(prop) => {
                if (!selectedId) return;
                mutateRoot('prop', (rootNode) => updateProps(rootNode, selectedId, { [prop]: undefined }));
              }}
              advancedJson={host.prefs.advancedJson}
              documentJson={JSON.stringify(document, null, 2)}
            />
          </Card>
        </div>
      </div>

      <div className="mads-row">
        <Button size="sm" variant={mobileTab === 'palette' ? 'primary' : 'secondary'} onClick={() => setMobileTab('palette')}>
          {host.t('studio.addNode')}
        </Button>
        <Button size="sm" variant={mobileTab === 'layers' ? 'primary' : 'secondary'} onClick={() => setMobileTab('layers')}>
          {host.t('studio.layers')}
        </Button>
        <Button size="sm" variant={mobileTab === 'inspector' ? 'primary' : 'secondary'} onClick={() => setMobileTab('inspector')}>
          {host.t('studio.inspector')}
        </Button>
      </div>

      <ConfirmDialog
        open={confirmDelete !== null}
        tone="danger"
        title={host.t('studio.deleteNode')}
        confirmLabel={host.t('common.delete')}
        cancelLabel={host.t('common.cancel')}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete) deleteNode(confirmDelete);
          setConfirmDelete(null);
        }}
      />

      <ShareSheet
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        projectId={projectId}
        document={document}
        onShareStateChange={(state) => {
          if (state.kind === 'saved') setStatus(state.status);
        }}
      />
    </div>
  );
}
