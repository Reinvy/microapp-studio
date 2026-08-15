/**
 * dashboard-copy.test.ts — Dashboard page chrome copy centralization (Cron 2, UI/UX)
 *
 * Source-level compliance checks for the dashboard page (src/app/app/page.tsx):
 * - Page-level chrome strings (title, toolbar actions, logout, pagination
 *   labels) must come from dashboardCopy, NOT hardcoded JSX text nodes
 * - dashboardCopy is a plain config module (no content-DB dependency) —
 *   mirrors builderCopy/runnerCopy, so it stays synchronous and testable
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';

const repoRoot = path.resolve(__dirname, '..', '..');
const read = (p: string) => readFileSync(path.join(repoRoot, p), 'utf8');

const dashboardPage = read('src/app/app/page.tsx');
const copyModule = read('src/lib/dashboardCopy.ts');

// Strings that used to be hardcoded in the dashboard page before the Cron 2
// refactor — none of them may appear as JSX text/aria nodes anymore.
const FORMER_HARDCODED: string[] = [
  '>Your Micro Apps<',
  '>New App<',
  '>Export<',
  '>Import<',
  '>Logout<',
  '>Hi, <',
  '>Previous page<',
  '>Next page<',
  '>Go to<',
  '>Go<',
  'Download a JSON backup of all your apps',
  'Restore apps from a JSON backup',
];

describe('Dashboard chrome — copy centralization (Cron 2)', () => {
  it('dashboard page has no hardcoded chrome strings', () => {
    for (const literal of FORMER_HARDCODED) {
      expect(dashboardPage, `dashboard page must not contain ${literal}`).not.toContain(literal);
    }
  });

  it('dashboard page imports and uses dashboardCopy', () => {
    expect(dashboardPage).toMatch(/import\s*\{[^}]*dashboardCopy[^}]*\}\s*from\s*['"]@\/lib\/dashboardCopy['"]/);
    expect(dashboardPage).toMatch(/dashboardCopy\.page\.title/);
    expect(dashboardPage).toMatch(/dashboardCopy\.page\.countLabel\(totalApps\)/);
    expect(dashboardPage).toMatch(/dashboardCopy\.actions\.newApp/);
    expect(dashboardPage).toMatch(/dashboardCopy\.header\.logout/);
    expect(dashboardPage).toMatch(/dashboardCopy\.pagination\.prevAria/);
    expect(dashboardPage).toMatch(/dashboardCopy\.pagination\.nextAria/);
    expect(dashboardPage).toMatch(/dashboardCopy\.pagination\.pageAria\(item\)/);
    expect(dashboardPage).toMatch(/dashboardCopy\.pagination\.goAria\(jumpInput \|\| page\)/);
  });

  it('dashboardCopy module exposes the full chrome surface', () => {
    expect(copyModule).toMatch(/appName: 'MicroApp Studio'/);
    expect(copyModule).toMatch(/greetingPrefix: 'Hi,'/);
    expect(copyModule).toMatch(/title: 'Your Micro Apps'/);
    expect(copyModule).toMatch(/countLabel: \(n: number\) =>/);
    expect(copyModule).toMatch(/exportTitle: 'Download a JSON backup of all your apps'/);
    expect(copyModule).toMatch(/importTitle: 'Restore apps from a JSON backup'/);
    expect(copyModule).toMatch(/newApp: 'New App'/);
  });

  it('dashboardCopy functions pluralize correctly', () => {
    // Exercises the exported functions via a lightweight eval-free re-implementation
    // is overkill — instead assert the templates are pure functions of count.
    expect(copyModule).toMatch(/countLabel: \(n: number\) => `\$\{n\} \$\{n === 1 \? 'app' : 'apps'\} created`/);
    expect(copyModule).toMatch(/pageInfo: \(page: number, total: number\) => `Page \$\{page\} of \$\{total\}`/);
    expect(copyModule).toMatch(/pageAria: \(n: number\) => `Page \$\{n\}`/);
  });

  it('dashboard page has no remaining hardcoded aria labels for pagination', () => {
    expect(dashboardPage).not.toMatch(/aria-label="Previous page"/);
    expect(dashboardPage).not.toMatch(/aria-label="Next page"/);
    expect(dashboardPage).not.toMatch(/aria-label=\{`Page \$\{item\}`\}/);
    expect(dashboardPage).not.toMatch(/aria-label=\{`Go to page \$\{jumpInput \|\| page\}`\}/);
  });
});
