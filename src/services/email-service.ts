/**
 * Email Service
 * 
 * Business logic layer for email operations.
 * Separates business logic from CLI commands and provides reusable email functionality.
 */

import { IMailProvider, SendMessageParams, SendMessageResponse, MessageDetails } from '../providers';
import { validationService, ValidationService } from '../lib/validation-service';
import { ILogger, ConsoleLogger } from './logger.interface';

/**
 * Attachment for email
 */
export interface EmailAttachment {
  /** File path or name */
  name: string;
  /** MIME content type */
  contentType: string;
  /** Base64 encoded data */
  data: string;
  /** File size in bytes */
  size?: number;
}

/**
 * Options for sending an email
 */
export interface SendEmailOptions {
  /** Recipient email addresses (required) */
  to: string[];
  
  /** Email subject (required) */
  subject: string;
  
  /** Email body content (required unless html is provided) */
  body?: string;
  
  /** HTML body content */
  html?: string;
  
  /** Sender email address (defaults to provider config) */
  from?: string;
  
  /** CC recipients */
  cc?: string[];
  
  /** BCC recipients */
  bcc?: string[];
  
  /** Reply-To address */
  replyTo?: string;
  
  /** Message tag for tracking */
  tag?: string;
  
  /** Custom email headers */
  headers?: Record<string, string>;
  
  /** File attachments */
  attachments?: EmailAttachment[];
}

/**
 * Result after sending an email
 */
export interface SendEmailResult {
  /** Unique message identifier */
  messageId: string;
  
  /** Per-recipient details (if available) */
  recipients?: Record<string, {
    id: number;
    token: string;
  }>;
  
  /** Provider-specific metadata */
  metadata?: Record<string, any>;
}

/**
 * Options for reading an email
 */
export interface ReadEmailOptions {
  /** Whether to include full message body */
  includeBody?: boolean;
  
  /** Whether to include attachments */
  includeAttachments?: boolean;
  
  /** Whether to include headers */
  includeHeaders?: boolean;
  
  /** Provider-specific expansions */
  expansions?: string[];
}

/**
 * Email message details
 */
export interface Email {
  /** Message identifier */
  id: string | number;
  
  /** Message token */
  token?: string;
  
  /** Email subject */
  subject: string;
  
  /** Sender email */
  from: string;
  
  /** Recipient email(s) */
  to: string[];
  
  /** Message status */
  status?: string;
  
  /** Sent timestamp */
  timestamp: number;
  
  /** Plain text body */
  body?: string;
  
  /** HTML body */
  htmlBody?: string;
  
  /** Message size in bytes */
  size?: number;
  
  /** Message tag */
  tag?: string;
  
  /** Attachments */
  attachments?: EmailAttachment[];
  
  /** Email headers */
  headers?: Record<string, string>;
  
  /** Full provider-specific details */
  raw?: MessageDetails;
}

/**
 * Email Service
 * 
 * Provides high-level email operations with validation, logging, and error handling.
 * Separates business logic from CLI commands for better testability and reusability.
 * 
 * @public
 */
export class EmailService {
  private logger: ILogger;
  private validator: ValidationService;

  /**
   * Create a new Email Service
   * 
   * @param mailProvider - Mail provider implementation
   * @param logger - Logger instance (optional, defaults to ConsoleLogger)
   * @param validator - Validation service (optional, defaults to global instance)
   */
  constructor(
    private mailProvider: IMailProvider,
    logger?: ILogger,
    validator?: ValidationService
  ) {
    this.logger = logger || new ConsoleLogger('EmailService');
    this.validator = validator || validationService;
  }

  /**
   * Send an email message
   * 
   * @param options - Send options
   * @returns Promise resolving to send result
   * @throws Error if validation fails or send fails
   */
  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    this.logger.debug('sendEmail called', { 
      to: options.to, 
      subject: options.subject,
      hasAttachments: !!options.attachments?.length 
    });

    // 1. Validate inputs
    const validation = this.validator.validateSendOptions({
      to: options.to,
      cc: options.cc,
      bcc: options.bcc,
      subject: options.subject,
      body: options.html ? undefined : options.body,
      html: options.html,
      from: options.from,
      tag: options.tag,
      attachments: options.attachments?.map(a => a.name),
    });

    if (!validation.valid) {
      this.logger.error('sendEmail validation failed', undefined, { error: validation.error });
      throw new Error(`Validation failed: ${validation.error}`);
    }

    // 2. Prepare message parameters
    const message = this.prepareMessage(options);

