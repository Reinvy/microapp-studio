'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  AppWindow,
  Plus,
  Search,
  Sparkles,
  ArrowRight,
  Grid3X3,
  List,
  Loader2,
} from 'lucide-react';
import type { AppSchema } from '@/types/schema';
import { microAppRepo } from '@/db/microAppRepo';
import parsePrompt from '@/engine/promptToSchema';
import { generateId } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import AppCard from '@/components/dashboard/AppCard';

export default function DashboardPage() {
  const router = useRouter();
  const [apps, setApps] = useState<AppSchema[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [newAppName, setNewAppName] = useState('');
  const [newAppPrompt, setNewAppPrompt] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const loadApps = useCallback(async () => {
    setLoading(true);
    try {
      const allApps = await microAppRepo.getAll();
      setApps(allApps);
    } catch {
      // IndexedDB might not be available
      setApps([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadApps();
  }, [loadApps]);

  const handleCreateApp = async () => {
    if (!newAppName.trim()) return;
    setCreating(true);
    try {
      const parsed = parsePrompt(newAppPrompt || newAppName);
      const now = Date.now();
      const newApp: AppSchema = {
        id: generateId(),
        name: newAppName.trim(),
        description: parsed.description || newAppPrompt || '',
        prompt: newAppPrompt || '',
        fields: parsed.fields || [],
        logicNodes: [],
        layout: (parsed.fields || []).map((f, i) => ({
          fieldId: f.id,
          x: 0,
          y: i * 100,
          width: 12,
        })),
        createdAt: now,
        updatedAt: now,
        version: 1,
      };
      await microAppRepo.create(newApp);
      setApps((prev) => [newApp, ...prev]);
      setDialogOpen(false);
      setNewAppName('');
      setNewAppPrompt('');
      router.push(`/builder?id=${newApp.id}`);
    } catch (err) {
      console.error('Failed to create app:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await microAppRepo.remove(id);
      setApps((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error('Failed to delete app:', err);
    }
  };

  const handleRun = (id: string) => {
    router.push(`/run/${id}`);
  };

  const filteredApps = apps.filter(
    (app) =>
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isEmpty = !loading && apps.length === 0;
  const noResults = !loading && apps.length > 0 && filteredApps.length === 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary text-primary-foreground">
                <AppWindow className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg font-semibold tracking-tight">MicroApp Studio</h1>
                <p className="text-[10px] text-muted-foreground -mt-0.5">Build · Run · Share</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-muted-foreground"
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                aria-label={viewMode === 'grid' ? 'Switch to list view' : 'Switch to grid view'}
              >
                {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid3X3 className="h-4 w-4" />}
              </Button>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-1.5">
                    <Plus className="h-4 w-4" />
                    New App
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Create New MicroApp</DialogTitle>
                    <DialogDescription>
                      Give your app a name and optionally describe what it should do.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="space-y-2">
                      <label htmlFor="dialog-app-name" className="text-sm font-medium">App Name</label>
                      <Input
                        id="dialog-app-name"
                        placeholder="e.g. BMI Calculator"
                        value={newAppName}
                        onChange={(e) => setNewAppName(e.target.value)}
                        autoFocus
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="dialog-app-prompt" className="text-sm font-medium">
                        Prompt <span className="text-muted-foreground font-normal">(optional)</span>
                      </label>
                      <textarea
                        id="dialog-app-prompt"
                        className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                        placeholder="e.g. A calculator that adds, subtracts, multiplies, and divides two numbers"
                        value={newAppPrompt}
                        onChange={(e) => setNewAppPrompt(e.target.value)}
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Describe what your app does and we&apos;ll auto-generate the fields.
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateApp}
                      disabled={!newAppName.trim() || creating}
                      className="gap-1.5"
                    >
                      {creating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      {creating ? 'Creating...' : 'Create & Open'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </header>

      {/* Search bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search apps..."
            aria-label="Search apps"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 bg-muted/50 border-muted focus-visible:bg-background"
          />
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading apps...</p>
            </div>
          </div>
        )}

        {isEmpty && (
          <div className="flex flex-col items-center justify-center py-24 animate-fade-in">
            <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mb-6">
              <AppWindow className="h-10 w-10 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No apps yet</h2>
            <p className="text-sm text-muted-foreground text-center max-w-sm mb-8">
              Create your first micro-app with a simple prompt — we&apos;ll generate the fields for
              you.
            </p>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="gap-2">
                  <Plus className="h-5 w-5" />
                  Create Your First App
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Create New MicroApp</DialogTitle>
                  <DialogDescription>
                    Give your app a name and optionally describe what it should do.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <label htmlFor="empty-app-name" className="text-sm font-medium">App Name</label>
                    <Input
                      id="empty-app-name"
                      placeholder="e.g. BMI Calculator"
                      value={newAppName}
                      onChange={(e) => setNewAppName(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Prompt <span className="text-muted-foreground font-normal">(optional)</span>
                    </label>
                    <textarea
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                      placeholder="e.g. A calculator that adds, subtracts, multiplies, and divides two numbers"
                      value={newAppPrompt}
                      onChange={(e) => setNewAppPrompt(e.target.value)}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Describe what your app does and we&apos;ll auto-generate the fields.
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateApp}
                    disabled={!newAppName.trim() || creating}
                    className="gap-1.5"
                  >
                    {creating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    {creating ? 'Creating...' : 'Create & Open'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {noResults && (
          <div className="flex flex-col items-center justify-center py-24 animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold mb-1">No results found</h2>
            <p className="text-sm text-muted-foreground">
              No apps match &quot;{searchQuery}&quot;
            </p>
          </div>
        )}

        {!loading && filteredApps.length > 0 && (
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
                : 'flex flex-col gap-3'
            }
          >
            {filteredApps.map((app) => (
              <AppCard
                key={app.id}
                app={app}
                onDelete={handleDelete}
                onRun={handleRun}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
