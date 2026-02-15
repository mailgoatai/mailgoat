/**
 * Postal API Client
 * Direct integration with Postal's HTTP API
 */

import axios, { AxiosInstance } from 'axios';
import { logger } from './logger.js';

export interface PostalConfig {
  serverUrl: string;
  apiKey: string;
  fromEmail: string;
}

export interface EmailMessage {
  to: string | string[];
  subject: string;
  plainBody?: string;
  htmlBody?: string;
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  attachments?: Array<{
    name: string;
    contentType: string;
    data: string; // base64
  }>;
}

export interface SendEmailResponse {
  status: string;
  time: number;
  flags: Record<string, unknown>;
  data: {
    message_id: string;
    messages: Record<string, {
      id: number;
      token: string;
    }>;
  };
}

/**
 * Client for Postal's HTTP API
 * This is what MailGoat CLI will wrap internally
 */
export class PostalClient {
  private client: AxiosInstance;
  private config: PostalConfig;

  constructor(config: PostalConfig) {
    this.config = config;
    
    this.client = axios.create({
      baseURL: `${config.serverUrl}/api/v1`,
      headers: {
        'X-Server-API-Key': config.apiKey,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.debug(`Postal API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        logger.error('Postal API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        logger.debug(`Postal API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        if (error.response) {
          logger.error(`Postal API Error: ${error.response.status} ${error.response.statusText}`);
          logger.error('Error data:', error.response.data);
        } else if (error.request) {
          logger.error('Postal API: No response received', error.message);
        } else {
          logger.error('Postal API Request Setup Error:', error.message);
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Send an email via Postal
   */
  async sendEmail(message: EmailMessage): Promise<SendEmailResponse> {
    try {
      const payload = {
        to: Array.isArray(message.to) ? message.to : [message.to],
        from: this.config.fromEmail,
        subject: message.subject,
        plain_body: message.plainBody,
        html_body: message.htmlBody,
        cc: message.cc,
        bcc: message.bcc,
        reply_to: message.replyTo,
        attachments: message.attachments,
      };

      const response = await this.client.post<SendEmailResponse>('/send/message', payload);
      
      logger.info(`Email sent successfully: ${response.data.data.message_id}`);
      
      return response.data;
    } catch (error) {
      logger.error('Failed to send email:', error);
      throw new Error(`Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Send a simple text email (convenience method)
   */
  async sendSimpleEmail(to: string, subject: string, body: string): Promise<string> {
    const response = await this.sendEmail({
      to,
      subject,
      plainBody: body,
    });
    
    return response.data.message_id;
  }

  /**
   * Send an HTML email with plain text fallback
   */
  async sendHtmlEmail(to: string, subject: string, html: string, plainText?: string): Promise<string> {
    const response = await this.sendEmail({
      to,
      subject,
      htmlBody: html,
      plainBody: plainText || this.stripHtml(html),
    });
    
    return response.data.message_id;
  }

  /**
   * Simple HTML stripping for plain text fallback
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Health check - verify Postal connection
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Try to send a test request
      await this.client.get('/');
      return true;
    } catch (error) {
      logger.error('Postal health check failed:', error);
      return false;
    }
  }
}
