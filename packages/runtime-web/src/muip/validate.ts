/**
 * MUIP v1 validation: nodes, props, events, style tokens, and accessibility.
 *
 * A node that fails any rule rejects the whole document (U-03/U-08): the
 * renderer must never end up half-applied. Text is only ever rendered as text.
 */

import { COMPONENT_CATALOG, catalogComponent } from './catalog.generated';
import { BridgeError } from '../bridge/errors';
import { isRecord } from '../types/guards';

export const MUIP_VERSION = 1;
export const MAX_DEPTH = 64;
export const MAX_NODES = 10_000;
export const MAX_PAYLOAD_BYTES = 1024 * 1024;
export const MAX_STRING_LENGTH = 64 * 1024;
export const MAX_ID_LENGTH = 64;

const ID_PATTERN = /^[A-Za-z0-9._:-]{1,64}$/;
const EVENT_PATTERN = /^on[A-Z][A-Za-z]*$/;

/** Actions the phase-1 renderer can dispatch directly. */
export const PHASE1_ACTIONS = [
  'open.route',
  'navigate.back',
  'submit',
  'reset',
  'refresh',
  'intent.send',
  'close',
] as const;

/** Accepted by the schema now, rejected with E-SBX-005 when dispatched. */
export const PHASE3_ACTIONS = ['ai.prompt', 'workflow.run'] as const;

export type MuipAction = (typeof PHASE1_ACTIONS)[number] | (typeof PHASE3_ACTIONS)[number];

const ALL_ACTIONS: ReadonlySet<string> = new Set<string>([...PHASE1_ACTIONS, ...PHASE3_ACTIONS]);

/** Components the 2.0.0 host renders natively; everything else is a placeholder. */
export const SUPPORTED_COMPONENTS: readonly string[] = [
  'AppShell',
  'Stack',
  'Grid',
  'Card',
  'Button',
  'TextField',
  'TextArea',
  'Select',
  'Checkbox',
  'Switch',
  'SearchField',
  'EmptyState',
  'Badge',
  'Alert',
  'Toast',
  'Banner',
  'Progress',
  'Skeleton',
  'Modal',
  'Sheet',
  'Toolbar',
  'Sidebar',
  'Dock',
  'WorkspaceSwitcher',
  'CommandPalette',
  'DataTable',
  'StatCard',
  'Image',
  'ErrorBoundary',
  'OfflineBanner',
  'VirtualList',
];

const SUPPORTED: ReadonlySet<string> = new Set(SUPPORTED_COMPONENTS);

const BASE_PROP_KEYS = [
  'label',
  'text',
  'title',
  'description',
  'placeholder',
  'value',
  'disabled',
  'required',
  'loading',
  'icon',
  'href',
  'src',
  'alt',
  'size',
  'variant',
  'kind',
  'open',
  'items',
  'options',
  'columns',
  'rows',
  'gap',
  'span',
  'level',
  'min',
  'max',
  'step',
  'format',
  'emptyTitle',
  'emptyDescription',
] as const;

const EXTRA_PROPS: Record<string, readonly string[]> = {
  DataTable: ['rows', 'columns', 'page', 'pageSize', 'sortKey', 'sortDirection'],
  Grid: ['columns', 'rows', 'gap', 'span'],
  Stack: ['direction', 'gap', 'align', 'justify', 'wrap'],
  Image: ['src', 'alt', 'width', 'height'],
  Progress: ['value', 'max', 'state'],
  Select: ['options', 'value', 'placeholder'],
  TextField: ['type', 'value', 'placeholder', 'inputMode'],
  TextArea: ['value', 'placeholder', 'rows'],
  Modal: ['open', 'title'],
  Sheet: ['open', 'title', 'side'],
  Alert: ['variant', 'title', 'description'],
  Badge: ['variant', 'text'],
  Button: ['variant', 'size', 'loading', 'icon', 'href'],
  StatCard: ['label', 'value', 'delta', 'trend'],
  VirtualList: ['items', 'itemHeight', 'overscan'],
};

