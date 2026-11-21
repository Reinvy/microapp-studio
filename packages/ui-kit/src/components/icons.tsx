import type { ReactNode } from 'react';

/**
 * Inline glyphs. The kit ships no icon dependency, so status marks are small
 * hand-drawn SVGs that inherit `currentColor`. They are always decorative:
 * callers pair them with a text label (never colour alone).
 */
export type GlyphName =
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
  | 'check'
  | 'chevron-down'
  | 'chevron-left'
  | 'chevron-right'
  | 'more'
  | 'close'
  | 'upload'
  | 'sparkle'
  | 'clock';

const PATHS: Record<GlyphName, ReactNode> = {
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 7.6v.2" />
    </>
  ),
  success: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12.4 2.9 2.9L16.4 9" />
    </>
  ),
  warning: (
    <>
      <path d="M12 3.6 21.3 20H2.7Z" />
      <path d="M12 9.4v4.4" />
      <path d="M12 16.8v.2" />
    </>
  ),
  error: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m9 9 6 6" />
      <path d="m15 9-6 6" />
    </>
  ),
  check: <path d="m5 12.5 5 5 9-11" />,
  'chevron-down': <path d="m6 9 6 6 6-6" />,
  'chevron-left': <path d="m15 6-6 6 6 6" />,
  'chevron-right': <path d="m9 6 6 6-6 6" />,
  more: (
    <>
      <circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </>
  ),
  close: (
    <>
      <path d="m6 6 12 12" />
      <path d="m18 6-12 12" />
    </>
  ),
  upload: (
    <>
      <path d="M12 16V4.8" />
      <path d="m7.6 9.2 4.4-4.4 4.4 4.4" />
      <path d="M4.8 16v3.2h14.4V16" />
    </>
  ),
  sparkle: (
    <>
      <path d="M12 3.6 13.8 9l5.4 1.8-5.4 1.8L12 18l-1.8-5.4L4.8 10.8 10.2 9Z" />
      <path d="M18.6 16.2 19.4 18l1.8.8-1.8.8-.8 1.8-.8-1.8-1.8-.8 1.8-.8Z" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.4V12l3.2 2" />
    </>
  ),
};

export interface GlyphProps {
  name: GlyphName;
  size?: number;
  className?: string;
}

export function Glyph({ name, size = 16, className }: GlyphProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}
