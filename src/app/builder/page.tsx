'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, AlertTriangle } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { microAppRepo } from '@/db/microAppRepo';
import { generateId } from '@/lib/utils';
import type { AppSchema } from '@/types/schema';
import Toolbar from '@/components/builder/Toolbar';
import ComponentPalette from '@/components/builder/ComponentPalette';
import Canvas from '@/components/builder/Canvas';
import PropertiesPanel from '@/components/builder/PropertiesPanel';
import { Button } from '@/components/ui/button';

function BuilderContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setActiveApp, setLoading, isLoading, activeApp } = useAppStore();
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const appId = searchParams.get('id');

  const loadApp = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (appId) {
        const app = await microAppRepo.getById(appId);
        if (app) {
          setActiveApp(app);
        } else {
          setError(`App with ID "${appId}" not found.`);
        }
      } else {
        const now = Date.now();
        const newApp: AppSchema = {
          id: generateId(),
          name: 'Untitled App',
          description: '',
          prompt: '',
          fields: [],
          logicNodes: [],
          layout: [],
          createdAt: now,
          updatedAt: now,
          version: 1,
        };
        setActiveApp(newApp);
      }
    } catch (err) {
      console.error('Failed to load app:', err);
      setError('Failed to load the app. Please try again.');
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }, [appId, setActiveApp, setLoading]);

  useEffect(() => {
    loadApp();
  }, [loadApp]);

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
          <p className="text-sm text-muted-foreground mb-6">{error}</p>
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

  if (isLoading || !initialized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {appId ? 'Loading app...' : 'Creating new app...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <Toolbar />
      <div className="flex flex-1 overflow-hidden">
        <ComponentPalette />
        <Canvas />
        <PropertiesPanel />
      </div>
    </div>
  );
}

export default function BuilderPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading builder...</p>
          </div>
        </div>
      }
    >
      <BuilderContent />
    </Suspense>
  );
}