const SPACING_TOKENS = ['none', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'];
const RADIUS_TOKENS = ['none', 'sm', 'md', 'lg', 'xl', 'full'];
const COLOR_TOKENS = ['fg', 'muted', 'bg', 'surface', 'border', 'accent', 'success', 'warning', 'error', 'inherit'];
const FONT_SIZE_TOKENS = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];
const FONT_WEIGHT_TOKENS = ['regular', 'medium', 'semibold', 'bold'];
const ALIGN_TOKENS = ['start', 'center', 'end', 'stretch', 'baseline'];
const JUSTIFY_TOKENS = ['start', 'center', 'end', 'between', 'around'];
const DIRECTION_TOKENS = ['row', 'column', 'row-reverse', 'column-reverse'];
const STATE_TOKENS = ['default', 'success', 'warning', 'error'];

const STYLE_TOKENS: Record<string, readonly string[]> = {
  padding: SPACING_TOKENS,
  paddingX: SPACING_TOKENS,
  paddingY: SPACING_TOKENS,
  margin: SPACING_TOKENS,
  gap: SPACING_TOKENS,
  radius: RADIUS_TOKENS,
  color: COLOR_TOKENS,
  background: COLOR_TOKENS,
  borderColor: COLOR_TOKENS,
  fontSize: FONT_SIZE_TOKENS,
  fontWeight: FONT_WEIGHT_TOKENS,
  align: ALIGN_TOKENS,
  justify: JUSTIFY_TOKENS,
  direction: DIRECTION_TOKENS,
  width: ['full', 'auto', 'fit'],
  height: ['full', 'auto', 'fit'],
  state: STATE_TOKENS,
};

const A11Y_KEYS = ['label', 'description', 'role', 'live', 'disabled', 'required'];
const A11Y_ROLES = [
  'button',
  'link',
  'heading',
  'list',
  'listitem',
  'navigation',
  'main',
  'dialog',
  'status',
  'alert',
  'img',
  'group',
  'region',
];
const A11Y_LIVE = ['off', 'polite', 'assertive'];
const NODE_KEYS = ['type', 'id', 'props', 'children', 'events', 'style', 'a11y'];

export interface A11yProps {
  label?: string;
  description?: string;
  role?: string;
  live?: string;
  disabled?: boolean;
  required?: boolean;
}

export interface EventBinding {
  action?: string;
  intent?: string;
  params?: Record<string, unknown>;
}

export interface MuipNode {
  type: string;
  id: string;
  props?: Record<string, unknown>;
  children?: MuipNode[];
  events?: Record<string, EventBinding>;
  style?: Record<string, string>;
  a11y?: A11yProps;
}

export interface ValidationResult {
  node: MuipNode;
  nodeCount: number;
  /** Nodes whose component is catalogued but not implemented by this host. */
  placeholders: string[];
  /** Dispatched actions that must fail closed until phase 3. */
  deferredActions: string[];
}

function fail(reason: string, details?: Record<string, unknown>): never {
  throw new BridgeError('E-SBX-005', { reason, ...details });
}

function checkString(value: string, field: string): void {
  if (value.length > MAX_STRING_LENGTH) {
    fail('string_too_long', { field, maxLength: MAX_STRING_LENGTH });
  }
}

function checkValue(value: unknown, field: string, depth = 0): void {
  if (depth > 8) fail('value_too_deep', { field });
  if (typeof value === 'function' || typeof value === 'symbol' || typeof value === 'bigint') {
    fail('unsupported_value', { field });
  }
  if (typeof value === 'string') {
    checkString(value, field);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) checkValue(item, field, depth + 1);
    return;
  }
  if (isRecord(value)) {
    for (const [key, nested] of Object.entries(value)) {
      checkString(key, `${field}.key`);
      checkValue(nested, `${field}.${key}`, depth + 1);
    }
  }
}

