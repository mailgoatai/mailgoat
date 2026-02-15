import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import YAML from 'yaml';

export interface MailGoatConfig {
  server: string;
  email: string;
  api_key: string;
}

export class ConfigManager {
  private configPath: string;

  constructor(configPath?: string) {
    this.configPath = configPath || path.join(os.homedir(), '.mailgoat', 'config.yml');
  }

  /**
   * Load configuration from file
   */
  load(): MailGoatConfig {
    if (!fs.existsSync(this.configPath)) {
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
    const config = YAML.parse(content) as MailGoatConfig;

    this.validate(config);
    return config;
  }

  /**
   * Save configuration to file
   */
  save(config: MailGoatConfig): void {
    this.validate(config);

    const dir = path.dirname(this.configPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    }

    const content = YAML.stringify(config);
    fs.writeFileSync(this.configPath, content, { mode: 0o600 });
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
    if (!config.server) {
      throw new Error('Config missing required field: server');
    }
    if (!config.email) {
      throw new Error('Config missing required field: email');
    }
    if (!config.api_key) {
      throw new Error('Config missing required field: api_key');
    }
  }
}
