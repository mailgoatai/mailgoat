import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
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

type InboxSummary = {
  id: string;
  address: string;
  name: string;
  messageCount: number;
  lastMessageAt: string | null;
};

type InboxesPayload = {
  ok: boolean;
  data?: {
    inboxes: InboxSummary[];
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

function isInboxesPath(pathname: string): boolean {
  return pathname === '/admin/inboxes';
}

function goToAdminHome() {
  window.history.pushState({}, '', '/admin');
}

function goToInboxesRoute() {
  window.history.pushState({}, '', '/admin/inboxes');
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
  onOpenInboxes,
}: {
  status: StatusPayload['data'];
  onLogout: () => void;
  onRefreshStatus: () => Promise<void>;
  onOpenInboxes: () => void;
}) {
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
              <CardTitle>Inboxes</CardTitle>
              <CardDescription>Browse real inboxes and message counts from Postal data.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={onOpenInboxes}>
                <Inbox className="mr-2 h-4 w-4" />
                Open Inboxes
              </Button>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}

function InboxesPage({
  onBack,
  onOpenInbox,
}: {
  onBack: () => void;
  onOpenInbox: (inboxId: string) => void;
}) {
  const [inboxes, setInboxes] = useState<InboxSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function fetchInboxes() {
      setIsLoading(true);
      try {
        const response = await fetch('/api/admin/inboxes', { credentials: 'include' });
        const payload = (await response.json()) as InboxesPayload;
        if (!response.ok || !payload.ok || !payload.data) {
          throw new Error(payload.error?.message || 'Failed to fetch inboxes');
        }
        if (!active) return;
        setInboxes(payload.data.inboxes);
      } catch (error) {
        if (!active) return;
        toast.error(error instanceof Error ? error.message : 'Failed to load inboxes');
        setInboxes([]);
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void fetchInboxes();
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="min-h-screen px-4 py-6 md:px-8">
      <div className="mx-auto max-w-7xl space-y-4">
        <header className="flex flex-col gap-3 rounded-xl border border-border bg-card/80 p-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-slate-400">Admin</p>
            <h1 className="text-xl font-semibold text-slate-100">Inboxes</h1>
          </div>
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to dashboard
          </Button>
        </header>

        {isLoading ? (
          <Card>
            <CardContent className="p-4 text-sm text-slate-400">Loading inboxes...</CardContent>
          </Card>
        ) : inboxes.length === 0 ? (
          <Card>
            <CardContent className="p-4 text-sm text-slate-400">
              No inboxes found. Send or receive messages first.
            </CardContent>
          </Card>
        ) : (
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {inboxes.map((inbox) => (
              <button
                key={inbox.id}
                type="button"
                onClick={() => onOpenInbox(inbox.address)}
                className="rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-cyan-700/60 hover:bg-slate-900/70"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-slate-100">{inbox.name || inbox.address}</p>
                  <Badge>{inbox.messageCount} msgs</Badge>
                </div>
                <p className="truncate text-sm text-slate-300">{inbox.address}</p>
                <p className="mt-2 text-xs text-slate-500">
                  Last message: {inbox.lastMessageAt ? formatDateTime(inbox.lastMessageAt) : 'N/A'}
                </p>
              </button>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}

function AdminLayout({
  active,
  onOpenDashboard,
  onOpenInboxes,
  onLogout,
  children,
}: {
  active: 'dashboard' | 'inboxes' | 'detail';
  onOpenDashboard: () => void;
  onOpenInboxes: () => void;
  onLogout: () => void;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen md:flex">
      <aside className="border-b border-border bg-slate-950/60 p-4 md:min-h-screen md:w-64 md:border-b-0 md:border-r">
        <div className="mb-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">MailGoat Admin</p>
        </div>
        <nav className="space-y-2">
          <Button
            variant={active === 'dashboard' ? 'default' : 'outline'}
            className="w-full justify-start"
            onClick={onOpenDashboard}
          >
            Dashboard
          </Button>
          <Button
            variant={active === 'inboxes' || active === 'detail' ? 'default' : 'outline'}
            className="w-full justify-start"
            onClick={onOpenInboxes}
          >
            Inboxes
          </Button>
        </nav>
        <div className="mt-4">
          <Button variant="outline" className="w-full justify-start" onClick={onLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </aside>
      <div className="flex-1">{children}</div>
    </div>
  );
}

export function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<StatusPayload['data'] | null>(null);
  const [inboxId, setInboxId] = useState<string | null>(() => parseInboxIdFromPath(window.location.pathname));
  const [isInboxesView, setIsInboxesView] = useState<boolean>(() =>
    isInboxesPath(window.location.pathname)
  );

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
    const onPopState = () => {
      setInboxId(parseInboxIdFromPath(window.location.pathname));
      setIsInboxesView(isInboxesPath(window.location.pathname));
    };
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
      setIsInboxesView(false);
      goToAdminHome();
      toast.success('Logged out');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Logout failed');
    }
  }

  function handleOpenInbox(targetInboxId: string) {
    goToInboxRoute(targetInboxId);
    setInboxId(targetInboxId);
    setIsInboxesView(false);
  }

  function handleBackFromInbox() {
    goToInboxesRoute();
    setInboxId(null);
    setIsInboxesView(true);
  }

  function handleOpenInboxes() {
    goToInboxesRoute();
    setInboxId(null);
    setIsInboxesView(true);
  }

  function handleBackFromInboxes() {
    goToAdminHome();
    setInboxId(null);
    setIsInboxesView(false);
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
    return (
      <AdminLayout
        active="detail"
        onOpenDashboard={handleBackFromInboxes}
        onOpenInboxes={handleOpenInboxes}
        onLogout={handleLogout}
      >
        <InboxDetail inboxId={inboxId} onBack={handleBackFromInbox} />
      </AdminLayout>
    );
  }

  if (isInboxesView) {
    return (
      <AdminLayout
        active="inboxes"
        onOpenDashboard={handleBackFromInboxes}
        onOpenInboxes={handleOpenInboxes}
        onLogout={handleLogout}
      >
        <InboxesPage onBack={handleBackFromInboxes} onOpenInbox={handleOpenInbox} />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      active="dashboard"
      onOpenDashboard={handleBackFromInboxes}
      onOpenInboxes={handleOpenInboxes}
      onLogout={handleLogout}
    >
      <Dashboard
        status={status}
        onLogout={handleLogout}
        onRefreshStatus={async () => fetchStatus()}
        onOpenInboxes={handleOpenInboxes}
      />
    </AdminLayout>
  );
}
