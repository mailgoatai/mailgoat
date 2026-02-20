/**
 * Relay Provider Factory
 *
 * Creates relay provider instances based on configuration
 */

import { RelayProvider, RelayConfig, RelayProviderType } from './relay-provider.interface';
import { SendGridProvider } from './sendgrid-provider';
import { MailgunProvider } from './mailgun-provider';
import { SESProvider } from './ses-provider';
import { MailjetProvider } from './mailjet-provider';
import { CustomSMTPProvider } from './custom-smtp-provider';

export class RelayProviderFactory {
  /**
   * Create a relay provider instance from configuration
   */
  static create(config: RelayConfig): RelayProvider {
    switch (config.provider) {
      case 'sendgrid':
        return new SendGridProvider(config);

      case 'mailgun':
        return new MailgunProvider(config);

      case 'ses':
        return new SESProvider(config);

      case 'mailjet':
        return new MailjetProvider(config);

      case 'custom':
        return new CustomSMTPProvider(config);

      case 'host':
        throw new Error('Host provider not yet implemented - use Postal client directly');

      default:
        throw new Error(`Unknown relay provider: ${config.provider}`);
    }
  }

  /**
   * Get list of supported provider types
   */
  static getSupportedProviders(): RelayProviderType[] {
    return ['host', 'sendgrid', 'mailgun', 'ses', 'mailjet', 'custom'];
  }

  /**
   * Get provider description
   */
  static getProviderInfo(provider: RelayProviderType): {
    name: string;
    description: string;
    requiredConfig: string[];
  } {
    const info: Record<
      RelayProviderType,
      { name: string; description: string; requiredConfig: string[] }
    > = {
      host: {
        name: 'Host Machine (Postal)',
        description: 'Send via Postal server on host machine (default)',
        requiredConfig: ['server', 'apiKey', 'email'],
      },
      sendgrid: {
        name: 'SendGrid',
        description: 'Send via SendGrid HTTP API',
        requiredConfig: ['apiKey'],
      },
      mailgun: {
        name: 'Mailgun',
        description: 'Send via Mailgun HTTP API',
        requiredConfig: ['apiKey', 'domain'],
      },
      ses: {
        name: 'Amazon SES',
        description: 'Send via AWS Simple Email Service',
        requiredConfig: ['apiKey', 'apiSecret', 'region (optional)'],
      },
      mailjet: {
        name: 'Mailjet',
        description: 'Send via Mailjet HTTP API',
        requiredConfig: ['apiKey', 'apiSecret'],
      },
      custom: {
        name: 'Custom SMTP',
        description: 'Send via any SMTP server',
        requiredConfig: ['smtp.host', 'smtp.port', 'smtp.auth (optional)'],
      },
    };

    return info[provider];
  }

  /**
   * Validate relay configuration
   */
  static async validateConfig(config: RelayConfig): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      const provider = this.create(config);
      await provider.validateConfig();
      return { valid: true, errors: [] };
    } catch (_error) {
      errors.push(_error instanceof Error ? _error.message : String(_error));
      return { valid: false, errors };
    }
  }
}
