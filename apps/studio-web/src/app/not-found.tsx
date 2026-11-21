'use client';

/** In-shell not-found surface: every unknown route lands inside the host frame. */

import type { ReactElement } from 'react';
import Link from 'next/link';
import { Button, EmptyState } from '@microapp/ui-kit';
import { useHost } from '@/features/host/HostProvider';

export default function NotFound(): ReactElement {
  const host = useHost();
  return (
    <EmptyState
      title={host.t('errors.generic')}
      description={host.t('shell.limitedMode')}
      action={
        <>
          <Link href="/" className="mads-button mads-button--primary">
            {host.t('nav.home')}
          </Link>
          <Button variant="ghost" onClick={() => history.back()}>
            {host.t('common.back')}
          </Button>
        </>
      }
    />
  );
}
