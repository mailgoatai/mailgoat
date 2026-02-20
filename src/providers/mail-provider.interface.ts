/**
 * Mail Provider Interface
 *
 * Abstraction layer for email service providers.
 * Allows swapping between different providers (Postal, SendGrid, SMTP, etc.)
 * without changing application code.
 *
 * @public
 */

/**
 * Parameters for sending an email message
 * Generic interface that all providers must support
 *
 * @public
 */
export interface SendMessageParams {
  /** Recipient email addresses (required) */
  to: string[];

  /** Email subject line (required) */
  subject: string;

  /** Plain text body content */
  plain_body?: string;

  /** HTML body content */
  html_body?: string;

  /** Sender email address */
  from?: string;

  /** CC recipient email addresses */
  cc?: string[];

  /** BCC recipient email addresses */
  bcc?: string[];

  /** Reply-To email address */
  reply_to?: string;

  /** Custom tag for message tracking */
  tag?: string;

  /** Custom email headers */
  headers?: Record<string, string>;

  /** File attachments (base64 encoded) */
  attachments?: Array<{
    /** File name */
    name: string;
    /** MIME content type */
    content_type: string;
    /** Base64 encoded file data */
    data: string;
  }>;
}

/**
 * Response after sending a message
 * Normalized across all providers
 *
 * @public
 */
export interface SendMessageResponse {
  /** Unique message identifier */
  message_id: string;

  /** Per-recipient message details (optional, provider-specific) */
  messages?: Record<
    string,
    {
      /** Internal message ID */
      id: number;
      /** Message token */
      token: string;
    }
  >;

  /** Provider-specific metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Detailed information about a message
 * Normalized across all providers
 *
 * @public
 */
export interface MessageDetails {
  /** Internal provider ID */
  id: number | string;

  /** Message token/reference */
  token?: string;

  /** Delivery status information */
  status?: {
    status: string;
    last_delivery_attempt?: number;
    held?: boolean;
    hold_expiry?: number;
  };

  /** Message metadata */
  details?: {
    rcpt_to: string;
    mail_from: string;
    subject: string;
    message_id: string;
    timestamp: number;
    direction?: string;
    size?: number;
    bounce?: boolean;
    bounce_for_id?: number;
    tag?: string;
    received_with_ssl?: boolean;
  };

  /** Spam/threat inspection results */
  inspection?: {
    inspected: boolean;
    spam: boolean;
    spam_score?: number;
    threat?: boolean;
    threat_details?: string;
  };

  /** Plain text message body */
  plain_body?: string;

  /** HTML message body */
  html_body?: string;

  /** Message attachments */
  attachments?: Array<{
    filename: string;
    content_type: string;
    data: string; // base64
    size: number;
    hash?: string;
  }>;

  /** Email headers */
  headers?: Record<string, string>;

  /** Provider-specific metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Options for listing messages
 * Optional feature - not all providers support this
 *
 * @public
 */
export interface ListMessagesOptions {
  /** Maximum number of messages to return */
  limit?: number;

  /** Offset for pagination */
  offset?: number;

  /** Filter by status */
  status?: string;

  /** Filter by tag */
  tag?: string;

  /** Filter by date range (ISO 8601) */
  from?: string;
  to?: string;

  /** Filter by direction (inbound/outbound) */
  direction?: 'inbound' | 'outbound';
}

/**
 * Simplified message information for list operations
 *
 * @public
 */
export interface Message {
  id: number | string;
  message_id: string;
  subject: string;
  from: string;
  to: string[];
  status: string;
  timestamp: number;
  size?: number;
  tag?: string;
}

/**
 * Mail Provider Interface
 *
 * All email service providers must implement this interface.
 * Provides a consistent API regardless of the underlying provider.
 *
 * @public
 */
export interface IMailProvider {
  /**
   * Send an email message
   *
   * @param params - Message parameters
   * @returns Promise resolving to send response with message ID
   */
  sendMessage(params: SendMessageParams): Promise<SendMessageResponse>;

  /**
   * Get detailed information about a specific message
   *
   * @param id - Message identifier
   * @param expansions - Optional list of fields to expand (provider-specific)
   * @returns Promise resolving to message details
   */
  getMessage(id: string, expansions?: string[]): Promise<MessageDetails>;

  /**
   * List messages (optional - not all providers support this)
   *
   * @param options - Filtering and pagination options
   * @returns Promise resolving to array of messages
   */
  listMessages?(options?: ListMessagesOptions): Promise<Message[]>;

  /**
   * Delete a message (optional - not all providers support this)
   *
   * @param id - Message identifier
   * @returns Promise resolving when deletion completes
   */
  deleteMessage?(id: string): Promise<void>;

  /**
   * Get delivery information for a message (optional)
   *
   * @param id - Message identifier
   * @returns Promise resolving to delivery details
   */
  getDeliveries?(id: string): Promise<any[]>;

  /**
   * Test connectivity to the provider (optional)
   *
   * @returns Promise resolving to true if connected
   */
  testConnection?(): Promise<boolean>;
}

/**
 * Provider configuration options
 * Base interface that all providers can extend
 *
 * @public
 */
export interface ProviderConfig {
  /** Provider type identifier */
  type: 'postal' | 'sendgrid' | 'smtp' | 'ses' | string;

  /** Server URL or hostname */
  server: string;

  /** Email address for sending */
  email: string;

  /** API key or authentication token */
  api_key: string;

  /** Additional provider-specific configuration */
  [key: string]: any;
}

/**
 * Provider initialization options
 * Common options across all providers
 *
 * @public
 */
export interface ProviderOptions {
  /** Maximum number of retry attempts for failed requests */
  maxRetries?: number;

  /** Base delay in milliseconds between retries */
  baseDelay?: number;

  /** Whether to enable automatic retry on transient failures */
  enableRetry?: boolean;

  /** Request timeout in milliseconds */
  timeout?: number;

  /** Additional provider-specific options */
  [key: string]: any;
}
