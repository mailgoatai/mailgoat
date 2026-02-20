/**
 * Admin Webhook Store (Stub Implementation)
 * TODO: Implement full webhook management functionality
 */

export type AdminWebhookEventType = 'email.received' | 'email.sent' | 'email.failed';

export interface AdminWebhookRecord {
  id: string;
  postalId?: string;
  event: AdminWebhookEventType;
  events?: AdminWebhookEventType[]; // Array version
  url: string;
  secret?: string;
  enabled?: boolean;
  createdAt: string; // ISO string
  updatedAt?: string; // ISO string
}

export interface AdminWebhookDeliveryLog {
  id: string;
  webhookId: string;
  status: 'success' | 'failed';
  success?: boolean; // Alternate field name
  attempts: number;
  lastAttempt: Date;
  responseTimeMs?: number;
}

export class AdminWebhookStore {
  constructor() {
    // Stub implementation
  }

  async listWebhooks(): Promise<AdminWebhookRecord[]> {
    // TODO: Implement webhook listing
    return [];
  }

  async list(): Promise<AdminWebhookRecord[]> {
    return this.listWebhooks();
  }

  async get(_id: string): Promise<AdminWebhookRecord | null> {
    // TODO: Implement webhook retrieval
    return null;
  }

  async upsertWebhook(_record: Partial<AdminWebhookRecord>): Promise<AdminWebhookRecord> {
    // TODO: Implement webhook creation/update
    throw new Error('Webhook upsert not yet implemented');
  }

  async create(_record: Omit<AdminWebhookRecord, 'id' | 'createdAt'>): Promise<AdminWebhookRecord> {
    // TODO: Implement webhook creation
    throw new Error('Webhook creation not yet implemented');
  }

  async delete(_id: string): Promise<boolean> {
    // TODO: Implement webhook deletion
    return false;
  }

  async getDeliveryLogs(_webhookId: string): Promise<AdminWebhookDeliveryLog[]> {
    // TODO: Implement delivery log retrieval
    return [];
  }
}
