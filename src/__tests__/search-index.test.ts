/**
 * search-index.test.ts — Unit tests for the IndexedDB search-index helpers.
 *
 * Covers the pure normalization logic behind the `nameLower` optimization:
 * - buildSearchName: lowercase/trim normalization
 * - withSearchIndex: attaches the denormalized key without mutating the input
 */

import { describe, it, expect } from 'vitest';
import { buildSearchName, withSearchIndex } from '@/lib/searchIndex';
import type { AppSchema } from '@/types/schema';

function makeApp(overrides: Partial<AppSchema> = {}): AppSchema {
  return {
    id: 'app1',
    name: 'Customer Feedback Form',
    description: 'A clay-styled feedback form',
    prompt: 'Create a feedback form',
    fields: [],
    logicNodes: [],
    layout: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: 1,
    ...overrides,
  };
}

describe('buildSearchName', () => {
  it('lowercases app names', () => {
    expect(buildSearchName('Pizza Order Builder')).toBe('pizza order builder');
    expect(buildSearchName('Daily MOOD Tracker')).toBe('daily mood tracker');
    expect(buildSearchName('Trivia Quiz Master')).toBe('trivia quiz master');
  });

  it('trims leading and trailing whitespace', () => {
    expect(buildSearchName('  Event RSVP  ')).toBe('event rsvp');
  });

  it('handles empty and undefined names gracefully', () => {
    expect(buildSearchName('')).toBe('');
    expect(buildSearchName(undefined as unknown as string)).toBe('');
    expect(buildSearchName(null as unknown as string)).toBe('');
  });
});

describe('withSearchIndex', () => {
  it('attaches a normalized nameLower key', () => {
    const indexed = withSearchIndex(makeApp({ name: 'Color Palette Explorer' }));
    expect(indexed.nameLower).toBe('color palette explorer');
  });

  it('does not mutate the original record', () => {
    const app = makeApp({ name: 'Customer Feedback Form' });
    const indexed = withSearchIndex(app);
    expect(app.nameLower).toBeUndefined();
    expect(indexed.id).toBe(app.id);
    expect(indexed.name).toBe(app.name);
  });

  it('keeps all other fields intact', () => {
    const app = makeApp({ version: 3, description: 'keep me' });
    const indexed = withSearchIndex(app);
    expect(indexed.version).toBe(3);
    expect(indexed.description).toBe('keep me');
  });
});
