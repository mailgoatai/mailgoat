/**
 * Delete command for MailGoat CLI
 * Delete email messages with various filtering options
 */

import { Command } from 'commander';
import chalk from 'chalk';
import prompts from 'prompts';
import { ConfigManager } from '../lib/config';
import { PostalClient } from '../lib/postal-client';
import { Formatter } from '../lib/formatter';
import { debugLogger } from '../lib/debug';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/**
 * Parse time duration string (e.g., "30d", "2w", "6h")
 * Returns milliseconds
 */
function _parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)([hdwmy])$/);

  if (!match) {
    throw new Error(`Invalid duration format: ${duration}. Use format like: 30d, 2w, 6h, 1m, 1y`);
  }

  const [, amount, unit] = match;
  const value = parseInt(amount, 10);

  const multipliers: Record<string, number> = {
    h: 60 * 60 * 1000, // hours
    d: 24 * 60 * 60 * 1000, // days
    w: 7 * 24 * 60 * 60 * 1000, // weeks
    m: 30 * 24 * 60 * 60 * 1000, // months (approximate)
    y: 365 * 24 * 60 * 60 * 1000, // years (approximate)
  };

  return value * multipliers[unit];
}

/**
 * Format duration for display
 */
function formatDuration(duration: string): string {
  const match = duration.match(/^(\d+)([hdwmy])$/);
  if (!match) return duration;

  const [, amount, unit] = match;

  const units: Record<string, string> = {
    h: 'hour',
    d: 'day',
    w: 'week',
    m: 'month',
    y: 'year',
  };

  const plural = parseInt(amount) > 1 ? 's' : '';
  return `${amount} ${units[unit]}${plural}`;
}

export function createDeleteCommand(): Command {
  const cmd = new Command('delete');

  cmd
    .description('Delete email messages')
    .argument('[message-id]', 'Message ID to delete (for single deletion)')
    .option('--older-than <duration>', 'Delete messages older than duration (e.g., 30d, 2w, 6h)')
    .option('--from <email>', 'Delete messages from specific sender')
    .option('--to <email>', 'Delete messages to specific recipient')
    .option('--tag <tag>', 'Delete messages with specific tag')
    .option('--subject <text>', 'Delete messages matching subject (partial match)')
    .option('--dry-run', 'Show what would be deleted without actually deleting')
    .option('-y, --yes', 'Skip confirmation prompt (USE WITH CAUTION)')
    .option('--limit <number>', 'Maximum number of messages to delete (for bulk operations)', '100')
    .option('--json', 'Output result as JSON')
    .action(async (messageId, options) => {
      const operationId = `delete-${Date.now()}`;
      debugLogger.timeStart(operationId, 'Delete operation');

      try {
        const configManager = new ConfigManager();
        const config = await configManager.load();
        const formatter = new Formatter(options.json);
        const client = new PostalClient(config);

        // Determine operation mode
        const isBulkDelete =
          options.olderThan || options.from || options.to || options.tag || options.subject;

        if (!messageId && !isBulkDelete) {
          throw new Error(
            'Must provide either a message ID or filtering options (--older-than, --from, etc.)'
          );
        }

        if (messageId && isBulkDelete) {
          throw new Error('Cannot use message ID with bulk filtering options');
        }

        // Single message deletion
        if (messageId) {
          debugLogger.log('main', `Deleting single message: ${messageId}`);

          // Confirm deletion (unless --yes flag)
          if (!options.yes && !options.dryRun) {
            if (!options.json) {
              const response = await prompts({
                type: 'confirm',
                name: 'confirm',
                message: `Delete message ${messageId}?`,
                initial: false,
              });

              if (!response.confirm) {
                console.log(chalk.yellow('Cancelled'));
                return;
              }
            }
          }

          if (options.dryRun) {
            if (options.json) {
              formatter.output({
                dryRun: true,
                action: 'delete',
                messageId,
              });
            } else {
              console.log(chalk.cyan('[DRY RUN] Would delete message:'), messageId);
            }
            return;
          }

          // Perform deletion
          debugLogger.timeStart(`${operationId}-delete`, 'Delete message');
          await client.deleteMessage(messageId);
          debugLogger.timeEnd(`${operationId}-delete`);

          if (options.json) {
            formatter.output({
              success: true,
              deleted: [messageId],
              count: 1,
            });
          } else {
            console.log(chalk.green(`✓ Message ${messageId} deleted successfully`));
          }

          debugLogger.timeEnd(operationId);
          return;
        }

        // Bulk deletion with filters
        debugLogger.log('main', 'Starting bulk delete operation');

        // Build filter summary
        const filters: string[] = [];
        if (options.olderThan) {
          filters.push(`older than ${formatDuration(options.olderThan)}`);
        }
        if (options.from) {
          filters.push(`from ${options.from}`);
        }
        if (options.to) {
          filters.push(`to ${options.to}`);
        }
        if (options.tag) {
          filters.push(`tagged with "${options.tag}"`);
        }
        if (options.subject) {
          filters.push(`subject contains "${options.subject}"`);
        }

        if (!options.json) {
          console.log(chalk.cyan('Bulk delete operation:'));
          console.log(chalk.cyan('Filters:'));
          filters.forEach((f) => console.log(chalk.cyan(`  • ${f}`)));
          console.log();
        }

        // TODO: In a real implementation, we would:
        // 1. Query messages matching the filters
        // 2. Get list of message IDs
        // 3. Confirm with user (show count)
        // 4. Delete each message
        //
        // For now, this is a placeholder that shows the intended flow

        console.log(
          chalk.yellow(
            'Note: Bulk delete with filters requires inbox listing API (not yet implemented)'
          )
        );
        console.log(chalk.yellow('For now, use single message deletion by ID'));
        console.log();
        console.log(chalk.cyan('Example:'));
        console.log(chalk.gray('  mailgoat delete msg-12345'));

        if (options.json) {
          formatter.output({
            error: 'Bulk delete with filters not yet implemented',
            availableOperations: ['single message delete by ID'],
          });
        }

        debugLogger.timeEnd(operationId);
      } catch (error: unknown) {
        debugLogger.timeEnd(operationId);
        debugLogger.logError('main', error);

        const formatter = new Formatter(options.json);
        console.error(formatter.error(getErrorMessage(error)));
        process.exit(1);
      }
    });

  return cmd;
}
