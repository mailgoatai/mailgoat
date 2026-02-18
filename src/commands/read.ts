import { Command } from 'commander';
import { ConfigManager } from '../lib/config';
import { PostalClient } from '../lib/postal-client';
import { Formatter } from '../lib/formatter';
import { InboxStore } from '../lib/inbox-store';

export function createReadCommand(): Command {
  const cmd = new Command('read');

  cmd
    .description('Read a specific message by ID')
    .argument('<message-id>', 'Message ID to read')
    .option('--json', 'Output result as JSON')
    .option('--full', 'Include all expansions (headers, attachments, etc.)')
    .option('--no-retry', 'Disable automatic retry on failure (for debugging)')
    .action(async (messageId: string, options) => {
      try {
        const configManager = new ConfigManager();
        const config = await configManager.load();
        const client = new PostalClient(config, {
          enableRetry: options.retry !== false,
        });
        const formatter = new Formatter(options.json);

        // Determine which expansions to request
        let expansions = ['status', 'details', 'plain_body', 'inspection'];

        if (options.full) {
          // Request all available expansions
          expansions = [
            'status',
            'details',
            'inspection',
            'plain_body',
            'html_body',
            'attachments',
            'headers',
          ];
        }

        // Fetch message
        const message = await client.getMessage(messageId, expansions);

        // Mark message as read in local cache if present
        const store = new InboxStore();
        try {
          store.markAsRead(messageId);
        } finally {
          store.close();
        }

        // Output result
        const output = formatter.formatMessage(message);
        formatter.output(output);
      } catch (error: any) {
        const formatter = new Formatter(options.json);
        console.error(formatter.error(error.message));
        process.exit(1);
      }
    });

  return cmd;
}
