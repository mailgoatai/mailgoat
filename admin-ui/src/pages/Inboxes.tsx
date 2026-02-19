import { useEffect, useMemo, useState } from 'react';
import { Inbox, Mail, Paperclip } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

type InboxRow = {
  id: string;
  name: string;
  emailCount: number;
  lastActivity: string | null;
};

type InboxEmail = {
  id: string;
  from: string;
  subject: string;
  date: string | null;
  to: string;
  status: string;
  body: {
    text: string;
    html: string | null;
  };
};

type InboxesResponse = {
  ok: boolean;
  data?: { inboxes: InboxRow[] };
  error?: { message?: string };
};

type EmailsResponse = {
  ok: boolean;
  data?: { inboxId: string; emails: InboxEmail[] };
  error?: { message?: string };
};

function formatDate(date: string | null): string {
  if (!date) return '-';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleString();
}

function EmailContent({ email }: { email: InboxEmail }) {
  return (
    <div className="space-y-5">
      <div className="space-y-2 rounded-lg border border-border bg-slate-950/40 p-4">
        <h2 className="text-xl font-semibold text-slate-100">{email.subject || '(no subject)'}</h2>
        <div className="space-y-1 text-sm text-slate-300">
          <p>
            <span className="text-slate-400">From:</span> {email.from || '-'}
          </p>
          <p>
            <span className="text-slate-400">To:</span> {email.to || '-'}
          </p>
          <p>
            <span className="text-slate-400">Date:</span> {formatDate(email.date)}
          </p>
          <p>
            <span className="text-slate-400">Status:</span> {email.status || '-'}
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-slate-950/40 p-4">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Body</h3>
        {email.body.html ? (
          <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: email.body.html }} />
        ) : (
          <pre className="whitespace-pre-wrap break-words text-sm text-slate-200">
            {email.body.text || '(no body available)'}
          </pre>
        )}
      </div>
    </div>
  );
}

export function InboxesPage() {
  const [inboxes, setInboxes] = useState<InboxRow[]>([]);
  const [selectedInboxId, setSelectedInboxId] = useState<string | null>(null);
  const [emails, setEmails] = useState<InboxEmail[]>([]);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [isLoadingInboxes, setIsLoadingInboxes] = useState(true);
  const [isLoadingEmails, setIsLoadingEmails] = useState(false);
  const [inboxesError, setInboxesError] = useState<string | null>(null);
  const [emailsError, setEmailsError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function fetchInboxes() {
      setIsLoadingInboxes(true);
      setInboxesError(null);
      try {
        const response = await fetch('/api/admin/inboxes', { credentials: 'include' });
        const payload = (await response.json()) as InboxesResponse;
        if (!response.ok || !payload.ok || !payload.data) {
          throw new Error(payload.error?.message || 'Failed to load inboxes');
        }
        if (!active) return;
        setInboxes(payload.data.inboxes);
        setSelectedInboxId((current) => current || payload.data?.inboxes[0]?.id || null);
      } catch (error) {
        if (!active) return;
        const message = error instanceof Error ? error.message : 'Failed to load inboxes';
        setInboxesError(message);
        toast.error(message);
      } finally {
        if (active) setIsLoadingInboxes(false);
      }
    }

    void fetchInboxes();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function fetchEmails() {
      if (!selectedInboxId) {
        setEmails([]);
        setSelectedEmailId(null);
        return;
      }

      setIsLoadingEmails(true);
      setEmailsError(null);

      try {
        const response = await fetch(`/api/admin/inboxes/${encodeURIComponent(selectedInboxId)}/emails`, {
          credentials: 'include',
        });
        const payload = (await response.json()) as EmailsResponse;
        if (!response.ok || !payload.ok || !payload.data) {
          throw new Error(payload.error?.message || 'Failed to load inbox emails');
        }
        if (!active) return;
        setEmails(payload.data.emails);
        setSelectedEmailId(payload.data.emails[0]?.id || null);
      } catch (error) {
        if (!active) return;
        const message = error instanceof Error ? error.message : 'Failed to load inbox emails';
        setEmailsError(message);
        setEmails([]);
        setSelectedEmailId(null);
        toast.error(message);
      } finally {
        if (active) setIsLoadingEmails(false);
      }
    }

    void fetchEmails();
    return () => {
      active = false;
    };
  }, [selectedInboxId]);

  const selectedInbox = useMemo(
    () => inboxes.find((inbox) => inbox.id === selectedInboxId) || null,
    [inboxes, selectedInboxId]
  );
  const selectedEmail = emails.find((email) => email.id === selectedEmailId) || null;

  return (
    <section className="grid h-[calc(100vh-14rem)] gap-4 md:grid-cols-3" aria-label="Inboxes">
      <Card className="overflow-hidden md:col-span-1">
        <CardHeader className="border-b border-border p-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Inbox className="h-4 w-4 text-primary" /> Inboxes ({inboxes.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="h-full overflow-y-auto p-0">
          {isLoadingInboxes ? (
            <p className="p-4 text-sm text-slate-400">Loading inboxes...</p>
          ) : inboxesError ? (
            <p className="p-4 text-sm text-red-300">{inboxesError}</p>
          ) : inboxes.length === 0 ? (
            <p className="p-4 text-sm text-slate-400">No inboxes found.</p>
          ) : (
            inboxes.map((inbox) => (
              <button
                key={inbox.id}
                type="button"
                onClick={() => setSelectedInboxId(inbox.id)}
                className={`w-full border-b border-border p-4 text-left transition-colors ${
                  selectedInboxId === inbox.id ? 'bg-cyan-950/30' : 'hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium text-slate-100">{inbox.name}</p>
                  <Badge>{inbox.emailCount}</Badge>
                </div>
                <p className="mt-1 text-xs text-slate-500">Last activity: {formatDate(inbox.lastActivity)}</p>
              </button>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden md:col-span-1">
        <CardHeader className="border-b border-border p-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="h-4 w-4 text-primary" />
            {selectedInbox ? `${selectedInbox.name} (${emails.length})` : 'Emails'}
          </CardTitle>
        </CardHeader>
        <CardContent className="h-full overflow-y-auto p-0">
          {isLoadingEmails ? (
            <p className="p-4 text-sm text-slate-400">Loading inbox emails...</p>
          ) : emailsError ? (
            <p className="p-4 text-sm text-red-300">{emailsError}</p>
          ) : emails.length === 0 ? (
            <p className="p-4 text-sm text-slate-400">No emails found for this inbox.</p>
          ) : (
            emails.map((email) => (
              <button
                key={email.id}
                type="button"
                onClick={() => setSelectedEmailId(email.id)}
                className={`w-full border-b border-border p-4 text-left transition-colors ${
                  selectedEmailId === email.id ? 'bg-cyan-950/30' : 'hover:bg-slate-900/60'
                }`}
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium text-slate-100">{email.from || '(unknown sender)'}</p>
                  <span className="text-xs text-slate-500">{formatDate(email.date)}</span>
                </div>
                <p className="truncate text-sm text-slate-200">{email.subject || '(no subject)'}</p>
              </button>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden md:col-span-1">
        <CardHeader className="border-b border-border p-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Paperclip className="h-4 w-4 text-primary" /> Email Details
          </CardTitle>
        </CardHeader>
        <CardContent className="h-full overflow-y-auto p-4">
          {selectedEmail ? (
            <EmailContent email={selectedEmail} />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-slate-400">
              Select an email to view details.
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
