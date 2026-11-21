/**
 * MUIP validation.
 *
 * Validation is fail-closed: the first violation throws a `BridgeError`, so a
 * partially valid document never reaches the renderer. Every rule below comes
 * from `docs/03-specs/ui-protocol.md`:
 *
 *   - one root, depth ≤ 32, ≤ 2000 nodes, ≤ 512 KiB payload;
 *   - `type` must be one of the 120 catalog components (unknown types are
 *     rejected, never remapped);
 *   - `id` is `^[a-zA-Z][a-zA-Z0-9_-]{0,63}$` and unique per document;
 *   - only `type`, `id`, `props`, `children`, `on` are allowed on a node;
 *     `html`, `css`, `style`, and `script` are rejected by name;
 *   - props must be in the component allowlist, ≤ 24 per node, strings ≤ 2048
 *     characters, arrays ≤ 64 items;
 *   - `items`, `options`, `columns`, `rows` may hold arrays of small flat
 *     objects (≤ 64 items, 16 scalar keys) — the documented "objek terbatas"
 *     allowance; every other prop stays scalar or array-of-scalar;
 *   - `on` accepts exactly the six documented events, each with one declarative
 *     action.
 */

import { BridgeError } from '../bridge/errors';
import { isRecord } from '../types/guards';
import { COMPONENT_CATALOG } from './catalog.generated';
import { allowedProps, canContainChildren, isComplexListProp } from './props';

export const MUIP_VERSION = 1;
export const MAX_DEPTH = 32;
export const MAX_NODES = 2000;
export const MAX_PAYLOAD_BYTES = 512 * 1024;
export const MAX_STRING_LENGTH = 2048;
export const MAX_ID_LENGTH = 64;
export const MAX_PROPS = 24;
export const MAX_ARRAY_ITEMS = 64;
export const MAX_OBJECT_KEYS = 16;

export const EVENTS = ['press', 'change', 'submit', 'focus', 'blur', 'longPress'] as const;
export type MuipEvent = (typeof EVENTS)[number];

export const ACTIONS = ['navigate', 'setState', 'callBridge', 'openSheet', 'closeSheet', 'toast'] as const;
export type MuipActionName = (typeof ACTIONS)[number];

export interface MuipAction {
  action: MuipActionName;
  target?: string;
  /** `"<ns>.<method>"` for `callBridge`, e.g. `"storage.set"`. */
  method?: string;
  params?: Record<string, string | number | boolean>;
}

export type MuipBindings = Partial<Record<MuipEvent, MuipAction>>;

export interface MuipNode {
  type: string;
  id: string;
  props?: Record<string, unknown>;
  children?: MuipNode[];
  on?: MuipBindings;
}

export interface ValidationResult {
  node: MuipNode;
  nodeCount: number;
  /** Nodes whose component is catalogued as `advanced` (rendered as placeholders). */
  placeholders: string[];
  /** Bridge calls declared by `on.callBridge`, for the audit trail. */
  bridgeCalls: string[];
}

const SUPPORTED: ReadonlySet<string> = new Set(COMPONENT_CATALOG.map((component) => component.name));

const FORBIDDEN_FIELDS = ['html', 'css', 'style', 'script', 'innerHTML', 'href', 'src'];

const ID_PATTERN = /^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/;
const CALL_BRIDGE_METHOD = /^[a-z][a-zA-Z]*\.[a-z][a-zA-Z]*$/;

function fail(reason: string, details?: Record<string, unknown>): never {
  throw new BridgeError('E-RUN-004', { reason, ...details });
}

function checkString(value: string, path: string): string {
  if (value.length > MAX_STRING_LENGTH) {
    fail('string_too_long', { path, maxLength: MAX_STRING_LENGTH });
  }
  return value;
}

function isScalar(value: unknown): value is string | number | boolean | null {
  return (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value))
  );
}

/** Scalars for a normal prop; arrays of scalars when the prop is a list. */
function checkPropValue(prop: string, value: unknown, path: string): unknown {
  if (isScalar(value)) {
    return typeof value === 'string' ? checkString(value, path) : value;
  }
  if (Array.isArray(value)) {
    if (value.length > MAX_ARRAY_ITEMS) {
      fail('prop_array_too_long', { path, maxItems: MAX_ARRAY_ITEMS });
    }
    if (isComplexListProp(prop)) {
      return value.map((item, index) => checkFlatObject(prop, item, `${path}[${index}]`));
    }
    return value.map((item, index) => {
      if (!isScalar(item)) fail('prop_value_unsupported', { path: `${path}[${index}]` });
      return typeof item === 'string' ? checkString(item, `${path}[${index}]`) : item;
    });
  }
  fail('prop_value_unsupported', { path, prop });
}

