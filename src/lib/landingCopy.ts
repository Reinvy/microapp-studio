/**
 * landingCopy — centralized UI copy for the landing-page chrome (navbar).
 *
 * Mirrors `builderCopy` / `runnerCopy` / `dashboardCopy` / `authCopy`: nav
 * chrome (menu labels, ARIA labels, the CTA fallback, brand name) lives in a
 * config module so no component hardcodes its own strings — a single source
 * of truth, and copy edits / future i18n touch exactly one file. Site
 * content stays DB-driven via contentRepo ('nav-links', 'hero-content',
 * 'footer-brand'); this module only covers chrome + fallbacks that must
 * exist synchronously before the async DB read lands.
 */

export const landingCopy = {
  /** Brand name shown in the navbar logo row (mirrors 'footer-brand'). */
  brandName: 'MicroApp Studio',
  /** Fallback CTA label until DB-driven nav-links load (mirrors 'hero-content'). */
  ctaFallback: 'Get Started',
  /** Mobile slide-in menu heading. */
  menuHeading: 'Menu',
  /** Hamburger button ARIA labels. */
  openMenuAria: 'Open menu',
  closeMenuAria: 'Close menu',
} as const;