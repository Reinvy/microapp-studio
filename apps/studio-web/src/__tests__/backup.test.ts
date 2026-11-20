/**
 * backup.test.ts — Unit tests for the portable backup/restore logic.
 *
 * Covers the pure functions in src/lib/backup.ts:
 * - serializeBackup / parseBackup round-trip
 * - envelope format + version rejection
 * - validateAppRecord structural checks
 * - sanitizeAppRecord normalization + search-key backfill
 */

import { describe, it, expect } from 'vitest';
import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  serializeBackup,
  parseBackup,
  validateAppRecord,
  sanitizeAppRecord,
} from '@/lib/backup';
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

describe('serializeBackup / parseBackup', () => {
  it('round-trips apps through the portable JSON format', () => {
    const apps = [makeApp({ id: 'a', name: 'Alpha' }), makeApp({ id: 'b', name: 'Beta' })];
    const json = serializeBackup(apps, 1234567890);
    const parsed = parseBackup(json);

    expect(parsed.format).toBe(BACKUP_FORMAT);
    expect(parsed.version).toBe(BACKUP_VERSION);
    expect(parsed.exportedAt).toBe(1234567890);
    expect(parsed.apps).toHaveLength(2);
    expect(parsed.apps[0].name).toBe('Alpha');
    expect(parsed.apps[1].name).toBe('Beta');
  });

  it('rejects non-JSON input', () => {
    expect(() => parseBackup('not json at all')).toThrow('not valid JSON');
  });

  it('rejects files without the format marker', () => {
    expect(() => parseBackup(JSON.stringify({ apps: [] }))).toThrow('Not a MicroApp Studio backup');
  });

  it('rejects unknown future versions', () => {
    const json = JSON.stringify({
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION + 99,
      exportedAt: 1,
      apps: [],
    });
    expect(() => parseBackup(json)).toThrow('Unsupported backup version');
  });

  it('rejects missing apps array', () => {
    expect(() =>
      parseBackup(JSON.stringify({ format: BACKUP_FORMAT, version: BACKUP_VERSION }))
    ).toThrow('no "apps" array');
  });
});

describe('validateAppRecord', () => {
  it('accepts a well-formed record', () => {
    expect(validateAppRecord(makeApp())).toEqual([]);
  });

  it('flags non-object records', () => {
    expect(validateAppRecord(null)).toHaveLength(1);
    expect(validateAppRecord('nope')).toHaveLength(1);
  });

  it('flags missing required fields', () => {
    const problems = validateAppRecord({ id: 'x' });
    expect(problems.length).toBeGreaterThan(4);
    expect(problems.join(' ')).toContain('"name"');
    expect(problems.join(' ')).toContain('"fields"');
  });
});

describe('sanitizeAppRecord', () => {
  it('returns null for broken records', () => {
    expect(sanitizeAppRecord(null)).toBeNull();
    expect(sanitizeAppRecord({ id: 'no-name' })).toBeNull();
  });

  it('normalizes a valid record and backfills the search key', () => {
    const raw = makeApp({ name: 'Pizza Order Builder', version: 3 });
    const sanitized = sanitizeAppRecord(raw);

    expect(sanitized).not.toBeNull();
    expect(sanitized!.nameLower).toBe('pizza order builder');
    expect(sanitized!.version).toBe(3);
    expect(sanitized!.name).toBe('Pizza Order Builder');
  });

  it('drops invalid field entries but keeps valid ones', () => {
    const raw = makeApp({
      fields: [
        { id: 'f1', type: 'text', label: 'Name' },
        { id: 'f2', type: 'text', label: 'OK' },
        { type: 'number' }, // missing id → dropped
      ] as AppSchema['fields'],
    });
    const sanitized = sanitizeAppRecord(raw);
    expect(sanitized!.fields).toHaveLength(2);
  });

  it('defaults missing optional fields', () => {
    const raw = makeApp() as unknown as Record<string, unknown>;
    delete raw.version;
    delete raw.settings;
    const sanitized = sanitizeAppRecord(raw);
    expect(sanitized!.version).toBe(1);
    expect(sanitized!.settings).toBeUndefined();
  });
});
