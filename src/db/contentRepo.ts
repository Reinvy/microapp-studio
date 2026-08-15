'use client';

import { db } from './db';
import type { DashboardConfig } from '@/lib/dashboardConfig';
import type { PromptTemplate } from '@/lib/promptTemplates';

export interface SiteLink {
  label: string;
  href: string;
}

export interface FooterColumn {
  title: string;
  links: SiteLink[];
}

export interface NavLink {
  label: string;
  href: string;
}

export interface FeatureItem {
  icon: string; // lucide icon name
  title: string;
  description: string;
}

export interface StepItem {
  icon: string;
  title: string;
  description: string;
}

export interface StatItem {
  icon: string;
  value: string;
  label: string;
}

export interface HeroContent {
  badge: string;
  titleLine1: string;
  titleHighlight: string;
  titleLine2: string;
  subtitle: string;
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
}

/**
 * HeroShowcase copy — the fake app-window labels rendered inside the landing
 * hero's browser mockup (URL pill + the two feature tiles). Previously
 * hardcoded in src/app/page.tsx; now seeded via contentRepo ('hero-showcase')
 * so the showcase is editable without a redeploy.
 */
export interface HeroShowcase {
  /** Text in the fake browser address bar, e.g. "my-micro-app". */
  windowUrl: string;
  /** Label under the first showcase tile (e.g. "Preview your app"). */
  leftTile: string;
  /** Label under the second showcase tile (e.g. "Edit with AI"). */
  rightTile: string;
}

export interface CtaContent {
  heading: string;
  headingHighlight: string;
  subtitle: string;
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
}

export interface SectionHeading {
  title: string;
  highlight: string;
  subtitle: string;
}

export interface LandingSections {
  features: SectionHeading;
  howItWorks: SectionHeading;
}

export interface EmptyStateCopy {
  /** Title shown when the dashboard has zero apps. */
  emptyTitle: string;
  /** Subtitle shown when the dashboard has zero apps. */
  emptySubtitle: string;
  /** CTA label for creating the first app. */
  ctaLabel: string;
  /** Title shown when a search returns no matches. */
  noResultsTitle: string;
  /** Subtitle shown when a search returns no matches. */
  noResultsSubtitle: string;
}

/**
 * DashboardStats copy — the stat-card labels and count templates rendered by
 * DashboardStats.tsx. Previously hardcoded in the component; now seeded via
 * contentRepo ('dashboard-stats-copy') so copy is editable without a redeploy.
 * Templates use a `{count}` placeholder, formatted by formatCountTemplate().
 */
export interface DashboardStatsCopy {
  /** Label for the total-apps card. */
  appsLabel: string;
  /** Label for the total-fields card. */
  fieldsLabel: string;
  /** Label for the total-logic-nodes card. */
  logicLabel: string;
  /** Label for the top-field-type card. */
  topTypeLabel: string;
  /** Template for the "updated this week" line: `+{count} this week`. */
  weekTemplate: string;
  /** Template for the average line: `Avg {count} per app`. */
  avgTemplate: string;
  /** Template for the top-type count line: `{count} fields`. */
  fieldCountTemplate: string;
  /** Placeholder when no top field type exists (e.g. `—`). */
  noValue: string;
}

/**
 * AppCard copy — labels and count templates rendered by AppCard.tsx.
 * Previously hardcoded in the component; now seeded via contentRepo
 * ('app-card-copy') so card microcopy is editable without a redeploy.
 */
export interface AppCardCopy {
  /** Fallback description when an app has none. */
  noDescription: string;
  /** Label of the "run" action button. */
  runLabel: string;
  /** Singular unit for the field count (e.g. `field`). */
  fieldSingular: string;
  /** Plural unit for the field count (e.g. `fields`). */
  fieldPlural: string;
  /** Singular unit for the logic-node count (e.g. `node`). */
  nodeSingular: string;
  /** Plural unit for the logic-node count (e.g. `nodes`). */
  nodePlural: string;
  /** Template for the "+N more" badge: `+{count} more`. */
  moreTemplate: string;
}

/**
 * Auth page copy — headings, labels, placeholders and CTAs rendered by the
 * login and register pages. Previously hardcoded in the page components; now
 * seeded via contentRepo ('auth-copy') so auth copy is editable without a
 * redeploy. Validation error messages stay in the page (they are tightly
 * coupled to form logic).
 */
