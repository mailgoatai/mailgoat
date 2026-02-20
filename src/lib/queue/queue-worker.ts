/**
 * Email Queue Worker
 *
 * Background process that polls and processes queued emails
 */

import { EmailQueue, QueuedEmail } from './email-queue';
import { debugLogger } from '../debug';

export interface QueueWorkerOptions {
  pollInterval?: number; // milliseconds
  batchSize?: number;
  onProcess?: (email: QueuedEmail) => Promise<void>;
  onError?: (email: QueuedEmail, error: Error) => void;
  onSuccess?: (email: QueuedEmail) => void;
}

export class QueueWorker {
  private queue: EmailQueue;
  private options: Required<QueueWorkerOptions>;
  private running: boolean = false;
  private timer: NodeJS.Timeout | null = null;

  constructor(queue: EmailQueue, options: QueueWorkerOptions = {}) {
    this.queue = queue;
    this.options = {
      pollInterval: options.pollInterval || 5000, // 5 seconds
      batchSize: options.batchSize || 10,
      onProcess: options.onProcess || (async () => {}),
      onError: options.onError || (() => {}),
      onSuccess: options.onSuccess || (() => {}),
    };
  }

  /**
   * Start the worker
   */
  start(): void {
    if (this.running) {
      debugLogger.log('queue-worker', 'Worker already running');
      return;
    }

    this.running = true;
    debugLogger.log(
      'queue-worker',
      `Worker started (poll interval: ${this.options.pollInterval}ms)`
    );

    this.scheduleNext();
  }

  /**
   * Stop the worker
   */
  stop(): void {
    if (!this.running) {
      return;
    }

    this.running = false;

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    debugLogger.log('queue-worker', 'Worker stopped');
  }

  /**
   * Process next batch of emails
   */
  private async processBatch(): Promise<void> {
    if (!this.running) {
      return;
    }

    try {
      for (let i = 0; i < this.options.batchSize; i++) {
        if (!this.running) {
          break;
        }

        const email = this.queue.dequeue();

        if (!email) {
          break; // No more emails to process
        }

        await this.processEmail(email);
      }
    } catch (error) {
      debugLogger.log(
        'queue-worker',
        `Batch processing error: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    if (this.running) {
      this.scheduleNext();
    }
  }

  /**
   * Process a single email
   */
  private async processEmail(email: QueuedEmail): Promise<void> {
    debugLogger.log(
      'queue-worker',
      `Processing email ${email.id} (attempt ${email.attempts + 1}/${email.maxAttempts})`
    );

    try {
      // Mark as sending
      this.queue.markSending(email.id);

      // Process the email
      await this.options.onProcess(email);

      // Mark as sent
      this.queue.markSent(email.id);

      debugLogger.log('queue-worker', `Email ${email.id} sent successfully`);

      this.options.onSuccess(email);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      debugLogger.log('queue-worker', `Email ${email.id} failed: ${errorMessage}`);

      // Mark as failed (will auto-retry if attempts < maxAttempts)
      this.queue.markFailed(email.id, errorMessage);

      this.options.onError(email, error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Schedule next batch processing
   */
  private scheduleNext(): void {
    this.timer = setTimeout(() => {
      void this.processBatch();
    }, this.options.pollInterval);
  }

  /**
   * Process immediately (useful for testing)
   */
  async processNow(): Promise<void> {
    await this.processBatch();
  }
}
