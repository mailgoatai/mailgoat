/**
 * Relay Management Commands
 *
 * Configure and test email relay providers
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { ConfigManager } from '../lib/config';
import { RelayProviderFactory, RelayConfig, RelayProviderType } from '../providers/relay';
import { Formatter } from '../lib/formatter';

export function createRelayCommand(): Command {
  const cmd = new Command('relay');

  cmd.description('Configure and test email relay providers');

  // List available providers
  cmd
    .command('list')
    .description('List available relay providers')
    .action(async () => {
      const providers = RelayProviderFactory.getSupportedProviders();

      console.log(chalk.bold('\nAvailable Relay Providers:\n'));

      for (const provider of providers) {
        const info = RelayProviderFactory.getProviderInfo(provider);
        console.log(chalk.cyan(`  ${provider}`));
        console.log(`    ${info.description}`);
        console.log(chalk.dim(`    Required: ${info.requiredConfig.join(', ')}\n`));
      }
    });

  // Show current relay configuration
  cmd
    .command('status')
    .description('Show current relay configuration')
    .action(async () => {
      const config = await ConfigManager.load();

      if (!config.relay) {
        console.log(chalk.yellow('No relay configured. Using default Postal provider.'));
        return;
      }

      console.log(chalk.bold('\nCurrent Relay Configuration:\n'));
      console.log(`  Provider: ${chalk.cyan(config.relay.provider)}`);

      const info = RelayProviderFactory.getProviderInfo(config.relay.provider as RelayProviderType);
      console.log(`  Name: ${info.name}`);
      console.log(`  Description: ${chalk.dim(info.description)}`);

      // Show redacted credentials
      if (config.relay.credentials) {
        console.log(chalk.dim('\n  Credentials (redacted):'));
        for (const [key, value] of Object.entries(config.relay.credentials)) {
          if (typeof value === 'string') {
            console.log(chalk.dim(`    ${key}: ${value.substring(0, 4)}...`));
          } else if (typeof value === 'object') {
            console.log(chalk.dim(`    ${key}: [configured]`));
          }
        }
      }

      console.log();
    });

  // Test relay connection
  cmd
    .command('test')
    .description('Test current relay configuration')
    .option('--json', 'Output result as JSON')
    .action(async (options) => {
      const config = await ConfigManager.load();

      if (!config.relay) {
        console.log(chalk.red('No relay configured.'));
        process.exit(1);
      }

      try {
        const relayConfig: RelayConfig = {
          provider: config.relay.provider as RelayProviderType,
          credentials: config.relay.credentials || {},
          from: config.email,
          enableRetry: true,
        };

        const provider = RelayProviderFactory.create(relayConfig);

        console.log(chalk.dim('Testing relay connection...'));

        const isConnected = await provider.testConnection();

        if (options.json) {
          Formatter.outputJson({ ok: isConnected });
          return;
        }

        if (isConnected) {
          console.log(chalk.green('✓ Connection successful'));
        } else {
          console.log(chalk.red('✗ Connection failed'));
          process.exit(1);
        }
      } catch (error) {
        if (options.json) {
          Formatter.outputJson({
            ok: false,
            error: error instanceof Error ? error.message : String(error),
          });
          return;
        }

        console.log(
          chalk.red(`✗ Error: ${error instanceof Error ? error.message : String(error)}`)
        );
        process.exit(1);
      }
    });

  // Configure SendGrid
  cmd
    .command('config-sendgrid')
    .description('Configure SendGrid relay')
    .requiredOption('--api-key <key>', 'SendGrid API key')
    .option('--from <email>', 'Default sender email address')
    .action(async (options) => {
      const config = await ConfigManager.load();

      config.relay = {
        provider: 'sendgrid',
        credentials: {
          apiKey: options.apiKey,
        },
        from: options.from,
      };

      await ConfigManager.save(config);

      console.log(chalk.green('✓ SendGrid relay configured'));
      console.log(chalk.dim('Run `mailgoat relay test` to verify connection'));
    });

  // Configure Mailgun
  cmd
    .command('config-mailgun')
    .description('Configure Mailgun relay')
    .requiredOption('--api-key <key>', 'Mailgun API key')
    .requiredOption('--domain <domain>', 'Mailgun domain')
    .option('--from <email>', 'Default sender email address')
    .action(async (options) => {
      const config = await ConfigManager.load();

      config.relay = {
        provider: 'mailgun',
        credentials: {
          apiKey: options.apiKey,
          domain: options.domain,
        },
        from: options.from,
      };

      await ConfigManager.save(config);

      console.log(chalk.green('✓ Mailgun relay configured'));
      console.log(chalk.dim('Run `mailgoat relay test` to verify connection'));
    });

  // Configure Amazon SES
  cmd
    .command('config-ses')
    .description('Configure Amazon SES relay')
    .requiredOption('--access-key <key>', 'AWS Access Key ID')
    .requiredOption('--secret-key <secret>', 'AWS Secret Access Key')
    .option('--region <region>', 'AWS region', 'us-east-1')
    .option('--from <email>', 'Default sender email address')
    .action(async (options) => {
      const config = await ConfigManager.load();

      config.relay = {
        provider: 'ses',
        credentials: {
          apiKey: options.accessKey,
          apiSecret: options.secretKey,
          region: options.region,
        },
        from: options.from,
      };

      await ConfigManager.save(config);

      console.log(chalk.green('✓ Amazon SES relay configured'));
      console.log(chalk.dim('Run `mailgoat relay test` to verify connection'));
    });

  // Configure Mailjet
  cmd
    .command('config-mailjet')
    .description('Configure Mailjet relay')
    .requiredOption('--api-key <key>', 'Mailjet API key')
    .requiredOption('--api-secret <secret>', 'Mailjet API secret')
    .option('--from <email>', 'Default sender email address')
    .action(async (options) => {
      const config = await ConfigManager.load();

      config.relay = {
        provider: 'mailjet',
        credentials: {
          apiKey: options.apiKey,
          apiSecret: options.apiSecret,
        },
        from: options.from,
      };

      await ConfigManager.save(config);

      console.log(chalk.green('✓ Mailjet relay configured'));
      console.log(chalk.dim('Run `mailgoat relay test` to verify connection'));
    });

  // Configure custom SMTP
  cmd
    .command('config-smtp')
    .description('Configure custom SMTP relay')
    .requiredOption('--host <host>', 'SMTP server hostname')
    .requiredOption('--port <port>', 'SMTP port', '587')
    .option('--secure', 'Use TLS (default: true)', true)
    .option('--user <user>', 'SMTP username')
    .option('--pass <password>', 'SMTP password')
    .option('--from <email>', 'Default sender email address')
    .action(async (options) => {
      const config = await ConfigManager.load();

      config.relay = {
        provider: 'custom',
        credentials: {
          smtp: {
            host: options.host,
            port: parseInt(options.port, 10),
            secure: options.secure,
            auth: options.user
              ? {
                  user: options.user,
                  pass: options.pass || '',
                }
              : undefined,
          },
        },
        from: options.from,
      };

      await ConfigManager.save(config);

      console.log(chalk.green('✓ Custom SMTP relay configured'));
      console.log(chalk.dim('Run `mailgoat relay test` to verify connection'));
    });

  // Remove relay configuration (use default)
  cmd
    .command('reset')
    .description('Remove relay configuration and use default Postal provider')
    .action(async () => {
      const config = await ConfigManager.load();

      delete config.relay;

      await ConfigManager.save(config);

      console.log(chalk.green('✓ Relay configuration removed'));
      console.log(chalk.dim('Using default Postal provider'));
    });

  return cmd;
}
