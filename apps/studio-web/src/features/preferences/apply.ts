/**
 * Apply preferences to the document.
 *
 * Mirrors `public/theme-init.js` exactly: the init script covers the first paint
 * (before React exists), this module covers every subsequent change. Keep the
 * two in sync; a mismatch is observable as a flash or a stale `lang`.
 */

import { directionFor } from '@/i18n';
import { PREFERENCES_STORAGE_KEY, type Preferences, type ThemePreference } from './types';

const DARK_QUERY = '(prefers-color-scheme: dark)';

/** Resolve `system` against the OS scheme; everything else is literal. */
export function resolveTheme(theme: ThemePreference, prefersDark: boolean): Exclude<ThemePreference, 'system'> {
  if (theme !== 'system') return theme;
  return prefersDark ? 'dark' : 'light';
}

export function prefersDarkScheme(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia(DARK_QUERY).matches;
}

/** Write the preference-derived attributes and custom properties. */
export function applyPreferences(prefs: Preferences): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.dataset.theme = resolveTheme(prefs.theme, prefersDarkScheme());
  root.dataset.themePreference = prefs.theme;
  root.lang = prefs.locale;
  root.dir = directionFor(prefs.locale);
  root.dataset.reducedMotion = prefs.reducedMotion ? 'true' : 'false';
  root.style.setProperty('--mads-text-scale', String(prefs.textScale));
}

/**
 * Subscribe to OS scheme changes. Only meaningful while the preference is
 * `system`; the caller must re-subscribe when the preference changes.
 * Returns an unsubscribe function.
 */
export function watchSystemTheme(onChange: (prefersDark: boolean) => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => undefined;
  const query = window.matchMedia(DARK_QUERY);
  const listener = (event: MediaQueryListEvent): void => onChange(event.matches);
  query.addEventListener('change', listener);
  return () => query.removeEventListener('change', listener);
}

/** Best-effort localStorage mirror; failure is non-fatal (SQLite still holds it). */
export function mirrorPreferences(prefs: Preferences): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Private mode or full quota: the DB copy remains authoritative.
  }
}

export function readMirroredPreferences(): unknown {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(PREFERENCES_STORAGE_KEY);
    return raw === null ? null : (JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}
