import type { Metadata, Viewport } from 'next';
import './globals.css';
import '@microapp/ui-kit/tokens.css';
import type { ReactElement, ReactNode } from 'react';
import { HostProvider } from '@/features/host/HostProvider';
import { PwaRegistration } from '@/features/host/PwaRegistration';

export const metadata: Metadata = {
  title: 'MicroApp Studio',
  description: 'Offline-first host for signed micro-apps',
  applicationName: 'MicroApp Studio',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/icon-192.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#0f172a',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }): ReactElement {
  return (
    <html lang="id-ID">
      <body>
        <HostProvider>
          <a className="skip-link" href="#mads-main">
            Lewati ke konten
          </a>
          {children}
          <PwaRegistration />
        </HostProvider>
      </body>
    </html>
  );
}
