import { describe, expect, it } from 'vitest';
import enUS from '../i18n/en-US.json';
import idID from '../i18n/id-ID.json';
import { createTranslator, formatBytes, formatDate } from '@/i18n';

/**
 * Error copy guard.
 *
 * A message that reaches the UI must never carry a stack frame, an absolute path,
 * a secret-looking blob, or an HTML tag. This complements the dictionary parity
 * test in `src/__tests__/i18n.test.ts`.
 */

const STACK = /\bat\s+\S+\s+\(/;
const ABSOLUTE_PATH = /(?:\/(?:home|Users|var|etc|opt|mnt|tmp)\/|[A-Za-z]:\\)/;
const HTML_TAG = /<(script|img|iframe|div)\b/i;
const SECRET = /(sk-[A-Za-z0-9]{8}|BEGIN [A-Z ]+PRIVATE KEY|mnemonic\s*[:=])/i;

const errorKeys = Object.keys((idID as { errors: Record<string, string> }).errors);

describe('error copy', () => {
  it('covers every documented code in both locales', () => {
    expect(errorKeys.length).toBeGreaterThanOrEqual(27);
    for (const key of errorKeys) {
      expect((idID as { errors: Record<string, string> }).errors[key], key).toBeTruthy();
      expect((enUS as { errors: Record<string, string> }).errors[key], key).toBeTruthy();
    }
  });

  it('never renders a stack frame, absolute path, HTML tag, or secret', () => {
    for (const locale of ['id-ID', 'en-US'] as const) {
      const errors = (locale === 'id-ID' ? idID : enUS).errors as Record<string, string>;
      for (const [key, message] of Object.entries(errors)) {
        const label = `${locale}/${key}`;
        expect(STACK.test(message), `${label}: stack frame`).toBe(false);
        expect(ABSOLUTE_PATH.test(message), `${label}: absolute path`).toBe(false);
        expect(HTML_TAG.test(message), `${label}: html tag`).toBe(false);
        expect(SECRET.test(message), `${label}: secret-shaped`).toBe(false);
      }
    }
  });

  it('resolves an error code through the translator, not the raw key', () => {
    const t = createTranslator('id-ID');
    for (const key of errorKeys) {
      if (key === 'generic' || key === 'unknown' || key === 'overflow') continue;
      expect(t(`errors.${key}`)).not.toBe(`errors.${key}`);
    }
  });

  it('formats dates and sizes with Intl for the active locale', () => {
    const instant = Date.UTC(2024, 4, 17, 9, 30);
    expect(formatDate(instant, 'id-ID')).not.toBe(formatDate(instant, 'en-US'));
    expect(formatBytes(1_048_576, 'id-ID')).toMatch(/MB|megabita/i);
    expect(formatBytes(1_048_576, 'en-US')).toMatch(/MB/i);
  });
});
