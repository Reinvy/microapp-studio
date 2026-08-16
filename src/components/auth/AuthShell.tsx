'use client';

import Link from 'next/link';
import { AppWindow } from 'lucide-react';

/**
 * Shared auth-page shell — decorative pastel blobs + centered clay card with
 * logo, gradient header and form body. Login and register previously
 * duplicated this markup (~40 lines each); the accent colors (logo tile,
 * header gradient, blob palette) are passed as static class strings from the
 * page so Tailwind still detects them, and each page can keep its own accent
 * without forking the shell.
 */

interface AuthShellProps {
  /** Card header title, e.g. "Welcome back". */
  title: string;
  /** Card header subtitle. */
  subtitle: string;
  /** Logo tile background class, e.g. 'bg-[#D5B8F5]' (static literal). */
  logoClass: string;
  /** Card header gradient class, e.g. 'bg-gradient-to-r from-[#D5B8F5] to-[#FFD5E5]'. */
  headerClass: string;
  /** Four decorative pastel blob background classes, in render order. */
  blobClasses: [string, string, string, string];
  children: React.ReactNode;
}

export default function AuthShell({
  title,
  subtitle,
  logoClass,
  headerClass,
  blobClasses,
  children,
}: AuthShellProps) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-clay-cream p-4">
      {/* Decorative pastel blobs — plain blurred circles. NOT .clay cards:
          .clay sets an opaque cream background + 28px radius that fights the
          blur effect; a bare bg-[pastel] circle stays soft and translucent. */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className={`absolute -top-20 -right-20 h-80 w-80 rounded-full ${blobClasses[0]}`}
          style={{ filter: 'blur(40px)', opacity: 0.5 }}
        />
        <div
          className={`absolute -bottom-20 -left-20 h-96 w-96 rounded-full ${blobClasses[1]}`}
          style={{ filter: 'blur(50px)', opacity: 0.4 }}
        />
        <div
          className={`absolute top-1/3 left-1/4 h-64 w-64 rounded-full ${blobClasses[2]}`}
          style={{ filter: 'blur(45px)', opacity: 0.3 }}
        />
        <div
          className={`absolute bottom-1/3 right-1/4 h-72 w-72 rounded-full ${blobClasses[3]}`}
          style={{ filter: 'blur(45px)', opacity: 0.25 }}
        />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="group inline-flex items-center gap-2.5">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-2xl clay-sm ${logoClass} text-clay-foreground transition-transform duration-300 group-hover:scale-105`}
            >
              <AppWindow className="h-6 w-6" />
            </div>
            <span className="text-xl font-bold tracking-tight text-clay-foreground">
              MicroApp Studio
            </span>
          </Link>
        </div>

        <div className="clay-card overflow-hidden">
          <div className={`${headerClass} px-6 py-5`}>
            <h1 className="text-xl font-bold text-clay-foreground">{title}</h1>
            <p className="mt-1 text-sm text-clay-foreground/70">{subtitle}</p>
          </div>
          <div className="p-6">{children}</div>
        </div>
      </div>
    </div>
  );
}