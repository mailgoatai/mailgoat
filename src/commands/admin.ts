import { Command } from 'commander';
import express, { Request, Response, NextFunction } from 'express';
import session from 'express-session';
import rateLimit from 'express-rate-limit';
import * as path from 'path';
import * as fs from 'fs';
import { timingSafeEqual } from 'crypto';
import chalk from 'chalk';
import { InboxStore, type InboxMessage } from '../lib/inbox-store';
import { Pool } from 'pg';

declare module 'express-session' {
  interface SessionData {
    authenticated: boolean;
  }
}

function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (req.session.authenticated) {
    next();
    return;
  }

  res.status(401).json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Login required' } });
}

const loginLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      ok: false,
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many login attempts. Please try again later.',
        details: { maxAttemptsPerHour: 5 },
      },
    });
  },
});

const adminApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

function secureCompare(input: string, expected: string): boolean {
  const a = Buffer.from(input, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}

function addSecurityHeaders(req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; object-src 'none'; frame-ancestors 'none'; base-uri 'self'"
  );
  if (req.secure || process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
}

function buildStatusPayload() {
  return {
    service: 'mailgoat-admin',
    version: '1.1.8',
    uptimeSeconds: Math.floor(process.uptime()),
    checkedAt: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    rateLimit: {
      maxAttemptsPerHour: 5,
      windowSeconds: 3600,
    },
  };
}

type AdminInboxMessage = {
  id: string;
  from: string;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  date: string;
  read: boolean;
  preview: string;
  body: {
    text: string;
    html: string | null;
  };
  attachments: Array<{ filename: string; size: number; contentType: string }>;
};

type AdminEmailExportFormat = 'json' | 'csv';

type AdminInboxSummary = {
  id: string;
  address: string;
  name: string;
  messageCount: number;
  lastMessageAt: string | null;
};

type PostalInboxRow = {
  address: string | null;
  name: string | null;
  message_count: number | string | null;
  last_message_at: string | Date | null;
};

export function normalizeInboxId(rawInboxId: string): string {
  return decodeURIComponent(rawInboxId || '')
    .trim()
    .toLowerCase();
}

export function matchesInboxIdentifier(message: InboxMessage, inboxId: string): boolean {
  const normalizedInboxId = normalizeInboxId(inboxId);
  if (!normalizedInboxId) {
    return false;
  }

  const localPart = normalizedInboxId.split('@')[0];
  return message.to.some((recipient) => {
    const normalizedRecipient = String(recipient || '')
      .trim()
      .toLowerCase();
    if (normalizedRecipient === normalizedInboxId) {
      return true;
    }
    if (!normalizedRecipient.includes('@') && normalizedRecipient === localPart) {
      return true;
    }
    return normalizedRecipient.split('@')[0] === localPart;
  });
}

export function mapInboxMessageToAdminMessage(message: InboxMessage): AdminInboxMessage {
  return {
    id: message.id,
    from: message.from,
    to: message.to,
    cc: [],
    bcc: [],
    subject: message.subject,
    date: message.timestamp,
    read: message.read,
    preview: message.snippet || '',
    body: {
      text: message.snippet || '',
      html: null,
    },
    attachments: [],
  };
}

function normalizeEmailIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const unique = new Set<string>();
  for (const item of raw) {
    const value = String(item || '').trim();
    if (value) {
      unique.add(value);
    }
  }
  return Array.from(unique);
}

function toCsv(messages: AdminInboxMessage[]): string {
  const escapeValue = (value: string): string => `"${value.replace(/"/g, '""')}"`;
  const header = ['id', 'from', 'to', 'subject', 'date', 'read', 'preview'];
  const rows = messages.map((message) => [
    message.id,
    message.from || '',
    message.to.join(';'),
    message.subject || '',
    message.date || '',
    String(message.read),
    message.preview || '',
  ]);
  return [header, ...rows]
    .map((row) => row.map((cell) => escapeValue(String(cell))).join(','))
    .join('\n');
}

function inferNameFromAddress(address: string): string {
  const localPart = String(address || '')
    .trim()
    .split('@')[0];
  return localPart || 'Inbox';
}

