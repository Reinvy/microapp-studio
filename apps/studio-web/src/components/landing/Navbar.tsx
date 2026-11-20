'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X, AppWindow, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { contentService } from '@/services/contentService';
import { landingCopy } from '@/lib/landingCopy';
import type { NavLink } from '@/db/contentRepo';

const fallbackNavLinks: NavLink[] = [
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Login', href: '/login' },
];

// Route-based detection (not label-based): the CTA and Login entries are
// identified by their href, so renaming the display label in the content DB
// (e.g. "Login" → "Sign In") can never silently drop the button styling.
const CTA_HREF = '/register';
const LOGIN_HREF = '/login';

/**
 * Shared clay nav-link renderer — one component for the desktop bar and the
 * mobile slide-in menu (previously ~40 duplicated lines of markup). Anchor
 * links (#features) render as plain <a>; route links render as <Link>.
 */
function NavItemLink({
  link,
  mobile = false,
  onNavigate,
}: {
  link: NavLink;
  mobile?: boolean;
  onNavigate?: () => void;
}) {
  const isLogin = link.href === LOGIN_HREF;
  const className = cn(
    'rounded-xl text-sm font-medium transition-all hover:text-clay-foreground hover:shadow-[inset_3px_3px_7px_var(--clay-shadow-dark),inset_-3px_-3px_7px_var(--clay-shadow-light)] hover:bg-[#F5EDE5]',
    mobile ? 'px-4 py-3 text-foreground' : 'px-4 py-2'
  );

  if (isLogin) {
    return (
      <Link key={link.label} href={link.href} onClick={onNavigate} className={className}>
        {link.label}
      </Link>
    );
  }
  return (
    <a key={link.label} href={link.href} onClick={onNavigate} className={className}>
      {link.label}
    </a>
  );
}

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [navLinks, setNavLinks] = useState<NavLink[]>(fallbackNavLinks);

  useEffect(() => {
    // Read through the content service — when the landing page batched
    // `nav-links` in the same mount, this is an instant cache hit (no DB).
    contentService.getContent<NavLink[]>('nav-links').then((links) => {
      if (links) {
        setNavLinks(links);
      }
    }).catch(() => {
      // Fallback already set
    });
  }, []);

  // CTA button is DB-driven too: a nav-link pointing at /register is rendered
  // as the clay CTA button, not a plain link. Falls back to the hardcoded
  // defaults until the async read lands.
  const ctaLink = navLinks.find((l) => l.href === CTA_HREF);
  const ctaLabel = ctaLink?.label ?? landingCopy.ctaFallback;
  const ctaHref = ctaLink?.href ?? CTA_HREF;
  const regularLinks = navLinks.filter((l) => l.href !== CTA_HREF);

  const closeMenu = () => setMobileOpen(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50">
      <div className="bg-[var(--clay-card)] border-b border-clay-border/30 shadow-[0_4px_8px_var(--clay-shadow-dark),-2px_-2px_6px_var(--clay-shadow-light)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#D5B8F5] text-foreground shadow-[4px_4px_8px_var(--clay-shadow-dark),-4px_-4px_8px_var(--clay-shadow-light)] transition-all duration-300 group-hover:shadow-[3px_3px_6px_var(--clay-shadow-dark),-3px_-3px_6px_var(--clay-shadow-light)] group-hover:translate-y-[-1px]">
                <AppWindow className="h-5 w-5" />
              </div>
              <span className="text-lg font-bold tracking-tight gradient-text">
                {landingCopy.brandName}
              </span>
            </Link>

            {/* Desktop nav */}
            <div className="hidden items-center gap-1 md:flex">
              {regularLinks.map((link) => (
                <NavItemLink key={link.label} link={link} />
              ))}
              <div className="ml-2 flex items-center gap-2">
                <Link href={ctaHref}>
                  <Button variant="primary" className="gap-1.5">
                    {ctaLabel}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="flex h-10 w-10 items-center justify-center rounded-xl transition-all hover:shadow-[inset_3px_3px_7px_var(--clay-shadow-dark),inset_-3px_-3px_7px_var(--clay-shadow-light)] hover:bg-[#F5EDE5] md:hidden"
              aria-label={mobileOpen ? landingCopy.closeMenuAria : landingCopy.openMenuAria}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-[rgba(174,162,146,0.3)] md:hidden"
          onClick={closeMenu}
        />
      )}

      {/* Mobile slide-in menu */}
      <div
        className={cn(
          'fixed inset-y-0 right-0 z-50 w-72 border-l border-[#E8E0D8]/60 bg-[var(--clay-card)] shadow-[8px_8px_16px_var(--clay-shadow-dark),-6px_-6px_14px_var(--clay-shadow-light)] transition-transform duration-300 ease-in-out md:hidden',
          mobileOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="flex items-center justify-between border-b border-[#E8E0D8]/40 px-4 py-4">
          <span className="text-sm font-semibold text-foreground">{landingCopy.menuHeading}</span>
          <button
            onClick={closeMenu}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:shadow-[inset_3px_3px_7px_var(--clay-shadow-dark),inset_-3px_-3px_7px_var(--clay-shadow-light)] hover:bg-[#F5EDE5]"
            aria-label={landingCopy.closeMenuAria}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-col gap-1 p-4">
          {regularLinks.map((link) => (
            <NavItemLink key={link.label} link={link} mobile onNavigate={closeMenu} />
          ))}
          <hr className="my-2 border-[#E8E0D8]/40" />
          <Link href={ctaHref} onClick={closeMenu}>
            <Button variant="primary" className="w-full gap-1.5">
              {ctaLabel}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}
