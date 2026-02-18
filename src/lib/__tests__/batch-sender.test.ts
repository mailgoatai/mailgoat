import { BatchMessage, BatchSender, BatchStateStore } from '../batch-sender';

class MemoryStateStore implements BatchStateStore {
  public processed = new Map<string, Set<number>>();

  loadProcessedIndices(batchId: string): number[] {
    return [...(this.processed.get(batchId) || new Set<number>())];
  }

  initializeBatch(batchId: string): void {
    this.processed.set(batchId, new Set<number>());
  }

  recordResult(batchId: string, index: number): void {
    const set = this.processed.get(batchId) || new Set<number>();
    set.add(index);
    this.processed.set(batchId, set);
  }

  updateBatchPosition(): void {}

  cleanupBatch(): void {}
}

function buildMessages(count: number): BatchMessage[] {
  return Array.from({ length: count }, (_, i) => ({
    to: [`user${i}@example.com`],
    subject: `subject-${i}`,
    body: `body-${i}`,
  }));
}

describe('BatchSender', () => {
  it('respects configured concurrency cap', async () => {
    const store = new MemoryStateStore();
    let inFlight = 0;
    let maxInFlight = 0;

    const sender = new BatchSender(async () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 20));
      inFlight -= 1;
    }, store);

    const result = await sender.run(buildMessages(20), {
      filePath: '/tmp/messages.json',
      batchId: 'batch-1',
      concurrency: 4,
      resume: false,
    });

    expect(maxInFlight).toBeLessThanOrEqual(4);
    expect(result.succeeded).toBe(20);
    expect(result.failed).toBe(0);
  });

  it('reduces concurrency when rate limit errors occur', async () => {
    const store = new MemoryStateStore();
    let calls = 0;

    const sender = new BatchSender(async () => {
      calls += 1;
      if (calls <= 2) {
        throw new Error('Rate limit exceeded. 429');
      }
      await new Promise((resolve) => setTimeout(resolve, 5));
    }, store);

    const result = await sender.run(buildMessages(8), {
      filePath: '/tmp/messages.json',
      batchId: 'batch-2',
      concurrency: 6,
      resume: false,
    });

    expect(result.throttleEvents).toBeGreaterThan(0);
    expect(result.failed).toBe(2);
    expect(result.succeeded).toBe(6);
  });

  it('skips already processed items when resuming', async () => {
    const store = new MemoryStateStore();
    store.processed.set('batch-3', new Set([0, 1, 2]));

    let sent = 0;
    const sender = new BatchSender(async () => {
      sent += 1;
    }, store);

    const result = await sender.run(buildMessages(6), {
      filePath: '/tmp/messages.json',
      batchId: 'batch-3',
      concurrency: 3,
      resume: true,
    });

    expect(sent).toBe(3);
    expect(result.succeeded).toBe(6);
    expect(result.attempted).toBe(6);
  });
});
