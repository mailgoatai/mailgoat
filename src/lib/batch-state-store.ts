import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import Database from 'better-sqlite3';
import { BatchStateStore } from './batch-sender';

export class SqliteBatchStateStore implements BatchStateStore {
  private db: Database.Database;

  constructor(dbPath: string = path.join(os.homedir(), '.mailgoat', 'batch', 'state.db')) {
    const dir = path.dirname(dbPath);
    fs.mkdirSync(dir, { recursive: true });
    this.db = new Database(dbPath);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS batches (
        id TEXT PRIMARY KEY,
        file_path TEXT NOT NULL,
        total INTEGER NOT NULL,
        next_index INTEGER NOT NULL,
        completed INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS batch_results (
        batch_id TEXT NOT NULL,
        idx INTEGER NOT NULL,
        recipient TEXT NOT NULL,
        success INTEGER NOT NULL,
        error TEXT,
        created_at TEXT NOT NULL,
        PRIMARY KEY (batch_id, idx)
      );
    `);
  }

  initializeBatch(batchId: string, filePath: string, total: number): void {
    const now = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO batches (id, file_path, total, next_index, completed, created_at, updated_at)
         VALUES (?, ?, ?, 0, 0, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           file_path = excluded.file_path,
           total = excluded.total,
           next_index = 0,
           completed = 0,
           updated_at = excluded.updated_at`
      )
      .run(batchId, filePath, total, now, now);
    this.db.prepare(`DELETE FROM batch_results WHERE batch_id = ?`).run(batchId);
  }

  loadProcessedIndices(batchId: string): number[] {
    const rows = this.db
      .prepare(`SELECT idx FROM batch_results WHERE batch_id = ? ORDER BY idx ASC`)
      .all(batchId) as Array<{ idx: number }>;
    return rows.map((r) => r.idx);
  }

  recordResult(batchId: string, index: number, to: string, success: boolean, error?: string): void {
    const now = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO batch_results (batch_id, idx, recipient, success, error, created_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(batch_id, idx) DO UPDATE SET
           recipient = excluded.recipient,
           success = excluded.success,
           error = excluded.error,
           created_at = excluded.created_at`
      )
      .run(batchId, index, to, success ? 1 : 0, error || null, now);
  }

  updateBatchPosition(batchId: string, nextIndex: number, completed: boolean): void {
    const now = new Date().toISOString();
    this.db
      .prepare(`UPDATE batches SET next_index = ?, completed = ?, updated_at = ? WHERE id = ?`)
      .run(nextIndex, completed ? 1 : 0, now, batchId);
  }

  cleanupBatch(batchId: string): void {
    const row = this.db.prepare(`SELECT completed FROM batches WHERE id = ?`).get(batchId) as
      | { completed: number }
      | undefined;
    if (row && row.completed === 1) {
      this.db.prepare(`DELETE FROM batches WHERE id = ?`).run(batchId);
      this.db.prepare(`DELETE FROM batch_results WHERE batch_id = ?`).run(batchId);
    }
  }
}
