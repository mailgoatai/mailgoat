/**
 * ConfigManager Unit Tests
 *
 * Tests for configuration file management.
 */

import { ConfigManager } from '../config';
import * as fs from 'fs';
import * as path from 'path';

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

describe('ConfigManager', () => {
  let manager: ConfigManager;
  const mockConfigPath = '/test/.mailgoat/config.yml';

  beforeEach(() => {
    jest.clearAllMocks();
    manager = new ConfigManager(mockConfigPath);
  });

  describe('constructor', () => {
    it('should use provided config path', () => {
      const customPath = '/custom/path/config.yml';
      const customManager = new ConfigManager(customPath);
      expect(customManager.getPath()).toBe(customPath);
    });

    it('should use default path if not provided', () => {
      const defaultManager = new ConfigManager();
      expect(defaultManager.getPath()).toContain('.mailgoat/config.yml');
    });
  });

  describe('load', () => {
    it('should load and parse valid config', async () => {
      const configYaml = `
server: https://postal.example.com
email: user@example.com
api_key: test_key_123
`;

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(configYaml);

      const config = await manager.load();

      expect(config.server).toBe('https://postal.example.com');
      expect(config.email).toBe('user@example.com');
      expect(config.api_key).toBe('test_key_123');
    });

    it('should throw error if config file does not exist', () => {
      mockedFs.existsSync.mockReturnValue(false);

      expect(() => manager.load()).toThrow('Config file not found');
    });

    it('should validate loaded config', () => {
      const configYaml = `
server: https://postal.example.com
email: user@example.com
api_key: test_key_123
`;

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(configYaml);

      manager.load();

      expect(validationService.validateConfig).toHaveBeenCalled();
    });

    it('should throw error if validation fails', () => {
      const configYaml = `
server: invalid
email: user@example.com
api_key: test_key
`;

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(configYaml);
      (validationService.validateConfig as jest.Mock).mockReturnValueOnce({
        valid: false,
        error: 'Invalid server URL',
      });

      expect(() => manager.load()).toThrow('Configuration validation failed');
    });

    it('should use cached config if available', () => {
      const cachedConfig = {
        server: 'https://cached.example.com',
        email: 'cached@example.com',
        api_key: 'cached_key',
      };

      (cacheManager.get as jest.Mock).mockReturnValueOnce(cachedConfig);

      const config = manager.load();

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

      manager.load();

      expect(cacheManager.set).toHaveBeenCalledWith(
        `config:${mockConfigPath}`,
        expect.any(Object),
        300000
      );
    });
  });

  describe('save', () => {
    it('should save valid config to file', () => {
      const config = {
        server: 'https://postal.example.com',
        email: 'user@example.com',
        api_key: 'test_key_123',
      };

      mockedFs.existsSync.mockReturnValue(false);

      manager.save(config);

      expect(mockedFs.mkdirSync).toHaveBeenCalled();
      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        mockConfigPath,
        expect.stringContaining('server: https://postal.example.com'),
        expect.objectContaining({ mode: 0o600 })
      );
    });

    it('should create config directory if it does not exist', () => {
      const config = {
        server: 'https://postal.example.com',
        email: 'user@example.com',
        api_key: 'test_key_123',
      };

      mockedFs.existsSync.mockReturnValue(false);

      manager.save(config);

      expect(mockedFs.mkdirSync).toHaveBeenCalledWith(
        path.dirname(mockConfigPath),
        expect.objectContaining({ recursive: true, mode: 0o700 })
      );
    });

    it('should validate config before saving', () => {
      const config = {
        server: 'https://postal.example.com',
        email: 'user@example.com',
        api_key: 'test_key_123',
      };

      manager.save(config);

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

      expect(() => manager.save(invalidConfig)).toThrow('Configuration validation failed');
    });

    it('should invalidate cache after saving', () => {
      const config = {
        server: 'https://postal.example.com',
        email: 'user@example.com',
        api_key: 'test_key_123',
      };

      manager.save(config);

      expect(cacheManager.invalidate).toHaveBeenCalledWith(`config:${mockConfigPath}`);
    });

    it('should set secure file permissions', () => {
      const config = {
        server: 'https://postal.example.com',
        email: 'user@example.com',
        api_key: 'test_key_123',
      };

      manager.save(config);

      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        mockConfigPath,
        expect.any(String),
        expect.objectContaining({ mode: 0o600 })
      );
    });
  });

  describe('exists', () => {
    it('should return true if config file exists', () => {
      mockedFs.existsSync.mockReturnValue(true);

      expect(manager.exists()).toBe(true);
      expect(mockedFs.existsSync).toHaveBeenCalledWith(mockConfigPath);
    });

    it('should return false if config file does not exist', () => {
      mockedFs.existsSync.mockReturnValue(false);

      expect(manager.exists()).toBe(false);
    });
  });

  describe('getPath', () => {
    it('should return config file path', () => {
      expect(manager.getPath()).toBe(mockConfigPath);
    });
  });

  describe('edge cases', () => {
    it('should handle YAML parsing errors', () => {
      const invalidYaml = `
server: https://postal.example.com
email: user@example.com
api_key: test_key
  invalid: nesting
`;

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(invalidYaml);

      // YAML parsing should throw or return unexpected structure
      expect(() => manager.load()).toThrow();
    });

    it('should handle file read errors', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      expect(() => manager.load()).toThrow('Permission denied');
    });

    it('should handle file write errors', () => {
      const config = {
        server: 'https://postal.example.com',
        email: 'user@example.com',
        api_key: 'test_key_123',
      };

      mockedFs.writeFileSync.mockImplementation(() => {
        throw new Error('Disk full');
      });

      expect(() => manager.save(config)).toThrow('Disk full');
    });
  });
});
