/**
 * design-system.test.ts — Claymorphism v3 Design System Compliance
 *
 * Verifies the actual CSS rules (computed-style declarations) in globals.css:
 * - Button hover scale transform (1.03) & pressed state (0.96)
 * - Inset (carved-in) shadow on inputs
 * - Large border radii (28-36px elements, 20-24px buttons, 18-22px inputs, 999px badges)
 * - Fredoka rounded font loaded as the sans font
 * - Text color #4A3F35 (warm dark brown), NOT black (#000)
 * - Raised clay shadow system (dark bottom-right + light top-left)
 * - Spring cubic-bezier(0.34, 1.56, 0.64, 1) animations
 * - Clay classes actually used across components (not dead CSS)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import * as path from 'node:path';

// ---------------------------------------------------------------------------
// Helpers: read the compiled source CSS + parse rule blocks
// ---------------------------------------------------------------------------

const repoRoot = path.resolve(__dirname, '..', '..');
const cssPath = path.join(repoRoot, 'src', 'app', 'globals.css');

let css = '';

function parseRules(source: string): Map<string, string> {
  // Simple CSS block parser: selector { body } — skips nested braces (keyframes)
  const rules = new Map<string, string>();
  const clean = source.replace(/\/\*[\s\S]*?\*\//g, ''); // strip comments
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(clean)) !== null) {
    const selector = m[1].trim().replace(/\s+/g, ' ');
    const body = m[2].trim().replace(/\s+/g, ' ');
    if (selector && body) {
      rules.set(selector, body);
    }
  }
  return rules;
}

function decl(body: string, name: string): string | null {
  const re = new RegExp(`(?:^|;)\\s*${name}\\s*:\\s*([^;]+)`, 'i');
  const m = body.match(re);
  return m ? m[1].trim() : null;
}

let rules: Map<string, string>;

beforeAll(() => {
  css = readFileSync(cssPath, 'utf8');
  rules = parseRules(css);
});

// ---------------------------------------------------------------------------
// 1. Text color: #4A3F35 (warm dark brown), NOT black
// ---------------------------------------------------------------------------

describe('Claymorphism v3 — Text Color (#4A3F35, not black)', () => {
  it('defines --clay-foreground and --foreground as #4A3F35', () => {
    expect(css).toMatch(/--clay-foreground:\s*#4A3F35/i);
    expect(css).toMatch(/--foreground:\s*#4A3F35/i);
  });

  it('body uses var(--foreground) for color', () => {
    const body = rules.get('body') || '';
    expect(body).toContain('color:');
    expect(body).toMatch(/color:\s*var\(--foreground\)/);
  });

  it('does NOT use black (#000/#000000) for text colors', () => {
    const blackUses = css.match(/(?:color|--[\w-]+-foreground):\s*#0{3,6}\b/gi) || [];
    expect(blackUses).toEqual([]);
  });

  it('muted text uses #A89888', () => {
    expect(css).toMatch(/--clay-muted:\s*#A89888/i);
    expect(css).toMatch(/--muted-foreground:\s*#A89888/i);
  });
});

// ---------------------------------------------------------------------------
// 2. Fredoka font loaded (rounded sans-serif)
// ---------------------------------------------------------------------------

describe('Claymorphism v3 — Fredoka Rounded Font', () => {
  it('defines --font-sans with Fredoka first', () => {
    const m = css.match(/--font-sans:\s*'Fredoka'[^;]*/i);
    expect(m).not.toBeNull();
    expect(m![0]).toMatch(/Fredoka/i);
  });

  it('body font-family uses var(--font-sans)', () => {
    const body = rules.get('body') || '';
    expect(body).toMatch(/font-family:\s*var\(--font-sans\)/);
  });
});

// ---------------------------------------------------------------------------
// 3. Button hover scale transform (interactive states)
// ---------------------------------------------------------------------------

describe('Claymorphism v3 — Button Hover/Pressed Scale Transforms', () => {
  it('.clay-button:hover has transform scale(1.03)', () => {
    const hover = rules.get('.clay-button:hover');
    expect(hover).toBeTruthy();
    expect(decl(hover!, 'transform')).toBe('scale(1.03)');
  });

  it('.clay-button:active has transform scale(0.96) + inner shadow', () => {
    const active = rules.get('.clay-button:active');
    expect(active).toBeTruthy();
    expect(decl(active!, 'transform')).toBe('scale(0.96)');
    expect(decl(active!, 'box-shadow') || '').toMatch(/inset/);
  });

  it('.clay-button uses spring cubic-bezier transition', () => {
    const btn = rules.get('.clay-button');
    expect(btn).toBeTruthy();
    expect(decl(btn!, 'transition') || '').toMatch(/cubic-bezier\(0\.34,\s*1\.56,\s*0\.64,\s*1\)/);
  });
});

