/**
 * Health check command for MailGoat CLI
 * Performs system health checks for operational monitoring
 */

import { Command } from 'commander';
import * as fs from 'fs';
import * as os from 'os';
import chalk from 'chalk';
import { ConfigManager } from '../lib/config';
import { PostalClient } from '../lib/postal-client';
import type { RateLimitBucket } from '../lib/postal-client';
import { Formatter } from '../lib/formatter';
import { debugLogger } from '../lib/debug';

interface HealthCheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  duration?: number;
  details?: Record<string, unknown>;
}

interface HealthReport {
  healthy: boolean;
  timestamp: string;
  checks: HealthCheckResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  };
}

type HealthExitCode = 0 | 1 | 2;

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/**
 * Check if config file exists and is valid
 */
async function checkConfig(configManager: ConfigManager): Promise<HealthCheckResult> {
  const start = Date.now();

  try {
    if (!(await configManager.exists())) {
      return {
        name: 'config',
        status: 'fail',
        message: 'Config file not found',
        duration: Date.now() - start,
        details: {
          expected: configManager.getPath(),
          solution: 'Run: mailgoat config init',
        },
      };
    }

    const config = await configManager.load();

    // Validate required fields
    if (!config.server || !config.fromAddress || !config.api_key) {
      return {
        name: 'config',
        status: 'fail',
        message: 'Config file missing required fields',
        duration: Date.now() - start,
        details: {
          required: ['server', 'fromAddress', 'api_key'],
          found: Object.keys(config),
        },
      };
    }

    return {
      name: 'config',
      status: 'pass',
      message: 'Config file valid',
      duration: Date.now() - start,
      details: {
        path: configManager.getPath(),
        server: config.server,
        fromAddress: config.fromAddress,
      },
    };
  } catch (error: unknown) {
    return {
      name: 'config',
      status: 'fail',
      message: `Config error: ${getErrorMessage(error)}`,
      duration: Date.now() - start,
    };
  }
}

/**
 * Check Postal server connectivity
 */
async function checkConnectivity(client: PostalClient, server: string): Promise<HealthCheckResult> {
  const start = Date.now();

  try {
    // Try to send a test message (this will fail but tests connectivity)
    // We use a deliberately invalid recipient to avoid actually sending
    await client.sendMessage({
      to: ['healthcheck@invalid.local'],
      subject: 'Health Check',
      plain_body: 'Test',
    });

    // If we get here without network error, server is reachable
    return {
      name: 'connectivity',
      status: 'pass',
      message: 'Postal server reachable',
      duration: Date.now() - start,
      details: { server },
    };
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    const code = error instanceof Error && 'code' in error ? String(error.code) : undefined;
    // Network errors mean connectivity issue
    if (code === 'ENOTFOUND' || code === 'ECONNREFUSED' || code === 'ETIMEDOUT') {
      return {
        name: 'connectivity',
        status: 'fail',
        message: `Cannot reach Postal server: ${message}`,
        duration: Date.now() - start,
        details: { server, error: code },
      };
    }

    // Other errors (like auth) mean server is reachable
    return {
      name: 'connectivity',
      status: 'pass',
      message: 'Postal server reachable',
      duration: Date.now() - start,
      details: {
        server,
        note: 'Server responded (auth not yet verified)',
      },
    };
  }
}

/**
 * Check API authentication
 */
async function checkAuthentication(client: PostalClient): Promise<HealthCheckResult> {
  const start = Date.now();

  try {
    // Try to send to invalid address - if we get validation error, auth worked
    await client.sendMessage({
      to: ['healthcheck@invalid.local'],
      subject: 'Health Check',
      plain_body: 'Test',
    });

    // If no error, auth is good (though send might fail for other reasons)
    return {
      name: 'authentication',
      status: 'pass',
      message: 'API authentication successful',
      duration: Date.now() - start,
    };
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    // 401/403 means auth failed
    if (/authentication|unauthorized|forbidden/i.test(message)) {
      return {
        name: 'authentication',
        status: 'fail',
        message: 'API authentication failed',
        duration: Date.now() - start,
        details: {
          error: message,
          solution: 'Check API key in config',
        },
      };
    }

    // Other errors mean auth likely worked
    return {
      name: 'authentication',
      status: 'pass',
      message: 'API authentication successful',
      duration: Date.now() - start,
      details: {
        note: 'Server responded with non-auth error (auth valid)',
      },
    };
  }
}

