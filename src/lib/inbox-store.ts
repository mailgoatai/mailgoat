import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import Database from 'better-sqlite3';

export interface InboxMessage {
  id: string;
  from: string;
  to: string[];
  subject: string;
  timestamp: string;
  read: boolean;
  snippet?: string;
}

export interface InboxListOptions {
  unread?: boolean;
  since?: number;
  limit?: number;
}

export interface IncomingMessageRecord {
  id: string;
  from: string;
  to: string[];
  subject?: string;
  timestamp: string;
  snippet?: string;
}

export function getDefaultInboxDbPath(): string {
  return path.join(os.homedir(), '.mailgoat', 'inbox', 'messages.db');
}

function normalizeTimestamp(value: string): string {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return new Date().toISOString();
  }
  return new Date(parsed).toISOString();
}

export class InboxStore {
  private readonly db: Database.Database;

  constructor(dbPath: string = getDefaultInboxDbPath()) {
    const dbDir = path.dirname(dbPath);
    fs.mkdirSync(dbDir, { recursive: true });
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS inbox_messages (
        id TEXT PRIMARY KEY,
        from_email TEXT NOT NULL,
        to_emails TEXT NOT NULL,
        subject TEXT NOT NULL,
        snippet TEXT,
        timestamp TEXT NOT NULL,
        read INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_inbox_messages_timestamp ON inbox_messages(timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_inbox_messages_read ON inbox_messages(read);
    `);
  }

  upsertMessage(message: IncomingMessageRecord): void {
    const stmt = this.db.prepare(`
      INSERT INTO inbox_messages (id, from_email, to_emails, subject, snippet, timestamp, read, updated_at)
      VALUES (@id, @from_email, @to_emails, @subject, @snippet, @timestamp, 0, datetime('now'))
      ON CONFLICT(id) DO UPDATE SET
        from_email=excluded.from_email,
        to_emails=excluded.to_emails,
        subject=excluded.subject,
        snippet=excluded.snippet,
        timestamp=excluded.timestamp,
        updated_at=datetime('now')
    `);

    stmt.run({
      id: message.id,
      from_email: message.from,
      to_emails: JSON.stringify(message.to),
      subject: message.subject || '',
      snippet: message.snippet || '',
      timestamp: normalizeTimestamp(message.timestamp),
    });
  }

  listMessages(options: InboxListOptions = {}): InboxMessage[] {
    const conditions: string[] = [];
    const params: Record<string, unknown> = {};

    if (options.unread) {
      conditions.push('read = 0');
    }

    if (options.since) {
      conditions.push('timestamp >= @sinceIso');
      params.sinceIso = new Date(options.since).toISOString();
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = options.limit ?? 100;

    const query = `
      SELECT id, from_email, to_emails, subject, snippet, timestamp, read
      FROM inbox_messages
      ${where}
      ORDER BY timestamp DESC
      LIMIT @limit
    `;

    const rows = this.db.prepare(query).all({ ...params, limit }) as Array<Record<string, any>>;
    return rows.map(this.mapRow);
  }

  searchMessages(queryText: string, limit: number = 50): InboxMessage[] {
    const parsed = queryText.trim();
    let sql = `
      SELECT id, from_email, to_emails, subject, snippet, timestamp, read
      FROM inbox_messages
      WHERE 1 = 1
    `;
    const params: Record<string, unknown> = {};

    const fieldMatch = parsed.match(/^(subject|from|to):(.+)$/i);
    if (fieldMatch) {
      const field = fieldMatch[1].toLowerCase();
      const value = `%${fieldMatch[2].trim().toLowerCase()}%`;
      if (field === 'subject') {
        sql += ' AND lower(subject) LIKE @value';
      } else if (field === 'from') {
        sql += ' AND lower(from_email) LIKE @value';
      } else if (field === 'to') {
        sql += ' AND lower(to_emails) LIKE @value';
      }
      params.value = value;
    } else {
      params.value = `%${parsed.toLowerCase()}%`;
      sql += `
        AND (
          lower(subject) LIKE @value OR
          lower(from_email) LIKE @value OR
          lower(to_emails) LIKE @value OR
          lower(coalesce(snippet, '')) LIKE @value
        )
      `;
    }

    sql += ' ORDER BY timestamp DESC LIMIT @limit';
    params.limit = limit;

    const rows = this.db.prepare(sql).all(params) as Array<Record<string, any>>;
    return rows.map(this.mapRow);
  }

  markAsRead(id: string): boolean {
    const result = this.db
      .prepare("UPDATE inbox_messages SET read = 1, updated_at = datetime('now') WHERE id = ?")
      .run(id);
    return result.changes > 0;
  }

  close(): void {
    this.db.close();
  }

  private mapRow(row: Record<string, any>): InboxMessage {
    return {
      id: String(row.id),
      from: String(row.from_email),
      to: JSON.parse(String(row.to_emails)),
      subject: String(row.subject || ''),
      snippet: row.snippet ? String(row.snippet) : undefined,
      timestamp: String(row.timestamp),
      read: Boolean(row.read),
    };
  }
}

export function parseSinceToTimestamp(since: string): number {
  const relativeMatch = since.trim().match(/^(\d+)([smhdw])$/i);
  if (relativeMatch) {
    const value = parseInt(relativeMatch[1], 10);
    const unit = relativeMatch[2].toLowerCase();
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
      w: 7 * 24 * 60 * 60 * 1000,
    };

    return Date.now() - value * multipliers[unit];
  }

  const parsed = Date.parse(since);
  if (Number.isNaN(parsed)) {
    throw new Error('Invalid --since format. Use relative values like 1h, 30m, 2d, or ISO date.');
  }

  return parsed;
}
