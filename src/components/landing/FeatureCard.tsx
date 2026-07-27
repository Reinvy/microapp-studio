'use client';

import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  gradient?: string;
}

const pastelBgColors = [
  'bg-[#FFD5E5]',
  'bg-[#C5E8F7]',
  'bg-[#D5B8F5]',
  'bg-[#FFF2C5]',
  'bg-[#C5F0D5]',
  'bg-[#FFE5D0]',
];

export default function FeatureCard({
  icon: Icon,
  title,
  description,
  gradient = 'from-indigo-500 to-purple-500',
}: FeatureCardProps) {
  // Pick a pastel bg color based on title hash
  const bgIndex = title.length % pastelBgColors.length;
  const pastelBg = pastelBgColors[bgIndex];

  return (
    <div className="group relative rounded-2xl bg-[var(--clay-card)] p-6 shadow-[8px_8px_16px_var(--clay-shadow-dark),-6px_-6px_14px_var(--clay-shadow-light)] transition-all duration-300 hover:shadow-[6px_6px_12px_var(--clay-shadow-dark),-4px_-4px_10px_var(--clay-shadow-light)] hover:-translate-y-1">
      {/* Pastel accent top bar */}
      <div className={cn('absolute top-0 left-4 right-4 h-1.5 rounded-full', pastelBg)} />

      {/* Clay icon circle */}
      <div
        className={cn(
          'mb-4 mt-2 flex h-14 w-14 items-center justify-center rounded-2xl text-[#5D4E37] shadow-[5px_5px_10px_var(--clay-shadow-dark),-5px_-5px_10px_var(--clay-shadow-light)]',
          pastelBg
        )}
      >
        <Icon className="h-7 w-7" />
      </div>

      <h3 className="mb-2 text-base font-semibold tracking-tight text-[#5D4E37]">
        {title}
      </h3>

      <p className="text-sm leading-relaxed text-[#B8A898]">
        {description}
      </p>
    </div>
  );
}