    // 3. Send via provider
    try {
      const startTime = Date.now();
      const result = await this.mailProvider.sendMessage(message);
      const duration = Date.now() - startTime;

      // 4. Log success
      this.logger.info('Email sent successfully', { 
        messageId: result.message_id,
        recipients: options.to.length,
        duration: `${duration}ms`
      });

      // 5. Return normalized result
      return {
        messageId: result.message_id,
        recipients: result.messages,
        metadata: result.metadata,
      };
    } catch (error: any) {
      this.logger.error('Failed to send email', error, {
        to: options.to,
        subject: options.subject
      });
      throw error;
    }
  }

  /**
   * Read an email message
   * 
   * @param messageId - Message identifier
   * @param options - Read options
   * @returns Promise resolving to email details
   * @throws Error if message not found or read fails
   */
  async readEmail(messageId: string, options: ReadEmailOptions = {}): Promise<Email> {
    this.logger.debug('readEmail called', { messageId, options });

    try {
      // Build expansions list
      const expansions = options.expansions || this.buildExpansions(options);

      // Fetch message from provider
      const startTime = Date.now();
      const message = await this.mailProvider.getMessage(messageId, expansions);
      const duration = Date.now() - startTime;

      this.logger.info('Email read successfully', {
        messageId,
        duration: `${duration}ms`
      });

      // Convert to normalized Email format
      return this.normalizeMessage(message);
    } catch (error: any) {
      this.logger.error('Failed to read email', error, { messageId });
      throw error;
    }
  }

  /**
   * Get delivery information for a message
   * 
   * @param messageId - Message identifier
   * @returns Promise resolving to delivery details
   */
  async getDeliveries(messageId: string): Promise<any[]> {
    this.logger.debug('getDeliveries called', { messageId });

    if (!this.mailProvider.getDeliveries) {
      const error = new Error('Provider does not support delivery tracking');
      this.logger.warn('getDeliveries not supported', { messageId });
      throw error;
    }

    try {
      const deliveries = await this.mailProvider.getDeliveries(messageId);
      this.logger.info('Deliveries retrieved', {
        messageId,
        count: deliveries.length
      });
      return deliveries;
    } catch (error: any) {
      this.logger.error('Failed to get deliveries', error, { messageId });
      throw error;
    }
  }

  /**
   * Test connection to mail provider
   * 
   * @returns Promise resolving to true if connected
   */
  async testConnection(): Promise<boolean> {
    this.logger.debug('testConnection called');

    if (!this.mailProvider.testConnection) {
      this.logger.warn('testConnection not supported by provider');
      return true; // Assume connected if not supported
    }

    try {
      const connected = await this.mailProvider.testConnection();
      this.logger.info('Connection test result', { connected });
      return connected;
    } catch (error: any) {
      this.logger.error('Connection test failed', error);
      return false;
    }
  }

  /**
   * Prepare message parameters from send options
   * 
   * @param options - Send options
   * @returns Message parameters for provider
   */
  private prepareMessage(options: SendEmailOptions): SendMessageParams {
    const message: SendMessageParams = {
      to: options.to,
      subject: options.subject,
      from: options.from,
    };

    // Set body (plain or HTML)
    if (options.html) {
      message.html_body = options.html;
    } else if (options.body) {
      message.plain_body = options.body;
    }

    // Optional fields
    if (options.cc) message.cc = options.cc;
    if (options.bcc) message.bcc = options.bcc;
    if (options.replyTo) message.reply_to = options.replyTo;
    if (options.tag) message.tag = options.tag;
    if (options.headers) message.headers = options.headers;

    // Attachments
    if (options.attachments && options.attachments.length > 0) {
      message.attachments = options.attachments.map(att => ({
        name: att.name,
        content_type: att.contentType,
        data: att.data,
      }));
    }

    return message;
  }

  /**
   * Build expansions list from read options
   * 
   * @param options - Read options
   * @returns Array of expansion strings
   */
  private buildExpansions(options: ReadEmailOptions): string[] {
    const expansions: string[] = ['status', 'details', 'inspection'];

    if (options.includeBody !== false) {
      expansions.push('plain_body');
    }

    if (options.includeHeaders) {
      expansions.push('headers');
    }

    if (options.includeAttachments) {
      expansions.push('attachments');
    }

    return expansions;
  }

  /**
   * Normalize provider message details to Email format
   * 
   * @param message - Provider message details
   * @returns Normalized email object
   */
  private normalizeMessage(message: MessageDetails): Email {
    return {
      id: message.id,
      token: message.token,
      subject: message.details?.subject || '',
      from: message.details?.mail_from || '',
      to: message.details?.rcpt_to ? [message.details.rcpt_to] : [],
      status: message.status?.status,
      timestamp: message.details?.timestamp || 0,
      body: message.plain_body,
      htmlBody: message.html_body,
      size: message.details?.size,
      tag: message.details?.tag,
      attachments: message.attachments?.map(att => ({
        name: att.filename,
        contentType: att.content_type,
        data: att.data,
        size: att.size,
      })),
      headers: message.headers,
      raw: message,
    };
  }

  /**
   * Get the underlying mail provider
   * Useful for provider-specific operations
   * 
   * @returns Mail provider instance
   */
  getProvider(): IMailProvider {
    return this.mailProvider;
  }
}
