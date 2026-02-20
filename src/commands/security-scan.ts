import { Command } from 'commander';
import { promises as fs } from 'fs';
import chalk from 'chalk';
import { scanHtmlSecurityIssues } from '../lib/security';

export function createSecurityScanCommand(): Command {
  const cmd = new Command('security-scan');

  cmd
    .description('Scan an HTML/template file for security risks')
    .argument('<file>', 'Path to HTML or template file to scan')
    .option('--json', 'Output as JSON')
    .action(async (file: string, options: { json?: boolean }) => {
      let content = '';
      try {
        content = await fs.readFile(file, 'utf8');
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(chalk.red(`Scan failed: ${message}`));
        process.exit(1);
      }

      const issues = scanHtmlSecurityIssues(content);

      if (options.json) {
        console.log(JSON.stringify({ file, issues, ok: issues.length === 0 }, null, 2));
        if (issues.length > 0) {
          process.exit(1);
        }
        return;
      }

      if (issues.length === 0) {
        console.log(chalk.green(`✓ No security issues found in ${file}`));
        return;
      }

      console.log(chalk.yellow('⚠️  Security Issues Found:'));
      issues.forEach((issue) => {
        console.log(`- ${issue.message} (line ${issue.line})`);
      });
      console.log('\nRecommendations:');
      console.log('- Remove <script> tags and SVG scriptable blocks');
      console.log('- Remove inline event handlers (onclick/onerror/etc)');
      console.log('- Replace javascript:/data:text URIs with safe hosted links');

      process.exit(1);
    });

  return cmd;
}
