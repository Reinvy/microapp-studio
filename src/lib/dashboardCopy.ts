/**
 * dashboardCopy — centralized UI copy for the dashboard (app list).
 *
 * Mirrors `builderCopy` / `runnerCopy`: the dashboard is tool chrome (like a
 * design app), not site content, so its chrome labels live in a config module
 * rather than the content DB — a single source of truth so no component
 * hardcodes its own strings, and copy edits / future i18n touch exactly one
 * file. Site-content copy that is DB-driven (empty state, app card, stats,
 * recently-run strip) stays in contentRepo — this module only covers the
 * page-level chrome.
 */

export const dashboardCopy = {
  /** Dashboard header / page shell */
  header: {
    appName: 'MicroApp Studio',
    greetingPrefix: 'Hi,',
    logout: 'Logout',
  },

  /** Page title + app-count subtitle */
  page: {
    title: 'Your Micro Apps',
    countLabel: (n: number) => `${n} ${n === 1 ? 'app' : 'apps'} created`,
    pageInfo: (page: number, total: number) => `Page ${page} of ${total}`,
  },

  /** Toolbar actions */
  actions: {
    export: 'Export',
    exportTitle: 'Download a JSON backup of all your apps',
    import: 'Import',
    importTitle: 'Restore apps from a JSON backup',
    newApp: 'New App',
  },

  /** Pagination controls */
  pagination: {
    prevAria: 'Previous page',
    nextAria: 'Next page',
    pageAria: (n: number) => `Page ${n}`,
    jumpRegionAria: 'Jump to page',
    goTo: 'Go to',
    jumpInputAria: 'Page number to jump to',
    goAria: (n: number | string) => `Go to page ${n}`,
    go: 'Go',
  },
} as const;
