# Guide: Monitoring

Related docs: [health command](../api-reference.md), [Examples: notification-bot](../examples/notification-bot/README.md)

## Baseline Monitoring

Use scheduled health checks:

```bash
mailgoat health --json
```

Track:
- Success/failure counts.
- Warning counts.
- Check durations.

## Suggested Metrics

- `mailgoat_health_status` (0/1/2 mapped from exit code)
- `mailgoat_send_success_total`
- `mailgoat_send_failure_total`
- `mailgoat_send_latency_ms`

## Prometheus Integration Pattern

Wrap CLI with exporter script that emits Prometheus text format.

## Alerting Suggestions

- Critical: 5 consecutive health failures.
- Warning: error rate > 2% over 15 minutes.
- Warning: inbox webhook receiver down > 2 minutes.

## Grafana Dashboard Panels

- Health status over time.
- Send success vs failure ratio.
- P95 send latency.
- Attachment size percentile.
