/**
 * MUIP component builders (48 core components).
 *
 * Every builder returns a stable root `element`, the `content` slot that MUIP
 * children are mounted into, and a `sync(node)` that applies the validated
 * props in place. Contract:
 *
 *  - Styling is props-only. Tokens are mapped through fixed tables to
 *    `var(--mads-*)` custom properties; no prop ever becomes arbitrary CSS.
 *  - `sync()` removes every inline style it previously set, then reapplies the
 *    structural styles and the token styles, so a removed prop cannot linger.
 *  - Text always goes through `textContent`; no markup API is used, which
 *    makes `<img onerror=…>` in a prop render as literal text.
 *  - Every control receives an accessible name from `ariaLabel`, then `label`,
 *    then `title`.
 *  - The 72 advanced catalog components render a labelled placeholder that is
 *    never dropped, with a sentence that follows `document.documentElement.lang`.
 */

import { isRecord } from '../types/guards';
import type { MuipNode } from './validate';

export interface ComponentView {
  readonly element: HTMLElement;
  readonly content: HTMLElement;
  sync(node: MuipNode): void;
}

export type ComponentBuilder = (node: MuipNode) => ComponentView;

type Props = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Token tables. Values are the clay tokens from `@microapp/ui-kit`.
// ---------------------------------------------------------------------------

const SPACE: Readonly<Record<string, string>> = {
  none: '0',
  xs: 'var(--mads-space-1)',
  sm: 'var(--mads-space-2)',
  md: 'var(--mads-space-3)',
  lg: 'var(--mads-space-4)',
  xl: 'var(--mads-space-6)',
};

const RADIUS: Readonly<Record<string, string>> = {
  none: '0',
  sm: 'var(--mads-radius-clay-sm)',
  md: 'var(--mads-radius-clay-md)',
  lg: 'var(--mads-radius-clay-lg)',
  xl: 'var(--mads-radius-clay-xl)',
  full: 'var(--mads-radius-full)',
};

const SHADOW: Readonly<Record<string, string>> = {
  none: 'none',
  sm: 'var(--mads-clay-shadow-1)',
  md: 'var(--mads-clay-shadow-2)',
  lg: 'var(--mads-clay-shadow-3)',
};

const TEXT_SIZE: Readonly<Record<string, string>> = {
  xs: 'var(--mads-text-12)',
  sm: 'var(--mads-text-14)',
  md: 'var(--mads-text-16)',
  lg: 'var(--mads-text-18)',
  xl: 'var(--mads-text-22)',
  '2xl': 'var(--mads-text-28)',
};

const WIDTH: Readonly<Record<string, string>> = {
  auto: 'auto',
  full: '100%',
  half: '50%',
};

const HEIGHT: Readonly<Record<string, string>> = {
  auto: 'auto',
  full: '100%',
  sm: 'var(--mads-control-height-sm)',
  md: 'var(--mads-control-height-md)',
  lg: 'var(--mads-control-height-lg)',
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
};

interface Tone {
  readonly background: string;
  readonly foreground: string;
}

const TONE: Readonly<Record<string, Tone>> = {
  default: { background: 'var(--mads-color-surface)', foreground: 'var(--mads-color-fg)' },
  primary: { background: 'var(--mads-color-primary)', foreground: 'var(--mads-color-on-primary)' },
  secondary: { background: 'var(--mads-color-surface-raised)', foreground: 'var(--mads-color-fg)' },
  success: { background: 'var(--mads-color-success-surface)', foreground: 'var(--mads-color-fg)' },
  warning: { background: 'var(--mads-color-warning-surface)', foreground: 'var(--mads-color-fg)' },
  error: { background: 'var(--mads-color-error-surface)', foreground: 'var(--mads-color-fg)' },
  info: { background: 'var(--mads-color-info-surface)', foreground: 'var(--mads-color-fg)' },
  neutral: { background: 'var(--mads-color-neutral-surface)', foreground: 'var(--mads-color-fg)' },
};

const BUTTON_VARIANT: Readonly<Record<string, Tone>> = {
  default: { background: 'var(--mads-color-surface-raised)', foreground: 'var(--mads-color-fg)' },
  primary: { background: 'var(--mads-color-primary)', foreground: 'var(--mads-color-on-primary)' },
  secondary: { background: 'var(--mads-color-surface)', foreground: 'var(--mads-color-fg)' },
  ghost: { background: 'transparent', foreground: 'var(--mads-color-fg)' },
  danger: { background: 'var(--mads-color-error)', foreground: 'var(--mads-color-on-primary)' },
  success: { background: 'var(--mads-color-success)', foreground: 'var(--mads-color-on-primary)' },
  warning: { background: 'var(--mads-color-warning)', foreground: 'var(--mads-color-on-primary)' },
  info: { background: 'var(--mads-color-info)', foreground: 'var(--mads-color-on-primary)' },
  error: { background: 'var(--mads-color-error)', foreground: 'var(--mads-color-on-primary)' },
};

const CONTROL_HEIGHT: Readonly<Record<string, string>> = {
  sm: 'var(--mads-control-height-sm)',
  md: 'var(--mads-control-height-md)',
  lg: 'var(--mads-control-height-lg)',
};

const INPUT_TYPES: Readonly<Record<string, string>> = {
  text: 'text',
  email: 'email',
  password: 'password',
  number: 'number',
  tel: 'tel',
  url: 'url',
  search: 'search',
};

const INPUT_MODES: Readonly<Record<string, string>> = {
  none: 'none',
  text: 'text',
  decimal: 'decimal',
  numeric: 'numeric',
  tel: 'tel',
  search: 'search',
  email: 'email',
  url: 'url',
};

const TEXT_ALIGN: Readonly<Record<string, string>> = {
  start: 'left',
  end: 'right',
  center: 'center',
  left: 'left',
  right: 'right',
};

// ---------------------------------------------------------------------------
// Small helpers.
// ---------------------------------------------------------------------------

function make<K extends keyof HTMLElementTagNameMap>(tag: K): HTMLElementTagNameMap[K] {
  return document.createElement(tag);
}

/** Removes every inline style this module may have applied. */
function resetStyle(element: HTMLElement): void {
  element.removeAttribute('style');
  delete element.dataset.muipTone;
}

function str(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'boolean') return String(value);
  return undefined;
}

function num(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function flag(value: unknown): boolean {
  return value === true || value === 'true';
}

function firstText(...values: unknown[]): string | undefined {
  for (const value of values) {
    const text = str(value);
    if (text !== undefined && text.length > 0) return text;
  }
  return undefined;
}

function token<T>(table: Readonly<Record<string, T>>, value: unknown): T | undefined {
  if (typeof value !== 'string') return undefined;
  return Object.prototype.hasOwnProperty.call(table, value) ? table[value] : undefined;
}

/** Accessible-name precedence: `ariaLabel`, then `label`, then `title`. */
function accessibleName(props: Props): string | undefined {
  return firstText(props.ariaLabel, props.label, props.title);
}

function setLabel(element: HTMLElement, name: string | undefined): void {
  if (name !== undefined) element.setAttribute('aria-label', name);
  else element.removeAttribute('aria-label');
}

const HEADINGS: Readonly<Record<string, keyof HTMLElementTagNameMap>> = {
  '1': 'h1',
  '2': 'h2',
  '3': 'h3',
  '4': 'h4',
  '5': 'h5',
  '6': 'h6',
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  h5: 'h5',
  h6: 'h6',
};

function headingTag(level: unknown): keyof HTMLElementTagNameMap {
  const raw = str(level);
  if (raw !== undefined) {
    const direct = HEADINGS[raw];
    if (direct) return direct;
    const numeric = HEADINGS[raw.replace(/^h/i, '')];
    if (numeric) return numeric;
  }
  return 'h2';
}

function heading(level: unknown, text: string | undefined): HTMLElement {
  const element = make(headingTag(level));
  element.textContent = text ?? '';
  element.style.margin = '0';
  element.style.fontFamily = 'var(--mads-font-display)';
  element.style.fontSize = 'var(--mads-text-18)';
  element.style.fontWeight = 'var(--mads-weight-semibold)';
  element.style.color = 'var(--mads-color-fg)';
  return element;
}

function baseFont(element: HTMLElement): void {
  element.style.fontFamily = 'var(--mads-font-ui)';
  element.style.color = 'var(--mads-color-fg)';
}

function mutedText(element: HTMLElement): void {
  element.style.color = 'var(--mads-color-muted)';
  element.style.fontSize = 'var(--mads-text-14)';
}

function surface(element: HTMLElement): void {
  element.style.backgroundColor = 'var(--mads-color-surface-raised)';
  element.style.border = '1px solid var(--mads-color-border-subtle)';
  element.style.borderRadius = 'var(--mads-radius-clay-lg)';
  element.style.boxShadow = 'var(--mads-clay-shadow-1)';
}

function stack(element: HTMLElement, direction: 'row' | 'column' = 'column'): void {
  element.style.display = 'flex';
  element.style.flexDirection = direction;
}

function applyCommon(element: HTMLElement, props: Props): void {
  const gap = token(SPACE, props.gap);
  if (gap !== undefined) element.style.gap = gap;
  const padding = token(SPACE, props.padding);
  if (padding !== undefined) element.style.padding = padding;
  const radius = token(RADIUS, props.radius);
  if (radius !== undefined) element.style.borderRadius = radius;
  const shadow = token(SHADOW, props.shadow);
  if (shadow !== undefined) element.style.boxShadow = shadow;
  const tone = token(TONE, props.tone);
  if (tone !== undefined) {
    element.style.backgroundColor = tone.background;
    element.style.color = tone.foreground;
    element.dataset.muipTone = String(props.tone);
  }
  const textSize = token(TEXT_SIZE, props.textSize);
  if (textSize !== undefined) element.style.fontSize = textSize;
  const width = token(WIDTH, props.width);
  if (width !== undefined) element.style.width = width;
  const height = token(HEIGHT, props.height);
  if (height !== undefined) element.style.height = height;
  const align = token(ALIGN, props.align);
  if (align !== undefined) element.style.alignItems = align;
  const justify = token(JUSTIFY, props.justify);
  if (justify !== undefined) element.style.justifyContent = justify;
  const direction = token(DIRECTION, props.direction);
  if (direction !== undefined) element.style.flexDirection = direction;
}

function styleControl(element: HTMLElement): void {
  element.style.fontFamily = 'var(--mads-font-ui)';
  element.style.fontSize = 'var(--mads-text-16)';
  element.style.color = 'var(--mads-color-fg)';
  element.style.backgroundColor = 'var(--mads-color-surface)';
  element.style.border = '1px solid var(--mads-color-border)';
  element.style.borderRadius = 'var(--mads-radius-clay-sm)';
  element.style.padding = 'var(--mads-space-2) var(--mads-space-3)';
  element.style.minHeight = 'var(--mads-control-height-md)';
  element.style.width = '100%';
  element.style.boxSizing = 'border-box';
}

function applyControlState(control: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, props: Props): void {
  control.disabled = flag(props.disabled);
  control.required = flag(props.required);
  control.setAttribute('aria-required', String(control.required));
  if (control.disabled) control.setAttribute('aria-disabled', 'true');
  else control.removeAttribute('aria-disabled');
  const name = str(props.name);
  if (name !== undefined) control.name = name;
  if (control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement) {
    const placeholder = str(props.placeholder);
    if (placeholder !== undefined) control.placeholder = placeholder;
  }
}

/** Give a control its accessible name: ariaLabel alone, else a visible label. */
function nameControl(control: HTMLElement, labelElement: HTMLLabelElement | null, props: Props): void {
  const ariaLabel = firstText(props.ariaLabel);
  const title = firstText(props.title);
  const controlId = control.id;
  if (ariaLabel !== undefined) {
    control.setAttribute('aria-label', ariaLabel);
  } else if (title !== undefined) {
    control.setAttribute('aria-label', title);
  } else {
    control.removeAttribute('aria-label');
  }
  if (labelElement !== null) {
    if (firstText(props.label) !== undefined && ariaLabel === undefined) {
      control.removeAttribute('aria-label');
      labelElement.htmlFor = controlId;
    } else {
      labelElement.removeAttribute('for');
    }
  }
}

function controlId(node: MuipNode, suffix: string): string {
  return `${node.id}-${suffix}`;
}

interface ErrorSlotOptions {
  control: HTMLElement;
  slot: HTMLElement;
  node: MuipNode;
  message: string | undefined;
}

function syncErrorSlot({ control, slot, node, message }: ErrorSlotOptions): void {
  slot.id = controlId(node, 'error');
  slot.setAttribute('role', 'alert');
  slot.textContent = message ?? '';
  slot.hidden = message === undefined;
  control.style.borderColor = message === undefined ? 'var(--mads-color-border)' : 'var(--mads-color-error)';
  if (message === undefined) {
    control.removeAttribute('aria-invalid');
    control.removeAttribute('aria-describedby');
  } else {
    control.setAttribute('aria-invalid', 'true');
    control.setAttribute('aria-describedby', slot.id);
  }
}

/** https:, microapp:, or a relative reference. Anything else is not linkable. */
const SAFE_SCHEMES = new Set(['https:', 'microapp:']);

function safeHref(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length === 0 || value.length > 2048) return undefined;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 0x1f || code === 0x7f) return undefined;
  }
  if (value.startsWith('//')) return undefined;
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(value);
  if (scheme) return SAFE_SCHEMES.has(`${scheme[1].toLowerCase()}:`) ? value : undefined;
  return value;
}

