'use client';

import { db } from './db';
import type { AppSchema, FieldType } from '@/types/schema';
import type { SortConfig } from '@/services/dashboardSortService';
import { sortApps } from '@/services/dashboardSortService';
import { buildSearchName, withSearchIndex } from '@/lib/searchIndex';
import { sanitizeAppRecord, type ImportSummary } from '@/lib/backup';

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface StatsOverview {
  /** Total apps — exact, via indexed count() (no table scan). */
  totalApps: number;
  /** Apps updated within the last 7 days — exact, via indexed range count. */
  recentlyUpdated: number;
  /** Monthly creation trend — derived from `createdAt` index keys only (no record materialization). */
  appsByMonth: Array<{ month: string; count: number }>;
  /** Total fields across the bounded sample of most-recent apps. */
  totalFields: number;
  /** Total logic nodes across the bounded sample of most-recent apps. */
  totalLogicNodes: number;
  /** Average fields per app over the bounded sample. */
  avgFieldsPerApp: number;
  /** Field-type counts — bounded-memory aggregation (exact when dataset <= FIELD_STATS_SAMPLE_CAP). */
  fieldTypeCounts: Array<{ type: FieldType; count: number }>;
  /** How many apps were scanned for field-level stats (<= FIELD_STATS_SAMPLE_CAP). */
  fieldStatsSampleSize: number;
}

