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
import { debugLogger } from './lib/debug';

const program = new Command();

program
  .name('mailgoat')
  .description('CLI-first email provider for AI agents')
  .version('0.1.0')
  .option('--debug', 'Enable verbose debug logging (same as DEBUG=mailgoat:*)', false);

// Enable debug mode if --debug flag is present
program.hook('preAction', (thisCommand) => {
  const opts = thisCommand.opts();
  if (opts.debug) {
    debugLogger.enable();
    debugLogger.log('main', '🐛 Debug mode enabled');
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

// Parse arguments
program.parse(process.argv);
