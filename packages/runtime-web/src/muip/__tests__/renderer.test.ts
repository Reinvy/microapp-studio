// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BridgeError } from '../../bridge/errors';
import { MuipRenderer, type RendererHandlers } from '../renderer';
import type { MuipAction, MuipEvent, MuipNode, PatchOperation } from '../validate';

interface RecordedEvent {
  nodeId: string;
  event: MuipEvent;
  action: MuipAction;
  node: MuipNode;
}

function stack(children: MuipNode[]): MuipNode {
  return { type: 'Stack', id: 'root', children };
}

describe('MuipRenderer', () => {
  let host: HTMLDivElement;
  let events: RecordedEvent[];
  let renderer: MuipRenderer;

  const handlers: RendererHandlers = {
    onEvent: (nodeId, event, action, node) => {
      events.push({ nodeId, event, action, node });
    },
  };

  beforeEach(() => {
    host = document.createElement('div');
    document.body.append(host);
    events = [];
    renderer = new MuipRenderer(host, handlers);
    vi.useRealTimers();
  });

  afterEach(() => {
    renderer.destroy();
    host.remove();
  });

  it('keys rendered DOM by node id and uses semantic elements', () => {
    renderer.render(
      stack([
        { type: 'Badge', id: 'badge', props: { text: 'Baru' } },
        { type: 'Button', id: 'save', props: { label: 'Simpan' }, on: { press: { action: 'toast', target: 'tersimpan' } } },
      ]),
    );

    expect(host.querySelectorAll('[data-muip-id]')).toHaveLength(3);
    expect(host.querySelector<HTMLElement>('[data-muip-id="badge"]')?.textContent).toBe('Baru');
    expect(host.querySelector<HTMLElement>('[data-muip-id="save"]')?.tagName).toBe('BUTTON');
  });

  it('dispatches press exactly once per click with the declarative action', () => {
    const button: MuipNode = {
      type: 'Button',
      id: 'go',
      props: { label: 'Lanjut' },
      on: { press: { action: 'navigate', target: '/next' } },
    };
    renderer.render(stack([button]));

    host.querySelector<HTMLButtonElement>('[data-muip-id="go"]')?.click();

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      nodeId: 'go',
      event: 'press',
      action: { action: 'navigate', target: '/next' },
    });
    expect(events[0]?.node.id).toBe('go');
  });

  it('maps Enter on a non-button element with a press binding', () => {
    renderer.render(stack([{ type: 'Card', id: 'card', props: { title: 'Panel' }, on: { press: { action: 'toast', target: 'ok' } } }]));

    const card = host.querySelector<HTMLElement>('[data-muip-id="card"]');
    card?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(events.map((entry) => entry.event)).toEqual(['press']);
  });

  it('attaches no listeners for events the node does not declare', () => {
    renderer.render(stack([{ type: 'Button', id: 'plain', props: { label: 'Diam' } }]));
    host.querySelector<HTMLButtonElement>('[data-muip-id="plain"]')?.click();
    expect(events).toHaveLength(0);
  });

  it('fires change once per input tick', async () => {
    renderer.render(
      stack([{ type: 'TextField', id: 'name', props: { label: 'Nama' }, on: { change: { action: 'setState', target: 'name' } } }]),
    );
    const input = host.querySelector<HTMLInputElement>('[data-muip-id="name"] input');
    expect(input).not.toBeNull();

    const fire = (): void => {
      input?.dispatchEvent(new Event('input', { bubbles: true }));
    };
    fire();
    fire();
    expect(events).toHaveLength(1);
    expect(events[0]?.event).toBe('change');

    await Promise.resolve();
    fire();
    expect(events).toHaveLength(2);
  });

  it('fires longPress after 500 ms and not after a quick release', () => {
    vi.useFakeTimers();
    renderer.render(
      stack([
        { type: 'Button', id: 'hold', props: { label: 'Tahan' }, on: { longPress: { action: 'openSheet', target: 'menu' } } },
      ]),
    );
    const button = host.querySelector<HTMLElement>('[data-muip-id="hold"]');
    expect(button).not.toBeNull();

    button?.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    vi.advanceTimersByTime(499);
    expect(events).toHaveLength(0);
    vi.advanceTimersByTime(1);
    expect(events.map((entry) => entry.event)).toEqual(['longPress']);

    // A quick press/release inside 500 ms never fires.
    button?.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    button?.dispatchEvent(new Event('pointerup', { bubbles: true }));
    vi.advanceTimersByTime(1_000);
    expect(events).toHaveLength(1);
  });

  it('stops dispatching from a node removed by a patch', () => {
    renderer.render(
      stack([
        { type: 'Button', id: 'a', props: { label: 'A' }, on: { press: { action: 'toast', target: 'a' } } },
        { type: 'Button', id: 'b', props: { label: 'B' } },
      ]),
    );
    const removed = host.querySelector<HTMLButtonElement>('[data-muip-id="a"]');
    const operations: PatchOperation[] = [{ op: 'remove', id: 'a' }];
    renderer.patch(operations);

    expect(host.querySelector('[data-muip-id="a"]')).toBeNull();
    removed?.click();
    expect(events).toHaveLength(0);
    expect(host.querySelector('[data-muip-id="b"]')).not.toBeNull();
  });

  it('escapes toast text and dismisses it after four seconds', () => {
    vi.useFakeTimers();
    renderer.toast('<b>halo</b>');

    const region = host.querySelector<HTMLElement>('[aria-live="polite"]');
    expect(region?.textContent).toContain('<b>halo</b>');
    expect(region?.querySelector('b')).toBeNull();

    vi.advanceTimersByTime(3_999);
    expect(region?.textContent).toContain('<b>halo</b>');
    vi.advanceTimersByTime(1);
    expect(region?.textContent).not.toContain('halo');
  });

  it('focuses the right control by node id', () => {
    renderer.render(
      stack([
        { type: 'TextField', id: 'name', props: { label: 'Nama', value: 'a' } },
        { type: 'TextField', id: 'email', props: { label: 'Email' } },
      ]),
    );
    renderer.focusNode('name');
    expect(document.activeElement).toBe(host.querySelector('[data-muip-id="name"] input'));
    renderer.focusNode('email');
    expect(document.activeElement).toBe(host.querySelector('[data-muip-id="email"] input'));
  });

  it('keeps the same element instance for an unchanged node id', () => {
    renderer.render(stack([{ type: 'TextField', id: 'name', props: { label: 'Nama', value: 'a' } }]));
    const before = host.querySelector<HTMLInputElement>('[data-muip-id="name"]');

    renderer.patch([{ op: 'update', id: 'name', props: { label: 'Nama', value: 'b' } }]);
    const after = host.querySelector<HTMLInputElement>('[data-muip-id="name"]');

    expect(after).toBe(before);
    expect(after?.querySelector('input')?.value).toBe('b');
  });

  it('keeps focus across a patch', () => {
    renderer.render(stack([{ type: 'TextField', id: 'name', props: { label: 'Nama', value: 'a' } }]));
    const input = host.querySelector<HTMLInputElement>('[data-muip-id="name"] input');
    input?.focus();

    renderer.patch([{ op: 'update', id: 'name', props: { label: 'Nama', value: 'b' } }]);

    expect(document.activeElement).toBe(input);
  });

  it('applies patches atomically and keeps the previous document on failure', () => {
    renderer.render(stack([{ type: 'Badge', id: 'badge', props: { text: 'tetap' } }]));
    const badge = host.querySelector('[data-muip-id="badge"]');
    const text = host.textContent;

    expect(() => renderer.patch([{ op: 'remove', id: 'missing' }])).toThrow(BridgeError);
    expect(host.querySelector('[data-muip-id="badge"]')).toBe(badge);
    expect(host.textContent).toBe(text);

    renderer.patch([{ op: 'update', id: 'badge', props: { text: 'baru' } }]);
    expect(host.querySelector('[data-muip-id="badge"]')?.textContent).toBe('baru');
  });

  it('rejects a patch before the first render', () => {
    expect(() => renderer.patch([{ op: 'update', id: 'x', props: {} }])).toThrow(BridgeError);
  });

  it('moves nodes without recreating their elements', () => {
    renderer.render({
      type: 'Stack',
      id: 'root',
      children: [
        { type: 'Stack', id: 'left', children: [{ type: 'Badge', id: 'badge', props: { text: 'pindah' } }] },
        { type: 'Stack', id: 'right' },
      ],
    });
    const badge = host.querySelector('[data-muip-id="badge"]');

    renderer.patch([{ op: 'move', id: 'badge', parentId: 'right', index: 0 }]);

    expect(host.querySelector('[data-muip-id="badge"]')).toBe(badge);
    expect(badge?.parentElement?.getAttribute('data-muip-id')).toBe('right');
  });

  it('clears the host on destroy', () => {
    renderer.render(stack([{ type: 'Badge', id: 'badge', props: { text: 'x' } }]));
    renderer.toast('bye');
    renderer.destroy();
    expect(host.childElementCount).toBe(0);
  });
});
