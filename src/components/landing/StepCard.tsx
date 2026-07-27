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

const stepColors = ['#FFD5E5', '#C5E8F7', '#D5B8F5'];

export default function StepCard({
  number,
  icon: Icon,
  title,
  description,
  isLast = false,
}: StepCardProps) {
  const bgColor = stepColors[(number - 1) % stepColors.length];

  return (
    <div className="relative flex flex-col items-center text-center">
      {/* Connecting line */}
      {!isLast && (
        <div className="absolute left-1/2 top-[4.5rem] hidden h-20 w-1 rounded-full bg-gradient-to-b from-[#D5B8F5]/50 to-transparent md:block shadow-[inset_1px_1px_2px_var(--clay-shadow-dark)]" />
      )}

      {/* Step number in clay circle */}
      <div className="relative mb-5">
        <div
          className={cn(
            'flex h-16 w-16 items-center justify-center rounded-3xl text-[#5D4E37] shadow-[6px_6px_12px_var(--clay-shadow-dark),-6px_-6px_12px_var(--clay-shadow-light)]',
          )}
          style={{ backgroundColor: bgColor }}
        >
          <Icon className="h-7 w-7" />
        </div>
        <div className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-2xl bg-[#FFF2C5] text-sm font-bold text-[#5D4E37] shadow-[3px_3px_6px_var(--clay-shadow-dark),-3px_-3px_6px_var(--clay-shadow-light)]">
          {number}
        </div>
      </div>

      <h3 className="mb-2 text-lg font-semibold tracking-tight text-[#5D4E37]">
        {title}
      </h3>

      <p className="max-w-xs text-sm leading-relaxed text-[#B8A898]">
        {description}
      </p>
    </div>
  );
}
