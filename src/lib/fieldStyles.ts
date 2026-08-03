/**
 * fieldStyles — shared field style → Tailwind class helpers for the runner.
 *
 * Single source of truth for translating a FieldSchema's `style` sub-object
 * (borderRadius / shadow / animation) into Tailwind utility classes.
 *
 * Previously duplicated between RenderField.tsx and AppRunner.tsx with subtly
 * divergent behavior (RenderField treated 'none' radius as rounded-lg, AppRunner
 * mapped it to rounded-none). The unified helpers below follow the Claymorphism
 * v3 design system: default radius is rounded-xl (20px), 'none' means no radius,
 * and shadows/animations map to the clay animation utilities.
 */
import type { FieldStyleConfig } from '@/types/schema';

/** Maps a field's borderRadius style to a Tailwind rounded class. */
export function getFieldBorderRadius(style?: Pick<FieldStyleConfig, 'borderRadius'>): string {
  if (!style?.borderRadius) return 'rounded-xl';
  const map: Record<string, string> = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
    full: 'rounded-full',
  };
  return map[style.borderRadius] || style.borderRadius;
}

/** Maps a field's shadow style to a Tailwind shadow class ('' when none). */
export function getFieldShadow(style?: Pick<FieldStyleConfig, 'shadow'>): string {
  if (!style?.shadow || style.shadow === 'none') return '';
  const map: Record<string, string> = {
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
  };
  return map[style.shadow] || style.shadow;
}

/** Maps a field's animation style to a clay animation utility class. */
export function getFieldAnimation(style?: Pick<FieldStyleConfig, 'animation'>): string {
  if (!style?.animation || style.animation === 'none') return '';
  const map: Record<string, string> = {
    fade: 'animate-fade-in',
    slide: 'animate-slide-up',
    bounce: 'animate-slide-up',
    pulse: 'animate-fade-in',
  };
  return map[style.animation] || '';
}
