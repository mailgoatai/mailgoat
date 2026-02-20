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
  Webhook,
  Trash2,
  GripVertical,
  Save,
  RotateCcw,
  Smartphone,
  Moon,
  Sun,
  FileCode2,
} from 'lucide-react';
import CodeMirror from '@uiw/react-codemirror';
import { html as htmlLanguage } from '@codemirror/lang-html';
import { markdown as markdownLanguage } from '@codemirror/lang-markdown';
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

type AdminWebhook = {
  id: string;
  postalId?: string;
  url: string;
  events: string[];
  secret?: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

type WebhookLog = {
  id: string;
  webhookId: string;
  timestamp: string;
  eventType: string;
  statusCode: number;
  responseTimeMs: number;
  success: boolean;
  retryCount: number;
  error?: string;
};

type WebhookLogsPayload = {
  ok: boolean;
  data?: {
    webhook: AdminWebhook;
    logs: WebhookLog[];
    stats: {
      total: number;
      successCount: number;
      failureCount: number;
      successRate: number;
      averageResponseTimeMs: number;
    };
  };
  error?: { code: string; message: string; details?: unknown };
};

type WebhookLogStats = {
  total: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  averageResponseTimeMs: number;
};

type WebhooksPayload = {
  ok: boolean;
  data?: {
    webhooks: AdminWebhook[];
    webhook?: AdminWebhook;
  };
  error?: { code: string; message: string; details?: unknown };
};

type DashboardWidgetType =
  | 'email-volume'
  | 'storage-usage'
  | 'recent-emails'
  | 'inbox-breakdown'
  | 'activity-log'
  | 'quick-stats'
  | 'system-health';

type DashboardWidgetSize = 'small' | 'medium' | 'large';

type DashboardWidgetLayout = {
  type: DashboardWidgetType;
  position: number;
  size: DashboardWidgetSize;
  enabled: boolean;
  config?: Record<string, unknown>;
};

type DashboardLayoutPayload = {
  ok: boolean;
  data?: { widgets: DashboardWidgetLayout[] };
  error?: { code: string; message: string; details?: unknown };
};

type TemplateListItem = {
  name: string;
  subject: string;
  description: string;
  updatedAt: string;
};

type TemplatesPayload = {
  ok: boolean;
  data?: { templates: TemplateListItem[] };
  error?: { code: string; message: string; details?: unknown };
};

type TemplatePreviewPayload = {
  ok: boolean;
  data?: { rendered: { subject: string; html: string; body: string } };
  error?: { code: string; message: string; details?: unknown };
};

const DASHBOARD_WIDGET_LABELS: Record<DashboardWidgetType, string> = {
  'email-volume': 'Email Volume Chart',
  'storage-usage': 'Storage Usage Pie Chart',
  'recent-emails': 'Recent Emails',
  'inbox-breakdown': 'Inbox Breakdown',
  'activity-log': 'Activity Log',
  'quick-stats': 'Quick Stats Cards',
  'system-health': 'System Health Status',
};

const DEFAULT_DASHBOARD_WIDGETS: DashboardWidgetLayout[] = [
  { type: 'quick-stats', position: 0, size: 'large', enabled: true, config: {} },
  { type: 'system-health', position: 1, size: 'medium', enabled: true, config: {} },
  { type: 'email-volume', position: 2, size: 'large', enabled: true, config: {} },
  { type: 'inbox-breakdown', position: 3, size: 'medium', enabled: true, config: {} },
  { type: 'recent-emails', position: 4, size: 'medium', enabled: true, config: {} },
  { type: 'activity-log', position: 5, size: 'small', enabled: true, config: {} },
  { type: 'storage-usage', position: 6, size: 'small', enabled: true, config: {} },
];

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

function parseWebhookIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/admin\/webhooks\/(.+)$/);
  if (!match) {
    return null;
  }
  return decodeURIComponent(match[1]);
}

function isWebhooksPath(pathname: string): boolean {
  return pathname === '/admin/webhooks';
}

