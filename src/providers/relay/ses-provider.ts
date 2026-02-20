/**
 * Amazon SES Relay Provider
 *
 * Sends emails through AWS SES API
 */

import { RelayProvider, RelayConfig } from './relay-provider.interface';
import { SendMessageParams, SendMessageResponse, MessageDetails } from '../mail-provider.interface';
import { SESClient, SendRawEmailCommand, GetSendQuotaCommand } from '@aws-sdk/client-ses';
import * as nodemailer from 'nodemailer';

export class SESProvider extends RelayProvider {
  private sesClient: SESClient;
  private transporter: nodemailer.Transporter;

  constructor(config: RelayConfig) {
    super(config);

    if (!config.credentials.apiKey) {
      throw new Error('AWS Access Key ID is required');
    }

    if (!config.credentials.apiSecret) {
      throw new Error('AWS Secret Access Key is required');
    }

    const region = config.credentials.region || 'us-east-1';

    this.sesClient = new SESClient({
      region,
      credentials: {
        accessKeyId: config.credentials.apiKey,
        secretAccessKey: config.credentials.apiSecret,
      },
    });

    // Use nodemailer with SES transport for easier MIME handling
    this.transporter = nodemailer.createTransport({
      SES: { ses: this.sesClient, aws: { SESClient, SendRawEmailCommand } },
    });
  }

  async sendMessage(params: SendMessageParams): Promise<SendMessageResponse> {
    try {
      const mailOptions: nodemailer.SendMailOptions = {
        from: params.from || this.config.from || 'noreply@example.com',
        to: params.to,
        subject: params.subject,
      };

      // Add CC/BCC
      if (params.cc && params.cc.length > 0) {
        mailOptions.cc = params.cc;
      }
      if (params.bcc && params.bcc.length > 0) {
        mailOptions.bcc = params.bcc;
      }

      // Add reply-to
      if (params.reply_to) {
        mailOptions.replyTo = params.reply_to;
      }

      // Set body content
      if (params.plain_body) {
        mailOptions.text = params.plain_body;
      }
      if (params.html_body) {
        mailOptions.html = params.html_body;
      }

      // Add custom headers
      if (params.headers) {
        mailOptions.headers = params.headers;
      }

      // Add tag as custom header
      if (params.tag) {
        mailOptions.headers = {
          ...mailOptions.headers,
          'X-SES-CONFIGURATION-SET': params.tag,
        };
      }

      // Add attachments
      if (params.attachments && params.attachments.length > 0) {
        mailOptions.attachments = params.attachments.map((att) => ({
          filename: att.name,
          content: Buffer.from(att.data, 'base64'),
          contentType: att.content_type,
        }));
      }

      const result = await this.transporter.sendMail(mailOptions);

      return {
        message_id: result.messageId,
        metadata: {
          provider: 'ses',
          response: result.response,
        },
      };
    } catch (_error) {
      throw new Error(`SES send error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getMessage(id: string): Promise<MessageDetails> {
    // SES doesn't provide message retrieval API
    // Would need to use CloudWatch Logs or SNS notifications
    return {
      id,
      metadata: {
        provider: 'ses',
        note: 'SES does not support direct message retrieval',
      },
    };
  }

  async testConnection(): Promise<boolean> {
    try {
      // Test by getting send quota
      const command = new GetSendQuotaCommand({});
      await this.sesClient.send(command);
      return true;
    } catch (_error) {
      return false;
    }
  }

  async validateConfig(): Promise<void> {
    if (!this.config.credentials.apiKey) {
      throw new Error('AWS Access Key ID is required');
    }

    if (!this.config.credentials.apiSecret) {
      throw new Error('AWS Secret Access Key is required');
    }

    // Test connection
    const isValid = await this.testConnection();
    if (!isValid) {
      throw new Error('Failed to connect to SES - check credentials and region');
    }
  }
}
