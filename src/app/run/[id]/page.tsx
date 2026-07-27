'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, AlertTriangle } from 'lucide-react';
import type { AppSchema } from '@/types/schema';
import { microAppRepo } from '@/db/microAppRepo';
import { Button } from '@/components/ui/button';
import AppRunner from '@/components/runner/AppRunner';

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
      const found = await microAppRepo.getById(appId);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-clay-cream flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 clay-sm p-6">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#D5B8F5' }} />
          <p className="text-sm" style={{ color: '#B8A898' }}>Loading app...</p>
        </div>
      </div>
    );
  }

  if (error || !app) {
    return (
      <div className="min-h-screen bg-clay-cream flex items-center justify-center">
        <div className="text-center max-w-sm clay p-8">
          <div className="w-16 h-16 rounded-2xl bg-clay-rose flex items-center justify-center mx-auto mb-4 shadow-inner">
            <AlertTriangle className="h-8 w-8" style={{ color: '#5D4E37' }} />
          </div>
          <h2 className="text-lg font-semibold mb-2" style={{ color: '#5D4E37' }}>App not found</h2>
          <p className="text-sm mb-6" style={{ color: '#B8A898' }}>{error || 'Something went wrong.'}</p>
          <div className="flex items-center justify-center gap-2">
            <button onClick={() => router.push('/')} className="clay-sm px-4 py-2 text-xs font-medium bg-clay-peach/50 hover:bg-clay-peach/70 transition-all" style={{ color: '#5D4E37' }}>
              Back to Dashboard
            </button>
            <button onClick={loadApp} className="clay-button bg-clay-purple px-4 py-2 text-xs font-medium" style={{ color: '#5D4E37' }}>
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-clay-cream">
      {/* Top bar */}
      <header className="sticky top-0 z-40 clay-card rounded-none border-b border-clay-border/30">
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-14">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-1.5 text-xs font-medium h-9 px-3 rounded-xl clay-sm bg-clay-peach/40 hover:bg-clay-peach/60 transition-all"
            style={{ color: '#5D4E37' }}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Dashboard
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push(`/builder?id=${app.id}`)}
              className="h-9 px-4 rounded-xl text-xs font-medium clay-sm bg-clay-blue/30 hover:bg-clay-blue/50 transition-all"
              style={{ color: '#5D4E37' }}
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
