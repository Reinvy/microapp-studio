import { describe, expect, it } from 'vitest';
import { defaultPreferences } from '@/features/preferences/defaults';
import { exportSettings, parseSettingsImport } from '../preferencesTransfer';

const current = { ...defaultPreferences('id-ID'), theme: 'light' as const };

describe('settings transfer', () => {
  it('round-trips preferences and reports the diff', () => {
    const next = { ...current, theme: 'dark' as const, textScale: 1.25 as const };
    const parsed = parseSettingsImport(JSON.parse(exportSettings(next)), current, 'id-ID');
    expect(parsed.ok).toBe(true);
    expect(parsed.preferences?.theme).toBe('dark');
    expect(parsed.diff.map((entry) => entry.field).sort()).toEqual(['textScale', 'theme']);
  });

  it('rejects unknown fields with E-SET-001', () => {
    const result = parseSettingsImport(
      { schemaVersion: 1, preferences: { theme: 'dark' }, extra: true },
      current,
      'id-ID',
    );
    expect(result).toMatchObject({ ok: false, code: 'E-SET-001' });
    expect(result.preferences).toBeNull();
  });

  it('rejects an unsupported version and any secret-shaped field', () => {
    expect(parseSettingsImport({ schemaVersion: 2, preferences: {} }, current, 'id-ID').code).toBe('E-SET-001');
    expect(
      parseSettingsImport({ schemaVersion: 1, preferences: { aiKey: 'sk-secret' } }, current, 'id-ID').code,
    ).toBe('E-SET-001');
    expect(parseSettingsImport({ schemaVersion: 1, preferences: { aiKeyLast4: 'abcd' } }, current, 'id-ID').ok).toBe(
      true,
    );
  });

  it('coerces invalid values to documented defaults instead of importing them', () => {
    const result = parseSettingsImport(
      { schemaVersion: 1, preferences: { theme: 'neon', textScale: 7, locale: 'fr-FR' } },
      current,
      'en-US',
    );
    expect(result.ok).toBe(true);
    expect(result.preferences).toMatchObject({ theme: 'system', textScale: 1, locale: 'en-US' });
  });
});
