/**
 * Autosave queue for the builder.
 *
 * Behaviour from FR-STUDIO-011:
 *  - 500 ms debounce, so a burst of edits is one write;
 *  - statuses `dirty → saving → saved`, or `error` when the optimistic revision
 *    write fails, keeping the pending document so retry is lossless;
 *  - the pending document is mirrored to `localStorage` so a reload (or a crash)
 *    can recover work that never reached SQLite;
 *  - `flush()` is awaited by the dirty guard (`beforeunload`, Back action).
 *
 * The class is framework-free so fake timers can exercise it directly.
 */

export type SaveStatus = 'saved' | 'saving' | 'dirty' | 'error';

export const AUTOSAVE_DEBOUNCE_MS = 500;

export function pendingKey(projectId: string): string {
  return `microapp.studio.pending.${projectId}`;
}

export interface AutosaveOptions<T> {
  projectId: string;
  /** Persist the value and resolve with the new revision. */
  save: (value: T) => Promise<number>;
  onStatus?: (status: SaveStatus, detail?: { code?: string; revision?: number }) => void;
  debounceMs?: number;
  storage?: Pick<Storage, 'setItem' | 'removeItem' | 'getItem'>;
}

export class AutosaveQueue<T> {
  private readonly projectId: string;
  private readonly saveFn: (value: T) => Promise<number>;
  private readonly onStatus: AutosaveOptions<T>['onStatus'];
  private readonly debounceMs: number;
  private readonly storage: AutosaveOptions<T>['storage'];
  private timer: ReturnType<typeof setTimeout> | null = null;
  private pending: T | null = null;
  private inFlight: Promise<void> | null = null;
  private state: SaveStatus = 'saved';
  private revisionValue = 0;
  private lastError: string | null = null;

  constructor(options: AutosaveOptions<T>) {
    this.projectId = options.projectId;
    this.saveFn = options.save;
    this.onStatus = options.onStatus;
    this.debounceMs = options.debounceMs ?? AUTOSAVE_DEBOUNCE_MS;
    this.storage = options.storage ?? (typeof localStorage === 'undefined' ? undefined : localStorage);
  }

  status(): SaveStatus {
    return this.state;
  }

  revision(): number {
    return this.revisionValue;
  }

  error(): string | null {
    return this.lastError;
  }

  /** Queue a value; the write lands after the debounce window. */
  schedule(value: T): void {
    this.pending = value;
    this.setStatus('dirty');
    this.mirror(value);
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.drain();
    }, this.debounceMs);
  }

  /** Write immediately (navigation guard, manual retry). */
  async flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    await this.drain();
  }

  /** Cancel timers without discarding the mirror; used on unmount. */
  dispose(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  private async drain(): Promise<void> {
    if (this.inFlight) {
      await this.inFlight;
      if (this.pending === null) return;
    }
    const value = this.pending;
    if (value === null) return;
    this.pending = null;
    this.setStatus('saving');
    this.inFlight = (async () => {
      try {
        const revision = await this.saveFn(value);
        this.revisionValue = revision;
        this.lastError = null;
        this.clearMirror();
        this.setStatus('saved', { revision });
      } catch (error) {
        // Keep the value queued so retry (or the next flush) re-sends it.
        this.pending = value;
        this.lastError = error instanceof Error ? error.message.slice(0, 120) : 'save failed';
        this.setStatus('error', { code: 'E-STUDIO-002' });
      } finally {
        this.inFlight = null;
      }
    })();
    await this.inFlight;
  }

  private setStatus(status: SaveStatus, detail?: { code?: string; revision?: number }): void {
    this.state = status;
    this.onStatus?.(status, detail);
  }

  private mirror(value: T): void {
    try {
      this.storage?.setItem(pendingKey(this.projectId), JSON.stringify(value));
    } catch {
      // Quota or private mode: the in-memory queue still holds the value.
    }
  }

  private clearMirror(): void {
    try {
      this.storage?.removeItem(pendingKey(this.projectId));
    } catch {
      // ignore
    }
  }

  /** Read a recovered document left behind by a previous session. */
  static recover<T>(projectId: string, storage?: Pick<Storage, 'getItem' | 'removeItem'>): T | null {
    const target = storage ?? (typeof localStorage === 'undefined' ? undefined : localStorage);
    if (!target) return null;
    try {
      const raw = target.getItem(pendingKey(projectId));
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  static clearRecovered(projectId: string, storage?: Pick<Storage, 'removeItem'>): void {
    const target = storage ?? (typeof localStorage === 'undefined' ? undefined : localStorage);
    try {
      target?.removeItem(pendingKey(projectId));
    } catch {
      // ignore
    }
  }
}
