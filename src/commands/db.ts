/**
 * Database Management Commands
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { EmailQueue } from '../lib/queue';
import { DatabaseOptimizer } from '../lib/database/optimizer';
import { Formatter } from '../lib/formatter';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function createDbCommand(): Command {
  const cmd = new Command('db');

  cmd.description('Database management and optimization');

  // Database stats
  cmd
    .command('stats')
    .description('Show database statistics')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      const queue = new EmailQueue();
      const db = (queue as any).db; // Access private db
      const optimizer = new DatabaseOptimizer(db);

      const stats = optimizer.getStats();

      queue.close();

      if (options.json) {
        Formatter.outputJson(stats);
        return;
      }

      console.log(chalk.bold('\n📊 Database Statistics\n'));
      console.log(`  Size:         ${formatBytes(stats.sizeBytes)}`);
      console.log(`  Pages:        ${stats.pageCount}`);
      console.log(`  Page size:    ${formatBytes(stats.pageSize)}`);
      console.log(`  Free pages:   ${stats.freelistCount}`);
      console.log(`  Cache size:   ${stats.cacheSize} pages`);
      console.log(`  Journal mode: ${chalk.cyan(stats.journalMode)}`);
      console.log('');
    });

  // Optimize database
  cmd
    .command('optimize')
    .description('Optimize database performance')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      const queue = new EmailQueue();
      const db = (queue as any).db;
      const optimizer = new DatabaseOptimizer(db);

      console.log(chalk.dim('Optimizing database...\n'));

      const result = optimizer.optimize();

      queue.close();

      if (options.json) {
        Formatter.outputJson(result);
        return;
      }

      console.log(chalk.bold('🔧 Optimization Results\n'));

      // Tuning
      console.log(chalk.cyan('Tuning:'));
      for (const item of result.tuning.optimized) {
        console.log(chalk.green(`  ✓ ${item}`));
      }
      for (const warning of result.tuning.warnings) {
        console.log(chalk.yellow(`  ⚠ ${warning}`));
      }
      console.log('');

      // Indexes
      console.log(chalk.cyan('Indexes:'));
      for (const item of result.indexes.optimized) {
        console.log(chalk.green(`  ✓ ${item}`));
      }
      for (const warning of result.indexes.warnings) {
        console.log(chalk.yellow(`  ⚠ ${warning}`));
      }
      console.log('');

      // Maintenance
      console.log(chalk.cyan('Maintenance:'));
      console.log(chalk.green(`  ✓ VACUUM completed (${result.vacuum}ms)`));
      console.log(chalk.green(`  ✓ ANALYZE completed (${result.analyze}ms)`));
      console.log('');

      // Integrity
      console.log(chalk.cyan('Integrity Check:'));
      if (result.integrity.ok) {
        console.log(chalk.green('  ✓ Database integrity OK'));
      } else {
        console.log(chalk.red('  ✗ Integrity check failed:'));
        for (const error of result.integrity.errors) {
          console.log(chalk.red(`    - ${error}`));
        }
      }
      console.log('');

      console.log(chalk.bold(`Total time: ${result.totalMs}ms\n`));
    });

  // Vacuum
  cmd
    .command('vacuum')
    .description('Reclaim unused space')
    .action(async () => {
      const queue = new EmailQueue();
      const db = (queue as any).db;
      const optimizer = new DatabaseOptimizer(db);

      console.log(chalk.dim('Running VACUUM...'));

      const ms = optimizer.vacuum();

      queue.close();

      console.log(chalk.green(`✓ VACUUM completed in ${ms}ms\n`));
    });

  // Analyze
  cmd
    .command('analyze')
    .description('Update query statistics')
    .action(async () => {
      const queue = new EmailQueue();
      const db = (queue as any).db;
      const optimizer = new DatabaseOptimizer(db);

      console.log(chalk.dim('Running ANALYZE...'));

      const ms = optimizer.analyze();

      queue.close();

      console.log(chalk.green(`✓ ANALYZE completed in ${ms}ms\n`));
    });

  // Integrity check
  cmd
    .command('check')
    .description('Check database integrity')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      const queue = new EmailQueue();
      const db = (queue as any).db;
      const optimizer = new DatabaseOptimizer(db);

      console.log(chalk.dim('Checking integrity...\n'));

      const result = optimizer.checkIntegrity();

      queue.close();

      if (options.json) {
        Formatter.outputJson(result);
        return;
      }

      if (result.ok) {
        console.log(chalk.green('✓ Database integrity OK\n'));
      } else {
        console.log(chalk.red('✗ Integrity check failed:\n'));
        for (const error of result.errors) {
          console.log(chalk.red(`  - ${error}`));
        }
        console.log('');
        process.exit(1);
      }
    });

  return cmd;
}
