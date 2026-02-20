import axios from 'axios';
import { MailgunProvider } from '../mailgun/mailgun-provider';
import { ProviderFactory } from '../provider-factory';

jest.mock('axios');

const mockCreate = jest.fn();
const mockClientFactory = jest.fn(() => ({
  messages: {
    create: mockCreate,
  },
}));

jest.mock('mailgun.js', () => {
  return jest.fn().mockImplementation(() => ({
    client: mockClientFactory,
  }));
});

describe('MailgunProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sends messages with expected payload', async () => {
    mockCreate.mockResolvedValueOnce({ id: '<mailgun-id@example.com>' });
    const provider = new MailgunProvider({
      apiKey: 'key-1234567890',
      domain: 'mg.example.com',
      region: 'us',
      fromAddress: 'from@example.com',
    });

    const result = await provider.sendMessage({
      to: ['to@example.com'],
      subject: 'Hello',
      plain_body: 'Body',
      tag: 'welcome',
    });

    expect(mockCreate).toHaveBeenCalledWith(
      'mg.example.com',
      expect.objectContaining({
        from: 'from@example.com',
        to: ['to@example.com'],
        subject: 'Hello',
        text: 'Body',
        'o:tag': 'welcome',
      })
    );
    expect(result.message_id).toEqual('<mailgun-id@example.com>');
  });

  it('fetches message details from Mailgun events API', async () => {
    (axios.get as jest.Mock).mockResolvedValueOnce({
      data: {
        items: [
          {
            event: 'accepted',
            recipient: 'to@example.com',
            timestamp: 1700000000,
            message: {
              headers: {
                from: 'from@example.com',
                subject: 'Subject',
                'message-id': '<mailgun-id@example.com>',
              },
            },
          },
        ],
      },
    });

    const provider = new MailgunProvider({
      apiKey: 'key-1234567890',
      domain: 'mg.example.com',
    });

    const details = await provider.getMessage('<mailgun-id@example.com>');

    expect(details.status?.status).toBe('accepted');
    expect(details.details?.rcpt_to).toBe('to@example.com');
    expect(details.details?.subject).toBe('Subject');
  });

  it('throws when getMessage returns no events', async () => {
    (axios.get as jest.Mock).mockResolvedValueOnce({ data: { items: [] } });
    const provider = new MailgunProvider({
      apiKey: 'key-1234567890',
      domain: 'mg.example.com',
    });
    await expect(provider.getMessage('missing')).rejects.toThrow('Mailgun message not found');
  });

  it('tests connection via Mailgun domains endpoint', async () => {
    (axios.get as jest.Mock).mockResolvedValueOnce({ data: {} });
    const provider = new MailgunProvider({
      apiKey: 'key-1234567890',
      domain: 'mg.example.com',
    });
    await expect(provider.testConnection()).resolves.toBe(true);
  });

  it('factory creates mailgun provider from config block', () => {
    const provider = ProviderFactory.create('mailgun', {
      provider: 'mailgun',
      mailgun: {
        apiKey: 'key-1234567890',
        domain: 'mg.example.com',
      },
      fromAddress: 'from@example.com',
      fromName: 'Mailer',
      server: 'https://postal.example.com',
      api_key: 'postal_key_123456',
    });

    expect(provider).toBeInstanceOf(MailgunProvider);
  });
});
