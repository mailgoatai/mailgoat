import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { SendMessageParams } from './postal-client';

export type ScheduledEmailStatus = 'pending' | 'sent' | 'failed' | 'cancelled';

export interface ScheduledEmailRecord {
  id: number;
  status: ScheduledEmailStatus;
  scheduled_for: string;
  timezone: string;
  payload: string;
  created_at: string;
  updated_at: string;
  sent_at: string | null;
  error: string | null;
}

export interface CreateScheduledEmailInput {
  scheduledForIso: string;
  timezone: string;
  payload: SendMessageParams;
}

export interface EnqueuedScheduledEmail {
  id: number;
  scheduledForIso: string;
  timezone: string;
}

export function parseScheduleInput(input: string): Date {
  const trimmed = input.trim();
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/);

  if (!match) {
    throw new Error('Invalid --schedule format. Use "YYYY-MM-DD HH:mm" in system timezone.');
  }

  const [, yearText, monthText, dayText, hourText, minuteText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);

  const parsed = new Date(year, month - 1, day, hour, minute, 0, 0);

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day ||
    parsed.getHours() !== hour ||
    parsed.getMinutes() !== minute
  ) {
    throw new Error(`Invalid scheduled date/time: "${input}"`);
  }

  return parsed;
}

export class SchedulerStore {
  private readonly dbPath: string;
  private readonly db: Database.Database;

  constructor(dbPath?: string) {
    this.dbPath = dbPath || path.join(os.homedir(), '.mailgoat', 'scheduler.db');
    fs.mkdirSync(path.dirname(this.dbPath), { recursive: true });
    this.db = new Database(this.dbPath);
    this.db.pragma('journal_mode = WAL');
    this.init();
  }

  private init(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS scheduled_emails (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        status TEXT NOT NULL,
        scheduled_for TEXT NOT NULL,
        timezone TEXT NOT NULL,
        payload TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        sent_at TEXT,
        error TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_scheduled_emails_status_scheduled_for
      ON scheduled_emails(status, scheduled_for);
    `);
  }

  getPath(): string {
    return this.dbPath;
  }

  close(): void {
    this.db.close();
  }

  enqueue(input: CreateScheduledEmailInput): EnqueuedScheduledEmail {
    const nowIso = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO scheduled_emails (status, scheduled_for, timezone, payload, created_at, updated_at)
      VALUES ('pending', @scheduled_for, @timezone, @payload, @created_at, @updated_at)
    `);

    const result = stmt.run({
      scheduled_for: input.scheduledForIso,
      timezone: input.timezone,
      payload: JSON.stringify(input.payload),
      created_at: nowIso,
      updated_at: nowIso,
    });

    return {
      id: Number(result.lastInsertRowid),
      scheduledForIso: input.scheduledForIso,
      timezone: input.timezone,
    };
  }

  list(limit: number = 100): ScheduledEmailRecord[] {
    const stmt = this.db.prepare(`
      SELECT id, status, scheduled_for, timezone, payload, created_at, updated_at, sent_at, error
      FROM scheduled_emails
      ORDER BY scheduled_for ASC
      LIMIT ?
    `);

    return stmt.all(limit) as ScheduledEmailRecord[];
  }

  cancel(id: number): boolean {
    const nowIso = new Date().toISOString();
    const stmt = this.db.prepare(`
      UPDATE scheduled_emails
      SET status = 'cancelled', updated_at = @updated_at
      WHERE id = @id AND status = 'pending'
    `);

    const result = stmt.run({ id, updated_at: nowIso });
    return result.changes > 0;
  }

  claimDue(nowIso: string, limit: number = 25): ScheduledEmailRecord[] {
    const selectStmt = this.db.prepare(`
      SELECT id, status, scheduled_for, timezone, payload, created_at, updated_at, sent_at, error
      FROM scheduled_emails
      WHERE status = 'pending' AND scheduled_for <= ?
      ORDER BY scheduled_for ASC
      LIMIT ?
    `);

    return selectStmt.all(nowIso, limit) as ScheduledEmailRecord[];
  }

  markSent(id: number): void {
    const nowIso = new Date().toISOString();
    this.db
      .prepare(`
      UPDATE scheduled_emails
      SET status = 'sent', sent_at = @sent_at, updated_at = @updated_at, error = NULL
      WHERE id = @id
    `)
      .run({ id, sent_at: nowIso, updated_at: nowIso });
  }

  markFailed(id: number, error: string): void {
    const nowIso = new Date().toISOString();
    this.db
      .prepare(`
      UPDATE scheduled_emails
      SET status = 'failed', updated_at = @updated_at, error = @error
      WHERE id = @id
    `)
      .run({ id, updated_at: nowIso, error });
  }
}
