/**
 * Mock Postal Server Helpers
 * Utilities for mocking Postal API responses in integration tests
 */

import nock from 'nock';

export interface MockPostalConfig {
  serverUrl: string;
  apiKey: string;
}

export interface MockMessageResponse {
  message_id: string;
  messages: Record<string, { id: number; token: string }>;
}

export interface MockMessageDetails {
  id: number;
  token: string;
  status?: {
    status: string;
    last_delivery_attempt?: number;
    held: boolean;
    hold_expiry?: number;
  };
  details?: {
    rcpt_to: string;
    mail_from: string;
    subject: string;
    message_id: string;
    timestamp: number;
    direction: string;
    size: number;
    bounce: boolean;
    tag?: string;
  };
  plain_body?: string;
  html_body?: string;
}

/**
 * Create a mock Postal server instance
 */
export class MockPostalServer {
  private scope: nock.Scope;
  private config: MockPostalConfig;

  constructor(config: MockPostalConfig) {
    this.config = config;
    this.scope = nock(config.serverUrl, {
      reqheaders: {
        'x-server-api-key': config.apiKey,
      },
    });
  }

  /**
   * Mock successful send message response
   */
  mockSendSuccess(recipients: string[], messageId = 'test-message-id'): this {
    const messages: Record<string, { id: number; token: string }> = {};
    recipients.forEach((email, index) => {
      messages[email] = {
        id: 1000 + index,
        token: `token-${index}`,
      };
    });

    this.scope.post('/api/v1/send/message').reply(200, {
      status: 'success',
      time: Date.now() / 1000,
      data: {
        message_id: messageId,
        messages,
      },
    });

    return this;
  }

  /**
   * Mock send message with authentication error
   */
  mockSendAuthError(): this {
    this.scope.post('/api/v1/send/message').reply(401, {
      status: 'error',
      time: Date.now() / 1000,
      data: {
        code: 'Unauthorized',
        message: 'Invalid API key',
      },
    });

    return this;
  }

  /**
   * Mock send message with validation error
   */
  mockSendValidationError(code: string, message: string): this {
    this.scope.post('/api/v1/send/message').reply(400, {
      status: 'error',
      time: Date.now() / 1000,
      data: {
        code,
        message,
      },
    });

    return this;
  }

  /**
   * Mock send message with rate limit error
   */
  mockSendRateLimitError(): this {
    this.scope
      .post('/api/v1/send/message')
      .reply(429, {
        status: 'error',
        time: Date.now() / 1000,
        data: {
          code: 'RateLimitExceeded',
          message: 'Too many requests',
        },
      })
      .persist(false); // Only fail once, then allow retry

    return this;
  }

  /**
   * Mock send message with server error (for retry testing)
   */
  mockSendServerError(times = 1): this {
    for (let i = 0; i < times; i++) {
      this.scope.post('/api/v1/send/message').reply(500, {
        status: 'error',
        time: Date.now() / 1000,
        data: {
          code: 'InternalServerError',
          message: 'Server error',
        },
      });
    }

    return this;
  }

  /**
   * Mock send message with network timeout
   */
  mockSendTimeout(): this {
    this.scope.post('/api/v1/send/message').replyWithError({
      code: 'ETIMEDOUT',
      message: 'Connection timeout',
    });

    return this;
  }

  /**
   * Mock send message with connection refused
   */
  mockSendConnectionRefused(): this {
    this.scope.post('/api/v1/send/message').replyWithError({
      code: 'ECONNREFUSED',
      message: 'Connection refused',
    });

    return this;
  }

  /**
   * Mock get message details
   */
  mockGetMessage(messageId: string, details: Partial<MockMessageDetails>): this {
    const defaultDetails: MockMessageDetails = {
      id: 1000,
      token: 'test-token',
      status: {
        status: 'sent',
        held: false,
      },
      details: {
        rcpt_to: 'recipient@example.com',
        mail_from: 'sender@example.com',
        subject: 'Test Subject',
        message_id: messageId,
        timestamp: Date.now() / 1000,
        direction: 'outgoing',
        size: 1024,
        bounce: false,
      },
      plain_body: 'Test body',
      ...details,
    };

    this.scope.post('/api/v1/messages/message').reply(200, {
      status: 'success',
      time: Date.now() / 1000,
      data: defaultDetails,
    });

    return this;
  }

