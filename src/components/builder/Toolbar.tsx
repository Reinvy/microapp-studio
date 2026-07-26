'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Save,
  Play,
  Undo2,
  Redo2,
  Eye,
  Settings2,
  Loader2,
} from 'lucide-react';
import type { AppSchema } from '@/types/schema';
import { microAppRepo } from '@/db/microAppRepo';
import { useAppStore } from '@/store/appStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="flex items-center justify-between h-12 px-4 gap-2">
        {/* Left: Back + Name */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground"
            onClick={() => router.push('/')}
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-2 min-w-0">
            <div className="flex items-center justify-center w-6 h-6 rounded-md bg-primary/10 text-primary shrink-0">
              <Settings2 className="h-3.5 w-3.5" />
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
                className="h-7 text-sm font-medium max-w-[200px]"
                autoFocus
              />
            ) : (
              <button
                onClick={() => {
                  setName(activeApp.name);
                  setEditingName(true);
                }}
                className="text-sm font-medium truncate hover:text-primary transition-colors cursor-pointer"
              >
                {activeApp.name}
              </button>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground"
            disabled
            aria-label="Undo (not available yet)"
          >
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground"
            disabled
            aria-label="Redo (not available yet)"
          >
            <Redo2 className="h-4 w-4" />
          </Button>

          <div className="w-px h-5 bg-border mx-1" />

          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-xs text-muted-foreground"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            {saved ? 'Saved!' : 'Save'}
          </Button>

          <Button
            variant="default"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={handleRun}
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            Run
          </Button>
        </div>
      </div>
    </header>
  );
}
