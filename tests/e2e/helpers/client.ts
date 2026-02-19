import {
  PostalClient,
  SendMessageParams,
  SendMessageResponse,
} from '../../../src/lib/postal-client';
import { MailGoatConfig } from '../../../src/lib/config';
import { getE2EEnv } from './env';

export function createE2EClient(): PostalClient {
  const env = getE2EEnv();
  const config: MailGoatConfig = {
    server: env.server,
    api_key: env.apiKey,
    fromAddress: env.sender,
  };
  return new PostalClient(config, { maxRetries: 3, baseDelay: 300, enableRetry: true });
}

export function uniqueSubject(prefix: string): string {
  return `[E2E ${prefix}] ${new Date().toISOString()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function sendBasic(
  client: PostalClient,
  params: Partial<SendMessageParams> & Pick<SendMessageParams, 'to' | 'subject'>
): Promise<SendMessageResponse> {
  return client.sendMessage({
    to: params.to,
    subject: params.subject,
    plain_body: params.plain_body || 'Default e2e body',
    html_body: params.html_body,
    attachments: params.attachments,
    tag: params.tag || 'e2e',
  });
}

export function firstToken(result: SendMessageResponse): string {
  const first = Object.values(result.messages)[0];
  if (!first?.token) {
    throw new Error('No recipient token found in send response');
  }
  return first.token;
}

export async function waitFor<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  intervalMs = 1000
): Promise<T> {
  const start = Date.now();
  let lastError: unknown;
  while (Date.now() - start < timeoutMs) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  if (lastError instanceof Error) {
    throw new Error(`Timed out waiting for condition: ${lastError.message}`);
  }

  throw new Error('Timed out waiting for condition');
}

export function tinyPngBase64(): string {
  return 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y5gT9QAAAAASUVORK5CYII=';
}

export function tinyPdfBase64(): string {
  const pdf =
    '%PDF-1.1\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF';
  return Buffer.from(pdf, 'utf8').toString('base64');
}
