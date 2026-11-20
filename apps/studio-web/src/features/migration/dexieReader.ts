/**
 * Read-only access to the Phase 0 Dexie database for the migration step.
 *
 * Nothing here deletes data: the legacy database stays intact until the user
 * explicitly removes it after a verified migration.
 */

import { db } from '@/db/db';
import type { LegacyApp, LegacyReader } from './phase0Migration';

export const dexieReader: LegacyReader = {
  async count(store) {
    try {
      return await db.table(store).count();
    } catch {
      return 0;
    }
  },
  async apps() {
    try {
      const rows = (await db.table('apps').toArray()) as unknown as LegacyApp[];
      return rows;
    } catch {
      return [];
    }
  },
  async exportJson() {
    const dump: Record<string, unknown[]> = {};
    for (const store of ['apps', 'content', 'runHistory']) {
      try {
        dump[store] = (await db.table(store).toArray()) as unknown[];
      } catch {
        dump[store] = [];
      }
    }
    return JSON.stringify(dump);
  },
};
