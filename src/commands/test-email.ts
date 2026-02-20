/**
 * Email Testing Commands
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { readFileSync } from 'fs';
import { SpamChecker } from '../lib/email-testing/spam-checker';
import { AccessibilityChecker } from '../lib/email-testing/accessibility-checker';
import { LinkValidator } from '../lib/email-testing/link-validator';
import { Formatter } from '../lib/formatter';

export function createTestEmailCommand(): Command {
  const cmd = new Command('test-email');

  cmd.description('Test email templates for spam, accessibility, and broken links');

  // Spam test
  cmd
    .command('spam')
    .description('Test email for spam indicators')
    .argument('<template>', 'Path to email template (HTML)')
    .option('--subject <subject>', 'Email subject line')
    .option('--json', 'Output as JSON')
    .action(async (template, options) => {
      try {
        const html = readFileSync(template, 'utf-8');
        const subject = options.subject || 'Test Email';

        const checker = new SpamChecker();
        const result = checker.checkEmail(subject, html);

        if (options.json) {
          Formatter.outputJson(result);
          return;
        }

        console.log(chalk.bold('\n🔍 Spam Test Results\n'));

        // Group issues by category
        const byCategory: Record<string, typeof result.issues> = {};
        for (const issue of result.issues) {
          if (!byCategory[issue.category]) {
            byCategory[issue.category] = [];
          }
          byCategory[issue.category].push(issue);
        }

        for (const [category, issues] of Object.entries(byCategory)) {
          const icon = issues.some((i) => i.severity === 'error') ? '❌' : '⚠️';
          console.log(`${icon} ${category}: ${issues.length} issue(s)`);

          for (const issue of issues) {
            const color = issue.severity === 'error' ? chalk.red : chalk.yellow;
            console.log(color(`   - ${issue.message}`));
            if (issue.details) {
              console.log(chalk.dim(`     ${issue.details}`));
            }
          }
          console.log('');
        }

        const scoreColor =
          result.score < 3 ? chalk.green : result.score < 6 ? chalk.yellow : chalk.red;
        const rating = result.score < 3 ? 'Excellent' : result.score < 6 ? 'Good' : 'Poor';

        console.log(`Spam Score: ${scoreColor(result.score)}/10 (${rating})`);
        console.log(result.passed ? chalk.green('✓ Passed') : chalk.red('✗ Failed'));
        console.log('');
      } catch (error) {
        console.log(chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
        process.exit(1);
      }
    });

  // Accessibility test
  cmd
    .command('accessibility')
    .alias('a11y')
    .description('Test email for accessibility issues')
    .argument('<template>', 'Path to email template (HTML)')
    .option('--json', 'Output as JSON')
    .action(async (template, options) => {
      try {
        const html = readFileSync(template, 'utf-8');

        const checker = new AccessibilityChecker();
        const result = checker.checkEmail(html);

        if (options.json) {
          Formatter.outputJson(result);
          return;
        }

        console.log(chalk.bold('\n♿ Accessibility Test Results\n'));

        // Group issues by category
        const byCategory: Record<string, typeof result.issues> = {};
        for (const issue of result.issues) {
          if (!byCategory[issue.category]) {
            byCategory[issue.category] = [];
          }
          byCategory[issue.category].push(issue);
        }

        for (const [category, issues] of Object.entries(byCategory)) {
          const icon = issues.some((i) => i.severity === 'error')
            ? '❌'
            : issues.some((i) => i.severity === 'warning')
              ? '⚠️'
              : 'ℹ️';
          console.log(`${icon} ${category}: ${issues.length} issue(s)`);

          for (const issue of issues) {
            const color =
              issue.severity === 'error'
                ? chalk.red
                : issue.severity === 'warning'
                  ? chalk.yellow
                  : chalk.blue;
            console.log(color(`   - ${issue.message}`));
            if (issue.element) {
              console.log(chalk.dim(`     Element: ${issue.element}`));
            }
          }
          console.log('');
        }

        const scoreColor =
          result.score >= 8 ? chalk.green : result.score >= 6 ? chalk.yellow : chalk.red;
        const rating = result.score >= 8 ? 'Excellent' : result.score >= 6 ? 'Good' : 'Poor';

        console.log(`Accessibility Score: ${scoreColor(result.score)}/10 (${rating})`);
        console.log(result.passed ? chalk.green('✓ Passed') : chalk.red('✗ Failed'));
        console.log('');
      } catch (error) {
        console.log(chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
        process.exit(1);
      }
    });

  // Link validation
  cmd
    .command('links')
    .description('Validate all links in email template')
    .argument('<template>', 'Path to email template (HTML)')
    .option('--data <file>', 'JSON file with template data')
    .option('--json', 'Output as JSON')
    .action(async (template, options) => {
      try {
        const html = readFileSync(template, 'utf-8');

        let data: Record<string, string> | undefined;
        if (options.data) {
          data = JSON.parse(readFileSync(options.data, 'utf-8'));
        }

        const validator = new LinkValidator();

        console.log(chalk.dim('Validating links (this may take a moment)...\n'));

        const result = await validator.validateLinks(html, data);

        if (options.json) {
          Formatter.outputJson(result);
          return;
        }

        console.log(chalk.bold('🔗 Link Validation Results\n'));

        for (const link of result.results) {
          const icon = link.status === 'ok' ? '✅' : link.status === 'redirect' ? '⚠️' : '❌';
          const statusText = link.statusCode ? `${link.statusCode}` : link.error || 'Unknown';

          console.log(`${icon} ${link.url}`);
          console.log(chalk.dim(`   Status: ${statusText}`));

          if (link.redirectUrl) {
            console.log(chalk.yellow(`   Redirects to: ${link.redirectUrl}`));
          }

          if (link.error) {
            console.log(chalk.red(`   Error: ${link.error}`));
          }

          console.log('');
        }

        console.log(chalk.bold('Summary:'));
        console.log(`  Total: ${result.totalLinks}`);
        console.log(chalk.green(`  Valid: ${result.validLinks}`));
        console.log(chalk.yellow(`  Redirects: ${result.redirects}`));
        console.log(chalk.red(`  Broken: ${result.brokenLinks}`));
        console.log('');

        if (result.brokenLinks > 0) {
          console.log(chalk.red('✗ Some links are broken'));
          process.exit(1);
        } else {
          console.log(chalk.green('✓ All links are valid'));
        }
      } catch (error) {
        console.log(chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
        process.exit(1);
      }
    });

  return cmd;
}
