/**
 * Logger Unit Tests
 *
 * Tests for Winston structured logging.
 */

import * as fs from 'fs';

// Mock fs
jest.mock('fs');
const mockedFs = fs as jest.Mocked<typeof fs>;

// Mock winston
jest.mock('winston', () => {
  const mockTransports = {
    File: jest.fn(),
    Console: jest.fn(),
  };

  const mockLogger = {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    log: jest.fn(),
    add: jest.fn(),
  };

  const mockFormat = {
    combine: jest.fn((...args) => args),
    colorize: jest.fn(),
    timestamp: jest.fn(),
    errors: jest.fn(),
    json: jest.fn(),
    printf: jest.fn(),
    simple: jest.fn(),
  };

  return {
    createLogger: jest.fn(() => mockLogger),
    transports: mockTransports,
    format: mockFormat,
  };
});

import winston from 'winston';
import {
  logger,
  logError,
  logOperationStart,
  logOperationSuccess,
  logOperationFailure,
  createTimer,
  logApiRequest,
  logApiResponse,
  logConfigChange,
  logEmailEvent,
  logValidationError,
  logCacheEvent,
  getLogDir,
  getLogFiles,
} from '../logger';

describe('Logger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedFs.existsSync.mockReturnValue(true);
  });

  describe('logger instance', () => {
    it('should create Winston logger', () => {
      expect(winston.createLogger).toHaveBeenCalled();
    });

    it('should configure file transports', () => {
      expect(winston.transports.File).toHaveBeenCalledTimes(2);
    });

    it('should use LOG_LEVEL environment variable', () => {
      const createLoggerCall = (winston.createLogger as jest.Mock).mock.calls[0][0];
      expect(createLoggerCall.level).toBeDefined();
    });
  });

  describe('logError', () => {
    it('should log error with stack trace', () => {
      const error = new Error('Test error');
      logError('Operation failed', error);

      expect(logger.error).toHaveBeenCalledWith(
        'Operation failed',
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Test error',
            stack: expect.any(String),
            name: 'Error',
          }),
        })
      );
    });

    it('should log error with metadata', () => {
      const error = new Error('Test error');
      logError('Operation failed', error, { userId: 123, operation: 'test' });

      expect(logger.error).toHaveBeenCalledWith(
        'Operation failed',
        expect.objectContaining({
          userId: 123,
          operation: 'test',
        })
      );
    });

    it('should handle non-Error objects', () => {
      logError('Operation failed', 'string error');

      expect(logger.error).toHaveBeenCalledWith(
        'Operation failed',
        expect.objectContaining({
          error: 'string error',
        })
      );
    });
  });

  describe('operation logging', () => {
    it('should log operation start', () => {
      logOperationStart('email.send', { to: 'user@example.com' });

      expect(logger.info).toHaveBeenCalledWith('email.send.start', { to: 'user@example.com' });
    });

    it('should log operation success', () => {
      logOperationSuccess('email.send', 1234, { messageId: 'msg_123' });

      expect(logger.info).toHaveBeenCalledWith(
        'email.send.success',
        expect.objectContaining({
          duration_ms: 1234,
          messageId: 'msg_123',
        })
      );
    });

    it('should log operation success without duration', () => {
      logOperationSuccess('email.send', undefined, { messageId: 'msg_123' });

      expect(logger.info).toHaveBeenCalledWith(
        'email.send.success',
        expect.objectContaining({
          messageId: 'msg_123',
        })
      );
    });

    it('should log operation failure with Error', () => {
      const error = new Error('Send failed');
      logOperationFailure('email.send', error, 5000, { to: 'user@example.com' });

      expect(logger.error).toHaveBeenCalledWith(
        'email.send.failure',
        expect.objectContaining({
          duration_ms: 5000,
          to: 'user@example.com',
          error: expect.objectContaining({
            message: 'Send failed',
          }),
        })
      );
    });

    it('should log operation failure with non-Error', () => {
      logOperationFailure('email.send', 'failure reason', 5000);

      expect(logger.error).toHaveBeenCalledWith(
        'email.send.failure',
        expect.objectContaining({
          error: 'failure reason',
        })
      );
    });
  });

  describe('createTimer', () => {
    it('should measure elapsed time', () => {
      const timer = createTimer();

      // Wait a bit
      const start = Date.now();
      while (Date.now() - start < 10) {
        // busy wait
      }

      const duration = timer();
      expect(duration).toBeGreaterThanOrEqual(10);
      expect(duration).toBeLessThan(100);
    });

    it('should return different values on multiple calls', () => {
      const timer = createTimer();

      const duration1 = timer();

      // Wait
      const start = Date.now();
      while (Date.now() - start < 5) {
        // busy wait
      }

      const duration2 = timer();
      expect(duration2).toBeGreaterThan(duration1);
    });
  });

  describe('API logging', () => {
    it('should log API request', () => {
      logApiRequest('POST', 'https://api.example.com/send', { body: { test: true } });

      expect(logger.debug).toHaveBeenCalledWith(
        'api.request',
        expect.objectContaining({
          method: 'POST',
          url: 'https://api.example.com/send',
          body: { test: true },
        })
      );
    });

    it('should log API response with success status', () => {
      logApiResponse('POST', 'https://api.example.com/send', 200, 1234, { messageId: 'msg_123' });

      expect(logger.log).toHaveBeenCalledWith(
        'debug',
        'api.response',
        expect.objectContaining({
          method: 'POST',
          status: 200,
          duration_ms: 1234,
        })
      );
    });

    it('should log API response with error status as warning', () => {
      logApiResponse('POST', 'https://api.example.com/send', 500, 2000);

      expect(logger.log).toHaveBeenCalledWith(
        'warn',
        'api.response',
        expect.objectContaining({
          status: 500,
          duration_ms: 2000,
        })
      );
    });
  });

  describe('config logging', () => {
    it('should log config change', () => {
      logConfigChange('profile.create', { profile: 'staging' });

      expect(logger.info).toHaveBeenCalledWith(
        'config.change',
        expect.objectContaining({
          operation: 'profile.create',
          profile: 'staging',
        })
      );
    });
  });

  describe('email logging', () => {
    it('should log email send', () => {
      logEmailEvent('send', { to: 'user@example.com', subject: 'Hello' });

      expect(logger.info).toHaveBeenCalledWith('email.send', {
        to: 'user@example.com',
        subject: 'Hello',
      });
    });

    it('should log email receive', () => {
      logEmailEvent('receive', { from: 'sender@example.com', messageId: 'msg_123' });

      expect(logger.info).toHaveBeenCalledWith('email.receive', {
        from: 'sender@example.com',
        messageId: 'msg_123',
      });
    });

    it('should log email delete', () => {
      logEmailEvent('delete', { messageId: 'msg_123' });

      expect(logger.info).toHaveBeenCalledWith('email.delete', { messageId: 'msg_123' });
    });

    it('should log email search', () => {
      logEmailEvent('search', { query: 'test', results: 5 });

      expect(logger.info).toHaveBeenCalledWith('email.search', { query: 'test', results: 5 });
    });
  });

  describe('validation logging', () => {
    it('should log validation error', () => {
      logValidationError('email', 'Invalid email format', { value: 'not-an-email' });

      expect(logger.warn).toHaveBeenCalledWith(
        'validation.error',
        expect.objectContaining({
          field: 'email',
          error: 'Invalid email format',
          value: 'not-an-email',
        })
      );
    });
  });

  describe('cache logging', () => {
    it('should log cache hit', () => {
      logCacheEvent('hit', 'config:default', { ttl: 300 });

      expect(logger.debug).toHaveBeenCalledWith(
        'cache.hit',
        expect.objectContaining({
          key: 'config:default',
          ttl: 300,
        })
      );
    });

    it('should log cache miss', () => {
      logCacheEvent('miss', 'config:staging');

      expect(logger.debug).toHaveBeenCalledWith('cache.miss', { key: 'config:staging' });
    });

    it('should log cache set', () => {
      logCacheEvent('set', 'config:default', { value: 'data' });

      expect(logger.debug).toHaveBeenCalledWith('cache.set', {
        key: 'config:default',
        value: 'data',
      });
    });

    it('should log cache invalidate', () => {
      logCacheEvent('invalidate', 'config:default');

      expect(logger.debug).toHaveBeenCalledWith('cache.invalidate', { key: 'config:default' });
    });
  });

  describe('utility functions', () => {
    it('should return log directory', () => {
      const dir = getLogDir();
      expect(dir).toContain('.mailgoat');
      expect(dir).toContain('logs');
    });

    it('should return log file paths', () => {
      const files = getLogFiles();
      expect(files.error).toContain('error.log');
      expect(files.combined).toContain('combined.log');
    });
  });

  describe('directory creation', () => {
    it('should create log directory if it does not exist', () => {
      mockedFs.existsSync.mockReturnValue(false);

      // Re-import to trigger directory creation
      jest.resetModules();
      mockedFs.existsSync.mockReturnValue(false);

      require('../logger');

      expect(mockedFs.mkdirSync).toHaveBeenCalled();
    });
  });
});
