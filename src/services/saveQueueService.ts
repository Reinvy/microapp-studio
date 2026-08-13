'use client';

import { microAppRepo } from '@/db/microAppRepo';
import type { AppSchema } from '@/types/schema';

/**
 * SaveQueueService — debounced, write-coalescing persistence queue for the
 * micro-app builder (scalability layer for high-frequency edits).
 *
 * Problem it solves:
 * The builder fires rapid, high-frequency edits: drag-and-drop reorders,
 * property-panel changes, field renames, canvas tweaks. Persisting each edit
 * naively means one full IndexedDB record write per event. IndexedDB
 * serializes transactions per database, so write amplification grows linearly
 * with edit frequency and can stutter the UI on low-end devices.
 *
 * Strategy:
 * - **Latest-snapshot coalescing**: only the NEWEST snapshot per app id is
 *   kept. K rapid edits → exactly ONE write of the final state. Intermediate
 *   states were never observable, so writing them is pure waste.
 * - **Debounce**: a write fires DEBOUNCE_MS after the last enqueue, so a burst
 *   of edits settles into a single transaction instead of N.
 * - **In-flight merge**: if a newer snapshot arrives while a write is in
 *   flight, it is written immediately after (never lost, never overlapping —
 *   one serialized drain loop per id).
 * - **Explicit flush**: `saveNow()` / `flush()` / `flushAll()` force an
 *   immediate write, so the Save/Run buttons and page navigation never lose
 *   the last edit (autosave + manual save share the same queue, so they
 *   cannot double-write).
 * - **Upsert semantics**: writes go through `microAppRepo.bulkSave` (put), so
 *   the queue is correct for both existing records AND brand-new apps that
 *   were never persisted yet (previously, `repo.update` on a missing key
 *   silently did nothing — a brand-new app opened directly at /builder could
 *   never be saved).
 * - **Fail-safe with retry**: a failed write is retried once after the
 *   debounce window; persistent failures log and drop the queue entry (the
 *   in-memory store still holds the data, so the user can Save again).
 * - **Observability**: `isDirty()` / `getPendingCount()` let the UI reflect
 *   unsaved state without exposing queue internals.
 */

export interface SaveQueueOptions {
  /** Quiet period before a debounced write fires (ms). */
  debounceMs?: number;
  /** Write executor — injectable for tests; defaults to microAppRepo.bulkSave. */
  writer?: (apps: AppSchema[]) => Promise<void>;
  /** Called after a successful write of an app id (observability). */
  onWritten?: (id: string) => void;
}

interface QueueEntry {
  /** Latest unsaved snapshot; null once the queue is caught up. */
  snapshot: AppSchema | null;
  /** Pending debounce timer. */
  timer: ReturnType<typeof setTimeout> | null;
  /** Promise of the running drain loop for this id, if any. */
  drain: Promise<void> | null;
  /** Consecutive write failures (retry budget). */
  failures: number;
}

const DEFAULT_DEBOUNCE_MS = 800;
const MAX_RETRIES = 1;

class SaveQueueService {
  private readonly debounceMs: number;
  private readonly writer: (apps: AppSchema[]) => Promise<void>;
  private readonly onWritten?: (id: string) => void;
  private readonly pending = new Map<string, QueueEntry>();

  constructor(options: SaveQueueOptions = {}) {
    this.debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS;
    this.writer = options.writer ?? ((apps) => microAppRepo.bulkSave(apps));
    this.onWritten = options.onWritten;
  }

  /** Number of app ids with unsaved snapshots (observability). */
  getPendingCount(): number {
    return this.pending.size;
  }

  /** True when the id has an unsaved snapshot queued or in flight. */
  isDirty(id: string): boolean {
    const entry = this.pending.get(id);
    return !!entry && entry.snapshot !== null;
  }

