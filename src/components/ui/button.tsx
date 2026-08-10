'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 clay-button",
  {
    variants: {
      variant: {
        default:
          'bg-[#FFD5E5] text-clay-foreground hover:bg-[#FFD5E5]/90',
        destructive:
          'bg-[#FFD0D0] text-clay-foreground hover:bg-[#FFD0D0]/90',
        outline:
          'bg-transparent border-2 border-[#E8E0D8] text-clay-foreground shadow-[5px_5px_10px_var(--clay-shadow-dark),-5px_-5px_10px_var(--clay-shadow-light)] hover:bg-[#F5EDE5]',
        secondary:
          'bg-[#C5E8F7] text-clay-foreground hover:bg-[#C5E8F7]/90',
        primary:
          'bg-[#D5B8F5] text-clay-foreground hover:bg-[#D5B8F5]/90',
        ghost: 'bg-transparent text-clay-foreground hover:shadow-[inset_4px_4px_8px_var(--clay-shadow-dark),inset_-4px_-4px_8px_var(--clay-shadow-light)] hover:bg-[#F5EDE5]',
        link: 'text-clay-foreground underline-offset-4 hover:underline bg-transparent shadow-none hover:shadow-none',
      },
      size: {
        default: 'h-10 px-5 py-2',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-12 rounded-2xl px-7',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
