/**
 * Phase-1 MUIP component builders.
 *
 * Every builder creates semantic DOM and exposes:
 *  - `element`: the stable root element reused across patches (keyed by id),
 *  - `content`: the element that receives MUIP children,
 *  - `sync`: apply a validated node's props, style tokens, and a11y in place.
 *
 * Invariants:
 *  - Text is only assigned through `textContent`.
 *  - Only validated style tokens are translated, via fixed tables; props never
 *    become arbitrary CSS.
 *  - URLs are accepted only for `https:`, `microapp:`, or relative targets.
 *  - Controls always receive an accessible name.
 */

import { isRecord } from '../types/guards';
import { isSupportedComponent, type MuipNode } from './validate';

export interface ComponentView {
  readonly element: HTMLElement;
  readonly content: HTMLElement;
  sync(node: MuipNode): void;
}

export type ComponentBuilder = (node: MuipNode) => ComponentView;

// ---------------------------------------------------------------------------
// Token tables (validated by validate.ts before they reach this module).
// ---------------------------------------------------------------------------

const SPACE: Readonly<Record<string, string>> = {
  none: '0',
  xs: '0.25rem',
  sm: '0.5rem',
  md: '0.75rem',
  lg: '1rem',
  xl: '1.5rem',
  '2xl': '2rem',
};

const RADIUS: Readonly<Record<string, string>> = {
  none: '0',
  sm: '0.25rem',
  md: '0.5rem',
  lg: '0.75rem',
  xl: '1rem',
  full: '9999px',
};

const COLOR: Readonly<Record<string, string>> = {
  fg: 'var(--mads-color-fg, #111827)',
  muted: 'var(--mads-color-muted, #6b7280)',
  bg: 'var(--mads-color-bg, #ffffff)',
  surface: 'var(--mads-color-surface, #f9fafb)',
  border: 'var(--mads-color-border, #e5e7eb)',
  accent: 'var(--mads-color-accent, #2563eb)',
  success: 'var(--mads-color-success, #16a34a)',
  warning: 'var(--mads-color-warning, #d97706)',
  error: 'var(--mads-color-error, #dc2626)',
  inherit: 'inherit',
};

const FONT_SIZE: Readonly<Record<string, string>> = {
  xs: '0.75rem',
  sm: '0.875rem',
  md: '1rem',
  lg: '1.125rem',
  xl: '1.25rem',
  '2xl': '1.5rem',
};

const FONT_WEIGHT: Readonly<Record<string, string>> = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
};

const ALIGN: Readonly<Record<string, string>> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  stretch: 'stretch',
  baseline: 'baseline',
};

const JUSTIFY: Readonly<Record<string, string>> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  between: 'space-between',
  around: 'space-around',
};

const DIRECTION: Readonly<Record<string, string>> = {
  row: 'row',
  column: 'column',
  'row-reverse': 'row-reverse',
  'column-reverse': 'column-reverse',
};

const SIZE_TOKENS = new Set(['sm', 'md', 'lg']);
const VARIANT_TOKENS = new Set(['default', 'primary', 'secondary', 'ghost', 'danger', 'success', 'warning', 'info', 'error']);
const STATE_TOKENS = new Set(['default', 'success', 'warning', 'error']);
const INPUT_TYPES = new Set(['text', 'email', 'password', 'number', 'tel', 'url', 'search']);
const INPUT_MODES = new Set(['none', 'text', 'decimal', 'numeric', 'tel', 'search', 'email', 'url']);
const SHEET_SIDES = new Set(['left', 'right', 'top', 'bottom']);

interface StyleMapping {
  readonly property: string;
  readonly values: Readonly<Record<string, string>>;
}

// Style tokens become custom properties only; a stylesheet owns the visuals.
const STYLE_MAP: Readonly<Record<string, StyleMapping>> = {
  padding: { property: '--muip-padding', values: SPACE },
  paddingX: { property: '--muip-padding-x', values: SPACE },
  paddingY: { property: '--muip-padding-y', values: SPACE },
  margin: { property: '--muip-margin', values: SPACE },
  gap: { property: '--muip-gap', values: SPACE },
  radius: { property: '--muip-radius', values: RADIUS },
  color: { property: '--muip-color', values: COLOR },
  background: { property: '--muip-background', values: COLOR },
  borderColor: { property: '--muip-border-color', values: COLOR },
  fontSize: { property: '--muip-font-size', values: FONT_SIZE },
  fontWeight: { property: '--muip-font-weight', values: FONT_WEIGHT },
  align: { property: '--muip-align', values: ALIGN },
  justify: { property: '--muip-justify', values: JUSTIFY },
  direction: { property: '--muip-direction', values: DIRECTION },
  width: { property: '--muip-width', values: { full: '100%', auto: 'auto', fit: 'fit-content' } },
  height: { property: '--muip-height', values: { full: '100%', auto: 'auto', fit: 'fit-content' } },
};

