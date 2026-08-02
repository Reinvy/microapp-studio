/**
 * navigation-integration.test.ts — E2E Navigation & UI Integration Tests (Cron 4)
 *
 * Grounded in the ACTUAL app source, not mocks:
 * - Route integrity: every page route in src/app exists and key routes are wired
 * - Auth validation: validateEmail / validatePassword / validateName
 * - Dashboard services: sortApps / getSortLabel / pagination & sort options
 * - App store: zustand store CRUD integration (apps, fields, logic nodes, layout)
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import * as path from 'node:path';

import { validateEmail, validatePassword, validateName } from '@/lib/auth';
import {
  sortApps,
  getSortLabel,
  DEFAULT_SORT,
  SORT_OPTIONS,
  PAGE_SIZES,
  DEFAULT_PAGE_SIZE,
} from '@/services/dashboardSortService';
import { useAppStore } from '@/store/appStore';
import type { AppSchema, FieldSchema, LogicNode } from '@/types/schema';

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

function makeApp(overrides: Partial<AppSchema> = {}): AppSchema {
  return {
    id: 'app-1',
    name: 'Contact Form',
    description: 'A contact form',
    prompt: 'Create a contact form',
    fields: [],
    logicNodes: [],
    layout: [],
    createdAt: 1000,
    updatedAt: 1000,
    version: 1,
    ...overrides,
  };
}

function makeField(overrides: Partial<FieldSchema> = {}): FieldSchema {
  return {
    id: 'f1',
    type: 'text',
    label: 'Name',
    required: true,
    ...overrides,
  };
}

function makeLogicNode(overrides: Partial<LogicNode> = {}): LogicNode {
  return {
    id: 'n1',
    name: 'Sum',
    code: 'return a + b',
    inputs: ['a', 'b'],
    outputs: ['total'],
    version: 1,
    ...overrides,
  };
}

// ===========================================================================
// 1. Route Integrity — every page route resolves to a real file
// ===========================================================================

describe('Navigation — Route Integrity', () => {
  const routes = listRoutes();

  it('discovers the core app routes', () => {
    expect(routes).toContain('/');
    expect(routes).toContain('/login');
    expect(routes).toContain('/register');
    expect(routes).toContain('/app');
    expect(routes).toContain('/builder');
    expect(routes).toContain('/dev');
  });

  it('contains the dynamic run route', () => {
    expect(routes.some((r) => r.startsWith('/run/'))).toBe(true);
  });

  it('auth + dashboard routes are reachable entry points', () => {
    for (const route of ['/', '/login', '/register', '/app']) {
      expect(routes, `missing route ${route}`).toContain(route);
    }
  });

  it('landing page wires login/register links via DB-driven content', () => {
    const landing = readFileSync(path.join(appDir, 'page.tsx'), 'utf8');
    const seed = readFileSync(path.join(repoRoot, 'src', 'db', 'seed.ts'), 'utf8');
    // Page renders hero/CTA links from contentRepo-driven state (not hardcoded hrefs)
    expect(landing).toMatch(/hero\.primaryCta\.href/);
    expect(landing).toMatch(/cta\.secondaryCta\.href/);
    expect(landing).toMatch(/cta\.primaryCta\.href/);
    // Seed content (single source of truth) provides the auth entry points
    expect(seed).toMatch(/href: '\/login'/);
    expect(seed).toMatch(/href: '\/register'/);
  });

  it('app layout wires AuthProvider + ProtectedRoute', () => {
    const layout = readFileSync(path.join(appDir, 'app', 'layout.tsx'), 'utf8');
    expect(layout).toMatch(/AuthProvider/);
    expect(layout).toMatch(/ProtectedRoute/);
  });
});

// ===========================================================================
// 2. Auth Validation — real rules from src/lib/auth.ts
// ===========================================================================

describe('Auth — Validation Integration', () => {
  it('validateEmail accepts valid emails and rejects invalid ones', () => {
    expect(validateEmail('')).toBe('Email is required');
    expect(validateEmail('not-an-email')).toBe('Invalid email format');
    expect(validateEmail('user@example.com')).toBeNull();
  });

  it('validatePassword enforces minimum length 6', () => {
    expect(validatePassword('')).toBe('Password is required');
    expect(validatePassword('12345')).toBe('Password must be at least 6 characters');
    expect(validatePassword('secret1')).toBeNull();
  });

  it('validateName requires at least 2 characters', () => {
    expect(validateName('')).toBe('Name is required');
    expect(validateName('A')).toBe('Name must be at least 2 characters');
    expect(validateName('Ana')).toBeNull();
  });
});

// ===========================================================================
// 3. Dashboard Services — sorting, pagination options, labels
// ===========================================================================

describe('Dashboard — Sort & Pagination Services', () => {
  const apps = [
    makeApp({ id: 'a', name: 'Zebra App', updatedAt: 300, createdAt: 100 }),
    makeApp({ id: 'b', name: 'Alpha App', updatedAt: 100, createdAt: 300 }),
    makeApp({ id: 'c', name: 'Middle App', updatedAt: 200, createdAt: 200 }),
  ];

  it('sorts by name ascending (A–Z)', () => {
    const sorted = sortApps(apps, { field: 'name', direction: 'asc' });
    expect(sorted.map((a) => a.name)).toEqual(['Alpha App', 'Middle App', 'Zebra App']);
  });

  it('sorts by name descending (Z–A)', () => {
    const sorted = sortApps(apps, { field: 'name', direction: 'desc' });
    expect(sorted.map((a) => a.name)).toEqual(['Zebra App', 'Middle App', 'Alpha App']);
  });

  it('sorts by updatedAt descending by default', () => {
    const sorted = sortApps(apps, DEFAULT_SORT);
    expect(sorted.map((a) => a.id)).toEqual(['a', 'c', 'b']);
  });

  it('does not mutate the input array', () => {
    const original = [...apps];
    sortApps(apps, { field: 'name', direction: 'desc' });
    expect(apps).toEqual(original);
  });

  it('getSortLabel resolves all SORT_OPTIONS labels', () => {
    expect(SORT_OPTIONS.length).toBeGreaterThanOrEqual(6);
    for (const opt of SORT_OPTIONS) {
      expect(getSortLabel(opt.value)).toBe(opt.label);
    }
  });

  it('exposes valid page sizes and default', () => {
    expect(PAGE_SIZES).toContain(DEFAULT_PAGE_SIZE);
    expect(PAGE_SIZES).toEqual([12, 24, 48]);
  });
});

// ===========================================================================
// 4. App Store — zustand CRUD integration (apps, fields, logic, layout)
// ===========================================================================

describe('App Store — CRUD Integration', () => {
  it('adds an app to the front of the list', () => {
    useAppStore.setState({ apps: [], activeApp: null });
    const appA = makeApp({ id: 'first' });
    const appB = makeApp({ id: 'second' });
    useAppStore.getState().addApp(appA);
    useAppStore.getState().addApp(appB);
    expect(useAppStore.getState().apps.map((a) => a.id)).toEqual(['second', 'first']);
  });

  it('updates an app and bumps updatedAt', () => {
    useAppStore.setState({ apps: [makeApp({ id: 'x', updatedAt: 100 })], activeApp: null });
    useAppStore.getState().updateApp('x', { name: 'Renamed' });
    const updated = useAppStore.getState().apps.find((a) => a.id === 'x')!;
    expect(updated.name).toBe('Renamed');
    expect(updated.updatedAt).toBeGreaterThanOrEqual(100);
  });

  it('removes an app and clears activeApp when removed', () => {
    const app = makeApp({ id: 'gone' });
    useAppStore.setState({ apps: [app], activeApp: app });
    useAppStore.getState().removeApp('gone');
    expect(useAppStore.getState().apps).toHaveLength(0);
    expect(useAppStore.getState().activeApp).toBeNull();
  });

  it('addField appends field + layout entry with generated id', () => {
    const app = makeApp({ id: 'app-f', fields: [], layout: [] });
    useAppStore.setState({ apps: [app], activeApp: app });
    useAppStore.getState().addField({ type: 'email', label: 'Email' });
    const active = useAppStore.getState().activeApp!;
    expect(active.fields).toHaveLength(1);
    expect(active.fields[0].type).toBe('email');
    expect(active.fields[0].label).toBe('Email');
    expect(active.layout).toHaveLength(1);
    expect(active.layout[0].fieldId).toBe(active.fields[0].id);
  });

  it('updateField merges partial updates on the target field', () => {
    const app = makeApp({
      id: 'app-u',
      fields: [makeField({ id: 'f1', label: 'Old' }), makeField({ id: 'f2', label: 'Keep' })],
    });
    useAppStore.setState({ apps: [app], activeApp: app });
    useAppStore.getState().updateField('f1', { label: 'New Label', required: false });
    const active = useAppStore.getState().activeApp!;
    expect(active.fields.find((f) => f.id === 'f1')!.label).toBe('New Label');
    expect(active.fields.find((f) => f.id === 'f1')!.required).toBe(false);
    expect(active.fields.find((f) => f.id === 'f2')!.label).toBe('Keep');
  });

  it('removeField removes field and its layout entry, clears selection', () => {
    const app = makeApp({
      id: 'app-r',
      fields: [makeField({ id: 'f1' }), makeField({ id: 'f2' })],
      layout: [
        { fieldId: 'f1', x: 0, y: 0, width: 12 },
        { fieldId: 'f2', x: 0, y: 100, width: 12 },
      ],
    });
    useAppStore.setState({ apps: [app], activeApp: app, selectedFieldId: 'f1' });
    useAppStore.getState().removeField('f1');
    const state = useAppStore.getState();
    expect(state.activeApp!.fields.map((f) => f.id)).toEqual(['f2']);
    expect(state.activeApp!.layout.map((l) => l.fieldId)).toEqual(['f2']);
    expect(state.selectedFieldId).toBeNull();
  });

  it('reorderFields moves a field to the target index', () => {
    const app = makeApp({
      id: 'app-o',
      fields: [makeField({ id: 'a' }), makeField({ id: 'b' }), makeField({ id: 'c' })],
    });
    useAppStore.setState({ apps: [app], activeApp: app });
    useAppStore.getState().reorderFields(0, 2);
    expect(useAppStore.getState().activeApp!.fields.map((f) => f.id)).toEqual(['b', 'c', 'a']);
  });

  it('manages logic nodes: add, update (version bump), remove', () => {
    const app = makeApp({ id: 'app-n', logicNodes: [] });
    useAppStore.setState({ apps: [app], activeApp: app });

    useAppStore.getState().addLogicNode(makeLogicNode({ id: 'n1' }));
    expect(useAppStore.getState().activeApp!.logicNodes).toHaveLength(1);

    useAppStore.getState().updateLogicNode('n1', { code: 'return a * b' });
    const node = useAppStore.getState().activeApp!.logicNodes[0];
    expect(node.code).toBe('return a * b');
    expect(node.version).toBe(2);

    useAppStore.getState().removeLogicNode('n1');
    expect(useAppStore.getState().activeApp!.logicNodes).toHaveLength(0);
  });

  it('selectField toggles the selected field id', () => {
    useAppStore.setState({ selectedFieldId: null });
    useAppStore.getState().selectField('f9');
    expect(useAppStore.getState().selectedFieldId).toBe('f9');
    useAppStore.getState().selectField(null);
    expect(useAppStore.getState().selectedFieldId).toBeNull();
  });
});
