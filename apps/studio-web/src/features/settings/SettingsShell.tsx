'use client';

/**
 * Settings chrome.
 *
 * Settings live inside the host shell (`HostFrame` owns the single `<main>`), so
 * this component renders navigation + a heading only — never its own `<main>`.
 * Sub-navigation is keyboard reachable and marks the active page.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactElement, ReactNode } from 'react';
import { Breadcrumb } from '@microapp/ui-kit';
import { useHost } from '@/features/host/HostProvider';

export const SETTINGS_NAV = [
  { href: '/settings', key: 'settings.title' },
  { href: '/settings/general', key: 'settings.groups.general.title' },
  { href: '/settings/permissions', key: 'settings.groups.permissions.title' },
  { href: '/settings/ai', key: 'settings.groups.ai.title' },
  { href: '/settings/data', key: 'settings.groups.data.title' },
  { href: '/settings/about', key: 'settings.groups.about.title' },
  { href: '/settings/dev', key: 'settings.groups.dev.title' },
] as const;

export interface SettingsShellProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function SettingsShell({ title, description, children }: SettingsShellProps): ReactElement {
  const host = useHost();
  const pathname = usePathname() ?? '/settings';

  return (
    <div className="mads-page">
      <Breadcrumb
        items={[{ label: host.t('nav.home'), href: '/' }, { label: host.t('settings.title'), href: '/settings' }]}
      />
      <div className="mads-page__header">
        <h1 className="mads-page__title">{title}</h1>
      </div>
      {description ? <p className="mads-page__lead">{description}</p> : null}

      <nav aria-label={host.t('nav.settings')} className="mads-cluster">
        {SETTINGS_NAV.map((entry) => (
          <Link
            key={entry.href}
            href={entry.href}
            className="mads-button mads-button--secondary mads-button--sm"
            aria-current={pathname === entry.href ? 'page' : undefined}
          >
            {host.t(entry.key)}
          </Link>
        ))}
      </nav>

      <div className="mads-stack">{children}</div>
    </div>
  );
}
