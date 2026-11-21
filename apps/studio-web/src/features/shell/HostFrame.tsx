'use client';

/**
 * Host frame: the shell chrome around every in-shell route.
 *
 * Responsibilities:
 * - exactly one `<main>` landmark (owned by `AppShell`), never two;
 * - responsive navigation: desktop sidebar, tablet rail, mobile dock + FAB;
 * - global status badges (offline, storage, identity, cache);
 * - recovery and backup nudges, with the documented seven-day dismiss window;
 * - the single global permission dialog and the `Cmd/Ctrl+K` palette.
 *
 * `/studio/*` and `/app/*` are full-screen surfaces and render bare. Routes that
 * still have a legacy standalone layout are listed in `LEGACY_PREFIXES`; the
 * list shrinks as each page is rewritten.
 */

import { useCallback, useEffect, useMemo, useState, type ReactElement, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AppShell, Badge, Button, Dock, Sidebar, type SidebarItem } from '@microapp/ui-kit';
import { useHost } from '@/features/host/HostProvider';
import { NUDGE_INTERVAL_MS } from '@/features/preferences/types';
import { CommandPalette } from './CommandPalette';
import { PermissionDialog } from './PermissionDialog';
import { UpdateBanner } from './UpdateBanner';

const FULL_SCREEN_PREFIXES = ['/studio', '/app'];

/** Routes that still render their own standalone chrome (removed as rewritten). */
const LEGACY_PREFIXES = ['/registry', '/dev'];

const STORAGE_WARN_RATIO = 0.8;

interface NavEntry {
  id: string;
  href: string;
  label: string;
  glyph: ReactNode;
}

