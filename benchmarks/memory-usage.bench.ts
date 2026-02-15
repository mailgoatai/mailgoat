#!/usr/bin/env ts-node
/**
 * Memory Usage Benchmark
 *
 * Measures memory consumption during various operations.
 * Helps identify memory leaks and optimization opportunities.
 * Target: <50MB for typical operations, no memory leaks
 */

import { performance } from 'perf_hooks';

interface MemorySnapshot {
  rss: number; // Resident Set Size (total memory)
  heapTotal: number; // Total heap allocated
  heapUsed: number; // Heap actually used
  external: number; // C++ objects
  arrayBuffers: number;
}

interface MemoryBenchmarkResult {
  name: string;
  before: MemorySnapshot;
  after: MemorySnapshot;
  delta: MemorySnapshot;
  peak: MemorySnapshot;
  durationMs: number;
}

function getMemoryUsage(): MemorySnapshot {
  const usage = process.memoryUsage();
  return {
    rss: usage.rss,
    heapTotal: usage.heapTotal,
    heapUsed: usage.heapUsed,
    external: usage.external,
    arrayBuffers: usage.arrayBuffers,
  };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes.toFixed(2)} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function calculateDelta(before: MemorySnapshot, after: MemorySnapshot): MemorySnapshot {
  return {
    rss: after.rss - before.rss,
    heapTotal: after.heapTotal - before.heapTotal,
    heapUsed: after.heapUsed - before.heapUsed,
    external: after.external - before.external,
    arrayBuffers: after.arrayBuffers - before.arrayBuffers,
  };
}

async function benchmarkMemory(
  name: string,
  operation: () => Promise<void> | void
): Promise<MemoryBenchmarkResult> {
  console.log(`\n📊 Benchmarking: ${name}`);

  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }

  // Wait for GC to settle
  await new Promise((resolve) => setTimeout(resolve, 100));

  const before = getMemoryUsage();
  let peak = { ...before };

  // Monitor peak memory during operation
  const monitor = setInterval(() => {
    const current = getMemoryUsage();
    if (current.heapUsed > peak.heapUsed) {
      peak = current;
    }
  }, 10);

  const start = performance.now();
  await operation();
  const end = performance.now();

  clearInterval(monitor);

  // Final measurement
  const after = getMemoryUsage();
  const delta = calculateDelta(before, after);

  console.log(`  ✓ Completed in ${(end - start).toFixed(2)}ms`);

  return {
    name,
    before,
    after,
    delta,
    peak,
    durationMs: end - start,
  };
}

function printResults(results: MemoryBenchmarkResult[]) {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║            MEMORY USAGE BENCHMARK RESULTS                 ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  results.forEach((result) => {
    console.log(`📊 ${result.name}`);
    console.log(`   Duration:       ${result.durationMs.toFixed(2)}ms`);
    console.log(`\n   Memory Usage:`);
    console.log(`     Before:       ${formatBytes(result.before.heapUsed)}`);
    console.log(`     After:        ${formatBytes(result.after.heapUsed)}`);
    console.log(`     Delta:        ${formatBytes(result.delta.heapUsed)}`);
    console.log(`     Peak:         ${formatBytes(result.peak.heapUsed)}`);
    console.log(`\n   RSS (Total):`);
    console.log(`     Before:       ${formatBytes(result.before.rss)}`);
    console.log(`     After:        ${formatBytes(result.after.rss)}`);
    console.log(`     Delta:        ${formatBytes(result.delta.rss)}`);

    // Assessment
    const deltaHeapMB = result.delta.heapUsed / (1024 * 1024);
    const peakHeapMB = result.peak.heapUsed / (1024 * 1024);

    console.log(`\n   Assessment:`);
    if (deltaHeapMB < 0) {
      console.log(`     Memory Delta:  ✅ NEGATIVE (memory freed)`);
    } else if (deltaHeapMB < 10) {
      console.log(`     Memory Delta:  ✅ EXCELLENT (< 10MB)`);
    } else if (deltaHeapMB < 50) {
      console.log(`     Memory Delta:  ✓  GOOD (< 50MB)`);
    } else {
      console.log(`     Memory Delta:  ⚠️  HIGH (> 50MB)`);
    }

    if (peakHeapMB < 100) {
      console.log(`     Peak Usage:    ✅ EXCELLENT (< 100MB)`);
    } else if (peakHeapMB < 200) {
      console.log(`     Peak Usage:    ✓  GOOD (< 200MB)`);
    } else {
      console.log(`     Peak Usage:    ⚠️  HIGH (> 200MB)`);
    }

    console.log('');
  });
}

async function main() {
  console.log('🚀 MailGoat Memory Usage Benchmark\n');
  console.log('Note: Run with --expose-gc flag for accurate GC measurements:');
  console.log('  node --expose-gc benchmarks/memory-usage.bench.ts\n');

  const results: MemoryBenchmarkResult[] = [];

  // Benchmark: CLI Initialization
  const cliInit = await benchmarkMemory('CLI Initialization', async () => {
    // Simulate loading dependencies
    require('../src/index');
  });
  results.push(cliInit);

  // Benchmark: Config Loading
  const configLoad = await benchmarkMemory('Config Loading', async () => {
    const { ConfigManager } = require('../src/lib/config');
    const config = new ConfigManager();
    // Would load config if file exists
  });
  results.push(configLoad);

  // Benchmark: Processing 1000 messages
  const processMessages = await benchmarkMemory('Process 1000 Messages (in-memory)', async () => {
    const messages = [];
    for (let i = 0; i < 1000; i++) {
      messages.push({
        id: `msg_${i}`,
        to: 'user@example.com',
        subject: `Message ${i}`,
        body: 'A'.repeat(1000), // 1KB body
        timestamp: new Date().toISOString(),
      });
    }

    // Process messages
    messages.forEach((msg) => {
      // Simulate processing
      msg.subject.toUpperCase();
    });
  });
  results.push(processMessages);

  // Benchmark: Large attachment handling
  const largeAttachment = await benchmarkMemory('Handle Large Attachment (5MB)', async () => {
    // Simulate loading a 5MB file
    const buffer = Buffer.alloc(5 * 1024 * 1024);
    const base64 = buffer.toString('base64');

    // Simulate attachment processing
    const size = base64.length;
  });
  results.push(largeAttachment);

  printResults(results);

  // Summary
  console.log('─'.repeat(60));
  console.log('\n💡 Memory Optimization Tips:\n');
  console.log('   • Use streams for large attachments instead of buffers');
  console.log('   • Implement pagination for inbox listings');
  console.log('   • Clear large objects after processing');
  console.log('   • Consider memory limits for concurrent operations\n');

  // Overall assessment
  const totalDelta = results.reduce((sum, r) => sum + r.delta.heapUsed, 0);
  const avgDelta = totalDelta / results.length;

  console.log(`📈 Average Memory Delta: ${formatBytes(avgDelta)}`);

  if (avgDelta < 10 * 1024 * 1024) {
    console.log('✅ Overall memory usage is EXCELLENT\n');
  } else if (avgDelta < 50 * 1024 * 1024) {
    console.log('✓  Overall memory usage is ACCEPTABLE\n');
  } else {
    console.log('⚠️  Consider memory optimizations\n');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { benchmarkMemory, getMemoryUsage };
