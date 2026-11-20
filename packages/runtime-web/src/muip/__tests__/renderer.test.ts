// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BridgeError } from '../../bridge/errors';
import { COMPONENT_BUILDERS, IMPLEMENTED_COMPONENTS } from '../components';
import { MuipRenderer, type RendererHandlers } from '../renderer';
import {
  SUPPORTED_COMPONENTS,
  isSupportedComponent,
  validateDocument,
  type MuipNode,
  type PatchOperation,
} from '../validate';

function node(overrides: Partial<MuipNode> & { type: string; id: string }): MuipNode {
  return { ...overrides };
}

function rootStack(children: MuipNode[]): MuipNode {
  return node({ type: 'Stack', id: 'root', children });
}

function expectBridgeError(run: () => unknown): BridgeError {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(BridgeError);
    expect((error as BridgeError).code).toBe('E-SBX-005');
    return error as BridgeError;
  }
  throw new Error('expected a BridgeError to be thrown');
}

describe('MuipRenderer', () => {
  let host: HTMLDivElement;
  let events: Array<{ nodeId: string; event: string; binding: unknown }>;
  let renderer: MuipRenderer;

  const handlers: RendererHandlers = {
    onEvent: (nodeId, event, binding) => {
      events.push({ nodeId, event, binding });
    },
  };

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
    events = [];
    renderer = new MuipRenderer(host, handlers);
    vi.useRealTimers();
  });

  afterEach(() => {
    renderer.destroy();
    host.remove();
  });

  it('renders a valid document as semantic, id-keyed DOM', () => {
    renderer.render(
      rootStack([
        node({ type: 'Badge', id: 'badge', props: { text: 'New' } }),
        node({ type: 'Button', id: 'save', props: { label: 'Save' }, events: { onClick: { action: 'submit' } } }),
      ]),
    );

    const badge = host.querySelector<HTMLElement>('[data-muip-id="badge"]');
    const button = host.querySelector<HTMLButtonElement>('[data-muip-id="save"]');
    expect(badge?.tagName).toBe('SPAN');
    expect(badge?.textContent).toBe('New');
    expect(button?.tagName).toBe('BUTTON');
    expect(button?.type).toBe('button');
    expect(button?.textContent).toBe('Save');
    expect(host.querySelectorAll('[data-muip-id]')).toHaveLength(3);
  });

  it('renders prop text as text, never as markup', () => {
    const payload = '<script>alert(1)</script><b>bold</b>';
    renderer.render(rootStack([node({ type: 'Badge', id: 'badge', props: { text: payload } })]));

    const badge = host.querySelector<HTMLElement>('[data-muip-id="badge"]');
    expect(badge?.textContent).toBe(payload);
    expect(host.querySelector('script')).toBeNull();
    expect(host.querySelector('b')).toBeNull();
  });

  it('renders catalogued but unsupported types as a labelled group placeholder', () => {
    expect(isSupportedComponent('SplitPane')).toBe(false);
    const document = rootStack([
      node({
        type: 'SplitPane',
        id: 'split',
        children: [node({ type: 'Badge', id: 'child', props: { text: 'kept' } })],
      }),
    ]);
    const result = validateDocument(document);
    expect(result.placeholders).toContain('SplitPane');

    renderer.render(result.node);
    const placeholder = host.querySelector<HTMLElement>('[data-muip-id="split"]');
    expect(placeholder?.getAttribute('role')).toBe('group');
    expect(placeholder?.textContent).toContain('Komponen SplitPane belum didukung versi ini');
    expect(placeholder?.querySelector('[data-muip-id="child"]')?.textContent).toBe('kept');
  });

  it('renders phase-3 actions as disabled placeholders and never calls the handler', () => {
    const document = rootStack([
      node({
        type: 'Button',
        id: 'ai',
        props: { label: 'Ask AI' },
        events: { onClick: { action: 'ai.prompt', params: { prompt: 'hi' } } },
      }),
    ]);
    const result = validateDocument(document);
    expect(result.deferredActions).toEqual(['ai.prompt']);

    renderer.render(result.node);
    const button = host.querySelector<HTMLButtonElement>('[data-muip-id="ai"]');
    expect(button?.getAttribute('data-muip-deferred-action')).toBe('ai.prompt');
    expect(button?.disabled).toBe(true);
    expect(button?.getAttribute('aria-disabled')).toBe('true');

    button?.click();
    expect(events).toHaveLength(0);
  });

  it('dispatches phase-1 events with the node id and binding', () => {
    renderer.render(
      rootStack([
        node({
          type: 'Button',
          id: 'go',
          props: { label: 'Go' },
          events: { onClick: { action: 'open.route', params: { route: '/next' } } },
        }),
      ]),
    );
    host.querySelector<HTMLButtonElement>('[data-muip-id="go"]')?.click();
    expect(events).toEqual([
      { nodeId: 'go', event: 'onClick', binding: { action: 'open.route', params: { route: '/next' } } },
    ]);
  });

  it('maps a11y label, description, required, disabled, role, and live', () => {
    renderer.render(
      rootStack([
        node({
          type: 'TextField',
          id: 'email',
          props: { label: 'Email' },
          a11y: { label: 'Email address', description: 'Never shared', required: true },
        }),
        node({ type: 'Button', id: 'disabled', props: { label: 'Send' }, a11y: { disabled: true } }),
        node({ type: 'Toast', id: 'status', props: { text: 'Saved' }, a11y: { live: 'assertive' } }),
        node({ type: 'Card', id: 'card', props: { title: 'Panel' }, a11y: { role: 'region' } }),
      ]),
    );

    const input = host.querySelector<HTMLInputElement>('[data-muip-id="email"] input');
    expect(input?.getAttribute('aria-label')).toBe('Email address');
    expect(input?.getAttribute('aria-description')).toBe('Never shared');
    expect(input?.getAttribute('aria-required')).toBe('true');
    expect(input?.required).toBe(true);

    const disabled = host.querySelector<HTMLButtonElement>('[data-muip-id="disabled"]');
    expect(disabled?.disabled).toBe(true);
    expect(disabled?.getAttribute('aria-disabled')).toBe('true');

    const status = host.querySelector<HTMLElement>('[data-muip-id="status"]');
    expect(status?.getAttribute('role')).toBe('status');
    expect(status?.getAttribute('aria-live')).toBe('assertive');

    expect(host.querySelector<HTMLElement>('[data-muip-id="card"]')?.getAttribute('role')).toBe('region');
  });

  it('keeps the same element and focus across a patch', () => {
    renderer.render(rootStack([node({ type: 'TextField', id: 'name', props: { label: 'Name', value: 'a' } })]));
    const input = host.querySelector<HTMLInputElement>('[data-muip-id="name"] input');
    expect(input).not.toBeNull();
    renderer.focusNode('name');
    expect(document.activeElement).toBe(input);

    renderer.patch([{ op: 'update', id: 'name', props: { value: 'b' } }]);

    const after = host.querySelector<HTMLInputElement>('[data-muip-id="name"] input');
    expect(after).toBe(input);
    expect(after?.value).toBe('b');
    expect(document.activeElement).toBe(input);
  });

  it('applies patches atomically: an invalid operation leaves the DOM untouched', () => {
    renderer.render(rootStack([node({ type: 'Badge', id: 'badge', props: { text: 'stable' } })]));
    const badge = host.querySelector<HTMLElement>('[data-muip-id="badge"]');
    const beforeText = host.textContent;
    const beforeChildren = host.querySelectorAll('[data-muip-id]').length;

    const error = expectBridgeError(() => renderer.patch([{ op: 'remove', id: 'missing' }]));
    expect(error.details).toMatchObject({ reason: 'remove_target_missing' });
    expect(host.querySelector<HTMLElement>('[data-muip-id="badge"]')).toBe(badge);
    expect(host.textContent).toBe(beforeText);
    expect(host.querySelectorAll('[data-muip-id]').length).toBe(beforeChildren);

    // The renderer still holds the previous document, so a valid patch works.
    renderer.patch([{ op: 'update', id: 'badge', props: { text: 'updated' } }]);
    expect(host.querySelector('[data-muip-id="badge"]')?.textContent).toBe('updated');
  });

  it('inserts and removes nodes while preserving untouched elements', () => {
    renderer.render(
      rootStack([
        node({ type: 'Badge', id: 'one', props: { text: 'one' } }),
        node({ type: 'Badge', id: 'two', props: { text: 'two' } }),
      ]),
    );
    const one = host.querySelector('[data-muip-id="one"]');
    const operations: PatchOperation[] = [
      { op: 'insert', parentId: 'root', index: 1, node: node({ type: 'Badge', id: 'middle', props: { text: 'middle' } }) },
      { op: 'remove', id: 'two' },
    ];
    renderer.patch(operations);

    const ids = Array.from(host.querySelectorAll('[data-muip-id]')).map((element) => element.getAttribute('data-muip-id'));
    expect(ids).toEqual(['root', 'one', 'middle']);
    expect(host.querySelector('[data-muip-id="one"]')).toBe(one);
  });

  it('moves nodes without recreating their elements', () => {
    renderer.render(
      node({
        type: 'Stack',
        id: 'root',
        children: [
          node({ type: 'Stack', id: 'left', children: [node({ type: 'Badge', id: 'badge', props: { text: 'move me' } })] }),
          node({ type: 'Stack', id: 'right' }),
        ],
      }),
    );
    const badge = host.querySelector('[data-muip-id="badge"]');
    expect(badge?.parentElement?.getAttribute('data-muip-id')).toBe('left');

    renderer.patch([{ op: 'move', id: 'badge', parentId: 'right', index: 0 }]);

    const moved = host.querySelector('[data-muip-id="badge"]');
    expect(moved).toBe(badge);
    expect(moved?.parentElement?.getAttribute('data-muip-id')).toBe('right');
  });

  it('translates validated style tokens through fixed tables', () => {
    renderer.render(
      rootStack([node({ type: 'Badge', id: 'badge', props: { text: 'x' }, style: { padding: 'md', radius: 'lg' } })]),
    );
    const badge = host.querySelector<HTMLElement>('[data-muip-id="badge"]');
    expect(badge?.style.getPropertyValue('--muip-padding')).toBe('0.75rem');
    expect(badge?.style.getPropertyValue('--muip-radius')).toBe('0.75rem');

    renderer.patch([{ op: 'update', id: 'badge', style: { padding: 'sm' } }]);
    expect(badge?.style.getPropertyValue('--muip-padding')).toBe('0.5rem');
    expect(badge?.style.getPropertyValue('--muip-radius')).toBe('0.75rem');
  });

  it('rejects duplicate ids, arbitrary style values, and unknown components', () => {
    const duplicate = () =>
      validateDocument(
        rootStack([
          node({ type: 'Badge', id: 'same', props: { text: 'a' } }),
          node({ type: 'Badge', id: 'same', props: { text: 'b' } }),
        ]),
      );
    const duplicateError = expectBridgeError(duplicate);
    expect(duplicateError.details).toMatchObject({ reason: 'duplicate_node_id' });

    const styleError = expectBridgeError(() =>
      validateDocument(node({ type: 'Stack', id: 'root', style: { padding: '4px' } })),
    );
    expect(styleError.details).toMatchObject({ reason: 'invalid_style_value', token: 'padding' });

    const colorError = expectBridgeError(() =>
      validateDocument(node({ type: 'Stack', id: 'root', style: { color: 'red' } })),
    );
    expect(colorError.details).toMatchObject({ reason: 'invalid_style_value', token: 'color' });

    const unknownError = expectBridgeError(() =>
      validateDocument(rootStack([node({ type: 'DefinitelyNotAComponent', id: 'bad' })])),
    );
    expect(unknownError.details).toMatchObject({ reason: 'unknown_component' });
  });

  it('refuses javascript: URLs and keeps the alt text visible', () => {
    renderer.render(
      rootStack([
        node({ type: 'Image', id: 'image', props: { src: 'javascript:alert(1)', alt: 'Poster' } }),
      ]),
    );
    const image = host.querySelector<HTMLElement>('[data-muip-id="image"]');
    expect(image?.querySelector('img')?.hasAttribute('src')).toBe(false);
    expect(image?.textContent).toBe('Poster');

    renderer.patch([{ op: 'update', id: 'image', props: { src: 'https://cdn.example/p.png' } }]);
    expect(host.querySelector('[data-muip-id="image"] img')?.getAttribute('src')).toBe('https://cdn.example/p.png');
  });

  it('emits toast messages in a role=status region and dismisses them after 5s', () => {
    vi.useFakeTimers();
    renderer.toast('Saved locally');
    const region = host.querySelector<HTMLElement>('[role="status"]');
    expect(region).not.toBeNull();
    expect(region?.textContent).toContain('Saved locally');

    vi.advanceTimersByTime(5000);
    expect(host.textContent).not.toContain('Saved locally');
  });

  it('destroy clears the root, records, and pending toast timers', () => {
    vi.useFakeTimers();
    renderer.render(rootStack([node({ type: 'Badge', id: 'badge', props: { text: 'x' } })]));
    renderer.toast('bye');
    expect(host.children.length).toBeGreaterThan(0);

    renderer.destroy();
    expect(host.children).toHaveLength(0);
    vi.advanceTimersByTime(5000);
    expect(host.children).toHaveLength(0);
  });

  it('implements a real builder for every supported component', () => {
    expect([...IMPLEMENTED_COMPONENTS].sort()).toEqual([...SUPPORTED_COMPONENTS].sort());
    for (const name of SUPPORTED_COMPONENTS) {
      expect(typeof COMPONENT_BUILDERS[name]).toBe('function');
    }

    const children = SUPPORTED_COMPONENTS.map((type, index) =>
      node({ type, id: `component-${index}`, props: { label: 'Label' } }),
    );
    renderer.render(rootStack(children));
    SUPPORTED_COMPONENTS.forEach((_type, index) => {
      expect(host.querySelector(`[data-muip-id="component-${index}"]`)).not.toBeNull();
    });
    expect(host.querySelector('[data-muip-placeholder]')).toBeNull();
  });

  it('rejects a patch before the first render', () => {
    const error = expectBridgeError(() => renderer.patch([{ op: 'update', id: 'x', props: {} }]));
    expect(error.details).toMatchObject({ reason: 'patch_without_document' });
  });
});
