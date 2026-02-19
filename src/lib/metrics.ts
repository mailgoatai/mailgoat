import * as os from 'os';
import { Counter, Histogram, Registry, collectDefaultMetrics, Pushgateway } from 'prom-client';

export type ApiErrorType = '4xx' | '5xx' | 'network' | 'unknown';

class MailGoatMetrics {
  private readonly registry: Registry;
  private readonly emailsTotal: Counter<'status'>;
  private readonly retriesTotal: Counter<string>;
  private readonly apiErrorsTotal: Counter<'type'>;
  private readonly batchOpsTotal: Counter<'status'>;
  private readonly configOpsTotal: Counter<'operation'>;
  private readonly sendDurationSeconds: Histogram<string>;

  constructor() {
    this.registry = new Registry();

    collectDefaultMetrics({ register: this.registry, prefix: 'mailgoat_' });

    this.emailsTotal = new Counter({
      name: 'mailgoat_emails_sent_total',
      help: 'Total emails processed by send command',
      labelNames: ['status'],
      registers: [this.registry],
    });

    this.retriesTotal = new Counter({
      name: 'mailgoat_retries_total',
      help: 'Total retry attempts for API requests',
      registers: [this.registry],
    });

    this.apiErrorsTotal = new Counter({
      name: 'mailgoat_api_errors_total',
      help: 'Total API errors grouped by class',
      labelNames: ['type'],
      registers: [this.registry],
    });

    this.batchOpsTotal = new Counter({
      name: 'mailgoat_batch_operations_total',
      help: 'Total batch operations for multi-recipient sends',
      labelNames: ['status'],
      registers: [this.registry],
    });

    this.configOpsTotal = new Counter({
      name: 'mailgoat_config_operations_total',
      help: 'Total config read/write operations',
      labelNames: ['operation'],
      registers: [this.registry],
    });

    this.sendDurationSeconds = new Histogram({
      name: 'mailgoat_send_duration_seconds',
      help: 'Email send operation duration in seconds',
      buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
      registers: [this.registry],
    });
  }

  getRegistry(): Registry {
    return this.registry;
  }

  observeSendDuration(seconds: number): void {
    this.sendDurationSeconds.observe(seconds);
  }

  incrementEmail(status: 'success' | 'failed'): void {
    this.emailsTotal.inc({ status });
  }

  incrementRetry(): void {
    this.retriesTotal.inc();
  }

  incrementApiError(type: ApiErrorType): void {
    this.apiErrorsTotal.inc({ type });
  }

  incrementBatch(status: 'started' | 'completed' | 'failed'): void {
    this.batchOpsTotal.inc({ status });
  }

  incrementConfigOperation(operation: 'read' | 'write'): void {
    this.configOpsTotal.inc({ operation });
  }

  classifyApiError(error: unknown): ApiErrorType {
    const message =
      error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    if (
      message.includes('authentication') ||
      message.includes('invalid request') ||
      message.includes('rate limit')
    ) {
      return '4xx';
    }
    if (message.includes('server error') || message.includes('temporarily unavailable')) {
      return '5xx';
    }
    if (message.includes('connect') || message.includes('timeout') || message.includes('network')) {
      return 'network';
    }
    return 'unknown';
  }

  async getMetricsText(): Promise<string> {
    return this.registry.metrics();
  }

  async pushIfConfigured(pushgatewayUrl?: string): Promise<void> {
    if (!pushgatewayUrl) {
      return;
    }

    const gateway = new Pushgateway(pushgatewayUrl, {}, this.registry);
    await gateway.pushAdd({
      jobName: 'mailgoat_cli',
      groupings: { hostname: os.hostname() },
    });
  }
}

export const metrics = new MailGoatMetrics();
