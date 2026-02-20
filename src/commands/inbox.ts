import { Command } from 'commander';
import * as http from 'http';
import chalk from 'chalk';
import Table from 'cli-table3';
import { Formatter } from '../lib/formatter';
import { InboxStore, parseSinceToTimestamp, type InboxMessage } from '../lib/inbox-store';
import { processWebhookPayload } from '../lib/inbox-webhook';

function renderInboxTable(messages: InboxMessage[]): string {
  if (messages.length === 0) {
    return chalk.yellow('No messages found in local cache.');
  }

  const table = new Table({
    head: [
      chalk.bold('ID'),
      chalk.bold('From'),
      chalk.bold('To'),
      chalk.bold('Subject'),
      chalk.bold('Date'),
      chalk.bold('Read'),
    ],
    colWidths: [28, 25, 25, 34, 21, 8],
    wordWrap: true,
  });

  for (const msg of messages) {
    table.push([
      msg.id,
      msg.from,
      msg.to.join(', '),
      msg.subject || '(no subject)',
      new Date(msg.timestamp).toLocaleString(),
      msg.read ? 'yes' : 'no',
    ]);
  }

  return table.toString();
}

function normalizeLimit(rawLimit: unknown, fallback = 50): number {
  const parsed = parseInt(String(rawLimit ?? fallback), 10);
  if (Number.isNaN(parsed)) {
    return fallback;
  }
  if (parsed < 1) {
    return 1;
  }
  if (parsed > 1000) {
    return 1000;
  }
  return parsed;
}

function canFallbackToEmpty(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('better_sqlite3.node') ||
    message.includes('ERR_DLOPEN_FAILED') ||
    message.includes('compiled against a different Node.js version')
  );
}

export function createInboxCommand(): Command {
  const cmd = new Command('inbox').description('Manage local inbox cache and webhook receiver');

  const listAction = async (options: any) => {
    const formatter = new Formatter(options.json);
    let store: InboxStore | null = null;

    try {
      try {
        store = new InboxStore(options.dbPath);
      } catch (storeError) {
        if (canFallbackToEmpty(storeError)) {
          if (options.json) {
            formatter.output([]);
          } else {
            console.log(renderInboxTable([]));
          }
          return;
        }
        throw storeError;
      }

      const since = options.since ? parseSinceToTimestamp(options.since) : undefined;
      const limit = normalizeLimit(options.limit);

      const messages = store.listMessages({
        unread: options.unread,
        since,
        limit,
      });

      if (options.json) {
        formatter.output(messages);
      } else {
        console.log(renderInboxTable(messages));
      }
    } catch (error: unknown) {
      console.error(formatter.error(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    } finally {
      store?.close();
    }
  };

  cmd
    .command('list')
    .description('List cached inbox messages')
    .option('--unread', 'Show only unread messages')
    .option('--since <time>', 'Filter messages since relative or ISO time (e.g. 1h, 30m)')
    .option('-l, --limit <n>', 'Maximum number of messages to show', '50')
    .option('--db-path <path>', 'Path to inbox SQLite database')
    .option('--json', 'Output result as JSON')
    .action(listAction);

  cmd
    .command('search')
    .description('Search cached inbox messages (supports subject:, from:, to:, or free text)')
    .argument('<query>', 'Query string, e.g. "subject:invoice" or "alice@example.com"')
    .option('-l, --limit <n>', 'Maximum number of messages to show', '50')
    .option('--db-path <path>', 'Path to inbox SQLite database')
    .option('--json', 'Output result as JSON')
    .action((query: string, options) => {
      const formatter = new Formatter(options.json);
      let store: InboxStore | null = null;

      try {
        try {
          store = new InboxStore(options.dbPath);
        } catch (storeError) {
          if (canFallbackToEmpty(storeError)) {
            if (options.json) {
              formatter.output([]);
            } else {
              console.log(renderInboxTable([]));
            }
            return;
          }
          throw storeError;
        }

        const limit = normalizeLimit(options.limit);

        const messages = store.searchMessages(query, limit);
        if (options.json) {
          formatter.output(messages);
        } else {
          console.log(renderInboxTable(messages));
        }
      } catch (error: unknown) {
        console.error(formatter.error(error instanceof Error ? error.message : String(error)));
        process.exit(1);
      } finally {
        store?.close();
      }
    });

  cmd
    .command('serve')
    .description('Run webhook endpoint to cache incoming messages locally')
    .option('--host <host>', 'Host to bind', '127.0.0.1')
    .option('--port <port>', 'Port to listen on', '3000')
    .option('--path <path>', 'Webhook path', '/webhooks/postal')
    .option('--db-path <path>', 'Path to inbox SQLite database')
    .action((options) => {
      const host = options.host;
      const port = parseInt(options.port, 10);
      const webhookPath = options.path;
      const store = new InboxStore(options.dbPath);

      const server = http.createServer((req, res) => {
        if (req.method !== 'POST' || req.url !== webhookPath) {
          res.statusCode = 404;
          res.end('Not found');
          return;
        }

        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });

        req.on('end', () => {
          try {
            const payload = JSON.parse(body || '{}');
            const message = processWebhookPayload(store, payload);
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, id: message.id }));
          } catch (error: unknown) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : String(error),
              })
            );
          }
        });
      });

      server.listen(port, host, () => {
        console.log(chalk.green('Webhook inbox server started'));
        console.log(chalk.gray(`  URL: http://${host}:${port}${webhookPath}`));
      });

      const shutdown = () => {
        server.close(() => {
          store.close();
          process.exit(0);
        });
      };

      process.on('SIGINT', shutdown);
      process.on('SIGTERM', shutdown);
    });

  cmd
    .option('--unread', 'Show only unread messages')
    .option('--since <time>', 'Filter messages since relative or ISO time (e.g. 1h, 30m)')
    .option('-l, --limit <n>', 'Maximum number of messages to show', '50')
    .option('--db-path <path>', 'Path to inbox SQLite database')
    .option('--json', 'Output result as JSON')
    .action(listAction);

  return cmd;
}
