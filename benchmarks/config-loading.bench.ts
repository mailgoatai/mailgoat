#!/usr/bin/env ts-node
/**
 * Config Loading Benchmark
 *
 * Measures configuration file loading and parsing performance.
 * Target: <10ms for typical config files
 */

const Benchmark = require('benchmark');
import { ConfigManager } from '../src/lib/config';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Create temporary config for testing
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mailgoat-bench-'));
const configPath = path.join(tempDir, 'config.yml');

// Sample config
const sampleConfig = `
server: postal.example.com
email: agent@example.com
api_key: test_key_12345
webhook:
  url: https://example.com/webhook
  secret: webhook_secret
`;

fs.writeFileSync(configPath, sampleConfig);

// Benchmark suite
const suite = new Benchmark.Suite('Config Loading');

suite
  .add('Load config from file', () => {
    const config = new ConfigManager(configPath);
    config.load();
  })
  .add('Parse YAML', () => {
    const yaml = require('yaml');
    yaml.parse(sampleConfig);
  })
  .add('Validate config', () => {
    const config = new ConfigManager(configPath);
    config.load();
    // Validation happens during load
  })
  .on('cycle', (event: Benchmark.Event) => {
    console.log(String(event.target));
  })
  .on('complete', function (this: Benchmark.Suite) {
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║           CONFIG LOADING BENCHMARK RESULTS                ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    const fastest = this.filter('fastest').map('name');
    console.log(`⚡ Fastest: ${fastest}`);

    this.forEach((bench) => {
      const ops = bench.hz?.toFixed(2) || '0';
      const ms = (1000 / (bench.hz || 1)).toFixed(3);

      console.log(`\n📊 ${bench.name}`);
      console.log(`   Operations/sec: ${ops}`);
      console.log(`   Time per op:    ${ms}ms`);
      console.log(`   Relative Error: ±${bench.stats?.rme?.toFixed(2)}%`);

      // Performance assessment
      const timeMs = 1000 / (bench.hz || 1);
      if (timeMs < 10) {
        console.log(`   Status:         ✅ EXCELLENT (< 10ms)`);
      } else if (timeMs < 50) {
        console.log(`   Status:         ✓  GOOD (< 50ms)`);
      } else {
        console.log(`   Status:         ⚠️  SLOW (> 50ms)`);
      }
    });

    console.log('\n');

    // Cleanup
    fs.unlinkSync(configPath);
    fs.rmdirSync(tempDir);
  })
  .run({ async: false });
