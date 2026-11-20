'use client';

/** Notification center: persisted schedules, reschedule on launch, cancel. */

import { useCallback, useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { useHost } from '@/features/host/HostProvider';
import { SettingsShell } from '@/features/settings/SettingsShell';
import {
  cancelNotification,
  listNotifications,
  type Notification,
} from '@/db/repositories/notifications';
import { createBrowserNotifier, rescheduleNotifications } from '@/features/notifications/scheduler';

export default function NotificationsPage(): ReactElement {
  const host = useHost();
  const [items, setItems] = useState<Notification[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    if (!host.db || !host.workspace) return;
    setItems(await listNotifications(host.db, host.workspace.id, { includeCancelled: true }));
  }, [host.db, host.workspace]);

  useEffect(() => {
    void Promise.resolve().then(refresh);
  }, [refresh]);

  const reschedule = async (): Promise<void> => {
    if (!host.db || !host.workspace) return;
    if (typeof Notification === 'undefined') {
      setNotice('Platform ini tidak mendukung notifikasi lokal.');
      return;
    }
    if (Notification.permission !== 'granted') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setNotice('Izin notifikasi ditolak.');
        return;
      }
    }
    const result = await rescheduleNotifications(host.db, host.workspace.id, createBrowserNotifier());
    setNotice(`${result.scheduled} jadwal dimuat ulang.`);
    await host.audit('notifications.reschedule', undefined, { count: result.scheduled });
    await refresh();
  };

  const cancel = async (id: string): Promise<void> => {
    if (!host.db || !host.workspace) return;
    await cancelNotification(host.db, host.workspace.id, id);
    await host.audit('notifications.cancel', id);
    await refresh();
  };

  return (
    <SettingsShell title="Notifikasi">
      {notice ? (
        <p role="status" className="alert">
          {notice}
        </p>
      ) : null}
      <button type="button" className="button" onClick={() => void reschedule()}>
        Muat ulang jadwal
      </button>
      {items.length === 0 ? <p>Belum ada notifikasi.</p> : null}
      <ul className="stack-md">
        {items.map((item) => (
          <li key={item.id} className="card">
            <strong>{item.title}</strong>
            <p>{item.body}</p>
            <p>
              {item.state}
              {item.scheduledAtMs ? ` · ${new Date(item.scheduledAtMs).toLocaleString()}` : ''}
            </p>
            {item.state === 'scheduled' ? (
              <button type="button" className="button" onClick={() => void cancel(item.id)}>
                Batalkan
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </SettingsShell>
  );
}