const MANAGED_STYLE_PROPERTIES: readonly string[] = Object.values(STYLE_MAP).map((mapping) => mapping.property);

function resetStyle(element: HTMLElement): void {
  for (const property of MANAGED_STYLE_PROPERTIES) element.style.removeProperty(property);
  delete element.dataset.muipState;
}

function applyStyle(element: HTMLElement, style: Record<string, string> | undefined): void {
  resetStyle(element);
  if (!style) return;
  for (const [token, value] of Object.entries(style)) {
    if (token === 'state') {
      if (STATE_TOKENS.has(value)) element.dataset.muipState = value;
      continue;
    }
    const mapping = STYLE_MAP[token];
    if (!mapping) continue;
    const resolved = mapping.values[value];
    if (!resolved) continue;
    element.style.setProperty(mapping.property, resolved);
  }
}

// ---------------------------------------------------------------------------
// Prop and a11y helpers.
// ---------------------------------------------------------------------------

/** Scalar prop to display text; objects never stringify into shared markup. */
function text(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'boolean') return String(value);
  return undefined;
}

function token<T extends string>(value: unknown, allowed: Readonly<Record<string, T>>): T | undefined {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(allowed, value) ? (value as T) : undefined;
}

function bool(value: unknown): boolean {
  return value === true || value === 'true';
}

function clampInt(value: unknown, min: number, max: number): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  return Math.max(min, Math.min(max, Math.trunc(value)));
}

/** URL guard: https:, microapp:, or a relative reference. Everything else fails closed. */
export function safeUrl(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > 2048) return null;
  // Control characters and scheme-relative targets cannot be represented safely.
  for (let index = 0; index < raw.length; index += 1) {
    const code = raw.charCodeAt(index);
    if (code <= 0x1f || code === 0x7f) return null;
  }
  if (raw.startsWith('//')) return null;
  const scheme = /^([A-Za-z][A-Za-z0-9+.-]*):/.exec(raw);
  if (scheme) {
    const protocol = `${scheme[1].toLowerCase()}:`;
    return protocol === 'https:' || protocol === 'microapp:' ? raw : null;
  }
  return raw;
}

const FORM_CONTROLS = 'input, select, textarea, button';

function isFormControl(element: HTMLElement): element is HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | HTMLButtonElement {
  return element.matches(FORM_CONTROLS);
}

interface A11yDefaults {
  role?: string;
  label?: string;
  live?: string;
  disabled?: boolean;
  required?: boolean;
}

/**
 * Map the validated a11y bag onto ARIA. Defaults describe the component's
 * native semantics so removing an a11y override restores them instead of
 * leaving stale attributes behind.
 */
function applyA11y(element: HTMLElement, node: MuipNode, defaults: A11yDefaults = {}): void {
  const a11y = node.a11y ?? {};
  const label = a11y.label ?? defaults.label;
  const role = a11y.role ?? defaults.role;
  const live = a11y.live ?? defaults.live;
  const disabled = a11y.disabled ?? defaults.disabled ?? false;
  const required = a11y.required ?? defaults.required ?? false;

  if (typeof label === 'string' && label.length > 0) element.setAttribute('aria-label', label);
  else element.removeAttribute('aria-label');

  if (typeof a11y.description === 'string' && a11y.description.length > 0) {
    element.setAttribute('aria-description', a11y.description);
  } else {
    element.removeAttribute('aria-description');
  }

  if (role) element.setAttribute('role', role);
  else element.removeAttribute('role');

  if (live) element.setAttribute('aria-live', live);
  else element.removeAttribute('aria-live');

  if (required) element.setAttribute('aria-required', 'true');
  else element.removeAttribute('aria-required');

  if (disabled) {
    element.setAttribute('aria-disabled', 'true');
    if (isFormControl(element)) {
      element.disabled = true;
      element.setAttribute('data-disabled', '');
    }
  } else {
    element.removeAttribute('aria-disabled');
    element.removeAttribute('data-disabled');
    if (isFormControl(element)) element.disabled = false;
  }
  if (isFormControl(element) && 'required' in element) {
    (element as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).required = required;
  }
}

function labelFrom(node: MuipNode, ...candidates: Array<string | undefined>): string | undefined {
  if (node.a11y?.label) return undefined;
  for (const candidate of candidates) {
    if (candidate !== undefined && candidate.length > 0) return candidate;
  }
  return undefined;
}

