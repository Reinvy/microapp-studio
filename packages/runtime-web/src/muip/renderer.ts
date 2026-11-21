/**
 * MUIP renderer.
 *
 * Consumes validated trees only (`validateDocument` / `applyPatch`) and mounts
 * one dispatchable DOM tree inside the host element. Invariants:
 *
 *  - No HTML string APIs: text is only ever written through `textContent`.
 *  - DOM elements are keyed by node id and reused across patches, so focus,
 *    selection, and scroll survive an update.
 *  - A patch is atomic: `applyPatch` must succeed before any DOM mutation.
 *  - Listeners are attached only for the events a node actually declares in
 *    `on`, and are detached as soon as the node leaves the document.
 *  - Every callback reports the canonical MUIP event name (`press`, `change`,
 *    `submit`, `focus`, `blur`, `longPress`) with the declarative action.
 */

import { BridgeError } from '../bridge/errors';
import { buildComponent, type ComponentView } from './components';
import {
  applyPatch,
  validateDocument,
  type MuipAction,
  type MuipEvent,
  type MuipNode,
  type PatchOperation,
} from './validate';

export interface RendererHandlers {
  onEvent: (nodeId: string, event: MuipEvent, action: MuipAction, node: MuipNode) => void;
}

const FOCUSABLE = 'input, select, textarea, button, a[href], [tabindex]';
const LONG_PRESS_MS = 500;
const TOAST_DURATION_MS = 4_000;

/** Elements that already translate Enter/Space into a native activation. */
function hasNativeActivation(element: HTMLElement): boolean {
  if (element.matches('button, input, select, textarea, a[href]')) return true;
  return element.querySelector('button, input, select, textarea, a[href]') !== null;
}

interface NodeRecord {
  readonly view: ComponentView;
  readonly element: HTMLElement;
  /** Removes the listeners and timers attached by the last sync. */
  detach: () => void;
}

interface ToastRecord {
  readonly element: HTMLElement;
  timer: number | null;
}

function isManagedElement(node: ChildNode): node is HTMLElement {
  return node instanceof HTMLElement && node.hasAttribute('data-muip-id');
}

/** Every id in the incoming document; keeps moved elements reusable. */
function collectIds(root: MuipNode): Set<string> {
  const ids = new Set<string>();
  const stack: MuipNode[] = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) break;
    ids.add(current.id);
    stack.push(...(current.children ?? []));
  }
  return ids;
}

export class MuipRenderer {
  private readonly root: HTMLElement;
  private readonly handlers: RendererHandlers;
  private readonly stage: HTMLDivElement;
  private readonly toastRegion: HTMLDivElement;
  private readonly records = new Map<string, NodeRecord>();
  private readonly toasts = new Set<ToastRecord>();
  private activeIds = new Set<string>();
  private current: MuipNode | null = null;

  constructor(root: HTMLElement, handlers: RendererHandlers) {
    this.root = root;
    this.handlers = handlers;

    this.stage = document.createElement('div');
    this.stage.className = 'muip-stage';
    this.stage.setAttribute('data-muip-stage', '');

    this.toastRegion = document.createElement('div');
    this.toastRegion.className = 'muip-toast-region';
    this.toastRegion.setAttribute('role', 'status');
    this.toastRegion.setAttribute('aria-live', 'polite');

    root.append(this.stage, this.toastRegion);
  }

  /** Full render; validates again so a raw tree can never reach the DOM. */
  render(node: MuipNode): void {
    const validated = validateDocument(node).node;
    this.clearStage();
    this.activeIds = collectIds(validated);
    this.syncChildren(this.stage, [validated]);
    this.current = validated;
  }

  /**
   * Apply a patch batch atomically. The DOM is untouched when `applyPatch`
   * throws; on success only changed subtrees are reconciled.
   */
  patch(operations: PatchOperation[]): void {
    if (this.current === null) {
      throw new BridgeError('E-RUN-004', { reason: 'patch_without_document' });
    }
    const next = applyPatch(this.current, operations);
    this.activeIds = collectIds(next);
    this.syncChildren(this.stage, [next]);
    this.current = next;
  }

