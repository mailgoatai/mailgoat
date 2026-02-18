import { createHash } from 'crypto';

export interface BatchMessage {
  to: string[];
  subject: string;
  body?: string;
  html?: string;
  from?: string;
  cc?: string[];
  bcc?: string[];
  tag?: string;
}

export interface BatchStateStore {
  loadProcessedIndices(batchId: string): number[];
  initializeBatch(batchId: string, filePath: string, total: number): void;
  recordResult(batchId: string, index: number, to: string, success: boolean, error?: string): void;
  updateBatchPosition(batchId: string, nextIndex: number, completed: boolean): void;
  cleanupBatch(batchId: string): void;
}

export interface BatchProgressSnapshot {
  total: number;
  processed: number;
  success: number;
  failed: number;
  rate: number;
  etaSeconds: number;
}

export interface BatchRunOptions {
  filePath: string;
  batchId: string;
  concurrency: number;
  resume: boolean;
}

export interface BatchRecipientMetric {
  recipient: string;
  durationMs: number;
  success: boolean;
  error?: string;
}

export interface BatchRunMetrics {
  batchId: string;
  filePath: string;
  total: number;
  attempted: number;
  succeeded: number;
  failed: number;
  successRate: number;
  totalTimeMs: number;
  averageSendMs: number;
  throughputPerSec: number;
  slowestRecipients: BatchRecipientMetric[];
  failedRecipients: BatchRecipientMetric[];
  throttleEvents: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildBar(percent: number, width: number = 10): string {
  const filled = Math.max(0, Math.min(width, Math.round(percent * width)));
  return `${'█'.repeat(filled)}${'░'.repeat(width - filled)}`;
}

export function createBatchId(filePath: string, total: number): string {
  const raw = `${filePath}:${total}`;
  return createHash('sha256').update(raw).digest('hex').slice(0, 16);
}

export class BatchSender {
  constructor(
    private readonly sendFn: (msg: BatchMessage) => Promise<void>,
    private readonly stateStore: BatchStateStore
  ) {}

  async run(
    messages: BatchMessage[],
    options: BatchRunOptions,
    onProgress?: (snapshot: BatchProgressSnapshot, bar: string) => void
  ): Promise<BatchRunMetrics> {
    const startedAt = Date.now();
    const total = messages.length;
    const targetConcurrency = Math.max(1, Math.min(50, options.concurrency));
    let dynamicConcurrency = targetConcurrency;
    let throttleEvents = 0;
    let throttleUntil = 0;
    let throttleBackoffMs = 500;
    let recoverySuccessCount = 0;

    if (!options.resume) {
      this.stateStore.initializeBatch(options.batchId, options.filePath, total);
    }

    const processedIndices = new Set<number>(
      options.resume ? this.stateStore.loadProcessedIndices(options.batchId) : []
    );

    const queue: number[] = [];
    for (let i = 0; i < total; i++) {
      if (!processedIndices.has(i)) {
        queue.push(i);
      }
    }

    let success = processedIndices.size;
    let failed = 0;
    const completedDurations: number[] = [];
    const recipientMetrics: BatchRecipientMetric[] = [];

    let inFlight = 0;
    let cursor = 0;

    const refreshProgress = (): void => {
      const processed = success + failed;
      const elapsedSec = Math.max(1, (Date.now() - startedAt) / 1000);
      const rate = processed / elapsedSec;
      const remaining = total - processed;
      const etaSeconds = rate > 0 ? remaining / rate : 0;
      const percent = total === 0 ? 1 : processed / total;
      const bar = buildBar(percent, 10);

      onProgress?.(
        {
          total,
          processed,
          success,
          failed,
          rate,
          etaSeconds,
        },
        bar
      );
    };

    const nextUnprocessedIndex = (): number => {
      for (let i = 0; i < total; i++) {
        if (!processedIndices.has(i)) return i;
      }
      return total;
    };

    const worker = async (index: number): Promise<void> => {
      const msg = messages[index];
      const to = msg.to[0] || '(none)';
      const started = Date.now();
      try {
        await this.sendFn(msg);
        const duration = Date.now() - started;
        success += 1;
        recoverySuccessCount += 1;
        completedDurations.push(duration);
        recipientMetrics.push({ recipient: to, durationMs: duration, success: true });
        processedIndices.add(index);
        this.stateStore.recordResult(options.batchId, index, to, true);

        if (dynamicConcurrency < targetConcurrency && recoverySuccessCount >= targetConcurrency) {
          dynamicConcurrency += 1;
          recoverySuccessCount = 0;
        }
      } catch (error) {
        const duration = Date.now() - started;
        const message = error instanceof Error ? error.message : String(error);
        failed += 1;
        completedDurations.push(duration);
        recipientMetrics.push({ recipient: to, durationMs: duration, success: false, error: message });
        processedIndices.add(index);
        this.stateStore.recordResult(options.batchId, index, to, false, message);

        if (/rate limit|429/i.test(message)) {
          throttleEvents += 1;
          dynamicConcurrency = Math.max(1, Math.floor(dynamicConcurrency / 2));
          throttleUntil = Date.now() + throttleBackoffMs;
          throttleBackoffMs = Math.min(throttleBackoffMs * 2, 8000);
          recoverySuccessCount = 0;
        }
      } finally {
        const nextIndex = nextUnprocessedIndex();
        const completed = nextIndex >= total;
        this.stateStore.updateBatchPosition(options.batchId, nextIndex, completed);
        refreshProgress();
      }
    };

    refreshProgress();

    while (cursor < queue.length || inFlight > 0) {
      if (Date.now() < throttleUntil) {
        await sleep(50);
      }

      while (cursor < queue.length && inFlight < dynamicConcurrency) {
        const index = queue[cursor++];
        inFlight += 1;
        void worker(index).finally(() => {
          inFlight -= 1;
        });
      }

      if (inFlight > 0) {
        await sleep(10);
      }
    }

    const totalTimeMs = Date.now() - startedAt;
    const attempted = success + failed;
    const averageSendMs = completedDurations.length
      ? completedDurations.reduce((a, b) => a + b, 0) / completedDurations.length
      : 0;
    const throughputPerSec = attempted > 0 ? attempted / (totalTimeMs / 1000) : 0;
    const successRate = attempted > 0 ? (success / attempted) * 100 : 100;

    this.stateStore.cleanupBatch(options.batchId);

    const slowestRecipients = [...recipientMetrics]
      .sort((a, b) => b.durationMs - a.durationMs)
      .slice(0, 5);
    const failedRecipients = recipientMetrics.filter((m) => !m.success).slice(0, 20);

    return {
      batchId: options.batchId,
      filePath: options.filePath,
      total,
      attempted,
      succeeded: success,
      failed,
      successRate,
      totalTimeMs,
      averageSendMs,
      throughputPerSec,
      slowestRecipients,
      failedRecipients,
      throttleEvents,
    };
  }
}