export interface AuthCopy {
  login: {
    /** Card header title, e.g. "Welcome back". */
    title: string;
    /** Card header subtitle, e.g. "Sign in to continue building your apps." */
    subtitle: string;
    emailLabel: string;
    emailPlaceholder: string;
    passwordLabel: string;
    passwordPlaceholder: string;
    forgotPassword: string;
    submitLabel: string;
    submittingLabel: string;
    socialDivider: string;
    googleLabel: string;
    githubLabel: string;
    /** Text before the bottom link, e.g. "Don't have an account?" */
    bottomPrefix: string;
    /** Bottom CTA link label, e.g. "Sign up". */
    bottomCta: string;
  };
  register: {
    /** Card header title, e.g. "Create an account". */
    title: string;
    /** Card header subtitle, e.g. "Start building micro-apps in minutes." */
    subtitle: string;
    nameLabel: string;
    namePlaceholder: string;
    emailLabel: string;
    emailPlaceholder: string;
    passwordLabel: string;
    passwordPlaceholder: string;
    confirmLabel: string;
    confirmPlaceholder: string;
    termsPrefix: string;
    termsLink: string;
    termsAnd: string;
    privacyLink: string;
    submitLabel: string;
    submittingLabel: string;
    socialDivider: string;
    googleLabel: string;
    githubLabel: string;
    /** Text before the bottom link, e.g. "Already have an account?" */
    bottomPrefix: string;
    /** Bottom CTA link label, e.g. "Sign in". */
    bottomCta: string;
  };
}

/**
 * RecentlyRun copy — the heading + empty-state text rendered by the dashboard
 * "Recently Run" strip. Seeded via contentRepo ('recently-run-copy') so copy
 * is editable without a redeploy, with a built-in fallback in the component.
 */
export interface RecentlyRunCopy {
  /** Section heading, e.g. "Recently Run". */
  title: string;
  /** Subtitle under the heading, e.g. "Your latest app launches". */
  subtitle: string;
  /** Shown when no runs have been recorded yet. */
  emptyText: string;
  /** Accessible label for each run chip (app name is appended). */
  chipLabel: string;
  /** Accessible label for the strip. */
  regionLabel: string;
}

/**
 * NewAppDialog copy — labels and placeholders rendered by NewAppDialog.tsx.
 * Previously hardcoded in the component; now seeded via contentRepo
 * ('new-app-dialog-copy') so dialog microcopy is editable without a redeploy.
 */
export interface NewAppDialogCopy {
  /** Card header title, e.g. "Create New App". */
  title: string;
  /** Card header subtitle, e.g. "Describe what you want to build". */
  subtitle: string;
  /** Label above the app-name input. */
  nameLabel: string;
  /** Placeholder for the app-name input. */
  namePlaceholder: string;
  /** Label above the prompt textarea. */
  promptLabel: string;
  /** Placeholder for the prompt textarea. */
  promptPlaceholder: string;
  /** Label above the template suggestion chips. */
  templatesLabel: string;
  /** Cancel button label. */
  cancelLabel: string;
  /** Generate button label (idle). */
  generateLabel: string;
  /** Generate button label while creating. */
  creatingLabel: string;
}

/**
 * FooterBrand — the footer brand column copy (tagline, social links,
 * copyright line). Previously hardcoded in Footer.tsx; now seeded via
 * contentRepo ('footer-brand') so the footer identity copy is editable
 * without a redeploy.
 */
export interface FooterBrand {
  /** Brand name shown in the footer logo row. */
  brandName: string;
  /** One-paragraph tagline under the logo. */
  tagline: string;
  /** Social icon links (aria-label + href). */
  socials: Array<{ label: string; href: string }>;
  /** Copyright line template — `{year}` is replaced with the current year. */
  copyright: string;
}

/**
 * ImportDialog copy — headings, labels, mode descriptions and result copy
 * rendered by ImportDialog.tsx. Previously hardcoded in the component; now
 * seeded via contentRepo ('import-dialog-copy') so backup/restore dialog
 * microcopy is editable without a redeploy. The `{count}` templates are
 * formatted with formatCountTemplate().
 */
