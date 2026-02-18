import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import { ConfigManager } from '../lib/config';
import { PostalClient } from '../lib/postal-client';
import { Formatter } from '../lib/formatter';

function deliveryState(deliveries: Array<Record<string, unknown>>): string {
  if (deliveries.length === 0) return 'pending';
  const asText = JSON.stringify(deliveries).toLowerCase();
  if (asText.includes('bounc')) return 'bounced';
  if (asText.includes('delivered') || asText.includes('sent')) return 'delivered';
  return 'pending';
}

export function createInspectCommand(): Command {
  const cmd = new Command('inspect');

  cmd
    .description('Inspect message headers, recipients, and delivery state')
    .argument('<message-id>', 'Message ID/token to inspect')
    .option('--json', 'Output as JSON')
    .action(async (messageId: string, options) => {
      try {
        const config = await new ConfigManager().load();
        const client = new PostalClient(config);
        const formatter = new Formatter(options.json);

        const message = await client.getMessage(messageId, [
          'status',
          'details',
          'headers',
          'inspection',
          'plain_body',
          'html_body',
          'attachments',
        ]);
        const deliveries = await client.getDeliveries(messageId);
        const status = deliveryState(deliveries as Array<Record<string, unknown>>);

        if (options.json) {
          formatter.output({ messageId, status, message, deliveries });
          return;
        }

        console.log(chalk.bold.cyan(`Inspecting message: ${messageId}`));
        console.log(chalk.green(`Delivery status: ${status}`));

        const recipientTable = new Table({
          head: [chalk.bold('Recipient'), chalk.bold('State')],
        });

        const recipient = message.details?.rcpt_to || 'unknown';
        recipientTable.push([recipient, status]);
        console.log('\nRecipients:\n' + recipientTable.toString());

        const headers = message.headers || {};
        const headersTable = new Table({
          head: [chalk.bold('Header'), chalk.bold('Value')],
          wordWrap: true,
          colWidths: [30, 90],
        });
        Object.entries(headers).forEach(([key, value]) => headersTable.push([key, String(value)]));
        console.log('\nHeaders:\n' + headersTable.toString());

        console.log(chalk.yellow('\nSMTP logs (if available):'));
        if (deliveries.length === 0) {
          console.log('  No delivery records returned by Postal API.');
        } else {
          deliveries.forEach((delivery, index) => {
            console.log(`  [${index + 1}] ${JSON.stringify(delivery)}`);
          });
        }
      } catch (error: unknown) {
        const formatter = new Formatter(options.json);
        const message = error instanceof Error ? error.message : String(error);
        console.error(formatter.error(message));
        process.exit(1);
      }
    });

  return cmd;
}
