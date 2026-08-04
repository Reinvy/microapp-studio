'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-[18px] bg-[#F5EDE5] px-3 py-1 text-sm shadow-[inset_3px_3px_7px_var(--clay-shadow-dark),inset_-3px_-3px_7px_var(--clay-shadow-light)] transition-all file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-clay-foreground placeholder:text-clay-muted focus-visible:outline-none focus-visible:shadow-[inset_4px_4px_8px_var(--clay-shadow-dark),inset_-4px_-4px_8px_var(--clay-shadow-light)] disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
