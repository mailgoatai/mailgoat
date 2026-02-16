/**
 * Formatter Unit Tests
 *
 * Tests for output formatting utilities.
 */

import { Formatter } from '../formatter';
import type { MessageDetails } from '../postal-client';

// Mock chalk to avoid color codes in tests
jest.mock('chalk', () => ({
  green: jest.fn((str) => str),
  red: jest.fn((str) => str),
  yellow: jest.fn((str) => str),
  cyan: jest.fn((str) => str),
  bold: {
    underline: jest.fn((str) => str),
  },
}));

describe('Formatter', () => {
  let formatter: Formatter;
  let jsonFormatter: Formatter;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    formatter = new Formatter(false);
    jsonFormatter = new Formatter(true);
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe('constructor', () => {
    it('should create formatter in human-readable mode by default', () => {
      const defaultFormatter = new Formatter();
      const result = defaultFormatter.success('Test');
      expect(result).toContain('Test');
    });

    it('should create formatter in JSON mode when requested', () => {
      const result = jsonFormatter.success('Test');
      expect(result).toContain('"status"');
      expect(result).toContain('"message"');
    });
  });

  describe('output', () => {
    it('should output data in human-readable mode', () => {
      formatter.output('Hello World');
      expect(consoleLogSpy).toHaveBeenCalledWith('Hello World');
    });

    it('should output data as JSON in JSON mode', () => {
      const data = { message: 'Hello' };
      jsonFormatter.output(data);
      expect(consoleLogSpy).toHaveBeenCalledWith(JSON.stringify(data, null, 2));
    });
  });

  describe('success', () => {
    it('should format success message in human-readable mode', () => {
      const result = formatter.success('Operation successful');
      expect(result).toContain('Operation successful');
    });

    it('should format success message as JSON in JSON mode', () => {
      const result = jsonFormatter.success('Operation successful');
      const parsed = JSON.parse(result);
      expect(parsed.status).toBe('success');
      expect(parsed.message).toBe('Operation successful');
    });
  });

  describe('error', () => {
    it('should format error message in human-readable mode', () => {
      const result = formatter.error('Something went wrong');
      expect(result).toContain('Something went wrong');
    });

    it('should format error message as JSON in JSON mode', () => {
      const result = jsonFormatter.error('Something went wrong');
      const parsed = JSON.parse(result);
      expect(parsed.status).toBe('error');
      expect(parsed.message).toBe('Something went wrong');
    });
  });

  describe('formatSendResponse', () => {
    const sendData = {
      message_id: 'msg_abc123',
      messages: {
        'recipient1@example.com': { id: 1, token: 'token1' },
        'recipient2@example.com': { id: 2, token: 'token2' },
      },
    };

    it('should format send response in human-readable mode', () => {
      const result = formatter.formatSendResponse(sendData);
      expect(typeof result).toBe('string');
      expect(result).toContain('Message sent successfully');
      expect(result).toContain('msg_abc123');
      expect(result).toContain('2'); // recipient count
    });

    it('should return raw data in JSON mode', () => {
      const result = jsonFormatter.formatSendResponse(sendData);
      expect(result).toEqual(sendData);
    });
  });

  describe('formatInboxList', () => {
    const mockMessages: MessageDetails[] = [
      {
        id: 1,
        details: {
          message_id: 'msg_1',
          mail_from: 'sender1@example.com',
          rcpt_to: 'recipient@example.com',
          subject: 'Test Subject 1',
          timestamp: 1704067200, // Jan 1, 2024
          size: 1024,
        },
        status: {
          status: 'Sent',
          held: false,
          last_delivery_attempt: 1704067200,
        },
      },
      {
        id: 2,
        details: {
          message_id: 'msg_2',
          mail_from: 'sender2@example.com',
          rcpt_to: 'recipient@example.com',
          subject: 'Test Subject 2',
          timestamp: 1704070800,
          size: 2048,
        },
        status: {
          status: 'Pending',
          held: false,
          last_delivery_attempt: 1704070800,
        },
      },
    ];

    it('should format message list in human-readable mode', () => {
      const result = formatter.formatInboxList(mockMessages);
      expect(typeof result).toBe('string');
      expect(result).toContain('msg_1');
      expect(result).toContain('msg_2');
      expect(result).toContain('Test Subject 1');
      expect(result).toContain('Test Subject 2');
    });

    it('should return raw data in JSON mode', () => {
      const result = jsonFormatter.formatInboxList(mockMessages);
      expect(result).toEqual(mockMessages);
    });

    it('should handle empty message list', () => {
      const result = formatter.formatInboxList([]);
      expect(result).toContain('No messages');
    });
  });

  describe('formatMessage', () => {
    const mockMessage: MessageDetails = {
      id: 1,
      details: {
        message_id: 'msg_abc123',
        mail_from: 'sender@example.com',
        rcpt_to: 'recipient@example.com',
        subject: 'Test Email',
        timestamp: 1704067200,
        size: 5120,
        tag: 'newsletter',
      },
      status: {
        status: 'Sent',
        held: false,
        last_delivery_attempt: 1704067200,
      },
      inspection: {
        spam: false,
        spam_score: 0.1,
        threat: false,
      },
      plain_body: 'This is the email body content.',
      attachments: [
        {
          filename: 'document.pdf',
          content_type: 'application/pdf',
          size: 10240,
        },
      ],
    };

    it('should format message details in human-readable mode', () => {
      const result = formatter.formatMessage(mockMessage);
      expect(typeof result).toBe('string');
      expect(result).toContain('Message Details');
      expect(result).toContain('msg_abc123');
      expect(result).toContain('sender@example.com');
      expect(result).toContain('recipient@example.com');
      expect(result).toContain('Test Email');
      expect(result).toContain('newsletter');
      expect(result).toContain('This is the email body content.');
    });

    it('should include attachment information', () => {
      const result = formatter.formatMessage(mockMessage);
      expect(result).toContain('Attachments');
      expect(result).toContain('document.pdf');
      expect(result).toContain('application/pdf');
    });

    it('should show spam status when detected', () => {
      const spamMessage = {
        ...mockMessage,
        inspection: {
          spam: true,
          spam_score: 8.5,
          threat: false,
        },
      };

      const result = formatter.formatMessage(spamMessage);
      expect(result).toContain('SPAM');
      expect(result).toContain('8.5');
    });

    it('should show threat status when detected', () => {
      const threatMessage = {
        ...mockMessage,
        inspection: {
          spam: false,
          spam_score: 0.1,
          threat: true,
          threat_details: 'Malicious attachment detected',
        },
      };

      const result = formatter.formatMessage(threatMessage);
      expect(result).toContain('THREAT');
      expect(result).toContain('Malicious attachment detected');
    });

    it('should show held status', () => {
      const heldMessage = {
        ...mockMessage,
        status: {
          status: 'Held',
          held: true,
          last_delivery_attempt: 1704067200,
        },
      };

      const result = formatter.formatMessage(heldMessage);
      expect(result).toContain('held');
    });

    it('should return raw data in JSON mode', () => {
      const result = jsonFormatter.formatMessage(mockMessage);
      expect(result).toEqual(mockMessage);
    });

    it('should handle message without optional fields', () => {
      const minimalMessage: MessageDetails = {
        id: 1,
        details: {
          message_id: 'msg_minimal',
          mail_from: 'sender@example.com',
          rcpt_to: 'recipient@example.com',
          subject: 'Minimal',
          timestamp: 1704067200,
          size: 100,
        },
      };

      const result = formatter.formatMessage(minimalMessage);
      expect(result).toContain('msg_minimal');
    });
  });

  describe('formatBytes', () => {
    it('should format bytes correctly', () => {
      // Access private method through message formatting
      const message: MessageDetails = {
        id: 1,
        details: {
          message_id: 'msg_1',
          mail_from: 'sender@example.com',
          rcpt_to: 'recipient@example.com',
          subject: 'Test',
          timestamp: 1704067200,
          size: 1024,
        },
      };

      const result = formatter.formatMessage(message);
      expect(result).toContain('1 KB');
    });

    it('should handle zero bytes', () => {
      const message: MessageDetails = {
        id: 1,
        details: {
          message_id: 'msg_1',
          mail_from: 'sender@example.com',
          rcpt_to: 'recipient@example.com',
          subject: 'Test',
          timestamp: 1704067200,
          size: 0,
        },
      };

      const result = formatter.formatMessage(message);
      expect(result).toContain('0 Bytes');
    });

    it('should format megabytes', () => {
      const message: MessageDetails = {
        id: 1,
        details: {
          message_id: 'msg_1',
          mail_from: 'sender@example.com',
          rcpt_to: 'recipient@example.com',
          subject: 'Test',
          timestamp: 1704067200,
          size: 1048576, // 1 MB
        },
      };

      const result = formatter.formatMessage(message);
      expect(result).toContain('1 MB');
    });
  });
});
