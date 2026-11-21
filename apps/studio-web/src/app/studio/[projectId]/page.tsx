'use client';

/**
 * Builder route.
 *
 * `/studio/<projectId>` is the editor; `?preview=1` swaps in the sandboxed
 * preview while keeping the same project (and its autosave) untouched.
 */

import { Suspense, useState, type ReactElement } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Skeleton } from '@microapp/ui-kit';
import { useHost } from '@/features/host/HostProvider';
import { BuilderScreen } from '@/features/studio/BuilderScreen';
import { PreviewScreen } from '@/features/studio/PreviewScreen';
import type { StudioDevice, StudioDocument } from '@/features/studio/types';

function StudioRoute(): ReactElement {
  const params = useParams<{ projectId: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const host = useHost();
  const projectId = typeof params?.projectId === 'string' ? decodeURIComponent(params.projectId) : '';
  const [previewDocument, setPreviewDocument] = useState<StudioDocument | null>(null);

  if (!projectId) {
    return (
      <div className="mads-page">
        <p>{host.t('errors.E-STUDIO-001')}</p>
        <button type="button" className="mads-button" onClick={() => router.push('/')}>
          {host.t('studio.backHome')}
        </button>
      </div>
    );
  }

  const preview = search?.get('preview') === '1';

  if (preview && previewDocument) {
    return (
      <PreviewScreen
        projectId={projectId}
        document={previewDocument}
        onEdit={() => {
          setPreviewDocument(null);
          router.replace(`/studio/${projectId}`);
        }}
        onDeviceChange={(device: StudioDevice) => setPreviewDocument({ ...previewDocument, device })}
      />
    );
  }

  return (
    <BuilderScreen
      projectId={projectId}
      onOpenPreview={(document) => {
        setPreviewDocument(document);
        router.replace(`/studio/${projectId}?preview=1`);
      }}
    />
  );
}

export default function StudioPage(): ReactElement {
  return (
    <Suspense
      fallback={
        <div className="mads-page" aria-busy="true">
          <Skeleton height="2rem" />
          <Skeleton height="16rem" />
        </div>
      }
    >
      <StudioRoute />
    </Suspense>
  );
}