function setText(element: Element, value: string | undefined): void {
  element.textContent = value ?? '';
}

function hideEmpty(element: HTMLElement, value: string | undefined): void {
  element.textContent = value ?? '';
  element.hidden = value === undefined || value.length === 0;
}

function element<K extends keyof HTMLElementTagNameMap>(tag: K, className: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  return node;
}

function applyBase(element: HTMLElement, node: MuipNode, defaults: A11yDefaults = {}): void {
  applyStyle(element, node.style);
  applyA11y(element, node, defaults);
}

function view(element: HTMLElement, content: HTMLElement, sync: (node: MuipNode) => void): ComponentView {
  return { element, content, sync };
}

// ---------------------------------------------------------------------------
// Layout components.
// ---------------------------------------------------------------------------

const stackBuilder: ComponentBuilder = () => {
  const root = element('div', 'muip-stack');
  return view(root, root, (node) => {
    root.style.display = 'flex';
    const props = node.props ?? {};
    const direction = token(props.direction, DIRECTION);
    root.style.flexDirection = direction ?? 'column';
    root.style.flexWrap = bool(props.wrap) ? 'wrap' : 'nowrap';
    const align = token(props.align, ALIGN);
    if (align) root.style.alignItems = align;
    else root.style.removeProperty('align-items');
    const justify = token(props.justify, JUSTIFY);
    if (justify) root.style.justifyContent = justify;
    else root.style.removeProperty('justify-content');
    const gap = token(props.gap, SPACE);
    if (gap) root.style.gap = gap;
    else root.style.removeProperty('gap');
    applyBase(root, node);
  });
};

const gridBuilder: ComponentBuilder = () => {
  const root = element('div', 'muip-grid');
  return view(root, root, (node) => {
    root.style.display = 'grid';
    const props = node.props ?? {};
    const columns = clampInt(props.columns, 1, 12) ?? 1;
    root.style.gridTemplateColumns = `repeat(${columns}, minmax(0, 1fr))`;
    const rows = clampInt(props.rows, 1, 24);
    if (rows) root.style.gridTemplateRows = `repeat(${rows}, auto)`;
    else root.style.removeProperty('grid-template-rows');
    const span = clampInt(props.span, 1, 12);
    if (span) root.style.gridColumn = `span ${span}`;
    else root.style.removeProperty('grid-column');
    const gap = token(props.gap, SPACE);
    if (gap) root.style.gap = gap;
    else root.style.removeProperty('gap');
    applyBase(root, node);
  });
};

const cardBuilder: ComponentBuilder = () => {
  const root = element('section', 'muip-card');
  const heading = element('h2', 'muip-card-title');
  const description = element('p', 'muip-card-description');
  const content = element('div', 'muip-content');
  root.append(heading, description, content);
  return view(root, content, (node) => {
    const props = node.props ?? {};
    const title = text(props.label) ?? text(props.title);
    hideEmpty(heading, title);
    hideEmpty(description, text(props.description));
    applyBase(root, node, { role: 'region', label: labelFrom(node, title) });
  });
};

const appShellBuilder: ComponentBuilder = () => {
  const root = element('div', 'muip-appshell');
  return view(root, root, (node) => {
    applyBase(root, node);
  });
};

// ---------------------------------------------------------------------------
// Input components.
// ---------------------------------------------------------------------------

function makeLabelledField(tag: 'label' | 'div', rootClass: string, labelClass: string): {
  root: HTMLElement;
  label: HTMLSpanElement;
  content: HTMLDivElement;
} {
  const root = element(tag, rootClass);
  const label = element('span', labelClass);
  const content = element('div', 'muip-content');
  root.append(label, content);
  return { root, label, content };
}

const buttonBuilder: ComponentBuilder = () => {
  const root = element('button', 'muip-button');
  root.type = 'button';
  const label = element('span', 'muip-button-label');
  root.append(label);
  return view(root, root, (node) => {
    const props = node.props ?? {};
    const visible = text(props.label) ?? text(props.text);
    setText(label, visible);
    const variant = token(props.variant, { default: 'default', primary: 'primary', secondary: 'secondary', ghost: 'ghost', danger: 'danger', success: 'success', warning: 'warning', info: 'info', error: 'error' });
    root.dataset.variant = variant ?? 'default';
    const size = typeof props.size === 'string' && SIZE_TOKENS.has(props.size) ? props.size : 'md';
    root.dataset.size = size;
    const loading = bool(props.loading);
    if (loading) root.setAttribute('aria-busy', 'true');
    else root.removeAttribute('aria-busy');
    const href = safeUrl(props.href);
    if (href !== null) root.dataset.muipHref = href;
    else delete root.dataset.muipHref;
    applyBase(root, node, {
      label: labelFrom(node, visible, 'Button'),
      disabled: bool(props.disabled) || loading,
    });
  });
};