interface ListItem {
  readonly label: string;
  readonly value?: string;
  readonly id?: string;
  readonly href?: string;
  readonly checked: boolean;
  readonly disabled: boolean;
}

function readItems(value: unknown): ListItem[] {
  if (!Array.isArray(value)) return [];
  const items: ListItem[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) continue;
    const label = firstText(entry.label, entry.text, entry.title, entry.value, entry.id);
    const item: ListItem = {
      label: label ?? '',
      value: str(entry.value),
      id: str(entry.id),
      href: safeHref(entry.href),
      checked: flag(entry.checked) || flag(entry.selected) || flag(entry.active),
      disabled: flag(entry.disabled),
    };
    if (item.label.length === 0 && item.value === undefined && item.id === undefined) continue;
    items.push(item);
  }
  return items;
}

interface OptionItem extends ListItem {
  readonly selected: boolean;
}

function readOptions(value: unknown): OptionItem[] {
  if (!Array.isArray(value)) return [];
  const options: OptionItem[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) continue;
    const label = firstText(entry.label, entry.text, entry.title, entry.value, entry.id);
    const option: OptionItem = {
      label: label ?? '',
      value: str(entry.value),
      id: str(entry.id),
      href: undefined,
      checked: flag(entry.checked),
      disabled: flag(entry.disabled),
      selected: flag(entry.selected) || flag(entry.checked) || flag(entry.active),
    };
    if (option.label.length === 0 && option.value === undefined) continue;
    options.push(option);
  }
  return options;
}

interface Column {
  readonly key: string;
  readonly label: string;
  readonly align?: string;
}

function readColumns(value: unknown): Column[] {
  if (!Array.isArray(value)) return [];
  const columns: Column[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) continue;
    const key = firstText(entry.key, entry.id, entry.value);
    if (key === undefined) continue;
    columns.push({ key, label: firstText(entry.label, entry.title) ?? key, align: str(entry.align) });
  }
  return columns;
}

function readRows(value: unknown): Props[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord);
}

function docLocale(): string {
  const lang = typeof document === 'undefined' ? '' : document.documentElement.lang;
  return lang.toLowerCase().startsWith('id') ? 'id-ID' : 'en-US';
}

function docLanguage(): string {
  return typeof document === 'undefined' ? '' : document.documentElement.lang;
}

/** Placeholder sentence; follows the host's `lang` attribute. */
function placeholderSentence(): string {
  return docLanguage().toLowerCase().startsWith('id')
    ? 'Belum tersedia di host ini'
    : 'Not available in this host';
}

function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const digits = unit === 0 ? 0 : value < 10 ? 1 : 0;
  return `${new Intl.NumberFormat(docLocale(), { maximumFractionDigits: digits }).format(value)} ${units[unit]}`;
}

// ---------------------------------------------------------------------------
// Icon glyphs: a fixed path table, never arbitrary markup.
// ---------------------------------------------------------------------------

const GLYPHS: Readonly<Record<string, string>> = {
  plus: 'M12 5v14M5 12h14',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4.35-4.35',
  close: 'M6 6l12 12M18 6L6 18',
  more: 'M6 12h.01M12 12h.01M18 12h.01',
  check: 'M4 12l5 5L20 6',
  chevron: 'M9 18l6-6-6-6',
  upload: 'M12 16V4M7 9l5-5 5 5M4 20h16',
  download: 'M12 4v12M7 11l5 5 5-5M4 20h16',
  settings: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM4 12h2M18 12h2M12 4v2M12 18v2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M17.7 6.3l-1.4 1.4M7.7 16.3l-1.4 1.4',
  play: 'M7 4l13 8-13 8z',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  share: 'M12 16V4M8 8l4-4 4 4M4 14v6h16v-6',
  dot: 'M12 12h.01',
};

const GLYPH_ALIASES: Readonly<Record<string, string>> = {
  add: 'plus',
  x: 'close',
  dismiss: 'close',
  menu: 'more',
  dots: 'more',
  tick: 'check',
  arrow: 'chevron',
  gear: 'settings',
  cog: 'settings',
  uploads: 'upload',
  downloads: 'download',
  delete: 'trash',
  remove: 'trash',
  send: 'share',
};

function glyphName(value: unknown): string {
  const raw = firstText(value);
  if (raw === undefined) return 'dot';
  const normalized = raw.toLowerCase().replace(/^icon[-_]?/, '');
  if (Object.prototype.hasOwnProperty.call(GLYPHS, normalized)) return normalized;
  const alias = GLYPH_ALIASES[normalized];
  return alias ?? 'dot';
}

const SVG_NS = 'http://www.w3.org/2000/svg';

function glyphSvg(name: unknown, size = 20): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', GLYPHS[glyphName(name)] ?? GLYPHS.dot);
  svg.append(path);
  return svg;
}

// ---------------------------------------------------------------------------
// Builder plumbing.
// ---------------------------------------------------------------------------

function view(element: HTMLElement, content: HTMLElement, sync: (node: MuipNode) => void, node: MuipNode): ComponentView {
  sync(node);
  return { element, content, sync };
}

function propsOf(node: MuipNode): Props {
  return node.props ?? {};
}

// ---------------------------------------------------------------------------
// Layout.
// ---------------------------------------------------------------------------

const AppShell: ComponentBuilder = (node) => {
  const root = make('div');
  const header = make('header');
  const main = make('main');
  root.append(header, main);
  return view(root, main, (current) => {
    resetStyle(root);
    baseFont(root);
    const props = propsOf(current);
    stack(root);
    root.style.minHeight = 'var(--mads-control-height-lg)';
    root.style.backgroundColor = 'var(--mads-color-bg)';
    applyCommon(root, props);
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.padding = 'var(--mads-space-3) var(--mads-space-4)';
    header.style.borderBottom = '1px solid var(--mads-color-border-subtle)';
    header.replaceChildren();
    const brand = firstText(props.brand, props.title, props.label);
    if (brand !== undefined) {
      const strong = make('strong');
      strong.textContent = brand;
      strong.style.fontFamily = 'var(--mads-font-display)';
      strong.style.fontSize = 'var(--mads-text-18)';
      header.append(strong);
    }
    header.hidden = header.childElementCount === 0;
    main.style.display = 'flex';
    main.style.flexDirection = 'column';
    main.style.gap = 'var(--mads-space-3)';
    main.style.padding = 'var(--mads-space-4)';
    main.style.flex = '1';
    setLabel(main, firstText(props.navLabel, props.ariaLabel, props.label));
  }, node);
};

const Stack: ComponentBuilder = (node) => {
  const root = make('div');
  return view(root, root, (current) => {
    resetStyle(root);
    baseFont(root);
    const props = propsOf(current);
    stack(root, token(DIRECTION, props.direction) === 'row' ? 'row' : 'column');
    root.style.gap = 'var(--mads-space-3)';
    applyCommon(root, props);
    setLabel(root, accessibleName(props));
  }, node);
};

const Grid: ComponentBuilder = (node) => {
  const root = make('div');
  return view(root, root, (current) => {
    resetStyle(root);
    baseFont(root);
    const props = propsOf(current);
    root.style.display = 'grid';
    const requested = num(props.gridColumns);
    const columns = requested === undefined ? 0 : Math.max(1, Math.min(6, Math.trunc(requested)));
    root.style.gridTemplateColumns = columns > 0
      ? `repeat(${columns}, minmax(0, 1fr))`
      : 'repeat(auto-fill, minmax(12rem, 1fr))';
    root.style.gap = 'var(--mads-space-3)';
    applyCommon(root, props);
    setLabel(root, accessibleName(props));
  }, node);
};

const Card: ComponentBuilder = (node) => {
  const root = make('section');
  const header = make('div');
  const content = make('div');
  root.append(header, content);
  return view(root, content, (current) => {
    resetStyle(root);
    baseFont(root);
    const props = propsOf(current);
    surface(root);
    root.style.padding = 'var(--mads-space-4)';
    root.style.display = 'flex';
    root.style.flexDirection = 'column';
    root.style.gap = 'var(--mads-space-3)';
    if (flag(props.elevated)) root.style.boxShadow = 'var(--mads-clay-shadow-2)';
    if (flag(props.interactive)) root.style.cursor = 'pointer';
    applyCommon(root, props);
    setLabel(root, accessibleName(props));
    header.replaceChildren();
    header.style.display = 'flex';
    header.style.flexDirection = 'column';
    header.style.gap = 'var(--mads-space-1)';
    const title = firstText(props.title);
    const description = firstText(props.description);
    if (title !== undefined) header.append(heading(props.headingLevel, title));
    if (description !== undefined) {
      const paragraph = make('p');
      paragraph.textContent = description;
      paragraph.style.margin = '0';
      mutedText(paragraph);
      header.append(paragraph);
    }
    header.hidden = header.childElementCount === 0;
    content.style.display = 'flex';
    content.style.flexDirection = 'column';
    content.style.gap = 'var(--mads-space-2)';
  }, node);
};

