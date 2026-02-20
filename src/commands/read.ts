import { Command } from 'commander';
import { Formatter } from '../lib/formatter';
import { inferExitCode } from '../lib/errors';
import { initializeCommandContext } from './di-context';
import { ReadMessageUseCase } from '../application/use-cases/read-message.use-case';

export function createReadCommand(): Command {
  const cmd = new Command('read');

  cmd
    .description('Read a specific message by ID')
    .argument('<message-id>', 'Message ID to read')
    .option('--json', 'Output result as JSON')
    .option('--full', 'Include all expansions (headers, attachments, etc.)')
    .option('--no-retry', 'Disable automatic retry on failure (for debugging)')
    .action(async (messageId: string, options) => {
      try {
        const { container } = await initializeCommandContext();
        const useCase = container.resolve(ReadMessageUseCase);
        const formatter = new Formatter(options.json);
        const message = await useCase.execute({
          messageId,
          includeFull: Boolean(options.full),
          enableRetry: options.retry !== false,
        });

        // Output result
        const output = formatter.formatMessage(message as any);
        formatter.output(output);
      } catch (error: unknown) {
        const formatter = new Formatter(options.json);
        console.error(formatter.error(error instanceof Error ? error.message : String(error)));
        process.exit(inferExitCode(error));
      }
    });

  return cmd;
}
