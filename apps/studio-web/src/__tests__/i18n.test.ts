import { describe, expect, it } from 'vitest';
import {
  createTranslator,
  detectLocale,
  directionFor,
  formatBytes,
  formatDate,
  formatNumber,
  localeKeys,
  SUPPORTED_LOCALES,
} from '@/i18n';

const REQUIRED_NAMESPACES = [
  'app',
  'nav',
  'common',
  'a11y',
  'shell',
  'home',
  'welcome',
  'create',
  'templates',
  'studio',
  'runner',
  'packages',
  'settings',
  'consent',
  'backup',
  'errors',
];

const ERROR_CODES = [
  'E-AUTH-001',
  'E-AUTH-002',
  'E-BACKUP-001',
  'E-BACKUP-002',
  'E-CREATE-001',
  'E-CREATE-002',
  'E-CREATE-003',
  'E-DATA-001',
  'E-DATA-002',
  'E-DEV-001',
  'E-NET-001',
  'E-PACK-001',
  'E-PACK-002',
  'E-PACK-003',
  'E-PACK-004',
  'E-RUN-001',
  'E-RUN-002',
  'E-RUN-003',
  'E-RUN-004',
  'E-SET-001',
  'E-SET-002',
  'E-SHELL-001',
  'E-SHELL-002',
  'E-SHELL-003',
  'E-STUDIO-001',
  'E-STUDIO-002',
  'E-STUDIO-003',
] as const;

describe('i18n', () => {
  it('has identical key sets in both locales', () => {
    expect(localeKeys('id-ID')).toEqual(localeKeys('en-US'));
    expect(localeKeys('id-ID').length).toBeGreaterThan(400);
  });

  it('covers every host namespace', () => {
    const namespaces = new Set(localeKeys('id-ID').map((key) => key.split('.')[0]));
    for (const namespace of REQUIRED_NAMESPACES) {
      expect(namespaces, namespace).toContain(namespace);
    }
  });

  it('includes a name and description for every bundled template', () => {
    const ids = [
      'kasir-sederhana',
      'kasir-warung',
      'daftar-tugas',
      'catatan-harian',
      'absensi',
      'inventaris-gudang',
      'stok-minimum',
      'survey-warga',
    ];
    for (const locale of SUPPORTED_LOCALES) {
      const t = createTranslator(locale);
      for (const id of ids) {
        expect(t(`templates.item.${id}.name`), `${locale} ${id}`).not.toBe(`templates.item.${id}.name`);
        expect(t(`templates.item.${id}.description`), `${locale} ${id}`).not.toBe(
          `templates.item.${id}.description`,
        );
      }
    }
  });

  it('translates keys and interpolates values', () => {
    expect(createTranslator('en-US')('nav.home')).toBe('Home');
    expect(createTranslator('id-ID')('nav.home')).toBe('Beranda');
    expect(createTranslator('en-US')('consent.title', { app: 'Kasir' })).toBe(
      'Kasir is asking for access',
    );
    expect(
      createTranslator('id-ID')('consent.body', { app: 'Kasir', permission: 'Penyimpanan app' }),
    ).toBe('Kasir meminta izin Penyimpanan app untuk melanjutkan.');
    expect(createTranslator('en-US')('packages.installed', { app: 'Kasir' })).toBe(
      'Kasir installed.',
    );
  });

  it('returns the key when a translation is missing', () => {
    expect(createTranslator('en-US')('missing.key')).toBe('missing.key');
  });

  it('never ships an empty or untranslated value', () => {
    for (const locale of SUPPORTED_LOCALES) {
      const t = createTranslator(locale);
      for (const key of localeKeys(locale)) {
        const value = t(key);
        expect(value.trim(), `${locale} ${key}`).not.toBe('');
        expect(value, `${locale} ${key}`).not.toBe(key);
      }
    }
  });

  it('ships audience-facing copy for all 27 error codes', () => {
    expect(ERROR_CODES).toHaveLength(27);
    for (const locale of SUPPORTED_LOCALES) {
      const t = createTranslator(locale);
      for (const code of ERROR_CODES) {
        const key = `errors.${code}`;
        const value = t(key);
        expect(value, `${locale} ${key}`).not.toBe(key);
        expect(value, `${locale} ${key}`).not.toContain('{');
        expect(value, `${locale} ${key}`).toContain(code);
        expect(value.trim().length, `${locale} ${key}`).toBeGreaterThan(20);
      }
      for (const key of ['errors.generic', 'errors.unknown', 'errors.overflow']) {
        const value = t(key);
        expect(value, `${locale} ${key}`).not.toBe(key);
        expect(value, `${locale} ${key}`).not.toContain('{');
      }
    }
  });

  it('detects locale and text direction', () => {
    expect(detectLocale('id-ID')).toBe('id-ID');
    expect(detectLocale('en-GB')).toBe('en-US');
    expect(detectLocale('fr-FR')).toBe('id-ID');
    expect(directionFor('ar')).toBe('rtl');
    expect(directionFor('ar-EG')).toBe('rtl');
    expect(directionFor('id-ID')).toBe('ltr');
    expect(directionFor('en-US')).toBe('ltr');
  });

  it('formats dates with Intl per locale', () => {
    const instant = new Date(2026, 10, 21, 12, 0);
    expect(formatDate(instant, 'id-ID')).toBe('21 Nov 2026');
    expect(formatDate(instant, 'en-US')).toBe('Nov 21, 2026');
    expect(formatDate(instant, 'id-ID')).not.toBe(formatDate(instant, 'en-US'));
  });

  it('formats numbers per locale', () => {
    expect(formatNumber(1234.56, 'id-ID')).toBe('1.234,56');
    expect(formatNumber(1234.56, 'en-US')).toBe('1,234.56');
  });

  it('formats file sizes with localized unit labels', () => {
    expect(formatBytes(1.4 * 1024 * 1024, 'en-US')).toBe('1.4 MB');
    expect(formatBytes(1.4 * 1024 * 1024, 'id-ID')).toBe('1,4 MB');
    expect(formatBytes(0, 'en-US')).toBe('0 kB');
  });
});
