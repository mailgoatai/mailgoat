/**
 * Email Queue Management System
 *
 * SQLite-based queue for reliable email sending with priority, scheduling, and retry logic
 */

import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import { join } from 'path';
import { mkdirSync } from 'fs';

export type QueueStatus = 'pending' | 'sending' | 'sent' | 'failed' | 'cancelled';
export type QueuePriority = 'critical' | 'high' | 'normal' | 'low' | 'bulk';

export interface QueuedEmail {
  id: string;
  status: QueueStatus;
  priority: QueuePriority;
  scheduledAt: number | null; // Unix timestamp
  attempts: number;
  maxAttempts: number;
  lastError: string | null;
  payload: EmailPayload;
  createdAt: number;
  updatedAt: number;
}

export interface EmailPayload {
  to: string[];
  from?: string;
  subject: string;
  body: string;
  html?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: Array<{
    name: string;
    content: string; // base64
    contentType: string;
  }>;
  headers?: Record<string, string>;
  tag?: string;
}

export interface QueueStats {
  pending: number;
  sending: number;
  sent: number;
  failed: number;
  cancelled: number;
  total: number;
}

const PRIORITY_VALUES: Record<QueuePriority, number> = {
  critical: 1,
  high: 2,
  normal: 3,
  low: 4,
  bulk: 5,
};

export class EmailQueue {
  private db: Database.Database;

  constructor(dbPath?: string) {
    const defaultPath = join(process.cwd(), '.mailgoat', 'queue.db');
    const path = dbPath || defaultPath;

    // Ensure directory exists
    mkdirSync(join(path, '..'), { recursive: true });

    this.db = new Database(path);
    this.initDatabase();
  }

