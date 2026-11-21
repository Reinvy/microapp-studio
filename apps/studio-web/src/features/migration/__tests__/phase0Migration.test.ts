import { describe, expect, it } from 'vitest';
import { NodeSqliteDriver } from '@/db/node-sqlite-driver';
import { applyMigrations } from '@/db/migrate';
import { ensureDefaultWorkspace } from '@/db/repositories/workspaces';
import { listAllProjects } from '@/db/repositories/studio';
import { resolveLegacyMapping } from '@/db/repositories/search';
import { migratePhase0, type LegacyReader } from '../phase0Migration';

function fakeReader(apps: Array<{ id: string; name: string }>): LegacyReader {
  return {
    async count(store) {
      return store === 'apps' ? apps.length : store === 'content' ? 3 : 2;
    },
    async apps() {
      return apps.map((app) => ({ ...app, fields: [], logicNodes: [], layout: [] }));
    },
    async exportJson() {
      return JSON.stringify({ apps });
    },
  };
}

async function fresh(): Promise<{ db: NodeSqliteDriver; workspaceId: string }> {
  const db = new NodeSqliteDriver();
  await applyMigrations(db);
  const workspace = await ensureDefaultWorkspace(db, { name: 'Rumah', locale: 'id-ID', nowMs: 1_000 });
  return { db, workspaceId: workspace.id };
}

describe('Phase 0 migration', () => {
  it('imports legacy apps as Studio drafts with a legacy id map', async () => {
    const { db, workspaceId } = await fresh();
    const summary = await migratePhase0(
      db,
      fakeReader([
        { id: 'legacy-1', name: 'Kas lama' },
        { id: 'legacy-2', name: 'Notes lama' },
      ]),
      workspaceId,
      5_000,
    );
    expect(summary).toMatchObject({ apps: 2, drafts: 2, skipped: 0, content: 3, runHistory: 2 });
    expect(summary.checksum).toMatch(/^[0-9a-f]{64}$/);

    const drafts = await listAllProjects(db, workspaceId);
    expect(drafts).toHaveLength(2);
    expect(drafts.every((draft) => draft.status === 'draft')).toBe(true);
    const mapping = await resolveLegacyMapping(db, 'apps', 'legacy-1');
    expect(mapping?.newTable).toBe('studio_project');

    const report = await db.select<{ status: string; checksum: string }>(
      'SELECT status, checksum FROM migration_report ORDER BY started_at_ms DESC LIMIT 1',
    );
    expect(report[0]?.status).toBe('done');
    expect(report[0]?.checksum).toBe(summary.checksum);
    const backups = await db.select<{ relative_path: string }>('SELECT relative_path FROM migration_backup');
    expect(backups[0]?.relative_path).toMatch(/^migration\/phase0-/);
    await db.close();
  });

  it('is idempotent: a second run skips already-mapped apps', async () => {
    const { db, workspaceId } = await fresh();
    const reader = fakeReader([{ id: 'legacy-1', name: 'Kas lama' }]);
    const first = await migratePhase0(db, reader, workspaceId, 5_000);
    const second = await migratePhase0(db, reader, workspaceId, 6_000);
    expect(first.drafts).toBe(1);
    expect(second.drafts).toBe(0);
    expect(second.skipped).toBe(1);
    expect(await listAllProjects(db, workspaceId)).toHaveLength(1);
    await db.close();
  });
});
