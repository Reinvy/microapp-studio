/**
 * save-queue.test.ts — Unit tests for the debounced write-coalescing save
 * queue (scalability layer for high-frequency builder edits).
 *
 * The repo module is mocked (Dexie/IndexedDB never loads) and a fake writer
 * is injected via createSaveQueue, isolating the queue's own guarantees:
 * - K rapid enqueues of the same id → exactly ONE write of the latest state.
 * - Writes fire only after the debounce window of quiet.
 * - saveNow / flush / flushAll bypass the debounce and await persistence.
 * - A snapshot arriving during an in-flight write is never lost (in-flight
 *   merge, serialized per id).
 * - Failed writes retry once, then give up without throwing to callers.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Stub the repo module so the real module (which imports Dexie) never loads.
vi.mock('@/db/microAppRepo', () => ({
  microAppRepo: {
    bulkSave: vi.fn(),
  },
}));

import { createSaveQueue, type SaveQueueOptions } from '@/services/saveQueueService';
import type { AppSchema } from '@/types/schema';

const DEBOUNCE = 800;

function makeApp(id: string, name = `App ${id}`): AppSchema {
  const now = Date.now();
  return {
    id,
    name,
    description: '',
    prompt: '',
    fields: [],
    logicNodes: [],
    layout: [],
    createdAt: now,
    updatedAt: now,
    version: 1,
  };
}

function makeQueue(writer: (apps: AppSchema[]) => Promise<void>, opts: Partial<SaveQueueOptions> = {}) {
  return createSaveQueue({
    debounceMs: DEBOUNCE,
    writer,
    ...opts,
  });
}

describe('SaveQueueService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('coalesces K rapid enqueues of the same id into ONE write of the latest snapshot', async () => {
    const writer = vi.fn().mockResolvedValue(undefined);
    const queue = makeQueue(writer);

    const app = makeApp('a1', 'v1');
    queue.enqueue(app);
    queue.enqueue({ ...app, name: 'v2' });
    queue.enqueue({ ...app, name: 'v3' });
    queue.enqueue({ ...app, name: 'v4' });
    queue.enqueue({ ...app, name: 'v5' });

    expect(writer).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(DEBOUNCE);

    expect(writer).toHaveBeenCalledTimes(1);
    expect(writer).toHaveBeenCalledWith([expect.objectContaining({ id: 'a1', name: 'v5' })]);
    expect(queue.getPendingCount()).toBe(0);
    expect(queue.isDirty('a1')).toBe(false);
  });

  it('does not write before the debounce window elapses', async () => {
    const writer = vi.fn().mockResolvedValue(undefined);
    const queue = makeQueue(writer);

    queue.enqueue(makeApp('a1'));

    await vi.advanceTimersByTimeAsync(DEBOUNCE - 1);
    expect(writer).not.toHaveBeenCalled();
    expect(queue.isDirty('a1')).toBe(true);
    expect(queue.getPendingCount()).toBe(1);

    await vi.advanceTimersByTimeAsync(1);
    expect(writer).toHaveBeenCalledTimes(1);
    expect(queue.getPendingCount()).toBe(0);
  });

  it('a new edit during the debounce window restarts the quiet period', async () => {
    const writer = vi.fn().mockResolvedValue(undefined);
    const queue = makeQueue(writer);

    const app = makeApp('a1', 'first');
    queue.enqueue(app);

    await vi.advanceTimersByTimeAsync(DEBOUNCE - 400);
    queue.enqueue({ ...app, name: 'second' }); // edit before the timer fires

    await vi.advanceTimersByTimeAsync(DEBOUNCE - 400);
    expect(writer).not.toHaveBeenCalled(); // window restarted

    await vi.advanceTimersByTimeAsync(DEBOUNCE - 400);
    expect(writer).toHaveBeenCalledTimes(1);
    expect(writer).toHaveBeenCalledWith([expect.objectContaining({ name: 'second' })]);
  });

  it('keeps separate ids on independent debounce timers', async () => {
    const writer = vi.fn().mockResolvedValue(undefined);
    const queue = makeQueue(writer);

    queue.enqueue(makeApp('a1', 'one'));
    queue.enqueue(makeApp('a2', 'two'));

    await vi.advanceTimersByTimeAsync(DEBOUNCE);

    expect(writer).toHaveBeenCalledTimes(2);
    const args = writer.mock.calls.map((call) => call[0][0].id).sort();
    expect(args).toEqual(['a1', 'a2']);
  });

  it('saveNow writes immediately and cancels the pending debounce', async () => {
    const writer = vi.fn().mockResolvedValue(undefined);
    const queue = makeQueue(writer);

    const app = makeApp('a1', 'manual');
    queue.enqueue(makeApp('a1', 'autosave-pending'));

    await queue.saveNow(app);
    expect(writer).toHaveBeenCalledTimes(1);
    expect(writer).toHaveBeenCalledWith([expect.objectContaining({ name: 'manual' })]);

    // Advancing past the old debounce window must NOT trigger a second write.
    await vi.advanceTimersByTimeAsync(DEBOUNCE * 2);
    expect(writer).toHaveBeenCalledTimes(1);
    expect(queue.getPendingCount()).toBe(0);
  });

  it('does not lose a snapshot enqueued while a write is in flight (in-flight merge)', async () => {
    let resolveFirst!: () => void;
    const writer = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            resolveFirst = resolve;
          })
      )
      .mockResolvedValue(undefined);
    const queue = makeQueue(writer);

    const app = makeApp('a1', 'v1');
    queue.enqueue(app);
    await vi.advanceTimersByTimeAsync(DEBOUNCE);
    expect(writer).toHaveBeenCalledTimes(1);

    // Newer snapshot arrives while the first write is still in flight.
    queue.enqueue({ ...app, name: 'v2' });

    resolveFirst();
    await vi.advanceTimersByTimeAsync(0);

    expect(writer).toHaveBeenCalledTimes(2);
    expect(writer.mock.calls[1][0][0].name).toBe('v2');
    expect(queue.getPendingCount()).toBe(0);
  });

  it('retries a failed write once, then succeeds', async () => {
    const writer = vi
      .fn()
      .mockRejectedValueOnce(new Error('disk full'))
      .mockResolvedValue(undefined);
    const queue = makeQueue(writer);

    const app = makeApp('a1', 'survivor');
    queue.enqueue(app);

    await vi.advanceTimersByTimeAsync(DEBOUNCE);
    expect(writer).toHaveBeenCalledTimes(1);
    expect(queue.getPendingCount()).toBe(1); // still pending — will retry

    await vi.advanceTimersByTimeAsync(DEBOUNCE);
    expect(writer).toHaveBeenCalledTimes(2);
    expect(queue.getPendingCount()).toBe(0);
    expect(queue.isDirty('a1')).toBe(false);
  });

  it('gives up after exhausting retries without throwing to callers', async () => {
    const writer = vi.fn().mockRejectedValue(new Error('persistent failure'));
    const queue = makeQueue(writer);

    const app = makeApp('a1', 'doomed');
    // saveNow must resolve (never reject) even when the write keeps failing.
    await expect(queue.saveNow(app)).resolves.toBeUndefined();

    await vi.advanceTimersByTimeAsync(DEBOUNCE); // first retry
    expect(writer).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(DEBOUNCE); // past the retry window
    // MAX_RETRIES=1 → after the retry failed too, the entry is dropped.
    expect(queue.getPendingCount()).toBe(0);
    expect(queue.isDirty('a1')).toBe(false);
  });

  it('flushAll force-writes every pending id', async () => {
    const writer = vi.fn().mockResolvedValue(undefined);
    const queue = makeQueue(writer);

    queue.enqueue(makeApp('a1', 'one'));
    queue.enqueue(makeApp('a2', 'two'));

    await queue.flushAll();
    expect(writer).toHaveBeenCalledTimes(2);
    expect(queue.getPendingCount()).toBe(0);

    // No timers remain scheduled afterwards.
    await vi.advanceTimersByTimeAsync(DEBOUNCE * 2);
    expect(writer).toHaveBeenCalledTimes(2);
  });

  it('flush writes only the requested id', async () => {
    const writer = vi.fn().mockResolvedValue(undefined);
    const queue = makeQueue(writer);

    queue.enqueue(makeApp('a1', 'one'));
    queue.enqueue(makeApp('a2', 'two'));

    await queue.flush('a1');
    expect(writer).toHaveBeenCalledTimes(1);
    expect(writer.mock.calls[0][0][0].id).toBe('a1');
    expect(queue.isDirty('a1')).toBe(false);
    expect(queue.isDirty('a2')).toBe(true);
  });

  it('flush is a no-op when nothing is pending for the id', async () => {
    const writer = vi.fn().mockResolvedValue(undefined);
    const queue = makeQueue(writer);

    await queue.flush('ghost');
    expect(writer).not.toHaveBeenCalled();
  });

  it('reports dirty state and fires onWritten after a successful write', async () => {
    const writer = vi.fn().mockResolvedValue(undefined);
    const onWritten = vi.fn();
    const queue = makeQueue(writer, { onWritten });

    queue.enqueue(makeApp('a1'));
    expect(queue.isDirty('a1')).toBe(true);
    expect(queue.getPendingCount()).toBe(1);

    await vi.advanceTimersByTimeAsync(DEBOUNCE);

    expect(onWritten).toHaveBeenCalledWith('a1');
    expect(queue.isDirty('a1')).toBe(false);
    expect(queue.getPendingCount()).toBe(0);
  });
});
