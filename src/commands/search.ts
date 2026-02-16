/**
 * Search command for MailGoat CLI
 * Search messages with various filtering options
 */

import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import { ConfigManager } from '../lib/config';
import { PostalClient } from '../lib/postal-client';
import { Formatter } from '../lib/formatter';
import { debugLogger } from '../lib/debug';

/**
 * Parse date string to timestamp
 * Supports ISO dates and relative dates
 */
function parseDate(dateStr: string): number {
  // Try ISO date first
  const isoDate = new Date(dateStr);
  if (!isNaN(isoDate.getTime())) {
    return isoDate.getTime();
  }

  // Try relative dates (e.g., "7d", "2w", "1m")
  const match = dateStr.match(/^(\d+)([hdwmy])$/);
  if (match) {
    const [, amount, unit] = match;
    const value = parseInt(amount, 10);

    const multipliers: Record<string, number> = {
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
      w: 7 * 24 * 60 * 60 * 1000,
      m: 30 * 24 * 60 * 60 * 1000,
      y: 365 * 24 * 60 * 60 * 1000,
    };

    return Date.now() - value * multipliers[unit];
  }

  throw new Error(`Invalid date format: ${dateStr}. Use ISO date (2024-01-01) or relative (7d, 2w)`);
}

/**
 * Format date for display
 */
function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toISOString().split('T')[0];
}

export function createSearchCommand(): Command {
  const cmd = new Command('search');

  cmd
    .description('Search messages with filters')
    .option('--from <email>', 'Search messages from specific sender')
    .option('--to <email>', 'Search messages to specific recipient')
    .option('--subject <text>', 'Search messages by subject (partial match)')
    .option('--body <text>', 'Search message body content')
    .option('--after <date>', 'Messages after date (ISO format or relative like 7d)')
    .option('--before <date>', 'Messages before date (ISO format or relative like 7d)')
    .option('--tag <tag>', 'Search messages with specific tag')
    .option('--has-attachment', 'Only messages with attachments')
    .option('--limit <number>', 'Maximum number of results (default: 25)', '25')
    .option('--sort <field>', 'Sort by: date, from, to, subject (default: date)', 'date')
    .option('--order <direction>', 'Sort order: asc, desc (default: desc)', 'desc')
    .option('--json', 'Output results as JSON')
    .action(async (options) => {
      const operationId = `search-${Date.now()}`;
      debugLogger.timeStart(operationId, 'Search operation');

      try {
        const configManager = new ConfigManager();
        const config = await configManager.load();
        const formatter = new Formatter(options.json);

        // Validate at least one filter
        const hasFilter =
          options.from ||
          options.to ||
          options.subject ||
          options.body ||
          options.after ||
          options.before ||
          options.tag ||
          options.hasAttachment;

        if (!hasFilter) {
          throw new Error(
            'At least one filter required: --from, --to, --subject, --body, --after, --before, --tag, --has-attachment'
          );
        }

        // Parse dates if provided
        let afterTimestamp: number | undefined;
        let beforeTimestamp: number | undefined;

        if (options.after) {
          afterTimestamp = parseDate(options.after);
          debugLogger.log('main', `After: ${formatDate(afterTimestamp)}`);
        }

        if (options.before) {
          beforeTimestamp = parseDate(options.before);
          debugLogger.log('main', `Before: ${formatDate(beforeTimestamp)}`);
        }

        const limit = parseInt(options.limit, 10);
        if (isNaN(limit) || limit < 1 || limit > 1000) {
          throw new Error('Limit must be between 1 and 1000');
        }

        // Build filter summary
        const filters: string[] = [];
        if (options.from) filters.push(`from: ${options.from}`);
        if (options.to) filters.push(`to: ${options.to}`);
        if (options.subject) filters.push(`subject contains: "${options.subject}"`);
        if (options.body) filters.push(`body contains: "${options.body}"`);
        if (options.after) filters.push(`after: ${formatDate(afterTimestamp!)}`);
        if (options.before) filters.push(`before: ${formatDate(beforeTimestamp!)}`);
        if (options.tag) filters.push(`tag: ${options.tag}`);
        if (options.hasAttachment) filters.push('has attachment: yes');
        filters.push(`limit: ${limit}`);
        filters.push(`sort: ${options.sort} (${options.order})`);

        if (!options.json) {
          console.log(chalk.cyan('Search filters:'));
          filters.forEach((f) => console.log(chalk.cyan(`  • ${f}`)));
          console.log();
        }

        // TODO: Implement actual search when Postal API is available
        // For now, show what would be searched
        console.log(
          chalk.yellow(
            'Note: Message search requires inbox/message listing API (not yet implemented)'
          )
        );
        console.log(chalk.yellow('This feature will be available in a future release.'));
        console.log();
        console.log(chalk.cyan('Planned search capabilities:'));
        console.log(chalk.gray('  • Full-text search in subject and body'));
        console.log(chalk.gray('  • Filter by sender and recipient'));
        console.log(chalk.gray('  • Date range filtering'));
        console.log(chalk.gray('  • Tag-based search'));
        console.log(chalk.gray('  • Attachment filtering'));
        console.log(chalk.gray('  • Customizable sorting'));
        console.log();
        console.log(chalk.cyan('Example search queries:'));
        console.log(chalk.gray('  mailgoat search --from user@example.com'));
        console.log(chalk.gray('  mailgoat search --subject "invoice" --after 2024-01-01'));
        console.log(chalk.gray('  mailgoat search --body "urgent" --has-attachment'));
        console.log(chalk.gray('  mailgoat search --tag newsletter --after 7d --limit 50'));

        if (options.json) {
          formatter.output({
            error: 'Search not yet implemented',
            filters: {
              from: options.from,
              to: options.to,
              subject: options.subject,
              body: options.body,
              after: afterTimestamp,
              before: beforeTimestamp,
              tag: options.tag,
              hasAttachment: options.hasAttachment,
              limit,
              sort: options.sort,
              order: options.order,
            },
            availableWhenImplemented: [
              'Full-text search',
              'Sender/recipient filtering',
              'Date range queries',
              'Tag search',
              'Attachment filtering',
              'Custom sorting',
            ],
          });
        }

        debugLogger.timeEnd(operationId);
      } catch (error: any) {
        debugLogger.timeEnd(operationId);
        debugLogger.logError('main', error);

        const formatter = new Formatter(options.json);
        console.error(formatter.error(error.message));
        process.exit(1);
      }
    });

  return cmd;
}
