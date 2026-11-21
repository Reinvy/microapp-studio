/**
 * Minimal i18n: flat dot-key lookup over two shipped locales, locale detection
 * from `navigator.language`, and `dir` handling for RTL languages.
 *
 * No runtime dependency and no remote fetch: locales are bundled.
 */

import enUS from './en-US.json';
import idID from './id-ID.json';

export type Locale = 'id-ID' | 'en-US';

const DICTIONARIES: Record<Locale, Record<string, unknown>> = {
  'id-ID': idID as Record<string, unknown>,
  'en-US': enUS as Record<string, unknown>,
};

export const SUPPORTED_LOCALES: Locale[] = ['id-ID', 'en-US'];

const RTL_LANGUAGES = ['ar', 'fa', 'he', 'ur'];

let activeLocale: Locale = 'id-ID';

function lookup(dictionary: Record<string, unknown>, key: string): string | undefined {
  const parts = key.split('.');
  let current: unknown = dictionary;
  for (const part of parts) {
    if (typeof current !== 'object' || current === null) return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === 'string' ? current : undefined;
}

export function detectLocale(language?: string): Locale {
  const tag = (language ?? (typeof navigator === 'undefined' ? 'id-ID' : navigator.language)).toLowerCase();
  if (tag.startsWith('id')) return 'id-ID';
  if (tag.startsWith('en')) return 'en-US';
  return 'id-ID';
}

export function directionFor(language: string): 'ltr' | 'rtl' {
  const base = language.split('-')[0]?.toLowerCase() ?? 'id';
  return RTL_LANGUAGES.includes(base) ? 'rtl' : 'ltr';
}

export type Translate = (key: string, values?: Record<string, string | number>) => string;

/** Build a translator; unknown keys return the key itself so gaps are visible. */
export function createTranslator(locale: Locale): Translate {
  const dictionary = DICTIONARIES[locale] ?? DICTIONARIES['id-ID'];
  return (key, values) => {
    const template = lookup(dictionary, key) ?? key;
    if (!values) return template;
    return template.replace(/\{(\w+)\}/g, (match, name: string) =>
      values[name] === undefined ? match : String(values[name]),
    );
  };
}

/** Locale used by the `format*` helpers when no explicit locale is passed. */
export function setActiveLocale(locale: Locale): void {
  activeLocale = locale;
}

export function getActiveLocale(): Locale {
  return activeLocale;
}

/** Short date, formatted per locale (`21 Nov 2026` / `Nov 21, 2026`). */
export function formatDate(
  value: Date | number,
  locale: Locale = activeLocale,
  options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' },
): string {
  return new Intl.DateTimeFormat(locale, options).format(value);
}

export function formatNumber(
  value: number,
  locale: Locale = activeLocale,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(locale, options).format(value);
}

/**
 * File size with a locale-aware separator and unit label, using the documented
 * 1024-byte base (kB/MB/GB).
 */
export function formatBytes(bytes: number, locale: Locale = activeLocale): string {
  const safe = Number.isFinite(bytes) && bytes > 0 ? bytes : 0;
  const gigabyte = 1024 ** 3;
  const megabyte = 1024 ** 2;
  const kilobyte = 1024;
  let unit: 'kilobyte' | 'megabyte' | 'gigabyte' = 'kilobyte';
  let value = safe / kilobyte;
  if (safe >= gigabyte) {
    unit = 'gigabyte';
    value = safe / gigabyte;
  } else if (safe >= megabyte) {
    unit = 'megabyte';
    value = safe / megabyte;
  }
  return new Intl.NumberFormat(locale, {
    style: 'unit',
    unit,
    unitDisplay: 'short',
    maximumFractionDigits: 1,
  }).format(value);
}

/** Assert both locales expose the same key set (used by tests). */
export function localeKeys(locale: Locale): string[] {
  const keys: string[] = [];
  const walk = (value: unknown, prefix: string): void => {
    if (typeof value === 'string') {
      keys.push(prefix);
      return;
    }
    if (typeof value === 'object' && value !== null) {
      for (const [key, nested] of Object.entries(value)) {
        walk(nested, prefix ? `${prefix}.${key}` : key);
      }
    }
  };
  walk(DICTIONARIES[locale], '');
  return keys.sort();
}

activeLocale = detectLocale();
