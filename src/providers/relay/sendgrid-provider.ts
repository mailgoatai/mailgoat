/**
 * SendGrid Relay Provider
 *
 * Sends emails through SendGrid's HTTP API
 */

import { RelayProvider, RelayConfig } from './relay-provider.interface';
import { SendMessageParams, SendMessageResponse, MessageDetails } from '../mail-provider.interface';
import axios, { AxiosInstance } from 'axios';

export class SendGridProvider extends RelayProvider {
  private client: AxiosInstance;
  private readonly baseURL = 'https://api.sendgrid.com/v3';

  constructor(config: RelayConfig) {
    super(config);

    if (!config.credentials.apiKey) {
      throw new Error('SendGrid API key is required');
    }

    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        Authorization: `Bearer ${config.credentials.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  async sendMessage(params: SendMessageParams): Promise<SendMessageResponse> {
    try {
      const payload = this.buildSendGridPayload(params);

      const response = await this.client.post('/mail/send', payload);

      // SendGrid returns 202 on success with X-Message-Id header
      const messageId = response.headers['x-message-id'] || `sendgrid-${Date.now()}`;

      return {
        message_id: messageId,
        metadata: {
          provider: 'sendgrid',
          status_code: response.status,
        },
      };
    } catch (_error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const data = error.response?.data;
        throw new Error(`SendGrid API error (${status}): ${JSON.stringify(data)}`);
      }
      throw error;
    }
  }

  async getMessage(id: string): Promise<MessageDetails> {
    // SendGrid doesn't provide a direct message lookup API
    // Return minimal details
    return {
      id,
      metadata: {
        provider: 'sendgrid',
        note: 'SendGrid does not support message retrieval',
      },
    };
  }

  async testConnection(): Promise<boolean> {
    try {
      // Test by validating API key with SendGrid's validation endpoint
      await this.client.get('/scopes');
      return true;
    } catch (_error) {
      return false;
    }
  }

  async validateConfig(): Promise<void> {
    if (!this.config.credentials.apiKey) {
      throw new Error('SendGrid API key is required');
    }

    if (!this.config.credentials.apiKey.startsWith('SG.')) {
      throw new Error('Invalid SendGrid API key format (should start with SG.)');
    }
  }

  private buildSendGridPayload(params: SendMessageParams): Record<string, unknown> {
    const payload: Record<string, unknown> = {
      personalizations: [
        {
          to: params.to.map((email) => ({ email })),
        },
      ],
      from: {
        email: params.from || this.config.from,
      },
      subject: params.subject,
    };

    // Add CC if provided
    if (params.cc && params.cc.length > 0) {
      payload.personalizations[0].cc = params.cc.map((email) => ({ email }));
    }

    // Add BCC if provided
    if (params.bcc && params.bcc.length > 0) {
      payload.personalizations[0].bcc = params.bcc.map((email) => ({ email }));
    }

    // Add content
    payload.content = [];
    if (params.plain_body) {
      payload.content.push({
        type: 'text/plain',
        value: params.plain_body,
      });
    }
    if (params.html_body) {
      payload.content.push({
        type: 'text/html',
        value: params.html_body,
      });
    }

    // Add attachments if provided
    if (params.attachments && params.attachments.length > 0) {
      payload.attachments = params.attachments.map((att) => ({
        filename: att.name,
        type: att.content_type,
        content: att.data, // Already base64
      }));
    }

    // Add custom headers if provided
    if (params.headers) {
      payload.headers = params.headers;
    }

    // Add tag/category if provided
    if (params.tag) {
      payload.categories = [params.tag];
    }

    return payload;
  }
}
