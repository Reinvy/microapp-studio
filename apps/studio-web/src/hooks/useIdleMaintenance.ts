'use client';

import { useEffect } from 'react';
import { maintenanceService } from '@/services/maintenanceService';

/**
 * useIdleMaintenance — schedule one background self-healing pass per session.
 *
 * The maintenance pass (search-index backfill, run-history retention prune,
 * stats-cache warm) runs during the browser's first idle period after mount,
 * so first paint and the initial data load are never blocked. The service is
 * idempotent (single-flight, once-per-session), so React StrictMode
 * double-mounts and multiple pages calling this hook share a single pass.
 */
export function useIdleMaintenance(): void {
  useEffect(() => {
    const cancel = maintenanceService.scheduleIdleMaintenance();
    return cancel;
  }, []);
}