export interface ImportDialogCopy {
  /** Dialog header title, e.g. "Import Backup". */
  title: string;
  /** Dialog description under the title. */
  description: string;
  /** Dropzone label when no file is chosen yet. */
  chooseFile: string;
  /** Helper text under the dropzone, e.g. ".json exported from MicroApp Studio". */
  fileHint: string;
  /** Merge mode card title. */
  mergeTitle: string;
  /** Merge mode card description. */
  mergeDescription: string;
  /** Replace mode card title. */
  replaceTitle: string;
  /** Replace mode card description. */
  replaceDescription: string;
  /** Error shown when the user hits Import without a file. */
  noFileError: string;
  /** Generic error fallback when the import throws. */
  importError: string;
  /** Result prefix, e.g. "Import complete — ". */
  resultPrefix: string;
  /** Result template for the added count: `{count} added`. */
  addedTemplate: string;
  /** Result template for the replaced count: `{count} updated`. */
  updatedTemplate: string;
  /** Result template for the failed count: `{count} failed`. */
  failedTemplate: string;
  /** Result sentence terminator, e.g. ".". */
  resultSuffix: string;
  /** Format hint prefix, e.g. "Tip: use the ". */
  tipPrefix: string;
  /** Format hint emphasized label, e.g. "Export". */
  tipHighlight: string;
  /** Format hint suffix, e.g. " button on the dashboard to create backups.". */
  tipSuffix: string;
  /** Cancel button label. */
  cancelLabel: string;
  /** Import button label (idle). */
  importLabel: string;
  /** Import button label while busy. */
  importingLabel: string;
}

export type SiteContentData =
  | NavLink[]
  | FooterColumn[]
  | FeatureItem[]
  | StepItem[]
  | StatItem[]
  | HeroContent
  | HeroShowcase
  | CtaContent
  | LandingSections
  | EmptyStateCopy
  | DashboardStatsCopy
  | AppCardCopy
  | RecentlyRunCopy
  | AuthCopy
  | NewAppDialogCopy
  | ImportDialogCopy
  | FooterBrand
  | DashboardConfig
  | PromptTemplate[]
  /** Pastel hex colors cycled per recently-run chip — DB-driven (previously hardcoded in RecentlyRun.tsx). */
  | string[];

export interface SiteContent {
  id: string;
  /**
   * 'nav-links' | 'footer-columns' | 'landing-features' | 'landing-steps'
   * | 'landing-stats' | 'dashboard-empty' | 'dashboard-config'
   */
  type: string;
  data: SiteContentData;
}

/**
 * ContentRepo — stores site content (nav links, footer columns)
 * in IndexedDB. Makes static content queryable and editable.
 */
export const contentRepo = {
  /** Get content by type */
  async getByType(type: string): Promise<SiteContent | undefined> {
    try {
      return await db.content.where('type').equals(type).first();
    } catch {
      return undefined;
    }
  },

  /**
   * Batch fetch multiple content types in ONE IndexedDB query (`anyOf` over
   * the `type` index). The landing page used to fire one `getByType` per
   * section (hero, features, steps, stats, CTA, sections, nav, footer — 8
   * sequential round trips on first paint). A single `anyOf` scan reads all
   * requested types in one pass, which keeps IndexedDB contention flat as
   * the number of content sections grows.
   */
  async getMany(types: string[]): Promise<SiteContent[]> {
    try {
      if (types.length === 0) return [];
      return await db.content.where('type').anyOf(types).toArray();
    } catch {
      return [];
    }
  },

  /** Save or update content */
  async save(content: SiteContent): Promise<void> {
    try {
      await db.content.put(content);
    } catch (error) {
      console.error('[ContentRepo] save failed:', error);
    }
  },

  /** Bulk save (for seeding) */
  async bulkSave(items: SiteContent[]): Promise<void> {
    try {
      await db.content.bulkPut(items);
    } catch (error) {
      console.error('[ContentRepo] bulkSave failed:', error);
    }
  },

  /** Check if content type exists */
  async exists(type: string): Promise<boolean> {
    try {
      const count = await db.content.where('type').equals(type).count();
      return count > 0;
    } catch {
      return false;
    }
  },
};

/**
 * Format a `{count}` template string (e.g. `+{count} this week`) with a
 * numeric value. Pure + framework-free so it is trivially unit-testable and
 * safe to use from any client component.
 */
export function formatCountTemplate(template: string, count: number): string {
  return template.replace(/\{count\}/g, String(count));
}
