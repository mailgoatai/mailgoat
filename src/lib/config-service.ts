/**
 * ConfigService - Enhanced configuration management with profiles
 *
 * Features:
 * - Profile support (~/.mailgoat/profiles/)
 * - Environment variable overrides (MAILGOAT_*)
 * - Hierarchical config resolution (env > profile > default)
 * - Backward compatible with ConfigManager
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import YAML from 'yaml';
import { debugLogger } from './debug';
import { validationService } from './validation-service';
import { cacheManager, CacheKeys, CacheTTL } from './cache-manager';

/**
 * Configuration structure
 */
export interface MailGoatConfig {
  server: string;
  email: string;
  api_key: string;
  profile?: string; // Current profile name
}

/**
 * Profile metadata
 */
export interface ProfileMetadata {
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Profile configuration (extends base config)
 */
export interface ProfileConfig extends MailGoatConfig {
  metadata?: ProfileMetadata;
}

/**
 * Config resolution options
 */
export interface ConfigOptions {
  /** Profile name to load */
  profile?: string;
  /** Skip environment variable overrides */
  skipEnv?: boolean;
  /** Skip caching */
  skipCache?: boolean;
}

/**
 * ConfigService - Enhanced configuration management
 */
export class ConfigService {
  private baseDir: string;
  private profilesDir: string;
  private defaultConfigPath: string;

  constructor(baseDir?: string) {
    this.baseDir = baseDir || path.join(os.homedir(), '.mailgoat');
    this.profilesDir = path.join(this.baseDir, 'profiles');
    this.defaultConfigPath = path.join(this.baseDir, 'config.yml');
    debugLogger.log('config', `Base directory: ${this.baseDir}`);
    debugLogger.log('config', `Profiles directory: ${this.profilesDir}`);
  }

  /**
   * Load configuration with hierarchical resolution
   * Priority: Environment variables > Profile > Default config
   */
  load(options: ConfigOptions = {}): MailGoatConfig {
    const { profile, skipEnv = false, skipCache = false } = options;

    // Check cache first (unless skipped)
    if (!skipCache) {
      const cacheKey = this.getCacheKey(profile);
      const cached = cacheManager.get<MailGoatConfig>(cacheKey);
      if (cached) {
        debugLogger.log('config', `Loaded config from cache (profile: ${profile || 'default'})`);
        return cached;
      }
    }

    debugLogger.log('config', `Loading config (profile: ${profile || 'default'})`);

    // Start with base config (profile or default)
    let config: MailGoatConfig;

    if (profile) {
      config = this.loadProfile(profile);
      config.profile = profile;
    } else {
      config = this.loadDefault();
    }

    // Apply environment variable overrides
    if (!skipEnv) {
      config = this.applyEnvOverrides(config);
    }

    // Validate final config
    this.validate(config);

    // Cache the resolved config (if not skipped)
    if (!skipCache) {
      const cacheKey = this.getCacheKey(profile);
      cacheManager.set(cacheKey, config, CacheTTL.MEDIUM);
    }

    return config;
  }

  /**
   * Save configuration
   * If profile is specified, saves to profile; otherwise to default config
   */
  save(config: MailGoatConfig, profileName?: string): void {
    this.validate(config);

    const targetPath = profileName
      ? this.getProfilePath(profileName)
      : this.defaultConfigPath;

    debugLogger.log('config', `Saving config to: ${targetPath}`);

    // Ensure directory exists
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) {
      debugLogger.log('config', `Creating directory: ${dir}`);
      fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    }

    // Add metadata if saving to profile
    let configToSave: any = { ...config };
    if (profileName) {
      const existingMetadata = this.getProfileMetadata(profileName);
      configToSave.metadata = {
        name: profileName,
        description: existingMetadata?.description,
        created_at: existingMetadata?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }

    // Write to file
    const content = YAML.stringify(configToSave);
    fs.writeFileSync(targetPath, content, { mode: 0o600 });
    debugLogger.log('config', 'Config saved successfully');

    // Invalidate cache
    const cacheKey = this.getCacheKey(profileName);
    cacheManager.invalidate(cacheKey);
  }

  /**
   * Load default configuration
   */
  private loadDefault(): MailGoatConfig {
    if (!fs.existsSync(this.defaultConfigPath)) {
      throw new Error(
        `Default config not found at ${this.defaultConfigPath}\n` +
          'Run `mailgoat config init` to create one.'
      );
    }

    const content = fs.readFileSync(this.defaultConfigPath, 'utf8');
    return YAML.parse(content) as MailGoatConfig;
  }

  /**
   * Load profile configuration
   */
  private loadProfile(profileName: string): MailGoatConfig {
    const profilePath = this.getProfilePath(profileName);

    if (!fs.existsSync(profilePath)) {
      throw new Error(
        `Profile "${profileName}" not found at ${profilePath}\n` +
          `Available profiles: ${this.listProfiles().join(', ') || '(none)'}`
      );
    }

    const content = fs.readFileSync(profilePath, 'utf8');
    const profileConfig = YAML.parse(content) as ProfileConfig;

    // Extract config without metadata
    const { metadata, ...config } = profileConfig;

    return config as MailGoatConfig;
  }

