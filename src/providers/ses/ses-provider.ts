import {
  SESClient,
  SendEmailCommand,
  SendEmailCommandInput,
  SendEmailCommandOutput,
} from '@aws-sdk/client-ses';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import {
  IMailProvider,
  MessageDetails,
  SendMessageParams,
  SendMessageResponse,
} from '../mail-provider.interface';

export interface SESProviderConfig {
  region: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  sessionToken?: string;
  configurationSetName?: string;
  fromAddress?: string;
}

export class SESProvider implements IMailProvider {
  private readonly client: SESClient;
  private readonly config: SESProviderConfig;

  constructor(config: SESProviderConfig) {
    this.config = config;
    this.client = this.createClient(config);
  }

  async sendMessage(params: SendMessageParams): Promise<SendMessageResponse> {
    if (!params.plain_body && !params.html_body) {
      throw new Error('SES requires either plain_body or html_body');
    }

    if (params.attachments && params.attachments.length > 0) {
      throw new Error('SES SendEmail does not support attachments. Use raw email for attachments.');
    }

    const source = params.from || this.config.fromAddress;
    if (!source) {
      throw new Error('Missing sender address. Provide params.from or ses.fromAddress in config.');
    }

    const input: SendEmailCommandInput = {
      Source: source,
      Destination: {
        ToAddresses: params.to,
        CcAddresses: params.cc,
        BccAddresses: params.bcc,
      },
      ReplyToAddresses: params.reply_to ? [params.reply_to] : undefined,
      Message: {
        Subject: {
          Data: params.subject,
          Charset: 'UTF-8',
        },
        Body: {
          Text: params.plain_body
            ? {
                Data: params.plain_body,
                Charset: 'UTF-8',
              }
            : undefined,
          Html: params.html_body
            ? {
                Data: params.html_body,
                Charset: 'UTF-8',
              }
            : undefined,
        },
      },
      Tags: params.tag ? [{ Name: 'tag', Value: params.tag }] : undefined,
      ConfigurationSetName: this.config.configurationSetName,
    };

    try {
      const output = await this.client.send(new SendEmailCommand(input));
      return this.normalizeSendResponse(output);
    } catch (error) {
      throw this.normalizeSESError(error);
    }
  }

  async getMessage(_id: string): Promise<MessageDetails> {
    throw new Error(
      'SES does not expose message retrieval by MessageId through SendEmail API. ' +
        'Use CloudWatch, event destinations, or SNS for message status tracking.'
    );
  }

  getConfig(): SESProviderConfig {
    return this.config;
  }

  getClient(): SESClient {
    return this.client;
  }

  private createClient(config: SESProviderConfig): SESClient {
    const hasStaticCredentials = Boolean(config.accessKeyId && config.secretAccessKey);
    return new SESClient({
      region: config.region,
      credentials: hasStaticCredentials
        ? {
            accessKeyId: config.accessKeyId as string,
            secretAccessKey: config.secretAccessKey as string,
            sessionToken: config.sessionToken,
          }
        : fromNodeProviderChain(),
    });
  }

  private normalizeSendResponse(output: SendEmailCommandOutput): SendMessageResponse {
    if (!output.MessageId) {
      throw new Error('SES returned no MessageId');
    }

    return {
      message_id: output.MessageId,
      metadata: {
        requestId: output.$metadata.requestId,
        httpStatusCode: output.$metadata.httpStatusCode,
      },
    };
  }

  private normalizeSESError(error: unknown): Error {
    const err = error as { name?: string; message?: string; $metadata?: { requestId?: string } };
    const name = err?.name || 'SESError';
    const requestId = err?.$metadata?.requestId;
    const requestSuffix = requestId ? ` (requestId: ${requestId})` : '';

    if (name === 'MessageRejected') {
      return new Error(
        `SES rejected message${requestSuffix}. ` +
          'Check sandbox status, verified sender/recipient, and account sending limits.'
      );
    }

    if (name === 'MailFromDomainNotVerifiedException') {
      return new Error(`SES sender domain is not verified${requestSuffix}.`);
    }

    if (name === 'ConfigurationSetDoesNotExistException') {
      return new Error(`SES configuration set does not exist${requestSuffix}.`);
    }

    return new Error(`SES error [${name}]${requestSuffix}: ${err?.message || 'Unknown error'}`);
  }
}
