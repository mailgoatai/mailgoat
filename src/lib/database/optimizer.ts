/**
 * Database Optimizer
 *
 * Tools for optimizing SQLite database performance
 */

import Database from 'better-sqlite3';

export interface OptimizationResult {
  optimized: string[];
  warnings: string[];
  timingMs: number;
}

export interface DatabaseStats {
  pageCount: number;
  pageSize: number;
  sizeBytes: number;
  freelistCount: number;
  cacheSize: number;
  journalMode: string;
}

export class DatabaseOptimizer {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  /**
   * Apply performance tuning settings
   */
  tune(): OptimizationResult {
    const start = Date.now();
    const optimized: string[] = [];
    const warnings: string[] = [];

    // Enable WAL mode for better concurrency
    try {
      this.db.pragma('journal_mode = WAL');
      optimized.push('Enabled WAL journal mode');
    } catch (error) {
      warnings.push(
        `Failed to enable WAL: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    // Increase cache size (10MB)
    this.db.pragma('cache_size = 10000');
    optimized.push('Increased cache size to 10000 pages (~40MB)');

    // Optimize for speed over durability (safe for queue)
    this.db.pragma('synchronous = NORMAL');
    optimized.push('Set synchronous mode to NORMAL');

    // Store temp tables in memory
    this.db.pragma('temp_store = MEMORY');
    optimized.push('Configured temp storage to MEMORY');

    // Enable memory-mapped I/O (faster reads)
    this.db.pragma('mmap_size = 268435456'); // 256MB
    optimized.push('Enabled memory-mapped I/O (256MB)');

    const timingMs = Date.now() - start;

    return {
      optimized,
      warnings,
      timingMs,
    };
  }

  /**
   * Vacuum database to reclaim space
   */
  vacuum(): number {
    const start = Date.now();
    this.db.pragma('vacuum');
    return Date.now() - start;
  }

  /**
   * Analyze database to update statistics
   */
  analyze(): number {
    const start = Date.now();
    this.db.pragma('analyze');
    return Date.now() - start;
  }

  /**
   * Reindex all indexes
   */
  reindex(): number {
    const start = Date.now();
    this.db.exec('REINDEX');
    return Date.now() - start;
  }

  /**
   * Check database integrity
   */
  checkIntegrity(): { ok: boolean; errors: string[] } {
    const result = this.db.pragma('integrity_check') as Array<{ integrity_check: string }>;

    if (result.length === 1 && result[0].integrity_check === 'ok') {
      return { ok: true, errors: [] };
    }

    return {
      ok: false,
      errors: result.map((r: any) => r.integrity_check),
    };
  }

  /**
   * Get database statistics
   */
  getStats(): DatabaseStats {
    const pageCount = this.db.pragma('page_count', { simple: true }) as number;
    const pageSize = this.db.pragma('page_size', { simple: true }) as number;
    const freelistCount = this.db.pragma('freelist_count', { simple: true }) as number;
    const cacheSize = this.db.pragma('cache_size', { simple: true }) as number;
    const journalMode = this.db.pragma('journal_mode', { simple: true }) as string;

    return {
      pageCount,
      pageSize,
      sizeBytes: pageCount * pageSize,
      freelistCount,
      cacheSize,
      journalMode,
    };
  }

  /**
   * Create missing indexes for email queue
   */
  createQueueIndexes(): OptimizationResult {
    const start = Date.now();
    const optimized: string[] = [];
    const warnings: string[] = [];

    const indexes = [
      {
        name: 'idx_queue_status_priority_scheduled',
        sql: `
          CREATE INDEX IF NOT EXISTS idx_queue_status_priority_scheduled
          ON email_queue(status, priority, scheduled_at)
        `,
        description: 'Composite index for queue processing',
      },
      {
        name: 'idx_queue_created_at',
        sql: `
          CREATE INDEX IF NOT EXISTS idx_queue_created_at
          ON email_queue(created_at DESC)
        `,
        description: 'Index for sorting by creation time',
      },
      {
        name: 'idx_queue_updated_at',
        sql: `
          CREATE INDEX IF NOT EXISTS idx_queue_updated_at
          ON email_queue(updated_at DESC)
        `,
        description: 'Index for sorting by update time',
      },
    ];

    for (const index of indexes) {
      try {
        this.db.exec(index.sql);
        optimized.push(`Created ${index.name}: ${index.description}`);
      } catch (error) {
        // Index might already exist
        if (error instanceof Error && !error.message.includes('already exists')) {
          warnings.push(`Failed to create ${index.name}: ${error.message}`);
        }
      }
    }

    const timingMs = Date.now() - start;

    return {
      optimized,
      warnings,
      timingMs,
    };
  }

  /**
   * Run full optimization
   */
  optimize(): {
    tuning: OptimizationResult;
    indexes: OptimizationResult;
    vacuum: number;
    analyze: number;
    integrity: { ok: boolean; errors: string[] };
    totalMs: number;
  } {
    const start = Date.now();

    const tuning = this.tune();
    const indexes = this.createQueueIndexes();
    const vacuumMs = this.vacuum();
    const analyzeMs = this.analyze();
    const integrity = this.checkIntegrity();

    const totalMs = Date.now() - start;

    return {
      tuning,
      indexes,
      vacuum: vacuumMs,
      analyze: analyzeMs,
      integrity,
      totalMs,
    };
  }

  /**
   * Explain query plan (for debugging)
   */
  explainQuery(sql: string): any[] {
    const stmt = this.db.prepare(`EXPLAIN QUERY PLAN ${sql}`);
    return stmt.all();
  }
}
