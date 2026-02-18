import { Formatter } from '../formatter';
import type { MessageDetails } from '../postal-client';

jest.mock('chalk', () => {
  const boldFn = ((str: string) => str) as any;
  boldFn.underline = (str: string) => str;

  return {
    __esModule: true,
    default: {
      green: (str: string) => str,
      red: (str: string) => str,
      yellow: (str: string) => str,
      cyan: (str: string) => str,
      bold: boldFn,
    },
  };
});

describe('Formatter', () => {
  const message: MessageDetails = {
    id: 1,
    token: 'tok',
    details: {
      rcpt_to: 'to@example.com',
      mail_from: 'from@example.com',
      subject: 'Subject',
      message_id: 'msg-1',
      timestamp: 1700000000,
      direction: 'incoming',
      size: 100,
      bounce: false,
      received_with_ssl: true,
    },
    status: { status: 'Sent', held: false },
    plain_body: 'body',
  };

  it('formats output in text and json mode', () => {
    const text = new Formatter(false);
    const json = new Formatter(true);

    expect(text.success('ok')).toContain('ok');
    expect(text.error('bad')).toContain('bad');
    expect(() => JSON.parse(json.success('ok'))).not.toThrow();
    expect(() => JSON.parse(json.error('bad'))).not.toThrow();
  });

  it('formats inbox list', () => {
    const formatter = new Formatter(false);
    const output = formatter.formatInboxList([message]);
    expect(typeof output).toBe('string');
    expect(output).toContain('msg-1');
    expect(output).toContain('Subject');
  });

  it('formats full message details', () => {
    const formatter = new Formatter(false);
    const output = formatter.formatMessage({
      ...message,
      inspection: { inspected: true, spam: true, spam_score: 7.5, threat: false },
      attachments: [
        {
          filename: 'a.txt',
          content_type: 'text/plain',
          data: 'ZA==',
          size: 1,
          hash: 'h',
        },
      ],
    });

    expect(typeof output).toBe('string');
    expect(output).toContain('Message Details');
    expect(output).toContain('from@example.com');
    expect(output).toContain('a.txt');
    expect(output).toContain('SPAM');
  });

  it('returns raw object in json mode', () => {
    const formatter = new Formatter(true);
    expect(formatter.formatMessage(message)).toEqual(message);
  });
});
