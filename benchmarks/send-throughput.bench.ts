#!/usr/bin/env ts-node
/**
 * Send Throughput Benchmark
 *
 * Measures email sending throughput (messages per second).
 * Tests both sequential and concurrent sending patterns.
 * Target: >10 msgs/sec for sequential, >50 msgs/sec for concurrent
 */

import { performance } from 'perf_hooks';
import { PostalClient } from '../src/lib/config';

// Mock PostalClient for benchmarking
class MockPostalClient {
  async sendMessage(message: any): Promise<any> {
    // Simulate network delay (typical API response time)
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 50 + 20));

    return {
      message_id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'success',
    };
  }
}

interface ThroughputResult {
  name: string;
  totalMessages: number;
  durationMs: number;
  messagesPerSecond: number;
  avgLatencyMs: number;
}

async function benchmarkSequential(
  client: MockPostalClient,
  messageCount: number
): Promise<ThroughputResult> {
  console.log(`\n📤 Sequential Send (${messageCount} messages)...`);

  const start = performance.now();
  const latencies: number[] = [];

  for (let i = 0; i < messageCount; i++) {
    const msgStart = performance.now();

    await client.sendMessage({
      to: ['user@example.com'],
      subject: `Test ${i}`,
      plain_body: 'Benchmark test message',
    });

    const msgEnd = performance.now();
    latencies.push(msgEnd - msgStart);

    if ((i + 1) % 10 === 0) {
      process.stdout.write(`\r  Progress: ${i + 1}/${messageCount}`);
    }
  }

  const end = performance.now();
  const duration = end - start;

  console.log(`\r  ✓ Completed ${messageCount} messages`);

  return {
    name: 'Sequential Send',
    totalMessages: messageCount,
    durationMs: duration,
    messagesPerSecond: (messageCount / duration) * 1000,
    avgLatencyMs: latencies.reduce((a, b) => a + b, 0) / latencies.length,
  };
}

async function benchmarkConcurrent(
  client: MockPostalClient,
  messageCount: number,
  concurrency: number
): Promise<ThroughputResult> {
  console.log(`\n📤 Concurrent Send (${messageCount} messages, ${concurrency} concurrent)...`);

  const start = performance.now();
  const latencies: number[] = [];

  // Create batches
  const batches: Promise<void>[][] = [];
  for (let i = 0; i < messageCount; i += concurrency) {
    const batch: Promise<void>[] = [];

    for (let j = 0; j < concurrency && i + j < messageCount; j++) {
      const msgStart = performance.now();

      const promise = client
        .sendMessage({
          to: ['user@example.com'],
          subject: `Test ${i + j}`,
          plain_body: 'Benchmark test message',
        })
        .then(() => {
          const msgEnd = performance.now();
          latencies.push(msgEnd - msgStart);
        });

      batch.push(promise);
    }

    batches.push(batch);
  }

  // Execute batches
  let completed = 0;
  for (const batch of batches) {
    await Promise.all(batch);
    completed += batch.length;
    process.stdout.write(`\r  Progress: ${completed}/${messageCount}`);
  }

  const end = performance.now();
  const duration = end - start;

  console.log(`\r  ✓ Completed ${messageCount} messages`);

  return {
    name: `Concurrent Send (${concurrency}x)`,
    totalMessages: messageCount,
    durationMs: duration,
    messagesPerSecond: (messageCount / duration) * 1000,
    avgLatencyMs: latencies.reduce((a, b) => a + b, 0) / latencies.length,
  };
}

function printResults(results: ThroughputResult[]) {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║            SEND THROUGHPUT BENCHMARK RESULTS              ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  results.forEach((result) => {
    console.log(`📊 ${result.name}`);
    console.log(`   Messages:        ${result.totalMessages}`);
    console.log(`   Duration:        ${(result.durationMs / 1000).toFixed(2)}s`);
    console.log(`   Throughput:      ${result.messagesPerSecond.toFixed(2)} msgs/sec`);
    console.log(`   Avg Latency:     ${result.avgLatencyMs.toFixed(2)}ms`);

    // Performance assessment
    if (result.messagesPerSecond >= 50) {
      console.log(`   Status:          ✅ EXCELLENT (≥ 50 msgs/sec)`);
    } else if (result.messagesPerSecond >= 20) {
      console.log(`   Status:          ✓  GOOD (≥ 20 msgs/sec)`);
    } else if (result.messagesPerSecond >= 10) {
      console.log(`   Status:          ⚠️  ACCEPTABLE (≥ 10 msgs/sec)`);
    } else {
      console.log(`   Status:          ❌ SLOW (< 10 msgs/sec)`);
    }
    console.log('');
  });
}

async function main() {
  console.log('🚀 MailGoat Send Throughput Benchmark\n');
  console.log('Testing email sending performance with mock Postal client.');
  console.log('(Simulates typical API response times: 20-70ms)\n');

  const client = new MockPostalClient();
  const results: ThroughputResult[] = [];

  // Benchmark sequential sending
  const sequential = await benchmarkSequential(client, 50);
  results.push(sequential);

  // Benchmark concurrent sending with different concurrency levels
  for (const concurrency of [5, 10, 20]) {
    const concurrent = await benchmarkConcurrent(client, 100, concurrency);
    results.push(concurrent);
  }

  printResults(results);

  // Recommendations
  console.log('─'.repeat(60));
  console.log('\n💡 Performance Recommendations:\n');

  const bestThroughput = Math.max(...results.map((r) => r.messagesPerSecond));
  const bestResult = results.find((r) => r.messagesPerSecond === bestThroughput);

  console.log(`   • Best throughput: ${bestThroughput.toFixed(2)} msgs/sec (${bestResult?.name})`);
  console.log(`   • For bulk sending, use concurrency: 10-20 parallel requests`);
  console.log(`   • Implement rate limiting to avoid API throttling`);
  console.log(`   • Consider batch API endpoints for >100 messages\n`);
}

if (require.main === module) {
  main().catch(console.error);
}

export { benchmarkSequential, benchmarkConcurrent };
