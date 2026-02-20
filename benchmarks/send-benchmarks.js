#!/usr/bin/env node
/**
 * Send Performance Benchmarks
 */

const { runBenchmarks, formatResults } = require('./lib/runner');
const { writeFileSync } = require('fs');
const { join } = require('path');

// Mock email provider for benchmarking
class MockProvider {
  async sendMessage(params) {
    // Simulate network latency
    await new Promise(resolve => setTimeout(resolve, Math.random() * 10 + 5));
    return { message_id: Math.random().toString(36) };
  }
}

const provider = new MockProvider();

const benchmarks = [
  {
    name: 'Single Email Send',
    fn: async () => {
      await provider.sendMessage({
        to: ['user@example.com'],
        subject: 'Test Email',
        body: 'Hello World',
      });
    },
    iterations: 100,
  },
  
  {
    name: 'Batch Send (10 emails)',
    fn: async () => {
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(provider.sendMessage({
          to: [`user${i}@example.com`],
          subject: `Test Email ${i}`,
          body: 'Hello World',
        }));
      }
      await Promise.all(promises);
    },
    iterations: 50,
  },
  
  {
    name: 'Batch Send (100 emails)',
    fn: async () => {
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(provider.sendMessage({
          to: [`user${i}@example.com`],
          subject: `Test Email ${i}`,
          body: 'Hello World',
        }));
      }
      await Promise.all(promises);
    },
    iterations: 10,
  },
  
  {
    name: 'Template Rendering (Simple)',
    fn: async () => {
      const template = 'Hello {{name}}, welcome to {{product}}!';
      const data = { name: 'John', product: 'MailGoat' };
      const result = template.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] || '');
    },
    iterations: 1000,
  },
  
  {
    name: 'Template Rendering (Complex)',
    fn: async () => {
      const template = `
        <html>
          <body>
            <h1>Hello {{name}}</h1>
            <p>Your order #{{orderId}} has been confirmed.</p>
            <ul>
              {{#items}}
              <li>{{name}} - ${{price}}</li>
              {{/items}}
            </ul>
            <p>Total: ${{total}}</p>
          </body>
        </html>
      `;
      const data = {
        name: 'John',
        orderId: '12345',
        items: [
          { name: 'Product 1', price: '10.00' },
          { name: 'Product 2', price: '20.00' },
        ],
        total: '30.00',
      };
      // Simplified template rendering
      const result = template.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] || '');
    },
    iterations: 1000,
  },
];

async function main() {
  console.log('=== Send Performance Benchmarks ===\n');
  
  const results = await runBenchmarks(benchmarks);
  
  console.log('\n' + formatResults(results));
  
  // Save results
  const timestamp = new Date().toISOString();
  const output = {
    suite: 'send',
    timestamp,
    results,
  };
  
  const filename = join(__dirname, 'results', `send-${Date.now()}.json`);
  writeFileSync(filename, JSON.stringify(output, null, 2));
  
  console.log(`Results saved to: ${filename}\n`);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { benchmarks };