const textFieldBuilder: ComponentBuilder = () => {
  const { root, label, content } = makeLabelledField('label', 'muip-field', 'muip-field-label');
  const input = element('input', 'muip-input');
  root.insertBefore(input, content);
  return view(root, content, (node) => {
    const props = node.props ?? {};
    const visible = text(props.label);
    hideEmpty(label, visible);
    const type = typeof props.type === 'string' && INPUT_TYPES.has(props.type) ? props.type : 'text';
    input.type = type;
    const value = text(props.value);
    if (value !== undefined) input.value = value;
    else input.value = '';
    if (typeof props.placeholder === 'string') input.placeholder = props.placeholder;
    else input.removeAttribute('placeholder');
    const mode = typeof props.inputMode === 'string' && INPUT_MODES.has(props.inputMode) ? props.inputMode : undefined;
    if (mode) input.setAttribute('inputmode', mode);
    else input.removeAttribute('inputmode');
    applyA11y(input, node, {
      label: labelFrom(node, visible, text(props.placeholder), 'Text field'),
      disabled: bool(props.disabled),
      required: bool(props.required),
    });
    applyBase(root, node);
  });
};

const textAreaBuilder: ComponentBuilder = () => {
  const { root, label, content } = makeLabelledField('label', 'muip-field', 'muip-field-label');
  const input = element('textarea', 'muip-textarea');
  root.insertBefore(input, content);
  return view(root, content, (node) => {
    const props = node.props ?? {};
    const visible = text(props.label);
    hideEmpty(label, visible);
    const rows = clampInt(props.rows, 2, 40);
    if (rows) input.rows = rows;
    else input.removeAttribute('rows');
    const value = text(props.value);
    input.value = value ?? '';
    if (typeof props.placeholder === 'string') input.placeholder = props.placeholder;
    else input.removeAttribute('placeholder');
    applyA11y(input, node, {
      label: labelFrom(node, visible, text(props.placeholder), 'Text area'),
      disabled: bool(props.disabled),
      required: bool(props.required),
    });
    applyBase(root, node);
  });
};

function normalizeOptions(raw: unknown): Array<{ value: string; label: string }> {
  if (!Array.isArray(raw)) return [];
  const options: Array<{ value: string; label: string }> = [];
  for (const item of raw.slice(0, 500)) {
    if (typeof item === 'string' || typeof item === 'number') {
      options.push({ value: String(item), label: String(item) });
      continue;
    }
    if (isRecord(item)) {
      const label = text(item.label) ?? text(item.value);
      const value = text(item.value) ?? label;
      if (label !== undefined && value !== undefined) options.push({ value, label });
    }
  }
  return options;
}

const selectBuilder: ComponentBuilder = () => {
  const { root, label, content } = makeLabelledField('label', 'muip-field', 'muip-field-label');
  const select = element('select', 'muip-select');
  root.insertBefore(select, content);
  return view(root, content, (node) => {
    const props = node.props ?? {};
    const visible = text(props.label);
    hideEmpty(label, visible);
    const options = normalizeOptions(props.options);
    const selectedValue = text(props.value);
    const placeholder = text(props.placeholder);
    select.replaceChildren();
    if (placeholder !== undefined) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = placeholder;
      option.disabled = true;
      option.selected = selectedValue === undefined;
      select.appendChild(option);
    }
    for (const { value, label: optionLabel } of options) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = optionLabel;
      option.selected = selectedValue === value;
      select.appendChild(option);
    }
    applyA11y(select, node, {
      label: labelFrom(node, visible, placeholder, 'Select'),
      disabled: bool(props.disabled),
      required: bool(props.required),
    });
    applyBase(root, node);
  });
};

const checkboxBuilder: ComponentBuilder = () => {
  const root = element('label', 'muip-checkbox');
  const input = element('input', 'muip-checkbox-input');
  input.type = 'checkbox';
  const label = element('span', 'muip-checkbox-label');
  root.append(input, label);
  return view(root, root, (node) => {
    const props = node.props ?? {};
    const visible = text(props.label) ?? text(props.text);
    setText(label, visible);
    input.checked = bool(props.value);
    applyA11y(input, node, {
      label: labelFrom(node, visible, 'Checkbox'),
      disabled: bool(props.disabled),
      required: bool(props.required),
    });
    applyBase(root, node);
  });
};

