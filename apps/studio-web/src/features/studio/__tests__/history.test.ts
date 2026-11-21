import { describe, expect, it } from 'vitest';
import {
  HISTORY_LIMIT,
  apply,
  canRedo,
  canUndo,
  createHistory,
  current,
  currentLabel,
  redo,
  undo,
  undoDepth,
} from '../history';

interface Step {
  n: number;
}

describe('history', () => {
  it('starts with one entry and no undo', () => {
    const history = createHistory<Step>({ n: 0 });
    expect(current(history)).toEqual({ n: 0 });
    expect(canUndo(history)).toBe(false);
    expect(canRedo(history)).toBe(false);
  });

  it('records one labelled entry per action and walks back and forward', () => {
    let history = createHistory<Step>({ n: 0 });
    history = apply(history, 'add card', { n: 1 });
    history = apply(history, 'move card', { n: 2 });
    expect(history.entries.map((entry) => entry.label)).toEqual(['init', 'add card', 'move card']);
    expect(currentLabel(history)).toBe('move card');

    history = undo(history);
    expect(current(history)).toEqual({ n: 1 });
    expect(undoDepth(history)).toBe(1);
    history = redo(history);
    expect(current(history)).toEqual({ n: 2 });
  });

  it('drops the redo branch when a new action lands', () => {
    let history = createHistory<Step>({ n: 0 });
    history = apply(history, 'a', { n: 1 });
    history = apply(history, 'b', { n: 2 });
    history = undo(history);
    history = apply(history, 'c', { n: 3 });
    expect(history.entries.map((entry) => entry.label)).toEqual(['init', 'a', 'c']);
    expect(canRedo(history)).toBe(false);
  });

  it('ignores a no-op state so it cannot consume an undo slot', () => {
    const initial = { n: 0 };
    let history = createHistory<Step>(initial);
    history = apply(history, 'noop', initial);
    expect(history.entries).toHaveLength(1);
  });

  it('caps the stack at 100 entries, dropping the oldest', () => {
    let history = createHistory<Step>({ n: 0 });
    for (let index = 1; index <= HISTORY_LIMIT + 20; index += 1) {
      history = apply(history, `step ${index}`, { n: index });
    }
    expect(history.entries).toHaveLength(HISTORY_LIMIT);
    expect(current(history)).toEqual({ n: HISTORY_LIMIT + 20 });
    expect(history.entries[0].state).toEqual({ n: 21 });
    expect(undoDepth(history)).toBe(HISTORY_LIMIT - 1);
  });
});
