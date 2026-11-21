'use client';

/**
 * Layer tree.
 *
 * The keyboard-navigable structure view: arrow keys move the selection, Delete
 * removes, Alt+Arrow reorders, and every row is a drag source so nesting works
 * without the canvas.
 */

import { useCallback, type ReactElement } from 'react';
import { Button } from '@microapp/ui-kit';
import { useHost } from '@/features/host/HostProvider';
import type { LayerEntry } from './tree';
import { NODE_MIME } from './Canvas';

export interface LayerTreeProps {
  layers: LayerEntry[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  onDelete: (id: string) => void;
  onDragStartNode: (id: string) => void;
}

export function LayerTree({
  layers,
  selectedId,
  onSelect,
  onMove,
  onDelete,
  onDragStartNode,
}: LayerTreeProps): ReactElement {
  const host = useHost();

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLUListElement>) => {
      if (!selectedId) return;
      const index = layers.findIndex((layer) => layer.node.id === selectedId);
      if (index < 0) return;
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        const next = layers[Math.min(index + 1, layers.length - 1)];
        if (next) onSelect(next.node.id);
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        const previous = layers[Math.max(index - 1, 0)];
        if (previous) onSelect(previous.node.id);
        return;
      }
      if (event.altKey && event.key === 'ArrowUp') {
        event.preventDefault();
        onMove(selectedId, -1);
        return;
      }
      if (event.altKey && event.key === 'ArrowDown') {
        event.preventDefault();
        onMove(selectedId, 1);
        return;
      }
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        onDelete(selectedId);
      }
    },
    [layers, onDelete, onMove, onSelect, selectedId],
  );

  return (
    <div>
      <h2>{host.t('studio.layers')}</h2>
      <ul
        role="tree"
        aria-label={host.t('studio.layers')}
        className="mads-stack"
        onKeyDown={onKeyDown}
      >
        {layers.map((layer) => (
          <li
            key={layer.node.id}
            role="treeitem"
            aria-selected={layer.node.id === selectedId}
            aria-level={layer.depth + 1}
            tabIndex={layer.node.id === selectedId ? 0 : -1}
            draggable
            onDragStart={(event) => {
              event.dataTransfer.setData(NODE_MIME, layer.node.id);
              event.dataTransfer.effectAllowed = 'move';
              onDragStartNode(layer.node.id);
            }}
            onClick={() => onSelect(layer.node.id)}
            style={{ paddingInlineStart: `${layer.depth * 12}px` }}
          >
            <span className="mads-row">
              <Button
                size="sm"
                variant={layer.node.id === selectedId ? 'primary' : 'ghost'}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelect(layer.node.id);
                }}
              >
                {layer.node.type}
                <small> #{layer.node.id}</small>
              </Button>
              {layer.depth > 0 ? (
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={host.t('studio.deleteNode')}
                  onClick={(event) => {
                    event.stopPropagation();
                    onDelete(layer.node.id);
                  }}
                >
                  ×
                </Button>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
