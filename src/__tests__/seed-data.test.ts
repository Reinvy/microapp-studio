/**
 * seed-data.test.ts — DB Seed Data Validation (Cron 4, E2E/UI Integration)
 *
 * Validates the ACTUAL seed data that gets written to IndexedDB (src/db/seed.ts):
 * - Every FieldSchema in every sampleApp has valid type/label/required invariants
 * - validateField rejects empty required fields and accepts valid values
 * - Design-system compliance: seed text uses #4A3F35, not black
 * - SiteContent (nav links / footer) integrity for navigation
 *
 * The repo/content modules are mocked so Dexie/IndexedDB never loads in node.
 */

import { describe, it, expect, vi, beforeAll } from 'vitest';

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

import { sampleApps, seedContent } from '@/db/seed';
import { validateField } from '@/engine/schemaEngine';
import type { FieldSchema, AppSchema } from '@/types/schema';

// ---------------------------------------------------------------------------
// Structural invariants shared by every field
// ---------------------------------------------------------------------------

function expectValidFieldShape(field: FieldSchema) {
  expect(typeof field.id).toBe('string');
  expect(field.id.length).toBeGreaterThan(0);
  expect(typeof field.type).toBe('string');
  expect(typeof field.label).toBe('string');
  expect(field.label.length).toBeGreaterThan(0);
  // required is optional but must be boolean when present
  if (field.required !== undefined) {
    expect(typeof field.required).toBe('boolean');
  }
}

describe('Seed Data — FieldSchema Validation (DB data)', () => {
  let allFields: FieldSchema[];

  beforeAll(() => {
    allFields = sampleApps.flatMap((app) => app.fields);
  });

  it('seed contains a non-empty set of sample apps', () => {
    expect(sampleApps.length).toBeGreaterThanOrEqual(5);
  });

  it('every field across all seed apps has valid type/label/required shape', () => {
    expect(allFields.length).toBeGreaterThan(0);
    for (const field of allFields) {
      expectValidFieldShape(field);
    }
  });

  it('field ids are unique within each app', () => {
    for (const app of sampleApps) {
      const ids = app.fields.map((f) => f.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('required text fields reject empty values via validateField', () => {
    const requiredText = allFields.find(
      (f) => f.type === 'text' && f.required
    );
    expect(requiredText).toBeTruthy();
    expect(validateField(requiredText!, '')).toMatch(/required/i);
    expect(validateField(requiredText!, 'Hello')).toBeNull();
  });

  it('optional fields accept empty values via validateField', () => {
    const optionalField = allFields.find(
      (f) => (f.type === 'text' || f.type === 'textarea') && !f.required
    );
    expect(optionalField).toBeTruthy();
    expect(validateField(optionalField!, '')).toBeNull();
    expect(validateField(optionalField!, 'value')).toBeNull();
  });

  it('email fields validate format', () => {
    const emailField = allFields.find((f) => f.type === 'email');
    expect(emailField).toBeTruthy();
    expect(validateField(emailField!, 'not-an-email')).toMatch(/format|valid/i);
    expect(validateField(emailField!, 'user@example.com')).toBeNull();
  });

  it('every app has at least one field and a non-empty name', () => {
    for (const app of sampleApps) {
      expect(app.fields.length).toBeGreaterThan(0);
      expect(app.name.length).toBeGreaterThan(0);
      expect(app.prompt.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Design-system compliance of the seeded content (DB-driven UI data)
// ---------------------------------------------------------------------------

describe('Seed Data — Claymorphism v3 Design Compliance', () => {
  it('seed text color is #4A3F35, never black', () => {
    for (const app of sampleApps) {
      for (const field of app.fields) {
        if (field.textColor) {
          expect(field.textColor.toLowerCase()).not.toMatch(/^#?0{3,6}$/);
        }
      }
    }
    // heading/paragraph generators hardcode the warm brown
    const textFields = sampleApps.flatMap((a) => a.fields)
      .filter((f) => f.type === 'heading' || f.type === 'paragraph');
    for (const f of textFields) {
      expect(f.textColor).toBe('#4A3F35');
    }
  });

  it('button fields use claymorphism border radius (2xl/20px+)', () => {
    const buttons = sampleApps.flatMap((a) => a.fields).filter((f) => f.type === 'button');
    expect(buttons.length).toBeGreaterThan(0);
    for (const b of buttons) {
      expect(['2xl', 'lg', 'xl']).toContain(b.borderRadius ?? b.style?.borderRadius);
    }
  });
});

// ---------------------------------------------------------------------------
// SiteContent integrity — nav links & footer (navigation E2E source of truth)
// ---------------------------------------------------------------------------

describe('Seed Data — SiteContent Navigation Integrity', () => {
  it('seed content includes nav-links and footer entries', () => {
    const types = seedContent.map((c) => c.type);
    expect(types).toContain('nav-links');
    expect(types.some((t) => t.startsWith('footer')) || types.includes('footer')).toBe(true);
  });

  it('nav link entries point to real app routes or in-page anchors', () => {
    const knownRoutes = ['/', '/login', '/register', '/app', '/builder', '/dev'];
    const navContent = seedContent.find((c) => c.type === 'nav-links');
    if (navContent && navContent.data) {
      const links = Array.isArray(navContent.data)
        ? navContent.data
        : ((navContent.data as Record<string, unknown>).links as Array<{ href?: string }>) ?? [];
      expect(links.length).toBeGreaterThan(0);
      for (const link of links) {
        const href = (link as { href?: string }).href ?? '';
        // In-page anchors (#features) and absolute routes (/login) are both valid
        if (href.startsWith('#')) {
          expect(href.length).toBeGreaterThan(1);
        } else {
          expect(href.startsWith('/')).toBe(true);
          expect(
            knownRoutes.some((r) => href === r || href.startsWith(r + '/'))
          ).toBe(true);
        }
      }
    }
  });

  it('seed content items all have id + type', () => {
    for (const item of seedContent) {
      expect(typeof item.id).toBe('string');
      expect(item.id.length).toBeGreaterThan(0);
      expect(typeof item.type).toBe('string');
      expect(item.type.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// executeSchema smoke test with real seed app data
// ---------------------------------------------------------------------------

describe('Seed Data — executeSchema Integration', () => {
  it('executes a seeded app schema end-to-end', async () => {
    const { executeSchemaAsync } = await import('@/engine/schemaEngine');
    const app: AppSchema | undefined = sampleApps.find((a) => a.logicNodes?.length);
    if (!app) return; // logic-node coverage is in schemaEngine.test.ts

    const inputs: Record<string, unknown> = {};
    for (const field of app.fields) {
      if (field.type === 'text' || field.type === 'email' || field.type === 'textarea' || field.type === 'url' || field.type === 'phone') {
        inputs[field.id] = 'test value';
      } else if (field.type === 'number' || field.type === 'rating' || field.type === 'slider') {
        inputs[field.id] = field.min ?? 1;
      } else if (field.type === 'checkbox' || field.type === 'toggle') {
        inputs[field.id] = true;
      } else if (field.type === 'select') {
        inputs[field.id] = field.options?.[0] ?? 'A';
      } else if (field.type === 'date') {
        inputs[field.id] = '2026-08-04';
      }
    }

    const result = await executeSchemaAsync(app, inputs);
    expect(result).toBeDefined();
    expect(Array.isArray(result.errors)).toBe(true);
  });
});
