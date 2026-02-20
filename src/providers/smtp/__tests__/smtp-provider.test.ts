import nodemailer from 'nodemailer';
import { SMTPProvider } from '../smtp-provider';

jest.mock('nodemailer', () => ({
  __esModule: true,
  default: {
    createTransport: jest.fn(),
  },
}));

describe('SMTPProvider', () => {
  it('sends message via nodemailer transporter', async () => {
    const sendMail = jest.fn().mockResolvedValue({
      messageId: '<msg-123@example.com>',
      accepted: ['to@example.com'],
      rejected: [],
      response: '250 OK',
      envelope: { from: 'from@example.com', to: ['to@example.com'] },
    });
    const verify = jest.fn().mockResolvedValue(true);
    (nodemailer.createTransport as jest.Mock).mockReturnValue({ sendMail, verify });

    const provider = new SMTPProvider({
      host: 'smtp.example.com',
      port: 587,
      secure: false,
      auth: { user: 'user', pass: 'pass' },
      from: 'from@example.com',
    });

    const result = await provider.sendMessage({
      to: ['to@example.com'],
      subject: 'Hello',
      plain_body: 'Test',
    });

    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(result.message_id).toBe('<msg-123@example.com>');
    expect(result.metadata?.accepted).toEqual(['to@example.com']);
  });

  it('wraps auth failure error with clear message', async () => {
    const sendMail = jest.fn().mockRejectedValue({ code: 'EAUTH', message: 'Invalid login' });
    (nodemailer.createTransport as jest.Mock).mockReturnValue({
      sendMail,
      verify: jest.fn(),
    });

    const provider = new SMTPProvider({
      host: 'smtp.example.com',
      port: 587,
      secure: false,
      auth: { user: 'user', pass: 'pass' },
    });

    await expect(
      provider.sendMessage({
        to: ['to@example.com'],
        subject: 'Hello',
        plain_body: 'Test',
      })
    ).rejects.toThrow('SMTP authentication failed');
  });
});
