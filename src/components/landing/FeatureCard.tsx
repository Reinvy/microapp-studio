'use client';

import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  gradient?: string;
}

export default function FeatureCard({
  icon: Icon,
  title,
  description,
  gradient = 'from-indigo-500 to-purple-500',
}: FeatureCardProps) {
  return (
    <div className="group relative rounded-2xl border border-border/60 bg-card p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-elevated">
      {/* Gradient icon container */}
      <div
        className={cn(
          'mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm',
          gradient
        )}
      >
        <Icon className="h-6 w-6" />
      </div>

      <h3 className="mb-2 text-base font-semibold tracking-tight text-foreground">
        {title}
      </h3>

      <p className="text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>

      {/* Subtle gradient border on hover */}
      <div className="absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none">
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
      </div>
    </div>
  );
}
