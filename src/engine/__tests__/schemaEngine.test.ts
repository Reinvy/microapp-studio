/**
 * Tests for schemaEngine.ts — Field Validation & Schema Execution
 *
 * Covers:
 * - validateField: required checks, type-specific validation, edge cases
 * - executeSchema: full schema execution with logic nodes
 * - executeSchemaAsync: async variant
 * - validateSchemaInputs: quick validation helper
 */
import { describe, it, expect } from 'vitest';
import {
  validateField,
  executeSchema,
  executeSchemaAsync,
  validateSchemaInputs,
} from '@/engine/schemaEngine';
import type { FieldSchema, AppSchema } from '@/types/schema';

// Helper: minimal FieldSchema for testing
function makeField(overrides: Partial<FieldSchema> = {}): FieldSchema {
  return {
    id: 'f1',
    type: 'text',
    label: 'Test Field',
    required: false,
    ...overrides,
  };
}

// Helper: minimal AppSchema
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

describe('schemaEngine — validateField', () => {
  describe('Required field validation', () => {
    it('returns error for required field with undefined value', () => {
      const field = makeField({ required: true });
      expect(validateField(field, undefined)).toBe('Test Field is required');
    });

    it('returns error for required field with null value', () => {
      const field = makeField({ required: true });
      expect(validateField(field, null)).toBe('Test Field is required');
    });

    it('returns error for required text field with empty string', () => {
      const field = makeField({ required: true, type: 'text' });
      expect(validateField(field, '')).toBe('Test Field is required');
    });

    it('returns error for required number field with NaN', () => {
      const field = makeField({ required: true, type: 'number' });
      expect(validateField(field, NaN)).toBe('Test Field must be a valid number');
    });

    it('returns null for required field with valid value', () => {
      const field = makeField({ required: true, type: 'text' });
      expect(validateField(field, 'hello')).toBeNull();
    });

    it('returns null for non-required field with undefined value', () => {
      const field = makeField({ required: false });
      expect(validateField(field, undefined)).toBeNull();
    });

    it('returns error for required checkbox with false value', () => {
      const field = makeField({
        required: true,
        type: 'checkbox',
        label: 'I agree',
      });
      expect(validateField(field, false)).toBe('I agree must be checked');
    });

    it('returns null for required checkbox with true value', () => {
      const field = makeField({
        required: true,
        type: 'checkbox',
        label: 'I agree',
      });
      expect(validateField(field, true)).toBeNull();
    });

    it('returns error for required file field with null', () => {
      const field = makeField({
        required: true,
        type: 'file',
        label: 'Upload',
      });
      expect(validateField(field, null)).toBe('Upload is required');
    });

    it('accepts truthy file value', () => {
      const field = makeField({
        type: 'file',
        label: 'Upload',
      });
      expect(validateField(field, new File([''], 'test.txt'))).toBeNull();
    });
  });

  describe('Text field validation', () => {
    it('validates minLength constraint', () => {
      const field = makeField({
        type: 'text',
        validation: { minLength: 6, message: 'Too short' },
      });
      expect(validateField(field, 'abc')).toBe('Too short');
    });

    it('validates maxLength constraint', () => {
      const field = makeField({
        type: 'text',
        validation: { maxLength: 5, message: 'Too long' },
      });
      expect(validateField(field, 'abcdef')).toBe('Too long');
    });

    it('validates pattern constraint', () => {
      const field = makeField({
        type: 'text',
        validation: {
          pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',
          message: 'Invalid email',
        },
      });
      expect(validateField(field, 'not-an-email')).toBe('Invalid email');
      expect(validateField(field, 'user@example.com')).toBeNull();
    });

    it('skips pattern validation when regex is invalid', () => {
      const field = makeField({
        type: 'text',
        validation: { pattern: '[invalid', message: 'bad' },
      });
      // Should not throw — gracefully skips
      expect(validateField(field, 'anything')).toBeNull();
    });
  });

  describe('Number field validation', () => {
    it('returns error for non-numeric string', () => {
      const field = makeField({ type: 'number' });
      expect(validateField(field, 'abc')).toBe('Test Field must be a valid number');
    });

    it('validates min constraint', () => {
      const field = makeField({ type: 'number', min: 10 });
      expect(validateField(field, 5)).toBe('Test Field must be at least 10');
    });

    it('validates max constraint', () => {
      const field = makeField({ type: 'number', max: 100 });
      expect(validateField(field, 150)).toBe('Test Field must be no more than 100');
    });

    it('validates step constraint', () => {
      const field = makeField({ type: 'number', step: 0.5, min: 0 });
      expect(validateField(field, 1.2)).toBe(
        'Test Field must be in increments of 0.5'
      );
      expect(validateField(field, 1.5)).toBeNull();
    });

    it('accepts valid number within range', () => {
      const field = makeField({ type: 'number', min: 0, max: 100 });
      expect(validateField(field, 42)).toBeNull();
    });
  });

  describe('Select field validation', () => {
    it('validates value is one of the options', () => {
      const field = makeField({
        type: 'select',
        options: ['Option A', 'Option B', 'Option C'],
      });
      expect(validateField(field, 'Option D')).toBe(
        'Test Field must be one of: Option A, Option B, Option C'
      );
    });

    it('accepts valid option (case-insensitive)', () => {
      const field = makeField({
        type: 'select',
        options: ['Option A', 'Option B'],
      });
      expect(validateField(field, 'option a')).toBeNull();
    });

    it('returns null when select has no options', () => {
      const field = makeField({ type: 'select', options: [] });
      expect(validateField(field, 'anything')).toBeNull();
    });
  });

  describe('Date field validation', () => {
    it('rejects invalid date strings', () => {
      const field = makeField({ type: 'date' });
      expect(validateField(field, 'not-a-date')).toBe(
        'Test Field must be a valid date'
      );
    });

    it('accepts valid date strings', () => {
      const field = makeField({ type: 'date' });
      expect(validateField(field, '2024-01-15')).toBeNull();
      expect(validateField(field, 'Jan 15, 2024')).toBeNull();
    });
  });

  describe('Checkbox / toggle validation', () => {
    it('passes any truthy/falsy value for checkbox', () => {
      const field = makeField({ type: 'checkbox' });
      expect(validateField(field, true)).toBeNull();
      expect(validateField(field, false)).toBeNull();
    });
  });

  describe('Slider / number type validation', () => {
    it('validates slider as number type', () => {
      const field = makeField({
        type: 'slider',
        min: 0,
        max: 100,
        step: 10,
      });
      expect(validateField(field, 50)).toBeNull();
      expect(validateField(field, 55)).toBe(
        'Test Field must be in increments of 10'
      );
    });
  });

  describe('Textarea type validation', () => {
    it('validates textarea with minLength constraint', () => {
      const field = makeField({
        type: 'textarea',
        validation: { minLength: 10, message: 'Too short' },
      });
      expect(validateField(field, 'short')).toBe('Too short');
      expect(validateField(field, 'long enough text')).toBeNull();
    });

    it('validates textarea with pattern constraint', () => {
      const field = makeField({
        type: 'textarea',
        validation: {
          pattern: '^[A-Z].*',
          message: 'Must start with uppercase',
        },
      });
      expect(validateField(field, 'lowercase start')).toBe(
        'Must start with uppercase'
      );
      expect(validateField(field, 'Uppercase start')).toBeNull();
    });
  });

  describe('Toggle type validation', () => {
    it('validates toggle type like checkbox', () => {
      const field = makeField({
        type: 'toggle',
        required: true,
        label: 'Enable feature',
      });
      expect(validateField(field, true)).toBeNull();
      expect(validateField(field, false)).toBe(
        'Enable feature must be checked'
      );
    });
  });

  describe('Email field validation', () => {
    it('rejects invalid email format', () => {
      const field = makeField({ type: 'email', label: 'Email' });
      expect(validateField(field, 'not-an-email')).toBe('Email must be a valid email address');
      expect(validateField(field, '@domain.com')).toBe('Email must be a valid email address');
      expect(validateField(field, 'user@')).toBe('Email must be a valid email address');
      expect(validateField(field, 'user@.com')).toBe('Email must be a valid email address');
    });

    it('accepts valid email addresses', () => {
      const field = makeField({ type: 'email', label: 'Email' });
      expect(validateField(field, 'user@example.com')).toBeNull();
      expect(validateField(field, 'test.name+tag@domain.co.uk')).toBeNull();
      expect(validateField(field, 'a@b.io')).toBeNull();
    });

    it('rejects empty email for required field', () => {
      const field = makeField({ type: 'email', label: 'Email', required: true });
      expect(validateField(field, '')).toBe('Email is required');
    });
  });

  describe('Phone field validation', () => {
    it('rejects invalid phone formats', () => {
      const field = makeField({ type: 'phone', label: 'Phone' });
      expect(validateField(field, 'abc')).toBe('Phone must be a valid phone number');
      expect(validateField(field, '123')).toBe('Phone must be a valid phone number');
    });

    it('accepts valid phone numbers', () => {
      const field = makeField({ type: 'phone', label: 'Phone' });
      expect(validateField(field, '+1-555-555-5555')).toBeNull();
      expect(validateField(field, '(555) 123-4567')).toBeNull();
      expect(validateField(field, '+628123456789')).toBeNull();
      expect(validateField(field, '5551234567')).toBeNull();
    });
  });

  describe('URL field validation', () => {
    it('rejects invalid URLs', () => {
      const field = makeField({ type: 'url', label: 'Website' });
      expect(validateField(field, 'not-a-url')).toBe('Website must be a valid URL');
      expect(validateField(field, 'http://')).toBe('Website must be a valid URL');
    });

    it('accepts valid URLs', () => {
      const field = makeField({ type: 'url', label: 'Website' });
      expect(validateField(field, 'https://example.com')).toBeNull();
      expect(validateField(field, 'http://sub.domain.com/path?q=1')).toBeNull();
      expect(validateField(field, 'https://example.com:8080/path')).toBeNull();
    });
  });

  describe('Color field validation', () => {
    it('rejects invalid color values', () => {
      const field = makeField({ type: 'color', label: 'Color' });
      expect(validateField(field, 'red')).toBe('Color must be a valid hex color');
      expect(validateField(field, '#GGG')).toBe('Color must be a valid hex color');
      expect(validateField(field, '#12345')).toBe('Color must be a valid hex color');
    });

    it('accepts valid hex color values', () => {
      const field = makeField({ type: 'color', label: 'Color' });
      expect(validateField(field, '#FF5733')).toBeNull(); // 6-char
      expect(validateField(field, '#FFF')).toBeNull(); // 3-char
      expect(validateField(field, '#aabbcc')).toBeNull(); // lowercase
      expect(validateField(field, '#A1B2C3')).toBeNull(); // mixed
    });
  });

  describe('Rating field validation', () => {
    it('rejects ratings outside valid range', () => {
      const field = makeField({ type: 'rating', label: 'Rating', min: 0, max: 5 });
      expect(validateField(field, -1)).toBe('Rating must be at least 0');
      expect(validateField(field, 6)).toBe('Rating must be no more than 5');
    });

    it('accepts ratings within valid range', () => {
      const field = makeField({ type: 'rating', label: 'Rating', min: 0, max: 5 });
      expect(validateField(field, 0)).toBeNull();
      expect(validateField(field, 3)).toBeNull();
      expect(validateField(field, 5)).toBeNull();
    });

    it('handles decimal ratings', () => {
      const field = makeField({ type: 'rating', label: 'Rating', min: 0, max: 5, step: 0.5 });
      expect(validateField(field, 3.5)).toBeNull();
      expect(validateField(field, 3.7)).toBe('Rating must be in increments of 0.5');
    });

    it('rejects non-numeric ratings', () => {
      const field = makeField({ type: 'rating', label: 'Rating' });
      expect(validateField(field, 'good')).toBe('Rating must be a valid number');
    });
  });
});

