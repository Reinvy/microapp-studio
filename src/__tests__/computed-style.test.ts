/**
 * computed-style.test.ts — Claymorphism v3 Computed-Style Integrity (Cron 4)
 *
 * The existing design-system.test.ts asserts the *declared* CSS values. This
 * file goes one level deeper — it verifies the *computed* style chain:
 *
 *  - Every var(--token) referenced by clay rules resolves to a token that is
 *    actually DEFINED in :root (an unresolved var() → invalid at computed time)
 *  - Every clay shadow references BOTH the dark and light shadow tokens
 *    (mengembung = dark bottom-right + light top-left)
 *  - The clay palette tokens resolve to the exact v3 hex values
 *  - The font stack / foreground color tokens resolve to Fredoka / #4A3F35
 *  - Interactive scale transforms (hover 1.03, active 0.96) and inset shadows
 *    are present on the button/input rules
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';

const repoRoot = path.resolve(__dirname, '..', '..');
const cssPath = path.join(repoRoot, 'src', 'app', 'globals.css');

let css = '';

function parseRules(source: string): Map<string, string> {
  const rules = new Map<string, string>();
  const clean = source.replace(/\/\*[\s\S]*?\*\//g, '');
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(clean)) !== null) {
    const selector = m[1].trim().replace(/\s+/g, ' ');
    const body = m[2].trim().replace(/\s+/g, ' ');
    if (selector && body) rules.set(selector, body);
  }
  return rules;
}

function extractDefinedTokens(source: string): Set<string> {
  const tokens = new Set<string>();
  const re = /(--[\w-]+)\s*:/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) tokens.add(m[1]);
  return tokens;
}

function extractVarRefs(body: string): string[] {
  const refs: string[] = [];
  const re = /var\(\s*(--[\w-]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) refs.push(m[1]);
  return refs;
}

let rules: Map<string, string>;
let defined: Set<string>;

beforeAll(() => {
  css = readFileSync(cssPath, 'utf8');
  rules = parseRules(css);
  defined = extractDefinedTokens(css);
});

// ---------------------------------------------------------------------------
// 1. Computed-style chain: every var() reference resolves to a defined token
// ---------------------------------------------------------------------------

describe('Computed-style chain — var() references resolve', () => {
  // --font-fredoka / --font-mono are injected at build time by next/font
  // (declared in layout.tsx via `variable: '--font-fredoka'`), NOT in globals.css.
  // Everything else must resolve to a token defined in globals.css.
  const externalFontTokens = new Set(['--font-fredoka', '--font-mono']);

  it('every var(--token) used anywhere in globals.css is defined in :root', () => {
    const unresolved = new Set<string>();
    const re = /var\(\s*(--[\w-]+)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(css)) !== null) {
      if (!defined.has(m[1]) && !externalFontTokens.has(m[1])) unresolved.add(m[1]);
    }
    expect(Array.from(unresolved)).toEqual([]);
  });

  it('.clay raised shadow uses BOTH dark (bottom-right) and light (top-left) tokens', () => {
    const clay = rules.get('.clay') || '';
    const refs = extractVarRefs(clay);
    expect(refs).toContain('--clay-shadow-dark');
    expect(refs).toContain('--clay-shadow-light');
  });

  it('.clay-inset carved shadow uses inset + both shadow tokens', () => {
    const inset = rules.get('.clay-inset') || '';
    expect(inset).toMatch(/inset/);
    expect(extractVarRefs(inset)).toContain('--clay-shadow-dark');
    expect(extractVarRefs(inset)).toContain('--clay-shadow-light');
  });
});

// ---------------------------------------------------------------------------
// 2. Palette token resolution — exact v3 hex values
// ---------------------------------------------------------------------------

describe('Palette token resolution (v3 hex values)', () => {
  const expected: Array<[string, string]> = [
    ['--clay-cream', '#FFF5ED'],
    ['--clay-card', '#FFFFFFF5'],
    ['--clay-foreground', '#4A3F35'],
    ['--clay-muted', '#A89888'],
    ['--clay-pink', '#FFD5E5'],
    ['--clay-blue', '#C5E8F7'],
    ['--clay-purple', '#D5B8F5'],
    ['--clay-yellow', '#FFF2C5'],
    ['--clay-green', '#C5F0D5'],
    ['--clay-peach', '#FFE5D0'],
    ['--background', '#FFF5ED'],
    ['--foreground', '#4A3F35'],
    ['--muted-foreground', '#A89888'],
  ];

  for (const [token, value] of expected) {
    it(`${token} resolves to ${value}`, () => {
      expect(defined.has(token)).toBe(true);
      const re = new RegExp(`${token}\\s*:\\s*([^;]+);`);
      const m = css.match(re);
      expect(m).not.toBeNull();
      expect(m![1].trim()).toBe(value);
    });
  }

  it('text color is #4A3F35, NOT black', () => {
    // No foreground-ish token may resolve to pure black
    const blackFg = css.match(/(--[\w-]*-foreground|--foreground)\s*:\s*#0{3,6}\b/gi) || [];
    expect(blackFg).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 3. Font stack resolution — Fredoka first
// ---------------------------------------------------------------------------

describe('Font stack resolution (Fredoka)', () => {
  it('--font-sans starts with var(--font-fredoka)', () => {
    const m = css.match(/--font-sans\s*:\s*([^;]+);/);
    expect(m).not.toBeNull();
    expect(m![1].trim()).toMatch(/^var\(--font-fredoka\)/);
  });

  it('--font-fredoka is injected by next/font (declared in layout.tsx)', () => {
    const layoutPath = path.join(repoRoot, 'src', 'app', 'layout.tsx');
    const layout = readFileSync(layoutPath, 'utf8');
    expect(layout).toMatch(/Fredoka/);
    expect(layout).toMatch(/variable:\s*['"]--font-fredoka['"]/);
    expect(layout).toMatch(/from\s+['"]next\/font\/google['"]/);
  });

  it('body applies the font stack', () => {
    const body = rules.get('body') || '';
    expect(body).toMatch(/font-family:\s*var\(--font-sans\)/);
  });
});

// ---------------------------------------------------------------------------
// 4. Interactive states — hover scale transform + pressed inset shadow
// ---------------------------------------------------------------------------

describe('Interactive state computed styles (button/input)', () => {
  it('.clay-button:hover scales to 1.03', () => {
    const hover = rules.get('.clay-button:hover');
    expect(hover).toBeTruthy();
    expect(hover).toMatch(/transform:\s*scale\(1\.03\)/);
  });

  it('.clay-button:active scales to 0.96 with inset shadow', () => {
    const active = rules.get('.clay-button:active');
    expect(active).toBeTruthy();
    expect(active).toMatch(/transform:\s*scale\(0\.96\)/);
    expect(active).toMatch(/inset/);
  });

  it('.clay-input has inset (carved) shadow — pressed look', () => {
    const input = rules.get('.clay-input');
    expect(input).toBeTruthy();
    expect(input).toMatch(/inset/);
    expect(extractVarRefs(input!)).toContain('--clay-shadow-dark');
  });

  it('spring cubic-bezier transition on .clay-button', () => {
    const btn = rules.get('.clay-button') || '';
    expect(btn).toMatch(/cubic-bezier\(0\.34,\s*1\.56,\s*0\.64,\s*1\)/);
  });
});

// ---------------------------------------------------------------------------
// 5. Large border radii (28-36px elements, 20-24px buttons, 18-22px inputs)
// ---------------------------------------------------------------------------

describe('Large border radii (computed values)', () => {
  it('.clay uses 28px', () => {
    expect(rules.get('.clay') || '').toMatch(/border-radius:\s*28px/);
  });
  it('.clay-lg uses 32px', () => {
    expect(rules.get('.clay-lg') || '').toMatch(/border-radius:\s*32px/);
  });
  it('.clay-card uses 28px', () => {
    expect(rules.get('.clay-card') || '').toMatch(/border-radius:\s*28px/);
  });
  it('.clay-button uses 20px (20-24px range)', () => {
    expect(rules.get('.clay-button') || '').toMatch(/border-radius:\s*20px/);
  });
  it('.clay-input uses 18px (18-22px range)', () => {
    expect(rules.get('.clay-input') || '').toMatch(/border-radius:\s*18px/);
  });
  it('.clay-badge uses 999px pill', () => {
    expect(rules.get('.clay-badge') || '').toMatch(/border-radius:\s*999px/);
  });
});
