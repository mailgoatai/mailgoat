/**
 * Mailjet Relay Provider
 *
 * Sends emails through Mailjet's HTTP API
 */

import { RelayProvider, RelayConfig } from './relay-provider.interface';
import { SendMessageParams, SendMessageResponse, MessageDetails } from '../mail-provider.interface';
import axios, { AxiosInstance } from 'axios';

export class MailjetProvider extends RelayProvider {
  private client: AxiosInstance;

  constructor(config: RelayConfig) {
    super(config);

    if (!config.credentials.apiKey) {
      throw new Error('Mailjet API key is required');
    }

    if (!config.credentials.apiSecret) {
      throw new Error('Mailjet API secret is required');
    }

    this.client = axios.create({
      baseURL: 'https://api.mailjet.com/v3.1',
      auth: {
        username: config.credentials.apiKey,
        password: config.credentials.apiSecret,
      },
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  async sendMessage(params: SendMessageParams): Promise<SendMessageResponse> {
    try {
      const payload: Record<string, unknown> = {
        Messages: [
          {
            From: {
              Email: params.from || this.config.from || 'noreply@example.com',
            },
            To: params.to.map((email) => ({ Email: email })),
            Subject: params.subject,
          },
        ],
      };

      const message = payload.Messages[0];

      // Add CC
      if (params.cc && params.cc.length > 0) {
        message.Cc = params.cc.map((email) => ({ Email: email }));
      }

      // Add BCC
      if (params.bcc && params.bcc.length > 0) {
        message.Bcc = params.bcc.map((email) => ({ Email: email }));
      }

      // Add reply-to
      if (params.reply_to) {
        message.ReplyTo = { Email: params.reply_to };
      }

      // Add body content
      if (params.plain_body) {
        message.TextPart = params.plain_body;
      }
      if (params.html_body) {
        message.HTMLPart = params.html_body;
      }

      // Add custom headers
      if (params.headers) {
        message.Headers = params.headers;
      }

      // Add tag/category
      if (params.tag) {
        message.CustomCampaign = params.tag;
      }

      // Add attachments
      if (params.attachments && params.attachments.length > 0) {
        message.Attachments = params.attachments.map((att) => ({
          ContentType: att.content_type,
          Filename: att.name,
          Base64Content: att.data,
        }));
      }

      const response = await this.client.post('/send', payload);

      const messageData = response.data.Messages?.[0];

      return {
        message_id: messageData?.To?.[0]?.MessageID?.toString() || `mailjet-${Date.now()}`,
        metadata: {
          provider: 'mailjet',
          status: messageData?.Status,
        },
      };
    } catch (_error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const data = error.response?.data;
        throw new Error(`Mailjet API error (${status}): ${JSON.stringify(data)}`);
      }
      throw error;
    }
  }

  async getMessage(id: string): Promise<MessageDetails> {
    try {
      // Get message info from Mailjet
      const response = await this.client.get(`/message/${id}`);

      const data = response.data.Data?.[0];

      return {
        id: data?.ID?.toString() || id,
        metadata: {
          provider: 'mailjet',
          status: data?.Status,
          arrived: data?.ArrivedAt,
        },
      };
    } catch (_error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `Failed to get message: ${error.response?.data?.ErrorMessage || error.message}`
        );
      }
      throw error;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      // Test by getting API key info
      const response = await this.client.get('/REST/apikey');
      return response.status === 200;
    } catch (_error) {
      return false;
    }
  }

  async validateConfig(): Promise<void> {
    if (!this.config.credentials.apiKey) {
      throw new Error('Mailjet API key is required');
    }

    if (!this.config.credentials.apiSecret) {
      throw new Error('Mailjet API secret is required');
    }

    // Test connection
    const isValid = await this.testConnection();
    if (!isValid) {
      throw new Error('Failed to connect to Mailjet - check API key and secret');
    }
  }
}
