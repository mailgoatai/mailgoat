/**
 * Queue Management Commands
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { EmailQueue, QueueStatus } from '../lib/queue';
import { Formatter } from '../lib/formatter';

function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

function formatPriority(priority: string): string {
  const colors: Record<string, string> = {
    critical: chalk.red(priority),
    high: chalk.yellow(priority),
    normal: chalk.blue(priority),
    low: chalk.gray(priority),
    bulk: chalk.dim(priority),
  };

  return colors[priority] || priority;
}

function formatStatus(status: QueueStatus): string {
  const colors: Record<QueueStatus, string> = {
    pending: chalk.cyan(status),
    sending: chalk.yellow(status),
    sent: chalk.green(status),
    failed: chalk.red(status),
    cancelled: chalk.gray(status),
  };

  return colors[status] || status;
}

export function createQueueCommand(): Command {
  const cmd = new Command('queue');

  cmd.description('Manage email queue');

  // Queue status
  cmd
    .command('status')
    .description('Show queue statistics')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      const queue = new EmailQueue();
      const stats = queue.stats();
      queue.close();

      if (options.json) {
        Formatter.outputJson(stats);
        return;
      }

      console.log(chalk.bold('\n📊 Queue Statistics\n'));
      console.log(`  ${formatStatus('pending')}:   ${stats.pending}`);
      console.log(`  ${formatStatus('sending')}:   ${stats.sending}`);
      console.log(`  ${formatStatus('sent')}:      ${chalk.green(stats.sent)}`);
      console.log(`  ${formatStatus('failed')}:    ${chalk.red(stats.failed)}`);
      console.log(`  ${formatStatus('cancelled')}: ${stats.cancelled}`);
      console.log(chalk.bold(`\n  Total:      ${stats.total}\n`));
    });

  // List queued emails
  cmd
    .command('list')
    .description('List queued emails')
    .option('--status <status>', 'Filter by status (pending, sending, sent, failed, cancelled)')
    .option('--limit <number>', 'Maximum number of emails to show', '20')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      const queue = new EmailQueue();

      const emails = queue.list({
        status: options.status as QueueStatus | undefined,
        limit: parseInt(options.limit, 10),
      });

      queue.close();

      if (options.json) {
        Formatter.outputJson(emails);
        return;
      }

      if (emails.length === 0) {
        console.log(chalk.dim('No emails found'));
        return;
      }

      console.log(chalk.bold(`\n📧 Queued Emails (${emails.length})\n`));

      for (const email of emails) {
        console.log(`  ID:       ${chalk.cyan(email.id)}`);
        console.log(`  Status:   ${formatStatus(email.status)}`);
        console.log(`  Priority: ${formatPriority(email.priority)}`);
        console.log(`  To:       ${email.payload.to.join(', ')}`);
        console.log(`  Subject:  ${email.payload.subject}`);
        console.log(`  Attempts: ${email.attempts}/${email.maxAttempts}`);

        if (email.scheduledAt) {
          console.log(`  Scheduled: ${formatTimestamp(email.scheduledAt)}`);
        }

        if (email.lastError) {
          console.log(`  Error:    ${chalk.red(email.lastError)}`);
        }

        console.log(`  Created:  ${formatTimestamp(email.createdAt)}`);
        console.log();
      }
    });

  // Get email details
  cmd
    .command('get <id>')
    .description('Get email details')
    .option('--json', 'Output as JSON')
    .action(async (id, options) => {
      const queue = new EmailQueue();
      const email = queue.get(id);
      queue.close();

      if (!email) {
        console.log(chalk.red(`Email ${id} not found`));
        process.exit(1);
      }

      if (options.json) {
        Formatter.outputJson(email);
        return;
      }

      console.log(chalk.bold('\n📧 Email Details\n'));
      console.log(`  ID:         ${chalk.cyan(email.id)}`);
      console.log(`  Status:     ${formatStatus(email.status)}`);
      console.log(`  Priority:   ${formatPriority(email.priority)}`);
      console.log(`  To:         ${email.payload.to.join(', ')}`);
      console.log(`  From:       ${email.payload.from || '-'}`);
      console.log(`  Subject:    ${email.payload.subject}`);
      console.log(`  Attempts:   ${email.attempts}/${email.maxAttempts}`);

      if (email.payload.cc && email.payload.cc.length > 0) {
        console.log(`  CC:         ${email.payload.cc.join(', ')}`);
      }

      if (email.payload.bcc && email.payload.bcc.length > 0) {
        console.log(`  BCC:        ${email.payload.bcc.join(', ')}`);
      }

      if (email.scheduledAt) {
        console.log(`  Scheduled:  ${formatTimestamp(email.scheduledAt)}`);
      }

      if (email.lastError) {
        console.log(`  Error:      ${chalk.red(email.lastError)}`);
      }

      console.log(`  Created:    ${formatTimestamp(email.createdAt)}`);
      console.log(`  Updated:    ${formatTimestamp(email.updatedAt)}`);
      console.log();
    });

  // Cancel email
  cmd
    .command('cancel <id>')
    .description('Cancel queued email')
    .action(async (id) => {
      const queue = new EmailQueue();

      try {
        queue.cancel(id);
        queue.close();
        console.log(chalk.green(`✓ Email ${id} cancelled`));
      } catch (error) {
        queue.close();
        console.log(chalk.red(`✗ ${error instanceof Error ? error.message : String(error)}`));
        process.exit(1);
      }
    });

  // Retry email
  cmd
    .command('retry <id>')
    .description('Retry failed email')
    .action(async (id) => {
      const queue = new EmailQueue();

      try {
        queue.retry(id);
        queue.close();
        console.log(chalk.green(`✓ Email ${id} queued for retry`));
      } catch (error) {
        queue.close();
        console.log(chalk.red(`✗ ${error instanceof Error ? error.message : String(error)}`));
        process.exit(1);
      }
    });

  // Clear queue
  cmd
    .command('clear')
    .description('Clear emails from queue')
    .requiredOption('--status <status>', 'Status to clear (sent, failed, cancelled)')
    .option('--confirm', 'Skip confirmation prompt')
    .action(async (options) => {
      const status = options.status as QueueStatus;

      if (!['sent', 'failed', 'cancelled'].includes(status)) {
        console.log(chalk.red('Can only clear sent, failed, or cancelled emails'));
        process.exit(1);
      }

      if (!options.confirm) {
        const queue = new EmailQueue();
        const count = queue.list({ status }).length;
        queue.close();

        console.log(chalk.yellow(`\n⚠️  This will delete ${count} ${status} email(s)`));
        console.log(chalk.dim('Run with --confirm to proceed\n'));
        return;
      }

      const queue = new EmailQueue();
      const deleted = queue.clear(status);
      queue.close();

      console.log(chalk.green(`✓ Deleted ${deleted} ${status} email(s)`));
    });

  // Purge old emails
  cmd
    .command('purge')
    .description('Purge old completed/failed emails')
    .option('--days <number>', 'Delete emails older than N days', '30')
    .option('--confirm', 'Skip confirmation prompt')
    .action(async (options) => {
      const days = parseInt(options.days, 10);

      if (!options.confirm) {
        console.log(
          chalk.yellow(`\n⚠️  This will delete completed/failed emails older than ${days} days`)
        );
        console.log(chalk.dim('Run with --confirm to proceed\n'));
        return;
      }

      const queue = new EmailQueue();
      const deleted = queue.purge(days);
      queue.close();

      console.log(chalk.green(`✓ Purged ${deleted} old email(s)`));
    });

  return cmd;
}
