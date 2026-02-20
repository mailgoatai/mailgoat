/**
 * Statistical utilities for benchmarking
 */

/**
 * Calculate percentile from sorted array
 */
function percentile(arr, p) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index % 1;
  
  if (lower === upper) {
    return sorted[lower];
  }
  
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

/**
 * Calculate mean
 */
function mean(arr) {
  if (arr.length === 0) return 0;
  return arr.reduce((sum, val) => sum + val, 0) / arr.length;
}

/**
 * Calculate standard deviation
 */
function stddev(arr) {
  if (arr.length === 0) return 0;
  const avg = mean(arr);
  const squareDiffs = arr.map(val => Math.pow(val - avg, 2));
  return Math.sqrt(mean(squareDiffs));
}

/**
 * Format milliseconds
 */
function formatMs(ms) {
  if (ms < 1) {
    return `${(ms * 1000).toFixed(2)}μs`;
  }
  if (ms < 1000) {
    return `${ms.toFixed(2)}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Format rate (ops/sec)
 */
function formatRate(rate) {
  if (rate > 1000000) {
    return `${(rate / 1000000).toFixed(2)}M ops/s`;
  }
  if (rate > 1000) {
    return `${(rate / 1000).toFixed(2)}K ops/s`;
  }
  return `${rate.toFixed(2)} ops/s`;
}

module.exports = {
  percentile,
  mean,
  stddev,
  formatMs,
  formatRate,
};
