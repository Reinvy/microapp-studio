/**
 * Preference defaults and first-paint helpers.
 *
 * `defaultPreferences` is pure with respect to the environment it is called in:
 * it reads the detected locale (navigator) but never persistence.
 */

import { detectLocale, type Locale } from '@/i18n';
import type { Preferences } from './types';

export function detectPreferredLocale(): Locale {
  return detectLocale();
}

export function defaultPreferences(locale: Locale = detectPreferredLocale()): Preferences {
  return {
    theme: 'system',
    locale,
    textScale: 1,
    reducedMotion: false,
    sidebarCollapsed: false,
    lastCreateMode: 'template',
    welcomeDismissed: false,
    recoverySecured: false,
    recoveryNudgeDismissedAt: null,
    devtoolsEnabled: false,
    advancedJson: false,
    verboseBridge: false,
    showPlaceholders: false,
    aiEndpoint: '',
    aiModel: '',
    aiKeyLast4: '',
    lastBackupAt: null,
    backupNudgeDismissedAt: null,
  };
}

export const DEFAULTS: Preferences = defaultPreferences('id-ID');
