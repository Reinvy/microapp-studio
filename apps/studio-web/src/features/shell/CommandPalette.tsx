'use client';

/**
 * Command palette (`Cmd/Ctrl+K`): fuzzy-ish grouped search over installed apps,
 * Studio projects, app records, and static host actions.
 *
 * Results are grouped in the documented order App / Project / Record / Aksi.
 * An empty query shows recent searches and the five latest drafts instead of the
 * whole database (data-model §9).
 */

import { useEffect, useId, useMemo, useRef, useState, type ReactElement } from 'react';
import { useRouter } from 'next/navigation';
import { useHost } from '@/features/host/HostProvider';
import { search, type SearchHit, type SearchKind } from '@/db/repositories/search';
import { listRecentProjects, type StudioProject } from '@/db/repositories/studio';

export interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

interface ActionCommand {
  id: string;
  label: string;
  href: string;
}

const GROUP_ORDER: SearchKind[] = ['app', 'project', 'record', 'action'];

export function CommandPalette({ open, onClose }: CommandPaletteProps): ReactElement | null {
  const host = useHost();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [projects, setProjects] = useState<StudioProject[]>([]);
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const titleId = useId();

  const actions = useMemo<ActionCommand[]>(
    () => [
      { id: 'action-create-template', label: host.t('home.actionTemplates'), href: '/create?mode=template' },
      { id: 'action-create-ai', label: host.t('home.actionMagic'), href: '/create?mode=ai' },
      { id: 'action-create-blank', label: host.t('home.actionBlank'), href: '/create?mode=blank' },
      { id: 'action-templates', label: host.t('templates.title'), href: '/templates' },
      { id: 'action-packages', label: host.t('packages.title'), href: '/packages' },
      { id: 'action-import', label: host.t('packages.import'), href: '/packages/import' },
      { id: 'action-settings', label: host.t('settings.title'), href: '/settings' },
    ],
    [host],
  );

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open || !host.db || !host.workspace) return;
    const db = host.db;
    const workspaceId = host.workspace.id;
    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        try {
          if (query.trim().length === 0) {
            if (cancelled) return;
            setHits([]);
            setProjects(await listRecentProjects(db, workspaceId, 5));
            return;
          }
          if (cancelled) return;
          setProjects([]);
          setHits(await search(db, workspaceId, query, 30));
        } catch {
          if (!cancelled) {
            setHits([]);
            setProjects([]);
          }
        }
      })();
    }, 120);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [host.db, host.workspace, open, query]);

  const flat = useMemo(() => {
    const grouped: Array<{ kind: SearchKind | 'project-recent'; label: string; items: Array<{ id: string; title: string; href: string }> }> = [];
    if (projects.length > 0) {
      grouped.push({
        kind: 'project-recent',
        label: host.t('home.recentDrafts'),
        items: projects.map((project) => ({
          id: project.id,
          title: project.name,
          href: `/studio/${project.id}`,
        })),
      });
    }
    for (const kind of GROUP_ORDER) {
      const items = hits
        .filter((hit) => hit.kind === kind)
        .map((hit) => ({
          id: `${hit.kind}-${hit.refId}`,
          title: hit.title,
          href:
            kind === 'app'
              ? `/app/${encodeURIComponent(hit.refId)}`
              : kind === 'project'
                ? `/studio/${hit.refId}`
                : kind === 'record'
                  ? `/app/${encodeURIComponent(hit.appInstallId ?? '')}`
                  : '/create?mode=blank',
        }));
      if (items.length > 0) grouped.push({ kind, label: labelFor(kind, host.t), items });
    }
    if (query.trim().length > 0 || grouped.length === 0) {
      grouped.push({
        kind: 'action',
        label: host.t('nav.create'),
        items: actions
          .filter((action) => query.trim().length === 0 || action.label.toLowerCase().includes(query.toLowerCase()))
          .map((action) => ({ id: action.id, title: action.label, href: action.href })),
      });
    }
    return grouped;
  }, [actions, hits, host, projects, query]);

  const options = useMemo(() => flat.flatMap((group) => group.items), [flat]);

  if (!open) return null;

  const choose = (href: string): void => {
    onClose();
    router.push(href);
  };

  return (
    <div className="mads-palette-overlay" role="presentation" onClick={onClose}>
      <div
        className="mads-palette"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="mads-visually-hidden" id={titleId}>
          {host.t('shell.commandPalette')}
        </h2>
        <input
          ref={inputRef}
          className="mads-palette__input"
          type="search"
          value={query}
          placeholder={host.t('home.searchPlaceholder')}
          aria-label={host.t('a11y.search')}
          aria-controls={listId}
          aria-activedescendant={options[cursor] ? `palette-${options[cursor].id}` : undefined}
          onChange={(event) => {
            setQuery(event.target.value);
            setCursor(0);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              onClose();
              return;
            }
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setCursor((current) => Math.min(current + 1, Math.max(options.length - 1, 0)));
              return;
            }
            if (event.key === 'ArrowUp') {
              event.preventDefault();
              setCursor((current) => Math.max(current - 1, 0));
              return;
            }
            if (event.key === 'Enter') {
              event.preventDefault();
              const selected = options[cursor];
              if (selected) choose(selected.href);
            }
          }}
        />
        <div className="mads-palette__list" id={listId} role="listbox" aria-label={host.t('shell.commandPalette')}>
          {options.length === 0 ? (
            <p className="mads-palette__empty">{host.t('home.noResultsHint')}</p>
          ) : (
            flat.map((group) => (
              <div key={group.kind}>
                <p className="mads-visually-hidden">{group.label}</p>
                <ul>
                  {group.items.map((item) => {
                    const index = options.findIndex((option) => option.id === item.id);
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          id={`palette-${item.id}`}
                          role="option"
                          aria-selected={index === cursor}
                          className="mads-palette__option"
                          onMouseEnter={() => setCursor(index)}
                          onClick={() => choose(item.href)}
                        >
                          <span>{item.title}</span>
                          <small>{group.label}</small>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function labelFor(kind: SearchKind, t: (key: string) => string): string {
  switch (kind) {
    case 'app':
      return t('packages.tabInstalled');
    case 'project':
      return t('home.recentDrafts');
    case 'record':
      return t('a11y.search');
    default:
      return t('nav.create');
  }
}
