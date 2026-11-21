'use client';

/**
 * Create (SCR-04).
 *
 * `?mode=ai|blank|template`. Template mode hands off to the gallery; the other
 * two create a draft through the shared `createDraft` and navigate straight to
 * the builder. `Esc` returns Home once a draft exists (the draft is already
 * persisted, so nothing is lost).
 */

import { Suspense, useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Skeleton, TabBar } from '@microapp/ui-kit';
import { useHost } from '@/features/host/HostProvider';
import { AiCreate } from '@/features/create/AiCreate';
import { BlankCreate } from '@/features/create/BlankCreate';
import { blankDocument } from '@/features/studio/document';
import { documentId } from '@/features/studio/document';
import { markCelebrated, nextDraftName, shouldCelebrate } from '@/features/create/createDraft';
import { createDraft } from '@/features/create/createDraft';
import type { BlankLayout } from '@/features/studio/types';
import type { AiPlan } from '@/features/ai/client';
import type { MuipNode } from '@microapp/runtime-web';

type Mode = 'ai' | 'blank';

function modeFromParam(value: string | null): Mode {
  return value === 'ai' ? 'ai' : 'blank';
}

function CreateScreen(): ReactElement {
  const host = useHost();
  const router = useRouter();
  const params = useSearchParams();
  const initial = modeFromParam(params?.get('mode') ?? null);
  const [mode, setMode] = useState<Mode>(initial);
  const [creating, setCreating] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const createdRef = useRef(false);

  const navigateToBuilder = useCallback(
    (projectId: string) => {
      createdRef.current = true;
      router.push(`/studio/${projectId}`);
    },
    [router],
  );

  const finish = useCallback(async (root: MuipNode, permissions?: string[], dataSample?: Record<string, unknown>) => {
    if (!host.db || !host.workspace) return;
    setCreating(true);
    try {
      const base = host.locale === 'id-ID' ? 'Micro-app Baru' : 'New Micro-app';
      const name = await nextDraftName(host.db, host.workspace.id, base);
      const project = await createDraft({
        db: host.db,
        workspaceId: host.workspace.id,
        name,
        root,
        permissions,
        dataSample,
      });
      host.setPrefs({ lastCreateMode: mode });
      void host.requestPersist();
      if (shouldCelebrate()) {
        setCelebrating(true);
        markCelebrated();
        window.setTimeout(() => setCelebrating(false), 800);
      }
      navigateToBuilder(project.id);
    } finally {
      setCreating(false);
    }
  }, [host, mode, navigateToBuilder]);

  const createBlank = useCallback(
    async (layout: BlankLayout) => {
      const draft = blankDocument(layout, 'draft', documentId(`blank-${Date.now().toString(36)}`));
      await finish(draft.nodes[0], draft.permissions, draft.dataSample);
    },
    [finish],
  );

  const createFromPlan = useCallback(
    async ({ plan, root }: { plan: AiPlan; root: MuipNode | null }) => {
      if (!root) return;
      await finish(root, ['storage.app'], { plan: plan.screens });
    },
    [finish],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return;
      // A created draft is already saved, so Esc is a safe exit.
      if (createdRef.current || !creating) router.push('/');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [creating, router]);

  if (!host.ready || host.ephemeral) {
    return (
      <div className="mads-stack">
        <h1 className="mads-page__title">{host.t('create.title')}</h1>
        <p>{host.t('errors.E-SHELL-002')}</p>
        <div className="mads-row">
          <Button onClick={() => void host.refresh()}>{host.t('common.retry')}</Button>
          <Button variant="secondary" onClick={() => router.push('/settings/general')}>
            {host.t('nav.settings')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mads-page">
      <div className="mads-page__header">
        <h1 className="mads-page__title">{host.t('create.title')}</h1>
        <Button variant="ghost" onClick={() => router.push('/')}>
          {host.t('common.cancel')}
        </Button>
      </div>

      <TabBar
        label={host.t('create.title')}
        idPrefix="create-mode"
        tabs={[
          { id: 'ai', label: host.t('create.modeAi') },
          { id: 'blank', label: host.t('create.modeBlank') },
        ]}
        activeId={mode}
        onChange={(id) => {
          const next = modeFromParam(id);
          setMode(next);
          router.replace(`/create?mode=${next}`);
        }}
      />

      {mode === 'ai' ? (
        <AiCreate
          creating={creating}
          onUseTemplate={() => router.push('/templates')}
          onBlank={() => setMode('blank')}
          onOpenAiSettings={() => router.push('/settings/ai')}
          onCreate={(input) => void createFromPlan(input)}
        />
      ) : (
        <BlankCreate creating={creating} onCreate={(layout) => void createBlank(layout)} />
      )}

      {celebrating ? (
        <div role="status" aria-live="polite" className="mads-card">
          {host.t('create.firstAppCelebration')}
        </div>
      ) : null}
    </div>
  );
}

export default function CreatePage(): ReactElement {
  return (
    <Suspense
      fallback={
        <div className="mads-page" aria-busy="true">
          <Skeleton height="2rem" />
          <Skeleton height="6rem" />
        </div>
      }
    >
      <CreateScreen />
    </Suspense>
  );
}
