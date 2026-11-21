'use client';

/**
 * Builder inspector.
 *
 * Content / Style / Layout / Behavior expose only documented props and token
 * enums — there is no free CSS. The JSON tab is read-only unless the user turned
 * on `advancedJson` in preferences.
 */

import { useMemo, type ReactElement } from 'react';
import { Badge, Switch, TabBar, TextArea, TextField } from '@microapp/ui-kit';
import { allowedProps, isComplexListProp, STYLE_ENUMS, type MuipNode } from '@microapp/runtime-web';
import { useHost } from '@/features/host/HostProvider';
import { paletteItem } from './palette';

export type InspectorTab = 'content' | 'style' | 'behavior' | 'json';

export interface InspectorProps {
  node: MuipNode | null;
  tab: InspectorTab;
  onTabChange: (tab: InspectorTab) => void;
  onChangeProp: (prop: string, value: unknown) => void;
  onRemoveProp: (prop: string) => void;
  advancedJson: boolean;
  documentJson: string;
}

const CONTENT_PROPS = ['label', 'text', 'title', 'description', 'placeholder', 'value', 'emptyTitle', 'emptyDescription', 'ariaLabel'];
const STYLE_PROPS = Object.keys(STYLE_ENUMS);
const BEHAVIOR_PROPS = ['disabled', 'required', 'loading', 'headingLevel', 'min', 'max', 'step', 'format', 'level', 'span'];

export function Inspector({
  node,
  tab,
  onTabChange,
  onChangeProp,
  onRemoveProp,
  advancedJson,
  documentJson,
}: InspectorProps): ReactElement {
  const host = useHost();
  const allowed = useMemo(() => (node ? allowedProps(node.type) : new Set<string>()), [node]);

  const propsFor = (group: readonly string[]): string[] =>
    node ? group.filter((prop) => allowed.has(prop)) : [];

  const renderField = (prop: string): ReactElement => {
    const value = (node?.props ?? {})[prop];
    const styleEnum = (STYLE_ENUMS as Record<string, readonly string[]>)[prop];
    if (styleEnum) {
      return (
        <label key={prop} className="mads-field">
          <span className="mads-field__label">{prop}</span>
          <select
            className="mads-field__control"
            value={typeof value === 'string' ? value : ''}
            onChange={(event) => onChangeProp(prop, event.target.value === '' ? undefined : event.target.value)}
          >
            <option value="">—</option>
            {styleEnum.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      );
    }
    if (typeof value === 'boolean') {
      return (
        <Switch key={prop} label={prop} checked={value} onChange={(next) => onChangeProp(prop, next)} />
      );
    }
    if (typeof value === 'number') {
      return (
        <TextField
          key={prop}
          label={prop}
          type="number"
          value={String(value)}
          onChange={(next) => onChangeProp(prop, next === '' ? undefined : Number(next))}
        />
      );
    }
    if (isComplexListProp(prop) || Array.isArray(value)) {
      return (
        <TextArea
          key={prop}
          label={`${prop} (JSON)`}
          rows={4}
          value={typeof value === 'string' ? value : JSON.stringify(value ?? [], null, 2)}
          onChange={(next) => {
            try {
              onChangeProp(prop, JSON.parse(next) as unknown);
            } catch {
              // Invalid JSON stays local to the field; the prop keeps its value.
            }
          }}
        />
      );
    }
    return (
      <TextField
        key={prop}
        label={prop}
        value={typeof value === 'string' || typeof value === 'number' ? String(value) : ''}
        onChange={(next) => (next === '' ? onRemoveProp(prop) : onChangeProp(prop, next))}
      />
    );
  };

  const tabs = [
    { id: 'content', label: host.t('studio.tabContent') },
    { id: 'style', label: host.t('studio.tabStyle') },
    { id: 'behavior', label: host.t('studio.tabBehavior') },
    { id: 'json', label: host.t('studio.tabJson') },
  ];

  return (
    <div className="mads-stack">
      <h2>{host.t('studio.inspector')}</h2>
      {node ? (
        <>
          <p className="mads-row">
            <Badge tone="info">{node.type}</Badge>
            <code>{node.id}</code>
          </p>
          <TabBar
            label={host.t('studio.inspector')}
            activeId={tab}
            tabs={tabs}
            onChange={(id) => onTabChange(id as InspectorTab)}
          />
          {tab === 'json' ? (
            advancedJson ? (
              <TextArea label={host.t('studio.tabJson')} rows={12} value={documentJson} onChange={() => undefined} />
            ) : (
              <p>{host.t('studio.jsonReadOnly')}</p>
            )
          ) : (
            <div className="mads-stack">
              {(tab === 'content'
                ? propsFor(CONTENT_PROPS)
                : tab === 'style'
                  ? propsFor(STYLE_PROPS)
                  : propsFor(BEHAVIOR_PROPS)
              ).map(renderField)}
              {propsFor(
                tab === 'content' ? CONTENT_PROPS : tab === 'style' ? STYLE_PROPS : BEHAVIOR_PROPS,
              ).length === 0 ? (
                <p>{host.t('studio.canvEmptyBody')}</p>
              ) : null}
              <p>
                <Badge tone="neutral">{paletteItem(node.type)?.level ?? 'core'}</Badge>
              </p>
            </div>
          )}
        </>
      ) : (
        <p>{host.t('studio.canvEmptyTitle')}</p>
      )}
    </div>
  );
}