/**
 * Check disk space for critical directories
 */
async function checkDiskSpace(): Promise<HealthCheckResult> {
  const start = Date.now();

  try {
    const homeDir = os.homedir();
    const mailgoatDir = `${homeDir}/.mailgoat`;

    // Check if .mailgoat directory exists
    if (!fs.existsSync(mailgoatDir)) {
      return {
        name: 'disk_space',
        status: 'warn',
        message: 'MailGoat directory not yet created',
        duration: Date.now() - start,
        details: {
          path: mailgoatDir,
          note: 'Directory will be created on first use',
        },
      };
    }

    // Check directory is writable
    try {
      const testFile = `${mailgoatDir}/.health-check-${Date.now()}`;
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
    } catch {
      return {
        name: 'disk_space',
        status: 'fail',
        message: 'MailGoat directory not writable',
        duration: Date.now() - start,
        details: {
          path: mailgoatDir,
          solution: 'Check directory permissions',
        },
      };
    }

    return {
      name: 'disk_space',
      status: 'pass',
      message: 'Disk space and permissions OK',
      duration: Date.now() - start,
      details: {
        mailgoatDir,
        writable: true,
      },
    };
  } catch (error: unknown) {
    return {
      name: 'disk_space',
      status: 'fail',
      message: `Disk check failed: ${getErrorMessage(error)}`,
      duration: Date.now() - start,
    };
  }
}

/**
 * Check templates directory
 */
async function checkTemplates(): Promise<HealthCheckResult> {
  const start = Date.now();

  try {
    const homeDir = os.homedir();
    const templatesDir = `${homeDir}/.mailgoat/templates`;

    if (!fs.existsSync(templatesDir)) {
      return {
        name: 'templates',
        status: 'warn',
        message: 'Templates directory not yet created',
        duration: Date.now() - start,
        details: {
          path: templatesDir,
          note: 'Directory will be created when first template is added',
        },
      };
    }

    // Count templates
    const files = fs.readdirSync(templatesDir);
    const templates = files.filter((f) => f.endsWith('.yml'));

    return {
      name: 'templates',
      status: 'pass',
      message: `Templates directory OK (${templates.length} template${templates.length !== 1 ? 's' : ''})`,
      duration: Date.now() - start,
      details: {
        path: templatesDir,
        count: templates.length,
      },
    };
  } catch (error: unknown) {
    return {
      name: 'templates',
      status: 'warn',
      message: `Templates check failed: ${getErrorMessage(error)}`,
      duration: Date.now() - start,
    };
  }
}

async function checkSendTest(client: PostalClient, to: string): Promise<HealthCheckResult> {
  const start = Date.now();

  try {
    await client.sendMessage({
      to: [to],
      subject: '[MailGoat Health Check] Test Message',
      plain_body: 'This is a MailGoat health check test email.',
    });

    return {
      name: 'send_test',
      status: 'pass',
      message: `Test email sent to ${to}`,
      duration: Date.now() - start,
      details: { to },
    };
  } catch (error: unknown) {
    return {
      name: 'send_test',
      status: 'fail',
      message: `Test email failed: ${getErrorMessage(error)}`,
      duration: Date.now() - start,
      details: {
        to,
        solution:
          'Verify sender domain in Postal, recipient validity, and delivery permissions before retrying --send-test',
      },
    };
  }
}

