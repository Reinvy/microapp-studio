'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-3 py-0.5 text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 shadow-[4px_4px_8px_var(--clay-shadow-dark),-4px_-4px_8px_var(--clay-shadow-light)]',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-[#D5B8F5] text-clay-foreground hover:bg-[#D5B8F5]/80',
        secondary:
          'border-transparent bg-[#C5E8F7] text-clay-foreground hover:bg-[#C5E8F7]/80',
        destructive:
          'border-transparent bg-[#FFD0D0] text-clay-foreground hover:bg-[#FFD0D0]/80',
        outline: 'text-clay-foreground bg-transparent border-2 border-[#E8E0D8] shadow-none',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
