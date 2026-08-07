'use client';

import { cn } from '@/lib/utils';

export interface TabItem {
  key: string;
  label: string;
  icon: React.ReactNode;
}

interface MobileTabBarProps<T extends string> {
  items: TabItem[];
  active: T;
  onChange: (key: T) => void;
}

/**
 * Clay-styled bottom tab bar for mobile (<768px) panel navigation.
 * Fixed to the bottom edge; pair with a spacer of the same height
 * (h-[4.25rem]) so content is never hidden behind it.
 */
export default function MobileTabBar<T extends string>({
  items,
  active,
  onChange,
}: MobileTabBarProps<T>) {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex gap-1 rounded-t-2xl border-t border-clay-border/30 bg-[var(--clay-card)] p-1.5 shadow-[0_-4px_12px_rgba(174,162,146,0.15)]">
      {items.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key as T)}
          className={cn(
            'flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium transition-all rounded-2xl',
            active === tab.key
              ? 'text-foreground bg-clay-cream/80 shadow-[inset_4px_4px_8px_var(--clay-shadow-dark),inset_-4px_-4px_8px_var(--clay-shadow-light)]'
              : 'text-clay-muted hover:text-foreground hover:bg-clay-cream/40 active:scale-95'
          )}
        >
          {tab.icon}
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
