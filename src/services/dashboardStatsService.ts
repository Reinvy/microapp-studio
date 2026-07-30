'use client';

import { microAppRepo } from '@/db/microAppRepo';
import type { AppSchema, FieldType } from '@/types/schema';

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
      const apps = await microAppRepo.getAll();

      if (apps.length === 0) {
        const empty: DashboardStats = {
          totalApps: 0,
          totalFields: 0,
          totalLogicNodes: 0,
          avgFieldsPerApp: 0,
          fieldTypeDistribution: [],
          appsByMonth: [],
          topFieldType: null,
        };
        this.cache = { data: empty, timestamp: now };
        return empty;
      }

      const totalFields = apps.reduce((sum, app) => sum + app.fields.length, 0);
      const totalLogicNodes = apps.reduce((sum, app) => sum + (app.logicNodes?.length || 0), 0);
      const avgFieldsPerApp = Math.round((totalFields / apps.length) * 10) / 10;

      // Field type distribution
      const typeCounts = new Map<FieldType, number>();
      for (const app of apps) {
        for (const field of app.fields) {
          typeCounts.set(field.type, (typeCounts.get(field.type) || 0) + 1);
        }
      }

      const fieldTypeDistribution = Array.from(typeCounts.entries())
        .map(([type, count]) => ({ type, label: FIELD_TYPE_LABELS[type] || type, count }))
        .sort((a, b) => b.count - a.count);

      // Apps by month
      const monthCounts = new Map<string, number>();
      for (const app of apps) {
        const date = new Date(app.createdAt);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthCounts.set(key, (monthCounts.get(key) || 0) + 1);
      }

      const appsByMonth = Array.from(monthCounts.entries())
        .map(([month, count]) => ({ month, count }))
        .sort((a, b) => a.month.localeCompare(b.month));

      const stats: DashboardStats = {
        totalApps: apps.length,
        totalFields,
        totalLogicNodes,
        avgFieldsPerApp,
        fieldTypeDistribution: fieldTypeDistribution.slice(0, 8), // top 8 types
        appsByMonth,
        topFieldType: fieldTypeDistribution[0] || null,
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
      };
    }
  }

  invalidateCache(): void {
    this.cache = { data: null, timestamp: 0 };
  }
}

/** Singleton instance */
export const dashboardStatsService = new DashboardStatsService();