function validateProps(type: string, props: unknown): Record<string, unknown> {
  if (props === undefined) return {};
  if (!isRecord(props)) fail('props_not_object', { type });
  const allowed = new Set<string>(BASE_PROP_KEYS);
  for (const key of EXTRA_PROPS[type] ?? []) allowed.add(key);
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (!allowed.has(key)) {
      fail('unknown_prop', { type, prop: key });
    }
    if (/^on[A-Z]/.test(key)) {
      fail('event_handler_prop_forbidden', { type, prop: key });
    }
    checkValue(value, `props.${key}`);
    out[key] = value;
  }
  return out;
}

function validateEvents(events: unknown): Record<string, EventBinding> {
  if (events === undefined) return {};
  if (!isRecord(events)) fail('events_not_object');
  const out: Record<string, EventBinding> = {};
  for (const [name, binding] of Object.entries(events)) {
    if (!EVENT_PATTERN.test(name)) fail('invalid_event_name', { event: name });
    if (!isRecord(binding)) fail('event_binding_not_object', { event: name });
    const keys = Object.keys(binding);
    for (const key of keys) {
      if (!['action', 'intent', 'params'].includes(key)) {
        fail('unknown_event_key', { event: name, key });
      }
    }
    const action = binding.action;
    const intent = binding.intent;
    if (action === undefined && intent === undefined) {
      fail('event_without_action', { event: name });
    }
    if (action !== undefined && intent !== undefined) {
      fail('event_action_and_intent', { event: name });
    }
    if (action !== undefined) {
      if (typeof action !== 'string' || !ALL_ACTIONS.has(action)) {
        fail('unknown_action', { event: name });
      }
    }
    if (intent !== undefined) {
      if (typeof intent !== 'string' || intent.length === 0) {
        fail('invalid_intent', { event: name });
      }
    }
    if (binding.params !== undefined) {
      if (!isRecord(binding.params)) fail('event_params_not_object', { event: name });
      checkValue(binding.params, `events.${name}.params`);
    }
    out[name] = {
      action: action as string | undefined,
      intent: intent as string | undefined,
      params: binding.params as Record<string, unknown> | undefined,
    };
  }
  return out;
}

function validateStyle(style: unknown): Record<string, string> {
  if (style === undefined) return {};
  if (!isRecord(style)) fail('style_not_object');
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(style)) {
    const tokens = STYLE_TOKENS[key];
    if (!tokens) fail('unknown_style_token', { token: key });
    if (typeof value !== 'string' || !tokens.includes(value)) {
      fail('invalid_style_value', { token: key, value: String(value) });
    }
    out[key] = value;
  }
  return out;
}

function validateA11y(a11y: unknown): A11yProps {
  if (a11y === undefined) return {};
  if (!isRecord(a11y)) fail('a11y_not_object');
  const out: A11yProps = {};
  for (const [key, value] of Object.entries(a11y)) {
    if (!A11Y_KEYS.includes(key)) fail('unknown_a11y_key', { key });
    if (key === 'label' || key === 'description') {
      if (typeof value !== 'string') fail('a11y_string_expected', { key });
      checkString(value, `a11y.${key}`);
      if (key === 'label') out.label = value;
      else out.description = value;
    } else if (key === 'role') {
      if (typeof value !== 'string' || !A11Y_ROLES.includes(value)) {
        fail('invalid_a11y_role', { role: String(value) });
      }
      out.role = value;
    } else if (key === 'live') {
      if (typeof value !== 'string' || !A11Y_LIVE.includes(value)) {
        fail('invalid_a11y_live', { live: String(value) });
      }
      out.live = value;
    } else {
      if (typeof value !== 'boolean') fail('a11y_boolean_expected', { key });
      if (key === 'disabled') out.disabled = value;
      else out.required = value;
    }
  }
  return out;
}

interface WalkState {
  seen: Set<string>;
  count: number;
  placeholders: string[];
  deferredActions: string[];
}

