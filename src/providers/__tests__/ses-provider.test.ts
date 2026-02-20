import { SESProvider } from '../ses';
import { ProviderFactory } from '../provider-factory';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';

const mockSend = jest.fn();

jest.mock('@aws-sdk/client-ses', () => ({
  SESClient: jest.fn().mockImplementation(() => ({
    send: mockSend,
  })),
  SendEmailCommand: jest.fn((input: unknown) => ({ input })),
}));

jest.mock('@aws-sdk/credential-providers', () => ({
  fromNodeProviderChain: jest.fn(() => 'mock-chain-credentials'),
}));

describe('SESProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sends email with static credentials', async () => {
    mockSend.mockResolvedValue({
      MessageId: 'ses-msg-123',
      $metadata: { requestId: 'req-1', httpStatusCode: 200 },
    });

    const provider = new SESProvider({
      region: 'us-east-1',
      accessKeyId: 'AKIA_TEST',
      secretAccessKey: 'SECRET_TEST',
      configurationSetName: 'launch-set',
      fromAddress: 'sender@example.com',
    });

    const result = await provider.sendMessage({
      to: ['receiver@example.com'],
      subject: 'Hello',
      plain_body: 'Body',
      tag: 'launch',
    });

    expect(result).toEqual({
      message_id: 'ses-msg-123',
      metadata: { requestId: 'req-1', httpStatusCode: 200 },
    });

    expect(SESClient).toHaveBeenCalledWith(
      expect.objectContaining({
        region: 'us-east-1',
        credentials: expect.objectContaining({
          accessKeyId: 'AKIA_TEST',
          secretAccessKey: 'SECRET_TEST',
        }),
      })
    );

    expect(SendEmailCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        Source: 'sender@example.com',
        ConfigurationSetName: 'launch-set',
        Tags: [{ Name: 'tag', Value: 'launch' }],
      })
    );
  });

  it('uses provider chain credentials when keys are missing', async () => {
    mockSend.mockResolvedValue({
      MessageId: 'ses-msg-456',
      $metadata: {},
    });

    const provider = new SESProvider({
      region: 'us-east-1',
      fromAddress: 'sender@example.com',
    });

    await provider.sendMessage({
      to: ['receiver@example.com'],
      subject: 'IAM Role Test',
      plain_body: 'Body',
    });

    expect(fromNodeProviderChain).toHaveBeenCalledTimes(1);
    expect(SESClient).toHaveBeenCalledWith(
      expect.objectContaining({
        region: 'us-east-1',
        credentials: 'mock-chain-credentials',
      })
    );
  });

  it('rejects attachments for SendEmail API', async () => {
    const provider = new SESProvider({
      region: 'us-east-1',
      fromAddress: 'sender@example.com',
    });

    await expect(
      provider.sendMessage({
        to: ['receiver@example.com'],
        subject: 'Attachment',
        plain_body: 'Body',
        attachments: [{ name: 'a.txt', content_type: 'text/plain', data: 'SGVsbG8=' }],
      })
    ).rejects.toThrow(/does not support attachments/i);
  });

  it('maps MessageRejected to a helpful error', async () => {
    mockSend.mockRejectedValue({
      name: 'MessageRejected',
      message: 'Email address is not verified.',
      $metadata: { requestId: 'req-2' },
    });

    const provider = new SESProvider({
      region: 'us-east-1',
      fromAddress: 'sender@example.com',
    });

    await expect(
      provider.sendMessage({
        to: ['receiver@example.com'],
        subject: 'Rejected',
        plain_body: 'Body',
      })
    ).rejects.toThrow(/sandbox status, verified sender\/recipient/i);
  });

  it('throws unsupported error for getMessage', async () => {
    const provider = new SESProvider({
      region: 'us-east-1',
      fromAddress: 'sender@example.com',
    });

    await expect(provider.getMessage('any-id')).rejects.toThrow(/does not expose message retrieval/i);
  });
});

describe('ProviderFactory SES integration', () => {
  it('creates SES provider and marks it implemented', () => {
    const provider = ProviderFactory.create('ses', {
      region: 'us-east-1',
      fromAddress: 'sender@example.com',
    } as any);

    expect(provider).toBeInstanceOf(SESProvider);
    expect(ProviderFactory.isImplemented('ses')).toBe(true);
  });

  it('creates SES provider from nested config.ses', () => {
    const provider = ProviderFactory.createFromConfig({
      provider: 'ses',
      server: 'https://postal.example.com',
      fromAddress: 'sender@example.com',
      api_key: 'postal-key-for-backward-compat',
      ses: {
        region: 'us-east-1',
        fromAddress: 'sender@example.com',
      },
    } as any);

    expect(provider).toBeInstanceOf(SESProvider);
  });
});