/** The documented "objek terbatas": flat, scalar-valued, bounded. */
function checkFlatObject(prop: string, value: unknown, path: string): Record<string, unknown> {
  if (!isRecord(value)) fail('complex_prop_item_not_object', { path, prop });
  const entries = Object.entries(value);
  if (entries.length > MAX_OBJECT_KEYS) {
    fail('complex_prop_item_too_wide', { path, maxKeys: MAX_OBJECT_KEYS });
  }
  const out: Record<string, unknown> = {};
  for (const [key, nested] of entries) {
    checkString(key, `${path}.key`);
    if (!isScalar(nested)) fail('complex_prop_item_not_scalar', { path: `${path}.${key}` });
    out[key] = typeof nested === 'string' ? checkString(nested, `${path}.${key}`) : nested;
  }
  return out;
}

function checkProps(type: string, raw: unknown, path: string): Record<string, unknown> {
  if (!isRecord(raw)) fail('props_not_object', { path });
  const entries = Object.entries(raw);
  if (entries.length > MAX_PROPS) fail('too_many_props', { path, maxProps: MAX_PROPS });
  const allowed = allowedProps(type);
  const out: Record<string, unknown> = {};
  for (const [key, value] of entries) {
    if (FORBIDDEN_FIELDS.includes(key)) fail('forbidden_prop', { path: `${path}.${key}` });
    if (!allowed.has(key)) fail('prop_not_allowed', { path: `${path}.${key}`, type });
    out[key] = checkPropValue(key, value, `${path}.${key}`);
  }
  return out;
}

function checkAction(raw: unknown, path: string): MuipAction {
  if (!isRecord(raw)) fail('action_not_object', { path });
  const keys = Object.keys(raw);
  for (const key of keys) {
    if (!['action', 'target', 'method', 'params'].includes(key)) fail('action_field_not_allowed', { path, key });
  }
  const name = raw.action;
  if (typeof name !== 'string' || !(ACTIONS as readonly string[]).includes(name)) {
    fail('action_not_allowed', { path, action: String(name) });
  }
  const action: MuipAction = { action: name as MuipActionName };
  if (raw.target !== undefined) {
    if (typeof raw.target !== 'string' || raw.target.length > 128) fail('action_target_invalid', { path });
    action.target = raw.target;
  }
  if (raw.method !== undefined) {
    if (typeof raw.method !== 'string' || raw.method.length > 64) fail('action_method_invalid', { path });
    action.method = raw.method;
  }
  if (name === 'callBridge') {
    if (!action.method || !CALL_BRIDGE_METHOD.test(action.method)) {
      fail('action_method_invalid', { path, method: action.method ?? null });
    }
  }
  if (raw.params !== undefined) {
    if (!isRecord(raw.params)) fail('action_params_invalid', { path });
    const entries = Object.entries(raw.params);
    if (entries.length > MAX_OBJECT_KEYS) fail('action_params_invalid', { path });
    const params: Record<string, string | number | boolean> = {};
    for (const [key, value] of entries) {
      if (!isScalar(value) || value === null) fail('action_params_invalid', { path: `${path}.${key}` });
      params[key] = value as string | number | boolean;
    }
    action.params = params;
  }
  return action;
}

function checkBindings(raw: unknown, path: string): MuipBindings {
  if (!isRecord(raw)) fail('on_not_object', { path });
  const bindings: MuipBindings = {};
  for (const [event, value] of Object.entries(raw)) {
    if (!(EVENTS as readonly string[]).includes(event)) fail('event_not_allowed', { path, event });
    bindings[event as MuipEvent] = checkAction(value, `${path}.${event}`);
  }
  return bindings;
}

interface WalkState {
  seen: Set<string>;
  count: number;
  placeholders: Set<string>;
  bridgeCalls: Set<string>;
}

function walk(raw: unknown, state: WalkState, depth: number, path: string): MuipNode {
  if (depth > MAX_DEPTH) fail('depth_exceeded', { path, maxDepth: MAX_DEPTH });
  if (!isRecord(raw)) fail('node_not_object', { path });

  for (const key of Object.keys(raw)) {
    if (FORBIDDEN_FIELDS.includes(key)) fail('forbidden_field', { path, field: key });
    if (!['type', 'id', 'props', 'children', 'on'].includes(key)) fail('field_not_allowed', { path, field: key });
  }

  const type = raw.type;
  if (typeof type !== 'string' || type.length === 0) fail('type_missing', { path });
  if (!SUPPORTED.has(type)) fail('component_unknown', { path, type });

  const id = raw.id;
  if (typeof id !== 'string' || !ID_PATTERN.test(id)) fail('id_invalid', { path, id: String(id) });
  if (state.seen.has(id)) fail('id_duplicate', { path, id });
  state.seen.add(id);

  state.count += 1;
  if (state.count > MAX_NODES) fail('too_many_nodes', { maxNodes: MAX_NODES });

  if (COMPONENT_CATALOG.find((component) => component.name === type)?.level === 'advanced') {
    state.placeholders.add(type);
  }

  const node: MuipNode = { type, id };

  if (raw.props !== undefined) node.props = checkProps(type, raw.props, `${path}.props`);
  if (raw.on !== undefined) {
    const bindings = checkBindings(raw.on, `${path}.on`);
    for (const binding of Object.values(bindings)) {
      if (binding?.action === 'callBridge' && binding.method) state.bridgeCalls.add(binding.method);
    }
    node.on = bindings;
  }

  if (raw.children !== undefined) {
    if (!canContainChildren(type)) fail('children_not_allowed', { path, type });
    if (!Array.isArray(raw.children)) fail('children_not_array', { path });
    node.children = raw.children.map((child, index) =>
      walk(child, state, depth + 1, `${path}.children[${index}]`),
    );
  }

  return node;
}

