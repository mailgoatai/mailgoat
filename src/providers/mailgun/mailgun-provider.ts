import axios from 'axios';
import Mailgun from 'mailgun.js';
import FormData from 'form-data';
import { MailGoatConfig } from '../../lib/config';
import {
  IMailProvider,
  MessageDetails,
  SendMessageParams,
  SendMessageResponse,
} from '../mail-provider.interface';

export interface MailgunProviderConfig {
  apiKey: string;
  domain: string;
  region?: 'us' | 'eu';
  fromAddress?: string;
  fromName?: string;
}

type MailgunMessagesClient = {
  create: (domain: string, data: Record<string, unknown>) => Promise<Record<string, any>>;
};

type MailgunClient = {
  messages: MailgunMessagesClient;
};

function resolveApiBase(region?: 'us' | 'eu'): string {
  return region === 'eu' ? 'https://api.eu.mailgun.net' : 'https://api.mailgun.net';
}

function normalizeProviderConfig(
  config: MailgunProviderConfig | MailGoatConfig
): MailgunProviderConfig {
  const withProviderBlock = (config as MailGoatConfig).mailgun;
  if (withProviderBlock) {
    return {
      apiKey: withProviderBlock.apiKey,
      domain: withProviderBlock.domain,
      region: withProviderBlock.region,
      fromAddress: (config as MailGoatConfig).fromAddress,
      fromName: (config as MailGoatConfig).fromName,
    };
  }

  return config as MailgunProviderConfig;
}

export class MailgunProvider implements IMailProvider {
  private readonly config: MailgunProviderConfig;
  private readonly baseUrl: string;
  private readonly client: MailgunClient;

  constructor(config: MailgunProviderConfig | MailGoatConfig) {
    this.config = normalizeProviderConfig(config);

    if (!this.config.apiKey || !this.config.domain) {
      throw new Error('Mailgun provider requires apiKey and domain');
    }

    this.baseUrl = resolveApiBase(this.config.region);
    const mailgun = new Mailgun(FormData);
    this.client = mailgun.client({
      username: 'api',
      key: this.config.apiKey,
      url: this.baseUrl,
    }) as unknown as MailgunClient;
  }

  async sendMessage(params: SendMessageParams): Promise<SendMessageResponse> {
    const payload: Record<string, unknown> = {
      from: params.from || this.config.fromAddress,
      to: params.to,
      subject: params.subject,
      ...(params.plain_body ? { text: params.plain_body } : {}),
      ...(params.html_body ? { html: params.html_body } : {}),
      ...(params.cc?.length ? { cc: params.cc } : {}),
      ...(params.bcc?.length ? { bcc: params.bcc } : {}),
      ...(params.reply_to ? { 'h:Reply-To': params.reply_to } : {}),
      ...(params.tag ? { 'o:tag': params.tag } : {}),
    };

    if (!payload.from || !String(payload.from).trim()) {
      throw new Error('Mailgun provider requires a from address');
    }

    if (params.attachments?.length) {
      payload.attachment = params.attachments.map((attachment) => ({
        data: Buffer.from(attachment.data, 'base64'),
        filename: attachment.name,
        contentType: attachment.content_type,
      }));
    }

    const response = await this.client.messages.create(this.config.domain, payload);
    const messageId = String(response.id || response.message || `mailgun-${Date.now()}`);
    return {
      message_id: messageId,
      metadata: {
        provider: 'mailgun',
        response,
      },
    };
  }

  async getMessage(id: string): Promise<MessageDetails> {
    const response = await axios.get(`${this.baseUrl}/v3/${this.config.domain}/events`, {
      auth: { username: 'api', password: this.config.apiKey },
      params: {
        limit: 1,
        'message-id': id,
      },
      timeout: 30000,
    });

    const first = response.data?.items?.[0];
    if (!first) {
      throw new Error(`Mailgun message not found: ${id}`);
    }

    return {
      id,
      status: {
        status: String(first.event || 'unknown'),
      },
      details: {
        rcpt_to: String(first.recipient || ''),
        mail_from: String(first.message?.headers?.from || ''),
        subject: String(first.message?.headers?.subject || ''),
        message_id: String(first.message?.headers?.['message-id'] || id),
        timestamp: Number(first.timestamp || Math.floor(Date.now() / 1000)),
        direction: 'outbound',
      },
      metadata: first,
    };
  }

  async testConnection(): Promise<boolean> {
    try {
      await axios.get(`${this.baseUrl}/v3/domains/${this.config.domain}`, {
        auth: { username: 'api', password: this.config.apiKey },
        timeout: 15000,
      });
      return true;
    } catch {
      return false;
    }
  }
}
