/**
 * ConfigService Unit Tests
 *
 * Tests for enhanced configuration management with profiles.
 */

import { ConfigService } from '../config-service';
import * as fs from 'fs';

// Mock fs module
jest.mock('fs');
const mockedFs = fs as jest.Mocked<typeof fs>;

// Mock validation service
jest.mock('../validation-service', () => ({
  validationService: {
    validateConfig: jest.fn(() => ({ valid: true })),
  },
}));

// Mock cache manager
jest.mock('../cache-manager', () => ({
  cacheManager: {
    get: jest.fn(() => null),
    set: jest.fn(),
    invalidate: jest.fn(),
  },
  CacheKeys: {
    config: jest.fn((path: string) => `config:${path}`),
  },
  CacheTTL: {
    MEDIUM: 300000,
  },
}));

import { validationService } from '../validation-service';
import { cacheManager } from '../cache-manager';

describe('ConfigService', () => {
  let service: ConfigService;
  const mockBaseDir = '/test/.mailgoat';

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ConfigService(mockBaseDir);
    
    // Reset environment variables
    delete process.env.MAILGOAT_SERVER;
    delete process.env.MAILGOAT_EMAIL;
    delete process.env.MAILGOAT_API_KEY;
    delete process.env.MAILGOAT_PROFILE;
  });

  describe('constructor', () => {
    it('should set up directories correctly', () => {
      expect(service.getBaseDir()).toBe(mockBaseDir);
      expect(service.getProfilesDir()).toBe(`${mockBaseDir}/profiles`);
      expect(service.getDefaultConfigPath()).toBe(`${mockBaseDir}/config.yml`);
    });

    it('should use default base directory if not provided', () => {
      const defaultService = new ConfigService();
      expect(defaultService.getBaseDir()).toContain('.mailgoat');
    });
  });

  describe('load', () => {
    const defaultConfig = {
      server: 'https://postal.example.com',
      email: 'user@example.com',
      api_key: 'test_key_123',
    };

    it('should load default config', () => {
      const configYaml = `
server: https://postal.example.com
email: user@example.com
api_key: test_key_123
`;

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(configYaml);

      const config = service.load();

      expect(config.server).toBe('https://postal.example.com');
      expect(config.email).toBe('user@example.com');
      expect(config.api_key).toBe('test_key_123');
    });

    it('should load profile config', () => {
      const profileYaml = `
server: https://staging.example.com
email: staging@example.com
api_key: staging_key_123
metadata:
  name: staging
  description: Staging environment
`;

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(profileYaml);

      const config = service.load({ profile: 'staging' });

      expect(config.server).toBe('https://staging.example.com');
      expect(config.profile).toBe('staging');
    });

    it('should throw error if default config does not exist', () => {
      mockedFs.existsSync.mockReturnValue(false);

      expect(() => service.load()).toThrow('Default config not found');
    });

    it('should throw error if profile does not exist', () => {
      mockedFs.existsSync.mockReturnValue(false);
      mockedFs.readdirSync.mockReturnValue([]);

      expect(() => service.load({ profile: 'nonexistent' })).toThrow(
        'Profile "nonexistent" not found'
      );
    });

    it('should use cached config if available', () => {
      const cachedConfig = {
        server: 'https://cached.example.com',
        email: 'cached@example.com',
        api_key: 'cached_key',
      };

      (cacheManager.get as jest.Mock).mockReturnValueOnce(cachedConfig);

      const config = service.load();

      expect(config).toEqual(cachedConfig);
      expect(mockedFs.readFileSync).not.toHaveBeenCalled();
    });

    it('should cache loaded config', () => {
      const configYaml = `
server: https://postal.example.com
email: user@example.com
api_key: test_key_123
`;

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(configYaml);

      service.load();

      expect(cacheManager.set).toHaveBeenCalledWith(
        expect.stringContaining('config:'),
        expect.any(Object),
        300000
      );
    });

    it('should skip cache when skipCache is true', () => {
      const configYaml = `
server: https://postal.example.com
email: user@example.com
api_key: test_key_123
`;

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(configYaml);

      service.load({ skipCache: true });

      expect(cacheManager.get).not.toHaveBeenCalled();
      expect(cacheManager.set).not.toHaveBeenCalled();
    });
  });

  describe('environment variable overrides', () => {
    const defaultConfig = `
server: https://postal.example.com
email: user@example.com
api_key: test_key_123
`;

    it('should override server from MAILGOAT_SERVER', () => {
      process.env.MAILGOAT_SERVER = 'https://override.example.com';

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(defaultConfig);

      const config = service.load();

      expect(config.server).toBe('https://override.example.com');
    });

    it('should override email from MAILGOAT_EMAIL', () => {
      process.env.MAILGOAT_EMAIL = 'override@example.com';

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(defaultConfig);

      const config = service.load();

      expect(config.email).toBe('override@example.com');
    });

    it('should override API key from MAILGOAT_API_KEY', () => {
      process.env.MAILGOAT_API_KEY = 'override_key';

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(defaultConfig);

      const config = service.load();

      expect(config.api_key).toBe('override_key');
    });

    it('should override profile from MAILGOAT_PROFILE', () => {
      process.env.MAILGOAT_PROFILE = 'production';

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(defaultConfig);

      const config = service.load();

      expect(config.profile).toBe('production');
    });

    it('should override multiple values', () => {
      process.env.MAILGOAT_SERVER = 'https://multi.example.com';
      process.env.MAILGOAT_EMAIL = 'multi@example.com';
      process.env.MAILGOAT_API_KEY = 'multi_key';

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(defaultConfig);

      const config = service.load();

      expect(config.server).toBe('https://multi.example.com');
      expect(config.email).toBe('multi@example.com');
      expect(config.api_key).toBe('multi_key');
    });

    it('should skip env overrides when skipEnv is true', () => {
      process.env.MAILGOAT_SERVER = 'https://override.example.com';

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(defaultConfig);

      const config = service.load({ skipEnv: true });

      expect(config.server).toBe('https://postal.example.com');
    });
  });

  describe('save', () => {
    const config = {
      server: 'https://postal.example.com',
      email: 'user@example.com',
      api_key: 'test_key_123',
    };

    it('should save to default config when no profile specified', () => {
      mockedFs.existsSync.mockReturnValue(false);

      service.save(config);

      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        `${mockBaseDir}/config.yml`,
        expect.stringContaining('server: https://postal.example.com'),
        expect.objectContaining({ mode: 0o600 })
      );
    });

    it('should save to profile when profile specified', () => {
      mockedFs.existsSync.mockReturnValue(false);

      service.save(config, 'staging');

      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        `${mockBaseDir}/profiles/staging.yml`,
        expect.stringContaining('server: https://postal.example.com'),
        expect.objectContaining({ mode: 0o600 })
      );
    });

    it('should create directory if it does not exist', () => {
      mockedFs.existsSync.mockReturnValue(false);

      service.save(config);

      expect(mockedFs.mkdirSync).toHaveBeenCalledWith(
        mockBaseDir,
        expect.objectContaining({ recursive: true, mode: 0o700 })
      );
    });

    it('should invalidate cache after saving', () => {
      mockedFs.existsSync.mockReturnValue(false);

      service.save(config);

      expect(cacheManager.invalidate).toHaveBeenCalled();
    });

    it('should add metadata when saving to profile', () => {
      mockedFs.existsSync.mockReturnValue(false);
      mockedFs.readFileSync.mockReturnValue(''); // No existing metadata

      service.save(config, 'test-profile');

      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('test-profile.yml'),
        expect.stringContaining('metadata:'),
        expect.any(Object)
      );
    });
  });

  describe('listProfiles', () => {
    it('should list available profiles', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readdirSync.mockReturnValue(['staging.yml', 'production.yml', 'dev.yml'] as any);

      const profiles = service.listProfiles();

      expect(profiles).toEqual(['dev', 'production', 'staging']);
    });

    it('should return empty array if profiles directory does not exist', () => {
      mockedFs.existsSync.mockReturnValue(false);

      const profiles = service.listProfiles();

      expect(profiles).toEqual([]);
    });

    it('should filter non-YAML files', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readdirSync.mockReturnValue([
        'staging.yml',
        'production.yaml',
        'readme.txt',
        'backup.old',
      ] as any);

      const profiles = service.listProfiles();

      expect(profiles).toEqual(['production', 'staging']);
    });
  });

  describe('createProfile', () => {
    it('should create new profile with provided config', () => {
      const config = {
        server: 'https://new.example.com',
        email: 'new@example.com',
        api_key: 'new_key',
      };

      mockedFs.existsSync.mockReturnValue(false);

      service.createProfile('new-profile', config, 'New profile description');

      expect(mockedFs.mkdirSync).toHaveBeenCalled();
      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        `${mockBaseDir}/profiles/new-profile.yml`,
        expect.stringContaining('metadata:'),
        expect.objectContaining({ mode: 0o600 })
      );
    });

    it('should create profile from default config if none provided', () => {
      const defaultConfigYaml = `
server: https://postal.example.com
email: user@example.com
api_key: test_key_123
`;

      mockedFs.existsSync.mockImplementation((path: any) => {
        if (path.includes('config.yml')) return true;
        return false;
      });
      mockedFs.readFileSync.mockReturnValue(defaultConfigYaml);

      service.createProfile('from-default');

      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('from-default.yml'),
        expect.stringContaining('server: https://postal.example.com'),
        expect.any(Object)
      );
    });

    it('should throw error if profile already exists', () => {
      mockedFs.existsSync.mockReturnValue(true);

      expect(() => service.createProfile('existing')).toThrow('already exists');
    });

    it('should validate profile name', () => {
      const invalidNames = ['invalid name', 'invalid@name', '', 'a'.repeat(51), 'default'];

      invalidNames.forEach((name) => {
        expect(() => service.createProfile(name)).toThrow();
      });
    });
  });

  describe('deleteProfile', () => {
    it('should delete profile', () => {
      mockedFs.existsSync.mockReturnValue(true);

      service.deleteProfile('old-profile');

      expect(mockedFs.unlinkSync).toHaveBeenCalledWith(
        `${mockBaseDir}/profiles/old-profile.yml`
      );
    });

    it('should throw error if profile does not exist', () => {
      mockedFs.existsSync.mockReturnValue(false);

      expect(() => service.deleteProfile('nonexistent')).toThrow('does not exist');
    });

    it('should invalidate cache after deletion', () => {
      mockedFs.existsSync.mockReturnValue(true);

      service.deleteProfile('old-profile');

      expect(cacheManager.invalidate).toHaveBeenCalled();
    });
  });

  describe('copyProfile', () => {
    it('should copy profile to new name', () => {
      const sourceProfileYaml = `
server: https://source.example.com
email: source@example.com
api_key: source_key
metadata:
  name: source
  description: Source profile
`;

      mockedFs.existsSync.mockImplementation((path: any) => {
        if (path.includes('source.yml')) return true;
        if (path.includes('target.yml')) return false;
        return false;
      });
      mockedFs.readFileSync.mockReturnValue(sourceProfileYaml);

      service.copyProfile('source', 'target');

      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        `${mockBaseDir}/profiles/target.yml`,
        expect.stringContaining('server: https://source.example.com'),
        expect.any(Object)
      );
    });
  });

  describe('profileExists', () => {
    it('should return true if profile exists', () => {
      mockedFs.existsSync.mockReturnValue(true);

      expect(service.profileExists('existing')).toBe(true);
    });

    it('should return false if profile does not exist', () => {
      mockedFs.existsSync.mockReturnValue(false);

      expect(service.profileExists('nonexistent')).toBe(false);
    });
  });

  describe('defaultConfigExists', () => {
    it('should return true if default config exists', () => {
      mockedFs.existsSync.mockReturnValue(true);

      expect(service.defaultConfigExists()).toBe(true);
    });

    it('should return false if default config does not exist', () => {
      mockedFs.existsSync.mockReturnValue(false);

      expect(service.defaultConfigExists()).toBe(false);
    });
  });

  describe('getProfileMetadata', () => {
    it('should return profile metadata', () => {
      const profileYaml = `
server: https://postal.example.com
email: user@example.com
api_key: test_key
metadata:
  name: test
  description: Test profile
  created_at: '2024-01-01T00:00:00.000Z'
`;

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(profileYaml);

      const metadata = service.getProfileMetadata('test');

      expect(metadata).toBeDefined();
      expect(metadata?.name).toBe('test');
      expect(metadata?.description).toBe('Test profile');
    });

    it('should return null if profile does not exist', () => {
      mockedFs.existsSync.mockReturnValue(false);

      const metadata = service.getProfileMetadata('nonexistent');

      expect(metadata).toBeNull();
    });
  });

  describe('validation', () => {
    it('should validate config before saving', () => {
      const config = {
        server: 'https://postal.example.com',
        email: 'user@example.com',
        api_key: 'test_key_123',
      };

      mockedFs.existsSync.mockReturnValue(false);

      service.save(config);

      expect(validationService.validateConfig).toHaveBeenCalledWith(config);
    });

    it('should throw error if validation fails', () => {
      const invalidConfig = {
        server: 'invalid',
        email: 'user@example.com',
        api_key: 'test_key',
      };

      (validationService.validateConfig as jest.Mock).mockReturnValueOnce({
        valid: false,
        error: 'Invalid configuration',
      });

      expect(() => service.save(invalidConfig)).toThrow('Configuration validation failed');
    });
  });
});
