import * as React from 'react';
import { cn } from '../../lib/utils';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      className={cn(
        'flex h-10 w-full rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
Input.displayName = 'Input';
