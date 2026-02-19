import { Router, Request, Response } from 'express';
import { InboxStore } from '../lib/inbox-store';

/**
 * Admin API routes for inbox management and analytics
 */
export function createAdminApiRouter(): Router {
  const router = Router();
  const store = new InboxStore();

  // Get all unique inboxes (email addresses that have received messages)
  router.get('/inboxes', (_req: Request, res: Response) => {
    try {
      const messages = store.listMessages({ limit: 10000 });

      // Group messages by recipient email address
      const inboxMap = new Map<
        string,
        { email: string; unreadCount: number; totalCount: number; lastMessageAt: string }
      >();

      for (const msg of messages) {
        for (const toEmail of msg.to) {
          if (!inboxMap.has(toEmail)) {
            inboxMap.set(toEmail, {
              email: toEmail,
              unreadCount: 0,
              totalCount: 0,
              lastMessageAt: msg.timestamp,
            });
          }

          const inbox = inboxMap.get(toEmail)!;
          inbox.totalCount++;
          if (!msg.read) {
            inbox.unreadCount++;
          }

          // Update last message timestamp if newer
          if (new Date(msg.timestamp) > new Date(inbox.lastMessageAt)) {
            inbox.lastMessageAt = msg.timestamp;
          }
        }
      }

      const inboxes = Array.from(inboxMap.values()).sort(
        (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
      );

      res.json({ ok: true, data: inboxes });
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: {
          code: 'SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }
  });

  // Get messages for a specific inbox
  router.get('/inboxes/:email/messages', (req: Request, res: Response) => {
    try {
      const email = String(req.params.email);
      const limit = parseInt(String(req.query.limit || '100'), 10) || 100;
      const offset = parseInt(String(req.query.offset || '0'), 10) || 0;

      // Get all messages and filter by recipient
      const allMessages = store.listMessages({ limit: 10000 });
      const filteredMessages = allMessages
        .filter((msg) => msg.to.includes(email))
        .slice(offset, offset + limit);

      res.json({
        ok: true,
        data: {
          messages: filteredMessages,
          total: allMessages.filter((msg) => msg.to.includes(email)).length,
          offset,
          limit,
        },
      });
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: {
          code: 'SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }
  });

  // Mark a message as read
  router.post('/messages/:id/read', (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const success = store.markAsRead(id);

      if (!success) {
        res.status(404).json({
          ok: false,
          error: { code: 'NOT_FOUND', message: 'Message not found' },
        });
        return;
      }

      res.json({ ok: true, data: { id, read: true } });
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: {
          code: 'SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }
  });

  // Get analytics data (email volume over time)
  router.get('/analytics', (req: Request, res: Response) => {
    try {
      const days = parseInt(String(req.query.days || '30'), 10) || 30;
      const allMessages = store.listMessages({ limit: 10000 });

      // Group messages by day
      const dailyStats = new Map<string, { date: string; sent: number; received: number }>();

      // Initialize last N days
      const now = new Date();
      for (let i = 0; i < days; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        dailyStats.set(dateStr, { date: dateStr, sent: 0, received: 0 });
      }

      // Count messages per day
      for (const msg of allMessages) {
        const dateStr = new Date(msg.timestamp).toISOString().split('T')[0];

        if (dailyStats.has(dateStr)) {
          const stats = dailyStats.get(dateStr)!;
          stats.received++; // All messages in inbox are received
        }
      }

      // Convert to array and sort by date
      const analytics = Array.from(dailyStats.values()).sort((a, b) =>
        a.date.localeCompare(b.date)
      );

      // Calculate totals
      const totals = {
        totalReceived: allMessages.length,
        totalSent: 0, // We don't track sent messages in inbox yet
        unreadCount: allMessages.filter((msg) => !msg.read).length,
      };

      res.json({
        ok: true,
        data: {
          daily: analytics,
          totals,
        },
      });
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: {
          code: 'SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }
  });

  return router;
}
