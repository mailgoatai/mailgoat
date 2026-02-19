import { FormEvent, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Shield, Activity, LogOut, Clock3, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Badge } from './components/ui/badge';
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

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

export function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<StatusPayload['data'] | null>(null);

  async function fetchStatus(silent = false) {
    try {
      const response = await fetch('/api/admin/status', { credentials: 'include' });
      const payload = (await response.json()) as StatusPayload;

      if (response.status === 401) {
        setIsAuthenticated(false);
        setStatus(null);
        return;
      }

      if (!response.ok || !payload.ok || !payload.data) {
        throw new Error(payload.error?.message || 'Unable to load status');
      }

      setIsAuthenticated(true);
      setStatus(payload.data);
    } catch (error) {
      if (!silent) {
        toast.error(error instanceof Error ? error.message : 'Status request failed');
      }
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void fetchStatus(true);
  }, []);

  const statusCards = useMemo(
    () => [
      {
        label: 'Service',
        value: status?.service || 'mailgoat',
        icon: Shield,
      },
      {
        label: 'Version',
        value: status?.version || '-',
        icon: Activity,
      },
      {
        label: 'Uptime',
        value: status ? formatDuration(status.uptimeSeconds) : '-',
        icon: Clock3,
      },
      {
        label: 'Environment',
        value: status?.environment || '-',
        icon: status?.environment === 'production' ? CheckCircle2 : AlertTriangle,
      },
    ],
    [status]
  );

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

      toast.success('Logged in');
      setPassword('');
      await fetchStatus();
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
      setStatus(null);
      toast.success('Logged out');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Logout failed');
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
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
      <main className="flex min-h-screen items-center justify-center px-4 py-10">
        <Card className="w-full max-w-md border-cyan-900/60">
          <CardHeader>
            <CardTitle className="text-2xl">MailGoat Admin</CardTitle>
            <CardDescription>Secure sign-in. Max 5 attempts per hour.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4" aria-label="Login form">
              <label className="space-y-2 block">
                <span className="text-sm text-slate-300">Admin password</span>
                <Input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter password"
                  required
                  aria-label="Admin password"
                />
              </label>
              <Button type="submit" className="w-full">Sign in</Button>
            </form>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-8 md:px-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col gap-4 rounded-xl border border-border bg-card/80 p-6 backdrop-blur md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide text-slate-400">MailGoat Administration</p>
            <h1 className="text-2xl font-semibold">System Control Center</h1>
          </div>
          <div className="flex items-center gap-2">
            <Badge>Secure Session</Badge>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" /> Logout
            </Button>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="System status cards">
          {statusCards.map(({ label, value, icon: Icon }) => (
            <Card key={label}>
              <CardHeader>
                <CardDescription>{label}</CardDescription>
                <CardTitle className="flex items-center justify-between text-lg">
                  {value}
                  <Icon className="h-4 w-4 text-primary" />
                </CardTitle>
              </CardHeader>
            </Card>
          ))}
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Security</CardTitle>
              <CardDescription>Login controls and rate-limit policy</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-300">
              <p>Maximum attempts/hour: {status?.rateLimit.maxAttemptsPerHour ?? '-'}</p>
              <p>Rate-limit window: {status?.rateLimit.windowSeconds ?? '-'} seconds</p>
              <p>Session cookies are HTTP-only and scoped to this server.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Operational Status</CardTitle>
              <CardDescription>Current API and service heartbeat</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-300">
              <p>Checked at: {status?.checkedAt ? new Date(status.checkedAt).toLocaleString() : '-'}</p>
              <p>Dashboard connectivity: Active</p>
              <Button variant="outline" onClick={() => void fetchStatus()}>
                Refresh Status
              </Button>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
