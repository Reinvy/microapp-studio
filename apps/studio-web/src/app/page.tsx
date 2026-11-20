'use client';

/** Entry route: onboarding, boot skeleton, or the home screen. */

import type { ReactElement } from 'react';
import { useHost } from '@/features/host/HostProvider';
import { FirstRunFlow } from '@/features/identity/FirstRunFlow';
import { HomeScreen } from '@/features/home/HomeScreen';

export default function Page(): ReactElement {
  const host = useHost();

  if (host.phase === 'booting') {
    return (
      <main id="mads-main" className="screen" aria-busy="true">
        {/* Language-neutral during boot: the locale is detected on the client,
            so translated text here would mismatch SSR and force hydration. */}
        <p role="status" aria-label="Loading">
          …
        </p>
      </main>
    );
  }

  if (host.phase === 'error') {
    return (
      <main id="mads-main" className="screen">
        <div role="alert" className="alert alert-error">
          <h1>{host.t('errors.generic')}</h1>
          <p>{host.error}</p>
          <button type="button" className="button" onClick={() => void host.refresh()}>
            {host.t('common.retry')}
          </button>
        </div>
      </main>
    );
  }

  if (host.phase === 'first-run') {
    return <FirstRunFlow />;
  }

  return <HomeScreen />;
}
