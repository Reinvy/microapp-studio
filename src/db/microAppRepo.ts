'use client';

import { db } from './db';
import type { AppSchema } from '@/types/schema';
import type { SortConfig } from '@/services/dashboardSortService';
import { sortApps } from '@/services/dashboardSortService';
import { buildSearchName, withSearchIndex } from '@/lib/searchIndex';

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

      if (sort?.field === 'name') {
        // Indexed name ordering via `nameLower` — reads only the page slice,
        // no full-table load. Case-insensitive, matches sortApps semantics closely.
        let coll = db.apps.orderBy('nameLower');
        if (sort.direction === 'desc') coll = coll.reverse();
        items = await coll.offset(offset).limit(pageSize).toArray();
      } else if (
        sort &&
        (sort.field === 'createdAt' || sort.field === 'updatedAt')
      ) {
        // Indexed timestamp ordering — both fields are indexed in the schema.
        let coll = db.apps.orderBy(sort.field);
        if (sort.direction === 'desc') coll = coll.reverse();
        items = await coll.offset(offset).limit(pageSize).toArray();
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

      // Fast path: single-word query → indexed case-insensitive prefix scan on `nameLower`.
      // Falls through to the generic scan when no name matches (e.g. description-only hits).
      if (q.length > 0 && !q.includes(' ')) {
        const prefixResults = await db.apps
          .where('nameLower')
          .startsWith(q)
          .toArray();

        const matched = prefixResults.filter(
          (app) =>
            (app.nameLower || buildSearchName(app.name)).includes(q) ||
            app.description.toLowerCase().includes(q)
        );

        if (matched.length > 0) {
          const effectiveSort: SortConfig = sort ?? {
            field: 'updatedAt',
            direction: 'desc',
          };
          const sorted = sortApps(matched, effectiveSort);
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
      }

      // Generic path: substring match over name + description.
      const all = await db.apps
        .orderBy('updatedAt')
        .reverse()
        .filter((app) =>
          app.name.toLowerCase().includes(q) ||
          app.description.toLowerCase().includes(q)
        )
        .toArray();

      const effectiveSort: SortConfig = sort ?? {
        field: 'updatedAt',
        direction: 'desc',
      };
      const sorted = sortApps(all, effectiveSort);
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
      // Indexed case-insensitive prefix scan on `nameLower`
      return await db.apps
        .where('nameLower')
        .startsWith(prefix.trim().toLowerCase())
        .limit(limit)
        .toArray();
    } catch {
      return [];
    }
  },

  /** Batch fetch multiple apps by ID (single bulkGet round trip) */
  async getByIds(ids: string[]): Promise<AppSchema[]> {
    try {
      if (ids.length === 0) return [];
      const found = await db.apps.bulkGet(ids);
      return found.filter((app): app is AppSchema => app !== undefined);
    } catch {
      return [];
    }
  },

  /**
   * Backfill the `nameLower` search index for any legacy records that lack it.
   * Self-healing maintenance helper — safe to call on boot.
   */
  async reindexSearchNames(): Promise<number> {
    try {
      const missing = await db.apps
        .filter((app) => !app.nameLower)
        .toArray();
      if (missing.length === 0) return 0;
      await db.apps.bulkPut(missing.map(withSearchIndex));
      return missing.length;
    } catch {
      return 0;
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
    await db.apps.add(withSearchIndex(app));
  },

  /** Update an existing app */
  async update(id: string, updates: Partial<AppSchema>): Promise<void> {
    const patch: Partial<AppSchema> = { ...updates, updatedAt: Date.now() };
    if (updates.name !== undefined) {
      // Keep the search index in sync when the name changes
      patch.nameLower = buildSearchName(updates.name);
    }
    await db.apps.update(id, patch);
  },

  /** Delete an app */
  async remove(id: string): Promise<void> {
    await db.apps.delete(id);
  },

  /** Bulk save (for initial load or sync) */
  async bulkSave(apps: AppSchema[]): Promise<void> {
    await db.apps.bulkPut(apps.map(withSearchIndex));
  },

  /** Clear all data */
  async clearAll(): Promise<void> {
    await db.apps.clear();
  },
};
