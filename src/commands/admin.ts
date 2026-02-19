import { Command } from 'commander';
import express, { Request, Response, NextFunction } from 'express';
import session from 'express-session';
import rateLimit from 'express-rate-limit';
import * as path from 'path';
import * as fs from 'fs';
import { timingSafeEqual } from 'crypto';
import chalk from 'chalk';
import { Pool } from 'pg';
import { InboxStore, type InboxMessage } from '../lib/inbox-store';

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

type PostalInboxRow = {
  id: string;
  name: string;
  email_count: number;
  last_activity: string | null;
};

type PostalEmailRow = {
  id: string;
  from_email: string;
  subject: string;
  created_at: string | null;
  to_email: string | null;
  body_text: string | null;
  body_html: string | null;
  status: string | null;
};

let postalPool: Pool | null = null;

function getPostalPool(): Pool {
  if (postalPool) {
    return postalPool;
  }

  const connectionString = process.env.POSTAL_DB_URL;
  if (!connectionString) {
    throw new Error('POSTAL_DB_URL is not set');
  }

  postalPool = new Pool({
    connectionString,
    max: 10,
    ssl: process.env.POSTAL_DB_SSL === '1' ? { rejectUnauthorized: false } : undefined,
  });

  return postalPool;
}

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

      app.get('/api/admin/inboxes', requireAuth, async (_req: Request, res: Response) => {
        try {
          const pool = getPostalPool();
          const query = `
            SELECT
              mb.id::text AS id,
              COALESCE(NULLIF(mb.name, ''), NULLIF(mb.email, ''), NULLIF(mb.address, ''), mb.id::text) AS name,
              COUNT(msg.id)::int AS email_count,
              MAX(msg.created_at)::text AS last_activity
            FROM mailboxes mb
            LEFT JOIN messages msg ON msg.mailbox_id = mb.id
            GROUP BY mb.id, mb.name, mb.email, mb.address
            ORDER BY name ASC
          `;

          const result = await pool.query<PostalInboxRow>(query);
          res.json({
            ok: true,
            data: {
              inboxes: result.rows.map((row) => ({
                id: row.id,
                name: row.name,
                emailCount: Number(row.email_count || 0),
                lastActivity: row.last_activity,
              })),
            },
          });
        } catch (error) {
          res.status(500).json({
            ok: false,
            error: {
              code: 'INBOXES_FETCH_FAILED',
              message:
                error instanceof Error
                  ? error.message
                  : 'Failed to fetch inboxes from Postal database',
            },
          });
        }
      });

      app.get('/api/admin/inboxes/:id/emails', requireAuth, async (req: Request, res: Response) => {
        const inboxId = String(req.params.id || '').trim();
        if (!inboxId) {
          res.status(400).json({
            ok: false,
            error: { code: 'INVALID_INBOX_ID', message: 'Inbox id is required' },
          });
          return;
        }

        try {
          const pool = getPostalPool();
          const query = `
            SELECT
              msg.id::text AS id,
              COALESCE(msg.mail_from, '') AS from_email,
              COALESCE(msg.subject, '') AS subject,
              msg.created_at::text AS created_at,
              COALESCE(msg.rcpt_to, '') AS to_email,
              COALESCE(msg.plain_body, '') AS body_text,
              msg.html_body AS body_html,
              COALESCE(msg.status, '') AS status
            FROM messages msg
            WHERE msg.mailbox_id::text = $1
            ORDER BY msg.created_at DESC
            LIMIT 50
          `;

          const result = await pool.query<PostalEmailRow>(query, [inboxId]);
          res.json({
            ok: true,
            data: {
              inboxId,
              emails: result.rows.map((row) => ({
                id: row.id,
                from: row.from_email,
                subject: row.subject,
                date: row.created_at,
                to: row.to_email,
                status: row.status,
                body: {
                  text: row.body_text || '',
                  html: row.body_html || null,
                },
              })),
            },
          });
        } catch (error) {
          res.status(500).json({
            ok: false,
            error: {
              code: 'INBOX_EMAILS_FETCH_FAILED',
              message:
                error instanceof Error
                  ? error.message
                  : 'Failed to fetch inbox emails from Postal database',
            },
          });
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

      const shutdownPool = async () => {
        if (postalPool) {
          await postalPool.end();
          postalPool = null;
        }
      };

      process.once('SIGINT', () => {
        void shutdownPool();
      });
      process.once('SIGTERM', () => {
        void shutdownPool();
      });
    });

  return cmd;
}
