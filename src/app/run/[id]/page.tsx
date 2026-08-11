'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ArrowLeft, Loader2 } from 'lucide-react';
import type { AppSchema } from '@/types/schema';
import { appService } from '@/services/appService';
import { runHistoryService } from '@/services/runHistoryService';
import { goToDashboard } from '@/lib/navigation';
import { ClayLoader, ClayErrorCard } from '@/components/ui/clay-feedback';

// Lazy-load the AppRunner — its chunk bundles the schema engine
// (executeSchema), the evaluator, RenderField, and a large lucide icon set.
// Deferring it keeps the run-page shell tiny and lets the IndexedDB read
// (appService.getAppById) proceed in parallel with the chunk download, so
// the page paints the shell immediately and the heavy code arrives just in
// time for the first render of the app.
const AppRunner = dynamic(() => import('@/components/runner/AppRunner'), {
  ssr: false,
  loading: () => <RunnerLoading />,
});

/** Clay-styled loading fallback shown while the runner chunk is downloading. */
function RunnerLoading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 clay-sm p-8">
        <Loader2 className="h-8 w-8 animate-spin text-clay-purple" />
        <p className="text-sm text-clay-muted">Preparing runner...</p>
      </div>
    </div>
  );
}

export default function RunPage() {
  const params = useParams();
  const router = useRouter();
  const [app, setApp] = useState<AppSchema | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const appId = params?.id as string | undefined;

  const loadApp = useCallback(async () => {
    if (!appId) {
      setError('No app ID provided.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Read through the service layer — SWR cache + query coalescing mean
      // navigating dashboard → run → back → run reuses the cached record
      // instead of re-hitting IndexedDB, and any mutation invalidates it.
      const found = await appService.getAppById(appId);
      if (found) {
        setApp(found);
      } else {
        setError('App not found. It may have been deleted.');
      }
    } catch (err) {
      console.error('Failed to load app:', err);
      setError('Failed to load the app. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [appId]);

  useEffect(() => {
    loadApp();
  }, [loadApp]);

  // Record the run in the run-history trail (bounded retention, fire-and-forget).
  // Fires once per successfully loaded app — the write never blocks rendering
  // and a failure is swallowed by the service.
  useEffect(() => {
    if (app) {
      runHistoryService.recordRun(app.id, app.name);
    }
  }, [app?.id, app?.name]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return <ClayLoader label="Loading app..." />;
  }

  if (error || !app) {
    return (
      <ClayErrorCard
        title="App not found"
        message={error || 'Something went wrong.'}
        actions={
          <>
            <button
              onClick={() => goToDashboard(router)}
              className="clay-sm px-4 py-2 text-xs font-medium bg-clay-peach/50 hover:bg-clay-peach/70 transition-all text-foreground"
            >
              Back to Dashboard
            </button>
            <button
              onClick={loadApp}
              className="clay-button bg-clay-purple px-4 py-2 text-xs font-medium text-foreground"
            >
              Try Again
            </button>
          </>
        }
      />
    );
  }

  return (
    <div className="min-h-screen bg-clay-cream">
      {/* Top bar */}
      <header className="sticky top-0 z-40 clay-header">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
          <button
            onClick={() => goToDashboard(router)}
            className="flex items-center gap-1.5 text-xs font-medium h-9 px-3 rounded-xl clay-sm bg-clay-peach/40 hover:bg-clay-peach/60 transition-all text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Dashboard
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push(`/builder?id=${app.id}`)}
              className="h-9 px-4 rounded-xl text-xs font-medium clay-sm bg-clay-blue/30 hover:bg-clay-blue/50 transition-all text-foreground"
            >
              Open in Builder
            </button>
          </div>
        </div>
      </header>

      {/* Runner */}
      <main>
        <AppRunner app={app} />
      </main>
    </div>
  );
}