  /** Focus the control inside `id`; unknown ids are ignored. */
  focusNode(id: string): void {
    const record = this.records.get(id);
    if (!record) return;
    const target = record.element.matches(FOCUSABLE)
      ? record.element
      : record.element.querySelector<HTMLElement>(FOCUSABLE);
    target?.focus();
  }

  /** Transient status message; sanitised through `textContent`. */
  toast(message: string): void {
    const element = document.createElement('div');
    element.className = 'muip-toast-message';
    element.dataset.muipToast = '';
    element.textContent = message;
    element.style.padding = 'var(--mads-space-2) var(--mads-space-3)';
    element.style.marginTop = 'var(--mads-space-2)';
    element.style.borderRadius = 'var(--mads-radius-clay-md)';
    element.style.backgroundColor = 'var(--mads-color-surface-raised)';
    element.style.boxShadow = 'var(--mads-clay-shadow-2)';
    element.style.fontFamily = 'var(--mads-font-ui)';
    element.style.fontSize = 'var(--mads-text-14)';
    element.style.color = 'var(--mads-color-fg)';
    this.toastRegion.append(element);

    const record: ToastRecord = { element, timer: null };
    const dismiss = (): void => {
      clearTimeout(record.timer ?? undefined);
      record.timer = null;
      this.toasts.delete(record);
      element.remove();
    };
    const arm = (): void => {
      clearTimeout(record.timer ?? undefined);
      record.timer = window.setTimeout(dismiss, TOAST_DURATION_MS);
    };
    const pause = (): void => {
      clearTimeout(record.timer ?? undefined);
      record.timer = null;
    };
    const resume = (): void => {
      if (record.timer !== null || !element.isConnected) return;
      arm();
    };

    element.addEventListener('pointerenter', pause);
    element.addEventListener('pointerleave', resume);
    element.addEventListener('focusin', pause);
    element.addEventListener('focusout', resume);
    this.toasts.add(record);
    arm();
  }

  /** Tear down every element, listener, and timer this renderer owns. */
  destroy(): void {
    this.clearStage();
    for (const record of this.toasts) {
      clearTimeout(record.timer ?? undefined);
      record.element.remove();
    }
    this.toasts.clear();
    this.toastRegion.replaceChildren();
    this.stage.remove();
    this.toastRegion.remove();
    this.root.replaceChildren();
    this.current = null;
  }

  // -------------------------------------------------------------------------
  // Reconciliation
  // -------------------------------------------------------------------------

  private clearStage(): void {
    for (const record of this.records.values()) record.detach();
    this.records.clear();
    this.stage.replaceChildren();
    this.current = null;
  }

  private syncChildren(container: HTMLElement, nodes: MuipNode[]): void {
    const desired = new Set<string>(nodes.map((node) => node.id));
    for (const child of Array.from(container.children)) {
      if (!isManagedElement(child)) continue;
      const id = child.dataset.muipId ?? '';
      // Ids still present elsewhere in the document are moves, not removals;
      // their record keeps the very same element.
      if (!desired.has(id) && !this.activeIds.has(id)) this.dropElement(child);
    }
    // Walk backwards so the next sibling is already placed; unchanged elements
    // are left in place (no detach -> focus and scroll survive).
    let reference: Node | null = null;
    for (let index = nodes.length - 1; index >= 0; index -= 1) {
      reference = this.syncNode(nodes[index], container, reference);
    }
  }

  private syncNode(node: MuipNode, container: HTMLElement, reference: Node | null): HTMLElement {
    let record = this.records.get(node.id);
    if (record && record.element.dataset.muipType !== node.type) {
      this.dropElement(record.element);
      record = undefined;
    }
    if (!record) {
      record = this.createRecord(node);
      this.records.set(node.id, record);
    }
    record.view.sync(node);
    this.applyInteractions(record, node);
    this.place(container, record.element, reference);
    this.syncChildren(record.view.content, node.children ?? []);
    return record.element;
  }

  private createRecord(node: MuipNode): NodeRecord {
    const view = buildComponent(node);
    const element = view.element;
    element.setAttribute('data-muip-id', node.id);
    element.setAttribute('data-muip-type', node.type);
    return { view, element, detach: () => undefined };
  }

