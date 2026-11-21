import { describe, expect, it } from 'vitest';

import { BridgeError } from '../../bridge/errors';
import {
  MAX_DEPTH,
  MAX_NODES,
  MAX_PAYLOAD_BYTES,
  MAX_STRING_LENGTH,
  isSupportedComponent,
  validateDocument,
  type MuipNode,
} from '../validate';

const card = (children: MuipNode[] = [], props: Record<string, unknown> = { title: 'Saldo' }): MuipNode => ({
  type: 'Card',
  id: 'card-1',
  props,
  children,
});

function errorOf(run: () => unknown): BridgeError {
  try {
    run();
  } catch (error) {
    if (error instanceof BridgeError) return error;
    throw error;
  }
  throw new Error('expected a BridgeError to be thrown');
}

function reasonOf(run: () => unknown): unknown {
  return errorOf(run).details?.reason;
}

describe('MUIP document validation', () => {
  it('accepts a valid document and reports counts and placeholders', () => {
    const result = validateDocument(
      card([
        { type: 'Button', id: 'btn-1', props: { label: 'Simpan' }, on: { press: { action: 'setState', target: 'saved' } } },
        { type: 'KanbanBoard', id: 'board-1', children: [{ type: 'Badge', id: 'badge-1' }] },
      ]),
    );

    expect(result.nodeCount).toBe(4);
    expect(result.placeholders).toEqual(['KanbanBoard']);
    expect(result.node.type).toBe('Card');
    expect(result.node.children?.[0]?.props?.label).toBe('Simpan');
    expect(result.bridgeCalls).toEqual([]);
  });

  it('rejects unknown components with E-RUN-004 and the offending node path', () => {
    const error = errorOf(() => validateDocument(card([{ type: 'iframe', id: 'evil' }])));
    expect(String(error.code)).toBe('E-RUN-004');
    expect(error.details).toMatchObject({ reason: 'component_unknown', type: 'iframe' });
    expect(error.details?.path).toBe('$.children[0]');
    expect(JSON.stringify(error.details)).toContain('$.children[0]');
  });

  it('rejects a foreign prop', () => {
    const error = errorOf(() =>
      validateDocument({ type: 'Button', id: 'b-1', props: { label: 'x', onClick: 'evil' } }),
    );
    expect(String(error.code)).toBe('E-RUN-004');
    expect(error.details).toMatchObject({ reason: 'prop_not_allowed', type: 'Button' });
    expect(error.details?.path).toBe('$.props.onClick');
  });

  it('rejects html, css, style, and script fields and props', () => {
    for (const field of ['html', 'css', 'style', 'script']) {
      expect(reasonOf(() => validateDocument({ type: 'Card', id: 'c-1', [field]: '<b>x</b>' }))).toBe(
        'forbidden_field',
      );
      expect(reasonOf(() => validateDocument({ type: 'Card', id: 'c-1', props: { [field]: 'x' } }))).toBe(
        'forbidden_prop',
      );
    }
  });

  it('rejects more than 2000 nodes', () => {
    const wide: MuipNode = {
      type: 'Card',
      id: 'root',
      children: Array.from({ length: MAX_NODES }, (_, index) => ({ type: 'Badge', id: `b-${index}` })),
    };
    expect(reasonOf(() => validateDocument(wide))).toBe('too_many_nodes');
  });

  it('rejects a tree deeper than 32 levels', () => {
    let deep: MuipNode = { type: 'Stack', id: 'leaf' };
    for (let index = 0; index <= MAX_DEPTH; index += 1) {
      deep = { type: 'Stack', id: `depth-${index}`, children: [deep] };
    }
    expect(reasonOf(() => validateDocument(deep))).toBe('depth_exceeded');
  });

  it('rejects a payload larger than 512 KiB before walking the tree', () => {
    const huge = 'x'.repeat(MAX_PAYLOAD_BYTES + 1024);
    expect(reasonOf(() => validateDocument({ type: 'Card', id: 'c-1', props: { text: huge } }))).toBe(
      'payload_too_large',
    );
    expect(reasonOf(() => validateDocument({ type: 'Card', id: 'c-1', props: { text: 'x'.repeat(MAX_STRING_LENGTH + 1) } }))).toBe(
      'string_too_long',
    );
  });

  it('rejects duplicate and malformed node ids', () => {
    expect(reasonOf(() => validateDocument(card([{ type: 'Badge', id: 'card-1' }])))).toBe('id_duplicate');
    expect(reasonOf(() => validateDocument({ type: 'Badge', id: '1bad' }))).toBe('id_invalid');
    expect(reasonOf(() => validateDocument({ type: 'Badge', id: 'has space' }))).toBe('id_invalid');
  });

  it('rejects unknown events and callBridge actions without a method', () => {
    expect(
      reasonOf(() =>
        validateDocument({ type: 'Button', id: 'b-1', on: { hover: { action: 'toast', target: 'x' } } }),
      ),
    ).toBe('event_not_allowed');

    const error = errorOf(() =>
      validateDocument({ type: 'Button', id: 'b-1', on: { press: { action: 'callBridge' } } }),
    );
    expect(error.details).toMatchObject({ reason: 'action_method_invalid' });
  });

  it('accepts callBridge with a namespaced method and lists it', () => {
    const result = validateDocument({
      type: 'Button',
      id: 'save',
      props: { label: 'Simpan' },
      on: { press: { action: 'callBridge', method: 'storage.set', params: { key: 'total', value: 3 } } },
    });
    expect(result.bridgeCalls).toEqual(['storage.set']);
    expect(result.node.on?.press).toEqual({
      action: 'callBridge',
      method: 'storage.set',
      params: { key: 'total', value: 3 },
    });
  });

  it('rejects children on a component without a child slot', () => {
    expect(reasonOf(() => validateDocument({ type: 'Button', id: 'b-1', children: [{ type: 'Badge', id: 'x' }] }))).toBe(
      'children_not_allowed',
    );
  });

  it('accepts items as an array of flat objects and bounds each object', () => {
    const accepted = validateDocument({
      type: 'Sidebar',
      id: 'nav',
      props: { items: [{ label: 'Beranda', id: 'home', href: '/home' }, { label: 'Kasir', value: 'pos' }] },
    });
    expect(accepted.node.props?.items).toHaveLength(2);

    const wideRow = Object.fromEntries(Array.from({ length: 17 }, (_, index) => [`k${index}`, index]));
    expect(
      reasonOf(() => validateDocument({ type: 'Sidebar', id: 'nav', props: { items: [wideRow] } })),
    ).toBe('complex_prop_item_too_wide');

    expect(
      reasonOf(() =>
        validateDocument({ type: 'Sidebar', id: 'nav', props: { items: [{ label: 'x', nested: { a: 1 } }] } }),
      ),
    ).toBe('complex_prop_item_not_scalar');
  });

  it('rejects an array prop longer than 64 scalars', () => {
    const error = errorOf(() =>
      validateDocument({
        type: 'Alert',
        id: 'alert-1',
        props: { actions: Array.from({ length: 65 }, (_, index) => `Aksi ${index}`) },
      }),
    );
    expect(error.details).toMatchObject({ reason: 'prop_array_too_long', maxItems: 64 });
  });

  it('rejects a document with more than one root', () => {
    expect(reasonOf(() => validateDocument([{ type: 'Badge', id: 'a' }, { type: 'Badge', id: 'b' }]))).toBe(
      'root_count_invalid',
    );
  });

  it('exposes the catalog surface', () => {
    expect(isSupportedComponent('AppShell')).toBe(true);
    expect(isSupportedComponent('KanbanBoard')).toBe(true);
    expect(isSupportedComponent('NotACatalogType')).toBe(false);
  });
});
