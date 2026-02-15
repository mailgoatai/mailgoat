import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import mime from 'mime-types';
import chalk from 'chalk';
import { ConfigManager } from '../lib/config';
import { PostalClient } from '../lib/postal-client';
import { Formatter } from '../lib/formatter';
import { validationService } from '../lib/validation-service';
import { debugLogger } from '../lib/debug';
import { TemplateManager } from '../lib/template-manager';

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
    .option('-t, --to <emails...>', 'Recipient email address(es) (required unless using template)')
    .option('-s, --subject <text>', 'Email subject (required unless using template)')
    .option('-b, --body <text>', 'Email body (plain text, required unless using template or --html)')
    .option('-f, --from <email>', 'Sender email (defaults to config email)')
    .option('--cc <emails...>', 'CC recipients')
    .option('--bcc <emails...>', 'BCC recipients')
    .option('--html', 'Treat body as HTML instead of plain text')
    .option('--tag <tag>', 'Custom tag for this message')
    .option('--attach <files...>', 'Attach files (can specify multiple)')
    .option('--template <name>', 'Use email template')
    .option('--var <key=value...>', 'Template variables (e.g., --var name=John --var age=30)')
    .option('--no-retry', 'Disable automatic retry on failure (for debugging)')
    .option('--json', 'Output result as JSON')
    .action(async (options) => {
      const operationId = `send-${Date.now()}`;
      debugLogger.timeStart(operationId, 'Send email operation');

      try {
        debugLogger.timeStart(`${operationId}-config`, 'Load configuration');
        const configManager = new ConfigManager();
        const config = configManager.load();
        debugLogger.timeEnd(`${operationId}-config`);

        const formatter = new Formatter(options.json);

        // Handle template if specified
        let templateData: any = {};
        if (options.template) {
          debugLogger.timeStart(`${operationId}-template`, 'Load and render template');
          const templateManager = new TemplateManager();
          const template = templateManager.load(options.template);

          // Parse variables
          const variables = options.var
            ? TemplateManager.parseVariables(
                Array.isArray(options.var) ? options.var : [options.var]
              )
            : {};

          // Render template
          const rendered = templateManager.render(template, variables);
          debugLogger.timeEnd(`${operationId}-template`);

          // Use template values, but allow CLI options to override
          templateData = {
            subject: rendered.subject,
            body: rendered.body,
            html: rendered.html,
            from: rendered.from,
            cc: rendered.cc,
            bcc: rendered.bcc,
            tag: rendered.tag,
          };

          if (!options.json) {
            console.log(chalk.cyan(`Using template: ${options.template}`));
          }
        }

        // Check that required fields are present (either from template or CLI)
        if (!options.to && !templateData.to) {
          throw new Error('Recipient(s) required: use --to or template with default recipients');
        }

        if (!options.subject && !templateData.subject) {
          throw new Error('Subject required: use --subject or template with subject');
        }

        if (!options.body && !templateData.body && !templateData.html) {
          throw new Error('Body required: use --body, --html, or template with body');
        }

        // Normalize inputs (CLI options override template)
        const to = options.to
          ? Array.isArray(options.to)
            ? options.to
            : [options.to]
          : templateData.to || [];
        const cc = options.cc
          ? Array.isArray(options.cc)
            ? options.cc
            : [options.cc]
          : templateData.cc;
        const bcc = options.bcc
          ? Array.isArray(options.bcc)
            ? options.bcc
            : [options.bcc]
          : templateData.bcc;

        // Validate inputs before processing
        debugLogger.timeStart(`${operationId}-validate`, 'Validate inputs');
        const validation = validationService.validateSendOptions({
          to,
          cc,
          bcc,
          subject: options.subject,
          body: options.html ? undefined : options.body,
          html: options.html ? options.body : undefined,
          from: options.from,
          tag: options.tag,
          attachments: options.attach,
        });

        if (!validation.valid) {
          throw new Error(validation.error);
        }
        debugLogger.timeEnd(`${operationId}-validate`);

        // Create client after validation
        debugLogger.timeStart(`${operationId}-client`, 'Initialize Postal client');
        const client = new PostalClient(config, {
          enableRetry: options.retry !== false,
        });
        debugLogger.timeEnd(`${operationId}-client`);

        // Prepare message params (CLI options override template)
        const messageParams: any = {
          to,
          subject: options.subject || templateData.subject,
          from: options.from || templateData.from,
        };

        // Set body (plain or HTML)
        if (options.html) {
          messageParams.html_body = options.body;
        } else if (options.body) {
          messageParams.plain_body = options.body;
        } else if (templateData.html) {
          messageParams.html_body = templateData.html;
        } else if (templateData.body) {
          messageParams.plain_body = templateData.body;
        }

        // Optional fields
        if (cc) {
          messageParams.cc = cc;
        }
        if (bcc) {
          messageParams.bcc = bcc;
        }
        if (options.tag || templateData.tag) {
          messageParams.tag = options.tag || templateData.tag;
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
        debugLogger.timeStart(`${operationId}-send`, 'Send message via API');
        const result = await client.sendMessage(messageParams);
        debugLogger.timeEnd(`${operationId}-send`);

        // Output result
        const output = formatter.formatSendResponse(result);
        formatter.output(output);

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
