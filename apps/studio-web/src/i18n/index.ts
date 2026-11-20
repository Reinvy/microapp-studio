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
