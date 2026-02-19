import { useEffect, useState } from 'react';
import { Mail, Inbox as InboxIcon, Clock, Eye } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { toast } from 'sonner';

interface Inbox {
  email: string;
  unreadCount: number;
  totalCount: number;
  lastMessageAt: string;
}

interface Message {
  id: string;
  from: string;
  to: string[];
  subject: string;
  timestamp: string;
  read: boolean;
  snippet?: string;
}

export function InboxesView() {
  const [inboxes, setInboxes] = useState<Inbox[]>([]);
  const [selectedInbox, setSelectedInbox] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInboxes();
  }, []);

  useEffect(() => {
    if (selectedInbox) {
      loadMessages(selectedInbox);
    }
  }, [selectedInbox]);

  async function loadInboxes() {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/inboxes', { credentials: 'include' });
      const data = await response.json();
      
      if (!response.ok || !data.ok) {
        throw new Error(data.error?.message || 'Failed to load inboxes');
      }
      
      setInboxes(data.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load inboxes');
    } finally {
      setLoading(false);
    }
  }

  async function loadMessages(email: string) {
    try {
      const response = await fetch(`/api/admin/inboxes/${encodeURIComponent(email)}/messages`, {
        credentials: 'include',
      });
      const data = await response.json();
      
      if (!response.ok || !data.ok) {
        throw new Error(data.error?.message || 'Failed to load messages');
      }
      
      setMessages(data.data.messages);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load messages');
    }
  }

  async function markAsRead(messageId: string) {
    try {
      const response = await fetch(`/api/admin/messages/${messageId}/read`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await response.json();
      
      if (!response.ok || !data.ok) {
        throw new Error(data.error?.message || 'Failed to mark as read');
      }
      
      // Update local state
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, read: true } : msg
      ));
      
      // Reload inboxes to update unread counts
      loadInboxes();
      
      toast.success('Marked as read');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to mark as read');
    }
  }

  function formatDate(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading inboxes...</p>
      </div>
    );
  }

  if (inboxes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <InboxIcon className="h-16 w-16 text-muted-foreground/50" />
        <div className="text-center">
          <h3 className="text-lg font-semibold">No Inboxes Found</h3>
          <p className="text-sm text-muted-foreground">
            Inboxes will appear here once you start receiving emails.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex">
      {/* Inboxes List */}
      <div className="w-80 border-r border-border overflow-y-auto">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold">Inboxes</h2>
          <p className="text-sm text-muted-foreground">{inboxes.length} active</p>
        </div>
        
        <div className="p-2 space-y-1">
          {inboxes.map((inbox) => (
            <button
              key={inbox.email}
              onClick={() => setSelectedInbox(inbox.email)}
              className={`w-full text-left p-3 rounded-lg hover:bg-accent transition-colors ${
                selectedInbox === inbox.email ? 'bg-accent' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{inbox.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">
                      {inbox.totalCount} messages
                    </span>
                    {inbox.unreadCount > 0 && (
                      <Badge variant="default" className="text-xs">
                        {inbox.unreadCount} new
                      </Badge>
                    )}
                  </div>
                </div>
                <Clock className="h-3 w-3 text-muted-foreground mt-1" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {formatDate(inbox.lastMessageAt)}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto">
        {!selectedInbox ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Mail className="h-12 w-12 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-muted-foreground">Select an inbox to view messages</p>
            </div>
          </div>
        ) : (
          <div>
            <div className="p-4 border-b border-border">
              <h2 className="text-lg font-semibold">{selectedInbox}</h2>
              <p className="text-sm text-muted-foreground">{messages.length} messages</p>
            </div>
            
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <p className="text-muted-foreground">No messages found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead className="w-40">Date</TableHead>
                    <TableHead className="w-24"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {messages.map((message) => (
                    <TableRow key={message.id} className={message.read ? 'opacity-60' : ''}>
                      <TableCell>
                        <Mail className={`h-4 w-4 ${message.read ? 'text-muted-foreground' : 'text-primary'}`} />
                      </TableCell>
                      <TableCell className="font-medium">{message.from}</TableCell>
                      <TableCell>
                        <div>
                          <p className={message.read ? 'font-normal' : 'font-semibold'}>
                            {message.subject || '(no subject)'}
                          </p>
                          {message.snippet && (
                            <p className="text-xs text-muted-foreground truncate">
                              {message.snippet}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(message.timestamp)}
                      </TableCell>
                      <TableCell>
                        {!message.read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAsRead(message.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
