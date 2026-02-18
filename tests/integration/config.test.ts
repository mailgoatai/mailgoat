import * as fs from 'fs';
import { ConfigManager, MailGoatConfig } from '../../src/lib/config';
import { createTestConfig, cleanupTestConfig, TEST_CONFIG, createTempDir, cleanupTempDir } from './helpers/test-config';

describe('ConfigManager Integration Tests', () => {
  it('loads a valid config file', async () => {
    const configPath = createTestConfig(TEST_CONFIG);
    try {
      const manager = new ConfigManager(configPath);
      const config = await manager.load();
      expect(config).toEqual(TEST_CONFIG);
    } finally {
      cleanupTestConfig(configPath);
    }
  });

  it('throws for non-existent config file', async () => {
    const manager = new ConfigManager('/tmp/non-existent-config.yml');
    await expect(manager.load()).rejects.toThrow(/not found/i);
  });

  it('throws for invalid config payload', async () => {
    const configPath = createTestConfig({ server: 'postal.example.com' } as any);
    try {
      const manager = new ConfigManager(configPath);
      await expect(manager.load()).rejects.toThrow(/validation/i);
    } finally {
      cleanupTestConfig(configPath);
    }
  });

  it('saves and reloads config', async () => {
    const tempDir = createTempDir();
    const configPath = `${tempDir}/config.yml`;
    try {
      const manager = new ConfigManager(configPath);
      await manager.save(TEST_CONFIG);
      const loaded = await manager.load();
      expect(loaded).toEqual(TEST_CONFIG);
      expect(fs.existsSync(configPath)).toBe(true);
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  it('overwrites existing config', async () => {
    const configPath = createTestConfig(TEST_CONFIG);
    const updated: MailGoatConfig = {
      server: 'updated.example.com',
      fromAddress: 'updated@example.com',
      email: 'updated@example.com',
      api_key: 'updated-api-key',
    };
    try {
      const manager = new ConfigManager(configPath);
      await manager.save(updated);
      const loaded = await manager.load();
      expect(loaded).toEqual(updated);
    } finally {
      cleanupTestConfig(configPath);
    }
  });

  it('reports config file existence', async () => {
    const configPath = createTestConfig(TEST_CONFIG);
    try {
      const manager = new ConfigManager(configPath);
      await expect(manager.exists()).resolves.toBe(true);
      cleanupTestConfig(configPath);
      await expect(manager.exists()).resolves.toBe(false);
    } finally {
      cleanupTestConfig(configPath);
    }
  });
});
