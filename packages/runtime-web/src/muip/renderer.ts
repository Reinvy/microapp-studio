/**
 * MUIP renderer.
 *
 * Consumes validated trees only (`validateDocument` / `applyPatch`). Invariants:
 *  - No HTML string APIs: every text node goes through `textContent`.
 *  - DOM elements are keyed by node id and reused across patches so focus,
 *    selection, and scroll survive updates.
 *  - Patches are atomic: `applyPatch` must succeed before any DOM mutation.
 *  - Phase-3 actions render as disabled placeholders and never call handlers.
 */

import { BridgeError } from '../bridge/errors';
import { buildComponent, type ComponentView } from './components';
import {
  PHASE3_ACTIONS,
  applyPatch,
  validateDocument,
  type EventBinding,
  type MuipNode,
  type PatchOperation,
} from './validate';

export interface RendererHandlers {
  onEvent: (nodeId: string, event: string, binding: EventBinding) => void;
}

const DEFERRED_ACTIONS: ReadonlySet<string> = new Set<string>(PHASE3_ACTIONS);

/** DOM events a MUIP `onX` binding may attach; anything else fails closed. */
const DOM_EVENTS: Readonly<Record<string, string>> = {
  onClick: 'click',
  onInput: 'input',
  onChange: 'change',
  onSubmit: 'submit',
  onFocus: 'focus',
  onBlur: 'blur',
  onKeyDown: 'keydown',
  onKeyUp: 'keyup',
  onKeyPress: 'keypress',
  onPointerDown: 'pointerdown',
  onPointerUp: 'pointerup',
  onDoubleClick: 'dblclick',
};

const FOCUSABLE = 'input, select, textarea, button, a[href], [tabindex]';

interface NodeRecord {
  readonly view: ComponentView;
  readonly element: HTMLElement;
  /** Removes the listeners attached by the last sync. */
  detach: () => void;
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
  private readonly toastTimers = new Set<ReturnType<typeof setTimeout>>();
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
      throw new BridgeError('E-SBX-005', { reason: 'patch_without_document' });
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

  /** Transient status message; text only, auto-dismissed after 5 seconds. */
  toast(message: string): void {
    const toast = document.createElement('div');
    toast.className = 'muip-toast-message';
    toast.textContent = message;
    this.toastRegion.appendChild(toast);
    const timer = setTimeout(() => {
      this.toastTimers.delete(timer);
      toast.remove();
    }, 5000);
    this.toastTimers.add(timer);
  }

  /** Tear down every element, listener, and timer this renderer owns. */
  destroy(): void {
    this.clearStage();
    for (const timer of this.toastTimers) clearTimeout(timer);
    this.toastTimers.clear();
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
      // Ids still present elsewhere in the document are moved, not dropped;
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

  private applyInteractions(record: NodeRecord, node: MuipNode): void {
    record.detach();
    const detachers: Array<() => void> = [];
    let deferredAction: string | null = null;

    for (const [event, binding] of Object.entries(node.events ?? {})) {
      if (binding.action !== undefined && DEFERRED_ACTIONS.has(binding.action)) {
        deferredAction = binding.action;
        continue;
      }
      const domEvent = DOM_EVENTS[event];
      if (!domEvent) continue;
      const listener = (): void => this.handlers.onEvent(node.id, event, binding);
      record.element.addEventListener(domEvent, listener);
      detachers.push(() => record.element.removeEventListener(domEvent, listener));
    }
    record.detach = () => {
      for (const detach of detachers) detach();
    };

    if (deferredAction !== null) {
      record.element.setAttribute('data-muip-deferred-action', deferredAction);
      record.element.setAttribute('aria-disabled', 'true');
      if (record.element instanceof HTMLButtonElement || record.element instanceof HTMLInputElement
        || record.element instanceof HTMLSelectElement || record.element instanceof HTMLTextAreaElement) {
        record.element.disabled = true;
      }
      return;
    }
    record.element.removeAttribute('data-muip-deferred-action');
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
