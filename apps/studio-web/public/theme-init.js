/*
 * Pre-paint preference application.
 *
 * Loaded synchronously in <head> before any stylesheet paints so the first frame
 * already carries the user's theme, locale, direction, text scale, and reduced
 * motion. It must stay dependency-free and non-blocking: any failure leaves the
 * clay light defaults in place.
 *
 * The same read/apply logic lives in src/features/preferences/apply.ts for the
 * React side; this file only needs `theme`, `locale`, `textScale`,
 * `reducedMotion`.
 */
(function () {
  var STORAGE_KEY = 'microapp.preferences';
  var DEFAULTS = { theme: 'system', locale: 'id-ID', textScale: 1, reducedMotion: false };
  var RTL = ['ar', 'fa', 'he', 'ur'];

  function detectLocale() {
    var langs = [];
    if (typeof navigator !== 'undefined') {
      if (navigator.languages && navigator.languages.length) langs = navigator.languages;
      else if (navigator.language) langs = [navigator.language];
    }
    for (var i = 0; i < langs.length; i += 1) {
      var tag = String(langs[i] || '').toLowerCase();
      if (tag.indexOf('id') === 0) return 'id-ID';
      if (tag.indexOf('en') === 0) return 'en-US';
    }
    return DEFAULTS.locale;
  }

  function read() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return DEFAULTS;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return DEFAULTS;
      return {
        theme: ['system', 'light', 'dark', 'high-contrast'].indexOf(parsed.theme) >= 0 ? parsed.theme : DEFAULTS.theme,
        locale: parsed.locale === 'id-ID' || parsed.locale === 'en-US' ? parsed.locale : detectLocale(),
        textScale: [1, 1.125, 1.25].indexOf(parsed.textScale) >= 0 ? parsed.textScale : DEFAULTS.textScale,
        reducedMotion: parsed.reducedMotion === true,
      };
    } catch (error) {
      return DEFAULTS;
    }
  }

  function resolveTheme(theme) {
    if (theme !== 'system') return theme;
    try {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch (error) {
      return 'light';
    }
  }

  var prefs = read();
  var root = document.documentElement;
  root.dataset.theme = resolveTheme(prefs.theme);
  root.dataset.themePreference = prefs.theme;
  root.lang = prefs.locale;
  root.dir = RTL.indexOf(prefs.locale.slice(0, 2).toLowerCase()) >= 0 ? 'rtl' : 'ltr';
  root.dataset.reducedMotion = prefs.reducedMotion ? 'true' : 'false';
  root.style.setProperty('--mads-text-scale', String(prefs.textScale));
})();
