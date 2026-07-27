'use client';

import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StepCardProps {
  number: number;
  icon: LucideIcon;
  title: string;
  description: string;
  isLast?: boolean;
}

export default function StepCard({
  number,
  icon: Icon,
  title,
  description,
  isLast = false,
}: StepCardProps) {
  return (
    <div className="relative flex flex-col items-center text-center">
      {/* Connecting line */}
      {!isLast && (
        <div className="absolute left-1/2 top-14 hidden h-24 w-px bg-gradient-to-b from-primary/30 to-transparent md:block" />
      )}

      {/* Number badge */}
      <div className="relative mb-5">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-purple-500 text-white shadow-md">
          <Icon className="h-6 w-6" />
        </div>
        <div className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-[11px] font-bold text-white shadow-sm">
          {number}
        </div>
      </div>

      <h3 className="mb-2 text-lg font-semibold tracking-tight text-foreground">
        {title}
      </h3>

      <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  );
}
