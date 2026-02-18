import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { debugLogger } from './debug';
import { validationService } from './validation-service';
import { cacheManager, CacheKeys, CacheTTL } from './cache-manager';

export interface MailGoatConfig {
  server: string;
  fromAddress: string;
  fromName?: string;
  // Backward compatibility for older config keys
  email?: string;
  api_key: string;
}

export class ConfigManager {
  private configPath: string;

  constructor(configPath?: string) {
    this.configPath = configPath || path.join(os.homedir(), '.mailgoat', 'config.json');
    debugLogger.log('config', `Config path resolved to: ${this.configPath}`);
  }

  /**
   * Load configuration from file (with caching)
   */
  async load(): Promise<MailGoatConfig> {
    // Try to get from cache first
    const cacheKey = CacheKeys.config(this.configPath);
    const cached = cacheManager.get<MailGoatConfig>(cacheKey);

    if (cached) {
      debugLogger.log('config', `Loaded config from cache: ${this.configPath}`);
      return cached;
    }

    debugLogger.log('config', `Loading config from file: ${this.configPath}`);

    try {
      await fs.access(this.configPath);
    } catch {
      debugLogger.log('config', 'Config file does not exist');
      throw new Error(
        `Config file not found at ${this.configPath}.\n` +
          'Run `mailgoat config init` to create one, or set up manually:\n' +
          '~/.mailgoat/config.json:\n' +
          '{\n' +
          '  "server": "https://postal.example.com",\n' +
          '  "fromAddress": "agent@example.com",\n' +
          '  "fromName": "Agent Name",\n' +
          '  "api_key": "your-api-key"\n' +
          '}'
      );
    }

    const content = await fs.readFile(this.configPath, 'utf8');
    debugLogger.log('config', `Config file size: ${content.length} bytes`);

    const parsed = JSON.parse(content) as MailGoatConfig;
    const config: MailGoatConfig = {
      ...parsed,
      fromAddress: parsed.fromAddress || parsed.email || '',
    };

    debugLogger.log(
      'config',
      `Parsed config - server: ${config.server}, fromAddress: ${config.fromAddress}`
    );
    debugLogger.log('config', `API key length: ${config.api_key?.length || 0} characters`);

    this.validate(config);
    debugLogger.log('config', 'Config validation passed');

    // Cache the config for 5 minutes
    cacheManager.set(cacheKey, config, CacheTTL.MEDIUM);

    return config;
  }

  /**
   * Save configuration to file
   */
  async save(config: MailGoatConfig): Promise<void> {
    debugLogger.log('config', `Saving config to: ${this.configPath}`);

    this.validate(config);

    const dir = path.dirname(this.configPath);
    try {
      await fs.access(dir);
    } catch {
      debugLogger.log('config', `Creating config directory: ${dir}`);
      await fs.mkdir(dir, { recursive: true, mode: 0o700 });
    }

    const content = JSON.stringify(config, null, 2) + '\n';
    debugLogger.log('config', `Writing ${content.length} bytes to config file`);

    await fs.writeFile(this.configPath, content, { mode: 0o600 });
    debugLogger.log('config', 'Config saved successfully');

    // Invalidate cache after saving
    const cacheKey = CacheKeys.config(this.configPath);
    cacheManager.invalidate(cacheKey);
    debugLogger.log('config', 'Config cache invalidated');
  }

  /**
   * Check if config file exists
   */
  async exists(): Promise<boolean> {
    try {
      await fs.access(this.configPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get config file path
   */
  getPath(): string {
    return this.configPath;
  }

  /**
   * Validate configuration object
   */
  private validate(config: MailGoatConfig): void {
    const result = validationService.validateConfig(config);
    if (!result.valid) {
      throw new Error(`Configuration validation failed: ${result.error}`);
    }
  }
}