const switchBuilder: ComponentBuilder = () => {
  const root = element('label', 'muip-switch');
  const input = element('input', 'muip-switch-input');
  input.type = 'checkbox';
  input.setAttribute('role', 'switch');
  const label = element('span', 'muip-switch-label');
  root.append(input, label);
  return view(root, root, (node) => {
    const props = node.props ?? {};
    const visible = text(props.label) ?? text(props.text);
    setText(label, visible);
    input.checked = bool(props.value);
    applyA11y(input, node, {
      label: labelFrom(node, visible, 'Switch'),
      disabled: bool(props.disabled),
      required: bool(props.required),
    });
    // Re-assert native switch semantics unless an explicit a11y role overrides.
    if (!node.a11y?.role) input.setAttribute('role', 'switch');
    applyBase(root, node);
  });
};

const searchFieldBuilder: ComponentBuilder = () => {
  const { root, label, content } = makeLabelledField('label', 'muip-field muip-search', 'muip-field-label');
  const input = element('input', 'muip-search-input');
  input.type = 'search';
  root.insertBefore(input, content);
  return view(root, content, (node) => {
    const props = node.props ?? {};
    const visible = text(props.label);
    hideEmpty(label, visible);
    const value = text(props.value);
    input.value = value ?? '';
    if (typeof props.placeholder === 'string') input.placeholder = props.placeholder;
    else input.removeAttribute('placeholder');
    applyA11y(input, node, {
      label: labelFrom(node, visible, text(props.placeholder), 'Search'),
      disabled: bool(props.disabled),
      required: bool(props.required),
    });
    applyBase(root, node);
  });
};

// ---------------------------------------------------------------------------
// Feedback and display components.
// ---------------------------------------------------------------------------

const emptyStateBuilder: ComponentBuilder = () => {
  const root = element('section', 'muip-empty-state');
  const title = element('h3', 'muip-empty-title');
  const description = element('p', 'muip-empty-description');
  const content = element('div', 'muip-content');
  root.append(title, description, content);
  return view(root, content, (node) => {
    const props = node.props ?? {};
    const titleText = text(props.title) ?? text(props.emptyTitle) ?? text(props.label);
    hideEmpty(title, titleText);
    hideEmpty(description, text(props.description) ?? text(props.emptyDescription));
    applyBase(root, node, { role: 'region', label: labelFrom(node, titleText) });
  });
};

const badgeBuilder: ComponentBuilder = () => {
  const root = element('span', 'muip-badge');
  const content = element('span', 'muip-badge-label');
  root.appendChild(content);
  return view(root, root, (node) => {
    const props = node.props ?? {};
    const label = text(props.text) ?? text(props.label);
    setText(content, label);
    const variant = typeof props.variant === 'string' && VARIANT_TOKENS.has(props.variant) ? props.variant : 'default';
    root.dataset.variant = variant;
    applyBase(root, node);
  });
};

const alertBuilder: ComponentBuilder = () => {
  const root = element('div', 'muip-alert');
  const title = element('h4', 'muip-alert-title');
  const description = element('p', 'muip-alert-description');
  const content = element('div', 'muip-content');
  root.append(title, description, content);
  return view(root, content, (node) => {
    const props = node.props ?? {};
    const titleText = text(props.title) ?? text(props.label);
    hideEmpty(title, titleText);
    hideEmpty(description, text(props.description) ?? text(props.text));
    const variant = typeof props.variant === 'string' && VARIANT_TOKENS.has(props.variant) ? props.variant : 'default';
    root.dataset.variant = variant;
    applyBase(root, node, { role: 'alert', label: labelFrom(node, titleText) });
  });
};

const toastBuilder: ComponentBuilder = () => {
  const root = element('div', 'muip-toast');
  const message = element('span', 'muip-toast-message');
  const content = element('div', 'muip-content');
  root.append(message, content);
  return view(root, content, (node) => {
    const props = node.props ?? {};
    const messageText = text(props.text) ?? text(props.label);
    setText(message, messageText);
    applyBase(root, node, { role: 'status', live: 'polite' });
  });
};

const bannerBuilder: ComponentBuilder = () => {
  const root = element('div', 'muip-banner');
  const message = element('span', 'muip-banner-message');
  const description = element('span', 'muip-banner-description');
  const content = element('div', 'muip-content');
  root.append(message, description, content);
  return view(root, content, (node) => {
    const props = node.props ?? {};
    const messageText = text(props.text) ?? text(props.label);
    setText(message, messageText);
    hideEmpty(description, text(props.description));
    const variant = typeof props.variant === 'string' && VARIANT_TOKENS.has(props.variant) ? props.variant : 'default';
    root.dataset.variant = variant;
    applyBase(root, node, { role: 'status', label: labelFrom(node, messageText) });
  });
};

