/**
 * Library context-menu model.
 *
 * The menu is plain data so Home can open it from a right click, the card's menu
 * button, or `Shift+F10` on a focused card without duplicating the item list.
 */

import type { Translate } from '@/i18n';
import type { InstalledApp } from '@/db/repositories/apps';

export type AppMenuAction = 'open' | 'rename' | 'duplicate' | 'export' | 'pin' | 'uninstall';

export interface ContextMenuItem {
  id: AppMenuAction;
  label: string;
  danger?: boolean;
}

export function appMenuItems(app: InstalledApp, t: Translate): ContextMenuItem[] {
  return [
    { id: 'open', label: t('common.open') },
    { id: 'rename', label: t('common.rename') },
    { id: 'duplicate', label: t('common.duplicate') },
    { id: 'export', label: t('common.export') },
    { id: app.pinned ? 'unpin' as AppMenuAction : 'pin', label: app.pinned ? t('home.unpin') : t('home.pin') },
    { id: 'uninstall', label: t('common.uninstall'), danger: true },
  ];
}

export interface ContextMenuState {
  appId: string;
  x: number;
  y: number;
}

/** Keep the menu inside the viewport on a 360 px screen. */
export function clampMenuPosition(state: ContextMenuState, width = 220, height = 280): ContextMenuState {
  if (typeof window === 'undefined') return state;
  return {
    appId: state.appId,
    x: Math.max(8, Math.min(state.x, window.innerWidth - width - 8)),
    y: Math.max(8, Math.min(state.y, window.innerHeight - height - 8)),
  };
}
