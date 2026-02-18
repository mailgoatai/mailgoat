import { ConfigManager } from '../config';
import * as fs from 'fs/promises';

jest.mock('fs/promises');
const mockedFs = fs as jest.Mocked<typeof fs>;

jest.mock('../validation-service', () => ({
  validationService: {
    validateConfig: jest.fn(() => ({ valid: true })),
  },
}));

jest.mock('../cache-manager', () => ({
  cacheManager: {
    get: jest.fn(() => null),
    set: jest.fn(),
    invalidate: jest.fn(),
  },
  CacheKeys: {
    config: jest.fn((p: string) => `config:${p}`),
  },
  CacheTTL: {
    MEDIUM: 300000,
  },
}));

import { cacheManager } from '../cache-manager';
import { validationService } from '../validation-service';

describe('ConfigManager', () => {
  const configPath = '/tmp/.mailgoat/config.yml';
  let manager: ConfigManager;

  beforeEach(() => {
    jest.clearAllMocks();
    manager = new ConfigManager(configPath);
  });

  it('loads config and caches it', async () => {
    mockedFs.access.mockResolvedValue(undefined);
    mockedFs.readFile.mockResolvedValue(
      JSON.stringify({
        server: 'https://postal.example.com',
        fromAddress: 'user@example.com',
        email: 'user@example.com',
        api_key: 'abc1234567',
      }) as any
    );

    const config = await manager.load();
    expect(config.email).toBe('user@example.com');
    expect(cacheManager.set).toHaveBeenCalled();
  });

  it('throws when config file is missing', async () => {
    mockedFs.access.mockRejectedValue(new Error('missing'));
    await expect(manager.load()).rejects.toThrow(/Config file not found/);
  });

  it('saves config and invalidates cache', async () => {
    mockedFs.access.mockRejectedValueOnce(new Error('missing dir'));
    mockedFs.mkdir.mockResolvedValue(undefined as any);
    mockedFs.writeFile.mockResolvedValue(undefined as any);

    await manager.save({
      server: 'https://postal.example.com',
      fromAddress: 'user@example.com',
      email: 'user@example.com',
      api_key: 'abc1234567',
    });

    expect(mockedFs.mkdir).toHaveBeenCalled();
    expect(mockedFs.writeFile).toHaveBeenCalled();
    expect(cacheManager.invalidate).toHaveBeenCalledWith(`config:${configPath}`);
  });

  it('exists checks via fs.access', async () => {
    mockedFs.access.mockResolvedValueOnce(undefined);
    expect(await manager.exists()).toBe(true);

    mockedFs.access.mockRejectedValueOnce(new Error('missing'));
    expect(await manager.exists()).toBe(false);
  });

  it('throws when validation fails', async () => {
    (validationService.validateConfig as jest.Mock).mockReturnValueOnce({
      valid: false,
      error: 'Invalid server URL',
    });
    await expect(
      manager.save({
        server: 'bad',
        fromAddress: 'user@example.com',
        email: 'user@example.com',
        api_key: 'abc1234567',
      })
    ).rejects.toThrow(/Configuration validation failed/);
  });
});
