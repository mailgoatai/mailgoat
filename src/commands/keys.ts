import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import { ConfigManager } from '../lib/config';
import { ApiKeyManager, ApiKeyScope } from '../lib/api-key-manager';
import { PostalClient } from '../lib/postal-client';

function parseScopes(raw?: string): ApiKeyScope[] {
  if (!raw) return ['send', 'read', 'admin'];
  const scopes = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean) as ApiKeyScope[];
  const allowed: ApiKeyScope[] = ['send', 'read', 'admin'];
  for (const scope of scopes) {
    if (!allowed.includes(scope)) {
      throw new Error(`Invalid scope: ${scope}`);
    }
  }
  return scopes;
}

async function withCommandErrorHandling(run: () => Promise<void>): Promise<void> {
  try {
    await run();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`Error: ${message}`));
    process.exit(1);
  }
}

export function createKeysCommand(): Command {
  const cmd = new Command('keys').description('API key lifecycle management');

  cmd
    .command('list')
    .description('List stored API keys (values redacted)')
    .action(async () => {
      const keys = await new ApiKeyManager().list();
      const table = new Table({
        head: ['ID', 'Name', 'Created', 'Last Used', 'Scopes'],
      });
      for (const key of keys) {
        table.push([
          key.id,
          key.name,
          key.createdAt,
          key.lastUsedAt || 'never',
          key.scopes.join(','),
        ]);
      }
      console.log(table.toString());
    });

  cmd
    .command('create')
    .requiredOption('--name <name>', 'Key display name')
    .option('--scopes <list>', 'Comma-separated scopes: send,read,admin')
    .action(async (options) => {
      await withCommandErrorHandling(async () => {
        const configManager = new ConfigManager();
        const config = await configManager.load();
        const client = new PostalClient(config);
        const scopes = parseScopes(options.scopes);
        const created = await client.createApiCredential(options.name, scopes);
        await new ApiKeyManager().createKey({
          id: created.id,
          name: options.name,
          keyValue: created.key,
          scopes,
        });
        if (!config.api_key) {
          config.api_key = created.key;
          await configManager.save(config);
        }
        console.log(chalk.green(`Key created: ${created.id}`));
      });
    });

  cmd
    .command('rotate')
    .argument('<keyId>', 'Existing key id')
    .option('--name <name>', 'Replacement key name')
    .action(async (keyId: string, options) => {
      await withCommandErrorHandling(async () => {
        const configManager = new ConfigManager();
        const config = await configManager.load();
        const client = new PostalClient(config);
        const manager = new ApiKeyManager();

        const warn = `Rotation warning: services using key ${keyId} may fail if not updated`;
        console.log(chalk.yellow(warn));

        const replacement = await client.createApiCredential(
          options.name || `rotated-${new Date().toISOString()}`,
          ['send', 'read', 'admin']
        );
        await manager.rotateKey(keyId, {
          id: replacement.id,
          name: options.name,
          value: replacement.key,
        });
        await client.revokeApiCredential(keyId).catch(() => {
          // Keep local rotation successful even if remote revoke fails.
        });

        config.api_key = replacement.key;
        await configManager.save(config);
        console.log(chalk.green(`Key rotated: ${keyId} -> ${replacement.id}`));
      });
    });

  cmd
    .command('revoke')
    .argument('<keyId>', 'Key id')
    .action(async (keyId: string) => {
      await withCommandErrorHandling(async () => {
        const config = await new ConfigManager().load();
        const client = new PostalClient(config);
        const manager = new ApiKeyManager();
        await client.revokeApiCredential(keyId).catch(() => {
          // Continue with local revocation.
        });
        await manager.revokeKey(keyId);
        console.log(chalk.green(`Key revoked: ${keyId}`));
      });
    });

  cmd
    .command('export')
    .option('--insecure', 'Output plaintext keys for CI/CD', false)
    .action(async (options) => {
      await withCommandErrorHandling(async () => {
        if (!options.insecure) {
          throw new Error('Use --insecure to confirm plaintext export');
        }
        console.error(chalk.yellow('Warning: exporting plaintext API keys'));
        const exported = await new ApiKeyManager().exportInsecure();
        console.log(JSON.stringify(exported, null, 2));
      });
    });

  cmd
    .command('audit')
    .option('--limit <n>', 'Number of entries', '20')
    .action(async (options) => {
      await withCommandErrorHandling(async () => {
        const limit = Number(options.limit);
        const entries = await new ApiKeyManager().readAudit(limit);
        console.log(JSON.stringify(entries, null, 2));
      });
    });

  return cmd;
}
