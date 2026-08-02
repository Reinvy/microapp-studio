'use client';

import { microAppRepo, type PaginatedResult } from '@/db/microAppRepo';
import type { AppSchema } from '@/types/schema';
import type { SortConfig } from './dashboardSortService';
import { serializeBackup, parseBackup, type ImportSummary } from '@/lib/backup';

/**
 * AppService — Scalable service layer wrapping microAppRepo with:
 * - In-memory cache for fast reads
 * - Paginated + search queries
 * - Error handling & retry logic
 * - Debounced refresh
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL = 5_000; // 5 seconds

class AppService {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private listeners: Set<() => void> = new Set();

  // ── Cache helpers ──

  private getCached<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private clearCache(): void {
    this.cache.clear();
  }

  // ── Subscriptions (for reactive UI updates) ──

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn());
  }

  // ── Public API ──

  /** Get paginated apps with caching */
  async getApps(
    page: number = 1,
    pageSize: number = 12,
    sort?: SortConfig
  ): Promise<PaginatedResult<AppSchema>> {
    const cacheKey = `apps:${page}:${pageSize}:${sort?.field || 'updatedAt'}:${sort?.direction || 'desc'}`;
    const cached = this.getCached<PaginatedResult<AppSchema>>(cacheKey);
    if (cached) return cached;

    const result = await microAppRepo.getPaginated(page, pageSize, sort);
    this.setCache(cacheKey, result);
    return result;
  }

  /** Search apps with pagination */
  async searchApps(
    query: string,
    page: number = 1,
    pageSize: number = 12,
    sort?: SortConfig
  ): Promise<PaginatedResult<AppSchema>> {
    const cacheKey = `search:${query}:${page}:${pageSize}:${sort?.field || 'updatedAt'}:${sort?.direction || 'desc'}`;
    const cached = this.getCached<PaginatedResult<AppSchema>>(cacheKey);
    if (cached) return cached;

    const result = await microAppRepo.search(query, page, pageSize, sort);
    this.setCache(cacheKey, result);
    return result;
  }

  /** Get a single app by ID */
  async getAppById(id: string): Promise<AppSchema | undefined> {
    const cacheKey = `app:${id}`;
    const cached = this.getCached<AppSchema>(cacheKey);
    if (cached) return cached;

    const app = await microAppRepo.getById(id);
    if (app) this.setCache(cacheKey, app);
    return app;
  }

  /** Create a new app */
  async createApp(app: AppSchema): Promise<void> {
    try {
      await microAppRepo.create(app);
      this.clearCache();
      this.notify();
    } catch (error) {
      console.error('[AppService] createApp failed:', error);
      // Retry once
      await microAppRepo.create(app);
      this.clearCache();
      this.notify();
    }
  }

  /** Update an existing app */
  async updateApp(id: string, updates: Partial<AppSchema>): Promise<void> {
    try {
      await microAppRepo.update(id, updates);
      this.clearCache();
      this.notify();
    } catch (error) {
      console.error('[AppService] updateApp failed:', error);
      await microAppRepo.update(id, updates);
      this.clearCache();
      this.notify();
    }
  }

  /** Delete an app */
  async removeApp(id: string): Promise<void> {
    try {
      await microAppRepo.remove(id);
      this.clearCache();
      this.notify();
    } catch (error) {
      console.error('[AppService] removeApp failed:', error);
      await microAppRepo.remove(id);
      this.clearCache();
      this.notify();
    }
  }

  /** Get total app count */
  async getCount(): Promise<number> {
    const cacheKey = 'app:count';
    const cached = this.getCached<number>(cacheKey);
    if (cached !== null) return cached;

    const count = await microAppRepo.count();
    this.setCache(cacheKey, count);
    return count;
  }

  /** Get recently updated apps (dashboard quick-load) */
  async getRecentApps(limit: number = 6): Promise<AppSchema[]> {
    const cacheKey = `recent:${limit}`;
    const cached = this.getCached<AppSchema[]>(cacheKey);
    if (cached) return cached;

    const apps = await microAppRepo.getRecentApps(limit);
    this.setCache(cacheKey, apps);
    return apps;
  }

  /** Get apps by name prefix (autocomplete) */
  async getByNamePrefix(prefix: string, limit: number = 10): Promise<AppSchema[]> {
    if (!prefix.trim()) return [];
    return await microAppRepo.getByNamePrefix(prefix, limit);
  }

  /** Batch fetch apps by IDs (single bulkGet round trip) */
  async getAppsByIds(ids: string[]): Promise<AppSchema[]> {
    if (ids.length === 0) return [];
    const cacheKey = `apps:ids:${[...ids].sort().join(',')}`;
    const cached = this.getCached<AppSchema[]>(cacheKey);
    if (cached) return cached;

    const apps = await microAppRepo.getByIds(ids);
    this.setCache(cacheKey, apps);
    return apps;
  }

  /**
   * Backfill the `nameLower` search index for legacy records.
   * Self-healing maintenance — safe to call on app boot.
   */
  async reindexSearchNames(): Promise<number> {
    return await microAppRepo.reindexSearchNames();
  }

  /** Batch delete multiple apps */
  async batchRemoveApps(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    try {
      await microAppRepo.batchRemove(ids);
      this.clearCache();
      this.notify();
    } catch (error) {
      console.error('[AppService] batchRemoveApps failed:', error);
    }
  }

  /**
   * Export all apps as a portable JSON backup string.
   * Uses the chunked repo read, then serializes via lib/backup (pure).
   */
  async exportApps(): Promise<string> {
    const { apps, exportedAt } = await microAppRepo.exportAll();
    return serializeBackup(apps, exportedAt);
  }

  /**
   * Import apps from a backup JSON string.
   * Parses + validates the envelope (throws Error with a clear message on
   * malformed input), performs the batched transactional write, then clears
   * the read cache and notifies subscribers so the UI reflects the change.
   */
  async importApps(
    json: string,
    mode: 'merge' | 'replace' = 'merge'
  ): Promise<ImportSummary> {
    const backup = parseBackup(json);
    const summary = await microAppRepo.importApps(backup.apps, mode);
    this.clearCache();
    this.notify();
    return summary;
  }
}

/** Singleton instance */
export const appService = new AppService();
