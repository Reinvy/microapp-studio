'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X, AppWindow, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { contentRepo, type NavLink } from '@/db/contentRepo';

const fallbackNavLinks: NavLink[] = [
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Login', href: '/login' },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [navLinks, setNavLinks] = useState<NavLink[]>(fallbackNavLinks);

  useEffect(() => {
    contentRepo.getByType('nav-links').then((content) => {
      if (content && Array.isArray(content.data)) {
        setNavLinks(content.data as NavLink[]);
      }
    }).catch(() => {
      // Fallback already set
    });
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50">
      <div className="bg-white/90 backdrop-blur-md border-b border-[#E8E0D8]/40 shadow-[0_4px_8px_var(--clay-shadow-dark),0_-2px_6px_var(--clay-shadow-light)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#D5B8F5] text-[#5D4E37] shadow-[4px_4px_8px_var(--clay-shadow-dark),-4px_-4px_8px_var(--clay-shadow-light)] transition-all duration-300 group-hover:shadow-[3px_3px_6px_var(--clay-shadow-dark),-3px_-3px_6px_var(--clay-shadow-light)] group-hover:translate-y-[-1px]">
                <AppWindow className="h-5 w-5" />
              </div>
              <span className="text-lg font-bold tracking-tight gradient-text">
                MicroApp Studio
              </span>
            </Link>

            {/* Desktop nav */}
            <div className="hidden items-center gap-1 md:flex">
              {navLinks.map((link) => {
                const isButton = link.label === 'Get Started';
                if (isButton) return null;

                if (link.label === 'Login') {
                  return (
                    <Link
                      key={link.label}
                      href={link.href}
                      className="rounded-xl px-4 py-2 text-sm font-medium text-[#B8A898] transition-all hover:text-[#5D4E37] hover:shadow-[inset_3px_3px_7px_var(--clay-shadow-dark),inset_-3px_-3px_7px_var(--clay-shadow-light)] hover:bg-[#F5EDE5]"
                    >
                      {link.label}
                    </Link>
                  );
                }

                return (
                  <a
                    key={link.label}
                    href={link.href}
                    className="rounded-xl px-4 py-2 text-sm font-medium text-[#B8A898] transition-all hover:text-[#5D4E37] hover:shadow-[inset_3px_3px_7px_var(--clay-shadow-dark),inset_-3px_-3px_7px_var(--clay-shadow-light)] hover:bg-[#F5EDE5]"
                  >
                    {link.label}
                  </a>
                );
              })}
              <div className="ml-2 flex items-center gap-2">
                <Link href="/register">
                  <Button variant="primary" className="gap-1.5">
                    Get Started
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-[#B8A898] transition-all hover:shadow-[inset_3px_3px_7px_var(--clay-shadow-dark),inset_-3px_-3px_7px_var(--clay-shadow-light)] hover:bg-[#F5EDE5] md:hidden"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-[rgba(174,162,146,0.2)] backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
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
          <span className="text-sm font-semibold text-[#5D4E37]">Menu</span>
          <button
            onClick={() => setMobileOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-[#B8A898] hover:shadow-[inset_3px_3px_7px_var(--clay-shadow-dark),inset_-3px_-3px_7px_var(--clay-shadow-light)] hover:bg-[#F5EDE5]"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-col gap-1 p-4">
          <a
            href="#features"
            onClick={() => setMobileOpen(false)}
            className="rounded-xl px-4 py-3 text-sm font-medium text-[#5D4E37] transition-all hover:shadow-[inset_3px_3px_7px_var(--clay-shadow-dark),inset_-3px_-3px_7px_var(--clay-shadow-light)] hover:bg-[#F5EDE5]"
          >
            Features
          </a>
          <a
            href="#how-it-works"
            onClick={() => setMobileOpen(false)}
            className="rounded-xl px-4 py-3 text-sm font-medium text-[#5D4E37] transition-all hover:shadow-[inset_3px_3px_7px_var(--clay-shadow-dark),inset_-3px_-3px_7px_var(--clay-shadow-light)] hover:bg-[#F5EDE5]"
          >
            How It Works
          </a>
          <Link
            href="/login"
            onClick={() => setMobileOpen(false)}
            className="rounded-xl px-4 py-3 text-sm font-medium text-[#5D4E37] transition-all hover:shadow-[inset_3px_3px_7px_var(--clay-shadow-dark),inset_-3px_-3px_7px_var(--clay-shadow-light)] hover:bg-[#F5EDE5]"
          >
            Login
          </Link>
          <hr className="my-2 border-[#E8E0D8]/40" />
          <Link href="/register" onClick={() => setMobileOpen(false)}>
            <Button variant="primary" className="w-full gap-1.5">
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}
