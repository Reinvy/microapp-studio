/**
 * navigation-routes.test.ts — Route & Navigation Integrity (Cron 4)
 *
 * E2E navigation integration: verifies that every page route the app claims
 * to have actually exists as a page.tsx, and that DB-driven navigation links
 * (nav-links seed content + Navbar CTAs) point at real, resolvable routes —
 * no dead internal links.
 *
 * The repo/content modules are mocked so Dexie/IndexedDB never loads in node.
 */

import { describe, it, expect, vi } from 'vitest';

// Stub the repo modules so the real modules (which import Dexie) never load.
vi.mock('@/db/microAppRepo', () => ({
  microAppRepo: {
    getAll: vi.fn(),
    bulkSave: vi.fn(),
    count: vi.fn(),
    getPaginated: vi.fn(),
    search: vi.fn(),
    getById: vi.fn(),
    getRecentApps: vi.fn(),
    getByIds: vi.fn(),
    getByNamePrefix: vi.fn(),
    reindexSearchNames: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    batchRemove: vi.fn(),
    exportAll: vi.fn(),
    importApps: vi.fn(),
  },
}));

vi.mock('@/db/contentRepo', () => ({
  contentRepo: {
    getAll: vi.fn(),
    exists: vi.fn(),
    save: vi.fn(),
  },
}));

import { readFileSync, existsSync } from 'node:fs';
import * as path from 'node:path';
import { seedContent } from '@/db/seed';

const repoRoot = path.resolve(__dirname, '..', '..');
const appDir = path.join(repoRoot, 'src', 'app');

/** Maps an href like "/builder" or "/run/[id]" to the page.tsx path. */
function routeToPagePath(href: string): string | null {
  if (href === '/' || href === '') return path.join(appDir, 'page.tsx');
  if (!href.startsWith('/') || href.startsWith('#')) return null; // anchor or external
  // strip query/hash
  const clean = href.split(/[?#]/)[0];
  // dynamic segment: "/run/abc" → page under /run/[id]
  const segments = clean.split('/').filter(Boolean);
  const base = path.join(appDir, ...segments);
  const candidates = [path.join(base, 'page.tsx'), path.join(base, '[id]', 'page.tsx')];
  return candidates.find((c) => existsSync(c)) ?? null;
}

describe('Route integrity — every page route has a real page.tsx', () => {
  const expectedRoutes = ['/', '/app', '/builder', '/dev', '/login', '/register', '/run/[id]'];

  it('exposes all expected routes from the build manifest', () => {
    // The production build prints the route table; the source of truth is the
    // file system. Every route below must resolve to a page.tsx.
    for (const route of expectedRoutes) {
      const page = routeToPagePath(route);
      expect(page, `route ${route} should resolve to a page.tsx`).not.toBeNull();
      expect(existsSync(page!), `page.tsx missing for route ${route}`).toBe(true);
    }
  });

  it('does not reference page.tsx files that are missing', () => {
    const allPages = expectedRoutes
      .map(routeToPagePath)
      .filter((p): p is string => p !== null);
    for (const p of allPages) {
      expect(existsSync(p)).toBe(true);
    }
  });
});

describe('DB-driven nav links resolve to real routes (no dead links)', () => {
  const navContent = seedContent.find((c) => c.type === 'nav-links');
  const navLinks = (navContent?.data ?? []) as { label: string; href: string }[];

  it('nav-links content exists in the DB seed', () => {
    expect(navContent).toBeDefined();
    expect(navLinks.length).toBeGreaterThan(0);
  });

  it('every nav link href is either a valid anchor or an existing route', () => {
    for (const link of navLinks) {
      if (link.href.startsWith('#')) continue; // in-page anchor — fine
      const page = routeToPagePath(link.href);
      expect(page, `nav link "${link.label}" href "${link.href}" must resolve`).not.toBeNull();
      expect(
        existsSync(page!),
        `nav link "${link.label}" → missing page for "${link.href}"`
      ).toBe(true);
    }
  });

  it('nav links have non-empty labels and hrefs', () => {
    for (const link of navLinks) {
      expect(link.label?.trim().length).toBeGreaterThan(0);
      expect(link.href?.trim().length).toBeGreaterThan(0);
    }
  });
});

describe('Navigation components link to real routes', () => {
  const navbar = readFileSync(
    path.join(repoRoot, 'src', 'components', 'landing', 'Navbar.tsx'),
    'utf8'
  );
  const landing = readFileSync(path.join(repoRoot, 'src', 'app', 'page.tsx'), 'utf8');
  const toolbar = readFileSync(
    path.join(repoRoot, 'src', 'components', 'builder', 'Toolbar.tsx'),
    'utf8'
  );
  const appPage = readFileSync(path.join(repoRoot, 'src', 'app', 'app', 'page.tsx'), 'utf8');

  function hrefsFrom(source: string): string[] {
    return Array.from(source.matchAll(/href="(\/[^"#?]*)/g)).map((m) => m[1]);
  }

  it('Navbar CTA links all resolve to pages', () => {
    const hrefs = hrefsFrom(navbar);
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) {
      const page = routeToPagePath(href);
      expect(page, `Navbar href "${href}" must resolve`).not.toBeNull();
      expect(existsSync(page!), `Navbar href "${href}" → missing page`).toBe(true);
    }
  });

  it('landing page CTAs are DB-driven (hero-content / landing-cta), not hardcoded', () => {
    // The landing page renders CTA hrefs from DB content via JSX expressions
    // ({hero.primaryCta.href}), so there are no literal href="/..." strings.
    // Assert the DB-driven pattern is used (no hardcoded data rule).
    expect(landing).toMatch(/hero\.primaryCta\.href/);
    expect(landing).toMatch(/cta\.secondaryCta\.href/);
    // And no hardcoded internal hrefs like href="/register" baked into the page.
    expect(landing).not.toMatch(/href="\/builder"/);
    expect(landing).not.toMatch(/href="\/app"/);
  });

  it('seed-driven CTA hrefs (hero-content + landing-cta) resolve to existing routes', () => {
    // Extract CTA targets from the DB seed — every one must resolve to a real
    // page so the landing page never renders a dead CTA link.
    const ctaHrefs: string[] = [];
    for (const content of seedContent) {
      if (content.type !== 'hero-content' && content.type !== 'landing-cta') continue;
      const data = content.data as {
        primaryCta?: { href?: string };
        secondaryCta?: { href?: string };
      };
      if (data.primaryCta?.href) ctaHrefs.push(data.primaryCta.href);
      if (data.secondaryCta?.href) ctaHrefs.push(data.secondaryCta.href);
    }
    expect(ctaHrefs.length).toBeGreaterThan(0);
    for (const href of ctaHrefs) {
      const page = routeToPagePath(href);
      expect(page, `seed CTA href "${href}" must resolve`).not.toBeNull();
      expect(existsSync(page!), `seed CTA href "${href}" → missing page`).toBe(true);
    }
  });

  it('run navigation (Toolbar + app list) targets the /run/[id] dynamic route', () => {
    // The dynamic route directory must exist with its page.tsx.
    const runDir = path.join(appDir, 'run', '[id]');
    expect(existsSync(path.join(runDir, 'page.tsx'))).toBe(true);
    // Builder Toolbar and the app list navigate via router.push(`/run/${id}`).
    expect(toolbar).toMatch(/router\.push\(`\/run\/\$\{/);
    expect(appPage).toMatch(/router\.push\(`\/run\/\$\{/);
  });
});