/** Validate a full document. Accepts a single root node or a one-element array. */
export function validateDocument(raw: unknown): ValidationResult {
  let payload: string;
  try {
    payload = JSON.stringify(raw);
  } catch {
    fail('document_not_serializable');
  }
  if (new TextEncoder().encode(payload).length > MAX_PAYLOAD_BYTES) {
    fail('payload_too_large', { maxBytes: MAX_PAYLOAD_BYTES });
  }

  const roots = Array.isArray(raw) ? raw : [raw];
  if (roots.length !== 1) fail('root_count_invalid', { count: roots.length });

  const state: WalkState = { seen: new Set(), count: 0, placeholders: new Set(), bridgeCalls: new Set() };
  const node = walk(roots[0], state, 0, '$');
  return {
    node,
    nodeCount: state.count,
    placeholders: [...state.placeholders],
    bridgeCalls: [...state.bridgeCalls],
  };
}

export function isSupportedComponent(type: string): boolean {
  return SUPPORTED.has(type);
}

export function catalogSize(): number {
  return COMPONENT_CATALOG.length;
}

// ---------------------------------------------------------------------------
// Patches
// ---------------------------------------------------------------------------

const PATCH_OPS: readonly string[] = ['insert', 'update', 'remove', 'move'];

export type PatchOperation =
  | { op: 'insert'; parentId: string; index: number; node: MuipNode }
  | { op: 'update'; id: string; props: Record<string, unknown> }
  | { op: 'remove'; id: string }
  | { op: 'move'; id: string; parentId: string; index: number };

function clone(node: MuipNode): MuipNode {
  return JSON.parse(JSON.stringify(node)) as MuipNode;
}

function findParent(root: MuipNode, id: string): MuipNode | null {
  for (const child of root.children ?? []) {
    if (child.id === id) return root;
    const nested = findParent(child, id);
    if (nested) return nested;
  }
  return null;
}

/** Apply structural patches to a validated document, returning a new tree. */
export function applyPatch(root: MuipNode, operations: PatchOperation[]): MuipNode {
  let tree = clone(root);
  for (const operation of operations) {
    if (!PATCH_OPS.includes(operation.op)) fail('patch_op_unknown', { op: String(operation.op) });
    if (operation.op === 'insert') {
      const parent = operation.parentId === tree.id ? tree : findBy(tree, operation.parentId);
      if (!parent) fail('patch_parent_missing', { id: operation.parentId });
      if (!canContainChildren(parent.type)) fail('patch_parent_not_container', { id: parent.id });
      parent.children = parent.children ?? [];
      const index = Math.max(0, Math.min(operation.index, parent.children.length));
      parent.children.splice(index, 0, clone(operation.node));
      continue;
    }
    if (operation.op === 'update') {
      const target = findBy(tree, operation.id);
      if (!target) fail('patch_node_missing', { id: operation.id });
      target.props = checkProps(target.type, operation.props, `$.${operation.id}.props`);
      continue;
    }
    if (operation.op === 'remove') {
      if (operation.id === tree.id) fail('patch_root_remove');
      const parent = findParent(tree, operation.id);
      if (!parent) fail('patch_node_missing', { id: operation.id });
      parent.children = (parent.children ?? []).filter((child) => child.id !== operation.id);
      continue;
    }
    const parent = findBy(tree, operation.parentId);
    if (!parent) fail('patch_parent_missing', { id: operation.parentId });
    if (!canContainChildren(parent.type)) fail('patch_parent_not_container', { id: parent.id });
    const current = findParent(tree, operation.id);
    if (!current) fail('patch_node_missing', { id: operation.id });
    const node = findBy(tree, operation.id);
    current.children = (current.children ?? []).filter((child) => child.id !== operation.id);
    parent.children = parent.children ?? [];
    const index = Math.max(0, Math.min(operation.index, parent.children.length));
    parent.children.splice(index, 0, node as MuipNode);
  }
  tree = clone(tree);
  return tree;
}

function findBy(root: MuipNode, id: string): MuipNode | undefined {
  if (root.id === id) return root;
  for (const child of root.children ?? []) {
    const found = findBy(child, id);
    if (found) return found;
  }
  return undefined;
}
