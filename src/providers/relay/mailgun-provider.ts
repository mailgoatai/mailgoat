/**
 * Mailgun Relay Provider
 *
 * Sends emails through Mailgun's HTTP API
 */

import { RelayProvider, RelayConfig } from './relay-provider.interface';
import { SendMessageParams, SendMessageResponse, MessageDetails } from '../mail-provider.interface';
import axios, { AxiosInstance } from 'axios';
import FormData from 'form-data';

export class MailgunProvider extends RelayProvider {
  private client: AxiosInstance;
  private domain: string;

  constructor(config: RelayConfig) {
    super(config);

    if (!config.credentials.apiKey) {
      throw new Error('Mailgun API key is required');
    }

    if (!config.credentials.domain) {
      throw new Error('Mailgun domain is required');
    }

    this.domain = config.credentials.domain;

    this.client = axios.create({
      baseURL: `https://api.mailgun.net/v3/${this.domain}`,
      auth: {
        username: 'api',
        password: config.credentials.apiKey,
      },
      timeout: 30000,
    });
  }

  async sendMessage(params: SendMessageParams): Promise<SendMessageResponse> {
    try {
      const formData = new FormData();

      // Required fields
      formData.append('from', params.from || this.config.from || 'noreply@mailgun.example.com');
      formData.append('to', params.to.join(','));
      formData.append('subject', params.subject);

      // Body content
      if (params.plain_body) {
        formData.append('text', params.plain_body);
      }
      if (params.html_body) {
        formData.append('html', params.html_body);
      }

      // Optional fields
      if (params.cc && params.cc.length > 0) {
        formData.append('cc', params.cc.join(','));
      }
      if (params.bcc && params.bcc.length > 0) {
        formData.append('bcc', params.bcc.join(','));
      }
      if (params.reply_to) {
        formData.append('h:Reply-To', params.reply_to);
      }
      if (params.tag) {
        formData.append('o:tag', params.tag);
      }

      // Custom headers
      if (params.headers) {
        for (const [key, value] of Object.entries(params.headers)) {
          formData.append(`h:${key}`, value);
        }
      }

      // Attachments
      if (params.attachments && params.attachments.length > 0) {
        for (const attachment of params.attachments) {
          const buffer = Buffer.from(attachment.data, 'base64');
          formData.append('attachment', buffer, {
            filename: attachment.name,
            contentType: attachment.content_type,
          });
        }
      }

      const response = await this.client.post('/messages', formData, {
        headers: formData.getHeaders(),
      });

      return {
        message_id: response.data.id || `mailgun-${Date.now()}`,
        metadata: {
          provider: 'mailgun',
          status: response.data.message,
        },
      };
    } catch (_error) {
      if (axios.isAxiosError(_error)) {
        const status = _error.response?.status;
        const data = _error.response?.data;
        throw new Error(`Mailgun API error (${status}): ${JSON.stringify(data)}`);
      }
      throw _error;
    }
  }

  async getMessage(id: string): Promise<MessageDetails> {
    try {
      // Mailgun stores messages for 3 days
      const response = await this.client.get(`/events`, {
        params: {
          'message-id': id,
          limit: 1,
        },
      });

      const events = response.data.items || [];
      if (events.length === 0) {
        throw new Error('Message not found');
      }

      const event = events[0];

      return {
        id: event['message-id'] || id,
        metadata: {
          provider: 'mailgun',
          event: event.event,
          timestamp: event.timestamp,
          recipient: event.recipient,
          tags: event.tags,
        },
      };
    } catch (_error) {
      if (axios.isAxiosError(_error)) {
        throw new Error(
          `Failed to get message: ${_error.response?.data?.message || _error.message}`
        );
      }
      throw _error;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      // Test by getting domain info
      const response = await this.client.get('/');
      return response.status === 200;
    } catch (_error) {
      return false;
    }
  }

  async validateConfig(): Promise<void> {
    if (!this.config.credentials.apiKey) {
      throw new Error('Mailgun API key is required');
    }

    if (!this.config.credentials.domain) {
      throw new Error('Mailgun domain is required');
    }

    // Test connection
    const isValid = await this.testConnection();
    if (!isValid) {
      throw new Error('Failed to connect to Mailgun - check API key and domain');
    }
  }
}
