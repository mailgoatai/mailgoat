import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import { Formatter } from '../lib/formatter';
import { debugLogger } from '../lib/debug';
import {
  CachedMessage,
  getDefaultInboxCachePath,
  loadCachedMessages,
  parseSearchDate,
  searchCachedMessages,
  SearchOrder,
  SearchSortField,
  sortCachedMessages,
} from '../lib/message-search';

function formatDate(timestamp: number): string {
  return new Date(timestamp).toISOString().split('T')[0];
}

function formatSearchTable(messages: CachedMessage[]): string {
  if (messages.length === 0) {
    return chalk.yellow('No messages matched your search filters.');
  }

  const table = new Table({
    head: [
      chalk.bold('Message ID'),
      chalk.bold('From'),
      chalk.bold('To'),
      chalk.bold('Subject'),
      chalk.bold('Date'),
      chalk.bold('Tag'),
      chalk.bold('Att'),
    ],
    colWidths: [20, 28, 28, 34, 12, 14, 7],
    wordWrap: true,
  });

  for (const message of messages) {
    const hasAttachments =
      message.has_attachments === true ||
      (Array.isArray(message.attachments) && message.attachments.length > 0);

    table.push([
      message.id,
      message.from,
      (message.to || []).join(', '),
      message.subject || '(no subject)',
      formatDate(Date.parse(message.received_at)),
      message.tag || '-',
      hasAttachments ? 'yes' : 'no',
    ]);
  }

  return table.toString();
}

export function createSearchCommand(): Command {
  const cmd = new Command('search');

  cmd
    .description('Search messages from local inbox cache with filters')
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
    .option('--cache-path <path>', 'Path to inbox cache JSON file')
    .option('--json', 'Output results as JSON')
    .action(async (options) => {
      const operationId = `search-${Date.now()}`;
      debugLogger.timeStart(operationId, 'Search operation');

      try {
        const formatter = new Formatter(options.json);

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

        let afterTimestamp: number | undefined;
        let beforeTimestamp: number | undefined;

        if (options.after) {
          afterTimestamp = parseSearchDate(options.after);
        }
        if (options.before) {
          beforeTimestamp = parseSearchDate(options.before);
        }

        const limit = parseInt(options.limit, 10);
        if (Number.isNaN(limit) || limit < 1 || limit > 1000) {
          throw new Error('Limit must be between 1 and 1000');
        }

        const sort = options.sort as SearchSortField;
        if (!['date', 'from', 'to', 'subject'].includes(sort)) {
          throw new Error('Sort must be one of: date, from, to, subject');
        }

        const order = options.order as SearchOrder;
        if (!['asc', 'desc'].includes(order)) {
          throw new Error('Order must be one of: asc, desc');
        }

        const cachePath = options.cachePath || getDefaultInboxCachePath();
        const cachedMessages = await loadCachedMessages(cachePath);

        const filters = {
          from: options.from,
          to: options.to,
          subject: options.subject,
          body: options.body,
          after: afterTimestamp,
          before: beforeTimestamp,
          tag: options.tag,
          hasAttachment: options.hasAttachment,
        };

        const filtered = searchCachedMessages(cachedMessages, filters);
        const sorted = sortCachedMessages(filtered, sort, order);
        const messages = sorted.slice(0, limit);

        if (options.json) {
          formatter.output({
            success: true,
            count: messages.length,
            total: filtered.length,
            cachePath,
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
              sort,
              order,
            },
            messages,
          });
        } else {
          const filterSummary: string[] = [];
          if (options.from) filterSummary.push(`from: ${options.from}`);
          if (options.to) filterSummary.push(`to: ${options.to}`);
          if (options.subject) filterSummary.push(`subject contains: "${options.subject}"`);
          if (options.body) filterSummary.push(`body contains: "${options.body}"`);
          if (options.after) filterSummary.push(`after: ${formatDate(afterTimestamp!)}`);
          if (options.before) filterSummary.push(`before: ${formatDate(beforeTimestamp!)}`);
          if (options.tag) filterSummary.push(`tag: ${options.tag}`);
          if (options.hasAttachment) filterSummary.push('has attachment: yes');
          filterSummary.push(`limit: ${limit}`);
          filterSummary.push(`sort: ${sort} (${order})`);

          console.log(chalk.cyan('Search filters:'));
          filterSummary.forEach((value) => console.log(chalk.cyan(`  • ${value}`)));
          console.log(chalk.gray(`Cache: ${cachePath}`));
          console.log();

          console.log(formatSearchTable(messages));
          console.log();
          console.log(
            chalk.green(`Found ${filtered.length} message(s), showing ${messages.length}.`)
          );
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
