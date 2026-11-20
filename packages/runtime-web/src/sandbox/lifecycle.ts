/**
 * Lifecycle sequencing for a micro-app session.
 *
 * Transition-scoped events happen once per state change; event-scoped events
 * (`onSync`, `onMemoryWarning`) may arrive repeatedly, with the memory warning
 * limited to once per usage cycle. Dispatch is serialized so `onMount` and
 * `onFocus` never run concurrently for the same app.
 */

export type TransitionEvent =
  | 'onInstall'
  | 'onMount'
  | 'onFocus'
  | 'onBlur'
  | 'onBackground'
  | 'onUpdate'
  | 'onUninstall';

export type CycleEvent = 'onSync' | 'onMemoryWarning';

export type LifecycleEvent = TransitionEvent | CycleEvent;

const TRANSITION_EVENTS: readonly TransitionEvent[] = [
  'onInstall',
  'onMount',
  'onFocus',
  'onBlur',
  'onBackground',
  'onUpdate',
  'onUninstall',
];

const CYCLE_EVENTS: readonly CycleEvent[] = ['onSync', 'onMemoryWarning'];

export interface LifecycleRecord {
  event: LifecycleEvent;
  at: number;
  payload?: unknown;
}

export type LifecycleDispatcher = (event: LifecycleEvent, payload?: unknown) => Promise<void> | void;

export class LifecycleController {
  /** A mount has succeeded; the app may receive focus/background/sync events. */
  private loaded = false;
  private uninstalled = false;
  private queue: Promise<void> = Promise.resolve();
  private memoryWarningFired = false;
  private readonly history: LifecycleRecord[] = [];
  private readonly now: () => number;
  private readonly dispatch: LifecycleDispatcher;

  constructor(dispatch: LifecycleDispatcher, now: () => number = () => Date.now()) {
    this.dispatch = dispatch;
    this.now = now;
  }

  records(): readonly LifecycleRecord[] {
    return this.history;
  }

  isLoaded(): boolean {
    return this.loaded;
  }

  /** Enqueue a lifecycle event; resolves after the dispatcher finishes. */
  emit(event: LifecycleEvent, payload?: unknown): Promise<void> {
    const run = async (): Promise<void> => {
      this.validate(event);
      if (event === 'onMemoryWarning') {
        if (this.memoryWarningFired) return;
        this.memoryWarningFired = true;
      }
      this.history.push({ event, at: this.now(), payload });
      await this.dispatch(event, payload);
      if (event === 'onMount' || event === 'onFocus') this.loaded = true;
      if (event === 'onUninstall') {
        this.uninstalled = true;
        this.loaded = false;
      }
    };
    this.queue = this.queue.then(run, run);
    return this.queue;
  }

  /** Reset the once-per-cycle memory warning gate (memory dropped below 60%). */
  resetMemoryCycle(): void {
    this.memoryWarningFired = false;
  }

  private validate(event: LifecycleEvent): void {
    const known =
      TRANSITION_EVENTS.includes(event as TransitionEvent) || CYCLE_EVENTS.includes(event as CycleEvent);
    if (!known) {
      throw new Error(`unknown lifecycle event: ${String(event)}`);
    }
    if (this.uninstalled) {
      throw new Error('lifecycle event after onUninstall');
    }
    if (event === 'onInstall' || event === 'onMount' || event === 'onUpdate') {
      // Install/mount bootstrap the session; updates may run before or after mount.
      return;
    }
    if (event === 'onUninstall') return;
    if (!this.loaded) {
      throw new Error(`${event} requires onMount first`);
    }
  }
}
