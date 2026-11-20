'use client';

import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { pastelBgClasses } from '@/lib/claymorphism';

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export default function FeatureCard({
  icon: Icon,
  title,
  description,
}: FeatureCardProps) {
  // Pick a pastel bg color based on title hash
  const bgIndex = title.length % pastelBgClasses.length;
  const pastelBg = pastelBgClasses[bgIndex];

  return (
    <div className="group relative rounded-3xl bg-[var(--clay-card)] p-6 shadow-[8px_8px_16px_var(--clay-shadow-dark),-6px_-6px_14px_var(--clay-shadow-light)] transition-all duration-300 hover:shadow-[6px_6px_12px_var(--clay-shadow-dark),-4px_-4px_10px_var(--clay-shadow-light)] hover:-translate-y-1">
      {/* Pastel accent top bar */}
      <div className={cn('absolute top-0 left-4 right-4 h-1.5 rounded-full', pastelBg)} />

      {/* Clay icon circle */}
      <div
        className={cn(
          'mb-4 mt-2 flex h-14 w-14 items-center justify-center rounded-2xl text-foreground shadow-[5px_5px_10px_var(--clay-shadow-dark),-5px_-5px_10px_var(--clay-shadow-light)]',
          pastelBg
        )}
      >
        <Icon className="h-7 w-7" />
      </div>

      <h3 className="mb-2 text-base font-semibold tracking-tight text-foreground">
        {title}
      </h3>

      <p className="text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  );
}