  /**
   * Apply environment variable overrides
   * Supports: MAILGOAT_SERVER, MAILGOAT_EMAIL, MAILGOAT_API_KEY, MAILGOAT_PROFILE
   */
  private applyEnvOverrides(config: MailGoatConfig): MailGoatConfig {
    const overridden = { ...config };

    if (process.env.MAILGOAT_SERVER) {
      debugLogger.log('config', 'Overriding server from MAILGOAT_SERVER');
      overridden.server = process.env.MAILGOAT_SERVER;
    }

    if (process.env.MAILGOAT_EMAIL) {
      debugLogger.log('config', 'Overriding email from MAILGOAT_EMAIL');
      overridden.email = process.env.MAILGOAT_EMAIL;
    }

    if (process.env.MAILGOAT_API_KEY) {
      debugLogger.log('config', 'Overriding API key from MAILGOAT_API_KEY');
      overridden.api_key = process.env.MAILGOAT_API_KEY;
    }

    if (process.env.MAILGOAT_PROFILE) {
      debugLogger.log('config', 'Profile set from MAILGOAT_PROFILE');
      overridden.profile = process.env.MAILGOAT_PROFILE;
    }

    return overridden;
  }

  /**
   * List available profiles
   */
  listProfiles(): string[] {
    if (!fs.existsSync(this.profilesDir)) {
      return [];
    }

    const files = fs.readdirSync(this.profilesDir);
    return files
      .filter((file) => file.endsWith('.yml') || file.endsWith('.yaml'))
      .map((file) => path.basename(file, path.extname(file)))
      .sort();
  }

  /**
   * Get profile metadata
   */
  getProfileMetadata(profileName: string): ProfileMetadata | null {
    const profilePath = this.getProfilePath(profileName);

    if (!fs.existsSync(profilePath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(profilePath, 'utf8');
      const profileConfig = YAML.parse(content) as ProfileConfig;
      return profileConfig.metadata || null;
    } catch (error) {
      debugLogger.log('config', `Error reading profile metadata: ${error}`);
      return null;
    }
  }

  /**
   * Create a new profile from current default config or provided config
   */
  createProfile(
    profileName: string,
    config?: MailGoatConfig,
    description?: string
  ): void {
    this.validateProfileName(profileName);

    const profilePath = this.getProfilePath(profileName);

    if (fs.existsSync(profilePath)) {
      throw new Error(`Profile "${profileName}" already exists`);
    }

    // Use provided config or copy from default
    const profileConfig = config || this.loadDefault();

    // Add metadata
    const configWithMetadata = {
      ...profileConfig,
      metadata: {
        name: profileName,
        description,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    };

    // Ensure profiles directory exists
    if (!fs.existsSync(this.profilesDir)) {
      fs.mkdirSync(this.profilesDir, { recursive: true, mode: 0o700 });
    }

    // Save profile
    const content = YAML.stringify(configWithMetadata);
    fs.writeFileSync(profilePath, content, { mode: 0o600 });

    debugLogger.log('config', `Profile "${profileName}" created at ${profilePath}`);
  }

  /**
   * Delete a profile
   */
  deleteProfile(profileName: string): void {
    this.validateProfileName(profileName);

    const profilePath = this.getProfilePath(profileName);

    if (!fs.existsSync(profilePath)) {
      throw new Error(`Profile "${profileName}" does not exist`);
    }

    fs.unlinkSync(profilePath);
    debugLogger.log('config', `Profile "${profileName}" deleted`);

    // Invalidate cache
    const cacheKey = this.getCacheKey(profileName);
    cacheManager.invalidate(cacheKey);
  }

  /**
   * Copy profile to another name
   */
  copyProfile(sourceName: string, targetName: string): void {
    this.validateProfileName(sourceName);
    this.validateProfileName(targetName);

    const sourceConfig = this.loadProfile(sourceName);
    const sourceMetadata = this.getProfileMetadata(sourceName);

    this.createProfile(
      targetName,
      sourceConfig,
      sourceMetadata?.description ? `Copy of ${sourceMetadata.description}` : undefined
    );

    debugLogger.log('config', `Profile "${sourceName}" copied to "${targetName}"`);
  }

  /**
   * Check if profile exists
   */
  profileExists(profileName: string): boolean {
    const profilePath = this.getProfilePath(profileName);
    return fs.existsSync(profilePath);
  }

  /**
   * Check if default config exists
   */
  defaultConfigExists(): boolean {
    return fs.existsSync(this.defaultConfigPath);
  }

  /**
   * Get profile file path
   */
  private getProfilePath(profileName: string): string {
    return path.join(this.profilesDir, `${profileName}.yml`);
  }

  /**
   * Get cache key for config
   */
  private getCacheKey(profile?: string): string {
    if (profile) {
      return `config:profile:${profile}`;
    }
    return CacheKeys.config(this.defaultConfigPath);
  }

  /**
   * Validate profile name
   */
  private validateProfileName(name: string): void {
    if (!name || typeof name !== 'string') {
      throw new Error('Profile name is required');
    }

    // Only allow alphanumeric, dash, underscore
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      throw new Error(
        'Profile name must contain only letters, numbers, dashes, and underscores'
      );
    }

    if (name.length > 50) {
      throw new Error('Profile name must be 50 characters or less');
    }

    // Reserved names
    const reserved = ['default', 'config', 'profiles'];
    if (reserved.includes(name.toLowerCase())) {
      throw new Error(`Profile name "${name}" is reserved`);
    }
  }

  /**
   * Validate configuration
   */
  private validate(config: MailGoatConfig): void {
    const result = validationService.validateConfig(config);
    if (!result.valid) {
      throw new Error(`Configuration validation failed: ${result.error}`);
    }
  }

  /**
   * Get base directory
   */
  getBaseDir(): string {
    return this.baseDir;
  }

  /**
   * Get profiles directory
   */
  getProfilesDir(): string {
    return this.profilesDir;
  }

  /**
   * Get default config path
   */
  getDefaultConfigPath(): string {
    return this.defaultConfigPath;
  }
}

// Export singleton instance
export const configService = new ConfigService();
