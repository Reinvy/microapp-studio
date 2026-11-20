'use client';

import { microAppRepo } from '@/db/microAppRepo';
import type { FieldType } from '@/types/schema';

/**
 * DashboardStatsService — Aggregates app statistics for scalable dashboard insight.
 *
 * Features:
 * - Total apps, fields, logic nodes
 * - Most-used field types (top 5)
 * - App creation trends (apps by month)
 * - Average complexity score
 *
 * All data computed from IndexedDB — no hardcoded state.
 */

export interface DashboardStats {
  totalApps: number;
  totalFields: number;
  totalLogicNodes: number;
  avgFieldsPerApp: number;
  fieldTypeDistribution: Array<{ type: FieldType; label: string; count: number }>;
  appsByMonth: Array<{ month: string; count: number }>;
  topFieldType: { type: FieldType; label: string; count: number } | null;
  /** Apps updated within the last 7 days (indexed range count). */
  recentlyUpdated: number;
}

const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: 'Text',
  number: 'Number',
  select: 'Select',
  checkbox: 'Checkbox',
  textarea: 'Textarea',
  date: 'Date',
  file: 'File',
  slider: 'Slider',
  toggle: 'Toggle',
  heading: 'Heading',
  paragraph: 'Paragraph',
  divider: 'Divider',
  spacer: 'Spacer',
  image: 'Image',
  card: 'Card',
  button: 'Button',
  color: 'Color',
  email: 'Email',
  phone: 'Phone',
  url: 'URL',
  rating: 'Rating',
};

class DashboardStatsService {
  private cache: { data: DashboardStats | null; timestamp: number } = { data: null, timestamp: 0 };
  private readonly CACHE_TTL = 10_000; // 10 seconds

  async getStats(): Promise<DashboardStats> {
    const now = Date.now();
    if (this.cache.data && now - this.cache.timestamp < this.CACHE_TTL) {
      return this.cache.data;
    }

    try {
      // Optimized: indexed counts + index-key reads + bounded-memory aggregation,
      // instead of materializing the entire apps table via getAll().
      const overview = await microAppRepo.getStatsOverview();

      if (overview.totalApps === 0) {
        const empty: DashboardStats = {
          totalApps: 0,
          totalFields: 0,
          totalLogicNodes: 0,
          avgFieldsPerApp: 0,
          fieldTypeDistribution: [],
          appsByMonth: [],
          topFieldType: null,
          recentlyUpdated: 0,
        };
        this.cache = { data: empty, timestamp: now };
        return empty;
      }

      const fieldTypeDistribution = overview.fieldTypeCounts.map(({ type, count }) => ({
        type,
        label: FIELD_TYPE_LABELS[type] || type,
        count,
      }));

      const stats: DashboardStats = {
        totalApps: overview.totalApps,
        totalFields: overview.totalFields,
        totalLogicNodes: overview.totalLogicNodes,
        avgFieldsPerApp: overview.avgFieldsPerApp,
        fieldTypeDistribution: fieldTypeDistribution.slice(0, 8), // top 8 types
        appsByMonth: overview.appsByMonth,
        topFieldType: fieldTypeDistribution[0] || null,
        recentlyUpdated: overview.recentlyUpdated,
      };

      this.cache = { data: stats, timestamp: now };
      return stats;
    } catch {
      return {
        totalApps: 0,
        totalFields: 0,
        totalLogicNodes: 0,
        avgFieldsPerApp: 0,
        fieldTypeDistribution: [],
        appsByMonth: [],
        topFieldType: null,
        recentlyUpdated: 0,
      };
    }
  }

  invalidateCache(): void {
    this.cache = { data: null, timestamp: 0 };
  }
}

/** Singleton instance */
export const dashboardStatsService = new DashboardStatsService();