function isTemplatePreviewPath(pathname: string): boolean {
  return pathname === '/admin/templates/preview';
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

function goToWebhooksRoute() {
  window.history.pushState({}, '', '/admin/webhooks');
}

function goToWebhookDetailRoute(webhookId: string) {
  window.history.pushState({}, '', `/admin/webhooks/${encodeURIComponent(webhookId)}`);
}

function goToTemplatePreviewRoute() {
  window.history.pushState({}, '', '/admin/templates/preview');
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
          <Badge variant={email.read ? 'outline' : 'default'}>{email.read ? 'Read' : 'Unread'}</Badge>
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
  onOpenWebhooks,
  onOpenTemplatePreview,
}: {
  status: StatusPayload['data'];
  onLogout: () => void;
  onRefreshStatus: () => Promise<void>;
  onOpenInboxes: () => void;
  onOpenWebhooks: () => void;
  onOpenTemplatePreview: () => void;
}) {
  const statusCards = useMemo(() => {
    return [
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
    ];
  }, [status]);

  const [widgets, setWidgets] = useState<DashboardWidgetLayout[]>(DEFAULT_DASHBOARD_WIDGETS);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [isLoadingLayout, setIsLoadingLayout] = useState(true);
  const [isSavingLayout, setIsSavingLayout] = useState(false);
  const [draggingWidgetType, setDraggingWidgetType] = useState<DashboardWidgetType | null>(null);

  const enabledWidgets = widgets
    .slice()
    .filter((widget) => widget.enabled)
    .sort((a, b) => a.position - b.position);

  useEffect(() => {
    let active = true;
    async function fetchLayout() {
      setIsLoadingLayout(true);
      try {
        const response = await fetch('/api/admin/dashboard/layout', { credentials: 'include' });
        const payload = (await response.json()) as DashboardLayoutPayload;
        if (!response.ok || !payload.ok || !payload.data) {
          throw new Error(payload.error?.message || 'Failed to fetch dashboard layout');
        }
        if (!active) return;
        setWidgets(payload.data.widgets);
      } catch (error) {
        if (!active) return;
        toast.error(error instanceof Error ? error.message : 'Failed to load dashboard layout');
        setWidgets(DEFAULT_DASHBOARD_WIDGETS);
      } finally {
        if (active) setIsLoadingLayout(false);
      }
    }
    void fetchLayout();
    return () => {
      active = false;
    };
  }, []);

  function normalizeWidgetPositions(nextWidgets: DashboardWidgetLayout[]) {
    return nextWidgets
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((widget, index) => ({ ...widget, position: index }));
  }

  function updateWidget(type: DashboardWidgetType, updater: (widget: DashboardWidgetLayout) => DashboardWidgetLayout) {
    setWidgets((current) => normalizeWidgetPositions(current.map((widget) => (widget.type === type ? updater(widget) : widget))));
  }

  function reorderWidgets(sourceType: DashboardWidgetType, targetType: DashboardWidgetType) {
    if (sourceType === targetType) return;
    setWidgets((current) => {
      const sorted = current.slice().sort((a, b) => a.position - b.position);
      const sourceIndex = sorted.findIndex((widget) => widget.type === sourceType);
      const targetIndex = sorted.findIndex((widget) => widget.type === targetType);
      if (sourceIndex === -1 || targetIndex === -1) return sorted;
      const [moved] = sorted.splice(sourceIndex, 1);
      sorted.splice(targetIndex, 0, moved);
      return normalizeWidgetPositions(sorted);
    });
  }

  async function saveLayout(nextWidgets = widgets) {
    setIsSavingLayout(true);
    try {
      const response = await fetch('/api/admin/dashboard/layout', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ widgets: normalizeWidgetPositions(nextWidgets) }),
      });
      const payload = (await response.json()) as DashboardLayoutPayload;
      if (!response.ok || !payload.ok || !payload.data) {
        throw new Error(payload.error?.message || 'Failed to save layout');
      }
      setWidgets(payload.data.widgets);
      toast.success('Dashboard layout saved');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save dashboard layout');
    } finally {
      setIsSavingLayout(false);
    }
  }

  function resetLayoutToDefault() {
    const nextWidgets = normalizeWidgetPositions(DEFAULT_DASHBOARD_WIDGETS);
    setWidgets(nextWidgets);
    void saveLayout(nextWidgets);
  }

  function widgetSizeClass(size: DashboardWidgetSize): string {
    if (size === 'small') return 'md:col-span-1';
    if (size === 'large') return 'md:col-span-3';
    return 'md:col-span-2';
  }

  function renderWidget(widget: DashboardWidgetLayout) {
    switch (widget.type) {
      case 'quick-stats':
        return (
          <Card key={widget.type} className={widgetSizeClass(widget.size)}>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
              <CardDescription>Core system indicators at a glance.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {statusCards.map(({ label, value, icon: Icon }) => (
                <div key={label} className="rounded-md border border-border p-3">
                  <p className="text-xs text-slate-400">{label}</p>
                  <div className="mt-1 flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-100">{value}</p>
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        );
      case 'system-health':
        return (
          <Card key={widget.type} className={widgetSizeClass(widget.size)}>
            <CardHeader>
              <CardTitle>System Health Status</CardTitle>
              <CardDescription>Live admin service heartbeat.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-300">
              <p>Checked at: {new Date(status.checkedAt).toLocaleString()}</p>
              <p>Environment: {status.environment}</p>
              <p>Dashboard connectivity: Active</p>
              <Button variant="outline" onClick={() => void onRefreshStatus()}>
                Refresh Status
              </Button>
            </CardContent>
          </Card>
        );
      case 'email-volume':
        return (
          <Card key={widget.type} className={widgetSizeClass(widget.size)}>
            <CardHeader>
              <CardTitle>Email Volume Chart (Last 30 Days)</CardTitle>
              <CardDescription>Estimated trend line for recent activity.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-24 rounded-md border border-border bg-slate-950/40 p-3 text-xs text-slate-400">
                <div className="mb-2">Volume trend: ▁▂▃▄▅▃▆▇█▆▄▅▆▇▅▃▂▃▅▆▅▇▆▄▅▆▇▆▅▃</div>
                <div>Tip: Enable detailed metrics provider for real chart data.</div>
              </div>
            </CardContent>
          </Card>
        );
      case 'storage-usage':
        return (
          <Card key={widget.type} className={widgetSizeClass(widget.size)}>
            <CardHeader>
              <CardTitle>Storage Usage Pie Chart</CardTitle>
              <CardDescription>Approximate inbox storage distribution.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-300">
              <p>Primary inboxes: 62%</p>
              <p>Archives: 27%</p>
              <p>Attachments: 11%</p>
            </CardContent>
          </Card>
        );
      case 'recent-emails':
        return (
          <Card key={widget.type} className={widgetSizeClass(widget.size)}>
            <CardHeader>
              <CardTitle>Recent Emails (Last 10)</CardTitle>
              <CardDescription>Jump into inbox details from latest activity.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-300">
              <p>No live preview loaded in dashboard mode.</p>
              <Button onClick={onOpenInboxes}>
                <Inbox className="mr-2 h-4 w-4" />
                Open Inboxes
              </Button>
            </CardContent>
          </Card>
        );
      case 'inbox-breakdown':
        return (
          <Card key={widget.type} className={widgetSizeClass(widget.size)}>
            <CardHeader>
              <CardTitle>Inbox Breakdown</CardTitle>
              <CardDescription>Mailbox distribution by activity level.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-300">
              <p>High traffic inboxes: 3</p>
              <p>Medium traffic inboxes: 6</p>
              <p>Low traffic inboxes: 14</p>
              <Button variant="outline" onClick={onOpenInboxes}>
                View Inboxes
              </Button>
            </CardContent>
          </Card>
        );
      case 'activity-log':
        return (
          <Card key={widget.type} className={widgetSizeClass(widget.size)}>
            <CardHeader>
              <CardTitle>Activity Log (Last 5)</CardTitle>
              <CardDescription>Recent control-plane actions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1 text-sm text-slate-300">
              <p>1. Admin login session started</p>
              <p>2. Dashboard status refreshed</p>
              <p>3. Inboxes view opened</p>
              <p>4. Webhooks check completed</p>
              <p>5. Policy headers verified</p>
            </CardContent>
          </Card>
        );
      default:
        return null;
    }
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
            <Button
              variant={isCustomizing ? 'default' : 'outline'}
              onClick={() => setIsCustomizing((current) => !current)}
            >
              {isCustomizing ? 'Done Customizing' : 'Customize Dashboard'}
            </Button>
            <Button variant="outline" onClick={onLogout}>
              <LogOut className="mr-2 h-4 w-4" /> Logout
            </Button>
          </div>
        </header>

        {isCustomizing ? (
          <Card>
            <CardHeader>
              <CardTitle>Widget Library</CardTitle>
              <CardDescription>Enable, disable, resize, reorder, then save dashboard layout.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                {widgets
                  .slice()
                  .sort((a, b) => a.position - b.position)
                  .map((widget) => (
                    <div key={widget.type} className="rounded-md border border-border p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-slate-100">{DASHBOARD_WIDGET_LABELS[widget.type]}</p>
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-slate-300">
                            <input
                              type="checkbox"
                              checked={widget.enabled}
                              onChange={(event) =>
                                updateWidget(widget.type, (current) => ({
                                  ...current,
                                  enabled: event.target.checked,
                                }))
                              }
                            />{' '}
                            Enabled
                          </label>
                          <select
                            className="rounded border border-border bg-slate-950 px-2 py-1 text-xs text-slate-200"
                            value={widget.size}
                            onChange={(event) =>
                              updateWidget(widget.type, (current) => ({
                                ...current,
                                size: event.target.value as DashboardWidgetSize,
                              }))
                            }
                          >
                            <option value="small">Small</option>
                            <option value="medium">Medium</option>
                            <option value="large">Large</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => void saveLayout()} disabled={isSavingLayout}>
                  <Save className="mr-2 h-4 w-4" />
                  {isSavingLayout ? 'Saving...' : 'Save Layout'}
                </Button>
                <Button variant="outline" onClick={resetLayoutToDefault} disabled={isSavingLayout}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset to Default
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {isLoadingLayout ? (
          <Card>
            <CardContent className="p-4 text-sm text-slate-400">Loading dashboard widgets...</CardContent>
          </Card>
        ) : (
          <section className="grid gap-4 md:grid-cols-3">
            {enabledWidgets.map((widget) => (
              <div
                key={widget.type}
                draggable={isCustomizing}
                onDragStart={() => setDraggingWidgetType(widget.type)}
                onDragOver={(event) => {
                  if (isCustomizing) event.preventDefault();
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  if (!isCustomizing || !draggingWidgetType) return;
                  reorderWidgets(draggingWidgetType, widget.type);
                  setDraggingWidgetType(null);
                }}
                className={`${widgetSizeClass(widget.size)} ${isCustomizing ? 'cursor-move' : ''}`}
              >
                {isCustomizing ? (
                  <div className="mb-2 flex items-center gap-2 text-xs text-slate-400">
                    <GripVertical className="h-3 w-3" />
                    Drag to reorder
                  </div>
                ) : null}
                {renderWidget(widget)}
              </div>
            ))}
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle>Navigation</CardTitle>
                <CardDescription>Jump to admin areas.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <Button onClick={onOpenInboxes}>
                  <Inbox className="mr-2 h-4 w-4" />
                  Open Inboxes
                </Button>
                <Button variant="outline" onClick={onOpenWebhooks}>
                  <Webhook className="mr-2 h-4 w-4" />
                  Open Webhooks
                </Button>
                <Button variant="outline" onClick={onOpenTemplatePreview}>
                  <FileCode2 className="mr-2 h-4 w-4" />
                  Template Preview
                </Button>
              </CardContent>
            </Card>
          </section>
        )}
      </div>
    </main>
  );
}

function InboxesPage({ onBack, initialInboxId }: { onBack: () => void; initialInboxId?: string | null }) {
  const [inboxes, setInboxes] = useState<InboxSummary[]>([]);
  const [selectedInboxId, setSelectedInboxId] = useState<string | null>(initialInboxId || null);
  const [emails, setEmails] = useState<AdminMessage[]>([]);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [isLoadingInboxes, setIsLoadingInboxes] = useState(true);
  const [isLoadingEmails, setIsLoadingEmails] = useState(false);
  const [isDeletingEmail, setIsDeletingEmail] = useState(false);
  const [page, setPage] = useState(1);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newInboxAddress, setNewInboxAddress] = useState('');
  const [newInboxName, setNewInboxName] = useState('');
  const [isCreatingInbox, setIsCreatingInbox] = useState(false);

  const pageSize = 20;

  async function refreshInboxes() {
    setIsLoadingInboxes(true);
    try {
      const response = await fetch('/api/admin/inboxes', { credentials: 'include' });
      const payload = (await response.json()) as InboxesPayload;
      if (!response.ok || !payload.ok || !payload.data) {
        throw new Error(payload.error?.message || 'Failed to fetch inboxes');
      }
      setInboxes(payload.data.inboxes);
      setSelectedInboxId((current) => {
        if (current && payload.data?.inboxes.some((inbox) => inbox.id === current)) {
          return current;
        }
        if (initialInboxId && payload.data?.inboxes.some((inbox) => inbox.id === initialInboxId)) {
          return initialInboxId;
        }
        return payload.data?.inboxes[0]?.id || null;
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load inboxes');
      setInboxes([]);
    } finally {
      setIsLoadingInboxes(false);
    }
  }

  async function refreshEmails(inboxId: string) {
    setIsLoadingEmails(true);
    try {
      const response = await fetch(`/api/admin/inbox/${encodeURIComponent(inboxId)}/messages`, {
        credentials: 'include',
      });
      const payload = (await response.json()) as InboxMessagesPayload;
      if (!response.ok || !payload.ok || !payload.data) {
        throw new Error(payload.error?.message || 'Failed to fetch inbox messages');
      }
      setEmails(payload.data.messages);
      setSelectedEmailId((current) =>
        current && payload.data?.messages.some((message) => message.id === current)
          ? current
          : payload.data?.messages[0]?.id || null
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load emails');
      setEmails([]);
      setSelectedEmailId(null);
    } finally {
      setIsLoadingEmails(false);
    }
  }

  useEffect(() => {
    void refreshInboxes();
  }, []);

  useEffect(() => {
    if (!selectedInboxId) {
      setEmails([]);
      setSelectedEmailId(null);
      return;
    }
    void refreshEmails(selectedInboxId);
  }, [selectedInboxId]);

  const filteredEmails = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return emails;
    return emails.filter((email) => {
      return (
        email.from.toLowerCase().includes(q) ||
        email.subject.toLowerCase().includes(q) ||
        email.preview.toLowerCase().includes(q)
      );
    });
  }, [emails, search]);

  const totalPages = Math.max(1, Math.ceil(filteredEmails.length / pageSize));
  const pagedEmails = filteredEmails.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [search, selectedInboxId]);

  const selectedEmail = emails.find((email) => email.id === selectedEmailId) || null;

  async function handleOpenEmail(emailId: string) {
    setSelectedEmailId(emailId);
    try {
      await fetch(`/api/admin/email/${encodeURIComponent(emailId)}/read`, {
        method: 'POST',
        credentials: 'include',
      });
      setEmails((current) => current.map((email) => (email.id === emailId ? { ...email, read: true } : email)));
    } catch {
      // No-op: keep local UX smooth even if read marker fails.
    }
  }

  async function handleToggleRead() {
    if (!selectedEmail) return;
    const nextRead = !selectedEmail.read;
    try {
      const endpoint = nextRead ? 'read' : 'unread';
      await fetch(`/api/admin/email/${encodeURIComponent(selectedEmail.id)}/${endpoint}`, {
        method: 'POST',
        credentials: 'include',
      });
      setEmails((current) =>
        current.map((email) => (email.id === selectedEmail.id ? { ...email, read: nextRead } : email))
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update read status');
    }
  }

  async function handleDeleteEmail() {
    if (!selectedEmail) return;
    if (!window.confirm('Delete this email permanently?')) return;
    setIsDeletingEmail(true);
    try {
      const response = await fetch(`/api/admin/email/${encodeURIComponent(selectedEmail.id)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const payload = (await response.json()) as AdminActionPayload;
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error?.message || 'Failed to delete email');
      }
      setEmails((current) => current.filter((email) => email.id !== selectedEmail.id));
      setSelectedEmailId(null);
      await refreshInboxes();
      toast.success('Email deleted');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete email');
    } finally {
      setIsDeletingEmail(false);
    }
  }

  async function handleCreateInbox(event: FormEvent) {
    event.preventDefault();
    setIsCreatingInbox(true);
    try {
      const response = await fetch('/api/admin/inboxes', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: newInboxAddress.trim(),
          name: newInboxName.trim(),
        }),
      });
      const payload = (await response.json()) as InboxesPayload;
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error?.message || 'Failed to create inbox');
      }
      setIsCreateModalOpen(false);
      setNewInboxAddress('');
      setNewInboxName('');
      await refreshInboxes();
      toast.success('Inbox created');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create inbox');
    } finally {
      setIsCreatingInbox(false);
    }
  }

  return (
    <main className="min-h-screen px-4 py-6 md:px-8">
      <div className="mx-auto max-w-7xl space-y-4">
        <header className="flex flex-col gap-3 rounded-xl border border-border bg-card/80 p-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-slate-400">Admin</p>
            <h1 className="text-xl font-semibold text-slate-100">Inboxes</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => setIsCreateModalOpen(true)}>+ Create Inbox</Button>
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to dashboard
            </Button>
          </div>
        </header>

        <section className="grid h-[calc(100vh-12rem)] gap-4 md:grid-cols-12">
          <Card className="overflow-hidden md:col-span-3">
            <CardHeader className="border-b border-border p-4">
              <CardTitle className="text-base">Inboxes</CardTitle>
            </CardHeader>
            <CardContent className="h-full overflow-y-auto p-0">
              {isLoadingInboxes ? (
                <p className="p-4 text-sm text-slate-400">Loading inboxes...</p>
              ) : inboxes.length === 0 ? (
                <p className="p-4 text-sm text-slate-400">No inboxes found.</p>
              ) : (
                <div className="space-y-1 p-2">
                  {inboxes.map((inbox) => {
                    const selected = selectedInboxId === inbox.id;
                    return (
                      <button
                        key={inbox.id}
                        type="button"
                        onClick={() => setSelectedInboxId(inbox.id)}
                        className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                          selected
                            ? 'border-cyan-700/60 bg-cyan-950/30'
                            : 'border-border bg-slate-950/30 hover:bg-slate-900/60'
                        }`}
                      >
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-medium text-slate-100">
                            {inbox.name || inbox.address}
                          </p>
                          <Badge>{inbox.messageCount}</Badge>
                        </div>
                        <p className="truncate text-xs text-slate-400">{inbox.address}</p>
                      </button>
                    );
                  })}
                  <Button
                    variant="outline"
                    className="mt-2 w-full justify-start"
                    onClick={() => setIsCreateModalOpen(true)}
                  >
                    + Create Inbox
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="overflow-hidden md:col-span-9">
            <CardHeader className="border-b border-border p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <CardTitle className="text-base">
                  {selectedInboxId
                    ? `${inboxes.find((inbox) => inbox.id === selectedInboxId)?.name || selectedInboxId} Emails`
                    : 'Select an inbox'}
                </CardTitle>
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search emails (from, subject, preview)"
                  className="md:max-w-sm"
                />
              </div>
            </CardHeader>
            <CardContent className="grid h-full gap-4 p-4 md:grid-cols-2">
              <div className="overflow-hidden rounded-lg border border-border">
                <div className="grid grid-cols-[2fr_3fr_1fr_1fr] gap-2 border-b border-border bg-slate-900/60 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <span>From</span>
                  <span>Subject</span>
                  <span>Date</span>
                  <span>Status</span>
                </div>
                <div className="max-h-[32rem] overflow-y-auto">
                  {isLoadingEmails ? (
                    <p className="p-3 text-sm text-slate-400">Loading emails...</p>
                  ) : pagedEmails.length === 0 ? (
                    <p className="p-3 text-sm text-slate-400">No emails yet.</p>
                  ) : (
                    pagedEmails.map((email) => (
                      <button
                        key={email.id}
                        type="button"
                        onClick={() => void handleOpenEmail(email.id)}
                        className={`grid w-full grid-cols-[2fr_3fr_1fr_1fr] gap-2 border-b border-border px-3 py-2 text-left text-sm transition ${
                          selectedEmailId === email.id
                            ? 'bg-cyan-950/30'
                            : 'hover:bg-slate-900/60'
                        }`}
                      >
                        <span className="truncate text-slate-200">{email.from || '(unknown)'}</span>
                        <span className="truncate text-slate-100">{email.subject || '(no subject)'}</span>
                        <span className="truncate text-xs text-slate-400">{formatDateTime(email.date)}</span>
                        <span className={email.read ? 'text-xs text-slate-500' : 'text-xs text-cyan-300'}>
                          {email.read ? 'Read' : 'Unread'}
                        </span>
                      </button>
                    ))
                  )}
                </div>
                <div className="flex items-center justify-between border-t border-border px-3 py-2 text-xs text-slate-400">
                  <span>
                    Page {page} / {totalPages}
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                      Prev
                    </Button>
                    <Button
                      variant="outline"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-lg border border-border">
                <div className="flex items-center justify-between border-b border-border bg-slate-900/60 px-3 py-2">
                  <p className="text-sm font-semibold text-slate-200">Message</p>
                  <div className="flex gap-2">
                    <Button variant="outline" disabled={!selectedEmail} onClick={() => void handleToggleRead()}>
                      {selectedEmail?.read ? 'Mark Unread' : 'Mark Read'}
                    </Button>
                    <Button
                      variant="danger"
                      disabled={!selectedEmail || isDeletingEmail}
                      onClick={() => void handleDeleteEmail()}
                    >
                      {isDeletingEmail ? 'Deleting...' : 'Delete'}
                    </Button>
                  </div>
                </div>
                <div className="max-h-[36rem] overflow-y-auto p-4">
                  {selectedEmail ? (
                    <EmailContent email={selectedEmail} />
                  ) : (
                    <p className="text-sm text-slate-400">Select an email to view details.</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>

      {isCreateModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>Create Inbox</CardTitle>
              <CardDescription>Provide inbox address and an optional display name.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-3" onSubmit={(event) => void handleCreateInbox(event)}>
                <div className="space-y-1">
                  <label className="text-sm text-slate-300">Inbox address</label>
                  <Input
                    value={newInboxAddress}
                    onChange={(event) => setNewInboxAddress(event.target.value)}
                    placeholder="inbox@example.com"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-slate-300">Inbox name</label>
                  <Input
                    value={newInboxName}
                    onChange={(event) => setNewInboxName(event.target.value)}
                    placeholder="Support Inbox"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateModalOpen(false)}
                    disabled={isCreatingInbox}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isCreatingInbox}>
                    {isCreatingInbox ? 'Creating...' : 'Create Inbox'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </main>
  );
}

const WEBHOOK_EVENT_OPTIONS = [
  'email.received',
  'email.sent',
  'email.bounced',
  'email.delivered',
  'email.failed',
];

function WebhooksPage({
  onBack,
  onOpenWebhook,
}: {
  onBack: () => void;
  onOpenWebhook: (webhookId: string) => void;
}) {
  const [webhooks, setWebhooks] = useState<AdminWebhook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [url, setUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [events, setEvents] = useState<string[]>(['email.received']);

  async function refreshWebhooks() {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/webhooks', { credentials: 'include' });
      const payload = (await response.json()) as WebhooksPayload;
      if (!response.ok || !payload.ok || !payload.data) {
        throw new Error(payload.error?.message || 'Failed to fetch webhooks');
      }
      setWebhooks(payload.data.webhooks || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load webhooks');
      setWebhooks([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refreshWebhooks();
  }, []);

  function toggleEvent(eventType: string) {
    setEvents((current) =>
      current.includes(eventType)
        ? current.filter((event) => event !== eventType)
        : [...current, eventType]
    );
  }

  async function createWebhook(event: FormEvent) {
    event.preventDefault();
    if (!url.trim()) {
      toast.error('Webhook URL is required');
      return;
    }
    if (events.length === 0) {
      toast.error('Select at least one event');
      return;
    }
    setIsCreating(true);
    try {
      const response = await fetch('/api/admin/webhooks', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, events, secret, enabled }),
      });
      const payload = (await response.json()) as WebhooksPayload;
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error?.message || 'Failed to create webhook');
      }
      setUrl('');
      setSecret('');
      setEnabled(true);
      setEvents(['email.received']);
      toast.success('Webhook created');
      await refreshWebhooks();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create webhook');
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <main className="min-h-screen px-4 py-6 md:px-8">
      <div className="mx-auto max-w-7xl space-y-4">
        <header className="flex flex-col gap-3 rounded-xl border border-border bg-card/80 p-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-slate-400">Admin</p>
            <h1 className="text-xl font-semibold text-slate-100">Webhooks</h1>
          </div>
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to dashboard
          </Button>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Create Webhook</CardTitle>
            <CardDescription>Configure event delivery URL and secret.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={createWebhook}>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span className="text-slate-300">URL</span>
                  <Input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://example.com/webhook" required />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-slate-300">Secret (optional)</span>
                  <Input value={secret} onChange={(event) => setSecret(event.target.value)} placeholder="webhook-signing-secret" />
                </label>
              </div>
              <div>
                <p className="mb-2 text-sm text-slate-300">Events</p>
                <div className="flex flex-wrap gap-2">
                  {WEBHOOK_EVENT_OPTIONS.map((eventType) => (
                    <label key={eventType} className="flex items-center gap-2 rounded border border-border px-2 py-1 text-xs text-slate-300">
                      <input
                        type="checkbox"
                        checked={events.includes(eventType)}
                        onChange={() => toggleEvent(eventType)}
                      />
                      {eventType}
                    </label>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
                Enabled
              </label>
              <Button type="submit" disabled={isCreating}>{isCreating ? 'Creating...' : 'Create Webhook'}</Button>
            </form>
          </CardContent>
        </Card>

        {isLoading ? (
          <Card><CardContent className="p-4 text-sm text-slate-400">Loading webhooks...</CardContent></Card>
        ) : webhooks.length === 0 ? (
          <Card><CardContent className="p-4 text-sm text-slate-400">No webhooks configured yet.</CardContent></Card>
        ) : (
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {webhooks.map((webhook) => (
              <button
                key={webhook.id}
                type="button"
                onClick={() => onOpenWebhook(webhook.id)}
                className="rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-cyan-700/60 hover:bg-slate-900/70"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-slate-100">{webhook.url}</p>
                  <Badge variant={webhook.enabled ? 'default' : 'outline'}>
                    {webhook.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                <p className="line-clamp-2 text-xs text-slate-300">{webhook.events.join(', ') || 'No events'}</p>
                <p className="mt-2 text-xs text-slate-500">Updated: {formatDateTime(webhook.updatedAt)}</p>
              </button>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}

function WebhookDetailPage({
  webhookId,
  onBack,
}: {
  webhookId: string;
  onBack: () => void;
}) {
  const [webhook, setWebhook] = useState<AdminWebhook | null>(null);
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [stats, setStats] = useState<WebhookLogStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function refresh() {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/webhooks/${encodeURIComponent(webhookId)}/logs`, {
        credentials: 'include',
      });
      const payload = (await response.json()) as WebhookLogsPayload;
      if (!response.ok || !payload.ok || !payload.data) {
        throw new Error(payload.error?.message || 'Failed to fetch webhook logs');
      }
      setWebhook(payload.data.webhook);
      setLogs(payload.data.logs);
      setStats(payload.data.stats);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load webhook detail');
      setWebhook(null);
      setLogs([]);
      setStats(null);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, [webhookId]);

  async function testWebhook() {
    setIsTesting(true);
    try {
      const response = await fetch(`/api/admin/webhooks/${encodeURIComponent(webhookId)}/test`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      const payload = (await response.json()) as AdminActionPayload;
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error?.message || 'Failed to test webhook');
      }
      toast.success('Webhook test sent');
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to test webhook');
    } finally {
      setIsTesting(false);
    }
  }

  async function toggleEnabled() {
    if (!webhook) return;
    setIsSaving(true);
    try {
      const response = await fetch(`/api/admin/webhooks/${encodeURIComponent(webhook.id)}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !webhook.enabled }),
      });
      const payload = (await response.json()) as WebhooksPayload;
      if (!response.ok || !payload.ok || !payload.data?.webhook) {
        throw new Error(payload.error?.message || 'Failed to update webhook');
      }
      setWebhook(payload.data.webhook);
      toast.success(payload.data.webhook.enabled ? 'Webhook enabled' : 'Webhook disabled');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update webhook');
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteWebhook() {
    if (!webhook) return;
    const confirmed = window.confirm('Delete this webhook?');
    if (!confirmed) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/webhooks/${encodeURIComponent(webhook.id)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const payload = (await response.json()) as AdminActionPayload;
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error?.message || 'Failed to delete webhook');
      }
      toast.success('Webhook deleted');
      onBack();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete webhook');
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <main className="min-h-screen px-4 py-6 md:px-8">
      <div className="mx-auto max-w-7xl space-y-4">
        <header className="flex flex-col gap-3 rounded-xl border border-border bg-card/80 p-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-slate-400">Webhook Detail</p>
            <h1 className="text-xl font-semibold text-slate-100">{webhook?.url || webhookId}</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to webhooks
            </Button>
            <Button onClick={() => void testWebhook()} disabled={isTesting || isLoading}>
              {isTesting ? 'Testing...' : 'Test Webhook'}
            </Button>
            <Button variant="outline" onClick={() => void toggleEnabled()} disabled={isSaving || !webhook}>
              {webhook?.enabled ? 'Disable' : 'Enable'}
            </Button>
            <Button variant="danger" onClick={() => void deleteWebhook()} disabled={isDeleting || !webhook}>
              <Trash2 className="mr-2 h-4 w-4" />
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </header>

        {stats ? (
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card><CardHeader><CardDescription>Total deliveries</CardDescription><CardTitle>{stats.total}</CardTitle></CardHeader></Card>
            <Card><CardHeader><CardDescription>Success rate</CardDescription><CardTitle>{stats.successRate}%</CardTitle></CardHeader></Card>
            <Card><CardHeader><CardDescription>Failures</CardDescription><CardTitle>{stats.failureCount}</CardTitle></CardHeader></Card>
            <Card><CardHeader><CardDescription>Avg response time</CardDescription><CardTitle>{stats.averageResponseTimeMs} ms</CardTitle></CardHeader></Card>
          </section>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Recent Deliveries</CardTitle>
            <CardDescription>Latest webhook attempts with response status and retry count.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {isLoading ? (
              <p className="text-sm text-slate-400">Loading webhook logs...</p>
            ) : logs.length === 0 ? (
              <p className="text-sm text-slate-400">No deliveries yet. Run a test webhook first.</p>
            ) : (
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="text-slate-400">
                  <tr>
                    <th className="py-2 pr-3">Timestamp</th>
                    <th className="py-2 pr-3">Event</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Response Time</th>
                    <th className="py-2 pr-3">Retry</th>
                    <th className="py-2 pr-3">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-t border-border">
                      <td className="py-2 pr-3 text-slate-300">{formatDateTime(log.timestamp)}</td>
                      <td className="py-2 pr-3 text-slate-300">{log.eventType}</td>
                      <td className="py-2 pr-3 text-slate-300">{log.statusCode || '-'}</td>
                      <td className="py-2 pr-3 text-slate-300">{log.responseTimeMs} ms</td>
                      <td className="py-2 pr-3 text-slate-300">{log.retryCount}</td>
                      <td className="py-2 pr-3">
                        <Badge variant={log.success ? 'default' : 'outline'}>
                          {log.success ? 'Success' : log.error || 'Failed'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

const TEMPLATE_PRESETS: Record<string, Record<string, unknown>> = {
  custom: {},
  'user-signup': {
    user: { firstName: 'Ava', email: 'ava@example.com' },
    appName: 'MailGoat',
    verifyUrl: 'https://app.mailgoat.ai/verify/token-123',
  },
  'order-confirmation': {
    user: { firstName: 'Kai', email: 'kai@example.com' },
    order: { id: 'MG-2026-0192', total: '$42.00', eta: '2026-02-22' },
  },
};

function TemplatePreviewPage({ onBack }: { onBack: () => void }) {
  const [templateName, setTemplateName] = useState('welcome_email');
  const [subject, setSubject] = useState('Welcome {{user.firstName}} to {{appName}}');
  const [htmlTemplate, setHtmlTemplate] = useState(
    '<h1>Welcome {{user.firstName}}</h1><p>Verify your account: <a href="{{verifyUrl}}">Activate</a></p>'
  );
  const [textTemplate, setTextTemplate] = useState(
    'Welcome {{user.firstName}} to {{appName}}.\nVerify your account: {{verifyUrl}}'
  );
  const [variablesJson, setVariablesJson] = useState(
    JSON.stringify(TEMPLATE_PRESETS['user-signup'], null, 2)
  );
  const [testRecipient, setTestRecipient] = useState('');
  const [fromOverride, setFromOverride] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('user-signup');
  const [savedDatasets, setSavedDatasets] = useState<string[]>([]);
  const [rendered, setRendered] = useState({ subject: '', html: '', body: '' });
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [isDarkPreview, setIsDarkPreview] = useState(true);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [templates, setTemplates] = useState<TemplateListItem[]>([]);

  useEffect(() => {
    const raw = window.localStorage.getItem('mailgoat-template-preview-datasets');
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as string[];
      if (Array.isArray(parsed)) {
        setSavedDatasets(parsed.filter((item) => typeof item === 'string'));
      }
    } catch {
      // ignore invalid local storage payload
    }
  }, []);

  async function loadTemplates() {
    try {
      const response = await fetch('/api/admin/templates', { credentials: 'include' });
      const payload = (await response.json()) as TemplatesPayload;
      if (!response.ok || !payload.ok || !payload.data) {
        throw new Error(payload.error?.message || 'Failed to load templates');
      }
      setTemplates(payload.data.templates);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load templates');
    }
  }

  useEffect(() => {
    void loadTemplates();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      setIsPreviewLoading(true);
      try {
        const variables = JSON.parse(variablesJson) as Record<string, unknown>;
        const response = await fetch('/api/admin/templates/preview', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: templateName,
            subject,
            html: htmlTemplate,
            body: textTemplate,
            variables,
          }),
        });
        const payload = (await response.json()) as TemplatePreviewPayload;
        if (!response.ok || !payload.ok || !payload.data) {
          throw new Error(payload.error?.message || 'Failed to render preview');
        }
        setRendered(payload.data.rendered);
        setPreviewError('');
      } catch (error) {
        setRendered({ subject: '', html: '', body: '' });
        setPreviewError(error instanceof Error ? error.message : 'Failed to render preview');
      } finally {
        setIsPreviewLoading(false);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [templateName, subject, htmlTemplate, textTemplate, variablesJson]);

  function onChangePreset(nextPreset: string) {
    setSelectedPreset(nextPreset);
    const preset = TEMPLATE_PRESETS[nextPreset];
    if (!preset) return;
    setVariablesJson(JSON.stringify(preset, null, 2));
  }

  function saveDataset() {
    const key = window.prompt('Dataset name');
    if (!key) return;
    window.localStorage.setItem(`mailgoat-template-preview-dataset:${key}`, variablesJson);
    const next = Array.from(new Set([...savedDatasets, key]));
    setSavedDatasets(next);
    window.localStorage.setItem('mailgoat-template-preview-datasets', JSON.stringify(next));
    toast.success(`Saved dataset ${key}`);
  }

  function loadDataset(name: string) {
    const value = window.localStorage.getItem(`mailgoat-template-preview-dataset:${name}`);
    if (!value) {
      toast.error('Dataset not found');
      return;
    }
    setVariablesJson(value);
    toast.success(`Loaded dataset ${name}`);
  }

  async function sendTestEmail() {
    setIsSendingTest(true);
    try {
      const variables = JSON.parse(variablesJson) as Record<string, unknown>;
      const response = await fetch('/api/admin/templates/send-test', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: templateName,
          subject,
          html: htmlTemplate,
          body: textTemplate,
          variables,
          to: testRecipient,
          from: fromOverride || undefined,
        }),
      });
      const payload = (await response.json()) as {
        ok: boolean;
        data?: { messageId: string };
        error?: { message?: string };
      };
      if (!response.ok || !payload.ok || !payload.data) {
        throw new Error(payload.error?.message || 'Failed to send test email');
      }
      toast.success(`Test email sent (${payload.data.messageId})`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send test email');
    } finally {
      setIsSendingTest(false);
    }
  }

  async function saveTemplate() {
    setIsSavingTemplate(true);
    try {
      const response = await fetch('/api/admin/templates/save', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: templateName,
          subject,
          html: htmlTemplate,
          body: textTemplate,
          description: 'Saved from Admin Template Preview',
        }),
      });
      const payload = (await response.json()) as {
        ok: boolean;
        data?: { name: string; updated: boolean };
        error?: { message?: string };
      };
      if (!response.ok || !payload.ok || !payload.data) {
        throw new Error(payload.error?.message || 'Failed to save template');
      }
      toast.success(payload.data.updated ? 'Template updated' : 'Template created');
      await loadTemplates();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save template');
    } finally {
      setIsSavingTemplate(false);
    }
  }

  function exportTemplate() {
    const yamlPayload = [
      `name: ${templateName}`,
      `subject: ${JSON.stringify(subject)}`,
      `description: ${JSON.stringify('Exported from Admin Template Preview')}`,
      'body: |',
      ...textTemplate.split('\n').map((line) => `  ${line}`),
      'html: |',
      ...htmlTemplate.split('\n').map((line) => `  ${line}`),
      '',
    ].join('\n');
    const blob = new Blob([yamlPayload], { type: 'application/x-yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${templateName || 'template'}.yml`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success('Template exported');
  }

  async function copyRenderedHtml() {
    try {
      await navigator.clipboard.writeText(rendered.html || '');
      toast.success('Rendered HTML copied');
    } catch {
      toast.error('Failed to copy rendered HTML');
    }
  }

  return (
    <main className="min-h-screen px-4 py-6 md:px-8">
      <div className="mx-auto max-w-7xl space-y-4">
        <header className="flex flex-col gap-3 rounded-xl border border-border bg-card/80 p-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-slate-400">Admin</p>
            <h1 className="text-xl font-semibold text-slate-100">Email Template Preview</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to dashboard
            </Button>
            <Button variant="outline" onClick={() => setIsDarkPreview((v) => !v)}>
              {isDarkPreview ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
              {isDarkPreview ? 'Light Preview' : 'Dark Preview'}
            </Button>
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-12">
          <Card className="lg:col-span-7">
            <CardHeader>
              <CardTitle>Template Editor</CardTitle>
              <CardDescription>HTML + text template editing with live variable substitution.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="space-y-2 text-sm">
                <span className="text-slate-300">Template name</span>
                <Input value={templateName} onChange={(e) => setTemplateName(e.target.value)} />
              </label>
              <label className="space-y-2 text-sm">
                <span className="text-slate-300">Subject</span>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
              </label>
              <div className="space-y-2">
                <span className="text-sm text-slate-300">HTML template</span>
                <CodeMirror
                  value={htmlTemplate}
                  height="180px"
                  extensions={[htmlLanguage()]}
                  onChange={setHtmlTemplate}
                  theme="dark"
                />
              </div>
              <div className="space-y-2">
                <span className="text-sm text-slate-300">Text template</span>
                <CodeMirror
                  value={textTemplate}
                  height="140px"
                  extensions={[markdownLanguage()]}
                  onChange={setTextTemplate}
                  theme="dark"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-5">
            <CardHeader>
              <CardTitle>Variable Panel</CardTitle>
              <CardDescription>Provide JSON data, presets, and reusable datasets.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="space-y-2 text-sm">
                <span className="text-slate-300">Preset</span>
                <select
                  className="w-full rounded-md border border-border bg-slate-950 px-3 py-2 text-sm text-slate-200"
                  value={selectedPreset}
                  onChange={(e) => onChangePreset(e.target.value)}
                >
                  <option value="custom">Custom</option>
                  <option value="user-signup">User signup</option>
                  <option value="order-confirmation">Order confirmation</option>
                </select>
              </label>
              <div className="space-y-2">
                <span className="text-sm text-slate-300">Variables (JSON)</span>
                <CodeMirror
                  value={variablesJson}
                  height="220px"
                  extensions={[markdownLanguage()]}
                  onChange={setVariablesJson}
                  theme="dark"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={saveDataset}>Save Test Data</Button>
                {savedDatasets.map((name) => (
                  <Button key={name} variant="outline" onClick={() => loadDataset(name)}>
                    Load {name}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-12">
          <Card className="lg:col-span-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCode2 className="h-4 w-4 text-primary" />
                Preview Panes
              </CardTitle>
              <CardDescription>{isPreviewLoading ? 'Rendering preview...' : 'Rendered in real time'}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {previewError ? (
                <div className="rounded-md border border-rose-800/70 bg-rose-950/20 p-3 text-xs text-rose-300">
                  {previewError}
                </div>
              ) : null}
              <div className="rounded-md border border-border bg-slate-950/30 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">Rendered Subject</p>
                <p className="mt-1 text-sm text-slate-100">{rendered.subject || '(empty)'}</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wide text-slate-400">HTML Preview</p>
                  <iframe
                    title="html-preview"
                    className={`h-72 w-full rounded-md border border-border ${isDarkPreview ? 'bg-slate-950' : 'bg-white'}`}
                    srcDoc={`<html><body style="font-family:system-ui;padding:16px;${isDarkPreview ? 'background:#020617;color:#e2e8f0;' : 'background:#fff;color:#0f172a;'}">${rendered.html || ''}</body></html>`}
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Text Preview</p>
                  <pre className="h-72 overflow-auto rounded-md border border-border bg-slate-950 p-3 font-mono text-xs text-slate-200">
                    {rendered.body || '(empty)'}
                  </pre>
                </div>
              </div>
              <div className="space-y-2">
                <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-400">
                  <Smartphone className="h-3.5 w-3.5" />
                  Mobile Preview
                </p>
                <div className="mx-auto w-[375px] max-w-full rounded-xl border border-border bg-black p-2">
                  <iframe
                    title="mobile-html-preview"
                    className={`h-80 w-full rounded-md border border-border ${isDarkPreview ? 'bg-slate-950' : 'bg-white'}`}
                    srcDoc={`<html><meta name="viewport" content="width=device-width, initial-scale=1" /><body style="font-family:system-ui;padding:12px;${isDarkPreview ? 'background:#020617;color:#e2e8f0;' : 'background:#fff;color:#0f172a;'}">${rendered.html || ''}</body></html>`}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-4">
            <CardHeader>
              <CardTitle>Actions</CardTitle>
              <CardDescription>Send, copy, export, and persist templates.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <label className="space-y-1 text-sm">
                <span className="text-slate-300">Send test to</span>
                <Input value={testRecipient} onChange={(e) => setTestRecipient(e.target.value)} placeholder="user@example.com" />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-slate-300">From override (optional)</span>
                <Input value={fromOverride} onChange={(e) => setFromOverride(e.target.value)} placeholder="agent@example.com" />
              </label>
              <div className="flex flex-col gap-2">
                <Button onClick={() => void sendTestEmail()} disabled={isSendingTest || !testRecipient}>
                  {isSendingTest ? 'Sending...' : 'Send Test Email'}
                </Button>
                <Button variant="outline" onClick={() => void copyRenderedHtml()}>
                  Copy Rendered HTML
                </Button>
                <Button variant="outline" onClick={exportTemplate}>
                  Export Template
                </Button>
                <Button onClick={() => void saveTemplate()} disabled={isSavingTemplate}>
                  {isSavingTemplate ? 'Saving...' : 'Save as Template'}
                </Button>
              </div>
              <div className="rounded-md border border-border bg-slate-950/30 p-3">
                <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">Saved templates</p>
                {templates.length === 0 ? (
                  <p className="text-xs text-slate-400">No templates found.</p>
                ) : (
                  <div className="space-y-1">
                    {templates.slice(0, 8).map((item) => (
                      <button
                        key={item.name}
                        type="button"
                        className="block w-full rounded border border-border px-2 py-1 text-left text-xs text-slate-200 hover:bg-slate-900"
                        onClick={() => {
                          setTemplateName(item.name);
                          setSubject(item.subject);
                        }}
                      >
                        {item.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}

function AdminLayout({
  active,
  onOpenDashboard,
  onOpenInboxes,
  onOpenWebhooks,
  onOpenTemplatePreview,
  onLogout,
  children,
}: {
  active: 'dashboard' | 'inboxes' | 'detail' | 'webhooks' | 'webhookDetail' | 'templatePreview';
  onOpenDashboard: () => void;
  onOpenInboxes: () => void;
  onOpenWebhooks: () => void;
  onOpenTemplatePreview: () => void;
  onLogout: () => void;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen md:flex">
      <aside className="flex flex-col border-b border-border bg-slate-950/60 p-4 md:min-h-screen md:w-64 md:border-b-0 md:border-r">
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
          <Button
            variant={active === 'webhooks' || active === 'webhookDetail' ? 'default' : 'outline'}
            className="w-full justify-start"
            onClick={onOpenWebhooks}
          >
            <Webhook className="mr-2 h-4 w-4" />
            Webhooks
          </Button>
          <Button
            variant={active === 'templatePreview' ? 'default' : 'outline'}
            className="w-full justify-start"
            onClick={onOpenTemplatePreview}
          >
            <FileCode2 className="mr-2 h-4 w-4" />
            Template Preview
          </Button>
        </nav>
        <div className="mt-auto border-t border-border pt-4">
          <p className="mb-2 text-xs text-slate-400">Signed in to admin session</p>
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
  const [webhookId, setWebhookId] = useState<string | null>(() =>
    parseWebhookIdFromPath(window.location.pathname)
  );
  const [isWebhooksView, setIsWebhooksView] = useState<boolean>(() =>
    isWebhooksPath(window.location.pathname)
  );
  const [isTemplatePreviewView, setIsTemplatePreviewView] = useState<boolean>(() =>
    isTemplatePreviewPath(window.location.pathname)
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
      setWebhookId(parseWebhookIdFromPath(window.location.pathname));
      setIsWebhooksView(isWebhooksPath(window.location.pathname));
      setIsTemplatePreviewView(isTemplatePreviewPath(window.location.pathname));
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
      setWebhookId(null);
      setIsWebhooksView(false);
      setIsTemplatePreviewView(false);
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
    setWebhookId(null);
    setIsWebhooksView(false);
    setIsTemplatePreviewView(false);
  }

  function handleBackFromInbox() {
    goToInboxesRoute();
    setInboxId(null);
    setIsInboxesView(true);
    setWebhookId(null);
    setIsWebhooksView(false);
    setIsTemplatePreviewView(false);
  }

  function handleOpenInboxes() {
    goToInboxesRoute();
    setInboxId(null);
    setIsInboxesView(true);
    setWebhookId(null);
    setIsWebhooksView(false);
    setIsTemplatePreviewView(false);
  }

  function handleBackFromInboxes() {
    goToAdminHome();
    setInboxId(null);
    setIsInboxesView(false);
    setWebhookId(null);
    setIsWebhooksView(false);
    setIsTemplatePreviewView(false);
  }

  function handleOpenWebhooks() {
    goToWebhooksRoute();
    setInboxId(null);
    setIsInboxesView(false);
    setWebhookId(null);
    setIsWebhooksView(true);
    setIsTemplatePreviewView(false);
  }

  function handleOpenWebhook(webhookIdValue: string) {
    goToWebhookDetailRoute(webhookIdValue);
    setInboxId(null);
    setIsInboxesView(false);
    setWebhookId(webhookIdValue);
    setIsWebhooksView(false);
    setIsTemplatePreviewView(false);
  }

  function handleBackFromWebhookDetail() {
    goToWebhooksRoute();
    setWebhookId(null);
    setIsWebhooksView(true);
    setIsTemplatePreviewView(false);
  }

  function handleOpenTemplatePreview() {
    goToTemplatePreviewRoute();
    setInboxId(null);
    setIsInboxesView(false);
    setWebhookId(null);
    setIsWebhooksView(false);
    setIsTemplatePreviewView(true);
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
        onOpenWebhooks={handleOpenWebhooks}
        onOpenTemplatePreview={handleOpenTemplatePreview}
        onLogout={handleLogout}
      >
        <InboxesPage onBack={handleBackFromInbox} initialInboxId={inboxId} />
      </AdminLayout>
    );
  }

  if (webhookId) {
    return (
      <AdminLayout
        active="webhookDetail"
        onOpenDashboard={handleBackFromInboxes}
        onOpenInboxes={handleOpenInboxes}
        onOpenWebhooks={handleOpenWebhooks}
        onOpenTemplatePreview={handleOpenTemplatePreview}
        onLogout={handleLogout}
      >
        <WebhookDetailPage webhookId={webhookId} onBack={handleBackFromWebhookDetail} />
      </AdminLayout>
    );
  }

  if (isWebhooksView) {
    return (
      <AdminLayout
        active="webhooks"
        onOpenDashboard={handleBackFromInboxes}
        onOpenInboxes={handleOpenInboxes}
        onOpenWebhooks={handleOpenWebhooks}
        onOpenTemplatePreview={handleOpenTemplatePreview}
        onLogout={handleLogout}
      >
        <WebhooksPage onBack={handleBackFromInboxes} onOpenWebhook={handleOpenWebhook} />
      </AdminLayout>
    );
  }

  if (isInboxesView) {
    return (
      <AdminLayout
        active="inboxes"
        onOpenDashboard={handleBackFromInboxes}
        onOpenInboxes={handleOpenInboxes}
        onOpenWebhooks={handleOpenWebhooks}
        onOpenTemplatePreview={handleOpenTemplatePreview}
        onLogout={handleLogout}
      >
        <InboxesPage onBack={handleBackFromInboxes} />
      </AdminLayout>
    );
  }

  if (isTemplatePreviewView) {
    return (
      <AdminLayout
        active="templatePreview"
        onOpenDashboard={handleBackFromInboxes}
        onOpenInboxes={handleOpenInboxes}
        onOpenWebhooks={handleOpenWebhooks}
        onOpenTemplatePreview={handleOpenTemplatePreview}
        onLogout={handleLogout}
      >
        <TemplatePreviewPage onBack={handleBackFromInboxes} />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      active="dashboard"
      onOpenDashboard={handleBackFromInboxes}
      onOpenInboxes={handleOpenInboxes}
      onOpenWebhooks={handleOpenWebhooks}
      onOpenTemplatePreview={handleOpenTemplatePreview}
      onLogout={handleLogout}
    >
      <Dashboard
        status={status}
        onLogout={handleLogout}
        onRefreshStatus={async () => fetchStatus()}
        onOpenInboxes={handleOpenInboxes}
        onOpenWebhooks={handleOpenWebhooks}
        onOpenTemplatePreview={handleOpenTemplatePreview}
      />
    </AdminLayout>
  );
}
