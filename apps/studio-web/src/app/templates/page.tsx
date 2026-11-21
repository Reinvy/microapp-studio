'use client';

/**
 * Template gallery (SCR-03).
 *
 * Category tabs and the search term live in the URL so a gallery state can be
 * shared and restored. A preview sheet shows the rendered template, its sample
 * data, and the permissions the draft will declare. **Pakai template** creates
 * the draft through the shared `createDraft` and pushes straight to the builder
 * (three clicks from Home at most).
 */

import { Suspense, useCallback, useMemo, useState, type ReactElement } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, EmptyState, SearchField, Sheet, Skeleton, TabBar } from '@microapp/ui-kit';
import { useHost } from '@/features/host/HostProvider';
import { createDraft, nextDraftName } from '@/features/create/createDraft';
import { createDocument, documentId } from '@/features/studio/document';
import { permissionDefinition } from '@/features/permissions/catalog';
import {
  TEMPLATE_CATEGORIES,
  TEMPLATES,
  searchTemplates,
  templateById,
  templateCopyKeys,
  templateRoot,
  templatesByCategory,
  type TemplateCategory,
  type TemplateDefinition,
} from '@/features/templates/catalog';
import { TemplateCard } from '@/features/templates/TemplateCard';
import { TemplatePreview } from '@/features/templates/preview';

const ALL = 'all' as const;

function isCategory(value: string | null): value is TemplateCategory {
  return TEMPLATE_CATEGORIES.some((category) => category.id === value);
}

function TemplateGallery(): ReactElement {
  const host = useHost();
  const router = useRouter();
  const params = useSearchParams();
  const categoryParam = params?.get('category') ?? ALL;
  const category = isCategory(categoryParam) ? categoryParam : ALL;
  const query = params?.get('q') ?? '';
  const [previewId, setPreviewId] = useState<string | null>(params?.get('preview') ?? null);
  const [using, setUsing] = useState<string | null>(null);

  const visible = useMemo(() => {
    const inCategory = templatesByCategory(category);
    const searched = new Set(searchTemplates(query).map((template) => template.id));
    return inCategory.filter((template) => searched.has(template.id));
  }, [category, query]);

  const preview = previewId ? templateById(previewId) : null;

  const templateTitle = (template: TemplateDefinition): string => {
    const key = templateCopyKeys(template.id).name;
    const translated = host.t(key);
    return translated === key ? template.name : translated;
  };

  const navigate = useCallback(
    (next: { category?: string; q?: string; preview?: string | null }) => {
      const search = new URLSearchParams();
      const nextCategory = next.category ?? category;
      const nextQuery = next.q ?? query;
      if (nextCategory !== ALL) search.set('category', nextCategory);
      if (nextQuery.length > 0) search.set('q', nextQuery);
      if (next.preview) search.set('preview', next.preview);
      const suffix = search.toString();
      router.replace(`/templates${suffix ? `?${suffix}` : ''}`);
    },
    [category, query, router],
  );

  const applyTemplate = useCallback(
    async (template: TemplateDefinition) => {
      if (!host.db || !host.workspace) return;
      setUsing(template.id);
      try {
        const base = templateTitle(template);
        const name = await nextDraftName(host.db, host.workspace.id, base);
        const document = createDocument({
          id: documentId(`${template.id}-${Date.now().toString(36)}`),
          name,
          root: templateRoot(template),
          permissions: template.permissions,
          dataSample: template.sampleData,
        });
        const project = await createDraft({
          db: host.db,
          workspaceId: host.workspace.id,
          name,
          root: document.nodes[0],
          permissions: document.permissions,
          dataSample: document.dataSample,
        });
        host.setPrefs({ lastCreateMode: 'template' });
        router.push(`/studio/${project.id}`);
      } finally {
        setUsing(null);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- templateTitle is pure over `host.t`
    [host.db, host.workspace, host, router],
  );

  const missingCopy = TEMPLATES.filter((template) => {
    const copy = templateCopyKeys(template.id);
    return host.t(copy.name) === copy.name;
  });

  return (
    <div className="mads-page">
      <div className="mads-page__header">
        <h1 className="mads-page__title">{host.t('templates.title')}</h1>
        <Button variant="ghost" onClick={() => router.push('/create?mode=blank')}>
          {host.t('home.actionBlank')}
        </Button>
      </div>

      <SearchField
        label={host.t('templates.search')}
        value={query}
        placeholder={host.t('templates.search')}
        onChange={(value) => navigate({ q: value })}
      />

      <TabBar
        label={host.t('templates.title')}
        idPrefix="template-category"
        activeId={category}
        tabs={[
          { id: ALL, label: host.t('templates.categoryAll') },
          ...TEMPLATE_CATEGORIES.map((entry) => ({
            id: entry.id,
            label: host.t(`templates.category${entry.id.charAt(0).toUpperCase()}${entry.id.slice(1)}`),
          })),
        ]}
        onChange={(id) => navigate({ category: id })}
      />

      {visible.length === 0 ? (
        <EmptyState title={host.t('templates.emptyTitle')} description={host.t('templates.emptyBody')} />
      ) : (
        <ul className="mads-grid" role="list">
          {visible.map((template) => (
            <li key={template.id}>
              <TemplateCard
                template={template}
                using={using === template.id}
                onUse={(entry) => void applyTemplate(entry)}
                onPreview={(entry) => {
                  setPreviewId(entry.id);
                  navigate({ preview: entry.id });
                }}
              />
            </li>
          ))}
        </ul>
      )}

      {/* Untranslated template copy is a content bug, not a runtime failure; the
          card falls back to the bundled name so the gallery still works. */}
      {missingCopy.length > 0 ? (
        <p className="mads-visually-hidden">{missingCopy.map((template) => template.id).join(', ')}</p>
      ) : null}

      <Sheet
        open={preview !== null}
        title={preview ? templateTitle(preview) : ''}
        onClose={() => {
          setPreviewId(null);
          navigate({ preview: null });
        }}
        footer={
          preview ? (
            <Button onClick={() => void applyTemplate(preview)} loading={using === preview.id} disabled={host.ephemeral || !host.ready}>
              {host.t('templates.use')}
            </Button>
          ) : null
        }
      >
        {preview ? (
          <div className="mads-stack">
            <TemplatePreview root={preview.nodes[0]} label={preview.name} />
            <section aria-label={host.t('templates.sampleData')}>
              <h3>{host.t('templates.sampleData')}</h3>
              <pre>{JSON.stringify(preview.sampleData, null, 2)}</pre>
            </section>
            <section aria-label={host.t('templates.permissions')}>
              <h3>{host.t('templates.permissions')}</h3>
              <ul>
                {preview.permissions.map((permission) => {
                  const definition = permissionDefinition(permission, host.locale);
                  return (
                    <li key={permission}>
                      <strong>{definition.label}</strong> — {definition.reason}
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>
        ) : null}
      </Sheet>
    </div>
  );
}

export default function TemplatesPage(): ReactElement {
  return (
    <Suspense
      fallback={
        <div className="mads-page" aria-busy="true">
          <Skeleton height="2rem" />
          <Skeleton height="10rem" />
        </div>
      }
    >
      <TemplateGallery />
    </Suspense>
  );
}
