import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import { ConfigManager } from '../lib/config';
import { PostalClient } from '../lib/postal-client';
import { TemplateManager } from '../lib/template-manager';
import { Formatter } from '../lib/formatter';
import { CampaignRecipientRecord, CampaignStore } from '../lib/campaign-store';
import { inferExitCode } from '../lib/errors';

interface CsvRecipient {
  email: string;
  vars: Record<string, unknown>;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseFallbacks(items: string[] = []): Record<string, string> {
  const result: Record<string, string> = {};
  items.forEach((item) => {
    const idx = item.indexOf('=');
    if (idx <= 0) {
      throw new Error(`Invalid --fallback entry: ${item}. Use key=value`);
    }
    const key = item.slice(0, idx).trim();
    const value = item.slice(idx + 1).trim();
    result[key] = value;
  });
  return result;
}

function parseCsvRecipients(filePath: string): CsvRecipient[] {
  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error('Recipients CSV must include header and at least one row');
  }

  const header = lines[0].split(',').map((h) => h.trim());
  const emailIdx = header.findIndex((h) => h.toLowerCase() === 'email');
  if (emailIdx < 0) {
    throw new Error('Recipients CSV must include an email column');
  }

  return lines.slice(1).map((line, rowOffset) => {
    const cols = line.split(',');
    const vars: Record<string, unknown> = {};
    header.forEach((h, i) => {
      vars[h] = (cols[i] || '').trim();
    });

    const email = String(vars[header[emailIdx]] || '').trim();
    if (!email) {
      throw new Error(`Missing email in CSV row ${rowOffset + 2}`);
    }

    return { email, vars };
  });
}

function toCsv(rows: CampaignRecipientRecord[]): string {
  const escape = (v: string): string => `"${v.replace(/"/g, '""')}"`;
  const header = 'idx,email,status,error,send_time_ms,sent_at';
  const body = rows
    .map((r) => {
      return [
        String(r.idx),
        escape(r.email),
        r.status,
        escape(r.error || ''),
        String(r.send_time_ms ?? ''),
        String(r.sent_at ?? ''),
      ].join(',');
    })
    .join('\n');
  return `${header}\n${body}\n`;
}

