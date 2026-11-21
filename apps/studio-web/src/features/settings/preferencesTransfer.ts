/**
 * Settings transfer.
 *
 * Preferences only — never secrets, never the vault, never app data. The export is
 * `{schemaVersion:1, preferences}`; the import rejects anything else, including
 * unknown fields, with `E-SET-001` and applies nothing.
 */

import { parsePreferences, type Preferences } from '@/features/preferences/types';
import type { Locale } from '@/i18n';

export const SETTINGS_SCHEMA_VERSION = 1;

export interface SettingsExport {
  schemaVersion: typeof SETTINGS_SCHEMA_VERSION;
  preferences: Preferences;
}

const ALLOWED_KEYS = new Set(['schemaVersion', 'preferences']);

/**
 * Keys that must never appear in a settings transfer.
 * `aiKeyLast4` is the only key-shaped preference we ship: it is a display suffix,
 * not a secret, so it is explicitly allowed.
 */
const SECRET_KEYS = /(key|secret|token|passphrase|mnemonic|pin|cookie|authorization)/i;
const ALLOWED_KEY_SHAPED = new Set(['aiKeyLast4']);

export function exportSettings(preferences: Preferences): string {
  const payload: SettingsExport = {
    schemaVersion: SETTINGS_SCHEMA_VERSION,
    // The AI key itself never lives in preferences; only its last four digits do.
    preferences: { ...preferences },
  };
  return JSON.stringify(payload, null, 2);
}

export interface SettingsImportResult {
  ok: boolean;
  code: 'E-SET-001' | null;
  message: string | null;
  preferences: Preferences | null;
  /** Field-level differences, shown before the user applies the import. */
  diff: Array<{ field: string; from: unknown; to: unknown }>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseSettingsImport(raw: unknown, current: Preferences, locale: Locale): SettingsImportResult {
  const fail = (message: string): SettingsImportResult => ({
    ok: false,
    code: 'E-SET-001',
    message,
    preferences: null,
    diff: [],
  });

  if (!isRecord(raw)) return fail('settings payload is not an object');
  for (const key of Object.keys(raw)) {
    if (!ALLOWED_KEYS.has(key)) return fail(`unknown field: ${key}`);
  }
  if (raw.schemaVersion !== SETTINGS_SCHEMA_VERSION) return fail('unsupported settings schema version');
  if (!isRecord(raw.preferences)) return fail('preferences must be an object');
  for (const key of Object.keys(raw.preferences)) {
    if (ALLOWED_KEY_SHAPED.has(key)) continue;
    if (SECRET_KEYS.test(key)) return fail(`secret-shaped field is not allowed: ${key}`);
  }

  const parsed = parsePreferences(raw.preferences, locale);
  const diff: SettingsImportResult['diff'] = [];
  for (const key of Object.keys(parsed) as Array<keyof Preferences>) {
    if (JSON.stringify(parsed[key]) !== JSON.stringify(current[key])) {
      diff.push({ field: key, from: current[key], to: parsed[key] });
    }
  }

  return { ok: true, code: null, message: null, preferences: parsed, diff };
}
