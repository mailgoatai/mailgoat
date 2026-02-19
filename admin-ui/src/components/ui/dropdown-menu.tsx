import * as React from 'react';
import { cn } from '../../lib/utils';

type DropdownContextType = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const DropdownContext = React.createContext<DropdownContextType | null>(null);

export function DropdownMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  return <DropdownContext.Provider value={{ open, setOpen }}>{children}</DropdownContext.Provider>;
}

export function DropdownMenuTrigger({ children }: { children: React.ReactNode }) {
  const context = React.useContext(DropdownContext);
  if (!context) throw new Error('DropdownMenuTrigger must be inside DropdownMenu');
  return (
    <div onClick={() => context.setOpen(!context.open)} onKeyDown={(e) => e.key === 'Enter' && context.setOpen(!context.open)} role="button" tabIndex={0}>
      {children}
    </div>
  );
}

export function DropdownMenuContent({ className, children }: { className?: string; children: React.ReactNode }) {
  const context = React.useContext(DropdownContext);
  if (!context || !context.open) return null;
  return <div className={cn('absolute right-0 z-20 mt-2 min-w-48 rounded-md border border-slate-800 bg-slate-950 p-1 shadow-lg', className)}>{children}</div>;
}

export function DropdownMenuItem({ className, onClick, children }: { className?: string; onClick?: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      className={cn('w-full rounded-sm px-3 py-2 text-left text-sm hover:bg-slate-800', className)}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
