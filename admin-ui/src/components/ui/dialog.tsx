import * as React from 'react';
import { cn } from '../../lib/utils';

type DialogContextType = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const DialogContext = React.createContext<DialogContextType | null>(null);

export function Dialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  return <DialogContext.Provider value={{ open, setOpen }}>{children}</DialogContext.Provider>;
}

export function DialogTrigger({ children }: { children: React.ReactNode }) {
  const context = React.useContext(DialogContext);
  if (!context) throw new Error('DialogTrigger must be inside Dialog');

  return <div onClick={() => context.setOpen(true)}>{children}</div>;
}

export function DialogContent({ children, className }: { children: React.ReactNode; className?: string }) {
  const context = React.useContext(DialogContext);
  if (!context?.open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" role="dialog" aria-modal="true">
      <div className={cn('w-full max-w-lg rounded-lg border border-slate-700 bg-slate-950 p-6', className)}>
        {children}
      </div>
      <button className="absolute right-4 top-4 text-white" onClick={() => context.setOpen(false)} type="button" aria-label="Close dialog">
        Close
      </button>
    </div>
  );
}

export function DialogHeader({ children }: { children: React.ReactNode }) {
  return <div className="mb-3 space-y-1">{children}</div>;
}

export function DialogTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-semibold">{children}</h2>;
}

export function DialogDescription({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-slate-400">{children}</p>;
}