const progressBuilder: ComponentBuilder = () => {
  const root = element('div', 'muip-progress');
  const bar = element('progress', 'muip-progress-bar');
  const label = element('span', 'muip-progress-label');
  root.append(label, bar);
  return view(root, root, (node) => {
    const props = node.props ?? {};
    const max = clampInt(props.max, 1, 1_000_000) ?? 100;
    const value = clampInt(props.value, 0, max) ?? 0;
    bar.max = max;
    bar.value = value;
    const labelText = text(props.label);
    hideEmpty(label, labelText);
    const state = typeof props.state === 'string' && STATE_TOKENS.has(props.state) ? props.state : undefined;
    if (state) root.dataset.state = state;
    else delete root.dataset.state;
    applyBase(root, node, { role: 'progressbar', label: labelFrom(node, labelText, 'Progress') });
  });
};

const skeletonBuilder: ComponentBuilder = () => {
  const root = element('div', 'muip-skeleton');
  root.setAttribute('aria-hidden', 'true');
  return view(root, root, (node) => {
    applyStyle(root, node.style);
    applyA11y(root, node, { role: 'presentation' });
  });
};

const statCardBuilder: ComponentBuilder = () => {
  const root = element('section', 'muip-stat-card');
  const label = element('span', 'muip-stat-label');
  const value = element('strong', 'muip-stat-value');
  const delta = element('span', 'muip-stat-delta');
  const content = element('div', 'muip-content');
  root.append(label, value, delta, content);
  return view(root, content, (node) => {
    const props = node.props ?? {};
    const labelText = text(props.label);
    hideEmpty(label, labelText);
    hideEmpty(value, text(props.value));
    hideEmpty(delta, text(props.delta));
    const trend = typeof props.trend === 'string' && ['up', 'down', 'flat'].includes(props.trend) ? props.trend : undefined;
    if (trend) root.dataset.trend = trend;
    else delete root.dataset.trend;
    applyBase(root, node, { role: 'group', label: labelFrom(node, labelText) });
  });
};

// ---------------------------------------------------------------------------
// Overlay and navigation components.
// ---------------------------------------------------------------------------

function buildOverlay(kind: 'modal' | 'sheet'): ComponentBuilder {
  return () => {
    const root = element('div', kind === 'modal' ? 'muip-modal' : 'muip-sheet');
    const title = element('h2', 'muip-overlay-title');
    const content = element('div', 'muip-content');
    root.append(title, content);
    return view(root, content, (node) => {
      const props = node.props ?? {};
      const titleText = text(props.title) ?? text(props.label);
      hideEmpty(title, titleText);
      const open = props.open === undefined ? true : bool(props.open);
      root.hidden = !open;
      root.setAttribute('aria-modal', 'true');
      if (kind === 'sheet') {
        const side = typeof props.side === 'string' && SHEET_SIDES.has(props.side) ? props.side : 'right';
        root.dataset.side = side;
      }
      applyBase(root, node, { role: 'dialog', label: labelFrom(node, titleText, kind === 'modal' ? 'Dialog' : 'Sheet') });
      root.setAttribute('aria-modal', 'true');
    });
  };
}

const modalBuilder = buildOverlay('modal');
const sheetBuilder = buildOverlay('sheet');

const toolbarBuilder: ComponentBuilder = () => {
  const root = element('div', 'muip-toolbar');
  return view(root, root, (node) => {
    applyBase(root, node, { role: 'toolbar', label: labelFrom(node, text(node.props?.label), 'Toolbar') });
  });
};

const sidebarBuilder: ComponentBuilder = () => {
  const root = element('nav', 'muip-sidebar');
  const title = element('h2', 'muip-sidebar-title');
  const content = element('div', 'muip-content');
  root.append(title, content);
  return view(root, content, (node) => {
    const titleText = text(node.props?.label) ?? text(node.props?.title);
    hideEmpty(title, titleText);
    applyBase(root, node, { role: 'navigation', label: labelFrom(node, titleText, 'Sidebar') });
  });
};

const dockBuilder: ComponentBuilder = () => {
  const root = element('nav', 'muip-dock');
  return view(root, root, (node) => {
    applyBase(root, node, { role: 'navigation', label: labelFrom(node, text(node.props?.label), 'Dock') });
  });
};

const workspaceSwitcherBuilder: ComponentBuilder = () => {
  const root = element('div', 'muip-workspace-switcher');
  const button = element('button', 'muip-workspace-button');
  button.type = 'button';
  button.setAttribute('aria-haspopup', 'true');
  const label = element('span', 'muip-workspace-label');
  button.appendChild(label);
  const content = element('div', 'muip-content');
  root.append(button, content);
  return view(root, content, (node) => {
    const labelText = text(node.props?.label) ?? text(node.props?.text);
    setText(label, labelText);
    applyA11y(button, node, { label: labelFrom(node, labelText, 'Workspace') });
    applyBase(root, node, { role: 'group' });
  });
};

