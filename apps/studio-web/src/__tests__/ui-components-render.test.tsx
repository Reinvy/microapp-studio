/**
 * ui-components-render.test.tsx — Rendered-Component Claymorphism v3 Checks (Cron 4)
 *
 * jsdom render tests of the ACTUAL UI primitives (Button, Input), verifying the
 * clay design system reaches the DOM:
 * - Button renders with the `clay-button` class and warm-brown text token
 * - Button hover/pressed scale transforms exist in the computed CSS source
 * - Input renders carved-in (inset shadow) with large border radius
 * - Pastel palette variants are applied through real classNames
 * - Design tokens resolve to #4A3F35 (warm brown), never black
 *
 * Uses `@vitest-environment jsdom` so the components mount in a DOM. Pure UI
 * primitives only — no Dexie/IndexedDB imports, so no mocks needed.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const repoRoot = path.resolve(__dirname, '..', '..');
const css = readFileSync(path.join(repoRoot, 'src', 'app', 'globals.css'), 'utf8');

// ===========================================================================
// 1. Button — rendered DOM carries clay-button class + warm-brown text
// ===========================================================================

describe('Button (rendered) — Claymorphism v3', () => {
  it('renders a <button> with the clay-button class', () => {
    render(<Button>Click me</Button>);
    const btn = screen.getByRole('button', { name: /click me/i });
    expect(btn).toBeInTheDocument();
    expect(btn.className).toContain('clay-button');
  });

  it('default variant uses pastel pink bg + warm-brown text token (never black)', () => {
    render(<Button>Save</Button>);
    const btn = screen.getByRole('button', { name: /save/i });
    expect(btn.className).toContain('bg-[#FFD5E5]');        // pastel pink
    expect(btn.className).toContain('text-clay-foreground'); // #4A3F35 token
    expect(btn.className).not.toMatch(/text-black|text-\[#0{3,6}\]/i);
  });

  it('primary variant uses pastel purple', () => {
    render(<Button variant="primary">Submit</Button>);
    const btn = screen.getByRole('button', { name: /submit/i });
    expect(btn.className).toContain('bg-[#D5B8F5]');
  });

  it('disabled buttons carry disabled:opacity-50', () => {
    render(<Button disabled>Disabled</Button>);
    const btn = screen.getByRole('button', { name: /disabled/i });
    expect(btn).toBeDisabled();
    expect(btn.className).toContain('disabled:opacity-50');
  });

  it('computed CSS source defines hover scale(1.03) + pressed scale(0.96) with inset shadow', () => {
    expect(css).toMatch(/\.clay-button:hover\s*\{[^}]*transform:\s*scale\(1\.03\)/);
    expect(css).toMatch(/\.clay-button:active\s*\{[^}]*transform:\s*scale\(0\.96\)/);
    expect(css).toMatch(/\.clay-button:active\s*\{[^}]*inset/);
  });

  it('computed CSS source gives buttons a large 20px+ border radius', () => {
    expect(css).toMatch(/\.clay-button\s*\{[^}]*border-radius:\s*20px/);
  });
});

// ===========================================================================
// 2. Input — rendered DOM carries carved-in inset shadow + large radius
// ===========================================================================

describe('Input (rendered) — Claymorphism v3', () => {
  it('renders an <input> with the large 18px border radius class', () => {
    render(<Input placeholder="Type here" />);
    const input = screen.getByPlaceholderText(/type here/i);
    expect(input).toBeInTheDocument();
    expect(input.className).toContain('rounded-[18px]');
  });

  it('renders with carved-in (inset) shadow — pressed/cekung surface', () => {
    render(<Input placeholder="Search" />);
    const input = screen.getByPlaceholderText(/search/i);
    expect(input.className).toContain('shadow-[inset_3px_3px_7px_var(--clay-shadow-dark)');
    expect(input.className).toContain('inset_-3px_-3px_7px_var(--clay-shadow-light)');
  });

  it('renders with the warm carved surface bg, not white', () => {
    render(<Input placeholder="Email" />);
    const input = screen.getByPlaceholderText(/email/i);
    expect(input.className).toContain('bg-[#F5EDE5]');
  });

  it('computed CSS source defines .clay-input inset shadow + 18px radius', () => {
    expect(css).toMatch(/\.clay-input\s*\{[^}]*inset/);
    expect(css).toMatch(/\.clay-input\s*\{[^}]*border-radius:\s*18px/);
  });
});

// ===========================================================================
// 3. Design tokens — #4A3F35 warm brown, never black; Fredoka loaded
// ===========================================================================

describe('Design tokens (rendered context)', () => {
  it('globals.css maps --clay-foreground and --foreground to #4A3F35', () => {
    expect(css).toMatch(/--clay-foreground:\s*#4A3F35/i);
    expect(css).toMatch(/--foreground:\s*#4A3F35/i);
  });

  it('no text color or foreground token is black (#000/#000000)', () => {
    const blackUses = css.match(/(?:color|--[\w-]+-foreground):\s*#0{3,6}\b/gi) || [];
    expect(blackUses).toEqual([]);
  });

  it('Fredoka is wired as --font-sans (rounded font loaded)', () => {
    expect(css).toMatch(/--font-sans:\s*var\(--font-fredoka\)/);
    const layout = readFileSync(path.join(repoRoot, 'src', 'app', 'layout.tsx'), 'utf8');
    expect(layout).toMatch(/variable:\s*['"]--font-fredoka['"]/);
  });

  it('rendered Button text color token resolves to the warm brown, not a raw black class', () => {
    render(<Button>Token Check</Button>);
    const btn = screen.getByRole('button', { name: /token check/i });
    // The component must use the design token; a raw black class would fail.
    expect(btn.className).toContain('text-clay-foreground');
    expect(btn.className).not.toMatch(/text-black/);
  });
});
