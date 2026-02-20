/**
 * Relay Management Commands
 *
 * Configure and test email relay providers
 */

import { Command } from 'commander';
import prompts from 'prompts';
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
      const configManager = new ConfigManager();
      const config = await configManager.load();
      const currentProvider = config.relay?.provider;
      const providers = RelayProviderFactory.getSupportedProviders();

      console.log(chalk.bold('\nAvailable Relay Providers:\n'));

      for (const provider of providers) {
        const info = RelayProviderFactory.getProviderInfo(provider);
        const isCurrent = provider === currentProvider;
        const marker = isCurrent ? chalk.green('(current)') : '';

        console.log(chalk.cyan(`  ${provider} ${marker}`));
        console.log(`    ${info.description}`);
        console.log(chalk.dim(`    Required: ${info.requiredConfig.join(', ')}\n`));
      }
    });

  // Show current relay configuration
  cmd
    .command('status')
    .description('Show current relay configuration')
    .action(async () => {
      const configManager = new ConfigManager();
      const config = await configManager.load();

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
            const redacted =
              value.length > 8
                ? `${value.substring(0, 4)}...${value.substring(value.length - 4)}`
                : '****';
            console.log(chalk.dim(`    ${key}: ${redacted}`));
          } else if (typeof value === 'object') {
            console.log(chalk.dim(`    ${key}: [configured]`));
          }
        }
      }

      console.log();
    });

  // Interactive configure command
  cmd
    .command('configure <provider>')
    .description('Configure relay provider (interactive)')
    .option('--api-key <key>', 'API key (non-interactive)')
    .option('--api-secret <secret>', 'API secret (non-interactive)')
    .option('--domain <domain>', 'Domain (for Mailgun)')
    .option('--region <region>', 'AWS region (for SES)')
    .option('--access-key <key>', 'AWS access key (for SES)')
    .option('--secret-key <secret>', 'AWS secret key (for SES)')
    .option('--host <host>', 'SMTP hostname (for custom SMTP)')
    .option('--port <port>', 'SMTP port (for custom SMTP)', '587')
    .option('--user <user>', 'SMTP username (for custom SMTP)')
    .option('--pass <password>', 'SMTP password (for custom SMTP)')
    .option('--secure', 'Use TLS (for custom SMTP)', true)
    .option('--from <email>', 'Default sender email address')
    .action(async (provider: string, options) => {
      const configManager = new ConfigManager();
      const config = await configManager.load();

      // Validate provider
      const supportedProviders = RelayProviderFactory.getSupportedProviders();
      if (!supportedProviders.includes(provider as RelayProviderType)) {
        console.log(chalk.red(`Error: Unknown provider "${provider}"`));
        console.log(chalk.dim(`\nSupported providers: ${supportedProviders.join(', ')}`));
        process.exit(1);
      }

      const providerInfo = RelayProviderFactory.getProviderInfo(provider as RelayProviderType);

      // If all required options are provided, use non-interactive mode
      const hasRequiredOptions = checkRequiredOptions(provider, options);

      if (hasRequiredOptions) {
        // Non-interactive mode
        await configureNonInteractive(configManager, config, provider, options);
      } else {
        // Interactive mode
        await configureInteractive(
          configManager,
          config,
          provider as RelayProviderType,
          providerInfo,
          options
        );
      }
    });

  // Test relay connection
  cmd
    .command('test')
    .description('Test current relay configuration')
    .option('--json', 'Output result as JSON')
    .action(async (options) => {
      const configManager = new ConfigManager();
      const config = await configManager.load();

      if (!config.relay) {
        console.log(chalk.red('No relay configured.'));
        process.exit(1);
      }

      try {
        const relayConfig: RelayConfig = {
          provider: config.relay.provider as RelayProviderType,
          credentials: config.relay.credentials || {},
          from: config.fromAddress,
          enableRetry: true,
        };

        const provider = RelayProviderFactory.create(relayConfig);

        if (!options.json) {
          console.log(chalk.dim('Testing relay connection...'));
        }

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

  // Remove relay configuration (use default)
  cmd
    .command('reset')
    .description('Remove relay configuration and use default Postal provider')
    .option('-y, --yes', 'Skip confirmation prompt')
    .action(async (options) => {
      const configManager = new ConfigManager();
      const config = await configManager.load();

      if (!config.relay) {
        console.log(chalk.yellow('No relay configured. Already using default Postal provider.'));
        return;
      }

      // Confirmation prompt unless --yes is passed
      if (!options.yes) {
        const response = await prompts({
          type: 'confirm',
          name: 'confirm',
          message: `Reset relay configuration and use default Postal provider?`,
          initial: false,
        });

        if (!response.confirm) {
          console.log(chalk.dim('Cancelled.'));
          return;
        }
      }

      delete config.relay;

      await configManager.save(config);

      console.log(chalk.green('✓ Relay configuration removed'));
      console.log(chalk.dim('Using default Postal provider'));
    });

  return cmd;
}

/**
 * Check if all required options are provided for non-interactive mode
 */
function checkRequiredOptions(provider: string, options: any): boolean {
  switch (provider) {
    case 'sendgrid':
      return !!options.apiKey;
    case 'mailgun':
      return !!(options.apiKey && options.domain);
    case 'ses':
      return !!(options.accessKey && options.secretKey);
    case 'mailjet':
      return !!(options.apiKey && options.apiSecret);
    case 'custom':
      return !!(options.host && options.port);
    default:
      return false;
  }
}

/**
 * Configure relay in non-interactive mode
 */
async function configureNonInteractive(
  configManager: ConfigManager,
  config: any,
  provider: string,
  options: any
): Promise<void> {
  switch (provider) {
    case 'sendgrid':
      config.relay = {
        provider: 'sendgrid',
        credentials: {
          apiKey: options.apiKey,
        },
        from: options.from,
      };
      break;

    case 'mailgun':
      config.relay = {
        provider: 'mailgun',
        credentials: {
          apiKey: options.apiKey,
          domain: options.domain,
        },
        from: options.from,
      };
      break;

    case 'ses':
      config.relay = {
        provider: 'ses',
        credentials: {
          apiKey: options.accessKey,
          apiSecret: options.secretKey,
          region: options.region || 'us-east-1',
        },
        from: options.from,
      };
      break;

    case 'mailjet':
      config.relay = {
        provider: 'mailjet',
        credentials: {
          apiKey: options.apiKey,
          apiSecret: options.apiSecret,
        },
        from: options.from,
      };
      break;

    case 'custom':
      config.relay = {
        provider: 'custom',
        credentials: {
          smtp: {
            host: options.host,
            port: parseInt(options.port, 10),
            secure: options.secure !== false,
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
      break;
  }

  await configManager.save(config);

  console.log(chalk.green(`✓ ${provider} relay configured`));
  console.log(chalk.dim('Run `mailgoat relay test` to verify connection'));
}

/**
 * Configure relay in interactive mode with prompts
 */
async function configureInteractive(
  configManager: ConfigManager,
  config: any,
  provider: RelayProviderType,
  providerInfo: any,
  options: any
): Promise<void> {
  console.log(chalk.bold(`\nConfiguring ${providerInfo.name}\n`));
  console.log(chalk.dim(providerInfo.description));
  console.log();

  let credentials: any = {};

  switch (provider) {
    case 'sendgrid':
      const sgResponse = await prompts([
        {
          type: 'password',
          name: 'apiKey',
          message: 'SendGrid API Key:',
          validate: (value) => (value.trim() ? true : 'API key is required'),
        },
      ]);
      if (!sgResponse.apiKey) {
        console.log(chalk.dim('Cancelled.'));
        return;
      }
      credentials = { apiKey: sgResponse.apiKey };
      break;

    case 'mailgun':
      const mgResponse = await prompts([
        {
          type: 'password',
          name: 'apiKey',
          message: 'Mailgun API Key:',
          validate: (value) => (value.trim() ? true : 'API key is required'),
        },
        {
          type: 'text',
          name: 'domain',
          message: 'Mailgun Domain (e.g., mg.example.com):',
          validate: (value) => (value.trim() ? true : 'Domain is required'),
        },
      ]);
      if (!mgResponse.apiKey || !mgResponse.domain) {
        console.log(chalk.dim('Cancelled.'));
        return;
      }
      credentials = {
        apiKey: mgResponse.apiKey,
        domain: mgResponse.domain,
      };
      break;

    case 'ses':
      const sesResponse = await prompts([
        {
          type: 'password',
          name: 'accessKey',
          message: 'AWS Access Key ID:',
          validate: (value) => (value.trim() ? true : 'Access key is required'),
        },
        {
          type: 'password',
          name: 'secretKey',
          message: 'AWS Secret Access Key:',
          validate: (value) => (value.trim() ? true : 'Secret key is required'),
        },
        {
          type: 'text',
          name: 'region',
          message: 'AWS Region:',
          initial: 'us-east-1',
        },
      ]);
      if (!sesResponse.accessKey || !sesResponse.secretKey) {
        console.log(chalk.dim('Cancelled.'));
        return;
      }
      credentials = {
        apiKey: sesResponse.accessKey,
        apiSecret: sesResponse.secretKey,
        region: sesResponse.region || 'us-east-1',
      };
      break;

    case 'mailjet':
      const mjResponse = await prompts([
        {
          type: 'password',
          name: 'apiKey',
          message: 'Mailjet API Key:',
          validate: (value) => (value.trim() ? true : 'API key is required'),
        },
        {
          type: 'password',
          name: 'apiSecret',
          message: 'Mailjet API Secret:',
          validate: (value) => (value.trim() ? true : 'API secret is required'),
        },
      ]);
      if (!mjResponse.apiKey || !mjResponse.apiSecret) {
        console.log(chalk.dim('Cancelled.'));
        return;
      }
      credentials = {
        apiKey: mjResponse.apiKey,
        apiSecret: mjResponse.apiSecret,
      };
      break;

    case 'custom':
      const smtpResponse = await prompts([
        {
          type: 'text',
          name: 'host',
          message: 'SMTP Hostname:',
          validate: (value) => (value.trim() ? true : 'Hostname is required'),
        },
        {
          type: 'number',
          name: 'port',
          message: 'SMTP Port:',
          initial: 587,
        },
        {
          type: 'confirm',
          name: 'secure',
          message: 'Use TLS?',
          initial: true,
        },
        {
          type: 'text',
          name: 'user',
          message: 'SMTP Username (optional):',
        },
        {
          type: (prev, values) => (values.user ? 'password' : null),
          name: 'pass',
          message: 'SMTP Password:',
        },
      ]);
      if (!smtpResponse.host) {
        console.log(chalk.dim('Cancelled.'));
        return;
      }
      credentials = {
        smtp: {
          host: smtpResponse.host,
          port: smtpResponse.port || 587,
          secure: smtpResponse.secure !== false,
          auth: smtpResponse.user
            ? {
                user: smtpResponse.user,
                pass: smtpResponse.pass || '',
              }
            : undefined,
        },
      };
      break;
  }

  // Ask for default sender email
  const fromResponse = await prompts({
    type: 'text',
    name: 'from',
    message: 'Default sender email (optional):',
    initial: options.from || config.fromAddress || '',
  });

  config.relay = {
    provider,
    credentials,
    from: fromResponse.from || undefined,
  };

  await configManager.save(config);

  console.log(chalk.green(`\n✓ ${providerInfo.name} relay configured`));
  console.log(chalk.dim('Run `mailgoat relay test` to verify connection'));
}
