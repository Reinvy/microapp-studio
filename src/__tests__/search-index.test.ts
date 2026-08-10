/**
 * search-index.test.ts — Unit tests for the IndexedDB search-index helpers.
 *
 * Covers the pure normalization logic behind the `nameLower` optimization:
 * - buildSearchName: lowercase/trim normalization
 * - withSearchIndex: attaches the denormalized key without mutating the input
 */

import { describe, it, expect } from 'vitest';
import {
  buildSearchName,
  withSearchIndex,
  tokenizeQuery,
  appMatchesTokens,
} from '@/lib/searchIndex';
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

describe('tokenizeQuery', () => {
  it('lowercases and splits on whitespace', () => {
    expect(tokenizeQuery('Todo List')).toEqual(['todo', 'list']);
    expect(tokenizeQuery('  Budget   Tracker ')).toEqual([
      'budget',
      'tracker',
    ]);
  });

  it('keeps single-character tokens (one-letter queries are valid)', () => {
    expect(tokenizeQuery('a')).toEqual(['a']);
    expect(tokenizeQuery('a b')).toEqual(['a', 'b']);
  });

  it('returns an empty array for empty or whitespace-only queries', () => {
    expect(tokenizeQuery('')).toEqual([]);
    expect(tokenizeQuery('   ')).toEqual([]);
  });

  it('handles undefined and null gracefully', () => {
    expect(tokenizeQuery(undefined as unknown as string)).toEqual([]);
    expect(tokenizeQuery(null as unknown as string)).toEqual([]);
  });
});

describe('appMatchesTokens', () => {
  const app = makeApp({
    name: 'Todo List Pro',
    description: 'Manage daily tasks',
  });

  it('matches when every token appears in the name', () => {
    expect(appMatchesTokens(app, ['todo', 'list'])).toBe(true);
  });

  it('matches tokens spread across name and description (AND semantics)', () => {
    expect(appMatchesTokens(app, ['todo', 'tasks'])).toBe(true);
    expect(appMatchesTokens(app, ['list', 'daily'])).toBe(true);
  });

  it('fails when any single token is missing', () => {
    expect(appMatchesTokens(app, ['todo', 'xyz'])).toBe(false);
    expect(appMatchesTokens(app, ['budget', 'list'])).toBe(false);
  });

  it('matches an empty token list (empty query = all apps)', () => {
    expect(appMatchesTokens(app, [])).toBe(true);
  });

  it('falls back to buildSearchName when nameLower is missing (legacy records)', () => {
    const legacy = makeApp({ name: 'Event RSVP' }); // no nameLower set
    expect(appMatchesTokens(legacy, ['event'])).toBe(true);
    expect(appMatchesTokens(legacy, ['event', 'rsvp'])).toBe(true);
  });

  it('matches descriptions case-insensitively', () => {
    const lower = makeApp({ name: 'X', description: 'DAILY Tasks' });
    expect(appMatchesTokens(lower, ['daily'])).toBe(true);
  });

  it('handles missing descriptions gracefully', () => {
    const noDesc = makeApp({ name: 'Calculator', description: '' });
    expect(appMatchesTokens(noDesc, ['calculator'])).toBe(true);
    expect(appMatchesTokens(noDesc, ['calculator', 'math'])).toBe(false);
  });
});
