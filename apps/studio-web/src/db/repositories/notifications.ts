/**
 * Local notification repository.
 *
 * Schedules are persisted so they survive reload/restart (FR-HOST-018): the host
 * re-registers future notifications with the platform scheduler on launch.
 */

import type { HostDb } from '../driver';
import { uuidv7 } from '../ids';

export type NotificationState = 'scheduled' | 'fired' | 'cancelled';

export interface NotificationInput {
  workspaceId: string;
  appInstallId?: string | null;
  title: string;
  body: string;
  deepLink?: string | null;
  scheduledAtMs?: number | null;
  nowMs?: number;
}

export interface Notification {
  id: string;
  workspaceId: string;
  appInstallId: string | null;
  title: string;
  body: string;
  deepLink: string | null;
  scheduledAtMs: number | null;
  firedAtMs: number | null;
  state: NotificationState;
  readAtMs: number | null;
  createdAtMs: number;
}

interface NotificationRow {
  id: string;
  workspace_id: string;
  app_install_id: string | null;
  title: string;
  body: string;
  deep_link: string | null;
  scheduled_at_ms: number | null;
  fired_at_ms: number | null;
  state: NotificationState;
  read_at_ms: number | null;
  created_at_ms: number;
}

function toNotification(row: NotificationRow): Notification {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    appInstallId: row.app_install_id,
    title: row.title,
    body: row.body,
    deepLink: row.deep_link,
    scheduledAtMs: row.scheduled_at_ms === null ? null : Number(row.scheduled_at_ms),
    firedAtMs: row.fired_at_ms === null ? null : Number(row.fired_at_ms),
    state: row.state,
    readAtMs: row.read_at_ms === null ? null : Number(row.read_at_ms),
    createdAtMs: Number(row.created_at_ms),
  };
}

export async function scheduleNotification(db: HostDb, input: NotificationInput): Promise<Notification> {
  const now = input.nowMs ?? Date.now();
  if (input.title.trim().length === 0) throw new Error('E-RUN-003 title is required');
  const id = uuidv7(now);
  const state: NotificationState = input.scheduledAtMs ? 'scheduled' : 'fired';
  await db.exec(
    `INSERT INTO notifications
       (id, workspace_id, app_install_id, title, body, deep_link, scheduled_at_ms, fired_at_ms, state, created_at_ms)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.workspaceId,
      input.appInstallId ?? null,
      input.title,
      input.body,
      input.deepLink ?? null,
      input.scheduledAtMs ?? null,
      state === 'fired' ? now : null,
      state,
      now,
    ],
  );
  return {
    id,
    workspaceId: input.workspaceId,
    appInstallId: input.appInstallId ?? null,
    title: input.title,
    body: input.body,
    deepLink: input.deepLink ?? null,
    scheduledAtMs: input.scheduledAtMs ?? null,
    firedAtMs: state === 'fired' ? now : null,
    state,
    readAtMs: null,
    createdAtMs: now,
  };
}

export async function cancelNotification(db: HostDb, workspaceId: string, id: string): Promise<boolean> {
  const changed = await db.exec(
    `UPDATE notifications SET state = 'cancelled' WHERE id = ? AND workspace_id = ? AND state = 'scheduled'`,
    [id, workspaceId],
  );
  return changed > 0;
}

export async function markNotificationFired(
  db: HostDb,
  workspaceId: string,
  id: string,
  nowMs = Date.now(),
): Promise<void> {
  await db.exec(
    `UPDATE notifications SET state = 'fired', fired_at_ms = ? WHERE id = ? AND workspace_id = ?`,
    [nowMs, id, workspaceId],
  );
}

export async function markNotificationRead(
  db: HostDb,
  workspaceId: string,
  id: string,
  nowMs = Date.now(),
): Promise<void> {
  await db.exec('UPDATE notifications SET read_at_ms = ? WHERE id = ? AND workspace_id = ?', [
    nowMs,
    id,
    workspaceId,
  ]);
}

export async function listNotifications(
  db: HostDb,
  workspaceId: string,
  options: { includeCancelled?: boolean } = {},
): Promise<Notification[]> {
  const filter = options.includeCancelled ? '' : "AND state <> 'cancelled'";
  const rows = await db.select<NotificationRow>(
    `SELECT * FROM notifications WHERE workspace_id = ? ${filter}
     ORDER BY created_at_ms DESC LIMIT 200`,
    [workspaceId],
  );
  return rows.map(toNotification);
}

/** Pending schedules to re-register after launch/restart. */
export async function pendingNotifications(db: HostDb, workspaceId: string, nowMs = Date.now()): Promise<Notification[]> {
  const rows = await db.select<NotificationRow>(
    `SELECT * FROM notifications
     WHERE workspace_id = ? AND state = 'scheduled' AND (scheduled_at_ms IS NULL OR scheduled_at_ms >= ?)
     ORDER BY scheduled_at_ms ASC`,
    [workspaceId, nowMs],
  );
  return rows.map(toNotification);
}
