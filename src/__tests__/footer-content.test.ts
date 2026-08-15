/**
 * footer-content.test.ts — Footer DB-driven content & fallback parity (Cron 4)
 *
 * PR #92 migrated the footer copy from hardcoded JSX to DB-driven content
 * (contentRepo keys 'footer-columns' / 'footer-brand'). This suite locks in:
 * 1. Footer reads columns + brand through contentService (never hardcodes hrefs)
 * 2. The in-component FALLBACK data mirrors the SEEDED content exactly — a
 *    drift between them means first paint shows copy that differs from the DB.
 * 3. Seed integrity for the footer/nav content entries.
 * 4. Claymorphism v3 compliance on the footer (clay tokens, no black text).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { seedContent } from '@/db/seed';
import type { FooterColumn, FooterBrand, NavLink } from '@/db/contentRepo';

const repoRoot = path.resolve(__dirname, '..', '..');
const footerSource = readFileSync(
  path.join(repoRoot, 'src', 'components', 'landing', 'Footer.tsx'),
  'utf8'
);
const css = readFileSync(path.join(repoRoot, 'src', 'app', 'globals.css'), 'utf8');

/**
 * Extract a plain-data const literal from Footer.tsx and evaluate it.
 * The fallback constants are plain object/array literals (no functions, no
 * TS-only syntax), so `new Function('return ' + literal)` is safe and gives
 * us a real value to deep-compare against the seed data.
 */
function extractConst<T>(source: string, name: string, typeAnnot: string): T {
  // Escape regex metacharacters (e.g. `FooterColumn[]` — the brackets must be
  // literal in the pattern, not an empty character class).
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = source.match(new RegExp(`const ${esc(name)}: ${esc(typeAnnot)} = ([\\s\\S]*?);`));
  expect(match, `const ${name} not found in Footer.tsx`).toBeTruthy();
  return new Function(`return (${match![1]})`)() as T;
}

// Seed lookups
const seedFooterColumns = seedContent.find((c) => c.type === 'footer-columns')?.data as
  | FooterColumn[]
  | undefined;
const seedFooterBrand = seedContent.find((c) => c.type === 'footer-brand')?.data as
  | FooterBrand
  | undefined;
const seedNavLinks = seedContent.find((c) => c.type === 'nav-links')?.data as
  | NavLink[]
  | undefined;

// ===========================================================================
// 1. Footer is DB-driven through the content service
// ===========================================================================

describe('Footer DB-driven content wiring', () => {
  it('reads footer columns via contentService.getContent (never hardcoded in JSX)', () => {
    expect(footerSource).toMatch(/contentService\.getContent<FooterColumn\[\]>\('footer-columns'\)/);
  });

  it('reads footer brand via contentService.getContent with the footer-brand key', () => {
    expect(footerSource).toMatch(/contentService\.getContent<FooterBrand>\('footer-brand'\)/);
  });

  it('renders columns and links via .map, not literal JSX anchors', () => {
    expect(footerSource).toMatch(/footerColumns\.map/);
    expect(footerSource).toMatch(/col\.links\.map/);
    expect(footerSource).toMatch(/brand\.socials\.map/);
  });

  it('renders brand name / tagline / copyright from state (DB value), not literals', () => {
    expect(footerSource).toMatch(/\{brand\.brandName\}/);
    expect(footerSource).toMatch(/\{brand\.tagline\}/);
    expect(footerSource).toMatch(/formatCopyright\(brand\.copyright\)/);
  });

  it('keeps a fallback for first paint but swaps it when DB content resolves', () => {
    // Fallback state initializers must exist…
    expect(footerSource).toMatch(/useState<FooterColumn\[\]>\(fallbackFooterColumns\)/);
    expect(footerSource).toMatch(/useState<FooterBrand>\(fallbackFooterBrand\)/);
    // …and be replaced by the resolved DB values.
    expect(footerSource).toMatch(/setFooterColumns\(columns\)/);
    expect(footerSource).toMatch(/setBrand\(brandContent\)/);
  });
});

// ===========================================================================
// 2. Fallback parity — fallback constants must equal seeded content
// ===========================================================================

