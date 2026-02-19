import { FormEvent, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Shield,
  Activity,
  LogOut,
  Clock3,
  AlertTriangle,
  CheckCircle2,
  ArrowLeft,
  Mail,
  Inbox,
  Paperclip,
} from 'lucide-react';
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

type AdminMessage = {
  id: string;
  from: string;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  date: string;
  read: boolean;
  preview: string;
  body: { text: string; html: string | null };
  attachments: Array<{ filename: string; size: number; contentType: string }>;
};

type InboxMessagesPayload = {
  ok: boolean;
  data?: {
    inboxId: string;
    messages: AdminMessage[];
  };
  error?: { code: string; message: string; details?: unknown };
};

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

function formatDateTime(isoValue: string): string {
  const parsed = new Date(isoValue);
  if (Number.isNaN(parsed.getTime())) {
    return '-';
  }
  return parsed.toLocaleString();
}

function formatFileSize(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function parseInboxIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/admin\/inbox\/(.+)$/);
  if (!match) {
    return null;
  }
  return decodeURIComponent(match[1]);
}

function goToAdminHome() {
  window.history.pushState({}, '', '/admin');
}

function goToInboxRoute(inboxId: string) {
  window.history.pushState({}, '', `/admin/inbox/${encodeURIComponent(inboxId)}`);
}

