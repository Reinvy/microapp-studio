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

  describe('Pattern priority', () => {
    it('prefers calculator pattern over form when both keywords present', () => {
      const result = parsePrompt(
        'A calculator form for math calculations'
      );

      // Calculator pattern comes first in PATTERNS array — earlier match wins
      const numberFields = result.fields.filter((f) => f.type === 'number');
      expect(numberFields.length).toBeGreaterThanOrEqual(1);
    });
  });
});
