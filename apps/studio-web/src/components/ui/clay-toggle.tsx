'use client';

import { cn } from '@/lib/utils';

interface ClayToggleProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Pastel bg class for the checked (on) state — default clay pink. */
  activeClass?: string;
}

/**
 * Reusable clay switch (toggle) — carved clay track with a raised knob.
 *
 * Extracted from the PropertiesPanel's duplicated Required / Default Value /
 * Show Border toggles so every switch in the app renders identical clay
 * markup: pressed/cekung track (clay-sm inner shadow) + raised knob that
 * slides with the spring transition. Renders `role="switch"` so it is
 * announced correctly by screen readers without extra wiring.
 */
export function ClayToggle({
  checked,
  onChange,
  activeClass = 'bg-clay-pink',
  className,
  type = 'button',
  ...rest
}: ClayToggleProps) {
  return (
    <button
      type={type}
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 clay-sm',
        checked ? activeClass : 'bg-clay-cream',
        className
      )}
      {...rest}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 rounded-full bg-white shadow-[3px_3px_6px_var(--clay-shadow-dark),-3px_-3px_6px_var(--clay-shadow-light)] transition-transform',
          checked ? 'translate-x-[18px]' : 'translate-x-[2px]'
        )}
      />
    </button>
  );
}