describe('Footer fallback ↔ seed parity (drift guard)', () => {
  it('seed content includes footer-columns, footer-brand, and nav-links', () => {
    expect(seedFooterColumns).toBeDefined();
    expect(seedFooterBrand).toBeDefined();
    expect(seedNavLinks).toBeDefined();
  });

  it('fallbackFooterColumns deep-equals the seeded footer-columns data', () => {
    const fallback = extractConst<FooterColumn[]>(footerSource, 'fallbackFooterColumns', 'FooterColumn[]');
    expect(fallback).toEqual(seedFooterColumns);
  });

  it('fallbackFooterBrand deep-equals the seeded footer-brand data', () => {
    const fallback = extractConst<FooterBrand>(footerSource, 'fallbackFooterBrand', 'FooterBrand');
    expect(fallback).toEqual(seedFooterBrand);
  });

  it('nav-links seed entry matches the Navbar source contract (nav-links key)', () => {
    const navbarSource = readFileSync(
      path.join(repoRoot, 'src', 'components', 'landing', 'Navbar.tsx'),
      'utf8'
    );
    expect(navbarSource).toMatch(/contentService\.getContent<NavLink\[\]>\('nav-links'\)/);
  });
});

// ===========================================================================
// 3. Seed integrity for footer/nav content
// ===========================================================================

describe('Footer/nav seed data integrity', () => {
  it('footer-columns: every column has a non-empty title and labeled links', () => {
    expect(seedFooterColumns!.length).toBeGreaterThan(0);
    for (const col of seedFooterColumns!) {
      expect(col.title).toBeTruthy();
      expect(col.links.length).toBeGreaterThan(0);
      for (const link of col.links) {
        expect(link.label).toBeTruthy();
        expect(typeof link.href).toBe('string');
        expect(link.href.length).toBeGreaterThan(0);
      }
    }
  });

  it('footer-columns: column titles are unique (no duplicate columns)', () => {
    const titles = seedFooterColumns!.map((c) => c.title);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it('footer-brand: brandName, tagline, copyright are non-empty; socials have labels', () => {
    expect(seedFooterBrand!.brandName).toBeTruthy();
    expect(seedFooterBrand!.tagline.length).toBeGreaterThan(20);
    expect(seedFooterBrand!.copyright).toContain('{year}');
    for (const social of seedFooterBrand!.socials) {
      expect(social.label).toBeTruthy();
      expect(social.href).toBeTruthy();
    }
  });

  it('nav-links: every link has label + href, and at least one real route link', () => {
    expect(seedNavLinks!.length).toBeGreaterThan(0);
    for (const link of seedNavLinks!) {
      expect(link.label).toBeTruthy();
      expect(link.href).toBeTruthy();
    }
    expect(seedNavLinks!.some((l) => l.href.startsWith('/'))).toBe(true);
  });
});

// ===========================================================================
// 4. Claymorphism v3 compliance on the footer
// ===========================================================================

describe('Footer Claymorphism v3 design tokens', () => {
  it('footer uses clay-card background + clay shadow tokens (raised look)', () => {
    expect(footerSource).toMatch(/bg-\[var\(--clay-card\)\]/);
    expect(footerSource).toMatch(/var\(--clay-shadow-dark\)/);
    expect(footerSource).toMatch(/var\(--clay-shadow-light\)/);
  });

  it('footer badges use clay-sm + rounded-2xl and text-clay-foreground (#4A3F35)', () => {
    expect(footerSource).toMatch(/clay-sm/);
    expect(footerSource).toMatch(/rounded-2xl/);
    expect(footerSource).toMatch(/text-clay-foreground/);
  });

  it('footer text uses design tokens (foreground/muted-foreground), never hardcoded black', () => {
    expect(footerSource).toMatch(/text-foreground/);
    expect(footerSource).toMatch(/text-muted-foreground/);
    const blackUses = footerSource.match(/(?:text|bg|border)-\[?#0{3,6}\]?/gi) || [];
    expect(blackUses).toEqual([]);
  });

  it('clay-sm utility exists in globals.css with clay shadows', () => {
    expect(css).toMatch(/\.clay-sm\s*\{/);
    expect(css).toMatch(/\.clay-sm\s*\{[^}]*shadow/);
  });
});
