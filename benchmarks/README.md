# MailGoat Performance Benchmarks

Performance benchmarking suite for MailGoat.

## Usage

```bash
# Install dependencies
npm install

# Run all benchmarks
npm run bench

# Run specific suite
npm run bench:send
npm run bench:api

# Results saved to:
# - results/*.json (raw data)
# - reports/*.html (visual reports)
```

## Benchmark Suites

### Send Performance

- Single email send latency
- Batch send throughput (10, 100 emails)
- Template rendering speed (simple & complex)

### API Performance

- JSON serialization/parsing (small & large)
- Base64 encoding/decoding
- UUID generation

## Output Format

```
=== MailGoat Performance Benchmarks ===

Send Performance:
  Single Email Send:
    p50: 15.23ms
    p95: 18.67ms
    p99: 22.14ms
    mean: 15.45ms ± 2.31ms

  Batch Send (100 emails):
    p50: 142.56ms
    p95: 198.34ms
```

## CI Integration

Add to `.github/workflows/bench.yml`:

```yaml
name: Benchmarks

on:
  push:
    branches: [main]
  pull_request:

jobs:
  benchmark:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: cd benchmarks && npm install && npm run bench
      - uses: actions/upload-artifact@v4
        with:
          name: benchmark-results
          path: benchmarks/results/*.json
```

## Baseline Comparison

```javascript
// Compare against baseline
const baseline = require('./results/baseline.json');
const current = require('./results/latest.json');

for (const result of current.results) {
  const baseResult = baseline.results.find((r) => r.name === result.name);
  const delta = ((result.p50 - baseResult.p50) / baseResult.p50) * 100;
  console.log(`${result.name}: ${delta > 0 ? '+' : ''}${delta.toFixed(1)}%`);
}
```

## Performance Targets

| Metric             | Target      | Status |
| ------------------ | ----------- | ------ |
| Single Email Send  | < 200ms p95 | ✅     |
| Batch 100 Emails   | < 2s total  | ✅     |
| Template Rendering | < 5ms p95   | ✅     |
| JSON Parse (Large) | < 10ms p95  | ✅     |