function dialogBuilder(kind: 'sheet' | 'modal'): ComponentBuilder {
  return (node) => {
    const root = make('div');
    const header = make('div');
    const content = make('div');
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.append(header, content);
    return view(root, content, (current) => {
      resetStyle(root);
      baseFont(root);
      const props = propsOf(current);
      root.hidden = props.open === false;
      root.style.backgroundColor = 'var(--mads-color-surface-raised)';
      root.style.border = '1px solid var(--mads-color-border)';
      root.style.boxShadow = kind === 'sheet' ? 'var(--mads-clay-shadow-3)' : 'var(--mads-clay-shadow-2)';
      root.style.borderRadius = kind === 'sheet' ? 'var(--mads-radius-clay-xl) var(--mads-radius-clay-xl) 0 0' : 'var(--mads-radius-clay-lg)';
      root.style.padding = 'var(--mads-space-4)';
      root.style.display = 'flex';
      root.style.flexDirection = 'column';
      root.style.gap = 'var(--mads-space-3)';
      root.style.width = kind === 'modal' ? 'min(28rem, 90vw)' : '100%';
      if (kind === 'modal') {
        root.style.margin = 'auto';
      }
      const side = token({ left: 'left', right: 'right', top: 'top', bottom: 'bottom' } as const, props.side);
      if (side !== undefined) root.dataset.side = side;
      else delete root.dataset.side;
      applyCommon(root, props);
      setLabel(root, accessibleName(props));
      header.replaceChildren();
      const title = firstText(props.title);
      if (title !== undefined) {
        const titleId = controlId(current, 'title');
        const titleElement = heading(props.headingLevel, title);
        titleElement.id = titleId;
        root.setAttribute('aria-labelledby', titleId);
        header.append(titleElement);
      } else {
        root.removeAttribute('aria-labelledby');
      }
      const description = firstText(props.description);
      if (description !== undefined) {
        const paragraph = make('p');
        paragraph.textContent = description;
        paragraph.style.margin = '0';
        mutedText(paragraph);
        header.append(paragraph);
      }
      header.hidden = header.childElementCount === 0;
      content.style.display = 'flex';
      content.style.flexDirection = 'column';
      content.style.gap = 'var(--mads-space-2)';
    }, node);
  };
}

const Sheet = dialogBuilder('sheet');
const Modal = dialogBuilder('modal');

const ScrollArea: ComponentBuilder = (node) => {
  const root = make('div');
  const content = make('div');
  root.append(content);
  return view(root, content, (current) => {
    resetStyle(root);
    baseFont(root);
    const props = propsOf(current);
    const axis = token({ x: 'x', y: 'y', both: 'both' } as const, props.axis) ?? 'y';
    root.style.overflowX = axis === 'y' ? 'hidden' : 'auto';
    root.style.overflowY = axis === 'x' ? 'hidden' : 'auto';
    root.style.maxHeight = '100%';
    applyCommon(root, props);
    setLabel(root, accessibleName(props));
    content.style.display = 'flex';
    content.style.flexDirection = 'column';
    content.style.gap = 'var(--mads-space-2)';
  }, node);
};

// ---------------------------------------------------------------------------
// Navigation.
// ---------------------------------------------------------------------------

function listItemElement(item: ListItem, active: boolean, kind: 'nav' | 'plain'): HTMLElement {
  const link = item.href !== undefined ? make('a') : make('span');
  if (item.href !== undefined) link.setAttribute('href', item.href);
  link.textContent = item.label;
  link.style.color = active ? 'var(--mads-color-primary)' : 'var(--mads-color-fg)';
  link.style.fontWeight = active ? 'var(--mads-weight-semibold)' : 'var(--mads-weight-regular)';
  link.style.textDecoration = 'none';
  link.style.display = 'flex';
  link.style.alignItems = 'center';
  link.style.gap = 'var(--mads-space-2)';
  link.style.padding = 'var(--mads-space-2) var(--mads-space-3)';
  link.style.borderRadius = 'var(--mads-radius-clay-sm)';
  if (active) link.setAttribute('aria-current', 'page');
  if (item.disabled) link.setAttribute('aria-disabled', 'true');
  if (kind === 'nav' && item.id !== undefined) link.id = item.id;
  return link;
}

function navigationList(properties: Props, kind: 'nav' | 'plain'): HTMLUListElement {
  const list = make('ul');
  list.style.listStyle = 'none';
  list.style.margin = '0';
  list.style.padding = '0';
  list.style.display = 'flex';
  list.style.flexDirection = kind === 'nav' ? 'column' : 'row';
  list.style.gap = 'var(--mads-space-1)';
  const activeId = firstText(properties.activeId);
  const items = readItems(properties.items);
  for (const item of items) {
    const entry = make('li');
    const active = activeId !== undefined
      ? item.id === activeId || item.value === activeId
      : item.checked;
    entry.append(listItemElement(item, active, kind));
    list.append(entry);
  }
  list.hidden = items.length === 0;
  if (items.length === 0) list.setAttribute('aria-hidden', 'true');
  else list.removeAttribute('aria-hidden');
  return list;
}

const Sidebar: ComponentBuilder = (node) => {
  const root = make('nav');
  const content = make('div');
  const listHolder = make('div');
  root.append(listHolder, content);
  return view(root, content, (current) => {
    resetStyle(root);
    baseFont(root);
    const props = propsOf(current);
    stack(root);
    root.style.gap = 'var(--mads-space-3)';
    root.style.padding = 'var(--mads-space-3)';
    root.style.backgroundColor = 'var(--mads-color-surface)';
    root.style.borderRight = '1px solid var(--mads-color-border-subtle)';
    root.style.width = flag(props.collapsed) ? 'var(--mads-rail-width)' : 'var(--mads-sidebar-width)';
    applyCommon(root, props);
    setLabel(root, accessibleName(props) ?? firstText(props.title));
    listHolder.replaceChildren(navigationList(props, 'nav'));
    content.style.display = 'flex';
    content.style.flexDirection = 'column';
    content.style.gap = 'var(--mads-space-2)';
  }, node);
};

const Dock: ComponentBuilder = (node) => {
  const root = make('nav');
  const listHolder = make('div');
  const content = make('div');
  root.append(listHolder, content);
  return view(root, content, (current) => {
    resetStyle(root);
    baseFont(root);
    const props = propsOf(current);
    root.style.display = 'flex';
    root.style.alignItems = 'center';
    root.style.justifyContent = 'center';
    root.style.gap = 'var(--mads-space-3)';
    root.style.padding = 'var(--mads-space-2) var(--mads-space-3)';
    root.style.backgroundColor = 'var(--mads-color-surface-raised)';
    root.style.borderTop = '1px solid var(--mads-color-border-subtle)';
    root.style.minHeight = 'var(--mads-dock-height)';
    applyCommon(root, props);
    setLabel(root, accessibleName(props));
    listHolder.replaceChildren(navigationList(props, 'nav'));
    content.style.display = 'flex';
    content.style.alignItems = 'center';
    content.style.gap = 'var(--mads-space-2)';
  }, node);
};

const TabBar: ComponentBuilder = (node) => {
  const root = make('div');
  const tablist = make('div');
  tablist.setAttribute('role', 'tablist');
  const content = make('div');
  root.append(tablist, content);
  return view(root, content, (current) => {
    resetStyle(root);
    baseFont(root);
    const props = propsOf(current);
    stack(root);
    root.style.gap = 'var(--mads-space-2)';
    applyCommon(root, props);
    setLabel(root, accessibleName(props));
    const activeId = firstText(props.activeId);
    tablist.replaceChildren();
    tablist.style.display = 'flex';
    tablist.style.flexDirection = 'row';
    tablist.style.gap = 'var(--mads-space-1)';
    tablist.style.borderBottom = '1px solid var(--mads-color-border-subtle)';
    const tabs = readItems(props.items);
    tabs.forEach((item, index) => {
      const tab = make('button');
      tab.type = 'button';
      tab.setAttribute('role', 'tab');
      tab.id = item.id ?? controlId(current, `tab-${index}`);
      const selected = activeId !== undefined ? item.id === activeId || item.value === activeId : item.checked;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      tab.textContent = item.label;
      tab.style.fontFamily = 'var(--mads-font-ui)';
      tab.style.fontSize = 'var(--mads-text-14)';
      tab.style.fontWeight = selected ? 'var(--mads-weight-semibold)' : 'var(--mads-weight-regular)';
      tab.style.color = selected ? 'var(--mads-color-primary)' : 'var(--mads-color-muted)';
      tab.style.background = 'transparent';
      tab.style.border = '0';
      tab.style.borderBottom = selected ? '2px solid var(--mads-color-primary)' : '2px solid transparent';
      tab.style.padding = 'var(--mads-space-2) var(--mads-space-3)';
      tab.style.cursor = 'pointer';
      tablist.append(tab);
    });
    tablist.hidden = tabs.length === 0;
    content.style.display = 'flex';
    content.style.flexDirection = 'column';
    content.style.gap = 'var(--mads-space-2)';
  }, node);
};

const Breadcrumb: ComponentBuilder = (node) => {
  const root = make('nav');
  const list = make('ol');
  root.append(list);
  return view(root, list, (current) => {
    resetStyle(root);
    baseFont(root);
    const props = propsOf(current);
    applyCommon(root, props);
    setLabel(root, accessibleName(props));
    const separator = firstText(props.separator) ?? '/';
    const items = readItems(props.items);
    list.replaceChildren();
    list.style.display = 'flex';
    list.style.flexWrap = 'wrap';
    list.style.alignItems = 'center';
    list.style.gap = 'var(--mads-space-1)';
    list.style.listStyle = 'none';
    list.style.margin = '0';
    list.style.padding = '0';
    items.forEach((item, index) => {
      const entry = make('li');
      entry.style.display = 'flex';
      entry.style.alignItems = 'center';
      entry.style.gap = 'var(--mads-space-1)';
      const last = index === items.length - 1;
      const label = listItemElement(item, last, 'plain');
      label.style.padding = '0';
      if (last) label.setAttribute('aria-current', 'page');
      entry.append(label);
      if (!last) {
        const sep = make('span');
        sep.textContent = separator;
        sep.style.color = 'var(--mads-color-muted)';
        sep.setAttribute('aria-hidden', 'true');
        entry.append(sep);
      }
      list.append(entry);
    });
  }, node);
};

const CommandPalette: ComponentBuilder = (node) => {
  const root = make('div');
  const input = make('input');
  const list = make('ul');
  const content = make('div');
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.append(input, list, content);
  return view(root, content, (current) => {
    resetStyle(root);
    baseFont(root);
    const props = propsOf(current);
    root.hidden = props.open === false;
    stack(root);
    root.style.gap = 'var(--mads-space-2)';
    root.style.padding = 'var(--mads-space-3)';
    surface(root);
    applyCommon(root, props);
    setLabel(root, accessibleName(props));
    input.type = 'search';
    input.id = controlId(current, 'query');
    input.placeholder = firstText(props.placeholder) ?? '';
    input.setAttribute('aria-label', firstText(props.ariaLabel, props.label, props.title) ?? '');
    list.id = controlId(current, 'results');
    input.setAttribute('aria-controls', list.id);
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-expanded', 'true');
    styleControl(input);
    list.setAttribute('role', 'listbox');
    list.replaceChildren();
    list.style.listStyle = 'none';
    list.style.margin = '0';
    list.style.padding = '0';
    const items = readItems(props.items);
    items.forEach((item, index) => {
      const entry = make('li');
      entry.setAttribute('role', 'option');
      entry.id = item.id ?? controlId(current, `option-${index}`);
      entry.textContent = item.label;
      entry.setAttribute('aria-selected', String(item.checked));
      entry.style.padding = 'var(--mads-space-2) var(--mads-space-3)';
      entry.style.borderRadius = 'var(--mads-radius-clay-sm)';
      if (item.checked) entry.style.backgroundColor = 'var(--mads-color-surface)';
      list.append(entry);
    });
    list.hidden = items.length === 0;
    content.style.display = 'flex';
    content.style.flexDirection = 'column';
  }, node);
};

