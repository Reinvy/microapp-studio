/**
 * MUIP props contract.
 *
 * One allowlist shared by the validator and (via `@microapp/runtime-web`) the
 * builder, so the palette can never offer a prop the renderer rejects.
 *
 * Styling is props-only: there is no `style`, `css`, `html`, or `script` field.
 * Style props map to token enums (`tone`, `radius`, `shadow`, `padding`,
 * `textSize`, `direction`, `align`, `justify`, `gap`, `span`, `width`,
 * `height`), and the renderer translates those to clay CSS custom properties.
 *
 * Object props are allowed only for the four documented "objek terbatas" list
 * props (`items`, `options`, `columns`, `rows`): an array of flat objects with
 * scalar values (max 64 items, 16 keys each). Every other prop is a scalar or an
 * array of scalars.
 */

import { COMPONENT_CATALOG, type CatalogComponent } from './catalog.generated';

export const BASE_PROPS = [
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
  'ariaLabel',
  'headingLevel',
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
  'tone',
  'radius',
  'shadow',
  'padding',
  'textSize',
  'direction',
  'align',
  'justify',
  'width',
  'height',
] as const;

/** The only props allowed to hold arrays of small flat objects (§4 amendment). */
export const COMPLEX_LIST_PROPS = ['items', 'options', 'columns', 'rows'] as const;

export type ComplexListProp = (typeof COMPLEX_LIST_PROPS)[number];

const COMPLEX_LIST_SET = new Set<string>(COMPLEX_LIST_PROPS);

/**
 * Per-component extras, layered on top of `BASE_PROPS`. Names are stable: the
 * builder, the templates, and the schema all reference them.
 */
export const COMPONENT_EXTRA_PROPS: Readonly<Record<string, readonly string[]>> = {
  // Layout
  AppShell: ['brand', 'navLabel', 'sidebarWidth'],
  Stack: ['wrap'],
  Grid: ['gridColumns'],
  Card: ['elevated', 'interactive'],
  Sheet: ['side', 'open'],
  Modal: ['open', 'size'],
  ScrollArea: ['axis'],

  // Navigation
  Sidebar: ['collapsed', 'activeId'],
  TabBar: ['activeId', 'idPrefix'],
  Breadcrumb: ['separator'],
  CommandPalette: ['open', 'shortcut'],
  Stepper: ['activeStep', 'steps'],
  Dock: ['activeId'],

  // Input
  Button: ['variant', 'size', 'href', 'type'],
  IconButton: ['variant', 'name'],
  TextField: ['type', 'inputMode', 'name', 'error'],
  TextArea: ['lineCount', 'error'],
  SearchField: ['name', 'error'],
  Select: ['name', 'error'],
  Combobox: ['name', 'error', 'query'],
  Checkbox: ['checked', 'name'],
  RadioGroup: ['checked', 'name'],
  Switch: ['checked', 'name'],
  Slider: ['showValue', 'name'],

  // Data
  DataTable: ['caption', 'density', 'selectable', 'sortKey', 'sortDirection', 'emptyLabel'],
  VirtualList: ['itemHeight', 'overscan'],
  Calendar: ['month', 'selectedDate'],
  StatCard: ['delta', 'deltaDirection', 'caption'],
  Badge: ['dot'],
  Avatar: ['src', 'initials', 'size'],
  Tooltip: ['placement', 'trigger'],
  Progress: ['percent', 'indeterminate'],
  EmptyState: ['actionLabel'],

  // Feedback
  Alert: ['actions', 'dismissible'],
  Toast: ['duration'],
  Banner: ['dismissible'],
  FieldError: ['message'],
  ConfirmDialog: ['confirmLabel', 'cancelLabel', 'open', 'danger'],
  ErrorBoundary: ['errorCode'],
  OfflineBanner: ['cachedLabel'],

  // Platform / app-level
  AppIcon: ['initials', 'variant'],
  ShareSheet: ['fileName', 'sizeLabel', 'checksum', 'copyLinkDisabledReason'],
  PermissionBadge: ['permission', 'granted'],
  StorageMeter: ['usedBytes', 'quotaBytes', 'warnRatio'],
  PromptInput: ['maxLength', 'submitLabel', 'counterLabel'],
  AIStatus: ['state', 'detail'],
  SuggestionChip: ['suggestions', 'selected'],
  AIError: ['retryLabel', 'fallbackLabel'],
};

/**
 * Components that own a child slot. A node of any other type must not carry
 * `children`, so a document cannot smuggle content where nothing renders it.
 */
export const CONTAINER_TYPES: ReadonlySet<string> = new Set([
  'AppShell',
  'Stack',
  'Grid',
  'Card',
  'Sheet',
  'Modal',
  'ScrollArea',
  'Sidebar',
  'Dock',
  'TabBar',
  'Breadcrumb',
  'Stepper',
  'CommandPalette',
  'ErrorBoundary',
  'ShareSheet',
  // Advanced containers still accept children so their placeholders can show
  // how many nodes were dropped.
  'SplitPane',
  'Drawer',
  'Popover',
  'Toolbar',
  'SafeArea',
  'TreeView',
  'KanbanBoard',
  'Timeline',
  'FormBuilder',
  'WorkflowNode',
  'ChatThread',
  'FileTree',
  'RecordDetail',
  'FilterBar',
  'VaultItem',
  'WidgetFrame',
  'WindowChrome',
  'ContextMenu',
]);

export function canContainChildren(type: string): boolean {
  return CONTAINER_TYPES.has(type);
}

const CACHE = new Map<string, ReadonlySet<string>>();

/** Allowed prop names for a component type; empty set for unknown types. */
export function allowedProps(type: string): ReadonlySet<string> {
  const cached = CACHE.get(type);
  if (cached) return cached;
  if (!isKnownComponent(type)) {
    const empty: ReadonlySet<string> = new Set();
    CACHE.set(type, empty);
    return empty;
  }
  const allowed = new Set<string>(BASE_PROPS);
  for (const extra of COMPONENT_EXTRA_PROPS[type] ?? []) allowed.add(extra);
  CACHE.set(type, allowed);
  return allowed;
}

const BY_NAME = new Map(COMPONENT_CATALOG.map((component) => [component.name, component]));

export function isKnownComponent(type: string): boolean {
  return BY_NAME.has(type);
}

export function catalogEntry(type: string): CatalogComponent | undefined {
  return BY_NAME.get(type);
}

export function isComplexListProp(prop: string): boolean {
  return COMPLEX_LIST_SET.has(prop);
}

/** Core components are the builder's default palette (48 of 120). */
export function isCoreComponent(type: string): boolean {
  return BY_NAME.get(type)?.level === 'core';
}

/** Style-token enums; the renderer maps these to clay custom properties. */
export const STYLE_ENUMS = {
  gap: ['none', 'xs', 'sm', 'md', 'lg', 'xl'],
  padding: ['none', 'xs', 'sm', 'md', 'lg', 'xl'],
  radius: ['none', 'sm', 'md', 'lg', 'xl', 'full'],
  shadow: ['none', 'sm', 'md', 'lg'],
  tone: ['default', 'primary', 'secondary', 'success', 'warning', 'error', 'info', 'neutral'],
  textSize: ['xs', 'sm', 'md', 'lg', 'xl', '2xl'],
  direction: ['row', 'column'],
  align: ['start', 'center', 'end', 'stretch', 'baseline'],
  justify: ['start', 'center', 'end', 'between', 'around'],
  width: ['auto', 'full', 'half'],
  height: ['auto', 'full', 'sm', 'md', 'lg'],
} as const;

export type StyleEnumName = keyof typeof STYLE_ENUMS;
