import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export type CampaignStatus = 'pending' | 'running' | 'completed' | 'cancelled' | 'failed';
export type CampaignRecipientStatus = 'pending' | 'sent' | 'failed';

export interface CampaignRecord {
  id: string;
  name: string;
  template: string;
  subject_template: string;
  status: CampaignStatus;
  total: number;
  sent: number;
  failed: number;
  batch_size: number;
  delay_ms: number;
  created_at: number;
  updated_at: number;
  completed_at: number | null;
}

export interface CampaignRecipientRecord {
  campaign_id: string;
  idx: number;
  email: string;
  variables_json: string;
  status: CampaignRecipientStatus;
  error: string | null;
  send_time_ms: number | null;
  sent_at: number | null;
}

export interface CampaignReport {
  campaign: CampaignRecord;
  pending: number;
  avgSendMs: number;
  errorSummary: Array<{ error: string; count: number }>;
}

export class CampaignStore {
  private readonly db: Database.Database;

  constructor(dbPath: string = path.join(os.homedir(), '.mailgoat', 'campaigns.db')) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.init();
  }

  private init(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS campaigns (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        template TEXT NOT NULL,
        subject_template TEXT NOT NULL,
        status TEXT NOT NULL,
        total INTEGER NOT NULL,
        sent INTEGER NOT NULL DEFAULT 0,
        failed INTEGER NOT NULL DEFAULT 0,
        batch_size INTEGER NOT NULL,
        delay_ms INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        completed_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS campaign_recipients (
        campaign_id TEXT NOT NULL,
        idx INTEGER NOT NULL,
        email TEXT NOT NULL,
        variables_json TEXT NOT NULL,
        status TEXT NOT NULL,
        error TEXT,
        send_time_ms INTEGER,
        sent_at INTEGER,
        PRIMARY KEY (campaign_id, idx)
      );

      CREATE INDEX IF NOT EXISTS idx_campaign_recipients_status
      ON campaign_recipients(campaign_id, status);
    `);
  }

  close(): void {
    this.db.close();
  }

  createCampaign(input: {
    id: string;
    name: string;
    template: string;
    subjectTemplate: string;
    total: number;
    batchSize: number;
    delayMs: number;
  }): CampaignRecord {
    const now = Date.now();
    this.db
      .prepare(
        `INSERT INTO campaigns (id, name, template, subject_template, status, total, batch_size, delay_ms, created_at, updated_at)
         VALUES (@id, @name, @template, @subject_template, 'pending', @total, @batch_size, @delay_ms, @created_at, @updated_at)`
      )
      .run({
        id: input.id,
        name: input.name,
        template: input.template,
        subject_template: input.subjectTemplate,
        total: input.total,
        batch_size: input.batchSize,
        delay_ms: input.delayMs,
        created_at: now,
        updated_at: now,
      });

    return this.getCampaign(input.id)!;
  }

  addRecipients(
    campaignId: string,
    recipients: Array<{ email: string; variablesJson: string }>
  ): void {
    const stmt = this.db.prepare(
      `INSERT INTO campaign_recipients (campaign_id, idx, email, variables_json, status)
       VALUES (?, ?, ?, ?, 'pending')`
    );

    const tx = this.db.transaction(() => {
      recipients.forEach((r, idx) => stmt.run(campaignId, idx, r.email, r.variablesJson));
    });
    tx();
  }

  getCampaign(id: string): CampaignRecord | undefined {
    return this.db.prepare(`SELECT * FROM campaigns WHERE id = ?`).get(id) as
      | CampaignRecord
      | undefined;
  }

  listCampaigns(limit: number = 50): CampaignRecord[] {
    return this.db
      .prepare(`SELECT * FROM campaigns ORDER BY created_at DESC LIMIT ?`)
      .all(limit) as CampaignRecord[];
  }

  updateCampaignStatus(id: string, status: CampaignStatus): void {
    const now = Date.now();
    this.db
      .prepare(`UPDATE campaigns SET status = ?, updated_at = ? WHERE id = ?`)
      .run(status, now, id);
  }

  markRecipientSent(campaignId: string, idx: number, sendTimeMs: number): void {
    const now = Date.now();
    this.db
      .prepare(
        `UPDATE campaign_recipients
         SET status = 'sent', error = NULL, send_time_ms = ?, sent_at = ?
         WHERE campaign_id = ? AND idx = ?`
      )
      .run(sendTimeMs, now, campaignId, idx);

    this.db
      .prepare(
        `UPDATE campaigns
         SET sent = sent + 1, updated_at = ?
         WHERE id = ?`
      )
      .run(now, campaignId);
  }

  markRecipientFailed(campaignId: string, idx: number, error: string, sendTimeMs: number): void {
    const now = Date.now();
    this.db
      .prepare(
        `UPDATE campaign_recipients
         SET status = 'failed', error = ?, send_time_ms = ?, sent_at = ?
         WHERE campaign_id = ? AND idx = ?`
      )
      .run(error, sendTimeMs, now, campaignId, idx);

    this.db
      .prepare(
        `UPDATE campaigns
         SET failed = failed + 1, updated_at = ?
         WHERE id = ?`
      )
      .run(now, campaignId);
  }

  getRecipientBatch(
    campaignId: string,
    statuses: CampaignRecipientStatus[],
    limit: number
  ): CampaignRecipientRecord[] {
    const placeholders = statuses.map(() => '?').join(',');
    return this.db
      .prepare(
        `SELECT * FROM campaign_recipients
         WHERE campaign_id = ? AND status IN (${placeholders})
         ORDER BY idx ASC
         LIMIT ?`
      )
      .all(campaignId, ...statuses, limit) as CampaignRecipientRecord[];
  }

  markCampaignCompleted(id: string, status: CampaignStatus): void {
    const now = Date.now();
    this.db
      .prepare(`UPDATE campaigns SET status = ?, completed_at = ?, updated_at = ? WHERE id = ?`)
      .run(status, now, now, id);
  }

  getPendingCount(campaignId: string): number {
    const row = this.db
      .prepare(
        `SELECT COUNT(*) AS count FROM campaign_recipients WHERE campaign_id = ? AND status = 'pending'`
      )
      .get(campaignId) as { count: number };
    return row.count;
  }

  getReport(campaignId: string): CampaignReport | undefined {
    const campaign = this.getCampaign(campaignId);
    if (!campaign) return undefined;

    const pending = this.getPendingCount(campaignId);
    const avgRow = this.db
      .prepare(
        `SELECT COALESCE(AVG(send_time_ms), 0) AS avg_ms
         FROM campaign_recipients
         WHERE campaign_id = ? AND send_time_ms IS NOT NULL`
      )
      .get(campaignId) as { avg_ms: number };

    const errors = this.db
      .prepare(
        `SELECT error, COUNT(*) AS count
         FROM campaign_recipients
         WHERE campaign_id = ? AND status = 'failed' AND error IS NOT NULL
         GROUP BY error
         ORDER BY count DESC`
      )
      .all(campaignId) as Array<{ error: string; count: number }>;

    return {
      campaign,
      pending,
      avgSendMs: Number(avgRow.avg_ms || 0),
      errorSummary: errors,
    };
  }

  listRecipientResults(campaignId: string): CampaignRecipientRecord[] {
    return this.db
      .prepare(`SELECT * FROM campaign_recipients WHERE campaign_id = ? ORDER BY idx ASC`)
      .all(campaignId) as CampaignRecipientRecord[];
  }
}