  private initDatabase(): void {
    // Apply performance tuning
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('cache_size = 10000');
    this.db.pragma('synchronous = NORMAL');
    this.db.pragma('temp_store = MEMORY');
    this.db.pragma('mmap_size = 268435456'); // 256MB

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS email_queue (
        id TEXT PRIMARY KEY,
        status TEXT NOT NULL,
        priority INTEGER NOT NULL,
        scheduled_at INTEGER,
        attempts INTEGER NOT NULL DEFAULT 0,
        max_attempts INTEGER NOT NULL DEFAULT 3,
        last_error TEXT,
        payload TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      
      -- Optimized indexes
      CREATE INDEX IF NOT EXISTS idx_status ON email_queue(status);
      CREATE INDEX IF NOT EXISTS idx_priority ON email_queue(priority);
      CREATE INDEX IF NOT EXISTS idx_scheduled_at ON email_queue(scheduled_at);
      CREATE INDEX IF NOT EXISTS idx_created_at ON email_queue(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_updated_at ON email_queue(updated_at DESC);
      
      -- Composite index for queue processing (most important)
      CREATE INDEX IF NOT EXISTS idx_queue_processing
        ON email_queue(status, priority, scheduled_at)
        WHERE status = 'pending';
    `);
  }

  /**
   * Add email to queue
   */
  enqueue(
    payload: EmailPayload,
    options: {
      priority?: QueuePriority;
      scheduledAt?: Date | number;
      maxAttempts?: number;
    } = {}
  ): string {
    const id = randomUUID();
    const now = Date.now();

    const priority = options.priority || 'normal';
    const scheduledAt = options.scheduledAt
      ? typeof options.scheduledAt === 'number'
        ? options.scheduledAt
        : options.scheduledAt.getTime()
      : null;

    const stmt = this.db.prepare(`
      INSERT INTO email_queue (
        id, status, priority, scheduled_at, attempts, max_attempts,
        payload, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      'pending',
      PRIORITY_VALUES[priority],
      scheduledAt,
      0,
      options.maxAttempts || 3,
      JSON.stringify(payload),
      now,
      now
    );

    return id;
  }

  /**
   * Get next email to process
   */
  dequeue(): QueuedEmail | null {
    const now = Date.now();

    const stmt = this.db.prepare(`
      SELECT * FROM email_queue
      WHERE status = 'pending'
        AND (scheduled_at IS NULL OR scheduled_at <= ?)
      ORDER BY priority ASC, created_at ASC
      LIMIT 1
    `);

    const row = stmt.get(now) as any;

    if (!row) {
      return null;
    }

    return this.rowToQueuedEmail(row);
  }

  /**
   * Mark email as sending
   */
  markSending(id: string): void {
    const stmt = this.db.prepare(`
      UPDATE email_queue
      SET status = 'sending', updated_at = ?
      WHERE id = ? AND status = 'pending'
    `);

    stmt.run(Date.now(), id);
  }

  /**
   * Mark email as sent
   */
  markSent(id: string): void {
    const stmt = this.db.prepare(`
      UPDATE email_queue
      SET status = 'sent', updated_at = ?
      WHERE id = ?
    `);

    stmt.run(Date.now(), id);
  }

  /**
   * Mark email as failed and increment attempts
   */
  markFailed(id: string, error: string): void {
    const email = this.get(id);
    if (!email) {
      throw new Error(`Email ${id} not found`);
    }

    const attempts = email.attempts + 1;
    const status = attempts >= email.maxAttempts ? 'failed' : 'pending';

    const stmt = this.db.prepare(`
      UPDATE email_queue
      SET status = ?, attempts = ?, last_error = ?, updated_at = ?
      WHERE id = ?
    `);

    stmt.run(status, attempts, error, Date.now(), id);
  }

  /**
   * Cancel queued email
   */
  cancel(id: string): void {
    const stmt = this.db.prepare(`
      UPDATE email_queue
      SET status = 'cancelled', updated_at = ?
      WHERE id = ? AND status IN ('pending', 'failed')
    `);

    const result = stmt.run(Date.now(), id);

    if (result.changes === 0) {
      throw new Error(`Email ${id} not found or cannot be cancelled`);
    }
  }

  /**
   * Retry failed email
   */
  retry(id: string): void {
    const stmt = this.db.prepare(`
      UPDATE email_queue
      SET status = 'pending', attempts = 0, last_error = NULL, updated_at = ?
      WHERE id = ? AND status = 'failed'
    `);

    const result = stmt.run(Date.now(), id);

    if (result.changes === 0) {
      throw new Error(`Email ${id} not found or not in failed status`);
    }
  }

  /**
   * Get email by ID
   */
  get(id: string): QueuedEmail | null {
    const stmt = this.db.prepare('SELECT * FROM email_queue WHERE id = ?');
    const row = stmt.get(id) as any;

    if (!row) {
      return null;
    }

    return this.rowToQueuedEmail(row);
  }

  /**
   * List emails by status
   */
  list(
    options: {
      status?: QueueStatus | QueueStatus[];
      limit?: number;
      offset?: number;
    } = {}
  ): QueuedEmail[] {
    let sql = 'SELECT * FROM email_queue WHERE 1=1';
    const params: any[] = [];

    if (options.status) {
      const statuses = Array.isArray(options.status) ? options.status : [options.status];
      const placeholders = statuses.map(() => '?').join(',');
      sql += ` AND status IN (${placeholders})`;
      params.push(...statuses);
    }

    sql += ' ORDER BY priority ASC, created_at ASC';

    if (options.limit) {
      sql += ' LIMIT ?';
      params.push(options.limit);
    }

    if (options.offset) {
      sql += ' OFFSET ?';
      params.push(options.offset);
    }

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as any[];

    return rows.map((row) => this.rowToQueuedEmail(row));
  }

  /**
   * Get queue statistics
   */
  stats(): QueueStats {
    const stmt = this.db.prepare(`
      SELECT
        status,
        COUNT(*) as count
      FROM email_queue
      GROUP BY status
    `);

    const rows = stmt.all() as Array<{ status: QueueStatus; count: number }>;

    const stats: QueueStats = {
      pending: 0,
      sending: 0,
      sent: 0,
      failed: 0,
      cancelled: 0,
      total: 0,
    };

    for (const row of rows) {
      stats[row.status] = row.count;
      stats.total += row.count;
    }

    return stats;
  }

  /**
   * Clear emails by status
   */
  clear(status: QueueStatus): number {
    const stmt = this.db.prepare('DELETE FROM email_queue WHERE status = ?');
    const result = stmt.run(status);
    return result.changes;
  }

  /**
   * Purge old completed/failed emails
   */
  purge(olderThanDays: number): number {
    const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;

    const stmt = this.db.prepare(`
      DELETE FROM email_queue
      WHERE status IN ('sent', 'failed', 'cancelled')
        AND updated_at < ?
    `);

    const result = stmt.run(cutoff);
    return result.changes;
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }

  private rowToQueuedEmail(row: any): QueuedEmail {
    return {
      id: row.id,
      status: row.status,
      priority: this.priorityFromValue(row.priority),
      scheduledAt: row.scheduled_at,
      attempts: row.attempts,
      maxAttempts: row.max_attempts,
      lastError: row.last_error,
      payload: JSON.parse(row.payload),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private priorityFromValue(value: number): QueuePriority {
    for (const [key, val] of Object.entries(PRIORITY_VALUES)) {
      if (val === value) {
        return key as QueuePriority;
      }
    }
    return 'normal';
  }
}
