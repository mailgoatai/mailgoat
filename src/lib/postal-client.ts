import axios, { AxiosInstance } from 'axios';
import { MailGoatConfig } from './config';

export interface PostalClientOptions {
  maxRetries?: number;
  baseDelay?: number;
  enableRetry?: boolean;
}

export interface SendMessageParams {
  to: string[];
  subject: string;
  plain_body?: string;
  html_body?: string;
  from?: string;
  cc?: string[];
  bcc?: string[];
  reply_to?: string;
  tag?: string;
  headers?: Record<string, string>;
  attachments?: Array<{
    name: string;
    content_type: string;
    data: string; // base64 encoded
  }>;
}

export interface SendMessageResponse {
  message_id: string;
  messages: Record<string, { id: number; token: string }>;
}

export interface MessageDetails {
  id: number;
  token: string;
  status?: {
    status: string;
    last_delivery_attempt?: number;
    held: boolean;
    hold_expiry?: number;
  };
  details?: {
    rcpt_to: string;
    mail_from: string;
    subject: string;
    message_id: string;
    timestamp: number;
    direction: string;
    size: number;
    bounce: boolean;
    bounce_for_id?: number;
    tag?: string;
    received_with_ssl: boolean;
  };
  inspection?: {
    inspected: boolean;
    spam: boolean;
    spam_score: number;
    threat: boolean;
    threat_details?: string;
  };
  plain_body?: string;
  html_body?: string;
  attachments?: Array<{
    filename: string;
    content_type: string;
    data: string; // base64
    size: number;
    hash: string;
  }>;
  headers?: Record<string, string>;
}

/**
 * Client for Postal Legacy API with retry logic and enhanced error handling
 * https://github.com/postalserver/postal
 */
export class PostalClient {
  private client: AxiosInstance;
  private config: MailGoatConfig;
  private maxRetries: number;
  private baseDelay: number;
  private enableRetry: boolean;

