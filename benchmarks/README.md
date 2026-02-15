# MailGoat Performance Benchmarks

Comprehensive performance benchmark suite for measuring MailGoat CLI performance.

## 📊 Benchmark Suites

### 1. CLI Startup (`cli-startup.bench.ts`)

Measures how quickly the CLI can start and respond to commands.

**Metrics:**

- Average startup time
- Min/max/median times
- Command execution overhead

**Target:** <100ms for simple commands

**Run:**

```bash
npx ts-node benchmarks/cli-startup.bench.ts
```

### 2. Config Loading (`config-loading.bench.ts`)

Measures configuration file loading and parsing performance.

**Metrics:**

- Operations per second
- Time per operation
- YAML parsing performance

**Target:** <10ms for typical config files

**Run:**

```bash
npx ts-node benchmarks/config-loading.bench.ts
```

### 3. Send Throughput (`send-throughput.bench.ts`)

Measures email sending throughput with different concurrency levels.

**Metrics:**

- Messages per second
- Average latency
- Sequential vs concurrent performance

**Target:** >10 msgs/sec sequential, >50 msgs/sec concurrent

**Run:**

```bash
npx ts-node benchmarks/send-throughput.bench.ts
```

### 4. Memory Usage (`memory-usage.bench.ts`)

Measures memory consumption during various operations.

**Metrics:**

- Heap usage (before/after/delta/peak)
- RSS (Resident Set Size)
- Memory leaks detection

**Target:** <50MB for typical operations

**Run:**

```bash
# For accurate GC measurements:
node --expose-gc -r ts-node/register benchmarks/memory-usage.bench.ts

# Or without GC:
npx ts-node benchmarks/memory-usage.bench.ts
```

## 🚀 Quick Start

### Run All Benchmarks

```bash
npx ts-node benchmarks/run-all.ts
```

This will execute all benchmark suites and generate a summary report.

### Run Individual Benchmarks

```bash
# CLI startup
npm run bench:startup

# Config loading
npm run bench:config

# Send throughput
npm run bench:send

# Memory usage
npm run bench:memory
```

## 📋 Prerequisites

Ensure you have the required dependencies installed:

```bash
npm install --save-dev benchmark @types/benchmark ts-node
```

## 📈 Interpreting Results

### Performance Ratings

Each benchmark provides assessments:

- **✅ EXCELLENT** - Exceeds performance targets significantly
- **✓ GOOD** - Meets performance targets
- **⚠️ ACCEPTABLE** - Below target but usable
- **❌ SLOW** - Needs optimization

### Example Output

```
📊 CLI Startup Benchmark

cli-startup x 10 iterations
   Average:  87.32ms
   Median:   85.10ms
   Min:      78.20ms
   Max:      102.45ms
   Status:   ✅ EXCELLENT (< 100ms)
```

## 🎯 Performance Targets

| Metric            | Target     | Excellent   | Good       | Acceptable |
| ----------------- | ---------- | ----------- | ---------- | ---------- |
| CLI Startup       | <100ms     | <100ms      | <200ms     | <500ms     |
| Config Load       | <10ms      | <10ms       | <50ms      | <100ms     |
| Send (Sequential) | >10 msgs/s | >20 msgs/s  | >10 msgs/s | >5 msgs/s  |
| Send (Concurrent) | >50 msgs/s | >100 msgs/s | >50 msgs/s | >20 msgs/s |
| Memory Delta      | <50MB      | <10MB       | <50MB      | <100MB     |
| Peak Memory       | <200MB     | <100MB      | <200MB     | <500MB     |

## 🔬 Continuous Benchmarking

### CI Integration

Add to `.github/workflows/benchmarks.yml`:

```yaml
name: Benchmarks

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  benchmark:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run bench:all
```

### Benchmark Tracking

Track performance over time:

```bash
# Save baseline
npm run bench:all > benchmarks/baseline.txt

# Compare after changes
npm run bench:all > benchmarks/current.txt
diff benchmarks/baseline.txt benchmarks/current.txt
```

## 💡 Optimization Tips

### CLI Startup

- Lazy-load heavy dependencies
- Reduce module import overhead
- Cache configuration
- Use dynamic imports for rarely-used commands

### Config Loading

- Cache parsed config in memory
- Use streaming for large files
- Validate incrementally

### Send Throughput

- Use connection pooling
- Implement request batching
- Optimize concurrent request limits
- Consider HTTP/2 multiplexing

### Memory Usage

- Use streams for large attachments
- Implement pagination for large datasets
- Clear references to large objects
- Monitor for memory leaks with heap snapshots

## 🐛 Troubleshooting

### "Cannot find module"

Make sure you're running from the project root and dependencies are installed:

```bash
cd /home/node/.opengoat/organization
npm install
```

### TypeScript Errors

Ensure ts-node is installed:

```bash
npm install --save-dev ts-node @types/node
```

### Memory Benchmark Warnings

For accurate GC measurements:

```bash
node --expose-gc -r ts-node/register benchmarks/memory-usage.bench.ts
```

### Benchmark.js Not Found

Install benchmark dependencies:

```bash
npm install --save-dev benchmark @types/benchmark
```

## 📊 Advanced Usage

### Custom Iterations

```bash
# Run CLI startup with 50 iterations
ITERATIONS=50 npx ts-node benchmarks/cli-startup.bench.ts
```

### Profiling

Use Chrome DevTools for deep profiling:

```bash
node --inspect-brk -r ts-node/register benchmarks/send-throughput.bench.ts
```

Then open `chrome://inspect` in Chrome.

### Heap Snapshots

Take heap snapshots for memory analysis:

```bash
node --expose-gc --inspect -r ts-node/register benchmarks/memory-usage.bench.ts
```

## 🔗 Related Documentation

- [Performance Optimization Guide](../docs/performance.md)
- [Testing Guide](../docs/testing.md)
- [Contributing Guidelines](../CONTRIBUTING.md)

## 📝 Adding New Benchmarks

1. Create a new file in `benchmarks/`:

   ```typescript
   // benchmarks/my-benchmark.bench.ts
   ```

2. Follow the existing patterns:
   - Import necessary modules
   - Define benchmark functions
   - Print formatted results
   - Include performance assessments

3. Add to `run-all.ts`:

   ```typescript
   const suites: BenchmarkSuite[] = [
     // ... existing suites
     {
       name: 'My Benchmark',
       file: 'my-benchmark.bench.ts',
       description: 'What it measures',
     },
   ];
   ```

4. Document in this README

5. Add npm script to `package.json`:
   ```json
   "scripts": {
     "bench:my": "ts-node benchmarks/my-benchmark.bench.ts"
   }
   ```

## 🤝 Contributing

When submitting performance improvements:

1. Run benchmarks before changes (baseline)
2. Make your changes
3. Run benchmarks after changes
4. Include comparison in PR description
5. Document any performance impact

## 📄 License

MIT - Same as MailGoat project
