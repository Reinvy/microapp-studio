/**
 * ui-integration.test.ts — UI & Navigation Integration (Cron 4, E2E/UI)
 *
 * Extends the computed-style / design-system coverage to the ACTUAL UI
 * components, not just globals.css. Verifies the Claymorphism v3 UI
 * components (Button, Input, Dialog, MobileTabBar) and the navigation
 * surfaces (Navbar, Footer) apply the clay design tokens consistently:
 *
 *  - Button: every variant carries the `clay-button` class (raised shadow +
 *    hover scale / pressed inset via CSS) and a warm text colour; disabled
 *    state degrades to opacity-50.
 *  - Input: carved-in clay-inset shadow + 18px radius, disabled opacity-50.
 *  - Dialog/DialogContent: rounded-3xl (32px, in the 28-36px element range)
 *    + raised clay-card shadow; overlay de-emphasises with a warm clay tint.
 *  - MobileTabBar: inset "pressed" shadow on the active tab (clay tabs spec).
 *  - Navbar/Footer: clay surfaces + DB-driven nav content (no hardcoded data).
 *  - clay-feedback (ClayLoader / ClayErrorCard): clay surfaces for async UI.
 *
 * Pure file-source assertions — the repo/content modules are never imported
 * so Dexie/IndexedDB never loads in node. No RTL/jsdom needed.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';

const repoRoot = path.resolve(__dirname, '..', '..');

function read(rel: string): string {
  return readFileSync(path.join(repoRoot, rel), 'utf8');
}

const button = read('src/components/ui/button.tsx');
const input = read('src/components/ui/input.tsx');
const dialog = read('src/components/ui/dialog.tsx');
const tabBar = read('src/components/builder/MobileTabBar.tsx');
const navbar = read('src/components/landing/Navbar.tsx');
const footer = read('src/components/landing/Footer.tsx');
const feedback = read('src/components/ui/clay-feedback.tsx');
const newAppDialog = read('src/components/dashboard/NewAppDialog.tsx');

// ---------------------------------------------------------------------------
// 1. Button — clay styling across all variants + disabled state
// ---------------------------------------------------------------------------

describe('UI Integration — Button (clay variants + disabled)', () => {
  it('every button variant includes the clay-button class', () => {
    // Base cva string carries the clay-button class shared by all variants.
    expect(button).toMatch(/clay-button/);
  });

  it('all button variants use the warm clay foreground, never black', () => {
    // Count the #4A3F35 usages across the cva variants.
    const uses = button.match(/text-clay-foreground/g) || [];
    expect(uses.length).toBeGreaterThanOrEqual(4); // default, destructive, secondary, primary, ghost, link
    expect(button).not.toMatch(/text-black\b/);
    expect(button).not.toMatch(/text-\[#0{3,6}\]/i);
  });

  it('button disabled state degrades to opacity-50', () => {
    expect(button).toMatch(/disabled:opacity-50/);
  });
});

// ---------------------------------------------------------------------------
// 2. Input — carved-in inset shadow, 18px radius, disabled state
// ---------------------------------------------------------------------------

describe('UI Integration — Input (carved-in / cekung)', () => {
  it('renders the clay inset (pressed) shadow for a carved-in look', () => {
    expect(input).toMatch(/inset_3px_3px_7px_var\(--clay-shadow-dark\)/);
    expect(input).toMatch(/inset_-3px_-3px_7px_var\(--clay-shadow-light\)/);
  });

  it('uses the 18px clay radius (18-22px input range)', () => {
    expect(input).toMatch(/rounded-\[18px\]/);
  });

  it('input disabled state degrades to opacity-50', () => {
    expect(input).toMatch(/disabled:opacity-50/);
  });

  it('placeholder and text use warm clay colours, not black', () => {
    expect(input).toMatch(/placeholder:text-clay-muted/);
    expect(input).toMatch(/file:text-clay-foreground/);
  });
});

// ---------------------------------------------------------------------------
// 3. Dialog — rounded-3xl (32px) + raised clay-card shadow
// ---------------------------------------------------------------------------

describe('UI Integration — Dialog (rounded-3xl clay surface)', () => {
  it('DialogContent uses rounded-3xl (32px, within the 28-36px element range)', () => {
    expect(dialog).toMatch(/rounded-3xl/);
  });

  it('DialogContent uses the raised clay-card shadow (dark + light)', () => {
    expect(dialog).toMatch(/shadow-\[8px_8px_16px_var\(--clay-shadow-dark\)/);
    expect(dialog).toMatch(/-6px_-6px_14px_var\(--clay-shadow-light\)/);
  });

  it('DialogContent surface is the clay card (pastel, not glassmorphism)', () => {
    expect(dialog).toMatch(/bg-\[var\(--clay-card\)\]/);
    // No backdrop-blur / transparency mixing on the surface.
    expect(dialog).not.toMatch(/backdrop-blur/);
  });

  it('overlay uses a warm clay tint (no solid black backdrop)', () => {
    expect(dialog).toMatch(/bg-\[rgba\(174,162,146,/); // clay shadow colour
  });

  it('description uses the clay muted colour #A89888', () => {
    expect(dialog).toMatch(/text-clay-muted/);
  });
});

// ---------------------------------------------------------------------------
// 4. MobileTabBar — clay tabs spec (inset active tab)
// ---------------------------------------------------------------------------

describe('UI Integration — MobileTabBar (clay tabs)', () => {
  it('active tab uses the inset (pressed/cekung) shadow', () => {
    expect(tabBar).toMatch(/inset_4px_4px_8px_var\(--clay-shadow-dark\)/);
    expect(tabBar).toMatch(/inset_-4px_-4px_8px_var\(--clay-shadow-light\)/);
  });

  it('active tab is distinguished from inactive (muted) tabs', () => {
    expect(tabBar).toMatch(/active === tab\.key/);
    expect(tabBar).toMatch(/text-clay-muted/); // inactive tab colour
  });

  it('inactive tab has an active:scale-95 press feedback', () => {
    expect(tabBar).toMatch(/active:scale-95/);
  });
});

// ---------------------------------------------------------------------------
// 5. Navbar / Footer — clay surfaces + DB-driven nav (no hardcoded data)
// ---------------------------------------------------------------------------

describe('UI Integration — Navigation surfaces (Navbar / Footer)', () => {
  it('Navbar sits on a clay card surface with clay border token', () => {
    expect(navbar).toMatch(/bg-\[var\(--clay-card\)\]/);
    expect(navbar).toMatch(/border-clay-border\/30/);
  });

  it('Navbar nav links use the inset hover press effect', () => {
    const inlineHover = (navbar.match(/inset_3px_3px_7px_var\(--clay-shadow-dark\)/g) || []).length;
    expect(inlineHover).toBeGreaterThanOrEqual(2); // desktop + mobile link lists
  });

  it('Navbar reads links from the DB content service (no hardcoded data rule)', () => {
    expect(navbar).toMatch(/contentService\.getContent<NavLink\[\]>\('nav-links'\)/);
  });

  it('Footer sits on a clay card surface and reads footer columns from DB', () => {
    expect(footer).toMatch(/bg-\[var\(--clay-card\)\]/);
    expect(footer).toMatch(/contentService\.getContent<FooterColumn\[\]>\(/);
  });
});

// ---------------------------------------------------------------------------
// 6. Async UI feedback (clay-feedback) — clay surfaces
// ---------------------------------------------------------------------------

describe('UI Integration — ClayLoader / ClayErrorCard (async UI feedback)', () => {
  it('ClayLoader uses a clay-sm raised surface on the warm cream canvas', () => {
    expect(feedback).toMatch(/bg-clay-cream/);
    expect(feedback).toMatch(/clay-sm/);
    expect(feedback).toMatch(/text-clay-muted/);
  });

  it('ClayErrorCard uses the large 28px clay surface + clay inset icon well', () => {
    expect(feedback).toMatch(/className="text-center max-w-sm clay p-8"/);
    expect(feedback).toMatch(/inset_4px_4px_8px_var\(--clay-shadow-dark\)/);
    expect(feedback).toMatch(/text-foreground/);
  });
});

// ---------------------------------------------------------------------------
// 7. NewAppDialog — real dialog surface uses clay UI components
// ---------------------------------------------------------------------------

describe('UI Integration — NewAppDialog (clay dialog surface)', () => {
  it('dialog container is a clay-card raised surface', () => {
    expect(newAppDialog).toMatch(/clay-card/);
    expect(newAppDialog).toMatch(/animate-scale-in/);
  });

  it('inputs are carved-in clay inputs and actions are clay buttons', () => {
    expect(newAppDialog).toMatch(/clay-input/);
    expect((newAppDialog.match(/clay-button/g) || []).length).toBeGreaterThanOrEqual(2);
  });

  it('create/cancel buttons disable with opacity while creating', () => {
    expect(newAppDialog).toMatch(/disabled:opacity-50/);
    expect(newAppDialog).toMatch(/disabled:opacity-60/);
  });
});