  constructor(config: MailGoatConfig, options: PostalClientOptions = {}) {
    this.config = config;
    this.maxRetries = options.maxRetries ?? 3;
    this.baseDelay = options.baseDelay ?? 1000;
    this.enableRetry = options.enableRetry ?? true;

    // Build base URL (handle both with/without https://)
    let baseURL = config.server;
    if (!baseURL.startsWith('http://') && !baseURL.startsWith('https://')) {
      baseURL = `https://${baseURL}`;
    }

    this.client = axios.create({
      baseURL,
      headers: {
        'X-Server-API-Key': config.api_key,
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 second timeout
    });
  }

  /**
   * Retry a function with exponential backoff
   * @param fn Function to retry
   * @param operationName Name of operation for error messages
   * @returns Result of the function
   */
  private async retryWithBackoff<T>(fn: () => Promise<T>, operationName: string): Promise<T> {
    if (!this.enableRetry) {
      return fn();
    }

    let lastError: any;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;

        // Don't retry on certain errors
        if (this.shouldNotRetry(error)) {
          throw error;
        }

        // If this was the last attempt, throw
        if (attempt === this.maxRetries - 1) {
          throw this.enhanceError(error, operationName, attempt + 1);
        }

        // Calculate delay with exponential backoff
        const delay = this.baseDelay * Math.pow(2, attempt);

        // Log retry attempt (only in verbose mode - future enhancement)
        // console.log(`Retrying ${operationName} after ${delay}ms (attempt ${attempt + 1}/${this.maxRetries})`);

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  /**
   * Determine if an error should not be retried
   */
  private shouldNotRetry(error: any): boolean {
    // Don't retry on auth errors (401, 403)
    if (error.response?.status === 401 || error.response?.status === 403) {
      return true;
    }

    // Don't retry on client errors (400-499, except 429 rate limit)
    if (
      error.response?.status >= 400 &&
      error.response?.status < 500 &&
      error.response?.status !== 429
    ) {
      return true;
    }

    // Don't retry on validation errors from Postal
    const errorCode = error.response?.data?.data?.code;
    const nonRetryableCodes = [
      'NoRecipients',
      'NoContent',
      'TooManyToAddresses',
      'TooManyCCAddresses',
      'TooManyBCCAddresses',
      'FromAddressMissing',
      'UnauthenticatedFromAddress',
      'MessageNotFound',
    ];

    if (errorCode && nonRetryableCodes.includes(errorCode)) {
      return true;
    }

    return false;
  }

  /**
   * Enhance error with helpful context and messages
   */
  private enhanceError(error: any, context: string, attempts: number): Error {
    const enhanced = this.categorizeError(error);
    enhanced.message = `${context} (after ${attempts} ${attempts === 1 ? 'attempt' : 'attempts'}): ${enhanced.message}`;
    return enhanced;
  }

  /**
   * Send an email message with retry logic
   * POST /api/v1/send/message
   */
  async sendMessage(params: SendMessageParams): Promise<SendMessageResponse> {
    return this.retryWithBackoff(async () => {
      const response = await this.client.post('/api/v1/send/message', {
        to: params.to,
        cc: params.cc,
        bcc: params.bcc,
        from: params.from || this.config.email,
        subject: params.subject,
        plain_body: params.plain_body,
        html_body: params.html_body,
        reply_to: params.reply_to,
        tag: params.tag,
        headers: params.headers,
        attachments: params.attachments,
      });

      return response.data.data;
    }, 'Send message');
  }

  /**
   * Get message details by ID with retry logic
   * POST /api/v1/messages/message
   */
  async getMessage(messageId: string, expansions?: string[]): Promise<MessageDetails> {
    return this.retryWithBackoff(async () => {
      const response = await this.client.post('/api/v1/messages/message', {
        id: messageId,
        _expansions: expansions || ['status', 'details', 'plain_body'],
      });

      return response.data.data;
    }, `Get message ${messageId}`);
  }

  /**
   * Get deliveries for a message with retry logic
   * POST /api/v1/messages/deliveries
   */
  async getDeliveries(messageId: string): Promise<any[]> {
    return this.retryWithBackoff(async () => {
      const response = await this.client.post('/api/v1/messages/deliveries', {
        id: messageId,
      });

      return response.data.data;
    }, `Get deliveries for ${messageId}`);
  }

  /**
   * Categorize error and provide helpful message
   */
  private categorizeError(error: any): Error {
    // Network/connection errors
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return new Error(
        `Could not connect to Postal server at ${this.config.server}. ` +
          `Check your network connection and server URL.`
      );
    }

    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      return new Error(
        `Connection to Postal server timed out. ` +
          `The server may be overloaded or your network is slow.`
      );
    }

    if (!error.response) {
      return new Error(
        `No response from Postal server. Check your network connection and server URL.`
      );
    }

    const status = error.response.status;
    const data = error.response.data;

    // Authentication errors (401, 403)
    if (status === 401 || status === 403) {
      return new Error(
        `Authentication failed. Your API key is invalid or expired.\n` + `Run: mailgoat config init`
      );
    }

    // Rate limiting (429)
    if (status === 429) {
      const retryAfter = error.response.headers['retry-after'] || '60';
      return new Error(
        `Rate limit exceeded. Too many requests to Postal server.\n` +
          `Wait ${retryAfter} seconds and try again.`
      );
    }

    // Postal-specific validation errors
    if (data?.status === 'error' && data?.data) {
      const errorCode = data.data.code;
      const errorMessage = data.data.message || errorCode;

      switch (errorCode) {
        case 'NoRecipients':
          return new Error('No recipients specified. Add --to, --cc, or --bcc.');
        case 'NoContent':
          return new Error('Email has no content. Add --body or --html.');
        case 'TooManyToAddresses':
          return new Error('Too many recipients in To field (maximum 50).');
        case 'TooManyCCAddresses':
          return new Error('Too many recipients in CC field (maximum 50).');
        case 'TooManyBCCAddresses':
          return new Error('Too many recipients in BCC field (maximum 50).');
        case 'FromAddressMissing':
          return new Error('Sender email (From) is missing. Add --from or check config.');
        case 'UnauthenticatedFromAddress':
          return new Error(
            `Sender email "${data.data.from || 'unknown'}" is not authorized.\n` +
              `You can only send from domains configured in your Postal server.`
          );
        case 'MessageNotFound':
          return new Error(`Message not found. Check the message ID and try again.`);
        default:
          return new Error(`Postal error: ${errorMessage}`);
      }
    }

    // Server errors (500-599)
    if (status >= 500) {
      return new Error(
        `Postal server error (HTTP ${status}). The server may be experiencing issues.\n` +
          `Try again in a few minutes.`
      );
    }

    // Client errors (400-499)
    if (status >= 400) {
      return new Error(
        `Request error (HTTP ${status}): ${error.response.statusText}\n` +
          `Check your request parameters.`
      );
    }

    // Generic error
    return new Error(`Unexpected error: ${error.message}`);
  }
}
