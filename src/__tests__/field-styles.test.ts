/**
 * field-styles.test.ts — UI Integration: FieldStyle → Tailwind class mapping (Cron 4)
 *
 * Verifies the single source of truth that translates a FieldSchema `style`
 * sub-object (borderRadius / shadow / animation) into Tailwind utility classes,
 * per the Claymorphism v3 design system:
 *  - Default radius rounded-xl (20px); 'none' => rounded-none
 *  - Shadows sm/md/lg; 'none' => no shadow class
 *  - Animations fade/slide/bounce/pulse => clay animation utilities
 */

import { describe, it, expect } from 'vitest';
import {
  getFieldBorderRadius,
  getFieldShadow,
  getFieldAnimation,
} from '@/lib/fieldStyles';

// ===========================================================================
// 1. getFieldBorderRadius — borderRadius → Tailwind rounded class
// ===========================================================================

describe('getFieldBorderRadius (Claymorphism v3 radius mapping)', () => {
  it('returns rounded-xl (20px, design default) when no style is provided', () => {
    expect(getFieldBorderRadius()).toBe('rounded-xl');
    expect(getFieldBorderRadius(undefined)).toBe('rounded-xl');
    expect(getFieldBorderRadius({})).toBe('rounded-xl');
  });

  it('maps every named radius token to its Tailwind class', () => {
    const cases: Array<[string, string]> = [
      ['none', 'rounded-none'],
      ['sm', 'rounded-sm'],
      ['md', 'rounded-md'],
      ['lg', 'rounded-lg'],
      ['xl', 'rounded-xl'],
      ['2xl', 'rounded-2xl'],
      ['full', 'rounded-full'],
    ];
    for (const [token, expected] of cases) {
      expect(getFieldBorderRadius({ borderRadius: token as never })).toBe(expected);
    }
  });

  it('passes through unknown radius tokens untouched (no silent fallback)', () => {
    expect(getFieldBorderRadius({ borderRadius: 'rounded-[42px]' as never })).toBe('rounded-[42px]');
  });
});

// ===========================================================================
// 2. getFieldShadow — shadow → Tailwind shadow class
// ===========================================================================

describe('getFieldShadow (raised clay shadow mapping)', () => {
  it('returns empty string when no style or shadow is none', () => {
    expect(getFieldShadow()).toBe('');
    expect(getFieldShadow({})).toBe('');
    expect(getFieldShadow({ shadow: 'none' })).toBe('');
  });

  it('maps sm/md/lg shadow tokens to clay raised (mengembung) shadow classes', () => {
    expect(getFieldShadow({ shadow: 'sm' })).toBe(
      'shadow-[5px_5px_10px_var(--clay-shadow-dark),-5px_-5px_10px_var(--clay-shadow-light)]'
    );
    expect(getFieldShadow({ shadow: 'md' })).toBe(
      'shadow-[6px_6px_12px_var(--clay-shadow-dark),-6px_-6px_12px_var(--clay-shadow-light)]'
    );
    expect(getFieldShadow({ shadow: 'lg' })).toBe(
      'shadow-[8px_8px_16px_var(--clay-shadow-dark),-8px_-8px_16px_var(--clay-shadow-light)]'
    );
  });

  it('passes through unknown shadow tokens untouched', () => {
    expect(getFieldShadow({ shadow: 'shadow-[0_8px_24px_rgba(0,0,0,0.12)]' as never })).toBe(
      'shadow-[0_8px_24px_rgba(0,0,0,0.12)]'
    );
  });
});

// ===========================================================================
// 3. getFieldAnimation — animation → clay animation utility class
// ===========================================================================

describe('getFieldAnimation (clay spring animation mapping)', () => {
  it('returns empty string when no style or animation is none', () => {
    expect(getFieldAnimation()).toBe('');
    expect(getFieldAnimation({})).toBe('');
    expect(getFieldAnimation({ animation: 'none' })).toBe('');
  });

  it('maps fade/slide/bounce/pulse to clay animation utilities', () => {
    expect(getFieldAnimation({ animation: 'fade' })).toBe('animate-fade-in');
    expect(getFieldAnimation({ animation: 'slide' })).toBe('animate-slide-up');
    // bounce & pulse intentionally reuse the clay spring animations
    expect(getFieldAnimation({ animation: 'bounce' })).toBe('animate-slide-up');
    expect(getFieldAnimation({ animation: 'pulse' })).toBe('animate-fade-in');
  });

  it('returns empty string for unknown animation tokens (fail-safe, no bogus class)', () => {
    expect(getFieldAnimation({ animation: 'spin' as never })).toBe('');
  });
});
