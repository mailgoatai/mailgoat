import { FormEvent, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Sidebar } from './components/sidebar';
import { DashboardView } from './views/dashboard-view';
import { InboxesView } from './views/inboxes-view';
import { AnalyticsView } from './views/analytics-view';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';

type StatusPayload = {
  ok: boolean;
  data?: {
    service: string;
    version: string;
    uptimeSeconds: number;
    checkedAt: string;
    environment: string;
    rateLimit: { maxAttemptsPerHour: number; windowSeconds: number };
  };
  error?: { code: string; message: string; details?: unknown };
};

export function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [currentView, setCurrentView] = useState('dashboard');

  async function checkAuth(silent = false) {
    try {
      const response = await fetch('/api/admin/status', { credentials: 'include' });
      const payload = (await response.json()) as StatusPayload;

      if (response.status === 401) {
        setIsAuthenticated(false);
        return;
      }

      if (!response.ok || !payload.ok || !payload.data) {
        throw new Error(payload.error?.message || 'Unable to load status');
      }

      setIsAuthenticated(true);
    } catch (error) {
      if (!silent) {
        toast.error(error instanceof Error ? error.message : 'Authentication check failed');
      }
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void checkAuth(true);
  }, []);

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    try {
      const response = await fetch('/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password }),
      });

      const payload = (await response.json()) as StatusPayload;
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error?.message || 'Login failed');
      }

      toast.success('Logged in successfully');
      setPassword('');
      setIsAuthenticated(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Login failed');
    }
  }

  async function handleLogout() {
    try {
      const response = await fetch('/admin/logout', {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Logout failed');
      setIsAuthenticated(false);
      setCurrentView('dashboard');
      toast.success('Logged out successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Logout failed');
    }
  }

  function renderView() {
    switch (currentView) {
      case 'inboxes':
        return <InboxesView />;
      case 'analytics':
        return <AnalyticsView />;
      case 'dashboard':
      default:
        return <DashboardView />;
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Loading Admin Panel</CardTitle>
            <CardDescription>Checking active session and system status...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-10 bg-background">
        <Card className="w-full max-w-md border-border">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-3xl">🐐</span>
              <div>
                <CardTitle className="text-2xl">MailGoat Admin</CardTitle>
                <CardDescription className="mt-1">
                  Secure sign-in. Max 5 attempts per hour.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4" aria-label="Login form">
              <label className="space-y-2 block">
                <span className="text-sm text-muted-foreground">Admin password</span>
                <Input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter password"
                  required
                  aria-label="Admin password"
                />
              </label>
              <Button type="submit" className="w-full">
                Sign in
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        onLogout={handleLogout}
      />
      <main className="flex-1 overflow-hidden">
        {renderView()}
      </main>
    </div>
  );
}
