import * as fs from 'fs';
import { createHealthCommand } from '../health';

const mockExists = jest.fn();
const mockLoad = jest.fn();
const mockGetPath = jest.fn(() => '/home/test/.mailgoat/config.json');
const mockSendMessage = jest.fn();
const mockGetLastRateLimit = jest.fn();

jest.mock('../../lib/config', () => {
  const actual = jest.requireActual('../../lib/config');
  return {
    ...actual,
    ConfigManager: jest.fn().mockImplementation(() => ({
      exists: mockExists,
      load: mockLoad,
      getPath: mockGetPath,
    })),
  };
});

jest.mock('../../lib/postal-client', () => ({
  PostalClient: jest.fn().mockImplementation(() => ({
    sendMessage: mockSendMessage,
    getLastRateLimit: mockGetLastRateLimit,
  })),
}));

jest.mock('fs', () => {
  const actual = jest.requireActual('fs');
  return {
    ...actual,
    existsSync: jest.fn(),
    writeFileSync: jest.fn(),
    unlinkSync: jest.fn(),
    readdirSync: jest.fn(),
  };
});

jest.mock('os', () => {
  const actual = jest.requireActual('os');
  return {
    ...actual,
    homedir: jest.fn(() => '/home/test'),
  };
});

describe('health command', () => {
  const originalExit = process.exit;
  const originalLog = console.log;
  const originalError = console.error;

  beforeEach(() => {
    jest.clearAllMocks();

    (fs.existsSync as jest.Mock).mockImplementation((path: fs.PathLike) => {
      const p = String(path);
      return p === '/home/test/.mailgoat' || p === '/home/test/.mailgoat/templates';
    });
    (fs.writeFileSync as jest.Mock).mockImplementation(() => undefined);
    (fs.unlinkSync as jest.Mock).mockImplementation(() => undefined);
    (fs.readdirSync as jest.Mock).mockImplementation(() => ['welcome.yml']);

    mockExists.mockResolvedValue(true);
    mockLoad.mockResolvedValue({
      server: 'https://postal.example.com',
      fromAddress: 'agent@example.com',
      api_key: 'proj_valid_123456',
    });

    // connectivity + auth checks use sendMessage and should resolve in healthy flow
    mockSendMessage.mockResolvedValue({ status: 'ok' });
    mockGetLastRateLimit.mockReturnValue(undefined);

    console.log = jest.fn();
    console.error = jest.fn();
    process.exit = jest.fn() as never;
  });

  afterAll(() => {
    process.exit = originalExit;
    console.log = originalLog;
    console.error = originalError;
  });

  it('exits 0 for healthy checks', async () => {
    const cmd = createHealthCommand();

    await cmd.parseAsync([], { from: 'user' });
    expect(process.exit).toHaveBeenCalledWith(0);
  });

  it('exits 1 when warnings exist but no failures', async () => {
    (fs.existsSync as jest.Mock).mockImplementation((path: fs.PathLike) => {
      const p = String(path);
      // config dir exists, templates dir missing -> warning
      return p === '/home/test/.mailgoat';
    });

    const cmd = createHealthCommand();

    await cmd.parseAsync([], { from: 'user' });
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('exits 2 on critical failure', async () => {
    mockExists.mockResolvedValue(false);

    const cmd = createHealthCommand();

    await cmd.parseAsync([], { from: 'user' });
    expect(process.exit).toHaveBeenCalledWith(2);
  });

  it('runs optional send-test check when --send-test is provided', async () => {
    const cmd = createHealthCommand();

    await cmd.parseAsync(['--send-test'], { from: 'user' });
    expect(process.exit).toHaveBeenCalledWith(0);

    // connectivity + auth + send-test
    expect(mockSendMessage).toHaveBeenCalledTimes(3);
    expect(mockSendMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({
        to: ['agent@example.com'],
        subject: '[MailGoat Health Check] Test Message',
      })
    );
  });

  it('exits 1 when rate limit usage is near capacity', async () => {
    mockGetLastRateLimit.mockReturnValue({
      buckets: {
        hour: {
          limit: 50,
          remaining: 5,
          used: 45,
          percentUsed: 90,
          resetInSeconds: 900,
        },
      },
    });

    const cmd = createHealthCommand();

    await cmd.parseAsync([], { from: 'user' });
    expect(process.exit).toHaveBeenCalledWith(1);
  });
});
