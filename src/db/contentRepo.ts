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
