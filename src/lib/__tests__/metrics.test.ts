import { metrics } from '../metrics';

describe('metrics', () => {
  it('records counters and histogram in prometheus output', async () => {
    metrics.incrementEmail('success');
    metrics.incrementEmail('failed');
    metrics.incrementRetry();
    metrics.incrementApiError('4xx');
    metrics.incrementBatch('started');
    metrics.incrementBatch('completed');
    metrics.incrementConfigOperation('read');
    metrics.observeSendDuration(0.42);

    const output = await metrics.getMetricsText();

    expect(output).toContain('mailgoat_emails_sent_total');
    expect(output).toContain('mailgoat_retries_total');
    expect(output).toContain('mailgoat_api_errors_total');
    expect(output).toContain('mailgoat_send_duration_seconds_bucket');
  });

  it('classifies API errors', () => {
    expect(metrics.classifyApiError(new Error('Authentication failed'))).toBe('4xx');
    expect(metrics.classifyApiError(new Error('Server error 500'))).toBe('5xx');
    expect(metrics.classifyApiError(new Error('Connection timeout'))).toBe('network');
    expect(metrics.classifyApiError(new Error('something else'))).toBe('unknown');
  });
});
