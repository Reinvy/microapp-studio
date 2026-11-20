/**
 * claymorphism-lib.test.ts — Design Token Consistency (Cron 4)
 *
 * Verifies that the TypeScript design-token library (src/lib/claymorphism.ts)
 * stays in sync with the CSS variables & clay utility classes in globals.css:
 * - The 6 pastel palette colors match --clay-* CSS variables
 * - clayTextColor #4A3F35 matches --clay-foreground / --foreground
 * - clayRaisedShadow matches the .clay raised (mengembung) shadow system
 * - clayPressedShadow matches the .clay-inset pressed (cekung) shadow system
 * - pickPastel / pickPastelClass are deterministic, hash-based palette picks
 *
 * This catches drift where the TS constants and the CSS diverge — the app
 * would render with mismatched tokens while unit tests on components still pass.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';

import {
  pastelPalette,
  pastelBgClasses,
  clayTextColor,
  clayRaisedShadow,
  clayPressedShadow,
  pickPastel,
  pickPastelClass,
} from '@/lib/claymorphism';

const repoRoot = path.resolve(__dirname, '..', '..');
const cssPath = path.join(repoRoot, 'src', 'app', 'globals.css');

let css = '';

beforeAll(() => {
  css = readFileSync(cssPath, 'utf8');
});

// ---------------------------------------------------------------------------
// 1. Pastel palette — TS constants match CSS variables
// ---------------------------------------------------------------------------

describe('Claymorphism — Pastel Palette Consistency (TS ↔ CSS)', () => {
  it('exports exactly the 6 core pastel colors', () => {
    expect(pastelPalette).toHaveLength(6);
  });

  it('each pastel color exists as a --clay-* CSS variable', () => {
    const expectedVars = ['--clay-pink', '--clay-blue', '--clay-purple',
      '--clay-yellow', '--clay-green', '--clay-peach'];
    for (const [color, varName] of pastelPalette.map((c, i) => [c, expectedVars[i]])) {
      expect(css, `${varName} should be ${color}`).toMatch(
        new RegExp(`${varName}:\\s*${color}`, 'i')
      );
    }
  });

  it('each pastel has a matching Tailwind bg class with the same hex', () => {
    expect(pastelBgClasses).toHaveLength(pastelPalette.length);
    for (let i = 0; i < pastelPalette.length; i++) {
      expect(pastelBgClasses[i]).toContain(pastelPalette[i]);
    }
  });

  it('CSS defines the same core pastels (no missing palette entries)', () => {
    for (const color of pastelPalette) {
      expect(css.toLowerCase()).toContain(color.toLowerCase());
    }
  });
});

// ---------------------------------------------------------------------------
// 2. Text color — #4A3F35 warm dark brown, never black
// ---------------------------------------------------------------------------

describe('Claymorphism — Text Color Consistency (#4A3F35)', () => {
  it('clayTextColor is the warm dark brown #4A3F35', () => {
    expect(clayTextColor).toBe('#4A3F35');
    expect(clayTextColor.toLowerCase()).not.toBe('#000000');
    expect(clayTextColor.toLowerCase()).not.toBe('#000');
  });

  it('CSS --clay-foreground and --foreground both use #4A3F35', () => {
    expect(css).toMatch(/--clay-foreground:\s*#4A3F35/i);
    expect(css).toMatch(/--foreground:\s*#4A3F35/i);
  });

  it('clayTextColor matches the CSS foreground token (no drift)', () => {
    const m = css.match(/--clay-foreground:\s*(#[0-9A-Fa-f]{6})/i);
    expect(m).not.toBeNull();
    expect(m![1].toUpperCase()).toBe(clayTextColor);
  });
});

// ---------------------------------------------------------------------------
// 3. Raised shadow — TS constant matches .clay / .clay-card CSS
// ---------------------------------------------------------------------------

describe('Claymorphism — Raised Shadow Consistency (mengembung)', () => {
  it('clayRaisedShadow has dark bottom-right + light top-left', () => {
    expect(clayRaisedShadow).toMatch(/8px\s+8px\s+16px/);   // dark bottom-right
    expect(clayRaisedShadow).toMatch(/-8px\s+-8px\s+16px/); // light top-left
  });

  it('.clay box-shadow uses the same 8px raised pattern', () => {
    const m = css.match(/\.clay\s*\{[^}]*box-shadow:\s*([^;}]+)/i);
    expect(m).not.toBeNull();
    expect(m![1]).toMatch(/8px\s+8px\s+16px/);
    expect(m![1]).toMatch(/-8px\s+-8px\s+16px/);
  });

  it('shadow colors reference the shared --clay-shadow-* variables', () => {
    expect(css).toMatch(/--clay-shadow-dark:\s*rgba\(174,\s*162,\s*146/);
    expect(css).toMatch(/--clay-shadow-light:\s*rgba\(255,\s*255,\s*255/);
  });
});

// ---------------------------------------------------------------------------
// 4. Pressed shadow — TS constant matches .clay-inset / input CSS
// ---------------------------------------------------------------------------

describe('Claymorphism — Pressed Shadow Consistency (cekung)', () => {
  it('clayPressedShadow has inset (carved-in) shadows', () => {
    expect(clayPressedShadow).toMatch(/inset/);
    expect(clayPressedShadow).toMatch(/inset\s+6px\s+6px\s+12px/);   // dark carve
    expect(clayPressedShadow).toMatch(/inset\s+-6px\s+-6px\s+12px/); // light edge
  });

  it('.clay-inset uses inset shadows (carved-in surface)', () => {
    const m = css.match(/\.clay-inset\s*\{[^}]*box-shadow:\s*([^;}]+)/i);
    expect(m).not.toBeNull();
    expect(m![1]).toMatch(/inset/);
  });
});

// ---------------------------------------------------------------------------
// 5. Deterministic palette pickers
// ---------------------------------------------------------------------------

describe('Claymorphism — Deterministic Palette Pickers', () => {
  it('pickPastel always returns one of the 6 palette colors', () => {
    for (const seed of [0, 1, 5, 6, 7, 42, 999, 'hello', 'microapp', '']) {
      expect(pastelPalette).toContain(pickPastel(seed));
    }
  });

  it('pickPastel is deterministic (same seed → same color)', () => {
    for (const seed of [3, 17, 'dashboard', 'contact-form']) {
      expect(pickPastel(seed)).toBe(pickPastel(seed));
    }
  });

  it('pickPastelClass returns a valid Tailwind bg class for any seed', () => {
    for (const seed of [0, 2, 4, 11, 'xyz', 'builder', 'run']) {
      const cls = pickPastelClass(seed);
      expect(cls).toMatch(/^bg-\[#[0-9A-Fa-f]{6}\]$/);
      expect(pastelBgClasses).toContain(cls);
    }
  });

  it('pickPastelClass is deterministic', () => {
    expect(pickPastelClass('run')).toBe(pickPastelClass('run'));
    expect(pickPastelClass(8)).toBe(pickPastelClass(8));
  });

  it('pickPastel and pickPastelClass agree for the same seed (same palette index)', () => {
    const seed = 'hero-card';
    // Widen to string[] — pickPastel returns string, the palette is a const tuple
    const colorIndex = (pastelPalette as readonly string[]).indexOf(pickPastel(seed));
    const classIndex = (pastelBgClasses as readonly string[]).indexOf(pickPastelClass(seed));
    expect(colorIndex).toBe(classIndex);
  });
});
