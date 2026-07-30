'use client';

import { useState, useEffect } from 'react';
import {
  Layout,
  Braces,
  Layers,
  BarChart3,
  TrendingUp,
  Box,
} from 'lucide-react';
import { dashboardStatsService, type DashboardStats } from '@/services/dashboardStatsService';

const defaultStats: DashboardStats = {
  totalApps: 0,
  totalFields: 0,
  totalLogicNodes: 0,
  avgFieldsPerApp: 0,
  fieldTypeDistribution: [],
  appsByMonth: [],
  topFieldType: null,
};

export default function DashboardStats() {
  const [stats, setStats] = useState<DashboardStats>(defaultStats);

  useEffect(() => {
    dashboardStatsService.getStats().then(setStats);
  }, []);

  if (stats.totalApps === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {/* Total Apps */}
      <div className="clay-card p-3">
        <div className="flex items-center gap-2 mb-1">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg clay-sm bg-[#D5B8F5]">
            <Layout className="h-3 w-3 text-[#5D4E37]" />
          </div>
          <span className="text-[10px] font-medium text-[#B8A898] uppercase tracking-wider">Apps</span>
        </div>
        <p className="text-xl font-bold text-[#5D4E37]">{stats.totalApps}</p>
      </div>

      {/* Total Fields */}
      <div className="clay-card p-3">
        <div className="flex items-center gap-2 mb-1">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg clay-sm bg-[#C5E8F7]">
            <Layers className="h-3 w-3 text-[#5D4E37]" />
          </div>
          <span className="text-[10px] font-medium text-[#B8A898] uppercase tracking-wider">Fields</span>
        </div>
        <p className="text-xl font-bold text-[#5D4E37]">{stats.totalFields}</p>
        <p className="text-[10px] text-[#B8A898]">Avg {stats.avgFieldsPerApp} per app</p>
      </div>

      {/* Logic Nodes */}
      <div className="clay-card p-3">
        <div className="flex items-center gap-2 mb-1">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg clay-sm bg-[#C5F0D5]">
            <Braces className="h-3 w-3 text-[#5D4E37]" />
          </div>
          <span className="text-[10px] font-medium text-[#B8A898] uppercase tracking-wider">Logic</span>
        </div>
        <p className="text-xl font-bold text-[#5D4E37]">{stats.totalLogicNodes}</p>
      </div>

      {/* Top Field Type */}
      <div className="clay-card p-3">
        <div className="flex items-center gap-2 mb-1">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg clay-sm bg-[#FFF2C5]">
            <BarChart3 className="h-3 w-3 text-[#5D4E37]" />
          </div>
          <span className="text-[10px] font-medium text-[#B8A898] uppercase tracking-wider">Top Type</span>
        </div>
        {stats.topFieldType ? (
          <>
            <p className="text-xl font-bold text-[#5D4E37]">{stats.topFieldType.label}</p>
            <p className="text-[10px] text-[#B8A898]">{stats.topFieldType.count} fields</p>
          </>
        ) : (
          <p className="text-sm text-[#B8A898]">—</p>
        )}
      </div>
    </div>
  );
}
