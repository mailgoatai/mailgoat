import { Command } from 'commander';
import chalk from 'chalk';
import {
  getBashCompletionScript,
  getFishCompletionScript,
  getPowerShellCompletionScript,
  getZshCompletionScript,
  installCompletion,
  getCompletionSuggestions,
} from '../lib/completion';

export function createCompletionCommand(): Command {
  const cmd = new Command('completion').description('Generate shell completion scripts');

  cmd
    .command('bash')
    .description('Print bash completion script')
    .action(() => {
      process.stdout.write(getBashCompletionScript());
    });

  cmd
    .command('zsh')
    .description('Print zsh completion script')
    .action(() => {
      process.stdout.write(getZshCompletionScript());
    });

  cmd
    .command('fish')
    .description('Print fish completion script')
    .action(() => {
      process.stdout.write(getFishCompletionScript());
    });

  cmd
    .command('powershell')
    .description('Print PowerShell completion script')
    .action(() => {
      process.stdout.write(getPowerShellCompletionScript());
    });

  cmd
    .command('install [shell]')
    .description('Install completion script for current shell (or explicit shell)')
    .action(async (shell?: string) => {
      try {
        const result = await installCompletion(shell);
        console.log(chalk.green(`✓ Installed ${result.shell} completion: ${result.path}`));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(chalk.red(message));
        process.exit(1);
      }
    });

  return cmd;
}

export function createInternalCompleteCommand(): Command {
  const cmd = new Command('__complete');

  cmd
    .argument('[shell]', 'shell name')
    .argument('[words...]', 'completion words')
    .action(async (_shell: string | undefined, words: string[]) => {
      const cwordEnv = process.env.COMP_CWORD;
      const cword = cwordEnv ? Number(cwordEnv) : Math.max(0, words.length - 1);
      const suggestions = await getCompletionSuggestions(words, Number.isFinite(cword) ? cword : 0);
      process.stdout.write(`${suggestions.join('\n')}\n`);
    });

  return cmd;
}
