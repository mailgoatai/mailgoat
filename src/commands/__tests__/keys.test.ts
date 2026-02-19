import { createKeysCommand } from '../keys';

const mockLoad = jest.fn();
const mockSave = jest.fn();
const mockCreateApiCredential = jest.fn();
const mockRevokeApiCredential = jest.fn();
const mockCreateKey = jest.fn();

jest.mock('../../lib/config', () => {
  const actual = jest.requireActual('../../lib/config');
  return {
    ...actual,
    ConfigManager: jest.fn().mockImplementation(() => ({
      load: mockLoad,
      save: mockSave,
    })),
  };
});

jest.mock('../../lib/postal-client', () => ({
  PostalClient: jest.fn().mockImplementation(() => ({
    createApiCredential: mockCreateApiCredential,
    revokeApiCredential: mockRevokeApiCredential,
  })),
}));

jest.mock('../../lib/api-key-manager', () => {
  const actual = jest.requireActual('../../lib/api-key-manager');
  return {
    ...actual,
    ApiKeyManager: jest.fn().mockImplementation(() => ({
      createKey: mockCreateKey,
      rotateKey: jest.fn(),
      revokeKey: jest.fn(),
      exportInsecure: jest.fn(),
      readAudit: jest.fn(),
      list: jest.fn().mockResolvedValue([]),
    })),
  };
});

describe('keys command', () => {
  const originalExit = process.exit;
  const originalError = console.error;
  const originalLog = console.log;

  beforeEach(() => {
    jest.clearAllMocks();
    console.error = jest.fn();
    console.log = jest.fn();
    process.exit = jest.fn() as never;
  });

  afterAll(() => {
    process.exit = originalExit;
    console.error = originalError;
    console.log = originalLog;
  });

  it('handles missing config on keys create with friendly error', async () => {
    mockLoad.mockRejectedValue(new Error('Config file not found at /tmp/.mailgoat/config.json'));

    const cmd = createKeysCommand();
    await cmd.parseAsync(['create', '--name', 'alpha'], { from: 'user' });

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Error: Config file not found at /tmp/.mailgoat/config.json')
    );
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('exits with friendly error for invalid scopes', async () => {
    mockLoad.mockResolvedValue({
      server: 'https://postal.example.com',
      api_key: 'proj_test',
      fromAddress: 'agent@example.com',
    });

    const cmd = createKeysCommand();
    await cmd.parseAsync(['create', '--name', 'alpha', '--scopes', 'send,bad'], { from: 'user' });

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Error: Invalid scope: bad')
    );
    expect(process.exit).toHaveBeenCalledWith(1);
    expect(mockCreateApiCredential).not.toHaveBeenCalled();
    expect(mockCreateKey).not.toHaveBeenCalled();
  });
});
