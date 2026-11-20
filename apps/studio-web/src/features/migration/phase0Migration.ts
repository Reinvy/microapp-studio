/**
 * Phase 0 (Dexie v6) migration into the SQLite host.
 *
 * The legacy database is read-only here: apps become Studio drafts, content and
 * run history are counted and exported, each legacy id maps to a new id in
 * `legacy_record_map`, and a report records the outcome. Dexie is never deleted
 * by this module; that stays an explicit user action after a successful run.
 */

import type { HostDb } from '@/db/driver';
import { uuidv7 } from '@/db/ids';
import {
  finishMigrationReport,
  recordLegacyMapping,
  recordMigrationBackup,
  resolveLegacyMapping,
  startMigrationReport,
} from '@/db/repositories/search';
import { createStudioDraft } from '@/db/repositories/search';

export interface LegacyApp {
  id: string;
  name?: string;
  description?: string;
  prompt?: string;
  fields?: unknown;
  logicNodes?: unknown;
  layout?: unknown;
  createdAt?: number;
  updatedAt?: number;
}

export interface LegacyReader {
  count(store: 'apps' | 'content' | 'runHistory'): Promise<number>;
  apps(): Promise<LegacyApp[]>;
  exportJson(): Promise<string>;
}

export interface MigrationSummary {
  reportId: string;
  apps: number;
  drafts: number;
  content: number;
  runHistory: number;
  skipped: number;
  checksum: string;
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Import Phase 0 records. Idempotent: an app already present in
 * `legacy_record_map` is skipped instead of duplicated.
 */
export async function migratePhase0(
  db: HostDb,
  reader: LegacyReader,
  workspaceId: string,
  nowMs = Date.now(),
): Promise<MigrationSummary> {
  const content = await reader.count('content');
  const runHistory = await reader.count('runHistory');
  const legacyApps = await reader.apps();
  const exportJson = await reader.exportJson();
  const checksum = await sha256Hex(exportJson);

  const reportId = await startMigrationReport(db, {
    source: 'dexie-v6',
    counts: { apps: legacyApps.length, content, runHistory },
    checksum,
    nowMs,
  });

  let drafts = 0;
  let skipped = 0;
  try {
    for (const legacy of legacyApps) {
      const existing = await resolveLegacyMapping(db, 'apps', legacy.id);
      if (existing) {
        skipped += 1;
        continue;
      }
      const name = (legacy.name ?? `Phase 0 ${legacy.id}`).slice(0, 120);
      const draft = await createStudioDraft(db, {
        workspaceId,
        name,
        sourceLegacyId: legacy.id,
        document: {
          source: 'phase0',
          legacyId: legacy.id,
          description: legacy.description ?? '',
          prompt: legacy.prompt ?? '',
          fields: legacy.fields ?? [],
          logicNodes: legacy.logicNodes ?? [],
          layout: legacy.layout ?? [],
        },
        nowMs,
      });
      await recordLegacyMapping(db, {
        legacyStore: 'apps',
        legacyId: legacy.id,
        newTable: 'studio_project',
        newId: draft.id,
        nowMs,
      });
      drafts += 1;
    }
    await recordMigrationBackup(db, {
      source: 'dexie-v6',
      relativePath: `migration/phase0-${uuidv7(nowMs)}.json`,
      hash: hexToBytes(checksum),
      nowMs,
    });
    await finishMigrationReport(
      db,
      reportId,
      'done',
      { apps: legacyApps.length, drafts, content, runHistory, skipped },
      nowMs,
    );
  } catch (error) {
    await finishMigrationReport(db, reportId, 'failed', undefined, nowMs);
    throw error;
  }

  return {
    reportId,
    apps: legacyApps.length,
    drafts,
    content,
    runHistory,
    skipped,
    checksum,
  };
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}
