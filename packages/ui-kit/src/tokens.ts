/**
 * Typed mirror of the MADS CSS custom properties.
 * Values are CSS references so components and consumers share one source.
 * Source of truth: docs/02-design/design-system.md.
 */

export const madsThemes = ['light', 'dark', 'amoled', 'high-contrast'] as const;
export type MadsTheme = (typeof madsThemes)[number];

export const tokens = {
  color: {
    bg: 'var(--mads-color-bg)',
    surface: 'var(--mads-color-surface)',
    surfaceRaised: 'var(--mads-color-surface-raised)',
    fg: 'var(--mads-color-fg)',
    muted: 'var(--mads-color-muted)',
    border: 'var(--mads-color-border)',
    borderStrong: 'var(--mads-color-border-strong)',
    primary: 'var(--mads-color-primary)',
    onPrimary: 'var(--mads-color-on-primary)',
    accent: 'var(--mads-color-accent)',
    success: 'var(--mads-color-success)',
    warning: 'var(--mads-color-warning)',
    error: 'var(--mads-color-error)',
    info: 'var(--mads-color-info)',
    focus: 'var(--mads-color-focus)',
    successSurface: 'var(--mads-color-success-surface)',
    warningSurface: 'var(--mads-color-warning-surface)',
    errorSurface: 'var(--mads-color-error-surface)',
    infoSurface: 'var(--mads-color-info-surface)',
    neutralSurface: 'var(--mads-color-neutral-surface)',
  },
  font: {
    family: {
      ui: 'var(--mads-font-family-ui)',
      mono: 'var(--mads-font-family-mono)',
    },
    size: {
      12: 'var(--mads-font-size-12)',
      14: 'var(--mads-font-size-14)',
      16: 'var(--mads-font-size-16)',
      20: 'var(--mads-font-size-20)',
      24: 'var(--mads-font-size-24)',
      28: 'var(--mads-font-size-28)',
      32: 'var(--mads-font-size-32)',
    },
    line: {
      12: 'var(--mads-line-12)',
      14: 'var(--mads-line-14)',
      16: 'var(--mads-line-16)',
      20: 'var(--mads-line-20)',
      24: 'var(--mads-line-24)',
      28: 'var(--mads-line-28)',
      32: 'var(--mads-line-32)',
    },
    weight: {
      400: 'var(--mads-weight-400)',
      500: 'var(--mads-weight-500)',
      600: 'var(--mads-weight-600)',
      700: 'var(--mads-weight-700)',
    },
  },
  space: {
    4: 'var(--mads-space-4)',
    8: 'var(--mads-space-8)',
    12: 'var(--mads-space-12)',
    16: 'var(--mads-space-16)',
    20: 'var(--mads-space-20)',
    24: 'var(--mads-space-24)',
    32: 'var(--mads-space-32)',
    40: 'var(--mads-space-40)',
    48: 'var(--mads-space-48)',
    64: 'var(--mads-space-64)',
  },
  radius: {
    4: 'var(--mads-radius-4)',
    8: 'var(--mads-radius-8)',
    12: 'var(--mads-radius-12)',
    16: 'var(--mads-radius-16)',
    24: 'var(--mads-radius-24)',
    full: 'var(--mads-radius-full)',
  },
  shadow: {
    0: 'var(--mads-shadow-0)',
    1: 'var(--mads-shadow-1)',
    2: 'var(--mads-shadow-2)',
    3: 'var(--mads-shadow-3)',
  },
  motion: {
    120: 'var(--mads-motion-120)',
    180: 'var(--mads-motion-180)',
    240: 'var(--mads-motion-240)',
    320: 'var(--mads-motion-320)',
  },
  ease: {
    standard: 'var(--mads-ease-standard)',
  },
  layout: {
    sidebarWidth: 'var(--mads-sidebar-width)',
    railWidth: 'var(--mads-rail-width)',
    contentMax: 'var(--mads-content-max)',
    controlHeight: 'var(--mads-control-height)',
    touchTarget: 'var(--mads-touch-target)',
    touchTargetMin: 'var(--mads-touch-target-min)',
    dialogSm: 'var(--mads-dialog-sm)',
    dialogMd: 'var(--mads-dialog-md)',
    dialogLg: 'var(--mads-dialog-lg)',
  },
  component: {
    buttonHeightSm: 'var(--mads-button-height-sm)',
    buttonHeightMd: 'var(--mads-button-height-md)',
    buttonHeightLg: 'var(--mads-button-height-lg)',
    fieldHeight: 'var(--mads-field-height)',
    rowHeightCompact: 'var(--mads-row-height-compact)',
    rowHeightComfortable: 'var(--mads-row-height-comfortable)',
  },
} as const;

/** Breakpoints (§7); kept numeric because CSS media queries cannot read vars. */
export const breakpoints = {
  compact: 0,
  medium: 600,
  expanded: 1024,
  large: 1440,
} as const;

export type SpaceToken = (typeof tokens.space)[keyof typeof tokens.space];
export type RadiusToken = (typeof tokens.radius)[keyof typeof tokens.radius];
export type ColorToken = (typeof tokens.color)[keyof typeof tokens.color];
