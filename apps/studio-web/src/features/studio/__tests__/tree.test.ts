import { describe, expect, it } from 'vitest';
import { createRoot } from '../document';
import {
  editableTextProp,
  findNodeById,
  findParentOf,
  flattenLayers,
  insertNode,
  moveNode,
  nodeOrder,
  pathToNode,
  removeNode,
  removeProp,
  updateProps,
} from '../tree';

const tree = () =>
  createRoot([
    { type: 'Card', id: 'card', props: { title: 'A' }, children: [{ type: 'Button', id: 'button', props: { label: 'Go' } }] },
    { type: 'Card', id: 'card-2', props: { title: 'B' } },
  ]);

describe('tree operations', () => {
  it('updates props immutably', () => {
    const root = tree();
    const next = updateProps(root, 'card', { title: 'Changed' });
    expect(findNodeById(next, 'card')?.props?.title).toBe('Changed');
    expect(findNodeById(root, 'card')?.props?.title).toBe('A');
    expect(removeProp(next, 'card', 'title').props).not.toHaveProperty('title');
  });

  it('inserts under a container at an index and rejects a leaf parent', () => {
    const root = tree();
    const next = insertNode(root, 'card', 0, { type: 'Badge', id: 'badge' });
    expect(findNodeById(next, 'card')?.children?.map((child) => child.id)).toEqual(['badge', 'button']);
    expect(() => insertNode(root, 'button', 0, { type: 'Badge', id: 'badge-2' })).toThrow(/E-STUDIO-003/);
  });

  it('rejects a duplicate node id', () => {
    expect(() => insertNode(tree(), 'card-2', 0, { type: 'Badge', id: 'card' })).toThrow(/E-STUDIO-003/);
  });

  it('removes a node but never the root', () => {
    const next = removeNode(tree(), 'button');
    expect(findNodeById(next, 'button')).toBeNull();
    expect(() => removeNode(tree(), 'root')).toThrow(/E-STUDIO-003/);
  });

  it('moves a node between parents and rejects moving it into itself', () => {
    const root = tree();
    const moved = moveNode(root, 'button', 'card-2', 0);
    expect(findParentOf(moved, 'button')?.id).toBe('card-2');
    expect(() => moveNode(root, 'card', 'card', 0)).toThrow(/E-STUDIO-003/);
  });

  it('walks, flattens, and orders the tree depth-first', () => {
    const root = tree();
    expect(pathToNode(root, 'button').map((node) => node.id)).toEqual(['root', 'card', 'button']);
    expect(flattenLayers(root).map((layer) => `${layer.depth}:${layer.node.id}`)).toEqual([
      '0:root',
      '1:card',
      '2:button',
      '1:card-2',
    ]);
    expect(nodeOrder(root)).toEqual(['root', 'card', 'button', 'card-2']);
    expect(findParentOf(root, 'root')).toBeNull();
  });

  it('knows which prop a double-click should edit', () => {
    expect(editableTextProp({ type: 'Button', id: 'b', props: { label: 'Go' } })).toBe('label');
    expect(editableTextProp({ type: 'Card', id: 'c', props: { title: 'T' } })).toBe('title');
    expect(editableTextProp({ type: 'Card', id: 'c', props: { padding: 'md' } })).toBeNull();
  });
});
