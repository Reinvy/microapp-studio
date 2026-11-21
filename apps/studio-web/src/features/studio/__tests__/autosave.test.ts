import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AUTOSAVE_DEBOUNCE_MS, AutosaveQueue, pendingKey, type SaveStatus } from '../autosave';

interface Doc {
  text: string;
}

class MemoryStorage {
  readonly map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
}

describe('autosave queue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('debounces a burst of edits into one write', async () => {
    const save = vi.fn(async () => 1);
    const storage = new MemoryStorage();
    const statuses: SaveStatus[] = [];
    const queue = new AutosaveQueue<Doc>({
      projectId: 'doc-1',
      save,
      storage,
      onStatus: (status) => statuses.push(status),
    });

    queue.schedule({ text: 'a' });
    queue.schedule({ text: 'ab' });
    queue.schedule({ text: 'abc' });
    expect(statuses).toEqual(['dirty', 'dirty', 'dirty']);

    await vi.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS + 1);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith({ text: 'abc' });
    expect(statuses.at(-1)).toBe('saved');
    expect(storage.getItem(pendingKey('doc-1'))).toBeNull();
  });

  it('mirrors the pending document until the write succeeds', async () => {
    const storage = new MemoryStorage();
    const queue = new AutosaveQueue<Doc>({
      projectId: 'doc-2',
      save: async () => 1,
      storage,
    });
    queue.schedule({ text: 'draft' });
    expect(storage.getItem(pendingKey('doc-2'))).toBe(JSON.stringify({ text: 'draft' }));
    expect(AutosaveQueue.recover<Doc>('doc-2', storage)).toEqual({ text: 'draft' });
    await queue.flush();
    expect(AutosaveQueue.recover<Doc>('doc-2', storage)).toBeNull();
  });

  it('keeps the value queued when the write fails and retries on flush', async () => {
    let attempt = 0;
    const save = vi.fn(async () => {
      attempt += 1;
      if (attempt === 1) throw new Error('E-STUDIO-002 revision conflict');
      return 4;
    });
    const statuses: Array<{ status: SaveStatus; code?: string }> = [];
    const queue = new AutosaveQueue<Doc>({
      projectId: 'doc-3',
      save,
      onStatus: (status, detail) => statuses.push({ status, code: detail?.code }),
    });

    queue.schedule({ text: 'x' });
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS + 1);
    expect(statuses.at(-1)).toEqual({ status: 'error', code: 'E-STUDIO-002' });
    expect(queue.error()).toContain('E-STUDIO-002');

    await queue.flush();
    expect(save).toHaveBeenCalledTimes(2);
    expect(statuses.at(-1)?.status).toBe('saved');
    expect(queue.revision()).toBe(4);
  });

  it('flush with nothing pending does not call save', async () => {
    const save = vi.fn(async () => 1);
    const queue = new AutosaveQueue<Doc>({ projectId: 'doc-4', save });
    await queue.flush();
    expect(save).not.toHaveBeenCalled();
  });

  it('dispose cancels the timer but keeps the mirror', async () => {
    const storage = new MemoryStorage();
    const save = vi.fn(async () => 1);
    const queue = new AutosaveQueue<Doc>({ projectId: 'doc-5', save, storage });
    queue.schedule({ text: 'keep' });
    queue.dispose();
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS + 10);
    expect(save).not.toHaveBeenCalled();
    expect(AutosaveQueue.recover<Doc>('doc-5', storage)).toEqual({ text: 'keep' });
  });
});
