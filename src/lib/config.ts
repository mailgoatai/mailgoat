import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import YAML from 'yaml';
import { debugLogger } from './debug';
import { validationService } from './validation-service';
import { cacheManager, CacheKeys, CacheTTL } from './cache-manager';

export interface MailGoatConfig {
  server: string;
  email: string;
  api_key: string;
}

export class ConfigManager {
  private configPath: string;

  constructor(configPath?: string) {
    this.configPath = configPath || path.join(os.homedir(), '.mailgoat', 'config.yml');
    debugLogger.log('config', `Config path resolved to: ${this.configPath}`);
  }

  /**
   * Load configuration from file (with caching)
   */
  load(): MailGoatConfig {
    // Try to get from cache first
    const cacheKey = CacheKeys.config(this.configPath);
    const cached = cacheManager.get<MailGoatConfig>(cacheKey);

    if (cached) {
      debugLogger.log('config', `Loaded config from cache: ${this.configPath}`);
      return cached;
    }

    debugLogger.log('config', `Loading config from file: ${this.configPath}`);

    if (!fs.existsSync(this.configPath)) {
      debugLogger.log('config', 'Config file does not exist');
      throw new Error(
        `Config file not found at ${this.configPath}.\n` +
          'Run `mailgoat config init` to create one, or set up manually:\n' +
          '~/.mailgoat/config.yml:\n' +
          '  server: postal.example.com\n' +
          '  email: agent@example.com\n' +
          '  api_key: your-api-key'
      );
    }

    const content = fs.readFileSync(this.configPath, 'utf8');
    debugLogger.log('config', `Config file size: ${content.length} bytes`);

    const config = YAML.parse(content) as MailGoatConfig;

    debugLogger.log('config', `Parsed config - server: ${config.server}, email: ${config.email}`);
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
  save(config: MailGoatConfig): void {
    debugLogger.log('config', `Saving config to: ${this.configPath}`);

    this.validate(config);

    const dir = path.dirname(this.configPath);
    if (!fs.existsSync(dir)) {
      debugLogger.log('config', `Creating config directory: ${dir}`);
      fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    }

    const content = YAML.stringify(config);
    debugLogger.log('config', `Writing ${content.length} bytes to config file`);

    fs.writeFileSync(this.configPath, content, { mode: 0o600 });
    debugLogger.log('config', 'Config saved successfully');

    // Invalidate cache after saving
    const cacheKey = CacheKeys.config(this.configPath);
    cacheManager.invalidate(cacheKey);
    debugLogger.log('config', 'Config cache invalidated');
  }

  /**
   * Check if config file exists
   */
  exists(): boolean {
    return fs.existsSync(this.configPath);
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
