/**
 * Integration tests for ConfigManager
 * Tests config file loading, saving, and validation
 */

import * as fs from 'fs';
import { ConfigManager, MailGoatConfig } from '../../src/lib/config';
import {
  createTestConfig,
  cleanupTestConfig,
  TEST_CONFIG,
  createTempDir,
  cleanupTempDir,
} from './helpers/test-config';

describe('ConfigManager Integration Tests', () => {
  describe('load', () => {
    it('should load valid config file', () => {
      const configPath = createTestConfig(TEST_CONFIG);

      try {
        const manager = new ConfigManager(configPath);
        const config = manager.load();

        expect(config.server).toBe(TEST_CONFIG.server);
        expect(config.email).toBe(TEST_CONFIG.email);
        expect(config.api_key).toBe(TEST_CONFIG.api_key);
      } finally {
        cleanupTestConfig(configPath);
      }
    });

    it('should throw error for non-existent config file', () => {
      const manager = new ConfigManager('/tmp/non-existent-config.yml');

      expect(() => manager.load()).toThrow(/not found/i);
    });

    it('should throw error for config missing server', () => {
      const invalidConfig = { email: 'test@example.com', api_key: 'key' } as any;
      const configPath = createTestConfig(invalidConfig);

      try {
        const manager = new ConfigManager(configPath);

        expect(() => manager.load()).toThrow(/server/i);
      } finally {
        cleanupTestConfig(configPath);
      }
    });

    it('should throw error for config missing email', () => {
      const invalidConfig = { server: 'postal.example.com', api_key: 'key' } as any;
      const configPath = createTestConfig(invalidConfig);

      try {
        const manager = new ConfigManager(configPath);

        expect(() => manager.load()).toThrow(/email/i);
      } finally {
        cleanupTestConfig(configPath);
      }
    });

    it('should throw error for config missing api_key', () => {
      const invalidConfig = { server: 'postal.example.com', email: 'test@example.com' } as any;
      const configPath = createTestConfig(invalidConfig);

      try {
        const manager = new ConfigManager(configPath);

        expect(() => manager.load()).toThrow(/api_key/i);
      } finally {
        cleanupTestConfig(configPath);
      }
    });

    it('should handle config with extra fields', () => {
      const configWithExtras = {
        ...TEST_CONFIG,
        extra_field: 'extra_value',
        another_field: 123,
      };
      const configPath = createTestConfig(configWithExtras);

      try {
        const manager = new ConfigManager(configPath);
        const config = manager.load();

        expect(config.server).toBe(TEST_CONFIG.server);
        expect(config.email).toBe(TEST_CONFIG.email);
        expect(config.api_key).toBe(TEST_CONFIG.api_key);
      } finally {
        cleanupTestConfig(configPath);
      }
    });
  });

  describe('save', () => {
    it('should save valid config file', () => {
      const tempDir = createTempDir();
      const configPath = `${tempDir}/config.yml`;

      try {
        const manager = new ConfigManager(configPath);
        manager.save(TEST_CONFIG);

        expect(fs.existsSync(configPath)).toBe(true);

        // Verify content
        const loaded = manager.load();
        expect(loaded.server).toBe(TEST_CONFIG.server);
        expect(loaded.email).toBe(TEST_CONFIG.email);
        expect(loaded.api_key).toBe(TEST_CONFIG.api_key);
      } finally {
        cleanupTempDir(tempDir);
      }
    });

    it('should create directory if it does not exist', () => {
      const tempDir = createTempDir();
      const configPath = `${tempDir}/subdir/config.yml`;

      try {
        const manager = new ConfigManager(configPath);
        manager.save(TEST_CONFIG);

        expect(fs.existsSync(configPath)).toBe(true);
        expect(fs.existsSync(`${tempDir}/subdir`)).toBe(true);
      } finally {
        cleanupTempDir(tempDir);
      }
    });

    it('should set correct file permissions (0600)', () => {
      const tempDir = createTempDir();
      const configPath = `${tempDir}/config.yml`;

      try {
        const manager = new ConfigManager(configPath);
        manager.save(TEST_CONFIG);

        const stats = fs.statSync(configPath);
        const mode = stats.mode & parseInt('777', 8);

        // Should be 0600 (owner read/write only)
        expect(mode).toBe(parseInt('600', 8));
      } finally {
        cleanupTempDir(tempDir);
      }
    });

    it('should throw error when saving invalid config', () => {
      const tempDir = createTempDir();
      const configPath = `${tempDir}/config.yml`;

      try {
        const manager = new ConfigManager(configPath);
        const invalidConfig = { server: 'test' } as any; // Missing required fields

        expect(() => manager.save(invalidConfig)).toThrow();
      } finally {
        cleanupTempDir(tempDir);
      }
    });

    it('should overwrite existing config', () => {
      const configPath = createTestConfig(TEST_CONFIG);

      try {
        const manager = new ConfigManager(configPath);

        const newConfig: MailGoatConfig = {
          server: 'new-server.example.com',
          email: 'new@example.com',
          api_key: 'new-api-key',
        };

        manager.save(newConfig);

        const loaded = manager.load();
        expect(loaded.server).toBe(newConfig.server);
        expect(loaded.email).toBe(newConfig.email);
        expect(loaded.api_key).toBe(newConfig.api_key);
      } finally {
        cleanupTestConfig(configPath);
      }
    });
  });

  describe('exists', () => {
    it('should return true when config file exists', () => {
      const configPath = createTestConfig(TEST_CONFIG);

      try {
        const manager = new ConfigManager(configPath);

        expect(manager.exists()).toBe(true);
      } finally {
        cleanupTestConfig(configPath);
      }
    });

    it('should return false when config file does not exist', () => {
      const manager = new ConfigManager('/tmp/non-existent-config.yml');

      expect(manager.exists()).toBe(false);
    });
  });

  describe('getPath', () => {
    it('should return correct config path', () => {
      const configPath = '/tmp/test-config.yml';
      const manager = new ConfigManager(configPath);

      expect(manager.getPath()).toBe(configPath);
    });

    it('should return default path when not specified', () => {
      const manager = new ConfigManager();
      const path = manager.getPath();

      expect(path).toMatch(/\.mailgoat\/config\.yml/);
    });
  });

  describe('Full Config Workflow', () => {
    it('should handle complete config lifecycle', () => {
      const tempDir = createTempDir();
      const configPath = `${tempDir}/config.yml`;

      try {
        const manager = new ConfigManager(configPath);

        // 1. Check if config exists (should be false)
        expect(manager.exists()).toBe(false);

        // 2. Save new config
        manager.save(TEST_CONFIG);
        expect(manager.exists()).toBe(true);

        // 3. Load config
        const loaded = manager.load();
        expect(loaded.server).toBe(TEST_CONFIG.server);

        // 4. Update config
        const updated: MailGoatConfig = {
          ...loaded,
          server: 'updated.example.com',
        };
        manager.save(updated);

        // 5. Verify update
        const reloaded = manager.load();
        expect(reloaded.server).toBe('updated.example.com');
        expect(reloaded.email).toBe(TEST_CONFIG.email);
        expect(reloaded.api_key).toBe(TEST_CONFIG.api_key);
      } finally {
        cleanupTempDir(tempDir);
      }
    });

    it('should handle multiple config files', () => {
      const tempDir = createTempDir();
      const config1Path = `${tempDir}/config1.yml`;
      const config2Path = `${tempDir}/config2.yml`;

      try {
        const manager1 = new ConfigManager(config1Path);
        const manager2 = new ConfigManager(config2Path);

        const config1: MailGoatConfig = {
          server: 'server1.example.com',
          email: 'user1@example.com',
          api_key: 'key1',
        };

        const config2: MailGoatConfig = {
          server: 'server2.example.com',
          email: 'user2@example.com',
          api_key: 'key2',
        };

        manager1.save(config1);
        manager2.save(config2);

        const loaded1 = manager1.load();
        const loaded2 = manager2.load();

        expect(loaded1.server).toBe('server1.example.com');
        expect(loaded2.server).toBe('server2.example.com');
        expect(loaded1.email).not.toBe(loaded2.email);
      } finally {
        cleanupTempDir(tempDir);
      }
    });
  });

  describe('YAML Format', () => {
    it('should save config in valid YAML format', () => {
      const tempDir = createTempDir();
      const configPath = `${tempDir}/config.yml`;

      try {
        const manager = new ConfigManager(configPath);
        manager.save(TEST_CONFIG);

        const content = fs.readFileSync(configPath, 'utf8');

        expect(content).toContain('server:');
        expect(content).toContain('email:');
        expect(content).toContain('api_key:');
        expect(content).toContain(TEST_CONFIG.server);
        expect(content).toContain(TEST_CONFIG.email);
      } finally {
        cleanupTempDir(tempDir);
      }
    });

    it('should be able to manually edit and reload config', () => {
      const tempDir = createTempDir();
      const configPath = `${tempDir}/config.yml`;

      try {
        const manager = new ConfigManager(configPath);
        manager.save(TEST_CONFIG);

        // Manually edit the file
        const manualYaml = `
server: manually-edited.example.com
email: manual@example.com
api_key: manual-key
`;
        fs.writeFileSync(configPath, manualYaml);

        // Reload
        const loaded = manager.load();
        expect(loaded.server).toBe('manually-edited.example.com');
        expect(loaded.email).toBe('manual@example.com');
        expect(loaded.api_key).toBe('manual-key');
      } finally {
        cleanupTempDir(tempDir);
      }
    });
  });
});