function EmailListItem({
  email,
  selected,
  onSelect,
}: {
  email: AdminMessage;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full border-b border-border p-4 text-left transition-colors ${
        selected ? 'bg-cyan-950/30' : 'hover:bg-slate-900/60'
      }`}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="truncate text-sm font-medium text-slate-100">{email.from || '(unknown sender)'}</p>
        <Badge variant={email.read ? 'outline' : 'default'}>{email.read ? 'Read' : 'Unread'}</Badge>
      </div>
      <p className="truncate text-sm text-slate-200">{email.subject || '(no subject)'}</p>
      <p className="mt-1 line-clamp-2 text-xs text-slate-400">{email.preview || '(no preview available)'}</p>
      <p className="mt-2 text-xs text-slate-500">{formatDateTime(email.date)}</p>
    </button>
  );
}

function EmailContent({ email }: { email: AdminMessage }) {
  return (
    <div className="space-y-5">
      <div className="space-y-2 rounded-lg border border-border bg-slate-950/40 p-4">
        <h2 className="text-xl font-semibold text-slate-100">{email.subject || '(no subject)'}</h2>
        <div className="space-y-1 text-sm text-slate-300">
          <p>
            <span className="text-slate-400">From:</span> {email.from || '-'}
          </p>
          <p>
            <span className="text-slate-400">To:</span> {email.to.length > 0 ? email.to.join(', ') : '-'}
          </p>
          <p>
            <span className="text-slate-400">CC:</span> {email.cc.length > 0 ? email.cc.join(', ') : '-'}
          </p>
          <p>
            <span className="text-slate-400">BCC:</span> {email.bcc.length > 0 ? email.bcc.join(', ') : '-'}
          </p>
          <p>
            <span className="text-slate-400">Date:</span> {formatDateTime(email.date)}
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-slate-950/40 p-4">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Body</h3>
        {email.body.html ? (
          <div
            className="prose prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: email.body.html }}
          />
        ) : (
          <pre className="whitespace-pre-wrap break-words text-sm text-slate-200">
            {email.body.text || '(no body available)'}
          </pre>
        )}
      </div>

      <div className="rounded-lg border border-border bg-slate-950/40 p-4">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Attachments</h3>
        {email.attachments.length === 0 ? (
          <p className="text-sm text-slate-400">No attachments</p>
        ) : (
          <ul className="space-y-2">
            {email.attachments.map((attachment) => (
              <li key={`${attachment.filename}-${attachment.size}`} className="flex items-center gap-2 text-sm text-slate-200">
                <Paperclip className="h-4 w-4 text-slate-400" />
                <span>{attachment.filename}</span>
                <span className="text-slate-500">({attachment.contentType}, {formatFileSize(attachment.size)})</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function InboxDetail({ inboxId, onBack }: { inboxId: string; onBack: () => void }) {
  const [emails, setEmails] = useState<AdminMessage[]>([]);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function fetchInboxMessages() {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/admin/inbox/${encodeURIComponent(inboxId)}/messages`, {
          credentials: 'include',
        });
        const payload = (await response.json()) as InboxMessagesPayload;
        if (!response.ok || !payload.ok || !payload.data) {
          throw new Error(payload.error?.message || 'Failed to fetch inbox messages');
        }
        if (!active) return;
        setEmails(payload.data.messages);
        setSelectedEmailId(payload.data.messages[0]?.id || null);
      } catch (error) {
        if (!active) return;
        toast.error(error instanceof Error ? error.message : 'Failed to load inbox');
        setEmails([]);
        setSelectedEmailId(null);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void fetchInboxMessages();
    return () => {
      active = false;
    };
  }, [inboxId]);

  const selectedEmail = emails.find((email) => email.id === selectedEmailId) || null;

  return (
    <main className="min-h-screen px-4 py-6 md:px-8">
      <div className="mx-auto max-w-7xl space-y-4">
        <header className="flex flex-col gap-3 rounded-xl border border-border bg-card/80 p-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-slate-400">Inbox Detail</p>
            <h1 className="text-xl font-semibold text-slate-100">Inbox: {inboxId}</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to dashboard
            </Button>
          </div>
        </header>

        <section className="grid h-[calc(100vh-11rem)] gap-4 md:grid-cols-3">
          <Card className="overflow-hidden md:col-span-1">
            <CardHeader className="border-b border-border p-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <Inbox className="h-4 w-4 text-primary" /> Emails ({emails.length})
              </CardTitle>
            </CardHeader>
            <div className="h-full overflow-y-auto">
              {isLoading ? (
                <p className="p-4 text-sm text-slate-400">Loading inbox messages...</p>
              ) : emails.length === 0 ? (
                <p className="p-4 text-sm text-slate-400">No messages found for this inbox.</p>
              ) : (
                emails.map((email) => (
                  <EmailListItem
                    key={email.id}
                    email={email}
                    selected={selectedEmailId === email.id}
                    onSelect={() => setSelectedEmailId(email.id)}
                  />
                ))
              )}
            </div>
          </Card>

          <Card className="overflow-hidden md:col-span-2">
            <CardHeader className="border-b border-border p-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <Mail className="h-4 w-4 text-primary" /> Message Content
              </CardTitle>
            </CardHeader>
            <CardContent className="h-full overflow-y-auto p-4">
              {selectedEmail ? (
                <EmailContent email={selectedEmail} />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-slate-400">
                  Select an email to view its content.
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}

function Dashboard({
  status,
  onLogout,
  onRefreshStatus,
  onOpenInbox,
}: {
  status: StatusPayload['data'];
  onLogout: () => void;
  onRefreshStatus: () => Promise<void>;
  onOpenInbox: (inboxId: string) => void;
}) {
  const [inboxInput, setInboxInput] = useState('');

  const statusCards = useMemo(
    () => [
      {
        label: 'Service',
        value: status.service || 'mailgoat',
        icon: Shield,
      },
      {
        label: 'Version',
        value: status.version || '-',
        icon: Activity,
      },
      {
        label: 'Uptime',
        value: formatDuration(status.uptimeSeconds),
        icon: Clock3,
      },
      {
        label: 'Environment',
        value: status.environment || '-',
        icon: status.environment === 'production' ? CheckCircle2 : AlertTriangle,
      },
    ],
    [status]
  );

  function handleOpenInbox(event: FormEvent) {
    event.preventDefault();
    const inboxId = inboxInput.trim();
    if (!inboxId) {
      toast.error('Enter an inbox id or email address');
      return;
    }
    onOpenInbox(inboxId);
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
            <Button variant="outline" onClick={onLogout}>
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
              <p>Maximum attempts/hour: {status.rateLimit.maxAttemptsPerHour}</p>
              <p>Rate-limit window: {status.rateLimit.windowSeconds} seconds</p>
              <p>Session cookies are HTTP-only and scoped to this server.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Operational Status</CardTitle>
              <CardDescription>Current API and service heartbeat</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-300">
              <p>Checked at: {new Date(status.checkedAt).toLocaleString()}</p>
              <p>Dashboard connectivity: Active</p>
              <Button variant="outline" onClick={() => void onRefreshStatus()}>
                Refresh Status
              </Button>
            </CardContent>
          </Card>
        </section>

        <section>
          <Card>
            <CardHeader>
              <CardTitle>Inbox Inspector</CardTitle>
              <CardDescription>Open an inbox detail page to inspect message traffic.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleOpenInbox} className="flex flex-col gap-3 sm:flex-row">
                <Input
                  value={inboxInput}
                  onChange={(event) => setInboxInput(event.target.value)}
                  placeholder="Inbox id or email address (example: qa@example.com)"
                  aria-label="Inbox id"
                />
                <Button type="submit">Open Inbox</Button>
              </form>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}

export function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<StatusPayload['data'] | null>(null);
  const [inboxId, setInboxId] = useState<string | null>(() => parseInboxIdFromPath(window.location.pathname));

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
    const onPopState = () => setInboxId(parseInboxIdFromPath(window.location.pathname));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
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
      setInboxId(null);
      goToAdminHome();
      toast.success('Logged out');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Logout failed');
    }
  }

  function handleOpenInbox(targetInboxId: string) {
    goToInboxRoute(targetInboxId);
    setInboxId(targetInboxId);
  }

  function handleBackFromInbox() {
    goToAdminHome();
    setInboxId(null);
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
              <label className="block space-y-2">
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
              <Button type="submit" className="w-full">
                Sign in
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!status) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Status unavailable</CardTitle>
            <CardDescription>Unable to load admin status payload.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => void fetchStatus()}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (inboxId) {
    return <InboxDetail inboxId={inboxId} onBack={handleBackFromInbox} />;
  }

  return (
    <Dashboard
      status={status}
      onLogout={handleLogout}
      onRefreshStatus={async () => fetchStatus()}
      onOpenInbox={handleOpenInbox}
    />
  );
}
