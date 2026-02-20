import { ValidationService, validationService } from '../validation-service';

describe('ValidationService', () => {
  const service = new ValidationService();

  it('validates email addresses', () => {
    expect(service.validateEmail('user@example.com').valid).toBe(true);
    expect(service.validateEmail('bad').valid).toBe(false);
  });

  it('validates email arrays and required checks', () => {
    expect(service.validateEmails(['a@b.com']).valid).toBe(true);
    expect(service.validateEmails([]).valid).toBe(false);
  });

  it('accepts URL with implicit protocol and rejects malformed URL', () => {
    expect(service.validateUrl('example.com').valid).toBe(true);
    expect(service.validateUrl('http://').valid).toBe(false);
  });

  it('enforces API key minimum length and allowed chars', () => {
    expect(service.validateApiKey('short').valid).toBe(false);
    expect(service.validateApiKey('valid_key_123').valid).toBe(true);
    expect(service.validateApiKey('bad key 123').valid).toBe(false);
  });

  it('requires non-empty subject and at least one body type', () => {
    expect(service.validateSubject('ok').valid).toBe(true);
    expect(service.validateSubject('').valid).toBe(false);

    expect(service.validateBody('plain').valid).toBe(true);
    expect(service.validateBody(undefined, '<p>x</p>').valid).toBe(true);
    expect(service.validateBody('').valid).toBe(false);
  });

  it('validates tag and file path patterns', () => {
    expect(service.validateTag('valid_tag').valid).toBe(true);
    expect(service.validateTag('bad tag').valid).toBe(false);
    expect(service.validateTag('a'.repeat(101)).valid).toBe(false);

    expect(service.validateFilePath('file.txt').valid).toBe(true);
    expect(service.validateFilePath('file\0.txt').valid).toBe(false);
  });

  it('validates recipient limits and send options', () => {
    expect(service.validateRecipientCount(50, 'to').valid).toBe(true);
    expect(service.validateRecipientCount(51, 'to').valid).toBe(false);

    expect(
      service.validateSendOptions({ to: ['user@example.com'], subject: 's', body: 'b' }).valid
    ).toBe(true);

    expect(service.validateSendOptions({ to: [], subject: 's', body: 'b' }).valid).toBe(false);
    expect(
      service.validateSendOptions({
        to: ['user@example.com'],
        subject: 's',
        body: 'b',
        tag: 'bad tag',
      }).valid
    ).toBe(false);
  });

  it('validates config object and singleton export', () => {
    expect(
      service.validateConfig({
        server: 'postal.example.com',
        email: 'u@example.com',
        api_key: 'apikey1234',
      }).valid
    ).toBe(true);

    expect(
      service.validateConfig({ server: 'http://', email: 'u@example.com', api_key: 'apikey1234' })
        .valid
    ).toBe(false);

    expect(validationService).toBeDefined();
  });

  it('validates mailgun provider config without postal server/api_key', () => {
    expect(
      service.validateConfig({
        provider: 'mailgun',
        server: '',
        api_key: '',
        fromAddress: 'sender@example.com',
        mailgun: {
          apiKey: 'key-1234567890',
          domain: 'mg.example.com',
          region: 'eu',
        },
      }).valid
    ).toBe(true);

    expect(
      service.validateConfig({
        provider: 'mailgun',
        server: '',
        api_key: '',
        fromAddress: 'sender@example.com',
        mailgun: {
          apiKey: '',
          domain: 'mg.example.com',
        },
      }).valid
    ).toBe(false);
  });
});