function walk(node: unknown, state: WalkState, depth: number): MuipNode {
  if (depth > MAX_DEPTH) fail('tree_too_deep', { maxDepth: MAX_DEPTH });
  if (!isRecord(node)) fail('node_not_object');
  for (const key of Object.keys(node)) {
    if (!NODE_KEYS.includes(key)) fail('unknown_node_key', { key });
  }
  const type = node.type;
  const id = node.id;
  if (typeof type !== 'string' || !catalogComponent(type)) {
    // U-02/U-16: unknown types are rejected; they never fall through to a
    // generic element and they are audited by the caller.
    fail('unknown_component', { type: String(type) });
  }
  if (typeof id !== 'string' || !ID_PATTERN.test(id) || id.length > MAX_ID_LENGTH) {
    fail('invalid_node_id', { id: String(id) });
  }
  if (state.seen.has(id)) fail('duplicate_node_id', { id });
  state.seen.add(id);
  state.count += 1;
  if (state.count > MAX_NODES) fail('too_many_nodes', { maxNodes: MAX_NODES });
  if (!SUPPORTED.has(type)) state.placeholders.push(type);

  const props = validateProps(type, node.props);
  const events = validateEvents(node.events);
  for (const binding of Object.values(events)) {
    if (binding.action && (PHASE3_ACTIONS as readonly string[]).includes(binding.action)) {
      state.deferredActions.push(binding.action);
    }
  }
  const style = validateStyle(node.style);
  const a11y = validateA11y(node.a11y);

  let children: MuipNode[] | undefined;
  if (node.children !== undefined) {
    if (!Array.isArray(node.children)) fail('children_not_array', { id });
    children = node.children.map((child) => walk(child, state, depth + 1));
  }

  const result: MuipNode = { type, id };
  if (Object.keys(props).length > 0) result.props = props;
  if (children && children.length > 0) result.children = children;
  if (Object.keys(events).length > 0) result.events = events;
  if (Object.keys(style).length > 0) result.style = style;
  if (Object.keys(a11y).length > 0) result.a11y = a11y;
  return result;
}

/** Validate a full document; throws BridgeError on the first violation. */
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
  const state: WalkState = { seen: new Set(), count: 0, placeholders: [], deferredActions: [] };
  const node = walk(raw, state, 0);
  return {
    node,
    nodeCount: state.count,
    placeholders: [...new Set(state.placeholders)],
    deferredActions: [...new Set(state.deferredActions)],
  };
}

export function isSupportedComponent(type: string): boolean {
  return SUPPORTED.has(type);
}

export function catalogSize(): number {
  return COMPONENT_CATALOG.length;
}

// ---------------------------------------------------------------------------
// Patches (U-08, U-09)
// ---------------------------------------------------------------------------

const PATCH_OPS: readonly string[] = ['insert', 'update', 'remove', 'move'];

export type PatchOperation =
  | { op: 'insert'; parentId: string; index: number; node: MuipNode }
  | { op: 'update'; id: string; props?: Record<string, unknown>; style?: Record<string, string>; events?: Record<string, EventBinding> }
  | { op: 'remove'; id: string }
  | { op: 'move'; id: string; parentId: string; index: number };

interface Indexed {
  nodes: Map<string, MuipNode>;
  parents: Map<string, string | null>;
}

function indexTree(root: MuipNode): Indexed {
  const nodes = new Map<string, MuipNode>();
  const parents = new Map<string, string | null>();
  const stack: Array<{ node: MuipNode; parentId: string | null }> = [{ node: root, parentId: null }];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) break;
    nodes.set(current.node.id, current.node);
    parents.set(current.node.id, current.parentId);
    for (const child of current.node.children ?? []) {
      stack.push({ node: child, parentId: current.node.id });
    }
  }
  return { nodes, parents };
}

function cloneTree(node: MuipNode): MuipNode {
  return {
    ...node,
    props: node.props ? structuredClone(node.props) : undefined,
    events: node.events ? structuredClone(node.events) : undefined,
    style: node.style ? { ...node.style } : undefined,
    a11y: node.a11y ? { ...node.a11y } : undefined,
    children: node.children?.map(cloneTree),
  };
}

function findParentList(root: MuipNode, parentId: string): MuipNode[] | undefined {
  if (parentId === root.id) {
    root.children ??= [];
    return root.children;
  }
  const stack = [...(root.children ?? [])];
  while (stack.length > 0) {
    const node = stack.pop();
    if (!node) break;
    if (node.id === parentId) {
      node.children ??= [];
      return node.children;
    }
    stack.push(...(node.children ?? []));
  }
  return undefined;
}

