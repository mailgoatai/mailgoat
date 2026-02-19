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
  Bell,
  Volume2,
  Monitor,
  Settings,
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

type AdminActionPayload = {
  ok: boolean;
  data?: {
    deleted?: boolean;
    deletedCount?: number;
    requestedCount?: number;
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

type AdminRealtimeEvent = {
  type: 'new_email' | 'ready' | 'error' | 'heartbeat';
  count?: number;
  totalMessages?: number;
  checkedAt?: string;
  message?: string;
};

type SettingsPayload = {
  ok: boolean;
  data?: {
    postalDbUrl: string | null;
    postalDbUrlRedacted: string | null;
    postalConnectionOk: boolean;
    sessionTimeoutMinutes: number;
  };
  error?: { code: string; message: string; details?: unknown };
};

type ApiKeyRecord = {
  id: string;
  name: string;
  maskedKey: string;
  createdAt: string | null;
  lastUsedAt: string | null;
  status: 'active' | 'revoked';
  permissions: Array<'send' | 'read' | 'admin'>;
};

type ApiKeysPayload = {
  ok: boolean;
  data?: {
    apiKeys: ApiKeyRecord[];
    apiKey?: ApiKeyRecord;
    fullKey?: string;
    warning?: string;
    revoked?: boolean;
    keyId?: string;
  };
  error?: { code: string; message: string; details?: unknown };
};

type ApiKeyUsagePayload = {
  ok: boolean;
  data?: {
    keyId: string;
    totalRequests: number;
    lastUsedAt: string | null;
    requestsPerDay: Array<{ date: string; count: number }>;
    available: boolean;
  };
  error?: { code: string; message: string; details?: unknown };
};

const ADMIN_NOTIFICATION_PREFS_KEY = 'mailgoat.admin.notifications.enabled';
const ADMIN_SOUND_PREFS_KEY = 'mailgoat.admin.notifications.sound';
const ADMIN_DESKTOP_PREFS_KEY = 'mailgoat.admin.notifications.desktop';

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

function loadBooleanPreference(key: string, fallbackValue: boolean): boolean {
  const raw = window.localStorage.getItem(key);
  if (raw === null) {
    return fallbackValue;
  }
  return raw === '1';
}

function saveBooleanPreference(key: string, value: boolean): void {
  window.localStorage.setItem(key, value ? '1' : '0');
}

function playNotificationTone(): void {
  try {
    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = 880;
    gain.gain.value = 0.05;
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    setTimeout(() => {
      oscillator.stop();
      void audioContext.close();
    }, 160);
  } catch {
    // Audio is optional; ignore failures.
  }
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

function isSettingsPath(pathname: string): boolean {
  return pathname === '/admin/settings';
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

function goToSettingsRoute() {
  window.history.pushState({}, '', '/admin/settings');
}

function EmailListItem({
  email,
  selected,
  onSelect,
  multiSelectMode,
  checked,
  onToggleChecked,
}: {
  email: AdminMessage;
  selected: boolean;
  onSelect: () => void;
  multiSelectMode: boolean;
  checked: boolean;
  onToggleChecked: () => void;
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
        <div className="flex items-center gap-2">
          {multiSelectMode ? (
            <input
              type="checkbox"
              checked={checked}
              onChange={(event) => {
                event.stopPropagation();
                onToggleChecked();
              }}
              onClick={(event) => event.stopPropagation()}
              className="h-4 w-4"
              aria-label={`Select email ${email.subject || email.id}`}
            />
          ) : null}
          <Badge className={email.read ? 'border border-border bg-transparent' : ''}>
            {email.read ? 'Read' : 'Unread'}
          </Badge>
        </div>
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
  const [selectedEmailIds, setSelectedEmailIds] = useState<string[]>([]);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  function getDownloadFilename(dispositionHeader: string | null, fallback: string): string {
    if (!dispositionHeader) return fallback;
    const match = dispositionHeader.match(/filename=\"?([^\";]+)\"?/i);
    return match?.[1] || fallback;
  }

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
        setSelectedEmailIds((current) =>
          current.filter((id) => payload.data?.messages.some((message) => message.id === id))
        );
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

  function toggleSelectedEmailId(emailId: string) {
    setSelectedEmailIds((current) =>
      current.includes(emailId) ? current.filter((id) => id !== emailId) : [...current, emailId]
    );
  }

  async function refreshMessagesAfterMutation(preferredSelectedId?: string | null) {
    const response = await fetch(`/api/admin/inbox/${encodeURIComponent(inboxId)}/messages`, {
      credentials: 'include',
    });
    const payload = (await response.json()) as InboxMessagesPayload;
    if (!response.ok || !payload.ok || !payload.data) {
      throw new Error(payload.error?.message || 'Failed to refresh inbox messages');
    }
    const nextMessages = payload.data.messages;
    setEmails(nextMessages);

    const hasPreferred =
      preferredSelectedId && nextMessages.some((message) => message.id === preferredSelectedId);
    setSelectedEmailId(hasPreferred ? preferredSelectedId : nextMessages[0]?.id || null);
    setSelectedEmailIds((current) =>
      current.filter((id) => nextMessages.some((message) => message.id === id))
    );
  }

  async function deleteSingleEmail() {
    if (!selectedEmail) return;
    const confirmed = window.confirm('Delete this email permanently?');
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/email/${encodeURIComponent(selectedEmail.id)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const payload = (await response.json()) as AdminActionPayload;
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error?.message || 'Failed to delete email');
      }
      await refreshMessagesAfterMutation(null);
      setSelectedEmailIds((current) => current.filter((id) => id !== selectedEmail.id));
      toast.success('Email deleted');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete email');
    } finally {
      setIsDeleting(false);
    }
  }

  async function bulkDeleteSelected() {
    if (selectedEmailIds.length === 0) {
      toast.error('Select at least one email');
      return;
    }
    const confirmed = window.confirm(`Delete ${selectedEmailIds.length} selected email(s)?`);
    if (!confirmed) return;

    setIsBulkDeleting(true);
    try {
      const response = await fetch('/api/admin/emails/bulk-delete', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailIds: selectedEmailIds }),
      });
      const payload = (await response.json()) as AdminActionPayload;
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error?.message || 'Failed to delete selected emails');
      }
      await refreshMessagesAfterMutation(selectedEmailId);
      toast.success(`Deleted ${payload.data?.deletedCount ?? selectedEmailIds.length} email(s)`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete selected emails');
    } finally {
      setIsBulkDeleting(false);
    }
  }

  async function exportSelected(format: 'json' | 'csv') {
    if (selectedEmailIds.length === 0) {
      toast.error('Select at least one email');
      return;
    }
    setIsExporting(true);
    try {
      const response = await fetch('/api/admin/emails/export', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailIds: selectedEmailIds, format }),
      });
      if (!response.ok) {
        const maybeError = (await response.json()) as AdminActionPayload;
        throw new Error(maybeError.error?.message || 'Failed to export emails');
      }
      const blob = await response.blob();
      const fallbackName = `mailgoat-export.${format}`;
      const filename = getDownloadFilename(response.headers.get('content-disposition'), fallbackName);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${selectedEmailIds.length} email(s) as ${format.toUpperCase()}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to export emails');
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <main className="min-h-screen px-4 py-6 md:px-8">
      <div className="mx-auto max-w-7xl space-y-4">
        <header className="flex flex-col gap-3 rounded-xl border border-border bg-card/80 p-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-slate-400">Inbox Detail</p>
            <h1 className="text-xl font-semibold text-slate-100">Inbox: {inboxId}</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={multiSelectMode ? 'default' : 'outline'}
              onClick={() => {
                setMultiSelectMode((current) => !current);
                setSelectedEmailIds([]);
              }}
            >
              {multiSelectMode ? 'Exit Select Mode' : 'Select Multiple'}
            </Button>
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to dashboard
            </Button>
          </div>
        </header>

        {multiSelectMode ? (
          <Card>
            <CardContent className="flex flex-wrap items-center gap-2 p-4">
              <span className="text-sm text-slate-300">Selected: {selectedEmailIds.length}</span>
              <Button
                variant="danger"
                onClick={() => void bulkDeleteSelected()}
                disabled={isBulkDeleting || selectedEmailIds.length === 0}
              >
                {isBulkDeleting ? 'Deleting...' : 'Delete Selected'}
              </Button>
              <Button
                variant="outline"
                onClick={() => void exportSelected('json')}
                disabled={isExporting || selectedEmailIds.length === 0}
              >
                Export JSON
              </Button>
              <Button
                variant="outline"
                onClick={() => void exportSelected('csv')}
                disabled={isExporting || selectedEmailIds.length === 0}
              >
                Export CSV
              </Button>
              {isExporting ? <span className="text-sm text-slate-400">Preparing download...</span> : null}
            </CardContent>
          </Card>
        ) : null}

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
                    multiSelectMode={multiSelectMode}
                    checked={selectedEmailIds.includes(email.id)}
                    onToggleChecked={() => toggleSelectedEmailId(email.id)}
                  />
                ))
              )}
            </div>
          </Card>

          <Card className="overflow-hidden md:col-span-2">
            <CardHeader className="border-b border-border p-4">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Mail className="h-4 w-4 text-primary" /> Message Content
                </CardTitle>
                <Button
                  variant="danger"
                  onClick={() => void deleteSingleEmail()}
                  disabled={!selectedEmail || isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Delete Email'}
                </Button>
              </div>
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
  notificationsEnabled,
  soundEnabled,
  desktopEnabled,
  onNotificationsEnabledChange,
  onSoundEnabledChange,
  onDesktopEnabledChange,
}: {
  status: NonNullable<StatusPayload['data']>;
  onLogout: () => void;
  onRefreshStatus: () => Promise<void>;
  onOpenInboxes: () => void;
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  desktopEnabled: boolean;
  onNotificationsEnabledChange: (enabled: boolean) => void;
  onSoundEnabledChange: (enabled: boolean) => void;
  onDesktopEnabledChange: (enabled: boolean) => void;
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
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Real-time alerts when new emails arrive</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-300">
              <label className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
                <span className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-primary" />
                  Enable notifications
                </span>
                <input
                  type="checkbox"
                  checked={notificationsEnabled}
                  onChange={(event) => onNotificationsEnabledChange(event.target.checked)}
                />
              </label>
              <label className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
                <span className="flex items-center gap-2">
                  <Volume2 className="h-4 w-4 text-primary" />
                  Enable sound
                </span>
                <input
                  type="checkbox"
                  checked={soundEnabled}
                  disabled={!notificationsEnabled}
                  onChange={(event) => onSoundEnabledChange(event.target.checked)}
                />
              </label>
              <label className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
                <span className="flex items-center gap-2">
                  <Monitor className="h-4 w-4 text-primary" />
                  Enable desktop alerts
                </span>
                <input
                  type="checkbox"
                  checked={desktopEnabled}
                  disabled={!notificationsEnabled}
                  onChange={(event) => onDesktopEnabledChange(event.target.checked)}
                />
              </label>
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
  refreshSignal,
}: {
  onBack: () => void;
  onOpenInbox: (inboxId: string) => void;
  refreshSignal: number;
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
  }, [refreshSignal]);

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

