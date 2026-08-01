'use client';

import Dexie, { type Table } from 'dexie';
import type { AppSchema } from '@/types/schema';
import type { SiteContent } from './contentRepo';
import { buildSearchName } from '@/lib/searchIndex';

export class MicroAppDB extends Dexie {
  apps!: Table<AppSchema, string>;
  content!: Table<SiteContent, string>;

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
  }
}

export const db = new MicroAppDB();
