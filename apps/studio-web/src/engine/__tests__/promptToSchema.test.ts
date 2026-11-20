/**
 * Tests for promptToSchema.ts — Pattern Recognition Engine
 *
 * Covers:
 * - Pattern matching (calculator, form, todo, survey, budget, etc.)
 * - Fallback detection (generic prompts)
 * - Field type detection from keywords
 * - Edge cases (empty text, unknown patterns, special characters)
 */
import { describe, it, expect } from 'vitest';

// The module uses @/ aliases — vitest.config.ts maps these
import parsePrompt from '@/engine/promptToSchema';

describe('promptToSchema — Pattern Recognition', () => {
  describe('Calculator pattern', () => {
    it('detects calculator keywords and builds number fields', () => {
      const result = parsePrompt('I need a calculator for basic math');

      expect(result.appName).toBeTruthy();
      expect(result.fields.length).toBeGreaterThanOrEqual(1);
      // Calculator produces number fields
      const numberFields = result.fields.filter((f) => f.type === 'number');
      expect(numberFields.length).toBeGreaterThanOrEqual(1);
    });

    it('adds operation select when transform keywords present', () => {
      const result = parsePrompt(
        'A calculator with operation conversion between units'
      );

      const selectFields = result.fields.filter((f) => f.type === 'select');
      expect(selectFields.length).toBeGreaterThanOrEqual(1);
      expect(selectFields[0].options).toContain('Add');
    });
  });

  describe('Form pattern', () => {
    it('builds form fields from registration prompts', () => {
      const result = parsePrompt(
        'Create a registration form with name, email, and password'
      );

      expect(result.appName).toMatch(/form/i);
      const labels = result.fields.map((f) => f.label.toLowerCase());
      expect(labels.some((l) => l.includes('name'))).toBe(true);
      expect(labels.some((l) => l.includes('email'))).toBe(true);
      expect(labels.some((l) => l.includes('password'))).toBe(true);
    });

    it('adds terms checkbox when agree/terms keywords present', () => {
      const result = parsePrompt(
        'Sign up form with name email and agree to terms'
      );

      const checkboxes = result.fields.filter((f) => f.type === 'checkbox');
      expect(checkboxes.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Todo pattern', () => {
    it('builds task list fields from todo prompts', () => {
      const result = parsePrompt('A simple todo list for daily tasks');

      expect(result.appName).toMatch(/task/i);
      const textFields = result.fields.filter((f) => f.type === 'text');
      expect(textFields.length).toBeGreaterThanOrEqual(1);
      expect(textFields[0].label).toMatch(/task/i);
    });

    it('adds priority select when important/priority keywords present', () => {
      const result = parsePrompt(
        'Todo list with priority levels for important tasks'
      );

      const selectFields = result.fields.filter((f) => f.type === 'select');
      expect(selectFields.length).toBeGreaterThanOrEqual(1);
      expect(selectFields[0].options).toContain('High');
    });
  });

  describe('Survey pattern', () => {
    it('builds survey fields with Likert scale options', () => {
      const result = parsePrompt(
        'Customer satisfaction survey with feedback'
      );

      const selectFields = result.fields.filter((f) => f.type === 'select');
      expect(selectFields.length).toBeGreaterThanOrEqual(1);
      expect(selectFields[0].options).toContain('Neutral');
    });
  });

  describe('Fallback / generic detection', () => {
    it('handles unknown prompts with fallback logic', () => {
      const result = parsePrompt(
        'Make something that tracks my daily water drinking habit'
      );

      // Fallback should still produce fields
      expect(result.fields.length).toBeGreaterThanOrEqual(1);
      expect(result.appName).toBeTruthy();
    });

    it('caps fallback fields at 4 maximum', () => {
      // A prompt with many field-type keywords
      const result = parsePrompt(
        'Create a form with number count amount age price quantity ' +
          'score rating and category select option status priority level ' +
          'date birthday and comment feedback notes description message'
      );

      expect(result.fields.length).toBeLessThanOrEqual(4);
    });

    it('handles empty or minimal prompts gracefully', () => {
      const result = parsePrompt('app');

      expect(result.fields.length).toBeGreaterThanOrEqual(1);
      expect(result.appName).toBeTruthy();
    });
  });

  describe('Keyword-based field typing', () => {
    it('detects number-related keywords in fallback mode', () => {
      // Use a prompt that doesn't match known patterns to hit fallback
      const result = parsePrompt(
        'A thing that tracks my age weight and height with a rating score'
      );

      const numberFields = result.fields.filter((f) => f.type === 'number');
      expect(numberFields.length).toBeGreaterThanOrEqual(1);
    });

    it('detects date keywords in fallback mode', () => {
      const result = parsePrompt(
        'A tracker for birthday deadline and schedule events'
      );

      const dateFields = result.fields.filter((f) => f.type === 'date');
      expect(dateFields.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Budget pattern', () => {
    it('detects budget keywords and builds expense fields', () => {
      const result = parsePrompt('Track my monthly budget and expenses');

      expect(result.appName).toMatch(/budget/i);
      const numberFields = result.fields.filter((f) => f.type === 'number');
      expect(numberFields.length).toBeGreaterThanOrEqual(1);
    });

    it('adds category select for budget prompts with category keywords', () => {
      const result = parsePrompt(
        'Budget tracker with spending category and cost tracking'
      );

      const selectFields = result.fields.filter((f) => f.type === 'select');
      expect(selectFields.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Counter pattern', () => {
    it('detects counter keywords and builds minimal fields', () => {
      const result = parsePrompt('A simple click counter');

      expect(result.appName).toMatch(/counter/i);
      expect(result.fields.length).toBeGreaterThanOrEqual(1);
    });

    it('detects timer prompts as counter pattern', () => {
      const result = parsePrompt('A countdown timer for workouts');

      expect(result.appName).toMatch(/timer/i);
    });
  });

  describe('Validator pattern', () => {
    it('detects validator keywords', () => {
      const result = parsePrompt(
        'An input validator that checks email format'
      );

      expect(result.appName).toMatch(/validator/i);
      expect(result.fields.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Journal / diary pattern', () => {
    it('detects journal keywords and builds textarea fields', () => {
      const result = parsePrompt('A daily journal for personal reflection');

      expect(result.appName).toMatch(/journal/i);
      const textareaFields = result.fields.filter(
        (f) => f.type === 'textarea'
      );
      expect(textareaFields.length).toBeGreaterThanOrEqual(1);
    });

    it('detects habit tracker prompts', () => {
      const result = parsePrompt('Track my daily habits and mood');

      const textareaFields = result.fields.filter(
        (f) => f.type === 'textarea'
      );
      expect(textareaFields.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Generator pattern', () => {
    it('detects generator keywords and builds appropriate fields', () => {
      const result = parsePrompt('A QR code generator');

      expect(result.appName).toMatch(/generator/i);
      expect(result.fields.length).toBeGreaterThanOrEqual(1);
    });

    it('detects converter prompts', () => {
      const result = parsePrompt('Unit converter for temperatures');

      expect(result.appName).toMatch(/converter/i);
    });

    it('detects creator/builder prompts as generator', () => {
      const result = parsePrompt('A password creator with special chars');

      expect(result.fields.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Edge cases', () => {
    it('handles prompts with special characters gracefully', () => {
      const result = parsePrompt(
        'Create a @form! with #name, $email, and %password!!!'
      );

      expect(result.fields.length).toBeGreaterThanOrEqual(1);
      expect(result.appName).toBeTruthy();
    });

    it('handles very long prompts without crashing', () => {
      const longPrompt =
        'I need an app that tracks ' + 'everything '.repeat(50);
      const result = parsePrompt(longPrompt);

      expect(result.fields.length).toBeGreaterThanOrEqual(1);
      expect(result.appName).toBeTruthy();
    });

    it('extracts field types from mixed keyword prompts (fallback)', () => {
      const result = parsePrompt(
        'Something that logs date selection and number count'
      );

      const types = result.fields.map((f) => f.type);
      expect(types).toContain('date');
      expect(types).toContain('number');
    });
  });

  describe('Pattern priority', () => {
    it('prefers calculator pattern over form when both keywords present', () => {
      const result = parsePrompt(
        'A calculator form for math calculations'
      );

      expect(result.appName).toMatch(/calculator/i);
      const numberFields = result.fields.filter((f) => f.type === 'number');
      expect(numberFields.length).toBeGreaterThanOrEqual(1);
    });
  });
});
