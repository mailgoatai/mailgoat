import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Activity, Shield, Clock3, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

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

export function DashboardView() {
  const [status, setStatus] = useState<StatusPayload['data'] | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchStatus(silent = false) {
    try {
      const response = await fetch('/api/admin/status', { credentials: 'include' });
      const payload = (await response.json()) as StatusPayload;

      if (!response.ok || !payload.ok || !payload.data) {
        throw new Error(payload.error?.message || 'Unable to load status');
      }

      setStatus(payload.data);
    } catch (error) {
      if (!silent) {
        toast.error(error instanceof Error ? error.message : 'Status request failed');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchStatus(true);
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => fetchStatus(true), 30000);
    return () => clearInterval(interval);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      {/* Header */}
      <div className="rounded-xl border border-border bg-card/80 backdrop-blur p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide text-muted-foreground">
              MailGoat Administration
            </p>
            <h1 className="text-2xl font-semibold mt-1">System Control Center</h1>
          </div>
          <Badge variant="default">Secure Session</Badge>
        </div>
      </div>

      {/* Status Cards */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

      {/* Info Cards */}
      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
            <CardDescription>Login controls and rate-limit policy</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
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
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Checked at:{' '}
              {status?.checkedAt ? new Date(status.checkedAt).toLocaleString() : '-'}
            </p>
            <p>Dashboard connectivity: Active</p>
            <Button variant="outline" onClick={() => void fetchStatus()}>
              Refresh Status
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
