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

export type SiteContentData =
  | NavLink[]
  | FooterColumn[]
  | FeatureItem[]
  | StepItem[]
  | StatItem[]
  | HeroContent
  | CtaContent
  | LandingSections
  | EmptyStateCopy
  | DashboardStatsCopy
  | AppCardCopy
  | DashboardConfig
  | PromptTemplate[];

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
