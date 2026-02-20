import { Command } from 'commander';
import chalk from 'chalk';
import { Formatter } from '../lib/formatter';
import { inferExitCode } from '../lib/errors';
import { initializeCommandContext } from './di-context';
import { SendBatchUseCase } from '../application/use-cases/send-batch.use-case';

export function createSendBatchCommand(): Command {
  return new Command('send-batch')
    .description('Send many emails concurrently with progress, throttling, and resume support')
    .requiredOption('--file <path>', 'Input file (.json, .jsonl, .csv)')
    .option('--concurrency <n>', 'Concurrent sends (default: 10, max: 50)', '10')
    .option('--resume', 'Resume from previous batch state')
    .option('--state-db <path>', 'Path to SQLite state DB')
    .option('--metrics-output <path>', 'Write metrics JSON to file')
    .option('--json', 'Output result as JSON')
    .action(async (options) => {
      try {
        const formatter = new Formatter(options.json);
        const { container } = await initializeCommandContext();
        const useCase = container.resolve(SendBatchUseCase);

        const metrics: any = await useCase.execute({
          file: options.file,
          concurrency: Number(options.concurrency || 10),
          resume: Boolean(options.resume),
          stateDb: options.stateDb,
          metricsOutput: options.metricsOutput,
        });

        if (options.json) {
          formatter.output(metrics);
          return;
        }

        console.log(chalk.green('✓ Batch send complete'));
        console.log(`Batch ID: ${metrics.batchId}`);
        console.log(`Total: ${metrics.total}`);
        console.log(`Succeeded: ${metrics.succeeded}`);
        console.log(`Failed: ${metrics.failed}`);
        console.log(`Success rate: ${metrics.successRate.toFixed(1)}%`);
        console.log(`Total time: ${(metrics.totalTimeMs / 1000).toFixed(2)}s`);
        console.log(`Average send time: ${metrics.averageSendMs.toFixed(1)}ms`);
        console.log(`Throughput: ${metrics.throughputPerSec.toFixed(2)} emails/s`);
        console.log(`Throttle events: ${metrics.throttleEvents}`);

        if (metrics.failedRecipients.length > 0) {
          console.log(chalk.yellow('Top failed recipients:'));
          metrics.failedRecipients.slice(0, 5).forEach((item: any) => {
            console.log(`  - ${item.recipient}: ${item.error}`);
          });
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        const formatter = new Formatter(Boolean(options.json));
        console.error(formatter.error(message));
        process.exit(inferExitCode(error));
      }
    });
}
