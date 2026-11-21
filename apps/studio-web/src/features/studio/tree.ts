/**
 * Immutable tree operations for the builder.
 *
 * Every operation returns a new root (structural sharing for untouched subtrees)
 * and throws `E-STUDIO-003` for an operation the document cannot support, so the
 * canvas can reject a drop without mutating history.
 */

import { canContainChildren, type MuipNode } from '@microapp/runtime-web';

function clone(node: MuipNode): MuipNode {
  return { ...node, ...(node.props ? { props: { ...node.props } } : {}) };
}

function mapNode(node: MuipNode, id: string, fn: (node: MuipNode) => MuipNode): MuipNode {
  if (node.id === id) return fn(clone(node));
  if (!node.children) return node;
  let changed = false;
  const children = node.children.map((child) => {
    const next = mapNode(child, id, fn);
    if (next !== child) changed = true;
    return next;
  });
  return changed ? { ...node, children } : node;
}

export function findNodeById(root: MuipNode, id: string): MuipNode | null {
  if (root.id === id) return root;
  for (const child of root.children ?? []) {
    const found = findNodeById(child, id);
    if (found) return found;
  }
  return null;
}

export function findParentOf(root: MuipNode, id: string): MuipNode | null {
  for (const child of root.children ?? []) {
    if (child.id === id) return root;
    const found = findParentOf(child, id);
    if (found) return found;
  }
  return null;
}

export function pathToNode(root: MuipNode, id: string): MuipNode[] {
  if (root.id === id) return [root];
  for (const child of root.children ?? []) {
    const path = pathToNode(child, id);
    if (path.length > 0) return [root, ...path];
  }
  return [];
}

export function updateProps(root: MuipNode, id: string, props: Record<string, unknown>): MuipNode {
  if (!findNodeById(root, id)) throw new Error('E-STUDIO-003 node not found');
  return mapNode(root, id, (node) => ({ ...node, props: { ...(node.props ?? {}), ...props } }));
}

export function removeProp(root: MuipNode, id: string, prop: string): MuipNode {
  if (!findNodeById(root, id)) throw new Error('E-STUDIO-003 node not found');
  return mapNode(root, id, (node) => {
    const props = { ...(node.props ?? {}) };
    delete props[prop];
    return { ...node, props };
  });
}

/** Insert `node` under `parentId` at `index`. The parent must accept children. */
export function insertNode(
  root: MuipNode,
  parentId: string,
  index: number,
  node: MuipNode,
): MuipNode {
  const parent = findNodeById(root, parentId);
  if (!parent) throw new Error('E-STUDIO-003 parent not found');
  if (!canContainChildren(parent.type)) throw new Error('E-STUDIO-003 parent cannot contain children');
  if (findNodeById(root, node.id)) throw new Error('E-STUDIO-003 node id already exists');
  return mapNode(root, parentId, (target) => {
    const children = [...(target.children ?? [])];
    const at = Math.max(0, Math.min(index, children.length));
    children.splice(at, 0, node);
    return { ...target, children };
  });
}

export function removeNode(root: MuipNode, id: string): MuipNode {
  if (root.id === id) throw new Error('E-STUDIO-003 cannot remove the root');
  const parent = findParentOf(root, id);
  if (!parent) throw new Error('E-STUDIO-003 node not found');
  return mapNode(root, parent.id, (target) => ({
    ...target,
    children: (target.children ?? []).filter((child) => child.id !== id),
  }));
}

/**
 * Move a node to a new parent/index.
 * Moving a node into its own subtree is rejected — that would detach the tree.
 */
export function moveNode(root: MuipNode, id: string, parentId: string, index: number): MuipNode {
  if (id === root.id) throw new Error('E-STUDIO-003 cannot move the root');
  const node = findNodeById(root, id);
  if (!node) throw new Error('E-STUDIO-003 node not found');
  if (findNodeById(node, parentId)) throw new Error('E-STUDIO-003 cannot move a node into itself');
  const parent = findNodeById(root, parentId);
  if (!parent) throw new Error('E-STUDIO-003 parent not found');
  if (!canContainChildren(parent.type)) throw new Error('E-STUDIO-003 parent cannot contain children');

  const detached = removeNode(root, id);
  const target = findNodeById(detached, parentId);
  if (!target) throw new Error('E-STUDIO-003 parent not found');
  // Recompute the index after detaching so a same-parent move lands where asked.
  return insertNode(detached, parentId, index, node);
}

/** Flat, depth-first list used by the layer tree and keyboard navigation. */
export interface LayerEntry {
  node: MuipNode;
  depth: number;
  parentId: string | null;
}

export function flattenLayers(root: MuipNode, depth = 0, parentId: string | null = null): LayerEntry[] {
  const entry: LayerEntry = { node: root, depth, parentId };
  const children = (root.children ?? []).flatMap((child) => flattenLayers(child, depth + 1, root.id));
  return [entry, ...children];
}

/** Depth-first id order, used by Alt+Arrow and Tab navigation. */
export function nodeOrder(root: MuipNode): string[] {
  return flattenLayers(root).map((entry) => entry.node.id);
}

/** The text-bearing prop a double-click edits, if the node has one. */
export function editableTextProp(node: MuipNode): string | null {
  const props = node.props ?? {};
  for (const key of ['text', 'label', 'title']) {
    if (typeof props[key] === 'string') return key;
  }
  return null;
}
