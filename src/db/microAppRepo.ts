'use client';

import { db } from './db';
import type { AppSchema } from '@/types/schema';

export const microAppRepo = {
  /** Load all apps from IndexedDB */
  async getAll(): Promise<AppSchema[]> {
    try {
      return await db.apps.orderBy('updatedAt').reverse().toArray();
    } catch {
      return [];
    }
  },

  /** Get a single app by ID */
  async getById(id: string): Promise<AppSchema | undefined> {
    try {
      return await db.apps.get(id);
    } catch {
      return undefined;
    }
  },

  /** Save a new app */
  async create(app: AppSchema): Promise<void> {
    await db.apps.add(app);
  },

  /** Update an existing app */
  async update(id: string, updates: Partial<AppSchema>): Promise<void> {
    await db.apps.update(id, { ...updates, updatedAt: Date.now() });
  },

  /** Delete an app */
  async remove(id: string): Promise<void> {
    await db.apps.delete(id);
  },

  /** Bulk save (for initial load or sync) */
  async bulkSave(apps: AppSchema[]): Promise<void> {
    await db.apps.bulkPut(apps);
  },

  /** Clear all data */
  async clearAll(): Promise<void> {
    await db.apps.clear();
  },
};