/** Max apps scanned for field-level stats — keeps dashboard aggregation bounded-memory at scale. */
const FIELD_STATS_SAMPLE_CAP = 500;
/** "Recently updated" window used by getStatsOverview(). */
const RECENT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
/** Chunk size for exportAll() offset/limit reads — bounds peak memory on very large datasets. */
const EXPORT_CHUNK_SIZE = 100;
/** Chunk size for importApps() batched writes — stays well under IndexedDB transaction limits. */
const IMPORT_CHUNK_SIZE = 100;

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

  /**
   * Lightweight dashboard stats — optimized for large datasets.
   *
   * Strategy vs. the old full-table `getAll()` load:
   * - `totalApps` / `recentlyUpdated` → indexed `count()` / range count (O(1)-ish, no scan).
   * - `appsByMonth` → reads ONLY `createdAt` index keys (`orderBy().keys()`), never
   *   materializing full records — memory cost drops from O(n × recordSize) to O(n × 8 bytes).
   * - Field-level stats (fields, logic nodes, type distribution) → bounded-memory scan of the
   *   FIELD_STATS_SAMPLE_CAP most recently updated apps. Exact for datasets up to the cap,
   *   and guarantees a constant upper bound on memory/CPU for arbitrarily large datasets.
   */
  async getStatsOverview(): Promise<StatsOverview> {
    try {
      // Exact indexed count — no table scan.
      const totalApps = await db.apps.count();
      if (totalApps === 0) {
        return {
          totalApps: 0,
          recentlyUpdated: 0,
          appsByMonth: [],
          totalFields: 0,
          totalLogicNodes: 0,
          avgFieldsPerApp: 0,
          fieldTypeCounts: [],
          fieldStatsSampleSize: 0,
        };
      }

      // Indexed range count for the 7-day activity window.
      const recentlyUpdated = await db.apps
        .where('updatedAt')
        .above(Date.now() - RECENT_WINDOW_MS)
        .count();

      // Monthly creation trend from `createdAt` index keys only — no record materialization.
      const createdAtKeys = (await db.apps.orderBy('createdAt').keys()) as number[];
      const monthCounts = new Map<string, number>();
      for (const ts of createdAtKeys) {
        const d = new Date(ts);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthCounts.set(key, (monthCounts.get(key) || 0) + 1);
      }
      const appsByMonth = Array.from(monthCounts.entries())
        .map(([month, count]) => ({ month, count }))
        .sort((a, b) => a.month.localeCompare(b.month));

      // Bounded-memory field aggregation over the most recently updated apps.
      const sample = await db.apps
        .orderBy('updatedAt')
        .reverse()
        .limit(FIELD_STATS_SAMPLE_CAP)
        .toArray();
      const sampleSize = sample.length;
      let totalFields = 0;
      let totalLogicNodes = 0;
      const typeCounts = new Map<FieldType, number>();
      for (const app of sample) {
        totalFields += app.fields.length;
        totalLogicNodes += app.logicNodes?.length || 0;
        for (const field of app.fields) {
          typeCounts.set(field.type, (typeCounts.get(field.type) || 0) + 1);
        }
      }
      const fieldTypeCounts = Array.from(typeCounts.entries())
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count);

      return {
        totalApps,
        recentlyUpdated,
        appsByMonth,
        totalFields,
        totalLogicNodes,
        avgFieldsPerApp:
          sampleSize > 0 ? Math.round((totalFields / sampleSize) * 10) / 10 : 0,
        fieldTypeCounts,
        fieldStatsSampleSize: sampleSize,
      };
    } catch {
      return {
        totalApps: 0,
        recentlyUpdated: 0,
        appsByMonth: [],
        totalFields: 0,
        totalLogicNodes: 0,
        avgFieldsPerApp: 0,
        fieldTypeCounts: [],
        fieldStatsSampleSize: 0,
      };
    }
  },

  /**
   * Export all apps as a portable backup payload.
   *
   * Reads in bounded chunks (offset/limit over the updatedAt index) instead of
   * one giant full-table toArray(), so peak memory stays O(chunk) + O(records
   * serialized) regardless of dataset size. The backup envelope/versioning and
   * validation live in lib/backup.ts (pure, unit-tested).
   */
  async exportAll(): Promise<{ apps: AppSchema[]; exportedAt: number }> {
    try {
      const total = await db.apps.count();
      const apps: AppSchema[] = [];
      for (let offset = 0; offset < total; offset += EXPORT_CHUNK_SIZE) {
        const chunk = await db.apps
          .orderBy('updatedAt')
          .reverse()
          .offset(offset)
          .limit(EXPORT_CHUNK_SIZE)
          .toArray();
        apps.push(...chunk);
        if (chunk.length < EXPORT_CHUNK_SIZE) break;
      }
      return { apps, exportedAt: Date.now() };
    } catch (error) {
      console.error('[MicroAppRepo] exportAll failed:', error);
      return { apps: [], exportedAt: Date.now() };
    }
  },

  /**
   * Import apps from a backup payload.
   *
   * - `merge` mode: records whose id already exists overwrite the existing app
   *   (counted as `replaced`); new ids are added (`imported`).
   * - `replace` mode: the apps table is cleared first, then all records are
   *   written (`imported`).
   *
   * Writes happen inside a single readwrite transaction in chunks of
   * IMPORT_CHUNK_SIZE so very large backups never exceed IndexedDB transaction
   * limits. Every record is sanitized (validated + search-key backfilled)
   * before persisting; broken records are counted as `failed` and skipped.
   */
  async importApps(
    apps: AppSchema[],
    mode: 'merge' | 'replace' = 'merge'
  ): Promise<ImportSummary> {
    const summary: ImportSummary = { imported: 0, replaced: 0, skipped: 0, failed: 0 };
    if (apps.length === 0) return summary;

    try {
      const sanitized = apps
        .map((record) => sanitizeAppRecord(record))
        .filter((app): app is AppSchema => app !== null);
      summary.failed = apps.length - sanitized.length;
      if (sanitized.length === 0) return summary;

      await db.transaction('rw', db.apps, async () => {
        if (mode === 'replace') {
          await db.apps.clear();
          for (let i = 0; i < sanitized.length; i += IMPORT_CHUNK_SIZE) {
            await db.apps.bulkPut(sanitized.slice(i, i + IMPORT_CHUNK_SIZE));
          }
          summary.imported = sanitized.length;
        } else {
          // merge — dedupe by id against the existing table
          const existing = new Set(
            (
              await db.apps.bulkGet(sanitized.map((app) => app.id))
            )
              .filter((app): app is AppSchema => app !== undefined)
              .map((app) => app.id)
          );
          for (let i = 0; i < sanitized.length; i += IMPORT_CHUNK_SIZE) {
            await db.apps.bulkPut(sanitized.slice(i, i + IMPORT_CHUNK_SIZE));
          }
          for (const app of sanitized) {
            if (existing.has(app.id)) summary.replaced++;
            else summary.imported++;
          }
        }
      });

      return summary;
    } catch (error) {
      console.error('[MicroAppRepo] importApps failed:', error);
      // Import is all-or-nothing inside the transaction — if it threw, nothing
      // was persisted, so report every record as failed.
      summary.imported = 0;
      summary.replaced = 0;
      summary.skipped = 0;
      summary.failed = apps.length;
      return summary;
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
