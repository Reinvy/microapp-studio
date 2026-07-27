'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X, AppWindow, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const navLinks = [
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Login', href: '/login' },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50">
      <div className="glass border-b border-border/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-purple-500 text-white shadow-sm transition-transform duration-300 group-hover:scale-105">
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
                      className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      {link.label}
                    </Link>
                  );
                }

                return (
                  <a
                    key={link.label}
                    href={link.href}
                    className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    {link.label}
                  </a>
                );
              })}
              <div className="ml-2 flex items-center gap-2">
                <Link href="/register">
                  <Button className="gap-1.5 shadow-sm">
                    Get Started
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent md:hidden"
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
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile slide-in menu */}
      <div
        className={cn(
          'fixed inset-y-0 right-0 z-50 w-72 border-l border-border/60 bg-card shadow-xl transition-transform duration-300 ease-in-out md:hidden',
          mobileOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="flex items-center justify-between border-b border-border/40 px-4 py-4">
          <span className="text-sm font-semibold text-foreground">Menu</span>
          <button
            onClick={() => setMobileOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-col gap-1 p-4">
          <a
            href="#features"
            onClick={() => setMobileOpen(false)}
            className="rounded-lg px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Features
          </a>
          <a
            href="#how-it-works"
            onClick={() => setMobileOpen(false)}
            className="rounded-lg px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            How It Works
          </a>
          <Link
            href="/login"
            onClick={() => setMobileOpen(false)}
            className="rounded-lg px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Login
          </Link>
          <hr className="my-2 border-border/40" />
          <Link href="/register" onClick={() => setMobileOpen(false)}>
            <Button className="w-full gap-1.5">
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}
