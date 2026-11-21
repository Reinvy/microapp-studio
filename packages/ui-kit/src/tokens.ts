/**
 * Typed mirror of the MADS clay CSS custom properties.
 * Values are CSS references so components and consumers share one source.
 * Source of truth: DESIGN.md §2 (DESIGN-CLAY).
 */

export const madsThemes = ['light', 'dark', 'high-contrast'] as const;
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
    borderSubtle: 'var(--mads-color-border-subtle)',
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
  clay: {
    mint: 'var(--mads-clay-mint)',
    lilac: 'var(--mads-clay-lilac)',
    peach: 'var(--mads-clay-peach)',
    butter: 'var(--mads-clay-butter)',
    sky: 'var(--mads-clay-sky)',
  },
  font: {
    ui: 'var(--mads-font-ui)',
    display: 'var(--mads-font-display)',
    mono: 'var(--mads-font-mono)',
  },
  text: {
    12: 'var(--mads-text-12)',
    14: 'var(--mads-text-14)',
    16: 'var(--mads-text-16)',
    18: 'var(--mads-text-18)',
    22: 'var(--mads-text-22)',
    28: 'var(--mads-text-28)',
    36: 'var(--mads-text-36)',
    48: 'var(--mads-text-48)',
  },
  leading: {
    16: 'var(--mads-leading-16)',
    20: 'var(--mads-leading-20)',
    24: 'var(--mads-leading-24)',
    28: 'var(--mads-leading-28)',
    32: 'var(--mads-leading-32)',
    36: 'var(--mads-leading-36)',
    44: 'var(--mads-leading-44)',
    56: 'var(--mads-leading-56)',
  },
  weight: {
    regular: 'var(--mads-weight-regular)',
    medium: 'var(--mads-weight-medium)',
    semibold: 'var(--mads-weight-semibold)',
    bold: 'var(--mads-weight-bold)',
    extrabold: 'var(--mads-weight-extrabold)',
  },
  space: {
    1: 'var(--mads-space-1)',
    2: 'var(--mads-space-2)',
    3: 'var(--mads-space-3)',
    4: 'var(--mads-space-4)',
    5: 'var(--mads-space-5)',
    6: 'var(--mads-space-6)',
    8: 'var(--mads-space-8)',
    10: 'var(--mads-space-10)',
    12: 'var(--mads-space-12)',
    16: 'var(--mads-space-16)',
  },
  radius: {
    sm: 'var(--mads-radius-clay-sm)',
    md: 'var(--mads-radius-clay-md)',
    lg: 'var(--mads-radius-clay-lg)',
    xl: 'var(--mads-radius-clay-xl)',
    full: 'var(--mads-radius-full)',
  },
  shadow: {
    1: 'var(--mads-clay-shadow-1)',
    2: 'var(--mads-clay-shadow-2)',
    3: 'var(--mads-clay-shadow-3)',
    pressed: 'var(--mads-clay-shadow-pressed)',
  },
  motion: {
    micro: 'var(--mads-duration-micro)',
    control: 'var(--mads-duration-control)',
    panel: 'var(--mads-duration-panel)',
    page: 'var(--mads-duration-page)',
    press: 'var(--mads-duration-press)',
  },
  ease: {
    clay: 'var(--mads-ease-clay)',
    standard: 'var(--mads-ease-standard)',
  },
  layout: {
    sidebarWidth: 'var(--mads-sidebar-width)',
    railWidth: 'var(--mads-rail-width)',
    dockHeight: 'var(--mads-dock-height)',
    contentMax: 'var(--mads-content-max)',
    touchTarget: 'var(--mads-touch-target)',
    touchTargetMin: 'var(--mads-touch-target-min)',
    focusRingWidth: 'var(--mads-focus-ring-width)',
    focusRingOffset: 'var(--mads-focus-ring-offset)',
  },
  control: {
    heightSm: 'var(--mads-control-height-sm)',
    heightMd: 'var(--mads-control-height-md)',
    heightLg: 'var(--mads-control-height-lg)',
  },
} as const;

/** Breakpoints (§6); kept numeric because CSS media queries cannot read vars. */
export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const;

export type SpaceToken = (typeof tokens.space)[keyof typeof tokens.space];
export type RadiusToken = (typeof tokens.radius)[keyof typeof tokens.radius];
export type ColorToken = (typeof tokens.color)[keyof typeof tokens.color];
export type TextToken = (typeof tokens.text)[keyof typeof tokens.text];
