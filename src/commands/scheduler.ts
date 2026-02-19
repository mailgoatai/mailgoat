import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import { ConfigManager } from '../lib/config';
import { PostalClient, SendMessageParams } from '../lib/postal-client';
import { Formatter } from '../lib/formatter';
import { SchedulerStore, ScheduledEmailRecord } from '../lib/scheduler';

interface SchedulerRunSummary {
  processed: number;
  sent: number;
  failed: number;
  failures: Array<{ id: number; error: string }>;
}

function parsePayload(payload: string): SendMessageParams {
  return JSON.parse(payload) as SendMessageParams;
}

async function runOnce(store: SchedulerStore, jsonMode: boolean): Promise<SchedulerRunSummary> {
  const configManager = new ConfigManager();
  const config = await configManager.load();
  const client = new PostalClient(config);

  const due = store.claimDue(new Date().toISOString());
  let sent = 0;
  let failed = 0;
  const failures: Array<{ id: number; error: string }> = [];

  for (const item of due) {
    try {
      await client.sendMessage(parsePayload(item.payload));
      store.markSent(item.id);
      sent += 1;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      store.markFailed(item.id, message);
      failed += 1;
      failures.push({ id: item.id, error: message });
    }
  }

  if (!jsonMode && due.length > 0) {
    console.log(
      chalk.cyan(`Processed ${due.length} scheduled email(s): ${sent} sent, ${failed} failed`)
    );
  }

  return {
    processed: due.length,
    sent,
    failed,
    failures,
  };
}

function formatSchedulerList(records: ScheduledEmailRecord[], jsonMode: boolean): string | object {
  if (jsonMode) {
    return records.map((record) => ({
      id: record.id,
      status: record.status,
      scheduledFor: record.scheduled_for,
      timezone: record.timezone,
      createdAt: record.created_at,
      sentAt: record.sent_at,
      error: record.error,
    }));
  }

  if (records.length === 0) {
    return chalk.yellow('No scheduled emails found');
  }

  const table = new Table({
    head: ['ID', 'Status', 'Scheduled', 'Timezone', 'Created', 'Error'].map((h) => chalk.bold(h)),
    colWidths: [8, 12, 24, 24, 24, 48],
    wordWrap: true,
  });

  for (const item of records) {
    table.push([
      item.id,
      item.status,
      new Date(item.scheduled_for).toLocaleString(),
      item.timezone,
      new Date(item.created_at).toLocaleString(),
      item.error || '',
    ]);
  }

  return table.toString();
}

export function createSchedulerCommand(): Command {
  const cmd = new Command('scheduler').description('Manage scheduled email queue');

  cmd
    .command('start')
    .description('Start scheduler worker that sends due emails every minute')
    .option('--json', 'Output worker events as JSON')
    .option('--once', 'Run one queue pass and exit', false)
    .action(async (options) => {
      const formatter = new Formatter(options.json);
      const store = new SchedulerStore();

      if (options.once) {
        const summary = await runOnce(store, options.json);
        formatter.output(summary);
        store.close();
        return;
      }

      if (!options.json) {
        console.log(chalk.green('MailGoat scheduler started'));
        console.log(chalk.cyan(`Queue DB: ${store.getPath()}`));
      }

      const tick = async () => {
        try {
          const summary = await runOnce(store, options.json);
          if (options.json && summary.processed > 0) {
            formatter.output(summary);
          }
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          if (options.json) {
            formatter.output({ status: 'error', message });
          } else {
            console.error(chalk.red(`Scheduler tick failed: ${message}`));
          }
        }
      };

      await tick();
      const intervalId = setInterval(() => {
        void tick();
      }, 60_000);

      const shutdown = () => {
        clearInterval(intervalId);
        store.close();
        process.exit(0);
      };

      process.on('SIGINT', shutdown);
      process.on('SIGTERM', shutdown);
    });

  cmd
    .command('list')
    .description('List scheduled emails')
    .option('-l, --limit <number>', 'Max rows to return', '100')
    .option('--json', 'Output as JSON')
    .action((options) => {
      const formatter = new Formatter(options.json);
      const store = new SchedulerStore();
      const limit = Number(options.limit);
      const rows = store.list(Number.isNaN(limit) ? 100 : limit);
      formatter.output(formatSchedulerList(rows, Boolean(options.json)));
      store.close();
    });

  cmd
    .command('cancel <id>')
    .description('Cancel a pending scheduled email by ID')
    .option('--json', 'Output as JSON')
    .action((id: string, options) => {
      const formatter = new Formatter(options.json);
      const numericId = Number(id);
      if (!Number.isInteger(numericId) || numericId <= 0) {
        console.error(formatter.error('Invalid ID. Must be a positive integer.'));
        process.exit(1);
      }

      const store = new SchedulerStore();
      const cancelled = store.cancel(numericId);
      store.close();

      if (!cancelled) {
        console.error(
          formatter.error(`Unable to cancel ID ${numericId}. It may not exist or is not pending.`)
        );
        process.exit(1);
      }

      formatter.output(
        options.json
          ? { status: 'success', id: numericId, cancelled: true }
          : chalk.green(`Cancelled scheduled email ${numericId}`)
      );
    });

  return cmd;
}
