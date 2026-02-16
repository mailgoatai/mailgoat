/**
 * Postal Mail Provider
 * 
 * Implementation of IMailProvider for Postal email server.
 * Wraps the existing PostalClient to conform to the provider interface.
 * 
 * @see https://github.com/postalserver/postal
 */

import { PostalClient, PostalClientOptions } from '../../lib/postal-client';
import { MailGoatConfig } from '../../lib/config';
import {
  IMailProvider,
  SendMessageParams,
  SendMessageResponse,
  MessageDetails,
  ListMessagesOptions,
  Message,
} from '../mail-provider.interface';

/**
 * Postal-specific configuration
 * Extends the base MailGoatConfig
 */
export interface PostalProviderConfig extends MailGoatConfig {
  // Postal doesn't need additional config beyond base
  // This interface exists for future extensibility
}

/**
 * Postal Provider Options
 * Extends base ProviderOptions with Postal-specific settings
 */
export interface PostalProviderOptions extends PostalClientOptions {
  // Inherits: maxRetries, baseDelay, enableRetry
}

/**
 * Postal Mail Provider
 * 
 * Implements IMailProvider interface using Postal's Legacy API.
 * Provides email sending, message retrieval, and delivery tracking.
 * 
 * @public
 */
export class PostalProvider implements IMailProvider {
  private client: PostalClient;
  private config: PostalProviderConfig;

  /**
   * Create a new Postal provider instance
   * 
   * @param config - Postal server configuration
   * @param options - Provider options (retry, timeout, etc.)
   */
  constructor(config: PostalProviderConfig, options?: PostalProviderOptions) {
    this.config = config;
    this.client = new PostalClient(config, options);
  }

  /**
   * Send an email message via Postal
   * 
   * @param params - Message parameters
   * @returns Promise resolving to send response with message ID
   */
  async sendMessage(params: SendMessageParams): Promise<SendMessageResponse> {
    // PostalClient already has the correct signature
    return this.client.sendMessage(params);
  }

  /**
   * Get detailed information about a message
   * 
   * @param id - Message identifier
   * @param expansions - Optional list of fields to expand
   * @returns Promise resolving to message details
   */
  async getMessage(id: string, expansions?: string[]): Promise<MessageDetails> {
    // PostalClient already has the correct signature
    return this.client.getMessage(id, expansions);
  }

  /**
   * Get delivery information for a message
   * 
   * @param id - Message identifier
   * @returns Promise resolving to delivery details
   */
  async getDeliveries(id: string): Promise<any[]> {
    // PostalClient already has this method
    return this.client.getDeliveries(id);
  }

  /**
   * List messages
   * 
   * Note: Postal's Legacy API does not provide a list endpoint.
   * This method is included for interface compliance but will throw.
   * 
   * @param options - Filtering and pagination options (unused)
   * @throws Error indicating Postal does not support message listing
   */
  async listMessages(options?: ListMessagesOptions): Promise<Message[]> {
    throw new Error(
      'Postal Legacy API does not support message listing. ' +
        'Use the Postal web UI or implement webhook-based message tracking.'
    );
  }

  /**
   * Delete a message
   * 
   * Note: Postal's Legacy API does not provide a delete endpoint.
   * This method is included for interface compliance but will throw.
   * 
   * @param id - Message identifier (unused)
   * @throws Error indicating Postal does not support message deletion via API
   */
  async deleteMessage(id: string): Promise<void> {
    throw new Error(
      'Postal Legacy API does not support message deletion. ' +
        'Use the Postal web UI or database access for message management.'
    );
  }

  /**
   * Test connectivity to Postal server
   * 
   * @returns Promise resolving to true if server is reachable
   */
  async testConnection(): Promise<boolean> {
    try {
      // Try to get a message (will fail but tests connectivity)
      await this.client.getMessage('test-connection-probe');
      return true;
    } catch (error: any) {
      // If we get a response (even error response), connection works
      if (error.response) {
        return true;
      }
      // Network error means no connection
      return false;
    }
  }

  /**
   * Get the underlying PostalClient instance
   * Useful for Postal-specific operations not in the interface
   * 
   * @returns The wrapped PostalClient
   */
  getClient(): PostalClient {
    return this.client;
  }

  /**
   * Get provider configuration
   * 
   * @returns Provider configuration
   */
  getConfig(): PostalProviderConfig {
    return this.config;
  }
}
