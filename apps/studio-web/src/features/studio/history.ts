/**
 * Undo/redo history for the builder.
 *
 * Pure reducer: every mutation is one labelled entry, the stack is capped at 100
 * steps, and redo is discarded the moment a new action lands. Keeping it pure
 * means the builder can flush a pending autosave before applying a step without
 * racing React state.
 */

export const HISTORY_LIMIT = 100;

export interface HistoryEntry<T> {
  state: T;
  /** Short, user-facing action label shown in the undo toast. */
  label: string;
}

export interface History<T> {
  entries: HistoryEntry<T>[];
  index: number;
}

export function createHistory<T>(initial: T, label = 'init'): History<T> {
  return { entries: [{ state: initial, label }], index: 0 };
}

export function current<T>(history: History<T>): T {
  return history.entries[history.index].state;
}

export function currentLabel<T>(history: History<T>): string {
  return history.entries[history.index].label;
}

/**
 * Push a new state. Identical references are ignored so a no-op edit cannot
 * consume an undo slot.
 */
export function apply<T>(history: History<T>, label: string, next: T): History<T> {
  if (next === current(history)) return history;
  const kept = history.entries.slice(0, history.index + 1);
  kept.push({ state: next, label });
  const trimmed = kept.length > HISTORY_LIMIT ? kept.slice(kept.length - HISTORY_LIMIT) : kept;
  return { entries: trimmed, index: trimmed.length - 1 };
}

export function canUndo<T>(history: History<T>): boolean {
  return history.index > 0;
}

export function canRedo<T>(history: History<T>): boolean {
  return history.index < history.entries.length - 1;
}

export function undo<T>(history: History<T>): History<T> {
  return canUndo(history) ? { ...history, index: history.index - 1 } : history;
}

export function redo<T>(history: History<T>): History<T> {
  return canRedo(history) ? { ...history, index: history.index + 1 } : history;
}

/** Depth below the newest entry, used by the toast copy ("3 langkah"). */
export function undoDepth<T>(history: History<T>): number {
  return history.index;
}
