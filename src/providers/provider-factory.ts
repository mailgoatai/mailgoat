/**
 * Provider Factory
 *
 * Factory for creating mail provider instances.
 * Supports multiple provider types and handles configuration.
 */

import { IMailProvider, ProviderConfig, ProviderOptions } from './mail-provider.interface';
import { PostalProvider, PostalProviderConfig } from './postal';
// import { SESProvider, SESProviderConfig } from './ses';
// import { MailgunProvider, MailgunProviderConfig } from './mailgun';
import { SMTPProvider, SMTPProviderConfig } from './smtp';
import { MailGoatConfig } from '../lib/config';

// Stub types for optional providers
type SESProviderConfig = Record<string, unknown>;
// type MailgunProviderConfig = Record<string, unknown>;

/**
 * Supported provider types
 */
export type ProviderType = 'postal' | 'sendgrid' | 'mailgun' | 'smtp' | 'ses';

/**
 * Provider Factory
 *
 * Creates mail provider instances based on configuration.
 * Handles provider-specific setup and validation.
 *
 * @public
 */
export class ProviderFactory {
  /**
   * Create a mail provider instance
   *
   * @param type - Provider type identifier
   * @param config - Provider configuration
   * @param options - Provider options (retry, timeout, etc.)
   * @returns Configured mail provider instance
   * @throws Error if provider type is not supported
   */
  static create(
    type: ProviderType,
    config: ProviderConfig | MailGoatConfig | SESProviderConfig,
    options?: ProviderOptions
  ): IMailProvider {
    switch (type) {
      case 'postal':
        return new PostalProvider(config as PostalProviderConfig, options);

      case 'sendgrid':
        throw new Error(
          'SendGrid provider not yet implemented. ' + 'This will be added in a future update.'
        );

      case 'mailgun':
        throw new Error(
          'Mailgun provider requires mailgun.js dependency. ' +
            'Install with: npm install mailgun.js'
        );

      case 'smtp':
        return new SMTPProvider(
          ((config as MailGoatConfig).smtp || config) as SMTPProviderConfig,
          options
        );

      case 'ses':
        throw new Error(
          'SES provider requires @aws-sdk dependencies. ' +
            'Install with: npm install @aws-sdk/client-ses @aws-sdk/credential-providers'
        );

      default:
        throw new Error(
          `Unknown provider type: ${type}. ` +
            `Supported types: postal, sendgrid, mailgun, smtp, ses`
        );
    }
  }

  /**
   * Create provider from MailGoat config
   * Convenience method that extracts provider type from config
   *
   * @param config - MailGoat configuration
   * @param options - Provider options
   * @returns Configured mail provider instance
   */
  static createFromConfig(
    config: MailGoatConfig & { provider?: ProviderType },
    options?: ProviderOptions
  ): IMailProvider {
    // Default to postal for backwards compatibility
    const providerType = config.provider || 'postal';
    if (providerType === 'ses') {
      const sesConfig = config.ses || (config as unknown as SESProviderConfig);
      return ProviderFactory.create('ses', sesConfig, options);
    }
    return ProviderFactory.create(providerType, config, options);
  }

  /**
   * Get list of supported provider types
   *
   * @returns Array of supported provider type strings
   */
  static getSupportedProviders(): ProviderType[] {
    return ['postal', 'sendgrid', 'mailgun', 'smtp', 'ses'];
  }

  /**
   * Get list of currently implemented provider types
   *
   * @returns Array of implemented provider type strings
   */
  static getImplementedProviders(): ProviderType[] {
    return ['postal', 'mailgun', 'smtp', 'ses'];
  }

  /**
   * Check if a provider type is supported
   *
   * @param type - Provider type to check
   * @returns True if provider is supported
   */
  static isSupported(type: string): boolean {
    return ProviderFactory.getSupportedProviders().includes(type as ProviderType);
  }

  /**
   * Check if a provider type is implemented
   *
   * @param type - Provider type to check
   * @returns True if provider is implemented
   */
  static isImplemented(type: string): boolean {
    return ProviderFactory.getImplementedProviders().includes(type as ProviderType);
  }
}
