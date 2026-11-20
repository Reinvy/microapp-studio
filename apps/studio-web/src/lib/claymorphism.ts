/**
 * claymorphism — shared Claymorphism v3 design tokens.
 *
 * Single source of truth for the pastel palette and clay shadow utilities.
 * Previously duplicated as hardcoded arrays in StepCard.tsx / FeatureCard.tsx.
 *
 * Colors follow the Claymorphism v3 design system:
 *  - Pastel: pink #FFD5E5, blue #C5E8F7, purple #D5B8F5,
 *            yellow #FFF2C5, green #C5F0D5, peach #FFE5D0
 *  - Text:   #4A3F35 (warm dark brown, never pure black)
 */

/** The six pastel palette colors used across clay UI elements. */
export const pastelPalette = [
  '#FFD5E5', // pink
  '#C5E8F7', // blue
  '#D5B8F5', // purple
  '#FFF2C5', // yellow
  '#C5F0D5', // green
  '#FFE5D0', // peach
] as const;

/** Tailwind bg classes for the same pastel palette (used for accent bars / chips). */
export const pastelBgClasses = [
  'bg-[#FFD5E5]',
  'bg-[#C5E8F7]',
  'bg-[#D5B8F5]',
  'bg-[#FFF2C5]',
  'bg-[#C5F0D5]',
  'bg-[#FFE5D0]',
] as const;

/** Primary text color (warm dark brown) — always use instead of #000. */
export const clayTextColor = '#4A3F35';

/** Raised / mengembung shadow for cards & buttons. */
export const clayRaisedShadow =
  '8px 8px 16px rgba(174, 162, 146, 0.2), -8px -8px 16px rgba(255, 255, 255, 0.85)';

/** Pressed / cekung shadow for inputs & active buttons. */
export const clayPressedShadow =
  'inset 6px 6px 12px rgba(174, 162, 146, 0.2), inset -6px -6px 12px rgba(255, 255, 255, 0.7)';

/** Deterministic palette pick (stable across renders — hash-based). */
export function pickPastel(seed: number | string): string {
  const n = typeof seed === 'string' ? seed.length : seed;
  return pastelPalette[Math.abs(n) % pastelPalette.length];
}

/** Deterministic pastel Tailwind class pick (hash-based). */
export function pickPastelClass(seed: number | string): string {
  const n = typeof seed === 'string' ? seed.length : seed;
  return pastelBgClasses[Math.abs(n) % pastelBgClasses.length];
}
