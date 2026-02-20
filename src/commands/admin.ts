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
import { ConfigManager } from '../lib/config';
import { PostalClient } from '../lib/postal-client';

declare module 'express-session' {
  interface SessionData {
    authenticated: boolean;
    authVersion?: number;
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

type AdminSettingsState = {
  postalDbUrl: string | null;
  sessionTimeoutMinutes: number;
  authVersion: number;
};

type AdminSettingsPayload = {
  postalDbUrl: string | null;
  postalDbUrlRedacted: string | null;
  postalConnectionOk: boolean;
  sessionTimeoutMinutes: number;
};

type AdminApiKeySummary = {
  id: string;
  name: string;
  maskedKey: string;
  createdAt: string | null;
  lastUsedAt: string | null;
  status: 'active' | 'revoked';
  permissions: Array<'send' | 'read' | 'admin'>;
};

type AdminApiKeyUsage = {
  keyId: string;
  totalRequests: number;
  lastUsedAt: string | null;
  requestsPerDay: Array<{ date: string; count: number }>;
  available: boolean;
};

type StorageByInboxRow = {
  inbox: string | null;
  total_size: number | string | null;
  message_count: number | string | null;
};

type StorageByMonthRow = {
  month: string | Date | null;
  total_size: number | string | null;
};

type StorageByAttachmentTypeRow = {
  attachment_type: string | null;
  total_size: number | string | null;
  attachment_count: number | string | null;
};

type LargestEmailRow = {
  id: string | null;
  subject: string | null;
  sender: string | null;
  recipient: string | null;
  created_at: string | Date | null;
  size: number | string | null;
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
    .map((row: any) => row.map((cell: any) => escapeValue(String(cell))).join(','))
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

function buildDbPoolFromSettings(settings: AdminSettingsState): Pool | null {
  const configuredDatabaseUrl = settings.postalDbUrl || process.env.POSTAL_DB_URL;
  if (configuredDatabaseUrl) {
    return new Pool({ connectionString: configuredDatabaseUrl });
  }
  return buildDbPoolFromEnv();
}

function redactConnectionString(rawValue: string | null): string | null {
  if (!rawValue) return null;
  try {
    const parsed = new URL(rawValue);
    if (parsed.password) {
      parsed.password = '***';
    }
    if (parsed.username) {
      parsed.username = parsed.username.slice(0, 2) + '***';
    }
    return parsed.toString();
  } catch {
    return '***';
  }
}

function hasConfirmation(input: unknown): boolean {
  return input === true;
}

function maskApiKey(value: string): string {
  const normalized = String(value || '').trim();
  if (!normalized) return '****';
  const last4 = normalized.slice(-4);
  const prefix = normalized.includes('_') ? normalized.split('_').slice(0, 2).join('_') : 'key';
  return `${prefix}_****${last4}`;
}

function normalizeApiScopes(raw: unknown): Array<'send' | 'read' | 'admin'> {
  const allowed = new Set(['send', 'read', 'admin']);
  const values = Array.isArray(raw) ? raw : [];
  const normalized = values
    .map((item) =>
      String(item || '')
        .trim()
        .toLowerCase()
    )
    .filter((item): item is 'send' | 'read' | 'admin' => allowed.has(item));
  return normalized.length > 0 ? normalized : ['send', 'read', 'admin'];
}

function ensureAuthenticatedVersion(
  req: Request,
  res: Response,
  settings: AdminSettingsState
): boolean {
  if (req.session.authVersion === settings.authVersion) {
    return true;
  }
  req.session.destroy(() => undefined);
  res.status(401).json({
    ok: false,
    error: { code: 'SESSION_EXPIRED', message: 'Session expired. Please login again.' },
  });
  return false;
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

    return Array.from(grouped.values()).sort((a: any, b: any) => {
      if (b.messageCount !== a.messageCount) {
        return b.messageCount - a.messageCount;
      }
      return a.address.localeCompare(b.address);
    });
  } finally {
    store.close();
  }
}

async function getInboxesForRealtimeEvents(): Promise<AdminInboxSummary[]> {
  const fromPostal = await listInboxesFromPostalDb();
  if (fromPostal.length > 0) {
    return fromPostal;
  }
  return listInboxesFromLocalStore();
}

function estimateMessageSize(message: InboxMessage): number {
  const subject = String(message.subject || '');
  const snippet = String(message.snippet || '');
  const from = String(message.from || '');
  const to = Array.isArray(message.to) ? message.to.join(',') : '';
  return Buffer.byteLength(`${from}\n${to}\n${subject}\n${snippet}`, 'utf8');
}

function buildStorageFallbackFromLocalStore() {
  const store = new InboxStore();
  try {
    const messages = store.listMessages({ limit: 10000 });
    const byInboxMap = new Map<string, { size: number; count: number }>();
    const byMonthMap = new Map<string, number>();
    const byAttachmentType = [{ type: 'unknown', totalSize: 0, count: 0 }];

    const largestEmails = messages
      .map((message) => {
        const size = estimateMessageSize(message);
        const inbox = message.to[0] || '(unknown)';
        const createdAt = new Date(message.timestamp);
        const month = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}`;

        const existing = byInboxMap.get(inbox) || { size: 0, count: 0 };
        existing.size += size;
        existing.count += 1;
        byInboxMap.set(inbox, existing);

        byMonthMap.set(month, (byMonthMap.get(month) || 0) + size);
        byAttachmentType[0].totalSize += 0;

        return {
          id: message.id,
          subject: message.subject || '(no subject)',
          from: message.from || '(unknown)',
          to: inbox,
          createdAt: message.timestamp,
          size,
        };
      })
      .sort((a: any, b: any) => b.size - a.size)
      .slice(0, 20);

    const byInbox = Array.from(byInboxMap.entries())
      .map(([inbox, values]) => ({
        inbox,
        totalSize: values.size,
        count: values.count,
      }))
      .sort((a: any, b: any) => b.totalSize - a.totalSize);

    const byMonth = Array.from(byMonthMap.entries())
      .map(([month, totalSize]) => ({ month, totalSize }))
      .sort((a: any, b: any) => (a.month < b.month ? 1 : -1))
      .slice(0, 12);

    const totalStorage = byInbox.reduce((sum: number, item: any) => sum + item.totalSize, 0);
    const totalMessages = byInbox.reduce((sum: number, item: any) => sum + item.count, 0);
    const oldEmailCount = messages.filter((message) => {
      const timestamp = new Date(message.timestamp).getTime();
      const ageMs = Date.now() - timestamp;
      return ageMs > 365 * 24 * 60 * 60 * 1000;
    }).length;

    return {
      totalStorage,
      totalMessages,
      byInbox,
      byMonth,
      byAttachmentType,
      largestEmails,
      cleanupSuggestions: {
        oldEmailsOverOneYear: oldEmailCount,
        largeEmailsOver5mb: largestEmails.filter((email) => email.size > 5 * 1024 * 1024).length,
        duplicateSubjects: Math.max(
          0,
          totalMessages - new Set(messages.map((m) => m.subject)).size
        ),
      },
      source: 'local-cache',
    };
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
      let currentAdminPassword = String(adminPassword);
      const apiKeyState = new Map<string, AdminApiKeySummary>();
      const settingsState: AdminSettingsState = {
        postalDbUrl: process.env.POSTAL_DB_URL || process.env.POSTAL_DATABASE_URL || null,
        sessionTimeoutMinutes: 24 * 60,
        authVersion: 1,
      };
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

      app.use((req: Request, res: Response, next: NextFunction) => {
        if (!req.session?.authenticated) {
          next();
          return;
        }
        if (!ensureAuthenticatedVersion(req, res, settingsState)) {
          return;
        }
        req.session.cookie.maxAge = settingsState.sessionTimeoutMinutes * 60 * 1000;
        next();
      });

      app.post('/admin/login', loginLimiter, (req: Request, res: Response) => {
        const password = String(req.body?.password || '');
        if (!secureCompare(password, currentAdminPassword)) {
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
          req.session.authVersion = settingsState.authVersion;
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

      app.get('/api/admin/storage', requireAuth, async (_req: Request, res: Response) => {
        const pool = buildDbPoolFromSettings(settingsState);
        if (!pool) {
          res.json({ ok: true, data: buildStorageFallbackFromLocalStore() });
          return;
        }

        try {
          const byInboxResult = await pool.query<StorageByInboxRow>(`
            SELECT
              lower(trim(COALESCE(rcpt_to, '(unknown)'))) AS inbox,
              COALESCE(SUM(COALESCE(size, 0)), 0)::bigint AS total_size,
              COUNT(*)::int AS message_count
            FROM messages
            GROUP BY lower(trim(COALESCE(rcpt_to, '(unknown)')))
            ORDER BY total_size DESC
            LIMIT 100
          `);

          const byMonthResult = await pool.query<StorageByMonthRow>(`
            SELECT
              DATE_TRUNC('month', created_at) AS month,
              COALESCE(SUM(COALESCE(size, 0)), 0)::bigint AS total_size
            FROM messages
            WHERE created_at IS NOT NULL
            GROUP BY DATE_TRUNC('month', created_at)
            ORDER BY month DESC
            LIMIT 12
          `);

          let byAttachmentTypeRows: Array<{
            type: string;
            totalSize: number;
            count: number;
          }> = [];
          try {
            const byAttachmentTypeResult = await pool.query<StorageByAttachmentTypeRow>(`
              SELECT
                COALESCE(content_type, 'unknown') AS attachment_type,
                COALESCE(SUM(COALESCE(size, 0)), 0)::bigint AS total_size,
                COUNT(*)::int AS attachment_count
              FROM attachments
              GROUP BY COALESCE(content_type, 'unknown')
              ORDER BY total_size DESC
            `);
            byAttachmentTypeRows = byAttachmentTypeResult.rows.map((row: any) => ({
              type: String(row.attachment_type || 'unknown'),
              totalSize: Number(row.total_size || 0),
              count: Number(row.attachment_count || 0),
            }));
          } catch {
            byAttachmentTypeRows = [];
          }

          const largestEmailsResult = await pool.query<LargestEmailRow>(`
            SELECT
              id::text AS id,
              COALESCE(subject, '(no subject)') AS subject,
              COALESCE(mail_from, '(unknown)') AS sender,
              COALESCE(rcpt_to, '(unknown)') AS recipient,
              created_at,
              COALESCE(size, 0)::bigint AS size
            FROM messages
            ORDER BY COALESCE(size, 0) DESC
            LIMIT 20
          `);

          const oldEmailCountResult = await pool.query<{ count: number | string }>(`
            SELECT COUNT(*)::int AS count
            FROM messages
            WHERE created_at < NOW() - INTERVAL '1 year'
          `);

          const largeEmailCountResult = await pool.query<{ count: number | string }>(`
            SELECT COUNT(*)::int AS count
            FROM messages
            WHERE COALESCE(size, 0) > 5 * 1024 * 1024
          `);

          const duplicateSubjectCountResult = await pool.query<{ count: number | string }>(`
            SELECT COALESCE(SUM(group_count) - COUNT(*), 0)::int AS count
            FROM (
              SELECT subject, COUNT(*)::int AS group_count
              FROM messages
              WHERE subject IS NOT NULL AND trim(subject) <> ''
              GROUP BY subject
              HAVING COUNT(*) > 1
            ) duplicated
          `);

          const byInbox = byInboxResult.rows.map((row: any) => ({
            inbox: String(row.inbox || '(unknown)'),
            totalSize: Number(row.total_size || 0),
            count: Number(row.message_count || 0),
          }));
          const byMonth = byMonthResult.rows
            .map((row: any) => ({
              month: row.month ? new Date(row.month).toISOString().slice(0, 7) : 'unknown',
              totalSize: Number(row.total_size || 0),
            }))
            .sort((a: any, b: any) => (a.month < b.month ? -1 : 1));

          const largestEmails = largestEmailsResult.rows.map((row: any) => ({
            id: String(row.id || ''),
            subject: String(row.subject || '(no subject)'),
            from: String(row.sender || '(unknown)'),
            to: String(row.recipient || '(unknown)'),
            createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
            size: Number(row.size || 0),
          }));

          const totalStorage = byInbox.reduce((sum: number, item: any) => sum + item.totalSize, 0);
          const totalMessages = byInbox.reduce((sum: number, item: any) => sum + item.count, 0);

          res.json({
            ok: true,
            data: {
              totalStorage,
              totalMessages,
              byInbox,
              byMonth,
              byAttachmentType: byAttachmentTypeRows,
              largestEmails,
              cleanupSuggestions: {
                oldEmailsOverOneYear: Number(oldEmailCountResult.rows[0]?.count || 0),
                largeEmailsOver5mb: Number(largeEmailCountResult.rows[0]?.count || 0),
                duplicateSubjects: Number(duplicateSubjectCountResult.rows[0]?.count || 0),
              },
              source: 'postal-db',
            },
          });
        } catch (error) {
          const fallback = buildStorageFallbackFromLocalStore();
          res.status(200).json({
            ok: true,
            data: {
              ...fallback,
              warning:
                error instanceof Error
                  ? `Postal DB query failed, using local cache fallback: ${error.message}`
                  : 'Postal DB query failed, using local cache fallback',
            },
          });
        } finally {
          await pool.end();
        }
      });

      app.get('/api/admin/settings', requireAuth, async (_req: Request, res: Response) => {
        let postalConnectionOk = false;
        const pool = buildDbPoolFromSettings(settingsState);
        if (pool) {
          try {
            await pool.query('SELECT 1');
            postalConnectionOk = true;
          } catch {
            postalConnectionOk = false;
          } finally {
            await pool.end();
          }
        }
        const payload: AdminSettingsPayload = {
          postalDbUrl: settingsState.postalDbUrl,
          postalDbUrlRedacted: redactConnectionString(settingsState.postalDbUrl),
          postalConnectionOk,
          sessionTimeoutMinutes: settingsState.sessionTimeoutMinutes,
        };
        res.json({ ok: true, data: payload });
      });

      app.post('/api/admin/settings/postal', requireAuth, async (req: Request, res: Response) => {
        if (!hasConfirmation(req.body?.confirm)) {
          res.status(400).json({
            ok: false,
            error: {
              code: 'CONFIRMATION_REQUIRED',
              message: 'Confirmation required to update Postal connection',
            },
          });
          return;
        }
        const dbUrl = String(req.body?.dbUrl || '').trim();
        if (!dbUrl) {
          res.status(400).json({
            ok: false,
            error: { code: 'INVALID_DB_URL', message: 'dbUrl is required' },
          });
          return;
        }
        const pool = new Pool({ connectionString: dbUrl });
        try {
          await pool.query('SELECT 1');
          settingsState.postalDbUrl = dbUrl;
          res.json({
            ok: true,
            data: {
              updated: true,
              postalDbUrlRedacted: redactConnectionString(settingsState.postalDbUrl),
              postalConnectionOk: true,
            },
          });
        } catch (error) {
          res.status(400).json({
            ok: false,
            error: {
              code: 'POSTAL_DB_CONNECTION_FAILED',
              message: error instanceof Error ? error.message : 'Failed to connect to Postal DB',
            },
          });
        } finally {
          await pool.end();
        }
      });

      app.post('/api/admin/settings/password', requireAuth, async (req: Request, res: Response) => {
        if (!hasConfirmation(req.body?.confirm)) {
          res.status(400).json({
            ok: false,
            error: {
              code: 'CONFIRMATION_REQUIRED',
              message: 'Confirmation required to change admin password',
            },
          });
          return;
        }
        const currentPassword = String(req.body?.currentPassword || '');
        const newPassword = String(req.body?.newPassword || '');
        if (!secureCompare(currentPassword, currentAdminPassword)) {
          res.status(401).json({
            ok: false,
            error: { code: 'INVALID_CREDENTIALS', message: 'Current password is incorrect' },
          });
          return;
        }
        if (newPassword.length < 12) {
          res.status(400).json({
            ok: false,
            error: {
              code: 'WEAK_PASSWORD',
              message: 'New password must be at least 12 characters long',
            },
          });
          return;
        }
        currentAdminPassword = newPassword;
        settingsState.authVersion += 1;
        res.json({ ok: true, data: { updated: true } });
      });

      app.post('/api/admin/settings/session', requireAuth, (req: Request, res: Response) => {
        if (!hasConfirmation(req.body?.confirm)) {
          res.status(400).json({
            ok: false,
            error: {
              code: 'CONFIRMATION_REQUIRED',
              message: 'Confirmation required to update session timeout',
            },
          });
          return;
        }
        const timeoutRaw = Number(req.body?.sessionTimeoutMinutes);
        if (!Number.isFinite(timeoutRaw) || timeoutRaw < 5 || timeoutRaw > 10080) {
          res.status(400).json({
            ok: false,
            error: {
              code: 'INVALID_SESSION_TIMEOUT',
              message: 'sessionTimeoutMinutes must be between 5 and 10080',
            },
          });
          return;
        }
        settingsState.sessionTimeoutMinutes = Math.floor(timeoutRaw);
        req.session.cookie.maxAge = settingsState.sessionTimeoutMinutes * 60 * 1000;
        res.json({
          ok: true,
          data: { updated: true, sessionTimeoutMinutes: settingsState.sessionTimeoutMinutes },
        });
      });

      app.post('/api/admin/settings/logout-all', requireAuth, (req: Request, res: Response) => {
        if (!hasConfirmation(req.body?.confirm)) {
          res.status(400).json({
            ok: false,
            error: {
              code: 'CONFIRMATION_REQUIRED',
              message: 'Confirmation required to logout all sessions',
            },
          });
          return;
        }
        settingsState.authVersion += 1;
        req.session.authenticated = true;
        req.session.authVersion = settingsState.authVersion;
        req.session.cookie.maxAge = settingsState.sessionTimeoutMinutes * 60 * 1000;
        res.json({ ok: true, data: { updated: true, loggedOutAll: true } });
      });

      app.get('/api/admin/api-keys', requireAuth, async (_req: Request, res: Response) => {
        try {
          const config = await new ConfigManager().load();
          const client = new PostalClient(config);
          const remoteKeys = await client.listApiCredentials();
          const activeIds = new Set<string>();

          for (const remoteKey of remoteKeys) {
            const id = String(remoteKey.id || '').trim();
            if (!id) continue;
            activeIds.add(id);
            const existing = apiKeyState.get(id);
            apiKeyState.set(id, {
              id,
              name: String(remoteKey.name || existing?.name || id),
              maskedKey: existing?.maskedKey || maskApiKey(id),
              createdAt: remoteKey.created_at || existing?.createdAt || null,
              lastUsedAt: existing?.lastUsedAt || null,
              status: 'active',
              permissions: existing?.permissions || ['send', 'read', 'admin'],
            });
          }

          for (const [id, record] of apiKeyState.entries()) {
            if (record.status === 'revoked' || !activeIds.has(id)) {
              apiKeyState.set(id, {
                ...record,
                status: activeIds.has(id) ? 'active' : record.status,
              });
            }
          }

          const apiKeys = Array.from(apiKeyState.values()).sort((a: any, b: any) => {
            const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return bCreated - aCreated;
          });

          res.json({ ok: true, data: { apiKeys } });
        } catch (error) {
          res.status(500).json({
            ok: false,
            error: {
              code: 'API_KEYS_FETCH_FAILED',
              message: error instanceof Error ? error.message : 'Failed to fetch API keys',
            },
          });
        }
      });

      app.post('/api/admin/api-keys', requireAuth, async (req: Request, res: Response) => {
        if (!hasConfirmation(req.body?.confirm)) {
          res.status(400).json({
            ok: false,
            error: {
              code: 'CONFIRMATION_REQUIRED',
              message: 'Confirmation required to create API key',
            },
          });
          return;
        }

        const name = String(req.body?.name || '').trim();
        if (!name) {
          res.status(400).json({
            ok: false,
            error: { code: 'INVALID_NAME', message: 'Key name is required' },
          });
          return;
        }

        try {
          const config = await new ConfigManager().load();
          const client = new PostalClient(config);
          const permissions = normalizeApiScopes(req.body?.permissions);
          const created = await client.createApiCredential(name, permissions);
          const summary: AdminApiKeySummary = {
            id: created.id,
            name,
            maskedKey: maskApiKey(created.key),
            createdAt: new Date().toISOString(),
            lastUsedAt: null,
            status: 'active',
            permissions,
          };
          apiKeyState.set(created.id, summary);

          res.json({
            ok: true,
            data: {
              created: true,
              apiKey: summary,
              fullKey: created.key,
              warning: 'Save this key now. You will not be able to view it again.',
            },
          });
        } catch (error) {
          res.status(500).json({
            ok: false,
            error: {
              code: 'API_KEY_CREATE_FAILED',
              message: error instanceof Error ? error.message : 'Failed to create API key',
            },
          });
        }
      });

      app.delete('/api/admin/api-keys/:id', requireAuth, async (req: Request, res: Response) => {
        if (!hasConfirmation(req.body?.confirm)) {
          res.status(400).json({
            ok: false,
            error: {
              code: 'CONFIRMATION_REQUIRED',
              message: 'Confirmation required to revoke API key',
            },
          });
          return;
        }

        const keyId = String(req.params.id || '').trim();
        if (!keyId) {
          res.status(400).json({
            ok: false,
            error: { code: 'INVALID_KEY_ID', message: 'API key id is required' },
          });
          return;
        }

        try {
          const config = await new ConfigManager().load();
          const client = new PostalClient(config);
          await client.revokeApiCredential(keyId);
          const existing = apiKeyState.get(keyId);
          if (existing) {
            apiKeyState.set(keyId, { ...existing, status: 'revoked' });
          }
          res.json({ ok: true, data: { revoked: true, keyId } });
        } catch (error) {
          res.status(500).json({
            ok: false,
            error: {
              code: 'API_KEY_REVOKE_FAILED',
              message: error instanceof Error ? error.message : 'Failed to revoke API key',
            },
          });
        }
      });

      app.get('/api/admin/api-keys/:id/usage', requireAuth, (req: Request, res: Response) => {
        const keyId = String(req.params.id || '').trim();
        if (!keyId) {
          res.status(400).json({
            ok: false,
            error: { code: 'INVALID_KEY_ID', message: 'API key id is required' },
          });
          return;
        }

        const existing = apiKeyState.get(keyId);
        const today = new Date();
        const requestsPerDay = Array.from({ length: 7 }).map((_, index) => {
          const day = new Date(today);
          day.setDate(today.getDate() - (6 - index));
          return {
            date: day.toISOString().slice(0, 10),
            count: 0,
          };
        });

        const usage: AdminApiKeyUsage = {
          keyId,
          totalRequests: 0,
          lastUsedAt: existing?.lastUsedAt || null,
          requestsPerDay,
          available: true,
        };

        res.json({ ok: true, data: usage });
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
            .sort(
              (a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            )
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
            .sort(
              (a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            )
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

      app.get('/api/admin/events', requireAuth, (req: Request, res: Response) => {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        res.flushHeaders();

        let closed = false;
        let lastTotalMessages: number | null = null;

        const sendEvent = (type: string, payload: Record<string, unknown>) => {
          res.write(`event: ${type}\n`);
          res.write(`data: ${JSON.stringify(payload)}\n\n`);
        };

        const sendHeartbeat = () => {
          res.write(`event: heartbeat\n`);
          res.write(`data: ${JSON.stringify({ checkedAt: new Date().toISOString() })}\n\n`);
        };

        const pollForNewEmails = async () => {
          if (closed) return;

          try {
            const inboxes = await getInboxesForRealtimeEvents();
            const totalMessages = inboxes.reduce(
              (sum, inbox) => sum + Number(inbox.messageCount || 0),
              0
            );

            if (lastTotalMessages === null) {
              lastTotalMessages = totalMessages;
              sendEvent('ready', {
                type: 'ready',
                checkedAt: new Date().toISOString(),
                totalMessages,
              });
              return;
            }

            const delta = totalMessages - lastTotalMessages;
            lastTotalMessages = totalMessages;

            if (delta > 0) {
              sendEvent('new_email', {
                type: 'new_email',
                count: delta,
                totalMessages,
                checkedAt: new Date().toISOString(),
              });
            } else {
              sendHeartbeat();
            }
          } catch (error) {
            sendEvent('error', {
              type: 'error',
              message:
                error instanceof Error ? error.message : 'Failed to poll inboxes for new emails',
              checkedAt: new Date().toISOString(),
            });
          }
        };

        const interval = setInterval(() => {
          void pollForNewEmails();
        }, 5000);

        req.on('close', () => {
          closed = true;
          clearInterval(interval);
          res.end();
        });
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
