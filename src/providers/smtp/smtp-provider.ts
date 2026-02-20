import nodemailer, { type Transporter } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import {
  IMailProvider,
  MessageDetails,
  SendMessageParams,
  SendMessageResponse,
  ProviderOptions,
} from '../mail-provider.interface';

export interface SMTPProviderConfig {
  host: string;
  port: number;
  secure?: boolean;
  requireTLS?: boolean;
  pool?: boolean;
  maxConnections?: number;
  maxMessages?: number;
  auth?: {
    user: string;
    pass: string;
  };
  from?: string;
}

export class SMTPProvider implements IMailProvider {
  private readonly transporter: Transporter;
  private readonly config: SMTPProviderConfig;

  constructor(config: SMTPProviderConfig, options?: ProviderOptions) {
    this.config = config;
    const transportOptions: SMTPTransport.Options & {
      pool?: boolean;
      maxConnections?: number;
      maxMessages?: number;
    } = {
      host: config.host,
      port: config.port,
      secure: Boolean(config.secure),
      requireTLS: Boolean(config.requireTLS),
      pool: config.pool ?? true,
      maxConnections: config.maxConnections ?? 5,
      maxMessages: config.maxMessages ?? 100,
      auth: config.auth,
      connectionTimeout: options?.timeout,
      greetingTimeout: options?.timeout,
      socketTimeout: options?.timeout,
    };
    this.transporter = nodemailer.createTransport(transportOptions);
  }

  async sendMessage(params: SendMessageParams): Promise<SendMessageResponse> {
    try {
      const info = await this.transporter.sendMail({
        from: params.from || this.config.from || this.config.auth?.user,
        to: params.to,
        cc: params.cc,
        bcc: params.bcc,
        replyTo: params.reply_to,
        subject: params.subject,
        text: params.plain_body,
        html: params.html_body,
        headers: params.headers,
        attachments: params.attachments?.map((attachment) => ({
          filename: attachment.name,
          contentType: attachment.content_type,
          content: attachment.data,
          encoding: 'base64',
        })),
      });

      return {
        message_id: info.messageId || `smtp-${Date.now()}`,
        metadata: {
          accepted: info.accepted,
          rejected: info.rejected,
          response: info.response,
          envelope: info.envelope,
        },
      };
    } catch (error: any) {
      const code = String(error?.code || '');
      const authFailure =
        ['EAUTH', '535', '534'].includes(code) || /auth/i.test(String(error?.message || ''));
      const wrapped = new Error(
        authFailure
          ? `SMTP authentication failed: ${error?.message || 'unknown error'}`
          : `SMTP send failed: ${error?.message || 'unknown error'}`
      );
      (wrapped as any).code = error?.code;
      (wrapped as any).cause = error;
      throw wrapped;
    }
  }

  async getMessage(_id: string): Promise<MessageDetails> {
    throw new Error('SMTP provider does not support reading message details by ID.');
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch {
      return false;
    }
  }
}