  private place(container: HTMLElement, element: HTMLElement, reference: Node | null): void {
    if (reference !== null) {
      if (element.parentNode !== container || element.nextSibling !== reference) {
        container.insertBefore(element, reference);
      }
      return;
    }
    if (element.parentNode !== container || element.nextSibling !== null) {
      container.appendChild(element);
    }
  }

  /**
   * Attach exactly the listeners the node declares. The canonical MUIP event
   * name is reported, never the raw DOM event name.
   */
  private applyInteractions(record: NodeRecord, node: MuipNode): void {
    record.detach();

    const bindings = node.on;
    if (bindings === undefined) {
      record.detach = () => undefined;
      return;
    }

    const element = record.element;
    const cleanups: Array<() => void> = [];
    const listen = (type: string, listener: EventListener, options?: boolean | AddEventListenerOptions): void => {
      element.addEventListener(type, listener, options);
      cleanups.push(() => element.removeEventListener(type, listener, options));
    };
    const dispatch = (event: MuipEvent): void => {
      const action = bindings[event];
      if (action === undefined) return;
      this.handlers.onEvent(node.id, event, action, node);
    };

    const press = bindings.press;
    if (press !== undefined) {
      listen('click', () => dispatch('press'));
      if (!hasNativeActivation(element)) {
        listen('keydown', (event) => {
          const keyboard = event as KeyboardEvent;
          if (keyboard.key !== 'Enter' && keyboard.key !== ' ' && keyboard.key !== 'Spacebar') return;
          if (keyboard.defaultPrevented) return;
          keyboard.preventDefault();
          dispatch('press');
        });
      }
    }

    if (bindings.change !== undefined) {
      // One callback per tick: repeated `input`/`change` bursts coalesce.
      let scheduled = false;
      const fire = (): void => {
        if (scheduled) return;
        scheduled = true;
        dispatch('change');
        queueMicrotask(() => {
          scheduled = false;
        });
      };
      listen('input', fire);
      listen('change', fire);
    }

    if (bindings.submit !== undefined) {
      listen('submit', (event) => {
        event.preventDefault();
        dispatch('submit');
      });
    }

    if (bindings.focus !== undefined || bindings.blur !== undefined) {
      // `focus`/`blur` do not bubble, so capture on the wrapper catches the
      // inner control; `focusin`/`focusout` cover the bubbling path. The guard
      // keeps one callback per transition.
      let focused = false;
      const onFocus = (): void => {
        if (focused) return;
        focused = true;
        dispatch('focus');
      };
      const onBlur = (): void => {
        if (!focused) return;
        focused = false;
        dispatch('blur');
      };
      if (bindings.focus !== undefined) {
        listen('focus', onFocus, true);
        listen('focusin', onFocus);
      }
      if (bindings.blur !== undefined) {
        listen('blur', onBlur, true);
        listen('focusout', onBlur);
      }
    }

    if (bindings.longPress !== undefined) {
      let timer: number | null = null;
      const cancel = (): void => {
        clearTimeout(timer ?? undefined);
        timer = null;
      };
      const start = (): void => {
        cancel();
        timer = window.setTimeout(() => {
          timer = null;
          dispatch('longPress');
        }, LONG_PRESS_MS);
      };
      listen('pointerdown', start);
      listen('pointerup', cancel);
      listen('pointerleave', cancel);
      listen('pointercancel', cancel);
      cleanups.push(cancel);
    }

    record.detach = () => {
      for (const cleanup of cleanups) cleanup();
    };
  }

  /** Remove an element with its whole subtree from DOM and the record map. */
  private dropElement(element: HTMLElement): void {
    const doomed = new Set<HTMLElement>([element]);
    for (const descendant of Array.from(element.querySelectorAll<HTMLElement>('[data-muip-id]'))) {
      doomed.add(descendant);
    }
    for (const candidate of doomed) {
      const id = candidate.dataset.muipId;
      if (id === undefined) continue;
      const record = this.records.get(id);
      if (record) record.detach();
      this.records.delete(id);
    }
    element.remove();
  }
}
