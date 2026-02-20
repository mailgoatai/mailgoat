/**
 * SMTP Relay Provider Interface
 *
 * Abstraction for third-party email relay services (SendGrid, Mailgun, SES, etc.)
 */

import {
  IMailProvider,
  SendMessageParams,
  SendMessageResponse,
  MessageDetails,
} from '../mail-provider.interface';

export type RelayProviderType = 'host' | 'sendgrid' | 'mailgun' | 'ses' | 'mailjet' | 'custom';

export interface RelayCredentials {
  /** API key for relay service */
  apiKey?: string;

  /** API secret (used by some providers like SES) */
  apiSecret?: string;

  /** Region (used by AWS SES) */
  region?: string;

  /** Domain (used by Mailgun) */
  domain?: string;

  /** Custom SMTP settings */
  smtp?: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
}

export interface RelayConfig {
  /** Relay provider type */
  provider: RelayProviderType;

  /** Credentials for the relay service */
  credentials: RelayCredentials;

  /** Default from email if not specified */
  from?: string;

  /** Enable retry on failures */
  enableRetry?: boolean;

  /** Max retry attempts */
  maxRetries?: number;
}

/**
 * Abstract base class for relay providers
 */
export abstract class RelayProvider implements IMailProvider {
  protected config: RelayConfig;

  constructor(config: RelayConfig) {
    this.config = config;
  }

  /**
   * Send email through relay provider
   */
  abstract sendMessage(params: SendMessageParams): Promise<SendMessageResponse>;

  /**
   * Get message details (not all relays support this)
   */
  abstract getMessage(id: string, expansions?: string[]): Promise<MessageDetails>;

  /**
   * Test connection to relay provider
   */
  abstract testConnection(): Promise<boolean>;

  /**
   * Validate relay configuration
   */
  abstract validateConfig(): Promise<void>;
}