const commandPaletteBuilder: ComponentBuilder = () => {
  const root = element('div', 'muip-command-palette');
  const input = element('input', 'muip-command-input');
  input.type = 'search';
  const content = element('div', 'muip-content');
  root.append(input, content);
  return view(root, content, (node) => {
    const props = node.props ?? {};
    input.placeholder = text(props.placeholder) ?? 'Search commands';
    applyA11y(input, node, { label: labelFrom(node, text(props.label), 'Command palette') });
    applyBase(root, node, { role: 'dialog', label: labelFrom(node, text(props.label), 'Command palette') });
  });
};

// ---------------------------------------------------------------------------
// Data and media components.
// ---------------------------------------------------------------------------

interface ColumnSpec {
  key: string;
  label: string;
}

function normalizeColumns(raw: unknown): ColumnSpec[] {
  if (!Array.isArray(raw)) return [];
  const columns: ColumnSpec[] = [];
  raw.slice(0, 50).forEach((column, index) => {
    if (typeof column === 'string') {
      columns.push({ key: column, label: column });
      return;
    }
    if (isRecord(column)) {
      const key = text(column.key) ?? text(column.id) ?? String(index);
      const label = text(column.label) ?? key;
      columns.push({ key, label });
    }
  });
  return columns;
}

function cellValue(row: unknown, column: ColumnSpec, index: number): string {
  if (Array.isArray(row)) return text(row[index]) ?? '';
  if (isRecord(row)) return text(row[column.key]) ?? '';
  if (index === 0) return text(row) ?? '';
  return '';
}

const dataTableBuilder: ComponentBuilder = () => {
  const root = element('div', 'muip-datatable');
  const table = element('table', 'muip-table');
  const content = element('div', 'muip-content');
  root.append(table, content);
  return view(root, content, (node) => {
    const props = node.props ?? {};
    const columns = normalizeColumns(props.columns);
    const rows = Array.isArray(props.rows) ? props.rows.slice(0, 1000) : [];
    table.replaceChildren();
    const captionText = text(props.title) ?? text(props.label);
    if (captionText !== undefined) {
      const caption = document.createElement('caption');
      caption.textContent = captionText;
      table.appendChild(caption);
    }
    if (columns.length > 0) {
      const head = document.createElement('thead');
      const headerRow = document.createElement('tr');
      for (const column of columns) {
        const th = document.createElement('th');
        th.scope = 'col';
        th.textContent = column.label;
        headerRow.appendChild(th);
      }
      head.appendChild(headerRow);
      table.appendChild(head);
    }
    if (rows.length > 0) {
      const body = document.createElement('tbody');
      for (const row of rows) {
        const tr = document.createElement('tr');
        const width = columns.length > 0 ? columns.length : Array.isArray(row) ? row.length : 1;
        for (let index = 0; index < width; index += 1) {
          const td = document.createElement('td');
          const column = columns[index] ?? { key: String(index), label: '' };
          td.textContent = cellValue(row, column, index);
          tr.appendChild(td);
        }
        body.appendChild(tr);
      }
      table.appendChild(body);
    }
    applyBase(root, node, { role: 'group', label: labelFrom(node, captionText) });
  });
};

const imageBuilder: ComponentBuilder = () => {
  const root = element('div', 'muip-image');
  const img = element('img', 'muip-image-el');
  const fallback = element('span', 'muip-image-fallback');
  root.append(img, fallback);
  return view(root, root, (node) => {
    const props = node.props ?? {};
    const src = safeUrl(props.src);
    const alt = text(props.alt) ?? node.a11y?.label ?? '';
    img.alt = alt;
    if (src !== null) {
      img.setAttribute('src', src);
      img.hidden = false;
      fallback.hidden = true;
      fallback.textContent = '';
    } else {
      img.removeAttribute('src');
      img.hidden = true;
      fallback.hidden = false;
      fallback.textContent = alt.length > 0 ? alt : 'Image unavailable';
    }
    const width = clampInt(props.width, 1, 4096);
    const height = clampInt(props.height, 1, 4096);
    if (width) img.width = width;
    else img.removeAttribute('width');
    if (height) img.height = height;
    else img.removeAttribute('height');
    applyBase(root, node, { role: 'img', label: labelFrom(node, alt) });
  });
};