const Stepper: ComponentBuilder = (node) => {
  const root = make('ol');
  return view(root, root, (current) => {
    resetStyle(root);
    baseFont(root);
    const props = propsOf(current);
    const stepsSource: unknown = Array.isArray(props.steps) ? props.steps : props.items;
    const steps = readItems(stepsSource);
    const active = num(props.activeStep) ?? 0;
    root.replaceChildren();
    root.style.display = 'flex';
    root.style.flexWrap = 'wrap';
    root.style.gap = 'var(--mads-space-2)';
    root.style.listStyle = 'none';
    root.style.margin = '0';
    root.style.padding = '0';
    applyCommon(root, props);
    setLabel(root, accessibleName(props));
    steps.forEach((step, index) => {
      const entry = make('li');
      entry.style.display = 'flex';
      entry.style.alignItems = 'center';
      entry.style.gap = 'var(--mads-space-2)';
      entry.style.padding = 'var(--mads-space-1) var(--mads-space-2)';
      entry.style.borderRadius = 'var(--mads-radius-clay-sm)';
      const done = index < active;
      const isActive = index === active;
      entry.style.color = isActive
        ? 'var(--mads-color-primary)'
        : done
          ? 'var(--mads-color-fg)'
          : 'var(--mads-color-muted)';
      entry.style.fontWeight = isActive ? 'var(--mads-weight-semibold)' : 'var(--mads-weight-regular)';
      if (isActive) entry.setAttribute('aria-current', 'step');
      const marker = make('span');
      marker.textContent = String(index + 1);
      marker.style.display = 'inline-flex';
      marker.style.alignItems = 'center';
      marker.style.justifyContent = 'center';
      marker.style.width = 'var(--mads-space-6)';
      marker.style.height = 'var(--mads-space-6)';
      marker.style.borderRadius = 'var(--mads-radius-full)';
      marker.style.border = '1px solid var(--mads-color-border)';
      if (isActive) marker.style.borderColor = 'var(--mads-color-primary)';
      entry.append(marker);
      const label = make('span');
      label.textContent = step.label;
      entry.append(label);
      root.append(entry);
    });
  }, node);
};

// ---------------------------------------------------------------------------
// Input.
// ---------------------------------------------------------------------------

const BUTTON_TYPES: Readonly<Record<string, 'button' | 'submit' | 'reset'>> = {
  button: 'button',
  submit: 'submit',
  reset: 'reset',
};

const Button: ComponentBuilder = (node) => {
  const root = make('button');
  root.type = 'button';
  return view(root, root, (current) => {
    resetStyle(root);
    const props = propsOf(current);
    baseFont(root);
    const variant = token(BUTTON_VARIANT, props.variant) ?? BUTTON_VARIANT.default;
    root.style.display = 'inline-flex';
    root.style.alignItems = 'center';
    root.style.justifyContent = 'center';
    root.style.gap = 'var(--mads-space-2)';
    root.style.padding = 'var(--mads-space-2) var(--mads-space-4)';
    root.style.minHeight = token(CONTROL_HEIGHT, props.size) ?? 'var(--mads-control-height-md)';
    root.style.border = '1px solid var(--mads-color-border-strong)';
    root.style.borderRadius = 'var(--mads-radius-clay-md)';
    root.style.backgroundColor = variant.background;
    root.style.color = variant.foreground;
    root.style.fontFamily = 'var(--mads-font-ui)';
    root.style.fontSize = 'var(--mads-text-16)';
    root.style.fontWeight = 'var(--mads-weight-medium)';
    root.style.cursor = 'pointer';
    root.type = token(BUTTON_TYPES, props.type) ?? 'button';
    root.disabled = flag(props.disabled) || flag(props.loading);
    if (root.disabled) root.setAttribute('aria-disabled', 'true');
    else root.removeAttribute('aria-disabled');
    if (flag(props.loading)) root.setAttribute('aria-busy', 'true');
    else root.removeAttribute('aria-busy');
    applyCommon(root, props);
    setLabel(root, accessibleName(props) ?? firstText(props.text));
    const label = firstText(props.text, props.label);
    root.textContent = label ?? '';
    const href = safeHref(props.href);
    if (href !== undefined) root.dataset.href = href;
    else delete root.dataset.href;
  }, node);
};

const IconButton: ComponentBuilder = (node) => {
  const root = make('button');
  root.type = 'button';
  return view(root, root, (current) => {
    resetStyle(root);
    const props = propsOf(current);
    baseFont(root);
    root.type = 'button';
    root.style.display = 'inline-flex';
    root.style.alignItems = 'center';
    root.style.justifyContent = 'center';
    root.style.width = token(CONTROL_HEIGHT, props.size) ?? 'var(--mads-control-height-md)';
    root.style.height = token(CONTROL_HEIGHT, props.size) ?? 'var(--mads-control-height-md)';
    root.style.padding = '0';
    root.style.border = '1px solid var(--mads-color-border)';
    root.style.borderRadius = 'var(--mads-radius-full)';
    root.style.backgroundColor = 'var(--mads-color-surface)';
    root.style.color = 'var(--mads-color-fg)';
    root.style.cursor = 'pointer';
    root.disabled = flag(props.disabled);
    if (root.disabled) root.setAttribute('aria-disabled', 'true');
    else root.removeAttribute('aria-disabled');
    applyCommon(root, props);
    const name = accessibleName(props) ?? glyphName(firstText(props.icon, props.name));
    setLabel(root, name);
    root.replaceChildren(glyphSvg(firstText(props.icon, props.name)));
  }, node);
};

interface FieldParts {
  readonly root: HTMLDivElement;
  readonly label: HTMLLabelElement;
  readonly error: HTMLSpanElement;
}

function fieldParts(): FieldParts {
  const root = make('div');
  const label = make('label');
  const error = make('span');
  root.append(label);
  return { root, label, error };
}

function styleFieldRoot(root: HTMLElement): void {
  resetStyle(root);
  baseFont(root);
  stack(root);
  root.style.gap = 'var(--mads-space-1)';
}

function syncFieldLabel(parts: FieldParts, props: Props, control: HTMLElement): void {
  const label = firstText(props.label);
  parts.label.textContent = label ?? '';
  parts.label.hidden = label === undefined;
  parts.label.style.fontSize = 'var(--mads-text-14)';
  parts.label.style.fontWeight = 'var(--mads-weight-medium)';
  parts.label.style.color = 'var(--mads-color-fg)';
  if (label !== undefined && parts.label.htmlFor === '') parts.label.htmlFor = control.id;
}

function mountField(parts: FieldParts, control: HTMLElement): void {
  parts.root.append(control, parts.error);
}

function inputBuilder(kind: 'text' | 'textarea' | 'search'): ComponentBuilder {
  return (node) => {
    const parts = fieldParts();
    const control = kind === 'textarea' ? make('textarea') : make('input');
    mountField(parts, control);
    return view(parts.root, parts.root, (current) => {
      const props = propsOf(current);
      styleFieldRoot(parts.root);
      applyCommon(parts.root, props);
      control.id = controlId(current, 'input');
      if (control instanceof HTMLInputElement) {
        control.type = kind === 'search' ? 'search' : token(INPUT_TYPES, props.type) ?? 'text';
        const mode = token(INPUT_MODES, props.inputMode);
        if (mode !== undefined) control.inputMode = mode;
      }
      if (control instanceof HTMLTextAreaElement) {
        const rows = num(props.lineCount);
        control.rows = rows === undefined ? 4 : Math.max(1, Math.min(32, Math.trunc(rows)));
      }
      applyControlState(control, props);
      const value = str(props.value);
      if (value !== undefined && control.value !== value) control.value = value;
      styleControl(control);
      syncFieldLabel(parts, props, control);
      nameControl(control, parts.label, props);
      syncErrorSlot({ control, slot: parts.error, node: current, message: firstText(props.error) });
    }, node);
  };
}

const TextField = inputBuilder('text');
const TextArea = inputBuilder('textarea');
const SearchField = inputBuilder('search');

function selectBuilder(kind: 'select' | 'combobox'): ComponentBuilder {
  return (node) => {
    const parts = fieldParts();
    const control = kind === 'select' ? make('select') : make('input');
    const listbox = kind === 'combobox' ? make('ul') : null;
    mountField(parts, control);
    if (listbox !== null) {
      listbox.setAttribute('role', 'listbox');
      parts.root.insertBefore(listbox, parts.error);
    }
    return view(parts.root, parts.root, (current) => {
      const props = propsOf(current);
      styleFieldRoot(parts.root);
      applyCommon(parts.root, props);
      const options = readOptions(props.options);
      const currentValue = firstText(props.value);
      if (control instanceof HTMLSelectElement) {
        control.id = controlId(current, 'input');
        applyControlState(control, props);
        control.replaceChildren();
        let selectedIndex = 0;
        options.forEach((item, index) => {
          const option = make('option');
          option.value = item.value ?? item.label;
          option.textContent = item.label;
          option.disabled = item.disabled;
          const selected = item.checked || item.selected || (currentValue !== undefined && option.value === currentValue);
          if (selected) selectedIndex = index;
          control.append(option);
        });
        if (options.length > 0) control.selectedIndex = Math.min(selectedIndex, options.length - 1);
        if (currentValue !== undefined && Array.from(control.options).some((option) => option.value === currentValue)) {
          control.value = currentValue;
        }
        styleControl(control);
      } else {
        control.id = controlId(current, 'input');
        control.type = 'text';
        if (currentValue !== undefined && control.value !== currentValue) control.value = currentValue;
        applyControlState(control, props);
        styleControl(control);
        control.setAttribute('role', 'combobox');
        control.setAttribute('autocomplete', 'off');
        control.setAttribute('aria-autocomplete', 'list');
        if (listbox !== null) {
          listbox.id = controlId(current, 'listbox');
          control.setAttribute('aria-controls', listbox.id);
          control.setAttribute('aria-expanded', String(props.open !== false));
          listbox.replaceChildren();
          listbox.hidden = options.length === 0;
          options.forEach((item, index) => {
            const entry = make('li');
            entry.setAttribute('role', 'option');
            entry.id = item.id ?? controlId(current, `option-${index}`);
            entry.textContent = item.label;
            entry.setAttribute('aria-selected', String(item.checked || item.selected));
            listbox.append(entry);
          });
        }
      }
      syncFieldLabel(parts, props, control);
      nameControl(control, parts.label, props);
      syncErrorSlot({ control, slot: parts.error, node: current, message: firstText(props.error) });
    }, node);
  };
}

const Select = selectBuilder('select');
const Combobox = selectBuilder('combobox');

const Checkbox: ComponentBuilder = (node) => {
  const root = make('label');
  const input = make('input');
  input.type = 'checkbox';
  const text = make('span');
  root.append(input, text);
  return view(root, root, (current) => {
    resetStyle(root);
    baseFont(root);
    const props = propsOf(current);
    root.style.display = 'inline-flex';
    root.style.alignItems = 'center';
    root.style.gap = 'var(--mads-space-2)';
    root.style.cursor = 'pointer';
    applyCommon(root, props);
    setLabel(root, accessibleName(props));
    input.id = controlId(current, 'input');
    applyControlState(input, props);
    input.checked = flag(props.checked);
    const label = firstText(props.label, props.text);
    text.textContent = label ?? '';
    text.style.fontSize = 'var(--mads-text-14)';
    text.style.color = 'var(--mads-color-fg)';
    input.style.width = 'var(--mads-touch-target-min)';
    input.style.height = 'var(--mads-touch-target-min)';
    const explicitName = firstText(props.ariaLabel, props.title);
    if (explicitName !== undefined) input.setAttribute('aria-label', explicitName);
    else input.removeAttribute('aria-label');
  }, node);
};

