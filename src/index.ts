#!/usr/bin/env node

import { Command } from 'commander';
import { createSendCommand } from './commands/send';
import { createReadCommand } from './commands/read';
import { createInboxCommand } from './commands/inbox';
import { createConfigCommand } from './commands/config';
import { createTemplateCommand } from './commands/template';
import { createDeleteCommand } from './commands/delete';
import { createSearchCommand } from './commands/search';
import { createHealthCommand } from './commands/health';
import { createSendBatchCommand } from './commands/send-batch';
import { createSchedulerCommand } from './commands/scheduler';
import { createWebhookCommand } from './commands/webhook';
import { createMetricsCommand } from './commands/metrics';
import { createInspectCommand } from './commands/inspect';
import { createKeysCommand } from './commands/keys';
import { createAdminCommand } from './commands/admin';
import { createRelayCommand } from './commands/relay';
import { createQueueCommand } from './commands/queue';
import { debugLogger } from './lib/debug';
import { setConsoleJson, setLogLevel, setLoggerSilent } from './infrastructure/logger';
import { readFileSync } from 'fs';
import { join } from 'path';

// Read version from package.json
const packageJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'));

const program = new Command();

program
  .name('mailgoat')
  .description('CLI-first email provider for AI agents')
  .version(packageJson.version)
  .option('--debug', 'Enable verbose debug logging (same as DEBUG=mailgoat:*)', false)
  .option('--verbose', 'Enable detailed operational logging', false)
  .option('--log-json', 'Emit JSON-formatted console logs for automation', false)
  .option('--silent', 'Suppress all non-essential output', false);

// Enable debug mode if --debug flag is present
program.hook('preAction', (thisCommand) => {
  const opts = thisCommand.opts();

  if (opts.silent) {
    setLoggerSilent(true);
    // Keep stdout available for explicit JSON output via Formatter.
    console.error = () => {};
    console.warn = () => {};
  }

  if (opts.logJson) {
    setConsoleJson(true);
  }

  if (opts.debug || opts.verbose) {
    setLogLevel('debug');
    debugLogger.enable();
    debugLogger.log('main', opts.debug ? '🐛 Debug mode enabled' : 'Verbose mode enabled');
    debugLogger.log('main', `Node version: ${process.version}`);
    debugLogger.log('main', `Platform: ${process.platform} ${process.arch}`);
    debugLogger.log('main', `CWD: ${process.cwd()}`);
    debugLogger.log('main', `Command: ${process.argv.slice(2).join(' ')}`);
  }
});

// Register commands
program.addCommand(createSendCommand());
program.addCommand(createReadCommand());
program.addCommand(createInboxCommand());
program.addCommand(createConfigCommand());
program.addCommand(createTemplateCommand());
program.addCommand(createDeleteCommand());
program.addCommand(createSearchCommand());
program.addCommand(createHealthCommand());
program.addCommand(createSendBatchCommand());
program.addCommand(createSchedulerCommand());
program.addCommand(createWebhookCommand());
program.addCommand(createMetricsCommand());
program.addCommand(createInspectCommand());
program.addCommand(createKeysCommand());
program.addCommand(createAdminCommand());
program.addCommand(createRelayCommand());
program.addCommand(createQueueCommand());

// Parse arguments
program.parse(process.argv);
