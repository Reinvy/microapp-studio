import { describe, expect, it } from 'vitest';
import {
  MAX_DEPTH,
  MAX_NODES,
  MAX_STRING_LENGTH,
  applyPatch,
  isSupportedComponent,
  validateDocument,
  type MuipNode,
} from '../validate';
import { BridgeError } from '../../bridge/errors';

const card = (children: MuipNode[] = []): MuipNode => ({
  type: 'Card',
  id: 'card-1',
  props: { title: 'Saldo' },
  children,
});

function errorOf(fn: () => unknown): BridgeError {
  try {
    fn();
  } catch (error) {
    if (error instanceof BridgeError) return error;
    throw error;
  }
  throw new Error('expected BridgeError');
}

describe('MUIP document validation', () => {
  it('accepts a valid document and reports placeholders', () => {
    const result = validateDocument(
      card([
        { type: 'Button', id: 'btn-1', props: { label: 'Simpan' }, events: { onPress: { action: 'submit' } } },
        { type: 'KanbanBoard', id: 'board-1' },
      ]),
    );
    expect(result.nodeCount).toBe(3);
    expect(result.placeholders).toEqual(['KanbanBoard']);
    expect(result.deferredActions).toEqual([]);
  });

  it('flags phase-3 actions as deferred while keeping them out of dispatch', () => {
    const result = validateDocument({
      type: 'Button',
      id: 'ai-btn',
      events: { onPress: { action: 'ai.prompt' } },
    });
    expect(result.deferredActions).toEqual(['ai.prompt']);
  });

  it('rejects unknown components and raw event handler strings', () => {
    expect(errorOf(() => validateDocument({ type: 'iframe', id: 'x' })).code).toBe('E-SBX-005');
    const jsHandler = errorOf(() =>
      validateDocument({ type: 'Button', id: 'b', events: { onPress: 'alert(1)' } }),
    );
    expect(jsHandler.details?.reason).toBe('event_binding_not_object');
  });

  it('rejects duplicate ids and unknown props', () => {
    const duplicate = errorOf(() =>
      validateDocument({
        type: 'Card',
        id: 'same',
        children: [{ type: 'Card', id: 'same' }],
      }),
    );
    expect(duplicate.details?.reason).toBe('duplicate_node_id');

    const unknownProp = errorOf(() =>
      validateDocument({ type: 'Button', id: 'b', props: { label: 'x', onClick: 'evil' } }),
    );
    expect(unknownProp.details?.reason).toBe('unknown_prop');
  });

  it('rejects CSS values outside the token set', () => {
    for (const style of [{ color: '#ff0000' }, { padding: '13px' }, { background: 'url(https://x)' }]) {
      const error = errorOf(() => validateDocument({ type: 'Card', id: 'c', style }));
      expect(['invalid_style_value', 'unknown_style_token']).toContain(error.details?.reason);
    }
    const ok = validateDocument({ type: 'Card', id: 'c', style: { padding: 'md', color: 'fg', radius: 'lg' } });
    expect(ok.node.style).toEqual({ padding: 'md', color: 'fg', radius: 'lg' });
  });

  it('enforces depth, node count, payload, and string limits', () => {
    let deep: MuipNode = { type: 'Card', id: 'leaf' };
    for (let index = 0; index < MAX_DEPTH + 1; index += 1) {
      deep = { type: 'Card', id: `n-${index}`, children: [deep] };
    }
    expect(errorOf(() => validateDocument(deep)).details?.reason).toBe('tree_too_deep');

    const wide: MuipNode = {
      type: 'Card',
      id: 'root',
      children: Array.from({ length: MAX_NODES + 1 }, (_, index) => ({
        type: 'Badge',
        id: `b-${index}`,
      })),
    };
    expect(errorOf(() => validateDocument(wide)).details?.reason).toBe('too_many_nodes');

    const huge = 'x'.repeat(MAX_STRING_LENGTH + 1);
    expect(errorOf(() => validateDocument({ type: 'Badge', id: 'b', props: { text: huge } })).details?.reason).toBe(
      'string_too_long',
    );
  });

  it('validates accessibility fields', () => {
    const ok = validateDocument({
      type: 'Button',
      id: 'b',
      props: { label: 'Simpan' },
      a11y: { label: 'Simpan catatan', description: 'Menyimpan perubahan', role: 'button', live: 'polite', disabled: false, required: true },
    });
    expect(ok.node.a11y).toEqual({
      label: 'Simpan catatan',
      description: 'Menyimpan perubahan',
      role: 'button',
      live: 'polite',
      disabled: false,
      required: true,
    });
    expect(errorOf(() => validateDocument({ type: 'Card', id: 'c', a11y: { role: 'iframe' } })).details?.reason).toBe(
      'invalid_a11y_role',
    );
    expect(errorOf(() => validateDocument({ type: 'Card', id: 'c', a11y: { title: 'x' } })).details?.reason).toBe(
      'unknown_a11y_key',
    );
  });

  it('marks implemented and placeholder components', () => {
    expect(isSupportedComponent('AppShell')).toBe(true);
    expect(isSupportedComponent('KanbanBoard')).toBe(false);
    expect(isSupportedComponent('NotACatalogType')).toBe(false);
  });
});