function formatBucketSummary(name: string, bucket: RateLimitBucket): string | null {
  if (typeof bucket.used !== 'number' || typeof bucket.limit !== 'number') {
    return null;
  }

  const percent =
    typeof bucket.percentUsed === 'number'
      ? bucket.percentUsed
      : Math.round((bucket.used / bucket.limit) * 1000) / 10;
  const label =
    name === 'today'
      ? 'Emails today'
      : name === 'hour'
        ? 'Last hour'
        : name === 'burst'
          ? 'Burst'
          : `Window (${name})`;

  return `${label}: ${bucket.used}/${bucket.limit} (${percent}%)`;
}

function checkRateLimits(client: PostalClient): HealthCheckResult {
  const start = Date.now();
  const rate = client.getLastRateLimit();
  const buckets = rate?.buckets;

  if (!buckets || Object.keys(buckets).length === 0) {
    return {
      name: 'rate_limits',
      status: 'pass',
      message: 'Rate limit headers not available from Postal',
      duration: Date.now() - start,
    };
  }

  const entries = Object.entries(buckets);
  const lines = entries
    .map(([name, bucket]) => formatBucketSummary(name, bucket))
    .filter((line): line is string => Boolean(line));

  const nearLimit = entries.find(
    ([, bucket]) => typeof bucket.percentUsed === 'number' && bucket.percentUsed >= 90
  );

  if (nearLimit) {
    const [bucketName, bucket] = nearLimit;
    return {
      name: 'rate_limits',
      status: 'warn',
      message: `Rate limit warning: ${bucket.used}/${bucket.limit} in ${bucketName} window`,
      duration: Date.now() - start,
      details: {
        lines,
        resetInSeconds: bucket.resetInSeconds,
      },
    };
  }

  return {
    name: 'rate_limits',
    status: 'pass',
    message: 'Rate limits within normal range',
    duration: Date.now() - start,
    details: { lines },
  };
}

/**
 * Perform all health checks
 */
async function performHealthChecks(verbose: boolean, sendTest: boolean): Promise<HealthReport> {
  const checks: HealthCheckResult[] = [];
  const timestamp = new Date().toISOString();

  debugLogger.log('main', 'Starting health checks');

  // Check 1: Config
  if (verbose) console.log(chalk.cyan('Checking config...'));
  const configManager = new ConfigManager();
  const configCheck = await checkConfig(configManager);
  checks.push(configCheck);

  // If config fails, can't do other checks
  if (configCheck.status === 'fail') {
    return {
      healthy: false,
      timestamp,
      checks,
      summary: {
        total: 1,
        passed: 0,
        failed: 1,
        warnings: 0,
      },
    };
  }

  // Check 2: Disk space
  if (verbose) console.log(chalk.cyan('Checking disk space...'));
  const diskCheck = await checkDiskSpace();
  checks.push(diskCheck);

  // Check 3: Templates
  if (verbose) console.log(chalk.cyan('Checking templates...'));
  const templatesCheck = await checkTemplates();
  checks.push(templatesCheck);

  // Load config for network checks
  const config = await configManager.load();
  const client = new PostalClient(config, {
    enableRetry: false, // Don't retry for health checks
  });

  // Check 4: Connectivity
  if (verbose) console.log(chalk.cyan('Checking Postal connectivity...'));
  const connectivityCheck = await checkConnectivity(client, config.server);
  checks.push(connectivityCheck);

  // Only check auth if connectivity passed
  if (connectivityCheck.status === 'pass') {
    // Check 5: Authentication
    if (verbose) console.log(chalk.cyan('Checking API authentication...'));
    const authCheck = await checkAuthentication(client);
    checks.push(authCheck);

    // Optional send test
    if (sendTest) {
      if (verbose) console.log(chalk.cyan('Sending test email...'));
      const sendTestCheck = await checkSendTest(client, config.fromAddress);
      checks.push(sendTestCheck);
    }

    // Check 6: Rate limits (header-based, best-effort)
    const rateLimitCheck = checkRateLimits(client);
    checks.push(rateLimitCheck);
  }

  // Calculate summary
  const summary = {
    total: checks.length,
    passed: checks.filter((c) => c.status === 'pass').length,
    failed: checks.filter((c) => c.status === 'fail').length,
    warnings: checks.filter((c) => c.status === 'warn').length,
  };

  const healthy = summary.failed === 0;

  return {
    healthy,
    timestamp,
    checks,
    summary,
  };
}