function buildCampaignId(name: string): string {
  return `camp-${Date.now()}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function runCampaignSend(options: any): Promise<void> {
  const formatter = new Formatter(Boolean(options.json));
  const store = new CampaignStore(options.dbPath);

  try {
    const config = await new ConfigManager().load();
    const client = new PostalClient(config);
    const templateManager = new TemplateManager();

    const batchSize = Number(options.batchSize || 100);
    const delayMs = Number(options.delay || 0);
    const previewCount = Number(options.preview || 0);
    if (!Number.isFinite(batchSize) || batchSize < 1 || batchSize > 1000) {
      throw new Error('--batch-size must be between 1 and 1000');
    }
    if (!Number.isFinite(delayMs) || delayMs < 0 || delayMs > 600000) {
      throw new Error('--delay must be between 0 and 600000 ms');
    }

    const fallbacks = parseFallbacks(Array.isArray(options.fallback) ? options.fallback : []);

    let campaignId: string;
    let templatePath: string;
    let subjectTemplate: string;
    let name: string;

    if (options.resume) {
      campaignId = String(options.resume);
      const existing = store.getCampaign(campaignId);
      if (!existing) throw new Error(`Campaign not found: ${campaignId}`);
      templatePath = existing.template;
      subjectTemplate = existing.subject_template;
      name = existing.name;
    } else {
      if (!options.template || !options.recipients) {
        throw new Error('New campaign requires --template and --recipients');
      }
      templatePath = path.resolve(options.template);
      if (!fs.existsSync(templatePath)) {
        throw new Error(`Template file not found: ${templatePath}`);
      }

      const recipients = parseCsvRecipients(path.resolve(options.recipients));
      name = options.name || `campaign-${new Date().toISOString().slice(0, 10)}`;
      subjectTemplate = options.subject || `Update from ${name}`;
      campaignId = buildCampaignId(name);

      const record = store.createCampaign({
        id: campaignId,
        name,
        template: templatePath,
        subjectTemplate,
        total: recipients.length,
        batchSize,
        delayMs,
      });
      store.addRecipients(
        campaignId,
        recipients.map((r) => ({
          email: r.email,
          variablesJson: JSON.stringify({ ...fallbacks, ...r.vars, email: r.email }),
        }))
      );

      if (!options.json) {
        console.log(chalk.cyan(`Created campaign ${record.id} (${record.total} recipients)`));
      }
    }

    const campaign = store.getCampaign(campaignId)!;

    if (previewCount > 0) {
      const pending = store.getRecipientBatch(campaignId, ['pending', 'failed'], previewCount);
      const templateBody = fs.readFileSync(templatePath, 'utf8');
      const preview = pending.map((r) => {
        const vars = JSON.parse(r.variables_json) as Record<string, unknown>;
        return {
          email: r.email,
          subject: templateManager.renderString(subjectTemplate, vars),
          body: templateManager.renderString(templateBody, vars).slice(0, 200),
        };
      });
      formatter.output({ campaignId, preview });
      return;
    }

    store.updateCampaignStatus(campaignId, 'running');

    while (true) {
      const latest = store.getCampaign(campaignId);
      if (!latest) throw new Error(`Campaign missing during send: ${campaignId}`);
      if (latest.status === 'cancelled') break;

      const recipients = store.getRecipientBatch(campaignId, ['pending'], campaign.batch_size);
      if (recipients.length === 0) {
        const finalStatus = latest.failed > 0 ? 'completed' : 'completed';
        store.markCampaignCompleted(campaignId, finalStatus);
        break;
      }

      const templateBody = fs.readFileSync(templatePath, 'utf8');
      const batches = chunk(recipients, campaign.batch_size);
      for (const b of batches) {
        for (const recipient of b) {
          const vars = JSON.parse(recipient.variables_json) as Record<string, unknown>;
          const started = Date.now();
          try {
            const subject = templateManager.renderString(subjectTemplate, vars);
            const renderedBody = templateManager.renderString(templateBody, vars);
            const isHtml = /\.html?$/i.test(templatePath);

            await client.sendMessage({
              to: [recipient.email],
              subject,
              ...(isHtml ? { html_body: renderedBody } : { plain_body: renderedBody }),
              tag: options.tag || undefined,
            });

            store.markRecipientSent(campaignId, recipient.idx, Date.now() - started);
          } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            store.markRecipientFailed(campaignId, recipient.idx, message, Date.now() - started);
          }
        }

        const progress = store.getReport(campaignId)!;
        if (!options.json) {
          const processed = progress.campaign.sent + progress.campaign.failed;
          console.log(
            `Progress ${processed}/${progress.campaign.total} (sent=${progress.campaign.sent}, failed=${progress.campaign.failed}, pending=${progress.pending})`
          );
        }

        if (campaign.delay_ms > 0) {
          await sleep(campaign.delay_ms);
        }
      }
    }

    const report = store.getReport(campaignId)!;
    formatter.output({
      campaignId,
      status: report.campaign.status,
      total: report.campaign.total,
      sent: report.campaign.sent,
      failed: report.campaign.failed,
      pending: report.pending,
      avgSendMs: report.avgSendMs,
    });
  } finally {
    store.close();
  }
}

export function createCampaignCommand(): Command {
  const cmd = new Command('campaign').description('Bulk campaign management with personalization');

  cmd
    .command('send')
    .description('Create and run a campaign from CSV recipients')
    .option('--template <path>', 'Template file path (.txt or .html)')
    .option('--subject <text>', 'Subject template (supports {{var}})')
    .option('--recipients <path>', 'CSV recipients file with email column')
    .option('--name <text>', 'Campaign name')
    .option('--batch-size <n>', 'Recipients per batch (default: 100)', '100')
    .option('--delay <ms>', 'Delay between batches in ms (default: 0)', '0')
    .option(
      '--fallback <key=value>',
      'Fallback variable for missing fields',
      (v: string, p: string[]) => {
        p.push(v);
        return p;
      },
      []
    )
    .option('--preview <n>', 'Preview first N personalized messages and exit', '0')
    .option('--resume <id>', 'Resume an interrupted campaign by id')
    .option('--tag <tag>', 'Optional tag for all campaign emails')
    .option('--db-path <path>', 'Campaign database path')
    .option('--json', 'Output JSON')
    .action(async (options) => {
      try {
        await runCampaignSend(options);
      } catch (error: unknown) {
        const formatter = new Formatter(Boolean(options.json));
        const message = error instanceof Error ? error.message : String(error);
        console.error(formatter.error(message));
        process.exit(inferExitCode(error));
      }
    });

  cmd
    .command('status <id>')
    .description('Check campaign status')
    .option('--db-path <path>', 'Campaign database path')
    .option('--json', 'Output JSON')
    .action((id: string, options) => {
      const formatter = new Formatter(Boolean(options.json));
      const store = new CampaignStore(options.dbPath);
      try {
        const report = store.getReport(id);
        if (!report) throw new Error(`Campaign not found: ${id}`);
        formatter.output({
          id,
          status: report.campaign.status,
          total: report.campaign.total,
          sent: report.campaign.sent,
          failed: report.campaign.failed,
          pending: report.pending,
          avgSendMs: report.avgSendMs,
        });
      } finally {
        store.close();
      }
    });

  cmd
    .command('list')
    .description('List campaigns')
    .option('--limit <n>', 'Number of campaigns to return', '50')
    .option('--db-path <path>', 'Campaign database path')
    .option('--json', 'Output JSON')
    .action((options) => {
      const formatter = new Formatter(Boolean(options.json));
      const store = new CampaignStore(options.dbPath);
      try {
        const limit = Number(options.limit || 50);
        formatter.output(store.listCampaigns(limit));
      } finally {
        store.close();
      }
    });

  cmd
    .command('cancel <id>')
    .description('Cancel a pending/running campaign')
    .option('--db-path <path>', 'Campaign database path')
    .option('--json', 'Output JSON')
    .action((id: string, options) => {
      const formatter = new Formatter(Boolean(options.json));
      const store = new CampaignStore(options.dbPath);
      try {
        const c = store.getCampaign(id);
        if (!c) throw new Error(`Campaign not found: ${id}`);
        if (c.status === 'completed' || c.status === 'cancelled') {
          throw new Error(`Campaign cannot be cancelled in status ${c.status}`);
        }
        store.updateCampaignStatus(id, 'cancelled');
        formatter.output({ id, cancelled: true });
      } finally {
        store.close();
      }
    });

  cmd
    .command('report <id>')
    .description('Get campaign report and optionally export recipient-level CSV')
    .option('--export-csv <path>', 'Export detailed recipient results CSV')
    .option('--db-path <path>', 'Campaign database path')
    .option('--json', 'Output JSON')
    .action((id: string, options) => {
      const formatter = new Formatter(Boolean(options.json));
      const store = new CampaignStore(options.dbPath);
      try {
        const report = store.getReport(id);
        if (!report) throw new Error(`Campaign not found: ${id}`);

        if (options.exportCsv) {
          fs.writeFileSync(path.resolve(options.exportCsv), toCsv(store.listRecipientResults(id)));
        }

        formatter.output({
          id,
          status: report.campaign.status,
          total: report.campaign.total,
          sent: report.campaign.sent,
          failed: report.campaign.failed,
          pending: report.pending,
          avgSendMs: report.avgSendMs,
          errorSummary: report.errorSummary,
          exportCsv: options.exportCsv || null,
        });
      } finally {
        store.close();
      }
    });

  return cmd;
}

export const __campaignInternals = {
  parseFallbacks,
  parseCsvRecipients,
  toCsv,
};
