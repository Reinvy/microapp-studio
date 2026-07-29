'use client';

import { db } from './db';

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

export interface SiteContent {
  id: string;
  /** 'nav-links' | 'footer-columns' */
  type: string;
  data: NavLink[] | FooterColumn[];
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
