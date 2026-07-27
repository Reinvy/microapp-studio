'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { generateId } from '@/lib/utils';
import parsePrompt from '@/engine/promptToSchema';
import { microAppRepo } from '@/db/microAppRepo';
import type { AppSchema } from '@/types/schema';
import AppCard from '@/components/dashboard/AppCard';
import {
  AppWindow,
  Plus,
  Search,
  LogOut,
  Sparkles,
  Loader2,
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
    <div className="min-h-screen bg-[#FFF8F0] relative">
      {/* Decorative clay blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-[#FFD5E5] clay" style={{filter:'blur(60px)', opacity:0.3}} />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-[#C5E8F7] clay" style={{filter:'blur(50px)', opacity:0.25}} />
        <div className="absolute top-1/3 left-3/4 w-64 h-64 rounded-full bg-[#FFF2C5] clay" style={{filter:'blur(45px)', opacity:0.2}} />
        <div className="absolute bottom-1/3 right-3/4 w-72 h-72 rounded-full bg-[#D5B8F5] clay" style={{filter:'blur(45px)', opacity:0.15}} />
      </div>

      {/* Top Navigation */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl clay-card rounded-none border-b border-[#E8E0D8]">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl clay-sm bg-[#D5B8F5] text-[#5D4E37]">
              <AppWindow className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold text-[#5D4E37]">MicroApp Studio</span>
          </div>
          <div className="flex items-center gap-3">
            {user && (
              <span className="hidden text-sm text-[#B8A898] sm:block">
                Hi, <span className="font-medium text-[#5D4E37]">{user.name}</span>
              </span>
            )}
            <button onClick={handleLogout}
              className="clay-sm flex h-9 items-center gap-2 px-3 text-sm text-[#5D4E37] bg-[#FFD5E5]">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#5D4E37]">Your Micro Apps</h1>
            <p className="mt-1 text-sm text-[#B8A898]">
              {apps.length} {apps.length === 1 ? 'app' : 'apps'} created
            </p>
          </div>
          <button onClick={() => setShowNewDialog(true)}
            className="clay-button h-10 flex items-center gap-2 px-4 text-sm font-medium text-[#5D4E37] bg-[#D5B8F5]">
            <Plus className="h-4 w-4" />
            New App
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#B8A898]" />
          <input
            placeholder="Search your apps..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="clay-input h-10 w-full pl-10 text-sm text-[#5D4E37]"
          />
        </div>

        {/* App Grid */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-44 clay-card shimmer" />
            ))}
          </div>
        ) : filteredApps.length === 0 ? (
          <div className="flex flex-col items-center justify-center clay-card px-6 py-16 text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-[50%] clay-sm bg-[#FFF2C5]">
              <Sparkles className="h-8 w-8 text-[#5D4E37]" />
            </div>
            <h3 className="text-lg font-semibold text-[#5D4E37]">No apps yet</h3>
            <p className="mt-1 max-w-sm text-sm text-[#B8A898]">
              Create your first micro-app with AI — describe what you want to build and we&apos;ll generate it for you.
            </p>
            <button onClick={() => setShowNewDialog(true)}
              className="clay-button mt-6 flex items-center gap-2 px-4 h-10 text-sm font-medium text-[#5D4E37] bg-[#D5B8F5]">
              <Plus className="h-4 w-4" />
              Create Your First App
            </button>
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 animate-fade-in">
            <div className="mx-4 w-full max-w-md animate-scale-in clay-card overflow-hidden">
              <div className="bg-gradient-to-r from-[#D5B8F5] to-[#FFD5E5] px-6 py-4">
                <h2 className="text-lg font-bold text-[#5D4E37]">Create New App</h2>
                <p className="mt-0.5 text-sm text-[#5D4E37]/70">Describe what you want to build</p>
              </div>
              <div className="space-y-4 p-6">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[#5D4E37]">App Name</label>
                  <input
                    placeholder="My Calculator"
                    value={newAppName}
                    onChange={(e) => setNewAppName(e.target.value)}
                    className="clay-input h-10 w-full text-sm text-[#5D4E37]"
                    autoFocus
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[#5D4E37]">Prompt (optional)</label>
                  <textarea
                    placeholder="e.g. A discount calculator with price, discount %, and tax fields..."
                    value={newAppPrompt}
                    onChange={(e) => setNewAppPrompt(e.target.value)}
                    className="clay-input min-h-[100px] w-full px-3 py-2 text-sm text-[#5D4E37] resize-none"
                  />
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <button onClick={() => setShowNewDialog(false)}
                    className="clay-button flex-1 h-10 text-sm font-medium text-[#5D4E37] bg-[#F5EDE5]">
                    Cancel
                  </button>
                  <button onClick={handleCreateApp} disabled={!newAppName.trim()}
                    className="clay-button flex-1 h-10 flex items-center justify-center gap-2 text-sm font-medium text-[#5D4E37] bg-[#D5B8F5] disabled:opacity-60">
                    <Sparkles className="h-4 w-4" />
                    Generate
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