const RadioGroup: ComponentBuilder = (node) => {
  const root = make('fieldset');
  const legend = make('legend');
  root.append(legend);
  return view(root, root, (current) => {
    resetStyle(root);
    baseFont(root);
    const props = propsOf(current);
    stack(root);
    root.style.gap = 'var(--mads-space-2)';
    root.style.border = '0';
    root.style.padding = '0';
    root.style.margin = '0';
    applyCommon(root, props);
    setLabel(root, accessibleName(props));
    legend.textContent = firstText(props.label, props.title) ?? '';
    legend.style.fontSize = 'var(--mads-text-14)';
    legend.style.fontWeight = 'var(--mads-weight-medium)';
    legend.style.padding = '0';
    legend.hidden = legend.textContent.length === 0;
    const groupName = firstText(props.name) ?? controlId(current, 'group');
    const selected = firstText(props.value);
    const options = readOptions(props.options);
    root.querySelectorAll('[data-muip-option]').forEach((element) => element.remove());
    options.forEach((item, index) => {
      const entry = make('label');
      entry.dataset.muipOption = '';
      entry.style.display = 'inline-flex';
      entry.style.alignItems = 'center';
      entry.style.gap = 'var(--mads-space-2)';
      const radio = make('input');
      radio.type = 'radio';
      radio.name = groupName;
      radio.id = controlId(current, `radio-${index}`);
      radio.value = item.value ?? item.label;
      radio.checked = item.checked || (selected !== undefined && radio.value === selected);
      radio.disabled = item.disabled || flag(props.disabled);
      const text = make('span');
      text.textContent = item.label;
      text.style.fontSize = 'var(--mads-text-14)';
      entry.append(radio, text);
      root.append(entry);
    });
  }, node);
};

const Switch: ComponentBuilder = (node) => {
  const root = make('label');
  const input = make('input');
  input.type = 'checkbox';
  input.setAttribute('role', 'switch');
  const text = make('span');
  root.append(input, text);
  return view(root, root, (current) => {
    resetStyle(root);
    baseFont(root);
    const props = propsOf(current);
    root.style.display = 'inline-flex';
    root.style.alignItems = 'center';
    root.style.gap = 'var(--mads-space-2)';
    applyCommon(root, props);
    setLabel(root, accessibleName(props));
    input.id = controlId(current, 'input');
    applyControlState(input, props);
    input.checked = flag(props.checked);
    text.textContent = firstText(props.label, props.text) ?? '';
    text.style.fontSize = 'var(--mads-text-14)';
    const explicitName = firstText(props.ariaLabel, props.title);
    if (explicitName !== undefined) input.setAttribute('aria-label', explicitName);
    else input.removeAttribute('aria-label');
  }, node);
};

const Slider: ComponentBuilder = (node) => {
  const parts = fieldParts();
  const input = make('input');
  input.type = 'range';
  const output = make('output');
  mountField(parts, input);
  parts.root.insertBefore(output, parts.error);
  return view(parts.root, parts.root, (current) => {
    resetStyle(parts.root);
    baseFont(parts.root);
    const props = propsOf(current);
    stack(parts.root);
    parts.root.style.gap = 'var(--mads-space-1)';
    applyCommon(parts.root, props);
    input.id = controlId(current, 'input');
    const min = num(props.min) ?? 0;
    const max = num(props.max) ?? 100;
    const step = num(props.step) ?? 1;
    input.min = String(min);
    input.max = String(Math.max(min, max));
    input.step = String(step > 0 ? step : 1);
    const value = num(props.value);
    if (value !== undefined) input.value = String(Math.max(min, Math.min(max, value)));
    applyControlState(input, props);
    styleControl(input);
    input.style.padding = '0';
    syncFieldLabel(parts, props, input);
    nameControl(input, parts.label, props);
    output.textContent = flag(props.showValue) ? input.value : '';
    output.hidden = !flag(props.showValue);
    mutedText(output);
    syncErrorSlot({ control: input, slot: parts.error, node: current, message: firstText(props.error) });
  }, node);
};

// ---------------------------------------------------------------------------
// Data.
// ---------------------------------------------------------------------------

const DataTable: ComponentBuilder = (node) => {
  const root = make('table');
  const caption = make('caption');
  const head = make('thead');
  const body = make('tbody');
  root.append(caption, head, body);
  return view(root, body, (current) => {
    resetStyle(root);
    baseFont(root);
    const props = propsOf(current);
    root.style.width = '100%';
    root.style.borderCollapse = 'collapse';
    root.style.fontSize = 'var(--mads-text-14)';
    applyCommon(root, props);
    setLabel(root, accessibleName(props));
    const captionText = firstText(props.caption, props.label, props.title);
    caption.textContent = captionText ?? '';
    caption.hidden = captionText === undefined;
    caption.style.textAlign = 'left';
    caption.style.padding = 'var(--mads-space-2)';
    const columns = readColumns(props.columns);
    head.replaceChildren();
    const headerRow = make('tr');
    columns.forEach((column) => {
      const cell = make('th');
      cell.scope = 'col';
      cell.textContent = column.label;
      cell.style.textAlign = TEXT_ALIGN[column.align ?? 'start'] ?? 'left';
      cell.style.padding = 'var(--mads-space-2) var(--mads-space-3)';
      cell.style.borderBottom = '1px solid var(--mads-color-border-strong)';
      cell.style.fontWeight = 'var(--mads-weight-semibold)';
      cell.style.color = 'var(--mads-color-muted)';
      headerRow.append(cell);
    });
    head.append(headerRow);
    const rows = readRows(props.rows);
    body.replaceChildren();
    if (rows.length === 0) {
      const empty = make('tr');
      const cell = make('td');
      cell.colSpan = Math.max(1, columns.length);
      cell.textContent = firstText(props.emptyLabel) ?? '';
      cell.style.padding = 'var(--mads-space-3)';
      cell.style.color = 'var(--mads-color-muted)';
      empty.append(cell);
      body.append(empty);
    }
    rows.forEach((row) => {
      const tr = make('tr');
      columns.forEach((column) => {
        const cell = make('td');
        cell.textContent = str(row[column.key]) ?? '';
        cell.style.padding = 'var(--mads-space-2) var(--mads-space-3)';
        cell.style.textAlign = TEXT_ALIGN[column.align ?? 'start'] ?? 'left';
        cell.style.borderBottom = '1px solid var(--mads-color-border-subtle)';
        tr.append(cell);
      });
      body.append(tr);
    });
    // `props.selectable` is intentionally unused: `aria-multiselectable` is not
    // allowed on a plain table, and selection state is carried by the header
    // checkbox instead.
    void flag(props.selectable);
  }, node);
};

const VirtualList: ComponentBuilder = (node) => {
  const root = make('div');
  const list = make('div');
  const content = make('div');
  root.append(list, content);
  return view(root, content, (current) => {
    resetStyle(root);
    baseFont(root);
    const props = propsOf(current);
    stack(root);
    root.style.gap = 'var(--mads-space-1)';
    root.style.overflowY = 'auto';
    applyCommon(root, props);
    setLabel(root, accessibleName(props));
    const items = readItems(props.items);
    const height = num(props.itemHeight);
    list.replaceChildren();
    list.setAttribute('role', 'list');
    list.style.display = 'flex';
    list.style.flexDirection = 'column';
    list.style.gap = 'var(--mads-space-1)';
    items.forEach((item) => {
      const row = make('div');
      row.setAttribute('role', 'listitem');
      row.textContent = item.label;
      row.dataset.value = item.value ?? '';
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.padding = 'var(--mads-space-2) var(--mads-space-3)';
      row.style.borderBottom = '1px solid var(--mads-color-border-subtle)';
      if (height !== undefined) row.style.minHeight = `${Math.max(0, Math.trunc(height))}px`;
      list.append(row);
    });
    list.hidden = items.length === 0;
    content.style.display = 'flex';
    content.style.flexDirection = 'column';
  }, node);
};

