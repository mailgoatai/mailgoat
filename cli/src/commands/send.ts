import { Command } from 'commander';
import { ConfigManager } from '../lib/config';
import { PostalClient } from '../lib/postal-client';
import { Formatter } from '../lib/formatter';

export function createSendCommand(): Command {
  const cmd = new Command('send');

  cmd
    .description('Send an email message')
    .requiredOption('-t, --to <emails...>', 'Recipient email address(es)')
    .requiredOption('-s, --subject <text>', 'Email subject')
    .requiredOption('-b, --body <text>', 'Email body (plain text)')
    .option('-f, --from <email>', 'Sender email (defaults to config email)')
    .option('--cc <emails...>', 'CC recipients')
    .option('--bcc <emails...>', 'BCC recipients')
    .option('--html', 'Treat body as HTML instead of plain text')
    .option('--tag <tag>', 'Custom tag for this message')
    .option('--json', 'Output result as JSON')
    .action(async (options) => {
      try {
        const configManager = new ConfigManager();
        const config = configManager.load();
        const client = new PostalClient(config);
        const formatter = new Formatter(options.json);

        // Prepare message params
        const messageParams: any = {
          to: Array.isArray(options.to) ? options.to : [options.to],
          subject: options.subject,
          from: options.from,
        };

        // Set body (plain or HTML)
        if (options.html) {
          messageParams.html_body = options.body;
        } else {
          messageParams.plain_body = options.body;
        }

        // Optional fields
        if (options.cc) {
          messageParams.cc = Array.isArray(options.cc) ? options.cc : [options.cc];
        }
        if (options.bcc) {
          messageParams.bcc = Array.isArray(options.bcc) ? options.bcc : [options.bcc];
        }
        if (options.tag) {
          messageParams.tag = options.tag;
        }

        // Send message
        const result = await client.sendMessage(messageParams);

        // Output result
        const output = formatter.formatSendResponse(result);
        formatter.output(output);
      } catch (error: any) {
        const formatter = new Formatter(options.json);
        console.error(formatter.error(error.message));
        process.exit(1);
      }
    });

  return cmd;
}