describe('schemaEngine — executeSchema', () => {
  it('returns inputs, outputs, and errors for empty schema', () => {
    const schema = makeSchema();
    const result = executeSchema(schema, {});

    expect(result).toHaveProperty('inputs');
    expect(result).toHaveProperty('outputs');
    expect(result).toHaveProperty('errors');
    expect(result.errors).toEqual([]);
  });

  it('validates required fields and returns errors', () => {
    const schema = makeSchema({
      fields: [
        makeField({ id: 'name', label: 'Name', required: true }),
      ],
    });
    const result = executeSchema(schema, {});

    expect(result.errors).toContain('Name is required');
  });

  it('applies default values for missing optional fields', () => {
    const schema = makeSchema({
      fields: [
        makeField({
          id: 'count',
          label: 'Count',
          type: 'number',
          defaultValue: 0,
          required: false,
        }),
      ],
    });
    const result = executeSchema(schema, {});

    expect(result.inputs.count).toBe(0);
  });

  it('executes logic nodes and merges outputs', () => {
    const schema = makeSchema({
      fields: [
        makeField({ id: 'x', label: 'X', type: 'number', required: true }),
      ],
      logicNodes: [
        {
          id: 'double',
          name: 'Double',
          code: 'return x * 2',
          inputs: ['x'],
          outputs: ['result'],
          version: 1,
        },
      ],
    });
    const result = executeSchema(schema, { x: 5 });

    expect(result.errors).toHaveLength(0);
    expect(result.outputs.result).toBe(10);
  });

  it('captures errors from failing logic nodes', () => {
    const schema = makeSchema({
      fields: [makeField({ id: 'x', label: 'X', type: 'number' })],
      logicNodes: [
        {
          id: 'crash',
          name: 'Crash Node',
          code: 'throw new Error("intentional failure")',
          inputs: [],
          outputs: ['result'],
          version: 1,
        },
      ],
    });
    const result = executeSchema(schema, { x: 1 });

    expect(result.errors.length).toBeGreaterThanOrEqual(1);
    expect(result.errors[0]).toMatch(/intentional failure/);
  });

  it('continues executing subsequent nodes after a node error', () => {
    const schema = makeSchema({
      fields: [makeField({ id: 'x', label: 'X', type: 'number' })],
      logicNodes: [
        {
          id: 'fail',
          name: 'Fail',
          code: 'throw new Error("fail")',
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
    const result = executeSchema(schema, { x: 10 });

    // First node fails, but execution continues
    expect(result.errors.length).toBeGreaterThanOrEqual(1);
    expect(result.outputs.result).toBe(11);
  });

  it('handles single output mapping', () => {
    const schema = makeSchema({
      fields: [
        { id: 'a', type: 'number', label: 'A', required: true },
        { id: 'b', type: 'number', label: 'B', required: true },
      ],
      logicNodes: [
        {
          id: 'add',
          name: 'Add',
          code: 'return a + b',
          inputs: ['a', 'b'],
          outputs: ['sum'],
          version: 1,
        },
      ],
    });
    const result = executeSchema(schema, { a: 3, b: 7 });

    expect(result.outputs.sum).toBe(10);
  });

  it('handles multiple outputs from an array result', () => {
    const schema = makeSchema({
      fields: [
        { id: 'first', type: 'text', label: 'First', required: true },
        { id: 'last', type: 'text', label: 'Last', required: true },
      ],
      logicNodes: [
        {
          id: 'split',
          name: 'Split',
          code: 'return [first, last]',
          inputs: ['first', 'last'],
          outputs: ['out1', 'out2'],
          version: 1,
        },
      ],
    });
    const result = executeSchema(schema, { first: 'a', last: 'b' });

    expect(result.outputs.out1).toBe('a');
    expect(result.outputs.out2).toBe('b');
  });

  it('handles multiple outputs from an object result', () => {
    const schema = makeSchema({
      fields: [],
      logicNodes: [
        {
          id: 'process',
          name: 'Process',
          code: 'return { min: 1, max: 10 }',
          inputs: [],
          outputs: ['min', 'max'],
          version: 1,
        },
      ],
    });
    const result = executeSchema(schema, {});

    expect(result.outputs.min).toBe(1);
    expect(result.outputs.max).toBe(10);
  });
});

describe('schemaEngine — executeSchemaAsync', () => {
  it('supports async node execution', async () => {
    const schema = makeSchema({
      fields: [],
      logicNodes: [
        {
          id: 'async',
          name: 'Async Node',
          code: 'const val = await Promise.resolve(42); return val',
          inputs: [],
          outputs: ['result'],
          version: 1,
        },
      ],
    });
    const result = await executeSchemaAsync(schema, {});

    expect(result.errors).toHaveLength(0);
    expect(result.outputs.result).toBe(42);
  });

  it('catches async errors gracefully', async () => {
    const schema = makeSchema({
      fields: [],
      logicNodes: [
        {
          id: 'bad',
          name: 'Bad Async',
          code: 'await Promise.reject(new Error("async fail"))',
          inputs: [],
          outputs: ['result'],
          version: 1,
        },
      ],
    });
    const result = await executeSchemaAsync(schema, {});

    expect(result.errors.length).toBeGreaterThanOrEqual(1);
    expect(result.errors[0]).toMatch(/async fail/);
  });
});

describe('schemaEngine — validateSchemaInputs', () => {
  it('returns empty array for valid inputs', () => {
    const schema = makeSchema({
      fields: [
        makeField({ id: 'name', required: true }),
      ],
    });
    const errors = validateSchemaInputs(schema, { name: 'John' });

    expect(errors).toHaveLength(0);
  });

  it('returns errors for invalid inputs', () => {
    const schema = makeSchema({
      fields: [
        makeField({ id: 'name', label: 'Name', required: true }),
      ],
    });
    const errors = validateSchemaInputs(schema, {});

    expect(errors).toContain('Name is required');
  });

  it('handles empty schema with no errors', () => {
    const schema = makeSchema({ fields: [] });
    const errors = validateSchemaInputs(schema, {});

    expect(errors).toHaveLength(0);
  });
});