function parseMonth(value: unknown): { year: number; month: number } {
  const raw = firstText(value);
  if (raw !== undefined) {
    const match = /^(\d{4})-(\d{2})$/.exec(raw);
    if (match) {
      const month = Number(match[2]) - 1;
      if (month >= 0 && month <= 11) return { year: Number(match[1]), month };
    }
  }
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

function isoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

const Calendar: ComponentBuilder = (node) => {
  const root = make('div');
  return view(root, root, (current) => {
    resetStyle(root);
    baseFont(root);
    const props = propsOf(current);
    stack(root);
    root.style.gap = 'var(--mads-space-2)';
    surface(root);
    root.style.padding = 'var(--mads-space-3)';
    applyCommon(root, props);
    setLabel(root, accessibleName(props) ?? firstText(props.title));
    const locale = docLocale();
    const { year, month } = parseMonth(props.month);
    const selected = firstText(props.selectedDate);
    const today = isoDate(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
    const formatter = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' });
    const weekdayFormatter = new Intl.DateTimeFormat(locale, { weekday: 'short' });
    root.replaceChildren();
    const header = make('div');
    header.textContent = formatter.format(new Date(year, month, 1));
    header.style.fontWeight = 'var(--mads-weight-semibold)';
    header.style.fontSize = 'var(--mads-text-16)';
    root.append(header);
    const grid = make('table');
    grid.setAttribute('role', 'grid');
    grid.style.borderCollapse = 'collapse';
    grid.style.width = '100%';
    const head = make('thead');
    const headRow = make('tr');
    for (let index = 0; index < 7; index += 1) {
      const cell = make('th');
      cell.scope = 'col';
      cell.textContent = weekdayFormatter.format(new Date(Date.UTC(2024, 0, 1 + index)));
      cell.style.color = 'var(--mads-color-muted)';
      cell.style.fontSize = 'var(--mads-text-12)';
      cell.style.padding = 'var(--mads-space-1)';
      headRow.append(cell);
    }
    head.append(headRow);
    grid.append(head);
    const body = make('tbody');
    const first = new Date(year, month, 1);
    const offset = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let day = 1 - offset;
    while (day <= daysInMonth) {
      const tr = make('tr');
      for (let column = 0; column < 7; column += 1, day += 1) {
        const cell = make('td');
        cell.style.textAlign = 'center';
        cell.style.padding = 'var(--mads-space-1)';
        if (day >= 1 && day <= daysInMonth) {
          const date = isoDate(year, month, day);
          cell.textContent = String(day);
          cell.dataset.date = date;
          cell.setAttribute('aria-selected', String(selected === date));
          if (selected === date) {
            cell.style.backgroundColor = 'var(--mads-color-primary)';
            cell.style.color = 'var(--mads-color-on-primary)';
            cell.style.borderRadius = 'var(--mads-radius-full)';
          } else if (today === date) {
            cell.style.color = 'var(--mads-color-primary)';
            cell.style.fontWeight = 'var(--mads-weight-semibold)';
          }
        }
        tr.append(cell);
      }
      body.append(tr);
    }
    grid.append(body);
    root.append(grid);
  }, node);
};

const StatCard: ComponentBuilder = (node) => {
  const root = make('section');
  const label = make('span');
  const value = make('strong');
  const delta = make('span');
  const caption = make('p');
  root.append(label, value, delta, caption);
  return view(root, root, (current) => {
    resetStyle(root);
    baseFont(root);
    const props = propsOf(current);
    stack(root);
    root.style.gap = 'var(--mads-space-1)';
    surface(root);
    root.style.padding = 'var(--mads-space-4)';
    applyCommon(root, props);
    setLabel(root, accessibleName(props));
    label.textContent = firstText(props.label, props.title) ?? '';
    label.style.fontSize = 'var(--mads-text-14)';
    label.style.color = 'var(--mads-color-muted)';
    value.textContent = firstText(props.value, props.text) ?? '';
    value.style.fontFamily = 'var(--mads-font-display)';
    value.style.fontSize = 'var(--mads-text-28)';
    value.style.fontWeight = 'var(--mads-weight-bold)';
    const deltaText = firstText(props.delta);
    delta.textContent = deltaText ?? '';
    delta.hidden = deltaText === undefined;
    delta.style.fontSize = 'var(--mads-text-12)';
    delta.style.fontWeight = 'var(--mads-weight-medium)';
    const direction = token({ up: 'up', down: 'down', flat: 'flat' } as const, props.deltaDirection) ?? 'flat';
    delta.style.color = direction === 'up'
      ? 'var(--mads-color-success)'
      : direction === 'down'
        ? 'var(--mads-color-error)'
        : 'var(--mads-color-muted)';
    caption.textContent = firstText(props.caption, props.description) ?? '';
    caption.hidden = caption.textContent.length === 0;
    caption.style.margin = '0';
    mutedText(caption);
  }, node);
};

const Badge: ComponentBuilder = (node) => {
  const root = make('span');
  const dot = make('span');
  const text = make('span');
  root.append(dot, text);
  return view(root, root, (current) => {
    resetStyle(root);
    baseFont(root);
    const props = propsOf(current);
    root.style.display = 'inline-flex';
    root.style.alignItems = 'center';
    root.style.gap = 'var(--mads-space-1)';
    root.style.padding = 'var(--mads-space-1) var(--mads-space-2)';
    root.style.borderRadius = 'var(--mads-radius-full)';
    root.style.backgroundColor = 'var(--mads-color-surface)';
    root.style.fontSize = 'var(--mads-text-12)';
    root.style.fontWeight = 'var(--mads-weight-medium)';
    applyCommon(root, props);
    const label = firstText(props.text, props.label, props.title) ?? '';
    setLabel(root, accessibleName(props));
    dot.hidden = !flag(props.dot);
    dot.style.width = 'var(--mads-space-2)';
    dot.style.height = 'var(--mads-space-2)';
    dot.style.borderRadius = 'var(--mads-radius-full)';
    dot.style.backgroundColor = 'var(--mads-color-primary)';
    text.textContent = label;
  }, node);
};

const Avatar: ComponentBuilder = (node) => {
  const root = make('span');
  return view(root, root, (current) => {
    resetStyle(root);
    baseFont(root);
    const props = propsOf(current);
    root.setAttribute('role', 'img');
    root.style.display = 'inline-flex';
    root.style.alignItems = 'center';
    root.style.justifyContent = 'center';
    root.style.width = token(CONTROL_HEIGHT, props.size) ?? 'var(--mads-control-height-lg)';
    root.style.height = token(CONTROL_HEIGHT, props.size) ?? 'var(--mads-control-height-lg)';
    root.style.borderRadius = 'var(--mads-radius-full)';
    root.style.backgroundColor = 'var(--mads-color-neutral-surface)';
    root.style.color = 'var(--mads-color-fg)';
    root.style.fontWeight = 'var(--mads-weight-semibold)';
    root.style.fontSize = 'var(--mads-text-14)';
    applyCommon(root, props);
    const label = firstText(props.label, props.title, props.initials, props.text) ?? '';
    root.textContent = firstText(props.initials) ?? initialsOf(label);
    setLabel(root, accessibleName(props) ?? label);
  }, node);
};

function initialsOf(label: string): string {
  const words = label.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (words.length === 0) return '';
  return words.map((word) => word.charAt(0).toUpperCase()).join('');
}

const Tooltip: ComponentBuilder = (node) => {
  const root = make('span');
  const bubble = make('span');
  bubble.setAttribute('role', 'tooltip');
  root.append(bubble);
  return view(root, root, (current) => {
    resetStyle(root);
    baseFont(root);
    const props = propsOf(current);
    root.style.display = 'inline-flex';
    root.style.flexDirection = 'column';
    root.style.gap = 'var(--mads-space-1)';
    applyCommon(root, props);
    setLabel(root, accessibleName(props));
    bubble.id = controlId(current, 'tooltip');
    bubble.textContent = firstText(props.text, props.label, props.description) ?? '';
    bubble.style.fontSize = 'var(--mads-text-12)';
    bubble.style.color = 'var(--mads-color-muted)';
    bubble.style.backgroundColor = 'var(--mads-color-surface)';
    bubble.style.borderRadius = 'var(--mads-radius-clay-sm)';
    bubble.style.padding = 'var(--mads-space-1) var(--mads-space-2)';
    const placement = token({ top: 'top', bottom: 'bottom', left: 'left', right: 'right' } as const, props.placement);
    if (placement !== undefined) root.dataset.placement = placement;
    else delete root.dataset.placement;
  }, node);
};

const Progress: ComponentBuilder = (node) => {
  const root = make('div');
  const track = make('div');
  const fill = make('div');
  track.append(fill);
  root.append(track);
  return view(root, root, (current) => {
    resetStyle(root);
    baseFont(root);
    const props = propsOf(current);
    const indeterminate = flag(props.indeterminate);
    const raw = num(props.percent) ?? num(props.value) ?? 0;
    const percent = Math.max(0, Math.min(100, raw));
    root.setAttribute('role', 'progressbar');
    root.setAttribute('aria-valuemin', '0');
    root.setAttribute('aria-valuemax', '100');
    if (indeterminate) {
      root.removeAttribute('aria-valuenow');
      root.setAttribute('aria-valuetext', firstText(props.label) ?? '');
      root.setAttribute('aria-busy', 'true');
    } else {
      root.setAttribute('aria-valuenow', String(percent));
      root.setAttribute('aria-valuetext', firstText(props.format) ?? `${percent}%`);
      root.removeAttribute('aria-busy');
    }
    setLabel(root, accessibleName(props));
    stack(root);
    root.style.gap = 'var(--mads-space-1)';
    applyCommon(root, props);
    track.style.width = '100%';
    track.style.height = 'var(--mads-space-2)';
    track.style.borderRadius = 'var(--mads-radius-full)';
    track.style.backgroundColor = 'var(--mads-color-surface)';
    track.style.overflow = 'hidden';
    fill.style.height = '100%';
    fill.style.width = indeterminate ? '50%' : `${percent}%`;
    fill.style.borderRadius = 'var(--mads-radius-full)';
    fill.style.backgroundColor = 'var(--mads-color-primary)';
  }, node);
};

// ---------------------------------------------------------------------------
// Feedback.
// ---------------------------------------------------------------------------

const EmptyState: ComponentBuilder = (node) => {
  const root = make('div');
  return view(root, root, (current) => {
    resetStyle(root);
    baseFont(root);
    const props = propsOf(current);
    stack(root);
    root.style.alignItems = 'center';
    root.style.textAlign = 'center';
    root.style.gap = 'var(--mads-space-2)';
    root.style.padding = 'var(--mads-space-6)';
    applyCommon(root, props);
    setLabel(root, accessibleName(props));
    root.replaceChildren();
    const title = firstText(props.title, props.emptyTitle, props.label);
    if (title !== undefined) root.append(heading(props.headingLevel, title));
    const description = firstText(props.description, props.emptyDescription, props.text);
    if (description !== undefined) {
      const paragraph = make('p');
      paragraph.textContent = description;
      paragraph.style.margin = '0';
      mutedText(paragraph);
      root.append(paragraph);
    }
    const action = firstText(props.actionLabel);
    if (action !== undefined) {
      const button = make('button');
      button.type = 'button';
      button.textContent = action;
      button.style.marginTop = 'var(--mads-space-2)';
      button.style.padding = 'var(--mads-space-2) var(--mads-space-4)';
      button.style.borderRadius = 'var(--mads-radius-clay-md)';
      button.style.border = '1px solid var(--mads-color-primary)';
      button.style.backgroundColor = 'var(--mads-color-primary)';
      button.style.color = 'var(--mads-color-on-primary)';
      button.style.fontFamily = 'var(--mads-font-ui)';
      button.style.cursor = 'pointer';
      root.append(button);
    }
  }, node);
};

const Alert: ComponentBuilder = (node) => {
  const root = make('div');
  root.setAttribute('role', 'alert');
  return view(root, root, (current) => {
    resetStyle(root);
    baseFont(root);
    const props = propsOf(current);
    stack(root);
    root.style.gap = 'var(--mads-space-2)';
    root.style.padding = 'var(--mads-space-3)';
    root.style.borderRadius = 'var(--mads-radius-clay-md)';
    root.style.backgroundColor = 'var(--mads-color-warning-surface)';
    root.style.color = 'var(--mads-color-warning)';
    root.style.border = '1px solid var(--mads-color-warning)';
    applyCommon(root, props);
    setLabel(root, accessibleName(props));
    root.replaceChildren();
    const title = firstText(props.title, props.label);
    if (title !== undefined) {
      const strong = make('strong');
      strong.textContent = title;
      strong.style.fontSize = 'var(--mads-text-16)';
      root.append(strong);
    }
    const body = firstText(props.text, props.description);
    if (body !== undefined) {
      const paragraph = make('p');
      paragraph.textContent = body;
      paragraph.style.margin = '0';
      paragraph.style.fontSize = 'var(--mads-text-14)';
      root.append(paragraph);
    }
    const actions = Array.isArray(props.actions) ? props.actions.filter((action) => typeof action === 'string') : [];
    if (actions.length > 0) {
      const row = make('div');
      row.style.display = 'flex';
      row.style.gap = 'var(--mads-space-2)';
      for (const action of actions) {
        const button = make('button');
        button.type = 'button';
        button.textContent = action;
        button.style.fontFamily = 'var(--mads-font-ui)';
        button.style.fontSize = 'var(--mads-text-14)';
        button.style.padding = 'var(--mads-space-1) var(--mads-space-3)';
        button.style.borderRadius = 'var(--mads-radius-clay-sm)';
        button.style.border = '1px solid currentColor';
        button.style.backgroundColor = 'transparent';
        button.style.color = 'inherit';
        button.style.cursor = 'pointer';
        row.append(button);
      }
      root.append(row);
    }
  }, node);
};

const Toast: ComponentBuilder = (node) => {
  const root = make('div');
  root.setAttribute('role', 'status');
  root.setAttribute('aria-live', 'polite');
  return view(root, root, (current) => {
    resetStyle(root);
    baseFont(root);
    const props = propsOf(current);
    root.style.padding = 'var(--mads-space-2) var(--mads-space-3)';
    root.style.borderRadius = 'var(--mads-radius-clay-md)';
    root.style.backgroundColor = 'var(--mads-color-surface-raised)';
    root.style.boxShadow = 'var(--mads-clay-shadow-2)';
    root.style.fontSize = 'var(--mads-text-14)';
    applyCommon(root, props);
    setLabel(root, accessibleName(props));
    root.textContent = firstText(props.text, props.label) ?? '';
  }, node);
};

const Banner: ComponentBuilder = (node) => {
  const root = make('div');
  root.setAttribute('role', 'status');
  return view(root, root, (current) => {
    resetStyle(root);
    baseFont(root);
    const props = propsOf(current);
    root.style.display = 'flex';
    root.style.alignItems = 'center';
    root.style.gap = 'var(--mads-space-2)';
    root.style.padding = 'var(--mads-space-2) var(--mads-space-3)';
    root.style.backgroundColor = 'var(--mads-color-info-surface)';
    root.style.color = 'var(--mads-color-info)';
    root.style.borderRadius = 'var(--mads-radius-clay-md)';
    root.style.fontSize = 'var(--mads-text-14)';
    applyCommon(root, props);
    setLabel(root, accessibleName(props));
    root.replaceChildren();
    const message = make('span');
    message.textContent = firstText(props.text, props.label, props.title) ?? '';
    message.style.flex = '1';
    root.append(message);
    if (flag(props.dismissible)) {
      const close = make('button');
      close.type = 'button';
      close.setAttribute('aria-label', firstText(props.ariaLabel) ?? 'Dismiss');
      close.replaceChildren(glyphSvg('close', 16));
      close.style.background = 'transparent';
      close.style.border = '0';
      close.style.color = 'inherit';
      close.style.cursor = 'pointer';
      root.append(close);
    }
  }, node);
};

const FieldError: ComponentBuilder = (node) => {
  const root = make('div');
  root.setAttribute('role', 'alert');
  return view(root, root, (current) => {
    resetStyle(root);
    baseFont(root);
    const props = propsOf(current);
    root.style.fontSize = 'var(--mads-text-14)';
    root.style.color = 'var(--mads-color-error)';
    root.style.fontWeight = 'var(--mads-weight-medium)';
    applyCommon(root, props);
    setLabel(root, accessibleName(props));
    root.textContent = firstText(props.message, props.text, props.description) ?? '';
  }, node);
};

const ConfirmDialog: ComponentBuilder = (node) => {
  const root = make('div');
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  return view(root, root, (current) => {
    resetStyle(root);
    baseFont(root);
    const props = propsOf(current);
    root.hidden = props.open === false;
    stack(root);
    root.style.gap = 'var(--mads-space-3)';
    root.style.padding = 'var(--mads-space-4)';
    surface(root);
    root.style.width = 'min(24rem, 90vw)';
    applyCommon(root, props);
    setLabel(root, accessibleName(props));
    root.replaceChildren();
    const titleId = controlId(current, 'title');
    const title = firstText(props.title, props.label);
    if (title !== undefined) {
      const titleElement = heading(props.headingLevel, title);
      titleElement.id = titleId;
      root.setAttribute('aria-labelledby', titleId);
      root.append(titleElement);
    } else {
      root.removeAttribute('aria-labelledby');
    }
    const description = firstText(props.description, props.text);
    if (description !== undefined) {
      const paragraph = make('p');
      paragraph.textContent = description;
      paragraph.style.margin = '0';
      mutedText(paragraph);
      root.append(paragraph);
    }
    const row = make('div');
    row.style.display = 'flex';
    row.style.justifyContent = 'flex-end';
    row.style.gap = 'var(--mads-space-2)';
    const cancel = make('button');
    cancel.type = 'button';
    cancel.textContent = firstText(props.cancelLabel) ?? 'Cancel';
    cancel.style.padding = 'var(--mads-space-2) var(--mads-space-4)';
    cancel.style.borderRadius = 'var(--mads-radius-clay-md)';
    cancel.style.border = '1px solid var(--mads-color-border)';
    cancel.style.backgroundColor = 'var(--mads-color-surface)';
    cancel.style.color = 'var(--mads-color-fg)';
    cancel.style.fontFamily = 'var(--mads-font-ui)';
    const confirm = make('button');
    confirm.type = 'button';
    confirm.textContent = firstText(props.confirmLabel) ?? 'Confirm';
    confirm.style.padding = 'var(--mads-space-2) var(--mads-space-4)';
    confirm.style.borderRadius = 'var(--mads-radius-clay-md)';
    confirm.style.border = '1px solid var(--mads-color-primary)';
    confirm.style.backgroundColor = flag(props.danger) ? 'var(--mads-color-error)' : 'var(--mads-color-primary)';
    confirm.style.color = 'var(--mads-color-on-primary)';
    confirm.style.fontFamily = 'var(--mads-font-ui)';
    row.append(cancel, confirm);
    root.append(row);
  }, node);
};

const ErrorBoundary: ComponentBuilder = (node) => {
  const root = make('div');
  root.setAttribute('role', 'alert');
  return view(root, root, (current) => {
    resetStyle(root);
    baseFont(root);
    const props = propsOf(current);
    stack(root);
    root.style.gap = 'var(--mads-space-2)';
    root.style.padding = 'var(--mads-space-4)';
    root.style.backgroundColor = 'var(--mads-color-error-surface)';
    root.style.color = 'var(--mads-color-error)';
    root.style.borderRadius = 'var(--mads-radius-clay-md)';
    applyCommon(root, props);
    setLabel(root, accessibleName(props));
    root.replaceChildren();
    const title = firstText(props.title, props.label) ?? '';
    if (title.length > 0) root.append(heading(props.headingLevel, title));
    const message = firstText(props.description, props.text, props.errorCode);
    if (message !== undefined) {
      const paragraph = make('p');
      paragraph.textContent = message;
      paragraph.style.margin = '0';
      paragraph.style.fontSize = 'var(--mads-text-14)';
      root.append(paragraph);
    }
  }, node);
};

const OfflineBanner: ComponentBuilder = (node) => {
  const root = make('div');
  root.setAttribute('role', 'status');
  return view(root, root, (current) => {
    resetStyle(root);
    baseFont(root);
    const props = propsOf(current);
    root.style.display = 'flex';
    root.style.alignItems = 'center';
    root.style.gap = 'var(--mads-space-2)';
    root.style.padding = 'var(--mads-space-2) var(--mads-space-3)';
    root.style.backgroundColor = 'var(--mads-color-warning-surface)';
    root.style.color = 'var(--mads-color-warning)';
    root.style.fontSize = 'var(--mads-text-14)';
    applyCommon(root, props);
    setLabel(root, accessibleName(props));
    root.replaceChildren();
    const message = make('span');
    message.textContent = firstText(props.text, props.label, props.title) ?? '';
    message.style.flex = '1';
    root.append(message);
    const cached = firstText(props.cachedLabel);
    if (cached !== undefined) {
      const badge = make('span');
      badge.textContent = cached;
      badge.style.fontSize = 'var(--mads-text-12)';
      badge.style.fontWeight = 'var(--mads-weight-medium)';
      badge.style.padding = 'var(--mads-space-1) var(--mads-space-2)';
      badge.style.borderRadius = 'var(--mads-radius-full)';
      badge.style.border = '1px solid currentColor';
      root.append(badge);
    }
  }, node);
};

// ---------------------------------------------------------------------------
// Platform.
// ---------------------------------------------------------------------------

const AppIcon: ComponentBuilder = (node) => {
  const root = make('div');
  root.setAttribute('role', 'img');
  return view(root, root, (current) => {
    resetStyle(root);
    baseFont(root);
    const props = propsOf(current);
    root.style.display = 'inline-flex';
    root.style.alignItems = 'center';
    root.style.justifyContent = 'center';
    const size = token({ sm: 'var(--mads-space-6)', md: 'var(--mads-space-10)', lg: 'var(--mads-space-12)' } as const, props.size)
      ?? 'var(--mads-space-10)';
    root.style.width = size;
    root.style.height = size;
    root.style.borderRadius = 'var(--mads-radius-clay-md)';
    root.style.backgroundColor = 'var(--mads-color-primary)';
    root.style.color = 'var(--mads-color-on-primary)';
    root.style.fontWeight = 'var(--mads-weight-bold)';
    applyCommon(root, props);
    const label = firstText(props.label, props.title, props.text) ?? '';
    setLabel(root, accessibleName(props) ?? label);
    const glyph = glyphName(firstText(props.icon, props.name));
    const initials = firstText(props.initials) ?? initialsOf(label);
    if (initials.length > 0) root.textContent = initials;
    else root.replaceChildren(glyphSvg(glyph));
  }, node);
};

const ShareSheet: ComponentBuilder = (node) => {
  const root = make('div');
  const header = make('div');
  const meta = make('div');
  const content = make('div');
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.append(header, meta, content);
  return view(root, content, (current) => {
    resetStyle(root);
    baseFont(root);
    const props = propsOf(current);
    root.hidden = props.open === false;
    stack(root);
    root.style.gap = 'var(--mads-space-2)';
    root.style.padding = 'var(--mads-space-4)';
    surface(root);
    applyCommon(root, props);
    setLabel(root, accessibleName(props));
    header.replaceChildren();
    const title = firstText(props.title, props.label);
    if (title !== undefined) {
      const titleId = controlId(current, 'title');
      const titleElement = heading(props.headingLevel, title);
      titleElement.id = titleId;
      root.setAttribute('aria-labelledby', titleId);
      header.append(titleElement);
    } else {
      root.removeAttribute('aria-labelledby');
    }
    meta.replaceChildren();
    const entries: Array<[string, string | undefined]> = [
      ['fileName', firstText(props.fileName)],
      ['sizeLabel', firstText(props.sizeLabel)],
      ['checksum', firstText(props.checksum)],
    ];
    let hasMeta = false;
    for (const [key, value] of entries) {
      if (value === undefined) continue;
      hasMeta = true;
      const row = make('div');
      row.style.display = 'flex';
      row.style.justifyContent = 'space-between';
      row.style.gap = 'var(--mads-space-2)';
      row.style.fontSize = 'var(--mads-text-12)';
      const term = make('span');
      term.textContent = key;
      term.style.color = 'var(--mads-color-muted)';
      const detail = make('span');
      detail.textContent = value;
      detail.style.fontFamily = key === 'checksum' ? 'var(--mads-font-mono)' : 'var(--mads-font-ui)';
      detail.style.overflowWrap = 'anywhere';
      row.append(term, detail);
      meta.append(row);
    }
    meta.hidden = !hasMeta;
    content.style.display = 'flex';
    content.style.flexDirection = 'column';
    content.style.gap = 'var(--mads-space-2)';
  }, node);
};

const PermissionBadge: ComponentBuilder = (node) => {
  const root = make('span');
  return view(root, root, (current) => {
    resetStyle(root);
    baseFont(root);
    const props = propsOf(current);
    const granted = flag(props.granted);
    root.style.display = 'inline-flex';
    root.style.alignItems = 'center';
    root.style.gap = 'var(--mads-space-1)';
    root.style.padding = 'var(--mads-space-1) var(--mads-space-2)';
    root.style.borderRadius = 'var(--mads-radius-full)';
    root.style.fontSize = 'var(--mads-text-12)';
    root.style.fontWeight = 'var(--mads-weight-medium)';
    root.style.backgroundColor = granted ? 'var(--mads-color-success-surface)' : 'var(--mads-color-neutral-surface)';
    root.style.color = granted ? 'var(--mads-color-success)' : 'var(--mads-color-muted)';
    applyCommon(root, props);
    const label = firstText(props.permission, props.label, props.text, props.title) ?? '';
    setLabel(root, accessibleName(props) ?? label);
    root.replaceChildren();
    const dot = make('span');
    dot.style.width = 'var(--mads-space-2)';
    dot.style.height = 'var(--mads-space-2)';
    dot.style.borderRadius = 'var(--mads-radius-full)';
    dot.style.backgroundColor = 'currentColor';
    dot.setAttribute('aria-hidden', 'true');
    root.append(dot);
    const text = make('span');
    text.textContent = label;
    root.append(text);
  }, node);
};

const StorageMeter: ComponentBuilder = (node) => {
  const root = make('div');
  root.setAttribute('role', 'meter');
  return view(root, root, (current) => {
    resetStyle(root);
    baseFont(root);
    const props = propsOf(current);
    const used = Math.max(0, num(props.usedBytes) ?? num(props.value) ?? 0);
    const quota = Math.max(1, num(props.quotaBytes) ?? num(props.max) ?? 1);
    const warnRatio = num(props.warnRatio) ?? 0.8;
    const ratio = Math.min(1, used / quota);
    root.setAttribute('aria-valuemin', '0');
    root.setAttribute('aria-valuemax', String(quota));
    root.setAttribute('aria-valuenow', String(used));
    root.setAttribute('aria-valuetext', firstText(props.format) ?? `${formatBytes(used)} / ${formatBytes(quota)}`);
    stack(root);
    root.style.gap = 'var(--mads-space-1)';
    applyCommon(root, props);
    setLabel(root, accessibleName(props));
    root.replaceChildren();
    const caption = make('span');
    caption.textContent = firstText(props.label, props.title) ?? '';
    caption.style.fontSize = 'var(--mads-text-12)';
    caption.style.color = 'var(--mads-color-muted)';
    if (caption.textContent.length > 0) root.append(caption);
    const track = make('div');
    track.style.width = '100%';
    track.style.height = 'var(--mads-space-2)';
    track.style.borderRadius = 'var(--mads-radius-full)';
    track.style.backgroundColor = 'var(--mads-color-surface)';
    track.style.overflow = 'hidden';
    const fill = make('div');
    fill.style.height = '100%';
    fill.style.width = `${Math.round(ratio * 100)}%`;
    fill.style.borderRadius = 'var(--mads-radius-full)';
    fill.style.backgroundColor = ratio >= warnRatio ? 'var(--mads-color-warning)' : 'var(--mads-color-primary)';
    track.append(fill);
    root.append(track);
    const detail = make('span');
    detail.textContent = root.getAttribute('aria-valuetext') ?? '';
    detail.style.fontSize = 'var(--mads-text-12)';
    detail.style.color = 'var(--mads-color-muted)';
    root.append(detail);
  }, node);
};

const PromptInput: ComponentBuilder = (node) => {
  const parts = fieldParts();
  const input = make('textarea');
  const footer = make('div');
  const counter = make('span');
  const submit = make('button');
  submit.type = 'button';
  footer.append(counter, submit);
  mountField(parts, input);
  parts.root.insertBefore(footer, parts.error);
  return view(parts.root, parts.root, (current) => {
    resetStyle(parts.root);
    baseFont(parts.root);
    const props = propsOf(current);
    stack(parts.root);
    parts.root.style.gap = 'var(--mads-space-2)';
    applyCommon(parts.root, props);
    input.id = controlId(current, 'input');
    input.rows = 4;
    applyControlState(input, props);
    const maxLength = num(props.maxLength);
    if (maxLength !== undefined) input.maxLength = Math.max(1, Math.trunc(maxLength));
    else input.removeAttribute('maxlength');
    const value = str(props.value);
    if (value !== undefined && input.value !== value) input.value = value;
    styleControl(input);
    syncFieldLabel(parts, props, input);
    nameControl(input, parts.label, props);
    footer.style.display = 'flex';
    footer.style.alignItems = 'center';
    footer.style.justifyContent = 'space-between';
    footer.style.gap = 'var(--mads-space-2)';
    const limit = maxLength === undefined ? undefined : Math.max(1, Math.trunc(maxLength));
    counter.textContent = limit === undefined
      ? firstText(props.counterLabel) ?? ''
      : `${input.value.length} / ${limit}`;
    counter.style.fontSize = 'var(--mads-text-12)';
    counter.style.color = 'var(--mads-color-muted)';
    submit.textContent = firstText(props.submitLabel) ?? '';
    submit.hidden = submit.textContent.length === 0;
    submit.disabled = flag(props.disabled);
    submit.style.padding = 'var(--mads-space-2) var(--mads-space-4)';
    submit.style.borderRadius = 'var(--mads-radius-clay-md)';
    submit.style.border = '1px solid var(--mads-color-primary)';
    submit.style.backgroundColor = 'var(--mads-color-primary)';
    submit.style.color = 'var(--mads-color-on-primary)';
    submit.style.fontFamily = 'var(--mads-font-ui)';
    submit.style.cursor = 'pointer';
    syncErrorSlot({ control: input, slot: parts.error, node: current, message: firstText(props.error) });
  }, node);
};

const AI_STATUS_STATE: Readonly<Record<string, string>> = {
  idle: 'var(--mads-color-muted)',
  thinking: 'var(--mads-color-info)',
  streaming: 'var(--mads-color-primary)',
  done: 'var(--mads-color-success)',
  error: 'var(--mads-color-error)',
};

const AIStatus: ComponentBuilder = (node) => {
  const root = make('div');
  root.setAttribute('role', 'status');
  root.setAttribute('aria-live', 'polite');
  return view(root, root, (current) => {
    resetStyle(root);
    baseFont(root);
    const props = propsOf(current);
    root.style.display = 'inline-flex';
    root.style.alignItems = 'center';
    root.style.gap = 'var(--mads-space-2)';
    root.style.fontSize = 'var(--mads-text-14)';
    applyCommon(root, props);
    setLabel(root, accessibleName(props));
    const state = token(AI_STATUS_STATE, props.state) ?? AI_STATUS_STATE.idle;
    root.replaceChildren();
    const dot = make('span');
    dot.style.width = 'var(--mads-space-2)';
    dot.style.height = 'var(--mads-space-2)';
    dot.style.borderRadius = 'var(--mads-radius-full)';
    dot.style.backgroundColor = state;
    dot.setAttribute('aria-hidden', 'true');
    root.append(dot);
    const text = make('span');
    text.textContent = firstText(props.text, props.label) ?? '';
    root.append(text);
    const detail = firstText(props.detail);
    if (detail !== undefined) {
      const detailElement = make('span');
      detailElement.textContent = detail;
      mutedText(detailElement);
      root.append(detailElement);
    }
  }, node);
};

const SuggestionChip: ComponentBuilder = (node) => {
  const root = make('button');
  root.type = 'button';
  return view(root, root, (current) => {
    resetStyle(root);
    baseFont(root);
    const props = propsOf(current);
    const selected = flag(props.selected);
    root.style.display = 'inline-flex';
    root.style.alignItems = 'center';
    root.style.gap = 'var(--mads-space-1)';
    root.style.padding = 'var(--mads-space-1) var(--mads-space-3)';
    root.style.borderRadius = 'var(--mads-radius-full)';
    root.style.border = selected ? '1px solid var(--mads-color-primary)' : '1px solid var(--mads-color-border)';
    root.style.backgroundColor = selected ? 'var(--mads-color-primary)' : 'var(--mads-color-surface)';
    root.style.color = selected ? 'var(--mads-color-on-primary)' : 'var(--mads-color-fg)';
    root.style.fontFamily = 'var(--mads-font-ui)';
    root.style.fontSize = 'var(--mads-text-14)';
    root.style.cursor = 'pointer';
    applyCommon(root, props);
    const label = firstText(props.label, props.text, props.title) ?? '';
    setLabel(root, accessibleName(props) ?? label);
    root.setAttribute('aria-pressed', String(selected));
    root.textContent = label;
  }, node);
};

const AIError: ComponentBuilder = (node) => {
  const root = make('div');
  root.setAttribute('role', 'alert');
  return view(root, root, (current) => {
    resetStyle(root);
    baseFont(root);
    const props = propsOf(current);
    stack(root);
    root.style.gap = 'var(--mads-space-2)';
    root.style.padding = 'var(--mads-space-3)';
    root.style.backgroundColor = 'var(--mads-color-error-surface)';
    root.style.color = 'var(--mads-color-error)';
    root.style.borderRadius = 'var(--mads-radius-clay-md)';
    applyCommon(root, props);
    setLabel(root, accessibleName(props));
    root.replaceChildren();
    const title = firstText(props.title, props.label);
    if (title !== undefined) {
      const strong = make('strong');
      strong.textContent = title;
      strong.style.fontSize = 'var(--mads-text-16)';
      root.append(strong);
    }
    const message = firstText(props.text, props.description);
    if (message !== undefined) {
      const paragraph = make('p');
      paragraph.textContent = message;
      paragraph.style.margin = '0';
      paragraph.style.fontSize = 'var(--mads-text-14)';
      root.append(paragraph);
    }
    const actions: Array<string | undefined> = [firstText(props.retryLabel), firstText(props.fallbackLabel)];
    const present = actions.filter((action): action is string => action !== undefined);
    if (present.length > 0) {
      const row = make('div');
      row.style.display = 'flex';
      row.style.gap = 'var(--mads-space-2)';
      for (const action of present) {
        const button = make('button');
        button.type = 'button';
        button.textContent = action;
        button.style.padding = 'var(--mads-space-1) var(--mads-space-3)';
        button.style.borderRadius = 'var(--mads-radius-clay-sm)';
        button.style.border = '1px solid currentColor';
        button.style.backgroundColor = 'transparent';
        button.style.color = 'inherit';
        button.style.fontFamily = 'var(--mads-font-ui)';
        button.style.cursor = 'pointer';
        row.append(button);
      }
      root.append(row);
    }
  }, node);
};

// ---------------------------------------------------------------------------
// Dispatch: 48 core builders, everything else a labelled placeholder.
// ---------------------------------------------------------------------------

const BUILDERS: Readonly<Record<string, ComponentBuilder>> = {
  AppShell,
  Stack,
  Grid,
  Card,
  Sheet,
  Modal,
  ScrollArea,
  Sidebar,
  TabBar,
  Breadcrumb,
  CommandPalette,
  Stepper,
  Dock,
  Button,
  IconButton,
  TextField,
  TextArea,
  SearchField,
  Select,
  Combobox,
  Checkbox,
  RadioGroup,
  Switch,
  Slider,
  DataTable,
  VirtualList,
  Calendar,
  StatCard,
  Badge,
  Avatar,
  Tooltip,
  Progress,
  EmptyState,
  Alert,
  Toast,
  Banner,
  FieldError,
  ConfirmDialog,
  ErrorBoundary,
  OfflineBanner,
  AppIcon,
  ShareSheet,
  PermissionBadge,
  StorageMeter,
  PromptInput,
  AIStatus,
  SuggestionChip,
  AIError,
};

/** Names with a real DOM builder; the other catalog entries are placeholders. */
export const CORE_COMPONENTS: readonly string[] = Object.keys(BUILDERS);

function placeholderBuilder(type: string): ComponentBuilder {
  return (node) => {
    const root = make('div');
    const header = make('div');
    const content = make('div');
    root.setAttribute('data-muip-placeholder', type);
    root.setAttribute('role', 'note');
    root.append(header, content);
    return view(root, content, (current) => {
      resetStyle(root);
      baseFont(root);
      const props = propsOf(current);
      root.style.display = 'flex';
      root.style.flexDirection = 'column';
      root.style.gap = 'var(--mads-space-1)';
      root.style.padding = 'var(--mads-space-3)';
      root.style.border = '1px dashed var(--mads-color-border-strong)';
      root.style.borderRadius = 'var(--mads-radius-clay-md)';
      root.style.backgroundColor = 'var(--mads-color-surface)';
      root.style.color = 'var(--mads-color-muted)';
      root.style.fontSize = 'var(--mads-text-14)';
      applyCommon(root, props);
      const name = `${type} · ${current.id}`;
      setLabel(root, firstText(props.ariaLabel, props.label, props.title) ?? name);
      header.replaceChildren();
      const nameElement = make('strong');
      nameElement.textContent = type;
      nameElement.style.color = 'var(--mads-color-fg)';
      const idElement = make('span');
      idElement.textContent = current.id;
      idElement.style.fontFamily = 'var(--mads-font-mono)';
      idElement.style.fontSize = 'var(--mads-text-12)';
      const sentence = make('p');
      sentence.textContent = placeholderSentence();
      sentence.style.margin = '0';
      header.append(nameElement, idElement, sentence);
      content.style.display = 'flex';
      content.style.flexDirection = 'column';
      content.style.gap = 'var(--mads-space-2)';
    }, node);
  };
}

const PLACEHOLDERS = new Map<string, ComponentBuilder>();

function placeholderFor(type: string): ComponentBuilder {
  const cached = PLACEHOLDERS.get(type);
  if (cached !== undefined) return cached;
  const builder = placeholderBuilder(type);
  PLACEHOLDERS.set(type, builder);
  return builder;
}

/** Dispatch by `node.type`; unknown types still render a labelled placeholder. */
export function buildComponent(node: MuipNode): ComponentView {
  const builder = BUILDERS[node.type];
  if (builder !== undefined) return builder(node);
  return placeholderFor(node.type)(node);
}