  /**
   * Enqueue a new snapshot for an app. Coalesces per id (only the latest
   * snapshot is kept) and debounces the write: a burst of edits schedules
   * exactly one write DEBOUNCE_MS after the last one.
   */
  enqueue(app: AppSchema): void {
    const entry = this.pending.get(app.id) ?? this.createEntry(app.id);
    entry.snapshot = app;
    entry.failures = 0;
    // While a drain is running it picks up any newer snapshot the moment the
    // in-flight write lands — scheduling a timer would double-write.
    if (entry.drain) return;
    // Restart the quiet period: the window is measured from the LAST edit,
    // so a continuous stream of edits keeps deferring until the user pauses.
    if (entry.timer) clearTimeout(entry.timer);
    entry.timer = setTimeout(() => {
      void this.drain(app.id);
    }, this.debounceMs);
  }

  /**
   * Write immediately, bypassing the debounce, and await persistence.
   * Cancels any pending debounced write for the id. Safe to call while a
   * debounced write is already in flight — this snapshot is written as soon
   * as the in-flight one completes (serialized per id).
   */
  async saveNow(app: AppSchema): Promise<void> {
    const entry = this.pending.get(app.id) ?? this.createEntry(app.id);
    entry.snapshot = app;
    entry.failures = 0;
    if (entry.timer) {
      clearTimeout(entry.timer);
      entry.timer = null;
    }
    await this.drain(app.id);
  }

  /** Force-write one id immediately (no-op if nothing pending). */
  async flush(id: string): Promise<void> {
    const entry = this.pending.get(id);
    if (!entry || !entry.snapshot) return;
    if (entry.timer) {
      clearTimeout(entry.timer);
      entry.timer = null;
    }
    await this.drain(id);
  }

  /** Force-write all pending ids immediately (e.g. before navigation). */
  async flushAll(): Promise<void> {
    const ids = [...this.pending.keys()];
    await Promise.all(
      ids.map((id) => {
        const entry = this.pending.get(id);
        if (entry?.timer) {
          clearTimeout(entry.timer);
          entry.timer = null;
        }
        return this.drain(id);
      })
    );
  }

  private createEntry(id: string): QueueEntry {
    const entry: QueueEntry = { snapshot: null, timer: null, drain: null, failures: 0 };
    this.pending.set(id, entry);
    return entry;
  }

  /**
   * Serialized write loop for one id. Writes the current snapshot, then loops
   * if a newer snapshot arrived during the write (in-flight merge). Resolves
   * only when the queue is caught up (snapshot written and no newer pending)
   * or the entry was dropped after exhausting retries. Concurrent calls for
   * the same id share the running drain promise — they await the same
   * catch-up point.
   */
  private drain(id: string): Promise<void> {
    const entry = this.pending.get(id);
    if (!entry) return Promise.resolve();
    if (entry.drain) return entry.drain;

    entry.drain = (async () => {
      try {
        while (true) {
          const current = this.pending.get(id);
          if (!current || !current.snapshot) return;
          const snapshot = current.snapshot;

          try {
            await this.writer([snapshot]);
          } catch (error) {
            current.failures += 1;
            if (current.failures > MAX_RETRIES) {
              console.error(
                `[SaveQueue] giving up on ${id} after ${MAX_RETRIES} retries:`,
                error
              );
              this.pending.delete(id);
              return;
            }
            // Retry after the debounce window so a failure burst doesn't
            // hammer IndexedDB. The latest snapshot is kept for the retry.
            console.warn(`[SaveQueue] write failed for ${id}, retrying...`, error);
            current.timer = setTimeout(() => {
              void this.drain(id);
            }, this.debounceMs);
            return;
          }

          // Success — remove the entry only if no NEWER snapshot arrived
          // during the write. Otherwise loop and persist the newer one.
          const after = this.pending.get(id);
          if (after && after.snapshot === snapshot) {
            this.pending.delete(id);
            this.onWritten?.(id);
            return;
          }
        }
      } finally {
        const current = this.pending.get(id);
        if (current) current.drain = null;
      }
    })();
    return entry.drain;
  }
}

/** Create a queue instance (exported for isolated tests). */
export function createSaveQueue(options?: SaveQueueOptions): SaveQueueService {
  return new SaveQueueService(options);
}

/** Singleton instance — shared by the builder autosave + Save/Run buttons. */
export const saveQueueService = createSaveQueue();
