'use client';

import { useState, useEffect } from 'react';
import {
  Layout,
  Braces,
  Layers,
  BarChart3,
} from 'lucide-react';
import { dashboardStatsService, type DashboardStats } from '@/services/dashboardStatsService';
import { contentService } from '@/services/contentService';
import { formatCountTemplate, type DashboardStatsCopy } from '@/db/contentRepo';

const defaultStats: DashboardStats = {
  totalApps: 0,
  totalFields: 0,
  totalLogicNodes: 0,
  avgFieldsPerApp: 0,
  fieldTypeDistribution: [],
  appsByMonth: [],
  topFieldType: null,
  recentlyUpdated: 0,
};

// DB-driven copy ('dashboard-stats-copy' via contentRepo) — fallback keeps
// first paint intact and mirrors the seeded defaults exactly.
const defaultCopy: DashboardStatsCopy = {
  appsLabel: 'Apps',
  fieldsLabel: 'Fields',
  logicLabel: 'Logic',
  topTypeLabel: 'Top Type',
  weekTemplate: '+{count} this week',
  avgTemplate: 'Avg {count} per app',
  fieldCountTemplate: '{count} fields',
  noValue: '—',
};

export default function DashboardStats() {
  const [stats, setStats] = useState<DashboardStats>(defaultStats);
  const [copy, setCopy] = useState<DashboardStatsCopy>(defaultCopy);

  useEffect(() => {
    dashboardStatsService.getStats().then(setStats);
    // Load DB-driven stat-card copy — falls back to the defaults above.
    contentService.getContent<DashboardStatsCopy>('dashboard-stats-copy').then((c) => {
      if (c) setCopy(c);
    }).catch(() => {});
  }, []);

  if (stats.totalApps === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {/* Total Apps */}
      <div className="clay-card p-3">
        <div className="flex items-center gap-2 mb-1">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg clay-sm bg-[#D5B8F5]">
            <Layout className="h-3 w-3 text-clay-foreground" />
          </div>
          <span className="text-[10px] font-medium text-clay-muted uppercase tracking-wider">{copy.appsLabel}</span>
        </div>
        <p className="text-xl font-bold text-clay-foreground">{stats.totalApps}</p>
        {stats.recentlyUpdated > 0 && (
          <p className="text-[10px] text-clay-muted">{formatCountTemplate(copy.weekTemplate, stats.recentlyUpdated)}</p>
        )}
      </div>

      {/* Total Fields */}
      <div className="clay-card p-3">
        <div className="flex items-center gap-2 mb-1">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg clay-sm bg-[#C5E8F7]">
            <Layers className="h-3 w-3 text-clay-foreground" />
          </div>
          <span className="text-[10px] font-medium text-clay-muted uppercase tracking-wider">{copy.fieldsLabel}</span>
        </div>
        <p className="text-xl font-bold text-clay-foreground">{stats.totalFields}</p>
        <p className="text-[10px] text-clay-muted">{formatCountTemplate(copy.avgTemplate, stats.avgFieldsPerApp)}</p>
      </div>

      {/* Logic Nodes */}
      <div className="clay-card p-3">
        <div className="flex items-center gap-2 mb-1">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg clay-sm bg-[#C5F0D5]">
            <Braces className="h-3 w-3 text-clay-foreground" />
          </div>
          <span className="text-[10px] font-medium text-clay-muted uppercase tracking-wider">{copy.logicLabel}</span>
        </div>
        <p className="text-xl font-bold text-clay-foreground">{stats.totalLogicNodes}</p>
      </div>

      {/* Top Field Type */}
      <div className="clay-card p-3">
        <div className="flex items-center gap-2 mb-1">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg clay-sm bg-[#FFF2C5]">
            <BarChart3 className="h-3 w-3 text-clay-foreground" />
          </div>
          <span className="text-[10px] font-medium text-clay-muted uppercase tracking-wider">{copy.topTypeLabel}</span>
        </div>
        {stats.topFieldType ? (
          <>
            <p className="text-xl font-bold text-clay-foreground">{stats.topFieldType.label}</p>
            <p className="text-[10px] text-clay-muted">{formatCountTemplate(copy.fieldCountTemplate, stats.topFieldType.count)}</p>
          </>
        ) : (
          <p className="text-sm text-clay-muted">{copy.noValue}</p>
        )}
      </div>
    </div>
  );
}
