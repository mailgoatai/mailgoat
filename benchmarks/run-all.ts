#!/usr/bin/env ts-node
/**
 * Run All Benchmarks
 *
 * Executes the complete benchmark suite and generates a summary report.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface BenchmarkSuite {
  name: string;
  file: string;
  description: string;
}

const suites: BenchmarkSuite[] = [
  {
    name: 'CLI Startup',
    file: 'cli-startup.bench.ts',
    description: 'Measures CLI initialization and command execution time',
  },
  {
    name: 'Config Loading',
    file: 'config-loading.bench.ts',
    description: 'Measures configuration file loading and parsing performance',
  },
  {
    name: 'Send Throughput',
    file: 'send-throughput.bench.ts',
    description: 'Measures email sending throughput (sequential and concurrent)',
  },
  {
    name: 'Memory Usage',
    file: 'memory-usage.bench.ts',
    description: 'Measures memory consumption during various operations',
  },
];

function printHeader() {
  console.log('\n╔═══════════════════════════════════════════════════════════════════╗');
  console.log('║                 MAILGOAT PERFORMANCE BENCHMARK SUITE              ║');
  console.log('╚═══════════════════════════════════════════════════════════════════╝\n');
  console.log('Running comprehensive performance benchmarks...\n');
}

function printSuiteInfo() {
  console.log('📊 Benchmark Suites:\n');
  suites.forEach((suite, index) => {
    console.log(`  ${index + 1}. ${suite.name}`);
    console.log(`     ${suite.description}\n`);
  });
}

async function runBenchmark(suite: BenchmarkSuite): Promise<boolean> {
  console.log('\n' + '═'.repeat(70));
  console.log(`\n🚀 Running: ${suite.name}`);
  console.log(`   File: ${suite.file}\n`);

  try {
    const benchmarkPath = path.join(__dirname, suite.file);

    // Check if file exists
    if (!fs.existsSync(benchmarkPath)) {
      console.log(`❌ Benchmark file not found: ${suite.file}`);
      return false;
    }

    // Run benchmark with ts-node
    execSync(`npx ts-node ${benchmarkPath}`, {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
    });

    console.log(`\n✅ ${suite.name} completed successfully`);
    return true;
  } catch (error: any) {
    console.log(`\n❌ ${suite.name} failed:`, error.message);
    return false;
  }
}

async function main() {
  printHeader();
  printSuiteInfo();

  const startTime = Date.now();
  const results: { suite: string; success: boolean }[] = [];

  // Run each benchmark
  for (const suite of suites) {
    const success = await runBenchmark(suite);
    results.push({ suite: suite.name, success });
  }

  const endTime = Date.now();
  const totalDuration = (endTime - startTime) / 1000;

  // Print summary
  console.log('\n' + '═'.repeat(70));
  console.log('\n╔═══════════════════════════════════════════════════════════════════╗');
  console.log('║                        BENCHMARK SUMMARY                          ║');
  console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

  results.forEach((result) => {
    const status = result.success ? '✅ PASSED' : '❌ FAILED';
    console.log(`  ${status}  ${result.suite}`);
  });

  const passed = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  console.log(`\n  Total:    ${results.length} benchmarks`);
  console.log(`  Passed:   ${passed}`);
  console.log(`  Failed:   ${failed}`);
  console.log(`  Duration: ${totalDuration.toFixed(2)}s\n`);

  if (failed === 0) {
    console.log('🎉 All benchmarks completed successfully!\n');
  } else {
    console.log('⚠️  Some benchmarks failed. Check output above for details.\n');
  }

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error running benchmarks:', error);
    process.exit(1);
  });
}
