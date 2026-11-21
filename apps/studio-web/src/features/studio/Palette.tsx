'use client';

/**
 * Builder palette.
 *
 * Core 48 by default, all 120 when Advanced is on. Items are buttons (keyboard
 * add) and drag sources (pointer add); the canvas validates the drop target.
 */

import { useMemo, useState, type ReactElement } from 'react';
import { Badge, Button, SearchField, Switch, TabBar } from '@microapp/ui-kit';
import { useHost } from '@/features/host/HostProvider';
import { paletteItems, type PaletteItem } from './palette';
import { COMPONENT_MIME } from './Canvas';

export interface PaletteProps {
  advanced: boolean;
  onAdvancedChange: (value: boolean) => void;
  onAdd: (type: string) => void;
  disabled?: boolean;
}

const CATEGORIES = ['all', 'layout', 'navigation', 'input', 'data', 'feedback', 'domain', 'platform', 'ai'] as const;

export function Palette({ advanced, onAdvancedChange, onAdd, disabled }: PaletteProps): ReactElement {
  const host = useHost();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('all');

  const items = useMemo(() => paletteItems({ advanced, category, query }), [advanced, category, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, PaletteItem[]>();
    for (const item of items) {
      const list = map.get(item.category) ?? [];
      list.push(item);
      map.set(item.category, list);
    }
    return [...map.entries()];
  }, [items]);

  return (
    <div className="mads-stack">
      <h2>{host.t('studio.palette')}</h2>
      <SearchField
        label={host.t('studio.palette')}
        value={query}
        placeholder={host.t('common.search')}
        onChange={setQuery}
      />
      <TabBar
        label={host.t('studio.palette')}
        activeId={category}
        tabs={CATEGORIES.map((id) => ({ id, label: id === 'all' ? host.t('templates.categoryAll') : id }))}
        onChange={setCategory}
      />
      <Switch checked={advanced} onChange={onAdvancedChange} label={host.t('studio.advancedJson')} />
      <p>
        <Badge tone="info">{items.length}</Badge> {host.t('studio.palette')}
      </p>
      {grouped.map(([group, groupItems]) => (
        <section key={group} aria-label={group}>
          <h3>{group}</h3>
          <ul role="list" className="mads-stack">
            {groupItems.map((item) => (
              <li key={item.name}>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={disabled}
                  draggable={!disabled}
                  aria-label={`${host.t('studio.addNode')}: ${item.name}`}
                  onDragStart={(event) => {
                    event.dataTransfer.setData(COMPONENT_MIME, item.name);
                    event.dataTransfer.effectAllowed = 'copy';
                  }}
                  onClick={() => onAdd(item.name)}
                >
                  {item.name}
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