function glyph(path: string): ReactNode {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d={path} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function HostFrame({ children }: { children: ReactNode }): ReactElement {
  const host = useHost();
  const pathname = usePathname() ?? '/';
  const router = useRouter();
  const [paletteOpen, setPaletteOpen] = useState(false);

  const fullScreen = FULL_SCREEN_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  const legacy = LEGACY_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

  const navigate = useCallback(
    (href: string) => {
      router.push(href);
    },
    [router],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const navEntries = useMemo<NavEntry[]>(
    () => [
      { id: 'home', href: '/', label: host.t('nav.home'), glyph: glyph('M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1Z') },
      { id: 'templates', href: '/templates', label: host.t('nav.templates'), glyph: glyph('M4 5h7v7H4Zm9 0h7v4h-7Zm0 6h7v8h-7Zm-9 3h7v5H4Z') },
      { id: 'packages', href: '/packages', label: host.t('nav.packages'), glyph: glyph('M12 3 4 7v10l8 4 8-4V7Zm0 0v8m0 0 8-4m-8 4-8-4') },
      { id: 'settings', href: '/settings', label: host.t('nav.settings'), glyph: glyph('M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm8 3-1.6-.6.5-1.6-1.6-1.6-1.6.5-.6-1.6h-2.3l-.6 1.6-1.6-.5L8.4 9.8l.5 1.6L7.3 12l.6 1.6-1.6.5 1.6 1.6 1.6-.5.6 1.6h2.3l.6-1.6 1.6.5 1.6-1.6-.5-1.6Z') },
    ],
    [host],
  );

  const activeId = navEntries.find((entry) => entry.href === '/' ? pathname === '/' : pathname.startsWith(entry.href))?.id;

  const sidebarItems: SidebarItem[] = navEntries.map((entry) => ({
    id: entry.id,
    label: entry.label,
    icon: entry.glyph,
    href: entry.href,
    active: entry.id === activeId,
    onNavigate: (href) => navigate(href),
  }));

  const variant = useHostShellVariant();

  const storageWarning = useMemo(() => {
    const estimate = host.storageEstimate;
    if (!estimate || estimate.quota === 0) return false;
    return estimate.usage / estimate.quota > STORAGE_WARN_RATIO;
  }, [host.storageEstimate]);

  // Time is read after mount (it is impure during render), but both nudges have a
  // time-independent answer for a fresh install, so they render server-side too.
  // That keeps the first paint identical on both sides and gives the page a large
  // text block early — the LCP budget depends on it.
  const now = useMountedTimestamp();
  const recentlyDismissed = (at: number | null): boolean =>
    at !== null && now !== null && now - at <= NUDGE_INTERVAL_MS;
  const showRecovery = !host.prefs.recoverySecured && !recentlyDismissed(host.prefs.recoveryNudgeDismissedAt);
  const showBackup =
    !recentlyDismissed(host.prefs.backupNudgeDismissedAt) &&
    (host.prefs.lastBackupAt === null || now === null || now - host.prefs.lastBackupAt > NUDGE_INTERVAL_MS);

  if (fullScreen || legacy) {
    // Legacy pages own their own chrome until they are rewritten; full-screen
    // surfaces (builder, runner) never show the host sidebar.
    return (
      <>
        {children}
        <PermissionDialog />
        {paletteOpen ? <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} /> : null}
      </>
    );
  }

  const statusBadges = (
    <div className="mads-row">
      {!host.online ? <Badge tone="warning">{host.t('shell.offline')}</Badge> : null}
      {host.cacheStatus === 'uncached' ? <Badge tone="info">{host.t('shell.uncached')}</Badge> : null}
      {host.bootError ? <Badge tone="danger">{host.t('shell.limitedMode')}</Badge> : null}
      {host.identityError ? <Badge tone="danger">{host.t('shell.identityError')}</Badge> : null}
      {host.degradedIdentity && !host.identityError ? <Badge tone="warning">{host.t('shell.identityDegraded')}</Badge> : null}
      {host.storage === 'memory' ? <Badge tone="warning">{host.t('shell.storageWarn')}</Badge> : null}
      {storageWarning ? <Badge tone="warning">{host.t('shell.storageWarn')}</Badge> : null}
    </div>
  );

  return (
    <>
      <AppShell
        variant={variant}
        mainId="mads-main"
        mainLabel={host.t('a11y.mainNavigation')}
        skipLabel={host.t('a11y.skipToContent')}
        sidebar={<Sidebar items={sidebarItems} label={host.t('a11y.mainNavigation')} />}
        rail={<Sidebar items={sidebarItems} label={host.t('a11y.mainNavigation')} />}
        dock={
          <Dock
            items={[
              ...navEntries.map((entry) => ({
                id: entry.id,
                label: entry.label,
                icon: entry.glyph,
                href: entry.href,
                active: entry.id === activeId,
                onNavigate: (href: string) => navigate(href),
              })),
              {
                id: 'create',
                label: host.t('nav.create'),
                icon: glyph('M12 5v14M5 12h14'),
                href: '/create?mode=blank',
                onNavigate: (href: string) => navigate(href),
              },
            ]}
            label={host.t('a11y.mainNavigation')}
          />
        }
        header={
          <div className="mads-row" style={{ width: '100%', justifyContent: 'space-between' }}>
            <div className="mads-row">
              <strong>{host.t('app.name')}</strong>
              {statusBadges}
            </div>
            <div className="mads-row">
              <Button variant="secondary" size="sm" onClick={() => setPaletteOpen(true)}>
                {host.t('shell.commandPalette')}
              </Button>
              <Button size="sm" onClick={() => navigate('/create?mode=blank')}>
                {host.t('home.actionCreate')}
              </Button>
            </div>
          </div>
        }
      >
        <div className="mads-container mads-page">
          {showRecovery ? (
            <div className="mads-cluster" role="region" aria-label={host.t('shell.recoveryBanner')}>
              <div>
                <strong>{host.t('shell.recoveryBanner')}</strong>
                <p>{host.t('shell.recoveryBannerBody')}</p>
              </div>
              <div className="mads-row">
                <Button size="sm" onClick={() => navigate('/settings/general')}>
                  {host.t('shell.amankanData')}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => host.setPrefs({ recoveryNudgeDismissedAt: Date.now() })}
                >
                  {host.t('shell.aturNanti')}
                </Button>
              </div>
            </div>
          ) : null}
          {showBackup ? (
            <div className="mads-cluster" role="region" aria-label={host.t('shell.backupReminder')}>
              <div>
                <strong>{host.t('shell.backupReminder')}</strong>
                <p>{host.t('shell.backupReminderBody')}</p>
              </div>
              <div className="mads-row">
                <Button size="sm" onClick={() => navigate('/settings/data')}>
                  {host.t('backup.create')}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => host.setPrefs({ backupNudgeDismissedAt: Date.now() })}
                >
                  {host.t('shell.aturNanti')}
                </Button>
              </div>
            </div>
          ) : null}
          <UpdateBanner />
          {children}
        </div>
      </AppShell>
      <PermissionDialog />
      {paletteOpen ? <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} /> : null}
    </>
  );
}

/**
 * Breakpoint-driven shell variant. Kept in one place so the layout and the
 * device frames in the builder can never disagree about the thresholds.
 */
/** `Date.now()` sampled once after mount; `null` until the client is live. */
function useMountedTimestamp(): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setNow(Date.now());
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return now;
}

function useHostShellVariant(): 'desktop' | 'rail' | 'mobile' {
  const [variant, setVariant] = useState<'desktop' | 'rail' | 'mobile'>('desktop');
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const desktop = window.matchMedia('(min-width: 1024px)');
    const rail = window.matchMedia('(min-width: 768px)');
    const update = (): void => {
      if (desktop.matches) setVariant('desktop');
      else if (rail.matches) setVariant('rail');
      else setVariant('mobile');
    };
    update();
    desktop.addEventListener('change', update);
    rail.addEventListener('change', update);
    return () => {
      desktop.removeEventListener('change', update);
      rail.removeEventListener('change', update);
    };
  }, []);
  return variant;
}
