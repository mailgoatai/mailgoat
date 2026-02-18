import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { ApiKeyManager } from '../api-key-manager';

function tmp(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

describe('ApiKeyManager', () => {
  const previous = process.env.MAILGOAT_KEYS_PASSWORD;

  beforeAll(() => {
    process.env.MAILGOAT_KEYS_PASSWORD = 'unit-test-password';
  });

  afterAll(() => {
    process.env.MAILGOAT_KEYS_PASSWORD = previous;
  });

  it('creates, lists, decrypts, rotates, and revokes keys with audit trail', async () => {
    const dir = tmp('mailgoat-keys-');
    const manager = new ApiKeyManager(path.join(dir, 'api-keys.json'), path.join(dir, 'audit.log'));

    await manager.createKey({
      id: 'key-1',
      name: 'production',
      keyValue: 'postal_secret_key_1',
      scopes: ['send', 'admin'],
    });

    const listed = await manager.list();
    expect(listed.length).toBe(1);
    expect(listed[0].name).toBe('production');
    expect(listed[0].scopes).toEqual(['send', 'admin']);

    const plain = await manager.getPlaintext('key-1');
    expect(plain).toBe('postal_secret_key_1');

    const rotated = await manager.rotateKey('key-1', {
      id: 'key-2',
      value: 'postal_secret_key_2',
    });
    expect(rotated.id).toBe('key-2');
    expect(await manager.getPlaintext('key-2')).toBe('postal_secret_key_2');

    await manager.revokeKey('key-2');
    expect((await manager.list()).length).toBe(0);

    const audit = await manager.readAudit(10);
    expect(audit.length).toBeGreaterThanOrEqual(4);
    expect(audit.some((entry) => entry.operation === 'created')).toBe(true);
    expect(audit.some((entry) => entry.operation === 'rotated')).toBe(true);
    expect(audit.some((entry) => entry.operation === 'revoked')).toBe(true);
  });
});
