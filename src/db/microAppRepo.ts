'use client';

import { db } from './db';
import type { AppSchema } from '@/types/schema';

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const microAppRepo = {
  /** Load all apps from IndexedDB */
  async getAll(): Promise<AppSchema[]> {
    try {
      return await db.apps.orderBy('updatedAt').reverse().toArray();
    } catch {
      return [];
    }
  },

  /** Load apps with pagination — scalable for large datasets */
  async getPaginated(
    page: number = 1,
    pageSize: number = 12
  ): Promise<PaginatedResult<AppSchema>> {
    try {
      const total = await db.apps.count();
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      const safePage = Math.min(Math.max(1, page), totalPages);
      const offset = (safePage - 1) * pageSize;

      const items = await db.apps
        .orderBy('updatedAt')
        .reverse()
        .offset(offset)
        .limit(pageSize)
        .toArray();

      return { items, total, page: safePage, pageSize, totalPages };
    } catch {
      return { items: [], total: 0, page, pageSize, totalPages: 0 };
    }
  },

  /** Search apps by name or description with pagination */
  async search(
    query: string,
    page: number = 1,
    pageSize: number = 12
  ): Promise<PaginatedResult<AppSchema>> {
    try {
      const all = await db.apps.toArray();
      const q = query.toLowerCase();
      const filtered = all.filter(
        (app) =>
          app.name.toLowerCase().includes(q) ||
          app.description.toLowerCase().includes(q)
      );
      const total = filtered.length;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      const safePage = Math.min(Math.max(1, page), totalPages);
      const offset = (safePage - 1) * pageSize;

      // Sort by updatedAt descending
      filtered.sort((a, b) => b.updatedAt - a.updatedAt);

      return {
        items: filtered.slice(offset, offset + pageSize),
        total,
        page: safePage,
        pageSize,
        totalPages,
      };
    } catch {
      return { items: [], total: 0, page, pageSize, totalPages: 0 };
    }
  },

  /** Count total apps */
  async count(): Promise<number> {
    try {
      return await db.apps.count();
    } catch {
      return 0;
    }
  },

  /** Get a single app by ID */
  async getById(id: string): Promise<AppSchema | undefined> {
    try {
      return await db.apps.get(id);
    } catch {
      return undefined;
    }
  },

  /** Save a new app */
  async create(app: AppSchema): Promise<void> {
    await db.apps.add(app);
  },

  /** Update an existing app */
  async update(id: string, updates: Partial<AppSchema>): Promise<void> {
    await db.apps.update(id, { ...updates, updatedAt: Date.now() });
  },

  /** Delete an app */
  async remove(id: string): Promise<void> {
    await db.apps.delete(id);
  },

  /** Bulk save (for initial load or sync) */
  async bulkSave(apps: AppSchema[]): Promise<void> {
    await db.apps.bulkPut(apps);
  },

  /** Clear all data */
  async clearAll(): Promise<void> {
    await db.apps.clear();
  },
};
