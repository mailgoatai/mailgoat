/**
 * Custom SMTP Relay Provider
 *
 * Sends emails through any SMTP server using nodemailer
 */

import { RelayProvider, RelayConfig } from './relay-provider.interface';
import { SendMessageParams, SendMessageResponse, MessageDetails } from '../mail-provider.interface';
import * as nodemailer from 'nodemailer';

export class CustomSMTPProvider extends RelayProvider {
  private transporter: nodemailer.Transporter;

  constructor(config: RelayConfig) {
    super(config);

    if (!config.credentials.smtp) {
      throw new Error('SMTP configuration is required');
    }

    const smtp = config.credentials.smtp;

    if (!smtp.host) {
      throw new Error('SMTP host is required');
    }

    if (!smtp.port) {
      throw new Error('SMTP port is required');
    }

    this.transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure !== false, // Default to true
      auth: smtp.auth
        ? {
            user: smtp.auth.user,
            pass: smtp.auth.pass,
          }
        : undefined,
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
          'X-Tag': params.tag,
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
          provider: 'custom-smtp',
          response: result.response,
          accepted: result.accepted,
          rejected: result.rejected,
        },
      };
    } catch (_error) {
      throw new Error(`SMTP send error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getMessage(id: string): Promise<MessageDetails> {
    // SMTP doesn't provide message retrieval
    return {
      id,
      metadata: {
        provider: 'custom-smtp',
        note: 'SMTP does not support message retrieval',
      },
    };
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (_error) {
      return false;
    }
  }

  async validateConfig(): Promise<void> {
    if (!this.config.credentials.smtp) {
      throw new Error('SMTP configuration is required');
    }

    const smtp = this.config.credentials.smtp;

    if (!smtp.host) {
      throw new Error('SMTP host is required');
    }

    if (!smtp.port) {
      throw new Error('SMTP port is required');
    }

    // Test connection
    const isValid = await this.testConnection();
    if (!isValid) {
      throw new Error('Failed to connect to SMTP server - check host, port, and credentials');
    }
  }
}
