import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import prompts from 'prompts';

export type ApiKeyScope = 'send' | 'read' | 'admin';

export interface ApiKeyRecord {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt?: string;
  scopes: ApiKeyScope[];
  encryptedValue?: string;
  keychainAccount?: string;
}

interface ApiKeyStoreFile {
  version: 1;
  encryption: 'keychain' | 'aes-256-gcm';
  keys: ApiKeyRecord[];
}

interface AuditRecord {
  timestamp: string;
  operation: string;
  keyId: string;
  result: 'success' | 'failed';
  details?: string;
}

function getBaseDir(): string {
  return path.join(os.homedir(), '.mailgoat');
}

export function getApiKeysPath(): string {
  return path.join(getBaseDir(), 'api-keys.json');
}

export function getAuditLogPath(): string {
  return path.join(getBaseDir(), 'audit.log');
}

function redactKey(keyValue: string): string {
  if (keyValue.length <= 6) return '***';
  return `${keyValue.slice(0, 4)}***${keyValue.slice(-3)}`;
}

function deriveAesKey(password: string): Buffer {
  return crypto.pbkdf2Sync(password, 'mailgoat-api-keys-salt', 200000, 32, 'sha256');
}

function aesEncrypt(plainText: string, password: string): string {
  const key = deriveAesKey(password);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

function aesDecrypt(cipherText: string, password: string): string {
  const payload = Buffer.from(cipherText, 'base64');
  const iv = payload.subarray(0, 12);
  const tag = payload.subarray(12, 28);
  const encrypted = payload.subarray(28);
  const key = deriveAesKey(password);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

async function tryLoadKeytar(): Promise<any | null> {
  try {
    return require('keytar');
  } catch {
    return null;
  }
}

export class ApiKeyManager {
  private readonly storePath: string;
  private readonly auditPath: string;
  private cachedPassword?: string;

  constructor(storePath: string = getApiKeysPath(), auditPath: string = getAuditLogPath()) {
    this.storePath = storePath;
    this.auditPath = auditPath;
  }

  async list(): Promise<ApiKeyRecord[]> {
    const store = await this.readStore();
    return store.keys.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async createKey(input: {
    id: string;
    name: string;
    keyValue: string;
    scopes: ApiKeyScope[];
  }): Promise<ApiKeyRecord> {
    const store = await this.readStore();
    const keyRecord: ApiKeyRecord = {
      id: input.id,
      name: input.name,
      createdAt: new Date().toISOString(),
      scopes: input.scopes.length ? input.scopes : ['send', 'read', 'admin'],
    };
    await this.writeSecret(store, keyRecord, input.keyValue);
    store.keys.push(keyRecord);
    await this.writeStore(store);
    await this.appendAudit({
      timestamp: new Date().toISOString(),
      operation: 'created',
      keyId: input.id,
      result: 'success',
      details: `name=${input.name} scopes=${keyRecord.scopes.join(',')}`,
    });
    return keyRecord;
  }

  async getPlaintext(id: string): Promise<string> {
    const store = await this.readStore();
    const key = store.keys.find((k) => k.id === id);
    if (!key) throw new Error(`Key not found: ${id}`);
    const value = await this.readSecret(store, key);
    key.lastUsedAt = new Date().toISOString();
    await this.writeStore(store);
    await this.appendAudit({
      timestamp: new Date().toISOString(),
      operation: 'used',
      keyId: id,
      result: 'success',
      details: `redacted=${redactKey(value)}`,
    });
    return value;
  }

  async rotateKey(
    oldId: string,
    next: { id: string; name?: string; value: string }
  ): Promise<ApiKeyRecord> {
    const store = await this.readStore();
    const existing = store.keys.find((k) => k.id === oldId);
    if (!existing) {
      throw new Error(`Key not found: ${oldId}`);
    }
    await this.deleteSecret(store, existing);
    store.keys = store.keys.filter((k) => k.id !== oldId);

    const replacement: ApiKeyRecord = {
      id: next.id,
      name: next.name || existing.name,
      createdAt: new Date().toISOString(),
      scopes: existing.scopes,
    };
    await this.writeSecret(store, replacement, next.value);
    store.keys.push(replacement);
    await this.writeStore(store);
    await this.appendAudit({
      timestamp: new Date().toISOString(),
      operation: 'rotated',
      keyId: oldId,
      result: 'success',
      details: `new=${next.id}`,
    });
    return replacement;
  }

  async revokeKey(id: string): Promise<void> {
    const store = await this.readStore();
    const existing = store.keys.find((k) => k.id === id);
    if (!existing) {
      throw new Error(`Key not found: ${id}`);
    }
    await this.deleteSecret(store, existing);
    store.keys = store.keys.filter((k) => k.id !== id);
    await this.writeStore(store);
    await this.appendAudit({
      timestamp: new Date().toISOString(),
      operation: 'revoked',
      keyId: id,
      result: 'success',
    });
  }

  async exportInsecure(): Promise<
    Array<{ id: string; name: string; value: string; scopes: ApiKeyScope[] }>
  > {
    const store = await this.readStore();
    const out: Array<{ id: string; name: string; value: string; scopes: ApiKeyScope[] }> = [];
    for (const key of store.keys) {
      out.push({
        id: key.id,
        name: key.name,
        value: await this.readSecret(store, key),
        scopes: key.scopes,
      });
    }
    return out;
  }

  async readAudit(limit = 20): Promise<AuditRecord[]> {
    const content = await fs.readFile(this.auditPath, 'utf8').catch(() => '');
    return content
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line) as AuditRecord)
      .slice(-limit)
      .reverse();
  }

  private async readStore(): Promise<ApiKeyStoreFile> {
    const content = await fs.readFile(this.storePath, 'utf8').catch(() => '');
    if (!content) {
      return { version: 1, encryption: 'aes-256-gcm', keys: [] };
    }
    const parsed = JSON.parse(content) as ApiKeyStoreFile;
    return {
      version: 1,
      encryption: parsed.encryption || 'aes-256-gcm',
      keys: parsed.keys || [],
    };
  }

  private async writeStore(store: ApiKeyStoreFile): Promise<void> {
    await fs.mkdir(path.dirname(this.storePath), { recursive: true });
    await fs.writeFile(this.storePath, `${JSON.stringify(store, null, 2)}\n`, { mode: 0o600 });
  }

  private async appendAudit(record: AuditRecord): Promise<void> {
    await fs.mkdir(path.dirname(this.auditPath), { recursive: true });
    await fs.appendFile(this.auditPath, `${JSON.stringify(record)}\n`, 'utf8');
  }

  private async getAesPassword(): Promise<string> {
    if (this.cachedPassword) return this.cachedPassword;
    if (process.env.MAILGOAT_KEYS_PASSWORD) {
      this.cachedPassword = process.env.MAILGOAT_KEYS_PASSWORD;
      return process.env.MAILGOAT_KEYS_PASSWORD;
    }
    const response = await prompts({
      type: 'password',
      name: 'value',
      message: 'Enter password to encrypt/decrypt MailGoat API keys',
    });
    if (!response.value) {
      throw new Error('No encryption password provided');
    }
    const password = String(response.value);
    this.cachedPassword = password;
    return password;
  }

  private async writeSecret(
    store: ApiKeyStoreFile,
    key: ApiKeyRecord,
    plain: string
  ): Promise<void> {
    const keytar = await tryLoadKeytar();
    if (keytar) {
      const account = `mailgoat:${key.id}`;
      await keytar.setPassword('mailgoat', account, plain);
      key.keychainAccount = account;
      key.encryptedValue = undefined;
      store.encryption = 'keychain';
      return;
    }

    const password = await this.getAesPassword();
    key.encryptedValue = aesEncrypt(plain, password);
    key.keychainAccount = undefined;
    store.encryption = 'aes-256-gcm';
  }

  private async readSecret(store: ApiKeyStoreFile, key: ApiKeyRecord): Promise<string> {
    if (store.encryption === 'keychain' && key.keychainAccount) {
      const keytar = await tryLoadKeytar();
      if (!keytar) {
        throw new Error('Keychain storage selected but keytar is unavailable');
      }
      const value = await keytar.getPassword('mailgoat', key.keychainAccount);
      if (!value) throw new Error(`Missing keychain secret for ${key.id}`);
      return value;
    }
    if (!key.encryptedValue) {
      throw new Error(`Missing encrypted value for ${key.id}`);
    }
    const password = await this.getAesPassword();
    return aesDecrypt(key.encryptedValue, password);
  }

  private async deleteSecret(store: ApiKeyStoreFile, key: ApiKeyRecord): Promise<void> {
    if (store.encryption === 'keychain' && key.keychainAccount) {
      const keytar = await tryLoadKeytar();
      if (keytar) {
        await keytar.deletePassword('mailgoat', key.keychainAccount);
      }
      return;
    }
  }
}
