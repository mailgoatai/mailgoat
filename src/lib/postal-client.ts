import axios, { AxiosInstance } from 'axios';
import { MailGoatConfig } from './config';

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
 * Client for Postal Legacy API
 * https://github.com/postalserver/postal
 */
export class PostalClient {
  private client: AxiosInstance;
  private config: MailGoatConfig;

  constructor(config: MailGoatConfig) {
    this.config = config;

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
   * Send an email message
   * POST /api/v1/send/message
   */
  async sendMessage(params: SendMessageParams): Promise<SendMessageResponse> {
    try {
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
    } catch (error: any) {
      this.handleError(error, 'Failed to send message');
    }
  }

  /**
   * Get message details by ID
   * POST /api/v1/messages/message
   */
  async getMessage(
    messageId: string,
    expansions?: string[]
  ): Promise<MessageDetails> {
    try {
      const response = await this.client.post('/api/v1/messages/message', {
        id: messageId,
        _expansions: expansions || ['status', 'details', 'plain_body'],
      });

      return response.data.data;
    } catch (error: any) {
      this.handleError(error, `Failed to get message ${messageId}`);
    }
  }

  /**
   * Get deliveries for a message
   * POST /api/v1/messages/deliveries
   */
  async getDeliveries(messageId: string): Promise<any[]> {
    try {
      const response = await this.client.post('/api/v1/messages/deliveries', {
        id: messageId,
      });

      return response.data.data;
    } catch (error: any) {
      this.handleError(error, `Failed to get deliveries for ${messageId}`);
    }
  }

  /**
   * Handle API errors
   */
  private handleError(error: any, context: string): never {
    if (error.response) {
      // Postal API error response
      const data = error.response.data;
      if (data.status === 'error') {
        throw new Error(
          `${context}: ${data.data.message || data.data.code || 'Unknown error'}`
        );
      }
      throw new Error(
        `${context}: HTTP ${error.response.status} - ${error.response.statusText}`
      );
    } else if (error.request) {
      throw new Error(
        `${context}: No response from server. Check your server URL and network connection.`
      );
    } else {
      throw new Error(`${context}: ${error.message}`);
    }
  }
}
