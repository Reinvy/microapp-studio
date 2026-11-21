'use client';

/**
 * Import screen: the shared `ImportDialog` in page flow.
 *
 * A file dropped on the packages list is handed over in memory and inspected
 * immediately, so the user never picks the same file twice.
 */

import { useState, type ReactElement } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@microapp/ui-kit';
import { useHost } from '@/features/host/HostProvider';
import { ImportDialog } from '@/features/packages/ImportDialog';
import { takePendingImport } from '@/features/packages/pendingImport';

export default function ImportPackagePage(): ReactElement {
  const host = useHost();
  const router = useRouter();
  // The drop handoff is consumed exactly once, inside the initializer: an effect
  // would set state during mount and trigger a cascading render.
  const [initialFile] = useState<File | null>(() => takePendingImport());

  return (
    <div>
      <div className="mads-page__header">
        <h1 className="mads-page__title">{host.t('packages.importTitle')}</h1>
        <Button variant="secondary" onClick={() => router.push('/packages')}>
          {host.t('packages.backToPackages')}
        </Button>
      </div>
      <ImportDialog initialFile={initialFile} onClose={() => router.push('/packages')} />
    </div>
  );
}