describe('MUIP patches', () => {
  const root = (): MuipNode =>
    card([
      { type: 'Button', id: 'btn-1', props: { label: 'Satu' } },
      { type: 'Badge', id: 'badge-1', props: { text: 'Dua' } },
    ]);

  it('applies update, insert, remove, and move in one batch', () => {
    const updated = applyPatch(root(), [
      { op: 'update', id: 'btn-1', props: { label: 'Tiga' } },
      { op: 'insert', parentId: 'card-1', index: 0, node: { type: 'Badge', id: 'badge-0' } },
      { op: 'remove', id: 'badge-1' },
      { op: 'move', id: 'btn-1', parentId: 'card-1', index: 0 },
    ]);
    expect(updated.children?.map((child) => child.id)).toEqual(['btn-1', 'badge-0']);
    expect(updated.children?.[0]?.props?.label).toBe('Tiga');
  });

  it('rejects unknown insert components atomically', () => {
    const original = root();
    const snapshot = JSON.stringify(original);
    expect(() =>
      applyPatch(original, [
        { op: 'update', id: 'btn-1', props: { label: 'Berubah' } },
        { op: 'insert', parentId: 'card-1', index: 0, node: { type: 'iframe', id: 'evil' } },
      ]),
    ).toThrow(BridgeError);
    expect(JSON.stringify(original)).toBe(snapshot);
  });

  it('rejects cycles, root moves, and dangling targets', () => {
    const nested: MuipNode = {
      type: 'Card',
      id: 'root',
      children: [{ type: 'Card', id: 'inner', children: [{ type: 'Card', id: 'leaf' }] }],
    };
    expect(errorOf(() => applyPatch(nested, [{ op: 'move', id: 'inner', parentId: 'leaf', index: 0 }])).details?.reason).toBe(
      'move_cycle',
    );
    expect(errorOf(() => applyPatch(nested, [{ op: 'move', id: 'root', parentId: 'inner', index: 0 }])).details?.reason).toBe(
      'move_root_forbidden',
    );
    expect(errorOf(() => applyPatch(nested, [{ op: 'remove', id: 'missing' }])).details?.reason).toBe(
      'remove_target_missing',
    );
    expect(errorOf(() => applyPatch(nested, [])).details?.reason).toBe('empty_patch');
    expect(errorOf(() => applyPatch(nested, [{ op: 'copy', id: 'inner' } as never])).details?.reason).toBe(
      'unknown_patch_operation',
    );
  });

  it('rejects duplicate ids created by insert', () => {
    expect(
      errorOf(() =>
        applyPatch(root(), [{ op: 'insert', parentId: 'card-1', index: 0, node: { type: 'Badge', id: 'btn-1' } }]),
      ).details?.reason,
    ).toBe('duplicate_node_id');
  });
});
