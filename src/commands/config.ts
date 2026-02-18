import { Command } from 'commander';
import prompts from 'prompts';
import chalk from 'chalk';
import { ConfigManager, MailGoatConfig } from '../lib/config';
import { PostalClient } from '../lib/postal-client';
import { Formatter } from '../lib/formatter';
import { validationService } from '../lib/validation-service';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function getNestedValue(source: Record<string, unknown>, key: string): unknown {
  const parts = key.split('.');
  let current: unknown = source;
  for (const part of parts) {
    if (!current || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function setNestedValue(source: Record<string, unknown>, key: string, value: unknown): void {
  const parts = key.split('.');
  let current: Record<string, unknown> = source;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!current[part] || typeof current[part] !== 'object') {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }
  current[parts[parts.length - 1]] = value;
}

/**
 * Validate email address format (wrapper for prompts)
 */
function validateEmail(email: string): boolean | string {
  const result = validationService.validateEmail(email);
  if (!result.valid) {
    return result.error || 'Invalid email address';
  }
  return true;
}

/**
 * Validate server URL format (wrapper for prompts)
 */
function validateServerUrl(url: string): boolean | string {
  const result = validationService.validateUrl(url);
  if (!result.valid) {
    return 'Invalid server URL format (e.g., https://postal.example.com)';
  }
  return true;
}

/**
 * Validate API key format (wrapper for prompts)
 */
function validateApiKey(key: string): boolean | string {
  if (!key || !key.trim()) {
    return 'API key is required';
  }
  const result = validationService.validateApiKey(key.trim());
  if (!result.valid) {
    return result.error || 'Invalid API key';
  }
  return true;
}

/**
 * Test connection to Postal server
 */
async function testConnection(config: MailGoatConfig): Promise<boolean> {
  try {
    const client = new PostalClient(config);
    // Try to send a test request (will fail gracefully if server is reachable)
    // We're just testing if the server responds, not if the API key is valid
    await client.getMessage('test-message-id');
    return true;
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    // Check error type
    if (message.includes('No response from server')) {
      return false;
    }
    // If we get an API error (not network error), connection is working
    return true;
  }
}

export function createConfigCommand(): Command {
  const cmd = new Command('config');

  cmd.description('Manage MailGoat configuration');

  // config init - interactive setup
  cmd
    .command('init')
    .description('Initialize MailGoat configuration interactively')
    .option('-f, --force', 'Overwrite existing config')
    .option('--skip-test', 'Skip connection test')
    .action(async (options) => {
      try {
        const configManager = new ConfigManager();

        // Check if config exists
        if ((await configManager.exists()) && !options.force) {
          const overwrite = await prompts({
            type: 'confirm',
            name: 'value',
            message: `Configuration already exists at ${configManager.getPath()}. Overwrite?`,
            initial: false,
          });
          if (!overwrite.value) {
            console.log(chalk.yellow('Configuration init cancelled'));
            return;
          }
        }

        console.log(chalk.bold.cyan('📧 MailGoat Configuration Setup'));
        console.log(chalk.gray('Create your ~/.mailgoat/config.json file\n'));

        // Interactive prompts
        const response = await prompts([
          {
            type: 'text',
            name: 'server',
            message: 'Postal server URL',
            initial: 'https://postal.example.com',
            validate: validateServerUrl,
          },
          {
            type: 'password',
            name: 'api_key',
            message: 'Postal API key',
            validate: validateApiKey,
          },
          {
            type: 'text',
            name: 'fromAddress',
            message: 'From address',
            validate: validateEmail,
          },
          {
            type: 'text',
            name: 'fromName',
            message: 'From name (optional)',
          },
          {
            type: 'confirm',
            name: 'confirm',
            message: 'Save configuration?',
            initial: true,
          },
        ]);

        // Check if user cancelled
        if (!response.confirm) {
          console.log(chalk.yellow('\nConfiguration cancelled'));
          return;
        }

        const config: MailGoatConfig = {
          server: response.server.trim(),
          fromAddress: response.fromAddress.trim(),
          fromName: response.fromName?.trim() || undefined,
          api_key: response.api_key.trim(),
        };

        // Test connection (unless skipped)
        if (!options.skipTest) {
          console.log(chalk.cyan('\n🔌 Testing connection to Postal server...'));
          const connected = await testConnection(config);

          if (connected) {
            console.log(chalk.green('✓ Connection successful'));
          } else {
            console.log(chalk.yellow('⚠ Warning: Could not reach server'));
            const proceed = await prompts({
              type: 'confirm',
              name: 'value',
              message: 'Save configuration anyway?',
              initial: true,
            });

            if (!proceed.value) {
              console.log(chalk.yellow('Configuration cancelled'));
              return;
            }
          }
        }

        // Save configuration
        await configManager.save(config);

        console.log(
          '\n' + chalk.green('✓ Configuration saved to ') + chalk.cyan(configManager.getPath())
        );
        console.log('\n' + chalk.bold('Next steps:'));
        console.log('  1. Send your first email:');
        console.log(
          chalk.gray('     mailgoat send --to user@example.com --subject "Hello" --body "Test"')
        );
        console.log('\n  2. Check your inbox:');
        console.log(chalk.gray('     mailgoat inbox'));
        console.log('\n  3. Read a message:');
        console.log(chalk.gray('     mailgoat read <message-id>'));
        console.log('\n' + chalk.gray('For more help, run: ') + chalk.cyan('mailgoat --help'));
      } catch (error: unknown) {
        const message = getErrorMessage(error);
        if (message === 'User canceled') {
          console.log(chalk.yellow('\nConfiguration cancelled'));
          return;
        }
        const formatter = new Formatter(false);
        console.error(formatter.error(message));
        process.exit(1);
      }
    });

  // config show - display current config
  cmd
    .command('show')
    .description('Show current configuration')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      try {
        const configManager = new ConfigManager();
        const config = await configManager.load();
        const formatter = new Formatter(options.json);

        if (options.json) {
          formatter.output(config);
        } else {
          console.log(`Configuration file: ${configManager.getPath()}\n`);
          console.log(`Server:   ${config.server}`);
          console.log(`From:     ${config.fromAddress}`);
          if (config.fromName) {
            console.log(`From Name:${config.fromName}`);
          }
          console.log(`API Key:  ${config.api_key.substring(0, 8)}...`);
          if (config.metrics?.pushgateway) {
            console.log(`Pushgateway: ${config.metrics.pushgateway}`);
          }
        }
      } catch (error: unknown) {
        const message = getErrorMessage(error);
        const formatter = new Formatter(options.json);
        console.error(formatter.error(message));
        process.exit(1);
      }
    });

  // config set - set a config value, including nested keys
  cmd
    .command('set')
    .description('Set configuration value (supports nested keys like metrics.pushgateway)')
    .argument('<key>', 'Configuration key')
    .argument('<value>', 'Configuration value')
    .action(async (key: string, value: string) => {
      try {
        const configManager = new ConfigManager();
        const config = (await configManager.load()) as unknown as Record<string, unknown>;
        setNestedValue(config, key, value);
        await configManager.save(config as unknown as MailGoatConfig);
        console.log(chalk.green(`✓ Set ${key}`));
      } catch (error: unknown) {
        const message = getErrorMessage(error);
        const formatter = new Formatter(false);
        console.error(formatter.error(message));
        process.exit(1);
      }
    });

  // config get - get a config value by key
  cmd
    .command('get')
    .description('Get configuration value by key')
    .argument('<key>', 'Configuration key')
    .option('--json', 'Output as JSON')
    .action(async (key: string, options) => {
      try {
        const configManager = new ConfigManager();
        const config = (await configManager.load()) as unknown as Record<string, unknown>;
        const formatter = new Formatter(options.json);
        const value = getNestedValue(config, key);
        if (typeof value === 'undefined') {
          throw new Error(`Key not found: ${key}`);
        }
        if (options.json) {
          formatter.output({ key, value });
        } else {
          console.log(String(value));
        }
      } catch (error: unknown) {
        const message = getErrorMessage(error);
        const formatter = new Formatter(options.json);
        console.error(formatter.error(message));
        process.exit(1);
      }
    });

  // config path - show config file location
  cmd
    .command('path')
    .description('Show configuration file path')
    .action(() => {
      const configManager = new ConfigManager();
      console.log(configManager.getPath());
    });

  return cmd;
}
