/**
 * Shared draft creation.
 *
 * Templates, blank layouts, and Magic Create all funnel through here so a new
 * project is always: one validated document, one repository row, one search
 * entry, and a pending autosave mirror cleared. The caller navigates; this
 * function never forces a route so tests can assert the draft without a router.
 */

import type { WorkerHostDb } from '@/db/client';
import { createStudioProject, listAllProjects, type StudioProject } from '@/db/repositories/studio';
import { indexRecord } from '@/db/repositories/search';
import { createDocument, documentId } from '@/features/studio/document';
import type { StudioDocument } from '@/features/studio/types';
import type { MuipNode } from '@microapp/runtime-web';

export interface CreateDraftInput {
  db: WorkerHostDb;
  workspaceId: string;
  name: string;
  root: MuipNode;
  permissions?: string[];
  dataSample?: Record<string, unknown>;
}

/** `Micro-app Baru`, then `Micro-app Baru 2`, `3`, … within the workspace. */
export async function nextDraftName(db: WorkerHostDb, workspaceId: string, base: string): Promise<string> {
  const projects = await listAllProjects(db, workspaceId);
  const taken = new Set(projects.map((project) => project.name));
  if (!taken.has(base)) return base;
  for (let suffix = 2; suffix < 1000; suffix += 1) {
    const candidate = `${base} ${suffix}`;
    if (!taken.has(candidate)) return candidate;
  }
  throw new Error('E-SET-001 no free draft name');
}

export async function createDraft(input: CreateDraftInput): Promise<StudioProject> {
  const id = documentId(`${input.name}-${Date.now().toString(36)}`);
  const document: StudioDocument = createDocument({
    id,
    name: input.name,
    root: input.root,
    permissions: input.permissions ?? ['storage.app'],
    dataSample: input.dataSample,
  });
  const project = await createStudioProject(input.db, {
    workspaceId: input.workspaceId,
    name: input.name,
    document: document as unknown as Record<string, unknown>,
    id,
  });
  await indexRecord(input.db, {
    workspaceId: input.workspaceId,
    kind: 'project',
    refId: project.id,
    title: project.name,
    body: document.nodes[0]?.type ?? 'Stack',
  });
  return project;
}

/**
 * Celebrate only the very first micro-app this installation ever creates.
 * The flag lives in localStorage because it is a one-time UX detail, not state
 * worth a schema.
 */
export const CELEBRATED_KEY = 'microapp.firstAppCelebrated';

export function shouldCelebrate(storage?: Pick<Storage, 'getItem'>): boolean {
  const target = storage ?? (typeof localStorage === 'undefined' ? undefined : localStorage);
  if (!target) return false;
  try {
    return target.getItem(CELEBRATED_KEY) === null;
  } catch {
    return false;
  }
}

export function markCelebrated(storage?: Pick<Storage, 'setItem'>): void {
  const target = storage ?? (typeof localStorage === 'undefined' ? undefined : localStorage);
  try {
    target?.setItem(CELEBRATED_KEY, '1');
  } catch {
    // Private mode: celebrating twice is harmless.
  }
}
