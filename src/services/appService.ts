'use client';

import { microAppRepo, type PaginatedResult } from '@/db/microAppRepo';
import type { AppSchema } from '@/types/schema';
import type { SortConfig } from './dashboardSortService';

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
}

/** Singleton instance */
export const appService = new AppService();
