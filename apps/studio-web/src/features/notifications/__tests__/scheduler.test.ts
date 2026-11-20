import { describe, expect, it, vi } from 'vitest';
import { NodeSqliteDriver } from '@/db/node-sqlite-driver';
import { applyMigrations } from '@/db/migrate';
import { ensureDefaultWorkspace } from '@/db/repositories/workspaces';
import { scheduleNotification, listNotifications } from '@/db/repositories/notifications';
import { rescheduleNotifications, overdueNotifications, type Notifier } from '../scheduler';

async function seeded() {
  const db = new NodeSqliteDriver();
  await applyMigrations(db);
  const workspace = await ensureDefaultWorkspace(db, { name: 'Rumah', locale: 'id-ID', nowMs: 1_000 });
  return { db, workspaceId: workspace.id };
}

function fakeNotifier() {
  const shown: string[] = [];
  const scheduled: Array<{ id: string; fire: () => void; delay: number }> = [];
  const notifier: Notifier = {
    schedule(notification, fire, delayMs) {
      scheduled.push({ id: notification.id, fire, delay: delayMs });
      return notification.id;
    },
    cancel() {},
    show(notification) {
      shown.push(notification.id);
    },
  };
  return { notifier, scheduled, shown };
}

describe('notification scheduler', () => {
  it('re-registers future schedules after a restart and fires due ones', async () => {
    const { db, workspaceId } = await seeded();
    const future = await scheduleNotification(db, {
      workspaceId,
      title: 'Nanti',
      body: 'x',
      scheduledAtMs: 20_000,
      nowMs: 1_000,
    });
    const due = await scheduleNotification(db, {
      workspaceId,
      title: 'Sekarang',
      body: 'y',
      scheduledAtMs: 2_000,
      nowMs: 1_000,
    });
    expect(await overdueNotifications(db, workspaceId, 3_000)).toHaveLength(1);
    void due;

    const { notifier, scheduled, shown } = fakeNotifier();
    const result = await rescheduleNotifications(db, workspaceId, notifier, 10_000);
    expect(result.scheduled).toBe(2);
    const futureEntry = scheduled.find((entry) => entry.id === future.id);
    const dueEntry = scheduled.find((entry) => entry.id === due.id);
    expect(futureEntry?.delay).toBe(10_000);
    expect(dueEntry?.delay).toBe(0);

    // Firing the due notification marks it fired in the database.
    dueEntry?.fire();
    await Promise.all(result.pendingWrites);
    expect(shown).toEqual([due.id]);
    const states = await listNotifications(db, workspaceId);
    const fired = states.find((entry) => entry.id === due.id);
    expect(fired?.state).toBe('fired');
    await db.close();
  });

  it('cancels all scheduled handles on teardown', async () => {
    const { db, workspaceId } = await seeded();
    await scheduleNotification(db, {
      workspaceId,
      title: 'A',
      body: 'x',
      scheduledAtMs: 9_000,
      nowMs: 1_000,
    });
    const { notifier, scheduled } = fakeNotifier();
    const result = await rescheduleNotifications(db, workspaceId, notifier, 2_000);
    const cancel = vi.fn();
    const handles = result.handles;
    notifier.cancel = cancel;
    for (const handle of handles.values()) notifier.cancel(handle);
    expect(cancel).toHaveBeenCalled();
    expect(scheduled).toHaveLength(1);
    await db.close();
  });
});
