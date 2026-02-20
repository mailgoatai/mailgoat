import { ProviderFactory } from '../provider-factory';
import { SMTPProvider } from '../smtp';

describe('ProviderFactory', () => {
  it('creates SMTP provider from mailgoat config', () => {
    const provider = ProviderFactory.createFromConfig({
      provider: 'smtp',
      server: 'https://unused.example.com',
      fromAddress: 'sender@example.com',
      api_key: 'unused-api-key-for-smtp',
      smtp: {
        host: 'smtp.example.com',
        port: 587,
        secure: false,
        auth: { user: 'user', pass: 'pass' },
        from: 'sender@example.com',
      },
    });

    expect(provider).toBeInstanceOf(SMTPProvider);
  });
});
