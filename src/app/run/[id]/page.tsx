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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading app...</p>
        </div>
      </div>
    );
  }

  if (error || !app) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-lg font-semibold mb-2">App not found</h2>
          <p className="text-sm text-muted-foreground mb-6">{error || 'Something went wrong.'}</p>
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" onClick={() => router.push('/')}>
              Back to Dashboard
            </Button>
            <Button onClick={loadApp}>Try Again</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-12">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs text-muted-foreground h-8"
            onClick={() => router.push('/')}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Dashboard
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => router.push(`/builder?id=${app.id}`)}
            >
              Open in Builder
            </Button>
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
