import { injectable, inject } from 'tsyringe';
import * as fs from 'fs';
import * as path from 'path';
import { PostalClient } from '../../lib/postal-client';
import { BatchMessage, BatchSender, createBatchId } from '../../lib/batch-sender';
import { SqliteBatchStateStore } from '../../lib/batch-state-store';

export interface SendBatchInput {
  file: string;
  concurrency: number;
  resume: boolean;
  stateDb?: string;
  metricsOutput?: string;
}

@injectable()
export class SendBatchUseCase {
  constructor(@inject('PostalClient') private readonly postalClient: PostalClient) {}

  async execute(input: SendBatchInput): Promise<unknown> {
    const filePath = path.resolve(input.file);

    if (!Number.isFinite(input.concurrency) || input.concurrency < 1 || input.concurrency > 50) {
      throw new Error('Invalid --concurrency value. Must be between 1 and 50');
    }

    if (!fs.existsSync(filePath)) {
      throw new Error(`Batch input file not found: ${filePath}`);
    }

    const messages = this.parseBatchFile(filePath);
    this.validateMessages(messages);

    const stateStore = new SqliteBatchStateStore(input.stateDb);
    const batchId = createBatchId(filePath, messages.length);

    const batchSender = new BatchSender(async (msg) => {
      await this.postalClient.sendMessage({
        to: msg.to,
        cc: msg.cc,
        bcc: msg.bcc,
        from: msg.from,
        subject: msg.subject,
        plain_body: msg.body,
        html_body: msg.html,
        tag: msg.tag,
      });
    }, stateStore);

    const metrics = await batchSender.run(messages, {
      filePath,
      batchId,
      concurrency: input.concurrency,
      resume: input.resume,
    });

    if (input.metricsOutput) {
      fs.writeFileSync(path.resolve(input.metricsOutput), JSON.stringify(metrics, null, 2));
    }

    return metrics;
  }

  private parseBatchFile(filePath: string): BatchMessage[] {
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
      return this.parseCsv(raw);
    }

    throw new Error('Unsupported file format. Use .json, .jsonl, or .csv');
  }

  private parseCsv(content: string): BatchMessage[] {
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

  private validateMessages(messages: BatchMessage[]): void {
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
}
