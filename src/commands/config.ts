import { Command } from 'commander';
import prompts from 'prompts';
import chalk from 'chalk';
import { ConfigManager, MailGoatConfig } from '../lib/config';
import { PostalClient } from '../lib/postal-client';
import { Formatter } from '../lib/formatter';
import * as validators from '../lib/validators';

/**
 * Validate email address format (wrapper for prompts)
 */
function validateEmail(email: string): boolean | string {
  if (!email) {
    return 'Email address is required';
  }
  if (!validators.validateEmail(email)) {
    return 'Invalid email address format';
  }
  return true;
}

/**
 * Validate server URL format (wrapper for prompts)
 */
function validateServerUrl(url: string): boolean | string {
  if (!url) {
    return 'Server URL is required';
  }
  if (!validators.validateUrl(url)) {
    return 'Invalid server URL format (e.g., postal.example.com)';
  }
  return true;
}

/**
 * Validate API key format (wrapper for prompts)
 */
function validateApiKey(key: string): boolean | string {
  if (!key) {
    return 'API key is required';
  }
  if (!validators.validateApiKey(key)) {
    return 'API key seems too short (minimum 10 characters)';
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
  } catch (error: any) {
    // Check error type
    if (error.message.includes('No response from server')) {
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
        const formatter = new Formatter(false);

        // Check if config exists
        if ((await configManager.exists()) && !options.force) {
          console.error(
            formatter.error(
              `Configuration already exists at ${configManager.getPath()}\n` +
                'Use --force to overwrite'
            )
          );
          process.exit(1);
        }

        console.log(chalk.bold.cyan('📧 MailGoat Configuration Setup'));
        console.log(chalk.gray('Create your ~/.mailgoat/config.yml file\n'));

        // Interactive prompts
        const response = await prompts([
          {
            type: 'text',
            name: 'server',
            message: 'Postal server URL',
            initial: 'postal.example.com',
            validate: validateServerUrl,
          },
          {
            type: 'text',
            name: 'email',
            message: 'Your email address',
            validate: validateEmail,
          },
          {
            type: 'password',
            name: 'api_key',
            message: 'Postal API key',
            validate: validateApiKey,
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
          process.exit(0);
        }

        const config: MailGoatConfig = {
          server: response.server,
          email: response.email,
          api_key: response.api_key,
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
              process.exit(0);
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
      } catch (error: any) {
        if (error.message === 'User canceled') {
          console.log(chalk.yellow('\nConfiguration cancelled'));
          process.exit(0);
        }
        const formatter = new Formatter(false);
        console.error(formatter.error(error.message));
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
          console.log(`Email:    ${config.email}`);
          console.log(`API Key:  ${config.api_key.substring(0, 8)}...`);
        }
      } catch (error: any) {
        const formatter = new Formatter(options.json);
        console.error(formatter.error(error.message));
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
