#!/usr/bin/env node
/**
 * Run all benchmarks and generate report
 */

const { execSync } = require('child_process');
const { writeFileSync, readdirSync, readFileSync } = require('fs');
const { join } = require('path');
const chalk = require('chalk');

async function main() {
  console.log(chalk.bold.cyan('\n=== MailGoat Performance Benchmarks ===\n'));
  
  const suites = ['send', 'api'];
  const allResults = {};
  
  for (const suite of suites) {
    console.log(chalk.yellow(`\nRunning ${suite} benchmarks...\n`));
    
    try {
      execSync(`node ${suite}-benchmarks.js`, {
        cwd: __dirname,
        stdio: 'inherit',
      });
      
      // Find latest result file
      const resultFiles = readdirSync(join(__dirname, 'results'))
        .filter(f => f.startsWith(`${suite}-`) && f.endsWith('.json'))
        .sort()
        .reverse();
      
      if (resultFiles.length > 0) {
        const latest = readFileSync(join(__dirname, 'results', resultFiles[0]), 'utf-8');
        allResults[suite] = JSON.parse(latest);
      }
    } catch (error) {
      console.error(chalk.red(`Failed to run ${suite} benchmarks:`), error.message);
    }
  }
  
  // Generate summary
  console.log(chalk.bold.green('\n=== Summary ===\n'));
  
  for (const [suite, data] of Object.entries(allResults)) {
    console.log(chalk.bold(`${suite.toUpperCase()} Suite:`));
    
    for (const result of data.results) {
      const p50 = result.p50.toFixed(2);
      const p95 = result.p95.toFixed(2);
      console.log(`  ${result.name}: ${p50}ms (p50), ${p95}ms (p95)`);
    }
    
    console.log('');
  }
  
  // Save combined results
  const timestamp = new Date().toISOString();
  const combined = {
    timestamp,
    suites: allResults,
  };
  
  const filename = join(__dirname, 'results', `combined-${Date.now()}.json`);
  writeFileSync(filename, JSON.stringify(combined, null, 2));
  
  console.log(chalk.dim(`Full results saved to: ${filename}\n`));
  
  // Generate HTML report
  generateHtmlReport(combined, join(__dirname, 'reports', `report-${Date.now()}.html`));
  
  console.log(chalk.green('✓ Benchmarks complete\n'));
}

function generateHtmlReport(data, filename) {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>MailGoat Performance Report</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    h1 { color: #333; }
    h2 { color: #666; margin-top: 30px; }
    table {
      width: 100%;
      border-collapse: collapse;
      background: white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      margin: 20px 0;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #e0e0e0;
    }
    th {
      background: #f8f8f8;
      font-weight: 600;
    }
    .metric { font-family: 'Courier New', monospace; }
    .timestamp { color: #999; font-size: 0.9em; }
  </style>
</head>
<body>
  <h1>MailGoat Performance Report</h1>
  <p class="timestamp">Generated: ${data.timestamp}</p>
  
  ${Object.entries(data.suites).map(([suite, suiteData]) => `
    <h2>${suite.toUpperCase()} Performance</h2>
    <table>
      <thead>
        <tr>
          <th>Benchmark</th>
          <th>p50</th>
          <th>p95</th>
          <th>p99</th>
          <th>Mean</th>
          <th>Stddev</th>
        </tr>
      </thead>
      <tbody>
        ${suiteData.results.map(r => `
          <tr>
            <td>${r.name}</td>
            <td class="metric">${r.p50.toFixed(2)}ms</td>
            <td class="metric">${r.p95.toFixed(2)}ms</td>
            <td class="metric">${r.p99.toFixed(2)}ms</td>
            <td class="metric">${r.mean.toFixed(2)}ms</td>
            <td class="metric">${r.stddev.toFixed(2)}ms</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `).join('')}
</body>
</html>
  `;
  
  writeFileSync(filename, html);
  console.log(chalk.dim(`HTML report: ${filename}`));
}

if (require.main === module) {
  main().catch(console.error);
}