function buildDbPoolFromEnv(): Pool | null {
  const databaseUrl = process.env.POSTAL_DATABASE_URL;
  if (databaseUrl) {
    return new Pool({ connectionString: databaseUrl });
  }

  const host = process.env.POSTAL_DB_HOST;
  const database = process.env.POSTAL_DB_NAME;
  const user = process.env.POSTAL_DB_USER || process.env.POSTAL_DB_USERNAME;
  const password = process.env.POSTAL_DB_PASSWORD;
  const port = Number(process.env.POSTAL_DB_PORT || 5432);

  if (!host || !database || !user) {
    return null;
  }

  return new Pool({ host, database, user, password, port });
}

async function listInboxesFromPostalDb(): Promise<AdminInboxSummary[]> {
  const pool = buildDbPoolFromEnv();
  if (!pool) {
    return [];
  }

  try {
    const query = `
      SELECT
        COALESCE(mailbox.email, mailbox.address, mailbox.local_part || '@' || domain.name) AS address,
        COALESCE(mailbox.name, split_part(COALESCE(mailbox.email, mailbox.address, mailbox.local_part || '@' || domain.name), '@', 1)) AS name,
        COALESCE(msg_counts.message_count, 0)::int AS message_count,
        msg_counts.last_message_at
      FROM mailboxes AS mailbox
      LEFT JOIN domains AS domain ON domain.id = mailbox.domain_id
      LEFT JOIN (
        SELECT
          lower(trim(rcpt_to)) AS recipient,
          COUNT(*)::int AS message_count,
          MAX(created_at) AS last_message_at
        FROM messages
        WHERE rcpt_to IS NOT NULL AND trim(rcpt_to) <> ''
        GROUP BY lower(trim(rcpt_to))
      ) AS msg_counts
        ON msg_counts.recipient = lower(trim(COALESCE(mailbox.email, mailbox.address, mailbox.local_part || '@' || domain.name)))
      ORDER BY msg_counts.message_count DESC, address ASC
    `;

    const result = await pool.query<PostalInboxRow>(query);
    return result.rows
      .map((row: PostalInboxRow) => {
        const address = String(row.address || '')
          .trim()
          .toLowerCase();
        if (!address) {
          return null;
        }
        return {
          id: address,
          address,
          name:
            String(row.name || inferNameFromAddress(address)).trim() ||
            inferNameFromAddress(address),
          messageCount: Number(row.message_count || 0),
          lastMessageAt: row.last_message_at ? new Date(row.last_message_at).toISOString() : null,
        } satisfies AdminInboxSummary;
      })
      .filter((item: AdminInboxSummary | null): item is AdminInboxSummary => Boolean(item));
  } finally {
    await pool.end();
  }
}

function listInboxesFromLocalStore(): AdminInboxSummary[] {
  const store = new InboxStore();
  try {
    const grouped = new Map<string, AdminInboxSummary>();
    const messages = store.listMessages({ limit: 5000 });

    for (const message of messages) {
      const recipients = Array.isArray(message.to) ? message.to : [];
      for (const recipient of recipients) {
        const address = String(recipient || '')
          .trim()
          .toLowerCase();
        if (!address) {
          continue;
        }

        const existing = grouped.get(address);
        const timestamp = message.timestamp ? new Date(message.timestamp).toISOString() : null;

        if (!existing) {
          grouped.set(address, {
            id: address,
            address,
            name: inferNameFromAddress(address),
            messageCount: 1,
            lastMessageAt: timestamp,
          });
          continue;
        }

        existing.messageCount += 1;
        if (timestamp && (!existing.lastMessageAt || timestamp > existing.lastMessageAt)) {
          existing.lastMessageAt = timestamp;
        }
      }
    }

    return Array.from(grouped.values()).sort((a, b) => {
      if (b.messageCount !== a.messageCount) {
        return b.messageCount - a.messageCount;
      }
      return a.address.localeCompare(b.address);
    });
  } finally {
    store.close();
  }
}

