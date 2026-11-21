/**
 * Sandbox watchdog: freeze detection, restart budget, memory warnings, and
 * hibernation.
 *
 * The clock is injected so tests drive time deterministically. Thresholds come
 * from `docs/03-specs/03-sandbox-runtime.md`: 5 s freeze detection, three
 * restarts per 5 minutes (the fourth is refused and the boundary is shown),
 * 80% memory warning once per cycle, 30 s hibernation while the tab is hidden.
 */

export const FREEZE_MS = 5_000;
export const HEARTBEAT_MS = 1_000;
export const MAX_RESTARTS = 3;
export const RESTART_WINDOW_MS = 5 * 60_000;
export const MEMORY_WARN_RATIO = 0.8;
export const MEMORY_RESET_RATIO = 0.6;
export const HIBERNATE_AFTER_MS = 30_000;

export type WatchdogAction =
  | { action: 'none' }
  | { action: 'kill'; reason: 'frozen' }
  | { action: 'restart'; attempt: number }
  | { action: 'error-boundary'; reason: 'restart-budget-exhausted' }
  | { action: 'hibernate'; idleMs: number };

export interface MemoryReading {
  warning: boolean;
  ratio: number;
  reset: boolean;
}

export class SandboxWatchdog {
  private startedAtMs: number;
  private lastPongMs: number;
  private lastInteractionMs: number;
  private restarts: number[] = [];
  private memoryWarningActive = false;

  constructor(nowMs: number) {
    this.startedAtMs = nowMs;
    this.lastPongMs = nowMs;
    this.lastInteractionMs = nowMs;
  }

  /** Called when the worker answers a ping; liveness only, not user input. */
  heartbeat(nowMs: number): void {
    this.lastPongMs = nowMs;
  }

  /** Called on user interaction; delays hibernation. */
  touch(nowMs: number): void {
    this.lastInteractionMs = nowMs;
  }

  /** Evaluate freeze/restart/hibernation state for this tick. */
  tick(nowMs: number): WatchdogAction {
    const silentMs = nowMs - this.lastPongMs;
    if (silentMs >= FREEZE_MS) {
      this.lastPongMs = nowMs;
      const windowStart = nowMs - RESTART_WINDOW_MS;
      this.restarts = this.restarts.filter((at) => at > windowStart);
      if (this.restarts.length >= MAX_RESTARTS) {
        return { action: 'error-boundary', reason: 'restart-budget-exhausted' };
      }
      this.restarts.push(nowMs);
      return { action: 'restart', attempt: this.restarts.length };
    }
    const idleMs = nowMs - this.lastInteractionMs;
    if (idleMs >= HIBERNATE_AFTER_MS) {
      return { action: 'hibernate', idleMs };
    }
    return { action: 'none' };
  }

  /** Record a memory sample; warns once per cycle and resets below 60%. */
  sampleMemory(usedBytes: number, quotaBytes: number): MemoryReading {
    if (quotaBytes <= 0) {
      return { warning: false, ratio: 0, reset: false };
    }
    const ratio = usedBytes / quotaBytes;
    if (ratio < MEMORY_RESET_RATIO) {
      const wasActive = this.memoryWarningActive;
      this.memoryWarningActive = false;
      return { warning: false, ratio, reset: wasActive };
    }
    if (ratio >= MEMORY_WARN_RATIO && !this.memoryWarningActive) {
      this.memoryWarningActive = true;
      return { warning: true, ratio, reset: false };
    }
    return { warning: false, ratio, reset: false };
  }

  /** Start a new usage cycle (mount/focus) so warnings can fire again. */
  beginCycle(nowMs: number): void {
    this.lastInteractionMs = nowMs;
    this.memoryWarningActive = false;
  }

  restartCount(): number {
    return this.restarts.length;
  }

  uptimeMs(nowMs: number): number {
    return nowMs - this.startedAtMs;
  }
}