const errorBoundaryBuilder: ComponentBuilder = () => {
  const root = element('div', 'muip-error-boundary');
  const title = element('h3', 'muip-error-title');
  const description = element('p', 'muip-error-description');
  const content = element('div', 'muip-content');
  root.append(title, description, content);
  return view(root, content, (node) => {
    const props = node.props ?? {};
    const titleText = text(props.title) ?? text(props.label) ?? 'Something went wrong';
    hideEmpty(title, titleText);
    hideEmpty(description, text(props.description));
    applyBase(root, node, { role: 'alert', label: labelFrom(node, titleText) });
  });
};

const offlineBannerBuilder: ComponentBuilder = () => {
  const root = element('div', 'muip-offline-banner');
  const message = element('span', 'muip-offline-message');
  const description = element('span', 'muip-offline-description');
  const content = element('div', 'muip-content');
  root.append(message, description, content);
  return view(root, content, (node) => {
    const props = node.props ?? {};
    const messageText = text(props.text) ?? text(props.label) ?? 'Offline';
    setText(message, messageText);
    hideEmpty(description, text(props.description));
    applyBase(root, node, { role: 'status', label: labelFrom(node, messageText) });
  });
};

const virtualListBuilder: ComponentBuilder = () => {
  const root = element('div', 'muip-virtual-list');
  const list = element('ul', 'muip-virtual-items');
  const content = element('div', 'muip-content');
  root.append(list, content);
  return view(root, content, (node) => {
    const props = node.props ?? {};
    const items = Array.isArray(props.items) ? props.items.slice(0, 500) : [];
    list.replaceChildren();
    for (const item of items) {
      const li = document.createElement('li');
      if (isRecord(item)) li.textContent = text(item.label) ?? text(item.text) ?? '';
      else li.textContent = text(item) ?? '';
      list.appendChild(li);
    }
    const labelText = text(props.label);
    const itemHeight = clampInt(props.itemHeight, 16, 512);
    if (itemHeight) root.dataset.itemHeight = String(itemHeight);
    else delete root.dataset.itemHeight;
    applyBase(root, node, { role: 'list', label: labelFrom(node, labelText) });
  });
};

// ---------------------------------------------------------------------------
// Registry.
// ---------------------------------------------------------------------------

const BUILDERS: Readonly<Record<string, ComponentBuilder>> = {
  AppShell: appShellBuilder,
  Stack: stackBuilder,
  Grid: gridBuilder,
  Card: cardBuilder,
  Button: buttonBuilder,
  TextField: textFieldBuilder,
  TextArea: textAreaBuilder,
  Select: selectBuilder,
  Checkbox: checkboxBuilder,
  Switch: switchBuilder,
  SearchField: searchFieldBuilder,
  EmptyState: emptyStateBuilder,
  Badge: badgeBuilder,
  Alert: alertBuilder,
  Toast: toastBuilder,
  Banner: bannerBuilder,
  Progress: progressBuilder,
  Skeleton: skeletonBuilder,
  Modal: modalBuilder,
  Sheet: sheetBuilder,
  Toolbar: toolbarBuilder,
  Sidebar: sidebarBuilder,
  Dock: dockBuilder,
  WorkspaceSwitcher: workspaceSwitcherBuilder,
  CommandPalette: commandPaletteBuilder,
  DataTable: dataTableBuilder,
  StatCard: statCardBuilder,
  Image: imageBuilder,
  ErrorBoundary: errorBoundaryBuilder,
  OfflineBanner: offlineBannerBuilder,
  VirtualList: virtualListBuilder,
};

/**
 * Catalogued-but-unimplemented types keep their node and children and render a
 * labelled group placeholder (U-12); they are never silently dropped.
 */
function buildPlaceholder(_node: MuipNode): ComponentView {
  const root = element('div', 'muip-placeholder');
  root.setAttribute('data-muip-placeholder', '');
  const message = element('span', 'muip-placeholder-message');
  root.appendChild(message);
  return view(root, root, (current) => {
    const placeholderText = `Komponen ${current.type} belum didukung versi ini`;
    message.textContent = placeholderText;
    applyStyle(root, current.style);
    applyA11y(root, current, { role: 'group', label: current.a11y?.label ?? placeholderText });
  });
}

/** Build the DOM shell for a validated node. */
export function buildComponent(node: MuipNode): ComponentView {
  const builder = isSupportedComponent(node.type) ? BUILDERS[node.type] : undefined;
  return builder ? builder(node) : buildPlaceholder(node);
}

/** Names with a phase-1 builder; kept in sync with SUPPORTED_COMPONENTS. */
export const IMPLEMENTED_COMPONENTS: readonly string[] = Object.keys(BUILDERS);

/** Catalog component name -> phase-1 builder. */
export const COMPONENT_BUILDERS: Readonly<Record<string, ComponentBuilder>> = BUILDERS;
