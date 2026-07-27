'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { generateId } from '@/lib/utils';
import parsePrompt from '@/engine/promptToSchema';
import { microAppRepo } from '@/db/microAppRepo';
import type { AppSchema } from '@/types/schema';
import AppCard from '@/components/dashboard/AppCard';
import {
  AppWindow,
  Plus,
  Search,
  Trash2,
  Play,
  Edit3,
  LogOut,
  Layout,
  Type,
  ListChecks,
  Calculator,
  User,
  Sparkles,
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [apps, setApps] = useState<AppSchema[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newAppName, setNewAppName] = useState('');
  const [newAppPrompt, setNewAppPrompt] = useState('');

  const loadApps = useCallback(async () => {
    setLoading(true);
    const all = await microAppRepo.getAll();
    setApps(all);
    setLoading(false);
  }, []);

  useEffect(() => { loadApps(); }, [loadApps]);

  const filteredApps = apps.filter((app) =>
    app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateApp = async () => {
    if (!newAppName.trim()) return;
    const parsed = parsePrompt(newAppPrompt || `Create a ${newAppName} app`);
    
    const newApp: AppSchema = {
      id: generateId(),
      name: newAppName,
      description: parsed.description || `A ${newAppName} micro-app`,
      prompt: newAppPrompt,
      fields: parsed.fields,
      logicNodes: [],
      layout: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: 1,
    };
    
    await microAppRepo.create(newApp);
    setShowNewDialog(false);
    setNewAppName('');
    setNewAppPrompt('');
    loadApps();
    router.push(`/builder?id=${newApp.id}`);
  };

  const handleDeleteApp = async (id: string) => {
    await microAppRepo.remove(id);
    loadApps();
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-purple-500 text-white shadow-sm">
              <AppWindow className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold gradient-text">MicroApp Studio</span>
          </div>
          <div className="flex items-center gap-3">
            {user && (
              <span className="hidden text-sm text-muted-foreground sm:block">
                Hi, <span className="font-medium text-foreground">{user.name}</span>
              </span>
            )}
            <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2 text-muted-foreground">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Your Micro Apps</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {apps.length} {apps.length === 1 ? 'app' : 'apps'} created
            </p>
          </div>
          <Button onClick={() => setShowNewDialog(true)} className="h-10 gap-2 shadow-sm">
            <Plus className="h-4 w-4" />
            New App
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search your apps..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 pl-10 bg-white"
          />
        </div>

        {/* App Grid */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-44 rounded-xl border border-border/60 bg-card shimmer" />
            ))}
          </div>
        ) : filteredApps.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/60 bg-card/50 px-6 py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-purple-500/10">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">No apps yet</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Create your first micro-app with AI — describe what you want to build and we&apos;ll generate it for you.
            </p>
            <Button onClick={() => setShowNewDialog(true)} className="mt-6 gap-2">
              <Plus className="h-4 w-4" />
              Create Your First App
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredApps.map((app) => (
              <AppCard
                key={app.id}
                app={app}
                onRun={(id) => router.push(`/run/${id}`)}
                onDelete={() => handleDeleteApp(app.id)}
              />
            ))}
          </div>
        )}

        {/* New App Dialog */}
        {showNewDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm animate-fade-in">
            <div className="mx-4 w-full max-w-md animate-scale-in rounded-2xl border border-border/60 bg-card shadow-elevated">
              <div className="rounded-t-2xl bg-gradient-to-r from-primary to-purple-500 px-6 py-4">
                <h2 className="text-lg font-bold text-white">Create New App</h2>
                <p className="mt-0.5 text-sm text-white/80">Describe what you want to build</p>
              </div>
              <div className="space-y-4 p-6">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">App Name</label>
                  <Input
                    placeholder="My Calculator"
                    value={newAppName}
                    onChange={(e) => setNewAppName(e.target.value)}
                    className="h-10"
                    autoFocus
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Prompt (optional)</label>
                  <textarea
                    placeholder="e.g. A discount calculator with price, discount %, and tax fields..."
                    value={newAppPrompt}
                    onChange={(e) => setNewAppPrompt(e.target.value)}
                    className="min-h-[100px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <Button variant="outline" onClick={() => setShowNewDialog(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button onClick={handleCreateApp} disabled={!newAppName.trim()} className="flex-1 gap-2">
                    <Sparkles className="h-4 w-4" />
                    Generate
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
