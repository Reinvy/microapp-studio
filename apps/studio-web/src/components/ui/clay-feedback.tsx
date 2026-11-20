'use client';

import { Loader2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Shared clay-styled feedback states (loading / error) for full-page
 * async views (builder, runner, …). Extracted so every page renders the
 * same clay loading pill and clay error card instead of duplicating markup.
 */

interface ClayLoaderProps {
  label: string;
  className?: string;
}

export function ClayLoader({ label, className }: ClayLoaderProps) {
  return (
    <div className={cn('min-h-screen bg-clay-cream flex items-center justify-center', className)}>
      <div className="flex flex-col items-center gap-3 clay-sm p-6">
        <Loader2 className="h-8 w-8 animate-spin text-clay-purple" />
        <p className="text-sm text-clay-muted">{label}</p>
      </div>
    </div>
  );
}

interface ClayErrorCardProps {
  title: string;
  message: string;
  actions?: React.ReactNode;
}

export function ClayErrorCard({ title, message, actions }: ClayErrorCardProps) {
  return (
    <div className="min-h-screen bg-clay-cream flex items-center justify-center">
      <div className="text-center max-w-sm clay p-8">
        <div className="w-16 h-16 rounded-2xl bg-clay-rose flex items-center justify-center mx-auto mb-4 shadow-[inset_4px_4px_8px_var(--clay-shadow-dark),inset_-4px_-4px_8px_var(--clay-shadow-light)]">
          <AlertTriangle className="h-8 w-8 text-foreground" />
        </div>
        <h2 className="text-lg font-semibold mb-2 text-foreground">{title}</h2>
        <p className="text-sm mb-6 text-clay-muted">{message}</p>
        {actions && (
          <div className="flex items-center justify-center gap-2">{actions}</div>
        )}
      </div>
    </div>
  );
}
