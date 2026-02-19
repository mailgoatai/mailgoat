import * as React from 'react';
import { cn } from '../../lib/utils';

type TabsContextType = {
  value: string;
  setValue: (value: string) => void;
};

const TabsContext = React.createContext<TabsContextType | null>(null);

function useTabsContext() {
  const context = React.useContext(TabsContext);
  if (!context) throw new Error('Tabs components must be wrapped in Tabs');
  return context;
}

export function Tabs({ defaultValue, children }: { defaultValue: string; children: React.ReactNode }) {
  const [value, setValue] = React.useState(defaultValue);
  return <TabsContext.Provider value={{ value, setValue }}>{children}</TabsContext.Provider>;
}

export function TabsList({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('inline-flex h-10 items-center rounded-md bg-slate-900 p-1', className)} {...props} />;
}

export function TabsTrigger({ value, className, children }: { value: string; className?: string; children: React.ReactNode }) {
  const { value: current, setValue } = useTabsContext();
  return (
    <button
      className={cn('rounded-sm px-3 py-1.5 text-sm', current === value ? 'bg-slate-700 text-white' : 'text-slate-400', className)}
      onClick={() => setValue(value)}
      role="tab"
      aria-selected={current === value}
      type="button"
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, children }: { value: string; children: React.ReactNode }) {
  const { value: current } = useTabsContext();
  if (value !== current) return null;
  return <div className="mt-4">{children}</div>;
}
