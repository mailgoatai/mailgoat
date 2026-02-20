/**
 * Benchmark runner utilities
 */

const { performance } = require('perf_hooks');
const { percentile, mean, stddev, formatMs } = require('./stats');

/**
 * Run a benchmark N times and collect timing data
 */
async function runBenchmark(name, fn, iterations = 100) {
  const timings = [];
  
  // Warmup
  for (let i = 0; i < Math.min(10, iterations); i++) {
    await fn();
  }
  
  // Actual benchmark
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await fn();
    const end = performance.now();
    timings.push(end - start);
  }
  
  return {
    name,
    iterations,
    timings,
    p50: percentile(timings, 50),
    p95: percentile(timings, 95),
    p99: percentile(timings, 99),
    mean: mean(timings),
    stddev: stddev(timings),
    min: Math.min(...timings),
    max: Math.max(...timings),
  };
}

/**
 * Run multiple benchmarks
 */
async function runBenchmarks(benchmarks) {
  const results = [];
  
  for (const bench of benchmarks) {
    console.log(`Running: ${bench.name}...`);
    const result = await runBenchmark(bench.name, bench.fn, bench.iterations || 100);
    results.push(result);
  }
  
  return results;
}

/**
 * Format results as table
 */
function formatResults(results) {
  const lines = [];
  
  for (const result of results) {
    lines.push(`${result.name}:`);
    lines.push(`  p50: ${formatMs(result.p50)}`);
    lines.push(`  p95: ${formatMs(result.p95)}`);
    lines.push(`  p99: ${formatMs(result.p99)}`);
    lines.push(`  mean: ${formatMs(result.mean)} ± ${formatMs(result.stddev)}`);
    lines.push(`  min/max: ${formatMs(result.min)} / ${formatMs(result.max)}`);
    lines.push('');
  }
  
  return lines.join('\n');
}

module.exports = {
  runBenchmark,
  runBenchmarks,
  formatResults,
};
