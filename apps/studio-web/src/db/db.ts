'use client';

import Dexie, { type Table } from 'dexie';
import type { AppSchema } from '@/types/schema';
import { buildSearchName } from '@/lib/searchIndex';

/**
 * Read-only view of the Phase 0 Dexie database.
 *
 * The v3 host uses SQLite exclusively; this schema survives only so the one-off
 * migration can read `apps` from an existing installation. Declared versions must
 * stay at 6 — lowering them would make Dexie refuse to open a real user database.
 */
export class MicroAppDB extends Dexie {
  apps!: Table<AppSchema, string>;

  constructor() {
    super('MicroAppStudio');
    this.version(1).stores({
      apps: 'id, name, createdAt, updatedAt',
    });
    this.version(2).stores({
      apps: 'id, name, createdAt, updatedAt',
      content: 'id, type',
    });
    this.version(3).stores({
      apps: 'id, name, createdAt, updatedAt, [name+updatedAt]',
      content: 'id, type',
    });
    // v4 — add `nameLower` index for O(log n) case-insensitive prefix search.
    // Backfills the denormalized key for legacy records during the upgrade.
    this.version(4)
      .stores({
        apps: 'id, name, nameLower, createdAt, updatedAt, [name+updatedAt]',
        content: 'id, type',
      })
      .upgrade((tx) =>
        tx
          .table('apps')
          .toCollection()
          .modify((app: AppSchema) => {
            if (!app.nameLower) {
              app.nameLower = buildSearchName(app.name);
            }
          })
      );
    // v5 — add `runHistory` table for the bounded run-history trail.
    // `ranAt` is indexed so "recent runs" and "runs today/this week" are
    // indexed range reads, and the retention prune can delete the oldest
    // records via primary keys without a full-table scan. `appId` is indexed
    // so per-app run counts stay O(log n) as the trail grows.
    this.version(5).stores({
      apps: 'id, name, nameLower, createdAt, updatedAt, [name+updatedAt]',
      content: 'id, type',
      runHistory: 'id, appId, ranAt',
    });
    // v6 — add `[updatedAt+id]` compound index for KEYSET (cursor-based)
    // pagination. Offset pagination (`offset(n).limit(k)`) degrades to O(n)
    // on large datasets because IndexedDB skips every preceding record;
    // keyset reads with this index touch only the page slice — O(log n + k)
    // per page regardless of depth. `id` breaks `updatedAt` ties so cursors
    // are unambiguous. Additive migration: no data rewrite for existing
    // indexes, just the new index is built.
    this.version(6).stores({
      apps: 'id, name, nameLower, createdAt, updatedAt, [name+updatedAt], [updatedAt+id]',
      content: 'id, type',
      runHistory: 'id, appId, ranAt',
    });
  }
}

export const db = new MicroAppDB();
