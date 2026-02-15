import { Command } from 'commander';
import { ConfigManager } from '../lib/config';
import { Formatter } from '../lib/formatter';
import * as readline from 'readline';

export function createConfigCommand(): Command {
  const cmd = new Command('config');

  cmd.description('Manage MailGoat configuration');

  // config init - interactive setup
  cmd
    .command('init')
    .description('Initialize MailGoat configuration interactively')
    .option('-f, --force', 'Overwrite existing config')
    .action(async (options) => {
      try {
        const configManager = new ConfigManager();
        const formatter = new Formatter(false);

        // Check if config exists
        if (configManager.exists() && !options.force) {
          console.error(
            formatter.error(
              `Configuration already exists at ${configManager.getPath()}\n` +
              'Use --force to overwrite'
            )
          );
          process.exit(1);
        }

        console.log('📧 MailGoat Configuration Setup\n');

        const config = await promptForConfig();

        configManager.save(config);

        console.log('\n' + formatter.success(`Configuration saved to ${configManager.getPath()}`));
        console.log('\nYou can now use MailGoat commands like:');
        console.log('  mailgoat send --to user@example.com --subject "Hello" --body "Test"');
      } catch (error: any) {
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
        const config = configManager.load();
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

/**
 * Prompt user for configuration values
 */
async function promptForConfig(): Promise<any> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt: string): Promise<string> => {
    return new Promise((resolve) => {
      rl.question(prompt, (answer) => {
        resolve(answer.trim());
      });
    });
  };

  try {
    const server = await question('Postal server URL (e.g., postal.example.com): ');
    const email = await question('Your email address: ');
    const apiKey = await question('Postal API key: ');

    rl.close();

    if (!server || !email || !apiKey) {
      throw new Error('All fields are required');
    }

    return {
      server,
      email,
      api_key: apiKey,
    };
  } catch (error) {
    rl.close();
    throw error;
  }
}