  /**
   * Mock get message - not found
   */
  mockGetMessageNotFound(messageId: string): this {
    this.scope.post('/api/v1/messages/message').reply(404, {
      status: 'error',
      time: Date.now() / 1000,
      data: {
        code: 'MessageNotFound',
        message: `Message ${messageId} not found`,
      },
    });

    return this;
  }

  /**
   * Mock get deliveries
   */
  mockGetDeliveries(messageId: string, deliveries: any[] = []): this {
    const defaultDeliveries = deliveries.length
      ? deliveries
      : [
          {
            id: 1,
            status: 'Sent',
            details: 'Message delivered successfully',
            output: 'OK',
            sent_with_ssl: true,
            log_id: 'log-123',
            time: Date.now() / 1000,
          },
        ];

    this.scope.post('/api/v1/messages/deliveries').reply(200, {
      status: 'success',
      time: Date.now() / 1000,
      data: defaultDeliveries,
    });

    return this;
  }

  /**
   * Mock successful message deletion
   */
  mockDeleteSuccess(messageId: string): this {
    this.scope.post('/api/v1/messages/delete').reply(200, {
      status: 'success',
      time: Date.now() / 1000,
      data: {
        success: true,
        message_id: messageId,
      },
    });

    return this;
  }

  /**
   * Mock delete message - not found
   */
  mockDeleteNotFound(messageId: string): this {
    this.scope.post('/api/v1/messages/delete').reply(404, {
      status: 'error',
      time: Date.now() / 1000,
      data: {
        code: 'MessageNotFound',
        message: `Message ${messageId} not found`,
      },
    });

    return this;
  }

  /**
   * Mock delete with authentication error
   */
  mockDeleteAuthError(): this {
    this.scope.post('/api/v1/messages/delete').reply(401, {
      status: 'error',
      time: Date.now() / 1000,
      data: {
        code: 'Unauthorized',
        message: 'Invalid API key',
      },
    });

    return this;
  }

  /**
   * Mock delete with validation error
   */
  mockDeleteValidationError(code: string, message: string): this {
    this.scope.post('/api/v1/messages/delete').reply(400, {
      status: 'error',
      time: Date.now() / 1000,
      data: {
        code,
        message,
      },
    });

    return this;
  }

  /**
   * Mock delete with server error
   */
  mockDeleteServerError(): this {
    this.scope.post('/api/v1/messages/delete').reply(500, {
      status: 'error',
      time: Date.now() / 1000,
      data: {
        code: 'InternalServerError',
        message: 'Server error',
      },
    });

    return this;
  }

  /**
   * Mock delete with rate limit error
   */
  mockDeleteRateLimitError(): this {
    this.scope
      .post('/api/v1/messages/delete')
      .reply(429, {
        status: 'error',
        time: Date.now() / 1000,
        data: {
          code: 'RateLimitExceeded',
          message: 'Too many requests',
        },
      })
      .persist(false);

    return this;
  }

  /**
   * Mock delete with network timeout
   */
  mockDeleteTimeout(): this {
    this.scope.post('/api/v1/messages/delete').replyWithError({
      code: 'ETIMEDOUT',
      message: 'Connection timeout',
    });

    return this;
  }

  /**
   * Verify all mocked endpoints were called
   */
  verify(): void {
    if (!this.scope.isDone()) {
      throw new Error('Not all mocked endpoints were called');
    }
  }

  /**
   * Clean up this mock server
   */
  cleanup(): void {
    nock.cleanAll();
  }
}

/**
 * Create a mock Postal server with default config
 */
export function createMockPostalServer(config: Partial<MockPostalConfig> = {}): MockPostalServer {
  const defaultConfig: MockPostalConfig = {
    serverUrl: 'https://postal.example.com',
    apiKey: 'test-api-key',
    ...config,
  };

  return new MockPostalServer(defaultConfig);
}

/**
 * Generate a random message ID
 */
export function generateMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

/**
 * Generate a random token
 */
export function generateToken(): string {
  return `token-${Math.random().toString(36).substring(2, 15)}`;
}
