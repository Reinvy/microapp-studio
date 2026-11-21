'use client';

/**
 * Builder canvas.
 *
 * Renders the live document with the real MUIP renderer inside a device frame,
 * and turns pointer/keyboard gestures into *intents* — selection, drop, inline
 * edit. All mutation stays in `BuilderScreen` so history and autosave have one
 * owner.
 *
 * Accessibility: the canvas exposes each node's element with its own role; the
 * layer tree (not the canvas) is the keyboard-navigable surface, and the canvas
 * carries an explicit `aria-label` plus a described drop hint.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { MuipRenderer, canContainChildren, validateDocument, type MuipNode } from '@microapp/runtime-web';
import { applyResponsive, findNode } from './document';
import { editableTextProp } from './tree';
import { deviceWidth } from './document';
import type { StudioDocument, StudioDevice } from './types';

export interface CanvasProps {
  document: StudioDocument;
  device: StudioDevice;
  selectedId: string | null;
  label: string;
  emptyTitle: string;
  emptyBody: string;
  onSelect: (id: string | null) => void;
  onDropComponent: (target: { parentId: string; index: number }, type: string) => void;
  onMoveNode: (target: { parentId: string; index: number }, id: string) => void;
  onEditText: (id: string, prop: string, value: string) => void;
  onInvalidDrop: () => void;
}

interface DropTarget {
  parentId: string;
  index: number;
  top: number;
  left: number;
  width: number;
}

const COMPONENT_MIME = 'application/x-muip-component';
const NODE_MIME = 'application/x-muip-node';

export function Canvas(props: CanvasProps): ReactElement {
  const {
    document,
    device,
    selectedId,
    label,
    emptyTitle,
    emptyBody,
    onSelect,
    onDropComponent,
    onMoveNode,
    onEditText,
    onInvalidDrop,
  } = props;
  const hostRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<MuipRenderer | null>(null);
  const [drop, setDrop] = useState<DropTarget | null>(null);
  const [editing, setEditing] = useState<{ id: string; prop: string; value: string } | null>(null);

  const preview = useMemo(() => applyResponsive(document, device), [device, document]);
  const root = preview.nodes[0];

  // Mount the renderer once; re-render on every document change.
  useEffect(() => {
    const element = hostRef.current;
    if (!element) return;
    const renderer = new MuipRenderer(element, { onEvent: () => undefined });
    rendererRef.current = renderer;
    return () => {
      renderer.destroy();
      rendererRef.current = null;
    };
  }, []);

  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    try {
      renderer.render(validateDocument(root).node);
    } catch {
      // A momentary invalid tree (mid-drag) must not blank the canvas.
    }
  }, [root]);

  const targetFromEvent = useCallback(
    (event: React.DragEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>): { node: MuipNode | null; element: HTMLElement | null } => {
      const element = (event.target as HTMLElement).closest<HTMLElement>('[data-muip-id]');
      if (!element) return { node: null, element: null };
      const id = element.getAttribute('data-muip-id');
      if (!id) return { node: null, element: null };
      return { node: findNode(root, id) ?? null, element };
    },
    [root],
  );

  const computeDrop = useCallback(
    (element: HTMLElement, node: MuipNode, clientY: number): DropTarget => {
      const frame = hostRef.current?.getBoundingClientRect();
      const box = element.getBoundingClientRect();
      const container = canContainChildren(node.type) ? node : null;
      if (container) {
        // Dropping on a container's middle band appends; the edges insert.
        const children = container.children ?? [];
        const middle = box.top + box.height / 2;
        const index = clientY < middle ? 0 : children.length;
        return {
          parentId: container.id,
          index,
          top: (clientY < middle ? box.top : box.bottom) - (frame?.top ?? 0),
          left: box.left - (frame?.left ?? 0),
          width: box.width,
        };
      }
      // Dropping on a leaf inserts next to it, in its parent.
      const parent = findParent(root, node.id);
      if (!parent) return { parentId: root.id, index: (root.children ?? []).length, top: box.bottom - (frame?.top ?? 0), left: box.left - (frame?.left ?? 0), width: box.width };
      const siblings = parent.children ?? [];
      const index = siblings.findIndex((child) => child.id === node.id);
      return {
        parentId: parent.id,
        index: Math.max(0, index),
        top: box.top - (frame?.top ?? 0),
        left: box.left - (frame?.left ?? 0),
        width: box.width,
      };
    },
    [root],
  );

  const handleDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      const types = Array.from(event.dataTransfer.types);
      if (!types.includes(COMPONENT_MIME) && !types.includes(NODE_MIME)) return;
      event.preventDefault();
      const { node, element } = targetFromEvent(event);
      if (!node || !element) {
        setDrop(null);
        return;
      }
      setDrop(computeDrop(element, node, event.clientY));
    },
    [computeDrop, targetFromEvent],
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      const type = event.dataTransfer.getData(COMPONENT_MIME);
      const nodeId = event.dataTransfer.getData(NODE_MIME);
      const { element, node } = targetFromEvent(event);
      setDrop(null);
      if (!element || !node) {
        onInvalidDrop();
        return;
      }
      event.preventDefault();
      const target = computeDrop(element, node, event.clientY);
      if (type) onDropComponent({ parentId: target.parentId, index: target.index }, type);
      else if (nodeId) onMoveNode({ parentId: target.parentId, index: target.index }, nodeId);
      else onInvalidDrop();
    },
    [computeDrop, onDropComponent, onInvalidDrop, onMoveNode, targetFromEvent],
  );

  return (
    <div
      className="mads-canvas"
      aria-label={label}
      data-selected={selectedId ?? undefined}
      onDragOver={handleDragOver}
      onDragLeave={() => setDrop(null)}
      onDrop={handleDrop}
      onClick={(event) => {
        const { node } = targetFromEvent(event);
        onSelect(node?.id ?? null);
      }}
      onDoubleClick={(event) => {
        const { node } = targetFromEvent(event);
        if (!node) return;
        const prop = editableTextProp(node);
        if (!prop) return;
        onSelect(node.id);
        setEditing({ id: node.id, prop, value: String((node.props ?? {})[prop] ?? '') });
      }}
      style={{ inlineSize: `${deviceWidth(device)}px`, maxInlineSize: '100%', marginInline: 'auto', position: 'relative' }}
    >
      {root.children === undefined || (root.children ?? []).length === 0 ? (
        <div className="mads-empty-state">
          <h2 className="mads-empty-state__title">{emptyTitle}</h2>
          <p className="mads-empty-state__description">{emptyBody}</p>
        </div>
      ) : null}

      <div ref={hostRef} data-muip-canvas="" />

      {drop ? (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            insetInlineStart: drop.left,
            insetBlockStart: drop.top,
            inlineSize: drop.width,
            blockSize: '2px',
            background: 'var(--mads-color-primary)',
            pointerEvents: 'none',
          }}
        />
      ) : null}

      {editing ? (
        <form
          className="mads-card"
          style={{ position: 'absolute', insetInlineStart: 0, insetInlineEnd: 0, insetBlockStart: 0 }}
          onSubmit={(event) => {
            event.preventDefault();
            onEditText(editing.id, editing.prop, editing.value);
            setEditing(null);
          }}
        >
          <label className="mads-field">
            <span className="mads-field__label">{editing.prop}</span>
            <input
              autoFocus
              className="mads-field__control"
              value={editing.value}
              onChange={(event) => setEditing({ ...editing, value: event.target.value })}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.preventDefault();
                  setEditing(null);
                }
              }}
            />
          </label>
        </form>
      ) : null}
    </div>
  );
}

function findParent(root: MuipNode, id: string): MuipNode | null {
  for (const child of root.children ?? []) {
    if (child.id === id) return root;
    const found = findParent(child, id);
    if (found) return found;
  }
  return null;
}

export { COMPONENT_MIME, NODE_MIME };