// ---------------------------------------------------------------------------
// 4. Input inset shadow (carved-in / cekung)
// ---------------------------------------------------------------------------

describe('Claymorphism v3 — Input Inset Shadow', () => {
  it('.clay-input has inset box-shadow (carved-in)', () => {
    const input = rules.get('.clay-input');
    expect(input).toBeTruthy();
    const shadow = decl(input!, 'box-shadow') || '';
    expect(shadow).toMatch(/inset/);
  });

  it('.clay-inset has inset box-shadow', () => {
    const inset = rules.get('.clay-inset');
    expect(inset).toBeTruthy();
    expect(decl(inset!, 'box-shadow') || '').toMatch(/inset/);
  });
});

// ---------------------------------------------------------------------------
// 5. Large border radii (computed style values)
// ---------------------------------------------------------------------------

describe('Claymorphism v3 — Large Border Radii', () => {
  it('.clay (large element) uses 28px radius', () => {
    const clay = rules.get('.clay');
    expect(clay).toBeTruthy();
    expect(decl(clay!, 'border-radius')).toBe('28px');
  });

  it('.clay-lg uses 32px radius (28-36px range)', () => {
    const clayLg = rules.get('.clay-lg');
    expect(clayLg).toBeTruthy();
    expect(decl(clayLg!, 'border-radius')).toBe('32px');
  });

  it('.clay-button uses 20px radius (20-24px range)', () => {
    const btn = rules.get('.clay-button');
    expect(decl(btn!, 'border-radius')).toBe('20px');
  });

  it('.clay-input uses 18px radius (18-22px range)', () => {
    const input = rules.get('.clay-input');
    expect(decl(input!, 'border-radius')).toBe('18px');
  });

  it('.clay-badge uses 999px radius (pill)', () => {
    const badge = rules.get('.clay-badge');
    expect(badge).toBeTruthy();
    expect(decl(badge!, 'border-radius')).toBe('999px');
  });
});

// ---------------------------------------------------------------------------
// 6. Raised shadow system (mengembung)
// ---------------------------------------------------------------------------

describe('Claymorphism v3 — Raised Shadow System', () => {
  it('.clay uses dark bottom-right + light top-left shadows', () => {
    const clay = rules.get('.clay');
    const shadow = decl(clay!, 'box-shadow') || '';
    expect(shadow).toMatch(/8px\s+8px\s+16px/);   // dark bottom-right
    expect(shadow).toMatch(/-8px\s+-8px\s+16px/); // light top-left
  });

  it('.clay-card exists with raised shadow + white card bg', () => {
    const card = rules.get('.clay-card');
    expect(card).toBeTruthy();
    expect(decl(card!, 'box-shadow') || '').toMatch(/8px\s+8px\s+16px/);
    expect(decl(card!, 'background') || '').toMatch(/var\(--clay-card\)/);
  });
});

// ---------------------------------------------------------------------------
// 7. Clay classes used across components (no dead CSS / real UI usage)
// ---------------------------------------------------------------------------

describe('Claymorphism v3 — Clay Classes Used in Components', () => {
  let componentSources = '';

  beforeAll(() => {
    const srcDir = path.join(repoRoot, 'src');
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.(tsx|ts|css)$/.test(entry.name)) files.push(full);
      }
    };
    walk(srcDir);
    componentSources = files
      .filter((f) => !f.includes('__tests__'))
      .map((f) => readFileSync(f, 'utf8'))
      .join('\n');
  });

  it('components use clay-button / clay-input / clay-card classes', () => {
    expect(componentSources).toMatch(/clay-button/);
    expect(componentSources).toMatch(/clay-input/);
    expect(componentSources).toMatch(/clay-card/);
  });

  it('components do not use plain black text classes (#000)', () => {
    const blackText = componentSources.match(/text-(?:\[#0{3,6}\]|black)\b/gi) || [];
    expect(blackText).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 8. No Glassmorphism mixing (transparency/blur on surfaces)
// ---------------------------------------------------------------------------

describe('Claymorphism v3 — No Glassmorphism Mixing', () => {
  it('globals.css does not use backdrop-filter blur for surfaces', () => {
    expect(css).not.toMatch(/backdrop-filter:\s*blur/);
  });
});
