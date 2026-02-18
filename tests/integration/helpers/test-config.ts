/**
 * Test Configuration Helpers
 * Utilities for creating test configurations and temporary files
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { MailGoatConfig } from '../../../src/lib/config';

/**
 * Create a temporary config file for testing
 */
export function createTestConfig(config: MailGoatConfig): string {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mailgoat-test-'));
  const configPath = path.join(tempDir, 'config.yml');

  const content = JSON.stringify(config, null, 2);
  fs.writeFileSync(configPath, content, { mode: 0o600 });

  return configPath;
}

/**
 * Clean up temporary config file
 */
export function cleanupTestConfig(configPath: string): void {
  try {
    const dir = path.dirname(configPath);
    if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath);
    }
    if (fs.existsSync(dir)) {
      fs.rmdirSync(dir);
    }
  } catch (error) {
    // Ignore cleanup errors
  }
}

/**
 * Create a temporary directory for tests
 */
export function createTempDir(prefix = 'mailgoat-test-'): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

/**
 * Clean up temporary directory
 */
export function cleanupTempDir(dir: string): void {
  try {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
          cleanupTempDir(filePath);
        } else {
          fs.unlinkSync(filePath);
        }
      }
      fs.rmdirSync(dir);
    }
  } catch (error) {
    // Ignore cleanup errors
  }
}

/**
 * Create a test attachment file
 */
export function createTestAttachment(
  filename: string,
  content: string | Buffer,
  dir?: string
): string {
  const tempDir = dir || createTempDir();
  const filePath = path.join(tempDir, filename);
  fs.writeFileSync(filePath, content);
  return filePath;
}

/**
 * Default test config
 */
export const TEST_CONFIG: MailGoatConfig = {
  server: 'postal.example.com',
  fromAddress: 'test@example.com',
  email: 'test@example.com',
  api_key: 'test-api-key',
};

/**
 * Wait for a specified time (for testing timing)
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Suppress console output during tests
 */
export function suppressConsole(): { restore: () => void } {
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;

  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();

  return {
    restore: () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    },
  };
}
