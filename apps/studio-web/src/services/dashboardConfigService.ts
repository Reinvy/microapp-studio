'use client';

import { contentRepo } from '@/db/contentRepo';
import {
  DEFAULT_DASHBOARD_CONFIG,
  sanitizeDashboardConfig,
  type DashboardConfig,
} from '@/lib/dashboardConfig';

/**
 * DashboardConfigService — loads the runtime-tunable dashboard configuration
 * from IndexedDB (`dashboard-config` content record).
 *
 * Scalability properties:
 * - **Single read gate**: every dashboard consumer (search placeholder,
 *   debounce delay, sort menu, page-size control) gets its config from one
 *   place, so behavior can be changed at runtime without a redeploy.
 * - **Short TTL cache**: repeated reads within the TTL window never touch
 *   IndexedDB again (the dashboard renders config in several spots).
 * - **In-flight coalescing**: concurrent first loads share one IndexedDB
 *   round-trip.
 * - **Fail-safe**: any read error or corrupt record falls back to
 *   DEFAULT_DASHBOARD_CONFIG via sanitizeDashboardConfig — the dashboard
 *   always renders, never crashes on bad config data.
 */

const CONFIG_TYPE = 'dashboard-config';
const CACHE_TTL_MS = 10_000; // 10 seconds

class DashboardConfigService {
  private cache: { config: DashboardConfig; timestamp: number } | null = null;
  private inFlight: Promise<DashboardConfig> | null = null;

  /** Load (and cache) the dashboard configuration. Never rejects. */
  async load(): Promise<DashboardConfig> {
    const now = Date.now();
    if (this.cache && now - this.cache.timestamp < CACHE_TTL_MS) {
      return this.cache.config;
    }
    if (this.inFlight) {
      return this.inFlight;
    }
    this.inFlight = this.fetch().finally(() => {
      this.inFlight = null;
    });
    return this.inFlight;
  }

  /** Clear the cache so the next load() re-reads IndexedDB (tests/devtools). */
  invalidateCache(): void {
    this.cache = null;
  }

  private async fetch(): Promise<DashboardConfig> {
    try {
      const content = await contentRepo.getByType(CONFIG_TYPE);
      const config = sanitizeDashboardConfig(content?.data);
      this.cache = { config, timestamp: Date.now() };
      return config;
    } catch (error) {
      console.error('[DashboardConfigService] load failed, using defaults:', error);
      const config = DEFAULT_DASHBOARD_CONFIG;
      this.cache = { config, timestamp: Date.now() };
      return config;
    }
  }
}

/** Singleton instance */
export const dashboardConfigService = new DashboardConfigService();
