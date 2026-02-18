import { Command } from 'commander';
import chalk from 'chalk';
import { promises as fs } from 'fs';
import { ConfigManager } from '../lib/config';
import { PostalClient } from '../lib/postal-client';
import { Formatter } from '../lib/formatter';
import { validationService } from '../lib/validation-service';
import { debugLogger } from '../lib/debug';
import { TemplateManager } from '../lib/template-manager';
import { SchedulerStore, parseScheduleInput } from '../lib/scheduler';
import { metrics } from '../lib/metrics';
import { inferExitCode } from '../lib/errors';
import {
  formatBytes,
  prepareAttachment,
  validateAttachmentSize,
  type PreparedAttachment,
} from '../lib/attachment-utils';

function collectAttachment(value: string, previous: string[]): string[] {
  previous.push(value);
  return previous;
}

async function loadJsonData(filePath: string): Promise<Record<string, unknown>> {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Data file must contain a JSON object');
    }
    return parsed as Record<string, unknown>;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to load template data file '${filePath}': ${message}`);
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export function createSendCommand(): Command {
  const cmd = new Command('send');

  cmd
    .description('Send an email message')
    .option('-t, --to <emails...>', 'Recipient email address(es) (required unless using template)')
    .option('-s, --subject <text>', 'Email subject (required unless using template)')
    .option(
      '-b, --body <text>',
      'Email body (plain text, required unless using template or --html)'
    )
    .option('-f, --from <email>', 'Sender email (defaults to config email)')
    .option('--cc <emails...>', 'CC recipients')
    .option('--bcc <emails...>', 'BCC recipients')
    .option('--html', 'Treat body as HTML instead of plain text')
    .option('--tag <tag>', 'Custom tag for this message')
    .option(
      '--attach <file>',
      'Attach file (repeat flag for multiple attachments)',
      collectAttachment,
      []
    )
    .option('--template <name>', 'Use email template')
    .option('--var <key=value...>', 'Template variables (e.g., --var name=John --var age=30)')
    .option('--data <file>', 'JSON file with template variables')
    .option('--schedule <datetime>', 'Schedule send time in local timezone (YYYY-MM-DD HH:mm)')
    .option('--no-retry', 'Disable automatic retry on failure (for debugging)')
    .option('--json', 'Output result as JSON')
    .action(async (options) => {
      const operationId = `send-${Date.now()}`;
      debugLogger.timeStart(operationId, 'Send email operation');

      try {
        debugLogger.timeStart(`${operationId}-config`, 'Load configuration');
        const configManager = new ConfigManager();
        const config = await configManager.load();
        debugLogger.timeEnd(`${operationId}-config`);

        const formatter = new Formatter(options.json);

        // Handle template if specified
        let templateData: any = {};
        const templateManager = new TemplateManager();
        const cliVariables = options.var
          ? TemplateManager.parseVariables(Array.isArray(options.var) ? options.var : [options.var])
          : {};
        const dataVariables = options.data ? await loadJsonData(options.data) : {};
        const variables = { ...dataVariables, ...cliVariables };

        if (options.template) {
          debugLogger.timeStart(`${operationId}-template`, 'Load and render template');
          const isTemplateFile = await fileExists(options.template);
          let rendered;

          if (isTemplateFile) {
            const templateBody = await fs.readFile(options.template, 'utf8');
            rendered = {
              name: options.template,
              subject: '',
              body: templateManager.renderString(templateBody, variables),
            };
          } else {
            const template = await templateManager.load(options.template);
            rendered = templateManager.render(template, variables);
          }
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

        const renderedSubject = options.subject
          ? templateManager.renderString(options.subject, variables)
          : undefined;
        const renderedBody = options.body ? templateManager.renderString(options.body, variables) : undefined;

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
          subject: renderedSubject || templateData.subject,
          body: options.html ? undefined : renderedBody || templateData.body,
          html: options.html ? renderedBody : templateData.html,
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
          subject: renderedSubject || templateData.subject,
          from: options.from || templateData.from,
        };

        // Set body (plain or HTML)
        if (options.html) {
          messageParams.html_body = renderedBody;
        } else if (renderedBody) {
          messageParams.plain_body = renderedBody;
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
        const attachFiles = Array.isArray(options.attach) ? options.attach : [];
        if (attachFiles.length > 0) {
          const attachments: PreparedAttachment[] = [];

          for (const filePath of attachFiles) {
            const attachment = await prepareAttachment(filePath);
            attachments.push(attachment);
            const sizeValidation = validateAttachmentSize(attachment.size, filePath);
            if (sizeValidation.warning && !options.json) {
              console.warn(chalk.yellow(`Warning: ${sizeValidation.warning}`));
            }
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

        if (options.schedule) {
          const scheduledDate = parseScheduleInput(options.schedule);
          if (scheduledDate.getTime() <= Date.now()) {
            throw new Error('Scheduled time must be in the future');
          }

          const store = new SchedulerStore();
          const queued = store.enqueue({
            scheduledForIso: scheduledDate.toISOString(),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
            payload: messageParams,
          });
          store.close();

          if (options.json) {
            formatter.output({
              status: 'scheduled',
              id: queued.id,
              scheduledFor: queued.scheduledForIso,
              timezone: queued.timezone,
            });
          } else {
            console.log(
              chalk.green(
                `✓ Email scheduled (ID ${queued.id}) for ${scheduledDate.toLocaleString()} (${queued.timezone})`
              )
            );
            console.log(chalk.cyan('Run `mailgoat scheduler start` to process scheduled emails.'));
          }
        } else {
          const sendStart = Date.now();
          if (to.length > 1) {
            metrics.incrementBatch('started');
          }
          // Send message immediately
          debugLogger.timeStart(`${operationId}-send`, 'Send message via API');
          const result = await client.sendMessage(messageParams);
          debugLogger.timeEnd(`${operationId}-send`);
          metrics.observeSendDuration((Date.now() - sendStart) / 1000);
          metrics.incrementEmail('success');
          if (to.length > 1) {
            metrics.incrementBatch('completed');
          }
          await metrics.pushIfConfigured(config.metrics?.pushgateway);

          // Output result
          const output = formatter.formatSendResponse(result);
          formatter.output(output);
        }

        debugLogger.timeEnd(operationId);
      } catch (error: any) {
        debugLogger.timeEnd(operationId);
        debugLogger.logError('main', error);
        metrics.incrementEmail('failed');
        metrics.incrementApiError(metrics.classifyApiError(error));
        if (Array.isArray(options?.to) && options.to.length > 1) {
          metrics.incrementBatch('failed');
        }

        const formatter = new Formatter(options.json);
        console.error(formatter.error(error.message));
        process.exit(inferExitCode(error));
      }
    });

  return cmd;
}
