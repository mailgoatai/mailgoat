#!/usr/bin/env node
/**
 * API Performance Benchmarks
 */

const { runBenchmarks, formatResults } = require('./lib/runner');
const { writeFileSync } = require('fs');
const { join } = require('path');

const benchmarks = [
  {
    name: 'JSON Serialization (Small)',
    fn: async () => {
      const obj = { id: '123', name: 'John', email: 'john@example.com' };
      const json = JSON.stringify(obj);
    },
    iterations: 10000,
  },
  
  {
    name: 'JSON Serialization (Large)',
    fn: async () => {
      const obj = {
        messages: Array.from({ length: 100 }, (_, i) => ({
          id: `msg-${i}`,
          from: `sender${i}@example.com`,
          to: [`recipient${i}@example.com`],
          subject: `Message ${i}`,
          body: 'Lorem ipsum '.repeat(50),
          timestamp: Date.now(),
        })),
      };
      const json = JSON.stringify(obj);
    },
    iterations: 1000,
  },
  
  {
    name: 'JSON Parsing (Small)',
    fn: async () => {
      const json = '{"id":"123","name":"John","email":"john@example.com"}';
      const obj = JSON.parse(json);
    },
    iterations: 10000,
  },
  
  {
    name: 'JSON Parsing (Large)',
    fn: async () => {
      const messages = Array.from({ length: 100 }, (_, i) => ({
        id: `msg-${i}`,
        from: `sender${i}@example.com`,
        to: [`recipient${i}@example.com`],
        subject: `Message ${i}`,
        body: 'Lorem ipsum '.repeat(50),
        timestamp: Date.now(),
      }));
      const json = JSON.stringify({ messages });
      const obj = JSON.parse(json);
    },
    iterations: 1000,
  },
  
  {
    name: 'Base64 Encoding (1KB)',
    fn: async () => {
      const data = Buffer.from('x'.repeat(1024));
      const encoded = data.toString('base64');
    },
    iterations: 1000,
  },
  
  {
    name: 'Base64 Encoding (1MB)',
    fn: async () => {
      const data = Buffer.from('x'.repeat(1024 * 1024));
      const encoded = data.toString('base64');
    },
    iterations: 100,
  },
  
  {
    name: 'Base64 Decoding (1KB)',
    fn: async () => {
      const encoded = Buffer.from('x'.repeat(1024)).toString('base64');
      const decoded = Buffer.from(encoded, 'base64');
    },
    iterations: 1000,
  },
  
  {
    name: 'UUID Generation',
    fn: async () => {
      const { randomUUID } = require('crypto');
      const uuid = randomUUID();
    },
    iterations: 10000,
  },
];

async function main() {
  console.log('=== API Performance Benchmarks ===\n');
  
  const results = await runBenchmarks(benchmarks);
  
  console.log('\n' + formatResults(results));
  
  // Save results
  const timestamp = new Date().toISOString();
  const output = {
    suite: 'api',
    timestamp,
    results,
  };
  
  const filename = join(__dirname, 'results', `api-${Date.now()}.json`);
  writeFileSync(filename, JSON.stringify(output, null, 2));
  
  console.log(`Results saved to: ${filename}\n`);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { benchmarks };
