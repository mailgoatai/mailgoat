import { Home, Inbox, BarChart3, Settings, LogOut } from 'lucide-react';
import { cn } from '../lib/utils';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  onLogout: () => void;
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'inboxes', label: 'Inboxes', icon: Inbox },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
];

export function Sidebar({ currentView, onViewChange, onLogout }: SidebarProps) {
  return (
    <aside className="w-64 border-r border-border bg-card/50 backdrop-blur-sm flex flex-col">
      {/* Logo/Header */}
      <div className="p-6 border-b border-border">
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <span className="text-2xl">🐐</span>
          <span>MailGoat</span>
        </h1>
        <p className="text-xs text-muted-foreground mt-1">Admin Panel</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}
