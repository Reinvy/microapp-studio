'use client';

import Dexie, { type Table } from 'dexie';
import type { AppSchema } from '@/types/schema';

export class MicroAppDB extends Dexie {
  apps!: Table<AppSchema, string>;

  constructor() {
    super('MicroAppStudio');
    this.version(1).stores({
      apps: 'id, name, createdAt, updatedAt',
    });
  }
}

export const db = new MicroAppDB();
