/**
 * User preferences: the single source of truth for theme, locale, type scale,
 * motion, and the persistence flags that drive shell nudges.
 *
 * Stored twice on purpose: `settings.preferences` in SQLite is authoritative
 * once the DB is open, and `localStorage['microapp.preferences']` mirrors it so
 * `public/theme-init.js` can apply the correct palette before first paint.
 */

import type { Locale } from '@/i18n';

export type ThemePreference = 'system' | 'light' | 'dark' | 'high-contrast';

export type TextScale = 1 | 1.125 | 1.25;

export type CreateMode = 'template' | 'ai' | 'blank';

export interface Preferences {
  theme: ThemePreference;
  locale: Locale;
  textScale: TextScale;
  reducedMotion: boolean;
  sidebarCollapsed: boolean;
  lastCreateMode: CreateMode;
  welcomeDismissed: boolean;
  recoverySecured: boolean;
  recoveryNudgeDismissedAt: number | null;
  devtoolsEnabled: boolean;
  advancedJson: boolean;
  verboseBridge: boolean;
  showPlaceholders: boolean;
  aiEndpoint: string;
  aiModel: string;
  aiKeyLast4: string;
  lastBackupAt: number | null;
  backupNudgeDismissedAt: number | null;
}

export const PREFERENCES_STORAGE_KEY = 'microapp.preferences';

export const PREFERENCES_SETTINGS_KEY = 'preferences';

export const THEME_PREFERENCES: readonly ThemePreference[] = [
  'system',
  'light',
  'dark',
  'high-contrast',
];

export const TEXT_SCALES: readonly TextScale[] = [1, 1.125, 1.25];

export const CREATE_MODES: readonly CreateMode[] = ['template', 'ai', 'blank'];

/** Seven days, in milliseconds — the nudge cadence from the flows. */
export const NUDGE_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Validate an unknown value into a complete `Preferences`.
 * Unknown fields are dropped and invalid fields fall back to `DEFAULTS`, so a
 * stale or hand-edited row can never crash the shell.
 */
export function parsePreferences(input: unknown, fallbackLocale: Locale): Preferences {
  const record = isRecord(input) ? input : {};
  return {
    theme: includes(THEME_PREFERENCES, record.theme) ? record.theme : 'system',
    locale: record.locale === 'id-ID' || record.locale === 'en-US' ? record.locale : fallbackLocale,
    textScale: includes(TEXT_SCALES, record.textScale) ? record.textScale : 1,
    reducedMotion: record.reducedMotion === true,
    sidebarCollapsed: record.sidebarCollapsed === true,
    lastCreateMode: includes(CREATE_MODES, record.lastCreateMode) ? record.lastCreateMode : 'template',
    welcomeDismissed: record.welcomeDismissed === true,
    recoverySecured: record.recoverySecured === true,
    recoveryNudgeDismissedAt: toTimestamp(record.recoveryNudgeDismissedAt),
    devtoolsEnabled: record.devtoolsEnabled === true,
    advancedJson: record.advancedJson === true,
    verboseBridge: record.verboseBridge === true,
    showPlaceholders: record.showPlaceholders === true,
    aiEndpoint: typeof record.aiEndpoint === 'string' ? record.aiEndpoint : '',
    aiModel: typeof record.aiModel === 'string' ? record.aiModel : '',
    aiKeyLast4: typeof record.aiKeyLast4 === 'string' ? record.aiKeyLast4.slice(0, 4) : '',
    lastBackupAt: toTimestamp(record.lastBackupAt),
    backupNudgeDismissedAt: toTimestamp(record.backupNudgeDismissedAt),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function includes<T extends string | number>(values: readonly T[], value: unknown): value is T {
  return values.includes(value as T);
}

function toTimestamp(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}
