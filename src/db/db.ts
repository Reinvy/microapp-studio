'use client';

import Dexie, { type Table } from 'dexie';
import type { AppSchema } from '@/types/schema';
import type { SiteContent } from './contentRepo';

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
  }
}

export const db = new MicroAppDB();
