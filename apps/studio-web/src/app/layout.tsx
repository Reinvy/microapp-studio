import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import type { ReactElement, ReactNode } from 'react';

import '@fontsource/plus-jakarta-sans/400.css';
import '@fontsource/plus-jakarta-sans/500.css';
import '@fontsource/plus-jakarta-sans/600.css';
import '@fontsource/plus-jakarta-sans/700.css';
import '@fontsource/plus-jakarta-sans/800.css';
import '@fontsource/fraunces/600.css';
import '@fontsource/fraunces/700.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/600.css';

import '@microapp/ui-kit/tokens.css';
import './globals.css';
import './legacy-host.css';

import { HostProvider } from '@/features/host/HostProvider';
import { HostFrame } from '@/features/shell/HostFrame';
import { PwaRegistration } from '@/features/host/PwaRegistration';

/**
 * The per-request CSP nonce only reaches the rendered script tags when the
 * document is rendered per request; a statically prerendered page has no nonce
 * to stamp. Every route is dynamic for that reason, which is also correct for a
 * client-only host that opens OPFS on boot.
 */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'MicroApp Studio',
  description: 'Host offline-first untuk micro-app bertanda tangan',
  applicationName: 'MicroApp Studio',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/icon-192.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#F3EEE7',
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: ReactNode }): Promise<ReactElement> {
  // The per-request CSP nonce has to reach client code: a sandboxed `srcdoc`
  // iframe inherits the host policy, so its inline bootstrap is only allowed when
  // it carries this exact nonce.
  const nonce = (await headers()).get('x-nonce') ?? '';
  return (
    <html lang="id-ID" dir="ltr" suppressHydrationWarning>
      <head>
        {/*
          Pragmatic pre-paint preference application: applies theme, locale,
          direction, text scale, and reduced motion before the first paint so
          the page never flashes the wrong palette. Same-origin and tiny.
        */}
        <meta name="csp-nonce" content={nonce} />
        {/* eslint-disable-next-line @next/next/no-sync-scripts -- must run before first paint */}
        <script src="/theme-init.js" />
      </head>
      <body>
        <HostProvider>
          <HostFrame>{children}</HostFrame>
          <PwaRegistration />
        </HostProvider>
      </body>
    </html>
  );
}
