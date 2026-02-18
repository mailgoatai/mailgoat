import * as fs from 'fs';

jest.mock('fs');
const mockedFs = fs as jest.Mocked<typeof fs>;

jest.mock('winston', () => {
  const mockLogger = {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    log: jest.fn(),
    add: jest.fn(),
    transports: [{ silent: false }],
    level: 'info',
  };

  return {
    __esModule: true,
    default: {
      createLogger: jest.fn(() => mockLogger),
      transports: {
        File: jest.fn(),
        Console: jest.fn(),
      },
      format: {
        combine: jest.fn(() => ({})),
        colorize: jest.fn(() => ({})),
        timestamp: jest.fn(() => ({})),
        errors: jest.fn(() => ({})),
        json: jest.fn(() => ({})),
        printf: jest.fn(() => ({})),
      },
    },
  };
});

import winston from 'winston';
import {
  logger,
  logError,
  logApiResponse,
  logCacheEvent,
  createTimer,
  getLogDir,
  getLogFiles,
  setLogLevel,
  setLoggerSilent,
} from '../logger';

describe('logger', () => {
  beforeEach(() => {
    mockedFs.existsSync.mockReturnValue(true);
    (logger.error as jest.Mock).mockClear();
    (logger.warn as jest.Mock).mockClear();
    (logger.info as jest.Mock).mockClear();
    (logger.debug as jest.Mock).mockClear();
    (logger.log as jest.Mock).mockClear();
  });

  it('initializes winston logger and file transports', () => {
    expect((winston as any).createLogger).toHaveBeenCalled();
    expect((winston as any).transports.File).toHaveBeenCalledTimes(2);
  });

  it('logs structured error', () => {
    logError('failed', new Error('boom'));
    expect(logger.error).toHaveBeenCalledWith(
      'failed',
      expect.objectContaining({
        error: expect.objectContaining({ message: 'boom' }),
      })
    );
  });

  it('logs API response levels correctly', () => {
    logApiResponse('GET', '/x', 200, 10);
    logApiResponse('GET', '/x', 500, 10);

    expect(logger.log).toHaveBeenCalledWith('debug', 'api.response', expect.any(Object));
    expect(logger.log).toHaveBeenCalledWith('warn', 'api.response', expect.any(Object));
  });

  it('supports cache logging and timers', () => {
    logCacheEvent('hit', 'k');
    expect(logger.debug).toHaveBeenCalledWith('cache.hit', expect.objectContaining({ key: 'k' }));

    const timer = createTimer();
    expect(timer()).toBeGreaterThanOrEqual(0);
  });

  it('returns log paths and allows level/silent changes', () => {
    expect(getLogDir()).toContain('.mailgoat');
    expect(getLogFiles().error).toContain('error.log');

    setLogLevel('debug');
    expect((logger as any).level).toBe('debug');

    setLoggerSilent(true);
    expect((logger as any).transports[0].silent).toBe(true);
  });
});
