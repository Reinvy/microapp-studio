'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Save,
  Play,
  Undo2,
  Redo2,
  Settings2,
  Loader2,
} from 'lucide-react';
import { microAppRepo } from '@/db/microAppRepo';
import { useAppStore } from '@/store/appStore';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export default function Toolbar() {
  const router = useRouter();
  const { activeApp, updateApp } = useAppStore();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(activeApp?.name || 'Untitled');

  const handleSave = useCallback(async () => {
    if (!activeApp) return;
    setSaving(true);
    try {
      await microAppRepo.update(activeApp.id, activeApp);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  }, [activeApp]);

  const handleNameSubmit = useCallback(() => {
    if (activeApp && name.trim()) {
      updateApp(activeApp.id, { name: name.trim() });
    }
    setEditingName(false);
  }, [activeApp, name, updateApp]);

  const handleRun = useCallback(() => {
    if (activeApp) {
      // Save before running
      microAppRepo.update(activeApp.id, activeApp).then(() => {
        router.push(`/run/${activeApp.id}`);
      });
    }
  }, [activeApp, router]);

  if (!activeApp) return null;

  return (
    <header className="sticky top-0 z-50 border-b border-clay-border/30 bg-[var(--clay-card)] shadow-[0_2px_10px_rgba(174,162,146,0.12)]">
      <div className="flex items-center justify-between h-14 px-4 gap-2">
        {/* Left: Back + Name */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            onClick={() => router.push('/')}
            className="flex items-center justify-center h-9 w-9 rounded-full clay-sm bg-clay-peach shrink-0 hover:scale-105 active:scale-95 transition-transform"
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="h-4 w-4" style={{ color: 'var(--clay-foreground)' }} />
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <div className="flex items-center justify-center w-7 h-7 rounded-xl bg-clay-purple/40 shrink-0">
              <Settings2 className="h-3.5 w-3.5" style={{ color: 'var(--clay-foreground)' }} />
            </div>
            {editingName ? (
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={handleNameSubmit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleNameSubmit();
                  if (e.key === 'Escape') {
                    setName(activeApp.name);
                    setEditingName(false);
                  }
                }}
                className="h-8 text-sm font-medium max-w-[200px] clay-input"
                autoFocus
              />
            ) : (
              <button
                onClick={() => {
                  setName(activeApp.name);
                  setEditingName(true);
                }}
                className="text-sm font-medium truncate hover:opacity-70 transition-opacity cursor-pointer clay-sm px-3 py-1"
                style={{ color: 'var(--clay-foreground)' }}
              >
                {activeApp.name}
              </button>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1">
          <button
            disabled
            className="hidden sm:flex items-center justify-center h-8 w-8 rounded-xl clay-sm opacity-40 cursor-not-allowed"
            aria-label="Undo (not available yet)"
          >
            <Undo2 className="h-4 w-4" style={{ color: 'var(--clay-muted)' }} />
          </button>
          <button
            disabled
            className="hidden sm:flex items-center justify-center h-8 w-8 rounded-xl clay-sm opacity-40 cursor-not-allowed"
            aria-label="Redo (not available yet)"
          >
            <Redo2 className="h-4 w-4" style={{ color: 'var(--clay-muted)' }} />
          </button>

          <div className="hidden sm:block w-px h-6 bg-clay-border mx-1" />

          <button
            onClick={handleSave}
            disabled={saving}
            className={cn(
              'flex items-center gap-1.5 h-8 px-3 rounded-xl text-xs font-medium transition-all',
              'bg-clay-green clay-button',
              saving && 'opacity-70 cursor-not-allowed'
            )}
            style={{ color: 'var(--clay-foreground)' }}
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            {saved ? 'Saved!' : 'Save'}
          </button>

          <button
            onClick={handleRun}
            className="flex items-center gap-1.5 h-8 px-4 rounded-xl text-xs font-medium clay-button bg-clay-purple transition-all hover:scale-105 active:scale-95"
            style={{ color: 'var(--clay-foreground)' }}
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            Run
          </button>
        </div>
      </div>
    </header>
  );
}