function getHealthExitCode(report: HealthReport): HealthExitCode {
  if (report.summary.failed > 0) {
    return 2;
  }
  if (report.summary.warnings > 0) {
    return 1;
  }
  return 0;
}

export function createHealthCommand(): Command {
  const cmd = new Command('health');

  cmd
    .description('Check system health and connectivity')
    .option('-v, --verbose', 'Show detailed check progress', false)
    .option('--json', 'Output results as JSON')
    .option('--send-test', 'Send a test email to configured fromAddress', false)
    .action(async (options) => {
      const operationId = `health-${Date.now()}`;
      debugLogger.timeStart(operationId, 'Health check');

      try {
        const formatter = new Formatter(options.json);

        if (!options.json && !options.verbose) {
          console.log(chalk.cyan('Running health checks...'));
        }

        // Perform all checks
        const report = await performHealthChecks(options.verbose, options.sendTest);

        if (options.json) {
          // JSON output for monitoring tools
          formatter.output(report);
        } else {
          // Human-readable output
          console.log();
          console.log(
            chalk.bold(
              report.healthy ? chalk.green('✓ System Healthy') : chalk.red('✗ System Unhealthy')
            )
          );
          console.log();

          // Show each check
          report.checks.forEach((check) => {
            const icon =
              check.status === 'pass'
                ? chalk.green('✓')
                : check.status === 'fail'
                  ? chalk.red('✗')
                  : chalk.yellow('⚠');
            const status =
              check.status === 'pass'
                ? chalk.green('PASS')
                : check.status === 'fail'
                  ? chalk.red('FAIL')
                  : chalk.yellow('WARN');

            console.log(
              `${icon} ${chalk.bold(check.name.padEnd(20))} ${status} - ${check.message}`
            );

            if (check.duration) {
              console.log(chalk.gray(`  Duration: ${check.duration}ms`));
            }

            if (check.details && options.verbose) {
              console.log(chalk.gray(`  Details: ${JSON.stringify(check.details, null, 2)}`));
            }

            if (check.details?.solution) {
              console.log(chalk.yellow(`  Solution: ${check.details.solution}`));
            }

            if (check.name === 'rate_limits' && Array.isArray(check.details?.lines)) {
              console.log(chalk.gray('  Rate limits:'));
              for (const line of check.details.lines) {
                console.log(chalk.gray(`  - ${line}`));
              }
              if (
                typeof check.details.resetInSeconds === 'number' &&
                check.details.resetInSeconds > 0
              ) {
                const minutes = Math.ceil(check.details.resetInSeconds / 60);
                console.log(chalk.gray(`  Reset in: ${minutes} minute${minutes === 1 ? '' : 's'}`));
              }
            }

            console.log();
          });

          // Summary
          console.log(chalk.bold('Summary:'));
          console.log(
            chalk.gray(
              `  Total: ${report.summary.total}, ` +
                chalk.green(`Passed: ${report.summary.passed}`) +
                `, ` +
                chalk.red(`Failed: ${report.summary.failed}`) +
                `, ` +
                chalk.yellow(`Warnings: ${report.summary.warnings}`)
            )
          );
          console.log(chalk.gray(`  Timestamp: ${report.timestamp}`));
        }

        debugLogger.timeEnd(operationId);

        // Exit with appropriate code
        process.exit(getHealthExitCode(report));
      } catch (error: unknown) {
        debugLogger.timeEnd(operationId);
        debugLogger.logError('main', error);
        const message = getErrorMessage(error);

        const formatter = new Formatter(options.json);

        if (options.json) {
          formatter.output({
            healthy: false,
            error: message,
            timestamp: new Date().toISOString(),
          });
        } else {
          console.error(formatter.error(message));
        }

        process.exit(2);
      }
    });

  return cmd;
}
