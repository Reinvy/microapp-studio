import { describe, expect, it } from 'vitest';
import { createTranslator, detectLocale, directionFor, localeKeys } from '@/i18n';

describe('i18n', () => {
  it('has identical key sets in both locales', () => {
    expect(localeKeys('id-ID')).toEqual(localeKeys('en-US'));
    expect(localeKeys('id-ID').length).toBeGreaterThan(40);
  });

  it('translates keys and interpolates values', () => {
    const t = createTranslator('en-US');
    expect(t('nav.home')).toBe('Home');
    expect(t('search.results', { count: 3 })).toBe('3 results');
    expect(createTranslator('id-ID')('firstRun.title')).toBe('Buat identitas lokal');
  });

  it('returns the key when a translation is missing', () => {
    expect(createTranslator('en-US')('missing.key')).toBe('missing.key');
  });

  it('detects locale and text direction', () => {
    expect(detectLocale('id-ID')).toBe('id-ID');
    expect(detectLocale('en-GB')).toBe('en-US');
    expect(detectLocale('fr-FR')).toBe('id-ID');
    expect(directionFor('ar-EG')).toBe('rtl');
    expect(directionFor('id-ID')).toBe('ltr');
  });
});
