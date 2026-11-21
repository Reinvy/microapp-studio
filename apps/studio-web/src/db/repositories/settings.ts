/**
 * Settings repository.
 *
 * `settings` holds non-secret global values only. Secrets (BYOK key, vault
 * items) live in `vault_items`; the recovery phrase lives in the encrypted
 * secure store, never here.
 */

import type { HostDb } from '../driver';
import { parsePreferences, PREFERENCES_SETTINGS_KEY, type Preferences } from '@/features/preferences/types';
import type { Locale } from '@/i18n';

export async function getSetting<T>(db: HostDb, key: string, fallback: T): Promise<T> {
  const rows = await db.select<{ value_json: string }>('SELECT value_json FROM settings WHERE key = ?', [key]);
  const row = rows[0];
  if (!row) return fallback;
  try {
    return JSON.parse(row.value_json) as T;
  } catch {
    return fallback;
  }
}

export async function setSetting(db: HostDb, key: string, value: unknown, nowMs = Date.now()): Promise<void> {
  await db.exec(
    `INSERT INTO settings (key, value_json, updated_at_ms) VALUES (?, ?, ?)
     ON CONFLICT (key) DO UPDATE SET value_json = excluded.value_json, updated_at_ms = excluded.updated_at_ms`,
    [key, JSON.stringify(value), nowMs],
  );
}

/** Load validated preferences; an absent or corrupt row yields defaults. */
export async function loadPreferences(db: HostDb, fallbackLocale: Locale): Promise<Preferences | null> {
  const rows = await db.select<{ value_json: string }>('SELECT value_json FROM settings WHERE key = ?', [
    PREFERENCES_SETTINGS_KEY,
  ]);
  const row = rows[0];
  if (!row) return null;
  try {
    return parsePreferences(JSON.parse(row.value_json) as unknown, fallbackLocale);
  } catch {
    return null;
  }
}

export async function savePreferences(db: HostDb, prefs: Preferences, nowMs = Date.now()): Promise<void> {
  await setSetting(db, PREFERENCES_SETTINGS_KEY, prefs, nowMs);
}