function getPasswordStrengthLabel(value: string): string {
  if (value.length < 12) return 'Weak';
  const hasUpper = /[A-Z]/.test(value);
  const hasLower = /[a-z]/.test(value);
  const hasNumber = /\d/.test(value);
  const hasSymbol = /[^A-Za-z0-9]/.test(value);
  const score = [hasUpper, hasLower, hasNumber, hasSymbol].filter(Boolean).length;
  if (score >= 3 && value.length >= 16) return 'Strong';
  if (score >= 2) return 'Medium';
  return 'Weak';
}

function SettingsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [postalDbUrl, setPostalDbUrl] = useState('');
  const [postalDbUrlRedacted, setPostalDbUrlRedacted] = useState<string | null>(null);
  const [postalConnectionOk, setPostalConnectionOk] = useState(false);
  const [sessionTimeoutMinutes, setSessionTimeoutMinutes] = useState(1440);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [postalConfirm, setPostalConfirm] = useState(false);
  const [passwordConfirm, setPasswordConfirm] = useState(false);
  const [sessionConfirm, setSessionConfirm] = useState(false);
  const [logoutAllConfirm, setLogoutAllConfirm] = useState(false);
  const [apiKeys, setApiKeys] = useState<ApiKeyRecord[]>([]);
  const [newApiKeyName, setNewApiKeyName] = useState('');
  const [newApiPermissions, setNewApiPermissions] = useState<Array<'send' | 'read' | 'admin'>>([
    'send',
    'read',
  ]);
  const [createApiConfirm, setCreateApiConfirm] = useState(false);
  const [createdFullKey, setCreatedFullKey] = useState<string | null>(null);
  const [revokeConfirmById, setRevokeConfirmById] = useState<Record<string, boolean>>({});
  const [selectedUsageKeyId, setSelectedUsageKeyId] = useState<string | null>(null);
  const [usageDetails, setUsageDetails] = useState<ApiKeyUsagePayload['data'] | null>(null);
  const [isApiKeysLoading, setIsApiKeysLoading] = useState(false);

  async function loadSettings() {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/settings', { credentials: 'include' });
      const payload = (await response.json()) as SettingsPayload;
      if (!response.ok || !payload.ok || !payload.data) {
        throw new Error(payload.error?.message || 'Failed to load settings');
      }
      setPostalDbUrl(payload.data.postalDbUrl || '');
      setPostalDbUrlRedacted(payload.data.postalDbUrlRedacted || null);
      setPostalConnectionOk(payload.data.postalConnectionOk);
      setSessionTimeoutMinutes(payload.data.sessionTimeoutMinutes);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadSettings();
  }, []);

  async function loadApiKeys() {
    setIsApiKeysLoading(true);
    try {
      const response = await fetch('/api/admin/api-keys', { credentials: 'include' });
      const payload = (await response.json()) as ApiKeysPayload;
      if (!response.ok || !payload.ok || !payload.data) {
        throw new Error(payload.error?.message || 'Failed to load API keys');
      }
      setApiKeys(payload.data.apiKeys);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load API keys');
    } finally {
      setIsApiKeysLoading(false);
    }
  }

  useEffect(() => {
    void loadApiKeys();
  }, []);

  async function createApiKey() {
    if (!createApiConfirm) {
      toast.error('Confirmation is required');
      return;
    }
    try {
      const response = await fetch('/api/admin/api-keys', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newApiKeyName,
          permissions: newApiPermissions,
          confirm: true,
        }),
      });
      const payload = (await response.json()) as ApiKeysPayload;
      if (!response.ok || !payload.ok || !payload.data) {
        throw new Error(payload.error?.message || 'Failed to create API key');
      }
      setCreatedFullKey(payload.data.fullKey || null);
      setNewApiKeyName('');
      setNewApiPermissions(['send', 'read']);
      setCreateApiConfirm(false);
      toast.success('API key created');
      await loadApiKeys();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create API key');
    }
  }

  async function revokeApiKey(id: string) {
    if (!revokeConfirmById[id]) {
      toast.error('Confirmation is required');
      return;
    }
    try {
      const response = await fetch(`/api/admin/api-keys/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true }),
      });
      const payload = (await response.json()) as ApiKeysPayload;
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error?.message || 'Failed to revoke API key');
      }
      setRevokeConfirmById((current) => ({ ...current, [id]: false }));
      toast.success('API key revoked');
      await loadApiKeys();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to revoke API key');
    }
  }

  async function loadUsageForKey(id: string) {
    try {
      const response = await fetch(`/api/admin/api-keys/${encodeURIComponent(id)}/usage`, {
        credentials: 'include',
      });
      const payload = (await response.json()) as ApiKeyUsagePayload;
      if (!response.ok || !payload.ok || !payload.data) {
        throw new Error(payload.error?.message || 'Failed to load usage');
      }
      setSelectedUsageKeyId(id);
      setUsageDetails(payload.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load usage');
    }
  }

  async function copyCreatedKey() {
    if (!createdFullKey) return;
    try {
      await navigator.clipboard.writeText(createdFullKey);
      toast.success('API key copied to clipboard');
    } catch {
      toast.error('Failed to copy key');
    }
  }

  function togglePermission(scope: 'send' | 'read' | 'admin') {
    setNewApiPermissions((current) => {
      if (current.includes(scope)) {
        const next = current.filter((item) => item !== scope);
        return next.length > 0 ? next : current;
      }
      return [...current, scope];
    });
  }

  async function savePostalSettings() {
    if (!postalConfirm) {
      toast.error('Confirmation is required');
      return;
    }
    try {
      const response = await fetch('/api/admin/settings/postal', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dbUrl: postalDbUrl, confirm: true }),
      });
      const payload = (await response.json()) as SettingsPayload;
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error?.message || 'Failed to update Postal connection');
      }
      toast.success('Postal connection updated');
      setPostalConfirm(false);
      await loadSettings();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update Postal connection');
    }
  }

  async function savePasswordSettings() {
    if (!passwordConfirm) {
      toast.error('Confirmation is required');
      return;
    }
    try {
      const response = await fetch('/api/admin/settings/password', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword, confirm: true }),
      });
      const payload = (await response.json()) as SettingsPayload;
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error?.message || 'Failed to change password');
      }
      setCurrentPassword('');
      setNewPassword('');
      setPasswordConfirm(false);
      toast.success('Admin password changed. Login again on other sessions.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to change password');
    }
  }

  async function saveSessionSettings() {
    if (!sessionConfirm) {
      toast.error('Confirmation is required');
      return;
    }
    try {
      const response = await fetch('/api/admin/settings/session', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionTimeoutMinutes, confirm: true }),
      });
      const payload = (await response.json()) as SettingsPayload;
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error?.message || 'Failed to update session timeout');
      }
      setSessionConfirm(false);
      toast.success('Session timeout updated');
      await loadSettings();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update session timeout');
    }
  }

  async function forceLogoutAll() {
    if (!logoutAllConfirm) {
      toast.error('Confirmation is required');
      return;
    }
    try {
      const response = await fetch('/api/admin/settings/logout-all', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true }),
      });
      const payload = (await response.json()) as SettingsPayload;
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error?.message || 'Failed to logout all sessions');
      }
      setLogoutAllConfirm(false);
      toast.success('All other sessions have been logged out');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to logout all sessions');
    }
  }

  const passwordStrength = getPasswordStrengthLabel(newPassword);

  return (
    <main className="min-h-screen px-4 py-6 md:px-8">
      <div className="mx-auto max-w-5xl space-y-4">
        <header className="rounded-xl border border-border bg-card/80 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Admin</p>
          <h1 className="text-xl font-semibold text-slate-100">Settings</h1>
        </header>

        {isLoading ? (
          <Card>
            <CardContent className="p-4 text-sm text-slate-400">Loading settings...</CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Postal Database Connection</CardTitle>
            <CardDescription>Update and test Postal DB connection used by the admin panel.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-300">
              Status:{' '}
              <span className={postalConnectionOk ? 'text-green-400' : 'text-amber-400'}>
                {postalConnectionOk ? 'Connected' : 'Disconnected'}
              </span>
            </p>
            <p className="text-xs text-slate-500">
              Current (redacted): {postalDbUrlRedacted || 'Not configured'}
            </p>
            <Input
              value={postalDbUrl}
              onChange={(event) => setPostalDbUrl(event.target.value)}
              placeholder="postgres://user:pass@host:5432/postal"
            />
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={postalConfirm}
                onChange={(event) => setPostalConfirm(event.target.checked)}
              />
              I confirm I want to update the Postal DB connection.
            </label>
            <Button onClick={() => void savePostalSettings()}>Test & Save Connection</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Admin Password</CardTitle>
            <CardDescription>Change admin password. Minimum length is 12 characters.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              placeholder="Current password"
            />
            <Input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="New password"
            />
            <p className="text-sm text-slate-300">
              Password strength:{' '}
              <span className={passwordStrength === 'Strong' ? 'text-green-400' : 'text-amber-400'}>
                {passwordStrength}
              </span>
            </p>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={passwordConfirm}
                onChange={(event) => setPasswordConfirm(event.target.checked)}
              />
              I confirm I want to change the admin password.
            </label>
            <Button onClick={() => void savePasswordSettings()}>Change Password</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Session Settings</CardTitle>
            <CardDescription>Control admin session timeout and force logout.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              type="number"
              min={5}
              max={10080}
              value={sessionTimeoutMinutes}
              onChange={(event) => setSessionTimeoutMinutes(Number(event.target.value))}
            />
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={sessionConfirm}
                onChange={(event) => setSessionConfirm(event.target.checked)}
              />
              I confirm I want to update session timeout.
            </label>
            <Button onClick={() => void saveSessionSettings()}>Update Session Timeout</Button>

            <label className="flex items-center gap-2 pt-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={logoutAllConfirm}
                onChange={(event) => setLogoutAllConfirm(event.target.checked)}
              />
              I confirm I want to force logout all other sessions.
            </label>
            <Button variant="danger" onClick={() => void forceLogoutAll()}>
              Force Logout All Sessions
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>API Keys</CardTitle>
            <CardDescription>Manage Postal API keys used by agents and automation.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 rounded-md border border-border p-3">
              <p className="text-sm font-medium text-slate-200">Create API Key</p>
              <Input
                value={newApiKeyName}
                onChange={(event) => setNewApiKeyName(event.target.value)}
                placeholder="Key name (e.g. automation-prod)"
              />
              <div className="flex flex-wrap gap-3 text-sm text-slate-300">
                {(['send', 'read', 'admin'] as const).map((scope) => (
                  <label key={scope} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newApiPermissions.includes(scope)}
                      onChange={() => togglePermission(scope)}
                    />
                    {scope}
                  </label>
                ))}
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={createApiConfirm}
                  onChange={(event) => setCreateApiConfirm(event.target.checked)}
                />
                I confirm I want to create this API key.
              </label>
              <Button onClick={() => void createApiKey()}>Create API Key</Button>
            </div>

            {createdFullKey ? (
              <div className="space-y-2 rounded-md border border-amber-600/40 bg-amber-950/20 p-3">
                <p className="text-sm font-semibold text-amber-300">Save this key now, you will not see it again.</p>
                <pre className="overflow-x-auto whitespace-pre-wrap break-all text-xs text-slate-100">
                  {createdFullKey}
                </pre>
                <Button variant="outline" onClick={() => void copyCreatedKey()}>
                  Copy to clipboard
                </Button>
              </div>
            ) : null}

            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-200">Existing Keys</p>
              {isApiKeysLoading ? (
                <p className="text-sm text-slate-400">Loading API keys...</p>
              ) : apiKeys.length === 0 ? (
                <p className="text-sm text-slate-400">No API keys found.</p>
              ) : (
                apiKeys.map((apiKey) => (
                  <div key={apiKey.id} className="rounded-md border border-border p-3 text-sm text-slate-300">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium text-slate-100">{apiKey.name}</p>
                      <Badge className={apiKey.status === 'active' ? '' : 'bg-slate-700'}>
                        {apiKey.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">{apiKey.maskedKey}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Created: {apiKey.createdAt ? formatDateTime(apiKey.createdAt) : 'N/A'} | Last used:{' '}
                      {apiKey.lastUsedAt ? formatDateTime(apiKey.lastUsedAt) : 'Never'}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">Permissions: {apiKey.permissions.join(', ')}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button variant="outline" onClick={() => void loadUsageForKey(apiKey.id)}>
                        View usage
                      </Button>
                      {apiKey.status === 'active' ? (
                        <>
                          <label className="flex items-center gap-2 text-xs text-slate-300">
                            <input
                              type="checkbox"
                              checked={Boolean(revokeConfirmById[apiKey.id])}
                              onChange={(event) =>
                                setRevokeConfirmById((current) => ({
                                  ...current,
                                  [apiKey.id]: event.target.checked,
                                }))
                              }
                            />
                            Confirm revoke
                          </label>
                          <Button variant="danger" onClick={() => void revokeApiKey(apiKey.id)}>
                            Revoke
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </div>

            {usageDetails && selectedUsageKeyId ? (
              <div className="rounded-md border border-border p-3 text-sm text-slate-300">
                <p className="font-medium text-slate-100">Usage for {selectedUsageKeyId}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Total requests: {usageDetails.totalRequests} | Last used:{' '}
                  {usageDetails.lastUsedAt ? formatDateTime(usageDetails.lastUsedAt) : 'Never'}
                </p>
                <div className="mt-2 space-y-1 text-xs">
                  {usageDetails.requestsPerDay.map((item) => (
                    <div key={item.date} className="flex items-center justify-between">
                      <span>{item.date}</span>
                      <span>{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function AdminLayout({
  active,
  onOpenDashboard,
  onOpenInboxes,
  onOpenSettings,
  onLogout,
  inboxNotificationCount,
  children,
}: {
  active: 'dashboard' | 'inboxes' | 'detail' | 'settings';
  onOpenDashboard: () => void;
  onOpenInboxes: () => void;
  onOpenSettings: () => void;
  onLogout: () => void;
  inboxNotificationCount: number;
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
            className="w-full justify-between"
            onClick={onOpenInboxes}
          >
            <span>Inboxes</span>
            {inboxNotificationCount > 0 ? (
              <Badge className="ml-2">{inboxNotificationCount}</Badge>
            ) : null}
          </Button>
          <Button
            variant={active === 'settings' ? 'default' : 'outline'}
            className="w-full justify-start"
            onClick={onOpenSettings}
          >
            <Settings className="mr-2 h-4 w-4" />
            Settings
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
  const [isSettingsView, setIsSettingsView] = useState<boolean>(() =>
    isSettingsPath(window.location.pathname)
  );
  const [inboxRefreshSignal, setInboxRefreshSignal] = useState(0);
  const [inboxNotificationCount, setInboxNotificationCount] = useState(0);
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() =>
    loadBooleanPreference(ADMIN_NOTIFICATION_PREFS_KEY, true)
  );
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() =>
    loadBooleanPreference(ADMIN_SOUND_PREFS_KEY, false)
  );
  const [desktopEnabled, setDesktopEnabled] = useState<boolean>(() =>
    loadBooleanPreference(ADMIN_DESKTOP_PREFS_KEY, false)
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
      const nextInboxId = parseInboxIdFromPath(window.location.pathname);
      const nextInboxesView = isInboxesPath(window.location.pathname);
      const nextSettingsView = isSettingsPath(window.location.pathname);
      setInboxId(nextInboxId);
      setIsInboxesView(nextInboxesView);
      setIsSettingsView(nextSettingsView);
      if (nextInboxId || nextInboxesView) {
        setInboxNotificationCount(0);
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    saveBooleanPreference(ADMIN_NOTIFICATION_PREFS_KEY, notificationsEnabled);
  }, [notificationsEnabled]);

  useEffect(() => {
    saveBooleanPreference(ADMIN_SOUND_PREFS_KEY, soundEnabled);
  }, [soundEnabled]);

  useEffect(() => {
    saveBooleanPreference(ADMIN_DESKTOP_PREFS_KEY, desktopEnabled);
  }, [desktopEnabled]);

  useEffect(() => {
    if (!isAuthenticated || !notificationsEnabled) {
      return;
    }

    const eventSource = new EventSource('/api/admin/events');
    const handleEvent = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(String(event.data || '{}')) as AdminRealtimeEvent;
        if (payload.type !== 'new_email') {
          return;
        }
        const count = Number(payload.count || 0);
        if (count < 1) {
          return;
        }

        setInboxNotificationCount((current) => current + count);
        setInboxRefreshSignal((current) => current + 1);
        toast.success(`${count} new email${count > 1 ? 's' : ''} received`);

        if (soundEnabled) {
          playNotificationTone();
        }

        if (
          desktopEnabled &&
          typeof window !== 'undefined' &&
          'Notification' in window &&
          Notification.permission === 'granted'
        ) {
          new Notification('MailGoat Admin', {
            body: `${count} new email${count > 1 ? 's' : ''} received`,
          });
        }
      } catch {
        // Ignore malformed payloads.
      }
    };

    const handleError = () => {
      eventSource.close();
    };

    eventSource.addEventListener('new_email', handleEvent as EventListener);
    eventSource.onerror = handleError;

    return () => {
      eventSource.removeEventListener('new_email', handleEvent as EventListener);
      eventSource.close();
    };
  }, [isAuthenticated, notificationsEnabled, soundEnabled, desktopEnabled]);

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
      setIsSettingsView(false);
      setInboxNotificationCount(0);
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
    setIsSettingsView(false);
  }

  function handleBackFromInbox() {
    goToInboxesRoute();
    setInboxId(null);
    setIsInboxesView(true);
    setIsSettingsView(false);
  }

  function handleOpenInboxes() {
    goToInboxesRoute();
    setInboxId(null);
    setIsInboxesView(true);
    setIsSettingsView(false);
    setInboxNotificationCount(0);
  }

  function handleBackFromInboxes() {
    goToAdminHome();
    setInboxId(null);
    setIsInboxesView(false);
    setIsSettingsView(false);
  }

  function handleOpenSettings() {
    goToSettingsRoute();
    setInboxId(null);
    setIsInboxesView(false);
    setIsSettingsView(true);
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
        onOpenSettings={handleOpenSettings}
        onLogout={handleLogout}
        inboxNotificationCount={inboxNotificationCount}
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
        onOpenSettings={handleOpenSettings}
        onLogout={handleLogout}
        inboxNotificationCount={inboxNotificationCount}
      >
        <InboxesPage
          onBack={handleBackFromInboxes}
          onOpenInbox={handleOpenInbox}
          refreshSignal={inboxRefreshSignal}
        />
      </AdminLayout>
    );
  }

  if (isSettingsView) {
    return (
      <AdminLayout
        active="settings"
        onOpenDashboard={handleBackFromInboxes}
        onOpenInboxes={handleOpenInboxes}
        onOpenSettings={handleOpenSettings}
        onLogout={handleLogout}
        inboxNotificationCount={inboxNotificationCount}
      >
        <SettingsPage />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      active="dashboard"
      onOpenDashboard={handleBackFromInboxes}
      onOpenInboxes={handleOpenInboxes}
      onOpenSettings={handleOpenSettings}
      onLogout={handleLogout}
      inboxNotificationCount={inboxNotificationCount}
    >
      <Dashboard
        status={status}
        onLogout={handleLogout}
        onRefreshStatus={async () => fetchStatus()}
        onOpenInboxes={handleOpenInboxes}
        notificationsEnabled={notificationsEnabled}
        soundEnabled={soundEnabled}
        desktopEnabled={desktopEnabled}
        onNotificationsEnabledChange={(enabled) => setNotificationsEnabled(enabled)}
        onSoundEnabledChange={(enabled) => setSoundEnabled(enabled)}
        onDesktopEnabledChange={async (enabled) => {
          if (
            enabled &&
            typeof window !== 'undefined' &&
            'Notification' in window &&
            Notification.permission === 'default'
          ) {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
              setDesktopEnabled(false);
              toast.error('Desktop notification permission was denied.');
              return;
            }
          }
          if (
            enabled &&
            typeof window !== 'undefined' &&
            'Notification' in window &&
            Notification.permission === 'denied'
          ) {
            toast.error('Desktop notifications are blocked in your browser settings.');
            setDesktopEnabled(false);
            return;
          }
          setDesktopEnabled(enabled);
        }}
      />
    </AdminLayout>
  );
}
