import { ConfigService } from '../config-service';
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

describe('ConfigService', () => {
  const baseDir = '/tmp/mailgoat-test';
  let service: ConfigService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ConfigService(baseDir);
  });

  it('loads default config and caches it', async () => {
    mockedFs.access.mockResolvedValue(undefined);
    mockedFs.readFile.mockResolvedValue(
      'server: https://postal.example.com\nemail: user@example.com\napi_key: abc1234567\n' as any
    );

    const config = await service.load();
    expect(config.server).toBe('https://postal.example.com');
    expect(cacheManager.set).toHaveBeenCalled();
  });

  it('saves default config and invalidates cache', async () => {
    mockedFs.access.mockRejectedValue(new Error('missing'));
    mockedFs.mkdir.mockResolvedValue(undefined as any);
    mockedFs.writeFile.mockResolvedValue(undefined as any);

    await service.save({
      server: 'https://postal.example.com',
      email: 'user@example.com',
      api_key: 'abc1234567',
    });

    expect(mockedFs.mkdir).toHaveBeenCalled();
    expect(mockedFs.writeFile).toHaveBeenCalled();
    expect(cacheManager.invalidate).toHaveBeenCalled();
  });

  it('lists profiles from yaml files', async () => {
    mockedFs.access.mockResolvedValue(undefined);
    mockedFs.readdir.mockResolvedValue(['dev.yml', 'prod.yaml', 'ignore.txt'] as any);

    const profiles = await service.listProfiles();
    expect(profiles).toEqual(['dev', 'prod']);
  });

  it('creates and deletes profile', async () => {
    mockedFs.access
      .mockRejectedValueOnce(new Error('no profile yet'))
      .mockRejectedValueOnce(new Error('no default dir'))
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined);
    mockedFs.mkdir.mockResolvedValue(undefined as any);
    mockedFs.writeFile.mockResolvedValue(undefined as any);
    mockedFs.unlink.mockResolvedValue(undefined as any);

    await service.createProfile('staging', {
      server: 'https://postal.example.com',
      email: 'user@example.com',
      api_key: 'abc1234567',
    });

    expect(mockedFs.writeFile).toHaveBeenCalled();

    await service.deleteProfile('staging');
    expect(mockedFs.unlink).toHaveBeenCalled();
  });

  it('reports profile existence via fs.access', async () => {
    mockedFs.access.mockImplementation(async (targetPath: any) => {
      if (String(targetPath).includes('/missing.yml')) {
        throw new Error('missing');
      }
      return undefined;
    });

    expect(await service.profileExists('exists')).toBe(true);
    expect(await service.profileExists('missing')).toBe(false);
  });
});
