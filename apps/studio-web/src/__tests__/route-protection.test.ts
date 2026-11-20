/**
 * route-protection.test.ts — Route-Map & Auth-Gating Integrity (Cron 4)
 *
 * E2E navigation contract for MicroApp Studio:
 * 1. The COMPLETE page route map under src/app matches the expected set —
 *    no orphan pages, no missing pages.
 * 2. Auth-gating: the /app dashboard group is wrapped in AuthProvider +
 *    ProtectedRoute via its layout; every public entry page (/, /login,
 *    /register, /builder, /dev, /run/[id]) must NOT be auth-wrapped.
 * 3. goToDashboard (src/lib/navigation) resolves the dashboard destination
 *    from session state: /app when logged in, / when anonymous, and always
 *    falls back to the public landing page when the session check throws
 *    (never traps the user in a redirect loop).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import * as path from 'node:path';

import type { Session } from '@/lib/auth';

// Mock the auth module BEFORE importing lib/navigation so goToDashboard's
// `getSession` resolves to the controllable mock (no jose/cookie deps load).
vi.mock('@/lib/auth', () => ({
  getSession: vi.fn(),
}));

import { getSession } from '@/lib/auth';
import { goToDashboard } from '@/lib/navigation';

const repoRoot = path.resolve(__dirname, '..', '..');
const appDir = path.join(repoRoot, 'src', 'app');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function listRoutes(): string[] {
  const routes: string[] = [];
  const walk = (dir: string, prefix: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full, `${prefix}/${entry.name}`);
      } else if (entry.name === 'page.tsx' || entry.name === 'page.ts') {
        routes.push(prefix === '' ? '/' : prefix);
      }
    }
  };
  walk(appDir, '');
  return routes;
}

const PUBLIC_PAGES = [
  'page.tsx',                  // landing
  'login/page.tsx',
  'register/page.tsx',
  'builder/page.tsx',
  'dev/page.tsx',
  'run/[id]/page.tsx',
];

// ===========================================================================
// 1. Complete route map — every page the app ships, no orphans
// ===========================================================================

describe('Complete route map (src/app)', () => {
  it('matches the expected public + protected route set exactly', () => {
    const routes = listRoutes().sort();
    expect(routes).toEqual([
      '/',
      '/app',
      '/builder',
      '/dev',
      '/login',
      '/register',
      '/run/[id]',
    ]);
  });

  it('every expected route has a page file on disk (no 404 traps)', () => {
    for (const p of ['page.tsx', 'app/page.tsx', 'builder/page.tsx', 'dev/page.tsx', 'login/page.tsx', 'register/page.tsx', 'run/[id]/page.tsx']) {
      expect(existsSync(path.join(appDir, p)), `missing ${p}`).toBe(true);
    }
  });
});

// ===========================================================================
// 2. Auth-gating contract — /app is protected, everything else is public
// ===========================================================================

describe('Auth-gating contract', () => {
  it('dashboard group /app has a layout wiring AuthProvider + ProtectedRoute', () => {
    const layoutPath = path.join(appDir, 'app', 'layout.tsx');
    expect(existsSync(layoutPath)).toBe(true);
    const layout = readFileSync(layoutPath, 'utf8');
    expect(layout).toMatch(/AuthProvider/);
    expect(layout).toMatch(/<ProtectedRoute>/);
  });

  it('every nested /app/* page inherits the auth guard via the group layout', () => {
    // The group layout is the single chokepoint: any page added under
    // src/app/app/ is automatically protected. Assert the layout guards.
    const layout = readFileSync(path.join(appDir, 'app', 'layout.tsx'), 'utf8');
    expect(layout).toMatch(/ProtectedRoute/);
    // And the dashboard route itself contains dashboard content, not auth UI.
    const appPage = readFileSync(path.join(appDir, 'app', 'page.tsx'), 'utf8');
    expect(appPage).not.toMatch(/ProtectedRoute/);
  });

  it('public entry pages are NOT wrapped in ProtectedRoute', () => {
    for (const p of PUBLIC_PAGES) {
      const file = readFileSync(path.join(appDir, p), 'utf8');
      expect(file, `${p} must remain public`).not.toMatch(/ProtectedRoute/);
    }
  });

  it('auth pages (/login, /register) do not embed the dashboard shell', () => {
    for (const p of ['login/page.tsx', 'register/page.tsx']) {
      const file = readFileSync(path.join(appDir, p), 'utf8');
      expect(file, `${p} is an auth entry`).not.toMatch(/nav-links/);
    }
  });
});

// ===========================================================================
// 3. goToDashboard — destination resolution from session state
// ===========================================================================

describe('goToDashboard (src/lib/navigation)', () => {
  const pushMock = vi.fn();

  beforeEach(() => {
    pushMock.mockReset();
    vi.mocked(getSession).mockReset();
  });

  it('routes to /app when a session exists', async () => {
    vi.mocked(getSession).mockResolvedValue({ userId: 'u1', token: 't1', email: 'a@b.co', name: 'Ada' } as Session);
    await goToDashboard({ push: pushMock });
    expect(pushMock).toHaveBeenCalledTimes(1);
    expect(pushMock).toHaveBeenCalledWith('/app');
  });

  it('routes to / (landing) when anonymous', async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    await goToDashboard({ push: pushMock });
    expect(pushMock).toHaveBeenCalledWith('/');
  });

  it('falls back to / when the session check throws — never traps the user', async () => {
    vi.mocked(getSession).mockRejectedValue(new Error('session unavailable'));
    await goToDashboard({ push: pushMock });
    expect(pushMock).toHaveBeenCalledWith('/');
  });

  it('is resilient to invalid sessions (malformed shape)', async () => {
    vi.mocked(getSession).mockResolvedValue(undefined as unknown as Session);
    await goToDashboard({ push: pushMock });
    expect(pushMock).toHaveBeenCalledWith('/');
  });
});