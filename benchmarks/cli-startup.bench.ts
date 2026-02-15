#!/usr/bin/env ts-node
/**
 * CLI Startup Time Benchmark
 *
 * Measures how quickly the CLI can start and respond to commands.
 * Target: <100ms for simple commands
 */

import { execSync } from 'child_process';
import { performance } from 'perf_hooks';

interface BenchmarkResult {
  name: string;
  iterations: number;
  avgMs: number;
  minMs: number;
  maxMs: number;
  medianMs: number;
}

function measureStartupTime(command: string, iterations: number = 10): BenchmarkResult {
  const times: number[] = [];

  console.log(`\n📊 Benchmarking: ${command}`);
  console.log(`Iterations: ${iterations}`);

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();

    try {
      execSync(`node ${command}`, {
        stdio: 'pipe',
        timeout: 5000,
      });
    } catch (error) {
      // Command might fail (e.g., missing config), we only care about startup time
    }

    const end = performance.now();
    const duration = end - start;
    times.push(duration);

    process.stdout.write(`\r  Progress: ${i + 1}/${iterations}`);
  }

  console.log('\n');

  const sorted = times.sort((a, b) => a - b);
  const sum = times.reduce((a, b) => a + b, 0);

  return {
    name: command,
    iterations,
    avgMs: sum / iterations,
    minMs: sorted[0],
    maxMs: sorted[sorted.length - 1],
    medianMs: sorted[Math.floor(sorted.length / 2)],
  };
}

function printResults(results: BenchmarkResult[]) {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║              CLI STARTUP BENCHMARK RESULTS                ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  results.forEach((result) => {
    console.log(`📌 ${result.name}`);
    console.log(`   Average:  ${result.avgMs.toFixed(2)}ms`);
    console.log(`   Median:   ${result.medianMs.toFixed(2)}ms`);
    console.log(`   Min:      ${result.minMs.toFixed(2)}ms`);
    console.log(`   Max:      ${result.maxMs.toFixed(2)}ms`);

    // Performance assessment
    if (result.avgMs < 100) {
      console.log(`   Status:   ✅ EXCELLENT (< 100ms)`);
    } else if (result.avgMs < 200) {
      console.log(`   Status:   ✓  GOOD (< 200ms)`);
    } else if (result.avgMs < 500) {
      console.log(`   Status:   ⚠️  ACCEPTABLE (< 500ms)`);
    } else {
      console.log(`   Status:   ❌ SLOW (> 500ms)`);
    }
    console.log('');
  });
}

// Main benchmark
async function main() {
  console.log('🚀 MailGoat CLI Startup Benchmark\n');
  console.log('This benchmark measures the time it takes for the CLI to:');
  console.log('  1. Load the Node.js runtime');
  console.log('  2. Load all dependencies');
  console.log('  3. Parse command-line arguments');
  console.log('  4. Execute the command\n');

  const results: BenchmarkResult[] = [];

  // Benchmark different commands
  const commands = [
    'bin/mailgoat.js --version',
    'bin/mailgoat.js --help',
    'bin/mailgoat.js send --help',
  ];

  for (const command of commands) {
    const result = measureStartupTime(command, 10);
    results.push(result);
  }

  printResults(results);

  // Summary
  const avgStartup = results.reduce((sum, r) => sum + r.avgMs, 0) / results.length;
  console.log('─'.repeat(60));
  console.log(`\n📊 Overall Average Startup Time: ${avgStartup.toFixed(2)}ms`);

  if (avgStartup < 100) {
    console.log('✅ CLI startup performance is EXCELLENT\n');
  } else if (avgStartup < 200) {
    console.log('✓  CLI startup performance is GOOD\n');
  } else {
    console.log('⚠️  CLI startup could be optimized\n');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { measureStartupTime };
