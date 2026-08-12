/**
 * navigation.test.ts — E2E Navigation & UI Integration Tests
 *
 * Covers:
 * - FieldSchema validation (type, label, required) using database-like data
 * - executeSchema with various inputs (including edge cases)
 * - promptToSchema with sample prompts
 * - Claymorphism design system compliance (import checks, style patterns)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { validateField, executeSchema } from '@/engine/schemaEngine';
import parsePrompt from '@/engine/promptToSchema';
import type { FieldSchema, AppSchema } from '@/types/schema';
import { sampleApps } from '@/db/seed';

const repoRoot = path.resolve(__dirname, '..', '..');

// ===========================================================================
// Helper factories
// ===========================================================================

function makeField(overrides: Partial<FieldSchema> = {}): FieldSchema {
  return {
    id: 'f1',
    type: 'text',
    label: 'Test Field',
    required: false,
    ...overrides,
  };
}

function makeSchema(overrides: Partial<AppSchema> = {}): AppSchema {
  return {
    id: 'schema1',
    name: 'Test Schema',
    description: 'A test schema',
    prompt: 'test',
    fields: [],
    logicNodes: [],
    layout: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: 1,
    ...overrides,
  };
}

// ===========================================================================
// 1. FieldSchema Validation — type, label, required (DB-like data)
// ===========================================================================

describe('FieldSchema Validation (DB-like data)', () => {
  // Simulates data that would come from the database / seed data

  const dbFields: FieldSchema[] = [
    { id: 'name', type: 'text', label: 'Full Name', required: true, placeholder: 'Enter your name' },
    { id: 'email', type: 'email', label: 'Email Address', required: true, placeholder: 'you@example.com' },
    { id: 'age', type: 'number', label: 'Age', required: false, min: 1, max: 150 },
    { id: 'country', type: 'select', label: 'Country', required: true, options: ['USA', 'Canada', 'UK', 'Australia', 'Other'] },
    { id: 'bio', type: 'textarea', label: 'Biography', required: false, validation: { maxLength: 500 } },
    { id: 'agree', type: 'checkbox', label: 'I agree to terms', required: true },
    { id: 'birthday', type: 'date', label: 'Birthday', required: false },
    { id: 'rating', type: 'rating', label: 'Satisfaction', required: true, min: 1, max: 5 },
    { id: 'phone', type: 'phone', label: 'Phone Number', required: false },
    { id: 'website', type: 'url', label: 'Personal Website', required: false },
    { id: 'favcolor', type: 'color', label: 'Favorite Color', required: false },
    { id: 'income', type: 'slider', label: 'Income Range', required: false, min: 0, max: 1000000, step: 10000 },
    { id: 'notify', type: 'toggle', label: 'Enable Notifications', required: false },
  ];

  describe('Type validation', () => {
    it('each field has a valid FieldType', () => {
      const validTypes = [
        'text', 'number', 'select', 'checkbox', 'textarea', 'date',
        'file', 'slider', 'toggle', 'heading', 'paragraph', 'divider',
        'spacer', 'image', 'card', 'button', 'color', 'email', 'phone',
        'url', 'rating',
      ];
      for (const field of dbFields) {
        expect(validTypes).toContain(field.type);
      }
    });

    it('each field has a non-empty id', () => {
      for (const field of dbFields) {
        expect(field.id).toBeTruthy();
        expect(typeof field.id).toBe('string');
      }
    });

    it('text field validates minLength/maxLength correctly', () => {
      const field = makeField({ type: 'text', validation: { minLength: 2, maxLength: 100, message: 'Text must be 2-100 chars' } });
      expect(validateField(field, 'a')).toBe('Text must be 2-100 chars');
      expect(validateField(field, 'ab')).toBeNull();
      expect(validateField(field, 'a'.repeat(101))).toBe('Text must be 2-100 chars');
    });

    it('number field validates min/max constraints', () => {
      const ageField = dbFields.find(f => f.id === 'age')!;
      expect(validateField(ageField, 0)).toBe('Age must be at least 1');
      expect(validateField(ageField, 151)).toBe('Age must be no more than 150');
      expect(validateField(ageField, 30)).toBeNull();
    });

    it('select field validates against options array', () => {
      const countryField = dbFields.find(f => f.id === 'country')!;
      expect(validateField(countryField, 'France')).toBe('Country must be one of: USA, Canada, UK, Australia, Other');
      expect(validateField(countryField, 'Canada')).toBeNull();
    });

    it('email field rejects invalid emails', () => {
      const emailField = dbFields.find(f => f.id === 'email')!;
      expect(validateField(emailField, 'not-an-email')).toBe('Email Address must be a valid email address');
      expect(validateField(emailField, 'user@example.com')).toBeNull();
    });

    it('checkbox field requires true when required', () => {
      const agreeField = dbFields.find(f => f.id === 'agree')!;
      expect(validateField(agreeField, false)).toBe('I agree to terms must be checked');
      expect(validateField(agreeField, true)).toBeNull();
    });

    it('rating field validates within range', () => {
      const ratingField = dbFields.find(f => f.id === 'rating')!;
      expect(validateField(ratingField, 0)).toBe('Satisfaction must be at least 1');
      expect(validateField(ratingField, 3)).toBeNull();
      expect(validateField(ratingField, 6)).toBe('Satisfaction must be no more than 5');
    });

    it('phone field validates format', () => {
      const phoneField = dbFields.find(f => f.id === 'phone')!;
      expect(validateField(phoneField, 'abc')).toBe('Phone Number must be a valid phone number');
      expect(validateField(phoneField, '+1-555-555-5555')).toBeNull();
    });

    it('url field validates format', () => {
      const urlField = dbFields.find(f => f.id === 'website')!;
      expect(validateField(urlField, 'not-a-url')).toBe('Personal Website must be a valid URL');
      expect(validateField(urlField, 'https://example.com')).toBeNull();
    });

    it('color field validates hex format', () => {
      const colorField = dbFields.find(f => f.id === 'favcolor')!;
      expect(validateField(colorField, 'red')).toBe('Favorite Color must be a valid hex color');
      expect(validateField(colorField, '#FF5733')).toBeNull();
    });

    it('slider field validates step constraint', () => {
      const sliderField = dbFields.find(f => f.id === 'income')!;
      expect(validateField(sliderField, 55000)).toBe('Income Range must be in increments of 10000');
      expect(validateField(sliderField, 50000)).toBeNull();
    });

    it('toggle field requires checked when required', () => {
      const toggleField = dbFields.find(f => f.id === 'notify')!;
      expect(validateField(toggleField, false)).toBeNull(); // not required
      // Make it required
      const reqToggle = { ...toggleField, required: true, label: 'Enable Notifications' };
      expect(validateField(reqToggle, false)).toBe('Enable Notifications must be checked');
      expect(validateField(reqToggle, true)).toBeNull();
    });
  });

  describe('Label presence and quality', () => {
    it('all fields have non-empty labels', () => {
      for (const field of dbFields) {
        expect(field.label).toBeTruthy();
        expect(field.label.length).toBeGreaterThan(2);
      }
    });

    it('required boolean is properly typed', () => {
      for (const field of dbFields) {
        expect(typeof field.required).toBe('boolean');
      }
    });

    it('select field has options array', () => {
      const selectFields = dbFields.filter(f => f.type === 'select');
      for (const field of selectFields) {
        expect(Array.isArray(field.options)).toBe(true);
        expect(field.options!.length).toBeGreaterThan(0);
      }
    });

    it('number/slider fields have proper numeric constraints', () => {
      const numericFields = dbFields.filter(f => f.type === 'number' || f.type === 'slider');
      for (const field of numericFields) {
        if (field.min !== undefined) expect(typeof field.min).toBe('number');
        if (field.max !== undefined) expect(typeof field.max).toBe('number');
        if (field.step !== undefined) expect(typeof field.step).toBe('number');
      }
    });
  });

  describe('Required field edge cases', () => {
    it('rejects undefined, null, empty string for required', () => {
      const field = makeField({ required: true, label: 'ReqField' });
      expect(validateField(field, undefined)).toBe('ReqField is required');
      expect(validateField(field, null)).toBe('ReqField is required');
      expect(validateField(field, '')).toBe('ReqField is required');
    });

    it('allows empty for non-required fields', () => {
      const field = makeField({ required: false, label: 'OptField' });
      expect(validateField(field, undefined)).toBeNull();
      expect(validateField(field, null)).toBeNull();
      expect(validateField(field, '')).toBeNull();
    });

    it('uses field id as fallback when label is empty', () => {
      const field = makeField({ label: '', id: 'custom_id', required: true });
      expect(validateField(field, null)).toBe('custom_id is required');
    });
  });
});

// ===========================================================================
// 2. executeSchema — Schema Execution with Various Inputs
// ===========================================================================

describe('executeSchema — Comprehensive Input Validation', () => {
  it('returns inputs, outputs, errors structure for empty schema', () => {
    const schema = makeSchema();
    const result = executeSchema(schema, {});
    expect(result).toHaveProperty('inputs');
    expect(result).toHaveProperty('outputs');
    expect(result).toHaveProperty('errors');
    expect(result.errors).toEqual([]);
    expect(Object.keys(result.outputs)).toHaveLength(0);
  });

  it('validates multiple required fields and collects all errors', () => {
    const schema = makeSchema({
      fields: [
        makeField({ id: 'name', label: 'Name', required: true }),
        makeField({ id: 'email', label: 'Email', required: true }),
        makeField({ id: 'age', label: 'Age', type: 'number', required: true }),
      ],
    });
    const result = executeSchema(schema, {});
    expect(result.errors).toContain('Name is required');
    expect(result.errors).toContain('Email is required');
    expect(result.errors).toContain('Age is required');
    expect(result.errors.length).toBe(3);
  });

  it('applies default values from field definitions', () => {
    const schema = makeSchema({
      fields: [
        makeField({ id: 'count', type: 'number', defaultValue: 0, required: false }),
        makeField({ id: 'active', type: 'checkbox', defaultValue: true, required: false }),
        makeField({ id: 'greeting', type: 'text', defaultValue: 'Hello', required: false }),
      ],
    });
    const result = executeSchema(schema, {});
    expect(result.inputs.count).toBe(0);
    expect(result.inputs.active).toBe(true);
    expect(result.inputs.greeting).toBe('Hello');
  });

  it('user-provided values override defaults', () => {
    const schema = makeSchema({
      fields: [
        makeField({ id: 'name', type: 'text', defaultValue: 'Guest', required: false }),
        makeField({ id: 'count', type: 'number', defaultValue: 0, required: false }),
      ],
    });
    const result = executeSchema(schema, { name: 'Alice', count: 42 });
    expect(result.inputs.name).toBe('Alice');
    expect(result.inputs.count).toBe(42);
  });

  it('executes logic nodes and produces outputs', () => {
    const schema = makeSchema({
      fields: [
        makeField({ id: 'x', type: 'number', label: 'X', required: true }),
        makeField({ id: 'y', type: 'number', label: 'Y', required: true }),
      ],
      logicNodes: [
        {
          id: 'sum',
          name: 'Sum',
          code: 'return x + y',
          inputs: ['x', 'y'],
          outputs: ['total'],
          version: 1,
        },
      ],
    });
    const result = executeSchema(schema, { x: 10, y: 20 });
    expect(result.errors).toHaveLength(0);
    expect(result.outputs.total).toBe(30);
  });

  it('handles multiple logic nodes in sequence', () => {
    const schema = makeSchema({
      fields: [
        makeField({ id: 'val', type: 'number', label: 'Value', required: true }),
      ],
      logicNodes: [
        {
          id: 'double',
          name: 'Double',
          code: 'return val * 2',
          inputs: ['val'],
          outputs: ['doubled'],
          version: 1,
        },
        {
          id: 'add10',
          name: 'Add 10',
          code: 'return doubled + 10',
          inputs: ['doubled'],
          outputs: ['final'],
          version: 1,
        },
      ],
    });
    const result = executeSchema(schema, { val: 5 });
    expect(result.errors).toHaveLength(0);
    expect(result.outputs.doubled).toBe(10);
    expect(result.outputs.final).toBe(20);
  });

  it('collects errors from failing logic nodes but continues execution', () => {
    const schema = makeSchema({
      fields: [makeField({ id: 'x', type: 'number', label: 'X' })],
      logicNodes: [
        {
          id: 'fail',
          name: 'Fail',
          code: 'throw new Error("first node error")',
          inputs: [],
          outputs: [],
          version: 1,
        },
        {
          id: 'ok',
          name: 'OK',
          code: 'return x + 1',
          inputs: ['x'],
          outputs: ['result'],
          version: 1,
        },
      ],
    });
    const result = executeSchema(schema, { x: 100 });
    expect(result.errors.length).toBeGreaterThanOrEqual(1);
    expect(result.errors.some((e: string) => e.includes('first node error'))).toBe(true);
    expect(result.outputs.result).toBe(101);
  });

  it('handles empty values gracefully', () => {
    const schema = makeSchema({
      fields: [
        makeField({ id: 'name', type: 'text', label: 'Name', required: false }),
        makeField({ id: 'count', type: 'number', label: 'Count', required: false }),
      ],
    });
    const result = executeSchema(schema, { name: '', count: null });
    expect(result.errors).toHaveLength(0);
    expect(result.inputs.name).toBe('');
    expect(result.inputs.count).toBeNull();
  });

  it('executes async logic nodes', async () => {
    const { executeSchemaAsync } = await import('@/engine/schemaEngine');
    const schema = makeSchema({
      fields: [makeField({ id: 'x', type: 'number', label: 'X', required: true })],
      logicNodes: [
        {
          id: 'async',
          name: 'Async',
          code: 'return await Promise.resolve(x * 2)',
          inputs: ['x'],
          outputs: ['result'],
          version: 1,
        },
      ],
    });
    const result = await executeSchemaAsync(schema, { x: 21 });
    expect(result.errors).toHaveLength(0);
    expect(result.outputs.result).toBe(42);
  });
});

// ===========================================================================
// 3. promptToSchema — Sample Prompt Tests
// ===========================================================================

describe('promptToSchema — Sample Prompts', () => {
  it('parses a registration form prompt correctly', () => {
    const result = parsePrompt('Create a registration form with name, email, and password');
    expect(result.appName).toBeTruthy();
    expect(result.appName.toLowerCase()).toMatch(/form/);
    expect(result.fields.length).toBeGreaterThanOrEqual(3);

    const labels = result.fields.map(f => f.label.toLowerCase());
    expect(labels.some(l => l.includes('name'))).toBe(true);
    expect(labels.some(l => l.includes('email'))).toBe(true);
  });

  it('parses a calculator prompt with number fields', () => {
    const result = parsePrompt('Build a basic calculator for math operations');
    expect(result.appName).toBeTruthy();
    const numberFields = result.fields.filter(f => f.type === 'number');
    expect(numberFields.length).toBeGreaterThanOrEqual(1);
  });

  it('parses a survey prompt with rating and selects', () => {
    const result = parsePrompt('Customer satisfaction survey with feedback and rating');
    expect(result.appName).toBeTruthy();
    expect(result.fields.length).toBeGreaterThanOrEqual(1);
  });

  it('parses a budget tracker prompt', () => {
    const result = parsePrompt('Track my monthly budget and expenses');
    expect(result.appName.toLowerCase()).toMatch(/budget/);
    expect(result.fields.length).toBeGreaterThanOrEqual(1);
  });

  it('parses a todo list prompt', () => {
    const result = parsePrompt('A simple todo list for daily tasks');
    expect(result.appName.toLowerCase()).toMatch(/task|todo/i);
    const textFields = result.fields.filter(f => f.type === 'text');
    expect(textFields.length).toBeGreaterThanOrEqual(1);
  });

  it('parses a journal prompt', () => {
    const result = parsePrompt('A daily journal for personal reflection');
    expect(result.appName.toLowerCase()).toMatch(/journal/);
    const textareaFields = result.fields.filter(f => f.type === 'textarea');
    expect(textareaFields.length).toBeGreaterThanOrEqual(1);
  });

  it('parses a counter prompt', () => {
    const result = parsePrompt('A simple click counter');
    expect(result.appName.toLowerCase()).toMatch(/counter/);
  });

  it('parses a validator prompt', () => {
    const result = parsePrompt('An input validator that checks email format');
    expect(result.appName.toLowerCase()).toMatch(/validator/);
  });

  it('parses a QR generator prompt', () => {
    const result = parsePrompt('A QR code generator');
    expect(result.appName.toLowerCase()).toMatch(/generator|qr/i);
  });

  it('handles prompts with special characters', () => {
    const result = parsePrompt('Create a @form! with #name, $email, and %password!!!');
    expect(result.fields.length).toBeGreaterThanOrEqual(1);
    expect(result.appName).toBeTruthy();
  });

  it('handles very long prompts gracefully', () => {
    const longPrompt = 'I need an app that tracks ' + 'everything '.repeat(50);
    const result = parsePrompt(longPrompt);
    expect(result.fields.length).toBeGreaterThanOrEqual(1);
    expect(result.appName).toBeTruthy();
  });

  it('handles minimal prompts gracefully', () => {
    const result = parsePrompt('app');
    expect(result.fields.length).toBeGreaterThanOrEqual(1);
    expect(result.appName).toBeTruthy();
  });

  it('does not exceed 4 fields in fallback mode', () => {
    const result = parsePrompt(
      'Create a form with number count amount age price quantity ' +
      'score rating and category select option status priority level ' +
      'date birthday and comment feedback notes description message'
    );
    expect(result.fields.length).toBeLessThanOrEqual(4);
  });

  it('generates valid FieldSchema for each parsed field', () => {
    const result = parsePrompt('Contact form with name, email, phone, and message');
    for (const field of result.fields) {
      expect(field.id).toBeTruthy();
      expect(field.type).toBeTruthy();
      expect(field.label).toBeTruthy();
      expect(typeof field.required).toBe('boolean');
    }
  });
});

// ===========================================================================
// 4. Navigation UI Integration — Claymorphism v3 on Navigation Components
// ===========================================================================

describe('Navigation UI Integration — Claymorphism v3', () => {
  const navSource = readFileSync(
    path.join(repoRoot, 'src', 'components', 'landing', 'Navbar.tsx'),
    'utf8'
  );
  const buttonSource = readFileSync(
    path.join(repoRoot, 'src', 'components', 'ui', 'button.tsx'),
    'utf8'
  );
  const landingSource = readFileSync(path.join(repoRoot, 'src', 'app', 'page.tsx'), 'utf8');
  const css = readFileSync(path.join(repoRoot, 'src', 'app', 'globals.css'), 'utf8');

  describe('Navigation components', () => {
    it('Navbar renders links from DB-driven content service, not hardcoded hrefs', () => {
      // Links are read from IndexedDB through the content service (which wraps
      // contentRepo with SWR caching + batch reads), never hardcoded in JSX.
      expect(navSource).toMatch(/contentService\.getContent<NavLink\[\]>\(['"]nav-links['"]\)/);
      expect(navSource).toMatch(/regularLinks\.map/);
    });

    it('Navbar uses clay design tokens (clay-card bg + raised/inset shadows)', () => {
      expect(navSource).toMatch(/var\(--clay-card\)/);
      // raised shadow (mengembung) on the nav bar
      expect(navSource).toMatch(/8px_8px_16px_var\(--clay-shadow-dark\)/);
      // inset (pressed) hover state on nav links
      expect(navSource).toMatch(/inset_3px_3px_7px_var\(--clay-shadow-dark\)/);
    });

    it('landing CTAs use the clay Button component (clay-button class)', () => {
      expect(landingSource).toMatch(/<Button/);
      expect(buttonSource).toMatch(/clay-button/);
      expect(buttonSource).toMatch(/text-clay-foreground/); // #4A3F35, not black
    });
  });

  describe('Computed-style design system rules (globals.css)', () => {
    it('button hover scale transform 1.03 and pressed 0.96 with inset shadow', () => {
      expect(css).toMatch(/\.clay-button:hover\s*\{[^}]*transform:\s*scale\(1\.03\)/);
      expect(css).toMatch(/\.clay-button:active\s*\{[^}]*transform:\s*scale\(0\.96\)/);
      expect(css).toMatch(/\.clay-button:active\s*\{[^}]*inset/);
    });

    it('input has inset (carved-in) shadow', () => {
      expect(css).toMatch(/\.clay-input\s*\{[^}]*inset/);
    });

    it('large border radii: 28-36px elements, 20-24px buttons, 18-22px inputs, 999px badges', () => {
      expect(css).toMatch(/\.clay\s*\{[^}]*border-radius:\s*28px/);
      expect(css).toMatch(/\.clay-lg\s*\{[^}]*border-radius:\s*32px/);
      expect(css).toMatch(/\.clay-button\s*\{[^}]*border-radius:\s*20px/);
      expect(css).toMatch(/\.clay-input\s*\{[^}]*border-radius:\s*18px/);
      expect(css).toMatch(/\.clay-badge\s*\{[^}]*border-radius:\s*999px/);
    });

    it('Fredoka rounded font is loaded as --font-sans', () => {
      expect(css).toMatch(/--font-sans:\s*var\(--font-fredoka\)/);
    });

    it('text color is #4A3F35 (warm dark brown), never black #000', () => {
      expect(css).toMatch(/--foreground:\s*#4A3F35/i);
      expect(css).toMatch(/--clay-foreground:\s*#4A3F35/i);
      const blackUses = css.match(/(?:color|--[\w-]+-foreground):\s*#0{3,6}\b/gi) || [];
      expect(blackUses).toEqual([]);
    });
  });
});

// ===========================================================================
// 5. Real DB Seed Data Validation (sampleApps → IndexedDB)
//    sampleApps is the exact dataset seedDatabase() writes to IndexedDB —
//    validating it guarantees every app users see passes FieldSchema rules.
// ===========================================================================

describe('DB Seed Data Validation (sampleApps)', () => {
  const validTypes = [
    'text', 'number', 'select', 'checkbox', 'textarea', 'date',
    'file', 'slider', 'toggle', 'heading', 'paragraph', 'divider',
    'spacer', 'image', 'card', 'button', 'color', 'email', 'phone',
    'url', 'rating',
  ];

  it('seeds a non-empty set of apps with complete metadata', () => {
    expect(sampleApps.length).toBeGreaterThan(0);
    for (const app of sampleApps) {
      expect(app.id).toBeTruthy();
      expect(app.name).toBeTruthy();
      expect(app.fields.length).toBeGreaterThan(0);
    }
  });

  it('every field in every seed app has valid type, non-empty id, label, and boolean required', () => {
    let fieldCount = 0;
    for (const app of sampleApps) {
      for (const field of app.fields) {
        fieldCount++;
        expect(validTypes).toContain(field.type);
        expect(field.id).toBeTruthy();
        expect(typeof field.id).toBe('string');
        expect(field.label).toBeTruthy();
        expect(field.label.length).toBeGreaterThan(2);
        expect(typeof field.required).toBe('boolean');
      }
    }
    expect(fieldCount).toBeGreaterThan(0);
  });

  it('select fields in seed data define a non-empty options array', () => {
    for (const app of sampleApps) {
      for (const field of app.fields) {
        if (field.type === 'select') {
          expect(Array.isArray(field.options)).toBe(true);
          expect(field.options!.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('executeSchema runs on every seed app without crashing', () => {
    for (const app of sampleApps) {
      const result = executeSchema(app, {});
      expect(result).toHaveProperty('inputs');
      expect(result).toHaveProperty('outputs');
      expect(result).toHaveProperty('errors');
      expect(Array.isArray(result.errors)).toBe(true);
    }
  });

  it('executeSchema flags required (non-defaulted) fields on seed apps when input is empty', () => {
    const app = sampleApps.find(a => a.fields.some(f => f.required && f.defaultValue === undefined));
    expect(app).toBeTruthy();
    const requiredFields = app!.fields.filter(f => f.required && f.defaultValue === undefined);
    const result = executeSchema(app!, {});
    for (const field of requiredFields) {
      expect(result.errors.some(e => String(e).includes(field.label))).toBe(true);
    }
  });
});