function removeById(root: MuipNode, id: string): boolean {
  const stack: MuipNode[] = [root];
  while (stack.length > 0) {
    const node = stack.pop();
    if (!node?.children) continue;
    const index = node.children.findIndex((child) => child.id === id);
    if (index >= 0) {
      node.children.splice(index, 1);
      return true;
    }
    stack.push(...node.children);
  }
  return false;
}

function isDescendant(root: MuipNode, ancestorId: string, candidateId: string): boolean {
  const { parents } = indexTree(root);
  let cursor = parents.get(candidateId) ?? null;
  while (cursor) {
    if (cursor === ancestorId) return true;
    cursor = parents.get(cursor) ?? null;
  }
  return false;
}

/**
 * Apply a patch batch atomically: either every operation succeeds or the
 * original tree is returned untouched. The tree is cloned first so callers keep
 * referential stability for unchanged nodes.
 */
export function applyPatch(root: MuipNode, operations: PatchOperation[]): MuipNode {
  if (!Array.isArray(operations) || operations.length === 0) {
    fail('empty_patch');
  }
  const working = cloneTree(root);
  for (const operation of operations) {
    if (!isRecord(operation) || typeof operation.op !== 'string') {
      fail('invalid_patch_operation');
    }
    if (!PATCH_OPS.includes(operation.op)) {
      fail('unknown_patch_operation', { op: operation.op });
    }
    const { nodes } = indexTree(working);
    switch (operation.op) {
      case 'insert': {
        if (typeof operation.parentId !== 'string' || !nodes.has(operation.parentId)) {
          fail('insert_parent_missing', { parentId: String(operation.parentId) });
        }
        const validated = validateDocument(operation.node).node;
        if (nodes.has(validated.id)) fail('duplicate_node_id', { id: validated.id });
        const list = findParentList(working, operation.parentId);
        if (!list) fail('insert_parent_missing');
        const index = clampIndex(operation.index, list.length);
        list.splice(index, 0, validated);
        break;
      }
      case 'update': {
        const target = nodes.get(operation.id);
        if (!target) fail('update_target_missing', { id: operation.id });
        if (operation.props !== undefined) {
          target.props = { ...(target.props ?? {}), ...validateProps(target.type, operation.props) };
        }
        if (operation.style !== undefined) {
          target.style = { ...(target.style ?? {}), ...validateStyle(operation.style) };
        }
        if (operation.events !== undefined) {
          target.events = { ...(target.events ?? {}), ...validateEvents(operation.events) };
        }
        break;
      }
      case 'remove': {
        if (operation.id === working.id) fail('remove_root_forbidden');
        if (!removeById(working, operation.id)) {
          fail('remove_target_missing', { id: operation.id });
        }
        break;
      }
      case 'move': {
        if (operation.id === working.id) fail('move_root_forbidden');
        if (!nodes.has(operation.id)) fail('move_target_missing', { id: operation.id });
        if (!nodes.has(operation.parentId)) fail('move_parent_missing', { parentId: operation.parentId });
        if (isDescendant(working, operation.id, operation.parentId)) {
          fail('move_cycle', { id: operation.id, parentId: operation.parentId });
        }
        const target = nodes.get(operation.id);
        if (!target) fail('move_target_missing');
        removeById(working, operation.id);
        const list = findParentList(working, operation.parentId);
        if (!list) fail('move_parent_missing');
        list.splice(clampIndex(operation.index, list.length), 0, target);
        break;
      }
      default:
        fail('unknown_patch_operation');
    }
  }
  // Re-validate invariants of the final tree (ids unique, depth, node count).
  const doc = validateDocument(working);
  return doc.node;
}

function clampIndex(index: unknown, length: number): number {
  if (typeof index !== 'number' || !Number.isFinite(index)) return length;
  return Math.max(0, Math.min(Math.trunc(index), length));
}
