import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import mime from 'mime-types';
import chalk from 'chalk';
import { ConfigManager } from '../lib/config';
import { PostalClient } from '../lib/postal-client';
import { Formatter } from '../lib/formatter';

const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_TOTAL_SIZE = 25 * 1024 * 1024; // 25MB

interface AttachmentInfo {
  name: string;
  content_type: string;
  data: string;
  size: number;
}

/**
 * Read and prepare attachment for sending
 */
function prepareAttachment(filePath: string): AttachmentInfo {
  // Check file exists
  if (!fs.existsSync(filePath)) {
    throw new Error(`Attachment file not found: ${filePath}`);
  }

  // Get file stats
  const stats = fs.statSync(filePath);

  if (!stats.isFile()) {
    throw new Error(`Not a file: ${filePath}`);
  }

  // Check size
  if (stats.size > MAX_ATTACHMENT_SIZE) {
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    throw new Error(`Attachment too large: ${filePath} (${sizeMB}MB). Maximum is 10MB per file.`);
  }

  // Read file
  const content = fs.readFileSync(filePath);

  // Encode to base64
  const base64Content = content.toString('base64');

  // Detect MIME type
  const fileName = path.basename(filePath);
  const mimeType = mime.lookup(filePath) || 'application/octet-stream';

  return {
    name: fileName,
    content_type: mimeType,
    data: base64Content,
    size: stats.size,
  };
}

/**
 * Format file size for display
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

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
    .option('--attach <files...>', 'Attach files (can specify multiple)')
    .option('--no-retry', 'Disable automatic retry on failure (for debugging)')
    .option('--json', 'Output result as JSON')
    .action(async (options) => {
      try {
        const configManager = new ConfigManager();
        const config = configManager.load();
        const client = new PostalClient(config, {
          enableRetry: options.retry !== false, // --no-retry sets this to false
        });
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

        // Process attachments
        if (options.attach) {
          const attachments: AttachmentInfo[] = [];
          let totalSize = 0;

          const attachFiles = Array.isArray(options.attach) ? options.attach : [options.attach];

          for (const filePath of attachFiles) {
            const attachment = prepareAttachment(filePath);
            attachments.push(attachment);
            totalSize += attachment.size;

            // Warn for large attachments
            if (attachment.size > MAX_ATTACHMENT_SIZE * 0.5 && !options.json) {
              console.warn(
                chalk.yellow(
                  `⚠ Warning: Large attachment ${attachment.name} (${formatBytes(attachment.size)})`
                )
              );
            }
          }

          // Check total size
          if (totalSize > MAX_TOTAL_SIZE) {
            throw new Error(
              `Total attachment size ${formatBytes(totalSize)} exceeds maximum of ${formatBytes(MAX_TOTAL_SIZE)}`
            );
          }

          messageParams.attachments = attachments;

          // Show attachment summary (if not JSON mode)
          if (!options.json) {
            console.log(chalk.cyan(`📎 Attaching ${attachments.length} file(s):`));
            for (const att of attachments) {
              console.log(
                chalk.cyan(`   • ${att.name} (${formatBytes(att.size)}, ${att.content_type})`)
              );
            }
          }
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
