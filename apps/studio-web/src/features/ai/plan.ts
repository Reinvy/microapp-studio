/**
 * Magic Create plan handling.
 *
 * The prompt limit is 2000 characters (FLOW-02; the 600-character wireframe is
 * superseded). A plan is only a proposal: nothing is generated until the user
 * presses **Buat aplikasi**, and an invalid draft keeps the plan so the user can
 * retry manually or fall back to a template or a blank layout.
 */

import { validateDocument, type MuipNode } from '@microapp/runtime-web';
import type { AiPlan } from './client';

export const MAX_PROMPT_LENGTH = 2000;

/** The four starting-point chips offered next to the prompt. */
export const PROMPT_SUGGESTIONS = [
  'Kasir warung dengan daftar barang dan total harian',
  'Daftar tugas harian dengan prioritas',
  'Inventaris gudang dengan peringatan stok minimum',
  'Survey kepuasan warga dengan rekap jawaban',
] as const;

export interface PromptCheck {
  ok: boolean;
  code: 'E-CREATE-001' | null;
  message: string | null;
}

export function checkPrompt(prompt: string): PromptCheck {
  const trimmed = prompt.trim();
  if (trimmed.length === 0) {
    return { ok: false, code: 'E-CREATE-001', message: 'prompt is empty' };
  }
  if (prompt.length > MAX_PROMPT_LENGTH) {
    return { ok: false, code: 'E-CREATE-001', message: `prompt exceeds ${MAX_PROMPT_LENGTH} characters` };
  }
  return { ok: true, code: null, message: null };
}

export interface DraftValidation {
  ok: boolean;
  code: 'E-CREATE-003' | null;
  message: string | null;
  root: MuipNode | null;
}

/**
 * A provider draft is untrusted input: it must be exactly one MUIP root that the
 * runtime validator accepts, with no forbidden fields.
 */
export function validateAiDraft(nodes: MuipNode[]): DraftValidation {
  if (nodes.length !== 1) {
    return { ok: false, code: 'E-CREATE-003', message: 'draft must contain exactly one root', root: null };
  }
  try {
    const validated = validateDocument(nodes[0]);
    return { ok: true, code: null, message: null, root: validated.node };
  } catch (error) {
    return {
      ok: false,
      code: 'E-CREATE-003',
      message: error instanceof Error ? error.message : 'draft is invalid',
      root: null,
    };
  }
}

/** Default name for the first screen, derived from the plan. */
export function planTitle(plan: AiPlan, fallback: string): string {
  const screen = plan.screens[0]?.trim();
  return (screen && screen.length > 0 ? screen : fallback).slice(0, 60);
}

/** Permission set a generated draft must declare for a storage-backed app. */
export function planPermissions(plan: AiPlan): string[] {
  const permissions = new Set<string>(['storage.app']);
  if (plan.actions.some((action) => /internet|jaringan|fetch|api/i.test(action))) {
    permissions.add('network.fetch');
  }
  return [...permissions];
}
