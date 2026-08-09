'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { generateId } from '@/lib/utils';
import parsePrompt from '@/engine/promptToSchema';
import { appService } from '@/services/appService';
import { promptTemplateService } from '@/services/promptTemplateService';
import type { PromptTemplate } from '@/lib/promptTemplates';
import type { AppSchema } from '@/types/schema';

interface NewAppDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function NewAppDialog({ open, onClose }: NewAppDialogProps) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [prompt, setPrompt] = useState('');
  const [creating, setCreating] = useState(false);
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);

  // Load DB-driven prompt suggestion templates (contentRepo → IndexedDB).
  // Falls back to DEFAULT_PROMPT_TEMPLATES inside the service on any error.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    promptTemplateService.load().then((items) => {
      if (!cancelled) setTemplates(items);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!open) return null;

  const handleCreate = async () => {
    if (!name.trim() || creating) return;
    setCreating(true);
    try {
      const parsed = parsePrompt(prompt || `Create a ${name} app`);

      const newApp: AppSchema = {
        id: generateId(),
        name: name.trim(),
        description: parsed.description || `A ${name.trim()} micro-app`,
        prompt,
        fields: parsed.fields,
        logicNodes: [],
        layout: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: 1,
      };

      await appService.createApp(newApp);
      setName('');
      setPrompt('');
      onClose();
      router.push(`/builder?id=${newApp.id}`);
    } catch (err) {
      console.error('Failed to create app:', err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(74,63,53,0.3)] animate-fade-in">
      <div className="mx-4 w-full max-w-md animate-scale-in clay-card overflow-hidden">
        <div className="border-b border-clay-border/30 bg-clay-peach/50 px-6 py-4">
          <h2 className="text-lg font-bold text-foreground">Create New App</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">Describe what you want to build</p>
        </div>
        <div className="space-y-4 p-6">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">App Name</label>
            <input
              placeholder="My Calculator"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="clay-input h-10 w-full text-sm text-foreground"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Prompt (optional)</label>
            <textarea
              placeholder="e.g. A discount calculator with price, discount %, and tax fields..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="clay-input min-h-[100px] w-full px-3 py-2 text-sm text-foreground resize-none"
            />
          </div>
          {templates.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Try an example
              </label>
              <div className="flex flex-wrap gap-1.5">
                {templates.map((tpl) => (
                  <button
                    key={tpl.label}
                    type="button"
                    onClick={() => {
                      setPrompt(tpl.prompt);
                      if (!name.trim()) {
                        // Prefill a sensible app name from the template label
                        setName(tpl.label);
                      }
                    }}
                    className={`clay-sm rounded-full px-3 py-1 text-xs font-medium text-clay-foreground transition-all duration-200 hover:scale-105 hover:shadow-[3px_3px_8px_var(--clay-shadow-dark),-3px_-3px_8px_var(--clay-shadow-light)] ${tpl.bgClass}`}
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={onClose}
              disabled={creating}
              className="clay-button flex-1 h-10 text-sm font-medium text-foreground bg-clay-emboss disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!name.trim() || creating}
              className="clay-button flex-1 h-10 flex items-center justify-center gap-2 text-sm font-medium text-foreground bg-clay-purple disabled:opacity-60"
            >
              <Sparkles className="h-4 w-4" />
              {creating ? 'Creating...' : 'Generate'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
