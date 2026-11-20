/**
 * Local notification scheduler.
 *
 * Schedules are persisted in SQLite; on every launch the host re-registers
 * future notifications with the platform (Notification Triggers when available,
 * otherwise timers while the app is open) and marks fired rows. This is the
 * documented restart behaviour for web — background delivery without the app
 * open depends on platform support.
 */

import type { HostDb } from '@/db/driver';
import {
  listNotifications,
  markNotificationFired,
  pendingNotifications,
  type Notification as StoredNotification,
} from '@/db/repositories/notifications';

export interface Notifier {
  /** Schedule `fire` after `delayMs`; returns a handle for cancellation. */
  schedule(notification: StoredNotification, fire: () => void, delayMs: number): unknown;
  cancel(handle: unknown): void;
  show(notification: StoredNotification): void;
}

export interface BrowserNotifierOptions {
  now?: () => number;
  setTimeoutFn?: typeof setTimeout;
  clearTimeoutFn?: typeof clearTimeout;
}

/** Timer-based notifier used in the browser (Notification API for display). */
export function createBrowserNotifier(options: BrowserNotifierOptions = {}): Notifier {
  const now = options.now ?? (() => Date.now());
  const setTimeoutFn = options.setTimeoutFn ?? setTimeout;
  const clearTimeoutFn = options.clearTimeoutFn ?? clearTimeout;
  return {
    schedule(_notification, fire, delayMs) {
      return setTimeoutFn(fire, Math.max(0, delayMs));
    },
    cancel(handle) {
      if (typeof handle === 'number' || typeof handle === 'object') {
        clearTimeoutFn(handle as ReturnType<typeof setTimeout>);
      }
    },
    show(notification) {
      if (typeof Notification === 'undefined') return;
      if (Notification.permission !== 'granted') return;
      try {
        new Notification(notification.title, { body: notification.body });
      } catch {
        // Some platforms throw for constructed notifications; the row is still
        // marked fired so it is not retried forever.
      }
    },
    now,
  } as Notifier & { now: () => number };
}

export interface RescheduleResult {
  scheduled: number;
  fired: number;
  handles: Map<string, unknown>;
  /** Pending DB writes triggered by fired notifications (awaitable in tests). */
  pendingWrites: Promise<void>[];
}

/**
 * Re-register pending notifications for `workspaceId`. Missing schedules that
 * are already due fire immediately, matching "still rings after restart".
 */
export async function rescheduleNotifications(
  db: HostDb,
  workspaceId: string,
  notifier: Notifier,
  nowMs = Date.now(),
): Promise<RescheduleResult> {
  const pending = await pendingNotifications(db, workspaceId, 0);
  const handles = new Map<string, unknown>();
  const pendingWrites: Promise<void>[] = [];
  const fired = 0;
  for (const notification of pending) {
    const dueAt = notification.scheduledAtMs ?? nowMs;
    const delay = Math.max(0, dueAt - nowMs);
    const handle = notifier.schedule(
      notification,
      () => {
        notifier.show(notification);
        pendingWrites.push(markNotificationFired(db, workspaceId, notification.id, Date.now()));
      },
      delay,
    );
    handles.set(notification.id, handle);
  }
  return { scheduled: pending.length, fired, handles, pendingWrites };
}

export async function cancelAll(notifier: Notifier, handles: Map<string, unknown>): Promise<void> {
  for (const handle of handles.values()) notifier.cancel(handle);
  handles.clear();
}

/** Notifications that were scheduled but never fired (due in the past). */
export async function overdueNotifications(
  db: HostDb,
  workspaceId: string,
  nowMs = Date.now(),
): Promise<StoredNotification[]> {
  return (await listNotifications(db, workspaceId)).filter(
    (notification) =>
      notification.state === 'scheduled' &&
      notification.scheduledAtMs !== null &&
      notification.scheduledAtMs <= nowMs,
  );
}
