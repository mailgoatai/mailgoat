#!/usr/bin/env node

import { Command } from 'commander';
import { createSendCommand } from './commands/send';
import { createReadCommand } from './commands/read';
import { createInboxCommand } from './commands/inbox';
import { createConfigCommand } from './commands/config';

const program = new Command();

program
  .name('mailgoat')
  .description('CLI-first email provider for AI agents')
  .version('0.1.0');

// Register commands
program.addCommand(createSendCommand());
program.addCommand(createReadCommand());
program.addCommand(createInboxCommand());
program.addCommand(createConfigCommand());

// Parse arguments
program.parse(process.argv);
