'use client';

import { db } from './db';
import type { AppSchema } from '@/types/schema';
import type { SortConfig } from '@/services/dashboardSortService';
import { sortApps } from '@/services/dashboardSortService';

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
    pageSize: number = 12,
    sort?: SortConfig
  ): Promise<PaginatedResult<AppSchema>> {
    try {
      const total = await db.apps.count();
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      const safePage = Math.min(Math.max(1, page), totalPages);
      const offset = (safePage - 1) * pageSize;

      let items: AppSchema[];

      if (sort && (sort.field !== 'updatedAt' || sort.direction !== 'desc')) {
        // For non-default sorts, load all and sort in-memory
        const all = await db.apps.orderBy('updatedAt').reverse().toArray();
        const sorted = sortApps(all, sort);
        items = sorted.slice(offset, offset + pageSize);
      } else {
        // Default: sort by updatedAt desc (uses IndexedDB index efficiently)
        items = await db.apps
          .orderBy('updatedAt')
          .reverse()
          .offset(offset)
          .limit(pageSize)
          .toArray();
      }

      return { items, total, page: safePage, pageSize, totalPages };
    } catch {
      return { items: [], total: 0, page, pageSize, totalPages: 0 };
    }
  },

  /** Search apps by name or description with pagination — optimized for large datasets */
  async search(
    query: string,
    page: number = 1,
    pageSize: number = 12,
    sort?: SortConfig
  ): Promise<PaginatedResult<AppSchema>> {
    try {
      const q = query.toLowerCase().trim();

      // If query looks like a name prefix (no spaces or short), use indexed prefix search
      if (q.length > 0 && !q.includes(' ')) {
        const prefixResults = await db.apps
          .where('name')
          .startsWithIgnoreCase(q)
          .reverse()
          .sortBy('updatedAt');

        const matched = prefixResults.filter(
          (app) =>
            app.name.toLowerCase().includes(q) ||
            app.description.toLowerCase().includes(q)
        );

        const sorted = sort ? sortApps(matched, sort) : matched;
        const total = sorted.length;
        const totalPages = Math.max(1, Math.ceil(total / pageSize));
        const safePage = Math.min(Math.max(1, page), totalPages);
        const offset = (safePage - 1) * pageSize;

        return {
          items: sorted.slice(offset, offset + pageSize),
          total,
          page: safePage,
          pageSize,
          totalPages,
        };
      }

      // For generic queries, use Dexie collection filter
      const all = await db.apps
        .orderBy('updatedAt')
        .reverse()
        .filter((app) =>
          app.name.toLowerCase().includes(q) ||
          app.description.toLowerCase().includes(q)
        )
        .toArray();

      const sorted = sort ? sortApps(all, sort) : all;
      const total = sorted.length;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      const safePage = Math.min(Math.max(1, page), totalPages);
      const offset = (safePage - 1) * pageSize;

      return {
        items: sorted.slice(offset, offset + pageSize),
        total,
        page: safePage,
        pageSize,
        totalPages,
      };
    } catch {
      return { items: [], total: 0, page, pageSize, totalPages: 0 };
    }
  },

  /** Get recently updated apps (for dashboard quick-load) */
  async getRecentApps(limit: number = 6): Promise<AppSchema[]> {
    try {
      return await db.apps
        .orderBy('updatedAt')
        .reverse()
        .limit(limit)
        .toArray();
    } catch {
      return [];
    }
  },

  /** Get apps whose name starts with a given prefix (autocomplete) */
  async getByNamePrefix(
    prefix: string,
    limit: number = 10
  ): Promise<AppSchema[]> {
    try {
      if (!prefix.trim()) return [];
      return await db.apps
        .where('name')
        .startsWithIgnoreCase(prefix.trim())
        .limit(limit)
        .toArray();
    } catch {
      return [];
    }
  },

  /** Batch delete multiple apps at once */
  async batchRemove(ids: string[]): Promise<void> {
    try {
      await db.apps.bulkDelete(ids);
    } catch (error) {
      console.error('[MicroAppRepo] batchRemove failed:', error);
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
