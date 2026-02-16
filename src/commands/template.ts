/**
 * Template command for MailGoat CLI
 * Manage email templates
 */

import { Command } from 'commander';
import * as fs from 'fs';
import chalk from 'chalk';
import Table from 'cli-table3';
import { TemplateManager, EmailTemplate } from '../lib/template-manager';
import { Formatter } from '../lib/formatter';
import { debugLogger } from '../lib/debug';

export function createTemplateCommand(): Command {
  const cmd = new Command('template');

  cmd.description('Manage email templates');

  // Create subcommand
  cmd
    .command('create <name>')
    .description('Create a new email template')
    .requiredOption('-s, --subject <text>', 'Email subject')
    .option('-b, --body <text>', 'Plain text body')
    .option('--html <text>', 'HTML body')
    .option('--body-file <path>', 'Read body from file')
    .option('--html-file <path>', 'Read HTML body from file')
    .option('-f, --from <email>', 'Default from address')
    .option('--cc <emails...>', 'Default CC recipients')
    .option('--bcc <emails...>', 'Default BCC recipients')
    .option('--tag <tag>', 'Default tag')
    .option('--description <text>', 'Template description')
    .option('--json', 'Output result as JSON')
    .action(async (name, options) => {
      try {
        debugLogger.timeStart('template-create', 'Create template');

        const manager = new TemplateManager();

        // Read body from file if specified
        let body = options.body;
        if (options.bodyFile) {
          try {
            await fs.promises.access(options.bodyFile);
          } catch {
            throw new Error(`Body file not found: ${options.bodyFile}`);
          }
          body = await fs.promises.readFile(options.bodyFile, 'utf8');
        }

        // Read HTML from file if specified
        let html = options.html;
        if (options.htmlFile) {
          try {
            await fs.promises.access(options.htmlFile);
          } catch {
            throw new Error(`HTML file not found: ${options.htmlFile}`);
          }
          html = await fs.promises.readFile(options.htmlFile, 'utf8');
        }

        // Validate that we have at least one body
        if (!body && !html) {
          throw new Error('Must provide either --body, --html, --body-file, or --html-file');
        }

        const template: EmailTemplate = {
          name,
          subject: options.subject,
          body,
          html,
          from: options.from,
          cc: options.cc,
          bcc: options.bcc,
          tag: options.tag,
          description: options.description,
        };

        await manager.create(template);

        const formatter = new Formatter(options.json);

        if (options.json) {
          formatter.output({ success: true, template: name });
        } else {
          console.log(chalk.green(`✓ Template '${name}' created successfully`));
          console.log();
          console.log(chalk.cyan('Location:'), manager.getTemplatesDir());
          console.log();
          console.log(chalk.cyan('Use with:'));
          console.log(chalk.gray(`  mailgoat send --template ${name} --to user@example.com`));
        }

        debugLogger.timeEnd('template-create');
      } catch (error: any) {
        const formatter = new Formatter(options.json);
        console.error(formatter.error(error.message));
        process.exit(1);
      }
    });

  // List subcommand
  cmd
    .command('list')
    .description('List all templates')
    .option('--json', 'Output result as JSON')
    .action(async (options) => {
      try {
        const manager = new TemplateManager();
        const templates = await manager.list();

        const formatter = new Formatter(options.json);

        if (options.json) {
          formatter.output({ templates });
        } else {
          if (templates.length === 0) {
            console.log(chalk.yellow('No templates found'));
            console.log();
            console.log(chalk.cyan('Create a template:'));
            console.log(
              chalk.gray(
                '  mailgoat template create welcome --subject "Welcome!" --body "Hello {{name}}"'
              )
            );
            return;
          }

          const table = new Table({
            head: [
              chalk.cyan('Name'),
              chalk.cyan('Subject'),
              chalk.cyan('Has HTML'),
              chalk.cyan('Description'),
            ],
            colWidths: [20, 40, 10, 30],
            wordWrap: true,
          });

          templates.forEach((template) => {
            table.push([
              template.name,
              template.subject.substring(0, 37) + (template.subject.length > 37 ? '...' : ''),
              template.html ? chalk.green('Yes') : chalk.gray('No'),
              template.description || chalk.gray('(none)'),
            ]);
          });

          console.log(table.toString());
          console.log();
          console.log(chalk.gray(`Total: ${templates.length} template(s)`));
        }
      } catch (error: any) {
        const formatter = new Formatter(options.json);
        console.error(formatter.error(error.message));
        process.exit(1);
      }
    });

  // Show subcommand
  cmd
    .command('show <name>')
    .description('Show template details')
    .option('--json', 'Output result as JSON')
    .action(async (name, options) => {
      try {
        const manager = new TemplateManager();
        const template = await manager.load(name);

        const formatter = new Formatter(options.json);

        if (options.json) {
          formatter.output({ template });
        } else {
          console.log(chalk.cyan.bold(`Template: ${template.name}`));
          console.log();
          console.log(chalk.cyan('Subject:'), template.subject);

          if (template.description) {
            console.log(chalk.cyan('Description:'), template.description);
          }

          if (template.from) {
            console.log(chalk.cyan('From:'), template.from);
          }

          if (template.cc && template.cc.length > 0) {
            console.log(chalk.cyan('CC:'), template.cc.join(', '));
          }

          if (template.bcc && template.bcc.length > 0) {
            console.log(chalk.cyan('BCC:'), template.bcc.join(', '));
          }

          if (template.tag) {
            console.log(chalk.cyan('Tag:'), template.tag);
          }

          console.log();

          if (template.body) {
            console.log(chalk.cyan('Plain Body:'));
            console.log(chalk.gray('─'.repeat(60)));
            console.log(template.body);
            console.log(chalk.gray('─'.repeat(60)));
            console.log();
          }

          if (template.html) {
            console.log(chalk.cyan('HTML Body:'));
            console.log(chalk.gray('─'.repeat(60)));
            console.log(template.html.substring(0, 500));
            if (template.html.length > 500) {
              console.log(chalk.gray(`... (${template.html.length - 500} more characters)`));
            }
            console.log(chalk.gray('─'.repeat(60)));
            console.log();
          }

          if (template.created_at) {
            console.log(chalk.gray(`Created: ${template.created_at}`));
          }

          if (template.updated_at) {
            console.log(chalk.gray(`Updated: ${template.updated_at}`));
          }
        }
      } catch (error: any) {
        const formatter = new Formatter(options.json);
        console.error(formatter.error(error.message));
        process.exit(1);
      }
    });

  // Delete subcommand
  cmd
    .command('delete <name>')
    .description('Delete a template')
    .option('--json', 'Output result as JSON')
    .option('-y, --yes', 'Skip confirmation')
    .action(async (name, options) => {
      try {
        const manager = new TemplateManager();

        // Check if template exists
        if (!(await manager.exists(name))) {
          throw new Error(`Template '${name}' not found`);
        }

        // Confirm deletion unless --yes flag is used
        if (!options.yes) {
          const prompts = await import('prompts');
          const response = await prompts.default({
            type: 'confirm',
            name: 'confirm',
            message: `Delete template '${name}'?`,
            initial: false,
          });

          if (!response.confirm) {
            console.log(chalk.yellow('Cancelled'));
            return;
          }
        }

        await manager.delete(name);

        const formatter = new Formatter(options.json);

        if (options.json) {
          formatter.output({ success: true, deleted: name });
        } else {
          console.log(chalk.green(`✓ Template '${name}' deleted`));
        }
      } catch (error: any) {
        const formatter = new Formatter(options.json);
        console.error(formatter.error(error.message));
        process.exit(1);
      }
    });

  // Edit subcommand
  cmd
    .command('edit <name>')
    .description('Edit an existing template')
    .option('-s, --subject <text>', 'Email subject')
    .option('-b, --body <text>', 'Plain text body')
    .option('--html <text>', 'HTML body')
    .option('--body-file <path>', 'Read body from file')
    .option('--html-file <path>', 'Read HTML body from file')
    .option('-f, --from <email>', 'Default from address')
    .option('--cc <emails...>', 'Default CC recipients')
    .option('--bcc <emails...>', 'Default BCC recipients')
    .option('--tag <tag>', 'Default tag')
    .option('--description <text>', 'Template description')
    .option('--json', 'Output result as JSON')
    .action(async (name, options) => {
      try {
        const manager = new TemplateManager();

        // Check if template exists
        if (!(await manager.exists(name))) {
          throw new Error(`Template '${name}' not found`);
        }

        const updates: Partial<EmailTemplate> = {};

        if (options.subject !== undefined) updates.subject = options.subject;
        if (options.from !== undefined) updates.from = options.from;
        if (options.cc !== undefined) updates.cc = options.cc;
        if (options.bcc !== undefined) updates.bcc = options.bcc;
        if (options.tag !== undefined) updates.tag = options.tag;
        if (options.description !== undefined) updates.description = options.description;

        // Read body from file if specified
        if (options.bodyFile) {
          try {
            await fs.promises.access(options.bodyFile);
          } catch {
            throw new Error(`Body file not found: ${options.bodyFile}`);
          }
          updates.body = await fs.promises.readFile(options.bodyFile, 'utf8');
        } else if (options.body !== undefined) {
          updates.body = options.body;
        }

        // Read HTML from file if specified
        if (options.htmlFile) {
          try {
            await fs.promises.access(options.htmlFile);
          } catch {
            throw new Error(`HTML file not found: ${options.htmlFile}`);
          }
          updates.html = await fs.promises.readFile(options.htmlFile, 'utf8');
        } else if (options.html !== undefined) {
          updates.html = options.html;
        }

        if (Object.keys(updates).length === 0) {
          throw new Error('No updates provided. Use --subject, --body, --html, etc.');
        }

        await manager.update(name, updates);

        const formatter = new Formatter(options.json);

        if (options.json) {
          formatter.output({ success: true, updated: name });
        } else {
          console.log(chalk.green(`✓ Template '${name}' updated successfully`));
        }
      } catch (error: any) {
        const formatter = new Formatter(options.json);
        console.error(formatter.error(error.message));
        process.exit(1);
      }
    });

  return cmd;
}