export function createAdminCommand(): Command {
  const cmd = new Command('admin').description('Manage admin panel with authentication');

  cmd
    .command('serve')
    .description('Run admin panel web server with authentication')
    .option('--host <host>', 'Host to bind', '127.0.0.1')
    .option('--port <port>', 'Port to listen on', '3001')
    .option('--password <password>', 'Admin password (or set ADMIN_PASSWORD env var)')
    .option('--session-secret <secret>', 'Session secret (or set SESSION_SECRET env var)')
    .action((options) => {
      const host = String(options.host || '127.0.0.1');
      const port = parseInt(options.port, 10);

      const adminPassword = options.password || process.env.ADMIN_PASSWORD;
      if (!adminPassword) {
        console.error(
          chalk.red('Error: Admin password not set. Use --password or ADMIN_PASSWORD env var')
        );
        process.exit(1);
      }
      if (String(adminPassword).length < 12) {
        console.error(chalk.red('Error: admin password must be at least 12 characters long.'));
        process.exit(1);
      }

      const sessionSecret = options.sessionSecret || process.env.SESSION_SECRET;
      if (!sessionSecret) {
        console.error(
          chalk.red('Error: SESSION_SECRET not set. Use --session-secret or SESSION_SECRET env var')
        );
        process.exit(1);
      }
      if (String(sessionSecret).length < 32) {
        console.error(chalk.red('Error: SESSION_SECRET must be at least 32 characters.'));
        process.exit(1);
      }

      const distPath = path.resolve(process.cwd(), 'admin-ui', 'dist');
      if (!fs.existsSync(distPath)) {
        console.error(
          chalk.red('Error: admin-ui/dist not found. Run `npm run admin:ui:build` first.')
        );
        process.exit(1);
      }

      const app = express();
      app.disable('x-powered-by');
      app.set('trust proxy', 1);
      app.use(express.json());
      app.use(express.urlencoded({ extended: true }));
      app.use(addSecurityHeaders);
      app.use('/api/admin', adminApiLimiter);

      app.use(
        session({
          secret: sessionSecret,
          resave: false,
          saveUninitialized: false,
          cookie: {
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000,
            sameSite: 'strict',
          },
        })
      );

      app.post('/admin/login', loginLimiter, (req: Request, res: Response) => {
        const password = String(req.body?.password || '');
        if (!secureCompare(password, String(adminPassword))) {
          res.status(401).json({
            ok: false,
            error: { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' },
          });
          return;
        }

        req.session.regenerate((err) => {
          if (err) {
            res.status(500).json({
              ok: false,
              error: { code: 'SESSION_ERROR', message: 'Failed to establish session' },
            });
            return;
          }
          req.session.authenticated = true;
          res.json({ ok: true, data: { authenticated: true } });
        });
      });

      app.post('/admin/logout', (req: Request, res: Response) => {
        req.session.destroy((err) => {
          if (err) {
            res.status(500).json({
              ok: false,
              error: { code: 'LOGOUT_FAILED', message: 'Failed to logout' },
            });
            return;
          }
          res.json({ ok: true, data: { loggedOut: true } });
        });
      });

      app.get('/api/admin/status', requireAuth, (_req: Request, res: Response) => {
        res.json({ ok: true, data: buildStatusPayload() });
      });

      app.get('/api/admin/inboxes', requireAuth, async (_req: Request, res: Response) => {
        try {
          let inboxes = await listInboxesFromPostalDb();
          if (inboxes.length === 0) {
            inboxes = listInboxesFromLocalStore();
          }
          res.json({ ok: true, data: { inboxes } });
        } catch (error) {
          res.status(500).json({
            ok: false,
            error: {
              code: 'INBOXES_FETCH_FAILED',
              message:
                error instanceof Error
                  ? error.message
                  : 'Failed to fetch inboxes from data sources',
            },
          });
        }
      });

      app.get('/api/admin/inbox/:id/messages', requireAuth, (req: Request, res: Response) => {
        const inboxId = normalizeInboxId(String(req.params.id || ''));
        if (!inboxId) {
          res.status(400).json({
            ok: false,
            error: { code: 'INVALID_INBOX_ID', message: 'Inbox id is required' },
          });
          return;
        }

        const store = new InboxStore();
        try {
          const messages = store
            .listMessages({ limit: 500 })
            .filter((message) => matchesInboxIdentifier(message, inboxId))
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .map(mapInboxMessageToAdminMessage);

          res.json({ ok: true, data: { inboxId, messages } });
        } catch (error) {
          res.status(500).json({
            ok: false,
            error: {
              code: 'INBOX_MESSAGES_FETCH_FAILED',
              message:
                error instanceof Error
                  ? error.message
                  : 'Failed to fetch inbox messages from local cache',
            },
          });
        } finally {
          store.close();
        }
      });

      app.delete('/api/admin/email/:id', requireAuth, (req: Request, res: Response) => {
        const id = String(req.params.id || '').trim();
        if (!id) {
          res.status(400).json({
            ok: false,
            error: { code: 'INVALID_EMAIL_ID', message: 'Email id is required' },
          });
          return;
        }

        const store = new InboxStore();
        try {
          const deleted = store.deleteMessage(id);
          if (!deleted) {
            res.status(404).json({
              ok: false,
              error: { code: 'EMAIL_NOT_FOUND', message: 'Email not found' },
            });
            return;
          }
          res.json({ ok: true, data: { deleted: true, deletedCount: 1 } });
        } catch (error) {
          res.status(500).json({
            ok: false,
            error: {
              code: 'EMAIL_DELETE_FAILED',
              message: error instanceof Error ? error.message : 'Failed to delete email',
            },
          });
        } finally {
          store.close();
        }
      });

      app.post('/api/admin/emails/bulk-delete', requireAuth, (req: Request, res: Response) => {
        const emailIds = normalizeEmailIds(req.body?.emailIds);
        if (emailIds.length === 0) {
          res.status(400).json({
            ok: false,
            error: { code: 'INVALID_EMAIL_IDS', message: 'emailIds must contain at least one id' },
          });
          return;
        }

        const store = new InboxStore();
        try {
          const deletedCount = store.deleteMessages(emailIds);
          res.json({
            ok: true,
            data: { deleted: true, deletedCount, requestedCount: emailIds.length },
          });
        } catch (error) {
          res.status(500).json({
            ok: false,
            error: {
              code: 'EMAIL_BULK_DELETE_FAILED',
              message: error instanceof Error ? error.message : 'Failed to delete selected emails',
            },
          });
        } finally {
          store.close();
        }
      });

      app.post('/api/admin/emails/export', requireAuth, (req: Request, res: Response) => {
        const emailIds = normalizeEmailIds(req.body?.emailIds);
        const format = String(req.body?.format || 'json').toLowerCase() as AdminEmailExportFormat;
        if (emailIds.length === 0) {
          res.status(400).json({
            ok: false,
            error: { code: 'INVALID_EMAIL_IDS', message: 'emailIds must contain at least one id' },
          });
          return;
        }
        if (format !== 'json' && format !== 'csv') {
          res.status(400).json({
            ok: false,
            error: { code: 'INVALID_EXPORT_FORMAT', message: "format must be 'json' or 'csv'" },
          });
          return;
        }

        const store = new InboxStore();
        try {
          const selected = store
            .listMessages({ limit: 10000 })
            .filter((message) => emailIds.includes(message.id))
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .map(mapInboxMessageToAdminMessage);

          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          if (format === 'csv') {
            const csv = toCsv(selected);
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader(
              'Content-Disposition',
              `attachment; filename="mailgoat-export-${timestamp}.csv"`
            );
            res.send(csv);
            return;
          }

          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.setHeader(
            'Content-Disposition',
            `attachment; filename="mailgoat-export-${timestamp}.json"`
          );
          res.send(
            JSON.stringify(
              {
                exportedAt: new Date().toISOString(),
                count: selected.length,
                messages: selected,
              },
              null,
              2
            )
          );
        } catch (error) {
          res.status(500).json({
            ok: false,
            error: {
              code: 'EMAIL_EXPORT_FAILED',
              message: error instanceof Error ? error.message : 'Failed to export selected emails',
            },
          });
        } finally {
          store.close();
        }
      });

      app.use('/assets', express.static(path.join(distPath, 'assets')));
      app.use(express.static(distPath));

      app.get(['/admin', '/admin/*'], (_req: Request, res: Response) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });

      app.get('/', (_req: Request, res: Response) => {
        res.redirect('/admin');
      });

      app.use((_req: Request, res: Response) => {
        res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: 'Not found' } });
      });

      app.listen(port, host, () => {
        console.log(chalk.green('Admin panel server started'));
        console.log(chalk.gray(`  URL: http://${host}:${port}/admin`));
      });
    });

  return cmd;
}
