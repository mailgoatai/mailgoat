import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import { ConfigManager } from '../lib/config';
import { PostalClient } from '../lib/postal-client';
import { Formatter } from '../lib/formatter';
import { BatchMessage, BatchSender, createBatchId } from '../lib/batch-sender';
import { SqliteBatchStateStore } from '../lib/batch-state-store';

function parseCsv(content: string): BatchMessage[] {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const emailIdx = header.indexOf('email');
  const subjectIdx = header.indexOf('subject');
  const bodyIdx = header.indexOf('body');

  if (emailIdx < 0 || subjectIdx < 0 || bodyIdx < 0) {
    throw new Error('CSV must include headers: email,subject,body');
  }

  return lines.slice(1).map((line) => {
    const cols = line.split(',');
    const email = (cols[emailIdx] || '').trim();
    const subject = (cols[subjectIdx] || '').trim();
    const body = (cols[bodyIdx] || '').trim();
    return { to: [email], subject, body };
  });
}

function parseBatchFile(filePath: string): BatchMessage[] {
  const raw = fs.readFileSync(filePath, 'utf8');
  if (filePath.endsWith('.json')) {
    const parsed = JSON.parse(raw) as BatchMessage[];
    if (!Array.isArray(parsed)) throw new Error('JSON batch file must be an array');
    return parsed;
  }

  if (filePath.endsWith('.jsonl')) {
    return raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line) as BatchMessage);
  }

  if (filePath.endsWith('.csv')) {
    return parseCsv(raw);
  }

  throw new Error('Unsupported file format. Use .json, .jsonl, or .csv');
}

function validateMessages(messages: BatchMessage[]): void {
  if (messages.length === 0) {
    throw new Error('Batch file is empty');
  }
  messages.forEach((msg, i) => {
    if (!Array.isArray(msg.to) || msg.to.length === 0) {
      throw new Error(`Message at index ${i} missing recipient array: to`);
    }
    if (!msg.subject || typeof msg.subject !== 'string') {
      throw new Error(`Message at index ${i} missing subject`);
    }
    const hasBody = typeof msg.body === 'string' && msg.body.trim().length > 0;
    const hasHtml = typeof msg.html === 'string' && msg.html.trim().length > 0;
    if (!hasBody && !hasHtml) {
      throw new Error(`Message at index ${i} must include body or html`);
    }
  });
}

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
        const filePath = path.resolve(options.file);
        const concurrency = Number(options.concurrency || 10);

        if (!Number.isFinite(concurrency) || concurrency < 1 || concurrency > 50) {
          throw new Error('Invalid --concurrency value. Must be between 1 and 50');
        }

        if (!fs.existsSync(filePath)) {
          throw new Error(`Batch input file not found: ${filePath}`);
        }

        const messages = parseBatchFile(filePath);
        validateMessages(messages);

        const config = await new ConfigManager().load();
        const client = new PostalClient(config);
        const stateStore = new SqliteBatchStateStore(options.stateDb);

        const batchId = createBatchId(filePath, messages.length);
        const batchSender = new BatchSender(
          async (msg) => {
            await client.sendMessage({
              to: msg.to,
              cc: msg.cc,
              bcc: msg.bcc,
              from: msg.from,
              subject: msg.subject,
              plain_body: msg.body,
              html_body: msg.html,
              tag: msg.tag,
            });
          },
          stateStore
        );

        let lastLineLength = 0;
        const metrics = await batchSender.run(
          messages,
          {
            filePath,
            batchId,
            concurrency,
            resume: Boolean(options.resume),
          },
          options.json
            ? undefined
            : (snapshot, bar) => {
                const line = `Sending: [${bar}] ${snapshot.processed}/${snapshot.total} (${snapshot.success} ✓, ${snapshot.failed} ✗) @ ${snapshot.rate.toFixed(1)}/s ETA: ${Math.ceil(snapshot.etaSeconds)}s`;
                const padded = line.padEnd(Math.max(lastLineLength, line.length));
                process.stdout.write(`\r${padded}`);
                lastLineLength = padded.length;
              }
        );

        if (!options.json) {
          process.stdout.write('\n');
        }

        if (options.metricsOutput) {
          fs.writeFileSync(path.resolve(options.metricsOutput), JSON.stringify(metrics, null, 2));
        }

        if (options.json) {
          formatter.output(metrics);
        } else {
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
            metrics.failedRecipients.slice(0, 5).forEach((item) => {
              console.log(`  - ${item.recipient}: ${item.error}`);
            });
          }
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        const formatter = new Formatter(Boolean(options.json));
        console.error(formatter.error(message));
        process.exit(1);
      }
    });
}
