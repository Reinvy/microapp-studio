import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NodeSqliteDriver } from '../node-sqlite-driver';
import { applyMigrations } from '../migrate';
import { createWorkspace, ensureDefaultWorkspace, type Workspace } from '../repositories/workspaces';
import {
  createStudioProject,
  deleteStudioProject,
  getStudioProject,
  listAllProjects,
  listRecentProjects,
  saveStudioProject,
} from '../repositories/studio';

let db: NodeSqliteDriver;
let workspace: Workspace;
let other: Workspace;

beforeEach(async () => {
  db = new NodeSqliteDriver();
  await applyMigrations(db);
  workspace = await ensureDefaultWorkspace(db, { name: 'Rumah', nowMs: 1_000 });
  other = await createWorkspace(db, { name: 'Lain', nowMs: 1_001 });
});

afterEach(async () => {
  await db.close();
});

describe('studio projects', () => {
  it('bumps the revision on save and rejects a stale writer with E-STUDIO-002', async () => {
    const project = await createStudioProject(db, {
      workspaceId: workspace.id,
      name: 'Kas draft',
      document: { schemaVersion: 1, nodes: [] },
      nowMs: 2_000,
    });
    expect(project.revision).toBe(0);

    const next = await saveStudioProject(db, {
      workspaceId: workspace.id,
      projectId: project.id,
      document: { schemaVersion: 1, nodes: [{ type: 'Stack' }] },
      revision: 0,
      nowMs: 2_100,
    });
    expect(next).toBe(1);
    const saved = await getStudioProject(db, workspace.id, project.id);
    expect(saved?.revision).toBe(1);
    expect(saved?.document).toEqual({ schemaVersion: 1, nodes: [{ type: 'Stack' }] });

    // A second writer that read revision 0 must not clobber revision 1.
    await expect(
      saveStudioProject(db, {
        workspaceId: workspace.id,
        projectId: project.id,
        document: { schemaVersion: 1, nodes: [] },
        revision: 0,
        nowMs: 2_200,
      }),
    ).rejects.toThrow(/E-STUDIO-002/);
    expect((await getStudioProject(db, workspace.id, project.id))?.document).toEqual({
      schemaVersion: 1,
      nodes: [{ type: 'Stack' }],
    });

    expect(
      await saveStudioProject(db, {
        workspaceId: workspace.id,
        projectId: project.id,
        document: { schemaVersion: 1, nodes: [] },
        revision: 1,
        name: 'Kas warung',
        nowMs: 2_300,
      }),
    ).toBe(2);
    expect((await getStudioProject(db, workspace.id, project.id))?.name).toBe('Kas warung');
  });

  it('throws E-STUDIO-001 for a missing project or a foreign workspace', async () => {
    await expect(
      saveStudioProject(db, {
        workspaceId: workspace.id,
        projectId: 'does-not-exist',
        document: {},
        revision: 0,
      }),
    ).rejects.toThrow(/E-STUDIO-001/);

    const project = await createStudioProject(db, {
      workspaceId: workspace.id,
      name: 'Kas draft',
      nowMs: 2_000,
    });
    // A project in one workspace is invisible to another.
    expect(await getStudioProject(db, other.id, project.id)).toBeNull();
    await expect(
      saveStudioProject(db, {
        workspaceId: other.id,
        projectId: project.id,
        document: {},
        revision: 0,
      }),
    ).rejects.toThrow(/E-STUDIO-001/);
  });

  it('lists the newest projects first, honours the limit, and deletes with its search row', async () => {
    const names = ['Satu', 'Dua', 'Tiga'];
    const projects = [];
    for (const [index, name] of names.entries()) {
      projects.push(
        await createStudioProject(db, {
          workspaceId: workspace.id,
          name,
          nowMs: 3_000 + index * 100,
        }),
      );
    }
    // Editing an older project moves it to the front of the strip.
    await saveStudioProject(db, {
      workspaceId: workspace.id,
      projectId: projects[0]!.id,
      document: { touched: true },
      revision: 0,
      nowMs: 4_000,
    });

    expect((await listRecentProjects(db, workspace.id, 2)).map((project) => project.name)).toEqual(['Satu', 'Tiga']);
    expect(await listRecentProjects(db, workspace.id)).toHaveLength(3);
    expect(await listAllProjects(db, workspace.id)).toHaveLength(3);

    await db.exec(
      `INSERT INTO search_index (workspace_id, kind, ref_id, app_install_id, title, body)
       VALUES (?, 'project', ?, NULL, ?, '')`,
      [workspace.id, projects[1]!.id, 'Dua'],
    );
    await deleteStudioProject(db, workspace.id, projects[1]!.id);
    expect(await getStudioProject(db, workspace.id, projects[1]!.id)).toBeNull();
    expect(
      await db.select('SELECT 1 FROM search_index WHERE workspace_id = ? AND ref_id = ?', [
        workspace.id,
        projects[1]!.id,
      ]),
    ).toHaveLength(0);
  });
});
